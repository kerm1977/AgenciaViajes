/* usuarios.js — gestión de cuentas y privilegios de administradores.
   Reglas: superusuarios fijos intocables; admin solo con privilegios
   asignados por un superusuario; admin nunca borra/degrada a un super. */
'use strict';
const Usuarios = {
  _permsSel: [], _page: 0, _q: '', _POR: 10,
  async render() {
    const q = (($('#search-usuarios') || {}).value || '').toLowerCase(),
          box = $('#usuarios-list');
    if (!box) return;
    if (q !== this._q) { this._q = q; this._page = 0; }
    const lista = (await DB.list('usuarios')).filter(u =>
      !q || u.nombre.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) || (u.rol || '').includes(q))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    if (this._page * this._POR >= lista.length) this._page = 0;
    const pags = Math.ceil(lista.length / this._POR),
          page = lista.slice(this._page * this._POR, (this._page + 1) * this._POR);
    box.innerHTML = (lista.length
      ? page.map(u => this._card(u)).join('')
      : '<div class="empty-state"><i class="fa-solid fa-user-shield"></i>' +
        '<p>Sin usuarios.</p></div>') +
      (pags > 1 ? '<div class="flex gap1" style="justify-content:center;' +
        'align-items:center;padding:.4rem 0"><button class="iconbtn" ' +
        (this._page < 1 ? 'disabled ' : '') +
        'onclick="Usuarios.pg(-1)"><i class="fa-solid fa-chevron-left">' +
        '</i></button><span class="hint">' + (this._page + 1) + ' / ' +
        pags + '</span><button class="iconbtn" ' +
        (this._page >= pags - 1 ? 'disabled ' : '') +
        'onclick="Usuarios.pg(1)"><i class="fa-solid fa-chevron-right">' +
        '</i></button></div>' : '');
  },
  pg(d) { this._page = Math.max(0, this._page + d); this.render(); },
  _card(u) {
    const esSuper = u.rol === 'superusuario',
          chip = esSuper ? 'rol-super' : u.rol === 'admin' ? 'rol-admin' : 'rol-user',
          nP = (u.permisos || []).length;
    return '<div class="it-acc"><div class="it-acc-head">' +
      '<button type="button" class="it-acc-btn" ' +
      'onclick="this.closest(\'.it-acc\').classList.toggle(\'open\')">' +
      '<span class="it-acc-t"><b>' + esc(u.nombre) + '</b> ' +
      '<span class="rol-chip ' + chip + '">' + esc(u.rol) + '</span></span>' +
      '<span class="hint">' + esc(u.email || '') + '</span>' +
      '<i class="fa-solid fa-chevron-down"></i></button></div>' +
      '<div class="it-acc-body">' +
      '<p><i class="fa-solid fa-key"></i> <b>Privilegios:</b> ' +
      (esSuper ? 'Todos (fijo)' : u.rol === 'admin'
        ? nP + ' privilegio(s)' : 'Ninguno') + '</p>' +
      '<p><i class="fa-solid fa-circle-half-stroke"></i> <b>Estado:</b> ' +
      (u.activo === 0
        ? '<span class="badge badge-rose">Inactivo</span>'
        : '<span class="badge badge-brand">Activo</span>') + '</p>' +
      '<div class="flex gap1" style="justify-content:flex-end">' +
      (esSuper ? '<span class="hint">fijo</span>' :
        '<button class="btn btn-soft" title="Editar/permisos" ' +
        'onclick="Usuarios.editar(\'' + u.id +
        '\')"><i class="fa-solid fa-pen-to-square"></i> Editar</button>' +
        '<button class="btn btn-soft" title="Activar/desactivar" ' +
        'onclick="Usuarios.toggleActivo(\'' + u.id +
        '\')"><i class="fa-solid fa-power-off"></i></button>' +
        '<button class="btn btn-soft" style="color:var(--rose-600)" ' +
        'title="Eliminar" onclick="Usuarios.borrar(\'' + u.id +
        '\')"><i class="fa-solid fa-trash"></i></button>') +
      '</div></div></div>';
  },
  toggleMulti() { $('#multi-perms').classList.toggle('open'); },
  rolCambio() {
    const esAdmin = $('#usr-rol').value === 'admin';
    $('#usr-permisos-wrap').style.display = esAdmin ? 'block' : 'none';
    $('#usr-pass-hint').textContent = $('#usr-id').value ? '(vacía = sin cambio)' : '*';
  },
  _armarMulti(sel) {
    const panel = $('#multi-perms-panel');
    this._permsSel = sel.slice();
    let html = '', g = '';
    PERMISOS.forEach(p => {
      if (p.g !== g) {
        g = p.g;
        html += '<div class="multi-item"><span class="grupo">' + esc(g) + '</span></div>';
      }
      const on = sel.indexOf(p.k) >= 0;
      html += '<label class="multi-item"><input type="checkbox" value="' + p.k +
        '"' + (on ? ' checked' : '') +
        ' onchange="Usuarios.checkPerm(this)"> ' + esc(p.t) + '</label>';
    });
    panel.innerHTML = html;
    this._lblMulti();
  },
  checkPerm(inp) {
    const i = this._permsSel.indexOf(inp.value);
    if (inp.checked && i < 0) this._permsSel.push(inp.value);
    if (!inp.checked && i >= 0) this._permsSel.splice(i, 1);
    this._lblMulti();
  },
  _lblMulti() {
    $('#multi-perms-label').textContent = this._permsSel.length
      ? this._permsSel.length + ' privilegio(s) marcados'
      : 'Selecciona privilegios…';
  },
  nuevo() {
    if (!Session.esSuper() && !Session.can('usuarios.gestionar')) {
      showToast('Sin permiso', 'error'); return;
    }
    $('#form-usuario').reset(); $('#usr-id').value = '';
    $('#usr-rol').value = 'usuario';
    this._armarMulti([]);
    this.rolCambio();
    $('#modal-usuario-title').textContent = 'Nuevo Usuario';
    openModal('modal-usuario');
  },
  async editar(id) {
    const u = await DB.get('usuarios', id);
    if (!u || u.rol === 'superusuario') return;
    $('#form-usuario').reset();
    $('#usr-id').value = u.id;
    $('#usr-nombre').value = u.nombre;
    $('#usr-email').value = u.email;
    $('#usr-rol').value = u.rol === 'admin' ? 'admin' : 'usuario';
    this._armarMulti(u.permisos || []);
    this.rolCambio();
    $('#modal-usuario-title').textContent = 'Editar Usuario';
    openModal('modal-usuario');
  },
  async guardar(e) {
    e.preventDefault();
    if (!V.check($('#form-usuario'))) return;
    const id = $('#usr-id').value;
    const email = V.emailNorm($('#usr-email').value);
    const rol = $('#usr-rol').value;
    const pass = $('#usr-pass').value;
    if (!id && !pass) { Auth.marcar('#usr-pass'); return; }
    const viejo = id ? await DB.get('usuarios', id) : null;
    if (viejo && viejo.rol === 'superusuario') return;
    if (!viejo && await DB.usuarioPorEmail(email)) {
      showToast('Ese correo ya existe', 'error'); return;
    }
    const obj = {
      id: id || undefined,
      nombre: V.titleCase($('#usr-nombre').value),
      email,
      pass: pass ? await DB.hashPass(email, pass) : viejo.pass,
      rol,
      permisos: rol === 'admin' ? this._permsSel.slice() : [],
      activo: viejo ? viejo.activo : 1,
      creado: viejo ? viejo.creado : new Date().toISOString()
    };
    await DB.save('usuarios', obj);
    closeModal('modal-usuario');
    showToast(id ? 'Usuario actualizado' : 'Usuario creado');
    this.render();
  },
  async toggleActivo(id) {
    const u = await DB.get('usuarios', id);
    if (!u || u.rol === 'superusuario') return;
    u.activo = u.activo === 0 ? 1 : 0;
    await DB.save('usuarios', u);
    showToast(u.activo ? 'Usuario activado' : 'Usuario desactivado');
    this.render();
  },
  async borrar(id) {
    const u = await DB.get('usuarios', id);
    if (!u) return;
    if (u.rol === 'superusuario') {
      showToast('No se puede eliminar un superusuario', 'error'); return;
    }
    if (!Session.esSuper()) {
      showToast('Solo un superusuario elimina cuentas', 'error'); return;
    }
    if (await confirmar('¿Eliminar la cuenta de ' + u.nombre + '?')) {
      await DB.remove('usuarios', id);
      showToast('Usuario eliminado', 'error');
      this.render();
    }
  }
};
Router.ON_TAB.usuarios = () => Usuarios.render();
/* cerrar el dropdown múltiple al hacer clic fuera */
document.addEventListener('click', e => {
  const m = document.getElementById('multi-perms');
  if (m && m.classList.contains('open') && !m.contains(e.target))
    m.classList.remove('open');
});
