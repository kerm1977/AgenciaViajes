# ping_ota.py — prueba la comunicacion OTA con el telefono:
# barre la /24 propia buscando TravelFtpPlugin (:9863) y hace GET /id y /ping.
# Uso:  python scripts\ping_ota.py           (barre la red)
#       python scripts\ping_ota.py 192.168.x.x
import socket, sys, http.client, json
import concurrent.futures as cf

PORT = 9863

def mi_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80)); ip = s.getsockname()[0]; s.close()
        return ip
    except Exception:
        return None

def abierto(ip):
    try:
        socket.create_connection((ip, PORT), .35).close()
        return ip
    except Exception:
        return None

def get(ip, path):
    try:
        c = http.client.HTTPConnection(ip, PORT, timeout=3)
        c.request('GET', path)
        r = c.getresponse()
        return r.status, r.read().decode('utf-8', 'replace')
    except Exception as e:
        return None, str(e)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        candidatos = [sys.argv[1]]
    else:
        my = mi_ip()
        if not my:
            print('sin red'); sys.exit(1)
        pre = '.'.join(my.split('.')[:3]) + '.'
        print('Mi PC: %s — barriendo %s1-254 en :%d ...' % (my, pre, PORT))
        candidatos = [pre + str(i) for i in range(1, 255) if pre + str(i) != my]
    with cf.ThreadPoolExecutor(80) as pool:
        vivos = [ip for ip in pool.map(abierto, candidatos) if ip]
    if not vivos:
        print('NADA: ningun telefono con la app escuchando en :%d' % PORT)
        print('-> instala la APK, abre La Tribu Travels y repite.')
        sys.exit(1)
    for ip in vivos:
        st, body = get(ip, '/id')
        dev = ''
        try:
            dev = json.loads(body).get('dev', '')
        except Exception:
            pass
        st2, body2 = get(ip, '/ping')
        print('%s  /id -> %s %s | /ping -> %s %s'
              % (ip, st, body, st2, body2))
        if dev == 'latribu':
            print('   ** ES La Tribu Travels — OTA puede empujarle **')
