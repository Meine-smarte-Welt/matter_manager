# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): d69f7a237475805324fdf425bc4bda725a8a64b4104c9b9f901d3eea90f11405
"""WebSocket-API zwischen Lovelace-Karte und Integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, WS_ACTION, WS_DETAILS, WS_SUBSCRIBE
from .manager import MatterManager

ACTIONS = [
    # Geräte
    "rename",
    "remove",
    "ping",
    "interview",
    # Firmware
    "ota_check",
    "ota_update",
    "ota_check_all",
    "ota_update_all",
    "ota_cancel",
    # Fabrics (Multi-Admin)
    "open_window",
    "fabric_remove",
    # Bindings
    "bind",
    "unbind",
    # Server
    "commission",
    "fabric_label",
    "reconnect",
    "app_update_check",
]


def _get_manager(hass: HomeAssistant, entry_id: str | None) -> MatterManager | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry_id and entry.entry_id != entry_id:
            continue
        if entry.state is ConfigEntryState.LOADED:
            return entry.runtime_data
    return None


@callback
def async_register_websocket_api(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_subscribe)
    websocket_api.async_register_command(hass, ws_action)
    websocket_api.async_register_command(hass, ws_details)


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_SUBSCRIBE,
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Live-Daten abonnieren (Snapshot + Updates + Antworten auf Befehle)."""
    manager = _get_manager(hass, msg.get("entry_id"))
    if manager is None:
        connection.send_error(
            msg["id"], "not_found", "Keine aktive Matter-Manager-Instanz"
        )
        return

    @callback
    def forward(kind: str, payload: Any) -> None:
        connection.send_message(
            websocket_api.event_message(msg["id"], {"kind": kind, "data": payload})
        )

    connection.subscriptions[msg["id"]] = manager.async_add_listener(forward)
    connection.send_result(msg["id"])
    forward("update", manager.data)


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_DETAILS,
        vol.Optional("entry_id"): str,
        vol.Required("device"): str,
    }
)
@websocket_api.async_response
async def ws_details(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Entitäten und IP-Adressen eines Geräts."""
    manager = _get_manager(hass, msg.get("entry_id"))
    if manager is None:
        connection.send_error(
            msg["id"], "not_found", "Keine aktive Matter-Manager-Instanz"
        )
        return
    try:
        connection.send_result(msg["id"], await manager.async_device_details(msg["device"]))
    except ValueError as err:
        connection.send_error(msg["id"], "invalid", str(err))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_ACTION,
        vol.Optional("entry_id"): str,
        vol.Required("action"): vol.In(ACTIONS),
        vol.Optional("device"): str,
        vol.Optional("endpoint"): vol.Any(int, str),
        vol.Optional("target"): str,
        vol.Optional("clusters"): [vol.Any(str, int)],
        vol.Optional("fabric_index"): vol.Any(int, str),
        vol.Optional("value"): vol.Any(str, bool, int, float, dict),
    }
)
@websocket_api.async_response
async def ws_action(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Schreibende Aktionen (nur Administratoren).

    Langsame Befehle (Inbetriebnahme, Updates, Entfernen …) laufen im Hintergrund;
    ihr Ergebnis kommt als "response"-Ereignis über das Abonnement der Karte.
    """
    manager = _get_manager(hass, msg.get("entry_id"))
    if manager is None:
        connection.send_error(
            msg["id"], "not_found", "Keine aktive Matter-Manager-Instanz"
        )
        return

    action = msg["action"]
    device = msg.get("device")
    value = msg.get("value")

    try:
        if action == "rename":
            await manager.async_rename(device, str(value or ""))
        elif action == "remove":
            await manager.async_remove(device)
        elif action == "ping":
            await manager.async_ping(device)
        elif action == "interview":
            await manager.async_interview(device)
        elif action == "ota_check":
            await manager.async_ota_check(device)
        elif action == "ota_update":
            await manager.async_ota_update(device)
        elif action == "ota_check_all":
            await manager.async_ota_check_all()
        elif action == "ota_update_all":
            await manager.async_ota_update_all()
        elif action == "ota_cancel":
            await manager.async_ota_cancel()
        elif action == "open_window":
            await manager.async_open_window(device)
        elif action == "fabric_remove":
            await manager.async_fabric_remove(device, msg.get("fabric_index"))
        elif action == "bind":
            await manager.async_bind(
                device, msg.get("endpoint"), msg.get("target"), msg.get("clusters")
            )
        elif action == "unbind":
            await manager.async_unbind(
                device, msg.get("endpoint"), msg.get("target"), msg.get("clusters")
            )
        elif action == "commission":
            await manager.async_commission(
                value.get("code") if isinstance(value, dict) else value,
                bool(value.get("network_only")) if isinstance(value, dict) else False,
            )
        elif action == "fabric_label":
            await manager.async_set_fabric_label(value)
        elif action == "reconnect":
            await manager.async_reconnect()
        elif action == "app_update_check":
            await manager.async_check_app_update()
    except ValueError as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return

    connection.send_result(msg["id"])
