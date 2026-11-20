/* app.js — arranque: BD, sesión previa o login */
'use strict';
window.addEventListener('load', async () => {
  DC.ev('arranque', esNativo() ? 'nativo/SQLite' : 'web/IndexedDB');
  try {
    await DB.init();
    DC.ev('BD lista');
  } catch (e) {
    console.error('DB init', e);
    DC.ev('BD FALLO', e && e.message || String(e));
    showToast('Error iniciando la base de datos', 'error');
  }
  const u = Session.load();
  if (u) {
    DC.ev('sesion previa', u.email);
    /* revalida que la cuenta siga activa */
    const vivo = await DB.usuarioPorEmail(u.email);
    if (vivo && vivo.activo !== 0) {
      Session.set(vivo);
      Auth.entrar(vivo, true);
      return;
    }
    Session.set(null);
  }
  /* "Recordarme": si no hay sesión pero el dispositivo recuerda el correo,
     entra directo revalidando que la cuenta siga activa */
  const r = Session.remembered();
  if (r && r.email) {
    const vivo = await DB.usuarioPorEmail(r.email);
    if (vivo && vivo.activo !== 0) {
      Session.set(vivo); Auth.entrar(vivo, true); return; }
    Session.remember(null);
  }
  Auth.init();
});
