# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 351c20b3e4bbb47a1aa4eb389eeddc47374f932c49d12c5c9e8accb603b06abe
"""Schlanker WebSocket-Client für den Matter Server (python-matter-server).

Das Modul kennt Home Assistant nicht und ist deshalb einzeln testbar. Es hält eine
dauerhafte Verbindung (mit automatischem Wiederverbinden), abonniert alle Geräte
(``start_listening``) und reicht Ereignisse per Callback weiter:

    connected      {"server_info": {...}, "nodes": [...]}   Snapshot nach (Wieder-)Verbindung
    disconnected   None
    <Server-Ereignis>  node_added, node_updated, node_removed, attribute_updated,
                       node_event, server_info_updated, server_shutdown
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import uuid
from collections.abc import Callable
from typing import Any

import aiohttp

_LOGGER = logging.getLogger(__name__)

EventCallback = Callable[[str, Any], None]

CONNECT_TIMEOUT = 15
COMMAND_TIMEOUT = 30
LISTEN_TIMEOUT = 180
RECONNECT_MIN = 3
RECONNECT_MAX = 60
HEARTBEAT = 55


class MatterServerError(Exception):
    """Fehler, den der Matter Server meldet (oder ein Zeitlimit)."""

    def __init__(self, message: str, code: int | None = None) -> None:
        super().__init__(message)
        self.code = code


class MatterConnectionError(MatterServerError):
    """Keine (oder eine abgebrochene) Verbindung zum Matter Server."""


async def async_probe(session: aiohttp.ClientSession, url: str) -> dict[str, Any]:
    """Verbindung testen und die Server-Info lesen (für den Config Flow)."""
    try:
        async with asyncio.timeout(CONNECT_TIMEOUT):
            async with session.ws_connect(url, max_msg_size=0) as ws:
                hello = await ws.receive_json()
    except (aiohttp.ClientError, TimeoutError, ValueError, TypeError) as err:
        raise MatterConnectionError(str(err) or type(err).__name__) from err
    if not isinstance(hello, dict) or "schema_version" not in hello:
        raise MatterServerError("Unerwartete Antwort – ist das ein Matter Server?")
    return hello


class MatterServerClient:
    """Dauerhafte Verbindung zum Matter Server mit Befehlen und Ereignissen."""

    def __init__(
        self, session: aiohttp.ClientSession, url: str, on_event: EventCallback
    ) -> None:
        self._session = session
        self._url = url
        self._on_event = on_event
        self._ws: aiohttp.ClientWebSocketResponse | None = None
        self._pending: dict[str, asyncio.Future[Any]] = {}
        self._listen_id: str | None = None
        self._stopped = False
        self._first_connected = asyncio.Event()
        self.server_info: dict[str, Any] = {}
        self.connected = False

    @property
    def url(self) -> str:
        return self._url

    # ------------------------------------------------------------------
    # Lebenszyklus
    # ------------------------------------------------------------------
    async def async_wait_connected(self, timeout: float) -> None:
        """Wartet auf die erste vollständige Verbindung (TimeoutError sonst)."""
        await asyncio.wait_for(self._first_connected.wait(), timeout)

    async def async_run(self) -> None:
        """Verbindet, hört zu und verbindet nach Abbrüchen automatisch neu."""
        delay = RECONNECT_MIN
        while not self._stopped:
            established = False
            try:
                established = await self._session_once()
            except asyncio.CancelledError:
                raise
            except Exception as err:  # noqa: BLE001 - Schleife darf nie sterben
                _LOGGER.debug("Matter-Server-Verbindung beendet: %s", err)
            if self._stopped:
                break
            delay = RECONNECT_MIN if established else min(delay * 2, RECONNECT_MAX)
            await asyncio.sleep(delay)

    async def async_close(self) -> None:
        self._stopped = True
        await self._close_ws()

    async def async_reconnect(self) -> None:
        """Verbindung kappen; die Hauptschleife baut sie sofort neu auf."""
        await self._close_ws()

    async def _close_ws(self) -> None:
        ws = self._ws
        if ws is not None and not ws.closed:
            with contextlib.suppress(Exception):
                await ws.close()

    # ------------------------------------------------------------------
    # Verbindung
    # ------------------------------------------------------------------
    async def _session_once(self) -> bool:
        """Eine Verbindung aufbauen und bis zu ihrem Ende bedienen.

        Rückgabe: True, wenn die Verbindung vollständig stand (Snapshot erhalten).
        """
        async with asyncio.timeout(CONNECT_TIMEOUT):
            ws = await self._session.ws_connect(
                self._url, heartbeat=HEARTBEAT, max_msg_size=0
            )
            try:
                hello = await ws.receive_json()
            except BaseException:
                await ws.close()
                raise
        if not isinstance(hello, dict) or "schema_version" not in hello:
            await ws.close()
            raise MatterServerError("Unerwartete Antwort des Servers")

        self.server_info = hello
        self._ws = ws
        reader = asyncio.create_task(self._read_loop(ws))
        established = False
        try:
            self._listen_id = uuid.uuid4().hex
            await self._request(
                self._listen_id, "start_listening", {}, LISTEN_TIMEOUT
            )
            established = True
            await reader
        finally:
            reader.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await reader
            self._ws = None
            with contextlib.suppress(Exception):
                await ws.close()
            self._fail_pending()
            self._listen_id = None
            if self.connected:
                self.connected = False
                self._emit("disconnected", None)
        return established

    async def _read_loop(self, ws: aiohttp.ClientWebSocketResponse) -> None:
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                try:
                    data = msg.json()
                except ValueError:
                    continue
                self._handle_message(data)
            elif msg.type in (
                aiohttp.WSMsgType.CLOSE,
                aiohttp.WSMsgType.CLOSING,
                aiohttp.WSMsgType.CLOSED,
                aiohttp.WSMsgType.ERROR,
            ):
                break

    def _fail_pending(self) -> None:
        for fut in self._pending.values():
            if not fut.done():
                fut.set_exception(
                    MatterConnectionError("Verbindung zum Matter Server getrennt")
                )
        self._pending.clear()

    def _emit(self, kind: str, payload: Any) -> None:
        try:
            self._on_event(kind, payload)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Fehler bei der Verarbeitung von %s", kind)

    def _handle_message(self, data: Any) -> None:
        if not isinstance(data, dict):
            return
        message_id = data.get("message_id")
        if message_id is not None:
            message_id = str(message_id)
            failed = "error_code" in data
            # Den Snapshot sofort verarbeiten, bevor das nächste Ereignis gelesen wird
            if message_id == self._listen_id and not failed:
                nodes = data.get("result")
                self.connected = True
                self._first_connected.set()
                self._emit(
                    "connected",
                    {
                        "server_info": self.server_info,
                        "nodes": nodes if isinstance(nodes, list) else [],
                    },
                )
            fut = self._pending.pop(message_id, None)
            if fut is not None and not fut.done():
                if failed:
                    code = data.get("error_code")
                    fut.set_exception(
                        MatterServerError(
                            str(data.get("details") or f"Fehler {code}"),
                            code if isinstance(code, int) else None,
                        )
                    )
                else:
                    fut.set_result(data.get("result"))
            return
        event = data.get("event")
        if event is None:
            return
        if event == "server_info_updated" and isinstance(data.get("data"), dict):
            self.server_info = data["data"]
        self._emit(str(event), data.get("data"))

    # ------------------------------------------------------------------
    # Befehle
    # ------------------------------------------------------------------
    async def send_command(
        self, command: str, *, request_timeout: float = COMMAND_TIMEOUT, **args: Any
    ) -> Any:
        """Befehl senden und auf die Antwort warten.

        ``request_timeout`` ist das Zeitlimit für die Antwort; alle weiteren
        Schlüsselwörter werden unverändert als Argumente an den Server gereicht
        (z. B. ``timeout`` bei ``open_commissioning_window``).
        """
        return await self._request(uuid.uuid4().hex, command, args, request_timeout)

    async def _request(
        self, message_id: str, command: str, args: dict[str, Any], timeout: float
    ) -> Any:
        ws = self._ws
        if ws is None or ws.closed:
            raise MatterConnectionError("Nicht mit dem Matter Server verbunden")
        future: asyncio.Future[Any] = asyncio.get_running_loop().create_future()
        self._pending[message_id] = future
        try:
            await ws.send_json(
                {
                    "message_id": message_id,
                    "command": command,
                    "args": {k: v for k, v in args.items() if v is not None},
                }
            )
            async with asyncio.timeout(timeout):
                return await future
        except TimeoutError as err:
            raise MatterServerError(
                f"Zeitüberschreitung beim Befehl „{command}“"
            ) from err
        except (aiohttp.ClientError, ConnectionError, RuntimeError) as err:
            raise MatterConnectionError(str(err) or type(err).__name__) from err
        finally:
            self._pending.pop(message_id, None)
