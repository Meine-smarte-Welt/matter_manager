[🇩🇪 Deutsch](README.md) · 🇬🇧 English · [🇳🇱 Nederlands](README.nl.md) · [🇫🇷 Français](README.fr.md)

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
- [Notification Center (optional)](#notification-center-optional)
- [Sensors](#sensors)
- [Version display and update notice](#version-display-and-update-notice)
- [Integration settings](#integration-settings)
- [Security](#security)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Version history](#version-history)
- [File integrity](#file-integrity-hash-comments)

## Features

The card has seven categories in an icon bar (icons only below roughly 480 px card width). Each category can be shown or hidden individually.

| Category | What it does |
|---|---|
| **Devices** | List with reachability, model, vendor, signal strength (dBm), battery, “last seen”; statistic chips as filters (offline / low battery / updates); search; sorting; **filters** (status, power, signal, network, firmware, last seen, ecosystems, manufacturer, device name, device class) and **grouping** by manufacturer, device name or device class; “Add device” |
| **Battery** | Battery devices, lowest level first; colors by low and critical threshold; devices without a percentage show the charge state (OK/warning/critical) |
| **Updates** | Installed vs. available firmware; “Check all” and “Install all one by one” as a background job with progress and cancel |
| **Functions** | Expose functions of all devices: **switches** (on/off) can be toggled directly in the card, plus values such as brightness, color temperature, temperature, humidity, pressure, illuminance (lx), occupancy, lock and cover state (read-only); filter (All / Switchable / On); a switch stays locked until the device reports back (no double click); not switchable on errors or for offline devices |
| **Fabrics** | Ecosystems (Apple Home, Google Home, Alexa, …) the devices are connected to; remove the connection to a foreign ecosystem |
| **Bindings** | Overview of all device links; unbind; re-bind in the device popup |
| **Server** (gear) | **App version** (integration and card, with a colored notice for a new version), Matter Server status, add device (setup code), fabric label, reconnect, event log, Notification Center (optional) |

**Device popup** (tap a row) with accordion sections: Information · Comment (editable) · Rename (with a list of the affected HA entities) · Firmware · Bindings · Functions · Entities (copy to the clipboard for automations and scripts) · Fabrics (incl. sharing with another ecosystem) · Diagnostics (check reachability, re-interview) · Remove.

More points:

- **Matter equivalents instead of Zigbee terms:** availability comes from the Matter Server, signal strength is an RSSI value in dBm (Wi-Fi or Thread), groups are replaced by fabrics, the “coordinator” is the Matter Server.
- **Devices behind bridges** (e.g. a Hue bridge) appear on their own; renaming and toggling functions are possible, firmware, bindings and fabrics stay locked.
- **Device images:** A small device image appears next to each row and in the popup. Matter provides no product images, so the card tries image names built from part number, product name and model one after another against the image library of the Zigbee2MQTT project (`https://www.zigbee2mqtt.io/images/devices/<model>.png`). If everything fails, the icon by device type is shown. **Privacy:** your browser (not Home Assistant) requests images from `zigbee2mqtt.io` and thereby transmits the devices' part number or product name. With `show_images: false` nothing is requested; `image_base` points to your own server (e.g. `/local/devices`), `device_images` assigns custom image URLs to individual devices (YAML only).
- **Functions and clipboard:** Switches are only toggled via the Matter commands "On"/"Off" of the OnOff cluster. Locks deliberately cannot be operated. In the popup, the button per entity (or "Copy all") copies the entity ID to the clipboard; if access is blocked (e.g. without HTTPS), a text field for manual copying appears.
- **Comments:** The device popup has a “Comment” section for your own note (up to 1000 characters) that you can edit and delete at any time. It is stored in Home Assistant’s storage (not on the device), is searchable and is left out of the diagnostics download. Only administrators can change it; with `read_only: true` an existing comment is shown but not editable.
- **Cache:** “last seen” and the update state survive a restart.
- **Two-click confirmation** instead of a browser dialog for risky actions (remove, update, reconnect, unbind).
- **Read only:** `read_only: true` hides all controls that change something (wall tablets).
- **Zoom:** `zoom` scales the whole card.
- **Languages:** German, English, Dutch and French (integration and card, following the Home Assistant language).
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

The integration serves the card and registers it as a Lovelace resource (persisted, with `?v=<version>` against stale browser caches). You do not need to add anything manually. If Lovelace runs in YAML mode, add `/matter_manager/matter-manager-card.js` as a resource of type `module`. If you set up 1.0.1 in YAML mode, change the old path `/matter_manager_files/…` to this one.

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
show_functions: true
show_images: true             # device images (source: see "Device images")
# image_base: /local/devices  # own image folder instead of zigbee2mqtt.io
show_bridge: true             # category "Server"
default_tab: devices          # devices | battery | updates | functions | fabrics | bindings | bridge
max_rows: 0                   # 0 = all, otherwise "show more"
zoom: 1
show_stats: true
show_search: true
show_filter_bar: true         # sort selection
show_group_by: true           # “Group by” selection
default_group_by: none        # none | vendor | model | class
show_filters: true            # filter area (status, battery, signal, manufacturer, …)
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
| `color_icon_devices`, `_battery`, `_updates`, `_functions`, `_fabrics`, `_bindings`, `_bridge` | Icon of the category – colors the tab icon and row icons |

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

## Notification Center (optional)

Matter Manager can send messages to the separate **Notification Center**, which collects them, sorts them by urgency and delivers them. The connection is **optional**: without the Notification Center nothing happens – no errors and no log messages. The transport is the Home Assistant event bus (interface “schema 1”, no MQTT). No credentials are sent.

You control it under **Server (gear) → Notification Center** or in the **Configure** dialog: one main switch and one switch per message type, sorted by urgency (critical first). Default: everything on. Disabled types are not sent; open messages of that type are closed by the Notification Center itself. If the Notification Center is not installed, the switches stay usable and the card says so. With `read_only: true` the switches disappear.

| Message type | Urgency | When | Closes |
|---|---|---|---|
| Matter Server unreachable | critical | connection to the Matter Server lost | when it is reachable again |
| Battery critical | critical | battery below the critical threshold | when the value is above it again |
| Device offline | warning | device is not reachable | when it is back online |
| Battery low | warning | battery below the low (but not critical) threshold | when the value is above it again |
| Firmware update available | info | an update exists for a device | when none is pending |
| New device | info | device added to the Matter Server | one-off, stays until acknowledged |
| Device removed | info | device removed from the Matter Server | one-off, stays until acknowledged |

Notes:

- At startup only the **initial state** is reported (without push), afterwards exactly one message per state change. The existing battery thresholds from the options apply; there are no new thresholds.
- Each message carries the device as its subject (so the Notification Center can filter per device later). The integration supplies the texts in five languages (German, English, Dutch, French, Spanish) once when registering.
- The Home Assistant events `matter_manager_*` remain unchanged and independent.
- **Test status:** The connection was tested against a simulated event bus and in a headless browser, **not against a real Notification Center and not on real hardware**.

## Sensors

`Devices`, `Offline devices`, `Devices with low battery`, `Devices with critical battery`, `Available firmware updates` and `Fabrics`. The sensors for offline, battery and updates carry the device list as an attribute.

## Version display and update notice

The installed version is shown in three places: in the card under **Server (gear) → App version**, at the top of the graphical card editor, and in the **Configure** dialog of the integration. At startup and every 12 hours afterwards the integration asks GitHub (`api.github.com`, latest release, falling back to the highest version tag) whether a newer version has been published. If there is one, it is highlighted: orange border and notice in the section, an orange “↑” on the gear icon, a warning box in the editor and a notice in the Configure dialog. The update itself is done via HACS as usual. **Check now** triggers the query immediately. If GitHub is not reachable, “Check not possible” is shown; the card keeps working unchanged.

If the card and integration versions differ (stale browser cache), this is also marked in orange.

## Integration settings

Under **Configure** (showing the installed version): “low battery” threshold, “critical battery” threshold (must be less than or equal) and events on/off. **Reconfigure** lets you change the Matter Server address.

The dialog also contains **Send messages to the Notification Center** (main switch) and **Message types to send** (see [Notification Center](#notification-center-optional)). Changes to these two switches are applied without reloading the integration.

## Security

All write actions (rename, comments, remove, toggling functions, firmware, bindings, fabrics, add device, reconnect, version check) and loading of the device details are restricted to **administrators** via WebSocket. Input is validated by the backend (setup code format, name and comment length, known devices, own fabric cannot be removed). When a binding is created, an access entry (ACL) is only added on the target device if an administrator entry via CASE already exists there, so Home Assistant never loses access. The card escapes all texts; color values pass an allowlist. The setup code shown for an open pairing window is visible to administrators only and valid for five minutes. Switching is limited to on/off of the OnOff cluster, the value must be a boolean and the device must be reachable; locks and all other functions are read-only. Image addresses from `device_images` and `image_base` are checked against unsafe schemes (e.g. `javascript:`).

The Notification Center switches can only be changed over WebSocket by an **administrator**; the message type is checked against the list of known types. Messages contain only device names and values such as the battery level.

## Known limitations

- **Version 1.1.0 has only been tested with simulated data and a simulated Matter server, not on real hardware.** It was developed against the documented WebSocket interface of python-matter-server.
- **Notification Center:** The connection was only tested against a simulated event bus, not against a real Notification Center. The card and the integration dialog are translated into German, English, Dutch and French; for Spanish the integration only supplies the message texts to the Notification Center, the card then shows English.
- **Manufacturer and device name** come from the device's basic data (vendor name and product name). If the product name starts with the manufacturer name, it is removed; if the manufacturer is missing, it is only detected when another device reports the same manufacturer name. Without these values the device appears under “Unknown”. The device class comes from the endpoints' device types; devices with an unknown type land in “Other”. Both were only checked with simulated data.
- **Writing Matter commands are untested:** the format of `set_acl_entry`/`set_node_binding` (bindings), `commission_with_code`, `open_commissioning_window` and `remove_matter_fabric` may differ depending on the Matter Server version. In that case the function has no effect or reports an error – read-only functions are not affected.
- **No groups:** Zigbee groups have no direct Matter equivalent for this interface; the category is called “Fabrics” instead.
- **Device images:** The hit rate of the image library for Matter devices is unknown; the image names are candidates, not a guaranteed match. If an image is missing, the icon is shown. Fetching from `zigbee2mqtt.io` could not be verified in the development environment.
- **Functions:** Reading the function attributes and the switch command (`device_command` On/Off) were only tested with simulated data – **untested on real hardware**. Sensor values refresh about once a minute; devices behind bridges can now be switched if they report OnOff. With `read_only: true`, switches and the entity list disappear.
- Signal strength exists only for Wi-Fi and Thread devices (for Thread: best neighbor). Bridge and Ethernet devices have no value.
- Battery devices (Thread, “sleepy”) often pick up updates and bindings only after hours or after a button press.
- The entity preview when renaming finds devices via the identifiers of the Matter integration and can stay empty in special cases.
- “Install all” waits up to two hours per device for the update to finish.
- Recently removed devices that are unreachable may stay registered on the device and have to be reset.

## Troubleshooting

- **Card not found:** clear the browser cache; check under Settings → Dashboards → Resources whether `/matter_manager/…` exists (add manually in YAML mode).
- **“Matter Server not connected”:** check the address under **Reconfigure**. The connection is re-established automatically; **Server → Maintenance → Reconnect** forces it immediately.
- **“Matter Server version too old”:** update the Matter Server (API schema 8 or newer).
- **No signal value:** only Wi-Fi and Thread devices report it; some devices do not provide it.
- **“No connection to the integration”:** is the integration loaded? Is `entry_id` correct?
- Logs: set `custom_components.matter_manager` to `debug`.

## Version history

| Version | Change |
|---|---|
| **1.1.0** | New: **comments** in the device popup (editable, searchable, changeable by administrators only); optional connection to the **Notification Center** (interface “schema 1” over the event bus): message types server unreachable, device offline, battery critical/low, firmware update, new/removed device; main switch and a switch per message type in the card (Server → Notification Center) and in the Configure dialog, sorted by urgency. Fixed: typing in the card’s input fields (e.g. “e” in the name field) no longer triggers Home Assistant keyboard shortcuts such as the entity search. Changed: the device registry is queried without `device_registry.devices`, which is removed in Home Assistant 2027.9. Tested only with simulated data, not against a real Notification Center and not on real hardware |
| **1.0.3** | New: small device images (candidates from the Zigbee2MQTT image library, can be disabled, own image folder possible), category **Functions** with switchable on/off switches and measured values, device popup sections Functions and Entities with copy to clipboard. New keys `show_functions`, `show_images`, `image_base`, `device_images`, `color_icon_functions`. Tested only with simulated data and in a headless browser, not on real hardware |
| **1.0.2** | Card resource path corrected: `/matter_manager/matter-manager-card.js` instead of `/matter_manager_files/…` (existing entries are migrated automatically). Manufacturer and device name are read from the type designation. New: filters and grouping (manufacturer, device name, device class) as in the Zigbee2MQTT Manager. French (pull request #1) |
| 1.0.1 | First release on GitHub: new icon and logo, Dutch (integration and card), README in three languages |
| 1.0.0 | Internal state before the release |

## File integrity (hash comments)

The first line of every `.py`, `.js` and `.yaml` file contains a SHA-256 hash of the rest of the file. This makes an unintended or foreign change detectable.

JSON files have no comments. Their SHA-256 hashes (over the complete file, `sha256sum <file>`) are listed in the [German README](README.md#datei-integrität-hash-kommentare).

## License

MIT
