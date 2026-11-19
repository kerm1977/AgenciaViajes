# verificar_lineas.py — ningun archivo .js/.css/.html/.py supera 250 lineas.
# Excluye vendor/, node_modules/, android/ y archivos generados.
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIMITE = 250
EXT = ('.js', '.css', '.html', '.py')
EXCLUIR = {'vendor', 'node_modules', 'android', '.git', '__pycache__',
           'build', 'dist', 'builtin'}

def main():
    malos = []
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUIR]
        for f in files:
            if f.endswith(EXT):
                p = os.path.join(base, f)
                try:
                    n = sum(1 for _ in open(p, encoding='utf-8', errors='ignore'))
                except OSError:
                    continue
                if n > LIMITE:
                    malos.append((os.path.relpath(p, ROOT), n))
    if malos:
        print('Archivos sobre %d lineas:' % LIMITE)
        for r, n in malos:
            print('  %s: %d' % (r, n))
        sys.exit(1)
    print('OK — ningun archivo supera %d lineas.' % LIMITE)

if __name__ == '__main__':
    main()
