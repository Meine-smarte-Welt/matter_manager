# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): f9e616bd925c7cfcf921e5eba130083d7dc72d41f2dc1ebd87181aee7b86374c
"""Diagnose-Download (Namen, Seriennummern und Fabric-Bezeichnungen werden weggelassen)."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from .manager import MatterConfigEntry


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: MatterConfigEntry
) -> dict[str, Any]:
    manager = entry.runtime_data
    data = manager.data
    mapping: dict[str, str] = {}

    def alias(kind: str, value: str | None) -> str | None:
        if not value:
            return value
        return mapping.setdefault(value, f"{kind}_{len(mapping) + 1}")

    devices = [
        {
            "name": alias("geraet", d["name"]),
            "id": alias("id", d["id"]),
            "bridged": d["bridged"],
            "type": d["type"],
            "network": d["network"],
            "vendor": d["vendor"],
            "model": d["model"],
            "sw_version": d["sw_version"],
            "available": d["available"],
            "has_battery": d["battery_present"],
            "signal": d["signal"],
            "fabrics": d["fabrics_count"],
            "ota": {"capable": d["ota"]["capable"], "state": d["ota"]["state"]},
            "bindings": len(d["bindings"]),
        }
        for d in data["devices"]
    ]
    return {
        "entry": {"options": dict(entry.options)},
        "server": {
            k: v
            for k, v in data["server"].items()
            if k not in ("url", "fabric_id", "compressed_fabric_id")
        },
        "stats": data["stats"],
        "fabrics": [
            {
                "vendor_id": f["vendor_id"],
                "vendor_name": f["vendor_name"],
                "own": f["own"],
                "members": len(f["members"]),
            }
            for f in data["fabrics"]
        ],
        "app": data["app"],
        "devices": devices,
    }
