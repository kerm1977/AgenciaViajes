/* validators.js — reglas de formulario (nombres Title Case, email
   lowercase, teléfonos solo dígitos, urls, requeridos) */
'use strict';
const V = {
  reEmail: /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/,
  reTel: /^\d{4,15}$/,
  reUrl: /^https?:\/\/[\w\-]+(\.[\w\-]+)+(\/\S*)?$/i,

  titleCase(s) {
    return String(s || '').trim().toLowerCase().replace(/(^|\s|-)(\p{L})/gu,
      (m, p, l) => p + l.toUpperCase());
  },
  nombreOK(s) { return /^[\p{L}][\p{L} .'\-]{1,80}$/u.test(String(s || '').trim()); },
  emailOK(s) { return this.reEmail.test(String(s || '').trim()); },
  emailNorm(s) { return String(s || '').trim().toLowerCase(); },
  telOK(s) { return s === '' || this.reTel.test(String(s || '').trim()); },
  telNorm(s) { return String(s || '').replace(/\D/g, ''); },
  urlOK(s) { return s === '' || this.reUrl.test(String(s || '').trim()); },

  /* marca error visual en el .field contenedor */
  marcar(input, malo) {
    const f = input.closest('.field');
    if (f) f.classList.toggle('invalid', !!malo);
    input.classList.toggle('error', !!malo);
    return !malo;
  },

  /* valida un formulario según data-reglas="requerido|nombre|email|tel|url" */
  check(form) {
    let ok = true;
    $$('[data-reglas]', form).forEach(inp => {
      const val = inp.value.trim();
      const reglas = inp.dataset.reglas.split('|');
      let malo = '';
      for (const r of reglas) {
        if (r === 'requerido' && !val) malo = 'Requerido';
        else if (r === 'nombre' && val && !this.nombreOK(val)) malo = 'Nombre inválido';
        else if (r === 'email' && val && !this.emailOK(val)) malo = 'Correo inválido';
        else if (r === 'emailreq' && (!val || !this.emailOK(val))) malo = 'Correo inválido';
        else if (r === 'tel' && !this.telOK(val)) malo = 'Solo dígitos (4-15)';
        else if (r === 'url' && !this.urlOK(val)) malo = 'URL inválida';
        else if (r === 'pass' && val.length < 6) malo = 'Mínimo 6 caracteres';
        if (malo) break;
      }
      if (malo) {
        const e = f_err(inp);
        if (e) e.textContent = malo;
      }
      if (!this.marcar(inp, malo)) ok = false;
    });
    return ok;
  }
};
function f_err(inp) {
  const f = inp.closest('.field');
  return f ? f.querySelector('.err') : null;
}

/* instala el ojo de ver/ocultar en todos los .pass-wrap */
function wirePassEyes() {
  $$('.pass-wrap').forEach(w => {
    if (w._eye) return;
    w._eye = 1;
    const inp = w.querySelector('input');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pass-eye'; b.innerHTML = ic('eye');
    b.addEventListener('click', () => {
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      b.innerHTML = ic(show ? 'eyeOff' : 'eye');
    });
    w.appendChild(b);
  });
}

/* normalizadores en vivo: email→lowercase, tel→solo dígitos, nombre→titleCase */
function wireNormalizadores(root) {
  $$('input[data-norm="email"]', root).forEach(i => {
    if (i._nrm) return; i._nrm = 1;
    i.addEventListener('input', () => { i.value = i.value.toLowerCase(); });
  });
  $$('input[data-norm="tel"]', root).forEach(i => {
    if (i._nrm) return; i._nrm = 1;
    i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, ''); });
  });
  $$('input[data-norm="nombre"]', root).forEach(i => {
    if (i._nrm) return; i._nrm = 1;
    i.addEventListener('blur', () => { i.value = V.titleCase(i.value); });
  });
}
