/* destpais.js — selector de país en modal vertical con banderas. */
'use strict';
const PAISES = ['Argentina','Aruba','Bahamas','Barbados','Belice','Bolivia',
  'Brasil','Canadá','Chile','Colombia','Costa Rica','Cuba','Curazao',
  'Dominica','Ecuador','El Salvador','España','Estados Unidos','Granada',
  'Guatemala','Guyana','Haití','Honduras','Jamaica','México','Nicaragua',
  'Panamá','Paraguay','Perú','Puerto Rico','República Dominicana',
  'San Cristóbal y Nieves','San Vicente y las Granadinas','Santa Lucía',
  'Surinam','Trinidad y Tobago','Uruguay','Venezuela'];
const PAIS_FLAG = {'Argentina':'🇦🇷','Aruba':'🇦🇼','Bahamas':'🇧🇸',
  'Barbados':'🇧🇧','Belice':'🇧🇿','Bolivia':'🇧🇴','Brasil':'🇧🇷',
  'Canadá':'🇨🇦','Chile':'🇨🇱','Colombia':'🇨🇴','Costa Rica':'🇨🇷',
  'Cuba':'🇨🇺','Curazao':'🇨🇼','Dominica':'🇩🇲','Ecuador':'🇪🇨',
  'El Salvador':'🇸🇻','España':'🇪🇸','Estados Unidos':'🇺🇸',
  'Granada':'🇬🇩','Guatemala':'🇬🇹','Guyana':'🇬🇾','Haití':'🇭🇹',
  'Honduras':'🇭🇳','Jamaica':'🇯🇲','México':'🇲🇽','Nicaragua':'🇳🇮',
  'Panamá':'🇵🇦','Paraguay':'🇵🇾','Perú':'🇵🇪','Puerto Rico':'🇵🇷',
  'República Dominicana':'🇩🇴','San Cristóbal y Nieves':'🇰🇳',
  'San Vicente y las Granadinas':'🇻🇨','Santa Lucía':'🇱🇨',
  'Surinam':'🇸🇷','Trinidad y Tobago':'🇹🇹','Uruguay':'🇺🇾',
  'Venezuela':'🇻🇪'};
Object.assign(Destinos, {
  _fillPais(val) {
    const s = $('#dest-pais');
    s.innerHTML = '<option value="">— Selecciona el país —</option>' +
      PAISES.map(p => '<option' + (p === val ? ' selected' : '') + '>' +
        esc(p) + '</option>').join('');
    s.value = val || '';
    const lbl = $('#dest-pais-lbl');
    if (lbl) lbl.textContent = val ? (PAIS_FLAG[val] || '') + ' ' + val
      : '— Selecciona el país —';
  },
  selPais() { this.paisLista(); openModal('modal-pais');
    const b = $('#pais-buscar'); if (b) { b.value = ''; setTimeout(() => b.focus(), 60); } },
  paisLista() {
    const q = (($('#pais-buscar') || {}).value || '').toLowerCase(),
          cur = ($('#dest-pais') || {}).value || '';
    const el = $('#pais-lista'); if (!el) return;
    el.innerHTML = PAISES.filter(p => p.toLowerCase().includes(q))
      .map(p => '<button type="button" class="pais-item' +
        (p === cur ? ' sel' : '') + '" onclick="Destinos.elegirPais(\'' + p + '\')">' +
        '<span class="pais-fl">' + (PAIS_FLAG[p] || '🏳️') + '</span>' +
        '<span style="flex:1">' + esc(p) + '</span>' +
        (p === cur ? '<i class="fa-solid fa-check"></i>' : '') + '</button>')
      .join('') || '<p class="hint" style="text-align:center;padding:1rem">Sin resultados</p>';
  },
  elegirPais(p) {
    const s = $('#dest-pais'); if (s) { s.value = p;
      s.dispatchEvent(new Event('change', { bubbles: true })); }
    const lbl = $('#dest-pais-lbl');
    if (lbl) lbl.textContent = (PAIS_FLAG[p] || '') + ' ' + p;
    closeModal('modal-pais');
  },
});
