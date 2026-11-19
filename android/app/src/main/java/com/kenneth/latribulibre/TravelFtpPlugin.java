package com.kenneth.latribulibre;

import android.os.PowerManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.security.MessageDigest;
import java.util.UUID;
import org.json.JSONObject;

/* Mini servidor HTTP :9863 — igual que TribalFtpPlugin de CursosOTA
   (puerto propio para no pelear con TRIBALs :8765 en el mismo telefono).
   GET  /id     -> {dev, devid}   (descubrimiento LAN)
   GET  /ping   -> pong           (healthcheck del watcher)
   POST /ota    -> {url,checksum,version} -> evento "tmOta" a la WebView
   POST /ota-zip-> zip crudo -> se guarda y se sirve en GET /ota-incoming.zip;
                    el evento "tmOta" lleva url http://127.0.0.1:9863/ota-incoming.zip */
@CapacitorPlugin(name = "TravelFtp")
public class TravelFtpPlugin extends Plugin {
    public static final int PORT = 9863;
    private ServerSocket server;
    private String devid;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void load() {
        devid = UUID.randomUUID().toString().substring(0, 8);
        /* wake lock parcial: el socket OTA sigue vivo aunque la app duerma */
        PowerManager pm = (PowerManager) getContext()
            .getSystemService(android.content.Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,
                                  "latribu:ota");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire();
        new Thread(this::serve, "travel-ftp").start();
    }

    @PluginMethod
    public void ping(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ok", true);
        r.put("port", PORT);
        call.resolve(r);
    }

    @PluginMethod
    public void id(PluginCall call) {
        JSObject r = new JSObject();
        r.put("dev", "latribu");
        r.put("devid", devid);
        call.resolve(r);
    }

    private void serve() {
        while (true) {
            try {
                if (server == null || server.isClosed()) {
                    server = new ServerSocket(PORT);
                }
                final Socket s = server.accept();
                new Thread(() -> handle(s)).start();
            } catch (IOException e) {
                /* error transitorio (red, accept): NO matar el servidor —
                   espera y reabre; la cola OTA de la PC depende de esto */
                try { Thread.sleep(500); } catch (InterruptedException ie) {
                    return;
                }
                try { if (server != null) server.close(); } catch (IOException ig) {}
            }
        }
    }

    private void handle(Socket s) {
        try {
            InputStream in = s.getInputStream();
            OutputStream out = s.getOutputStream();
            /* headers y body del MISMO stream crudo: un BufferedReader aqui
               se tragaria por adelantado el inicio del ZIP y lo corromperia */
            String line = readLine(in);
            if (line == null) { s.close(); return; }
            String[] parts = line.split(" ");
            String method = parts[0], path = parts.length > 1 ? parts[1] : "/";
            int len = 0;
            while ((line = readLine(in)) != null && !line.isEmpty()) {
                if (line.toLowerCase().startsWith("content-length:")) {
                    len = Integer.parseInt(line.substring(15).trim());
                }
            }
            if ("GET".equals(method) && "/id".equals(path)) {
                replyJson(out, "{\"dev\":\"latribu\",\"devid\":\"" + devid + "\"}");
            } else if ("GET".equals(method) && "/ping".equals(path)) {
                replyJson(out, "{\"ok\":true}");
            } else if ("GET".equals(method) && "/ota-incoming.zip".equals(path)) {
                /* sirve el ultimo ZIP empujado: CapacitorUpdater lo baja por
                   http://127.0.0.1 (no acepta file://) */
                File z = new File(getContext().getFilesDir(), "ota-incoming.zip");
                if (!z.exists()) { replyJson(out, "{\"err\":404}", 404); }
                else {
                    byte[] hb = ("HTTP/1.1 200 OK\r\nContent-Type: application/zip\r\n"
                        + "Content-Length: " + z.length() + "\r\n\r\n").getBytes("UTF-8");
                    out.write(hb);
                    FileInputStream fis = new FileInputStream(z);
                    byte[] zbuf = new byte[8192]; int zn;
                    while ((zn = fis.read(zbuf)) > 0) out.write(zbuf, 0, zn);
                    fis.close();
                }
            } else if ("GET".equals(method) && "/ota-stamp".equals(path)) {
                /* sello del zip ya empujado: lo usa la app para aplicar el
                   paquete en cola aunque el PC sea inalcanzable (firewall) */
                File z = new File(getContext().getFilesDir(), "ota-incoming.zip");
                if (!z.exists()) { replyJson(out, "{\"err\":404}", 404); }
                else replyJson(out, "{\"sha\":\"" + sha256File(z)
                        + "\",\"bytes\":" + z.length() + "}");
            } else if ("POST".equals(method) && "/ota".equals(path)) {
                byte[] rb = new byte[len];
                int rlen = readFully(in, rb, len);
                JSONObject j = new JSONObject(new String(rb, 0, rlen, "UTF-8"));
                JSObject ev = new JSObject();
                ev.put("url", j.optString("url"));
                ev.put("version", j.optString("version"));
                ev.put("checksum", j.optString("checksum"));
                ev.put("manual", j.optBoolean("manual", false));
                notifyListeners("tmOta", ev);
                replyJson(out, "{\"ok\":true}");
            } else if ("POST".equals(method) && "/ota-zip".equals(path)) {
                File f = new File(getContext().getFilesDir(), "ota-incoming.zip");
                FileOutputStream fos = new FileOutputStream(f);
                byte[] buf = new byte[8192];
                int left = len, n;
                while (left > 0 && (n = in.read(buf, 0, Math.min(buf.length, left))) > 0) {
                    fos.write(buf, 0, n); left -= n;
                }
                fos.flush();
                fos.close();
                JSObject ev = new JSObject();
                ev.put("url", "http://127.0.0.1:" + PORT + "/ota-incoming.zip");
                ev.put("version", String.valueOf(System.currentTimeMillis()));
                ev.put("checksum", sha256File(f));   /* CapgoUpdater lo exige */
                ev.put("manual", false);
                notifyListeners("tmOta", ev);
                replyJson(out, "{\"ok\":true,\"bytes\":" + f.length() + "}");
            } else {
                replyJson(out, "{\"err\":404}", 404);
            }
            out.flush();
            s.close();
        } catch (Exception e) {
            try { s.close(); } catch (IOException ignored) {}
        }
    }

    /* linea de headers sin buffering: byte a byte hasta \n */
    private String readLine(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') break;
            b.write(c);
        }
        if (c == -1 && b.size() == 0) return null;
        String s = b.toString("ISO-8859-1");
        return s.endsWith("\r") ? s.substring(0, s.length() - 1) : s;
    }

    /* SHA-256 hex del archivo — checksum obligatorio de CapacitorUpdater */
    private String sha256File(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        FileInputStream fis = new FileInputStream(f);
        byte[] buf = new byte[8192]; int n;
        while ((n = fis.read(buf)) > 0) md.update(buf, 0, n);
        fis.close();
        StringBuilder sb = new StringBuilder();
        for (byte b : md.digest()) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private int readFully(InputStream in, byte[] buf, int len) throws IOException {
        int off = 0, n;
        while (off < len && (n = in.read(buf, off, len - off)) > 0) off += n;
        return off;
    }

    private void replyJson(OutputStream out, String body) throws IOException {
        replyJson(out, body, 200);
    }

    private void replyJson(OutputStream out, String body, int code) throws IOException {
        byte[] b = body.getBytes("UTF-8");
        String head = "HTTP/1.1 " + code + " OK\r\nContent-Type: application/json\r\n"
            + "Content-Length: " + b.length + "\r\nAccess-Control-Allow-Origin: *\r\n\r\n";
        out.write(head.getBytes("UTF-8"));
        out.write(b);
    }

    @Override
    protected void handleOnDestroy() {
        try { if (server != null) server.close(); } catch (IOException ignored) {}
        try { if (wakeLock != null && wakeLock.isHeld()) wakeLock.release(); }
        catch (Exception ignored) {}
    }
}
