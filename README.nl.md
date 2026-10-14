[🇩🇪 Deutsch](README.md) · [🇬🇧 English](README.en.md) · 🇳🇱 Nederlands · [🇫🇷 Français](README.fr.md)

# Matter Manager voor Home Assistant

Beheer Matter-apparaten zonder Home Assistant te verlaten: apparaten, batterijen, firmware-updates, fabrics (multi-admin), bindings en de Matter Server in één dashboardkaart – als HACS-integratie. Opbouw en ontwerp zijn gelijk aan de [Zigbee2MQTT Manager](https://github.com/Meine-smarte-Welt/zigbee2mqtt_manager): categorieën met pictogrammen, rijlijsten, detailpopup, accordeonsecties, grafische editor en vrij instelbare kleuren.

## Inhoud

- [Functies](#functies)
- [Vereisten](#vereisten)
- [Installatie](#installatie)
- [De kaart](#de-kaart)
- [Kleuren](#kleuren)
- [Services](#services)
- [Gebeurtenissen voor automatiseringen](#gebeurtenissen-voor-automatiseringen)
- [Sensoren](#sensoren)
- [Versieweergave en updatemelding](#versieweergave-en-updatemelding)
- [Instellingen van de integratie](#instellingen-van-de-integratie)
- [Beveiliging](#beveiliging)
- [Bekende beperkingen](#bekende-beperkingen)
- [Problemen oplossen](#problemen-oplossen)
- [Versiegeschiedenis](#versiegeschiedenis)
- [Bestandsintegriteit](#bestandsintegriteit-hash-opmerkingen)

## Functies

De kaart heeft zes categorieën in een pictogrammenbalk (onder ca. 480 px kaartbreedte alleen pictogrammen). Elke categorie kan afzonderlijk worden getoond of verborgen.

| Categorie | Wat het kan |
|---|---|
| **Apparaten** | Lijst met bereikbaarheid, model, fabrikant, signaalsterkte (dBm), batterij, „laatst gezien”; statistiekchips als filter (offline / batterij bijna leeg / updates); zoeken; sorteren; **filters** (status, voeding, signaal, netwerk, firmware, laatst gezien, ecosystemen, fabrikant, apparaatnaam, apparaatklasse) en **groeperen** op fabrikant, apparaatnaam of apparaatklasse; „Apparaat toevoegen” |
| **Batterij** | Apparaten op batterij, laagste stand eerst; kleuren volgens de drempels voor bijna leeg en kritiek; apparaten zonder percentage tonen de laadstatus (OK/waarschuwing/kritiek) |
| **Updates** | Geïnstalleerde vs. beschikbare firmware; „Alles controleren” en „Alles na elkaar installeren” als achtergrondtaak met voortgang en annuleren |
| **Fabrics** | Ecosystemen (Apple Home, Google Home, Alexa, …) waarmee de apparaten verbonden zijn; verbinding met een extern ecosysteem verbreken |
| **Bindings** | Overzicht van alle apparaatkoppelingen; loskoppelen; opnieuw koppelen in de apparaatpopup |
| **Server** (tandwiel) | **App-versie** (integratie en kaart, met een gekleurde melding bij een nieuwe versie), status van de Matter Server, apparaat toevoegen (setupcode), fabric-naam, opnieuw verbinden, gebeurtenissenlogboek |

**Apparaatpopup** (tik op een rij) met accordeonsecties: Informatie · Hernoemen (met lijst van de betrokken HA-entiteiten) · Firmware · Bindings · Fabrics (incl. delen met een ander ecosysteem) · Diagnose (bereikbaarheid controleren, opnieuw uitlezen) · Verwijderen.

Meer punten:

- **Matter-equivalenten in plaats van Zigbee-termen:** beschikbaarheid komt van de Matter Server, de signaalsterkte is een RSSI-waarde in dBm (wifi of Thread), groepen worden vervangen door fabrics, de „coördinator” is de Matter Server.
- **Apparaten achter bridges** (bijv. een Hue-bridge) verschijnen afzonderlijk, maar zijn alleen-lezen: alleen de naam in Home Assistant kan worden gewijzigd.
- **Cache:** „laatst gezien” en de updatestatus blijven na een herstart bewaard.
- **Bevestiging met twee klikken** in plaats van een browserdialoog bij riskante acties (verwijderen, update, opnieuw verbinden, loskoppelen).
- **Alleen-lezen:** `read_only: true` verbergt alle bedieningselementen die iets wijzigen (wandtablets).
- **Zoom:** `zoom` schaalt de hele kaart.
- **Talen:** Duits, Engels, Nederlands en Frans (integratie en kaart, volgens de taal van Home Assistant).
- **Diagnosedownload** met geanonimiseerde namen en ID's.

## Vereisten

- Home Assistant **2025.6** of nieuwer
- Een draaiende **Matter Server** (bijv. de add-on „Matter Server” of de container `python-matter-server`) met WebSocket-interface, API-schema **8** of nieuwer
- De standaardintegratie **Matter** is nodig voor de apparaatentiteiten. Matter Manager gebruikt hetzelfde serveradres en stelt het bij de installatie automatisch voor.

## Installatie

1. HACS → ⋮ → **Aangepaste repositories** → URL van deze repo, categorie **Integratie**
2. „Matter Manager” installeren, Home Assistant opnieuw starten
3. **Instellingen → Apparaten & diensten → Integratie toevoegen → Matter Manager**
4. Adres van de Matter Server controleren (standaard `ws://core-matter-server:5580/ws`) en de drempel voor „batterij bijna leeg” kiezen

Handmatig: kopieer de map `custom_components/matter_manager` naar `<config>/custom_components/`.

## De kaart

De integratie levert de kaart zelf en registreert hem als Lovelace-resource (blijvend, met `?v=<versie>` tegen verouderde browsercaches). Je hoeft niets handmatig toe te voegen. Draait Lovelace in YAML-modus, voeg dan `/matter_manager/matter-manager-card.js` toe als resource van het type `module`. Heb je 1.0.1 in YAML-modus ingesteld, wijzig dan het oude pad `/matter_manager_files/…` naar dit pad.

Kaart toevoegen: **Dashboard bewerken → Kaart toevoegen → „Matter Manager”**. De grafische editor groepeert alle instellingen in in- en uitklapbare secties (categorieën, weergave met kolommen, bewerken, kleuren). YAML is niet nodig, maar mogelijk:

```yaml
type: custom:matter-manager-card
title: Matter Manager         # leeg ("") = geen kop
# entry_id: abc123            # alleen bij meerdere Matter Manager-items
show_devices: true
show_battery: true
show_updates: true
show_fabrics: true
show_bindings: true
show_bridge: true             # categorie „Server”
default_tab: devices          # devices | battery | updates | fabrics | bindings | bridge
max_rows: 0                   # 0 = alle, anders „meer tonen”
zoom: 1
show_stats: true
show_search: true
show_filter_bar: true         # sorteerkeuze
show_group_by: true           # keuze „Groeperen”
default_group_by: none        # none | vendor | model | class
show_filters: true            # filtergedeelte (status, batterij, signaal, fabrikant, …)
default_sort: name_asc        # name_asc | name_desc | battery_asc | signal_asc | last_seen_desc | last_seen_asc | ota
show_model: true
show_vendor: true
show_node_id: false
show_signal: true
show_battery_value: true
show_last_seen: true
read_only: false
show_pairing: true            # knop „Apparaat toevoegen”
```

Meer voorbeelden: [`examples/`](examples/).

## Kleuren

In de editor onder **Farben** (kleuren) of via `color_*`-sleutels. Elke waarde mag hex (`#ff9800`), `rgb()`, `hsl()` of `var(--...)` zijn. Leeg betekent themastandaard. Ongeldige waarden worden genegeerd. Het kleurvlak opent de kleurkiezer, het tekstveld accepteert elke CSS-waarde, „alle kleuren resetten” wist alles.

| Sleutel | Werking |
|---|---|
| `color_tab_active` | Actief tabblad, primaire knoppen |
| `color_success` | Goed: online, goed signaal, volle batterij, actueel |
| `color_warning` | Waarschuwing: batterij bijna leeg, matig signaal, update bezig |
| `color_error` | Fout: offline, kritieke batterij, zwak signaal |
| `color_info` | Update beschikbaar (firmware, nieuwe app-versie) |
| `color_row_icon` | Alle lijstpictogrammen (overschrijft de categoriekleuren) |
| `color_live_banner` | Bannerachtergrond (apparaat toevoegen, firmwaretaak) |
| `color_icon_devices`, `_battery`, `_updates`, `_fabrics`, `_bindings`, `_bridge` | Pictogram van de categorie – kleurt het tabpictogram en de rijpictogrammen |

Is `color_row_icon` ingesteld, dan wint deze uniforme kleur.

## Services

Beide services zijn bedoeld voor automatiseringen. `entry_id` is alleen nodig bij meerdere items.

```yaml
action: matter_manager.commission
data:
  code: "MT:Y.K9042C00KA0648G00"   # QR-tekst of code van 11/21 cijfers
  network_only: false              # true = geen Bluetooth
```

```yaml
action: matter_manager.check_updates
```

`check_updates` controleert alle OTA-geschikte apparaten op de achtergrond, na elkaar en met tussenpozen.

## Gebeurtenissen voor automatiseringen

Uit te schakelen in de integratieopties („Home Assistant-gebeurtenissen activeren”). Bij de start wordt alleen de beginstatus vastgelegd, er komt dus geen vloed aan gebeurtenissen.

| Gebeurtenis | Gegevens |
|---|---|
| `matter_manager_device_offline` / `_device_online` | `name`, `node_id`, `id` |
| `matter_manager_battery_low` | `name`, `node_id`, `id`, `battery` – bij het onderschrijden van de drempel (`battery` is leeg als het apparaat alleen een laadstatus meldt) |
| `matter_manager_update_available` | `name`, `node_id`, `id`, `installed`, `latest` |
| `matter_manager_device_joined` / `_device_left` | `name`, `node_id` |

```yaml
triggers:
  - trigger: event
    event_type: matter_manager_battery_low
actions:
  - action: notify.mobile_app_telefoon
    data:
      message: "{{ trigger.event.data.name }}: batterij {{ trigger.event.data.battery }} %"
```

## Sensoren

`Apparaten`, `Offline apparaten`, `Apparaten met bijna lege batterij`, `Apparaten met kritieke batterij`, `Beschikbare firmware-updates` en `Fabrics`. De sensoren voor offline, batterij en updates dragen de apparatenlijst als attribuut.

## Versieweergave en updatemelding

De geïnstalleerde versie staat op drie plekken: in de kaart onder **Server (tandwiel) → App-versie**, bovenaan in de grafische kaarteditor en in het dialoogvenster **Configureren** van de integratie. De integratie vraagt bij de start en daarna elke 12 uur aan GitHub (`api.github.com`, nieuwste release, anders de hoogste versietag) of er een nieuwere versie is gepubliceerd. Is die er, dan wordt dit gekleurd weergegeven: oranje rand en melding in de sectie, een oranje „↑” bij het tandwielpictogram, een waarschuwingsvak in de editor en een melding in het configuratiedialoogvenster. De update zelf gaat zoals gebruikelijk via HACS. Met **Nu controleren** start je de controle direct. Is GitHub niet bereikbaar, dan verschijnt „Controle niet mogelijk”; de kaart blijft gewoon werken.

Verschillen de versies van kaart en integratie (verouderde browsercache), dan wordt dat ook oranje gemarkeerd.

## Instellingen van de integratie

Onder **Configureren** (met weergave van de geïnstalleerde versie): drempel „batterij bijna leeg”, drempel „batterij kritiek” (moet kleiner dan of gelijk zijn) en gebeurtenissen aan/uit. Via **Opnieuw configureren** wijzig je het adres van de Matter Server.

## Beveiliging

Alle schrijfacties (hernoemen, verwijderen, firmware, bindings, fabrics, apparaat toevoegen, opnieuw verbinden, versiecontrole) en het laden van de apparaatdetails zijn via WebSocket beperkt tot **beheerders**. Invoer wordt door de backend gecontroleerd (formaat van de setupcode, naamlengte, bekende apparaten, eigen fabric kan niet worden verwijderd). Bij het aanmaken van een binding wordt alleen een toegangsitem (ACL) op het doelapparaat toegevoegd als daar al een beheerdersitem via CASE bestaat, zodat Home Assistant nooit de toegang verliest. De kaart maskeert alle teksten; kleurwaarden lopen door een allowlist. De getoonde setupcode van een open koppelvenster is alleen zichtbaar voor beheerders en vijf minuten geldig.

## Bekende beperkingen

- **Versie 1.0.2 is niet op echte hardware getest.** Ontwikkeld is tegen de gedocumenteerde WebSocket-interface van python-matter-server en tegen een gesimuleerde server.
- **Fabrikant en apparaatnaam** komen uit de basisgegevens van het apparaat (fabrikantnaam en productnaam). Begint de productnaam met de fabrikantnaam, dan wordt die eraf gehaald; ontbreekt de fabrikant, dan wordt deze alleen herkend als een ander apparaat dezelfde fabrikantnaam meldt. Zonder deze gegevens verschijnt het apparaat onder „Onbekend”. De apparaatklasse komt uit de apparaattypen van de endpoints; apparaten met een onbekend type komen onder „Overig”. Beide zijn alleen met gesimuleerde gegevens gecontroleerd.
- **Schrijvende Matter-commando's zijn ongetest:** het formaat van `set_acl_entry`/`set_node_binding` (bindings), `commission_with_code`, `open_commissioning_window` en `remove_matter_fabric` kan per versie van de Matter Server verschillen. Dan heeft de functie geen effect of meldt hij een fout – lezende functies worden hierdoor niet beïnvloed.
- **Geen groepen:** Zigbee-groepen hebben in Matter geen directe equivalent voor deze interface; de categorie heet daarom „Fabrics”.
- **Geen apparaatafbeeldingen:** Matter levert geen productafbeeldingen, er worden pictogrammen per apparaattype getoond.
- Signaalsterkte bestaat alleen voor wifi- en Thread-apparaten (bij Thread: beste buur). Bridge- en ethernetapparaten hebben geen waarde.
- Apparaten op batterij (Thread, „slapend”) halen updates en bindings vaak pas na uren of na een druk op de knop op.
- De entiteitenvoorbeeldweergave bij het hernoemen vindt apparaten via de identifiers van de Matter-integratie en kan in speciale gevallen leeg blijven.
- „Alles installeren” wacht per apparaat maximaal twee uur op het einde van de update.
- Onlangs verwijderde apparaten die niet bereikbaar zijn, blijven mogelijk op het apparaat geregistreerd en moeten worden gereset.

## Problemen oplossen

- **Kaart niet gevonden:** browsercache wissen; controleer onder Instellingen → Dashboards → Resources of `/matter_manager/…` bestaat (in YAML-modus handmatig toevoegen).
- **„Matter Server niet verbonden”:** controleer het adres onder **Opnieuw configureren**. De verbinding wordt automatisch hersteld; met **Server → Onderhoud → Verbinding opnieuw opbouwen** forceer je dat direct.
- **„Matter Server-versie te oud”:** werk de Matter Server bij (API-schema 8 of nieuwer).
- **Geen signaalwaarde:** alleen wifi- en Thread-apparaten melden die; sommige apparaten leveren hem niet.
- **„Geen verbinding met de integratie”:** is de integratie geladen? Klopt `entry_id`?
- Logs: zet `custom_components.matter_manager` op `debug`.

## Versiegeschiedenis

| Versie | Wijziging |
|---|---|
| **1.0.2** | Resourcepad van de kaart gecorrigeerd: `/matter_manager/matter-manager-card.js` in plaats van `/matter_manager_files/…` (bestaande items worden automatisch omgezet). Fabrikant en apparaatnaam worden uit de typeaanduiding gelezen. Nieuw: filters en groeperen (fabrikant, apparaatnaam, apparaatklasse) zoals in de Zigbee2MQTT Manager. Frans (pull request #1) |
| 1.0.1 | Eerste publicatie op GitHub: nieuw pictogram en logo, Nederlands (integratie en kaart), README in drie talen |
| 1.0.0 | Interne stand vóór de publicatie |

## Bestandsintegriteit (hash-opmerkingen)

De eerste regel van elk `.py`-, `.js`- en `.yaml`-bestand bevat een SHA-256-hash van de rest van het bestand. Zo is een onbedoelde of vreemde wijziging te herkennen.

JSON-bestanden hebben geen opmerkingen. Hun SHA-256-hashes (over het volledige bestand, `sha256sum <bestand>`) staan in de [Duitse README](README.md#datei-integrität-hash-kommentare).

## Licentie

MIT
