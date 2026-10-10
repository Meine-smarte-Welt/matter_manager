# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 61ef993d05d02454c06b17c4ec29e7686ef8bc6c60b1f8201028092e7ef5e640
"""Übersichts-Sensoren (Geräte, Offline, Batterie niedrig, Updates, Fabrics)."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlsplit

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .manager import MatterConfigEntry, MatterManager

# key -> (Schlüssel in stats, Icon, Schlüssel in details oder None)
SENSORS: dict[str, tuple[str, str, str | None]] = {
    "devices": ("total", "mdi:matter", None),
    "offline": ("offline", "mdi:lan-disconnect", "offline"),
    "low_battery": ("low_battery", "mdi:battery-alert", "low_battery"),
    "updates_available": ("updates_available", "mdi:update", "updates_available"),
    "critical_battery": ("critical_battery", "mdi:battery-alert-variant-outline", None),
    "fabrics": ("fabrics", "mdi:home-group", None),
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: MatterConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    manager = entry.runtime_data
    async_add_entities(MatterSummarySensor(manager, entry, key) for key in SENSORS)


class MatterSummarySensor(SensorEntity):
    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, manager: MatterManager, entry: MatterConfigEntry, key: str) -> None:
        self._manager = manager
        self._key = key
        stats_key, icon, self._details_key = SENSORS[key]
        self._stats_key = stats_key
        self._attr_icon = icon
        self._attr_translation_key = key
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=f"Matter Manager ({urlsplit(manager.url).hostname})",
            manufacturer="Matter",
            model="Matter Server",
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._manager.async_add_listener(self._handle_update))

    def _handle_update(self, kind: str, _payload: Any) -> None:
        if kind == "update":
            self.async_write_ha_state()

    @property
    def native_value(self) -> int:
        return self._manager.data["stats"][self._stats_key]

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        if self._details_key is None:
            return None
        attrs: dict[str, Any] = {"devices": self._manager.details[self._details_key]}
        if self._key == "low_battery":
            attrs["threshold"] = self._manager.data["stats"]["low_battery_threshold"]
        return attrs
