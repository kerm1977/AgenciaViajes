# Sistema OTA — La Tribu de los Libres Travels

Guía completa del motor de actualizaciones over-the-air, paso a paso, tal como
quedó funcionando de punta a punta. Para replicarlo en otra app: **copia estos
4 archivos, cambia el puerto y el `dev` del identificador** — el resto es igual.

Archivos del sistema:

| Pieza | Archivo | Corre en |
|---|---|---|
| Plugin HTTP del teléfono | `android/app/src/main/java/com/kenneth/<app>/TravelFtpPlugin.java` | APK |
| Motor JS de la app | `www/js/core/ota.js` | APK/WebView |
| Vigilante + servidor + cola | `scripts/ota_watch.py` | PC |
| Empuje manual / prueba | `scripts/ota_push.py` | PC |
| Autoconsola (diagnóstico) | `www/js/core/consola.js` | APK/WebView |

## 1. Arquitectura

```
PC (Windows, Python puro — sin VMs, sin Node)          Teléfono (APK)
───────────────────────────────────────────          ─────────────────────────
ota_watch.py                                         TravelFtpPlugin (Java)
  ├─ HTTP :8788  /stamp.json /bundle.zip  ◄─── (pull)   HTTP :9863
  ├─ vigila www/ cada 1 s                              ├─ GET  /id, /ping
  ├─ descubre teléfono por LAN                         ├─ GET  /ota-incoming.zip
  └─ POST zip crudo ──► :9863/ota-zip ──────────────►  ├─ GET  /ota-stamp
                                                     ├─ POST /ota, /ota-zip
        el zip viaja DENTRO del push                   └─ notifyListeners("tmOta")
        (el teléfono NUNCA busca nada al PC)                │
                                                     ota.js (WebView)
                                                       ├─ pull(): CapacitorUpdater
                                                       │   .download(url+sha256).set()
                                                       ├─ poller 8 s: PC o zip local
                                                       ├─ watchdog 80 s anti-cuelgue
                                                       └─ notifyAppReady() anti-rollback
```

## 2. Puertos (uno nuevo por app)

- **9863** — plugin del teléfono (`PORT` en el Java). Elige uno improbable por
  app para que dos apps coexistan en el mismo teléfono (CursosOTA usa 8765).
- **8788** — servidor del bundle en la PC (`PORT_SRV` en `ota_watch.py`).
- Actualiza el mismo número en: `TravelFtpPlugin.java` (PORT), `ota_watch.py`
  (PORT_TEL), `ota_push.py`, `ping_ota.py`, `sonda.py`, `fijar_ip.py`.

## 3. Plugin del teléfono (`TravelFtpPlugin.java`)

1. `@CapacitorPlugin(name = "TravelFtp")` + `load()`:
   - `devid` = UUID corto (identifica la instancia).
   - `PARTIAL_WAKE_LOCK "latribu:ota"` — el socket sigue vivo con la app
     dormida en segundo plano.
   - Hilo `serve()`.
2. **`serve()` — bucle inmortal**: `ServerSocket.accept()`; cualquier
   `IOException` → `sleep(500)` → cierra y reabre, **nunca `break`**. Un solo
   `break` mata el OTA hasta reiniciar la app (bug real que costó un ping
   muerto con la app abierta).
3. **`handle(Socket)` — stream crudo SIEMPRE**: lee la línea de petición y los
   headers byte a byte con `readLine(in)` propio. **NUNCA `BufferedReader`**:
   su buffer se traga por adelantado los primeros bytes del ZIP y el paquete
   llega corrupto (bug real).
4. Rutas:
   - `GET /id` → `{"dev":"latribu","devid":"…"}` — la PC lo usa para
     distinguir esta app de otras en la misma IP/puerto.
   - `GET /ping` → `{"ok":true}`.
   - `POST /ota` → JSON `{url,checksum,version}` → `notifyListeners("tmOta")`.
   - `POST /ota-zip` → guarda el body crudo en
     `filesDir/ota-incoming.zip`, calcula `sha256File(f)` y dispara `tmOta`
     con `url = http://127.0.0.1:<PORT>/ota-incoming.zip` + checksum real.
   - `GET /ota-incoming.zip` → sirve ese archivo (Cabecera
     `Content-Type: application/zip`).
   - `GET /ota-stamp` → `{sha,bytes}` del zip guardado, o 404. La app lo usa
     para aplicar el paquete en cola aunque el PC sea inalcanzable.
5. `handleOnDestroy()` → cierra socket y suelta el wake lock.

## 4. Motor JS (`ota.js`)

1. `CapacitorUpdater.notifyAppReady()` al arrancar — sin esto, el plugin
   marca el bundle como fallido y revierte (rollback) tras 10 s.
2. **Listener `tmOta`** → `pull(url, version, checksum)`:
   - guarda la última url en `localStorage['tm_ota_url']`;
   - si la url es `http(s)` y no localhost, guarda la base en `lt_ota_pc`.
3. **`pull()` blindado** (reglas que surgieron de errores reales):
   - aborta si la url no es `^https?://` — el updater **no acepta `file://`**
     (`FileURLConnection cannot be cast to HttpURLConnection`).
   - aborta si no hay checksum: `CapacitorUpdater` v8 **EXIGE SHA-256**
     ("Checksum required" con checksum vacío). Si falta, lo pide al
     `stamp.json` del servidor.
   - candado `pulling` + **watchdog de 80 s**: el promise de `download()`
     puede quedarse colgado con sus reintentos internos de 60 s; sin
     watchdog, el candado se pega y TODO evento posterior se descarta en
     silencio (bug real — "los tmOta llegan pero no descarga").
4. **Poller cada 8 s** (respaldo si el evento se pierde):
   - pide `stamp.json` a la base del PC (`lt_ota_pc` u `ota-pc.json` del
     propio bundle); sello nuevo ≠ visto → pull.
   - **si el PC no responde** (firewall bloquea :8788 — caso real), pide
     `GET /ota-stamp` al plugin local: si el sha del zip empujado no fue
     aplicado, hace pull a `http://127.0.0.1:9863/ota-incoming.zip`.
5. `window.forzarOTA()` (botón "Actualizar" en Usuarios y tap al sello de
   build): sello del PC → si no, `selloLocal()` → si no, toast "sin cola".
   **Nunca pide URL al usuario.**
6. Long-press en el sello de build → `reset()` al paquete interno.
7. Modal "OTA aplicada" al ver un `TM_OTA.ts` nuevo (`ota_stamp.js` lo
   inyecta el watcher en cada bundle).
8. **Todo se registra**: `L()` escribe `console.log('[OTA] …')` y además
   `DC.ev('OTA', …)` — la consola de desarrollo muestra cada paso.

## 5. PC — `ota_watch.py` (vigilante/servidor/cola)

1. `build_zip()`: comprime `www/` (salta `builtin`, `vendor-big`, `.files`),
   inyecta `js/ota_stamp.js` (`window.TM_OTA = {ts, files}`) y
   **`ota-pc.json` = `{"url":"http://<ip-pc>:8788"}`** — así la app aprende
   la dirección del PC del propio paquete.
2. HTTP `:8788`: `GET /stamp.json` → `{ts, sha, n, url}`, `GET /bundle.zip`.
   El servidor arranca **antes** del descubrimiento del teléfono (un
   reordenamiento temprano dejó :8788 muerto mientras buscaba el teléfono).
3. Descubrimiento: barrido LAN `x.x.x.1-254` consultando `/id` hasta
   `{"dev":"latribu"}`; cachea la IP en `scripts/.ota_ip`; re-descubre cada
   60 s si se pierde.
4. **Cola**: sello nuevo y teléfono ausente → reintenta el push hasta que
   despierte (`pushed != BUNDLE['ts']`); las actualizaciones nunca se
   pierden aunque la app duerma.
5. **Push = `POST /ota-zip` con el ZIP en el body** — el paquete viaja
   dentro del empuje. NO uses `POST /ota` con url del PC como vía
   principal: el firewall de Windows bloqueó la descarga del teléfono a
   `PC:8788` (timeout real de 60 s ×4 reintentos). :8788 queda como
   respaldo para el poller/botón cuando el firewall lo permite.
6. Modo servicio: cuando no hay tty, la salida va a `scripts/ota_watch.log`.

## 6. Arranque automático en Windows (sin admin)

`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LaTribuOTA.vbs`:

```vbs
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\MINIOS\Desktop\travelmaster\proyecto"
sh.Run "pythonw """ & sh.CurrentDirectory & "\scripts\ota_watch.py""", 0, False
```

- `schtasks /create` requiere admin → la carpeta Inicio no.
- `pythonw` (no `python`) = sin ventana de consola.
- **Ojo con el firewall**: `pythonw.exe` y `python.exe` son ejecutables
  distintos para Windows Firewall — el puerto que un `python` abrió no lo
  hereda `pythonw` (causa real del bloqueo de :8788). El push con zip
  embebido (`/ota-zip`) no depende de puertos entrantes en la PC: es la
  vía que SIEMPRE funciona.

## 7. Consola de desarrollo (`consola.js`)

- **5 toques** en el logo `.brand-logo` (menos de 2.5 s) → panel en login y
  dentro de la app; captura `console.*`, errores, rechazos de promises,
  taps y `DC.ev(...)`.
- Filtros `todo/ev/tap/info/warn/error` + botones **copiar** (respeta el
  filtro, con `execCommand` de respaldo), limpiar, cerrar.
- Registrada justo después de `util.js` en `index.html` para capturar todo.

## 8. Herramientas de prueba (PC)

| Script | Uso |
|---|---|
| `ping_ota.py` | `python scripts\ping_ota.py [ip]` — `/id` + `/ping` |
| `ota_push.py` | `python scripts\ota_push.py [ip] [intentos]` — zip directo, reintenta cada 5 s (cola) |
| `sonda.py` | `python scripts\sonda.py [ip] [reps] [pausa]` — socket crudo + /ping + /id en rondas |
| `verificar_lineas.py` | tope 250 líneas por archivo (regla del proyecto) |

## 9. Errores reales ya corregidos — checklist anti-regresión

- [x] `isDBOpen: No available connection` → inofensivo (probe previo); el
      acceso real va por `createConnection` + `open`.
- [x] ZIP corrupto en `/ota-zip` → headers por `readLine` byte a byte.
- [x] `FileURLConnection cannot be cast` → nunca pasar `file://` al
      updater; el plugin sirve el zip por `http://127.0.0.1`.
- [x] `Checksum required` → SHA-256 obligatorio SIEMPRE (plugin lo calcula;
      JS lo exige y aborta sin él).
- [x] Socket muerto con app abierta → `serve()` reintenta para siempre +
      `PARTIAL_WAKE_LOCK`.
- [x] Descarga colgada deja el candado pegado → watchdog 80 s.
- [x] Firewall PC bloquea la descarga desde el teléfono → push con zip
      embebido (`/ota-zip`) + `/ota-stamp` local.
- [x] "Actualizar" pedía URL → resuelve solo: `lt_ota_pc` → `ota-pc.json`
      → `selloLocal()`.
- [x] App muerta/cerrada = sin proceso, sin socket: lo cubre la **cola del
      watcher** + pull al abrir (igual que CursosOTA).

## 10. Ciclo verificado de punta a punta

`cambiar www/` → watcher estampa + zip → push `/ota-zip` [200] → plugin
guarda + `tmOta{url localhost, sha}` → `pull` → `download` → `set` →
recarga → `notifyAppReady` → modal "OTA aplicada". Segunda pasada
verificada igual, mismo `devid`, socket vivo.
