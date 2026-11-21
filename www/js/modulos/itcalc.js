/* itcalc.js — cálculos de totales del viaje: individual y por grupo.
   Modo 'grupo': el precio es del grupo (÷ S/G); 'persona': × C/G
   repartido entre S/G. */
'use strict';
Object.assign(Itinerario, {
  /* total individual del servicio: el "c/u" de la fórmula */
  _ind(modo, p) {
    const n = this.pax(), ns = this.paxS();
    if (modo === 'grupo') return ns ? p / ns : p;
    return ns ? Math.round(p * n / ns) : p; },
  /* gran total en vivo: Σ total de cada tarjeta con fórmula (Costos y pagos) */
  _gtotal() {
    const el = $('#it-gtotal'); if (!el) return;
    const n = this.pax(), ns = this.paxS(); let tg = 0, ti = 0;
    $$('#it-general .it-acc').forEach(c => {
      const v = s => parseFloat((c.querySelector(s) || {}).value) || 0,
            ck = s => !!(c.querySelector(s) || {}).checked,
            mo = c.querySelector('.it-modo'),
            mg = mo && mo.value === 'grupo';
      if (v('.it-precio')) { const m = mg ? 'grupo' : 'persona';
        tg += (m === 'grupo' || !n) ? v('.it-precio') : this._ind(m, v('.it-precio')) * n;
        ti += this._ind(m, v('.it-precio')); }
      if (v('.it-pb')) { const con = v('.it-pb') +
          (ck('.it-os') ? v('.it-osv') : 0) + (ck('.it-ai') ? v('.it-ps') : 0);
        const cu = mg ? (ns ? con / ns : con)
          : (ns && n ? Math.round(con * n / ns) : con);
        tg += mg ? con : cu * (n || 1); ti += cu; } });
    el.innerHTML = tg ? 'Total individual: <b>' + this._fmt(ti) +
      '</b><br>Total por grupo: <b>' + this._fmt(tg) + '</b>' : ''; },
  fmtT(d, n) { return (d.moneda === 'CRC' ? '₡' : '$') + n.toFixed(2); },
  /* mismo cálculo sobre el viaje guardado (página del itinerario) */
  totalViaje(d) {
    const cg = d.paxConGuia || 0, sg = d.paxSinGuia || 0;
    let T = 0, I = 0;
    (d.itinerario || []).forEach(it => { if (it.precio) {
      T += (it.modo === 'grupo' || !cg) ? it.precio : it.precio * cg;
      I += it.modo === 'grupo' ? (sg ? it.precio / sg : it.precio)
        : (sg ? it.precio * cg / sg : it.precio); } });
    const b = d.boleto; if (b) { const con = (parseFloat(b.pb) || 0) +
        (b.os === '1' ? parseFloat(b.osv) || 0 : 0) +
        (b.ai === '1' ? parseFloat(b.ps) || 0 : 0);
      if (b.modo === 'grupo') { T += con; I += sg ? con / sg : con; }
      else { T += con * (cg || 1); I += sg ? con * cg / sg : con; } }
    return { t: T, i: I }; }
});
