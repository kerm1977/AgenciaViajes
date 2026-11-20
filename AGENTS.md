# Reglas del proyecto La Tribu de los Libres Travels (APK Capacitor + OTA)

## 1. Límite de líneas (BLINDADO)
- Ningún archivo de código (.js, .css, .html, .py) supera 250 líneas.
- Verificar tras cada cambio: `python scripts/verificar_lineas.py`.
- El código vive en módulos por carpeta: `www/js/core/`, `www/js/modulos/`, `www/views/`.

## 2. Sin CDNs (BLINDADO)
- Cero enlaces a cdn/googleapis/unpkg. Font Awesome, jsPDF y html2canvas
  viven en `www/vendor/`. Iconos propios en `js/core/icons.js` (SVG inline).

## 3. Sistema OTA (MOTOR — mismo de CursosOTA, no tocar sin orden)
- `scripts/ota_watch.py`: vigila `www/`, estampa `www/js/ota_stamp.js`,
  sirve `/bundle.zip` y `/stamp.json` en :8788 y avisa al teléfono (:9863).
- Plugin nativo `TravelFtpPlugin` (:9863): `POST /ota {url,checksum,version}`
  → evento `tmOta` al JS; `GET /id` → devid para el descubridor.
- `www/js/core/ota.js`: `notifyAppReady()` + `CapacitorUpdater.download/set`
  + poller de `/stamp.json` cada 8 s + tap en sello = URL manual,
  long-press = `reset()`.
- `scripts/ota_server.py` (pull manual) y `scripts/ota_push.py` (push directo).
- Cambios nativos (plugins, permisos, Java) requieren APK nuevo; el OTA solo
  actualiza `www/`.

## 4. Datos y sesión
- SQLite nativo vía `@capacitor-community/sqlite`; en navegador, IndexedDB
  (`js/core/idb.js`). Sin localStorage para datos (solo sello OTA y URL).
- Sesión del usuario en `sessionStorage` (`js/core/session.js`).

## 5. Roles (BLINDADO)
- 2 superusuarios fijos (semilla en `js/core/db.js`): no se borran ni degradan.
- `admin`: privilegios por módulo asignados por superusuario (multi-select).
- `usuario`: sin privilegios de gestión.
- Un admin nunca puede borrar/degradar a un superusuario.

## 6. Validaciones (BLINDADO)
- Nombres: se guardan en Title Case. Correos: siempre lowercase y formato
  válido. Teléfonos: solo dígitos + código de país (América + España).
- Todo campo de contraseña lleva ojo para ver/ocultar.

## 6b. Itinerario — campos de asignación (BLINDADO)
- PROHIBIDO modificar, renombrar, mover o eliminar los campos de asignación
  del itinerario (selector Día, selector "Asignar campo", hora salida/llegada,
  guía, X con doble confirmación) ni su lógica en `js/modulos/itasig.js`,
  salvo orden expresa del usuario en esa sesión.
- La fila "Día + Asignar campo" siempre va arriba y siempre visible.
- Los datos viven en `card.dataset.dia/hdesde/hhasta/guia`; se persisten en
  `input`/`change` inmediato y sobreviven cualquier re-render.

## 6c. Imágenes, tarjetas, formulario y perfil (BLINDADO)
- Imagen de tarjeta: 5 toques rápidos (<900ms) abren el selector (`Uploader.tap5`);
  pulsación larga (550ms, tolerancia 10px) abre el editor `fxModal`
  (Izq/Der, Arr/Abj, Zoom, Rotar, Desenfoque, Opacidad).
- UNA sola capa: el fondo del div `.dest-img` (background-image); el `<img>`
  va oculto. `put()` siempre re-aplica `d.imgfx` tras pintar (uf: resuelve async).
- Un archivo por tarjeta: `viaje-<id>.jpg`, siempre sobrescrito (cero duplicados);
  respaldo comprimido en `d.imgfx.b64` dentro del registro.
- Ajustes · Uploader (Mi Perfil): lista archivos reales con miniatura y borrado
  con doble `confirmar()` — prohibido `window.confirm`.
- "Nuevo Destino y Viaje" SIEMPRE abre el formulario limpio: `Borrador.clear()`
  antes de `addDestino()`; nunca restaurar borrador en un alta nueva.
- Mi Perfil (tab final del nav): avatar/nombre/email/rol/estado/privilegios,
  Ajustes·Uploader, Estadísticas (con tarjeta "Imágenes en Uploader") y
  "Cerrar sesión" — siempre con `confirmar()` antes de `Session.logout()`.
- Acordeones: uno abierto a la vez; abrir uno colapsa los demás; el abierto se
  ve oscuro y un punto más grande, los cerrados gris claro y más pequeños.

## 7. APK
- `npx cap sync android` → `cd android && gradlew assembleDebug` →
  `android/app/build/outputs/apk/debug/app-debug.apk` → copiar a
  `Desktop\travelmaster\latribu_travels.apk`.
- `android/local.properties`: `sdk.dir=C:/Users/MINIOS/android-sdk`.

## 8. Puertos
- 8788 bundle OTA PC · 9863 app teléfono (8765 lo usa TRIBALs/CursosOTA).
  No usar 8890/8891/8897/5000/8765.
