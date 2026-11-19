# sonda.py — prueba continua del canal OTA con el telefono.
# Repite N veces: socket crudo + GET /ping + GET /id + POST /ota (json de prueba
# con url apuntando al propio servidor del telefono para no romper nada).
# Uso: python scripts\sonda.py [ip] [repeticiones] [pausa_s]
import socket, http.client, time, json, sys

IP = sys.argv[1] if len(sys.argv) > 1 else '192.168.100.154'
PORT = 9863
REPS = int(sys.argv[2]) if len(sys.argv) > 2 else 6
PAUSA = int(sys.argv[3]) if len(sys.argv) > 3 else 3


def get(path):
    c = http.client.HTTPConnection(IP, PORT, timeout=4)
    c.request('GET', path)
    r = c.getresponse()
    body = r.read()[:80]
    c.close()
    return r.status, body


def post_ota_test():
    """POST /ota con url al propio localhost del telefono: el evento llega
    a la WebView; si la app intenta descargar, su propio servidor contesta
    404 JSON — prueba el canal sin romper el bundle."""
    body = json.dumps({'url': 'http://127.0.0.1:%d/sonda.zip' % PORT,
                       'version': 'sonda', 'checksum': ''}).encode()
    c = http.client.HTTPConnection(IP, PORT, timeout=6)
    c.request('POST', '/ota', body,
              {'Content-Type': 'application/json',
               'Content-Length': str(len(body))})
    r = c.getresponse()
    b = r.read()[:80]
    c.close()
    return r.status, b


for i in range(REPS):
    print('--- t=%s intento %d/%d' % (time.strftime('%H:%M:%S'), i + 1, REPS))
    try:
        s = socket.create_connection((IP, PORT), 2)
        s.close()
        print('    socket   : OK')
    except Exception as e:
        print('    socket   : FALLO %s' % e)
        time.sleep(PAUSA)
        continue
    for path in ('/ping', '/id'):
        try:
            st, b = get(path)
            print('    %-8s: %d %s' % (path, st, b))
        except Exception as e:
            print('    %-8s: FALLO %s' % (path, e))
    if i == REPS - 1:          # solo el ultimo: prueba de evento OTA
        try:
            st, b = post_ota_test()
            print('    /ota POST: %d %s (evento enviado a la app)' % (st, b))
        except Exception as e:
            print('    /ota POST: FALLO %s' % e)
    time.sleep(PAUSA)
print('fin de sonda')
