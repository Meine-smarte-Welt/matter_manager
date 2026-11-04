// SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): fe86667bd710cba8940b9ad25251ca0850075db6ed03ae499df8b93c41fd919c
/**
 * matter-manager-card
 * -------------------
 * Custom Lovelace card for the matter_manager Home Assistant integration.
 *
 * Verwaltet Matter-Geräte direkt im Dashboard. Aufbau und Design folgen bewusst
 * der zigbee2mqtt-manager-card und damit der fritzbox-anrufe-card (gleiche
 * Kopfzeile mit Icon-Kategorien, Zeilenliste, Detail-Popup, Akkordeon-Abschnitte,
 * grafischer Karten-Editor mit auf-/zuklappbaren Gruppen und frei einstellbaren
 * Farben):
 *
 *   Geräte      - Liste aller Matter-Geräte mit Erreichbarkeit, Signal, Batterie
 *   Batterie    - batteriebetriebene Geräte, niedrigster Ladestand zuerst
 *   Updates     - OTA-Firmware: prüfen, einzeln oder nacheinander installieren
 *   Funktionen  - alle Funktionen (Expose), die Matter für die Geräte meldet, mit
 *                 aktuellem Wert; Ein/Aus-Schalter lassen sich direkt umlegen
 *   Fabrics     - Ökosysteme (Apple Home, Google Home, Alexa …), mit denen die
 *                 Geräte verbunden sind (Multi-Admin); Verbindung entfernen
 *   Bindings    - Übersicht, Anlegen und Lösen von Gerät-zu-Gerät-Verknüpfungen
 *   Netzwerk    - Netzwerkkarte (seit 1.2.0): Thread (Leader, Router, Endgeräte), WLAN (nach
 *                 Access Point) und Ethernet mit Zoom, Ziehen und Verbindungslisten
 *   Server      - Matter Server: Status, App-Version (mit Update-Hinweis),
 *                 Gerät hinzufügen, Optionen, Neu verbinden, Ereignisprotokoll
 *
 * Jede Kategorie ist einzeln ein-/ausblendbar (show_* im Editor bzw. YAML).
 * Tippt man auf ein Gerät, öffnet sich ein Popup mit Akkordeon-Abschnitten:
 * Info, Funktionen, Entitäten (zum Kopieren für Automationen), Umbenennen (inkl.
 * betroffener Entitäten), Firmware, Bindings, Fabrics (inkl. Freigabe für ein
 * weiteres Ökosystem), Diagnose und Entfernen. Geräte zeigen ein kleines Bild
 * (Namenskandidaten gegen eine Bildbibliothek, sonst das Symbol).
 *
 * Alle schreibenden Aktionen laufen über die Integration und sind dort auf
 * Administratoren beschränkt. Mit `read_only: true` blendet die Karte alle
 * Bedienelemente zum Ändern aus (z. B. für Wandtablets).
 *
 * Farben (Editor-Gruppe "Farben", color_* Schlüssel) akzeptieren Hex, rgb(),
 * hsl() oder var(--...) und fallen bei leerem Wert auf die Theme-Farben zurück.
 * Die Symbolfarbe jeder Kategorie (color_icon_*) färbt Tab-Symbol und die
 * Zeilen-Symbole der Kategorie; ist `color_row_icon` gesetzt, gewinnt diese.
 *
 * Kartentyp: custom:matter-manager-card
 */

const CARD_VERSION = "1.2.0";
// Höchstlänge eines Kommentars (muss zu COMMENT_MAX_LENGTH in const.py passen)
const COMMENT_MAX = 1000;
const RELEASES_URL = "https://github.com/Meine-smarte-Welt/matter_manager/releases";

const TAB_ORDER = ["devices", "battery", "updates", "functions", "fabrics", "bindings", "network", "bridge"];

const TAB_META = {
  devices: { icon: "mdi:matter", label: "tab_devices" },
  battery: { icon: "mdi:battery-70", label: "tab_battery" },
  updates: { icon: "mdi:update", label: "tab_updates" },
  functions: { icon: "mdi:toggle-switch-outline", label: "tab_functions" },
  fabrics: { icon: "mdi:home-group", label: "tab_fabrics" },
  bindings: { icon: "mdi:link-variant", label: "tab_bindings" },
  network: { icon: "mdi:graph-outline", label: "tab_network" },
  bridge: { icon: "mdi:cog", label: "tab_bridge" },
};

const CATEGORY_ICON_COLOR_KEYS = Object.fromEntries(TAB_ORDER.map((k) => [k, `color_icon_${k}`]));

const SORT_OPTIONS = [
  { value: "name_asc", label: "sort_name_asc" },
  { value: "name_desc", label: "sort_name_desc" },
  { value: "battery_asc", label: "sort_battery_asc" },
  { value: "signal_asc", label: "sort_signal_asc" },
  { value: "last_seen_desc", label: "sort_last_seen_desc" },
  { value: "last_seen_asc", label: "sort_last_seen_asc" },
  { value: "ota", label: "sort_ota" },
];
const DEFAULT_SORT = "name_asc";
const TAB_DEFAULT_SORT = { battery: "battery_asc", updates: "ota" };

const OTA_ORDER = { updating: 0, available: 1, scheduled: 2, idle: 3 };

// --- Gruppieren und Filtern (seit 1.0.2) --------------------------------------
// Tabs mit Geräteliste, auf die Gruppierung und Filter wirken.
const FILTER_TABS = ["devices", "battery", "updates"];
const GROUP_BY_OPTIONS = [
  { value: "none", label: "group_none" },
  { value: "vendor", label: "group_vendor" },
  { value: "model", label: "group_model" },
  { value: "class", label: "group_class" },
];
// Die Klasse leitet das Backend aus den Geräte-Typen der Endpunkte ab (Reihenfolge = Anzeige).
const DEVICE_CLASSES = ["light", "switch", "climate", "cover", "lock", "fan", "remote", "sensor", "appliance", "media", "bridge", "other"];
const CLASS_ICON = {
  light: "mdi:lightbulb-outline",
  switch: "mdi:power-socket-eu",
  climate: "mdi:thermostat",
  cover: "mdi:window-shutter",
  lock: "mdi:lock-outline",
  fan: "mdi:fan",
  remote: "mdi:remote",
  sensor: "mdi:eye-outline",
  appliance: "mdi:washing-machine",
  media: "mdi:television-play",
  bridge: "mdi:bridge",
  other: "mdi:help-circle-outline",
};
const UNKNOWN_VENDOR = "__unknown__";
// Feste Filter (Auswahl: Wert -> Textschlüssel). Hersteller, Gerätename und Klasse werden aus den Daten gebildet.
const FILTER_FIELDS = [
  { key: "status", label: "flt_status", options: [["online", "flt_online"], ["offline", "flt_offline"]] },
  {
    key: "power",
    label: "flt_power",
    options: [["battery", "flt_battery_only"], ["mains", "flt_mains_only"], ["low", "flt_battery_low"]],
  },
  {
    key: "signal",
    label: "flt_signal",
    options: [["good", "flt_sig_good"], ["mid", "flt_sig_mid"], ["weak", "flt_sig_weak"]],
  },
  {
    key: "network",
    label: "flt_network",
    options: [["thread", "net_thread"], ["wifi", "net_wifi"], ["ethernet", "net_ethernet"], ["bridge", "type_Bridge"], ["bridged", "type_Bridged"]],
  },
  { key: "firmware", label: "flt_firmware", options: [["available", "flt_fw_available"]] },
  { key: "seen", label: "flt_seen", options: [["24h", "flt_seen_24h"], ["7d", "flt_seen_7d"]] },
  { key: "fabrics", label: "flt_fabrics", options: [["multi", "flt_fab_multi"], ["single", "flt_fab_single"]] },
];
const FILTER_KEYS = [...FILTER_FIELDS.map((f) => f.key), "vendor", "model", "class"];

// Symbol nach Netzwerk-Rolle, wenn das Gerät kein eigenes Typ-Symbol mitbringt
const DEVICE_ICON = {
  Router: "mdi:router-wireless",
  Leader: "mdi:router-wireless",
  EndDevice: "mdi:chip",
  SleepyEndDevice: "mdi:chip",
  Thread: "mdi:chip",
  WiFi: "mdi:wifi",
  Ethernet: "mdi:ethernet",
  Bridge: "mdi:bridge",
  Bridged: "mdi:link-variant",
};
const DEFAULT_DEVICE_ICON = "mdi:matter";

// --- Gerätebilder (seit 1.0.3) -------------------------------------------
//
// Matter liefert keine Produktbilder. Standardquelle ist dieselbe Bildbibliothek wie beim
// Zigbee2MQTT Manager. Das Backend liefert je Gerät Namenskandidaten (Teilenummer,
// Produktname …); die Karte probiert sie nacheinander durch und zeigt ohne Treffer das
// Symbol. Eigene Quelle: `image_base`; eigene Zuordnung je Gerät: `device_images`.
const DEFAULT_IMAGE_BASE = "https://www.zigbee2mqtt.io/images/devices/";
// Nur https:// oder ein lokaler Pfad (/local/…); nichts, was ein Attribut verlassen könnte
const SAFE_URL_RE = /^(https:\/\/[^\s"'<>\\]+|\/[^\s"'<>\\]*)$/;

function safeImageUrl(value) {
  const v = String(value || "").trim();
  return SAFE_URL_RE.test(v) && !v.startsWith("//") ? v : "";
}

function imageBase(cfg) {
  const base = safeImageUrl(cfg.image_base) || DEFAULT_IMAGE_BASE;
  return base.endsWith("/") ? base : `${base}/`;
}

// Mögliche Bild-Adressen eines Geräts in der Reihenfolge, in der sie probiert werden
function deviceImageUrls(d, cfg) {
  const map = cfg.device_images && typeof cfg.device_images === "object" ? cfg.device_images : null;
  if (map) {
    const lower = {};
    for (const [k, v] of Object.entries(map)) lower[String(k).trim().toLowerCase()] = v;
    const names = [d.name, d.vendor && d.model ? `${d.vendor} ${d.model}` : "", d.model, d.id];
    for (const n of names) {
      const hit = safeImageUrl(lower[String(n ?? "").trim().toLowerCase()]);
      if (hit) return [hit];
    }
  }
  const base = imageBase(cfg);
  return (d.image_keys || []).map((k) => `${base}${encodeURIComponent(String(k).replace(/\//g, "-"))}.png`);
}

// --- Konfigurierbare Farben ---------------------------------------------
//
// Jede Farbgruppe entspricht einer CSS-Custom-Property, die _colorVars() pro
// Karteninstanz setzt. Leer/ungültig = fester Theme-Farbwert (fallback).
const COLOR_CONFIG_KEYS = {
  tab_active: { cssVar: "--mmm-color-tab-active", fallback: "var(--primary-color, #03a9f4)" },
  success: { cssVar: "--mmm-color-success", fallback: "var(--success-color, #43a047)" },
  warning: { cssVar: "--mmm-color-warning", fallback: "var(--warning-color, #ff9800)" },
  error: { cssVar: "--mmm-color-error", fallback: "var(--error-color, #db4437)" },
  info: { cssVar: "--mmm-color-info", fallback: "var(--info-color, #039be5)" },
  row_icon: { cssVar: "--mmm-color-row-icon", fallback: "var(--secondary-text-color, #727272)" },
  live_banner: {
    cssVar: "--mmm-color-live-banner",
    fallback: "var(--state-icon-active-color, #03a9f4)",
  },
};

// Erlaubte Zeichen für benutzerdefinierte Farbwerte, bevor sie in einen
// <style>-Block gelangen: Hex, rgb()/hsl(), var(--x, fallback), Farbwörter.
// Alles, was eine Deklaration oder das <style>-Tag verlassen könnte (; { } < >
// Anführungszeichen), wird verworfen und wie "nicht gesetzt" behandelt.
const SAFE_COLOR_RE = /^[a-zA-Z0-9#(),.%\-\s]+$/;

function sanitizeColor(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (!SAFE_COLOR_RE.test(trimmed)) {
    // eslint-disable-next-line no-console
    console.warn("matter_manager: ungültiger Farbwert ignoriert:", value);
    return "";
  }
  return trimmed;
}

const CONFIG_DEFAULTS = {
  title: "Matter Manager",
  // Nur bei mehreren Matter-Manager-Einträgen nötig (Config-Entry-ID der Integration).
  entry_id: "",
  show_title: true,
  // Kategorien (Tabs) einzeln ein-/ausblendbar.
  show_devices: true,
  show_battery: true,
  show_updates: true,
  show_functions: true,
  show_fabrics: true,
  show_bindings: true,
  show_network: true,
  show_bridge: true,
  default_tab: "devices",
  // Darstellung
  max_rows: 0, // 0 = alle Zeilen
  zoom: 1,
  show_stats: true,
  show_images: true,
  // Bildquelle (Ordner-URL oder lokaler Pfad); leer = Standard-Bibliothek
  image_base: "",
  show_search: true,
  show_filter_bar: true,
  default_sort: DEFAULT_SORT,
  show_group_by: true,
  default_group_by: "none",
  show_filters: true,
  // Spalten der Geräteliste
  show_model: true,
  show_vendor: true,
  show_node_id: false,
  show_signal: true,
  show_battery_value: true,
  show_last_seen: true,
  // Bearbeiten
  read_only: false,
  show_pairing: true,
  // Farben (leer = Theme-Standard)
  color_tab_active: "",
  color_success: "",
  color_warning: "",
  color_error: "",
  color_info: "",
  color_row_icon: "",
  color_live_banner: "",
  color_icon_devices: "",
  color_icon_battery: "",
  color_icon_updates: "",
  color_icon_functions: "",
  color_icon_fabrics: "",
  color_icon_bindings: "",
  color_icon_network: "",
  color_icon_bridge: "",
};

function withDefaults(config) {
  return { ...CONFIG_DEFAULTS, ...(config || {}) };
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

const esc = escapeHtml;

// --- Texte (Deutsch/Englisch/Niederländisch, nach Home-Assistant-Sprache) -------------------

const I18N = {
  de: {
    connecting: "Verbinde …",
    error_generic: "Aktion fehlgeschlagen.",
    tab_devices: "Geräte", tab_battery: "Batterie", tab_updates: "Updates",
    tab_fabrics: "Fabrics", tab_bindings: "Bindings", tab_bridge: "Server",
    chip_devices: "Geräte", chip_offline: "Offline", chip_low_battery: "Batterie niedrig", chip_updates: "Updates",
    search: "Name, Modell oder Node-ID suchen", sort: "Sortierung",
    sort_name_asc: "Name A–Z", sort_name_desc: "Name Z–A", sort_battery_asc: "Batterie (niedrig zuerst)",
    sort_signal_asc: "Signal (schwach zuerst)", sort_last_seen_desc: "Zuletzt gesehen (neu zuerst)",
    sort_last_seen_asc: "Zuletzt gesehen (alt zuerst)", sort_ota: "Update-Status",
    no_data: "Noch keine Geräte vom Matter Server. Ist schon ein Gerät eingerichtet?", no_results: "Keine Treffer.",
    show_more: "{n} weitere anzeigen",
    status_online: "Online (laut Matter Server)", status_offline: "Offline (laut Matter Server)", status_unknown: "Status unbekannt.",
    offline: "offline", online: "online", unknown: "unbekannt", inactive: "inaktiv", interviewing: "Interview", disabled: "deaktiviert",
    never: "noch nie", yes: "ja", no: "nein", close: "Schließen", save: "Speichern", add: "Hinzufügen", cancel: "Abbrechen",
    confirm: "Wirklich?", loading: "Lade …", details: "Details", remove: "Gerät entfernen", rename: "Umbenennen",
    set: "gesetzt", not_set: "nicht gesetzt", all: "alle",
    // Banner
    bridge_error: "Keine Verbindung zur Integration", server_offline: "Matter Server nicht verbunden",
    server_offline_hint: "Die Verbindung wird automatisch neu aufgebaut. Angezeigte Werte stammen vom letzten Stand.",
    server_incompatible: "Matter-Server-Version zu alt",
    server_incompatible_hint: "API-Schema {v} erkannt – benötigt wird mindestens {min}. Bitte den Matter Server aktualisieren.",
    commission_running: "Gerät wird hinzugefügt", commission_running_hint: "Das kann bis zu zwei Minuten dauern. Das Gerät bitte in der Nähe lassen.",
    job_check: "Firmware-Prüfung läuft", job_update: "Firmware-Updates werden installiert",
    // Updates
    check_all: "Alle auf Updates prüfen", checking: "Prüfung gestartet …", update_all: "{n} Updates nacheinander installieren",
    update_all_hint: "Updates werden nacheinander angestoßen, nie parallel. Batteriegeräte holen Updates oft erst nach Stunden ab. Geräte sollten in Reichweite bleiben.",
    install: "Installieren", check: "Nach Update suchen", update_now: "Update installieren",
    ota_available: "Update verfügbar", ota_updating: "Wird aktualisiert", ota_scheduled: "Geplant", ota_idle: "Aktuell",
    ota_unknown: "Nicht geprüft", ota_unsupported: "Dieses Gerät unterstützt keine OTA-Updates.",
    update_confirm: "Das Gerät lädt das Update vom Matter Server und startet danach neu. Es muss dabei Strom haben und in Reichweite bleiben.",
    update_found: "Update verfügbar", no_update: "Kein Update verfügbar", done_update: "Update angestoßen",
    release_notes: "Versionshinweise", f_checked_ota: "Zuletzt geprüft",
    // Fabrics
    fabrics_hint: "Matter-Geräte können mit mehreren Ökosystemen gleichzeitig verbunden sein (Multi-Admin). Hier siehst du, wohin jedes Gerät gehört, und kannst eine Verbindung wieder lösen.",
    no_fabrics: "Keine Fabrics gefunden.", fabric_own: "Home Assistant (dieses System)", fabric_unknown: "Unbekanntes Ökosystem",
    fabric_remove: "Verbindung lösen", fabric_own_badge: "dieses System", done_fabric: "Verbindung gelöst",
    f_vendor_fabric: "Ökosystem", f_fabric_id: "Fabric-ID", no_fabrics_device: "Keine Fabric-Daten vorhanden.",
    sec_share: "Für ein weiteres Ökosystem freigeben", share_hint: "Öffnet ein Pairing-Fenster. Den Code gibst du in Apple Home, Google Home, Alexa oder einer anderen Matter-App ein.",
    share_open: "Pairing-Fenster öffnen", share_manual: "Setup-Code", share_qr: "QR-Text", share_valid: "{n} Minuten gültig", done_window: "Pairing-Fenster geöffnet",
    // Bindings
    no_bindings: "Keine Bindings vorhanden.", no_bindings_device: "Keine Bindings eingerichtet.",
    bindings_hint: "Bindings verknüpfen Geräte direkt (z. B. Taster → Lampe) und funktionieren auch ohne Home Assistant.",
    bind: "Verknüpfen", unbind: "Lösen", bind_target: "Ziel-Gerät", pick_target: "Bitte ein Ziel wählen.",
    bind_endpoint: "Endpunkt der Quelle", bind_clusters: "Funktionen",
    bind_hint: "Ohne Auswahl werden alle passenden Funktionen verknüpft. Das Zielgerät bekommt dafür automatisch die nötige Zugriffsberechtigung. Batteriegeräte vorher durch einen Tastendruck aufwecken.",
    done_bound: "Verknüpft", done_unbound: "Verknüpfung gelöst", bindings_bridged_hint: "Bindings gibt es nur für Geräte, die direkt im Netz hängen.",
    // Server
    sec_app: "App-Version", f_integration_version: "Integration", f_card_version: "Karte", f_latest_version: "Neueste Version",
    app_up_to_date: "Aktuell", app_update_available: "Update verfügbar: {v}", app_check_failed: "Prüfung nicht möglich (GitHub nicht erreichbar)", app_not_checked: "noch nicht geprüft",
    f_checked: "Zuletzt geprüft", app_check_now: "Jetzt prüfen", app_checking: "Prüfe auf neue Version …", app_release: "Release ansehen",
    app_update_hint: "Aktualisiere über HACS (Integration) und starte Home Assistant neu. Danach den Browser neu laden (Strg+F5).",
    app_mismatch: "Karte ({card}) und Integration ({integration}) haben unterschiedliche Versionen. Browser-Cache leeren (Strg+F5) bzw. die App neu laden.",
    sec_status: "Matter Server", sec_commission: "Gerät hinzufügen", sec_options: "Server-Optionen", sec_maintenance: "Wartung", sec_events: "Ereignisse",
    sec_nc: "Notification Center", nc_found: "Notification Center erkannt", nc_missing: "Notification Center nicht installiert",
    nc_missing_hint: "Die Meldungen werden gesendet, sobald das Notification Center installiert ist.", nc_master: "Meldungen an das Notification Center senden",
    nc_master_off_hint: "Hauptschalter aus: Es wird nichts gesendet.", nc_types: "Meldungsarten", nc_saved: "Gespeichert", nc_active: "Aktiv", nc_inactive: "Aus",
    sev_critical: "Kritisch", sev_warning: "Warnung", sev_info: "Info", sev_ok: "OK",
    f_status: "Status", f_sdk: "Matter-SDK", f_schema: "API-Schema", f_server_fabric: "Fabric-ID", f_compressed: "Kompakte Fabric-ID", f_url: "Adresse",
    f_nodes: "Geräte (Nodes)", f_wifi_creds: "WLAN-Zugangsdaten", f_thread_creds: "Thread-Zugangsdaten", f_bluetooth: "Bluetooth",
    commission_hint: "Gib den Setup-Code des Geräts ein (QR-Text „MT:…“ oder 11/21-stelliger Code). Für Thread-Geräte müssen die Thread-Zugangsdaten im Matter Server gesetzt sein.",
    commission_code: "Setup-Code", commission_network_only: "Nur über das Netzwerk suchen (kein Bluetooth)", commission_start: "Gerät hinzufügen",
    pairing_start: "Gerät hinzufügen", done_commission: "Gerät hinzugefügt",
    fabric_label: "Bezeichnung für neue Verbindungen", fabric_label_hint: "Wird bei künftigen Inbetriebnahmen als Name der Home-Assistant-Fabric auf den Geräten hinterlegt (höchstens 32 Zeichen).",
    done_fabric_label: "Bezeichnung gespeichert",
    reconnect: "Verbindung neu aufbauen", reconnect_hint: "Trennt die Verbindung zum Matter Server und baut sie neu auf. Der Matter Server selbst wird nicht neu gestartet.", done_reconnect: "Verbindung wird neu aufgebaut",
    read_only_hint: "Die Karte ist schreibgeschützt.", no_events: "Noch keine Ereignisse seit dem Start.",
    ev_device_joined: "Neues Gerät", ev_device_leave: "Gerät entfernt",
    ev_offline: "Offline", ev_online: "Wieder online", ev_battery_low: "Batterie niedrig", ev_update_available: "Update verfügbar",
    ev_server_connected: "Matter Server verbunden", ev_server_disconnected: "Verbindung zum Matter Server getrennt",
    // Popup
    sec_info: "Informationen", sec_fabrics: "Fabrics (Multi-Admin)", sec_firmware: "Firmware", sec_diag: "Diagnose", sec_remove: "Gerät entfernen",
    new_name: "Neuer Name", rename_entities_hint: "Beim Umbenennen wird der Gerätename in Home Assistant angepasst. Die {n} Entitäten behalten ihre IDs:",
    rename_hint: "Der Name wird in Home Assistant und – soweit möglich – im Gerät selbst gesetzt.",
    done_renamed: "Umbenannt",
    sec_comment: "Kommentar", comment_placeholder: "Eigene Notiz zu diesem Gerät …", comment_hint: "Wird in Home Assistant gespeichert (höchstens {n} Zeichen) und ist über die Suche auffindbar.",
    comment_delete: "Kommentar löschen", done_comment: "Kommentar gespeichert", done_comment_deleted: "Kommentar gelöscht",
    remove_hint: "Entfernt das Gerät aus Home Assistant und vom Matter Server. Ist es nicht erreichbar, bleibt es auf dem Gerät eingetragen und muss ggf. zurückgesetzt werden.",
    done_removed: "Gerät entfernt",
    ping: "Erreichbarkeit prüfen", interview: "Gerät neu abfragen", done_interview: "Gerät neu abgefragt",
    ping_result: "Erreichbar: {n} von {m} Adressen", diag_hint: "„Neu abfragen“ liest alle Eigenschaften des Geräts erneut ein (Interview).",
    bridged_hint: "Dieses Gerät hängt an einer Bridge und wird dort verwaltet. Hier lässt sich nur der Name in Home Assistant ändern.",
    f_vendor: "Hersteller", f_model: "Modell", f_description: "Beschreibung", f_type: "Typ", f_network: "Netzwerk",
    f_node_id: "Node-ID", f_endpoint: "Endpunkt", f_bridge: "Bridge", f_sw: "Firmware", f_hw: "Hardware", f_part: "Teilenummer",
    f_serial: "Seriennummer", f_signal: "Signalstärke", f_battery: "Batterie", f_voltage: "Spannung", f_available: "Erreichbar",
    f_last_seen: "Zuletzt gesehen", f_commissioned: "Eingerichtet", f_thread_channel: "Thread-Kanal", f_thread_network: "Thread-Netzwerk",
    f_wifi_channel: "WLAN-Kanal", f_ip: "IP-Adressen", f_fabrics: "Fabrics",
    type_Router: "Thread-Router", type_Leader: "Thread-Leader", type_EndDevice: "Thread-Endgerät", type_SleepyEndDevice: "Thread-Endgerät (schlafend)",
    type_Thread: "Thread", type_WiFi: "WLAN", type_Ethernet: "Ethernet", type_Bridge: "Bridge", type_Bridged: "Gerät hinter Bridge",
    net_thread: "Thread", net_wifi: "WLAN", net_ethernet: "Ethernet",
    // Netzwerkkarte (seit 1.2.0)
    tab_network: "Netzwerk", chip_thread: "Thread", chip_wifi: "WLAN", nw_title_thread: "Thread-Netz", nw_title_wifi: "WLAN", nw_title_ethernet: "Ethernet", nw_none: "Noch keine Netzwerkdaten. Sobald der Matter Server Thread-, WLAN- oder Ethernet-Geräte meldet, erscheint hier die Karte.", nw_intro: "Aufbau der Netze aus den Diagnose-Daten, die der Matter Server von den Geräten kennt: bei Thread aus den Nachbartabellen der Router, bei WLAN nach Access Point. Jeder Router hängt an seiner besten Verbindung zum Leader (stark, wenige Sprünge) – eine Näherung der echten Routen, keine exakte Routenanzeige.", nw_ext_hint: "Externe Router gehören nicht zu deinen Matter-Geräten (z. B. ein Border Router von Apple oder Google). Sie erscheinen nur, wenn sie in einer Nachbartabelle stehen.", nw_summary_thread: "Router: {routers} (extern: {external}) · Endgeräte: {clients}", nw_summary_wifi: "Access Points: {routers} · Geräte: {clients}", nw_summary_ethernet: "Geräte am Kabel: {clients}", nw_leader: "Leader", nw_router: "Router", nw_external: "Externer Router {id}", nw_ap: "Access Point", nw_ap_named: "Access Point {id}", nw_ap_unknown: "Access Point (unbekannt)", nw_lan: "LAN", nw_channel: "Kanal {n}", nw_cloud_one: "1 Gerät", nw_cloud: "{n} Geräte", nw_open_tip: "{name} öffnen", nw_show_tip: "Geräte von {name} anzeigen", nw_links_routers: "Verbindungen zu Routern", nw_end_devices: "Geräte", nw_rel_parent: "Richtung Leader", nw_rel_child: "darunter", nw_rel_neighbor: "Nachbar", nw_orphan: "Keine Verbindung zum übrigen Netz bekannt.", nw_unassigned: "Nicht zugeordnet", nw_unassigned_hint: "Für diese Geräte kennt der Matter Server keinen Thread-Nachbarn (z. B. schlafende Geräte ohne Nachbartabelle).", nw_no_links: "Keine Verbindungen bekannt", nw_signal: "Signal", nw_map_label: "Netzwerkkarte", nw_zoom_label: "Zoom der Netzwerkkarte", nw_zoom_out: "Verkleinern", nw_zoom_in: "Vergrößern", nw_zoom_fit: "Einpassen", nw_zoom_reset: "Auf 100 % zurücksetzen", nw_zoom_hint: "Zoom: Regler oder Knöpfe; am Smartphone mit zwei Fingern auseinanderziehen bzw. zusammenschieben, am Desktop Strg + Mausrad. Mit gedrückter Maustaste verschiebst du die Karte in alle Richtungen.", nw_role_sleepy: "Schlafendes Endgerät", nw_role_end: "Endgerät", nw_role_reed: "Router-fähiges Endgerät", nw_role_wifi: "WLAN-Gerät", nw_role_lan: "Ethernet-Gerät",
    battery_ok: "OK", battery_warning: "Warnung", battery_critical: "Kritisch", battery_replace: "Tausch nötig",
    // Gruppieren und Filtern (seit 1.0.2)
    group_by: "Gruppieren", group_none: "Keine Gruppierung", group_vendor: "Hersteller", group_model: "Gerätename", group_class: "Geräteklasse", group_unknown: "Unbekannt",
    expand_all: "Alle aufklappen", collapse_all: "Alle zuklappen",
    filters: "Filter", filter_active: "{n} aktiv", filter_reset: "Alle Filter zurücksetzen", filter_remove: "Filter entfernen",
    flt_all: "Alle", flt_status: "Status", flt_online: "Online", flt_offline: "Offline",
    flt_power: "Stromversorgung", flt_battery_only: "Nur Batteriegeräte", flt_mains_only: "Nur Netzbetrieb", flt_battery_low: "Batterie niedrig",
    flt_signal: "Signal", flt_sig_good: "Gut (ab −70 dBm)", flt_sig_mid: "Mittel (−85 bis −71 dBm)", flt_sig_weak: "Schwach (unter −85 dBm)",
    flt_network: "Netzwerk", flt_firmware: "Firmware", flt_fw_available: "Update verfügbar",
    flt_seen: "Zuletzt gesehen", flt_seen_24h: "Vor mehr als 24 Stunden", flt_seen_7d: "Vor mehr als 7 Tagen",
    flt_fabrics: "Ökosysteme", flt_fab_multi: "Mehrere Ökosysteme (Multi-Admin)", flt_fab_single: "Nur ein Ökosystem",
    flt_vendor: "Hersteller", flt_model: "Gerätename", flt_class: "Geräteklasse",
    flt_hint: "Mehrere Filter gelten gleichzeitig (UND). „Online/Offline“ kommt vom Matter Server. Die Filter gelten für Geräte, Batterie und Updates.",
    cls_light: "Lampen", cls_switch: "Steckdosen & Schalter", cls_climate: "Heizung & Klima", cls_cover: "Rollos & Jalousien", cls_lock: "Schlösser",
    cls_fan: "Lüfter", cls_remote: "Taster & Fernbedienungen", cls_sensor: "Sensoren", cls_appliance: "Haushaltsgeräte", cls_media: "Medien", cls_bridge: "Bridges", cls_other: "Sonstige",
    // Funktionen (Expose), Entitäten kopieren, Gerätebilder (seit 1.0.3)
    tab_functions: "Funktionen",
    fn_chip_all: "Mit Funktionen", fn_chip_switch: "Schaltbar", fn_chip_on: "Eingeschaltet",
    fn_none: "Noch keine Geräte mit Funktionen.",
    fn_hint: "Alle Funktionen, die Matter für die Geräte meldet, mit dem aktuellen Wert. Ein/Aus-Schalter lassen sich direkt umlegen und wirken sofort am Gerät. Alles andere wird nur angezeigt – steuern lässt es sich wie bisher über die Home-Assistant-Entitäten.",
    fn_hint_ro: "Alle Funktionen, die Matter für die Geräte meldet, mit dem aktuellen Wert (nur Anzeige).",
    sec_functions: "Funktionen (Expose)", no_functions: "Dieses Gerät meldet keine Funktionen.",
    fn_on: "An", fn_off: "Aus", fn_present: "Anwesend", fn_absent: "Nicht anwesend",
    fn_onoff: "Ein/Aus", fn_level: "Dimmstufe", fn_color_temp: "Farbtemperatur", fn_lock: "Schloss", fn_cover_closed: "Geschlossen (Position)",
    fn_temperature: "Temperatur", fn_target_heat: "Solltemperatur Heizen", fn_target_cool: "Solltemperatur Kühlen", fn_fan_percent: "Lüfterstufe",
    fn_humidity: "Luftfeuchtigkeit", fn_pressure: "Luftdruck", fn_illuminance: "Beleuchtungsstärke", fn_occupancy: "Anwesenheit",
    fn_v_locked: "Verriegelt", fn_v_unlocked: "Entriegelt", fn_v_not_fully_locked: "Nicht ganz verriegelt", fn_v_unlatched: "Falle zurückgezogen",
    sec_entities: "Entitäten (für Automationen)", no_entities: "Keine Home-Assistant-Entitäten gefunden.",
    entities_hint: "Entitäts-Namen aus Home Assistant. Mit dem Symbol kopierst du einen Namen in die Zwischenablage, zum Beispiel für Automationen oder Skripte.",
    copy: "In die Zwischenablage kopieren", copy_all: "Alle kopieren", copy_entities: "Entitäts-Namen kopieren",
    copied: "Kopiert: {v}", copied_n: "{n} Entitäten kopiert",
    copy_failed: "Kopieren nicht möglich. Der Browser erlaubt die Zwischenablage nur über HTTPS.", copy_manual: "Zum Kopieren markieren (Strg+C):",
  },
  en: {
    connecting: "Connecting …",
    error_generic: "Action failed.",
    tab_devices: "Devices", tab_battery: "Battery", tab_updates: "Updates",
    tab_fabrics: "Fabrics", tab_bindings: "Bindings", tab_bridge: "Server",
    chip_devices: "Devices", chip_offline: "Offline", chip_low_battery: "Low battery", chip_updates: "Updates",
    search: "Search name, model or node ID", sort: "Sort",
    sort_name_asc: "Name A–Z", sort_name_desc: "Name Z–A", sort_battery_asc: "Battery (lowest first)",
    sort_signal_asc: "Signal (weakest first)", sort_last_seen_desc: "Last seen (newest first)",
    sort_last_seen_asc: "Last seen (oldest first)", sort_ota: "Update status",
    no_data: "No devices from the Matter Server yet. Is a device set up?", no_results: "No matches.",
    show_more: "Show {n} more",
    status_online: "Online (per Matter Server)", status_offline: "Offline (per Matter Server)", status_unknown: "Status unknown.",
    offline: "offline", online: "online", unknown: "unknown", inactive: "inactive", interviewing: "Interviewing", disabled: "disabled",
    never: "never", yes: "yes", no: "no", close: "Close", save: "Save", add: "Add", cancel: "Cancel",
    confirm: "Sure?", loading: "Loading …", details: "Details", remove: "Remove device", rename: "Rename",
    set: "set", not_set: "not set", all: "all",
    bridge_error: "No connection to the integration", server_offline: "Matter Server not connected",
    server_offline_hint: "The connection is re-established automatically. Values shown are from the last known state.",
    server_incompatible: "Matter Server version too old",
    server_incompatible_hint: "API schema {v} detected – at least {min} is required. Please update the Matter Server.",
    commission_running: "Adding device", commission_running_hint: "This can take up to two minutes. Keep the device close by.",
    job_check: "Firmware check running", job_update: "Installing firmware updates",
    check_all: "Check all for updates", checking: "Check started …", update_all: "Install {n} updates one by one",
    update_all_hint: "Updates are started one after another, never in parallel. Battery devices often pick up updates only after hours. Devices should stay in range.",
    install: "Install", check: "Check for update", update_now: "Install update",
    ota_available: "Update available", ota_updating: "Updating", ota_scheduled: "Scheduled", ota_idle: "Up to date",
    ota_unknown: "Not checked", ota_unsupported: "This device does not support OTA updates.",
    update_confirm: "The device downloads the update from the Matter Server and restarts afterwards. It must stay powered and within range.",
    update_found: "Update available", no_update: "No update available", done_update: "Update started",
    release_notes: "Release notes", f_checked_ota: "Last checked",
    fabrics_hint: "Matter devices can be connected to several ecosystems at once (multi-admin). Here you see where each device belongs and can remove a connection.",
    no_fabrics: "No fabrics found.", fabric_own: "Home Assistant (this system)", fabric_unknown: "Unknown ecosystem",
    fabric_remove: "Remove connection", fabric_own_badge: "this system", done_fabric: "Connection removed",
    f_vendor_fabric: "Ecosystem", f_fabric_id: "Fabric ID", no_fabrics_device: "No fabric data available.",
    sec_share: "Share with another ecosystem", share_hint: "Opens a pairing window. Enter the code in Apple Home, Google Home, Alexa or another Matter app.",
    share_open: "Open pairing window", share_manual: "Setup code", share_qr: "QR text", share_valid: "valid for {n} minutes", done_window: "Pairing window opened",
    no_bindings: "No bindings.", no_bindings_device: "No bindings set up.",
    bindings_hint: "Bindings link devices directly (e.g. button → light) and work even without Home Assistant.",
    bind: "Bind", unbind: "Unbind", bind_target: "Target device", pick_target: "Please pick a target.",
    bind_endpoint: "Source endpoint", bind_clusters: "Functions",
    bind_hint: "Without a selection all matching functions are bound. The target device automatically gets the required access permission. Wake battery devices first by pressing a button.",
    done_bound: "Bound", done_unbound: "Binding removed", bindings_bridged_hint: "Bindings are only available for devices directly on the network.",
    sec_app: "App version", f_integration_version: "Integration", f_card_version: "Card", f_latest_version: "Latest version",
    app_up_to_date: "Up to date", app_update_available: "Update available: {v}", app_check_failed: "Check failed (GitHub not reachable)", app_not_checked: "not checked yet",
    f_checked: "Last checked", app_check_now: "Check now", app_checking: "Checking for a new version …", app_release: "View release",
    app_update_hint: "Update via HACS (integration) and restart Home Assistant. Then reload the browser (Ctrl+F5).",
    app_mismatch: "Card ({card}) and integration ({integration}) have different versions. Clear the browser cache (Ctrl+F5) or reload the app.",
    sec_status: "Matter Server", sec_commission: "Add device", sec_options: "Server options", sec_maintenance: "Maintenance", sec_events: "Events",
    sec_nc: "Notification Center", nc_found: "Notification Center detected", nc_missing: "Notification Center not installed",
    nc_missing_hint: "Messages are sent as soon as the Notification Center is installed.", nc_master: "Send messages to the Notification Center",
    nc_master_off_hint: "Main switch off: nothing is sent.", nc_types: "Message types", nc_saved: "Saved", nc_active: "On", nc_inactive: "Off",
    sev_critical: "Critical", sev_warning: "Warning", sev_info: "Info", sev_ok: "OK",
    f_status: "Status", f_sdk: "Matter SDK", f_schema: "API schema", f_server_fabric: "Fabric ID", f_compressed: "Compressed fabric ID", f_url: "Address",
    f_nodes: "Devices (nodes)", f_wifi_creds: "Wi-Fi credentials", f_thread_creds: "Thread credentials", f_bluetooth: "Bluetooth",
    commission_hint: "Enter the device's setup code (QR text “MT:…” or 11/21-digit code). For Thread devices the Thread credentials must be set in the Matter Server.",
    commission_code: "Setup code", commission_network_only: "Search the network only (no Bluetooth)", commission_start: "Add device",
    pairing_start: "Add device", done_commission: "Device added",
    fabric_label: "Label for new connections", fabric_label_hint: "Stored on devices as the name of the Home Assistant fabric during future commissioning (up to 32 characters).",
    done_fabric_label: "Label saved",
    reconnect: "Reconnect", reconnect_hint: "Drops the connection to the Matter Server and builds it up again. The Matter Server itself is not restarted.", done_reconnect: "Reconnecting …",
    read_only_hint: "This card is read-only.", no_events: "No events since startup.",
    ev_device_joined: "New device", ev_device_leave: "Device removed",
    ev_offline: "Offline", ev_online: "Back online", ev_battery_low: "Battery low", ev_update_available: "Update available",
    ev_server_connected: "Matter Server connected", ev_server_disconnected: "Connection to the Matter Server lost",
    sec_info: "Information", sec_fabrics: "Fabrics (multi-admin)", sec_firmware: "Firmware", sec_diag: "Diagnostics", sec_remove: "Remove device",
    new_name: "New name", rename_entities_hint: "Renaming changes the device name in Home Assistant. The {n} entities keep their IDs:",
    rename_hint: "The name is set in Home Assistant and, where possible, on the device itself.",
    done_renamed: "Renamed",
    sec_comment: "Comment", comment_placeholder: "Your own note on this device …", comment_hint: "Stored in Home Assistant (up to {n} characters) and searchable.",
    comment_delete: "Delete comment", done_comment: "Comment saved", done_comment_deleted: "Comment deleted",
    remove_hint: "Removes the device from Home Assistant and the Matter Server. If it is unreachable it stays registered on the device and may need a reset.",
    done_removed: "Device removed",
    ping: "Check reachability", interview: "Re-interview device", done_interview: "Device re-interviewed",
    ping_result: "Reachable: {n} of {m} addresses", diag_hint: "“Re-interview” reads all properties of the device again.",
    bridged_hint: "This device is attached to a bridge and managed there. Only its name in Home Assistant can be changed here.",
    f_vendor: "Vendor", f_model: "Model", f_description: "Description", f_type: "Type", f_network: "Network",
    f_node_id: "Node ID", f_endpoint: "Endpoint", f_bridge: "Bridge", f_sw: "Firmware", f_hw: "Hardware", f_part: "Part number",
    f_serial: "Serial number", f_signal: "Signal strength", f_battery: "Battery", f_voltage: "Voltage", f_available: "Reachable",
    f_last_seen: "Last seen", f_commissioned: "Set up", f_thread_channel: "Thread channel", f_thread_network: "Thread network",
    f_wifi_channel: "Wi-Fi channel", f_ip: "IP addresses", f_fabrics: "Fabrics",
    type_Router: "Thread router", type_Leader: "Thread leader", type_EndDevice: "Thread end device", type_SleepyEndDevice: "Thread end device (sleepy)",
    type_Thread: "Thread", type_WiFi: "Wi-Fi", type_Ethernet: "Ethernet", type_Bridge: "Bridge", type_Bridged: "Device behind bridge",
    net_thread: "Thread", net_wifi: "Wi-Fi", net_ethernet: "Ethernet",
    // Netzwerkkarte (seit 1.2.0)
    tab_network: "Network", chip_thread: "Thread", chip_wifi: "Wi-Fi", nw_title_thread: "Thread network", nw_title_wifi: "Wi-Fi", nw_title_ethernet: "Ethernet", nw_none: "No network data yet. As soon as the Matter server reports Thread, Wi-Fi or Ethernet devices, the map appears here.", nw_intro: "Structure of the networks, built from the diagnostic data the Matter server knows about the devices: for Thread from the routers' neighbour tables, for Wi-Fi by access point. Each router hangs off its best path to the leader (strong link, few hops) – an approximation of the real routes, not an exact route display.", nw_ext_hint: "External routers are not among your Matter devices (e.g. a border router from Apple or Google). They only appear if they show up in a neighbour table.", nw_summary_thread: "Routers: {routers} (external: {external}) · End devices: {clients}", nw_summary_wifi: "Access points: {routers} · Devices: {clients}", nw_summary_ethernet: "Devices on the cable: {clients}", nw_leader: "Leader", nw_router: "Router", nw_external: "External router {id}", nw_ap: "Access point", nw_ap_named: "Access point {id}", nw_ap_unknown: "Access point (unknown)", nw_lan: "LAN", nw_channel: "Channel {n}", nw_cloud_one: "1 device", nw_cloud: "{n} devices", nw_open_tip: "Open {name}", nw_show_tip: "Show devices of {name}", nw_links_routers: "Links to routers", nw_end_devices: "Devices", nw_rel_parent: "towards leader", nw_rel_child: "below", nw_rel_neighbor: "neighbour", nw_orphan: "No connection to the rest of the network known.", nw_unassigned: "Not assigned", nw_unassigned_hint: "The Matter server knows no Thread neighbour for these devices (e.g. sleepy devices without a neighbour table).", nw_no_links: "No links known", nw_signal: "Signal", nw_map_label: "Network map", nw_zoom_label: "Network map zoom", nw_zoom_out: "Zoom out", nw_zoom_in: "Zoom in", nw_zoom_fit: "Fit", nw_zoom_reset: "Reset to 100 %", nw_zoom_hint: "Zoom: slider or buttons; on a phone pinch with two fingers, on desktop Ctrl + mouse wheel. Hold the mouse button and drag to move the map in any direction.", nw_role_sleepy: "Sleepy end device", nw_role_end: "End device", nw_role_reed: "Router-eligible end device", nw_role_wifi: "Wi-Fi device", nw_role_lan: "Ethernet device",
    battery_ok: "OK", battery_warning: "Warning", battery_critical: "Critical", battery_replace: "Replace",
    // Grouping and filtering (since 1.0.2)
    group_by: "Group by", group_none: "No grouping", group_vendor: "Manufacturer", group_model: "Device name", group_class: "Device class", group_unknown: "Unknown",
    expand_all: "Expand all", collapse_all: "Collapse all",
    filters: "Filters", filter_active: "{n} active", filter_reset: "Reset all filters", filter_remove: "Remove filter",
    flt_all: "All", flt_status: "Status", flt_online: "Online", flt_offline: "Offline",
    flt_power: "Power source", flt_battery_only: "Battery devices only", flt_mains_only: "Mains-powered only", flt_battery_low: "Low battery",
    flt_signal: "Signal", flt_sig_good: "Good (−70 dBm or better)", flt_sig_mid: "Medium (−85 to −71 dBm)", flt_sig_weak: "Weak (below −85 dBm)",
    flt_network: "Network", flt_firmware: "Firmware", flt_fw_available: "Update available",
    flt_seen: "Last seen", flt_seen_24h: "More than 24 hours ago", flt_seen_7d: "More than 7 days ago",
    flt_fabrics: "Ecosystems", flt_fab_multi: "Several ecosystems (multi-admin)", flt_fab_single: "Only one ecosystem",
    flt_vendor: "Manufacturer", flt_model: "Device name", flt_class: "Device class",
    flt_hint: "Several filters apply together (AND). “Online/Offline” comes from the Matter Server. Filters apply to Devices, Battery and Updates.",
    cls_light: "Lights", cls_switch: "Plugs & switches", cls_climate: "Heating & climate", cls_cover: "Blinds & covers", cls_lock: "Locks",
    cls_fan: "Fans", cls_remote: "Buttons & remotes", cls_sensor: "Sensors", cls_appliance: "Appliances", cls_media: "Media", cls_bridge: "Bridges", cls_other: "Other",
    // Functions (expose), copy entities, device images (since 1.0.3)
    tab_functions: "Functions",
    fn_chip_all: "With functions", fn_chip_switch: "Switchable", fn_chip_on: "Switched on",
    fn_none: "No devices with functions yet.",
    fn_hint: "All functions Matter reports for the devices, with the current value. On/off switches can be toggled directly and take effect on the device immediately. Everything else is display only – control it as before through the Home Assistant entities.",
    fn_hint_ro: "All functions Matter reports for the devices, with the current value (display only).",
    sec_functions: "Functions (expose)", no_functions: "This device reports no functions.",
    fn_on: "On", fn_off: "Off", fn_present: "Present", fn_absent: "Not present",
    fn_onoff: "On/off", fn_level: "Brightness level", fn_color_temp: "Color temperature", fn_lock: "Lock", fn_cover_closed: "Closed (position)",
    fn_temperature: "Temperature", fn_target_heat: "Heating setpoint", fn_target_cool: "Cooling setpoint", fn_fan_percent: "Fan speed",
    fn_humidity: "Humidity", fn_pressure: "Air pressure", fn_illuminance: "Illuminance", fn_occupancy: "Occupancy",
    fn_v_locked: "Locked", fn_v_unlocked: "Unlocked", fn_v_not_fully_locked: "Not fully locked", fn_v_unlatched: "Unlatched",
    sec_entities: "Entities (for automations)", no_entities: "No Home Assistant entities found.",
    entities_hint: "Entity names from Home Assistant. Use the icon to copy a name to the clipboard, for example for automations or scripts.",
    copy: "Copy to clipboard", copy_all: "Copy all", copy_entities: "Copy entity names",
    copied: "Copied: {v}", copied_n: "{n} entities copied",
    copy_failed: "Copying failed. The browser only allows clipboard access over HTTPS.", copy_manual: "Select to copy (Ctrl+C):",
  },
  nl: {
    connecting: "Verbinden …",
    error_generic: "Actie mislukt.",
    tab_devices: "Apparaten", tab_battery: "Batterij", tab_updates: "Updates",
    tab_fabrics: "Fabrics", tab_bindings: "Bindings", tab_bridge: "Server",
    chip_devices: "Apparaten", chip_offline: "Offline", chip_low_battery: "Batterij bijna leeg", chip_updates: "Updates",
    search: "Zoek op naam, model of node-ID", sort: "Sorteren",
    sort_name_asc: "Naam A–Z", sort_name_desc: "Naam Z–A", sort_battery_asc: "Batterij (laagste eerst)",
    sort_signal_asc: "Signaal (zwakste eerst)", sort_last_seen_desc: "Laatst gezien (nieuwste eerst)",
    sort_last_seen_asc: "Laatst gezien (oudste eerst)", sort_ota: "Updatestatus",
    no_data: "Nog geen apparaten van de Matter Server. Is er al een apparaat ingesteld?", no_results: "Geen resultaten.",
    show_more: "{n} meer tonen",
    status_online: "Online (volgens Matter Server)", status_offline: "Offline (volgens Matter Server)", status_unknown: "Status onbekend.",
    offline: "offline", online: "online", unknown: "onbekend", inactive: "inactief", interviewing: "Interview", disabled: "uitgeschakeld",
    never: "nog nooit", yes: "ja", no: "nee", close: "Sluiten", save: "Opslaan", add: "Toevoegen", cancel: "Annuleren",
    confirm: "Zeker?", loading: "Laden …", details: "Details", remove: "Apparaat verwijderen", rename: "Hernoemen",
    set: "ingesteld", not_set: "niet ingesteld", all: "alle",
    bridge_error: "Geen verbinding met de integratie", server_offline: "Matter Server niet verbonden",
    server_offline_hint: "De verbinding wordt automatisch hersteld. De getoonde waarden komen van de laatst bekende status.",
    server_incompatible: "Matter Server-versie te oud",
    server_incompatible_hint: "API-schema {v} gevonden – minimaal {min} is vereist. Werk de Matter Server bij.",
    commission_running: "Apparaat wordt toegevoegd", commission_running_hint: "Dit kan tot twee minuten duren. Houd het apparaat in de buurt.",
    job_check: "Firmwarecontrole bezig", job_update: "Firmware-updates worden geïnstalleerd",
    check_all: "Alles op updates controleren", checking: "Controle gestart …", update_all: "{n} updates na elkaar installeren",
    update_all_hint: "Updates worden na elkaar gestart, nooit tegelijk. Apparaten op batterij halen updates vaak pas na uren op. Apparaten moeten binnen bereik blijven.",
    install: "Installeren", check: "Op update controleren", update_now: "Update installeren",
    ota_available: "Update beschikbaar", ota_updating: "Wordt bijgewerkt", ota_scheduled: "Gepland", ota_idle: "Actueel",
    ota_unknown: "Niet gecontroleerd", ota_unsupported: "Dit apparaat ondersteunt geen OTA-updates.",
    update_confirm: "Het apparaat downloadt de update van de Matter Server en start daarna opnieuw op. Het moet stroom hebben en binnen bereik blijven.",
    update_found: "Update beschikbaar", no_update: "Geen update beschikbaar", done_update: "Update gestart",
    release_notes: "Release-opmerkingen", f_checked_ota: "Laatst gecontroleerd",
    fabrics_hint: "Matter-apparaten kunnen tegelijk met meerdere ecosystemen verbonden zijn (multi-admin). Hier zie je waar elk apparaat bij hoort en kun je een verbinding weer verbreken.",
    no_fabrics: "Geen fabrics gevonden.", fabric_own: "Home Assistant (dit systeem)", fabric_unknown: "Onbekend ecosysteem",
    fabric_remove: "Verbinding verbreken", fabric_own_badge: "dit systeem", done_fabric: "Verbinding verbroken",
    f_vendor_fabric: "Ecosysteem", f_fabric_id: "Fabric-ID", no_fabrics_device: "Geen fabricgegevens beschikbaar.",
    sec_share: "Delen met een ander ecosysteem", share_hint: "Opent een koppelvenster. De code voer je in bij Apple Home, Google Home, Alexa of een andere Matter-app.",
    share_open: "Koppelvenster openen", share_manual: "Setupcode", share_qr: "QR-tekst", share_valid: "{n} minuten geldig", done_window: "Koppelvenster geopend",
    no_bindings: "Geen bindings aanwezig.", no_bindings_device: "Geen bindings ingesteld.",
    bindings_hint: "Bindings koppelen apparaten rechtstreeks (bijv. knop → lamp) en werken ook zonder Home Assistant.",
    bind: "Koppelen", unbind: "Loskoppelen", bind_target: "Doelapparaat", pick_target: "Kies een doel.",
    bind_endpoint: "Endpoint van de bron", bind_clusters: "Functies",
    bind_hint: "Zonder selectie worden alle passende functies gekoppeld. Het doelapparaat krijgt hiervoor automatisch de benodigde toegangsrechten. Maak apparaten op batterij eerst wakker met een druk op de knop.",
    done_bound: "Gekoppeld", done_unbound: "Koppeling verbroken", bindings_bridged_hint: "Bindings bestaan alleen voor apparaten die rechtstreeks in het netwerk hangen.",
    sec_app: "App-versie", f_integration_version: "Integratie", f_card_version: "Kaart", f_latest_version: "Nieuwste versie",
    app_up_to_date: "Actueel", app_update_available: "Update beschikbaar: {v}", app_check_failed: "Controle niet mogelijk (GitHub niet bereikbaar)", app_not_checked: "nog niet gecontroleerd",
    f_checked: "Laatst gecontroleerd", app_check_now: "Nu controleren", app_checking: "Controleren op nieuwe versie …", app_release: "Release bekijken",
    app_update_hint: "Werk bij via HACS (integratie) en start Home Assistant opnieuw op. Laad daarna de browser opnieuw (Ctrl+F5).",
    app_mismatch: "Kaart ({card}) en integratie ({integration}) hebben verschillende versies. Wis de browsercache (Ctrl+F5) of laad de app opnieuw.",
    sec_status: "Matter Server", sec_commission: "Apparaat toevoegen", sec_options: "Serveropties", sec_maintenance: "Onderhoud", sec_events: "Gebeurtenissen",
    sec_nc: "Notification Center", nc_found: "Notification Center gevonden", nc_missing: "Notification Center niet geïnstalleerd",
    nc_missing_hint: "Meldingen worden verzonden zodra het Notification Center is geïnstalleerd.", nc_master: "Meldingen naar het Notification Center sturen",
    nc_master_off_hint: "Hoofdschakelaar uit: er wordt niets verzonden.", nc_types: "Meldingstypen", nc_saved: "Opgeslagen", nc_active: "Aan", nc_inactive: "Uit",
    sev_critical: "Kritiek", sev_warning: "Waarschuwing", sev_info: "Info", sev_ok: "OK",
    f_status: "Status", f_sdk: "Matter-SDK", f_schema: "API-schema", f_server_fabric: "Fabric-ID", f_compressed: "Compacte fabric-ID", f_url: "Adres",
    f_nodes: "Apparaten (nodes)", f_wifi_creds: "Wifi-gegevens", f_thread_creds: "Thread-gegevens", f_bluetooth: "Bluetooth",
    commission_hint: "Voer de setupcode van het apparaat in (QR-tekst „MT:…” of code van 11/21 cijfers). Voor Thread-apparaten moeten de Thread-gegevens in de Matter Server zijn ingesteld.",
    commission_code: "Setupcode", commission_network_only: "Alleen via het netwerk zoeken (geen Bluetooth)", commission_start: "Apparaat toevoegen",
    pairing_start: "Apparaat toevoegen", done_commission: "Apparaat toegevoegd",
    fabric_label: "Naam voor nieuwe verbindingen", fabric_label_hint: "Wordt bij toekomstige ingebruikname als naam van de Home Assistant-fabric op de apparaten opgeslagen (maximaal 32 tekens).",
    done_fabric_label: "Naam opgeslagen",
    reconnect: "Verbinding opnieuw opbouwen", reconnect_hint: "Verbreekt de verbinding met de Matter Server en bouwt die opnieuw op. De Matter Server zelf wordt niet opnieuw gestart.", done_reconnect: "Verbinding wordt opnieuw opgebouwd",
    read_only_hint: "De kaart is alleen-lezen.", no_events: "Nog geen gebeurtenissen sinds de start.",
    ev_device_joined: "Nieuw apparaat", ev_device_leave: "Apparaat verwijderd",
    ev_offline: "Offline", ev_online: "Weer online", ev_battery_low: "Batterij bijna leeg", ev_update_available: "Update beschikbaar",
    ev_server_connected: "Matter Server verbonden", ev_server_disconnected: "Verbinding met de Matter Server verbroken",
    sec_info: "Informatie", sec_fabrics: "Fabrics (multi-admin)", sec_firmware: "Firmware", sec_diag: "Diagnose", sec_remove: "Apparaat verwijderen",
    new_name: "Nieuwe naam", rename_entities_hint: "Bij het hernoemen wordt de apparaatnaam in Home Assistant aangepast. De {n} entiteiten behouden hun ID's:",
    rename_hint: "De naam wordt in Home Assistant en – waar mogelijk – op het apparaat zelf ingesteld.",
    done_renamed: "Hernoemd",
    sec_comment: "Opmerking", comment_placeholder: "Eigen notitie bij dit apparaat …", comment_hint: "Wordt opgeslagen in Home Assistant (maximaal {n} tekens) en is doorzoekbaar.",
    comment_delete: "Opmerking verwijderen", done_comment: "Opmerking opgeslagen", done_comment_deleted: "Opmerking verwijderd",
    remove_hint: "Verwijdert het apparaat uit Home Assistant en van de Matter Server. Is het niet bereikbaar, dan blijft het op het apparaat geregistreerd en moet het eventueel worden gereset.",
    done_removed: "Apparaat verwijderd",
    ping: "Bereikbaarheid controleren", interview: "Apparaat opnieuw uitlezen", done_interview: "Apparaat opnieuw uitgelezen",
    ping_result: "Bereikbaar: {n} van {m} adressen", diag_hint: "„Opnieuw uitlezen” leest alle eigenschappen van het apparaat opnieuw in (interview).",
    bridged_hint: "Dit apparaat hangt aan een bridge en wordt daar beheerd. Hier kan alleen de naam in Home Assistant worden gewijzigd.",
    f_vendor: "Fabrikant", f_model: "Model", f_description: "Beschrijving", f_type: "Type", f_network: "Netwerk",
    f_node_id: "Node-ID", f_endpoint: "Endpoint", f_bridge: "Bridge", f_sw: "Firmware", f_hw: "Hardware", f_part: "Onderdeelnummer",
    f_serial: "Serienummer", f_signal: "Signaalsterkte", f_battery: "Batterij", f_voltage: "Spanning", f_available: "Bereikbaar",
    f_last_seen: "Laatst gezien", f_commissioned: "Ingesteld", f_thread_channel: "Thread-kanaal", f_thread_network: "Thread-netwerk",
    f_wifi_channel: "Wifi-kanaal", f_ip: "IP-adressen", f_fabrics: "Fabrics",
    type_Router: "Thread-router", type_Leader: "Thread-leader", type_EndDevice: "Thread-eindapparaat", type_SleepyEndDevice: "Thread-eindapparaat (slapend)",
    type_Thread: "Thread", type_WiFi: "Wifi", type_Ethernet: "Ethernet", type_Bridge: "Bridge", type_Bridged: "Apparaat achter bridge",
    net_thread: "Thread", net_wifi: "Wifi", net_ethernet: "Ethernet",
    // Netzwerkkarte (seit 1.2.0)
    tab_network: "Netwerk", chip_thread: "Thread", chip_wifi: "Wifi", nw_title_thread: "Thread-netwerk", nw_title_wifi: "Wifi", nw_title_ethernet: "Ethernet", nw_none: "Nog geen netwerkgegevens. Zodra de Matter Server Thread-, wifi- of Ethernet-apparaten meldt, verschijnt hier de kaart.", nw_intro: "Opbouw van de netwerken uit de diagnosegegevens die de Matter Server van de apparaten kent: bij Thread uit de buurtabellen van de routers, bij wifi per access point. Elke router hangt aan zijn beste verbinding met de leader (sterk, weinig hops) – een benadering van de echte routes, geen exacte routeweergave.", nw_ext_hint: "Externe routers horen niet bij je Matter-apparaten (bijv. een border router van Apple of Google). Ze verschijnen alleen als ze in een buurtabel staan.", nw_summary_thread: "Routers: {routers} (extern: {external}) · Eindapparaten: {clients}", nw_summary_wifi: "Access points: {routers} · Apparaten: {clients}", nw_summary_ethernet: "Apparaten aan de kabel: {clients}", nw_leader: "Leader", nw_router: "Router", nw_external: "Externe router {id}", nw_ap: "Access point", nw_ap_named: "Access point {id}", nw_ap_unknown: "Access point (onbekend)", nw_lan: "LAN", nw_channel: "Kanaal {n}", nw_cloud_one: "1 apparaat", nw_cloud: "{n} apparaten", nw_open_tip: "{name} openen", nw_show_tip: "Apparaten van {name} tonen", nw_links_routers: "Verbindingen met routers", nw_end_devices: "Apparaten", nw_rel_parent: "richting leader", nw_rel_child: "eronder", nw_rel_neighbor: "buur", nw_orphan: "Geen verbinding met de rest van het netwerk bekend.", nw_unassigned: "Niet toegewezen", nw_unassigned_hint: "Voor deze apparaten kent de Matter Server geen Thread-buur (bijv. slapende apparaten zonder buurtabel).", nw_no_links: "Geen verbindingen bekend", nw_signal: "Signaal", nw_map_label: "Netwerkkaart", nw_zoom_label: "Zoom van de netwerkkaart", nw_zoom_out: "Verkleinen", nw_zoom_in: "Vergroten", nw_zoom_fit: "Passend maken", nw_zoom_reset: "Terug naar 100 %", nw_zoom_hint: "Zoom: schuifregelaar of knoppen; op een smartphone met twee vingers knijpen, op de desktop Ctrl + muiswiel. Met ingedrukte muisknop verschuif je de kaart in alle richtingen.", nw_role_sleepy: "Slapend eindapparaat", nw_role_end: "Eindapparaat", nw_role_reed: "Router-geschikt eindapparaat", nw_role_wifi: "Wifi-apparaat", nw_role_lan: "Ethernet-apparaat",
    battery_ok: "OK", battery_warning: "Waarschuwing", battery_critical: "Kritiek", battery_replace: "Vervangen",
    // Groeperen en filteren (sinds 1.0.2)
    group_by: "Groeperen", group_none: "Geen groepering", group_vendor: "Fabrikant", group_model: "Apparaatnaam", group_class: "Apparaatklasse", group_unknown: "Onbekend",
    expand_all: "Alles uitklappen", collapse_all: "Alles inklappen",
    filters: "Filters", filter_active: "{n} actief", filter_reset: "Alle filters wissen", filter_remove: "Filter verwijderen",
    flt_all: "Alle", flt_status: "Status", flt_online: "Online", flt_offline: "Offline",
    flt_power: "Voeding", flt_battery_only: "Alleen batterijapparaten", flt_mains_only: "Alleen netvoeding", flt_battery_low: "Batterij laag",
    flt_signal: "Signaal", flt_sig_good: "Goed (vanaf −70 dBm)", flt_sig_mid: "Matig (−85 tot −71 dBm)", flt_sig_weak: "Zwak (onder −85 dBm)",
    flt_network: "Netwerk", flt_firmware: "Firmware", flt_fw_available: "Update beschikbaar",
    flt_seen: "Laatst gezien", flt_seen_24h: "Langer dan 24 uur geleden", flt_seen_7d: "Langer dan 7 dagen geleden",
    flt_fabrics: "Ecosystemen", flt_fab_multi: "Meerdere ecosystemen (multi-admin)", flt_fab_single: "Slechts één ecosysteem",
    flt_vendor: "Fabrikant", flt_model: "Apparaatnaam", flt_class: "Apparaatklasse",
    flt_hint: "Meerdere filters gelden tegelijk (EN). “Online/Offline” komt van de Matter Server. De filters gelden voor Apparaten, Batterij en Updates.",
    cls_light: "Lampen", cls_switch: "Stekkers & schakelaars", cls_climate: "Verwarming & klimaat", cls_cover: "Rolluiken & zonwering", cls_lock: "Sloten",
    cls_fan: "Ventilatoren", cls_remote: "Knoppen & afstandsbedieningen", cls_sensor: "Sensoren", cls_appliance: "Huishoudapparaten", cls_media: "Media", cls_bridge: "Bridges", cls_other: "Overig",
    // Functies (expose), entiteiten kopiëren, apparaatafbeeldingen (sinds 1.0.3)
    tab_functions: "Functies",
    fn_chip_all: "Met functies", fn_chip_switch: "Schakelbaar", fn_chip_on: "Ingeschakeld",
    fn_none: "Nog geen apparaten met functies.",
    fn_hint: "Alle functies die Matter voor de apparaten meldt, met de actuele waarde. Aan/uit-schakelaars kun je direct omzetten; het werkt meteen op het apparaat. Al het andere wordt alleen weergegeven – bedien het zoals voorheen via de Home Assistant-entiteiten.",
    fn_hint_ro: "Alle functies die Matter voor de apparaten meldt, met de actuele waarde (alleen weergave).",
    sec_functions: "Functies (expose)", no_functions: "Dit apparaat meldt geen functies.",
    fn_on: "Aan", fn_off: "Uit", fn_present: "Aanwezig", fn_absent: "Niet aanwezig",
    fn_onoff: "Aan/uit", fn_level: "Dimniveau", fn_color_temp: "Kleurtemperatuur", fn_lock: "Slot", fn_cover_closed: "Gesloten (positie)",
    fn_temperature: "Temperatuur", fn_target_heat: "Streeftemperatuur verwarmen", fn_target_cool: "Streeftemperatuur koelen", fn_fan_percent: "Ventilatorstand",
    fn_humidity: "Luchtvochtigheid", fn_pressure: "Luchtdruk", fn_illuminance: "Lichtsterkte", fn_occupancy: "Aanwezigheid",
    fn_v_locked: "Vergrendeld", fn_v_unlocked: "Ontgrendeld", fn_v_not_fully_locked: "Niet volledig vergrendeld", fn_v_unlatched: "Schoot teruggetrokken",
    sec_entities: "Entiteiten (voor automatiseringen)", no_entities: "Geen Home Assistant-entiteiten gevonden.",
    entities_hint: "Entiteitsnamen uit Home Assistant. Met het pictogram kopieer je een naam naar het klembord, bijvoorbeeld voor automatiseringen of scripts.",
    copy: "Naar klembord kopiëren", copy_all: "Alles kopiëren", copy_entities: "Entiteitsnamen kopiëren",
    copied: "Gekopieerd: {v}", copied_n: "{n} entiteiten gekopieerd",
    copy_failed: "Kopiëren mislukt. De browser staat het klembord alleen toe via HTTPS.", copy_manual: "Selecteer om te kopiëren (Ctrl+C):",
  },
  fr: {
    connecting: "Connexion …",
    error_generic: "Échec de l'action.",
    tab_devices: "Appareils", tab_battery: "Batterie", tab_updates: "Mises à jour",
    tab_fabrics: "Fabrics", tab_bindings: "Bindings", tab_bridge: "Serveur",
    chip_devices: "Appareils", chip_offline: "Hors ligne", chip_low_battery: "Batterie faible", chip_updates: "Mises à jour",
    search: "Rechercher par nom, modèle ou Node-ID", sort: "Tri",
    sort_name_asc: "Nom A–Z", sort_name_desc: "Nom Z–A", sort_battery_asc: "Batterie (la plus faible d'abord)",
    sort_signal_asc: "Signal (le plus faible d'abord)", sort_last_seen_desc: "Vu pour la dernière fois (le plus récent d'abord)",
    sort_last_seen_asc: "Vu pour la dernière fois (le plus ancien d'abord)", sort_ota: "Statut de mise à jour",
    no_data: "Aucun appareil du Matter Server pour le moment. Un appareil est-il déjà configuré ?", no_results: "Aucun résultat.",
    show_more: "Afficher {n} de plus",
    status_online: "En ligne (selon le Matter Server)", status_offline: "Hors ligne (selon le Matter Server)", status_unknown: "Statut inconnu.",
    offline: "hors ligne", online: "en ligne", unknown: "inconnu", inactive: "inactif", interviewing: "Interrogation", disabled: "désactivé",
    never: "jamais", yes: "oui", no: "non", close: "Fermer", save: "Enregistrer", add: "Ajouter", cancel: "Annuler",
    confirm: "Vraiment ?", loading: "Chargement …", details: "Détails", remove: "Supprimer l'appareil", rename: "Renommer",
    set: "défini", not_set: "non défini", all: "tout",
    bridge_error: "Aucune connexion à l'intégration", server_offline: "Matter Server non connecté",
    server_offline_hint: "La connexion est rétablie automatiquement. Les valeurs affichées proviennent du dernier état connu.",
    server_incompatible: "Version du Matter Server trop ancienne",
    server_incompatible_hint: "Schéma d'API {v} détecté – au minimum {min} est requis. Veuillez mettre à jour le Matter Server.",
    commission_running: "Ajout de l'appareil", commission_running_hint: "Cela peut prendre jusqu'à deux minutes. Veuillez laisser l'appareil à proximité.",
    job_check: "Vérification du firmware en cours", job_update: "Installation des mises à jour de firmware",
    check_all: "Rechercher les mises à jour pour tout", checking: "Vérification démarrée …", update_all: "Installer {n} mises à jour l'une après l'autre",
    update_all_hint: "Les mises à jour sont lancées l'une après l'autre, jamais en parallèle. Les appareils sur batterie ne récupèrent souvent les mises à jour qu'après plusieurs heures. Les appareils doivent rester à portée.",
    install: "Installer", check: "Rechercher une mise à jour", update_now: "Installer la mise à jour",
    ota_available: "Mise à jour disponible", ota_updating: "Mise à jour en cours", ota_scheduled: "Planifiée", ota_idle: "À jour",
    ota_unknown: "Non vérifiée", ota_unsupported: "Cet appareil ne prend pas en charge les mises à jour OTA.",
    update_confirm: "L'appareil télécharge la mise à jour depuis le Matter Server, puis redémarre. Il doit rester alimenté et à portée.",
    update_found: "Mise à jour disponible", no_update: "Aucune mise à jour disponible", done_update: "Mise à jour lancée",
    release_notes: "Notes de version", f_checked_ota: "Dernière vérification",
    fabrics_hint: "Les appareils Matter peuvent être connectés simultanément à plusieurs écosystèmes (multi-admin). Vous voyez ici à quel écosystème appartient chaque appareil et pouvez dissocier une connexion.",
    no_fabrics: "Aucun fabric trouvé.", fabric_own: "Home Assistant (ce système)", fabric_unknown: "Écosystème inconnu",
    fabric_remove: "Dissocier la connexion", fabric_own_badge: "ce système", done_fabric: "Connexion dissociée",
    f_vendor_fabric: "Écosystème", f_fabric_id: "Fabric-ID", no_fabrics_device: "Aucune donnée de fabric disponible.",
    sec_share: "Partager avec un autre écosystème", share_hint: "Ouvre une fenêtre d'appairage. Saisissez le code dans Apple Home, Google Home, Alexa ou une autre application Matter.",
    share_open: "Ouvrir la fenêtre d'appairage", share_manual: "Code d'installation", share_qr: "Texte QR", share_valid: "valable {n} minutes", done_window: "Fenêtre d'appairage ouverte",
    no_bindings: "Aucun binding.", no_bindings_device: "Aucun binding configuré.",
    bindings_hint: "Les bindings relient directement les appareils (p. ex. bouton → lampe) et fonctionnent même sans Home Assistant.",
    bind: "Relier", unbind: "Dissocier", bind_target: "Appareil cible", pick_target: "Veuillez choisir une cible.",
    bind_endpoint: "Point de terminaison source", bind_clusters: "Fonctions",
    bind_hint: "Sans sélection, toutes les fonctions compatibles sont reliées. L'appareil cible reçoit automatiquement l'autorisation d'accès nécessaire. Réveillez d'abord les appareils sur batterie en appuyant sur un bouton.",
    done_bound: "Relié", done_unbound: "Liaison supprimée", bindings_bridged_hint: "Les bindings ne sont disponibles que pour les appareils directement sur le réseau.",
    sec_app: "Version de l'application", f_integration_version: "Intégration", f_card_version: "Carte", f_latest_version: "Dernière version",
    app_up_to_date: "À jour", app_update_available: "Mise à jour disponible : {v}", app_check_failed: "Vérification impossible (GitHub inaccessible)", app_not_checked: "pas encore vérifié",
    f_checked: "Dernière vérification", app_check_now: "Vérifier maintenant", app_checking: "Recherche d'une nouvelle version …", app_release: "Voir la version",
    app_update_hint: "Effectuez la mise à jour via HACS (intégration) et redémarrez Home Assistant. Rechargez ensuite le navigateur (Ctrl+F5).",
    app_mismatch: "La carte ({card}) et l'intégration ({integration}) ont des versions différentes. Videz le cache du navigateur (Ctrl+F5) ou rechargez l'application.",
    sec_status: "Matter Server", sec_commission: "Ajouter un appareil", sec_options: "Options du serveur", sec_maintenance: "Maintenance", sec_events: "Événements",
    sec_nc: "Notification Center", nc_found: "Notification Center détecté", nc_missing: "Notification Center non installé",
    nc_missing_hint: "Les messages seront envoyés dès que le Notification Center sera installé.", nc_master: "Envoyer des messages au Notification Center",
    nc_master_off_hint: "Interrupteur principal désactivé : rien n'est envoyé.", nc_types: "Types de messages", nc_saved: "Enregistré", nc_active: "Activé", nc_inactive: "Désactivé",
    sev_critical: "Critique", sev_warning: "Avertissement", sev_info: "Info", sev_ok: "OK",
    f_status: "Statut", f_sdk: "Matter-SDK", f_schema: "Schéma d'API", f_server_fabric: "Fabric-ID", f_compressed: "Fabric-ID compressé", f_url: "Adresse",
    f_nodes: "Appareils (nodes)", f_wifi_creds: "Identifiants Wi-Fi", f_thread_creds: "Identifiants Thread", f_bluetooth: "Bluetooth",
    commission_hint: "Saisissez le code d'installation de l'appareil (texte QR « MT:… » ou code à 11/21 chiffres). Pour les appareils Thread, les identifiants Thread doivent être définis dans le Matter Server.",
    commission_code: "Code d'installation", commission_network_only: "Rechercher uniquement sur le réseau (pas de Bluetooth)", commission_start: "Ajouter un appareil",
    pairing_start: "Ajouter un appareil", done_commission: "Appareil ajouté",
    fabric_label: "Libellé pour les nouvelles connexions", fabric_label_hint: "Est enregistré sur les appareils comme nom du fabric Home Assistant lors des futurs appairages (32 caractères au maximum).",
    done_fabric_label: "Libellé enregistré",
    reconnect: "Reconnecter", reconnect_hint: "Coupe la connexion au Matter Server et la rétablit. Le Matter Server lui-même n'est pas redémarré.", done_reconnect: "Reconnexion en cours",
    read_only_hint: "Cette carte est en lecture seule.", no_events: "Aucun événement depuis le démarrage.",
    ev_device_joined: "Nouvel appareil", ev_device_leave: "Appareil supprimé",
    ev_offline: "Hors ligne", ev_online: "De nouveau en ligne", ev_battery_low: "Batterie faible", ev_update_available: "Mise à jour disponible",
    ev_server_connected: "Matter Server connecté", ev_server_disconnected: "Connexion au Matter Server perdue",
    sec_info: "Informations", sec_fabrics: "Fabrics (multi-admin)", sec_firmware: "Firmware", sec_diag: "Diagnostic", sec_remove: "Supprimer l'appareil",
    new_name: "Nouveau nom", rename_entities_hint: "Le renommage ajuste le nom de l'appareil dans Home Assistant. Les {n} entités conservent leurs ID :",
    rename_hint: "Le nom est défini dans Home Assistant et – dans la mesure du possible – sur l'appareil lui-même.",
    done_renamed: "Renommé",
    sec_comment: "Commentaire", comment_placeholder: "Ta propre note sur cet appareil …", comment_hint: "Enregistré dans Home Assistant (jusqu'à {n} caractères) et interrogeable via la recherche.",
    comment_delete: "Supprimer le commentaire", done_comment: "Commentaire enregistré", done_comment_deleted: "Commentaire supprimé",
    remove_hint: "Supprime l'appareil de Home Assistant et du Matter Server. S'il est injoignable, il reste enregistré sur l'appareil et doit éventuellement être réinitialisé.",
    done_removed: "Appareil supprimé",
    ping: "Vérifier la disponibilité", interview: "Réinterroger l'appareil", done_interview: "Appareil réinterrogé",
    ping_result: "Joignable : {n} sur {m} adresses", diag_hint: "« Réinterroger » relit toutes les propriétés de l'appareil (interview).",
    bridged_hint: "Cet appareil est rattaché à un bridge et y est géré. Seul son nom dans Home Assistant peut être modifié ici.",
    f_vendor: "Fabricant", f_model: "Modèle", f_description: "Description", f_type: "Type", f_network: "Réseau",
    f_node_id: "Node-ID", f_endpoint: "Point de terminaison", f_bridge: "Bridge", f_sw: "Firmware", f_hw: "Matériel", f_part: "Numéro de pièce",
    f_serial: "Numéro de série", f_signal: "Force du signal", f_battery: "Batterie", f_voltage: "Tension", f_available: "Joignable",
    f_last_seen: "Vu pour la dernière fois", f_commissioned: "Configuré", f_thread_channel: "Canal Thread", f_thread_network: "Réseau Thread",
    f_wifi_channel: "Canal Wi-Fi", f_ip: "Adresses IP", f_fabrics: "Fabrics",
    type_Router: "Routeur Thread", type_Leader: "Leader Thread", type_EndDevice: "Terminal Thread", type_SleepyEndDevice: "Terminal Thread (en veille)",
    type_Thread: "Thread", type_WiFi: "Wi-Fi", type_Ethernet: "Ethernet", type_Bridge: "Bridge", type_Bridged: "Appareil derrière un bridge",
    net_thread: "Thread", net_wifi: "Wi-Fi", net_ethernet: "Ethernet",
    // Netzwerkkarte (seit 1.2.0)
    tab_network: "Réseau", chip_thread: "Thread", chip_wifi: "Wi-Fi", nw_title_thread: "Réseau Thread", nw_title_wifi: "Wi-Fi", nw_title_ethernet: "Ethernet", nw_none: "Pas encore de données réseau. Dès que le Matter Server signale des appareils Thread, Wi-Fi ou Ethernet, la carte apparaît ici.", nw_intro: "Structure des réseaux, construite à partir des données de diagnostic que le Matter Server connaît : pour Thread d'après les tables de voisins des routeurs, pour le Wi-Fi par point d'accès. Chaque routeur est rattaché à son meilleur chemin vers le leader (lien fort, peu de sauts) – une approximation des vraies routes, pas un affichage exact des routes.", nw_ext_hint: "Les routeurs externes ne font pas partie de tes appareils Matter (p. ex. un border router d'Apple ou de Google). Ils n'apparaissent que s'ils figurent dans une table de voisins.", nw_summary_thread: "Routeurs : {routers} (externes : {external}) · Appareils terminaux : {clients}", nw_summary_wifi: "Points d'accès : {routers} · Appareils : {clients}", nw_summary_ethernet: "Appareils sur le câble : {clients}", nw_leader: "Leader", nw_router: "Routeur", nw_external: "Routeur externe {id}", nw_ap: "Point d'accès", nw_ap_named: "Point d'accès {id}", nw_ap_unknown: "Point d'accès (inconnu)", nw_lan: "LAN", nw_channel: "Canal {n}", nw_cloud_one: "1 appareil", nw_cloud: "{n} appareils", nw_open_tip: "Ouvrir {name}", nw_show_tip: "Afficher les appareils de {name}", nw_links_routers: "Liens vers les routeurs", nw_end_devices: "Appareils", nw_rel_parent: "vers le leader", nw_rel_child: "en dessous", nw_rel_neighbor: "voisin", nw_orphan: "Aucune connexion avec le reste du réseau connue.", nw_unassigned: "Non attribués", nw_unassigned_hint: "Pour ces appareils, le Matter Server ne connaît aucun voisin Thread (p. ex. appareils en veille sans table de voisins).", nw_no_links: "Aucun lien connu", nw_signal: "Signal", nw_map_label: "Carte du réseau", nw_zoom_label: "Zoom de la carte du réseau", nw_zoom_out: "Dézoomer", nw_zoom_in: "Zoomer", nw_zoom_fit: "Ajuster", nw_zoom_reset: "Revenir à 100 %", nw_zoom_hint: "Zoom : curseur ou boutons ; sur smartphone pincer avec deux doigts, sur ordinateur Ctrl + molette. Maintiens le bouton de la souris enfoncé pour déplacer la carte dans toutes les directions.", nw_role_sleepy: "Appareil terminal en veille", nw_role_end: "Appareil terminal", nw_role_reed: "Appareil terminal apte routeur", nw_role_wifi: "Appareil Wi-Fi", nw_role_lan: "Appareil Ethernet",
    battery_ok: "OK", battery_warning: "Avertissement", battery_critical: "Critique", battery_replace: "Remplacement nécessaire",
    // Regroupement et filtres (depuis 1.0.2)
    group_by: "Regrouper", group_none: "Aucun regroupement", group_vendor: "Fabricant", group_model: "Nom de l'appareil", group_class: "Classe d'appareil", group_unknown: "Inconnu",
    expand_all: "Tout déplier", collapse_all: "Tout replier",
    filters: "Filtres", filter_active: "{n} actif(s)", filter_reset: "Réinitialiser tous les filtres", filter_remove: "Supprimer le filtre",
    flt_all: "Tous", flt_status: "Statut", flt_online: "En ligne", flt_offline: "Hors ligne",
    flt_power: "Alimentation", flt_battery_only: "Appareils sur batterie uniquement", flt_mains_only: "Alimentation secteur uniquement", flt_battery_low: "Batterie faible",
    flt_signal: "Signal", flt_sig_good: "Bon (à partir de −70 dBm)", flt_sig_mid: "Moyen (−85 à −71 dBm)", flt_sig_weak: "Faible (en dessous de −85 dBm)",
    flt_network: "Réseau", flt_firmware: "Firmware", flt_fw_available: "Mise à jour disponible",
    flt_seen: "Vu pour la dernière fois", flt_seen_24h: "Il y a plus de 24 heures", flt_seen_7d: "Il y a plus de 7 jours",
    flt_fabrics: "Écosystèmes", flt_fab_multi: "Plusieurs écosystèmes (multi-admin)", flt_fab_single: "Un seul écosystème",
    flt_vendor: "Fabricant", flt_model: "Nom de l'appareil", flt_class: "Classe d'appareil",
    flt_hint: "Plusieurs filtres s'appliquent ensemble (ET). « En ligne/Hors ligne » provient du Matter Server. Les filtres s'appliquent aux appareils, à la batterie et aux mises à jour.",
    cls_light: "Lampes", cls_switch: "Prises & interrupteurs", cls_climate: "Chauffage & climat", cls_cover: "Volets & stores", cls_lock: "Serrures",
    cls_fan: "Ventilateurs", cls_remote: "Boutons & télécommandes", cls_sensor: "Capteurs", cls_appliance: "Électroménager", cls_media: "Média", cls_bridge: "Bridges", cls_other: "Autres",
    // Fonctions (expose), copie des entités, images des appareils (depuis 1.0.3)
    tab_functions: "Fonctions",
    fn_chip_all: "Avec fonctions", fn_chip_switch: "Commutables", fn_chip_on: "Allumés",
    fn_none: "Aucun appareil avec fonctions pour le moment.",
    fn_hint: "Toutes les fonctions signalées par Matter pour les appareils, avec la valeur actuelle. Les interrupteurs marche/arrêt se basculent directement et agissent immédiatement sur l'appareil. Le reste est affiché uniquement – pour le piloter, utilisez comme avant les entités de Home Assistant.",
    fn_hint_ro: "Toutes les fonctions signalées par Matter pour les appareils, avec la valeur actuelle (affichage uniquement).",
    sec_functions: "Fonctions (expose)", no_functions: "Cet appareil ne signale aucune fonction.",
    fn_on: "Marche", fn_off: "Arrêt", fn_present: "Présent", fn_absent: "Absent",
    fn_onoff: "Marche/arrêt", fn_level: "Niveau de variation", fn_color_temp: "Température de couleur", fn_lock: "Serrure", fn_cover_closed: "Fermé (position)",
    fn_temperature: "Température", fn_target_heat: "Consigne de chauffage", fn_target_cool: "Consigne de refroidissement", fn_fan_percent: "Vitesse du ventilateur",
    fn_humidity: "Humidité", fn_pressure: "Pression atmosphérique", fn_illuminance: "Éclairement", fn_occupancy: "Présence",
    fn_v_locked: "Verrouillée", fn_v_unlocked: "Déverrouillée", fn_v_not_fully_locked: "Pas entièrement verrouillée", fn_v_unlatched: "Pêne rétracté",
    sec_entities: "Entités (pour les automatisations)", no_entities: "Aucune entité Home Assistant trouvée.",
    entities_hint: "Noms d'entités de Home Assistant. Le symbole copie un nom dans le presse-papiers, par exemple pour des automatisations ou des scripts.",
    copy: "Copier dans le presse-papiers", copy_all: "Tout copier", copy_entities: "Copier les noms d'entités",
    copied: "Copié : {v}", copied_n: "{n} entités copiées",
    copy_failed: "Copie impossible. Le navigateur n'autorise le presse-papiers qu'en HTTPS.", copy_manual: "Sélectionner pour copier (Ctrl+C) :",
  },
  es: {
    connecting: "Conectando …",
    error_generic: "La acción ha fallado.",
    tab_devices: "Dispositivos", tab_battery: "Batería", tab_updates: "Actualizaciones",
    tab_fabrics: "Fabrics", tab_bindings: "Bindings", tab_bridge: "Servidor",
    chip_devices: "Dispositivos", chip_offline: "Sin conexión", chip_low_battery: "Batería baja", chip_updates: "Actualizaciones",
    search: "Buscar nombre, modelo o ID de nodo", sort: "Ordenar",
    sort_name_asc: "Nombre A–Z", sort_name_desc: "Nombre Z–A", sort_battery_asc: "Batería (la más baja primero)",
    sort_signal_asc: "Señal (la más débil primero)", sort_last_seen_desc: "Visto por última vez (más reciente primero)",
    sort_last_seen_asc: "Visto por última vez (más antiguo primero)", sort_ota: "Estado de actualización",
    no_data: "Aún no hay dispositivos del Matter Server. ¿Hay algún dispositivo configurado?", no_results: "Sin coincidencias.",
    show_more: "Mostrar {n} más",
    status_online: "En línea (según el Matter Server)", status_offline: "Sin conexión (según el Matter Server)", status_unknown: "Estado desconocido.",
    offline: "sin conexión", online: "en línea", unknown: "desconocido", inactive: "inactivo", interviewing: "Entrevistando", disabled: "desactivado",
    never: "nunca", yes: "sí", no: "no", close: "Cerrar", save: "Guardar", add: "Añadir", cancel: "Cancelar",
    confirm: "¿Seguro?", loading: "Cargando …", details: "Detalles", remove: "Eliminar dispositivo", rename: "Renombrar",
    set: "definido", not_set: "sin definir", all: "todos",
    bridge_error: "Sin conexión con la integración", server_offline: "Matter Server no conectado",
    server_offline_hint: "La conexión se restablece automáticamente. Los valores mostrados corresponden al último estado conocido.",
    server_incompatible: "Versión del Matter Server demasiado antigua",
    server_incompatible_hint: "Esquema de API {v} detectado: se requiere al menos {min}. Actualiza el Matter Server.",
    commission_running: "Añadiendo dispositivo", commission_running_hint: "Puede tardar hasta dos minutos. Mantén el dispositivo cerca.",
    job_check: "Comprobación de firmware en curso", job_update: "Instalando actualizaciones de firmware",
    check_all: "Buscar actualizaciones de todos", checking: "Comprobación iniciada …", update_all: "Instalar {n} actualizaciones una a una",
    update_all_hint: "Las actualizaciones se inician una tras otra, nunca en paralelo. Los dispositivos con batería suelen recoger las actualizaciones solo después de horas. Los dispositivos deben permanecer al alcance.",
    install: "Instalar", check: "Buscar actualización", update_now: "Instalar actualización",
    ota_available: "Actualización disponible", ota_updating: "Actualizando", ota_scheduled: "Programada", ota_idle: "Actualizado",
    ota_unknown: "Sin comprobar", ota_unsupported: "Este dispositivo no admite actualizaciones OTA.",
    update_confirm: "El dispositivo descarga la actualización del Matter Server y se reinicia después. Debe permanecer encendido y al alcance.",
    update_found: "Actualización disponible", no_update: "No hay actualización disponible", done_update: "Actualización iniciada",
    release_notes: "Notas de la versión", f_checked_ota: "Última comprobación",
    fabrics_hint: "Los dispositivos Matter pueden estar conectados a varios ecosistemas a la vez (multi-admin). Aquí ves a cuáles pertenece cada dispositivo y puedes eliminar una conexión.",
    no_fabrics: "No se han encontrado fabrics.", fabric_own: "Home Assistant (este sistema)", fabric_unknown: "Ecosistema desconocido",
    fabric_remove: "Eliminar conexión", fabric_own_badge: "este sistema", done_fabric: "Conexión eliminada",
    f_vendor_fabric: "Ecosistema", f_fabric_id: "ID de fabric", no_fabrics_device: "No hay datos de fabric.",
    sec_share: "Compartir con otro ecosistema", share_hint: "Abre una ventana de emparejamiento. Introduce el código en Apple Home, Google Home, Alexa u otra app Matter.",
    share_open: "Abrir ventana de emparejamiento", share_manual: "Código de configuración", share_qr: "Texto del QR", share_valid: "válido durante {n} minutos", done_window: "Ventana de emparejamiento abierta",
    no_bindings: "No hay bindings.", no_bindings_device: "No hay bindings configurados.",
    bindings_hint: "Los bindings conectan dispositivos directamente (p. ej. botón → luz) y funcionan incluso sin Home Assistant.",
    bind: "Vincular", unbind: "Desvincular", bind_target: "Dispositivo de destino", pick_target: "Elige un destino.",
    bind_endpoint: "Endpoint de origen", bind_clusters: "Funciones",
    bind_hint: "Sin selección se vinculan todas las funciones coincidentes. El dispositivo de destino recibe automáticamente el permiso de acceso necesario. Despierta antes los dispositivos con batería pulsando un botón.",
    done_bound: "Vinculado", done_unbound: "Binding eliminado", bindings_bridged_hint: "Los bindings solo están disponibles para dispositivos conectados directamente a la red.",
    sec_app: "Versión de la app", f_integration_version: "Integración", f_card_version: "Tarjeta", f_latest_version: "Última versión",
    app_up_to_date: "Actualizada", app_update_available: "Actualización disponible: {v}", app_check_failed: "Comprobación fallida (GitHub no accesible)", app_not_checked: "aún sin comprobar",
    f_checked: "Última comprobación", app_check_now: "Comprobar ahora", app_checking: "Buscando una versión nueva …", app_release: "Ver versión",
    app_update_hint: "Actualiza mediante HACS (integración) y reinicia Home Assistant. Después recarga el navegador (Ctrl+F5).",
    app_mismatch: "La tarjeta ({card}) y la integración ({integration}) tienen versiones distintas. Borra la caché del navegador (Ctrl+F5) o recarga la app.",
    sec_status: "Matter Server", sec_commission: "Añadir dispositivo", sec_options: "Opciones del servidor", sec_maintenance: "Mantenimiento", sec_events: "Eventos",
    sec_nc: "Notification Center", nc_found: "Notification Center detectado", nc_missing: "Notification Center no instalado",
    nc_missing_hint: "Los mensajes se envían en cuanto se instale el Notification Center.", nc_master: "Enviar mensajes al Notification Center",
    nc_master_off_hint: "Interruptor principal desactivado: no se envía nada.", nc_types: "Tipos de mensajes", nc_saved: "Guardado", nc_active: "Activado", nc_inactive: "Desactivado",
    sev_critical: "Crítico", sev_warning: "Aviso", sev_info: "Info", sev_ok: "OK",
    f_status: "Estado", f_sdk: "SDK de Matter", f_schema: "Esquema de API", f_server_fabric: "ID de fabric", f_compressed: "ID de fabric comprimido", f_url: "Dirección",
    f_nodes: "Dispositivos (nodos)", f_wifi_creds: "Credenciales de Wi-Fi", f_thread_creds: "Credenciales de Thread", f_bluetooth: "Bluetooth",
    commission_hint: "Introduce el código de configuración del dispositivo (texto del QR “MT:…” o código de 11/21 dígitos). Para dispositivos Thread, las credenciales de Thread deben estar definidas en el Matter Server.",
    commission_code: "Código de configuración", commission_network_only: "Buscar solo en la red (sin Bluetooth)", commission_start: "Añadir dispositivo",
    pairing_start: "Añadir dispositivo", done_commission: "Dispositivo añadido",
    fabric_label: "Etiqueta para nuevas conexiones", fabric_label_hint: "Se guarda en los dispositivos como nombre del fabric de Home Assistant en futuros emparejamientos (hasta 32 caracteres).",
    done_fabric_label: "Etiqueta guardada",
    reconnect: "Reconectar", reconnect_hint: "Interrumpe la conexión con el Matter Server y la restablece. El propio Matter Server no se reinicia.", done_reconnect: "Reconectando …",
    read_only_hint: "Esta tarjeta es de solo lectura.", no_events: "Sin eventos desde el inicio.",
    ev_device_joined: "Nuevo dispositivo", ev_device_leave: "Dispositivo eliminado",
    ev_offline: "Sin conexión", ev_online: "De nuevo en línea", ev_battery_low: "Batería baja", ev_update_available: "Actualización disponible",
    ev_server_connected: "Matter Server conectado", ev_server_disconnected: "Conexión con el Matter Server perdida",
    sec_info: "Información", sec_fabrics: "Fabrics (multi-admin)", sec_firmware: "Firmware", sec_diag: "Diagnóstico", sec_remove: "Eliminar dispositivo",
    new_name: "Nombre nuevo", rename_entities_hint: "Al renombrar cambia el nombre del dispositivo en Home Assistant. Las {n} entidades conservan sus ID:",
    rename_hint: "El nombre se define en Home Assistant y, si es posible, en el propio dispositivo.",
    done_renamed: "Renombrado",
    sec_comment: "Comentario", comment_placeholder: "Tu propia nota sobre este dispositivo …", comment_hint: "Se guarda en Home Assistant (hasta {n} caracteres) y se puede buscar.",
    comment_delete: "Eliminar comentario", done_comment: "Comentario guardado", done_comment_deleted: "Comentario eliminado",
    remove_hint: "Elimina el dispositivo de Home Assistant y del Matter Server. Si no es accesible, sigue registrado en el dispositivo y puede que haya que restablecerlo.",
    done_removed: "Dispositivo eliminado",
    ping: "Comprobar accesibilidad", interview: "Volver a entrevistar el dispositivo", done_interview: "Dispositivo entrevistado de nuevo",
    ping_result: "Accesible: {n} de {m} direcciones", diag_hint: "“Volver a entrevistar” lee de nuevo todas las propiedades del dispositivo.",
    bridged_hint: "Este dispositivo está conectado a un puente y se gestiona allí. Aquí solo se puede cambiar su nombre en Home Assistant.",
    f_vendor: "Fabricante", f_model: "Modelo", f_description: "Descripción", f_type: "Tipo", f_network: "Red",
    f_node_id: "ID de nodo", f_endpoint: "Endpoint", f_bridge: "Puente", f_sw: "Firmware", f_hw: "Hardware", f_part: "Número de pieza",
    f_serial: "Número de serie", f_signal: "Intensidad de señal", f_battery: "Batería", f_voltage: "Tensión", f_available: "Accesible",
    f_last_seen: "Visto por última vez", f_commissioned: "Configurado", f_thread_channel: "Canal Thread", f_thread_network: "Red Thread",
    f_wifi_channel: "Canal Wi-Fi", f_ip: "Direcciones IP", f_fabrics: "Fabrics",
    type_Router: "Router Thread", type_Leader: "Líder Thread", type_EndDevice: "Dispositivo final Thread", type_SleepyEndDevice: "Dispositivo final Thread (en reposo)",
    type_Thread: "Thread", type_WiFi: "Wi-Fi", type_Ethernet: "Ethernet", type_Bridge: "Puente", type_Bridged: "Dispositivo tras un puente",
    net_thread: "Thread", net_wifi: "Wi-Fi", net_ethernet: "Ethernet",
    // Netzwerkkarte (seit 1.2.0)
    tab_network: "Red", chip_thread: "Thread", chip_wifi: "Wi-Fi", nw_title_thread: "Red Thread", nw_title_wifi: "Wi-Fi", nw_title_ethernet: "Ethernet", nw_none: "Aún no hay datos de red. En cuanto el Matter Server informe de dispositivos Thread, Wi-Fi o Ethernet, aparecerá aquí el mapa.", nw_intro: "Estructura de las redes, creada a partir de los datos de diagnóstico que el Matter Server conoce de los dispositivos: en Thread, de las tablas de vecinos de los routers; en Wi-Fi, por punto de acceso. Cada router cuelga de su mejor camino hacia el leader (enlace fuerte, pocos saltos): una aproximación de las rutas reales, no una vista exacta de rutas.", nw_ext_hint: "Los routers externos no forman parte de tus dispositivos Matter (p. ej. un border router de Apple o Google). Solo aparecen si figuran en una tabla de vecinos.", nw_summary_thread: "Routers: {routers} (externos: {external}) · Dispositivos finales: {clients}", nw_summary_wifi: "Puntos de acceso: {routers} · Dispositivos: {clients}", nw_summary_ethernet: "Dispositivos por cable: {clients}", nw_leader: "Leader", nw_router: "Router", nw_external: "Router externo {id}", nw_ap: "Punto de acceso", nw_ap_named: "Punto de acceso {id}", nw_ap_unknown: "Punto de acceso (desconocido)", nw_lan: "LAN", nw_channel: "Canal {n}", nw_cloud_one: "1 dispositivo", nw_cloud: "{n} dispositivos", nw_open_tip: "Abrir {name}", nw_show_tip: "Mostrar dispositivos de {name}", nw_links_routers: "Enlaces con routers", nw_end_devices: "Dispositivos", nw_rel_parent: "hacia el leader", nw_rel_child: "debajo", nw_rel_neighbor: "vecino", nw_orphan: "No se conoce conexión con el resto de la red.", nw_unassigned: "Sin asignar", nw_unassigned_hint: "Para estos dispositivos el Matter Server no conoce ningún vecino Thread (p. ej. dispositivos en reposo sin tabla de vecinos).", nw_no_links: "Sin enlaces conocidos", nw_signal: "Señal", nw_map_label: "Mapa de red", nw_zoom_label: "Zoom del mapa de red", nw_zoom_out: "Alejar", nw_zoom_in: "Acercar", nw_zoom_fit: "Ajustar", nw_zoom_reset: "Restablecer al 100 %", nw_zoom_hint: "Zoom: control deslizante o botones; en el móvil, pellizca con dos dedos; en el ordenador, Ctrl + rueda del ratón. Mantén pulsado el botón del ratón y arrastra para mover el mapa en cualquier dirección.", nw_role_sleepy: "Dispositivo final en reposo", nw_role_end: "Dispositivo final", nw_role_reed: "Dispositivo final apto para router", nw_role_wifi: "Dispositivo Wi-Fi", nw_role_lan: "Dispositivo Ethernet",
    battery_ok: "OK", battery_warning: "Aviso", battery_critical: "Crítica", battery_replace: "Sustituir",
    // Agrupar y filtrar (desde 1.0.2)
    group_by: "Agrupar por", group_none: "Sin agrupar", group_vendor: "Fabricante", group_model: "Nombre del dispositivo", group_class: "Clase de dispositivo", group_unknown: "Desconocido",
    expand_all: "Expandir todo", collapse_all: "Contraer todo",
    filters: "Filtros", filter_active: "{n} activos", filter_reset: "Restablecer todos los filtros", filter_remove: "Quitar filtro",
    flt_all: "Todos", flt_status: "Estado", flt_online: "En línea", flt_offline: "Sin conexión",
    flt_power: "Fuente de alimentación", flt_battery_only: "Solo dispositivos con batería", flt_mains_only: "Solo alimentados por la red eléctrica", flt_battery_low: "Batería baja",
    flt_signal: "Señal", flt_sig_good: "Buena (−70 dBm o mejor)", flt_sig_mid: "Media (−85 a −71 dBm)", flt_sig_weak: "Débil (por debajo de −85 dBm)",
    flt_network: "Red", flt_firmware: "Firmware", flt_fw_available: "Actualización disponible",
    flt_seen: "Visto por última vez", flt_seen_24h: "Hace más de 24 horas", flt_seen_7d: "Hace más de 7 días",
    flt_fabrics: "Ecosistemas", flt_fab_multi: "Varios ecosistemas (multi-admin)", flt_fab_single: "Un solo ecosistema",
    flt_vendor: "Fabricante", flt_model: "Nombre del dispositivo", flt_class: "Clase de dispositivo",
    flt_hint: "Varios filtros se aplican a la vez (Y). “En línea/Sin conexión” procede del Matter Server. Los filtros se aplican a Dispositivos, Batería y Actualizaciones.",
    cls_light: "Luces", cls_switch: "Enchufes e interruptores", cls_climate: "Calefacción y clima", cls_cover: "Persianas y cortinas", cls_lock: "Cerraduras",
    cls_fan: "Ventiladores", cls_remote: "Botones y mandos", cls_sensor: "Sensores", cls_appliance: "Electrodomésticos", cls_media: "Multimedia", cls_bridge: "Puentes", cls_other: "Otros",
    // Funciones (expose), copiar entidades, imágenes de dispositivos (desde 1.0.3)
    tab_functions: "Funciones",
    fn_chip_all: "Con funciones", fn_chip_switch: "Conmutables", fn_chip_on: "Encendidos",
    fn_none: "Aún no hay dispositivos con funciones.",
    fn_hint: "Todas las funciones que Matter notifica de los dispositivos, con el valor actual. Los interruptores de encendido/apagado se pueden conmutar directamente y surten efecto de inmediato en el dispositivo. Todo lo demás es solo de visualización: contrólalo como hasta ahora mediante las entidades de Home Assistant.",
    fn_hint_ro: "Todas las funciones que Matter notifica de los dispositivos, con el valor actual (solo visualización).",
    sec_functions: "Funciones (expose)", no_functions: "Este dispositivo no notifica ninguna función.",
    fn_on: "Encendido", fn_off: "Apagado", fn_present: "Presente", fn_absent: "Ausente",
    fn_onoff: "Encendido/apagado", fn_level: "Nivel de brillo", fn_color_temp: "Temperatura de color", fn_lock: "Cerradura", fn_cover_closed: "Cerrado (posición)",
    fn_temperature: "Temperatura", fn_target_heat: "Consigna de calefacción", fn_target_cool: "Consigna de refrigeración", fn_fan_percent: "Velocidad del ventilador",
    fn_humidity: "Humedad", fn_pressure: "Presión atmosférica", fn_illuminance: "Iluminancia", fn_occupancy: "Presencia",
    fn_v_locked: "Cerrada con llave", fn_v_unlocked: "Abierta", fn_v_not_fully_locked: "No del todo cerrada", fn_v_unlatched: "Pestillo retirado",
    sec_entities: "Entidades (para automatizaciones)", no_entities: "No se han encontrado entidades de Home Assistant.",
    entities_hint: "Nombres de entidades de Home Assistant. Usa el icono para copiar un nombre al portapapeles, por ejemplo para automatizaciones o scripts.",
    copy: "Copiar al portapapeles", copy_all: "Copiar todo", copy_entities: "Copiar nombres de entidades",
    copied: "Copiado: {v}", copied_n: "{n} entidades copiadas",
    copy_failed: "No se pudo copiar. El navegador solo permite el acceso al portapapeles mediante HTTPS.", copy_manual: "Selecciona para copiar (Ctrl+C):",
  },
  "sr-Latn": {
    connecting: "Povezivanje …",
    error_generic: "Akcija nije uspela.",
    tab_devices: "Uređaji", tab_battery: "Baterija", tab_updates: "Ažuriranja",
    tab_fabrics: "Mreže (Fabrics)", tab_bindings: "Povezivanja", tab_bridge: "Server",
    chip_devices: "Uređaji", chip_offline: "Van mreže", chip_low_battery: "Slaba baterija", chip_updates: "Ažuriranja",
    search: "Pretraži po nazivu, modelu ili Node-ID adresi", sort: "Sortiranje",
    sort_name_asc: "Naziv A–Ž", sort_name_desc: "Naziv Ž–A", sort_battery_asc: "Baterija (prvo najniža)",
    sort_signal_asc: "Signal (prvo najslabiji)", sort_last_seen_desc: "Poslednji put viđen (prvo najnovije)",
    sort_last_seen_asc: "Poslednji put viđen (prvo najstarije)", sort_ota: "Status ažuriranja",
    no_data: "Još uvek nema uređaja sa Matter servera. Da li je neki uređaj već podešen?", no_results: "Nema rezultata.",
    show_more: "Prikaži još {n}",
    status_online: "Na mreži (prema Matter serveru)", status_offline: "Van mreže (prema Matter serveru)", status_unknown: "Status nepoznat.",
    offline: "van mreže", online: "na mreži", unknown: "nepoznato", inactive: "neaktivno", interviewing: "Intervju", disabled: "onemogućeno",
    never: "nikada", yes: "da", no: "ne", close: "Zatvori", save: "Sačuvaj", add: "Dodaj", cancel: "Otkaži",
    confirm: "Da li ste sigurni?", loading: "Učitavanje …", details: "Detalji", remove: "Ukloni uređaj", rename: "Preimenuj",
    set: "postavljeno", not_set: "nije postavljeno", all: "sve",
    // 
    bridge_error: "Nema veze sa integracijom", server_offline: "Matter server nije povezan",
    server_offline_hint: "Veza će se automatski ponovo uspostaviti. Prikazane vrednosti su iz poslednjeg poznatog stanja.",
    server_incompatible: "Verzija Matter servera je prestara",
    server_incompatible_hint: "Detektovana je API šema {v} – potrebna je najmanje {min}. Molimo ažurirajte Matter server.",
    commission_running: "Dodavanje uređaja je u toku", commission_running_hint: "Ovo može potrajati do dva minuta. Držite uređaj u blizini.",
    job_check: "Provera firmvera je u toku", job_update: "Instalacija ažuriranja firmvera je u toku",
    // 
    check_all: "Proveri ažuriranja za sve", checking: "Provera je pokrenuta …", update_all: "Instaliraj {n} ažuriranja uzastopno",
    update_all_hint: "Ažuriranja se pokreću jedno za drugim, nikada paralelno. Uređaji na baterije često preuzimaju ažuriranja tek nakon nekoliko sati. Uređaji bi trebalo da ostanu u dometu.",
    install: "Instaliraj", check: "Proveri ima li ažuriranja", update_now: "Instaliraj ažuriranje",
    ota_available: "Ažuriranje je dostupno", ota_updating: "Ažuriranje je u toku", ota_scheduled: "Zakazano", ota_idle: "Ažurno",
    ota_unknown: "Nije provereno", ota_unsupported: "Ovaj uređaj ne podržava OTA ažuriranja.",
    update_confirm: "Uređaj preuzima ažuriranje sa Matter servera i nakon toga će se ponovo pokrenuti. Tokom procesa mora imati napajanje i ostati u dometu.",
    update_found: "Ažuriranje je dostupno", no_update: "Nema dostupnih ažuriranja", done_update: "Ažuriranje je pokrenuto",
    release_notes: "Beleške o verziji", f_checked_ota: "Poslednji put provereno",
    // 
    fabrics_hint: "Matter uređaji mogu biti istovremeno povezani sa više ekosistema (Multi-Admin). Ovde možete videti kojoj mreži svaki uređaj pripada i po potrebi raskinuti vezu.",
    no_fabrics: "Nisu pronađene mreže (Fabrics).", fabric_own: "Home Assistant (ovaj sistem)", fabric_unknown: "Nepoznati ekosistem",
    fabric_remove: "Raskini vezu", fabric_own_badge: "ovaj sistem", done_fabric: "Veza je raskinuta",
    f_vendor_fabric: "Ekosistem", f_fabric_id: "ID mreže (Fabric-ID)", no_fabrics_device: "Nema dostupnih podataka o mreži (Fabric).",
    sec_share: "Deli sa još jednim ekosistemom", share_hint: "Otvara prozor za uparivanje. Unesite generisani kod u Apple Home, Google Home, Alexa ili neku drugu Matter aplikaciju.",
    share_open: "Otvori prozor za uparivanje", share_manual: "Kod za podešavanje", share_qr: "QR tekst", share_valid: "Važi još {n} minuta", done_window: "Prozor za uparivanje je otvoren",
    // Bindings
    no_bindings: "Nema aktivnih povezivanja.", no_bindings_device: "Nema podešenih povezivanja.",
    bindings_hint: "Povezivanja direktno povezuju uređaje (npr. taster → lampa) i funkcionišu čak i bez „Home Assistant”-a.",
    bind: "Poveži", unbind: "Raskini vezu", bind_target: "Ciljni uređaj", pick_target: "Izaberite cilj.",
    bind_endpoint: "Krajnja tačka izvora (Endpoint)", bind_clusters: "Funkcije",
    bind_hint: "Ako ništa nije izabrano, sve odgovarajuće funkcije će biti povezane. Ciljni uređaj automatski dobija potrebna prava pristupa. Prethodno probudite uređaje na baterije pritiskom na dugme.",
    done_bound: "Povezano", done_unbound: "Veza je raskinuta", bindings_bridged_hint: "Povezivanja postoje samo za uređaje koji su direktno povezani na mrežu.",
    // 
    sec_app: "Verzija aplikacije", f_integration_version: "Integracija", f_card_version: "Kartica", f_latest_version: "Najnovija verzija",
    app_up_to_date: "Ažurno", app_update_available: "Dostupno ažuriranje: {v}", app_check_failed: "Provera nije moguća („GitHub” je nedostupan)", app_not_checked: "još nije provereno",
    f_checked: "Poslednji put provereno", app_check_now: "Proveri sada", app_checking: "Proveravam da li ima nove verzije …", app_release: "Pogledaj izdanje",
    app_update_hint: "Ažurirajte preko HACS-a (integracija) i ponovo pokrenite „Home Assistant”. Nakon toga osvežite pregledač (Ctrl+F5).",
    app_mismatch: "Kartica ({card}) i integracija ({integration}) imaju različite verzije. Ispraznite keš pregledača (Ctrl+F5) ili ponovo učitajte aplikaciju.",
    sec_status: "Matter server", sec_commission: "Dodaj uređaj", sec_options: "Opcije servera", sec_maintenance: "Održavanje", sec_events: "Događaji",
    sec_nc: "Centar za obaveštenja (Notification Center)", nc_found: "Centar za obaveštenja je detektovan", nc_missing: "Centar za obaveštenja nije instaliran",
    nc_missing_hint: "Obaveštenja će se slati čim se Centar za obaveštenja instalira.", nc_master: "Šalji obaveštenja u Centar za obaveštenja",
    nc_master_off_hint: "Glavni prekidač je isključen: ništa se neće slati.", nc_types: "Vrste obaveštenja", nc_saved: "Sačuvano", nc_active: "Aktivno", nc_inactive: "Isključeno",
    sev_critical: "Kritično", sev_warning: "Upozorenje", sev_info: "Info", sev_ok: "U redu",
    f_status: "Status", f_sdk: "Matter-SDK", f_schema: "API šema", f_server_fabric: "ID mreže (Fabric-ID)", f_compressed: "Kompaktni ID mreže", f_url: "Adresa",
    f_nodes: "Uređaji (Nodes)", f_wifi_creds: "WLAN akreditivi", f_thread_creds: "Thread akreditivi", f_bluetooth: "Bluetooth",
    commission_hint: "Unesite kod za podešavanje uređaja (QR tekst „MT:…” ili kod od 11/21 cifara). Za Thread uređaje, Thread akreditivi moraju biti postavljeni u Matter serveru.",
    commission_code: "Kod za podešavanje", commission_network_only: "Pretražuj samo preko mreže (bez Bluetooth-a)", commission_start: "Dodaj uređaj",
    pairing_start: "Dodaj uređaj", done_commission: "Uređaj je dodat",
    fabric_label: "Naziv za nove veze", fabric_label_hint: "Tokom budućih pokretanja, ovo će se koristiti kao naziv Home Assistant mreže (Fabric) na uređajima (najviše 32 znaka).",
    done_fabric_label: "Naziv je sačuvan",
    reconnect: "Ponovo uspostavi vezu", reconnect_hint: "Prekida vezu sa Matter serverom i ponovo je uspostavlja. Sam Matter server se neće ponovo pokrenuti.", done_reconnect: "Veza se ponovo uspostavlja",
    read_only_hint: "Kartica je zaštićena od upisa (samo za čitanje).", no_events: "Nema događaja od pokretanja.",
    ev_device_joined: "Novi uređaj", ev_device_leave: "Uređaj je uklonjen",
    ev_offline: "Van mreže", ev_online: "Ponovo na mreži", ev_battery_low: "Slaba baterija", ev_update_available: "Ažuriranje je dostupno",
    ev_server_connected: "Matter server je povezan", ev_server_disconnected: "Veza sa Matter serverom je prekinuta",
    //
    sec_info: "Informacije", sec_fabrics: "Mreže (Fabrics - Multi-Admin)", sec_firmware: "Firmver", sec_diag: "Dijagnostika", sec_remove: "Ukloni uređaj",
    new_name: "Novi naziv", rename_entities_hint: "Prilikom preimenovanja biće prilagođen naziv uređaja u „Home Assistant”-u. Ovih {n} entiteta zadržavaju svoje ID-ove:",
    rename_hint: "Naziv se postavlja u „Home Assistant”-u i – koliko je to moguće – u samom uređaju.",
    done_renamed: "Preimenovano",
    sec_comment: "Komentar", comment_placeholder: "Vaša beleška o ovom uređaju …", comment_hint: "Čuva se u „Home Assistant”-u (najviše {n} znakova) i može se pronaći putem pretrage.",
    comment_delete: "Obriši komentar", done_comment: "Komentar je sačuvan", done_comment_deleted: "Komentar je obrisan",
    remove_hint: "Uklanja uređaj iz „Home Assistant”-a i sa Matter servera. Ako uređaj nije dostupan, ostaće registrovan na njemu i po potrebi se mora resetovati.",
    done_removed: "Uređaj je uklonjen",
    ping: "Proveri dostupnost", interview: "Ponovo učitaj uređaj", done_interview: "Uređaj je ponovo učitan",
    ping_result: "Dostupan: {n} od {m} adresa", diag_hint: "Opcija „Ponovo učitaj uređaj” ponovo očitava sva svojstva uređaja (Intervju).",
    bridged_hint: "Ovaj uređaj je povezan preko mosta (Bridge) i tamo se njime upravlja. Ovde možete promeniti samo njegov naziv u „Home Assistant”-u.",
    f_vendor: "Proizvođač", f_model: "Model", f_description: "Opis", f_type: "Tip", f_network: "Mreža",
    f_node_id: "Node-ID", f_endpoint: "Krajnja tačka (Endpoint)", f_bridge: "Most (Bridge)", f_sw: "Firmver", f_hw: "Hardver", f_part: "Broj dela",
    f_serial: "Serijski broj", f_signal: "Jačina signala", f_battery: "Baterija", f_voltage: "Napon", f_available: "Dostupan",
    f_last_seen: "Poslednji put viđen", f_commissioned: "Podešeno", f_thread_channel: "Thread kanal", f_thread_network: "Thread mreža",
    f_wifi_channel: "WLAN kanal", f_ip: "IP adrese", f_fabrics: "Mreže (Fabrics)",
    type_Router: "Thread ruter", type_Leader: "Thread lider", type_EndDevice: "Thread krajnji uređaj", type_SleepyEndDevice: "Thread krajnji uređaj (u stanju spavanja)",
    type_Thread: "Thread", type_WiFi: "WLAN", type_Ethernet: "Ethernet", type_Bridge: "Most (Bridge)", type_Bridged: "Uređaj iza mosta",
    net_thread: "Thread", net_wifi: "WLAN", net_ethernet: "Ethernet",
    //
    tab_network: "Mreža", chip_thread: "Thread", chip_wifi: "WLAN", nw_title_thread: "Thread mreža", nw_title_wifi: "WLAN", nw_title_ethernet: "Ethernet", nw_none: "Još uvek nema mrežnih podataka. Čim Matter server prijavi Thread, WLAN ili Ethernet uređaje, ovde će se pojaviti mapa.", nw_intro: "Prikaz strukture mreža na osnovu dijagnostičkih podataka koje Matter server ima o uređajima: za Thread iz tabela susedstva rutera, za WLAN prema pristupnoj tački (Access Point). Svaki ruter je povezan preko svoje najbolje veze sa liderom (jak signal, malo skokova) – što je aproksimacija stvarnih ruta, a ne tačan prikaz putanja.", nw_ext_hint: "Spoljni ruteri ne pripadaju vašim Matter uređajima (npr. Border ruter kompanija Apple ili Google). Oni se pojavljuju samo ako se nalaze u nekoj tabeli susedstva.", nw_summary_thread: "Ruteri: {routers} (spoljni: {external}) · Krajnji uređaji: {clients}", nw_summary_wifi: "Pristupne tačke: {routers} · Uređaji: {clients}", nw_summary_ethernet: "Žični uređaji: {clients}", nw_leader: "Lider", nw_router: "Ruter", nw_external: "Spoljni ruter {id}", nw_ap: "Pristupna tačka (Access Point)", nw_ap_named: "Pristupna tačka {id}", nw_ap_unknown: "Pristupna tačka (nepoznato)", nw_lan: "LAN", nw_channel: "Kanal {n}", nw_cloud_one: "1 uređaj", nw_cloud: "{n} uređaja", nw_open_tip: "Otvori {name}", nw_show_tip: "Prikaži uređaje za {name}", nw_links_routers: "Veze sa ruterima", nw_end_devices: "Uređaji", nw_rel_parent: "U smeru lidera", nw_rel_child: "ispod", nw_rel_neighbor: "Sused", nw_orphan: "Nema poznate veze sa ostatkom mreže.", nw_unassigned: "Nedodeljeno", nw_unassigned_hint: "Za ove uređaje Matter server ne prepoznaje nijednog Thread suseda (npr. uređaji u stanju spavanja bez tabele susedstva).", nw_no_links: "Nema poznatih veza", nw_signal: "Signal", nw_map_label: "Mrežna mapa", nw_zoom_label: "Zum mrežne mape", nw_zoom_out: "Umanji", nw_zoom_in: "Uvećaj", nw_zoom_fit: "Prilagodi veličini", nw_zoom_reset: "Vrati na 100 %", nw_zoom_hint: "Zum: koristite klizač ili dugmad; na pametnom telefonu raširite/spojite sa dva prsta, a na računaru Ctrl + točkić miša. Držite levi klik miša da biste pomerali mapu u svim pravcima.", nw_role_sleepy: "Krajnji uređaj u stanju spavanja", nw_role_end: "Krajnji uređaj", nw_role_reed: "Krajnji uređaj sa mogućnošću rutera", nw_role_wifi: "WLAN uređaj", nw_role_lan: "Ethernet uređaj",
    battery_ok: "U redu", battery_warning: "Upozorenje", battery_critical: "Kritično", battery_replace: "Potrebna zamena",
    // Gruppieren und Filtern (seit 1.0.2)
    group_by: "Grupisanje", group_none: "Bez grupisanja", group_vendor: "Proizvođač", group_model: "Naziv uređaja", group_class: "Klasa uređaja", group_unknown: "Nepoznato",
    expand_all: "Rasklopi sve", collapse_all: "Sklopi sve",
    filters: "Filteri", filter_active: "{n} aktivan", filter_reset: "Resetuj sve filtere", filter_remove: "Ukloni filter",
    flt_all: "Svi", flt_status: "Status", flt_online: "Na mreži", flt_offline: "Van mreže",
    flt_power: "Napajanje", flt_battery_only: "Samo uređaji na baterije", flt_mains_only: "Samo uređaji na mrežnom napajanju", flt_battery_low: "Slaba baterija",
    flt_signal: "Signal", flt_sig_good: "Dobar (od −70 dBm)", flt_sig_mid: "Srednji (−85 do −71 dBm)", flt_sig_weak: "Slab (ispod −85 dBm)",
    flt_network: "Mreža", flt_firmware: "Firmver", flt_fw_available: "Ažuriranje je dostupno",
    flt_seen: "Poslednji put viđen", flt_seen_24h: "Pre više od 24 sata", flt_seen_7d: "Pre više od 7 dana",
    flt_fabrics: "Mreže", flt_fab_multi: "Više mreža (Multi-Admin)", flt_fab_single: "Samo jedna mreža",
    flt_vendor: "Proizvođač", flt_model: "Naziv uređaja", flt_class: "Klasa uređaja",
    flt_hint: "Više filtera se primenjuje istovremeno (I). Status „Na mreži/Van mreže” dolazi sa Matter servera. Filteri se primenjuju na uređaje, baterije i ažuriranja.",
    cls_light: "Lampe", cls_switch: "Utičnice i prekidači", cls_climate: "Grejanje i klima", cls_cover: "Roletne i žaluzine", cls_lock: "Brave",
    cls_fan: "Ventilatori", cls_remote: "Tasteri i daljinski upravljači", cls_sensor: "Senzori", cls_appliance: "Kućni aparati", cls_media: "Mediji", cls_bridge: "Mostovi (Bridges)", cls_other: "Ostalo",
    // Funktionen (Expose), Entitäten kopieren, Gerätebilder (seit 1.0.3)
    tab_functions: "Funkcije",
    fn_chip_all: "Sa funkcijama", fn_chip_switch: "Sa prekidačem", fn_chip_on: "Uključeno",
    fn_none: "Još uvek nema uređaja sa funkcijama.",
    fn_hint: "Sve funkcije koje Matter prijavljuje za uređaje, sa trenutnom vrednošću. Prekidači za uključivanje/isključivanje mogu se direktno prebacivati i odmah deluju na uređaju. Sve ostalo je samo za prikaz – upravljanje se vrši kao i do sada, preko Home Assistant entiteta.",
    fn_hint_ro: "Sve funkcije koje Matter prijavljuje za uređaje, sa trenutnom vrednošću (samo za prikaz).",
    sec_functions: "Funkcije (Expose)", no_functions: "Ovaj uređaj ne prijavljuje nikakve funkcije.",
    fn_on: "Uključeno", fn_off: "Isključeno", fn_present: "Prisutan", fn_absent: "Odsutan",
    fn_onoff: "Uključi/Isključi", fn_level: "Nivo zatamnjenja", fn_color_temp: "Temperatura boje", fn_lock: "Brava", fn_cover_closed: "Zatvoreno (pozicija)",
    fn_temperature: "Temperatura", fn_target_heat: "Zadata temperatura grejanja", fn_target_cool: "Zadata temperatura hlađenja", fn_fan_percent: "Brzina ventilatora",
    fn_humidity: "Vlažnost vazduha", fn_pressure: "Atmosferski pritisak", fn_illuminance: "Nivo osvetljenosti", fn_occupancy: "Prisutnost",
    fn_v_locked: "Verriegelt", fn_v_unlocked: "Entriegelt", fn_v_not_fully_locked: "Nicht ganz verriegelt", fn_v_unlatched: "Falle zurückgezogen",
    sec_entities: "Entiteti (za automatizacije)", no_entities: "Nisu pronađeni entiteti iz „Home Assistant”-a.",
    entities_hint: "Nazivi entiteta iz „Home Assistant”-a. Kliknite na simbol da biste kopirali naziv u privremenu memoriju, na primer za automatizacije ili skripte.",
    copy: "Kopiraj u privremenu memoriju", copy_all: "Kopiraj sve", copy_entities: "Kopiraj nazive entiteta",
    copied: "Kopirano: {v}", copied_n: "Kopirano entiteta: {n}",
    copy_failed: "Kopiranje nije moguće. Pregledač dozvoljava pristup privremenoj memoriji samo preko HTTPS protokola.", copy_manual: "Označite za kopiranje (Ctrl+C):",
  },
  sr: {
    connecting: "Повезивање …",
    error_generic: "Акција није успела.",
    tab_devices: "Уређаји", tab_battery: "Батерија", tab_updates: "Ажурирања",
    tab_fabrics: "Мреже (Fabrics)", tab_bindings: "Повезивања", tab_bridge: "Сервер",
    chip_devices: "Уређаји", chip_offline: "Ван мреже", chip_low_battery: "Слаба батерија", chip_updates: "Ажурирања",
    search: "Претражи по називу, моделу или Node-ID адреси", sort: "Сортирање",
    sort_name_asc: "Назив А–Ш", sort_name_desc: "Назив Ш–А", sort_battery_asc: "Батерија (прво најнижа)",
    sort_signal_asc: "Сигнал (прво најслабији)", sort_last_seen_desc: "Последњи пут виђен (прво најновије)",
    sort_last_seen_asc: "Последњи пут виђен (прво најстарије)", sort_ota: "Статус ажурирања",
    no_data: "Још увек нема уређаја са Matter сервера. Да ли је неки уређај већ подешен?", no_results: "Нема резултата.",
    show_more: "Прикажи још {n}",
    status_online: "На мрежи (према Matter серверу)", status_offline: "Ван мреже (према Matter серверу)", status_unknown: "Статус непознат.",
    offline: "ван мреже", online: "на мрежи", unknown: "непознато", inactive: "неактивно", interviewing: "Интервју", disabled: "онемогућено",
    never: "никада", yes: "да", no: "не", close: "Затвори", save: "Сачувај", add: "Додај", cancel: "Откажи",
    confirm: "Да ли сте сигурни?", loading: "Учитавање …", details: "Детаљи", remove: "Уклони уређај", rename: "Преименуј",
    set: "постављено", not_set: "није постављено", all: "све",
    //
    bridge_error: "Нема везе са интеграцијом", server_offline: "Matter сервер није повезан",
    server_offline_hint: "Веза ће се аутоматски поново успоставити. Приказане вредности су из последњег познатог стања.",
    server_incompatible: "Верзија Matter сервера је престара",
    server_incompatible_hint: "Детектована је API шема {v} – потребна је најмање {min}. Молимо ажурирајте Matter сервер.",
    commission_running: "Додавање уређаја је у току", commission_running_hint: "Ово може потрајати до два минута. Држите уређај у близини.",
    job_check: "Провера фирмвера је у току", job_update: "Инсталација ажурирања фирмвера је у току",
    //
    check_all: "Провери ажурирања за све", checking: "Провера је покренута …", update_all: "Инсталирај {n} ажурирања узастопно",
    update_all_hint: "Ажурирања се покрећу једно за другим, никада паралелно. Уређаји на батерије често преузимају ажурирања тек након неколико сати. Уређаји би требало да остану у домету.",
    install: "Инсталирај", check: "Провери има ли ажурирања", update_now: "Инсталирај ажурирање",
    ota_available: "Ажурирање је доступно", ota_updating: "Ажурирање је у току", ota_scheduled: "Заказано", ota_idle: "Ажурно",
    ota_unknown: "Није проверено", ota_unsupported: "Овај уређај не подржава OTA ажурирања.",
    update_confirm: "Уређај преузима ажурирање са Matter сервера и након тога ће се поново покренути. Током процеса мора имати напајање и остати у домету.",
    update_found: "Ажурирање је доступно", no_update: "Нема доступних ажурирања", done_update: "Ажурирање је покренуто",
    release_notes: "Белешке о верзији", f_checked_ota: "Последњи пут проверено",
    //
    fabrics_hint: "Matter уређаји могу бити истовремено повезани са више екосистема (Multi-Admin). Овде можете видети којој мрежи сваки уређај припада и по потреби раскинути везу.",
    no_fabrics: "Нису пронађене мреже (Fabrics).", fabric_own: "Home Assistant (овај систем)", fabric_unknown: "Непознати екосистем",
    fabric_remove: "Раскини везу", fabric_own_badge: "овај систем", done_fabric: "Веза је раскинута",
    f_vendor_fabric: "Екосистем", f_fabric_id: "ID мреже (Fabric-ID)", no_fabrics_device: "Нема доступних података о мрежи (Fabric).",
    sec_share: "Дели са још једним екосистемом", share_hint: "Отвара прозор за упаривање. Унесите генерисани код у Apple Home, Google Home, Alexa или неку другу Matter апликацију.",
    share_open: "Отвори прозор за упаривање", share_manual: "Код за подешавање", share_qr: "QR текст", share_valid: "Важи још {n} минута", done_window: "Прозор за упаривање је отворен",
    // Bindings
    no_bindings: "Нема активних повезивања.", no_bindings_device: "Нема подешених повезивања.",
    bindings_hint: "Повезивања директно повезују уређаје (нпр. тастер → лампа) и функционишу чак и без „Home Assistant”-а.",
    bind: "Повежи", unbind: "Раскини везу", bind_target: "Циљни уређај", pick_target: "Изаберите циљ.",
    bind_endpoint: "Крајња тачка извора (Endpoint)", bind_clusters: "Функције",
    bind_hint: "Ако ништа није изабрано, све одговарајуће функције ће бити повезане. Циљни уређај аутоматски добија потребна права приступа. Претходно пробудите уређаје на батерије притиском на дугме.",
    done_bound: "Повезано", done_unbound: "Веза је раскинута", bindings_bridged_hint: "Повезивања постоје само за уређаје који су директно повезани на мрежу.",
    //
    sec_app: "Верзија апликације", f_integration_version: "Интеграција", f_card_version: "Картица", f_latest_version: "Најновија верзија",
    app_up_to_date: "Ажурно", app_update_available: "Доступно ажурирање: {v}", app_check_failed: "Провера није могућа („GitHub” је недоступан)", app_not_checked: "још није проверено",
    f_checked: "Последњи пут проверено", app_check_now: "Провери сада", app_checking: "Проверавам да ли има нове верзије …", app_release: "Погледај издање",
    app_update_hint: "Ажурирајте преко HACS-а (интеграција) и поново покрените „Home Assistant”. Након тога освежите прегледач (Ctrl+F5).",
    app_mismatch: "Картица ({card}) и интеграција ({integration}) имају различите верзије. Испразните кеш прегледача (Ctrl+F5) или поново учитајте апликацију.",
    sec_status: "Matter сервер", sec_commission: "Додај уређај", sec_options: "Опције сервера", sec_maintenance: "Одржавање", sec_events: "Догађаји",
    sec_nc: "Центар за обавештења (Notification Center)", nc_found: "Центар за обавештења је детектован", nc_missing: "Центар за обавештења није инсталиран",
    nc_missing_hint: "Обавештења ће се слати чим се Центар за обавештења инсталира.", nc_master: "Шаљи обавештења у Центар за обавештења",
    nc_master_off_hint: "Главни прекидач је искључен: ништа се неће слати.", nc_types: "Врсте обавештења", nc_saved: "Сачувано", nc_active: "Активно", nc_inactive: "Иискључено",
    sev_critical: "Критично", sev_warning: "Упозорење", sev_info: "Инфо", sev_ok: "У реду",
    f_status: "Статус", f_sdk: "Matter-SDK", f_schema: "API шема", f_server_fabric: "ID мреже (Fabric-ID)", f_compressed: "Компактни ID мреже", f_url: "Адреса",
    f_nodes: "Уређаји (Nodes)", f_wifi_creds: "WLAN акредитиви", f_thread_creds: "Thread акредитиви", f_bluetooth: "Bluetooth",
    commission_hint: "Унесите код за подешавање уређаја (QR текст „MT:…” или код од 11/21 цифара). За Thread уређаје, Thread акредитиви морају бити постављени у Matter серверу.",
    commission_code: "Код за подешавање", commission_network_only: "Претражуј само преко мреже (без Bluetooth-а)", commission_start: "Додај уређај",
    pairing_start: "Додај уређај", done_commission: "Уређај је додат",
    fabric_label: "Назив за нове везе", fabric_label_hint: "Током будућих покретања, ово ће се користити као назив Home Assistant мреже (Fabric) на уређајима (највише 32 знака).",
    done_fabric_label: "Назив је сачуван",
    reconnect: "Поново успостави везу", reconnect_hint: "Прекида везу са Matter сервером и поново је успоставља. Сам Matter сервер се неће поново покренути.", done_reconnect: "Веза се поново успоставља",
    read_only_hint: "Картица је заштићена од уписа (само за читање).", no_events: "Нема догађаја од покретања.",
    ev_device_joined: "Нови уређај", ev_device_leave: "Уређај је уклоњен",
    ev_offline: "Ван мреже", ev_online: "Поново на мрежи", ev_battery_low: "Слаба батерија", ev_update_available: "Ажурирање је доступно",
    ev_server_connected: "Matter сервер је повезан", ev_server_disconnected: "Веза са Matter сервером је прекинута",
    //
    sec_info: "Информације", sec_fabrics: "Мреже (Fabrics - Multi-Admin)", sec_firmware: "Фирмвер", sec_diag: "Дијагностика", sec_remove: "Уклони уређај",
    new_name: "Нови назив", rename_entities_hint: "Приликом преименовања биће прилагођен назив уређаја у „Home Assistant”-у. Ових {n} ентитета задржавају своје ID-ове:",
    rename_hint: "Назив се поставља у „Home Assistant”-у и – колико је то могуће – у самом уређају.",
    done_renamed: "Преименовано",
    sec_comment: "Коментар", comment_placeholder: "Ваша белешка о овом уређају …", comment_hint: "Чува се у „Home Assistant”-у (највише {n} знакова) и може се пронаћи путем претраге.",
    comment_delete: "Обриши коментар", done_comment: "Коментар је сачуван", done_comment_deleted: "Коментар је обрисан",
    remove_hint: "Уклања уређај из „Home Assistant”-а и са Matter сервера. Ако уређај није доступан, остаће регистрован на њему и по треба се мора ресетовати.",
    done_removed: "Уређај је уклоњен",
    ping: "Провери доступност", interview: "Поново учитај уређај", done_interview: "Уређај је поново учитан",
    ping_result: "Доступан: {n} од {m} адреса", diag_hint: "Опција „Поново учитај уређај” поново очитава сва својства уређаја (Интервју).",
    bridged_hint: "Овај уређај је повезан преко моста (Bridge) и тамо се њиме управља. Овде можете променити само његов назив у „Home Assistant”-у.",
    f_vendor: "Произвођач", f_model: "Модел", f_description: "Опис", f_type: "Тип", f_network: "Мрежа",
    f_node_id: "Node-ID", f_endpoint: "Крајња тачка (Endpoint)", f_bridge: "Мост (Bridge)", f_sw: "Фирмвер", f_hw: "Хардвер", f_part: "Број дела",
    f_serial: "Серијски број", f_signal: "Јачина сигнала", f_battery: "Батерија", f_voltage: "Напон", f_available: "Доступан",
    f_last_seen: "Последњи пут виђен", f_commissioned: "Подешено", f_thread_channel: "Thread канал", f_thread_network: "Thread мрежа",
    f_wifi_channel: "WLAN канал", f_ip: "IP адресе", f_fabrics: "Мреже (Fabrics)",
    type_Router: "Thread рутер", type_Leader: "Thread лидер", type_EndDevice: "Thread крајњи уређај", type_SleepyEndDevice: "Thread крајњи уређај (у стању спавања)",
    type_Thread: "Thread", type_WiFi: "WLAN", type_Ethernet: "Ethernet", type_Bridge: "Мост (Bridge)", type_Bridged: "Уређај иза моста",
    net_thread: "Thread", net_wifi: "WLAN", net_ethernet: "Ethernet",
    //
    tab_network: "Мрежа", chip_thread: "Thread", chip_wifi: "WLAN", nw_title_thread: "Thread мрежа", nw_title_wifi: "WLAN", nw_title_ethernet: "Ethernet", nw_none: "Још увек нема мрежних података. Чим Matter сервер пријави Thread, WLAN или Ethernet уређаје, овде ће се појавити мапа.", nw_intro: "Приказ структуре мрежа на основу дијагностичких података које Matter сервер има о уређајима: за Thread из табела суседства рутера, за WLAN према приступној тачки (Access Point). Сваки рутер је повезан преко своје најбоље везе са лидером (јак сигнал, мало скокова) – што је апроксимација стварних рута, а не тачан приказ путања.", nw_ext_hint: "Спољни рутери не припадају вашим Matter уређајима (нпр. Border рутер компанија Apple или Google). Они се појављују само ако се налазе у некој табели суседства.", nw_summary_thread: "Рутери: {routers} (спољни: {external}) · Крајњи уређаји: {clients}", nw_summary_wifi: "Приступне тачке: {routers} · Уређаји: {clients}", nw_summary_ethernet: "Жични уређаји: {clients}", nw_leader: "Лидер", nw_router: "Рутер", nw_external: "Спољни рутер {id}", nw_ap: "Приступна тачка (Access Point)", nw_ap_named: "Приступна тачка {id}", nw_ap_unknown: "Приступна тачка (непознато)", nw_lan: "LAN", nw_channel: "Канал {n}", nw_cloud_one: "1 уређај", nw_cloud: "{n} уређаја", nw_open_tip: "Отвори {name}", nw_show_tip: "Прикажи уређаје за {name}", nw_links_routers: "Везе са рутерима", nw_end_devices: "Уређаји", nw_rel_parent: "У смеру лидера", nw_rel_child: "испод", nw_rel_neighbor: "Сусед", nw_orphan: "Нема познате везе са остатком мреже.", nw_unassigned: "Недодељено", nw_unassigned_hint: "За ове уређаје Matter сервер не препознаје ниједног Thread суседа (нпр. уређаји у стању спавања без табеле суседства).", nw_no_links: "Нема познатих веза", nw_signal: "Сигнал", nw_map_label: "Мрежна мапа", nw_zoom_label: "Зум мрежне мапе", nw_zoom_out: "Умањи", nw_zoom_in: "Увећај", nw_zoom_fit: "Прилагоди величини", nw_zoom_reset: "Врати на 100 %", nw_zoom_hint: "Зум: користите клизач или дугмад; на паметном телефону раширите/спојите са два прста, а на рачунару Ctrl + точкић миша. Држите леви клик миша да бисте померали мапу у свим правцима.", nw_role_sleepy: "Крајњи уређај у стању спавања", nw_role_end: "Крајњи уређај", nw_role_reed: "Крајњи уређај са могућношћу рутера", nw_role_wifi: "WLAN уређај", nw_role_lan: "Ethernet уређај",
    battery_ok: "У реду", battery_warning: "Упозорење", battery_critical: "Критично", battery_replace: "Потребна замена",
    // Gruppieren und Filtern (seit 1.0.2)
    group_by: "Груписање", group_none: "Без груписања", group_vendor: "Произвођач", group_model: "Назив уређаја", group_class: "Класа уређаја", group_unknown: "Непознато",
    expand_all: "Расклопи све", collapse_all: "Склопи све",
    filters: "Филтери", filter_active: "{n} активан", filter_reset: "Ресетуј све филтере", filter_remove: "Уклони филтер",
    flt_all: "Сви", flt_status: "Статус", flt_online: "На мрежи", flt_offline: "Ван мреже",
    flt_power: "Напајање", flt_battery_only: "Само уређаји на батерије", flt_mains_only: "Само уређаји на мрежном напајању", flt_battery_low: "Слаба батерија",
    flt_signal: "Сигнал", flt_sig_good: "Добар (од −70 dBm)", flt_sig_mid: "Средњи (−85 до −71 dBm)", flt_sig_weak: "Слаб (испод −85 dBm)",
    flt_network: "Мрежа", flt_firmware: "Фирмвер", flt_fw_available: "Ажурирање је доступно",
    flt_seen: "Последњи пут виђен", flt_seen_24h: "Пре више од 24 сата", flt_seen_7d: "Пре више од 7 дана",
    flt_fabrics: "Мреже", flt_fab_multi: "Више мрежа (Multi-Admin)", flt_fab_single: "Само једна мрежа",
    flt_vendor: "Произвођач", flt_model: "Назив уређаја", flt_class: "Класа уређаја",
    flt_hint: "Више филтера се примењује истовремено (И). Статус „На мрежи/Ван мреже” долази са Matter сервера. Филтери се примењују на уређаје, батерије и ажурирања.",
    cls_light: "Светиљке", cls_switch: "Утичнице и прекидачи", cls_climate: "Грејање и клима", cls_cover: "Ролетне и жалузине", cls_lock: "Браве",
    cls_fan: "Вентилатори", cls_remote: "Тастери и даљински управљачи", cls_sensor: "Сензори", cls_appliance: "Кућни апарати", cls_media: "Медији", cls_bridge: "Мостови (Bridges)", cls_other: "Остало",
    // Funktionen (Expose), Entitäten kopieren, Gerätebilder (seit 1.0.3)
    tab_functions: "Функције",
    fn_chip_all: "Са функцијама", fn_chip_switch: "Са прекидачем", fn_chip_on: "Укључено",
    fn_none: "Још увек нема уређаја са функцијама.",
    fn_hint: "Све функције које Matter пријављује за уређаје, са тренутном вредношћу. Прекидачи за укључивање/искључивање могу се директно пребацивати и одмах делују на уређају. Све остало је само за приказ – управљање се врши као и до сада, преко Home Assistant ентитета.",
    fn_hint_ro: "Све функције које Matter пријављује за уређаје, са тренутном вредношћу (само за приказ).",
    sec_functions: "Функције (Expose)", no_functions: "Овај уређај не пријављује никакве функције.",
    fn_on: "Укључено", fn_off: "Искључено", fn_present: "Присутан", fn_absent: "Одсутан",
    fn_onoff: "Укључи/Искључи", fn_level: "Ниво затамњења", fn_color_temp: "Температура боје", fn_lock: "Брава", fn_cover_closed: "Затворено (позиција)",
    fn_temperature: "Температура", fn_target_heat: "Задата температура грејања", fn_target_cool: "Задата температура хлађења", fn_fan_percent: "Брзина вентилатора",
    fn_humidity: "Влажност ваздуха", fn_pressure: "Атмосферски притисак", fn_illuminance: "Ниво осветљености", fn_occupancy: "Присутност",
    fn_v_locked: "Закључано", fn_v_unlocked: "Откључано", fn_v_not_fully_locked: "Није потпуно закључано", fn_v_unlatched: "Језичак је повучен",
    sec_entities: "Ентитети (за аутоматизације)", no_entities: "Нису пронађени ентитети из „Home Assistant”-а.",
    entities_hint: "Називи ентитета из „Home Assistant”-а. Кликните на симбол да бисте копирали назив у привремену меморију, на пример за аутоматизације или скрипте.",
    copy: "Копирај у привремену меморију", copy_all: "Копирај све", copy_entities: "Копирај називе ентитета",
    copied: "Копирано: {v}", copied_n: "Копирано ентитета: {n}",
    copy_failed: "Копирање није могуће. Прегледач дозвољава приступ привременој меморији само преко HTTPS протокола.", copy_manual: "Означите за копирање (Ctrl+C):",
  },
};

// --- Styles -----------------------------------------------------------------

const BASE_CARD_STYLES = `
  ha-card { overflow: hidden; }
  /* container-type: die Tab-Leiste reagiert auf die Breite DIESER Karte statt
     auf das Browserfenster (siehe TABS_CONTAINER_QUERY_STYLES). */
  .card-content { padding: 8px 16px 16px; container-type: inline-size; container-name: mmm; }
  .empty { padding: 24px 0; text-align: center; color: var(--secondary-text-color, #727272); }
  .hint { font-size: 0.82em; color: var(--secondary-text-color, #727272); margin: 4px 0; }
  .hint.warn { color: var(--mmm-color-warning); }
  .hint.err { color: var(--mmm-color-error); }
  .muted { color: var(--secondary-text-color, #727272); }
  button { font: inherit; color: inherit; cursor: pointer; }
  button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible,
  .row.clickable:focus-visible { outline: 2px solid var(--mmm-color-tab-active); outline-offset: 1px; }

  /* Schaltflächen */
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px;
    padding: 6px 10px; background: none; color: var(--primary-text-color, #212121);
    font: inherit; font-size: 0.85em; cursor: pointer; --mdc-icon-size: 18px;
  }
  .btn:hover:not([disabled]) { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
  .btn[disabled] { opacity: 0.45; cursor: default; }
  .btn.primary { background: var(--mmm-color-tab-active); border-color: var(--mmm-color-tab-active); color: var(--text-primary-color, #fff); }
  .btn.primary:hover:not([disabled]) { filter: brightness(1.08); background: var(--mmm-color-tab-active); }
  .btn.danger { color: var(--mmm-color-error); border-color: var(--mmm-color-error); }
  .btn.small { padding: 3px 8px; font-size: 0.78em; --mdc-icon-size: 16px; }
  .btn.icon { padding: 4px; border: none; --mdc-icon-size: 20px; color: var(--secondary-text-color, #727272); }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 4px 0 8px; }
  .toolbar .spacer { flex: 1 1 auto; }

  /* Live-Banner (Pairing, Firmware-Auftrag, Bridge offline) */
  .live-banner {
    display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin-bottom: 12px;
    border-radius: 8px; background: var(--mmm-color-live-banner); color: var(--text-primary-color, #fff);
  }
  .live-banner.error { background: var(--mmm-color-error); }
  .live-banner.warn { background: var(--mmm-color-warning); }
  .live-banner ha-icon { --mdc-icon-size: 28px; flex-shrink: 0; }
  .live-banner-text { display: flex; flex-direction: column; min-width: 0; flex: 1 1 auto; }
  .live-state { font-weight: 600; }
  .live-detail { font-size: 0.9em; opacity: 0.9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .live-banner .btn { color: inherit; border-color: rgba(255,255,255,0.6); }
  .live-banner .btn:hover:not([disabled]) { background: rgba(255,255,255,0.18); }

  /* Kategorie-Leiste */
  .tabs { display: flex; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid var(--divider-color, #e0e0e0); overflow-x: auto; }
  .tab {
    display: flex; align-items: center; gap: 6px; flex: 1 1 auto; min-width: 0; justify-content: center;
    background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 6px;
    cursor: pointer; color: var(--secondary-text-color, #727272); font: inherit; white-space: nowrap;
  }
  .tab ha-icon { --mdc-icon-size: 20px; flex-shrink: 0; }
  .tab.active { color: var(--mmm-color-tab-active); border-bottom-color: var(--mmm-color-tab-active); font-weight: 600; }
  .tab span { font-size: 0.8em; overflow: hidden; text-overflow: ellipsis; }
  .tab .count {
    font-size: 0.7em; min-width: 16px; padding: 0 5px; border-radius: 8px; text-align: center;
    background: var(--mmm-color-error); color: var(--text-primary-color, #fff); font-weight: 600;
  }
  .tab .count.info { background: var(--mmm-color-info); }
  .tab .count.warn { background: var(--mmm-color-warning); }

  /* Statistik-Chips + Filter-/Sortierleiste */
  .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0 8px; }
  .chip {
    display: inline-flex; align-items: baseline; gap: 6px; border: 1px solid var(--divider-color, #e0e0e0);
    background: none; border-radius: 12px; padding: 3px 10px; font-size: 0.8em; color: var(--secondary-text-color, #727272);
  }
  .chip b { font-size: 1.15em; font-weight: 600; color: var(--c, var(--primary-text-color, #212121)); }
  .chip.on { background: var(--secondary-background-color, rgba(0,0,0,0.04)); border-color: var(--c, var(--mmm-color-tab-active)); }
  .filter-bar {
    display: flex; flex-wrap: wrap; column-gap: 16px; row-gap: 6px; align-items: center;
    padding: 4px 0 10px; margin-bottom: 4px; border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .filter-bar-field { display: flex; align-items: center; gap: 6px; font-size: 0.8em; color: var(--secondary-text-color, #727272); }
  .filter-bar-field select, .filter-bar-field input[type="search"], .field input, .field select {
    font: inherit; font-size: 1em; color: var(--primary-text-color, #212121);
    background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px; padding: 5px 8px; box-sizing: border-box;
  }
  .filter-bar-field select { max-width: 170px; }
  .flt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px 12px; padding-top: 4px; }
  .flt-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8em; color: var(--secondary-text-color, #727272); }
  .flt-field select {
    font: inherit; font-size: 1em; color: var(--primary-text-color, #212121); width: 100%;
    background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px; padding: 5px 8px; box-sizing: border-box;
  }
  .group-list { display: flex; flex-direction: column; gap: 8px; }
  .group-list .settings-accordion-body { padding-top: 0; }
  .filters-wrap { margin-bottom: 8px; }
  .fchips { padding: 0 0 8px; }
  .fchips .chip { cursor: pointer; align-items: center; gap: 4px; --mdc-icon-size: 14px; }
  .filter-bar-field.grow { flex: 1 1 160px; }
  .filter-bar-field.grow input { flex: 1 1 auto; min-width: 0; }

  /* Zeilenliste */
  .rows { display: flex; flex-direction: column; }
  .row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
  .row:last-child { border-bottom: none; }
  .row.clickable { cursor: pointer; }
  .row.clickable:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
  .row-icon { flex-shrink: 0; color: var(--mmm-color-row-icon); --mdc-icon-size: 22px; position: relative; display: inline-flex; }
  .row-icon .dot {
    position: absolute; right: -3px; bottom: -3px; width: 10px; height: 10px; border-radius: 50%;
    border: 2px solid var(--card-background-color, #fff); background: var(--disabled-text-color, #9e9e9e);
    box-sizing: content-box;
  }
  .row-icon .dot.on { background: var(--mmm-color-success); }
  .row-icon .dot.off { background: var(--mmm-color-error); }
  /* Ohne Z2M-Verfügbarkeit: aus "zuletzt gesehen" abgeleitet (Tooltip erklärt es) */
  .row-icon .dot.seen { background: var(--mmm-color-success); opacity: 0.6; }
  .row-icon .dot.stale { background: var(--mmm-color-warning); }
  .row-icon.has-image { width: 40px; height: 40px; align-items: center; justify-content: center; }
  ha-icon[hidden] { display: none; }
  .row-icon .dev-img { width: 40px; height: 40px; object-fit: contain; border-radius: 6px; }
  .popup-head .dev-img { width: 32px; height: 32px; object-fit: contain; border-radius: 6px; flex-shrink: 0; }
  .row-main { flex: 1 1 auto; min-width: 0; }
  .row-primary { display: flex; align-items: center; gap: 6px; }
  .row-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-secondary { display: flex; gap: 8px; font-size: 0.85em; color: var(--secondary-text-color, #727272); overflow: hidden; white-space: nowrap; }
  .row-secondary span { overflow: hidden; text-overflow: ellipsis; }
  .row-extra { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.8em; color: var(--secondary-text-color, #727272); text-align: right; }
  .badge {
    font-size: 0.7em; padding: 0 6px; border-radius: 8px; white-space: nowrap;
    border: 1px solid var(--c, var(--divider-color, #e0e0e0)); color: var(--c, var(--secondary-text-color, #727272));
  }
  .pill {
    display: inline-block; padding: 1px 9px; border-radius: 10px; font-size: 0.85em; white-space: nowrap;
    border: 1px solid var(--c, var(--divider-color, #e0e0e0)); color: var(--c, var(--secondary-text-color, #727272));
  }
  .bar { display: inline-block; width: 56px; height: 8px; border-radius: 4px; background: var(--divider-color, #e0e0e0); vertical-align: middle; margin-right: 6px; overflow: hidden; }
  .bar > span { display: block; height: 100%; border-radius: 4px; }
  .more { display: flex; justify-content: center; padding: 8px 0 0; }

  /* Einstellungen-/Bridge-Ansicht und Akkordeons (wie bei fritzbox-anrufe) */
  .settings-view { display: flex; flex-direction: column; gap: 10px; }
  .settings-accordion { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px; overflow: hidden; }
  .settings-accordion-summary {
    display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer;
    font-weight: 600; list-style: none; user-select: none; --mdc-icon-size: 20px;
  }
  .settings-accordion-summary > ha-icon:first-child { color: var(--secondary-text-color, #727272); }
  .settings-accordion-summary::-webkit-details-marker { display: none; }
  .settings-accordion-summary::marker { display: none; }
  .settings-accordion-summary .grow { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .settings-accordion-summary .meta { font-weight: 400; font-size: 0.85em; color: var(--secondary-text-color, #727272); }
  .settings-accordion-summary::after {
    content: ""; margin-left: auto; width: 8px; height: 8px; flex-shrink: 0;
    border-right: 2px solid var(--secondary-text-color, #727272); border-bottom: 2px solid var(--secondary-text-color, #727272);
    transform: rotate(45deg); transition: transform 0.15s ease;
  }
  .settings-accordion-summary:has(.meta)::after { margin-left: 4px; }
  .settings-accordion[open] > .settings-accordion-summary::after { transform: rotate(-135deg); }
  .settings-accordion-body { padding: 0 12px 10px; }
  .settings-accordion.update { border-color: var(--mmm-color-warning); }
  .settings-accordion.update > .settings-accordion-summary { color: var(--mmm-color-warning); }
  a.btn { text-decoration: none; display: inline-flex; align-items: center; }
  .settings-accordion.danger { border-color: var(--mmm-color-error); }
  .settings-accordion.danger > .settings-accordion-summary { color: var(--mmm-color-error); }

  .settings-line {
    display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 7px 0;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .settings-line:last-child { border-bottom: none; }
  .settings-label { color: var(--secondary-text-color, #727272); }
  .settings-value { font-weight: 500; text-align: right; word-break: break-word; }
  .field { display: flex; flex-direction: column; gap: 4px; padding: 6px 0; }
  .field label { font-size: 0.85em; color: var(--primary-text-color, #212121); }
  .comment-text { white-space: pre-wrap; overflow-wrap: anywhere; padding: 6px 0; }
  .field textarea.comment-input { resize: vertical; min-height: 4.5em; }
  .field .help { font-size: 0.75em; color: var(--secondary-text-color, #727272); }
  .field.inline { flex-direction: row; align-items: center; gap: 8px; }
  .field-row { display: flex; gap: 8px; align-items: center; }
  .field-row input { flex: 1 1 auto; min-width: 0; }
  .clusters { display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 4px 0; font-size: 0.85em; }
  .clusters label { display: inline-flex; align-items: center; gap: 4px; }
  .timeline { display: flex; flex-direction: column; max-height: 320px; overflow-y: auto; }
  .timeline-item { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid var(--divider-color, #e0e0e0); font-size: 0.9em; align-items: center; --mdc-icon-size: 18px; }
  .timeline-item:last-child { border-bottom: none; }
  .timeline-item .when { margin-left: auto; color: var(--secondary-text-color, #727272); font-size: 0.85em; white-space: nowrap; }

  /* Netzwerkkarte (seit 1.2.0): Zeichnung (SVG) und Verbindungslisten */
  .nm-wrap { overflow-x: auto; padding: 0 2px; margin: 4px 0; touch-action: pan-x pan-y; }
  @media (hover: hover) and (pointer: fine) {
    .nm-wrap { overflow: auto; max-height: min(78vh, 760px); cursor: grab; user-select: none; -webkit-user-select: none; }
    .nm-wrap.nm-dragging, .nm-wrap.nm-dragging * { cursor: grabbing !important; }
  }
  .nm-zoom { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 4px 0 2px; }
  .nm-zoom input[type=range] { flex: 1 1 120px; min-width: 90px; max-width: 320px; accent-color: var(--mmm-color-tab-active); }
  .nm-zoomval { min-width: 3.2em; text-align: center; font-variant-numeric: tabular-nums; }
  .nm-zoomhint { margin: 0 0 6px; }
  .nm-svg { height: auto; display: block; margin: 0; max-width: none; }
  .nm-node rect { fill: var(--card-background-color, #fff); stroke: var(--mmm-color-tab-active); stroke-width: 1.5; }
  .nm-node.coord rect { stroke-width: 2.5; }
  .nm-node.cl rect { stroke: var(--divider-color, #999); stroke-dasharray: 4 3; }
  .nm-node.off rect { stroke: var(--mmm-color-error); }
  .nm-node.link { cursor: pointer; }
  .nm-node.link:hover rect, .nm-node.link:focus-visible rect { stroke-width: 3; }
  .nm-node.link:focus-visible { outline: none; }
  .nm-node ha-icon { --mdc-icon-size: 24px; width: 24px; height: 24px; color: var(--mmm-color-tab-active); }
  .nm-node.cl ha-icon { --mdc-icon-size: 18px; width: 18px; height: 18px; color: var(--secondary-text-color, #727272); }
  .nm-node.off ha-icon { color: var(--mmm-color-error); }
  .nm-t { font-size: 13px; font-weight: 600; fill: var(--primary-text-color, #222); }
  .nm-s { font-size: 11px; fill: var(--secondary-text-color, #727272); }
  .nm-lbl { font-size: 10px; fill: var(--secondary-text-color, #727272); }
  .nm-edge { fill: none; stroke: var(--mmm-color-tab-active); stroke-width: 2; }
  .nm-edge.nm-dash { stroke: var(--divider-color, #999); stroke-dasharray: 4 3; stroke-width: 1.5; }
  .nm-edge.nm-orphan { stroke: var(--mmm-color-warning); stroke-dasharray: 6 4; }
  .nm-sub { font-weight: 600; font-size: 0.9em; margin: 8px 0 2px; }
  .nm-row { display: flex; align-items: center; gap: 8px; padding: 6px 2px; border-bottom: 1px solid var(--divider-color, #e0e0e0); cursor: pointer; }
  .nm-row.plain { cursor: default; }
  .nm-row:last-child { border-bottom: none; }
  .nm-row .nm-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nm-row .nm-dot { position: relative; width: 14px; height: 14px; flex: none; }
  .nm-row .nm-dot .dot { position: static; }
  .nm-row ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color, #727272); }
  .nm-rel { white-space: nowrap; }

  /* Detail-Popup */
  .popup-backdrop {
    position: fixed; inset: 0; z-index: 20; display: flex; align-items: center; justify-content: center;
    padding: 16px; background: rgba(0, 0, 0, 0.45);
  }
  .popup-backdrop[hidden] { display: none; }
  .popup {
    background: var(--card-background-color, var(--ha-card-background, #fff)); color: var(--primary-text-color, #212121);
    border-radius: var(--ha-card-border-radius, 12px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    width: min(440px, 100%); max-height: 86vh; overflow-y: auto;
  }
  .popup-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--divider-color, #e0e0e0); position: sticky; top: 0; background: inherit; z-index: 1; }
  .popup-title { flex: 1; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .popup-close { border: none; background: transparent; cursor: pointer; color: var(--secondary-text-color, #727272); padding: 2px; display: inline-flex; }
  .popup-body { padding: 10px 14px 14px; display: flex; flex-direction: column; gap: 8px; }

  /* Hinweis-Toast */
  .toast {
    position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 16px); opacity: 0; pointer-events: none; z-index: 30;
    padding: 10px 18px; border-radius: 8px; background: var(--primary-text-color, #212121); color: var(--card-background-color, #fff);
    font-size: 0.88em; max-width: 90vw; transition: opacity 0.2s, transform 0.2s;
  }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }
  .toast.error { background: var(--mmm-color-error); color: #fff; }

  /* Matter-spezifisch */
  .codebox {
    font-family: var(--code-font-family, monospace); font-size: 0.95em; word-break: break-all;
    border: 1px dashed var(--divider-color, #e0e0e0); border-radius: 6px; padding: 6px 8px;
    background: var(--secondary-background-color, rgba(0,0,0,0.04)); user-select: all;
  }
  .codebox.big { font-size: 1.2em; letter-spacing: 0.08em; text-align: center; }
  .fabric-head { display: flex; align-items: center; gap: 10px; padding: 10px 0 4px; font-weight: 600; }
  .fabric-head ha-icon { color: var(--mmm-color-row-icon); }
  .fabric-members { margin-left: 12px; border-left: 2px solid var(--divider-color, #e0e0e0); padding-left: 10px; }
  .progress { height: 6px; border-radius: 3px; background: var(--divider-color, #e0e0e0); overflow: hidden; margin: 4px 0; }
  .progress > span { display: block; height: 100%; background: var(--mmm-color-info); }
  .field textarea { font: inherit; box-sizing: border-box; width: 100%; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px; padding: 6px 8px; background: var(--card-background-color, #fff); color: var(--primary-text-color, #212121); }
  /* Funktionen (Expose), Schalter und Entitäten kopieren (seit 1.0.3) */
  .fn-device { border-bottom: 1px solid var(--divider-color, #e0e0e0); padding-bottom: 4px; }
  .fn-device:last-child { border-bottom: none; }
  .fn-device > .row { border-bottom: none; }
  .fn-lines { margin: 0 0 4px 52px; }
  .fn-lines .settings-line { padding: 5px 0; }
  .ex-sw { display: inline-flex; align-items: center; gap: 8px; }
  .sw {
    position: relative; width: 38px; height: 20px; border-radius: 10px; border: none; padding: 0; cursor: pointer;
    background: var(--disabled-text-color, #9e9e9e); transition: background 0.15s ease; flex-shrink: 0;
  }
  .sw .knob {
    position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
    background: var(--card-background-color, #fff); transition: transform 0.15s ease; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
  .sw.on { background: var(--mmm-color-success); }
  .sw.on .knob { transform: translateX(18px); }
  .sw[disabled] { opacity: 0.5; cursor: default; }
  .sw:focus-visible { outline: 2px solid var(--mmm-color-tab-active); outline-offset: 2px; }
  .sw-label { min-width: 2.2em; text-align: left; font-weight: 500; }
  .nc-label { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
  .nc-label ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color, #727272); flex-shrink: 0; }
  .nc-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .ent-list { max-height: 260px; overflow-y: auto; }
  .ent { display: flex; flex-direction: column; min-width: 0; }
  .ent code { font-size: 0.9em; word-break: break-all; }
  .ent .muted { font-size: 0.78em; }
  .manual-copy {
    width: 100%; box-sizing: border-box; font: inherit; font-size: 0.85em; color: var(--primary-text-color, #212121);
    background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px; padding: 6px 8px;
  }
  .btn.confirm { background: var(--mmm-color-error); border-color: var(--mmm-color-error); color: #fff; }
  @media (prefers-reduced-motion: reduce) { .toast, .settings-accordion-summary::after, .sw, .sw .knob { transition: none; } }
`;

// Unterhalb ~480 px Kartenbreite wird auf reine Icons umgeschaltet (Tooltip via
// title="..."), statt Beschriftungen mitten im Wort abzuschneiden.
const TABS_CONTAINER_QUERY_STYLES = `
  @container mmm (max-width: 480px) {
    .tab span.lbl { display: none; }
    .tab ha-icon { --mdc-icon-size: 22px; }
    .row-extra .optional { display: none; }
  }
`;

// --- Hilfsfunktionen --------------------------------------------------------

function batteryIcon(b) {
  if (b === null || b === undefined) return "mdi:battery-unknown";
  if (b >= 95) return "mdi:battery";
  if (b < 5) return "mdi:battery-alert-variant-outline";
  return `mdi:battery-${Math.max(10, Math.round(b / 10) * 10)}`;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// ------------------------------------------------------------------ DOM-Abgleich (seit 1.2.0)
// Die Karte setzt ihr HTML nicht mehr komplett neu, sondern arbeitet nur die Unterschiede
// ein. So bleiben Scroll-Position, Fokus, geöffnete Auswahllisten und Gerätebilder bei jeder
// Meldung des Matter Servers erhalten (vorher sprang die Liste bei vielen Geräten nach oben).

// Eingabefelder, in die gerade getippt werden kann (Home-Assistant-Kurzbefehle dürfen dort nicht auslösen)
function isTypingTarget(el) {
  if (!el || el.nodeType !== 1) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (tag === "INPUT") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "image", "file"].includes(type);
  }
  return false;
}

// Schlüssel für Elemente, die beim Abgleich ihren Platz wechseln dürfen (Zeilen, Akkordeons)
function morphKey(node) {
  if (node.nodeType !== 1) return null;
  const d = node.dataset;
  if (!d) return null;
  if (node.tagName === "DETAILS" && d.k) return `d:${d.k}`;
  if (d.act === "open" && d.id && node.classList.contains("row")) return `r:${d.id}`;
  return null;
}

function morphAttrs(oldEl, newEl) {
  for (const a of Array.from(oldEl.attributes)) {
    if (!newEl.hasAttribute(a.name)) oldEl.removeAttribute(a.name);
  }
  for (const a of Array.from(newEl.attributes)) {
    if (oldEl.getAttribute(a.name) !== a.value) oldEl.setAttribute(a.name, a.value);
  }
}

function morphNode(oldN, newN, active) {
  if (oldN.nodeType !== 1) {
    if (oldN.nodeValue !== newN.nodeValue) oldN.nodeValue = newN.nodeValue;
    return;
  }
  morphAttrs(oldN, newN);
  const tag = oldN.tagName;
  if (tag === "TEXTAREA") {
    if (oldN !== active && oldN.value !== newN.value) oldN.value = newN.value;
    return;
  }
  morphChildren(oldN, newN, active);
  if (tag === "INPUT") {
    if (oldN !== active) {
      if (oldN.type === "checkbox" || oldN.type === "radio") {
        if (oldN.checked !== newN.checked) oldN.checked = newN.checked;
      } else if (oldN.value !== newN.value) {
        oldN.value = newN.value;
      }
    }
  } else if (tag === "SELECT" && oldN !== active) {
    if (oldN.value !== newN.value) oldN.value = newN.value;
  }
}

function morphChildren(oldP, newP, active) {
  const keyed = new Map();
  for (const k of Array.from(oldP.childNodes)) {
    const key = morphKey(k);
    if (key) keyed.set(key, keyed.has(key) ? null : k);
  }
  const kept = new Set();
  let ref = oldP.firstChild;
  for (const w of Array.from(newP.childNodes)) {
    const key = morphKey(w);
    let o = null;
    if (key) {
      o = keyed.get(key) || null;
      if (o) keyed.set(key, null);
    } else {
      let c = ref;
      while (c && (kept.has(c) || morphKey(c))) c = c.nextSibling;
      if (c && c.nodeType === w.nodeType && c.nodeName === w.nodeName) o = c;
    }
    if (o) {
      kept.add(o);
      if (o === ref) ref = ref.nextSibling;
      else oldP.insertBefore(o, ref);
      morphNode(o, w, active);
    } else {
      kept.add(w);
      oldP.insertBefore(w, ref);
    }
  }
  for (const k of Array.from(oldP.childNodes)) {
    if (!kept.has(k)) oldP.removeChild(k);
  }
}

// Setzt `html` als Inhalt von `target`, ändert aber nur, was sich unterscheidet.
function morphInto(target, html, active) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  morphChildren(target, tpl.content, active);
}

// Der Matter Server meldet ständig neue Werte (zuletzt gesehen, Signal): höchstens alle
// RENDER_MIN_MS neu zeichnen (das erste Ereignis sofort, das letzte folgt verzögert).
const RENDER_MIN_MS = 2000;

// Netzwerkkarte: Reihenfolge der Netze, Symbole und Zoom der Zeichnung (Faktor; 1 = Originalgröße)
const NET_KINDS = ["thread", "wifi", "ethernet"];
const NET_KIND_ICON = { thread: "mdi:hexagon-multiple-outline", wifi: "mdi:wifi", ethernet: "mdi:ethernet" };
const NET_ZOOM_MIN = 0.15, NET_ZOOM_MAX = 3, NET_ZOOM_KEY = "matter_manager_net_zoom";

// --- Karte ------------------------------------------------------------------

class MatterManagerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
    this._data = null;
    this._error = null;
    this._unsub = null;
    this._subscribing = false;
    // Reiner UI-Laufzeitstatus (geht bei Config-Änderung/Reload verloren)
    this._tab = "devices";
    this._filter = "all";
    this._sort = {};
    this._flt = {};
    this._groupBy = null;
    this._groupKeys = [];
    this._expanded = false;
    this._selected = null;
    this._drafts = {};
    this._open = {};
    this._details = {};
    this._share = {};
    this._ping = {};
    this._confirming = null;
    this._lastSig = null;
    this._popupSig = null;
    this._built = false;
    this._lastHtml = null;
    this._lastCss = null;
    this._lastZoom = null;
    this._lastRenderAt = 0;
    this._renderedWithData = false;
    this._renderTimer = null;
    // Funktionen: umgelegte Schalter, die noch auf die Bestätigung des Geräts warten
    this._fnPending = new Map();
    this._fnFilter = "all";
    // Gerätebilder, die nicht geladen werden konnten (dann nächster Kandidat bzw. Symbol)
    this._imgFailed = new Set();
    // Text, den der Browser nicht in die Zwischenablage lassen wollte (zum Markieren)
    this._manualCopy = null;
  }

  // ----------------------------------------------------------------- Lebenszyklus
  setConfig(config) {
    if (!config) throw new Error("matter-manager-card: Konfiguration fehlt.");
    this._config = withDefaults(config);
    const visible = this._visibleTabs();
    this._tab = visible.includes(this._config.default_tab) ? this._config.default_tab : visible[0] || "devices";
    this._filter = "all";
    this._sort = {};
    this._flt = {};
    this._groupBy = null;
    this._groupKeys = [];
    this._expanded = false;
    if (!this._built) this._build();
    this._lastSig = null;
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._subscribe();
      this._lastSig = null;
      this._render();
    }
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    if (this._hass && !this._unsub) this._subscribe();
  }

  disconnectedCallback() {
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
    clearTimeout(this._toastTimer);
    clearTimeout(this._confirmTimer);
    clearTimeout(this._imgTimer);
    clearTimeout(this._fnTimer);
    clearTimeout(this._renderTimer);
    this._renderTimer = null;
  }

  getCardSize() {
    return 8;
  }

  static getConfigElement() {
    return document.createElement("matter-manager-card-editor");
  }

  static getStubConfig() {
    return { ...CONFIG_DEFAULTS };
  }

  // ----------------------------------------------------------------- Texte
  get _lang() {
    return (this._hass?.language || "en").slice(0, 2);
  }

  _t(key, vars) {
    const table = I18N[this._lang] || I18N.en;
    let text = table[key] ?? I18N.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
    return text;
  }

  // ----------------------------------------------------------------- Verbindung
  async _subscribe() {
    if (this._subscribing || this._unsub || !this._hass) return;
    this._subscribing = true;
    try {
      const msg = { type: "matter_manager/subscribe" };
      if (this._config?.entry_id) msg.entry_id = this._config.entry_id;
      const unsub = await this._hass.connection.subscribeMessage((ev) => this._onEvent(ev), msg);
      if (!this.isConnected) unsub();
      else this._unsub = unsub;
      this._error = null;
    } catch (err) {
      this._error = err?.message || String(err);
      this._lastSig = null;
      this._render();
    } finally {
      this._subscribing = false;
    }
  }

  _onEvent(ev) {
    if (ev.kind === "update") {
      this._data = ev.data;
      this._fnSettle();
      this._renderIfChanged();
    } else if (ev.kind === "response") {
      this._onResponse(ev.data);
    }
  }

  _onResponse(r) {
    if (r.status === "error") {
      this._toast(r.error || this._t("error_generic"), true);
      if (r.topic === "function" && this._fnPending.size) {
        this._fnPending.clear();
        this._fnRedraw();
      }
      return;
    }
    const topic = r.topic || "";
    let msg = null;
    if (topic === "rename") {
      msg = this._t("done_renamed");
      this._reloadDetails();
    } else if (topic === "remove") msg = this._t("done_removed");
    else if (topic === "ota_update") msg = this._t("done_update");
    else if (topic === "ota_check") msg = r.data?.updateAvailable ? this._t("update_found") : this._t("no_update");
    else if (topic === "bind") msg = this._t("done_bound");
    else if (topic === "unbind") msg = this._t("done_unbound");
    else if (topic === "fabric_remove") msg = this._t("done_fabric");
    else if (topic === "open_window") {
      msg = this._t("done_window");
      if (r.data?.id) this._share[r.data.id] = { ...r.data, at: Date.now() };
      this._popupSig = null;
      this._renderPopup(true);
    } else if (topic === "commission") {
      msg = this._t("done_commission");
      delete this._drafts.commission_code;
      this._refresh();
    } else if (topic === "ping") {
      const id = this._selected;
      if (id && r.data) this._ping[id] = r.data;
      msg = this._t("ping_result", { n: r.data?.reachable ?? 0, m: r.data?.total ?? 0 });
      this._popupSig = null;
      this._renderPopup(true);
    } else if (topic === "interview") msg = this._t("done_interview");
    else if (topic === "fabric_label") msg = this._t("done_fabric_label");
    else if (topic === "reconnect") msg = this._t("done_reconnect");
    if (msg) this._toast(msg);
  }

  _toast(message, error = false) {
    const el = this.shadowRoot.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.className = "toast show" + (error ? " error" : "");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.className = "toast";
    }, 5000);
  }

  async _call(action, params = {}) {
    if (!this._hass) return false;
    const msg = { type: "matter_manager/action", action, ...params };
    if (this._config?.entry_id) msg.entry_id = this._config.entry_id;
    try {
      await this._hass.callWS(msg);
      return true;
    } catch (err) {
      this._toast(err?.message || String(err), true);
      return false;
    }
  }

  async _loadDetails(id, force = false) {
    if (!id || (!force && this._details[id])) return;
    this._details[id] = { loading: true };
    try {
      const msg = { type: "matter_manager/details", device: id };
      if (this._config?.entry_id) msg.entry_id = this._config.entry_id;
      this._details[id] = await this._hass.callWS(msg);
    } catch (err) {
      this._details[id] = { error: err?.message || String(err) };
    }
    this._renderPopup(true);
  }

  _reloadDetails() {
    if (this._selected) this._loadDetails(this._selected, true);
  }

  // ----------------------------------------------------------------- Konfiguration
  _visibleTabs() {
    const cfg = this._config || CONFIG_DEFAULTS;
    const tabs = TAB_ORDER.filter((tab) => cfg[`show_${tab}`] !== false);
    return tabs.length ? tabs : ["devices"];
  }

  get _readOnly() {
    return !!this._config?.read_only;
  }

  _colorVars() {
    const cfg = this._config || {};
    return Object.entries(COLOR_CONFIG_KEYS)
      .map(([key, { cssVar, fallback }]) => `${cssVar}: ${sanitizeColor(cfg[`color_${key}`]) || fallback};`)
      .join("\n        ");
  }

  _styles() {
    return `
      :host { ${this._colorVars()} display: block; }
      ${BASE_CARD_STYLES}
      ${TABS_CONTAINER_QUERY_STYLES}
      @media (max-width: 500px) {
        .card-content { padding: 4px 10px 10px; }
        .tab span.lbl { display: none; }
        .tab ha-icon { --mdc-icon-size: 24px; }
      }
    `;
  }

  _cardZoom() {
    const z = Number(this._config?.zoom);
    return Number.isFinite(z) && z >= 0.5 && z <= 3 ? z : 1;
  }

  // Symbolfarbe einer Zeile: color_row_icon > Kategorie-Farbe > Standard
  _rowIconColor(tab) {
    const cfg = this._config || {};
    const own = sanitizeColor(cfg.color_row_icon);
    if (own) return own;
    return sanitizeColor(cfg[CATEGORY_ICON_COLOR_KEYS[tab]]) || "";
  }

  // ----------------------------------------------------------------- Aufbau
  _build() {
    this._built = true;
    const root = this.shadowRoot;
    root.innerHTML = `
      <style id="base"></style>
      <div id="content"></div>
      <div class="popup-backdrop" id="backdrop" hidden><div class="popup" id="popup" role="dialog" aria-modal="true"></div></div>
      <div class="toast" id="toast" role="status"></div>`;
    this._styleEl = root.getElementById("base");
    this._contentEl = root.getElementById("content");

    // Ladefehler von Gerätebildern (error bubbelt nicht -> Capture): diese Adresse merken und
    // neu zeichnen; dann kommt der nächste Namenskandidat bzw. das Symbol
    root.addEventListener(
      "error",
      (e) => {
        const img = e.target;
        if (!img || img.tagName !== "IMG" || !img.classList.contains("dev-img")) return;
        this._imgFailed.add(img.getAttribute("src"));
        clearTimeout(this._imgTimer);
        this._imgTimer = setTimeout(() => {
          this._refresh();
          if (this._selected) this._renderPopup(true);
        }, 80);
      },
      true
    );

    this._bindNetZoomGestures(root);
    root.addEventListener("click", (e) => this._onClick(e));
    root.addEventListener("input", (e) => this._onInput(e));
    root.addEventListener("change", (e) => this._onChange(e));
    // Tippen in Eingabefeldern der Karte darf keine Tastenkürzel von Home Assistant auslösen
    // (z. B. „e“ = Entitätssuche, „c“ = Befehle, „d“ = Geräte, „a“ = Assist). Die Ereignisse
    // werden im Shadow-DOM auf das Host-Element umgeleitet, sodass Home Assistant das
    // Eingabefeld nicht erkennt. Darum hier stoppen, bevor sie nach außen gelangen.
    const keepTyping = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.composedPath?.()[0] ?? e.target)) e.stopPropagation();
    };
    root.addEventListener("keyup", keepTyping);
    root.addEventListener("keypress", keepTyping);
    root.addEventListener("keydown", (e) => {
      keepTyping(e);
      if (e.key === "Escape" && this._selected) this._closePopup();
      if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".row.clickable")) {
        e.preventDefault();
        e.target.click();
      }
    });
  }

  // ----------------------------------------------------------------- Rendern
  _signature() {
    return JSON.stringify([this._data, this._error, this._confirming, this._selected]);
  }

  _renderIfChanged() {
    const sig = this._signature();
    if (sig === this._lastSig) return;
    // Meldungen des Matter Servers kommen im Sekundentakt: höchstens alle RENDER_MIN_MS zeichnen
    // (das erste Ereignis sofort, das letzte folgt verzögert).
    const wait = RENDER_MIN_MS - (Date.now() - this._lastRenderAt);
    if (wait > 0 && this._renderedWithData) {
      if (!this._renderTimer) {
        this._renderTimer = setTimeout(() => {
          this._renderTimer = null;
          this._renderIfChanged();
        }, wait);
      }
      return;
    }
    this._lastSig = sig;
    this._render();
  }

  // Erzwingt Neuzeichnen (nach reinen UI-Zustandsänderungen)
  _refresh() {
    this._lastSig = null;
    this._render();
  }

  _captureFocus() {
    const el = this.shadowRoot.activeElement;
    if (!el || !el.dataset || !el.dataset.fk) return null;
    return { fk: el.dataset.fk, start: el.selectionStart, end: el.selectionEnd };
  }

  _restoreFocus(f) {
    if (!f) return;
    const el = this.shadowRoot.querySelector(`[data-fk="${CSS.escape(f.fk)}"]`);
    if (!el) return;
    // Hat das Feld den Fokus noch (der Abgleich fasst fokussierte Felder nicht an), nichts tun:
    // Ein erneutes focus() scrollt je nach Browser das Feld wieder ins Bild, die Liste sprang
    // dadurch bei jedem Neuzeichnen nach oben. Wurde das Feld ersetzt, den Fokus zurückgeben,
    // aber ohne Scrollen.
    if (this.shadowRoot.activeElement !== el) el.focus({ preventScroll: true });
    try {
      if (f.start !== null && f.start !== undefined && (el.selectionStart !== f.start || el.selectionEnd !== f.end)) {
        el.setSelectionRange(f.start, f.end);
      }
    } catch (_e) {
      /* nicht jedes Eingabefeld unterstützt Selektion */
    }
  }

  // Scroll-Container oberhalb der Karte (Fenster, Ansicht, Seitenleisten-Panel), auch über
  // Shadow-DOM-Grenzen hinweg. Wird vor dem Neuzeichnen gemerkt und danach zurückgesetzt, falls
  // etwas anderes (Browser, Home Assistant) die Position verschoben hat.
  _scrollSnapshot() {
    const out = [];
    try {
      let node = this;
      while (node) {
        if (node.nodeType === 1 && node.scrollTop > 0) out.push({ el: node, top: node.scrollTop, left: node.scrollLeft });
        node = node.assignedSlot || node.parentNode || node.host || null;
      }
      const root = document.scrollingElement;
      if (root && !out.some((x) => x.el === root) && root.scrollTop > 0) {
        out.push({ el: root, top: root.scrollTop, left: root.scrollLeft });
      }
    } catch (_e) {
      /* ohne Schutz weiterzeichnen */
    }
    return out;
  }

  _restoreScroll(snapshot) {
    for (const s of snapshot || []) {
      try {
        if (Math.abs(s.el.scrollTop - s.top) > 1) s.el.scrollTop = s.top;
        if (Math.abs(s.el.scrollLeft - s.left) > 1) s.el.scrollLeft = s.left;
      } catch (_e) {
        /* Element nicht mehr vorhanden */
      }
    }
  }

  // <details> merkt sich seinen Zustand selbst; wir speichern ihn nur, damit
  // er ein Neuzeichnen überlebt (kein _render() hier, sonst Endlosschleife).
  _bindDetails() {
    this.shadowRoot.querySelectorAll("details[data-k]").forEach((d) => {
      if (d._mmBound) return;
      d._mmBound = true;
      d.addEventListener("toggle", () => {
        this._open[d.dataset.k] = d.open;
      });
    });
  }

  _render() {
    if (!this._config || !this._built) return;
    const focus = this._captureFocus();
    const scrollSnap = this._scrollSnapshot();
    const visible = this._visibleTabs();
    if (!visible.includes(this._tab)) this._tab = visible[0];

    // Stylesheet und Zoom nur bei Änderung setzen (sonst wird das CSS jedes Mal neu geparst)
    const css = this._styles();
    if (css !== this._lastCss) {
      this._styleEl.textContent = css;
      this._lastCss = css;
    }
    const zoom = this._cardZoom();
    if (zoom !== this._lastZoom) {
      this._contentEl.style.zoom = zoom;
      this._lastZoom = zoom;
    }

    const title = String(this._config.title ?? "").trim();
    const headerAttr = this._config.show_title === false || !title ? "" : ` header="${esc(title)}"`;
    const html = `
      <ha-card${headerAttr}>
        <div class="card-content">
          ${this._renderBanners()}
          ${this._renderTabs(visible)}
          ${this._renderMain()}
        </div>
      </ha-card>`;

    this._lastRenderAt = Date.now();
    this._renderedWithData = Boolean(this._data);
    // Unverändertes HTML: DOM nicht anfassen. Sonst nur die Unterschiede einarbeiten, damit
    // Gerätebilder nicht neu geladen werden, nichts flackert und die Scroll-Position bleibt.
    if (html !== this._lastHtml || !this._contentEl.firstElementChild) {
      this._lastHtml = html;
      morphInto(this._contentEl, html, this.shadowRoot.activeElement);
    }
    this._bindDetails();
    this._restoreFocus(focus);
    this._restoreScroll(scrollSnap);
    this._renderPopup();
  }

  _isOpen(key, dflt = false) {
    return key in this._open ? this._open[key] : dflt;
  }

  // ----------------------------------------------------------------- Banner & Tabs
  _renderBanners() {
    const s = this._data?.server;
    const jobs = this._data?.jobs?.ota;
    const commission = this._data?.jobs?.commission;
    const out = [];
    const banner = (cls, icon, title, detail, action = "") =>
      `<div class="live-banner ${cls}"><ha-icon icon="${icon}"></ha-icon>
         <div class="live-banner-text"><span class="live-state">${esc(title)}</span>${
           detail ? `<span class="live-detail">${esc(detail)}</span>` : ""
         }</div>${action}</div>`;

    if (this._error) {
      out.push(banner("error", "mdi:alert-circle", this._t("bridge_error"), this._error));
    } else if (s?.online === false) {
      out.push(banner("error", "mdi:lan-disconnect", this._t("server_offline"), this._t("server_offline_hint")));
    }
    if (s && s.compatible === false) {
      out.push(
        banner("warn", "mdi:alert", this._t("server_incompatible"), this._t("server_incompatible_hint", { v: s.schema_version, min: s.min_schema_version }))
      );
    }
    if (commission?.running) {
      out.push(banner("", "mdi:link-plus", this._t("commission_running"), this._t("commission_running_hint")));
    }
    if (jobs?.running) {
      const label = jobs.kind === "update" ? this._t("job_update") : this._t("job_check");
      const detail = `${Math.min((jobs.done ?? 0) + 1, jobs.total ?? 1)}/${jobs.total ?? 1}${jobs.current ? ` · ${jobs.current}` : ""}`;
      const cancel = this._readOnly
        ? ""
        : `<button class="btn small" data-act="cancel_job">${esc(this._t("cancel"))}</button>`;
      out.push(banner("", "mdi:progress-clock", label, detail, cancel));
    }
    return out.join("");
  }

  _tabCount(tab) {
    const s = this._data?.stats;
    if (!s) return null;
    if (tab === "devices" && s.offline > 0) return { n: s.offline, cls: "" };
    if (tab === "battery" && s.low_battery > 0) return { n: s.low_battery, cls: "warn" };
    if (tab === "updates" && s.updates_available > 0) return { n: s.updates_available, cls: "info" };
    if (tab === "bridge" && this._data?.app?.update_available) return { n: "↑", cls: "warn" };
    return null;
  }

  _renderTabs(visible) {
    if (visible.length <= 1) return "";
    const cfg = this._config;
    return `<div class="tabs" role="tablist">${visible
      .map((tab) => {
        const meta = TAB_META[tab];
        const label = this._t(meta.label);
        const color = sanitizeColor(cfg[CATEGORY_ICON_COLOR_KEYS[tab]]);
        const iconStyle = color ? ` style="color: ${color};"` : "";
        const count = this._tabCount(tab);
        return `<button class="tab ${tab === this._tab ? "active" : ""}" role="tab" aria-selected="${tab === this._tab}"
            data-act="tab" data-tab="${tab}" title="${esc(label)}">
          <ha-icon icon="${meta.icon}"${iconStyle}></ha-icon>
          <span class="lbl">${esc(label)}</span>
          ${count ? `<span class="count ${count.cls}">${count.n}</span>` : ""}
        </button>`;
      })
      .join("")}</div>`;
  }

  _renderMain() {
    if (!this._data && !this._error) return `<div class="empty">${esc(this._t("connecting"))}</div>`;
    if (!this._data) return "";
    switch (this._tab) {
      case "functions":
        return this._renderFunctions();
      case "fabrics":
        return this._renderFabrics();
      case "bindings":
        return this._renderBindings();
      case "network":
        return this._renderNetworkTab();
      case "bridge":
        return this._renderBridge();
      default:
        return this._renderDeviceTab(this._tab);
    }
  }

  // ----------------------------------------------------------------- Geräte-Tabs
  get _search() {
    return (this._drafts.search || "").trim().toLowerCase();
  }

  _sortKey(tab) {
    if (this._sort[tab]) return this._sort[tab];
    if (tab === "devices") {
      const d = this._config.default_sort;
      return SORT_OPTIONS.some((o) => o.value === d) ? d : DEFAULT_SORT;
    }
    return TAB_DEFAULT_SORT[tab] || DEFAULT_SORT;
  }

  _sortValue(d, key) {
    switch (key) {
      case "name_asc":
      case "name_desc":
        return (d.name || "").toLowerCase();
      case "battery_asc":
        return d.battery;
      case "signal_asc":
        return d.signal;
      case "last_seen_asc":
      case "last_seen_desc":
        return d.last_seen ? Date.parse(d.last_seen) || null : null;
      case "ota":
        return OTA_ORDER[d.ota.state] ?? 9;
      default:
        return null;
    }
  }

  _devices(tab) {
    let list = [...(this._data?.devices ?? [])];
    if (tab === "battery") list = list.filter((d) => d.battery !== null && d.battery !== undefined);
    else if (tab === "updates") list = list.filter((d) => d.ota.capable && !d.bridged);
    else if (tab === "bindings") list = list.filter((d) => d.bindings.length);

    if (tab === "devices") {
      if (this._filter === "offline") list = list.filter((d) => d.available === false);
      else if (this._filter === "low") list = list.filter((d) => d.battery_state === "low" || d.battery_state === "critical");
      else if (this._filter === "updates") list = list.filter((d) => d.ota.state === "available");
      else if (this._filter === "thread" || this._filter === "wifi") list = list.filter((d) => !d.bridged && d.network === this._filter);
    }

    if (FILTER_TABS.includes(tab)) list = this._applyFilters(list);

    const q = this._search;
    if (q) {
      list = list.filter((d) =>
        [d.name, d.vendor, d.model, d.description, d.node_id, d.bridge, d.comment].some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }

    const key = this._sortKey(tab);
    const dir = key.endsWith("_desc") ? -1 : 1;
    return list.sort((a, b) => {
      const x = this._sortValue(a, key);
      const y = this._sortValue(b, key);
      if ((x === null || x === undefined) && (y === null || y === undefined)) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }

  _renderStats() {
    const s = this._data.stats;
    if (!this._config.show_stats) return "";
    const chip = (id, n, label, color) =>
      `<button class="chip ${this._filter === id ? "on" : ""}" data-act="chip" data-chip="${id}"
         style="--c:${n > 0 && color ? color : "var(--primary-text-color, #212121)"}"><b>${n}</b>${esc(label)}</button>`;
    return `<div class="chips">
      ${chip("all", s.total, this._t("chip_devices"), "")}
      ${chip("offline", s.offline, this._t("chip_offline"), "var(--mmm-color-error)")}
      ${chip("low", s.low_battery, this._t("chip_low_battery"), "var(--mmm-color-warning)")}
      ${chip("updates", s.updates_available, this._t("chip_updates"), "var(--mmm-color-info)")}
      ${s.thread ? chip("thread", s.thread, this._t("chip_thread"), "var(--mmm-color-tab-active)") : ""}
      ${s.wifi ? chip("wifi", s.wifi, this._t("chip_wifi"), "var(--mmm-color-tab-active)") : ""}
    </div>`;
  }

  _modelKey(d) {
    return d.model ? `${d.vendor || ""}||${d.model}` : "";
  }

  _modelLabel(d) {
    return d.model ? (d.vendor ? `${d.vendor} ${d.model}` : d.model) : this._t("group_unknown");
  }

  _applyFilters(list) {
    const flt = this._flt || {};
    const active = FILTER_KEYS.filter((k) => flt[k]);
    if (!active.length) return list;
    const now = Date.now();
    return list.filter((d) =>
      active.every((k) => {
        const v = flt[k];
        switch (k) {
          case "status":
            return v === "online" ? d.available === true : d.available === false;
          case "power": {
            const bat =
              (d.battery !== null && d.battery !== undefined) ||
              d.battery_present === true ||
              (Boolean(d.battery_state) && d.battery_state !== "unknown");
            if (v === "battery") return bat;
            if (v === "mains") return !bat;
            return d.battery_state === "low" || d.battery_state === "critical";
          }
          case "signal": {
            const q = d.signal;
            if (q === null || q === undefined) return false;
            return v === "good" ? q >= -70 : v === "mid" ? q >= -85 && q < -70 : q < -85;
          }
          case "network":
            if (v === "bridge") return Boolean(d.is_bridge);
            if (v === "bridged") return Boolean(d.bridged);
            return !d.bridged && d.network === v;
          case "firmware":
            return d.ota?.state === "available";
          case "seen": {
            const ts = d.last_seen ? Date.parse(d.last_seen) : NaN;
            const limit = (v === "24h" ? 24 : 24 * 7) * 3600 * 1000;
            return Number.isNaN(ts) || now - ts > limit;
          }
          case "fabrics":
            return v === "multi" ? (d.fabrics_count || 0) > 1 : d.fabrics_count === 1;
          case "vendor":
            return v === UNKNOWN_VENDOR ? !d.vendor : d.vendor === v;
          case "model":
            return v === UNKNOWN_VENDOR ? !d.model : this._modelKey(d) === v;
          case "class":
            return (d.device_class || "other") === v;
          default:
            return true;
        }
      })
    );
  }

  _groupMode() {
    const g = this._groupBy ?? this._config.default_group_by;
    return GROUP_BY_OPTIONS.some((o) => o.value === g) ? g : "none";
  }

  _fltOptionLabel(key, value) {
    if (value === UNKNOWN_VENDOR) return this._t("group_unknown");
    if (key === "vendor") return value;
    if (key === "model") {
      const d = (this._data?.devices || []).find((x) => this._modelKey(x) === value);
      return d ? this._modelLabel(d) : value;
    }
    if (key === "class") return this._t(`cls_${value}`);
    const field = FILTER_FIELDS.find((f) => f.key === key);
    const opt = field?.options.find(([v]) => v === value);
    return opt ? this._t(opt[1]) : value;
  }

  _fltLabelKey(k) {
    return k === "vendor" ? "flt_vendor" : k === "model" ? "flt_model" : k === "class" ? "flt_class" : FILTER_FIELDS.find((f) => f.key === k).label;
  }

  _renderFilterPanel(tab) {
    if (!this._config.show_filters || !FILTER_TABS.includes(tab)) return "";
    const t = (k, v) => this._t(k, v);
    const active = FILTER_KEYS.filter((k) => this._flt[k]);
    const devices = this._data.devices;
    const select = (key, label, options) => `<label class="flt-field"><span>${esc(label)}</span>
        <select data-change="flt" data-flt="${key}" data-fk="flt:${key}"><option value="">${esc(t("flt_all"))}</option>${options
          .map(([v, l]) => `<option value="${esc(v)}" ${this._flt[key] === v ? "selected" : ""}>${esc(l)}</option>`)
          .join("")}</select></label>`;

    const vendors = [...new Set(devices.map((d) => d.vendor).filter(Boolean))].sort((a, b) => a.localeCompare(b, this._lang));
    const vendorOptions = vendors.map((v) => [v, v]);
    if (devices.some((d) => !d.vendor)) vendorOptions.push([UNKNOWN_VENDOR, t("group_unknown")]);

    const models = new Map();
    for (const d of devices) if (d.model && !models.has(this._modelKey(d))) models.set(this._modelKey(d), this._modelLabel(d));
    const modelOptions = [...models.entries()].sort((a, b) => a[1].localeCompare(b[1], this._lang));
    if (devices.some((d) => !d.model)) modelOptions.push([UNKNOWN_VENDOR, t("group_unknown")]);

    const classOptions = DEVICE_CLASSES.filter((c) => devices.some((d) => (d.device_class || "other") === c)).map((c) => [c, t(`cls_${c}`)]);

    const fields = [
      ...FILTER_FIELDS.map((f) => select(f.key, t(f.label), f.options.map(([v, l]) => [v, t(l)]))),
      select("vendor", t("flt_vendor"), vendorOptions),
      select("model", t("flt_model"), modelOptions),
      select("class", t("flt_class"), classOptions),
    ].join("");
    const body = `<div class="flt-grid">${fields}</div>
      <div class="hint">${esc(t("flt_hint"))}</div>
      <div class="toolbar"><button class="btn small" data-act="flt_reset" ${active.length ? "" : "disabled"}>${esc(t("filter_reset"))}</button></div>`;
    return `<div class="filters-wrap">${this._accordion("f:filters", "mdi:filter-variant", t("filters"), body, {
      meta: active.length ? t("filter_active", { n: active.length }) : "",
    })}</div>`;
  }

  // Aktive Filter als kleine Chips (Tippen entfernt den Filter), auch bei eingeklapptem Filter-Bereich
  _renderActiveFilters(tab) {
    if (!this._config.show_filters || !FILTER_TABS.includes(tab)) return "";
    const active = FILTER_KEYS.filter((k) => this._flt[k]);
    if (!active.length) return "";
    const t = (k) => this._t(k);
    return `<div class="chips fchips">${active
      .map(
        (k) =>
          `<button class="chip on" data-act="flt_clear" data-flt="${k}" title="${esc(t("filter_remove"))}">${esc(t(this._fltLabelKey(k)))}: ${esc(
            this._fltOptionLabel(k, this._flt[k])
          )}<ha-icon icon="mdi:close"></ha-icon></button>`
      )
      .join("")}</div>`;
  }

  _renderFilterBar(tab, withSort = true) {
    const cfg = this._config;
    const canGroup = Boolean(cfg.show_group_by) && withSort && FILTER_TABS.includes(tab);
    if (!cfg.show_search && !(cfg.show_filter_bar && withSort) && !canGroup) return "";
    const search = cfg.show_search
      ? `<label class="filter-bar-field grow"><ha-icon icon="mdi:magnify" style="--mdc-icon-size:18px"></ha-icon>
           <input type="search" data-draft="search" data-fk="search" data-rerender="1"
             autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search"
             placeholder="${esc(this._t("search"))}" value="${esc(this._drafts.search || "")}" /></label>`
      : "";
    const sort = cfg.show_filter_bar && withSort
      ? `<label class="filter-bar-field">${esc(this._t("sort"))}
           <select data-change="sort" data-tab="${tab}" data-fk="sort">${SORT_OPTIONS.map(
             (o) => `<option value="${o.value}" ${o.value === this._sortKey(tab) ? "selected" : ""}>${esc(this._t(o.label))}</option>`
           ).join("")}</select></label>`
      : "";
    const mode = this._groupMode();
    const group = canGroup
      ? `<label class="filter-bar-field">${esc(this._t("group_by"))}
           <select data-change="group_by" data-fk="group_by">${GROUP_BY_OPTIONS.map(
             (o) => `<option value="${o.value}" ${o.value === mode ? "selected" : ""}>${esc(this._t(o.label))}</option>`
           ).join("")}</select></label>`
      : "";
    const expand =
      canGroup && mode !== "none"
        ? `<span class="filter-bar-field"><button class="btn icon" data-act="grp_all" data-value="1" title="${esc(this._t("expand_all"))}" aria-label="${esc(this._t("expand_all"))}"><ha-icon icon="mdi:unfold-more-horizontal"></ha-icon></button>
             <button class="btn icon" data-act="grp_all" data-value="0" title="${esc(this._t("collapse_all"))}" aria-label="${esc(this._t("collapse_all"))}"><ha-icon icon="mdi:unfold-less-horizontal"></ha-icon></button></span>`
        : "";
    return `<div class="filter-bar">${search}${sort}${group}${expand}</div>`;
  }

  _relTime(iso) {
    if (!iso) return this._t("never");
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return esc(iso);
    const diff = (ts - Date.now()) / 1000;
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat(this._lang, { numeric: "auto" });
    if (abs < 60) return rtf.format(Math.round(diff), "second");
    if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
    return rtf.format(Math.round(diff / 86400), "day");
  }

  _batteryColor(b) {
    const s = this._data?.stats;
    if (b < (s?.critical_battery_threshold ?? 10)) return "var(--mmm-color-error)";
    if (b < (s?.low_battery_threshold ?? 20)) return "var(--mmm-color-warning)";
    return "var(--mmm-color-success)";
  }

  // Signalstärke in dBm (je näher an 0, desto besser)
  _signalColor(dbm) {
    if (dbm < -85) return "var(--mmm-color-error)";
    if (dbm < -70) return "var(--mmm-color-warning)";
    return "var(--mmm-color-success)";
  }

  _batteryBar(b) {
    const v = clamp(b, 0, 100);
    return `<span class="bar"><span style="width:${v}%;background:${this._batteryColor(v)}"></span></span>${Math.round(v)} %`;
  }

  // Batterie-Anzeige: Prozent, sonst Ladezustand (OK/Warnung/Kritisch) als Pill
  _batteryValue(d) {
    if (d.battery !== null && d.battery !== undefined) return this._batteryBar(d.battery);
    const state = d.battery_state;
    if (!state || state === "unknown") return "";
    const color = { ok: "success", low: "warning", critical: "error" }[state] || "success";
    const label = { ok: "battery_ok", low: "battery_warning", critical: "battery_critical" }[state] || "battery_ok";
    return `<span class="pill" style="--c:var(--mmm-color-${color})">${esc(this._t(label))}</span>`;
  }

  _otaPill(ota) {
    const label =
      { available: "ota_available", updating: "ota_updating", scheduled: "ota_scheduled", idle: "ota_idle" }[ota.state] ||
      "ota_unknown";
    const color = {
      available: "var(--mmm-color-info)",
      updating: "var(--mmm-color-warning)",
      scheduled: "var(--mmm-color-warning)",
      idle: "var(--mmm-color-success)",
    }[ota.state];
    const extra = ota.state === "updating" && ota.progress !== null && ota.progress !== undefined ? ` ${Math.round(ota.progress)} %` : "";
    return `<span class="pill" ${color ? `style="--c:${color}"` : ""}>${esc(this._t(label))}${extra}</span>`;
  }

  _deviceIcon(d, tab) {
    if (tab === "battery") return batteryIcon(d.battery);
    if (tab === "updates") {
      return { available: "mdi:update", updating: "mdi:progress-upload", scheduled: "mdi:clock-outline" }[d.ota.state] || "mdi:check-circle-outline";
    }
    return d.icon || DEVICE_ICON[d.type] || DEFAULT_DEVICE_ICON;
  }

  // Kleines Gerätebild (leer, wenn abgeschaltet oder kein Kandidat mehr übrig)
  _deviceImage(d, cls = "dev-img") {
    if (this._config.show_images === false) return "";
    const url = deviceImageUrls(d, this._config).find((u) => !this._imgFailed.has(u));
    if (!url) return "";
    return `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
  }

  _statusDot(d) {
    let cls = "";
    let tip = this._t("status_unknown");
    if (d.available === true) {
      cls = "on";
      tip = this._t("status_online");
    } else if (d.available === false) {
      cls = "off";
      tip = this._t("status_offline");
    }
    return `<span class="dot ${cls}" title="${esc(tip)}"></span>`;
  }

  _deviceRow(d, tab) {
    const cfg = this._config;
    const color = this._rowIconColor(tab);
    const iconStyle = color ? ` style="color: ${color};"` : "";
    const dot = tab === "devices" || tab === "bindings" || tab === "functions" ? this._statusDot(d) : "";
    const img = this._deviceImage(d);

    let secondary = "";
    let extra = "";
    if (tab === "battery") {
      secondary = [d.voltage !== null && d.voltage !== undefined ? `${d.voltage} mV` : "", d.model || ""].filter(Boolean).map((v) => `<span>${esc(v)}</span>`).join("");
      extra = `<span>${this._batteryValue(d)}</span><span class="optional">${esc(this._relTime(d.last_seen))}</span>`;
    } else if (tab === "updates") {
      secondary = `<span>${esc(d.sw_version ?? "–")} → ${esc(d.ota.latest ?? "–")}</span>`;
      const install =
        d.ota.state === "available" && !this._readOnly
          ? `<button class="btn small" data-act="ota_update" data-confirm="ota_update:${esc(d.id)}" data-id="${esc(d.id)}">${esc(this._confirmLabel(`ota_update:${d.id}`, this._t("install")))}</button>`
          : "";
      extra = `<span>${this._otaPill(d.ota)}</span>${install}`;
    } else {
      secondary = [
        cfg.show_model ? d.model : "",
        cfg.show_vendor ? d.vendor : "",
        d.bridged && d.bridge ? `${this._t("f_bridge")}: ${d.bridge}` : "",
        cfg.show_node_id ? `#${d.node_id}${d.endpoint !== null && d.endpoint !== undefined ? `/${d.endpoint}` : ""}` : "",
      ].filter(Boolean).map((v) => `<span>${esc(v)}</span>`).join("");
      const sig =
        cfg.show_signal && d.signal !== null && d.signal !== undefined
          ? `<span class="pill" style="--c:${this._signalColor(d.signal)}" title="${esc(this._t("f_signal"))}">${esc(d.signal)} dBm</span>`
          : "";
      const bat = cfg.show_battery_value ? `<span>${this._batteryValue(d)}</span>` : "";
      const seen = cfg.show_last_seen ? `<span class="optional">${esc(this._relTime(d.last_seen))}</span>` : "";
      extra = `${sig}${bat}${seen}`;
    }

    const badges = [
      d.available === false ? `<span class="badge" style="--c:var(--mmm-color-error)">${esc(this._t("offline"))}</span>` : "",
      d.is_bridge ? `<span class="badge">${esc(this._t("type_Bridge"))}</span>` : "",
    ].join("");

    return `<div class="row clickable" tabindex="0" role="button" data-act="open" data-id="${esc(d.id)}">
      <span class="row-icon${img ? " has-image" : ""}"${iconStyle}>${img}<ha-icon icon="${esc(this._deviceIcon(d, tab))}"${img ? " hidden" : ""}></ha-icon>${dot}</span>
      <div class="row-main">
        <div class="row-primary"><span class="row-name">${esc(d.name)}</span>${badges}</div>
        <div class="row-secondary">${secondary}</div>
      </div>
      <div class="row-extra">${extra}</div>
    </div>`;
  }

  _limited(list) {
    const max = Number(this._config.max_rows) || 0;
    if (!max || this._expanded || list.length <= max) return { shown: list, hidden: 0 };
    return { shown: list.slice(0, max), hidden: list.length - max };
  }

  _renderRowList(tab, list) {
    if (!list.length) {
      return `<div class="empty">${esc(this._data.devices.length ? this._t("no_results") : this._t("no_data"))}</div>`;
    }
    const mode = FILTER_TABS.includes(tab) ? this._groupMode() : "none";
    if (mode !== "none") return this._renderGrouped(tab, list, mode);
    const { shown, hidden } = this._limited(list);
    return `<div class="rows">${shown.map((d) => this._deviceRow(d, tab)).join("")}</div>${
      hidden
        ? `<div class="more"><button class="btn" data-act="more">${esc(this._t("show_more", { n: hidden }))}</button></div>`
        : ""
    }`;
  }

  // Gruppierte Liste: je Hersteller, Gerätename bzw. Geräteklasse ein Akkordeon (max_rows gilt hier nicht)
  _renderGrouped(tab, list, mode) {
    const buckets = new Map();
    for (const d of list) {
      const k = mode === "vendor" ? d.vendor || "" : mode === "model" ? this._modelKey(d) : d.device_class || "other";
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(d);
    }
    const keys = [...buckets.keys()];
    if (mode === "class") {
      const rank = (c) => (DEVICE_CLASSES.includes(c) ? DEVICE_CLASSES.indexOf(c) : DEVICE_CLASSES.length);
      keys.sort((a, b) => rank(a) - rank(b));
    } else {
      const label = (k) => (mode === "model" ? this._modelLabel(buckets.get(k)[0]) : k);
      keys.sort((a, b) => (a === "" ? 1 : b === "" ? -1 : label(a).localeCompare(label(b), this._lang)));
    }
    const openByDefault = keys.length <= 3 || Boolean(this._search);
    this._groupKeys = [];
    const html = keys
      .map((k) => {
        const items = buckets.get(k);
        const off = items.filter((d) => d.available === false).length;
        const meta = off ? `${items.length} · ${off} ${this._t("offline")}` : String(items.length);
        const label =
          mode === "vendor" ? k || this._t("group_unknown") : mode === "model" ? this._modelLabel(items[0]) : this._t(`cls_${k}`);
        const icon = mode === "vendor" ? "mdi:factory" : mode === "model" ? items[0].icon || DEFAULT_DEVICE_ICON : CLASS_ICON[k] || CLASS_ICON.other;
        const key = `g:${tab}:${mode}:${k}`;
        this._groupKeys.push(key);
        return this._accordion(key, icon, label, `<div class="rows">${items.map((d) => this._deviceRow(d, tab)).join("")}</div>`, {
          meta,
          open: openByDefault,
        });
      })
      .join("");
    return `<div class="group-list">${html}</div>`;
  }

  _renderDeviceTab(tab) {
    let toolbar = "";
    if (tab === "devices" && !this._readOnly && this._config.show_pairing) {
      toolbar = `<div class="toolbar"><span class="spacer"></span>
        <button class="btn" data-act="goto_commission"><ha-icon icon="mdi:plus"></ha-icon>${esc(this._t("pairing_start"))}</button></div>`;
    }
    if (tab === "updates") {
      const s = this._data.stats;
      const running = !!this._data.jobs?.ota?.running;
      toolbar = this._readOnly
        ? ""
        : `<div class="toolbar">
            <button class="btn" data-act="check_all" ${running ? "disabled" : ""}><ha-icon icon="mdi:magnify-scan"></ha-icon>${esc(this._t("check_all"))}</button>
            <button class="btn primary" data-act="update_all" data-confirm="update_all" ${running || !s.updates_available ? "disabled" : ""}><ha-icon icon="mdi:cloud-download"></ha-icon>${esc(this._confirmLabel("update_all", this._t("update_all", { n: s.updates_available })))}</button>
          </div>
          <div class="hint">${esc(this._t("update_all_hint"))}</div>`;
    }
    return `${tab === "devices" ? this._renderStats() : ""}${toolbar}${this._renderFilterBar(tab)}${this._renderFilterPanel(tab)}${this._renderActiveFilters(tab)}${this._renderRowList(tab, this._devices(tab))}`;
  }

  // ----------------------------------------------------------------- Netzwerk (seit 1.2.0)
  _deviceById(id) {
    return (this._data?.devices || []).find((d) => d.id === String(id)) || null;
  }

  _renderNetworkTab() {
    const t = (k, v) => this._t(k, v);
    const net = this._data?.network || {};
    const kinds = NET_KINDS.filter((k) => net[k]?.hubs?.length);
    if (!kinds.length) return `<div class="settings-view nm-view"><div class="hint">${esc(t("nw_none"))}</div></div>`;
    const sections = kinds.map((k) => this._networkSection(k, net[k]));
    return `<div class="settings-view nm-view">${this._networkZoomBar()}${sections.join("")}
      <div class="hint">${esc(t("nw_intro"))}</div></div>`;
  }

  _networkSection(kind, topo) {
    const t = (k, v) => this._t(k, v);
    const summary = t(`nw_summary_${kind}`, { routers: topo.routers, external: topo.external, clients: topo.clients });
    const body = `${this._networkSvg(kind, topo)}
      ${topo.external ? `<div class="hint">${esc(t("nw_ext_hint"))}</div>` : ""}
      ${this._networkLists(kind, topo)}`;
    return this._accordion(`nw:${kind}`, NET_KIND_ICON[kind], t(`nw_title_${kind}`), body, { meta: summary, open: true });
  }

  _hubName(h) {
    const t = (k, v) => this._t(k, v);
    switch (h.type) {
      case "external":
        return t("nw_external", { id: String(h.ext || "").slice(-4).toUpperCase() });
      case "ap":
        return h.bssid ? t("nw_ap_named", { id: h.bssid }) : t("nw_ap_unknown");
      case "lan":
        return t("nw_lan");
      default:
        return h.name || t("nw_router");
    }
  }

  _hubSub(h) {
    const t = (k, v) => this._t(k, v);
    const n = h.clients.length;
    const count = n === 1 ? t("nw_cloud_one") : t("nw_cloud", { n });
    if (h.type === "ap") return [h.channel ? t("nw_channel", { n: h.channel }) : "", count].filter(Boolean).join(" · ");
    if (h.type === "lan") return count;
    return `${t(h.type === "leader" ? "nw_leader" : "nw_router")}${n ? ` · ${n}` : ""}`;
  }

  _hubIcon(h) {
    if (h.type === "leader") return "mdi:access-point-network";
    if (h.type === "external") return "mdi:router-network";
    if (h.type === "ap") return "mdi:wifi";
    if (h.type === "lan") return "mdi:ethernet";
    return h.available === false ? "mdi:router-network-wireless" : "mdi:router-wireless";
  }

  // --- Zoom der Zeichnung: Zoombalken, Knöpfe, Mausrad (Strg) und Zwei-Finger-Geste ---
  _netZoomValue() {
    if (this._netZoom === undefined) {
      let z = 1;
      try {
        const stored = parseFloat(window.localStorage.getItem(NET_ZOOM_KEY));
        if (Number.isFinite(stored)) z = stored;
      } catch (_e) {
        /* Speicher nicht verfügbar */
      }
      this._netZoom = clamp(z, NET_ZOOM_MIN, NET_ZOOM_MAX);
    }
    return this._netZoom;
  }

  _networkZoomBar() {
    const t = (k, v) => this._t(k, v);
    const z = this._netZoomValue();
    return `<div class="nm-zoom" role="group" aria-label="${esc(t("nw_zoom_label"))}">
      <button class="btn small" data-act="net_zoom_out" title="${esc(t("nw_zoom_out"))}" aria-label="${esc(t("nw_zoom_out"))}"><ha-icon icon="mdi:magnify-minus-outline"></ha-icon></button>
      <input type="range" data-nmzoom min="${Math.round(NET_ZOOM_MIN * 100)}" max="${Math.round(NET_ZOOM_MAX * 100)}" step="5" value="${Math.round(z * 100)}" aria-label="${esc(t("nw_zoom_label"))}">
      <button class="btn small" data-act="net_zoom_in" title="${esc(t("nw_zoom_in"))}" aria-label="${esc(t("nw_zoom_in"))}"><ha-icon icon="mdi:magnify-plus-outline"></ha-icon></button>
      <span class="nm-zoomval" data-nmzoomval>${Math.round(z * 100)} %</span>
      <button class="btn small" data-act="net_zoom_fit" title="${esc(t("nw_zoom_fit"))}"><ha-icon icon="mdi:fit-to-page-outline"></ha-icon>${esc(t("nw_zoom_fit"))}</button>
      <button class="btn small" data-act="net_zoom_reset" title="${esc(t("nw_zoom_reset"))}">100 %</button>
    </div><div class="hint nm-zoomhint">${esc(t("nw_zoom_hint"))}</div>`;
  }

  // Zoom setzen, ohne neu zu zeichnen (Bedienung bleibt flüssig). anchorX/anchorY = Bildschirmposition,
  // die beim Zoomen an derselben Stelle bleiben soll (innerhalb der Zeichnung unter dem Zeiger).
  _setNetZoom(value, anchorX, anchorY, anchorWrap) {
    const z = clamp(Number(value) || 1, NET_ZOOM_MIN, NET_ZOOM_MAX);
    const root = this.shadowRoot;
    const old = this._netZoomValue();
    this._netZoom = z;
    const wrap0 = anchorWrap || root.querySelector(".nm-wrap");
    let focus = null;
    if (wrap0) {
      const rect = wrap0.getBoundingClientRect();
      const ax = anchorX === undefined ? rect.left + wrap0.clientWidth / 2 : anchorX;
      const ay = anchorY === undefined ? rect.top + wrap0.clientHeight / 2 : anchorY;
      focus = {
        off: ax - rect.left,
        content: (wrap0.scrollLeft + ax - rect.left) / old,
        offY: ay - rect.top,
        contentY: (wrap0.scrollTop + ay - rect.top) / old,
      };
    }
    root.querySelectorAll(".nm-svg").forEach((svg) => {
      svg.style.width = `${Math.round(svg.viewBox.baseVal.width * z)}px`;
    });
    if (wrap0 && focus) {
      wrap0.scrollLeft = Math.max(0, focus.content * z - focus.off);
      wrap0.scrollTop = Math.max(0, focus.contentY * z - focus.offY);
    }
    const slider = root.querySelector("[data-nmzoom]");
    if (slider) slider.value = String(Math.round(z * 100));
    const label = root.querySelector("[data-nmzoomval]");
    if (label) label.textContent = `${Math.round(z * 100)} %`;
    try {
      window.localStorage.setItem(NET_ZOOM_KEY, String(z));
    } catch (_e) {
      /* Speicher nicht verfügbar */
    }
  }

  _netZoomFit() {
    const root = this.shadowRoot;
    const wrap = root.querySelector(".nm-wrap");
    if (!wrap) return;
    const widest = Math.max(...Array.from(root.querySelectorAll(".nm-svg")).map((s) => s.viewBox.baseVal.width));
    if (!(widest > 0)) return;
    this._setNetZoom((wrap.clientWidth - 6) / widest, wrap.getBoundingClientRect().left, undefined, wrap);
    root.querySelectorAll(".nm-wrap").forEach((w) => {
      w.scrollLeft = 0;
      w.scrollTop = 0;
    });
  }

  // Zwei-Finger-Geste (Smartphone), Strg + Mausrad und Ziehen mit der Maus auf der Zeichnung
  _bindNetZoomGestures(root) {
    let pinch = null;
    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    root.addEventListener(
      "touchstart",
      (e) => {
        const wrap = e.target.closest?.(".nm-wrap");
        if (e.touches.length !== 2 || !wrap) return;
        pinch = { d0: dist(e.touches[0], e.touches[1]), z0: this._netZoomValue(), wrap };
      },
      { passive: true }
    );
    root.addEventListener(
      "touchmove",
      (e) => {
        if (!pinch || e.touches.length !== 2) return;
        e.preventDefault();
        const d = dist(e.touches[0], e.touches[1]);
        if (pinch.d0 > 0) {
          this._setNetZoom(
            pinch.z0 * (d / pinch.d0),
            (e.touches[0].clientX + e.touches[1].clientX) / 2,
            (e.touches[0].clientY + e.touches[1].clientY) / 2,
            pinch.wrap
          );
        }
      },
      { passive: false }
    );
    const end = (e) => {
      if (pinch && e.touches.length < 2) pinch = null;
    };
    root.addEventListener("touchend", end, { passive: true });
    root.addEventListener("touchcancel", end, { passive: true });
    root.addEventListener(
      "wheel",
      (e) => {
        const wrap = e.target.closest?.(".nm-wrap");
        if (!(e.ctrlKey || e.metaKey) || !wrap) return;
        e.preventDefault();
        this._setNetZoom(this._netZoomValue() * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY, wrap);
      },
      { passive: false }
    );

    // Mit gedrückter linker Maustaste die Zeichnung verschieben (nur Maus; Touch scrollt nativ).
    // Erst ab 4 px Bewegung gilt es als Ziehen, ein einfacher Klick auf einen Router öffnet weiter
    // das Popup. Nach dem Ziehen wird der Klick unterdrückt.
    let drag = null;
    const endDrag = (e) => {
      if (!drag || (e && e.pointerId !== undefined && e.pointerId !== drag.id)) return;
      if (drag.moved) {
        this._netDragEndedAt = Date.now();
        drag.wrap.classList.remove("nm-dragging");
        try {
          drag.wrap.releasePointerCapture(drag.id);
        } catch (_e) {
          /* schon freigegeben */
        }
      }
      drag = null;
    };
    root.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const wrap = e.target.closest?.(".nm-wrap");
      if (!wrap) return;
      drag = { wrap, id: e.pointerId, x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop, moved: false };
    });
    root.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (e.buttons === 0) return endDrag(e);
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < 4) return;
        drag.moved = true;
        drag.wrap.classList.add("nm-dragging");
        try {
          drag.wrap.setPointerCapture(drag.id);
        } catch (_e) {
          /* ohne Pointer-Capture: Ziehen funktioniert weiter, solange die Maus über der Karte bleibt */
        }
      }
      drag.wrap.scrollLeft = drag.sl - dx;
      drag.wrap.scrollTop = drag.st - dy;
      e.preventDefault();
    });
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);
    root.addEventListener(
      "click",
      (e) => {
        if (Date.now() - (this._netDragEndedAt || 0) < 80) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      true
    );
  }

  // Zeichnung: eine Spalte je Ebene (Wurzel links), Unterbäume untereinander, Geräte als Wolke
  _networkSvg(kind, topo) {
    const t = (k, v) => this._t(k, v);
    const hubs = topo.hubs;
    const byId = new Map(hubs.map((h) => [h.id, h]));
    const children = new Map(hubs.map((h) => [h.id, []]));
    const roots = [];
    for (const h of hubs) {
      if (h.parent && h.parent !== h.id && byId.has(h.parent)) children.get(h.parent).push(h);
      else roots.push(h);
    }
    const HUB_W = 196, HUB_H = 52, CL_W = 128, CL_H = 34, GAP = 14, COL = 300, SIDE = 16, LEAF = 16;
    const hasKids = (h) => children.get(h.id).length > 0;
    const cloudBelow = (h) => h.clients.length > 0 && hasKids(h);
    const blockH = (h) => HUB_H + (cloudBelow(h) ? 10 + CL_H : 0) + GAP;
    const sub = new Map();
    const measure = (h) => {
      let kids = 0;
      for (const k of children.get(h.id)) kids += measure(k);
      const v = Math.max(blockH(h), kids);
      sub.set(h.id, v);
      return v;
    };
    let total = 0;
    for (const r of roots) total += measure(r);
    const pos = new Map();
    let maxDepth = 0;
    let leafCloud = false;
    const place = (h, top, depth) => {
      pos.set(h.id, { x: SIDE + HUB_W / 2 + depth * COL, top });
      maxDepth = Math.max(maxDepth, depth);
      if (h.clients.length && !hasKids(h)) leafCloud = true;
      let y = top;
      for (const k of children.get(h.id)) {
        place(k, y, depth + 1);
        y += sub.get(k.id);
      }
    };
    let y0 = 8;
    for (const r of roots) {
      place(r, y0, 0);
      y0 += sub.get(r.id);
    }
    const width = SIDE * 2 + HUB_W + maxDepth * COL + (leafCloud ? LEAF + CL_W : 0);
    const height = Math.max(total, 60) + 16;

    const node = (cx, top, w, h, icon, lines, cls, attrs = "", label = "") => {
      const textX = w > 130 ? 38 : 28;
      const avail = w - textX - 6;
      const ys = lines.length > 1 && lines[1] ? [h / 2 - 3, h / 2 + 13] : [h / 2 + 5];
      const text = lines
        .filter((l) => l)
        .map((line, i) => `<text x="${textX}" y="${ys[i]}" class="${i === 0 ? "nm-t" : "nm-s"}">${esc(String(line).slice(0, Math.floor(avail / (i === 0 ? 7.2 : 5.9))))}</text>`)
        .join("");
      const ico = w > 130 ? 24 : 18;
      return `<g class="nm-node ${cls}${attrs ? " link" : ""}" transform="translate(${cx - w / 2} ${top})"${
        attrs ? ` role="button" tabindex="0" ${attrs} aria-label="${esc(label)}"` : ""
      }><title>${esc(label || lines[0] || "")}</title>
        <rect width="${w}" height="${h}" rx="12"/>
        <foreignObject x="${w > 130 ? 8 : 6}" y="${(h - ico) / 2}" width="${ico}" height="${ico}"><ha-icon icon="${icon}" xmlns="http://www.w3.org/1999/xhtml"></ha-icon></foreignObject>
        ${text}</g>`;
    };

    let edges = "";
    let nodes = "";
    for (const h of hubs) {
      const p = pos.get(h.id);
      if (!p) continue;
      const cy = p.top + HUB_H / 2;
      const name = this._hubName(h);
      for (const k of children.get(h.id)) {
        const kp = pos.get(k.id);
        if (!kp) continue;
        const ky = kp.top + HUB_H / 2;
        const x1 = p.x + HUB_W / 2;
        const x2 = kp.x - HUB_W / 2;
        const mid = (x1 + x2) / 2;
        edges += `<path class="nm-edge${k.orphan ? " nm-orphan" : ""}" d="M${x1} ${cy} H ${mid} V ${ky} H ${x2}"/>`;
        if (k.rssi != null) edges += `<text class="nm-lbl" x="${x2 - 4}" y="${ky - 5}" text-anchor="end">${esc(k.rssi)} dBm</text>`;
      }
      if (h.clients.length) {
        const label = t("nw_show_tip", { name });
        const title = h.clients.length === 1 ? t("nw_cloud_one") : t("nw_cloud", { n: h.clients.length });
        if (cloudBelow(h)) {
          const cTop = p.top + HUB_H + 10;
          edges += `<path class="nm-edge nm-dash" d="M${p.x} ${p.top + HUB_H} V ${cTop}"/>`;
          nodes += node(p.x, cTop, CL_W, CL_H, "mdi:devices", [title], "cl", `data-act="net_open" data-net="${esc(h.id)}" data-kind="${kind}"`, label);
        } else {
          const cx = p.x + HUB_W / 2 + LEAF + CL_W / 2;
          edges += `<path class="nm-edge nm-dash" d="M${p.x + HUB_W / 2} ${cy} H ${cx - CL_W / 2}"/>`;
          nodes += node(cx, cy - CL_H / 2, CL_W, CL_H, "mdi:devices", [title], "cl", `data-act="net_open" data-net="${esc(h.id)}" data-kind="${kind}"`, label);
        }
      }
      const dev = h.device ? this._deviceById(h.device) : null;
      const attrs = dev ? `data-act="open" data-id="${esc(dev.id)}"` : `data-act="net_open" data-net="${esc(h.id)}" data-kind="${kind}"`;
      const cls = `${h.type === "leader" || h.type === "ap" || h.type === "lan" ? "coord" : h.type === "external" ? "cl" : "rt"}${h.available === false ? " off" : ""}`;
      nodes += node(p.x, p.top, HUB_W, HUB_H, this._hubIcon(h), [name, this._hubSub(h)], cls, attrs, t("nw_open_tip", { name }));
    }
    const zoom = this._netZoomValue();
    return `<div class="nm-wrap"><svg class="nm-svg" style="width:${Math.round(width * zoom)}px" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(t("nw_map_label"))}">${edges}${nodes}</svg></div>`;
  }

  // Listen unter der Zeichnung: je Hub ein Akkordeon mit Verbindungen und Geräten
  _networkLists(kind, topo) {
    const t = (k, v) => this._t(k, v);
    const byId = new Map(topo.hubs.map((h) => [h.id, h]));
    const pill = (v) => (v == null ? "" : `<span class="pill" style="--c:${this._signalColor(v)}" title="${esc(t("nw_signal"))}">${esc(v)} dBm</span>`);
    const row = (deviceId, name, right) => {
      const dev = deviceId ? this._deviceById(deviceId) : null;
      const dot = dev ? this._statusDot(dev) : "";
      return `<div class="nm-row${dev ? "" : " plain"}"${dev ? ` role="button" tabindex="0" data-act="open" data-id="${esc(dev.id)}"` : ""}>
        <span class="row-icon nm-dot">${dot}</span><span class="nm-name">${esc(name)}</span>${right}${dev ? '<ha-icon icon="mdi:chevron-right"></ha-icon>' : ""}</div>`;
    };
    const parts = topo.hubs.map((h, idx) => {
      let body = "";
      if (h.orphan) body += `<div class="hint warn">${esc(t("nw_orphan"))}</div>`;
      if (h.neighbors?.length) {
        body += `<div class="nm-sub">${esc(t("nw_links_routers"))}</div>${h.neighbors
          .map((n) => {
            const nb = byId.get(n.id);
            const rel = `<span class="hint nm-rel">${esc(t(`nw_rel_${n.rel}`))}</span>`;
            return row(nb?.device, nb ? this._hubName(nb) : n.id, `${rel}${pill(n.rssi)}`);
          })
          .join("")}`;
      }
      if (h.clients.length) {
        body += `<div class="nm-sub">${esc(t("nw_end_devices"))} (${h.clients.length})</div>${h.clients
          .map((c) => row(c.id, c.name, `<span class="hint nm-rel">${esc(t(`nw_role_${c.role}`))}</span>${pill(c.rssi)}`))
          .join("")}`;
      }
      if (!body) body = `<div class="hint">${esc(t("nw_no_links"))}</div>`;
      const meta = h.clients.length === 1 ? t("nw_cloud_one") : h.clients.length ? t("nw_cloud", { n: h.clients.length }) : "";
      return this._accordion(`nw:${kind}:${h.id}`, this._hubIcon(h), this._hubName(h), body, { meta, open: idx === 0 && kind === "thread" && topo.hubs.length < 4 });
    });
    if (topo.unassigned?.length) {
      const body = `<div class="hint">${esc(t("nw_unassigned_hint"))}</div>${topo.unassigned
        .map((c) => row(c.id, c.name, `<span class="hint nm-rel">${esc(t(`nw_role_${c.role}`))}</span>`))
        .join("")}`;
      parts.push(this._accordion(`nw:${kind}:_unassigned`, "mdi:help-network-outline", t("nw_unassigned"), body, { meta: String(topo.unassigned.length) }));
    }
    return parts.join("");
  }

  // ----------------------------------------------------------------- Funktionen (Expose)
  _fnKey(d, f) {
    return `${d.id}|${f.id}`;
  }

  _fnLabel(d, f) {
    const base = this._t(`fn_${f.key}`);
    const multi = new Set((d.functions || []).map((x) => x.endpoint)).size > 1;
    return multi ? `${base} · EP ${f.endpoint}` : base;
  }

  // Wert einer Funktion als Text (Schalter ohne Bedienung, Zahlen mit Einheit, Zustände übersetzt)
  _fnValue(f) {
    const v = f.value;
    if (v === null || v === undefined) return "–";
    if (f.kind === "switch") {
      const c = v ? ` style="--c:var(--mmm-color-success)"` : "";
      return `<span class="pill"${c}>${esc(this._t(v ? "fn_on" : "fn_off"))}</span>`;
    }
    if (f.kind === "bool") return esc(this._t(v ? "fn_present" : "fn_absent"));
    if (f.kind === "enum") return esc(this._t(`fn_v_${v}`));
    const num = new Intl.NumberFormat(this._lang, { maximumFractionDigits: 1 }).format(v);
    return esc(f.unit ? `${num} ${f.unit}` : num);
  }

  // Ein/Aus-Schalter; bis das Gerät den neuen Wert bestätigt, zeigt er den gewünschten Zustand
  _fnSwitch(d, f) {
    const pending = this._fnPending.get(this._fnKey(d, f));
    const on = pending ? pending.target : f.value === true;
    const offline = d.available === false;
    const text = this._t(on ? "fn_on" : "fn_off");
    const tip = offline ? this._t("status_offline") : text;
    return `<span class="ex-sw"><button class="sw${on ? " on" : ""}" role="switch" aria-checked="${on}"
        aria-label="${esc(this._fnLabel(d, f))}" title="${esc(tip)}" data-act="fn_toggle"
        data-id="${esc(d.id)}" data-fn="${esc(f.id)}" data-next="${on ? 0 : 1}"
        ${pending || offline ? "disabled" : ""}><span class="knob"></span></button><span class="sw-label">${esc(text)}</span></span>`;
  }

  _fnLines(d, onlySwitches = false) {
    const ro = this._readOnly;
    return (d.functions || [])
      .filter((f) => !onlySwitches || f.switchable)
      .map(
        (f) => `<div class="settings-line"><span class="settings-label">${esc(this._fnLabel(d, f))}</span><span class="settings-value">${
          f.switchable && !ro ? this._fnSwitch(d, f) : this._fnValue(f)
        }</span></div>`
      )
      .join("");
  }

  _fnRedraw() {
    this._refresh();
    if (this._selected) this._renderPopup(true);
  }

  // Wartende Schalter freigeben, sobald der Wert vom Gerät bestätigt wurde
  _fnSettle() {
    if (!this._fnPending.size || !this._data) return;
    for (const [key, p] of [...this._fnPending]) {
      const [id, fn] = key.split("|");
      const f = this._data.devices.find((x) => x.id === id)?.functions?.find((x) => x.id === fn);
      if (!f || f.value === p.target) this._fnPending.delete(key);
    }
  }

  async _fnToggle(id, fn, next) {
    if (!id || !fn) return;
    const key = `${id}|${fn}`;
    if (this._fnPending.has(key)) return;
    this._fnPending.set(key, { target: next });
    this._fnRedraw();
    const ok = await this._call("set_function", { device: id, function: fn, value: next });
    if (!ok) {
      this._fnPending.delete(key);
      this._fnRedraw();
      return;
    }
    // Der Matter Server meldet den neuen Wert von selbst; sonst nach 4 s wieder den echten Wert zeigen
    clearTimeout(this._fnTimer);
    this._fnTimer = setTimeout(() => {
      this._fnPending.clear();
      this._fnRedraw();
    }, 4000);
  }

  _renderFunctions() {
    const t = (k) => this._t(k);
    const ro = this._readOnly;
    const all = (this._data.devices || []).filter((d) => d.functions?.length);
    const isSwitch = (d) => d.functions.some((f) => f.switchable);
    const isOn = (d) => d.functions.some((f) => f.switchable && f.value === true);
    const mode = ["all", "switch", "on"].includes(this._fnFilter) ? this._fnFilter : "all";
    const chip = (id, n, label, color) =>
      `<button class="chip ${mode === id ? "on" : ""}" data-act="fn_filter" data-chip="${id}"
         style="--c:${n > 0 && color ? color : "var(--primary-text-color, #212121)"}"><b>${n}</b>${esc(label)}</button>`;
    const chips = this._config.show_stats
      ? `<div class="chips">${chip("all", all.length, t("fn_chip_all"), "")}${chip("switch", all.filter(isSwitch).length, t("fn_chip_switch"), "var(--mmm-color-info)")}${chip(
          "on",
          all.filter(isOn).length,
          t("fn_chip_on"),
          "var(--mmm-color-success)"
        )}</div>`
      : "";

    let list = mode === "switch" ? all.filter(isSwitch) : mode === "on" ? all.filter(isOn) : all;
    const q = this._search;
    if (q) {
      list = list.filter((d) =>
        [d.name, d.vendor, d.model, d.bridge, ...d.functions.map((f) => this._t(`fn_${f.key}`))].some((v) =>
          String(v ?? "").toLowerCase().includes(q)
        )
      );
    }
    list = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || "", this._lang));

    let body;
    if (!list.length) {
      body = `<div class="empty">${esc(t(all.length ? "no_results" : "fn_none"))}</div>`;
    } else {
      const { shown, hidden } = this._limited(list);
      const color = this._rowIconColor("functions");
      const iconStyle = color ? ` style="color: ${color};"` : "";
      body = `<div class="fn-list">${shown
        .map((d) => {
          const img = this._deviceImage(d);
          const secondary = [this._config.show_model ? d.model : "", this._config.show_vendor ? d.vendor : "", d.bridged && d.bridge ? `${t("f_bridge")}: ${d.bridge}` : ""]
            .filter(Boolean)
            .map((v) => `<span>${esc(v)}</span>`)
            .join("");
          const badge = d.available === false ? `<span class="badge" style="--c:var(--mmm-color-error)">${esc(t("offline"))}</span>` : "";
          return `<div class="fn-device">
            <div class="row clickable" tabindex="0" role="button" data-act="open" data-id="${esc(d.id)}">
              <span class="row-icon${img ? " has-image" : ""}"${iconStyle}>${img}<ha-icon icon="${esc(this._deviceIcon(d, "functions"))}"${img ? " hidden" : ""}></ha-icon>${this._statusDot(d)}</span>
              <div class="row-main"><div class="row-primary"><span class="row-name">${esc(d.name)}</span>${badge}</div><div class="row-secondary">${secondary}</div></div>
            </div>
            <div class="fn-lines">${this._fnLines(d, mode !== "all")}</div>
          </div>`;
        })
        .join("")}</div>${
        hidden ? `<div class="more"><button class="btn" data-act="more">${esc(t("show_more", { n: hidden }))}</button></div>` : ""
      }`;
    }
    return `${chips}${this._renderFilterBar("functions", false)}${body}<div class="hint">${esc(t(ro ? "fn_hint_ro" : "fn_hint"))}</div>`;
  }

  // ----------------------------------------------------------------- Bausteine
  _accordion(key, icon, title, body, { meta = "", open = false, cls = "" } = {}) {
    return `<details class="settings-accordion ${cls}" data-k="${esc(key)}" ${this._isOpen(key, open) ? "open" : ""}>
      <summary class="settings-accordion-summary"><ha-icon icon="${icon}"></ha-icon><span class="grow">${esc(title)}</span>${
        meta ? `<span class="meta">${esc(meta)}</span>` : ""
      }</summary><div class="settings-accordion-body">${body}</div></details>`;
  }

  _confirmLabel(key, label) {
    return this._confirming === key ? this._t("confirm") : label;
  }

  _confirmButton(key, act, attrs, label, cls = "btn danger small") {
    return `<button class="${cls}" data-act="${act}" data-confirm="${esc(key)}" ${attrs}>${esc(this._confirmLabel(key, label))}</button>`;
  }

  _draft(key, dflt = "") {
    return key in this._drafts ? this._drafts[key] : dflt;
  }

  _line(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return `<div class="settings-line"><span class="settings-label">${esc(label)}</span><span class="settings-value">${value}</span></div>`;
  }

  // ----------------------------------------------------------------- Fabrics
  _fabricTitle(f) {
    if (f.own) return this._t("fabric_own");
    return f.label || f.vendor_name || this._t("fabric_unknown");
  }

  _renderFabrics() {
    const fabrics = this._data.fabrics || [];
    const hint = `<div class="hint">${esc(this._t("fabrics_hint"))}</div>`;
    if (!fabrics.length) return `${hint}<div class="empty">${esc(this._t("no_fabrics"))}</div>`;
    const ro = this._readOnly;
    const color = this._rowIconColor("fabrics");
    const iconStyle = color ? ` style="color: ${color};"` : "";
    const items = fabrics.map((f) => {
      const members = f.members
        .map((m) => {
          const remove =
            ro || f.own || m.fabric_index === null || m.fabric_index === undefined
              ? ""
              : this._confirmButton(
                  `fabric_remove:${m.id}:${m.fabric_index}`,
                  "fabric_remove",
                  `data-id="${esc(m.id)}" data-fabric="${esc(m.fabric_index)}"`,
                  this._t("fabric_remove"),
                  "btn small danger"
                );
          return `<div class="settings-line"><a href="#" data-act="open" data-id="${esc(m.id)}" style="color:inherit">${esc(m.name)}</a>${remove}</div>`;
        })
        .join("");
      const info = [
        f.vendor_name ? this._line(this._t("f_vendor_fabric"), esc(f.vendor_name)) : "",
        f.fabric_id ? this._line(this._t("f_fabric_id"), esc(f.fabric_id)) : "",
      ].join("");
      const icon = f.own ? "mdi:home-assistant" : "mdi:home-group";
      return `<details class="settings-accordion" data-k="${esc(`fab:${f.key}`)}" ${this._isOpen(`fab:${f.key}`, f.own) ? "open" : ""}>
        <summary class="settings-accordion-summary"><ha-icon icon="${icon}"${iconStyle}></ha-icon><span class="grow">${esc(this._fabricTitle(f))}</span>
          ${f.own ? `<span class="badge" style="--c:var(--mmm-color-success)">${esc(this._t("fabric_own_badge"))}</span>` : ""}
          <span class="meta">${f.members.length}</span></summary>
        <div class="settings-accordion-body">${info}${members}</div></details>`;
    });
    return `${hint}<div class="settings-view">${items.join("")}</div>`;
  }

  // ----------------------------------------------------------------- Bindings
  _renderBindings() {
    const list = this._devices("bindings");
    const search = this._renderFilterBar("bindings", false);
    if (!list.length) return `${search}<div class="empty">${esc(this._t("no_bindings"))}</div><div class="hint">${esc(this._t("bindings_hint"))}</div>`;
    const ro = this._readOnly;
    const items = list.map((d) => {
      const lines = d.bindings
        .map((b) => {
          const badge = b.target_type === "group" ? ` <span class="badge">${esc(b.target)}</span>` : "";
          const unbind = ro
            ? ""
            : this._confirmButton(
                `unbind:${d.id}:${b.endpoint}:${b.cluster_id}:${b.target_ref}`,
                "unbind",
                `data-id="${esc(d.id)}" data-ep="${esc(b.endpoint)}" data-target="${esc(b.target_ref)}" data-cluster="${esc(b.cluster_id)}"`,
                this._t("unbind"),
                "btn small danger"
              );
          const target = b.target_type === "group" ? "" : esc(b.target);
          return `<div class="settings-line"><span>${esc(b.cluster)} <span class="muted">· EP ${esc(b.endpoint)} →</span> ${target}${badge}</span>${unbind}</div>`;
        })
        .join("");
      return this._accordion(`bind:${d.id}`, "mdi:link-variant", d.name, `${lines}<div class="toolbar"><button class="btn small" data-act="open" data-id="${esc(d.id)}">${esc(this._t("details"))}</button></div>`, { meta: String(d.bindings.length) });
    });
    return `<div class="hint">${esc(this._t("bindings_hint"))}</div>${search}<div class="settings-view">${items.join("")}</div>`;
  }

  // ----------------------------------------------------------------- Server
  _renderBridge() {
    const s = this._data.server;
    const st = this._data.stats;
    const ro = this._readOnly;
    const status =
      s.online === true
        ? `<span class="pill" style="--c:var(--mmm-color-success)">${esc(this._t("online"))}</span>`
        : s.online === false
          ? `<span class="pill" style="--c:var(--mmm-color-error)">${esc(this._t("offline"))}</span>`
          : esc(this._t("unknown"));
    const flag = (v) => (v === null || v === undefined ? "" : esc(v ? this._t("yes") : this._t("no")));
    const info = [
      this._line(this._t("f_status"), status),
      this._line(this._t("f_url"), esc(s.url)),
      this._line(this._t("f_sdk"), esc(s.sdk_version)),
      this._line(this._t("f_schema"), esc(s.schema_version)),
      this._line(this._t("f_server_fabric"), esc(s.fabric_id)),
      this._line(this._t("f_compressed"), esc(s.compressed_fabric_id)),
      this._line(this._t("f_nodes"), esc(s.node_count)),
      this._line(this._t("tab_fabrics"), esc(st.fabrics)),
      this._line(this._t("f_wifi_creds"), flag(s.wifi_credentials_set)),
      this._line(this._t("f_thread_creds"), flag(s.thread_credentials_set)),
      this._line(this._t("f_bluetooth"), flag(s.bluetooth_enabled)),
    ].join("");

    const running = !!this._data.jobs?.commission?.running;
    const commission = ro
      ? `<div class="hint">${esc(this._t("read_only_hint"))}</div>`
      : `<div class="hint">${esc(this._t("commission_hint"))}</div>
         <div class="field"><label>${esc(this._t("commission_code"))}</label>
           <input type="text" autocomplete="off" spellcheck="false" data-draft="commission_code" data-fk="commission_code" value="${esc(this._draft("commission_code"))}" placeholder="MT:… / 3497-011-2332" /></div>
         <div class="field inline"><input type="checkbox" id="netonly" data-draft="commission_network_only" ${this._draft("commission_network_only", false) ? "checked" : ""} />
           <label for="netonly">${esc(this._t("commission_network_only"))}</label></div>
         <div class="toolbar"><button class="btn primary" data-act="commission" ${running ? "disabled" : ""}><ha-icon icon="mdi:plus"></ha-icon>${esc(this._t("commission_start"))}</button></div>`;

    const options = ro
      ? `<div class="hint">${esc(this._t("read_only_hint"))}</div>`
      : `<div class="field"><label>${esc(this._t("fabric_label"))}</label>
           <div class="field-row"><input type="text" maxlength="32" data-draft="fabric_label" data-fk="fabric_label" value="${esc(this._draft("fabric_label"))}" />
           <button class="btn small" data-act="fabric_label">${esc(this._t("save"))}</button></div>
           <span class="help">${esc(this._t("fabric_label_hint"))}</span></div>`;

    const maintenance = ro
      ? `<div class="hint">${esc(this._t("read_only_hint"))}</div>`
      : `<div class="toolbar">${this._confirmButton("reconnect", "reconnect", "", this._t("reconnect"), "btn danger")}</div><div class="hint">${esc(this._t("reconnect_hint"))}</div>`;

    const events = this._data.events.length
      ? `<div class="timeline">${this._data.events
          .map((e) => `<div class="timeline-item"><ha-icon icon="${this._eventIcon(e.type)}"></ha-icon><span>${esc(this._eventText(e))}</span><span class="when">${esc(this._relTime(e.ts))}</span></div>`)
          .join("")}</div>`
      : `<div class="hint">${esc(this._t("no_events"))}</div>`;

    return `<div class="settings-view">
      ${this._appSection()}
      ${this._accordion("bridge:status", "mdi:information-outline", this._t("sec_status"), info, { open: true })}
      ${this._accordion("bridge:commission", "mdi:plus-circle-outline", this._t("sec_commission"), commission)}
      ${this._accordion("bridge:options", "mdi:tune", this._t("sec_options"), options)}
      ${this._renderNc()}
      ${this._accordion("bridge:maintenance", "mdi:wrench-outline", this._t("sec_maintenance"), maintenance)}
      ${this._accordion("bridge:events", "mdi:history", this._t("sec_events"), events, { meta: String(this._data.events.length) })}
    </div>`;
  }

  // Notification Center (optional): Hauptschalter + Meldungsarten, nach Dringlichkeit sortiert
  _renderNc() {
    const nc = this._data?.nc;
    if (!nc || !Array.isArray(nc.types)) return "";
    const t = (k, v) => this._t(k, v);
    const ro = this._readOnly;
    const order = ["critical", "warning", "info", "ok"];
    const color = {
      critical: "var(--mmm-color-error)",
      warning: "var(--mmm-color-warning)",
      info: "var(--mmm-color-info)",
      ok: "var(--mmm-color-success)",
    };
    const chosen = nc.chosen || {};
    const sw = (act, on, label, extra = "", disabled = false) =>
      `<button class="sw${on ? " on" : ""}" role="switch" aria-checked="${on}" aria-label="${esc(label)}" title="${esc(label)}"
        data-act="${act}" data-next="${on ? 0 : 1}" ${extra} ${disabled ? "disabled" : ""}><span class="knob"></span></button>`;
    const pill = (on) =>
      `<span class="pill" style="--c:${on ? "var(--mmm-color-success)" : "var(--mmm-color-row-icon)"}">${esc(t(on ? "nc_active" : "nc_inactive"))}</span>`;
    const types = [...nc.types].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));

    const status = nc.available
      ? `<span class="pill" style="--c:var(--mmm-color-success)">${esc(t("nc_found"))}</span>`
      : `<span class="pill" style="--c:var(--mmm-color-info)">${esc(t("nc_missing"))}</span>`;
    const master = `<div class="settings-line"><span class="settings-label">${esc(t("nc_master"))}</span><span class="settings-value">${
      ro ? pill(nc.enabled) : sw("nc_master", nc.enabled, t("nc_master"))
    }</span></div>`;
    const rows = types
      .map((x) => {
        const label = x.labels?.[this._lang] || x.labels?.en || x.type;
        const on = x.type in chosen ? chosen[x.type] === true : x.enabled === true;
        const icon = /^mdi:[a-z0-9-]+$/.test(x.icon || "") ? x.icon : "mdi:bell-outline";
        const dot = `<span class="nc-dot" style="background:${color[x.severity] || color.info}" title="${esc(t(`sev_${x.severity}`))}"></span>`;
        const right = ro ? pill(x.enabled) : sw("nc_type", on, label, `data-nc-type="${esc(x.type)}"`, !nc.enabled);
        return `<div class="settings-line"><span class="settings-label nc-label">${dot}<ha-icon icon="${esc(icon)}"></ha-icon><span>${esc(label)}</span></span><span class="settings-value">${right}</span></div>`;
      })
      .join("");
    const body = [
      this._line(t("f_status"), status),
      nc.available ? "" : `<div class="hint">${esc(t("nc_missing_hint"))}</div>`,
      master,
      !nc.enabled ? `<div class="hint">${esc(t("nc_master_off_hint"))}</div>` : "",
      `<div class="hint">${esc(t("nc_types"))}</div>`,
      rows,
    ].join("");
    const active = types.filter((x) => x.enabled).length;
    return this._accordion("bridge:nc", "mdi:bell-outline", t("sec_nc"), body, {
      meta: nc.enabled ? `${active}/${types.length}` : t("nc_inactive"),
    });
  }

  async _ncSet(action, params) {
    if (this._readOnly) return;
    if (await this._call(action, params)) this._toast(this._t("nc_saved"));
  }

  // App-Version: installierte Version + Hinweis, wenn eine neuere Version existiert
  _appSection() {
    const app = this._data?.app;
    if (!app) return "";
    const t = (k, v) => this._t(k, v);
    const update = app.update_available === true;
    const ok = !update && app.latest_version && !app.check_failed;
    let latest;
    if (update) latest = `<span class="pill" style="--c:var(--mmm-color-warning)">${esc(t("app_update_available", { v: app.latest_version }))}</span>`;
    else if (ok) latest = `<span class="pill" style="--c:var(--mmm-color-success)">${esc(t("app_up_to_date"))}</span>`;
    else if (app.check_failed) latest = `<span class="pill" style="--c:var(--mmm-color-error)">${esc(t("app_check_failed"))}</span>`;
    else latest = esc(t("app_not_checked"));
    const mismatch = Boolean(app.version) && app.version !== CARD_VERSION;
    const url = /^https:\/\/github\.com\//.test(app.release_url || "") ? app.release_url : RELEASES_URL;
    const lines = [
      this._line(t("f_integration_version"), esc(app.version)),
      this._line(t("f_card_version"), mismatch ? `<span class="pill" style="--c:var(--mmm-color-warning)">${esc(CARD_VERSION)}</span>` : esc(CARD_VERSION)),
      this._line(t("f_latest_version"), `${app.latest_version && !update ? `${esc(app.latest_version)} ` : ""}${latest}`),
      app.checked_at ? this._line(t("f_checked"), esc(this._relTime(app.checked_at))) : "",
    ].join("");
    const hints = [
      update ? `<div class="hint warn">${esc(t("app_update_hint"))}</div>` : "",
      mismatch ? `<div class="hint warn">${esc(t("app_mismatch", { card: CARD_VERSION, integration: app.version }))}</div>` : "",
    ].join("");
    const buttons = `<div class="toolbar">${
      this._readOnly ? "" : `<button class="btn" data-act="app_update_check"><ha-icon icon="mdi:refresh"></ha-icon>${esc(t("app_check_now"))}</button>`
    }<a class="btn ${update ? "primary" : ""}" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><ha-icon icon="mdi:open-in-new"></ha-icon>${esc(t("app_release"))}</a></div>`;
    return this._accordion("bridge:app", update ? "mdi:update" : "mdi:information-variant-circle-outline", t("sec_app"), `${lines}${hints}${buttons}`, {
      open: true,
      meta: `v${app.version}`,
      cls: update || mismatch ? "update" : "",
    });
  }

  _eventIcon(type) {
    return (
      {
        device_joined: "mdi:plus-circle-outline",
        device_leave: "mdi:minus-circle-outline",
        offline: "mdi:lan-disconnect",
        online: "mdi:lan-connect",
        battery_low: "mdi:battery-alert",
        update_available: "mdi:update",
        server_connected: "mdi:server-network",
        server_disconnected: "mdi:server-network-off",
      }[type] || "mdi:circle-small"
    );
  }

  _eventText(e) {
    const base = this._t(`ev_${e.type}`);
    return [base, e.name, e.detail].filter(Boolean).join(" · ");
  }

  // ----------------------------------------------------------------- Eingaben
  _confirmed(key) {
    if (this._confirming === key) {
      this._confirming = null;
      clearTimeout(this._confirmTimer);
      return true;
    }
    this._confirming = key;
    clearTimeout(this._confirmTimer);
    this._confirmTimer = setTimeout(() => {
      if (this._confirming === key) {
        this._confirming = null;
        this._refresh();
      }
    }, 6000);
    this._refresh();
    return false;
  }

  _onInput(e) {
    const t = e.target;
    if (t?.matches?.("[data-nmzoom]")) {
      this._setNetZoom(Number(t.value) / 100);
      return;
    }
    const key = t?.dataset?.draft;
    if (!key) return;
    this._drafts[key] = t.type === "checkbox" ? t.checked : t.value;
    if (t.dataset.rerender) this._refresh();
  }

  _onChange(e) {
    const t = e.target;
    if (!t?.dataset) return;
    if (t.dataset.draft) this._drafts[t.dataset.draft] = t.type === "checkbox" ? t.checked : t.value;
    if (t.dataset.change === "sort") {
      this._sort[t.dataset.tab] = t.value;
      this._refresh();
    } else if (t.dataset.change === "group_by") {
      this._groupBy = t.value;
      this._expanded = false;
      this._refresh();
    } else if (t.dataset.change === "flt") {
      if (t.value) this._flt[t.dataset.flt] = t.value;
      else delete this._flt[t.dataset.flt];
      this._expanded = false;
      this._refresh();
    } else if (t.dataset.change === "bind_endpoint") {
      this._popupSig = null;
      this._renderPopup(true);
    }
  }

  async _onClick(e) {
    if (e.target.id === "backdrop") return this._closePopup();
    const el = e.target.closest?.("[data-act]");
    if (!el) return;
    if (el.tagName === "A" && el.getAttribute("href") === "#") e.preventDefault();
    const d = el.dataset;
    if (d.confirm && !this._confirmed(d.confirm)) return;

    switch (d.act) {
      case "tab":
        this._tab = d.tab;
        this._filter = "all";
        this._expanded = false;
        return this._refresh();
      case "goto_commission":
        if (!this._visibleTabs().includes("bridge")) return;
        this._tab = "bridge";
        this._open["bridge:commission"] = true;
        return this._refresh();
      case "chip":
        this._filter = this._filter === d.chip && d.chip !== "all" ? "all" : d.chip;
        return this._refresh();
      case "more":
        this._expanded = true;
        return this._refresh();
      case "net_zoom_in":
        return void this._setNetZoom(this._netZoomValue() * 1.2);
      case "net_zoom_out":
        return void this._setNetZoom(this._netZoomValue() / 1.2);
      case "net_zoom_reset":
        return void this._setNetZoom(1);
      case "net_zoom_fit":
        return void this._netZoomFit();
      case "net_open": {
        // Wolke oder Router in der Zeichnung: das zugehörige Akkordeon aufklappen und anzeigen
        const key = `nw:${d.kind}:${d.net}`;
        this._open[key] = true;
        this._refresh();
        requestAnimationFrame(() => {
          const el = [...this.shadowRoot.querySelectorAll("details[data-k]")].find((x) => x.dataset.k === key);
          el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
        return;
      }
      case "fn_filter":
        this._fnFilter = this._fnFilter === d.chip && d.chip !== "all" ? "all" : d.chip;
        this._expanded = false;
        return this._refresh();
      case "fn_toggle":
        return void (await this._fnToggle(d.id, d.fn, d.next === "1"));
      case "nc_master":
        return void (await this._ncSet("nc_set_master", { enabled: d.next === "1" }));
      case "nc_type":
        return void (await this._ncSet("nc_set_type", { nc_type: d.ncType, enabled: d.next === "1" }));
      case "copy":
        return void (await this._copyText(d.text));
      case "copy_all":
        return void (await this._copyEntities(this._selected));
      case "flt_reset":
        this._flt = {};
        this._expanded = false;
        return this._refresh();
      case "flt_clear":
        delete this._flt[d.flt];
        this._expanded = false;
        return this._refresh();
      case "grp_all":
        for (const k of this._groupKeys || []) this._open[k] = d.value === "1";
        return this._refresh();
      case "open":
        return this._openPopup(d.id);
      case "close":
        return this._closePopup();
      case "check_all":
        this._toast(this._t("checking"));
        return void (await this._call("ota_check_all"));
      case "update_all":
        return void (await this._call("ota_update_all"));
      case "cancel_job":
        return void (await this._call("ota_cancel"));
      case "ota_check":
        return void (await this._call("ota_check", { device: d.id || this._selected }));
      case "ota_update":
        return void (await this._call("ota_update", { device: d.id || this._selected }));
      case "app_update_check":
        this._toast(this._t("app_checking"));
        return void (await this._call("app_update_check"));
      case "reconnect":
        return void (await this._call("reconnect"));
      case "commission": {
        const code = String(this._draft("commission_code")).trim();
        if (!code) return;
        await this._call("commission", {
          value: { code, network_only: !!this._draft("commission_network_only", false) },
        });
        return;
      }
      case "fabric_label": {
        const label = String(this._draft("fabric_label")).trim();
        if (label) await this._call("fabric_label", { value: label });
        return;
      }
      case "save_comment":
      case "delete_comment": {
        const id = this._selected;
        const value = d.act === "delete_comment" ? "" : String(this._draft(`comment:${id}`, "")).replace(/\r\n/g, "\n").trim();
        if (await this._call("set_comment", { device: id, value })) {
          delete this._drafts[`comment:${id}`];
          this._toast(this._t(value ? "done_comment" : "done_comment_deleted"));
          this._popupSig = null;
          this._renderPopup(true);
        }
        return;
      }
      case "rename": {
        const id = this._selected;
        const value = String(this._draft(`rename:${id}`, "")).trim();
        if (!value) return;
        if (await this._call("rename", { device: id, value })) delete this._drafts[`rename:${id}`];
        return;
      }
      case "bind": {
        const id = this._selected;
        const target = this._draft(`bt:${id}`);
        if (!target) return this._toast(this._t("pick_target"), true);
        const ep = this._bindEndpoint(id);
        const prefix = `bc:${id}:${ep}:`;
        const clusters = Object.keys(this._drafts)
          .filter((k) => k.startsWith(prefix) && this._drafts[k])
          .map((k) => Number(k.slice(prefix.length)));
        await this._call("bind", { device: id, endpoint: ep, target, clusters });
        return;
      }
      case "unbind":
        return void (await this._call("unbind", {
          device: d.id || this._selected,
          endpoint: Number(d.ep),
          target: d.target,
          clusters: [Number(d.cluster)],
        }));
      case "fabric_remove":
        return void (await this._call("fabric_remove", { device: d.id || this._selected, fabric_index: Number(d.fabric) }));
      case "open_window":
        return void (await this._call("open_window", { device: this._selected }));
      case "ping":
        return void (await this._call("ping", { device: this._selected }));
      case "interview":
        return void (await this._call("interview", { device: this._selected }));
      case "remove": {
        const ok = await this._call("remove", { device: this._selected });
        if (ok) this._closePopup();
        return;
      }
      default:
    }
  }

  // ----------------------------------------------------------------- Popup
  _openPopup(id) {
    if (!id) return;
    this._selected = id;
    this._popupSig = null;
    if (!this._readOnly) this._loadDetails(id);
    this._renderPopup(true);
  }

  _closePopup() {
    this._selected = null;
    this._popupSig = null;
    this._confirming = null;
    this._manualCopy = null;
    const backdrop = this.shadowRoot.getElementById("backdrop");
    if (backdrop) backdrop.hidden = true;
  }

  _bindEndpoint(id) {
    const d = this._data?.devices.find((x) => x.id === id);
    const eps = (d?.binding_endpoints || []).map((x) => x.endpoint);
    const chosen = Number(this._draft(`be:${id}`, eps[0]));
    return eps.includes(chosen) ? chosen : eps[0];
  }

  _infoLines(d, det) {
    const t = (k) => this._t(k);
    const net = d.network ? t(`net_${d.network}`) : null;
    const lines = [
      [t("f_vendor"), d.vendor],
      [t("f_model"), d.model],
      [t("f_description"), d.description],
      [t("f_type"), d.type ? (I18N[this._lang]?.[`type_${d.type}`] ?? d.type) : null],
      [t("f_network"), net],
      [t("f_bridge"), d.bridge],
      [t("f_node_id"), d.node_id],
      [t("f_endpoint"), d.endpoint],
      [t("f_sw"), d.sw_version],
      [t("f_hw"), d.hw_version],
      [t("f_part"), d.part_number],
      [t("f_serial"), d.serial],
      [t("f_thread_channel"), d.thread_channel],
      [t("f_thread_network"), d.thread_network],
      [t("f_wifi_channel"), d.wifi_channel],
      [t("f_signal"), d.signal !== null && d.signal !== undefined ? `${d.signal} dBm` : null],
      [t("f_battery"), d.battery !== null && d.battery !== undefined ? `${d.battery} %` : null],
      [t("f_voltage"), d.voltage !== null && d.voltage !== undefined ? `${d.voltage} mV` : null],
      [t("f_available"), d.available === null || d.available === undefined ? null : d.available ? t("yes") : t("no")],
      [t("f_last_seen"), this._relTime(d.last_seen)],
      [t("f_commissioned"), d.commissioned ? this._relTime(d.commissioned) : null],
      [t("f_ip"), det?.ip_addresses?.length ? det.ip_addresses.join(", ") : null],
    ];
    return lines.map(([k, v]) => this._line(k, esc(v))).join("");
  }

  _legacyCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
      this.shadowRoot.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (_e) {
      return false;
    }
  }

  // In die Zwischenablage kopieren. Ohne HTTPS verweigert der Browser den Zugriff: dann
  // erscheint der Text markiert in einem Feld zum manuellen Kopieren (Strg+C).
  async _copyText(text, doneMessage) {
    const value = String(text ?? "");
    if (!value) return false;
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch (_e) {
      ok = this._legacyCopy(value);
    }
    if (!ok) {
      this._manualCopy = value;
      this._open["p:entities"] = true;
      this._toast(this._t("copy_failed"), true);
      this._renderPopup(true);
      return false;
    }
    this._manualCopy = null;
    this._toast(doneMessage || this._t("copied", { v: value }));
    return true;
  }

  async _copyEntities(id) {
    const det = this._details[id];
    const ids = (det?.entities || []).map((e) => e.entity_id).filter(Boolean);
    if (!ids.length) return this._toast(this._t(det?.loading ? "loading" : "no_entities"), true);
    return this._copyText(ids.join("\n"), ids.length > 1 ? this._t("copied_n", { n: ids.length }) : undefined);
  }

  // Entitäten des Geräts in Home Assistant (zum Kopieren für Automationen und Skripte)
  _entitiesBody(det) {
    const t = (k) => this._t(k);
    if (!det || det.loading) return `<div class="hint">${esc(t("loading"))}</div>`;
    if (det.error) return `<div class="hint err">${esc(det.error)}</div>`;
    const ents = det.entities || [];
    const manual = this._manualCopy
      ? `<div class="field"><label>${esc(t("copy_manual"))}</label><textarea class="manual-copy" readonly rows="${Math.min(
          6,
          String(this._manualCopy).split("\n").length
        )}">${esc(this._manualCopy)}</textarea></div>`
      : "";
    if (!ents.length) return `${manual}<div class="hint">${esc(t("no_entities"))}</div>`;
    const lines = ents
      .map(
        (en) => `<div class="settings-line"><span class="ent"><code>${esc(en.entity_id)}</code>${
          en.name ? `<span class="muted">${esc(en.name)}</span>` : ""
        }</span><button class="btn icon" data-act="copy" data-text="${esc(en.entity_id)}" title="${esc(t("copy"))}" aria-label="${esc(t("copy"))}"><ha-icon icon="mdi:content-copy"></ha-icon></button></div>`
      )
      .join("");
    return `${manual}<div class="ent-list">${lines}</div>
      <div class="toolbar"><button class="btn small" data-act="copy_all"><ha-icon icon="mdi:content-copy"></ha-icon>${esc(t("copy_all"))}</button></div>
      <div class="hint">${esc(t("entities_hint"))}</div>`;
  }

  _functionsBody(d) {
    const t = (k) => this._t(k);
    const hasSwitch = !this._readOnly && (d.functions || []).some((f) => f.switchable);
    return `${this._fnLines(d)}<div class="hint">${esc(t(hasSwitch ? "fn_hint" : "fn_hint_ro"))}</div>`;
  }

  _renderPopup(force = false) {
    const backdrop = this.shadowRoot.getElementById("backdrop");
    const popup = this.shadowRoot.getElementById("popup");
    if (!backdrop || !popup) return;
    if (!this._selected || !this._data) {
      backdrop.hidden = true;
      return;
    }
    const d = this._data.devices.find((x) => x.id === this._selected);
    if (!d) {
      this._closePopup();
      return;
    }
    const det = this._details[d.id];
    const sig = JSON.stringify([d, det, this._confirming, this._readOnly, this._share[d.id], this._ping[d.id], this._data.fabrics, this._data.devices.length, [...this._fnPending.keys()], this._manualCopy]);
    if (!force && sig === this._popupSig && !backdrop.hidden) return;
    this._popupSig = sig;

    const focus = this._captureFocus();
    const scroll = popup.scrollTop;
    const ro = this._readOnly;
    const t = (k, v) => this._t(k, v);
    const sections = [];

    if (d.bridged) sections.push(`<div class="hint">${esc(t("bridged_hint"))}</div>`);
    sections.push(this._accordion("p:info", "mdi:information-outline", t("sec_info"), this._infoLines(d, det), { open: true }));

    // Eigener Kommentar (bearbeitbar; im Nur-Lesen-Modus nur Anzeige, wenn vorhanden)
    if (!ro || d.comment) {
      const body = ro
        ? `<div class="comment-text">${esc(d.comment)}</div>`
        : `<div class="field"><textarea class="comment-input" rows="4" maxlength="${COMMENT_MAX}" data-draft="comment:${esc(d.id)}" data-fk="comment" placeholder="${esc(t("comment_placeholder"))}">${esc(this._draft(`comment:${d.id}`, d.comment || ""))}</textarea>
             <span class="help">${esc(t("comment_hint", { n: COMMENT_MAX }))}</span></div>
           <div class="toolbar"><button class="btn primary small" data-act="save_comment">${esc(t("save"))}</button>${
             d.comment
               ? `<button class="btn small" data-act="delete_comment">${esc(t("comment_delete"))}</button>`
               : ""
           }</div>`;
      sections.push(
        this._accordion("p:comment", "mdi:comment-text-outline", t("sec_comment"), body, {
          open: Boolean(d.comment),
          meta: d.comment ? "✎" : "",
        })
      );
    }

    if (d.functions?.length) {
      sections.push(this._accordion("p:functions", "mdi:format-list-bulleted", t("sec_functions"), this._functionsBody(d), { meta: String(d.functions.length) }));
    }

    if (!ro) {
      sections.push(
        this._accordion("p:entities", "mdi:code-braces", t("sec_entities"), this._entitiesBody(det), {
          meta: det?.entities?.length ? String(det.entities.length) : "",
        })
      );
    }

    if (!ro) {
      const entities = det?.entities?.length
        ? `<div class="hint">${esc(t("rename_entities_hint", { n: det.entities.length }))}</div><div class="timeline" style="max-height:140px">${det.entities
            .map((en) => `<div class="timeline-item"><span>${esc(en.entity_id)}</span></div>`)
            .join("")}</div>`
        : det?.loading
          ? `<div class="hint">${esc(t("loading"))}</div>`
          : "";
      sections.push(
        this._accordion(
          "p:rename",
          "mdi:rename-box",
          t("rename"),
          `<div class="field"><label>${esc(t("new_name"))}</label><div class="field-row">
             <input type="text" maxlength="100" data-draft="rename:${esc(d.id)}" data-fk="rename" value="${esc(this._draft(`rename:${d.id}`, d.name))}" />
             <button class="btn primary small" data-act="rename">${esc(t("save"))}</button></div>
             <span class="help">${esc(t("rename_hint"))}</span></div>${entities}`
        )
      );
    }

    if (!d.bridged) {
      // Firmware
      const ota = d.ota;
      const progress =
        ota.state === "updating" && ota.progress !== null && ota.progress !== undefined
          ? `<div class="progress"><span style="width:${clamp(ota.progress, 0, 100)}%"></span></div>`
          : "";
      const notes = /^https:\/\//.test(ota.notes_url || "")
        ? `<div class="toolbar"><a class="btn small" href="${esc(ota.notes_url)}" target="_blank" rel="noopener noreferrer"><ha-icon icon="mdi:open-in-new"></ha-icon>${esc(t("release_notes"))}</a></div>`
        : "";
      const otaBody = ota.capable
        ? `<div class="settings-line"><span>${this._otaPill(ota)}</span><span class="settings-value">${esc(d.sw_version ?? "–")} → ${esc(ota.latest ?? "–")}</span></div>${progress}${
            ota.checked_at ? this._line(t("f_checked_ota"), esc(this._relTime(ota.checked_at))) : ""
          }${notes}${
            ro
              ? ""
              : `<div class="toolbar"><button class="btn" data-act="ota_check">${esc(t("check"))}</button>
                 <button class="btn primary" data-act="ota_update" data-confirm="ota_update:${esc(d.id)}" ${ota.state === "available" ? "" : "disabled"}>${esc(this._confirmLabel(`ota_update:${d.id}`, t("update_now")))}</button></div>
                 <div class="hint">${esc(t("update_confirm"))}</div>`
          }`
        : `<div class="hint">${esc(t("ota_unsupported"))}</div>`;
      sections.push(this._accordion("p:ota", "mdi:update", t("sec_firmware"), otaBody, { meta: ota.capable ? t(`ota_${ota.state || "unknown"}`) : "" }));

      // Bindings
      const bindLines = d.bindings.length
        ? d.bindings
            .map((b) => `<div class="settings-line"><span>${esc(b.cluster)} <span class="muted">· EP ${esc(b.endpoint)} →</span> ${esc(b.target)}</span>${
              ro
                ? ""
                : this._confirmButton(
                    `unbind:${d.id}:${b.endpoint}:${b.cluster_id}:${b.target_ref}`,
                    "unbind",
                    `data-id="${esc(d.id)}" data-ep="${esc(b.endpoint)}" data-target="${esc(b.target_ref)}" data-cluster="${esc(b.cluster_id)}"`,
                    t("unbind"),
                    "btn small danger"
                  )
            }</div>`)
            .join("")
        : `<div class="hint">${esc(t("no_bindings_device"))}</div>`;
      let bindForm = "";
      if (!ro && d.binding_endpoints.length) {
        const others = this._data.devices.filter((x) => x.id !== d.id && !x.bridged);
        const ep = this._bindEndpoint(d.id);
        const caps = d.binding_endpoints.find((x) => x.endpoint === ep)?.clusters || [];
        const epSelect =
          d.binding_endpoints.length > 1
            ? `<div class="field"><label>${esc(t("bind_endpoint"))}</label>
                 <select data-draft="be:${esc(d.id)}" data-change="bind_endpoint" data-fk="be">${d.binding_endpoints
                   .map((x) => `<option value="${x.endpoint}" ${x.endpoint === ep ? "selected" : ""}>EP ${x.endpoint}</option>`)
                   .join("")}</select></div>`
            : "";
        bindForm = `${epSelect}<div class="field"><label>${esc(t("bind_target"))}</label>
            <select data-draft="bt:${esc(d.id)}" data-fk="bt">
              <option value="">–</option>
              ${others.map((x) => `<option value="${esc(x.id)}" ${this._draft(`bt:${d.id}`) === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}
            </select></div>
          <div class="field"><label>${esc(t("bind_clusters"))}</label><div class="clusters">${caps
            .map((c) => `<label><input type="checkbox" data-draft="bc:${esc(d.id)}:${ep}:${esc(c.id)}" ${this._draft(`bc:${d.id}:${ep}:${c.id}`, false) ? "checked" : ""} />${esc(c.name)}</label>`)
            .join("")}</div></div>
          <div class="toolbar"><button class="btn" data-act="bind"><ha-icon icon="mdi:link-variant-plus"></ha-icon>${esc(t("bind"))}</button></div>
          <div class="hint">${esc(t("bind_hint"))}</div>`;
      }
      sections.push(this._accordion("p:bindings", "mdi:link-variant", t("tab_bindings"), bindLines + bindForm, { meta: String(d.bindings.length) }));

      // Fabrics (Multi-Admin) + Freigabe
      const mineFabrics = (this._data.fabrics || [])
        .map((f) => ({ f, m: f.members.find((x) => x.id === d.id) }))
        .filter((x) => x.m);
      const fabLines = mineFabrics.length
        ? mineFabrics
            .map(({ f, m }) => `<div class="settings-line"><span>${esc(this._fabricTitle(f))}${f.own ? ` <span class="badge" style="--c:var(--mmm-color-success)">${esc(t("fabric_own_badge"))}</span>` : ""}</span>${
              ro || f.own || m.fabric_index === null || m.fabric_index === undefined
                ? ""
                : this._confirmButton(
                    `fabric_remove:${d.id}:${m.fabric_index}`,
                    "fabric_remove",
                    `data-id="${esc(d.id)}" data-fabric="${esc(m.fabric_index)}"`,
                    t("fabric_remove"),
                    "btn small danger"
                  )
            }</div>`)
            .join("")
        : `<div class="hint">${esc(t("no_fabrics_device"))}</div>`;
      const share = this._share[d.id];
      const shareBox = share
        ? `${share.manual_code ? `<div class="field"><label>${esc(t("share_manual"))}</label><div class="codebox big">${esc(share.manual_code)}</div></div>` : ""}${
            share.qr_code ? `<div class="field"><label>${esc(t("share_qr"))}</label><div class="codebox">${esc(share.qr_code)}</div></div>` : ""
          }<div class="hint">${esc(t("share_valid", { n: Math.round((share.seconds || 300) / 60) }))}</div>`
        : "";
      const shareForm = ro
        ? ""
        : `<div class="hint">${esc(t("share_hint"))}</div>${shareBox}<div class="toolbar"><button class="btn" data-act="open_window"><ha-icon icon="mdi:share-variant"></ha-icon>${esc(t("share_open"))}</button></div>`;
      sections.push(this._accordion("p:fabrics", "mdi:home-group", t("sec_fabrics"), fabLines + shareForm, { meta: String(mineFabrics.length) }));

      // Diagnose
      if (!ro) {
        const ping = this._ping[d.id];
        sections.push(
          this._accordion(
            "p:diag",
            "mdi:stethoscope",
            t("sec_diag"),
            `${ping ? `<div class="hint">${esc(t("ping_result", { n: ping.reachable, m: ping.total }))}</div>` : ""}
             <div class="toolbar"><button class="btn" data-act="ping"><ha-icon icon="mdi:access-point-check"></ha-icon>${esc(t("ping"))}</button>
             <button class="btn" data-act="interview"><ha-icon icon="mdi:refresh"></ha-icon>${esc(t("interview"))}</button></div>
             <div class="hint">${esc(t("diag_hint"))}</div>`
          )
        );

        sections.push(
          this._accordion(
            "p:remove",
            "mdi:delete-outline",
            t("sec_remove"),
            `<div class="hint">${esc(t("remove_hint"))}</div>
             <div class="toolbar">${this._confirmButton(`remove:${d.id}`, "remove", "", t("remove"), "btn danger")}</div>`,
            { cls: "danger" }
          )
        );
      }
    }

    const headImg = this._deviceImage(d);
    const copyBtn = ro
      ? ""
      : `<button class="popup-close" data-act="copy_all" title="${esc(t("copy_entities"))}" aria-label="${esc(t("copy_entities"))}"><ha-icon icon="mdi:content-copy"></ha-icon></button>`;
    popup.innerHTML = `<div class="popup-head">${headImg}<ha-icon icon="${esc(d.icon || DEVICE_ICON[d.type] || DEFAULT_DEVICE_ICON)}"${headImg ? " hidden" : ""}></ha-icon>
        <span class="popup-title">${esc(d.name)}</span>${copyBtn}
        <button class="popup-close" data-act="close" aria-label="${esc(t("close"))}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="popup-body">${sections.join("")}</div>`;
    backdrop.hidden = false;
    popup.querySelectorAll("details[data-k]").forEach((el) => {
      el.addEventListener("toggle", () => {
        this._open[el.dataset.k] = el.open;
      });
    });
    popup.scrollTop = scroll;
    this._restoreFocus(focus);
  }
}

if (!customElements.get("matter-manager-card")) {
  customElements.define("matter-manager-card", MatterManagerCard);
}
/**
 * matter-manager-card-editor
 * --------------------------------
 * Grafischer Karten-Editor auf Basis von <ha-form> (wie bei fritzbox-anrufe):
 * die vielen Einstellungen sind in auf-/zuklappbare Gruppen (Akkordeon) sortiert,
 * `flatten: true` hält die gespeicherte Konfiguration flach (identische
 * YAML-Schlüssel). "Farben" ist ein natives <details> mit grafischer
 * Farbauswahl, Textfeld für beliebige CSS-Werte und "Alle zurücksetzen".
 */

const EDITOR_LABELS = {
  title: "Titel",
  entry_id: "Instanz (Eintrags-ID, nur bei mehreren Matter-Manager-Einträgen)",
  show_title: "Überschrift (Titel) anzeigen",
  show_devices: "Kategorie 'Geräte' anzeigen",
  show_battery: "Kategorie 'Batterie' anzeigen",
  show_updates: "Kategorie 'Updates' anzeigen",
  show_functions: "Kategorie 'Funktionen' anzeigen",
  show_fabrics: "Kategorie 'Fabrics' anzeigen",
  show_bindings: "Kategorie 'Bindings' anzeigen",
  show_network: "Kategorie 'Netzwerk' (Netzwerkkarte) anzeigen",
  show_bridge: "Kategorie 'Server' anzeigen",
  default_tab: "Beim Öffnen anzeigen",
  max_rows: "Max. Zeilen je Liste (0 = alle)",
  zoom: "Zoomfaktor der Karte (z. B. für Wandtablets)",
  show_stats: "Statistik-Chips (Geräte/Offline/Batterie/Updates/Thread/WLAN) anzeigen",
  show_images: "Gerätebilder anzeigen (sonst Symbole)",
  image_base: "Bildquelle (Ordner-URL oder lokaler Pfad, leer = Standard)",
  show_search: "Suchfeld anzeigen",
  show_filter_bar: "Sortierung auf der Karte anzeigen",
  default_sort: "Standard-Sortierung der Geräteliste",
  show_group_by: "Auswahl 'Gruppieren' anzeigen (Hersteller / Gerätename / Geräteklasse)",
  default_group_by: "Standard-Gruppierung der Listen",
  show_filters: "Filter-Bereich anzeigen (Status, Batterie, Signal, Hersteller, …)",
  show_model: "Modell anzeigen",
  show_vendor: "Hersteller anzeigen",
  show_node_id: "Node-ID anzeigen",
  show_signal: "Signalstärke (dBm) anzeigen",
  show_battery_value: "Batteriestand anzeigen",
  show_last_seen: "'Zuletzt gesehen' anzeigen",
  read_only: "Nur lesen (alle Bedienelemente zum Ändern ausblenden)",
  show_pairing: "Schaltfläche 'Gerät hinzufügen' in der Geräteliste anzeigen",
};

const EDITOR_HELPERS = {
  entry_id: "Leer lassen, wenn nur ein Matter-Manager-Eintrag eingerichtet ist.",
  title: "Leer lassen, um keine Überschrift anzuzeigen.",
  max_rows: "Bei gesetztem Wert erscheint unter der Liste 'Weitere anzeigen'.",
  show_images: "Matter liefert keine Produktbilder. Standardmäßig lädt die Karte sie von zigbee2mqtt.io (der Server sieht dabei Teilenummer bzw. Produktname). Ohne Treffer erscheint das Symbol. Zum Abschalten ausblenden oder eine eigene Quelle angeben.",
  image_base: "Leer = zigbee2mqtt.io. Eigene Quelle: https://… oder lokaler Pfad wie /local/matter-bilder/. Dateiname: Teilenummer oder Produktname + .png. Eigene Zuordnung je Gerät: device_images (nur YAML, siehe README).",
  default_group_by: "Gilt für Geräte, Batterie und Updates. In der Karte lässt sich die Gruppierung jederzeit umstellen.",
  read_only: "Blendet Schalter in den Funktionen, Umbenennen, Firmware-Installation, Binding-/Fabric-Änderungen, Gerät hinzufügen, Entfernen und Neu verbinden aus. Zusätzlich sind Aktionen ohnehin Administratoren vorbehalten.",
};

function computeEditorLabel(item) {
  return EDITOR_LABELS[item.name] || item.name;
}

function computeEditorHelper(item) {
  return EDITOR_HELPERS[item.name] || "";
}

const bool = (name) => ({ name, selector: { boolean: {} } });

const EDITOR_SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "entry_id", selector: { text: {} } },
  {
    name: "",
    type: "expandable",
    title: "Kategorien",
    icon: "mdi:filter-variant",
    flatten: true,
    expanded: true,
    schema: [
      bool("show_devices"),
      bool("show_battery"),
      bool("show_updates"),
      bool("show_functions"),
      bool("show_fabrics"),
      bool("show_bindings"),
      bool("show_network"),
      bool("show_bridge"),
      {
        name: "default_tab",
        selector: {
          select: {
            mode: "dropdown",
            options: TAB_ORDER.map((tab) => ({ value: tab, label: I18N.de[TAB_META[tab].label] })),
          },
        },
      },
    ],
  },
  {
    name: "",
    type: "expandable",
    title: "Darstellung",
    icon: "mdi:table-column",
    flatten: true,
    expanded: false,
    schema: [
      bool("show_title"),
      { name: "max_rows", selector: { number: { min: 0, max: 50, step: 1, mode: "slider" } } },
      { name: "zoom", selector: { number: { min: 0.5, max: 3, step: 0.1, mode: "slider" } } },
      bool("show_stats"),
      bool("show_images"),
      { name: "image_base", selector: { text: {} } },
      bool("show_search"),
      bool("show_filter_bar"),
      {
        name: "default_sort",
        selector: {
          select: {
            mode: "dropdown",
            options: SORT_OPTIONS.map((o) => ({ value: o.value, label: I18N.de[o.label] })),
          },
        },
      },
      bool("show_group_by"),
      {
        name: "default_group_by",
        selector: {
          select: {
            mode: "dropdown",
            options: GROUP_BY_OPTIONS.map((o) => ({ value: o.value, label: I18N.de[o.label] })),
          },
        },
      },
      bool("show_filters"),
      {
        name: "",
        type: "expandable",
        title: "Spalten der Geräteliste",
        icon: "mdi:view-column",
        flatten: true,
        expanded: false,
        schema: [
          bool("show_model"),
          bool("show_vendor"),
          bool("show_node_id"),
          bool("show_signal"),
          bool("show_battery_value"),
          bool("show_last_seen"),
        ],
      },
    ],
  },
  {
    name: "",
    type: "expandable",
    title: "Bearbeiten",
    icon: "mdi:pencil-lock",
    flatten: true,
    expanded: false,
    schema: [bool("read_only"), bool("show_pairing")],
  },
  // "Farben" wird nativ von MatterManagerCardEditor._buildColorSection() gerendert.
];

// --- Farben-Editor ----------------------------------------------------------
//
// fallbackHex ist nur eine Näherung fürs Editor-Swatch; der echte CSS-Fallback
// (inkl. Theme-Variable) steckt in COLOR_CONFIG_KEYS.
const CATEGORY_ICON_COLOR_NOTE =
  "Standard: folgt der Tab-Farbe (aktiv/inaktiv) – hier unabhängig vom Tab-Status fest einstellbar. Färbt auch die Zeilen-Symbole der Kategorie.";

const COLOR_EDITOR_FIELDS = [
  { key: "color_tab_active", label: "Aktiver Tab / Primäraktionen", fallbackHex: "#03a9f4" },
  { key: "color_success", label: "Gut (online, Signal gut, Batterie voll, aktuell)", fallbackHex: "#43a047" },
  { key: "color_warning", label: "Warnung (Batterie niedrig, Signal mittel, Update läuft)", fallbackHex: "#ff9800" },
  { key: "color_error", label: "Fehler (offline, Batterie kritisch, Signal schwach)", fallbackHex: "#db4437" },
  { key: "color_info", label: "Update verfügbar (Firmware, App-Version)", fallbackHex: "#039be5" },
  { key: "color_row_icon", label: "Symbole in allen Listen (überschreibt Kategorie-Symbolfarben)", fallbackHex: "#727272" },
  { key: "color_live_banner", label: "Banner-Hintergrund (Gerät hinzufügen, Firmware-Auftrag)", fallbackHex: "#03a9f4" },
  ...TAB_ORDER.map((tab) => ({
    key: `color_icon_${tab}`,
    label: `Symbol Kategorie '${I18N.de[TAB_META[tab].label]}'`,
    fallbackHex: "#727272",
    note: CATEGORY_ICON_COLOR_NOTE,
  })),
];

// <input type="color"> verlangt zwingend die 6-stellige #rrggbb-Form.
function normalizeHex(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length === 3) return "#" + h.split("").map((c) => c + c).join("");
  return "#" + h;
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

const COLOR_EDITOR_STYLES = `
  .mmm-color-editor { margin-top: 12px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px; padding: 0 12px; }
  .mmm-color-editor summary {
    display: flex; align-items: center; gap: 8px; padding: 12px 0; cursor: pointer;
    font-size: 16px; font-weight: 500; color: var(--primary-text-color, #212121); list-style: none;
  }
  .mmm-color-editor summary::-webkit-details-marker { display: none; }
  .mmm-color-editor summary::marker { display: none; }
  .mmm-color-editor summary > ha-icon:first-child { --mdc-icon-size: 24px; color: var(--secondary-text-color, #727272); }
  .mmm-color-editor-chevron { margin-left: auto; --mdc-icon-size: 24px; color: var(--secondary-text-color, #727272); transition: transform 0.2s ease; }
  .mmm-color-editor[open] > summary .mmm-color-editor-chevron { transform: rotate(180deg); }
  .mmm-color-editor-body { padding: 4px 0 12px; display: flex; flex-direction: column; gap: 12px; }
  .mmm-color-reset-row { display: flex; justify-content: flex-end; }
  .mmm-color-reset-button {
    display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px;
    padding: 6px 10px; background: none; color: var(--primary-text-color, #212121); font: inherit; font-size: 0.85em; cursor: pointer;
  }
  .mmm-color-reset-button:hover { background: var(--secondary-background-color, rgba(0, 0, 0, 0.04)); }
  .mmm-color-reset-button ha-icon { --mdc-icon-size: 16px; }
  .mmm-color-row { display: flex; flex-direction: column; gap: 4px; }
  .mmm-color-row-label { font-size: 0.9em; color: var(--primary-text-color, #212121); }
  .mmm-color-row-controls { display: flex; align-items: center; gap: 8px; }
  .mmm-color-row-controls input[type="color"] { width: 36px; height: 36px; padding: 0; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px; cursor: pointer; background: none; }
  .mmm-color-row-controls input[type="text"] {
    flex: 1 1 auto; min-width: 0; padding: 8px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px;
    font: inherit; color: var(--primary-text-color, #212121); background: var(--card-background-color, #fff); box-sizing: border-box;
  }
  .mmm-color-row-helper { font-size: 0.75em; color: var(--secondary-text-color, #727272); }
`;

class MatterManagerCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = withDefaults(config);
    this._renderConfig();
  }

  // Versionsanzeige oben im Editor (Karte + Integration, Hinweis bei neuer Version)
  _updateVersionBlock() {
    if (!this._versionEl) return;
    const app = this._app;
    const warn = "var(--warning-color, #ff9800)";
    const good = "var(--success-color, #43a047)";
    const parts = [`Karte <b>${escapeHtml(CARD_VERSION)}</b>`];
    if (app) parts.push(`Integration <b>${escapeHtml(app.version)}</b>`);
    let status = "";
    let color = "var(--secondary-text-color, #727272)";
    if (app?.update_available) {
      status = `Neue Version verfügbar: <b>${escapeHtml(app.latest_version)}</b> – Update über HACS`;
      color = warn;
    } else if (app && app.version !== CARD_VERSION) {
      status = "Karte und Integration haben unterschiedliche Versionen – Browser neu laden (Strg+F5)";
      color = warn;
    } else if (app?.latest_version && !app.check_failed) {
      status = "Aktuell";
      color = good;
    }
    this._versionEl.style.cssText = `display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;margin:0 0 12px;padding:8px 12px;border-radius:8px;border:1px solid ${color};color:${color};font-size:0.9em;`;
    this._versionEl.innerHTML = `<span style="color:var(--primary-text-color,#212121)">${parts.join(" · ")}</span>${status ? `<span>${status}</span>` : ""}`;
  }

  async _loadAppInfo() {
    if (this._appInfoRequested || !this._hass?.connection) return;
    this._appInfoRequested = true;
    try {
      const msg = { type: "matter_manager/subscribe" };
      if (this._config?.entry_id) msg.entry_id = this._config.entry_id;
      let unsub = null;
      let finished = false;
      unsub = await this._hass.connection.subscribeMessage((ev) => {
        if (ev?.kind !== "update" || finished) return;
        finished = true;
        this._app = ev.data?.app || null;
        this._updateVersionBlock();
        if (unsub) unsub();
      }, msg);
      if (finished) unsub();
    } catch (_e) {
      /* ohne laufende Integration bleibt nur die Kartenversion sichtbar */
    }
  }

  set hass(hass) {
    this._hass = hass;
    // Nur die hass-Referenz auffrischen – `.data` NICHT bei jedem hass-Tick
    // zurücksetzen, sonst werden Eingaben mitten im Tippen überschrieben.
    if (this._form) this._form.hass = hass;
    else this._renderConfig();
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _valueChanged(ev) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };
    // ha-form entfernt ein geleertes Textfeld aus der Konfiguration; dann würde der
    // Standardtitel wieder greifen. Ein bewusst leerer Titel wird daher als "" gespeichert.
    if (value.title === undefined || value.title === null) value.title = "";
    this._config = value;
    this._fire();
  }

  _renderConfig() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => this._valueChanged(ev));
      this._form.schema = EDITOR_SCHEMA;
      this._form.computeLabel = computeEditorLabel;
      this._form.computeHelper = computeEditorHelper;
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = this._config;

    if (!this._versionEl) {
      this._versionEl = document.createElement("div");
      this.insertBefore(this._versionEl, this._form);
      this._updateVersionBlock();
      this._loadAppInfo();
    }

    if (!this._colorSection) {
      this._colorSection = this._buildColorSection();
      this.appendChild(this._colorSection);
    }
    this._updateColorSection();
  }

  _buildColorSection() {
    const details = document.createElement("details");
    details.className = "mmm-color-editor";

    const style = document.createElement("style");
    style.textContent = COLOR_EDITOR_STYLES;
    details.appendChild(style);

    const summary = document.createElement("summary");
    summary.innerHTML =
      `<ha-icon icon="mdi:palette-outline"></ha-icon><span>Farben</span>` +
      `<ha-icon class="mmm-color-editor-chevron" icon="mdi:chevron-down"></ha-icon>`;
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "mmm-color-editor-body";
    details.appendChild(body);

    const resetRow = document.createElement("div");
    resetRow.className = "mmm-color-reset-row";
    resetRow.innerHTML =
      `<button type="button" class="mmm-color-reset-button"><ha-icon icon="mdi:restore"></ha-icon><span>Alle Farben zurücksetzen</span></button>`;
    resetRow.querySelector("button").addEventListener("click", () => this._resetAllColors());
    body.appendChild(resetRow);

    this._colorInputs = {};
    this._focusedColorKey = null;

    COLOR_EDITOR_FIELDS.forEach((field) => {
      const row = document.createElement("div");
      row.className = "mmm-color-row";
      row.innerHTML = `
        <div class="mmm-color-row-label">${escapeHtml(field.label)}</div>
        <div class="mmm-color-row-controls">
          <input type="color" class="mmm-color-swatch" aria-label="${escapeHtml(field.label)} (grafische Auswahl)" />
          <input type="text" class="mmm-color-text" placeholder="${escapeHtml(field.fallbackHex)}" />
        </div>
        <div class="mmm-color-row-helper"></div>`;
      const swatch = row.querySelector(".mmm-color-swatch");
      const text = row.querySelector(".mmm-color-text");

      swatch.addEventListener("input", () => {
        text.value = swatch.value;
        this._onColorFieldChange(field.key, swatch.value);
      });
      // Textfeld erst bei "change" (Verlassen/Enter) übernehmen, nicht pro Tastendruck
      text.addEventListener("change", () => this._onColorFieldChange(field.key, text.value));
      text.addEventListener("focus", () => {
        this._focusedColorKey = field.key;
      });
      text.addEventListener("blur", () => {
        if (this._focusedColorKey === field.key) this._focusedColorKey = null;
      });

      body.appendChild(row);
      this._colorInputs[field.key] = { row, swatch, text };
    });
    return details;
  }

  _onColorFieldChange(key, rawValue) {
    this._config = { ...this._config, [key]: rawValue };
    this._updateColorSection();
    this._fire();
  }

  _resetAllColors() {
    const cleared = {};
    COLOR_EDITOR_FIELDS.forEach((f) => {
      cleared[f.key] = "";
    });
    this._config = { ...this._config, ...cleared };
    this._focusedColorKey = null;
    this._updateColorSection();
    this._fire();
  }

  _updateColorSection() {
    if (!this._colorInputs) return;
    const cfg = this._config || {};
    COLOR_EDITOR_FIELDS.forEach((field) => {
      const inputs = this._colorInputs[field.key];
      if (!inputs) return;
      const raw = String(cfg[field.key] || "").trim();
      inputs.swatch.value = HEX_COLOR_RE.test(raw) ? normalizeHex(raw) : field.fallbackHex;
      if (this._focusedColorKey !== field.key) inputs.text.value = raw;
      const parts = [raw ? `Aktuell verwendet: ${raw}` : `Aktuell verwendet (Standard): ${field.fallbackHex}`];
      if (field.note) parts.push(field.note);
      inputs.row.querySelector(".mmm-color-row-helper").textContent = parts.join(" – ");
    });
  }
}

if (!customElements.get("matter-manager-card-editor")) {
  customElements.define("matter-manager-card-editor", MatterManagerCardEditor);
}

/**
 * matter-manager-panel
 * --------------------------------
 * Seitenleisten-Eintrag (Vollbild): zeigt die Karte mit den Standardeinstellungen.
 * Name und Ein-/Ausschalten stehen im Dialog „Konfigurieren“ der Integration; die
 * Eintrags-ID kommt aus der Panel-Konfiguration (panel.config.entry_id).
 */
class MatterManagerPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._panel = null;
    this._narrow = false;
    this._configured = false;
  }

  connectedCallback() {
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._menu) this._menu.hass = hass;
    if (this._card && this._configured) this._card.hass = hass;
  }

  get hass() {
    return this._hass;
  }

  set narrow(value) {
    this._narrow = Boolean(value);
    if (this._menu) this._menu.narrow = this._narrow;
  }

  set route(_route) {
    /* wird nicht benötigt */
  }

  set panel(panel) {
    this._panel = panel;
    this._apply();
  }

  _build() {
    if (this._root) return;
    this._root = this.attachShadow({ mode: "open" });
    this._root.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; height: 100%; background: var(--primary-background-color, #fafafa); }
        .bar { flex: none; display: flex; align-items: center; gap: 4px; box-sizing: border-box; height: 56px; padding: 0 12px;
          background: var(--app-header-background-color, var(--primary-color, #03a9f4)); color: var(--app-header-text-color, #fff);
          font-size: 20px; font-weight: 400; }
        .title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 4px; }
        .body { flex: 1; overflow: auto; padding: 16px; box-sizing: border-box; }
        .inner { max-width: 1200px; margin: 0 auto; }
      </style>
      <div class="bar"><ha-menu-button></ha-menu-button><div class="title"></div></div>
      <div class="body"><div class="inner"></div></div>`;
    this._menu = this._root.querySelector("ha-menu-button");
    this._titleEl = this._root.querySelector(".title");
    this._inner = this._root.querySelector(".inner");
    this._card = document.createElement("matter-manager-card");
    this._inner.appendChild(this._card);
    if (this._hass) this._menu.hass = this._hass;
    this._menu.narrow = this._narrow;
    this._apply();
  }

  _apply() {
    if (!this._card || !this._panel) return;
    const cfg = this._panel.config || {};
    this._titleEl.textContent = String(this._panel.title || "Matter Manager");
    if (!this._configured) {
      const config = { title: "", show_title: false };
      if (typeof cfg.entry_id === "string" && cfg.entry_id) config.entry_id = cfg.entry_id;
      this._card.setConfig(config);
      this._configured = true;
      if (this._hass) this._card.hass = this._hass;
    }
  }
}

if (!customElements.get("matter-manager-panel")) {
  customElements.define("matter-manager-panel", MatterManagerPanel);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "matter-manager-card")) {
  window.customCards.push({
    type: "matter-manager-card",
    name: "Matter Manager",
    description:
      "Matter-Geräte im Dashboard verwalten: Geräte, Batterie, Firmware-Updates, Fabrics, Bindings und Matter Server – jede Kategorie einzeln ein-/ausblendbar.",
    preview: false,
  });
}
// eslint-disable-next-line no-console
console.info(`%c MATTER-MANAGER-CARD %c v${CARD_VERSION} `, "background:#1f6fff;color:#fff", "background:#333;color:#fff");
