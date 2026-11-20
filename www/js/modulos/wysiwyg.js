/* wysiwyg.js — mini editor enriquecido compartido (negrita, subrayado,
   viñetas, lista ordenada, cita). El comando se aplica al editor .wys-edit
   donde está el cursor, no solo a #desc-editor, para que todos los
   editores de la app se comporten igual. "Cita" envuelve la selección en
   <blockquote> manualmente — formatBlock falla en algunos WebViews.
   Los botones usan onmousedown preventDefault para no perder selección. */
'use strict';
const WYS = {
  _last: null,
  _ed() {
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      const n = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
      if (n && n.closest) { const w = n.closest('.wys-edit'); if (w) return w; }
    }
    const a = document.activeElement;
    if (a && a.closest) { const w = a.closest('.wys-edit'); if (w) return w; }
    return this._last || document.getElementById('desc-editor');
  },
  _toggleQuote(e) {
    let sel = window.getSelection(),
        inside = sel && sel.rangeCount &&
          e.contains(sel.getRangeAt(0).commonAncestorContainer);
    if (!inside) {                     // cursor fuera/vacío: caret al final
      e.focus();
      const r0 = document.createRange();
      r0.selectNodeContents(e); r0.collapse(false);
      sel.removeAllRanges(); sel.addRange(r0); }
    const r = sel.getRangeAt(0);
    const n = r.commonAncestorContainer.nodeType === 1
      ? r.commonAncestorContainer : r.commonAncestorContainer.parentNode;
    const bq0 = n && n.closest ? n.closest('blockquote') : null;
    if (bq0 && e.contains(bq0)) {           // ya citado: quitar la cita
      while (bq0.firstChild) bq0.parentNode.insertBefore(bq0.firstChild, bq0);
      bq0.remove();
    } else {                                 // citar: envolver en blockquote
      const bq = document.createElement('blockquote');
      if (r.collapsed) { bq.appendChild(document.createElement('br'));
        r.insertNode(bq); }
      else { try { r.surroundContents(bq); }
        catch (err) { bq.appendChild(r.extractContents()); r.insertNode(bq); } }
      const nr = document.createRange();   // deja el cursor dentro de la cita
      nr.selectNodeContents(bq); nr.collapse(false);
      sel.removeAllRanges(); sel.addRange(nr);
    }
    e.dispatchEvent(new Event('input', { bubbles: true }));
  },
  cmdAt(btn, c, v) {
    const bar = btn && btn.closest ? btn.closest('.wys-bar') : null;
    const e = bar && bar.nextElementSibling && bar.nextElementSibling.classList.contains('wys-edit')
      ? bar.nextElementSibling : this._ed();
    if (!e) return;
    if (c === 'formatBlock' && v === 'blockquote') this._toggleQuote(e);
    else document.execCommand(c, false, v || null);
  },
  cmd(c, v) {
    const e = this._ed();
    if (!e) return;
    if (c === 'formatBlock' && v === 'blockquote') this._toggleQuote(e);
    else document.execCommand(c, false, v || null);
  }
};
document.addEventListener('focusin', e => {
  const w = e.target && e.target.closest ? e.target.closest('.wys-edit') : null;
  if (w) WYS._last = w;
});
