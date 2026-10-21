<h2 align="center"><a href="README.md">🇩🇪 Deutsch</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="README.en.md">🇬🇧 English</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="README.nl.md">🇳🇱 Nederlands</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="README.fr.md">🇫🇷 Français</a>&nbsp;&nbsp;·&nbsp;&nbsp;🇪🇸 <b>[ Español ]</b></h2>

<p align="center"><img src="https://raw.githubusercontent.com/Meine-smarte-Welt/matter_manager/main/docs/images/matter-manager-banner.webp" alt="Matter Manager" width="420"></p>

# Matter Manager para Home Assistant

Gestiona dispositivos Matter sin salir de Home Assistant: dispositivos, baterías, actualizaciones de firmware, fabrics (multi-admin), bindings y Matter Server en una sola tarjeta de panel – como integración de HACS. La estructura y el diseño siguen al [Zigbee2MQTT Manager](https://github.com/Meine-smarte-Welt/zigbee2mqtt_manager): categorías con iconos, listas de filas, ventana de detalles, secciones tipo acordeón, editor gráfico y colores totalmente configurables.

📖 **Artículo detallado con guía y contexto (en alemán):** [Matter Manager para Home Assistant en Meine smarte Welt](https://meinesmartewelt.de/matter-manager-home-assistant/)

## Capturas de pantalla

<table>
<tr>
<td align="center" valign="top"><img src="https://raw.githubusercontent.com/Meine-smarte-Welt/matter_manager/main/docs/images/screenshot-geraeteuebersicht.webp" alt="Resumen de dispositivos con chips de estadística, búsqueda, ordenación y filtros" width="340"><br><sub>Resumen de dispositivos con chips de estadística, búsqueda, ordenación y filtros</sub></td>
<td align="center" valign="top"><img src="https://raw.githubusercontent.com/Meine-smarte-Welt/matter_manager/main/docs/images/screenshot-karten-editor.webp" alt="Editor de la tarjeta con bloque de versión y categorías" width="340"><br><sub>Editor de la tarjeta con bloque de versión y categorías</sub></td>
</tr>
</table>

<sub>Las capturas proceden de la versión 1.0.3.</sub>

## Contenido

- [Funciones](#funciones)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [La tarjeta](#la-tarjeta)
- [Colores](#colores)
- [Servicios](#servicios)
- [Eventos para automatizaciones](#eventos-para-automatizaciones)
- [Notification Center (opcional)](#notification-center-opcional)
- [Sensores](#sensores)
- [Indicador de versión y aviso de actualización](#indicador-de-versión-y-aviso-de-actualización)
- [Ajustes de la integración](#ajustes-de-la-integración)
- [Seguridad](#seguridad)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Solución de problemas](#solución-de-problemas)
- [Historial de versiones](#historial-de-versiones)
- [Integridad de los archivos](#integridad-de-los-archivos-comentarios-hash)

## Funciones

La tarjeta tiene siete categorías en una barra de iconos (solo iconos por debajo de unos 480 px de ancho de tarjeta). Cada categoría se puede mostrar u ocultar por separado.

| Categoría | Qué hace |
|---|---|
| **Dispositivos** | Lista con accesibilidad, modelo, fabricante, intensidad de señal (dBm), batería y «visto por última vez»; chips de estadística como filtros (sin conexión / batería baja / actualizaciones); búsqueda; ordenación; **filtros** (estado, alimentación, señal, red, firmware, visto por última vez, ecosistemas, fabricante, nombre del dispositivo, clase de dispositivo) y **agrupación** por fabricante, nombre del dispositivo o clase de dispositivo; «Añadir dispositivo» |
| **Batería** | Dispositivos con batería, primero el nivel más bajo; colores según el umbral de batería baja y crítica; los dispositivos sin porcentaje muestran el estado de carga (OK/aviso/crítico) |
| **Actualizaciones** | Firmware instalado frente a disponible; «Buscar todas» e «Instalar todas una a una» como tarea en segundo plano con progreso y cancelación |
| **Funciones** | Funciones expuestas de todos los dispositivos: los **interruptores** (encendido/apagado) se pueden conmutar directamente en la tarjeta, además de valores como brillo, temperatura de color, temperatura, humedad, presión, iluminancia (lx), presencia, estado de cerradura y de persiana (solo lectura); filtro (Todos / Conmutables / Encendidos); un interruptor permanece bloqueado hasta que el dispositivo responde (sin doble clic); no se puede conmutar si hay errores o el dispositivo está sin conexión |
| **Fabrics** | Ecosistemas (Apple Home, Google Home, Alexa, …) a los que están conectados los dispositivos; eliminar la conexión con un ecosistema ajeno |
| **Bindings** | Resumen de todas las vinculaciones entre dispositivos; desvincular; volver a vincular en la ventana del dispositivo |
| **Servidor** (engranaje) | **Versión de la app** (integración y tarjeta, con aviso en color si hay una versión nueva), estado del Matter Server, añadir dispositivo (código de configuración), etiqueta del fabric, reconectar, registro de eventos, Notification Center (opcional) |

**Ventana del dispositivo** (pulsa una fila) con secciones tipo acordeón: Información · Comentario (editable) · Renombrar (con la lista de entidades de HA afectadas) · Firmware · Bindings · Funciones · Entidades (copiar al portapapeles para automatizaciones y scripts) · Fabrics (incl. compartir con otro ecosistema) · Diagnóstico (comprobar accesibilidad, volver a entrevistar) · Eliminar.

Más puntos:

- **Equivalentes de Matter en lugar de términos de Zigbee:** la disponibilidad procede del Matter Server, la intensidad de señal es un valor RSSI en dBm (Wi-Fi o Thread), los grupos se sustituyen por fabrics y el «coordinador» es el Matter Server.
- **Entrada propia en la barra lateral (desde 1.1.1):** Matter Manager aparece como entrada propia en la barra lateral de Home Assistant. El nombre es libre (por defecto «Matter Manager») y se cambia en el diálogo **Configurar**; con varias entradas puedes nombrar cada una por separado. También se puede ocultar.
- **Dispositivos tras puentes** (p. ej. un puente Hue) aparecen por separado; se pueden renombrar y conmutar funciones, mientras que firmware, bindings y fabrics permanecen bloqueados.
- **Imágenes de dispositivos:** junto a cada fila y en la ventana aparece una pequeña imagen del dispositivo. Matter no proporciona imágenes de producto, por eso la tarjeta prueba uno tras otro nombres de imagen formados con el número de pieza, el nombre del producto y el modelo en la biblioteca de imágenes del proyecto Zigbee2MQTT (`https://www.zigbee2mqtt.io/images/devices/<model>.png`). Si todo falla, se muestra el icono según el tipo de dispositivo. **Privacidad:** tu navegador (no Home Assistant) solicita las imágenes a `zigbee2mqtt.io` y con ello transmite el número de pieza o el nombre del producto de los dispositivos. Con `show_images: false` no se solicita nada; `image_base` apunta a tu propio servidor (p. ej. `/local/devices`) y `device_images` asigna URL de imagen propias a dispositivos concretos (solo YAML).
- **Funciones y portapapeles:** los interruptores solo se conmutan mediante los comandos Matter «On»/«Off» del cluster OnOff. Las cerraduras deliberadamente no se pueden accionar. En la ventana, el botón de cada entidad (o «Copiar todo») copia el ID de la entidad al portapapeles; si el acceso está bloqueado (p. ej. sin HTTPS), aparece un campo de texto para copiar a mano.
- **Comentarios:** la ventana del dispositivo tiene una sección «Comentario» para tu propia nota (hasta 1000 caracteres) que puedes editar y borrar en cualquier momento. Se guarda en el almacenamiento de Home Assistant (no en el dispositivo), se puede buscar y no se incluye en la descarga de diagnóstico. Solo los administradores pueden cambiarlo; con `read_only: true` un comentario existente se muestra pero no se puede editar.
- **Caché:** «visto por última vez» y el estado de actualización se conservan tras un reinicio.
- **Confirmación con dos clics** en lugar de un cuadro de diálogo del navegador para acciones arriesgadas (eliminar, actualizar, reconectar, desvincular).
- **Solo lectura:** `read_only: true` oculta todos los controles que modifican algo (tabletas de pared).
- **Zoom:** `zoom` escala toda la tarjeta.
- **Idiomas:** alemán, inglés, neerlandés, francés y español (integración y tarjeta, según el idioma de Home Assistant).
- **Descarga de diagnóstico** con nombres e ID anonimizados.

## Requisitos

- Home Assistant **2025.6** o posterior
- Un **Matter Server** en funcionamiento (p. ej. el complemento «Matter Server» o el contenedor `python-matter-server`) con interfaz WebSocket, esquema de API **8** o posterior
- La integración estándar **Matter** es necesaria para las entidades de los dispositivos. Matter Manager usa la misma dirección de servidor y la propone automáticamente durante la configuración.

## Instalación

1. HACS → ⋮ → **Repositorios personalizados** → URL de este repositorio, categoría **Integración**
2. Instalar «Matter Manager» y reiniciar Home Assistant
3. **Ajustes → Dispositivos y servicios → Añadir integración → Matter Manager**
4. Comprobar la dirección del Matter Server (por defecto `ws://core-matter-server:5580/ws`) y elegir el umbral de «batería baja»

Manual: copia la carpeta `custom_components/matter_manager` a `<config>/custom_components/`.

## La tarjeta

La integración sirve la tarjeta y la registra como recurso de Lovelace (persistente, con `?v=<versión>` contra cachés de navegador obsoletas). No tienes que añadir nada a mano. Si Lovelace funciona en modo YAML, añade `/matter_manager/matter-manager-card.js` como recurso de tipo `module`. Si configuraste la 1.0.1 en modo YAML, cambia la ruta antigua `/matter_manager_files/…` por esta.

Añadir la tarjeta: **Editar panel → Añadir tarjeta → «Matter Manager»**. El editor gráfico agrupa todos los ajustes en secciones desplegables (categorías, apariencia con columnas, edición, colores). No hace falta YAML, pero es posible:

```yaml
type: custom:matter-manager-card
title: Matter Manager         # vacío ("") = sin encabezado
# entry_id: abc123            # solo con varias entradas de Matter Manager
show_devices: true
show_battery: true
show_updates: true
show_fabrics: true
show_bindings: true
show_functions: true
show_images: true             # imágenes de dispositivos (origen: ver «Imágenes de dispositivos»)
# image_base: /local/devices  # carpeta de imágenes propia en lugar de zigbee2mqtt.io
show_bridge: true             # categoría «Servidor»
default_tab: devices          # devices | battery | updates | functions | fabrics | bindings | bridge
max_rows: 0                   # 0 = todas, si no «mostrar más»
zoom: 1
show_stats: true
show_search: true
show_filter_bar: true         # selección de ordenación
show_group_by: true           # selección «Agrupar por»
default_group_by: none        # none | vendor | model | class
show_filters: true            # zona de filtros (estado, batería, señal, fabricante, …)
default_sort: name_asc        # name_asc | name_desc | battery_asc | signal_asc | last_seen_desc | last_seen_asc | ota
show_model: true
show_vendor: true
show_node_id: false
show_signal: true
show_battery_value: true
show_last_seen: true
read_only: false
show_pairing: true            # botón «Añadir dispositivo»
```

Más ejemplos: [`examples/`](examples/).

## Colores

En el editor, en **Farben** (colores), o mediante las claves `color_*`. Cada valor puede ser hexadecimal (`#ff9800`), `rgb()`, `hsl()` o `var(--...)`. Vacío significa el valor del tema. Los valores no válidos se descartan. La muestra abre el selector de color, el campo de texto acepta cualquier valor CSS y «restablecer todos los colores» lo borra todo.

| Clave | Efecto |
|---|---|
| `color_tab_active` | Pestaña activa, botones principales |
| `color_success` | Bien: en línea, buena señal, batería llena, actualizado |
| `color_warning` | Aviso: batería baja, señal media, actualización en curso |
| `color_error` | Error: sin conexión, batería crítica, señal débil |
| `color_info` | Actualización disponible (firmware, nueva versión de la app) |
| `color_row_icon` | Todos los iconos de la lista (anula los colores de categoría) |
| `color_live_banner` | Fondo del banner (añadir dispositivo, tarea de firmware) |
| `color_icon_devices`, `_battery`, `_updates`, `_functions`, `_fabrics`, `_bindings`, `_bridge` | Icono de la categoría – colorea el icono de la pestaña y los iconos de las filas |

Si `color_row_icon` está definido, este color uniforme tiene prioridad.

## Servicios

Ambos servicios están pensados para automatizaciones. `entry_id` solo hace falta con varias entradas.

```yaml
action: matter_manager.commission
data:
  code: "MT:Y.K9042C00KA0648G00"   # texto del QR o código de 11/21 dígitos
  network_only: false              # true = sin Bluetooth
```

```yaml
action: matter_manager.check_updates
```

`check_updates` comprueba en segundo plano todos los dispositivos compatibles con OTA, uno tras otro con retardo.

## Eventos para automatizaciones

Se pueden desactivar en las opciones de la integración («Lanzar eventos de Home Assistant»). Al arrancar solo se registra el estado inicial, por lo que no hay avalancha de eventos.

| Evento | Datos |
|---|---|
| `matter_manager_device_offline` / `_device_online` | `name`, `node_id`, `id` |
| `matter_manager_battery_low` | `name`, `node_id`, `id`, `battery` – al bajar del umbral (`battery` está vacío si el dispositivo solo informa de un estado de carga) |
| `matter_manager_update_available` | `name`, `node_id`, `id`, `installed`, `latest` |
| `matter_manager_device_joined` / `_device_left` | `name`, `node_id` |

```yaml
triggers:
  - trigger: event
    event_type: matter_manager_battery_low
actions:
  - action: notify.mobile_app_phone
    data:
      message: "{{ trigger.event.data.name }}: batería {{ trigger.event.data.battery }} %"
```

## Notification Center (opcional)

Matter Manager puede enviar mensajes al **Notification Center**, independiente, que los recoge, los ordena por urgencia y los entrega. La conexión es **opcional**: sin el Notification Center no ocurre nada – ni errores ni mensajes en el registro. El transporte es el bus de eventos de Home Assistant (interfaz «esquema 1», sin MQTT). No se envían credenciales.

Se controla en **Servidor (engranaje) → Notification Center** o en el diálogo **Configurar**: un interruptor principal y un interruptor por tipo de mensaje, ordenados por urgencia (primero los críticos). Por defecto: todo activado. Los tipos desactivados no se envían; los mensajes abiertos de ese tipo los cierra el propio Notification Center. Si el Notification Center no está instalado, los interruptores siguen siendo utilizables y la tarjeta lo indica. Con `read_only: true` los interruptores desaparecen.

| Tipo de mensaje | Urgencia | Cuándo | Se cierra |
|---|---|---|---|
| Matter Server inaccesible | crítica | se pierde la conexión con el Matter Server | cuando vuelve a estar accesible |
| Batería crítica | crítica | batería por debajo del umbral crítico | cuando el valor vuelve a superarlo |
| Dispositivo sin conexión | aviso | el dispositivo no es accesible | cuando vuelve a estar en línea |
| Batería baja | aviso | batería por debajo del umbral bajo (pero no crítico) | cuando el valor vuelve a superarlo |
| Actualización de firmware disponible | info | existe una actualización para un dispositivo | cuando no queda ninguna pendiente |
| Dispositivo nuevo | info | dispositivo añadido al Matter Server | una sola vez, permanece hasta que se confirma |
| Dispositivo eliminado | info | dispositivo eliminado del Matter Server | una sola vez, permanece hasta que se confirma |

Notas:

- Al arrancar solo se notifica el **estado inicial** (sin push); después, exactamente un mensaje por cambio de estado. Se aplican los umbrales de batería existentes de las opciones; no hay umbrales nuevos.
- Cada mensaje lleva el dispositivo como asunto (para que el Notification Center pueda filtrar más adelante por dispositivo). La integración proporciona los textos en cinco idiomas (alemán, inglés, neerlandés, francés, español) una sola vez al registrarse.
- Los eventos `matter_manager_*` de Home Assistant se mantienen sin cambios e independientes.
- **Estado de las pruebas:** la conexión se probó con un bus de eventos simulado y en un navegador sin interfaz, **no con un Notification Center real ni en hardware real**.

## Sensores

`Dispositivos`, `Dispositivos sin conexión`, `Dispositivos con batería baja`, `Dispositivos con batería crítica`, `Actualizaciones de firmware disponibles` y `Fabrics`. Los sensores de sin conexión, batería y actualizaciones llevan la lista de dispositivos como atributo.

## Indicador de versión y aviso de actualización

La versión instalada aparece en tres lugares: en la tarjeta, en **Servidor (engranaje) → Versión de la app**, en la parte superior del editor gráfico de la tarjeta y en el diálogo **Configurar** de la integración. Al arrancar y después cada 12 horas, la integración consulta a GitHub (`api.github.com`, última versión publicada o, en su defecto, la etiqueta de versión más alta) si se ha publicado una versión más reciente. Si la hay, se resalta en color: borde naranja y aviso en la sección, una «↑» naranja en el icono del engranaje, un cuadro de advertencia en el editor y un aviso en el diálogo Configurar. La actualización en sí se hace como siempre mediante HACS. **Comprobar ahora** lanza la consulta de inmediato. Si GitHub no es accesible, aparece «Comprobación no posible»; la tarjeta sigue funcionando sin cambios.

Si las versiones de la tarjeta y de la integración difieren (caché del navegador obsoleta), también se marca en naranja.

## Ajustes de la integración

En **Configurar** (con indicación de la versión instalada): umbral de «batería baja», umbral de «batería crítica» (debe ser menor o igual), eventos activados/desactivados, así como **Mostrar la entrada en la barra lateral** y **Nombre en la barra lateral** (hasta 40 caracteres, por defecto «Matter Manager»). Con **Reconfigurar** puedes cambiar la dirección del Matter Server.

El diálogo también contiene **Enviar mensajes al Notification Center** (interruptor principal) y **Tipos de mensajes a enviar** (ver [Notification Center](#notification-center-opcional)). Los cambios en estos dos interruptores se aplican sin recargar la integración.

## Seguridad

Todas las acciones de escritura (renombrar, comentarios, eliminar, conmutar funciones, firmware, bindings, fabrics, añadir dispositivo, reconectar, comprobación de versión) y la carga de los detalles del dispositivo están restringidas a **administradores** mediante WebSocket. El backend valida las entradas (formato del código de configuración, longitud de nombres y comentarios, dispositivos conocidos; el fabric propio no se puede eliminar). Al crear un binding, solo se añade una entrada de acceso (ACL) en el dispositivo de destino si allí ya existe una entrada de administrador mediante CASE, de modo que Home Assistant nunca pierda el acceso. La tarjeta escapa todos los textos; los valores de color pasan por una lista de permitidos. El código de configuración mostrado de una ventana de emparejamiento abierta solo lo ven los administradores y es válido durante cinco minutos. La conmutación se limita a encendido/apagado del cluster OnOff, el valor debe ser booleano y el dispositivo debe ser accesible; las cerraduras y todas las demás funciones son de solo lectura. Las direcciones de imagen de `device_images` y `image_base` se comprueban contra esquemas inseguros (p. ej. `javascript:`). El nombre de la barra lateral se muestra como texto, nunca como HTML, y se limita a 40 caracteres.

Los interruptores del Notification Center solo los puede cambiar un **administrador** mediante WebSocket; el tipo de mensaje se comprueba contra la lista de tipos conocidos. Los mensajes solo contienen nombres de dispositivos y valores como el nivel de batería.

## Limitaciones conocidas

- **La versión 1.1.1 solo se ha probado con datos simulados y un Matter Server simulado, no en hardware real.** Se desarrolló contra la interfaz WebSocket documentada de python-matter-server.
- **Entrada de la barra lateral y búsqueda:** el comportamiento del campo de búsqueda (el foco se mantiene al escribir, sin atajos de Home Assistant) se comprobó en un navegador Chromium sin interfaz, no en un móvil ni en la aplicación de Home Assistant. La entrada de la barra lateral no se ha probado en un Home Assistant real.
- **Notification Center:** la conexión solo se probó con un bus de eventos simulado, no con un Notification Center real.
- **Fabricante y nombre del dispositivo** proceden de los datos básicos del dispositivo (nombre del fabricante y nombre del producto). Si el nombre del producto empieza por el del fabricante, este se elimina; si falta el fabricante, solo se reconoce cuando otro dispositivo informa del mismo nombre de fabricante. Sin estos valores el dispositivo aparece como «Desconocido». La clase de dispositivo procede de los tipos de dispositivo de los endpoints; los dispositivos de tipo desconocido van a «Otros». Ambos aspectos solo se comprobaron con datos simulados.
- **Los comandos de escritura de Matter no están probados:** el formato de `set_acl_entry`/`set_node_binding` (bindings), `commission_with_code`, `open_commissioning_window` y `remove_matter_fabric` puede variar según la versión del Matter Server. En ese caso la función no tiene efecto o muestra un error; las funciones de lectura no se ven afectadas.
- **Sin grupos:** los grupos de Zigbee no tienen un equivalente directo en Matter para esta interfaz; la categoría se llama «Fabrics».
- **Imágenes de dispositivos:** se desconoce la tasa de aciertos de la biblioteca de imágenes con dispositivos Matter; los nombres de imagen son candidatos, no una coincidencia garantizada. Si falta una imagen, se muestra el icono. No se pudo verificar la descarga desde `zigbee2mqtt.io` en el entorno de desarrollo.
- **Funciones:** la lectura de los atributos de función y el comando de conmutación (`device_command` On/Off) solo se probaron con datos simulados – **sin probar en hardware real**. Los valores de los sensores se actualizan aproximadamente cada minuto; los dispositivos tras puentes ahora se pueden conmutar si informan de OnOff. Con `read_only: true` desaparecen los interruptores y la lista de entidades.
- La intensidad de señal solo existe para dispositivos Wi-Fi y Thread (en Thread: el mejor vecino). Los puentes y los dispositivos Ethernet no tienen valor.
- Los dispositivos con batería (Thread, «en reposo») suelen recoger actualizaciones y bindings solo tras horas o tras pulsar un botón.
- La vista previa de entidades al renombrar encuentra dispositivos mediante los identificadores de la integración Matter y puede quedar vacía en casos especiales.
- «Instalar todas» espera hasta dos horas por dispositivo a que termine la actualización.
- Los dispositivos eliminados recientemente que no son accesibles pueden seguir registrados en el dispositivo y habrá que restablecerlos.

## Solución de problemas

- **Tarjeta no encontrada:** vacía la caché del navegador; comprueba en Ajustes → Paneles → Recursos si existe `/matter_manager/…` (añadir a mano en modo YAML).
- **«Matter Server no conectado»:** comprueba la dirección en **Reconfigurar**. La conexión se restablece automáticamente; **Servidor → Mantenimiento → Reconectar** la fuerza de inmediato.
- **«Versión del Matter Server demasiado antigua»:** actualiza el Matter Server (esquema de API 8 o posterior).
- **Sin valor de señal:** solo lo informan los dispositivos Wi-Fi y Thread; algunos dispositivos no lo proporcionan.
- **«Sin conexión con la integración»:** ¿está cargada la integración? ¿Es correcto `entry_id`?
- **Dos entradas iguales en la barra lateral:** con varias entradas de Matter Manager, dales nombres distintos en **Configurar → Nombre en la barra lateral**.
- Registros: pon `custom_components.matter_manager` en `debug`.

## Historial de versiones

| Versión | Cambio |
|---|---|
| **1.1.1** | Nuevo: **entrada propia en la barra lateral** con nombre libre (por defecto «Matter Manager», hasta 40 caracteres; se puede ocultar) en el diálogo Configurar; así, con varias entradas ya no aparecen dos entradas idénticas. **Español** (integración, tarjeta, README). README con banderas, capturas de pantalla y enlace a la entrada del blog. Corregido: en el campo de búsqueda de la vista de dispositivos, la tarjeta ya no sustituye el campo al escribir, así que en el móvil el teclado ya no se cierra tras cada letra y en el escritorio el campo conserva el foco; así, la letra siguiente tampoco acaba ya en los atajos de Home Assistant («e» = entidades). Solo se probó con datos simulados y en un navegador sin interfaz, no en hardware real |
| **1.1.0** | Nuevo: **comentarios** en la ventana del dispositivo (editables, con búsqueda, solo modificables por administradores); conexión opcional con el **Notification Center** (interfaz «esquema 1» a través del bus de eventos): tipos de mensaje servidor inaccesible, dispositivo sin conexión, batería crítica/baja, actualización de firmware, dispositivo nuevo/eliminado; interruptor principal e interruptor por tipo de mensaje en la tarjeta (Servidor → Notification Center) y en el diálogo Configurar, ordenados por urgencia. Corregido: al escribir en campos de entrada de la tarjeta (p. ej. «e» en el campo de nombre) ya no se activan los atajos de Home Assistant, como la búsqueda de entidades. Cambiado: el registro de dispositivos se consulta sin `device_registry.devices`, que desaparece a partir de Home Assistant 2027.9. Solo probado con datos simulados, no con un Notification Center real ni en hardware real |
| **1.0.3** | Nuevo: pequeñas imágenes de dispositivos (candidatas de la biblioteca de imágenes de Zigbee2MQTT, se pueden desactivar, carpeta de imágenes propia posible), categoría **Funciones** con interruptores de encendido/apagado y valores de medición, secciones Funciones y Entidades en la ventana del dispositivo con copia al portapapeles. Nuevas claves `show_functions`, `show_images`, `image_base`, `device_images`, `color_icon_functions`. Solo probado con datos simulados y en un navegador sin interfaz, no en hardware real |
| **1.0.2** | Corregida la ruta del recurso de la tarjeta: `/matter_manager/matter-manager-card.js` en lugar de `/matter_manager_files/…` (las entradas existentes se actualizan automáticamente). Fabricante y nombre del dispositivo se leen de la denominación de tipo. Nuevo: filtros y agrupación (fabricante, nombre del dispositivo, clase de dispositivo) como en el Zigbee2MQTT Manager. Francés (Pull Request #1) |
| 1.0.1 | Primera publicación en GitHub: nuevo icono y logotipo, neerlandés (integración y tarjeta), README en tres idiomas |
| 1.0.0 | Estado interno antes de la publicación |

## Integridad de los archivos (comentarios hash)

La primera línea de cada archivo `.py`, `.js` y `.yaml` contiene un hash SHA-256 del resto del archivo. Así se puede detectar un cambio involuntario o ajeno.

Los archivos JSON no tienen comentarios. Sus hashes SHA-256 (sobre el archivo completo, `sha256sum <archivo>`) están en el [README alemán](README.md#datei-integrität-hash-kommentare).

## Licencia

MIT
