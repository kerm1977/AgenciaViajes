# OTA local La Tribu Travels — sirve www/ como bundle.zip por HTTP LAN (modo PULL).
# Uso: python scripts\ota_server.py  →  en el telefono: toca el sello de build
# y escribe  http://<esta-IP>:8788/bundle.zip
import io, os, socket, zipfile
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, 'www')
SKIP = {'builtin', 'vendor-big'}
PORT = 8788

def bundle():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for base, dirs, files in os.walk(WWW):
            dirs[:] = [d for d in dirs if d not in SKIP and not d.startswith('.')]
            for f in files:
                if f.startswith('.'):
                    continue
                p = os.path.join(base, f)
                z.write(p, os.path.relpath(p, WWW))
    return buf.getvalue()

def my_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ips.append(s.getsockname()[0]); s.close()
    except Exception:
        pass
    try:
        for _, _, addrs in socket.getaddrinfo(socket.gethostname(), 0):
            for a in addrs:
                if ':' not in a[0] and a[0] != '127.0.0.1' and a[0] not in ips:
                    ips.append(a[0])
    except Exception:
        pass
    return ips or ['<tu-ip>']

class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass
    def do_GET(self):
        if self.path == '/bundle.zip':
            data = bundle()
            self.send_response(200)
            self.send_header('Content-Type', 'application/zip')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            print('OTA servido: %d KB' % (len(data) // 1024))
        else:
            txt = ('La Tribu Travels OTA listo. En el telefono escribe: '
                   'http://%s:%d/bundle.zip' % (my_ips()[0], PORT)).encode()
            self.send_response(200)
            self.end_headers()
            self.wfile.write(txt)

if __name__ == '__main__':
    print('========================================')
    print('  La Tribu Travels OTA en el puerto %d' % PORT)
    for ip in my_ips():
        print('    -> en el telefono:  http://%s:%d' % (ip, PORT))
    print('========================================')
    ThreadingHTTPServer(('0.0.0.0', PORT), H).serve_forever()
