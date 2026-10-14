# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 951f9b13ac5e6423950eb1c76318a9307000331da6d9bd30e281aa8a331df84b
"""Hält den Zustand des Matter Servers und sendet Befehle an Geräte."""

from __future__ import annotations

import asyncio
import logging
import re
from collections import deque
from collections.abc import Callable, Coroutine, Iterable
from datetime import datetime
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    APP_UPDATE_CHECK_INTERVAL,
    COMMISSIONING_WINDOW_SECONDS,
    CONF_CRITICAL_BATTERY,
    CONF_FIRE_EVENTS,
    CONF_LOW_BATTERY,
    CONF_URL,
    DEFAULT_CRITICAL_BATTERY,
    DEFAULT_FIRE_EVENTS,
    DEFAULT_LOW_BATTERY,
    DOMAIN,
    EVENT_BATTERY_LOW,
    EVENT_DEVICE_JOINED,
    EVENT_DEVICE_LEFT,
    EVENT_DEVICE_OFFLINE,
    EVENT_DEVICE_ONLINE,
    EVENT_UPDATE_AVAILABLE,
    FIRST_CONNECT_TIMEOUT,
    FLUSH_DELAY,
    GITHUB_RELEASES_URL,
    MAX_EVENT_LOG,
    MIN_SCHEMA_VERSION,
    OTA_CHECK_SPACING,
    PERIODIC_REFRESH,
    STORAGE_SAVE_DELAY,
    STORAGE_VERSION,
    VERSION,
)
from .matter_client import MatterServerClient, MatterServerError
from .update_check import async_fetch_latest, is_newer

_LOGGER = logging.getLogger(__name__)

Listener = Callable[[str, Any], None]

# --- Matter-Cluster ---------------------------------------------------------
C_ONOFF = 6
C_LEVEL = 8
C_DESCRIPTOR = 29
C_BINDING = 30
C_ACL = 31
C_BASIC = 40
C_OTA = 42
C_GENERAL_DIAG = 51
C_POWER = 47
C_THREAD = 53
C_WIFI = 54
C_ETHERNET = 55
C_BRIDGED = 57
C_OPCRED = 62
C_DOORLOCK = 257
C_COVER = 258
C_THERMOSTAT = 513
C_FAN = 514
C_COLOR = 768
C_ILLUMINANCE = 1024
C_TEMPERATURE = 1026
C_PRESSURE = 1027
C_HUMIDITY = 1029
C_OCCUPANCY = 1030

# Attribute, deren Änderung die Karte neu zeichnen lässt (None = alle Attribute).
# Zähler und Nachbartabellen der Netzwerk-Diagnose ändern sich ständig und
# werden deshalb nur über den regelmäßigen Neuaufbau erfasst.
_RELEVANT: dict[int, frozenset[int] | None] = {
    C_ONOFF: frozenset({0}),
    C_DOORLOCK: frozenset({0}),
    C_OCCUPANCY: frozenset({0}),
    C_DESCRIPTOR: None,
    C_BINDING: None,
    C_BASIC: None,
    C_BRIDGED: None,
    C_OPCRED: frozenset({1, 5}),
    C_POWER: frozenset({0, 11, 12, 14, 15}),
    C_OTA: frozenset({2, 3}),
    C_GENERAL_DIAG: frozenset({0}),
    C_THREAD: frozenset({0, 1, 2}),
    C_WIFI: frozenset({3, 4}),
}

_THREAD_ROLES = {
    2: "SleepyEndDevice",
    3: "EndDevice",
    4: "EndDevice",
    5: "Router",
    6: "Leader",
}

# OTA-Requestor "UpdateState": 2/3/8 = wartet, 4–7 = lädt oder installiert
_OTA_UPDATING = frozenset({4, 5, 6, 7})
_OTA_SCHEDULED = frozenset({2, 3, 8})

CLUSTER_NAMES = {
    3: "Identify",
    4: "Groups",
    5: "Scenes",
    6: "OnOff",
    8: "LevelControl",
    257: "DoorLock",
    258: "WindowCovering",
    513: "Thermostat",
    514: "FanControl",
    768: "ColorControl",
}
DEFAULT_BIND_CLUSTERS = (6, 8, 768)

# Geräte-Typ (Descriptor) -> Symbol
_DEVICE_TYPE_ICONS: dict[int, str] = {
    10: "mdi:lock",
    14: "mdi:bridge",
    15: "mdi:gesture-tap-button",
    21: "mdi:door-open",
    34: "mdi:speaker",
    35: "mdi:cast",
    40: "mdi:television-play",
    43: "mdi:fan",
    44: "mdi:air-filter",
    45: "mdi:air-purifier",
    65: "mdi:snowflake-alert",
    66: "mdi:valve",
    67: "mdi:water-alert",
    68: "mdi:weather-rainy",
    112: "mdi:fridge",
    114: "mdi:air-conditioner",
    115: "mdi:washing-machine",
    116: "mdi:robot-vacuum",
    117: "mdi:dishwasher",
    118: "mdi:smoke-detector",
    144: "mdi:flash",
    256: "mdi:lightbulb",
    257: "mdi:lightbulb",
    258: "mdi:lightbulb",
    259: "mdi:light-switch",
    260: "mdi:light-switch",
    261: "mdi:light-switch",
    262: "mdi:brightness-5",
    263: "mdi:motion-sensor",
    266: "mdi:power-plug",
    267: "mdi:power-plug",
    268: "mdi:lightbulb",
    269: "mdi:lightbulb",
    271: "mdi:light-switch",
    272: "mdi:light-switch",
    514: "mdi:window-shutter",
    515: "mdi:window-shutter-settings",
    768: "mdi:hvac",
    769: "mdi:thermostat",
    770: "mdi:thermometer",
    771: "mdi:pump",
    773: "mdi:gauge",
    774: "mdi:waves-arrow-right",
    775: "mdi:water-percent",
    1292: "mdi:ev-station",
    2128: "mdi:toggle-switch",
}

# Bekannte Ökosysteme (Hersteller-ID einer Fabric); sonst fragt die Integration den Server
_KNOWN_VENDORS: dict[int, str] = {
    4362: "Samsung SmartThings",
    4631: "Amazon Alexa",
    4937: "Apple Home",
    24582: "Google Home",
}

# ACL-Rechte und Authentifizierung (Matter-Spezifikation)
_PRIVILEGE_OPERATE = 3
_PRIVILEGE_ADMINISTER = 5
_AUTH_CASE = 2

_CODE_QR_RE = re.compile(r"^MT:[A-Z0-9.\-]{6,120}$")
_CODE_MANUAL_RE = re.compile(r"^\d{11}$|^\d{21}$")

# Zeitlimits einzelner Befehle (Sekunden)
_T_COMMISSION = 150
_T_UPDATE_CHECK = 60
_T_REMOVE = 90
_T_INTERVIEW = 150


# --- Hilfsfunktionen --------------------------------------------------------
def _int(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


def _str(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _field(struct: Any, tag: int, *names: str) -> Any:
    """Feld einer Matter-Struktur lesen.

    Der Matter Server liefert Strukturen mit der Tag-Nummer als Schlüssel
    (``{"1": 5, "254": 1}``); die Funktion akzeptiert zusätzlich Zahlen- und
    Namensschlüssel, damit sie bei abweichender Darstellung nicht ins Leere läuft.
    """
    if not isinstance(struct, dict):
        return None
    for key in (str(tag), tag, *names):
        if key in struct:
            return struct[key]
    return None


def _ep_of(path: str) -> int | None:
    head = path.split("/", 1)[0]
    return int(head) if head.isdigit() else None


def _is_relevant(path: str) -> bool:
    parts = path.split("/")
    if len(parts) != 3 or not (parts[1].isdigit() and parts[2].isdigit()):
        return False
    cluster, attribute = int(parts[1]), int(parts[2])
    if cluster not in _RELEVANT:
        return False
    allowed = _RELEVANT[cluster]
    return allowed is None or attribute in allowed


def _cluster_name(cluster_id: Any) -> str:
    cid = _int(cluster_id)
    if cid is None:
        return ""
    return CLUSTER_NAMES.get(cid) or f"0x{cid:04X}"


def _half_percent(value: Any) -> int | float | None:
    """BatPercentRemaining ist in halben Prozent (0–200) angegeben."""
    raw = _int(value)
    if raw is None or raw < 0 or raw > 200:
        return None
    return raw // 2 if raw % 2 == 0 else raw / 2


def _now() -> str:
    return dt_util.utcnow().isoformat(timespec="seconds")


class _NodeView:
    """Lesezugriff auf die Attribute eines Knotens samt Endpunkt-Struktur."""

    def __init__(self, node: dict[str, Any]) -> None:
        attrs = node.get("attributes")
        self.attrs: dict[str, Any] = attrs if isinstance(attrs, dict) else {}
        self.servers: dict[int, set[int]] = {}
        for path, value in self.attrs.items():
            if path.endswith("/29/1") and isinstance(value, list):
                ep = _ep_of(path)
                if ep is not None:
                    self.servers[ep] = {c for c in value if _int(c) is not None}
        self.bridged: list[int] = sorted(
            ep for ep, clusters in self.servers.items() if C_BRIDGED in clusters
        )
        owned = set(self.servers)
        for ep in self.bridged:
            owned.discard(ep)
            owned -= self.descendants(ep)
        self.owned: set[int] = owned

    def get(self, endpoint: int, cluster: int, attribute: int, default: Any = None) -> Any:
        return self.attrs.get(f"{endpoint}/{cluster}/{attribute}", default)

    def descendants(self, endpoint: int) -> set[int]:
        """Alle Endpunkte unterhalb eines Endpunkts (PartsList, rekursiv)."""
        found: set[int] = set()
        todo = [endpoint]
        while todo:
            current = todo.pop()
            for part in _as_list(self.get(current, C_DESCRIPTOR, 3)):
                p = _int(part)
                if p is not None and p not in found and p != endpoint:
                    found.add(p)
                    todo.append(p)
        return found


def _battery_of(view: _NodeView, endpoints: Iterable[int]) -> dict[str, Any]:
    """Niedrigsten Batteriestand über die angegebenen Endpunkte ermitteln."""
    percent: int | float | None = None
    voltage: int | None = None
    level: str | None = None
    replace = False
    found = False
    for ep in sorted(endpoints):
        if C_POWER not in view.servers.get(ep, ()):
            continue
        features = _int(view.get(ep, C_POWER, 65532))
        if features is not None and not features & 0x02:
            continue  # kein Batterie-Merkmal (z. B. Netzteil)
        p = _half_percent(view.get(ep, C_POWER, 12))
        charge = _int(view.get(ep, C_POWER, 14))
        if p is None and charge is None:
            continue
        found = True
        if p is not None and (percent is None or p < percent):
            percent = p
        v = _int(view.get(ep, C_POWER, 11))
        if v is not None and (voltage is None or v < voltage):
            voltage = v
        if charge in (0, 1, 2):
            names = ("ok", "warning", "critical")
            if level is None or charge > names.index(level):
                level = names[charge]
        if view.get(ep, C_POWER, 15) is True:
            replace = True
    return {
        "present": found,
        "percent": percent,
        "voltage": voltage,
        "level": level,
        "replace": replace,
    }


def _signal_of(view: _NodeView) -> int | None:
    """Signalstärke in dBm: WLAN-RSSI bzw. bester Thread-Nachbar."""
    root = view.servers.get(0, set())
    if C_WIFI in root:
        rssi = _int(view.get(0, C_WIFI, 4))
        return rssi if rssi is not None and rssi < 0 else None
    if C_THREAD in root:
        best: int | None = None
        for entry in _as_list(view.get(0, C_THREAD, 7)):
            rssi = _int(_field(entry, 6, "averageRssi"))
            if rssi is None:
                rssi = _int(_field(entry, 7, "lastRssi"))
            if rssi is not None and (best is None or rssi > best):
                best = rssi
        return best
    return None


def _icon_of(view: _NodeView, endpoints: Iterable[int]) -> str | None:
    for ep in sorted(endpoints):
        if ep == 0:
            continue
        for entry in _as_list(view.get(ep, C_DESCRIPTOR, 0)):
            icon = _DEVICE_TYPE_ICONS.get(_int(_field(entry, 0, "deviceType")) or -1)
            if icon:
                return icon
    return None



# --- Funktionen (Expose) und Gerätebilder (seit 1.0.3) ---------------------------
# Schutz vor unerwartet vielen Zeilen je Gerät (große Bridges)
_FUNCTIONS_MAX = 40
# Gerätebilder: höchstens so viele Namenskandidaten je Gerät, jeweils höchstens so lang
_IMAGE_KEYS_MAX = 4
_IMAGE_KEY_LEN = 64
_IMAGE_KEY_RE = re.compile(r"^[^\x00-\x1f\x7f<>\"'\\?#%]+$")

_LOCK_STATES = {0: "not_fully_locked", 1: "locked", 2: "unlocked", 3: "unlatched"}


def _func_row(
    ep: int,
    cluster: int,
    attribute: int,
    key: str,
    kind: str,
    value: Any,
    unit: str | None = None,
    switchable: bool = False,
) -> dict[str, Any]:
    return {
        "id": f"{ep}/{cluster}/{attribute}",
        "endpoint": ep,
        "key": key,
        "kind": kind,
        "value": value,
        "unit": unit,
        "switchable": switchable,
    }


def _centi(value: Any) -> float | None:
    """Messwert in Hundertsteln (z. B. 2150 -> 21.5)."""
    raw = _int(value)
    return None if raw is None else round(raw / 100, 1)


def _functions_of(view: _NodeView, endpoints: Iterable[int]) -> list[dict[str, Any]]:
    """Funktionen (Matter-Entsprechung zu "Expose") samt aktuellem Wert.

    Nur ein Ein/Aus-Schalter (Cluster OnOff, Attribut OnOff) ist schaltbar; alles
    andere wird angezeigt. Schlösser lassen sich bewusst nicht aus der Karte öffnen.
    """
    rows: list[dict[str, Any]] = []
    for ep in sorted(set(endpoints)):
        if ep == 0:
            continue
        servers = view.servers.get(ep, set())

        if C_ONOFF in servers:
            state = view.get(ep, C_ONOFF, 0)
            if isinstance(state, bool):
                rows.append(_func_row(ep, C_ONOFF, 0, "onoff", "switch", state, None, True))
        if C_LEVEL in servers:
            level = _int(view.get(ep, C_LEVEL, 0))
            if level is not None and 0 <= level <= 254:
                rows.append(
                    _func_row(ep, C_LEVEL, 0, "level", "number", round(level * 100 / 254), "%")
                )
        if C_COLOR in servers:
            mireds = _int(view.get(ep, C_COLOR, 7))
            if mireds is not None and mireds > 0:
                rows.append(
                    _func_row(ep, C_COLOR, 7, "color_temp", "number", round(1_000_000 / mireds), "K")
                )
        if C_DOORLOCK in servers:
            lock = _LOCK_STATES.get(_int(view.get(ep, C_DOORLOCK, 0)) or -1)
            if lock:
                rows.append(_func_row(ep, C_DOORLOCK, 0, "lock", "enum", lock))
        if C_COVER in servers:
            closed = _int(view.get(ep, C_COVER, 8))
            if closed is not None and 0 <= closed <= 100:
                rows.append(_func_row(ep, C_COVER, 8, "cover_closed", "number", closed, "%"))
        if C_THERMOSTAT in servers:
            for attribute, key in ((0, "temperature"), (18, "target_heat"), (17, "target_cool")):
                value = _centi(view.get(ep, C_THERMOSTAT, attribute))
                if value is not None:
                    rows.append(_func_row(ep, C_THERMOSTAT, attribute, key, "number", value, "°C"))
        if C_FAN in servers:
            percent = _int(view.get(ep, C_FAN, 2))
            if percent is not None and 0 <= percent <= 100:
                rows.append(_func_row(ep, C_FAN, 2, "fan_percent", "number", percent, "%"))
        if C_TEMPERATURE in servers:
            value = _centi(view.get(ep, C_TEMPERATURE, 0))
            if value is not None:
                rows.append(_func_row(ep, C_TEMPERATURE, 0, "temperature", "number", value, "°C"))
        if C_HUMIDITY in servers:
            value = _centi(view.get(ep, C_HUMIDITY, 0))
            if value is not None:
                rows.append(_func_row(ep, C_HUMIDITY, 0, "humidity", "number", value, "%"))
        if C_PRESSURE in servers:
            value = _int(view.get(ep, C_PRESSURE, 0))
            if value is not None:
                rows.append(_func_row(ep, C_PRESSURE, 0, "pressure", "number", value, "hPa"))
        if C_ILLUMINANCE in servers:
            raw = _int(view.get(ep, C_ILLUMINANCE, 0))
            if raw is not None and 0 < raw < 65535:
                lux = round(10 ** ((raw - 1) / 10000), 1)
                rows.append(_func_row(ep, C_ILLUMINANCE, 0, "illuminance", "number", lux, "lx"))
        if C_OCCUPANCY in servers:
            occupancy = _int(view.get(ep, C_OCCUPANCY, 0))
            if occupancy is not None:
                rows.append(_func_row(ep, C_OCCUPANCY, 0, "occupancy", "bool", bool(occupancy & 1)))
        if len(rows) >= _FUNCTIONS_MAX:
            break
    return rows[:_FUNCTIONS_MAX]


def _image_keys(*names: str | None) -> list[str]:
    """Namenskandidaten für das Gerätebild (Teilenummer, Produktname, …).

    Matter liefert keine Produktbilder. Die Karte probiert die Kandidaten nacheinander
    gegen die Bildbibliothek und fällt ohne Treffer auf das Symbol zurück. Die Werte
    gelangen in eine URL; deshalb werden Zeichen verworfen, die dort nichts verloren haben.
    """
    keys: list[str] = []
    for name in names:
        if not isinstance(name, str):
            continue
        text = re.sub(r"\s+", " ", name).strip()
        if not text or len(text) > _IMAGE_KEY_LEN or not _IMAGE_KEY_RE.match(text):
            continue
        if text.lower() not in (k.lower() for k in keys):
            keys.append(text)
        if len(keys) >= _IMAGE_KEYS_MAX:
            break
    return keys


# Geräte-Typ (Descriptor) -> Geräteklasse für Filter und Gruppierung
_DEVICE_TYPE_CLASS: dict[int, str] = {
    10: "lock",
    14: "bridge",
    15: "remote",
    21: "sensor",
    34: "media",
    35: "media",
    40: "media",
    43: "fan",
    44: "appliance",
    45: "fan",
    65: "sensor",
    66: "other",
    67: "sensor",
    68: "sensor",
    112: "appliance",
    114: "climate",
    115: "appliance",
    116: "appliance",
    117: "appliance",
    118: "sensor",
    256: "light",
    257: "light",
    258: "light",
    259: "remote",
    260: "remote",
    261: "remote",
    262: "sensor",
    263: "sensor",
    266: "switch",
    267: "switch",
    268: "light",
    269: "light",
    271: "switch",
    272: "switch",
    514: "cover",
    515: "cover",
    768: "climate",
    769: "climate",
    770: "sensor",
    773: "sensor",
    774: "sensor",
    775: "sensor",
}

_VENDOR_SUFFIX_RE = re.compile(
    r"[\s,]+(?:b\.?v\.?|gmbh|inc\.?|ltd\.?|llc|co\.?|ag|s\.?a\.?|corp\.?|corporation|limited)$",
    re.IGNORECASE,
)
_LEADING_SUFFIX_RE = re.compile(
    r"^(?:b\.?v\.?|gmbh|inc\.?|ltd\.?|llc|co\.?|ag|corp\.?|corporation|limited)[\s,]+",
    re.IGNORECASE,
)
_NAME_SEPARATORS = " -_:/,"


def _class_of(view: _NodeView, endpoints: Iterable[int], is_bridge: bool) -> str:
    """Geräteklasse (light, switch, sensor, …) aus den Geräte-Typen der Endpunkte."""
    for ep in sorted(endpoints):
        if ep == 0:
            continue
        for entry in _as_list(view.get(ep, C_DESCRIPTOR, 0)):
            cls = _DEVICE_TYPE_CLASS.get(_int(_field(entry, 0, "deviceType")) or -1)
            if cls:
                return cls
    return "bridge" if is_bridge else "other"


def _clean_vendor(name: str | None) -> str | None:
    """Herstellername ohne Rechtsform (B.V., GmbH, Inc., Ltd. …) und ohne doppelte Leerzeichen."""
    if not name:
        return None
    cleaned = re.sub(r"\s+", " ", name).strip(" ,.-")
    previous = None
    while previous != cleaned:
        previous = cleaned
        cleaned = _VENDOR_SUFFIX_RE.sub("", cleaned).strip(" ,.-")
    return cleaned or None


def _strip_vendor_prefix(model: str, vendor: str) -> str:
    """Steht der Herstellername am Anfang der Typenbezeichnung, wird er entfernt."""
    if len(model) > len(vendor) and model[: len(vendor)].lower() == vendor.lower():
        if model[len(vendor)] in _NAME_SEPARATORS:
            rest = model[len(vendor) :].lstrip(_NAME_SEPARATORS)
            # Rechtsform, die hinter dem gekürzten Herstellernamen stehen blieb, ebenfalls entfernen
            rest = _LEADING_SUFFIX_RE.sub("", rest) or rest
            if rest:
                return rest
    return model


def _split_type(vendor: str | None, model: str | None) -> tuple[str | None, str | None]:
    """Typenbezeichnung in Hersteller und Gerätename trennen.

    Der Hersteller kommt aus dem Basic-Information-Cluster (VendorName). Beginnt
    die Typenbezeichnung (ProductName) mit dem Herstellernamen, wird er vom
    Gerätenamen abgezogen, damit er nicht doppelt erscheint.
    """
    vendor = _clean_vendor(vendor)
    if model:
        model = re.sub(r"\s+", " ", model).strip() or None
    if vendor and model:
        model = _strip_vendor_prefix(model, vendor)
    return vendor, model


def _fill_missing_vendors(devices: list[dict[str, Any]]) -> None:
    """Fehlt der Hersteller, wird er aus dem Anfang der Typenbezeichnung erkannt.

    Es zählen nur Herstellernamen, die bei anderen Geräten desselben Servers
    tatsächlich gemeldet wurden (nichts wird geraten).
    """
    known = sorted({d["vendor"] for d in devices if d.get("vendor")}, key=len, reverse=True)
    if not known:
        return
    for device in devices:
        model = device.get("model")
        if device.get("vendor") or not model:
            continue
        for vendor in known:
            rest = _strip_vendor_prefix(model, vendor)
            if rest != model:
                device["vendor"] = vendor
                device["model"] = rest
                break


def _norm_binding(entry: Any, default_fabric: int | None) -> dict[str, Any]:
    fabric = _int(_field(entry, 254, "fabricIndex"))
    return {
        "node": _int(_field(entry, 1, "node")),
        "group": _int(_field(entry, 2, "group")),
        "endpoint": _int(_field(entry, 3, "endpoint")),
        "cluster": _int(_field(entry, 4, "cluster")),
        "fabricIndex": fabric if fabric is not None else (default_fabric or 0),
    }


def _norm_acl(entry: Any) -> dict[str, Any]:
    targets = _field(entry, 4, "targets")
    if isinstance(targets, list):
        targets = [
            {
                "cluster": _int(_field(t, 0, "cluster")),
                "endpoint": _int(_field(t, 1, "endpoint")),
                "deviceType": _int(_field(t, 2, "deviceType")),
            }
            for t in targets
            if isinstance(t, dict)
        ]
    else:
        targets = None
    subjects = _field(entry, 3, "subjects")
    return {
        "privilege": _int(_field(entry, 1, "privilege")),
        "authMode": _int(_field(entry, 2, "authMode")),
        "subjects": [s for s in subjects if _int(s) is not None]
        if isinstance(subjects, list)
        else None,
        "targets": targets,
        "fabricIndex": _int(_field(entry, 254, "fabricIndex")) or 0,
    }


class MatterManager:
    """Zustand + Befehle für einen Matter Server."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.url: str = entry.data[CONF_URL]

        self.server_online: bool | None = None
        self.server_info: dict[str, Any] = {}

        # Rohdaten des Servers nach Knoten-ID
        self._nodes: dict[int, dict[str, Any]] = {}
        self._last_msg: dict[int, str] = {}
        self._updates: dict[int, dict[str, Any]] = {}
        self._vendor_names: dict[int, str] = {}
        self._vendors_requested: set[int] = set()
        self._node_names: dict[int, str] = {}
        self._seen_connected = False

        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}_{entry.entry_id}"
        )

        self._events: deque[dict[str, Any]] = deque(maxlen=MAX_EVENT_LOG)
        # Version der App (Integration) und Ergebnis der Prüfung auf neue Versionen
        self.app: dict[str, Any] = {
            "version": VERSION,
            "latest_version": None,
            "update_available": False,
            "release_url": GITHUB_RELEASES_URL,
            "checked_at": None,
            "check_failed": False,
        }
        self.jobs: dict[str, Any] = {"ota": None, "commission": None}
        self._tasks: set[asyncio.Task[Any]] = set()
        self._job_tasks: set[asyncio.Task[Any]] = set()
        self._client_task: asyncio.Task[Any] | None = None

        self._listeners: list[Listener] = []
        self._unsubs: list[CALLBACK_TYPE] = []
        self._flush_unsub: CALLBACK_TYPE | None = None

        # Für Ereignis-Erkennung (erster Durchlauf setzt nur die Basislinie)
        self._baseline: dict[str, set[str]] | None = None

        self.client = MatterServerClient(
            async_get_clientsession(hass), self.url, self._handle_event
        )
        self.data: dict[str, Any] = {}
        self.details: dict[str, list[str]] = {}
        self._rebuild()

    # ------------------------------------------------------------------
    # Lebenszyklus
    # ------------------------------------------------------------------
    @property
    def low_battery_threshold(self) -> int:
        return int(self.entry.options.get(CONF_LOW_BATTERY, DEFAULT_LOW_BATTERY))

    @property
    def critical_battery_threshold(self) -> int:
        return int(
            self.entry.options.get(CONF_CRITICAL_BATTERY, DEFAULT_CRITICAL_BATTERY)
        )

    @property
    def fire_events(self) -> bool:
        return bool(self.entry.options.get(CONF_FIRE_EVENTS, DEFAULT_FIRE_EVENTS))

    async def async_start(self) -> None:
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            for key, value in (stored.get("last_msg") or {}).items():
                if str(key).isdigit() and isinstance(value, str):
                    self._last_msg[int(key)] = value
            for key, value in (stored.get("updates") or {}).items():
                if str(key).isdigit() and isinstance(value, dict):
                    self._updates[int(key)] = value

        self._client_task = self.entry.async_create_background_task(
            self.hass, self.client.async_run(), f"{DOMAIN}_connection"
        )
        try:
            await self.client.async_wait_connected(FIRST_CONNECT_TIMEOUT)
        except TimeoutError as err:
            await self.async_stop()
            raise ConfigEntryNotReady(
                f"Matter Server nicht erreichbar: {self.url}"
            ) from err

        self._unsubs.append(
            async_track_time_interval(
                self.hass, self._app_update_tick, APP_UPDATE_CHECK_INTERVAL
            )
        )
        self._unsubs.append(
            async_track_time_interval(self.hass, self._periodic_tick, PERIODIC_REFRESH)
        )
        self._unsubs.append(
            self.hass.bus.async_listen(
                dr.EVENT_DEVICE_REGISTRY_UPDATED, self._registry_changed
            )
        )
        # Beim Start und danach regelmäßig auf eine neue App-Version prüfen
        self._spawn(self.async_check_app_update(), "app_update_check")

    async def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._flush_unsub:
            self._flush_unsub()
            self._flush_unsub = None
        await self.client.async_close()
        for task in list(self._tasks) + list(self._job_tasks):
            task.cancel()
        self._tasks.clear()
        self._job_tasks.clear()
        if self._client_task is not None:
            self._client_task.cancel()
            self._client_task = None
        self._store.async_delay_save(self._cache_data, 0)
        self._listeners.clear()

    @callback
    def async_add_listener(self, listener: Listener) -> CALLBACK_TYPE:
        self._listeners.append(listener)

        @callback
        def _remove() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return _remove

    @callback
    def _notify(self, kind: str, payload: Any) -> None:
        for listener in list(self._listeners):
            try:
                listener(kind, payload)
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Fehler in Listener")

    @callback
    def _schedule_update(self) -> None:
        if self._flush_unsub is not None:
            return
        self._flush_unsub = async_call_later(self.hass, FLUSH_DELAY, self._flush)

    @callback
    def _flush(self, _now: Any = None) -> None:
        self._flush_unsub = None
        previous = self.data
        self._rebuild()
        self._detect_changes()
        if self.data != previous:
            self._notify("update", self.data)
        self._store.async_delay_save(self._cache_data, STORAGE_SAVE_DELAY)

    @callback
    def _periodic_tick(self, _now: datetime) -> None:
        self._schedule_update()

    @callback
    def _registry_changed(self, event: Event) -> None:
        """Geräte-Namen in Home Assistant können sich geändert haben."""
        self._schedule_update()

    def _cache_data(self) -> dict[str, Any]:
        """Daten für den Storage: zuletzt gesehen und Update-Prüfungen."""
        keep = set(self._nodes)
        return {
            "last_msg": {
                str(k): v
                for k, v in self._last_msg.items()
                if not keep or k in keep
            },
            "updates": {
                str(k): v for k, v in self._updates.items() if not keep or k in keep
            },
        }

    # ------------------------------------------------------------------
    # Ereignisse des Matter Servers
    # ------------------------------------------------------------------
    @callback
    def _handle_event(self, kind: str, payload: Any) -> None:
        if kind == "connected":
            self._handle_connected(payload)
        elif kind == "disconnected":
            self._handle_disconnected()
        elif kind in ("node_added", "node_updated") and isinstance(payload, dict):
            self._handle_node(kind == "node_added", payload)
        elif kind == "node_removed":
            self._handle_node_removed(payload)
        elif kind == "attribute_updated" and isinstance(payload, list):
            self._handle_attribute(payload)
        elif kind == "node_event" and isinstance(payload, dict):
            node_id = _int(payload.get("node_id"))
            if node_id in self._nodes:
                self._last_msg[node_id] = _now()
        elif kind == "server_info_updated" and isinstance(payload, dict):
            self.server_info = payload
            self._schedule_update()

    def _handle_connected(self, payload: dict[str, Any]) -> None:
        info = payload.get("server_info")
        self.server_info = info if isinstance(info, dict) else {}
        self._nodes = {
            n["node_id"]: n
            for n in payload.get("nodes", [])
            if isinstance(n, dict) and _int(n.get("node_id")) is not None
        }
        self.server_online = True
        # Gelöschte Geräte aus den Zwischenspeichern entfernen
        for cache in (self._last_msg, self._updates):
            for node_id in [k for k in cache if k not in self._nodes]:
                cache.pop(node_id, None)
        if self._seen_connected:
            self._log("server_connected", "")
        self._seen_connected = True
        self._request_vendor_names()
        self._schedule_update()

    def _handle_disconnected(self) -> None:
        self.server_online = False
        self._log("server_disconnected", "")
        self._schedule_update()

    def _handle_node(self, added: bool, node: dict[str, Any]) -> None:
        node_id = _int(node.get("node_id"))
        if node_id is None:
            return
        is_new = node_id not in self._nodes
        self._nodes[node_id] = node
        if added and is_new:
            name = self._basic_name(node, node_id)
            self._log("device_joined", name)
            self._fire(EVENT_DEVICE_JOINED, {"name": name, "node_id": node_id})
        self._request_vendor_names()
        self._schedule_update()

    def _handle_node_removed(self, payload: Any) -> None:
        node_id = _int(payload)
        if node_id is None or node_id not in self._nodes:
            return
        name = self._node_names.get(node_id) or f"Node {node_id}"
        del self._nodes[node_id]
        self._last_msg.pop(node_id, None)
        self._updates.pop(node_id, None)
        self._log("device_leave", name)
        self._fire(EVENT_DEVICE_LEFT, {"name": name, "node_id": node_id})
        self._schedule_update()

    def _handle_attribute(self, payload: list[Any]) -> None:
        if len(payload) != 3:
            return
        node_id, path, value = payload
        node = self._nodes.get(node_id) if _int(node_id) is not None else None
        if node is None or not isinstance(path, str):
            return
        attrs = node.get("attributes")
        if not isinstance(attrs, dict):
            attrs = node["attributes"] = {}
        attrs[path] = value
        self._last_msg[node_id] = _now()
        if _is_relevant(path):
            self._schedule_update()

    def _log(self, kind: str, name: str, detail: str | None = None) -> None:
        self._events.appendleft(
            {"ts": _now(), "type": kind, "name": name, "detail": detail}
        )

    # ------------------------------------------------------------------
    # Home-Assistant-Geräte (Namen, Entitäten)
    # ------------------------------------------------------------------
    def _fabric_hex(self) -> str | None:
        compressed = _int(self.server_info.get("compressed_fabric_id"))
        return f"{compressed:016X}" if compressed is not None else None

    def _registry_index(self) -> dict[int, dict[int | None, list[dr.DeviceEntry]]]:
        """Geräte der Matter-Integration nach Knoten und Endpunkt (None = Knoten)."""
        fabric = self._fabric_hex()
        index: dict[int, dict[int | None, list[dr.DeviceEntry]]] = {}
        if not fabric:
            return index
        prefix = f"deviceid_{fabric}-".lower()
        for device in dr.async_get(self.hass).devices.values():
            for identifier in device.identifiers:
                # Neuere Home-Assistant-Versionen kennen auch Identifier mit mehr als
                # zwei Werten; wir brauchen nur Domain und Kennung (die ersten zwei).
                if len(identifier) < 2:
                    continue
                domain, ident = identifier[0], identifier[1]
                if domain != "matter" or not str(ident).lower().startswith(prefix):
                    continue
                node_hex, _sep, rest = str(ident)[len(prefix) :].partition("-")
                try:
                    node_id = int(node_hex, 16)
                except ValueError:
                    continue
                endpoint = int(rest) if rest.isdigit() else None
                index.setdefault(node_id, {}).setdefault(endpoint, []).append(device)
                break
        return index

    @staticmethod
    def _registry_name(devices: list[dr.DeviceEntry]) -> str | None:
        for device in devices:
            name = device.name_by_user or device.name
            if name:
                return name
        return None

    def _entities_of(self, node_id: int, endpoint: int | None) -> list[dict[str, str]]:
        index = self._registry_index().get(node_id, {})
        if endpoint is None:
            devices = [d for group in index.values() for d in group]
        else:
            devices = list(index.get(endpoint, []))
        ent_reg = er.async_get(self.hass)
        seen: set[str] = set()
        result: list[dict[str, str]] = []
        for device in devices:
            for ent in er.async_entries_for_device(ent_reg, device.id):
                if ent.entity_id in seen:
                    continue
                seen.add(ent.entity_id)
                result.append(
                    {
                        "entity_id": ent.entity_id,
                        "name": ent.name or ent.original_name or "",
                    }
                )
        return sorted(result, key=lambda e: e["entity_id"])

    @staticmethod
    def _basic_name(node: dict[str, Any], node_id: int) -> str:
        attrs = node.get("attributes") if isinstance(node.get("attributes"), dict) else {}
        return (
            _str(attrs.get("0/40/5"))
            or _str(attrs.get("0/40/14"))
            or _str(attrs.get("0/40/3"))
            or f"Node {node_id}"
        )

    # ------------------------------------------------------------------
    # Datenmodell für Karte + Sensoren
    # ------------------------------------------------------------------
    def _bindings_of(
        self, view: _NodeView, node_names: dict[int, str]
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Bindings dieses Knotens + Endpunkte, von denen aus gebunden werden kann."""
        bindings: list[dict[str, Any]] = []
        capable: list[dict[str, Any]] = []
        for ep in sorted(view.owned):
            if C_BINDING not in view.servers.get(ep, ()):
                continue
            clients = [
                c
                for c in (_int(x) for x in _as_list(view.get(ep, C_DESCRIPTOR, 2)))
                if c in CLUSTER_NAMES and c not in (3, 4, 5)
            ]
            capable.append(
                {
                    "endpoint": ep,
                    "clusters": [
                        {"id": c, "name": _cluster_name(c)}
                        for c in (clients or DEFAULT_BIND_CLUSTERS)
                    ],
                }
            )
            for entry in _as_list(view.get(ep, C_BINDING, 0)):
                if not isinstance(entry, dict):
                    continue
                node = _int(_field(entry, 1, "node"))
                group = _int(_field(entry, 2, "group"))
                target_ep = _int(_field(entry, 3, "endpoint"))
                cluster = _int(_field(entry, 4, "cluster"))
                if node is not None:
                    target = node_names.get(node) or f"Node {node}"
                    ref = f"{node}:{target_ep if target_ep is not None else ''}"
                    kind = "device"
                elif group is not None:
                    target = f"Gruppe {group}"
                    ref = f"group:{group}"
                    kind = "group"
                else:
                    continue
                bindings.append(
                    {
                        "endpoint": ep,
                        "cluster": _cluster_name(cluster),
                        "cluster_id": cluster,
                        "target": target,
                        "target_ref": ref,
                        "target_type": kind,
                        "target_endpoint": target_ep,
                    }
                )
        return bindings, capable

    def _ota_of(self, node_id: int, view: _NodeView, sw_int: int | None) -> dict[str, Any]:
        capable = C_OTA in view.servers.get(0, set())
        upd = self._updates.get(node_id)
        latest = None
        if upd and upd.get("available"):
            latest_int = _int(upd.get("latest_int"))
            if latest_int is not None and sw_int is not None and sw_int >= latest_int:
                upd = {**upd, "available": False}  # inzwischen installiert
            else:
                latest = upd.get("latest")

        requestor = _int(view.get(0, C_OTA, 2))
        state: str | None = None
        if requestor in _OTA_UPDATING:
            state = "updating"
        elif requestor in _OTA_SCHEDULED:
            state = "scheduled"
        elif upd and upd.get("available"):
            state = "available"
        elif upd:
            state = "idle"
        progress = _int(view.get(0, C_OTA, 3)) if state == "updating" else None
        return {
            "capable": capable,
            "state": state,
            "latest": latest,
            "latest_int": _int(upd.get("latest_int")) if upd and latest else None,
            "notes_url": upd.get("notes_url") if upd and latest else None,
            "source": upd.get("source") if upd and latest else None,
            "checked_at": upd.get("checked_at") if upd else None,
            "progress": progress,
        }

    def _serialize_node(
        self,
        node_id: int,
        node: dict[str, Any],
        names: dict[int, str],
        registry: dict[int, dict[int | None, list[dr.DeviceEntry]]],
    ) -> list[dict[str, Any]]:
        view = _NodeView(node)
        node_available = node.get("available") is True
        vendor_id = _int(view.get(0, C_BASIC, 2))
        vendor = _str(view.get(0, C_BASIC, 1)) or _KNOWN_VENDORS.get(vendor_id or -1)
        product = _str(view.get(0, C_BASIC, 3))
        product_label = _str(view.get(0, C_BASIC, 14))
        vendor, model_name = _split_type(vendor, product or product_label)
        sw_int = _int(view.get(0, C_BASIC, 9))
        sw_string = _str(view.get(0, C_BASIC, 10)) or (
            str(sw_int) if sw_int is not None else None
        )

        root = view.servers.get(0, set())
        if C_THREAD in root:
            network = "thread"
        elif C_WIFI in root:
            network = "wifi"
        elif C_ETHERNET in root:
            network = "ethernet"
        else:
            network = None

        is_bridge = bool(node.get("is_bridge")) or bool(view.bridged)
        if is_bridge:
            kind = "Bridge"
        elif network == "thread":
            kind = _THREAD_ROLES.get(_int(view.get(0, C_THREAD, 1)) or -1, "Thread")
        elif network == "wifi":
            kind = "WiFi"
        elif network == "ethernet":
            kind = "Ethernet"
        else:
            kind = None

        battery = _battery_of(view, view.owned)
        fabrics = [e for e in _as_list(view.get(0, C_OPCRED, 1)) if isinstance(e, dict)]
        bindings, binding_endpoints = self._bindings_of(view, names)

        device: dict[str, Any] = {
            "id": str(node_id),
            "node_id": node_id,
            "endpoint": None,
            "name": names.get(node_id) or f"Node {node_id}",
            "bridged": False,
            "bridge": None,
            "is_bridge": is_bridge,
            "bridged_count": len(view.bridged),
            "vendor": vendor,
            "vendor_id": vendor_id,
            "model": model_name,
            "device_class": _class_of(view, view.owned, is_bridge),
            "description": product_label if product_label != product else None,
            "product_id": _int(view.get(0, C_BASIC, 4)),
            "node_label": _str(view.get(0, C_BASIC, 5)),
            "sw_version": sw_string,
            "hw_version": _str(view.get(0, C_BASIC, 8)),
            "part_number": _str(view.get(0, C_BASIC, 12)),
            "serial": _str(view.get(0, C_BASIC, 15)),
            "network": network,
            "type": kind,
            "thread_channel": _int(view.get(0, C_THREAD, 0)) if network == "thread" else None,
            "thread_network": _str(view.get(0, C_THREAD, 2)) if network == "thread" else None,
            "wifi_channel": _int(view.get(0, C_WIFI, 3)) if network == "wifi" else None,
            "icon": "mdi:bridge" if is_bridge and not view.owned - {0}
            else _icon_of(view, view.owned),
            "supported": True,
            "interviewing": False,
            "available": bool(node.get("available")) if "available" in node else None,
            "last_seen": self._last_msg.get(node_id),
            "commissioned": node.get("date_commissioned"),
            "signal": _signal_of(view),
            "battery": battery["percent"],
            "voltage": battery["voltage"],
            "battery_level": battery["level"],
            "battery_replace": battery["replace"],
            "battery_present": battery["present"],
            "fabrics_count": len(fabrics),
            "bindings": bindings,
            "binding_endpoints": binding_endpoints,
            "ota": self._ota_of(node_id, view, sw_int),
            "functions": _functions_of(view, view.owned),
            "image_keys": _image_keys(
                _str(view.get(0, C_BASIC, 12)), product, product_label, model_name
            ),
        }
        result = [device]

        # Geräte hinter einer Bridge: nur lesbar, die Bridge verwaltet sie
        for ep in view.bridged:
            parts = view.descendants(ep) | {ep}
            b_battery = _battery_of(view, parts)
            reachable = view.get(ep, C_BRIDGED, 17)
            b_vendor = _str(view.get(ep, C_BRIDGED, 1))
            b_product = _str(view.get(ep, C_BRIDGED, 3))
            b_label = _str(view.get(ep, C_BRIDGED, 5))
            b_plabel = _str(view.get(ep, C_BRIDGED, 14))
            b_vendor, b_model = _split_type(b_vendor, b_product or b_plabel)
            ha_name = self._registry_name(registry.get(node_id, {}).get(ep, []))
            result.append(
                {
                    "id": f"{node_id}:{ep}",
                    "node_id": node_id,
                    "endpoint": ep,
                    "name": ha_name or b_label or b_plabel or b_product or f"Node {node_id}/{ep}",
                    "bridged": True,
                    "bridge": device["name"],
                    "is_bridge": False,
                    "bridged_count": 0,
                    "vendor": b_vendor,
                    "vendor_id": _int(view.get(ep, C_BRIDGED, 2)),
                    "model": b_model,
                    "device_class": _class_of(view, parts, False),
                    "description": b_plabel if b_plabel != b_product else None,
                    "product_id": None,
                    "node_label": b_label,
                    "sw_version": _str(view.get(ep, C_BRIDGED, 10)),
                    "hw_version": _str(view.get(ep, C_BRIDGED, 8)),
                    "part_number": _str(view.get(ep, C_BRIDGED, 12)),
                    "serial": _str(view.get(ep, C_BRIDGED, 15)),
                    "network": None,
                    "type": "Bridged",
                    "thread_channel": None,
                    "thread_network": None,
                    "wifi_channel": None,
                    "icon": _icon_of(view, parts),
                    "supported": True,
                    "interviewing": False,
                    "available": (reachable is True) and node_available
                    if reachable is not None
                    else (node_available or None),
                    "last_seen": self._last_msg.get(node_id),
                    "commissioned": None,
                    "signal": None,
                    "battery": b_battery["percent"],
                    "voltage": b_battery["voltage"],
                    "battery_level": b_battery["level"],
                    "battery_replace": b_battery["replace"],
                    "battery_present": b_battery["present"],
                    "fabrics_count": 0,
                    "bindings": [],
                    "binding_endpoints": [],
                    "functions": _functions_of(view, parts),
                    "image_keys": _image_keys(
                        _str(view.get(ep, C_BRIDGED, 12)), b_product, b_plabel, b_model
                    ),
                    "ota": {
                        "capable": False,
                        "state": None,
                        "latest": None,
                        "latest_int": None,
                        "notes_url": None,
                        "source": None,
                        "checked_at": None,
                        "progress": None,
                    },
                }
            )
        return result

    def _battery_state(self, device: dict[str, Any], low_t: int, crit_t: int) -> str | None:
        percent = device["battery"]
        if percent is not None:
            if percent < crit_t:
                return "critical"
            if percent < low_t:
                return "low"
            return "ok"
        level = device["battery_level"]
        if level == "critical":
            return "critical"
        if level == "warning":
            return "low"
        return "ok" if level == "ok" else None

    def _build_fabrics(self) -> list[dict[str, Any]]:
        """Ökosysteme (Fabrics), mit denen die Geräte verbunden sind (Multi-Admin)."""
        groups: dict[str, dict[str, Any]] = {}
        for node_id, node in self._nodes.items():
            view = _NodeView(node)
            current = _int(view.get(0, C_OPCRED, 5))
            for entry in _as_list(view.get(0, C_OPCRED, 1)):
                if not isinstance(entry, dict):
                    continue
                index = _int(_field(entry, 254, "fabricIndex"))
                root = _field(entry, 1, "rootPublicKey")
                vendor = _int(_field(entry, 2, "vendorID"))
                fabric_id = _field(entry, 3, "fabricID")
                label = _str(_field(entry, 5, "label"))
                key = root if isinstance(root, str) and root else f"{vendor}:{fabric_id}"
                own = index is not None and index == current
                group = groups.setdefault(
                    key,
                    {
                        "key": key,
                        "label": "",
                        "vendor_id": vendor,
                        "vendor_name": None,
                        "fabric_id": str(fabric_id) if fabric_id is not None else None,
                        "own": False,
                        "members": [],
                    },
                )
                group["own"] = group["own"] or own
                if label and not group["label"]:
                    group["label"] = label
                group["members"].append(
                    {
                        "id": str(node_id),
                        "name": self._node_names.get(node_id) or f"Node {node_id}",
                        "fabric_index": index,
                        "own": own,
                    }
                )
        for group in groups.values():
            vendor = group["vendor_id"]
            group["vendor_name"] = _KNOWN_VENDORS.get(vendor or -1) or self._vendor_names.get(
                vendor or -1
            )
            group["members"].sort(key=lambda m: m["name"].lower())
        return sorted(
            groups.values(),
            key=lambda g: (
                not g["own"],
                (g["label"] or g["vendor_name"] or g["key"]).lower(),
            ),
        )

    def _rebuild(self) -> None:
        registry = self._registry_index()
        names: dict[int, str] = {}
        for node_id, node in self._nodes.items():
            names[node_id] = (
                self._registry_name(registry.get(node_id, {}).get(None, []))
                or self._basic_name(node, node_id)
            )
        self._node_names = names

        devices: list[dict[str, Any]] = []
        for node_id in sorted(self._nodes):
            devices.extend(self._serialize_node(node_id, self._nodes[node_id], names, registry))
        devices.sort(key=lambda d: (d["name"] or "").lower())
        _fill_missing_vendors(devices)

        low_t = self.low_battery_threshold
        crit_t = self.critical_battery_threshold
        for device in devices:
            device["battery_state"] = self._battery_state(device, low_t, crit_t)

        offline = [d for d in devices if d["available"] is False]
        low = [d for d in devices if d["battery_state"] in ("low", "critical")]
        critical = [d for d in devices if d["battery_state"] == "critical"]
        available = [d for d in devices if d["ota"]["state"] == "available"]
        updating = [d for d in devices if d["ota"]["state"] == "updating"]
        fabrics = self._build_fabrics()

        info = self.server_info
        schema = _int(info.get("schema_version"))
        compressed = _int(info.get("compressed_fabric_id"))
        fabric_id = info.get("fabric_id")

        self.details = {
            "offline": [d["name"] for d in offline],
            "low_battery": [d["name"] for d in low],
            "updates_available": [d["name"] for d in available],
        }
        self.data = {
            "server": {
                "online": self.server_online,
                "url": self.url,
                "compatible": schema is None or schema >= MIN_SCHEMA_VERSION,
                "min_schema_version": MIN_SCHEMA_VERSION,
                "schema_version": schema,
                "sdk_version": _str(info.get("sdk_version")),
                "fabric_id": str(fabric_id) if fabric_id is not None else None,
                "compressed_fabric_id": f"{compressed:016X}" if compressed is not None else None,
                "wifi_credentials_set": info.get("wifi_credentials_set"),
                "thread_credentials_set": info.get("thread_credentials_set"),
                "bluetooth_enabled": info.get("bluetooth_enabled"),
                "node_count": len(self._nodes),
            },
            "stats": {
                "total": len(devices),
                "offline": len(offline),
                "low_battery": len(low),
                "critical_battery": len(critical),
                "updates_available": len(available),
                "updating": len(updating),
                "fabrics": len(fabrics),
                "low_battery_threshold": low_t,
                "critical_battery_threshold": crit_t,
            },
            "jobs": dict(self.jobs),
            "app": dict(self.app),
            "events": list(self._events),
            "fabrics": fabrics,
            "devices": devices,
        }

    # ------------------------------------------------------------------
    # Ereignisse (offline / Batterie / Update / beigetreten)
    # ------------------------------------------------------------------
    def _snapshot_sets(self) -> dict[str, set[str]]:
        devices = self.data["devices"]
        return {
            "offline": {d["id"] for d in devices if d["available"] is False},
            "low": {d["id"] for d in devices if d["battery_state"] in ("low", "critical")},
            "update": {d["id"] for d in devices if d["ota"]["state"] == "available"},
        }

    @callback
    def _fire(self, event: str, data: dict[str, Any]) -> None:
        if self.fire_events:
            self.hass.bus.async_fire(event, data)

    def _detect_changes(self) -> None:
        current = self._snapshot_sets()
        previous = self._baseline
        self._baseline = current
        if previous is None or not self._nodes or not self.server_online:
            return  # erster Durchlauf bzw. Server offline: keine Ereignisse

        by_id = {d["id"]: d for d in self.data["devices"]}
        for did in current["offline"] - previous["offline"]:
            d = by_id[did]
            self._log("offline", d["name"])
            self._fire(EVENT_DEVICE_OFFLINE, {"name": d["name"], "node_id": d["node_id"], "id": did})
        for did in previous["offline"] - current["offline"]:
            d = by_id.get(did)
            if d:
                self._log("online", d["name"])
                self._fire(EVENT_DEVICE_ONLINE, {"name": d["name"], "node_id": d["node_id"], "id": did})
        for did in current["low"] - previous["low"]:
            d = by_id[did]
            detail = f"{d['battery']} %" if d["battery"] is not None else d["battery_level"]
            self._log("battery_low", d["name"], detail)
            self._fire(
                EVENT_BATTERY_LOW,
                {
                    "name": d["name"],
                    "node_id": d["node_id"],
                    "id": did,
                    "battery": d["battery"],
                },
            )
        for did in current["update"] - previous["update"]:
            d = by_id[did]
            self._log("update_available", d["name"], d["ota"].get("latest"))
            self._fire(
                EVENT_UPDATE_AVAILABLE,
                {
                    "name": d["name"],
                    "node_id": d["node_id"],
                    "id": did,
                    "installed": d["sw_version"],
                    "latest": d["ota"].get("latest"),
                },
            )

    # ------------------------------------------------------------------
    # Details auf Anforderung
    # ------------------------------------------------------------------
    def _resolve(self, device_id: Any) -> tuple[int, int | None]:
        """"5" -> (5, None); "5:3" -> (5, 3) für ein Gerät hinter einer Bridge."""
        text = str(device_id or "")
        head, _sep, tail = text.partition(":")
        if not head.isdigit() or (tail and not tail.isdigit()):
            raise ValueError(f"Unbekanntes Gerät: {device_id}")
        node_id = int(head)
        node = self._nodes.get(node_id)
        if node is None:
            raise ValueError(f"Unbekanntes Gerät: {device_id}")
        if tail:
            endpoint = int(tail)
            if endpoint not in _NodeView(node).bridged:
                raise ValueError(f"Unbekanntes Gerät: {device_id}")
            return node_id, endpoint
        return node_id, None

    def _require_node(self, device_id: Any) -> int:
        node_id, endpoint = self._resolve(device_id)
        if endpoint is not None:
            raise ValueError(
                "Dieses Gerät hängt an einer Bridge und wird dort verwaltet."
            )
        return node_id

    async def async_device_details(self, device_id: Any) -> dict[str, Any]:
        """Entitäten und IP-Adressen eines Geräts (nur für Administratoren)."""
        node_id, endpoint = self._resolve(device_id)
        addresses: list[str] = []
        if endpoint is None:
            try:
                result = await self.client.send_command(
                    "get_node_ip_addresses",
                    request_timeout=10,
                    node_id=node_id,
                    prefer_cache=True,
                )
                addresses = [a for a in _as_list(result) if isinstance(a, str)]
            except MatterServerError as err:
                _LOGGER.debug("IP-Adressen von Node %s nicht lesbar: %s", node_id, err)
        return {
            "id": str(device_id),
            "entities": self._entities_of(node_id, endpoint),
            "ip_addresses": addresses,
        }

    # ------------------------------------------------------------------
    # Hintergrund-Aufträge
    # ------------------------------------------------------------------
    def _spawn(self, coro: Coroutine[Any, Any, Any], name: str) -> asyncio.Task[Any]:
        task = self.entry.async_create_background_task(
            self.hass, coro, f"{DOMAIN}_{name}"
        )
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return task

    def _spawn_op(self, topic: str, coro: Coroutine[Any, Any, Any]) -> None:
        """Befehl im Hintergrund ausführen; das Ergebnis geht als Antwort an die Karte."""

        async def runner() -> None:
            try:
                data = await coro
            except asyncio.CancelledError:
                raise
            except (MatterServerError, ValueError) as err:
                self._notify(
                    "response",
                    {"topic": topic, "status": "error", "error": str(err), "data": None},
                )
            except Exception as err:  # noqa: BLE001
                _LOGGER.exception("Unerwarteter Fehler bei %s", topic)
                self._notify(
                    "response",
                    {"topic": topic, "status": "error", "error": str(err), "data": None},
                )
            else:
                self._notify(
                    "response",
                    {"topic": topic, "status": "ok", "error": None, "data": data},
                )

        self._spawn(runner(), f"op_{topic}")

    def _start_job(self, name: str, coro: Coroutine[Any, Any, Any]) -> None:
        running = self.jobs.get(name)
        if running and running.get("running"):
            coro.close()
            raise ValueError("Der Vorgang läuft bereits")
        task = self.entry.async_create_background_task(
            self.hass, coro, f"{DOMAIN}_{name}"
        )
        self._job_tasks.add(task)
        task.add_done_callback(self._job_tasks.discard)

    def _set_job(self, name: str, **values: Any) -> None:
        self.jobs[name] = values or None
        self._rebuild()
        self._notify("update", self.data)

    # --- Geräte -------------------------------------------------------
    async def async_rename(self, device_id: Any, new_name: str) -> None:
        node_id, endpoint = self._resolve(device_id)
        new_name = (new_name or "").strip()
        if not new_name:
            raise ValueError("Der neue Name darf nicht leer sein")
        if len(new_name) > 100:
            raise ValueError("Der Name ist zu lang (höchstens 100 Zeichen)")
        self._spawn_op("rename", self._do_rename(node_id, endpoint, new_name))

    async def _do_rename(self, node_id: int, endpoint: int | None, new_name: str) -> None:
        index = self._registry_index().get(node_id, {})
        if endpoint is None:
            # Gerät der Matter-Integration (Knoten-Ebene); ältere Versionen nutzen
            # keine Endpunkt-Nummer im Bezeichner
            devices = list(index.get(None, []))
        else:
            devices = list(index.get(endpoint, []))
        registry = dr.async_get(self.hass)
        for device in devices:
            registry.async_update_device(device.id, name_by_user=new_name)

        # Zusätzlich die Bezeichnung im Gerät selbst setzen (max. 32 Zeichen)
        if endpoint is None and len(new_name) <= 32:
            try:
                await self.client.send_command(
                    "write_attribute",
                    node_id=node_id,
                    attribute_path="0/40/5",
                    value=new_name,
                )
            except MatterServerError as err:
                if not devices:
                    raise
                _LOGGER.debug("NodeLabel von Node %s nicht gesetzt: %s", node_id, err)
        elif not devices:
            raise ValueError("Kein Home-Assistant-Gerät zu diesem Matter-Gerät gefunden")
        self._schedule_update()

    async def async_remove(self, device_id: Any) -> None:
        node_id = self._require_node(device_id)
        self._spawn_op(
            "remove",
            self.client.send_command(
                "remove_node", request_timeout=_T_REMOVE, node_id=node_id
            ),
        )

    async def async_ping(self, device_id: Any) -> None:
        node_id = self._require_node(device_id)
        self._spawn_op("ping", self._do_ping(node_id))

    async def _do_ping(self, node_id: int) -> dict[str, Any]:
        result = await self.client.send_command(
            "ping_node", request_timeout=40, node_id=node_id
        )
        reachable = result if isinstance(result, dict) else {}
        return {
            "reachable": sum(1 for v in reachable.values() if v is True),
            "total": len(reachable),
        }

    async def async_interview(self, device_id: Any) -> None:
        node_id = self._require_node(device_id)
        self._spawn_op(
            "interview",
            self.client.send_command(
                "interview_node", request_timeout=_T_INTERVIEW, node_id=node_id
            ),
        )

    # --- Funktionen (Expose) ------------------------------------------
    def _function_row(self, device_id: Any, function: Any) -> tuple[int, dict[str, Any]]:
        """Knoten-ID und Funktionszeile zu einem Gerät und einer Funktions-ID ("1/6/0")."""
        node_id, endpoint = self._resolve(device_id)
        view = _NodeView(self._nodes[node_id])
        if endpoint is None:
            endpoints: set[int] = set(view.owned)
        else:
            endpoints = view.descendants(endpoint) | {endpoint}
        if not isinstance(function, str) or not function:
            raise ValueError("Keine Funktion angegeben")
        row = next((r for r in _functions_of(view, endpoints) if r["id"] == function), None)
        if row is None:
            raise ValueError(f"Unbekannte Funktion: {function}")
        return node_id, row

    async def async_set_function(self, device_id: Any, function: Any, value: Any) -> None:
        """Einen Ein/Aus-Schalter eines Geräts umlegen.

        Geprüft wird alles im Backend: Das Gerät muss bekannt und erreichbar sein, die
        Funktion muss in seinen Funktionen stehen und ein Ein/Aus-Schalter sein, und der
        Wert muss ein Ja/Nein-Wert sein. Es gibt bewusst nur "Ein" und "Aus" (kein
        "Umschalten"), damit das Ergebnis eindeutig ist.
        """
        node_id, row = self._function_row(device_id, function)
        if not row["switchable"]:
            raise ValueError("Diese Funktion lässt sich nicht schalten")
        if not isinstance(value, bool):
            raise ValueError("Ungültiger Wert (erwartet: Ein oder Aus)")
        if self._nodes[node_id].get("available") is not True:
            raise ValueError("Das Gerät ist nicht erreichbar")
        self._spawn_op(
            "function",
            self.client.send_command(
                "device_command",
                request_timeout=20,
                node_id=node_id,
                endpoint_id=row["endpoint"],
                cluster_id=C_ONOFF,
                command_name="On" if value else "Off",
                payload={},
            ),
        )

    # --- Fabrics (Multi-Admin) ----------------------------------------
    def _fabric_entries(self, node_id: int) -> tuple[list[int], int | None]:
        view = _NodeView(self._nodes[node_id])
        indexes = [
            i
            for i in (
                _int(_field(e, 254, "fabricIndex"))
                for e in _as_list(view.get(0, C_OPCRED, 1))
            )
            if i is not None
        ]
        return indexes, _int(view.get(0, C_OPCRED, 5))

    async def async_fabric_remove(self, device_id: Any, fabric_index: Any) -> None:
        node_id = self._require_node(device_id)
        try:
            index = int(fabric_index)
        except (TypeError, ValueError) as err:
            raise ValueError("Ungültige Fabric") from err
        indexes, current = self._fabric_entries(node_id)
        if index not in indexes:
            raise ValueError("Diese Fabric ist auf dem Gerät nicht vorhanden")
        if index == current:
            raise ValueError(
                "Die eigene Fabric kann hier nicht entfernt werden – entferne stattdessen das Gerät"
            )
        self._spawn_op(
            "fabric_remove",
            self.client.send_command(
                "remove_matter_fabric", node_id=node_id, fabric_index=index
            ),
        )

    async def async_open_window(self, device_id: Any) -> None:
        node_id = self._require_node(device_id)
        self._spawn_op("open_window", self._do_open_window(node_id))

    async def _do_open_window(self, node_id: int) -> dict[str, Any]:
        result = await self.client.send_command(
            "open_commissioning_window",
            request_timeout=60,
            node_id=node_id,
            timeout=COMMISSIONING_WINDOW_SECONDS,
            iteration=1000,
            option=1,
        )
        params = result if isinstance(result, dict) else {}
        return {
            "id": str(node_id),
            "manual_code": params.get("setup_manual_code"),
            "qr_code": params.get("setup_qr_code"),
            "seconds": COMMISSIONING_WINDOW_SECONDS,
        }

    # --- Inbetriebnahme -----------------------------------------------
    @staticmethod
    def _valid_code(code: Any) -> str:
        text = str(code or "").strip()
        if text.upper().startswith("MT:"):
            text = "MT:" + text[3:].strip()
            if _CODE_QR_RE.match(text):
                return text
        else:
            digits = re.sub(r"[\s\-]", "", text)
            if _CODE_MANUAL_RE.match(digits):
                return digits
        raise ValueError(
            "Ungültiger Setup-Code (erwartet: QR-Text „MT:…“ oder 11-/21-stelliger Code)"
        )

    async def async_commission(self, code: Any, network_only: bool = False) -> None:
        code = self._valid_code(code)
        job = self.jobs.get("commission")
        if job and job.get("running"):
            raise ValueError("Es läuft bereits eine Inbetriebnahme")
        self._spawn_op("commission", self._run_commission(code, bool(network_only)))

    async def _run_commission(self, code: str, network_only: bool) -> dict[str, Any]:
        self._set_job("commission", running=True, started=_now())
        try:
            result = await self.client.send_command(
                "commission_with_code",
                request_timeout=_T_COMMISSION,
                code=code,
                network_only=network_only,
            )
        finally:
            self._set_job("commission")
        node_id = _int(result.get("node_id")) if isinstance(result, dict) else None
        return {"node_id": node_id}

    # --- OTA ----------------------------------------------------------
    def _require_ota(self, node_id: int) -> None:
        view = _NodeView(self._nodes[node_id])
        if C_OTA not in view.servers.get(0, set()):
            raise ValueError("Dieses Gerät unterstützt keine OTA-Updates.")

    @staticmethod
    def _parse_update(result: Any) -> dict[str, Any]:
        checked = _now()
        if not isinstance(result, dict) or result.get("software_version") is None:
            return {"available": False, "checked_at": checked}
        number = _int(result.get("software_version"))
        text = _str(result.get("software_version_string"))
        url = result.get("release_notes_url")
        return {
            "available": True,
            "latest": text or (str(number) if number is not None else None),
            "latest_int": number,
            "notes_url": url if isinstance(url, str) and url.startswith("https://") else None,
            "source": _str(result.get("update_source")),
            "checked_at": checked,
        }

    async def _check_update(self, node_id: int) -> dict[str, Any]:
        result = await self.client.send_command(
            "check_node_update", request_timeout=_T_UPDATE_CHECK, node_id=node_id
        )
        entry = self._parse_update(result)
        self._updates[node_id] = entry
        self._schedule_update()
        return entry

    async def async_ota_check(self, device_id: Any) -> None:
        node_id = self._require_node(device_id)
        self._require_ota(node_id)
        self._spawn_op("ota_check", self._check_one(node_id))

    async def _check_one(self, node_id: int) -> dict[str, Any]:
        entry = await self._check_update(node_id)
        return {"updateAvailable": bool(entry.get("available")), "latest": entry.get("latest")}

    async def async_ota_update(self, device_id: Any) -> None:
        node_id = self._require_node(device_id)
        self._require_ota(node_id)
        upd = self._updates.get(node_id)
        if not upd or not upd.get("available"):
            raise ValueError("Kein Update bekannt – bitte zuerst nach Updates suchen")
        version = upd.get("latest_int")
        if version is None:
            version = upd.get("latest")
        self._spawn_op("ota_update", self._do_update(node_id, version))

    async def _do_update(self, node_id: int, version: Any) -> None:
        await self.client.send_command(
            "update_node",
            request_timeout=_T_UPDATE_CHECK,
            node_id=node_id,
            software_version=version,
        )

    async def async_ota_check_all(self) -> None:
        """Startet die Prüfung im Hintergrund (blockiert die Karte nicht)."""
        self._start_job("ota", self._run_check_all())

    async def _run_check_all(self) -> None:
        targets = [
            d["node_id"]
            for d in self.data["devices"]
            if d["ota"]["capable"] and not d["bridged"]
        ]
        total = len(targets)
        try:
            for done, node_id in enumerate(targets, start=1):
                self._set_job("ota", kind="check", running=True, done=done - 1, total=total)
                try:
                    await self._check_update(node_id)
                except MatterServerError as err:
                    if self.server_online is False:
                        raise
                    _LOGGER.debug("Update-Prüfung für Node %s fehlgeschlagen: %s", node_id, err)
                await asyncio.sleep(OTA_CHECK_SPACING)
        finally:
            self._set_job("ota", kind="check", running=False, done=total, total=total)

    async def async_ota_update_all(self) -> None:
        """Installiert verfügbare Updates nacheinander (nie parallel)."""
        self._start_job("ota", self._run_update_all())

    async def _run_update_all(self) -> None:
        targets = [
            d
            for d in self.data["devices"]
            if d["ota"]["state"] == "available" and not d["bridged"] and d["available"] is not False
        ]
        total = len(targets)
        try:
            for done, device in enumerate(targets, start=1):
                self._set_job(
                    "ota",
                    kind="update",
                    running=True,
                    done=done - 1,
                    total=total,
                    current=device["name"],
                )
                upd = self._updates.get(device["node_id"]) or {}
                version = upd.get("latest_int")
                if version is None:
                    version = upd.get("latest")
                try:
                    await self._do_update(device["node_id"], version)
                except MatterServerError as err:
                    if self.server_online is False:
                        raise
                    self._notify(
                        "response",
                        {
                            "topic": "ota_update",
                            "status": "error",
                            "error": f"{device['name']}: {err}",
                            "data": None,
                        },
                    )
                    continue
                await self._wait_until_finished(device["id"])
        finally:
            self._set_job("ota", kind="update", running=False, done=total, total=total)

    async def _wait_until_finished(self, device_id: str) -> None:
        """Wartet, bis das Gerät nicht mehr 'updating' meldet (max. 2 h)."""

        def state() -> str | None:
            for device in self.data["devices"]:
                if device["id"] == device_id:
                    return device["ota"]["state"]
            return None

        # Auf den Start warten (max. 3 Minuten), dann auf das Ende (max. 2 h)
        for _ in range(36):
            await asyncio.sleep(5)
            if state() == "updating":
                break
        else:
            return
        for _ in range(1440):
            await asyncio.sleep(5)
            if state() != "updating":
                return

    async def async_ota_cancel(self) -> None:
        for task in list(self._job_tasks):
            task.cancel()

    # --- Bindings -----------------------------------------------------
    @staticmethod
    def _servers_with(view: _NodeView, cluster: int) -> list[int]:
        return sorted(
            ep for ep, clusters in view.servers.items() if ep != 0 and cluster in clusters
        )

    def _binding_entries(self, view: _NodeView, endpoint: int, fabric: int | None) -> list[dict[str, Any]]:
        return [
            _norm_binding(e, fabric)
            for e in _as_list(view.get(endpoint, C_BINDING, 0))
            if isinstance(e, dict)
        ]

    async def async_bind(
        self, device_id: Any, endpoint: Any, target: Any, clusters: Any
    ) -> None:
        source = self._require_node(device_id)
        target_id = self._require_node(str(target or "").split(":", 1)[0])
        if target_id == source:
            raise ValueError("Quelle und Ziel müssen verschiedene Geräte sein")

        src_view = _NodeView(self._nodes[source])
        tgt_view = _NodeView(self._nodes[target_id])
        capable = {
            c["endpoint"]: c["clusters"]
            for c in self._bindings_of(src_view, self._node_names)[1]
        }
        if not capable:
            raise ValueError("Dieses Gerät kann keine Bindings anlegen")
        try:
            src_ep = int(endpoint) if endpoint not in (None, "") else min(capable)
        except (TypeError, ValueError) as err:
            raise ValueError("Ungültiger Endpunkt") from err
        if src_ep not in capable:
            raise ValueError("Dieser Endpunkt unterstützt keine Bindings")

        wanted: list[int] = []
        for c in _as_list(clusters):
            try:
                wanted.append(int(c))
            except (TypeError, ValueError):
                wanted.append(next((k for k, v in CLUSTER_NAMES.items() if v == c), -1))
        if not wanted:
            wanted = [c["id"] for c in capable[src_ep]]
        pairs: list[tuple[int, int]] = []  # (Cluster, Ziel-Endpunkt)
        for cluster in dict.fromkeys(wanted):
            eps = self._servers_with(tgt_view, cluster)
            if eps:
                pairs.append((cluster, eps[0]))
        if not pairs:
            raise ValueError("Das Zielgerät unterstützt keinen der gewählten Cluster")
        self._spawn_op("bind", self._do_bind(source, src_ep, target_id, pairs))

    async def _do_bind(
        self, source: int, src_ep: int, target_id: int, pairs: list[tuple[int, int]]
    ) -> None:
        src_view = _NodeView(self._nodes[source])
        tgt_view = _NodeView(self._nodes[target_id])
        src_fabric = _int(src_view.get(0, C_OPCRED, 5))
        tgt_fabric = _int(tgt_view.get(0, C_OPCRED, 5))

        # 1) Das Ziel muss dem Quellgerät Zugriff erlauben (Access Control List)
        existing_raw = [e for e in _as_list(tgt_view.get(0, C_ACL, 0)) if isinstance(e, dict)]
        acl = [_norm_acl(e) for e in existing_raw]
        if not any(
            e["privilege"] == _PRIVILEGE_ADMINISTER and e["authMode"] == _AUTH_CASE
            for e in acl
        ):
            raise ValueError(
                "Die Zugriffsliste des Zielgeräts ist nicht lesbar – Binding aus Sicherheitsgründen abgebrochen"
            )
        covered = any(
            (e["privilege"] or 0) >= _PRIVILEGE_OPERATE
            and e["authMode"] == _AUTH_CASE
            and e["targets"] is None
            and (not e["subjects"] or source in e["subjects"])
            for e in acl
        )
        if not covered:
            acl.append(
                {
                    "privilege": _PRIVILEGE_OPERATE,
                    "authMode": _AUTH_CASE,
                    "subjects": [source],
                    "targets": [
                        {"cluster": c, "endpoint": ep, "deviceType": None} for c, ep in pairs
                    ],
                    "fabricIndex": tgt_fabric or 0,
                }
            )
            await self.client.send_command("set_acl_entry", node_id=target_id, entry=acl)

        # 2) Binding auf dem Quellgerät eintragen
        current = self._binding_entries(src_view, src_ep, src_fabric)
        for cluster, ep in pairs:
            entry = {
                "node": target_id,
                "group": None,
                "endpoint": ep,
                "cluster": cluster,
                "fabricIndex": src_fabric or 0,
            }
            if not any(
                (b["node"], b["endpoint"], b["cluster"]) == (target_id, ep, cluster)
                for b in current
            ):
                current.append(entry)
        await self.client.send_command(
            "set_node_binding", node_id=source, endpoint=src_ep, bindings=current
        )

    async def async_unbind(
        self, device_id: Any, endpoint: Any, target: Any, clusters: Any
    ) -> None:
        source = self._require_node(device_id)
        text = str(target or "")
        if text.startswith("group:"):
            raise ValueError("Gruppen-Bindings werden nicht unterstützt")
        node_part, _sep, ep_part = text.partition(":")
        if not node_part.isdigit():
            raise ValueError("Ungültiges Ziel")
        target_node = int(node_part)
        target_ep = int(ep_part) if ep_part.isdigit() else None
        cluster_list = _as_list(clusters)
        cluster = int(cluster_list[0]) if cluster_list and str(cluster_list[0]).isdigit() else None
        try:
            src_ep = int(endpoint)
        except (TypeError, ValueError) as err:
            raise ValueError("Ungültiger Endpunkt") from err
        self._spawn_op(
            "unbind", self._do_unbind(source, src_ep, target_node, target_ep, cluster)
        )

    async def _do_unbind(
        self,
        source: int,
        src_ep: int,
        target_node: int,
        target_ep: int | None,
        cluster: int | None,
    ) -> None:
        view = _NodeView(self._nodes[source])
        fabric = _int(view.get(0, C_OPCRED, 5))
        current = self._binding_entries(view, src_ep, fabric)
        kept = [
            b
            for b in current
            if not (
                b["node"] == target_node
                and (target_ep is None or b["endpoint"] == target_ep)
                and (cluster is None or b["cluster"] == cluster)
            )
        ]
        if len(kept) == len(current):
            raise ValueError("Dieses Binding existiert nicht mehr")
        await self.client.send_command(
            "set_node_binding", node_id=source, endpoint=src_ep, bindings=kept
        )

    # --- Server -------------------------------------------------------
    async def async_set_fabric_label(self, label: Any) -> None:
        text = str(label or "").strip()
        if not text or len(text) > 32:
            raise ValueError("Die Bezeichnung muss 1 bis 32 Zeichen lang sein")
        self._spawn_op(
            "fabric_label",
            self.client.send_command("set_default_fabric_label", label=text),
        )

    async def async_reconnect(self) -> None:
        await self.client.async_reconnect()
        self._notify(
            "response",
            {"topic": "reconnect", "status": "ok", "error": None, "data": None},
        )

    def _request_vendor_names(self) -> None:
        """Hersteller-Namen unbekannter Fabric-Hersteller beim Server erfragen."""
        wanted: set[int] = set()
        for node in self._nodes.values():
            view = _NodeView(node)
            for entry in _as_list(view.get(0, C_OPCRED, 1)):
                vendor = _int(_field(entry, 2, "vendorID"))
                if vendor is not None and vendor not in _KNOWN_VENDORS:
                    wanted.add(vendor)
        wanted -= self._vendors_requested
        if not wanted:
            return
        self._vendors_requested |= wanted
        self._spawn(self._fetch_vendor_names(sorted(wanted)), "vendor_names")

    async def _fetch_vendor_names(self, vendors: list[int]) -> None:
        try:
            result = await self.client.send_command(
                "get_vendor_names", request_timeout=30, filter_vendors=vendors
            )
        except MatterServerError as err:
            _LOGGER.debug("Hersteller-Namen nicht abrufbar: %s", err)
            return
        if isinstance(result, dict):
            for key, name in result.items():
                if str(key).isdigit() and isinstance(name, str) and name:
                    self._vendor_names[int(key)] = name
            self._schedule_update()

    # --- App-Version --------------------------------------------------
    @callback
    def _app_update_tick(self, _now: datetime) -> None:
        self._spawn(self.async_check_app_update(), "app_update_check")

    async def async_check_app_update(self) -> None:
        """Auf GitHub nach einer neueren Version der App suchen."""
        latest = await async_fetch_latest(self.hass)
        checked = _now()
        if latest is None:
            self.app = {**self.app, "checked_at": checked, "check_failed": True}
        else:
            self.app = {
                **self.app,
                "latest_version": latest["version"],
                "release_url": latest["url"],
                "update_available": is_newer(latest["version"], VERSION),
                "checked_at": checked,
                "check_failed": False,
            }
        self._schedule_update()


type MatterConfigEntry = ConfigEntry[MatterManager]
