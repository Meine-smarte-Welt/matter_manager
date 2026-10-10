[🇩🇪 Deutsch](README.md) · 🇬🇧 English · [🇳🇱 Nederlands](README.nl.md)

# Matter Manager for Home Assistant

Manage Matter devices without leaving Home Assistant: devices, batteries, firmware updates, fabrics (multi-admin), bindings and the Matter Server in one dashboard card – as a HACS integration. Structure and design follow the [Zigbee2MQTT Manager](https://github.com/Meine-smarte-Welt/zigbee2mqtt_manager): icon categories, row lists, detail popup, accordion sections, graphical editor and freely adjustable colors.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [The card](#the-card)
- [Colors](#colors)
- [Services](#services)
- [Events for automations](#events-for-automations)
- [Sensors](#sensors)
- [Version display and update notice](#version-display-and-update-notice)
- [Integration settings](#integration-settings)
- [Security](#security)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Version history](#version-history)
- [File integrity](#file-integrity-hash-comments)

## Features

The card has six categories in an icon bar (icons only below roughly 480 px card width). Each category can be shown or hidden individually.

| Category | What it does |
|---|---|
| **Devices** | List with reachability, model, vendor, signal strength (dBm), battery, “last seen”; statistic chips as filters (offline / low battery / updates); search; sorting; “Add device” |
| **Battery** | Battery devices, lowest level first; colors by low and critical threshold; devices without a percentage show the charge state (OK/warning/critical) |
| **Updates** | Installed vs. available firmware; “Check all” and “Install all one by one” as a background job with progress and cancel |
| **Fabrics** | Ecosystems (Apple Home, Google Home, Alexa, …) the devices are connected to; remove the connection to a foreign ecosystem |
| **Bindings** | Overview of all device links; unbind; re-bind in the device popup |
| **Server** (gear) | **App version** (integration and card, with a colored notice for a new version), Matter Server status, add device (setup code), fabric label, reconnect, event log |

**Device popup** (tap a row) with accordion sections: Information · Rename (with a list of the affected HA entities) · Firmware · Bindings · Fabrics (incl. sharing with another ecosystem) · Diagnostics (check reachability, re-interview) · Remove.

More points:

- **Matter equivalents instead of Zigbee terms:** availability comes from the Matter Server, signal strength is an RSSI value in dBm (Wi-Fi or Thread), groups are replaced by fabrics, the “coordinator” is the Matter Server.
- **Devices behind bridges** (e.g. a Hue bridge) appear on their own but are read-only: only the name in Home Assistant can be changed.
- **Cache:** “last seen” and the update state survive a restart.
- **Two-click confirmation** instead of a browser dialog for risky actions (remove, update, reconnect, unbind).
- **Read only:** `read_only: true` hides all controls that change something (wall tablets).
- **Zoom:** `zoom` scales the whole card.
- **Languages:** German, English and Dutch (integration and card, following the Home Assistant language).
- **Diagnostics download** with anonymized names and IDs.

## Requirements

- Home Assistant **2025.6** or newer
- A running **Matter Server** (e.g. the “Matter Server” add-on or the `python-matter-server` container) with WebSocket interface, API schema **8** or newer
- The standard **Matter** integration is needed for the device entities. Matter Manager uses the same server address and suggests it automatically during setup.

## Installation

1. HACS → ⋮ → **Custom repositories** → URL of this repo, category **Integration**
2. Install “Matter Manager”, restart Home Assistant
3. **Settings → Devices & services → Add integration → Matter Manager**
4. Check the Matter Server address (default `ws://core-matter-server:5580/ws`) and choose the “low battery” threshold

Manual: copy the folder `custom_components/matter_manager` to `<config>/custom_components/`.

## The card

The integration serves the card and registers it as a Lovelace resource (persisted, with `?v=<version>` against stale browser caches). You do not need to add anything manually. If Lovelace runs in YAML mode, add `/matter_manager_files/matter-manager-card.js` as a resource of type `module`.

Add the card: **Edit dashboard → Add card → “Matter Manager”**. The graphical editor groups all settings in collapsible sections (categories, appearance with columns, editing, colors). No YAML is required, but possible:

```yaml
type: custom:matter-manager-card
title: Matter Manager         # empty ("") = no heading
# entry_id: abc123            # only with several Matter Manager entries
show_devices: true
show_battery: true
show_updates: true
show_fabrics: true
show_bindings: true
show_bridge: true             # category "Server"
default_tab: devices          # devices | battery | updates | fabrics | bindings | bridge
max_rows: 0                   # 0 = all, otherwise "show more"
zoom: 1
show_stats: true
show_search: true
show_filter_bar: true         # sort selection
default_sort: name_asc        # name_asc | name_desc | battery_asc | signal_asc | last_seen_desc | last_seen_asc | ota
show_model: true
show_vendor: true
show_node_id: false
show_signal: true
show_battery_value: true
show_last_seen: true
read_only: false
show_pairing: true            # "Add device" button
```

More examples: [`examples/`](examples/).

## Colors

In the editor under **Farben** (colors) or via `color_*` keys. Each value may be hex (`#ff9800`), `rgb()`, `hsl()` or `var(--...)`. Empty means theme default. Invalid values are discarded. The swatch opens the color picker, the text field accepts any CSS value, “reset all colors” clears everything.

| Key | Effect |
|---|---|
| `color_tab_active` | Active tab, primary buttons |
| `color_success` | Good: online, good signal, full battery, up to date |
| `color_warning` | Warning: low battery, medium signal, update running |
| `color_error` | Error: offline, critical battery, weak signal |
| `color_info` | Update available (firmware, new app version) |
| `color_row_icon` | All list icons (overrides the category colors) |
| `color_live_banner` | Banner background (add device, firmware job) |
| `color_icon_devices`, `_battery`, `_updates`, `_fabrics`, `_bindings`, `_bridge` | Icon of the category – colors the tab icon and row icons |

If `color_row_icon` is set, this uniform color wins.

## Services

Both services are meant for automations. `entry_id` is only needed with several entries.

```yaml
action: matter_manager.commission
data:
  code: "MT:Y.K9042C00KA0648G00"   # QR text or 11/21-digit code
  network_only: false              # true = no Bluetooth
```

```yaml
action: matter_manager.check_updates
```

`check_updates` checks all OTA-capable devices in the background, one after another with a delay.

## Events for automations

Can be switched off in the integration options (“Fire Home Assistant events”). At startup only the initial state is recorded, so there is no flood of events.

| Event | Data |
|---|---|
| `matter_manager_device_offline` / `_device_online` | `name`, `node_id`, `id` |
| `matter_manager_battery_low` | `name`, `node_id`, `id`, `battery` – when falling below the threshold (`battery` is empty if the device only reports a charge state) |
| `matter_manager_update_available` | `name`, `node_id`, `id`, `installed`, `latest` |
| `matter_manager_device_joined` / `_device_left` | `name`, `node_id` |

```yaml
triggers:
  - trigger: event
    event_type: matter_manager_battery_low
actions:
  - action: notify.mobile_app_phone
    data:
      message: "{{ trigger.event.data.name }}: battery {{ trigger.event.data.battery }} %"
```

## Sensors

`Devices`, `Offline devices`, `Devices with low battery`, `Devices with critical battery`, `Available firmware updates` and `Fabrics`. The sensors for offline, battery and updates carry the device list as an attribute.

## Version display and update notice

The installed version is shown in three places: in the card under **Server (gear) → App version**, at the top of the graphical card editor, and in the **Configure** dialog of the integration. At startup and every 12 hours afterwards the integration asks GitHub (`api.github.com`, latest release, falling back to the highest version tag) whether a newer version has been published. If there is one, it is highlighted: orange border and notice in the section, an orange “↑” on the gear icon, a warning box in the editor and a notice in the Configure dialog. The update itself is done via HACS as usual. **Check now** triggers the query immediately. If GitHub is not reachable, “Check not possible” is shown; the card keeps working unchanged.

If the card and integration versions differ (stale browser cache), this is also marked in orange.

## Integration settings

Under **Configure** (showing the installed version): “low battery” threshold, “critical battery” threshold (must be less than or equal) and events on/off. **Reconfigure** lets you change the Matter Server address.

## Security

All write actions (rename, remove, firmware, bindings, fabrics, add device, reconnect, version check) and loading of the device details are restricted to **administrators** via WebSocket. Input is validated by the backend (setup code format, name length, known devices, own fabric cannot be removed). When a binding is created, an access entry (ACL) is only added on the target device if an administrator entry via CASE already exists there, so Home Assistant never loses access. The card escapes all texts; color values pass an allowlist. The setup code shown for an open pairing window is visible to administrators only and valid for five minutes.

## Known limitations

- **Version 1.0.1 has not been tested on real hardware.** It was developed against the documented WebSocket interface of python-matter-server and against a simulated server.
- **Writing Matter commands are untested:** the format of `set_acl_entry`/`set_node_binding` (bindings), `commission_with_code`, `open_commissioning_window` and `remove_matter_fabric` may differ depending on the Matter Server version. In that case the function has no effect or reports an error – read-only functions are not affected.
- **No groups:** Zigbee groups have no direct Matter equivalent for this interface; the category is called “Fabrics” instead.
- **No device images:** Matter does not provide product images, icons by device type are shown.
- Signal strength exists only for Wi-Fi and Thread devices (for Thread: best neighbor). Bridge and Ethernet devices have no value.
- Battery devices (Thread, “sleepy”) often pick up updates and bindings only after hours or after a button press.
- The entity preview when renaming finds devices via the identifiers of the Matter integration and can stay empty in special cases.
- “Install all” waits up to two hours per device for the update to finish.
- Recently removed devices that are unreachable may stay registered on the device and have to be reset.

## Troubleshooting

- **Card not found:** clear the browser cache; check under Settings → Dashboards → Resources whether `/matter_manager_files/…` exists (add manually in YAML mode).
- **“Matter Server not connected”:** check the address under **Reconfigure**. The connection is re-established automatically; **Server → Maintenance → Reconnect** forces it immediately.
- **“Matter Server version too old”:** update the Matter Server (API schema 8 or newer).
- **No signal value:** only Wi-Fi and Thread devices report it; some devices do not provide it.
- **“No connection to the integration”:** is the integration loaded? Is `entry_id` correct?
- Logs: set `custom_components.matter_manager` to `debug`.

## Version history

| Version | Change |
|---|---|
| **1.0.1** | First release on GitHub: new icon and logo, Dutch (integration and card), README in three languages |
| 1.0.0 | Internal state before the release |

## File integrity (hash comments)

The first line of every `.py`, `.js` and `.yaml` file contains a SHA-256 hash of the rest of the file. This makes an unintended or foreign change detectable.

JSON files have no comments. Their SHA-256 hashes (over the complete file, `sha256sum <file>`) are listed in the [German README](README.md#datei-integrität-hash-kommentare).

## License

MIT
