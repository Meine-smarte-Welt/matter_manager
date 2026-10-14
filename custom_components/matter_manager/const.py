# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 2467893ffd7f23976bb18a9aa79a8476bed9f09249033f4d8ced8a5d10f5087a
"""Konstanten für Matter Manager."""

from datetime import timedelta

DOMAIN = "matter_manager"
VERSION = "1.0.2"

CONF_URL = "url"
CONF_LOW_BATTERY = "low_battery_threshold"
CONF_CRITICAL_BATTERY = "critical_battery_threshold"
CONF_FIRE_EVENTS = "fire_events"

# Standard-Adresse des Matter-Server-Add-ons in Home Assistant OS
DEFAULT_URL = "ws://core-matter-server:5580/ws"
DEFAULT_LOW_BATTERY = 20
DEFAULT_CRITICAL_BATTERY = 10
DEFAULT_FIRE_EVENTS = True

# Statische Auslieferung der Lovelace-Karte (Ordner "www")
CARD_URL_BASE = "/matter_manager"
# Bis 1.0.1 wurde die Karte unter diesem Pfad ausgeliefert (wird beim Start migriert)
LEGACY_CARD_URL_BASE = "/matter_manager_files"
CARD_FILENAME = "matter-manager-card.js"

# Zusammenfassung mehrerer schneller Matter-Nachrichten zu einem Push
FLUSH_DELAY = 1.0

# Regelmäßiges Neuaufbauen (Signalstärke u. ä. wird nicht bei jeder Änderung gepusht)
PERIODIC_REFRESH = timedelta(seconds=60)

# Wartezeit auf die erste Verbindung beim Start der Integration (Sekunden)
FIRST_CONNECT_TIMEOUT = 20

# Abstand zwischen Update-Prüfungen bei "Alle prüfen" (Sekunden)
OTA_CHECK_SPACING = 1.0

# Dauer des Pairing-Fensters beim Freigeben eines Geräts für ein weiteres Ökosystem
COMMISSIONING_WINDOW_SECONDS = 300

# Persistenter Cache (zuletzt gesehen, Ergebnisse der Update-Prüfung)
STORAGE_VERSION = 1
STORAGE_SAVE_DELAY = 30
MAX_EVENT_LOG = 50

# Mindest-Schema-Version der Matter-Server-API (Bindings, OTA und Fabrics)
MIN_SCHEMA_VERSION = 8

WS_SUBSCRIBE = f"{DOMAIN}/subscribe"
WS_ACTION = f"{DOMAIN}/action"
WS_DETAILS = f"{DOMAIN}/details"

# Eigene Home-Assistant-Events (siehe README)
EVENT_DEVICE_OFFLINE = f"{DOMAIN}_device_offline"
EVENT_DEVICE_ONLINE = f"{DOMAIN}_device_online"
EVENT_BATTERY_LOW = f"{DOMAIN}_battery_low"
EVENT_UPDATE_AVAILABLE = f"{DOMAIN}_update_available"
EVENT_DEVICE_JOINED = f"{DOMAIN}_device_joined"
EVENT_DEVICE_LEFT = f"{DOMAIN}_device_left"

SERVICE_COMMISSION = "commission"
SERVICE_CHECK_UPDATES = "check_updates"

# Prüfung auf neue Versionen der App (GitHub-Releases)
GITHUB_REPO = "Meine-smarte-Welt/matter_manager"
GITHUB_API_LATEST = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
GITHUB_API_TAGS = f"https://api.github.com/repos/{GITHUB_REPO}/tags?per_page=30"
GITHUB_RELEASES_URL = f"https://github.com/{GITHUB_REPO}/releases"
APP_UPDATE_CHECK_INTERVAL = timedelta(hours=12)
