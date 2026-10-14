[🇩🇪 Deutsch](README.md) · [🇬🇧 English](README.en.md) · [🇳🇱 Nederlands](README.nl.md) · 🇫🇷 Français

# Matter Manager pour Home Assistant

Gérer les appareils Matter sans quitter Home Assistant : appareils, batteries, mises à jour de firmware, fabrics (multi-admin), bindings et Matter Server dans une carte de tableau de bord – en tant qu'intégration HACS. La structure et le design correspondent au [Zigbee2MQTT Manager](https://github.com/Meine-smarte-Welt/zigbee2mqtt_manager) : catégories avec icônes, listes en lignes, fenêtre de détail, sections en accordéon, éditeur graphique et couleurs librement ajustables.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [La carte](#la-carte)
- [Couleurs](#couleurs)
- [Services](#services)
- [Événements pour les automatisations](#événements-pour-les-automatisations)
- [Capteurs](#capteurs)
- [Affichage de la version et avis de mise à jour](#affichage-de-la-version-et-avis-de-mise-à-jour)
- [Paramètres de l'intégration](#paramètres-de-lintégration)
- [Sécurité](#sécurité)
- [Limitations connues](#limitations-connues)
- [Dépannage](#dépannage)
- [Historique des versions](#historique-des-versions)
- [Intégrité des fichiers](#intégrité-des-fichiers-commentaires-de-hachage)

## Fonctionnalités

La carte comporte sept catégories dans une barre d'icônes (sous environ 480 px de largeur de carte, uniquement les icônes). Chaque catégorie peut être affichée ou masquée individuellement.

| Catégorie | Fonctions |
|---|---|
| **Appareils** | Liste avec disponibilité, modèle, fabricant, force du signal (dBm), batterie, « vu pour la dernière fois » ; puces statistiques comme filtres (hors ligne / batterie faible / mises à jour) ; recherche ; tri ; **filtres** (statut, alimentation, signal, réseau, firmware, vu pour la dernière fois, écosystèmes, fabricant, nom de l'appareil, classe d'appareil) et **regroupement** par fabricant, nom de l'appareil ou classe d'appareil ; « Ajouter un appareil » |
| **Batterie** | Appareils sur batterie, niveau le plus bas en premier ; couleurs selon les seuils faible et critique ; les appareils sans pourcentage affichent l'état de charge (OK/avertissement/critique) |
| **Mises à jour** | Firmware installé vs. disponible ; « Tout rechercher » et « Tout installer l'une après l'autre » comme tâche d'arrière-plan avec progression et annulation |
| **Fonctions** | Fonctions expose de tous les appareils : **interrupteurs** (marche/arrêt) commutables directement dans la carte, plus des valeurs comme luminosité, température de couleur, température, humidité, pression, éclairement (lx), présence, état de serrure et de volet (lecture seule) ; filtre (Tous / Commutables / Allumés) ; un interrupteur reste verrouillé jusqu'au retour de l'appareil (pas de double clic) ; non commutable en cas d'erreur ou d'appareil hors ligne |
| **Fabrics** | Écosystèmes (Apple Home, Google Home, Alexa, …) auxquels les appareils sont connectés ; dissocier la connexion à un écosystème tiers |
| **Bindings** | Aperçu de toutes les liaisons d'appareils ; dissocier ; relier à nouveau dans la fenêtre de l'appareil |
| **Serveur** (engrenage) | **Version de l'application** (intégration et carte, avec un avis coloré lors d'une nouvelle version), statut du Matter Server, ajouter un appareil (code d'installation), libellé du fabric, reconnecter, journal des événements |

**Fenêtre de l'appareil** (appui sur une ligne) avec sections en accordéon : Informations · Renommer (avec la liste des entités HA concernées) · Firmware · Bindings · Fonctions · Entités (copie dans le presse-papiers pour automatisations et scripts) · Fabrics (y compris le partage avec un autre écosystème) · Diagnostic (vérifier la disponibilité, réinterroger) · Supprimer.

Autres points :

- **Équivalents Matter au lieu des termes Zigbee :** la disponibilité provient du Matter Server, la force du signal est une valeur RSSI en dBm (Wi-Fi ou Thread), les groupes sont remplacés par les fabrics, le « coordinateur » est le Matter Server.
- **Appareils derrière des bridges** (p. ex. un bridge Hue) apparaissent séparément ; renommer et commuter des fonctions est possible, firmware, bindings et fabrics restent verrouillés.
- **Images d'appareils :** Une petite image de l'appareil apparaît à côté de chaque ligne et dans la fenêtre. Matter ne fournit pas d'images de produits ; la carte essaie donc successivement des noms d'image formés du numéro de pièce, du nom du produit et du modèle auprès de la bibliothèque d'images du projet Zigbee2MQTT (`https://www.zigbee2mqtt.io/images/devices/<modèle>.png`). Si tout échoue, l'icône par type d'appareil s'affiche. **Confidentialité :** votre navigateur (pas Home Assistant) demande les images à `zigbee2mqtt.io` et lui transmet ainsi le numéro de pièce ou le nom du produit des appareils. Avec `show_images: false`, rien n'est demandé ; `image_base` pointe vers votre propre serveur (p. ex. `/local/appareils`), `device_images` attribue des URL d'image propres à des appareils individuels (YAML uniquement).
- **Fonctions et presse-papiers :** Les interrupteurs ne sont commutés que par les commandes Matter « On »/« Off » du cluster OnOff. Les serrures ne peuvent volontairement pas être commandées. Dans la fenêtre, le bouton par entité (ou « Tout copier ») copie l'ID de l'entité dans le presse-papiers ; si l'accès est bloqué (p. ex. sans HTTPS), un champ de texte pour la copie manuelle apparaît.
- **Cache :** « vu pour la dernière fois » et l'état des mises à jour survivent à un redémarrage.
- **Confirmation en deux clics** au lieu d'une boîte de dialogue du navigateur pour les actions risquées (supprimer, mettre à jour, reconnecter, dissocier).
- **Lecture seule :** `read_only: true` masque tous les éléments de commande qui modifient quelque chose (tablettes murales).
- **Zoom :** `zoom` met à l'échelle toute la carte.
- **Langues :** allemand, anglais, néerlandais et français (intégration et carte, selon la langue de Home Assistant).
- **Téléchargement des diagnostics** avec noms et ID anonymisés.

## Prérequis

- Home Assistant **2025.6** ou plus récent
- Un **Matter Server** en cours d'exécution (p. ex. le module complémentaire « Matter Server » ou le conteneur `python-matter-server`) avec interface WebSocket, schéma d'API **8** ou plus récent
- L'intégration standard **Matter** est nécessaire pour les entités des appareils. Matter Manager utilise la même adresse de serveur et la propose automatiquement lors de la configuration.

## Installation

1. HACS → ⋮ → **Dépôts personnalisés** → URL de ce dépôt, catégorie **Intégration**
2. Installer « Matter Manager », redémarrer Home Assistant
3. **Paramètres → Appareils et services → Ajouter une intégration → Matter Manager**
4. Vérifier l'adresse du Matter Server (par défaut `ws://core-matter-server:5580/ws`) et choisir le seuil « batterie faible »

Manuellement : copier le dossier `custom_components/matter_manager` vers `<config>/custom_components/`.

## La carte

L'intégration fournit la carte et l'enregistre comme ressource Lovelace (persistée, avec `?v=<version>` contre les caches de navigateur obsolètes). Vous n'avez rien à ajouter manuellement. Si Lovelace fonctionne en mode YAML, ajoutez `/matter_manager/matter-manager-card.js` comme ressource de type `module`. Si vous avez configuré la version 1.0.1 en mode YAML, remplacez l'ancien chemin `/matter_manager_files/…` par celui-ci.

Ajouter la carte : **Modifier le tableau de bord → Ajouter une carte → « Matter Manager »**. L'éditeur graphique regroupe tous les paramètres dans des sections repliables (catégories, affichage avec colonnes, édition, couleurs). Aucun YAML n'est nécessaire, mais c'est possible :

```yaml
type: custom:matter-manager-card
title: Matter Manager         # vide ("") = aucun titre
# entry_id: abc123            # uniquement avec plusieurs entrées Matter Manager
show_devices: true
show_battery: true
show_updates: true
show_fabrics: true
show_bindings: true
show_functions: true
show_images: true             # images d'appareils (source : voir « Images d'appareils »)
# image_base: /local/appareils  # dossier d'images propre au lieu de zigbee2mqtt.io
show_bridge: true             # catégorie « Serveur »
default_tab: devices          # devices | battery | updates | functions | fabrics | bindings | bridge
max_rows: 0                   # 0 = tout, sinon « afficher plus »
zoom: 1
show_stats: true
show_search: true
show_filter_bar: true         # sélection du tri
show_group_by: true           # sélection « Regrouper »
default_group_by: none        # none | vendor | model | class
show_filters: true            # zone de filtres (statut, batterie, signal, fabricant, …)
default_sort: name_asc        # name_asc | name_desc | battery_asc | signal_asc | last_seen_desc | last_seen_asc | ota
show_model: true
show_vendor: true
show_node_id: false
show_signal: true
show_battery_value: true
show_last_seen: true
read_only: false
show_pairing: true            # bouton « Ajouter un appareil »
```

Autres exemples : [`examples/`](examples/).

## Couleurs

Dans l'éditeur sous **Farben** (couleurs) ou via les clés `color_*`. Chaque valeur peut être hexadécimale (`#ff9800`), `rgb()`, `hsl()` ou `var(--...)`. Vide signifie valeur par défaut du thème. Les valeurs non valides sont ignorées. L'échantillon ouvre le sélecteur de couleur, le champ de texte accepte toute valeur CSS, « Réinitialiser toutes les couleurs » efface tout.

| Clé | Effet |
|---|---|
| `color_tab_active` | Onglet actif, boutons principaux |
| `color_success` | Bon : en ligne, bon signal, batterie pleine, à jour |
| `color_warning` | Avertissement : batterie faible, signal moyen, mise à jour en cours |
| `color_error` | Erreur : hors ligne, batterie critique, signal faible |
| `color_info` | Mise à jour disponible (firmware, nouvelle version de l'application) |
| `color_row_icon` | Toutes les icônes de liste (remplace les couleurs des catégories) |
| `color_live_banner` | Arrière-plan de la bannière (ajouter un appareil, tâche de firmware) |
| `color_icon_devices`, `_battery`, `_updates`, `_functions`, `_fabrics`, `_bindings`, `_bridge` | Icône de la catégorie – colore l'icône de l'onglet et les icônes des lignes |

Si `color_row_icon` est défini, cette couleur uniforme l'emporte.

## Services

Les deux services sont destinés aux automatisations. `entry_id` n'est nécessaire qu'en présence de plusieurs entrées.

```yaml
action: matter_manager.commission
data:
  code: "MT:Y.K9042C00KA0648G00"   # texte QR ou code à 11/21 chiffres
  network_only: false              # true = pas de Bluetooth
```

```yaml
action: matter_manager.check_updates
```

`check_updates` vérifie en arrière-plan les mises à jour de tous les appareils compatibles OTA, l'un après l'autre avec un intervalle.

## Événements pour les automatisations

Désactivable dans les options de l'intégration (« Déclencher les événements Home Assistant »). Au démarrage, seul l'état initial est enregistré, il n'y a donc pas de flot d'événements.

| Événement | Données |
|---|---|
| `matter_manager_device_offline` / `_device_online` | `name`, `node_id`, `id` |
| `matter_manager_battery_low` | `name`, `node_id`, `id`, `battery` – lors du passage sous le seuil (`battery` est vide si l'appareil ne signale qu'un état de charge) |
| `matter_manager_update_available` | `name`, `node_id`, `id`, `installed`, `latest` |
| `matter_manager_device_joined` / `_device_left` | `name`, `node_id` |

```yaml
triggers:
  - trigger: event
    event_type: matter_manager_battery_low
actions:
  - action: notify.mobile_app_handy
    data:
      message: "{{ trigger.event.data.name }} : batterie {{ trigger.event.data.battery }} %"
```

## Capteurs

`Appareils`, `Appareils hors ligne`, `Appareils à batterie faible`, `Appareils à batterie critique`, `Mises à jour de firmware disponibles` et `Fabrics`. Les capteurs pour hors ligne, batterie et mises à jour portent la liste des appareils comme attribut.

## Affichage de la version et avis de mise à jour

La version installée figure à trois endroits : dans la carte sous **Serveur (engrenage) → Version de l'application**, en haut de l'éditeur graphique de la carte et dans la boîte de dialogue **Configurer** de l'intégration. L'intégration interroge GitHub au démarrage puis toutes les 12 heures (`api.github.com`, dernière version publiée, à défaut le tag de version le plus élevé) pour savoir si une version plus récente a été publiée. Si c'est le cas, cela est mis en évidence par une couleur : bordure orange et avis dans la section, un « ↑ » orange sur l'icône d'engrenage, un encadré d'avertissement dans l'éditeur et un avis dans la boîte de dialogue Configurer. La mise à jour elle-même se fait comme d'habitude via HACS. **Vérifier maintenant** déclenche immédiatement l'interrogation. Si GitHub est inaccessible, « Vérification impossible » s'affiche ; la carte continue de fonctionner normalement.

Si les versions de la carte et de l'intégration diffèrent (cache de navigateur obsolète), cela est également signalé en orange.

## Paramètres de l'intégration

Sous **Configurer** (avec affichage de la version installée) : seuil « batterie faible », seuil « batterie critique » (doit être inférieur ou égal) et événements activés/désactivés. **Reconfigurer** permet de modifier l'adresse du Matter Server.

## Sécurité

Toutes les actions d'écriture (renommer, supprimer, commuter des fonctions, firmware, bindings, fabrics, ajouter un appareil, reconnecter, vérification de version) et le chargement des détails de l'appareil sont limités aux **administrateurs** via WebSocket. Les saisies sont vérifiées par le backend (format du code d'installation, longueur du nom, appareils connus, impossibilité de supprimer son propre fabric). Lors de la création d'un binding, une entrée d'accès (ACL) n'est ajoutée sur l'appareil cible que si une entrée administrateur via CASE y existe déjà, afin que Home Assistant ne perde jamais l'accès. La carte échappe tous les textes ; les valeurs de couleur passent par une liste blanche. Le code d'installation affiché d'une fenêtre d'appairage ouverte n'est visible que par les administrateurs et n'est valable que cinq minutes. La commutation est limitée à marche/arrêt du cluster OnOff, la valeur doit être un booléen et l'appareil doit être joignable ; les serrures et toutes les autres fonctions sont en lecture seule. Les adresses d'image de `device_images` et `image_base` sont vérifiées contre les schémas dangereux (p. ex. `javascript:`).

## Limitations connues

- **La version 1.0.3 n'a pas été testée sur du matériel réel.** Le développement s'est fait contre l'interface WebSocket documentée de python-matter-server et contre un serveur simulé.
- **Fabricant et nom de l'appareil** proviennent des données de base de l'appareil (nom du fabricant et nom du produit). Si le nom du produit commence par le nom du fabricant, celui-ci est retiré ; si le fabricant manque, il n'est reconnu que si un autre appareil indique le même nom de fabricant. Sans ces valeurs, l'appareil apparaît sous « Inconnu ». La classe d'appareil provient des types d'appareil des points de terminaison ; les appareils de type inconnu vont dans « Autres ». Les deux n'ont été vérifiés qu'avec des données simulées.
- **Les commandes Matter en écriture ne sont pas testées :** le format de `set_acl_entry`/`set_node_binding` (bindings), `commission_with_code`, `open_commissioning_window` et `remove_matter_fabric` peut varier selon la version du Matter Server. La fonction reste alors sans effet ou signale une erreur – les fonctions en lecture ne sont pas concernées.
- **Pas de groupes :** les groupes Zigbee n'ont pas d'équivalent Matter direct pour cette interface ; la catégorie s'appelle donc « Fabrics ».
- **Images d'appareils :** Le taux de réussite de la bibliothèque d'images pour les appareils Matter est inconnu ; les noms d'image sont des candidats, pas une correspondance garantie. Si une image manque, l'icône s'affiche. La récupération depuis `zigbee2mqtt.io` n'a pas pu être vérifiée dans l'environnement de développement.
- **Fonctions :** La lecture des attributs de fonction et la commande de commutation (`device_command` On/Off) n'ont été testées qu'avec des données simulées – **non testées sur du matériel réel**. Les valeurs des capteurs se rafraîchissent environ une fois par minute ; les appareils derrière un bridge peuvent désormais être commutés s'ils signalent OnOff. Avec `read_only: true`, interrupteurs et liste d'entités disparaissent.
- La force du signal n'existe que pour les appareils Wi-Fi et Thread (pour Thread : meilleur voisin). Les appareils derrière un bridge et les appareils Ethernet n'ont pas de valeur.
- Les appareils sur batterie (Thread, « en veille ») ne récupèrent souvent les mises à jour et les bindings qu'après plusieurs heures ou après un appui sur un bouton.
- L'aperçu des entités lors du renommage trouve les appareils via les identifiants de l'intégration Matter et peut rester vide dans certains cas particuliers.
- « Tout installer » attend jusqu'à deux heures par appareil la fin de la mise à jour.
- Les appareils récemment supprimés qui sont injoignables restent éventuellement enregistrés sur l'appareil et doivent être réinitialisés.

## Dépannage

- **Carte introuvable :** vider le cache du navigateur ; vérifier sous Paramètres → Tableaux de bord → Ressources si `/matter_manager/…` est présent (à ajouter manuellement en mode YAML).
- **« Matter Server non connecté » :** vérifier l'adresse sous **Reconfigurer**. La connexion est rétablie automatiquement ; avec **Serveur → Maintenance → Reconnecter**, vous pouvez la forcer immédiatement.
- **« Version du Matter Server trop ancienne » :** mettre à jour le Matter Server (schéma d'API 8 ou plus récent).
- **Aucune valeur de signal :** seuls les appareils Wi-Fi et Thread la signalent ; certains appareils ne la fournissent pas.
- **« Aucune connexion à l'intégration » :** l'intégration est-elle chargée ? `entry_id` est-il correct ?
- Journaux : mettre `custom_components.matter_manager` sur `debug`.

## Historique des versions

| Version | Modification |
|---|---|
| **1.0.3** | Nouveau : petites images d'appareils (candidats de la bibliothèque d'images Zigbee2MQTT, désactivables, dossier d'images propre possible), catégorie **Fonctions** avec interrupteurs marche/arrêt commutables et valeurs mesurées, sections Fonctions et Entités dans la fenêtre de l'appareil avec copie dans le presse-papiers. Nouvelles clés `show_functions`, `show_images`, `image_base`, `device_images`, `color_icon_functions`. Testé uniquement avec des données simulées et dans un navigateur headless, pas sur du matériel réel |
| **1.0.2** | Chemin de la ressource de la carte corrigé : `/matter_manager/matter-manager-card.js` au lieu de `/matter_manager_files/…` (les entrées existantes sont migrées automatiquement). Fabricant et nom de l'appareil sont lus dans la désignation du type. Nouveau : filtres et regroupement (fabricant, nom de l'appareil, classe d'appareil) comme dans le Zigbee2MQTT Manager. Français (pull request #1) |
| 1.0.1 | Première publication sur GitHub : nouvelle icône et logo, néerlandais (intégration et carte), README en trois langues |
| 1.0.0 | État interne avant la publication |

## Intégrité des fichiers (commentaires de hachage)

La première ligne de chaque fichier `.py`, `.js` et `.yaml` contient un hachage SHA-256 du reste du fichier. Cela permet de détecter une modification involontaire ou étrangère.

Les fichiers JSON n'ont pas de commentaires. Leurs hachages SHA-256 (sur le fichier complet, `sha256sum <fichier>`) :

| Fichier | SHA-256 |
|---|---|
| `hacs.json` | `e719b176c5b44ea120e0d895d0719225612e43ab3ca6f462f98793383909ff5a` |
| `custom_components/matter_manager/manifest.json` | `15cd529ecbfe8f2541569da734ac6bddcce0a2e5c12a26e48c8962906bf85ff1` |
| `custom_components/matter_manager/strings.json` | `aa57065c0ddee70f88cf5cab0b42d4a01f0f72fc9faab7571e9c1493562a4f73` |
| `custom_components/matter_manager/icons.json` | `6737652d58ff71ed9df9eecfde362f6a0f62d7b2b7243d985e1f06020e3c9eb5` |
| `custom_components/matter_manager/translations/de.json` | `aa57065c0ddee70f88cf5cab0b42d4a01f0f72fc9faab7571e9c1493562a4f73` |
| `custom_components/matter_manager/translations/en.json` | `9c457f38c2a7650a00908d6601906a34655facc5540e2ba516dfc2c0a047c3f6` |
| `custom_components/matter_manager/translations/nl.json` | `3d9ee90c1cac32673507fc2a6a9f74f6bc585e91359d8f4a7b1b6d36ca2e2218` |
| `custom_components/matter_manager/translations/fr.json` | `716c55a3e6d3eebb67ebcd9efa56483b4dfe12b92fe32f6050f800ef680469d5` |

## Licence

MIT
