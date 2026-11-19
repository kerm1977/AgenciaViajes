# fijar_ip.py — imprime las IP LAN de esta PC (para conectar el telefono).
import socket

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
    return ips or ['<sin-red>']

if __name__ == '__main__':
    for ip in my_ips():
        print('   http://%s' % ip)
