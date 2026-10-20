# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): a192b436ea4735f6ece406466e097f5b8a3b6d63a960b71552d5753387a9416a
"""Prüft auf GitHub, ob eine neuere Version der Integration veröffentlicht wurde."""

from __future__ import annotations

import logging
import re
from typing import Any

import aiohttp

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    GITHUB_API_LATEST,
    GITHUB_API_RELEASES,
    GITHUB_API_TAGS,
    GITHUB_RELEASES_URL,
    GITHUB_REPO,
)

_LOGGER = logging.getLogger(__name__)

_VERSION_RE = re.compile(
    r"^[vV]?(\d+(?:\.\d+)*)(?:[-_.]?(alpha|a|beta|b|rc|c)[-_.]?(\d+)?)?", re.IGNORECASE
)
_TIMEOUT = aiohttp.ClientTimeout(total=15)
_HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "matter_manager",
}
# Vorabversionen sind kleiner als die fertige Version: 1.0.4b1 < 1.0.4rc1 < 1.0.4
_PRE_RANK = {"alpha": 0, "a": 0, "beta": 1, "b": 1, "rc": 2, "c": 2}
_FINAL_RANK = 3


def parse_version(text: Any) -> tuple[int, ...] | None:
    """\"v1.2.3\" -> (1, 2, 3, 0, 3, 0); Vorabversionen (b/rc) sortieren vor der fertigen Version."""
    if not isinstance(text, str):
        return None
    match = _VERSION_RE.match(text.strip())
    if not match:
        return None
    base = tuple(int(p) for p in match.group(1).split("."))[:4]
    base = base + (0,) * (4 - len(base))
    pre = match.group(2)
    if pre:
        return base + (_PRE_RANK[pre.lower()], int(match.group(3) or 0))
    return base + (_FINAL_RANK, 0)


def is_prerelease(version: str | None) -> bool:
    """True bei Beta-/RC-Versionen wie 1.0.4b1 oder 1.0.4rc1."""
    parsed = parse_version(version)
    return parsed is not None and parsed[4] < _FINAL_RANK


def is_newer(latest: str | None, current: str | None) -> bool:
    new, cur = parse_version(latest), parse_version(current)
    return new is not None and cur is not None and new > cur


async def async_fetch_latest(
    hass: HomeAssistant, include_prereleases: bool = False
) -> dict[str, str] | None:
    """Neueste veröffentlichte Version holen: {\"version\", \"url\"} oder None bei Fehler.

    Mit include_prereleases (installierte Version ist Beta/RC) werden auch
    Pre-releases berücksichtigt, denn "releases/latest" liefert keine.
    """
    session = async_get_clientsession(hass)
    try:
        if include_prereleases:
            async with session.get(
                GITHUB_API_RELEASES, headers=_HEADERS, timeout=_TIMEOUT
            ) as resp:
                if resp.status == 200:
                    releases = await resp.json()
                    found = [
                        r
                        for r in (releases if isinstance(releases, list) else [])
                        if isinstance(r, dict)
                        and not r.get("draft")
                        and parse_version(r.get("tag_name"))
                    ]
                    if found:
                        best = max(found, key=lambda r: parse_version(r["tag_name"]) or ())
                        return {
                            "version": str(best["tag_name"]).lstrip("vV"),
                            "url": best.get("html_url") or GITHUB_RELEASES_URL,
                        }
                elif resp.status != 404:
                    _LOGGER.debug("GitHub-Releases-Abfrage: HTTP %s", resp.status)
                    return None

        async with session.get(
            GITHUB_API_LATEST, headers=_HEADERS, timeout=_TIMEOUT
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                tag = data.get("tag_name") if isinstance(data, dict) else None
                if parse_version(tag):
                    return {
                        "version": str(tag).lstrip("vV"),
                        "url": data.get("html_url") or GITHUB_RELEASES_URL,
                    }
            elif resp.status != 404:
                _LOGGER.debug("GitHub-Release-Abfrage: HTTP %s", resp.status)
                return None

        # Noch kein Release veröffentlicht: höchstes Versions-Tag verwenden
        async with session.get(
            GITHUB_API_TAGS, headers=_HEADERS, timeout=_TIMEOUT
        ) as resp:
            if resp.status != 200:
                return None
            tags = await resp.json()
    except (aiohttp.ClientError, TimeoutError, ValueError) as err:
        _LOGGER.debug("Prüfung auf neue App-Version fehlgeschlagen: %s", err)
        return None

    candidates = [
        t["name"]
        for t in (tags if isinstance(tags, list) else [])
        if isinstance(t, dict)
        and parse_version(t.get("name"))
        and (include_prereleases or not is_prerelease(t.get("name")))
    ]
    if not candidates:
        return None
    best = max(candidates, key=lambda n: parse_version(n) or ())
    return {
        "version": best.lstrip("vV"),
        "url": f"https://github.com/{GITHUB_REPO}/releases/tag/{best}",
    }
