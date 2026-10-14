🇩🇪 Deutsch · [🇬🇧 English](README.en.md) · [🇳🇱 Nederlands](README.nl.md) · [🇫🇷 Français](README.fr.md)

# Matter Manager für Home Assistant

Matter-Geräte verwalten, ohne Home Assistant zu verlassen: Geräte, Batterien, Firmware-Updates, Fabrics (Multi-Admin), Bindings und Matter Server in einer Dashboard-Karte – als HACS-Integration. Aufbau und Design entsprechen dem [Zigbee2MQTT Manager](https://github.com/Meine-smarte-Welt/zigbee2mqtt_manager): Symbol-Kategorien, Zeilenlisten, Detail-Popup, Akkordeon-Abschnitte, grafischer Editor und frei einstellbare Farben.

## Inhalt

- [Funktionsumfang](#funktionsumfang)
- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
- [Die Karte](#die-karte)
- [Farben](#farben)
- [Services](#services)
- [Ereignisse für Automationen](#ereignisse-für-automationen)
- [Sensoren](#sensoren)
- [Versionsanzeige und Update-Hinweis](#versionsanzeige-und-update-hinweis)
- [Einstellungen der Integration](#einstellungen-der-integration)
- [Sicherheit](#sicherheit)
- [Bekannte Einschränkungen](#bekannte-einschränkungen)
- [Fehlerbehebung](#fehlerbehebung)
- [Versionshistorie](#versionshistorie)
- [Datei-Integrität](#datei-integrität-hash-kommentare)

## Funktionsumfang

Die Karte hat sechs Kategorien in einer Symbolleiste (unter ca. 480 px Kartenbreite nur Symbole). Jede Kategorie ist einzeln ein- und ausblendbar.

| Kategorie | Was es kann |
|---|---|
| **Geräte** | Liste mit Erreichbarkeit, Modell, Hersteller, Signalstärke (dBm), Batterie, „zuletzt gesehen“; Statistik-Chips als Filter (Offline / Batterie niedrig / Updates); Suche; Sortierung; **Filter** (Status, Strom, Signal, Netzwerk, Firmware, zuletzt gesehen, Ökosysteme, Hersteller, Gerätename, Geräteklasse) und **Gruppieren** nach Hersteller, Gerätename oder Geräteklasse; „Gerät hinzufügen“ |
| **Batterie** | Batteriegeräte, niedrigster Stand zuerst; Farben nach niedriger und kritischer Schwelle; Geräte ohne Prozentwert zeigen den Ladezustand (OK/Warnung/Kritisch) |
| **Updates** | Installierte vs. verfügbare Firmware; „Alle prüfen“ und „Alle nacheinander installieren“ als Hintergrundauftrag mit Fortschritt und Abbruch |
| **Fabrics** | Ökosysteme (Apple Home, Google Home, Alexa, …), mit denen die Geräte verbunden sind; Verbindung zu einem fremden Ökosystem lösen |
| **Bindings** | Übersicht aller Geräte-Verknüpfungen; Lösen; Neu verknüpfen im Geräte-Popup |
| **Server** (Zahnrad) | **App-Version** (Integration und Karte, mit farbigem Hinweis bei einer neuen Version), Matter-Server-Status, Gerät hinzufügen (Setup-Code), Fabric-Bezeichnung, Neu verbinden, Ereignisprotokoll |

**Geräte-Popup** (Tipp auf eine Zeile) mit Akkordeon-Abschnitten: Informationen · Umbenennen (mit Liste der betroffenen HA-Entitäten) · Firmware · Bindings · Fabrics (inkl. Freigabe für ein weiteres Ökosystem) · Diagnose (Erreichbarkeit prüfen, neu abfragen) · Entfernen.

Weitere Punkte:

- **Matter-Entsprechungen statt Zigbee-Begriffen:** Verfügbarkeit kommt vom Matter Server, die Signalstärke ist ein RSSI-Wert in dBm (WLAN bzw. Thread), Gruppen werden durch Fabrics ersetzt, der „Koordinator“ ist der Matter Server.
- **Geräte hinter Bridges** (z. B. Hue-Bridge) erscheinen eigenständig, sind aber schreibgeschützt: nur der Name in Home Assistant lässt sich ändern.
- **Zwischenspeicher:** „Zuletzt gesehen“ und der Update-Stand überleben einen Neustart.
- **Zwei-Klick-Bestätigung** statt Browser-Dialog bei riskanten Aktionen (Entfernen, Update, Neu verbinden, Lösen).
- **Nur lesen:** `read_only: true` blendet alle Bedienelemente zum Ändern aus (Wandtablets).
- **Zoom:** `zoom` skaliert die ganze Karte.
- **Sprachen:** Deutsch, Englisch, Niederländisch und Französisch (Integration und Karte, nach Home-Assistant-Sprache).
- **Diagnose-Download** mit anonymisierten Namen und IDs.

## Voraussetzungen

- Home Assistant **2025.6** oder neuer
- Ein laufender **Matter Server** (z. B. das Add-on „Matter Server“ oder der Container `python-matter-server`) mit WebSocket-Schnittstelle, API-Schema **8** oder neuer
- Die Standard-Integration **Matter** wird für die Geräte-Entitäten benötigt. Matter Manager nutzt dieselbe Server-Adresse und schlägt sie bei der Einrichtung automatisch vor.

## Installation

1. HACS → ⋮ → **Benutzerdefinierte Repositories** → URL dieses Repos, Kategorie **Integration**
2. „Matter Manager“ installieren, Home Assistant neu starten
3. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Matter Manager**
4. Adresse des Matter Servers prüfen (Standard `ws://core-matter-server:5580/ws`) und Schwelle für „Batterie niedrig“ wählen

Manuell: Ordner `custom_components/matter_manager` nach `<config>/custom_components/` kopieren.

## Die Karte

Die Integration liefert die Karte aus und trägt sie als Lovelace-Ressource ein (persistiert, mit `?v=<Version>` gegen veraltete Browser-Caches). Du musst nichts manuell hinzufügen. Läuft Lovelace im YAML-Modus, trage `/matter_manager/matter-manager-card.js` als Ressource vom Typ `module` ein. Hast Du 1.0.1 im YAML-Modus eingerichtet, ändere den alten Pfad `/matter_manager_files/…` auf diesen Pfad.

Karte hinzufügen: **Dashboard bearbeiten → Karte hinzufügen → „Matter Manager“**. Der grafische Editor gruppiert alle Einstellungen in auf-/zuklappbare Abschnitte (Kategorien, Darstellung mit Spalten, Bearbeiten, Farben). Es ist kein YAML nötig, aber möglich:

```yaml
type: custom:matter-manager-card
title: Matter Manager         # leer ("") = keine Überschrift
# entry_id: abc123            # nur bei mehreren Matter-Manager-Einträgen
show_devices: true
show_battery: true
show_updates: true
show_fabrics: true
show_bindings: true
show_bridge: true             # Kategorie „Server“
default_tab: devices          # devices | battery | updates | fabrics | bindings | bridge
max_rows: 0                   # 0 = alle, sonst „weitere anzeigen“
zoom: 1
show_stats: true
show_search: true
show_filter_bar: true         # Sortierauswahl
show_group_by: true           # Auswahl „Gruppieren“
default_group_by: none        # none | vendor | model | class
show_filters: true            # Filter-Bereich (Status, Batterie, Signal, Hersteller, …)
default_sort: name_asc        # name_asc | name_desc | battery_asc | signal_asc | last_seen_desc | last_seen_asc | ota
show_model: true
show_vendor: true
show_node_id: false
show_signal: true
show_battery_value: true
show_last_seen: true
read_only: false
show_pairing: true            # Schaltfläche „Gerät hinzufügen“
```

Weitere Beispiele: [`examples/`](examples/).

## Farben

Im Editor unter **Farben** (oder per `color_*`-Schlüssel). Jeder Wert darf Hex (`#ff9800`), `rgb()`, `hsl()` oder `var(--...)` sein. Leer bedeutet Theme-Standard. Ungültige Werte werden verworfen. Das Swatch öffnet den Farbwähler, das Textfeld nimmt beliebige CSS-Werte, „Alle Farben zurücksetzen“ leert alles.

| Schlüssel | Wirkung |
|---|---|
| `color_tab_active` | Aktiver Tab, Primär-Schaltflächen |
| `color_success` | Gut: online, Signal gut, Batterie voll, aktuell |
| `color_warning` | Warnung: Batterie niedrig, Signal mittel, Update läuft |
| `color_error` | Fehler: offline, Batterie kritisch, Signal schwach |
| `color_info` | Update verfügbar (Firmware, neue App-Version) |
| `color_row_icon` | Alle Listen-Symbole (überschreibt die Kategorie-Farben) |
| `color_live_banner` | Banner-Hintergrund (Gerät hinzufügen, Firmware-Auftrag) |
| `color_icon_devices`, `_battery`, `_updates`, `_fabrics`, `_bindings`, `_bridge` | Symbol der Kategorie – färbt Tab-Symbol und Zeilen-Symbole |

Ist `color_row_icon` gesetzt, gewinnt diese einheitliche Farbe.

## Services

Beide Services sind für Automationen gedacht. `entry_id` ist nur bei mehreren Einträgen nötig.

```yaml
action: matter_manager.commission
data:
  code: "MT:Y.K9042C00KA0648G00"   # QR-Text oder 11-/21-stelliger Code
  network_only: false              # true = kein Bluetooth
```

```yaml
action: matter_manager.check_updates
```

`check_updates` prüft alle OTA-fähigen Geräte im Hintergrund, nacheinander mit Abstand.

## Ereignisse für Automationen

Abschaltbar in den Integrations-Optionen („Home-Assistant-Ereignisse auslösen“). Beim Start wird nur der Ausgangszustand erfasst, es gibt dann keine Ereignisflut.

| Ereignis | Daten |
|---|---|
| `matter_manager_device_offline` / `_device_online` | `name`, `node_id`, `id` |
| `matter_manager_battery_low` | `name`, `node_id`, `id`, `battery` – beim Unterschreiten der Schwelle (`battery` ist leer, wenn das Gerät nur einen Ladezustand meldet) |
| `matter_manager_update_available` | `name`, `node_id`, `id`, `installed`, `latest` |
| `matter_manager_device_joined` / `_device_left` | `name`, `node_id` |

```yaml
triggers:
  - trigger: event
    event_type: matter_manager_battery_low
actions:
  - action: notify.mobile_app_handy
    data:
      message: "{{ trigger.event.data.name }}: Batterie {{ trigger.event.data.battery }} %"
```

## Sensoren

`Geräte`, `Offline-Geräte`, `Geräte mit niedriger Batterie`, `Geräte mit kritischer Batterie`, `Verfügbare Firmware-Updates` und `Fabrics`. Die Sensoren für Offline, Batterie und Updates tragen die Geräteliste als Attribut.

## Versionsanzeige und Update-Hinweis

Die installierte Version steht an drei Stellen: in der Karte unter **Server (Zahnrad) → App-Version**, oben im grafischen Karten-Editor und im Dialog **Konfigurieren** der Integration. Die Integration fragt beim Start und danach alle 12 Stunden bei GitHub ab (`api.github.com`, neuestes Release, ersatzweise das höchste Versions-Tag), ob eine neuere Version veröffentlicht wurde. Gibt es eine, wird das farbig hervorgehoben: orangefarbener Rahmen und Hinweis im Abschnitt, ein orangefarbenes „↑“ am Zahnrad-Symbol, eine Warnbox im Editor und ein Hinweis im Konfigurieren-Dialog. Die Aktualisierung selbst erfolgt wie gewohnt über HACS. Mit **Jetzt prüfen** lässt sich die Abfrage sofort auslösen. Ist GitHub nicht erreichbar, erscheint „Prüfung nicht möglich“; die Karte funktioniert unverändert weiter.

Weichen Karten- und Integrationsversion voneinander ab (veralteter Browser-Cache), wird auch das orange markiert.

## Einstellungen der Integration

Unter **Konfigurieren** (mit Anzeige der installierten Version): Schwelle „Batterie niedrig“, Schwelle „Batterie kritisch“ (muss kleiner oder gleich sein) und Ereignisse an/aus. Über **Neu konfigurieren** lässt sich die Adresse des Matter Servers ändern.

## Sicherheit

Alle schreibenden Aktionen (Umbenennen, Entfernen, Firmware, Bindings, Fabrics, Gerät hinzufügen, Neu verbinden, Versionsprüfung) und das Laden der Geräte-Details sind per WebSocket auf **Administratoren** beschränkt. Eingaben werden vom Backend geprüft (Setup-Code-Format, Namenslänge, bekannte Geräte, eigene Fabric nicht entfernbar). Beim Anlegen eines Bindings wird nur dann ein Zugriffseintrag (ACL) auf dem Zielgerät ergänzt, wenn dort bereits ein Administrator-Eintrag über CASE vorhanden ist, damit der Zugriff von Home Assistant nie verloren geht. Die Karte maskiert alle Texte; Farbwerte laufen durch eine Allowlist. Der angezeigte Setup-Code eines geöffneten Pairing-Fensters ist nur für Administratoren sichtbar und fünf Minuten gültig.

## Bekannte Einschränkungen

- **Version 1.0.2 wurde nicht an echter Hardware getestet.** Entwickelt wurde gegen die dokumentierte WebSocket-Schnittstelle des python-matter-server und gegen einen simulierten Server.
- **Hersteller und Gerätename** stammen aus den Basisdaten des Geräts (Herstellername und Produktname). Beginnt der Produktname mit dem Herstellernamen, wird er abgezogen; fehlt der Hersteller, wird er nur erkannt, wenn ein anderes Gerät denselben Herstellernamen meldet. Ohne diese Angaben erscheint das Gerät unter „Unbekannt“. Die Geräteklasse kommt aus den Gerätetypen der Endpunkte; Geräte mit unbekanntem Typ landen in „Sonstige“. Beides wurde nur mit simulierten Daten geprüft.
- **Schreibende Matter-Befehle sind ungeprüft:** das Format von `set_acl_entry`/`set_node_binding` (Bindings), `commission_with_code`, `open_commissioning_window` und `remove_matter_fabric` kann je nach Matter-Server-Version abweichen. Dann bleibt die Funktion wirkungslos oder meldet einen Fehler – lesende Funktionen sind davon nicht betroffen.
- **Keine Gruppen:** Zigbee-Gruppen haben in Matter keine direkte Entsprechung für diese Oberfläche; die Kategorie heißt stattdessen „Fabrics“.
- **Keine Gerätebilder:** Matter liefert keine Produktbilder, es werden Symbole nach Gerätetyp angezeigt.
- Signalstärke gibt es nur für WLAN- und Thread-Geräte (bei Thread: bester Nachbar). Bridge-Geräte und Ethernet-Geräte haben keinen Wert.
- Batteriegeräte (Thread, „schlafend“) holen Updates und Bindings oft erst nach Stunden bzw. nach einem Tastendruck ab.
- Die Entitäten-Vorschau beim Umbenennen findet Geräte über die Identifier der Matter-Integration und kann bei Sonderfällen leer bleiben.
- „Alle installieren“ wartet pro Gerät bis zu zwei Stunden auf das Ende des Updates.
- Neu entfernte Geräte, die nicht erreichbar sind, bleiben ggf. auf dem Gerät eingetragen und müssen zurückgesetzt werden.

## Fehlerbehebung

- **Karte nicht gefunden:** Browser-Cache leeren; unter Einstellungen → Dashboards → Ressourcen prüfen, ob `/matter_manager/…` vorhanden ist (im YAML-Modus manuell eintragen).
- **„Matter Server nicht verbunden“:** Adresse unter **Neu konfigurieren** prüfen. Die Verbindung wird automatisch neu aufgebaut; mit **Server → Wartung → Verbindung neu aufbauen** lässt sie sich sofort erzwingen.
- **„Matter-Server-Version zu alt“:** Matter Server aktualisieren (API-Schema 8 oder neuer).
- **Kein Signalwert:** Nur WLAN- und Thread-Geräte melden ihn; manche Geräte liefern ihn nicht.
- **„Keine Verbindung zur Integration“:** Ist die Integration geladen? Stimmt `entry_id`?
- Logs: `custom_components.matter_manager` auf `debug` stellen.

## Versionshistorie

| Version | Änderung |
|---|---|
| **1.0.2** | Ressourcenpfad der Karte korrigiert: `/matter_manager/matter-manager-card.js` statt `/matter_manager_files/…` (bestehende Einträge werden automatisch umgestellt). Hersteller und Gerätename werden aus der Typenbezeichnung gelesen. Neu: Filter und Gruppieren (Hersteller, Gerätename, Geräteklasse) wie im Zigbee2MQTT Manager. Französisch (Pull Request #1) |
| 1.0.1 | Erste Veröffentlichung auf GitHub: neues Icon und Logo, Niederländisch (Integration und Karte), README in drei Sprachen |
| 1.0.0 | Interner Stand vor der Veröffentlichung |

## Datei-Integrität (Hash-Kommentare)

Die erste Zeile jeder `.py`-, `.js`- und `.yaml`-Datei enthält einen SHA-256-Hash über den Rest der Datei. So lässt sich eine unbeabsichtigte oder fremde Änderung erkennen.

JSON-Dateien haben keine Kommentare. Ihre SHA-256-Hashes (über die komplette Datei, `sha256sum <datei>`):

| Datei | SHA-256 |
|---|---|
| `hacs.json` | `e719b176c5b44ea120e0d895d0719225612e43ab3ca6f462f98793383909ff5a` |
| `custom_components/matter_manager/manifest.json` | `4146283815cafdeda9cdca58461f7912a6f597e97fc9f76c80d0d1e85c74569e` |
| `custom_components/matter_manager/strings.json` | `aa57065c0ddee70f88cf5cab0b42d4a01f0f72fc9faab7571e9c1493562a4f73` |
| `custom_components/matter_manager/icons.json` | `6737652d58ff71ed9df9eecfde362f6a0f62d7b2b7243d985e1f06020e3c9eb5` |
| `custom_components/matter_manager/translations/de.json` | `aa57065c0ddee70f88cf5cab0b42d4a01f0f72fc9faab7571e9c1493562a4f73` |
| `custom_components/matter_manager/translations/en.json` | `9c457f38c2a7650a00908d6601906a34655facc5540e2ba516dfc2c0a047c3f6` |
| `custom_components/matter_manager/translations/nl.json` | `3d9ee90c1cac32673507fc2a6a9f74f6bc585e91359d8f4a7b1b6d36ca2e2218` |
| `custom_components/matter_manager/translations/fr.json` | `716c55a3e6d3eebb67ebcd9efa56483b4dfe12b92fe32f6050f800ef680469d5` |

## Lizenz

MIT
