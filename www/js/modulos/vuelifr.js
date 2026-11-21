/* vuelifr.js — creador de iframes: pegar URLs y comparar precios en
   marcos verticales dentro de la página de Vuelos (hasta 8). */
'use strict';
Object.assign(Vuelos, {
  IFRKEY: 'vu.ifr',
  async _ifr() {
    try { return JSON.parse((await this._keys())[this.IFRKEY] || '[]'); }
    catch (e) { return []; }
  },
  async ifrAdd() {
    const inp = $('#vu-ifru'); if (!inp) return;
    let u = inp.value.trim();
    if (!u) { showToast('Pegá una URL primero', 'error'); return; }
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    const l = await this._ifr();
    if (l.length >= 8) { showToast('Máximo 8 iframes', 'error'); return; }
    if (!l.includes(u)) l.push(u);
    await DB.save('config', { id: this.IFRKEY, valor: JSON.stringify(l) });
    inp.value = '';
    this.ifrList();
  },
  /* widgets embebibles de Aviasales (tp.media está hecho para iframe)
     con el marker de afiliado — las tarifas dentro llevan a la compra */
  WIDGETS: {
    busc: 'https://tp.media/content?currency=usd&promo_id=4044' +
      '&shmarker=809301&campaign_id=100&target_host=search.aviasales.com' +
      '&locale=es&origin=SJO&destination=LIM&one_way=false',
    cal: 'https://tp.media/content?currency=usd&promo_id=2811' +
      '&shmarker=809301&campaign_id=100&target_host=search.aviasales.com' +
      '&locale=es&origin=SJO&destination=LIM',
  },
  async ifrWidget(k) {
    const l = await this._ifr(), u = this.WIDGETS[k];
    if (!u) return;
    if (!l.includes(u)) { if (l.length >= 8) {
      showToast('Máximo 8 iframes', 'error'); return; } l.push(u); }
    await DB.save('config', { id: this.IFRKEY, valor: JSON.stringify(l) });
    this.ifrList();
  },
  async ifrDel(i) {
    const l = await this._ifr();
    l.splice(i, 1);
    await DB.save('config', { id: this.IFRKEY, valor: JSON.stringify(l) });
    this.ifrList();
  },
  async ifrList() {
    const box = $('#vu-ifr'); if (!box) return;
    const l = await this._ifr();
    box.innerHTML = l.map((u, i) => {
      let host = u;
      try { host = new URL(u).hostname; } catch (e) {}
      return '<div class="it-acc" style="margin-top:.5rem">' +
        '<div class="it-acc-btn"><span class="it-acc-t">' + esc(host) +
        '</span>' +
        '<a class="iconbtn" href="' + esc(u) + '" target="_blank">' +
        '<i class="fa-solid fa-arrow-up-right-from-square"></i></a>' +
        '<button type="button" class="iconbtn" onclick="Vuelos.ifrDel(' +
        i + ')"><i class="fa-solid fa-trash"></i></button></div>' +
        '<iframe src="' + esc(u) + '" loading="lazy" ' +
        'style="width:100%;height:420px;border:0;border-radius:0 0 ' +
        '.5rem .5rem;background:#fff"></iframe></div>';
    }).join('') || '<p class="hint text-xs">Pegá una URL arriba para ' +
      'compararla aquí (hasta 8). Algunos sitios como Kayak bloquean ' +
      'iframes — usá el ícono de enlace para abrirlos aparte.</p>';
  },
});
