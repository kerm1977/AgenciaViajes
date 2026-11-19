/* icons.js — iconos SVG inline propios (sin CDN). Uso: ic('eye') */
'use strict';
const ICONS = {
  eye: 'M12 5c-5 0-9.3 3-11 7 1.7 4 6 7 11 7s9.3-3 11-7c-1.7-4-6-7-11-7zm0 11.5A4.5 4.5 0 1 1 16.5 12 4.5 4.5 0 0 1 12 16.5zm0-7.2A2.7 2.7 0 1 0 14.7 12 2.7 2.7 0 0 0 12 9.3z',
  eyeOff: 'M3.3 2.3 1.9 3.7l3.1 3.1C3.2 8.2 1.7 10 1 12c1.7 4 6 7 11 7 2 0 3.9-.5 5.5-1.3l3.8 3.8 1.4-1.4zM12 16.5A4.5 4.5 0 0 1 7.5 12c0-.8.2-1.5.6-2.2l1.6 1.6a2.7 2.7 0 0 0 3.7 3.7l1.4 1.4a4.4 4.4 0 0 1-2.8 1zm11-4.5c-1.7-4-6-7-11-7-1.5 0-3 .3-4.3.9l1.8 1.8A9 9 0 0 1 12 7.5c4 0 7.6 2.3 9.3 4.5a11.6 11.6 0 0 1-3 3.4l1.5 1.5a13.5 13.5 0 0 0 3.2-4.9z'
};

function ic(name, cls) {
  const d = ICONS[name] || '';
  return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" width="16" ' +
    'height="16" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>';
}
