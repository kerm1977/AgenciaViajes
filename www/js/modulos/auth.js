/* auth.js — login, registro de usuarios y carga del shell principal */
'use strict';
const Auth = {
  async init() {
    await Router.cargar('login', '#view-login');
    llenarCodigos($('#rg-codigo'));
    wirePassEyes();
    wireNormalizadores($('#view-login'));
  },
  tab(cual) {
    $('#tab-ingresar').classList.toggle('on', cual === 'ingresar');
    $('#tab-registro').classList.toggle('on', cual === 'registro');
    $('#form-login').classList.toggle('hidden', cual !== 'ingresar');
    $('#form-registro').classList.toggle('hidden', cual === 'ingresar');
  },
  async login(e) {
    e.preventDefault();
    const f = $('#form-login');
    if (!V.check(f)) return;
    const email = V.emailNorm($('#lg-email').value);
    const u = await DB.validarLogin(email, $('#lg-pass').value);
    if (!u) { showToast('Correo o contraseña incorrectos', 'error'); return; }
    Session.set(u);
    this.entrar(u);
  },
  async registro(e) {
    e.preventDefault();
    const f = $('#form-registro');
    if (!V.check(f)) return;
    if ($('#rg-pass').value !== $('#rg-pass2').value) {
      this.marcar('#rg-pass2'); showToast('Las contraseñas no coinciden', 'error'); return;
    }
    const email = V.emailNorm($('#rg-email').value);
    if (await DB.usuarioPorEmail(email)) {
      showToast('Ese correo ya está registrado', 'error'); return;
    }
    const u = await DB.save('usuarios', {
      nombre: V.titleCase($('#rg-nombre').value),
      email,
      pass: await DB.hashPass(email, $('#rg-pass').value),
      rol: 'usuario', permisos: [], activo: 1,
      creado: new Date().toISOString()
    });
    Session.set(u);
    showToast('Cuenta creada — bienvenido, ' + u.nombre);
    this.entrar(u);
  },
  marcar(sel) {
    const i = $(sel);
    if (i) { V.marcar(i, true); setTimeout(() => V.marcar(i, false), 2500); }
  },
  async salir() {
    if (!(await confirmar('¿Cerrar sesión? Tendrás que ingresar de nuevo.')))
      return;
    Session.logout();
  },

  /* entra al shell: carga app.html y arma navegación según rol */
  async entrar(u, quiet) {
    $('#view-login').innerHTML = '';
    $('#view-login').classList.add('hidden');
    const app = $('#view-app');
    app.classList.remove('hidden');
    await Router.cargar('app', '#view-app');
    $('#ub-avatar').textContent = iniciales(u.nombre);
    $('#ub-nombre').textContent = u.nombre;
    $('#ub-email').textContent = u.email;
    const rc = $('#ub-rol');
    rc.textContent = u.rol;
    rc.className = 'rol-chip ' + (u.rol === 'superusuario' ? 'rol-super'
      : u.rol === 'admin' ? 'rol-admin' : 'rol-user');
    this.nav();
    const d = $('#current-date-label');
    if (d) d.textContent = hoyLargo();
    const tag = $('#build-tag');
    if (tag) tag.textContent = '';   // sello oculto: queda solo para gestos OTA
    Router.switchTab('destinos');
    if (!quiet) showToast('Sesión iniciada — ' + u.nombre);
  },
  /* nav según permisos: usuarios/estadísticas solo si procede */
  nav() {
    const items = [
      ['destinos', 'fa-map-location-dot', 'Destinos y Viajes', 'Viajes'],
      ['contactos', 'fa-address-book', 'Contactos', 'Contactos'],
      ['pasajeros', 'fa-users-gear', 'Pasajeros', 'Pasajeros'],
      ['usuarios', 'fa-user-shield', 'Usuarios y Roles', 'Usuarios'],
      ['perfil', 'fa-user-gear', 'Mi Perfil', 'Perfil']
    ];
    const ok = k => {
      if (k === 'usuarios')
        return Session.esSuper() || Session.can('usuarios.gestionar');
      return true;
    };
    $('#nav-list').innerHTML = items.filter(i => ok(i[0])).map(i =>
      '<a href="#" class="nav-link" data-tab="' + i[0] +
      '" onclick="Router.switchTab(\'' + i[0] + '\');return false">' +
      '<i class="fa-solid ' + i[1] + '"></i> ' + i[2] + '</a>').join('');
    $('#mobile-nav').innerHTML = items.filter(i => ok(i[0])).map(i =>
      '<a href="#" class="mobile-nav-link" data-tab="' + i[0] +
      '" onclick="Router.switchTab(\'' + i[0] + '\');return false">' +
      '<i class="fa-solid ' + i[1] + '"></i><span>' + i[3] + '</span></a>').join('');
  }
};
