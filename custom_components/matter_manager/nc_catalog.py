# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): aa8b08c57c534e89a7915acaca99bc42ff330b338768bba1868f75579212e6b7
"""Katalog der Meldungsarten für das optionale Notification Center (Schema 1).

Die Texte stehen hier in allen fünf Sprachen (de, en, nl, fr, es). Das
Notification Center wählt die Anzeigesprache; Platzhalter in {geschweiften
Klammern} werden dort eingesetzt.
"""

from __future__ import annotations

from typing import Any

NC_ICON = "mdi:matter"

# Reihenfolge = nach Dringlichkeit (critical -> warning -> info)
NC_CATALOG: list[dict[str, Any]] = [
    {
        "type": "server_offline",
        "severity": "critical",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:server-network-off",
        "texts": {
            "de": {
                "label": "Matter Server nicht erreichbar",
                "title": "Matter Server nicht erreichbar",
                "message": "Der Matter Server antwortet nicht. Die Matter-Geräte lassen sich nicht verwalten, bis er wieder erreichbar ist.",
            },
            "en": {
                "label": "Matter Server unreachable",
                "title": "Matter Server unreachable",
                "message": "The Matter Server is not responding. Matter devices cannot be managed until it is reachable again.",
            },
            "nl": {
                "label": "Matter Server niet bereikbaar",
                "title": "Matter Server niet bereikbaar",
                "message": "De Matter Server reageert niet. Matter-apparaten kunnen niet worden beheerd totdat hij weer bereikbaar is.",
            },
            "fr": {
                "label": "Serveur Matter injoignable",
                "title": "Serveur Matter injoignable",
                "message": "Le serveur Matter ne répond pas. Les appareils Matter ne peuvent pas être gérés tant qu'il n'est pas de nouveau joignable.",
            },
            "es": {
                "label": "Servidor Matter inaccesible",
                "title": "Servidor Matter inaccesible",
                "message": "El servidor Matter no responde. Los dispositivos Matter no se pueden gestionar hasta que vuelva a estar accesible.",
            },
        },
    },
    {
        "type": "battery_critical",
        "severity": "critical",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:battery-alert",
        "texts": {
            "de": {
                "label": "Batterie kritisch",
                "title": "{name}: Batterie kritisch",
                "message": "Die Batterie von {name} ist bei {battery}. Bitte bald wechseln.",
            },
            "en": {
                "label": "Battery critical",
                "title": "{name}: battery critical",
                "message": "The battery of {name} is at {battery}. Please replace it soon.",
            },
            "nl": {
                "label": "Batterij kritiek",
                "title": "{name}: batterij kritiek",
                "message": "De batterij van {name} staat op {battery}. Vervang hem binnenkort.",
            },
            "fr": {
                "label": "Batterie critique",
                "title": "{name} : batterie critique",
                "message": "La batterie de {name} est à {battery}. Remplacez-la bientôt.",
            },
            "es": {
                "label": "Batería crítica",
                "title": "{name}: batería crítica",
                "message": "La batería de {name} está en {battery}. Cámbiala pronto.",
            },
        },
    },
    {
        "type": "device_offline",
        "severity": "warning",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:lan-disconnect",
        "texts": {
            "de": {
                "label": "Gerät offline",
                "title": "{name} ist offline",
                "message": "{name} ist nicht erreichbar.",
            },
            "en": {
                "label": "Device offline",
                "title": "{name} is offline",
                "message": "{name} is not reachable.",
            },
            "nl": {
                "label": "Apparaat offline",
                "title": "{name} is offline",
                "message": "{name} is niet bereikbaar.",
            },
            "fr": {
                "label": "Appareil hors ligne",
                "title": "{name} est hors ligne",
                "message": "{name} est injoignable.",
            },
            "es": {
                "label": "Dispositivo sin conexión",
                "title": "{name} está sin conexión",
                "message": "{name} no está accesible.",
            },
        },
    },
    {
        "type": "battery_low",
        "severity": "warning",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:battery-low",
        "texts": {
            "de": {
                "label": "Batterie niedrig",
                "title": "{name}: Batterie niedrig",
                "message": "Die Batterie von {name} ist bei {battery}.",
            },
            "en": {
                "label": "Battery low",
                "title": "{name}: battery low",
                "message": "The battery of {name} is at {battery}.",
            },
            "nl": {
                "label": "Batterij laag",
                "title": "{name}: batterij laag",
                "message": "De batterij van {name} staat op {battery}.",
            },
            "fr": {
                "label": "Batterie faible",
                "title": "{name} : batterie faible",
                "message": "La batterie de {name} est à {battery}.",
            },
            "es": {
                "label": "Batería baja",
                "title": "{name}: batería baja",
                "message": "La batería de {name} está en {battery}.",
            },
        },
    },
    {
        "type": "update_available",
        "severity": "info",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:update",
        "texts": {
            "de": {
                "label": "Firmware-Update verfügbar",
                "title": "Update für {name}",
                "message": "Für {name} ist ein Firmware-Update verfügbar (Version {latest}).",
            },
            "en": {
                "label": "Firmware update available",
                "title": "Update for {name}",
                "message": "A firmware update is available for {name} (version {latest}).",
            },
            "nl": {
                "label": "Firmware-update beschikbaar",
                "title": "Update voor {name}",
                "message": "Voor {name} is een firmware-update beschikbaar (versie {latest}).",
            },
            "fr": {
                "label": "Mise à jour du firmware disponible",
                "title": "Mise à jour pour {name}",
                "message": "Une mise à jour du firmware est disponible pour {name} (version {latest}).",
            },
            "es": {
                "label": "Actualización de firmware disponible",
                "title": "Actualización para {name}",
                "message": "Hay una actualización de firmware disponible para {name} (versión {latest}).",
            },
        },
    },
    {
        "type": "device_joined",
        "severity": "info",
        "resolvable": False,
        "enabled_default": True,
        "icon": "mdi:plus-circle-outline",
        "texts": {
            "de": {
                "label": "Neues Gerät",
                "title": "Neues Gerät: {name}",
                "message": "{name} wurde dem Matter Server hinzugefügt.",
            },
            "en": {
                "label": "New device",
                "title": "New device: {name}",
                "message": "{name} was added to the Matter Server.",
            },
            "nl": {
                "label": "Nieuw apparaat",
                "title": "Nieuw apparaat: {name}",
                "message": "{name} is toegevoegd aan de Matter Server.",
            },
            "fr": {
                "label": "Nouvel appareil",
                "title": "Nouvel appareil : {name}",
                "message": "{name} a été ajouté au serveur Matter.",
            },
            "es": {
                "label": "Dispositivo nuevo",
                "title": "Dispositivo nuevo: {name}",
                "message": "{name} se ha añadido al servidor Matter.",
            },
        },
    },
    {
        "type": "device_left",
        "severity": "info",
        "resolvable": False,
        "enabled_default": True,
        "icon": "mdi:minus-circle-outline",
        "texts": {
            "de": {
                "label": "Gerät entfernt",
                "title": "Gerät entfernt: {name}",
                "message": "{name} wurde vom Matter Server entfernt.",
            },
            "en": {
                "label": "Device removed",
                "title": "Device removed: {name}",
                "message": "{name} was removed from the Matter Server.",
            },
            "nl": {
                "label": "Apparaat verwijderd",
                "title": "Apparaat verwijderd: {name}",
                "message": "{name} is verwijderd van de Matter Server.",
            },
            "fr": {
                "label": "Appareil supprimé",
                "title": "Appareil supprimé : {name}",
                "message": "{name} a été supprimé du serveur Matter.",
            },
            "es": {
                "label": "Dispositivo eliminado",
                "title": "Dispositivo eliminado: {name}",
                "message": "{name} se ha eliminado del servidor Matter.",
            },
        },
    },
]

NC_TYPE_KEYS: list[str] = [item["type"] for item in NC_CATALOG]
