# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): a5ac3324052912cc7188be8df23eb4870552871a7b51caa76c2f3fdc2f3d4c92
"""Config Flow für Matter Manager."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlsplit

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.selector import (
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)

from .const import (
    CONF_CRITICAL_BATTERY,
    CONF_FIRE_EVENTS,
    CONF_LOW_BATTERY,
    CONF_SIDEBAR_ENABLED,
    CONF_SIDEBAR_TITLE,
    CONF_URL,
    DEFAULT_CRITICAL_BATTERY,
    DEFAULT_FIRE_EVENTS,
    DEFAULT_LOW_BATTERY,
    DEFAULT_SIDEBAR_ENABLED,
    DEFAULT_SIDEBAR_TITLE,
    DEFAULT_URL,
    DOMAIN,
    SIDEBAR_TITLE_MAX,
    VERSION,
)
from .matter_client import MatterConnectionError, MatterServerError, async_probe
from .nc_catalog import NC_CATALOG, NC_TYPE_KEYS
from .notification_bridge import OPT_ENABLED, OPT_TYPES

_BATTERY_VALIDATOR = vol.All(vol.Coerce(int), vol.Range(min=1, max=99))


def normalize_url(url: str) -> str | None:
    """Adresse prüfen und vereinheitlichen; None, wenn sie nicht brauchbar ist."""
    parts = urlsplit((url or "").strip())
    if parts.scheme not in ("ws", "wss") or not parts.hostname:
        return None
    try:
        parts.port  # noqa: B018 - löst bei ungültigem Port einen ValueError aus
    except ValueError:
        return None
    netloc = parts.netloc.lower()
    return f"{parts.scheme}://{netloc}{parts.path.rstrip('/') or '/ws'}" + (
        f"?{parts.query}" if parts.query else ""
    )


def title_for(url: str) -> str:
    return f"Matter Manager ({urlsplit(url).hostname})"


def suggested_url(hass: HomeAssistant) -> str:
    """Adresse der vorhandenen Matter-Integration als Vorschlag übernehmen."""
    for entry in hass.config_entries.async_entries("matter"):
        url = entry.data.get("url")
        if isinstance(url, str) and normalize_url(url):
            return url
    return DEFAULT_URL


async def _async_check(hass: HomeAssistant, url: str) -> str | None:
    """Fehlerschlüssel oder None, wenn der Matter Server antwortet."""
    try:
        await async_probe(async_get_clientsession(hass), url)
    except MatterConnectionError:
        return "cannot_connect"
    except MatterServerError:
        return "not_matter_server"
    return None


class MatterManagerConfigFlow(ConfigFlow, domain=DOMAIN):
    """Einrichtung: Adresse des Matter Servers."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return MatterManagerOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        default_url = suggested_url(self.hass)

        if user_input is not None:
            default_url = user_input[CONF_URL]
            url = normalize_url(user_input[CONF_URL])
            if url is None:
                errors[CONF_URL] = "invalid_url"
            else:
                await self.async_set_unique_id(url)
                self._abort_if_unique_id_configured()
                error = await _async_check(self.hass, url)
                if error:
                    errors[CONF_URL] = error
                else:
                    return self.async_create_entry(
                        title=title_for(url),
                        data={CONF_URL: url},
                        options={
                            CONF_LOW_BATTERY: user_input[CONF_LOW_BATTERY],
                            CONF_CRITICAL_BATTERY: min(
                                DEFAULT_CRITICAL_BATTERY, user_input[CONF_LOW_BATTERY]
                            ),
                            CONF_FIRE_EVENTS: DEFAULT_FIRE_EVENTS,
                        },
                    )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_URL, default=default_url): str,
                    vol.Required(
                        CONF_LOW_BATTERY, default=DEFAULT_LOW_BATTERY
                    ): _BATTERY_VALIDATOR,
                }
            ),
            errors=errors,
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Adresse des Matter Servers nachträglich ändern."""
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}
        current = entry.data[CONF_URL]

        if user_input is not None:
            current = user_input[CONF_URL]
            url = normalize_url(user_input[CONF_URL])
            if url is None:
                errors[CONF_URL] = "invalid_url"
            else:
                await self.async_set_unique_id(url)
                self._abort_if_unique_id_mismatch(reason="already_configured")
                error = await _async_check(self.hass, url)
                if error:
                    errors[CONF_URL] = error
                else:
                    return self.async_update_reload_and_abort(
                        entry,
                        unique_id=url,
                        title=title_for(url),
                        data_updates={CONF_URL: url},
                    )

        return self.async_show_form(
            step_id="reconfigure",
            data_schema=vol.Schema({vol.Required(CONF_URL, default=current): str}),
            errors=errors,
        )


class MatterManagerOptionsFlow(OptionsFlow):
    """Nachträglich änderbar: Batterie-Schwellen, Ereignisse und Notification Center."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            sidebar_title = str(user_input.get(CONF_SIDEBAR_TITLE) or "").strip()
            if user_input[CONF_CRITICAL_BATTERY] > user_input[CONF_LOW_BATTERY]:
                errors[CONF_CRITICAL_BATTERY] = "critical_above_low"
            if len(sidebar_title) > SIDEBAR_TITLE_MAX:
                errors[CONF_SIDEBAR_TITLE] = "sidebar_title_too_long"
            if not errors:
                chosen = set(user_input.get(OPT_TYPES) or [])
                data = {
                    **user_input,
                    CONF_SIDEBAR_TITLE: sidebar_title or DEFAULT_SIDEBAR_TITLE,
                    OPT_TYPES: {t: t in chosen for t in NC_TYPE_KEYS},
                }
                return self.async_create_entry(data=data)

        opts = self.config_entry.options
        nc_chosen = opts.get(OPT_TYPES, {})
        nc_enabled_types = [
            item["type"]
            for item in NC_CATALOG
            if nc_chosen.get(item["type"], item.get("enabled_default", True))
        ]
        manager = getattr(self.config_entry, "runtime_data", None)
        app = getattr(manager, "app", None) or {}
        german = str(self.hass.config.language).startswith("de")
        if app.get("update_available"):
            update_info = (
                f"⚠️ Neue Version verfügbar: **{app.get('latest_version')}** – {app.get('release_url')}"
                if german
                else f"⚠️ New version available: **{app.get('latest_version')}** – {app.get('release_url')}"
            )
        elif app.get("latest_version"):
            update_info = "✅ Aktuell" if german else "✅ Up to date"
        else:
            update_info = ""
        return self.async_show_form(
            step_id="init",
            description_placeholders={
                "version": app.get("version") or VERSION,
                "update_info": update_info,
            },
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_LOW_BATTERY,
                        default=opts.get(CONF_LOW_BATTERY, DEFAULT_LOW_BATTERY),
                    ): _BATTERY_VALIDATOR,
                    vol.Required(
                        CONF_CRITICAL_BATTERY,
                        default=opts.get(
                            CONF_CRITICAL_BATTERY, DEFAULT_CRITICAL_BATTERY
                        ),
                    ): _BATTERY_VALIDATOR,
                    vol.Required(
                        CONF_FIRE_EVENTS,
                        default=opts.get(CONF_FIRE_EVENTS, DEFAULT_FIRE_EVENTS),
                    ): bool,
                    vol.Required(
                        CONF_SIDEBAR_ENABLED,
                        default=opts.get(CONF_SIDEBAR_ENABLED, DEFAULT_SIDEBAR_ENABLED),
                    ): bool,
                    vol.Required(
                        CONF_SIDEBAR_TITLE,
                        default=opts.get(CONF_SIDEBAR_TITLE) or DEFAULT_SIDEBAR_TITLE,
                    ): str,
                    vol.Required(
                        OPT_ENABLED, default=opts.get(OPT_ENABLED, True)
                    ): bool,
                    vol.Required(OPT_TYPES, default=nc_enabled_types): SelectSelector(
                        SelectSelectorConfig(
                            options=list(NC_TYPE_KEYS),
                            multiple=True,
                            mode=SelectSelectorMode.LIST,
                            translation_key="nc_types",
                        )
                    ),
                }
            ),
            errors=errors,
        )
