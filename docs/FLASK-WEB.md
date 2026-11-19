# La Tribu de los Libres Travels — Web (Flask)

Especificación para recrear esta misma aplicación como página web en Flask,
compartiendo datos con la APK mediante JSON (importación/exportación) o una
API opcional. Misma apariencia, mismos módulos, mismas reglas.

## 1. Estructura sugerida

```
latribu_web/
  app.py                # punto de entrada, registro de blueprints
  requirements.txt      # flask, flask-sqlalchemy, jinja2
  config.py             # SECRET_KEY, ruta SQLite
  modelos/
    db.py               # conexión sqlite3 / SQLAlchemy
    usuarios.py         # CRUD usuarios + roles
    destinos.py         # CRUD destinos (itinerario como JSON en columna)
    contactos.py        # CRUD contactos
    pasajeros.py        # CRUD pasajeros
  rutas/
    auth.py             # blueprint login/registro/logout
    api.py              # blueprint REST /api/*
    exportar.py         # blueprint PDF/TXT/JSON/WhatsApp/SQLite
  static/
    css/  js/  img/     # COPIAR tal cual desde www/css, www/js, www/img, www/vendor
  templates/
    base.html           # copia de www/index.html adaptada a Jinja
    login.html  app.html  destinos.html  contactos.html
    pasajeros.html  usuarios.html  estadisticas.html
```

## 2. Reutilización directa

- Todo `www/css/`, `www/vendor/` y `www/img/` se copia sin cambios.
- `www/js/core/validators.js`, `telefonos.js`, `icons.js`, `toast.js`,
  `modal.js`, `charts.js`, `util.js` funcionan idénticos en web.
- `router.js` se conserva si las vistas se sirven como estáticos
  (`/static/views/*.html`) o se reemplaza por rutas Flask + Jinja.
- En web, `sqlite.js` no aplica; se usa `idb.js` (IndexedDB del navegador)
  para offline-first, y `api.py` sincroniza con la SQLite del servidor.

## 3. Reglas de negocio (idénticas a la APK)

- Dos superusuarios fijos (los definidos en `db.js` semilla).
- Contraseña: `sha256("tm|" + email + "|" + pass)` — usar hashlib.
- Nombre Title Case, correo lowercase, teléfono solo dígitos 4-15,
  código de país de la lista `CODIGOS_PAIS` (América + España +34).
- Rol `admin` solo opera con los privilegios de su lista `permisos`
  (catálogo `PERMISOS` en `session.js`); nunca borra ni degrada a un
  superusuario. Sesión en `sessionStorage` (web) / session (Flask).

## 4. Modelo SQLite (mismo esquema que `db.js`)

```sql
CREATE TABLE usuarios (id TEXT PRIMARY KEY, nombre TEXT, email TEXT UNIQUE,
  pass TEXT, rol TEXT, permisos TEXT, activo INTEGER, creado TEXT);
CREATE TABLE contactos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT,
  codigo TEXT, telefono TEXT, email TEXT, notas TEXT);
CREATE TABLE destinos (id TEXT PRIMARY KEY, nombre TEXT, guia TEXT,
  vuelo TEXT, aerolinea TEXT, checkin TEXT, itinerario TEXT, notas TEXT);
CREATE TABLE pasajeros (id TEXT PRIMARY KEY, nombre TEXT, codigo TEXT,
  telefono TEXT, email TEXT, destinoId TEXT, asiento TEXT, checkin TEXT);
```

## 5. API REST opcional para compartir datos con la APK

| Ruta | Uso |
|------|-----|
| `POST /api/login` | `{email, pass}` → usuario+rol o 401 |
| `GET /api/export` | JSON completo (4 tablas) |
| `POST /api/import` | JSON completo → reemplaza/fusiona |
| `GET/POST /api/<tabla>` | CRUD por tabla (destinos/contactos/pasajeros/usuarios) |

La APK ya puede importar/exportar el mismo JSON desde el módulo
`exportar.js` (`DB.exportAll` / `DB.importAll`); el formato de
`exportar.js` y `/api/export` debe ser el mismo objeto
`{usuarios, contactos, destinos, pasajeros}`.

## 6. Puesta en marcha

```
pip install flask
python app.py        # sirve en http://localhost:5000
```

Mantener sin CDNs: todos los recursos en `static/`.
