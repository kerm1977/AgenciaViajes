# OTA push La Tribu Travels — estampa, comprime www/ y lo ENVIA al telefono por su
# servidor LAN (TravelFtpPlugin puerto 9863): el APK lo aplica y recarga solo.
# Si el telefono no escucha, REINTENTA cada 5 s hasta entregar (cola).
# Uso:  python scripts\ota_push.py <ip-del-telefono> [intentos]
#       python scripts\ota_push.py            (barrido por la /24 propia)
import io, os, sys, time, zipfile, socket, http.client

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, 'www')
SKIP = {'builtin', 'vendor-big'}
PORT = 9863

def build_zip():
    buf = io.BytesIO(); n = 0
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for base, dirs, files in os.walk(WWW):
            dirs[:] = [d for d in dirs if d not in SKIP and not d.startswith('.')]
            for f in files:
                if f.startswith('.'):
                    continue
                p = os.path.join(base, f)
                z.write(p, os.path.relpath(p, WWW)); n += 1
    return buf.getvalue(), n

def stamp(n):
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    p = os.path.join(WWW, 'js', 'ota_stamp.js')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write("// sello OTA generado por ota_push.py\n"
                "window.TM_OTA = { ts: '%s', files: %d };\n" % (ts, n))
    return ts

def listening(ip):
    try:
        s = socket.create_connection((ip, PORT), .4); s.close(); return True
    except Exception:
        return False

def find_phone():
    if len(sys.argv) > 1:
        return sys.argv[1]
    cands = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80)); my = s.getsockname()[0]; s.close()
        pre = '.'.join(my.split('.')[:3]) + '.'
        cands = [pre + str(i) for i in range(1, 255)]
        if my in cands: cands.remove(my)
    except Exception:
        pass
    for ip in cands:
        try:
            s = socket.create_connection((ip, PORT), .3)
            s.close(); return ip
        except Exception:
            pass
    return None

if __name__ == '__main__':
    tries = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    ip = find_phone()
    if not ip:
        print('telefono no encontrado — pasale su IP: python scripts\\ota_push.py 192.168.x.x')
        sys.exit(1)
    n = sum(1 for b, d, fs in os.walk(WWW) for f in fs if not f.startswith('.'))
    stamp(n)
    data, n = build_zip()
    # cola: si el teléfono duerme, reintenta cada 5 s hasta que despierte
    for i in range(tries):
        try:
            c = http.client.HTTPConnection(ip, PORT, timeout=30)
            c.request('POST', '/ota-zip', data,
                      {'Content-Type': 'application/zip',
                       'Content-Length': str(len(data))})
            r = c.getresponse(); r.read()
            print('OTA -> %s:%d  [%d]  %d archivos, %d KB'
                  % (ip, PORT, r.status, n, len(data) // 1024))
            sys.exit(0)
        except Exception as e:
            print('intento %d/%d: sin respuesta (%s) — en cola...'
                  % (i + 1, tries, e), flush=True)
            time.sleep(5)
    print('no se pudo entregar tras %d intentos' % tries)
    sys.exit(1)
