/* contactos.js — CRUD del directorio (clientes, guías, transportistas, proveedores) */
'use strict';
const Contactos = {
  BADGE: { Cliente: 'badge-sky', 'Guía': 'badge-brand',
           Transportista: 'badge-amber', 'Aerolínea/Hotel': 'badge-purple' },
  async render() {
    const q = (($('#search-contactos') || {}).value || '').toLowerCase();
    const tf = ($('#filter-contacto-tipo') || {}).value || '';
    const grid = $('#contactos-grid');
    if (!grid) return;
    const lista = (await DB.list('contactos')).filter(c => {
      const tel = (c.telefono || '');
      return (c.nombre.toLowerCase().includes(q) || tel.includes(q) ||
              (c.email || '').toLowerCase().includes(q)) &&
             (!tf || c.tipo === tf);
    });
    grid.innerHTML = '';
    if (!lista.length) {
      grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1">' +
        '<i class="fa-solid fa-address-book"></i><p>No hay contactos.</p></div>';
      return;
    }
    const eP = Session.can('contactos.editar'), dP = Session.can('contactos.eliminar');
    lista.forEach(c => {
      const card = document.createElement('div');
      card.className = 'card card-pad';
      card.innerHTML =
        '<div class="flex" style="justify-content:space-between;align-items:flex-start">' +
          '<span class="badge ' + (this.BADGE[c.tipo] || 'badge-slate') + '">' +
            esc(c.tipo) + '</span><span>' +
          (eP ? '<button class="iconbtn" onclick="Contactos.editar(\'' + c.id +
                '\')"><i class="fa-solid fa-pen-to-square"></i></button>' : '') +
          (dP ? '<button class="iconbtn danger" onclick="Contactos.borrar(\'' + c.id +
                '\')"><i class="fa-solid fa-trash"></i></button>' : '') +
          '</span></div>' +
        '<h4 class="bold mt1">' + esc(c.nombre) + '</h4>' +
        '<div class="grid gap1 mt1">' +
          '<p class="kv"><i class="fa-solid fa-phone" style="color:var(--slate-400)"></i> ' +
            esc(c.codigo ? c.codigo + ' ' : '') + esc(c.telefono || 'Sin teléfono') +
            (c.telefono ? ' <a href="https://wa.me/' + esc((c.codigo || '').replace('+', '') + c.telefono) +
              '" target="_blank" class="muted" title="WhatsApp"><i class="fa-brands fa-whatsapp" style="color:#25d366"></i></a>' : '') + '</p>' +
          '<p class="kv"><i class="fa-solid fa-envelope" style="color:var(--slate-400)"></i> ' +
            '<span class="truncate">' + esc(c.email || 'Sin correo') + '</span></p>' +
          (c.notas ? '<p class="hint" style="background:var(--slate-50);padding:.5rem;border-radius:var(--r-md);font-style:italic">' +
            esc(c.notas) + '</p>' : '') + '</div>';
      grid.appendChild(card);
    });
  },
  nuevo() {
    if (!Session.can('contactos.crear')) {
      showToast('Sin permiso para agregar contactos', 'error'); return;
    }
    $('#form-contacto').reset(); $('#contacto-id').value = '';
    llenarCodigos($('#cont-codigo'));
    $('#modal-contacto-title').textContent = 'Registrar Contacto';
    openModal('modal-contacto');
  },
  async guardar(e) {
    e.preventDefault();
    if (!V.check($('#form-contacto'))) return;
    const id = $('#contacto-id').value;
    await DB.save('contactos', {
      id: id || undefined,
      nombre: V.titleCase($('#cont-nombre').value),
      tipo: $('#cont-tipo').value,
      codigo: $('#cont-codigo').value,
      telefono: V.telNorm($('#cont-telefono').value),
      email: V.emailNorm($('#cont-email').value),
      notas: $('#cont-notas').value.trim()
    });
    closeModal('modal-contacto');
    showToast(id ? 'Contacto actualizado' : 'Contacto registrado');
    this.render();
  },
  async editar(id) {
    if (!Session.can('contactos.editar')) return;
    const c = await DB.get('contactos', id);
    if (!c) return;
    $('#contacto-id').value = c.id;
    $('#cont-nombre').value = c.nombre;
    $('#cont-tipo').value = c.tipo;
    llenarCodigos($('#cont-codigo'), c.codigo);
    $('#cont-telefono').value = c.telefono || '';
    $('#cont-email').value = c.email || '';
    $('#cont-notas').value = c.notas || '';
    $('#modal-contacto-title').textContent = 'Editar Contacto';
    openModal('modal-contacto');
  },
  async borrar(id) {
    if (!Session.can('contactos.eliminar')) {
      showToast('Sin permiso para eliminar contactos', 'error'); return;
    }
    if (await confirmar('¿Eliminar este contacto del directorio?')) {
      await DB.remove('contactos', id);
      showToast('Contacto eliminado', 'error');
      this.render();
    }
  }
};
Router.ON_TAB.contactos = () => Contactos.render();
