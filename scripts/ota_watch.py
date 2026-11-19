# OTA watcher La Tribu Travels — vigila www/, sirve bundle.zip en :8788 y al
# cambiar avisa al telefono (POST {url,checksum,version} a :9863/ota);
# la app descarga y aplica con @capgo/capacitor-updater (checksum SHA-256
# OBLIGATORIO) + modal con el sello. Identico al motor de CursosOTA.
# Uso: python scripts\ota_watch.py            (descubre el telefono)
#      python scripts\ota_watch.py 192.168.x  (IP fija, sin barrido)
import io, os, sys, time, zipfile, socket, http.client, json, threading, hashlib
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from concurrent.futures import ThreadPoolExecutor

if getattr(sys, 'frozen', False):
    ROOT = os.path.dirname(sys.executable)
else:
    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, 'www')
SKIP = {'builtin', 'vendor-big'}           # estatico pesado: no viaja en OTA
PORT_TEL = 9863                            # TravelFtpPlugin del telefono
PORT_SRV = 8788                            # este servidor de bundle
IPCACHE = os.path.join(ROOT, 'scripts', '.ota_ip')
BUNDLE = {'data': b'', 'sha': '', 'n': 0, 'ts': ''}

def build_zip():
    buf = io.BytesIO(); n = 0
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for base, dirs, files in os.walk(WWW):
            dirs[:] = [d for d in dirs if d not in SKIP and not d.startswith('.')]
            for f in files:
                if f.startswith('.'): continue
                p = os.path.join(base, f)
                z.write(p, os.path.relpath(p, WWW)); n += 1
        # la app aprende la direccion del PC del propio paquete
        z.writestr('ota-pc.json', json.dumps(
            {'url': 'http://%s:%d' % (my_ip(), PORT_SRV)}))
    return buf.getvalue(), n

def rebuild():
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    n = sum(1 for b, d, fs in os.walk(WWW) for f in fs
            if not f.startswith('.'))
    os.makedirs(os.path.join(WWW, 'js'), exist_ok=True)
    with open(os.path.join(WWW, 'js', 'ota_stamp.js'), 'w', encoding='utf-8') as f:
        f.write("// sello OTA generado por ota_watch.py\n"
                "window.TM_OTA = { ts: '%s', files: %d };\n" % (ts, n))
    data, n = build_zip()
    BUNDLE['data'] = data
    BUNDLE['sha'] = hashlib.sha256(data).hexdigest()
    BUNDLE['n'] = n
    BUNDLE['ts'] = ts
    return ts

def my_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80)); ip = s.getsockname()[0]; s.close()
        return ip
    except Exception:
        return '127.0.0.1'

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path == '/stamp.json':         # el poller de la app lee el sello
            data = json.dumps({'ts': BUNDLE['ts'], 'sha': BUNDLE['sha'],
                               'n': BUNDLE['n'],
                               'url': 'http://%s:%d/bundle.zip'
                                      % (my_ip(), PORT_SRV)}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if self.path == '/bundle.zip':
            self.send_response(200)
            self.send_header('Content-Type', 'application/zip')
            self.send_header('Content-Length', str(len(BUNDLE['data'])))
            self.end_headers()
            self.wfile.write(BUNDLE['data'])
            print('  servido %d KB' % (len(BUNDLE['data']) // 1024), flush=True)
            return
        txt = ('La Tribu Travels OTA listo — telefono: http://%s:%d'
               % (my_ip(), PORT_SRV)).encode()
        self.send_response(200); self.end_headers(); self.wfile.write(txt)

def alive(ip):
    try:
        s = socket.create_connection((ip, PORT_TEL), .4); s.close(); return True
    except Exception:
        return False

def discover():
    if len(sys.argv) > 1:
        return sys.argv[1]
    if os.path.exists(IPCACHE):
        try:
            ip = json.load(open(IPCACHE))['ip']
            if alive(ip): return ip
        except Exception:
            pass
    cand = []
    ip = my_ip()
    if ip != '127.0.0.1':
        pre = '.'.join(ip.split('.')[:3]) + '.'
        cand = [pre + str(i) for i in range(1, 255)]
        if ip in cand: cand.remove(ip)
    cand += ['192.168.42.129']
    found = []
    with ThreadPoolExecutor(max_workers=60) as ex:
        for c, ok in zip(cand, ex.map(alive, cand)):
            if ok: found.append(c)
    if not found: return None
    devs = []
    for ip in found:
        try:
            r = http.client.HTTPConnection(ip, PORT_TEL, timeout=3)
            r.request('GET', '/id')
            d = json.loads(r.getresponse().read().decode() or '{}')
            r.close()
            devs.append((ip, d.get('devname') or d.get('devid') or ip))
        except Exception:
            devs.append((ip, ip))
    print('Telefonos La Tribu Travels encontrados:')
    for i, (ip, nm) in enumerate(devs, 1):
        print('  %d. %s' % (i, nm), flush=True)
    pick = '1'
    if len(devs) > 1 and sys.stdin.isatty():
        pick = input('¿Cual actualizar? [1]: ').strip() or '1'
    try:
        ip = devs[int(pick) - 1][0]
    except Exception:
        ip = devs[0][0]
    json.dump({'ip': ip}, open(IPCACHE, 'w'))
    return ip

def push(tel_ip, ts):
    # push directo del ZIP: el paquete viaja DENTRO del POST (ota-zip), el
    # telefono no tiene que venir a buscar nada al PC (evita el firewall).
    c = http.client.HTTPConnection(tel_ip, PORT_TEL, timeout=30)
    c.request('POST', '/ota-zip', BUNDLE['data'],
              {'Content-Type': 'application/zip',
               'Content-Length': str(len(BUNDLE['data']))})
    r = c.getresponse(); r.read(); c.close()
    print('OTA %s -> %s  [%d]  %d archivos, %d KB'
          % (ts, tel_ip, r.status, BUNDLE['n'], len(BUNDLE['data']) // 1024),
          flush=True)

def mtimes():
    last = 0
    for base, dirs, files in os.walk(WWW):
        dirs[:] = [d for d in dirs if d not in SKIP and not d.startswith('.')]
        for f in files:
            if f == 'ota_stamp.js': continue
            try:
                last = max(last, os.path.getmtime(os.path.join(base, f)))
            except OSError:
                pass
    return last

if __name__ == '__main__':
    # modo servicio (pythonw / tarea programada): sin consola, log a archivo
    try:
        logf = open(os.path.join(ROOT, 'scripts', 'ota_watch.log'),
                    'a', buffering=1, encoding='utf-8')
        if sys.stdout is None or not sys.stdout.isatty():
            sys.stdout = logf; sys.stderr = logf
    except Exception:
        pass
    rebuild()
    threading.Thread(
        target=lambda: ThreadingHTTPServer(('0.0.0.0', PORT_SRV), H).serve_forever(),
        daemon=True).start()
    print('bundle servido en http://%s:%d (telefono o no)'
          % (my_ip(), PORT_SRV), flush=True)
    print('descubriendo telefono...', flush=True)
    tel = discover()
    while not tel:
        print('telefono no encontrado — reintento en 15 s...', flush=True)
        time.sleep(15)
        tel = discover()
    print('telefono: %s — bundle en http://%s:%d — vigilando www/...'
          % (tel, my_ip(), PORT_SRV), flush=True)
    last = mtimes()
    pushed = ''           # ts del ultimo sello ENTREGADO (cola: reintenta si duerme)
    caido = 0             # segundos seguidos sin escuchar el telefono
    while True:
        time.sleep(1)
        try:
            cur = mtimes()
            if cur > last:
                time.sleep(0.7)
                cur = mtimes()
                rebuild()
                last = cur
            vive = alive(tel)
            if vive:
                caido = 0
            else:
                caido += 1
                # el tel cambio de IP o reinicio: cada 60 s se redescubre
                if caido and caido % 60 == 0:
                    print('telefono ausente %ds — redescubriendo...'
                          % caido, flush=True)
                    nuevo = discover()
                    if nuevo: tel = nuevo
            # cola OTA: si hay sello sin entregar y el telefono escucha, empuja
            if BUNDLE['ts'] and BUNDLE['ts'] != pushed and vive:
                try:
                    push(tel, BUNDLE['ts'])
                    pushed = BUNDLE['ts']
                except Exception as e:
                    print('push pendiente (tel dormido?): %s' % e, flush=True)
        except Exception as e:
            print('watch: %s' % e, flush=True)
            time.sleep(3)
