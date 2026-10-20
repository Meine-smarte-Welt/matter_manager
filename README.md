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
- [Notification Center (optional)](#notification-center-optional)
- [Sensoren](#sensoren)
- [Versionsanzeige und Update-Hinweis](#versionsanzeige-und-update-hinweis)
- [Einstellungen der Integration](#einstellungen-der-integration)
- [Sicherheit](#sicherheit)
- [Bekannte Einschränkungen](#bekannte-einschränkungen)
- [Fehlerbehebung](#fehlerbehebung)
- [Versionshistorie](#versionshistorie)
- [Datei-Integrität](#datei-integrität-hash-kommentare)

## Funktionsumfang

Die Karte hat sieben Kategorien in einer Symbolleiste (unter ca. 480 px Kartenbreite nur Symbole). Jede Kategorie ist einzeln ein- und ausblendbar.

| Kategorie | Was es kann |
|---|---|
| **Geräte** | Liste mit Erreichbarkeit, Modell, Hersteller, Signalstärke (dBm), Batterie, „zuletzt gesehen“; Statistik-Chips als Filter (Offline / Batterie niedrig / Updates); Suche; Sortierung; **Filter** (Status, Strom, Signal, Netzwerk, Firmware, zuletzt gesehen, Ökosysteme, Hersteller, Gerätename, Geräteklasse) und **Gruppieren** nach Hersteller, Gerätename oder Geräteklasse; „Gerät hinzufügen“ |
| **Batterie** | Batteriegeräte, niedrigster Stand zuerst; Farben nach niedriger und kritischer Schwelle; Geräte ohne Prozentwert zeigen den Ladezustand (OK/Warnung/Kritisch) |
| **Updates** | Installierte vs. verfügbare Firmware; „Alle prüfen“ und „Alle nacheinander installieren“ als Hintergrundauftrag mit Fortschritt und Abbruch |
| **Funktionen** | Expose-Funktionen aller Geräte: **Schalter** (Ein/Aus) direkt in der Karte schaltbar, dazu Werte wie Helligkeit, Farbtemperatur, Temperatur, Luftfeuchte, Druck, Beleuchtungsstärke (lx), Präsenz sowie Schloss- und Rollladenstatus (nur lesbar); Filter (Alle / Schaltbar / An); der Schalter bleibt bis zur Rückmeldung des Geräts gesperrt (kein Doppelklick); bei Fehlern oder Offline-Geräten nicht schaltbar |
| **Fabrics** | Ökosysteme (Apple Home, Google Home, Alexa, …), mit denen die Geräte verbunden sind; Verbindung zu einem fremden Ökosystem lösen |
| **Bindings** | Übersicht aller Geräte-Verknüpfungen; Lösen; Neu verknüpfen im Geräte-Popup |
| **Server** (Zahnrad) | **App-Version** (Integration und Karte, mit farbigem Hinweis bei einer neuen Version), Matter-Server-Status, Gerät hinzufügen (Setup-Code), Fabric-Bezeichnung, Neu verbinden, Ereignisprotokoll, Notification Center (optional) |

**Geräte-Popup** (Tipp auf eine Zeile) mit Akkordeon-Abschnitten: Informationen · Umbenennen (mit Liste der betroffenen HA-Entitäten) · Firmware · Bindings · Funktionen · Entitäten (zum Kopieren in die Zwischenablage, für Automationen und Skripte) · Fabrics (inkl. Freigabe für ein weiteres Ökosystem) · Diagnose (Erreichbarkeit prüfen, neu abfragen) · Entfernen.

Weitere Punkte:

- **Matter-Entsprechungen statt Zigbee-Begriffen:** Verfügbarkeit kommt vom Matter Server, die Signalstärke ist ein RSSI-Wert in dBm (WLAN bzw. Thread), Gruppen werden durch Fabrics ersetzt, der „Koordinator“ ist der Matter Server.
- **Geräte hinter Bridges** (z. B. Hue-Bridge) erscheinen eigenständig; Name ändern und Funktionen schalten sind möglich, Firmware, Bindings und Fabrics bleiben gesperrt.
- **Gerätebilder:** Neben jeder Zeile und im Popup erscheint ein kleines Gerätebild. Matter liefert keine Produktbilder; die Karte probiert deshalb nacheinander Bildnamen aus Teilenummer, Produktname und Modell gegen die Bildbibliothek des Zigbee2MQTT-Projekts (`https://www.zigbee2mqtt.io/images/devices/<Modell>.png`). Schlägt alles fehl, erscheint das Symbol nach Gerätetyp. **Datenschutz:** Der Browser fragt dabei bei `zigbee2mqtt.io` Bilder ab und übermittelt dorthin Teilenummer bzw. Produktname der Geräte (Dein Browser, nicht Home Assistant). Mit `show_images: false` wird nichts abgefragt; `image_base` zeigt auf einen eigenen Server (z. B. `/local/geraete`), `device_images` ordnet einzelnen Geräten eigene Bild-URLs zu (nur YAML).
- **Funktionen und Zwischenablage:** Schalter werden nur über die Matter-Befehle „On“/„Off“ des OnOff-Clusters geschaltet. Schlösser lassen sich bewusst nicht bedienen. Im Popup kopiert die Schaltfläche pro Entität (oder „Alle kopieren“) die Entitäts-ID in die Zwischenablage; ist der Zugriff gesperrt (z. B. ohne HTTPS), erscheint ein Textfeld zum manuellen Kopieren.
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
show_functions: true
show_images: true             # Gerätebilder (Quelle siehe „Gerätebilder“)
# image_base: /local/geraete  # eigener Bildordner statt zigbee2mqtt.io
show_bridge: true             # Kategorie „Server“
default_tab: devices          # devices | battery | updates | functions | fabrics | bindings | bridge
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
| `color_icon_devices`, `_battery`, `_updates`, `_functions`, `_fabrics`, `_bindings`, `_bridge` | Symbol der Kategorie – färbt Tab-Symbol und Zeilen-Symbole |

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

## Notification Center (optional)

Der Matter Manager kann Meldungen an das separate **Notification Center** schicken. Es sammelt sie, sortiert sie nach Dringlichkeit und stellt sie zu. Die Verbindung ist **optional**: Ohne Notification Center passiert nichts, es gibt weder Fehler noch Log-Meldungen. Der Transport ist der Home-Assistant-Ereignisbus (Schnittstelle „Schema 1“, kein MQTT). Es werden keine Zugangsdaten gesendet.

Bedienen kannst Du das unter **Server (Zahnrad) → Notification Center** oder im Dialog **Konfigurieren**: ein Hauptschalter und ein Schalter je Meldungsart, nach Dringlichkeit sortiert (kritisch zuerst). Standard: alles an. Abgeschaltete Arten werden nicht gesendet; offene Meldungen dieser Art schließt das Notification Center selbst. Ist das Notification Center nicht installiert, bleiben die Schalter bedienbar und die Karte weist darauf hin. Mit `read_only: true` verschwinden die Schalter.

| Meldungsart | Dringlichkeit | Wann | Schließt sich |
|---|---|---|---|
| Matter Server nicht erreichbar | kritisch | Verbindung zum Matter Server verloren | wenn er wieder erreichbar ist |
| Batterie kritisch | kritisch | Batterie unter der kritischen Schwelle | wenn der Wert wieder darüber liegt |
| Gerät offline | Warnung | Gerät ist nicht erreichbar | wenn es wieder online ist |
| Batterie niedrig | Warnung | Batterie unter der niedrigen (aber nicht kritischen) Schwelle | wenn der Wert wieder darüber liegt |
| Firmware-Update verfügbar | Info | für ein Gerät gibt es ein Update | wenn keins mehr ansteht |
| Neues Gerät | Info | Gerät zum Matter Server hinzugefügt | einmalig, bleibt bis zum Quittieren |
| Gerät entfernt | Info | Gerät vom Matter Server entfernt | einmalig, bleibt bis zum Quittieren |

Dabei gilt:

- Beim Start wird nur der **Ausgangszustand** gemeldet (ohne Push), danach genau eine Meldung je Zustandswechsel. Es gelten die vorhandenen Batterie-Schwellen aus den Optionen; neue Schwellen gibt es nicht.
- Pro Meldung wird das Gerät als Betreff mitgesendet (damit das Notification Center später pro Gerät filtern kann). Die Texte in fünf Sprachen (Deutsch, Englisch, Niederländisch, Französisch, Spanisch) liefert die Integration einmalig beim Anmelden.
- Die Home-Assistant-Ereignisse `matter_manager_*` bleiben unverändert und unabhängig davon bestehen.
- **Teststand:** Die Anbindung wurde gegen einen simulierten Ereignisbus und im Headless-Browser geprüft, **nicht gegen ein echtes Notification Center und nicht an echter Hardware**.

## Sensoren

`Geräte`, `Offline-Geräte`, `Geräte mit niedriger Batterie`, `Geräte mit kritischer Batterie`, `Verfügbare Firmware-Updates` und `Fabrics`. Die Sensoren für Offline, Batterie und Updates tragen die Geräteliste als Attribut.

## Versionsanzeige und Update-Hinweis

Die installierte Version steht an drei Stellen: in der Karte unter **Server (Zahnrad) → App-Version**, oben im grafischen Karten-Editor und im Dialog **Konfigurieren** der Integration. Die Integration fragt beim Start und danach alle 12 Stunden bei GitHub ab (`api.github.com`, neuestes Release, ersatzweise das höchste Versions-Tag), ob eine neuere Version veröffentlicht wurde. Gibt es eine, wird das farbig hervorgehoben: orangefarbener Rahmen und Hinweis im Abschnitt, ein orangefarbenes „↑“ am Zahnrad-Symbol, eine Warnbox im Editor und ein Hinweis im Konfigurieren-Dialog. Die Aktualisierung selbst erfolgt wie gewohnt über HACS. Mit **Jetzt prüfen** lässt sich die Abfrage sofort auslösen. Ist GitHub nicht erreichbar, erscheint „Prüfung nicht möglich“; die Karte funktioniert unverändert weiter.

Weichen Karten- und Integrationsversion voneinander ab (veralteter Browser-Cache), wird auch das orange markiert.

Läuft eine **Beta- oder RC-Version** (z. B. `1.0.4b1`), berücksichtigt die Abfrage zusätzlich Pre-releases, denn GitHub liefert sie nicht als „neuestes Release“. In HACS siehst Du Pre-releases nur, wenn Du für die Integration **Beta-Versionen anzeigen** aktivierst.

## Einstellungen der Integration

Unter **Konfigurieren** (mit Anzeige der installierten Version): Schwelle „Batterie niedrig“, Schwelle „Batterie kritisch“ (muss kleiner oder gleich sein) und Ereignisse an/aus. Über **Neu konfigurieren** lässt sich die Adresse des Matter Servers ändern.

Zusätzlich im Dialog: **Meldungen an das Notification Center senden** (Hauptschalter) und **Gesendete Meldungsarten** (siehe [Notification Center](#notification-center-optional)). Änderungen an diesen beiden Schaltern werden ohne Neuladen der Integration übernommen.

## Sicherheit

Alle schreibenden Aktionen (Umbenennen, Entfernen, Schalten von Funktionen, Firmware, Bindings, Fabrics, Gerät hinzufügen, Neu verbinden, Versionsprüfung) und das Laden der Geräte-Details sind per WebSocket auf **Administratoren** beschränkt. Eingaben werden vom Backend geprüft (Setup-Code-Format, Namenslänge, bekannte Geräte, eigene Fabric nicht entfernbar). Beim Anlegen eines Bindings wird nur dann ein Zugriffseintrag (ACL) auf dem Zielgerät ergänzt, wenn dort bereits ein Administrator-Eintrag über CASE vorhanden ist, damit der Zugriff von Home Assistant nie verloren geht. Die Karte maskiert alle Texte; Farbwerte laufen durch eine Allowlist. Der angezeigte Setup-Code eines geöffneten Pairing-Fensters ist nur für Administratoren sichtbar und fünf Minuten gültig. Das Schalten ist auf Ein/Aus des OnOff-Clusters beschränkt, der Wert muss ein Wahrheitswert sein, das Gerät muss erreichbar sein; Schlösser und alle anderen Funktionen sind nur lesbar. Bildadressen aus `device_images` und `image_base` werden gegen unsichere Schemata (z. B. `javascript:`) geprüft.

Die Schalter für das Notification Center lassen sich per WebSocket nur als **Administrator** ändern; die Meldungsart wird gegen die Liste der bekannten Arten geprüft. Meldungen enthalten nur Gerätenamen und Werte wie den Batteriestand.

## Bekannte Einschränkungen

- **Version 1.0.4b1 ist eine Vorabversion (Beta) und wurde nicht an echter Hardware getestet.** Entwickelt wurde gegen die dokumentierte WebSocket-Schnittstelle des python-matter-server und gegen einen simulierten Server.
- **Notification Center:** Die Anbindung ist nur gegen einen simulierten Ereignisbus geprüft, nicht gegen ein echtes Notification Center. Karte und Integration-Dialog sind in Deutsch, Englisch, Niederländisch und Französisch übersetzt; für Spanisch liefert die Integration nur die Meldungstexte im Notification Center, die Karte zeigt dann Englisch.
- **Hersteller und Gerätename** stammen aus den Basisdaten des Geräts (Herstellername und Produktname). Beginnt der Produktname mit dem Herstellernamen, wird er abgezogen; fehlt der Hersteller, wird er nur erkannt, wenn ein anderes Gerät denselben Herstellernamen meldet. Ohne diese Angaben erscheint das Gerät unter „Unbekannt“. Die Geräteklasse kommt aus den Gerätetypen der Endpunkte; Geräte mit unbekanntem Typ landen in „Sonstige“. Beides wurde nur mit simulierten Daten geprüft.
- **Schreibende Matter-Befehle sind ungeprüft:** das Format von `set_acl_entry`/`set_node_binding` (Bindings), `commission_with_code`, `open_commissioning_window` und `remove_matter_fabric` kann je nach Matter-Server-Version abweichen. Dann bleibt die Funktion wirkungslos oder meldet einen Fehler – lesende Funktionen sind davon nicht betroffen.
- **Keine Gruppen:** Zigbee-Gruppen haben in Matter keine direkte Entsprechung für diese Oberfläche; die Kategorie heißt stattdessen „Fabrics“.
- **Gerätebilder:** Die Trefferquote der Bildbibliothek bei Matter-Geräten ist unbekannt; die Bildnamen sind Kandidaten, kein garantierter Treffer. Fehlt ein Bild, erscheint das Symbol. Der Abruf von `zigbee2mqtt.io` konnte in der Entwicklungsumgebung nicht geprüft werden.
- **Funktionen:** Das Auslesen der Funktions-Attribute und der Schaltbefehl (`device_command` On/Off) wurden nur mit simulierten Daten geprüft – **ungeprüft an echter Hardware**. Sensorwerte aktualisieren sich etwa im Minutentakt; Geräte hinter Bridges lassen sich nun schalten, wenn sie OnOff melden. Mit `read_only: true` verschwinden Schalter und Entitätsliste.
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
| **1.0.4b1** | **Vorabversion (Beta).** Neu: optionale Anbindung an das **Notification Center** (Schnittstelle „Schema 1“ über den Ereignisbus): Meldungsarten Server nicht erreichbar, Gerät offline, Batterie kritisch/niedrig, Firmware-Update, neues/entferntes Gerät; Hauptschalter und Schalter je Meldungsart in der Karte (Server → Notification Center) und im Dialog Konfigurieren, nach Dringlichkeit sortiert. Die Update-Prüfung versteht Beta/RC-Versionen und berücksichtigt bei einer Vorabversion auch Pre-releases. Nur mit simulierten Daten geprüft, nicht gegen ein echtes Notification Center und nicht an echter Hardware |
| **1.0.3** | Neu: kleine Gerätebilder (Kandidaten aus der Zigbee2MQTT-Bildbibliothek, abschaltbar, eigener Bildordner möglich), Kategorie **Funktionen** mit schaltbaren Ein/Aus-Schaltern und Messwerten, im Geräte-Popup die Abschnitte Funktionen und Entitäten mit Kopieren in die Zwischenablage. Neue Schlüssel `show_functions`, `show_images`, `image_base`, `device_images`, `color_icon_functions`. Nur mit simulierten Daten und im Headless-Browser geprüft, nicht an echter Hardware |
| **1.0.2** | Ressourcenpfad der Karte korrigiert: `/matter_manager/matter-manager-card.js` statt `/matter_manager_files/…` (bestehende Einträge werden automatisch umgestellt). Hersteller und Gerätename werden aus der Typenbezeichnung gelesen. Neu: Filter und Gruppieren (Hersteller, Gerätename, Geräteklasse) wie im Zigbee2MQTT Manager. Französisch (Pull Request #1) |
| 1.0.1 | Erste Veröffentlichung auf GitHub: neues Icon und Logo, Niederländisch (Integration und Karte), README in drei Sprachen |
| 1.0.0 | Interner Stand vor der Veröffentlichung |

## Datei-Integrität (Hash-Kommentare)

Die erste Zeile jeder `.py`-, `.js`- und `.yaml`-Datei enthält einen SHA-256-Hash über den Rest der Datei. So lässt sich eine unbeabsichtigte oder fremde Änderung erkennen.

JSON-Dateien haben keine Kommentare. Ihre SHA-256-Hashes (über die komplette Datei, `sha256sum <datei>`):

| Datei | SHA-256 |
|---|---|
| `hacs.json` | `e719b176c5b44ea120e0d895d0719225612e43ab3ca6f462f98793383909ff5a` |
| `custom_components/matter_manager/manifest.json` | `0c2ea17c34e1ab64c1e203cd3c126b4d7c9e490720c04d6ecf42a93bac8852e0` |
| `custom_components/matter_manager/strings.json` | `4e01f329df028416c3f0a01f1ffae7368696d5174ee79cf9a1df0913d7f84ef6` |
| `custom_components/matter_manager/icons.json` | `6737652d58ff71ed9df9eecfde362f6a0f62d7b2b7243d985e1f06020e3c9eb5` |
| `custom_components/matter_manager/translations/de.json` | `4e01f329df028416c3f0a01f1ffae7368696d5174ee79cf9a1df0913d7f84ef6` |
| `custom_components/matter_manager/translations/en.json` | `409d24178aa5e42827326f9ee89ba282a1331ff47b00701f960cdb18b4a1e505` |
| `custom_components/matter_manager/translations/nl.json` | `24ea02457146820b528ae61fb196df9447652a07d58c9b6b602f89fbd151d0e4` |
| `custom_components/matter_manager/translations/fr.json` | `88009891904b872bc1e1c5f5c166ce1f58cdcaa482573eef3b4466e256a7608a` |

## Lizenz

MIT
