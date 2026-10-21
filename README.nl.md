<h2 align="center"><a href="README.md">🇩🇪 Deutsch</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="README.en.md">🇬🇧 English</a>&nbsp;&nbsp;·&nbsp;&nbsp;🇳🇱 <b>[ Nederlands ]</b>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="README.fr.md">🇫🇷 Français</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="README.es.md">🇪🇸 Español</a></h2>

<p align="center"><img src="https://raw.githubusercontent.com/Meine-smarte-Welt/matter_manager/main/docs/images/matter-manager-banner.webp" alt="Matter Manager" width="420"></p>

# Matter Manager voor Home Assistant

Beheer Matter-apparaten zonder Home Assistant te verlaten: apparaten, batterijen, firmware-updates, fabrics (multi-admin), bindings en de Matter Server in één dashboardkaart – als HACS-integratie. Opbouw en ontwerp zijn gelijk aan de [Zigbee2MQTT Manager](https://github.com/Meine-smarte-Welt/zigbee2mqtt_manager): categorieën met pictogrammen, rijlijsten, detailpopup, accordeonsecties, grafische editor en vrij instelbare kleuren.

📖 **Uitgebreid artikel met handleiding en achtergronden (in het Duits):** [Matter Manager voor Home Assistant op Meine smarte Welt](https://meinesmartewelt.de/matter-manager-home-assistant/)

## Schermafbeeldingen

<table>
<tr>
<td align="center" valign="top"><img src="https://raw.githubusercontent.com/Meine-smarte-Welt/matter_manager/main/docs/images/screenshot-geraeteuebersicht.webp" alt="Apparatenoverzicht met statistiekchips, zoeken, sorteren en filters" width="340"><br><sub>Apparatenoverzicht met statistiekchips, zoeken, sorteren en filters</sub></td>
<td align="center" valign="top"><img src="https://raw.githubusercontent.com/Meine-smarte-Welt/matter_manager/main/docs/images/screenshot-karten-editor.webp" alt="Kaarteditor met versieblok en categorieën" width="340"><br><sub>Kaarteditor met versieblok en categorieën</sub></td>
</tr>
</table>

<sub>De schermafbeeldingen komen uit versie 1.0.3.</sub>

## Inhoud

- [Functies](#functies)
- [Vereisten](#vereisten)
- [Installatie](#installatie)
- [De kaart](#de-kaart)
- [Kleuren](#kleuren)
- [Services](#services)
- [Gebeurtenissen voor automatiseringen](#gebeurtenissen-voor-automatiseringen)
- [Notification Center (optioneel)](#notification-center-optioneel)
- [Sensoren](#sensoren)
- [Versieweergave en updatemelding](#versieweergave-en-updatemelding)
- [Instellingen van de integratie](#instellingen-van-de-integratie)
- [Beveiliging](#beveiliging)
- [Bekende beperkingen](#bekende-beperkingen)
- [Problemen oplossen](#problemen-oplossen)
- [Versiegeschiedenis](#versiegeschiedenis)
- [Bestandsintegriteit](#bestandsintegriteit-hash-opmerkingen)

## Functies

De kaart heeft zeven categorieën in een pictogrammenbalk (onder ca. 480 px kaartbreedte alleen pictogrammen). Elke categorie kan afzonderlijk worden getoond of verborgen.

| Categorie | Wat het kan |
|---|---|
| **Apparaten** | Lijst met bereikbaarheid, model, fabrikant, signaalsterkte (dBm), batterij, „laatst gezien”; statistiekchips als filter (offline / batterij bijna leeg / updates); zoeken; sorteren; **filters** (status, voeding, signaal, netwerk, firmware, laatst gezien, ecosystemen, fabrikant, apparaatnaam, apparaatklasse) en **groeperen** op fabrikant, apparaatnaam of apparaatklasse; „Apparaat toevoegen” |
| **Batterij** | Apparaten op batterij, laagste stand eerst; kleuren volgens de drempels voor bijna leeg en kritiek; apparaten zonder percentage tonen de laadstatus (OK/waarschuwing/kritiek) |
| **Updates** | Geïnstalleerde vs. beschikbare firmware; „Alles controleren” en „Alles na elkaar installeren” als achtergrondtaak met voortgang en annuleren |
| **Functies** | Expose-functies van alle apparaten: **schakelaars** (aan/uit) direct in de kaart te bedienen, plus waarden zoals helderheid, kleurtemperatuur, temperatuur, luchtvochtigheid, druk, verlichtingssterkte (lx), aanwezigheid, slot- en rolluikstatus (alleen-lezen); filter (Alle / Schakelbaar / Aan); een schakelaar blijft vergrendeld tot het apparaat terugmeldt (geen dubbelklik); bij fouten of offline-apparaten niet schakelbaar |
| **Fabrics** | Ecosystemen (Apple Home, Google Home, Alexa, …) waarmee de apparaten verbonden zijn; verbinding met een extern ecosysteem verbreken |
| **Bindings** | Overzicht van alle apparaatkoppelingen; loskoppelen; opnieuw koppelen in de apparaatpopup |
| **Server** (tandwiel) | **App-versie** (integratie en kaart, met een gekleurde melding bij een nieuwe versie), status van de Matter Server, apparaat toevoegen (setupcode), fabric-naam, opnieuw verbinden, gebeurtenissenlogboek, Notification Center (optioneel) |

**Apparaatpopup** (tik op een rij) met accordeonsecties: Informatie · Opmerking (bewerkbaar) · Hernoemen (met lijst van de betrokken HA-entiteiten) · Firmware · Bindings · Functies · Entiteiten (kopiëren naar het klembord voor automatiseringen en scripts) · Fabrics (incl. delen met een ander ecosysteem) · Diagnose (bereikbaarheid controleren, opnieuw uitlezen) · Verwijderen.

Meer punten:

- **Matter-equivalenten in plaats van Zigbee-termen:** beschikbaarheid komt van de Matter Server, de signaalsterkte is een RSSI-waarde in dBm (wifi of Thread), groepen worden vervangen door fabrics, de „coördinator” is de Matter Server.
- **Eigen item in de zijbalk (nieuw in 1.1.1):** Matter Manager verschijnt als eigen item in de zijbalk van Home Assistant. De naam is vrij te kiezen (standaard „Matter Manager”) en wordt gewijzigd in het dialoogvenster **Configureren**; bij meerdere items kun je elk item apart een naam geven. Het item kan ook worden verborgen.
- **Apparaten achter bridges** (bijv. een Hue-bridge) verschijnen afzonderlijk; hernoemen en functies schakelen is mogelijk, firmware, bindings en fabrics blijven vergrendeld.
- **Apparaatafbeeldingen:** Naast elke rij en in de popup staat een kleine afbeelding van het apparaat. Matter levert geen productafbeeldingen; de kaart probeert daarom achtereenvolgens afbeeldingsnamen uit onderdeelnummer, productnaam en model tegen de afbeeldingenbibliotheek van het Zigbee2MQTT-project (`https://www.zigbee2mqtt.io/images/devices/<model>.png`). Lukt niets, dan verschijnt het pictogram per apparaattype. **Privacy:** je browser (niet Home Assistant) vraagt afbeeldingen op bij `zigbee2mqtt.io` en verstuurt daarbij het onderdeelnummer of de productnaam van de apparaten. Met `show_images: false` wordt niets opgevraagd; `image_base` wijst naar een eigen server (bijv. `/local/apparaten`), `device_images` wijst aan afzonderlijke apparaten eigen afbeeldings-URL's toe (alleen YAML).
- **Functies en klembord:** Schakelaars worden alleen geschakeld via de Matter-commando's „On”/„Off” van het OnOff-cluster. Sloten kunnen bewust niet worden bediend. In de popup kopieert de knop per entiteit (of „Alles kopiëren”) de entiteits-ID naar het klembord; is toegang geblokkeerd (bijv. zonder HTTPS), dan verschijnt een tekstveld om handmatig te kopiëren.
- **Opmerkingen:** In de apparaatpopup staat een sectie “Opmerking” voor een eigen notitie (tot 1000 tekens) die je altijd kunt bewerken en wissen. Ze wordt in de opslag van Home Assistant bewaard (niet op het apparaat), is doorzoekbaar en komt niet in de diagnose-download. Alleen beheerders kunnen wijzigen; met `read_only: true` wordt een bestaande opmerking alleen getoond.
- **Cache:** „laatst gezien” en de updatestatus blijven na een herstart bewaard.
- **Bevestiging met twee klikken** in plaats van een browserdialoog bij riskante acties (verwijderen, update, opnieuw verbinden, loskoppelen).
- **Alleen-lezen:** `read_only: true` verbergt alle bedieningselementen die iets wijzigen (wandtablets).
- **Zoom:** `zoom` schaalt de hele kaart.
- **Talen:** Nederlands, Duits, Engels, Frans en Spaans (integratie en kaart, volgens de taal van Home Assistant).
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
show_functions: true
show_images: true             # apparaatafbeeldingen (bron: zie „Apparaatafbeeldingen”)
# image_base: /local/apparaten  # eigen afbeeldingenmap i.p.v. zigbee2mqtt.io
show_bridge: true             # categorie „Server”
default_tab: devices          # devices | battery | updates | functions | fabrics | bindings | bridge
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
| `color_icon_devices`, `_battery`, `_updates`, `_functions`, `_fabrics`, `_bindings`, `_bridge` | Pictogram van de categorie – kleurt het tabpictogram en de rijpictogrammen |

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

## Notification Center (optioneel)

Matter Manager kan meldingen sturen naar het afzonderlijke **Notification Center**. Dat verzamelt ze, sorteert ze op urgentie en bezorgt ze. De koppeling is **optioneel**: zonder Notification Center gebeurt er niets – geen fouten en geen logmeldingen. Het transport is de Home Assistant-eventbus (interface “schema 1”, geen MQTT). Er worden geen inloggegevens verzonden.

Je bedient dit onder **Server (tandwiel) → Notification Center** of in het dialoogvenster **Configureren**: één hoofdschakelaar en een schakelaar per meldingstype, gesorteerd op urgentie (kritiek eerst). Standaard: alles aan. Uitgeschakelde typen worden niet verzonden; openstaande meldingen van dat type sluit het Notification Center zelf. Is het Notification Center niet geïnstalleerd, dan blijven de schakelaars bruikbaar en meldt de kaart dat. Met `read_only: true` verdwijnen de schakelaars.

| Meldingstype | Urgentie | Wanneer | Sluit |
|---|---|---|---|
| Matter Server niet bereikbaar | kritiek | verbinding met de Matter Server verloren | als hij weer bereikbaar is |
| Batterij kritiek | kritiek | batterij onder de kritieke drempel | als de waarde er weer boven ligt |
| Apparaat offline | waarschuwing | apparaat is niet bereikbaar | als het weer online is |
| Batterij laag | waarschuwing | batterij onder de lage (maar niet kritieke) drempel | als de waarde er weer boven ligt |
| Firmware-update beschikbaar | info | er is een update voor een apparaat | als er geen meer openstaat |
| Nieuw apparaat | info | apparaat toegevoegd aan de Matter Server | eenmalig, blijft tot bevestiging |
| Apparaat verwijderd | info | apparaat verwijderd van de Matter Server | eenmalig, blijft tot bevestiging |

Daarbij geldt:

- Bij het starten wordt alleen de **beginstand** gemeld (zonder push), daarna precies één melding per toestandswijziging. De bestaande batterijdrempels uit de opties gelden; er zijn geen nieuwe drempels.
- Elke melding bevat het apparaat als onderwerp (zodat het Notification Center later per apparaat kan filteren). De teksten in vijf talen (Nederlands, Duits, Engels, Frans, Spaans) levert de integratie eenmalig bij het aanmelden.
- De Home Assistant-gebeurtenissen `matter_manager_*` blijven ongewijzigd en onafhankelijk bestaan.
- **Teststatus:** De koppeling is getest met een gesimuleerde eventbus en in een headless browser, **niet met een echt Notification Center en niet op echte hardware**.

## Sensoren

`Apparaten`, `Offline apparaten`, `Apparaten met bijna lege batterij`, `Apparaten met kritieke batterij`, `Beschikbare firmware-updates` en `Fabrics`. De sensoren voor offline, batterij en updates dragen de apparatenlijst als attribuut.

## Versieweergave en updatemelding

De geïnstalleerde versie staat op drie plekken: in de kaart onder **Server (tandwiel) → App-versie**, bovenaan in de grafische kaarteditor en in het dialoogvenster **Configureren** van de integratie. De integratie vraagt bij de start en daarna elke 12 uur aan GitHub (`api.github.com`, nieuwste release, anders de hoogste versietag) of er een nieuwere versie is gepubliceerd. Is die er, dan wordt dit gekleurd weergegeven: oranje rand en melding in de sectie, een oranje „↑” bij het tandwielpictogram, een waarschuwingsvak in de editor en een melding in het configuratiedialoogvenster. De update zelf gaat zoals gebruikelijk via HACS. Met **Nu controleren** start je de controle direct. Is GitHub niet bereikbaar, dan verschijnt „Controle niet mogelijk”; de kaart blijft gewoon werken.

Verschillen de versies van kaart en integratie (verouderde browsercache), dan wordt dat ook oranje gemarkeerd.

## Instellingen van de integratie

Onder **Configureren** (met weergave van de geïnstalleerde versie): drempel „batterij bijna leeg”, drempel „batterij kritiek” (moet kleiner dan of gelijk zijn) en gebeurtenissen aan/uit, plus **Item in de zijbalk tonen** en **Naam in de zijbalk** (maximaal 40 tekens, standaard „Matter Manager”). Via **Opnieuw configureren** wijzig je het adres van de Matter Server.

In het dialoogvenster staan ook **Meldingen naar het Notification Center sturen** (hoofdschakelaar) en **Te verzenden meldingstypen** (zie [Notification Center](#notification-center-optioneel)). Wijzigingen aan deze twee schakelaars worden toegepast zonder de integratie opnieuw te laden.

## Beveiliging

Alle schrijfacties (hernoemen, opmerkingen, verwijderen, functies schakelen, firmware, bindings, fabrics, apparaat toevoegen, opnieuw verbinden, versiecontrole) en het laden van de apparaatdetails zijn via WebSocket beperkt tot **beheerders**. Invoer wordt door de backend gecontroleerd (formaat van de setupcode, naam- en opmerkinglengte, bekende apparaten, eigen fabric kan niet worden verwijderd). Bij het aanmaken van een binding wordt alleen een toegangsitem (ACL) op het doelapparaat toegevoegd als daar al een beheerdersitem via CASE bestaat, zodat Home Assistant nooit de toegang verliest. De kaart maskeert alle teksten; kleurwaarden lopen door een allowlist. De getoonde setupcode van een open koppelvenster is alleen zichtbaar voor beheerders en vijf minuten geldig. Schakelen is beperkt tot aan/uit van het OnOff-cluster, de waarde moet een booleaanse waarde zijn en het apparaat moet bereikbaar zijn; sloten en alle andere functies zijn alleen-lezen. Afbeeldingsadressen uit `device_images` en `image_base` worden gecontroleerd op onveilige schema's (bijv. `javascript:`). De naam in de zijbalk wordt als tekst getoond, nooit als HTML, en is beperkt tot 40 tekens.

De schakelaars voor het Notification Center kunnen via WebSocket alleen door een **beheerder** worden gewijzigd; het meldingstype wordt gecontroleerd tegen de lijst van bekende typen. Meldingen bevatten alleen apparaatnamen en waarden zoals het batterijniveau.

## Bekende beperkingen

- **Versie 1.1.1 is alleen getest met gesimuleerde gegevens en een gesimuleerde Matter-server, niet op echte hardware.** Ontwikkeld tegen de gedocumenteerde WebSocket-interface van python-matter-server.
- **Notification Center:** De koppeling is alleen getest met een gesimuleerde eventbus, niet met een echt Notification Center.
- **Zijbalk en zoekveld:** Het gedrag van het zoekveld (focus blijft behouden tijdens het typen, geen sneltoetsen van Home Assistant) is gecontroleerd in een headless Chromium, niet op een telefoon en niet in de Home Assistant-app. Het zijbalkitem is niet getest op een echte Home Assistant.
- **Fabrikant en apparaatnaam** komen uit de basisgegevens van het apparaat (fabrikantnaam en productnaam). Begint de productnaam met de fabrikantnaam, dan wordt die eraf gehaald; ontbreekt de fabrikant, dan wordt deze alleen herkend als een ander apparaat dezelfde fabrikantnaam meldt. Zonder deze gegevens verschijnt het apparaat onder „Onbekend”. De apparaatklasse komt uit de apparaattypen van de endpoints; apparaten met een onbekend type komen onder „Overig”. Beide zijn alleen met gesimuleerde gegevens gecontroleerd.
- **Schrijvende Matter-commando's zijn ongetest:** het formaat van `set_acl_entry`/`set_node_binding` (bindings), `commission_with_code`, `open_commissioning_window` en `remove_matter_fabric` kan per versie van de Matter Server verschillen. Dan heeft de functie geen effect of meldt hij een fout – lezende functies worden hierdoor niet beïnvloed.
- **Geen groepen:** Zigbee-groepen hebben in Matter geen directe equivalent voor deze interface; de categorie heet daarom „Fabrics”.
- **Apparaatafbeeldingen:** Het aantal treffers van de afbeeldingenbibliotheek bij Matter-apparaten is onbekend; de afbeeldingsnamen zijn kandidaten, geen gegarandeerde match. Ontbreekt een afbeelding, dan verschijnt het pictogram. Het ophalen bij `zigbee2mqtt.io` kon in de ontwikkelomgeving niet worden gecontroleerd.
- **Functies:** Het uitlezen van de functie-attributen en het schakelcommando (`device_command` On/Off) zijn alleen met gesimuleerde gegevens getest – **ongetest op echte hardware**. Sensorwaarden verversen ongeveer eens per minuut; apparaten achter bridges kunnen nu worden geschakeld als ze OnOff melden. Met `read_only: true` verdwijnen schakelaars en entiteitenlijst.
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
- **Twee gelijk ogende items in de zijbalk:** geef bij meerdere Matter Manager-items elk een andere naam onder **Configureren → Naam in de zijbalk**.
- Logs: zet `custom_components.matter_manager` op `debug`.

## Versiegeschiedenis

| Versie | Wijziging |
|---|---|
| **1.1.1** | Nieuw: **eigen item in de zijbalk** met vrij te kiezen naam (standaard „Matter Manager”, maximaal 40 tekens, uit te schakelen) in het dialoogvenster Configureren; bij meerdere items zijn er zo geen twee gelijk ogende items meer. **Spaans** (integratie, kaart, README). README met vlaggen, schermafbeeldingen en link naar het blogbericht. Opgelost: in het zoekveld van het apparatenoverzicht vervangt de kaart het invoerveld niet meer tijdens het typen – op de telefoon sluit het toetsenbord niet meer na elke letter, op de desktop behoudt het veld de focus; zo komt de volgende letter ook niet meer bij de sneltoetsen van Home Assistant terecht („e” = entiteiten). Alleen getest met gesimuleerde gegevens en in een headless browser, niet op echte hardware |
| **1.1.0** | Nieuw: **opmerkingen** in de apparaatpopup (bewerkbaar, doorzoekbaar, alleen door beheerders te wijzigen); optionele koppeling met het **Notification Center** (interface “schema 1” via de eventbus): meldingstypen server niet bereikbaar, apparaat offline, batterij kritiek/laag, firmware-update, nieuw/verwijderd apparaat; hoofdschakelaar en schakelaar per meldingstype in de kaart (Server → Notification Center) en in het dialoogvenster Configureren, gesorteerd op urgentie. Opgelost: tijdens het typen in invoervelden van de kaart (bijv. “e” in het naamveld) worden de sneltoetsen van Home Assistant, zoals het zoeken naar entiteiten, niet meer geactiveerd. Gewijzigd: de apparaatregistry wordt opgevraagd zonder `device_registry.devices`, dat vanaf Home Assistant 2027.9 vervalt. Alleen getest met gesimuleerde gegevens, niet met een echt Notification Center en niet op echte hardware |
| **1.0.3** | Nieuw: kleine apparaatafbeeldingen (kandidaten uit de Zigbee2MQTT-afbeeldingenbibliotheek, uitschakelbaar, eigen afbeeldingenmap mogelijk), categorie **Functies** met schakelbare aan/uit-schakelaars en meetwaarden, in de apparaatpopup de secties Functies en Entiteiten met kopiëren naar het klembord. Nieuwe sleutels `show_functions`, `show_images`, `image_base`, `device_images`, `color_icon_functions`. Alleen met gesimuleerde gegevens en in een headless browser getest, niet op echte hardware |
| **1.0.2** | Resourcepad van de kaart gecorrigeerd: `/matter_manager/matter-manager-card.js` in plaats van `/matter_manager_files/…` (bestaande items worden automatisch omgezet). Fabrikant en apparaatnaam worden uit de typeaanduiding gelezen. Nieuw: filters en groeperen (fabrikant, apparaatnaam, apparaatklasse) zoals in de Zigbee2MQTT Manager. Frans (pull request #1) |
| 1.0.1 | Eerste publicatie op GitHub: nieuw pictogram en logo, Nederlands (integratie en kaart), README in drie talen |
| 1.0.0 | Interne stand vóór de publicatie |

## Bestandsintegriteit (hash-opmerkingen)

De eerste regel van elk `.py`-, `.js`- en `.yaml`-bestand bevat een SHA-256-hash van de rest van het bestand. Zo is een onbedoelde of vreemde wijziging te herkennen.

JSON-bestanden hebben geen opmerkingen. Hun SHA-256-hashes (over het volledige bestand, `sha256sum <bestand>`) staan in de [Duitse README](README.md#datei-integrität-hash-kommentare).

## Licentie

MIT
