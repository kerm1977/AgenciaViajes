/* charts.js — gráficos propios en canvas (pie + barras), sin librerías */
'use strict';
const Charts = {
  PALETA: ['#d97706', '#0284c7', '#9333ea', '#f97316', '#e11d48',
           '#0d9488', '#7c3aed', '#db2777', '#eab308', '#475569'],
  _prep(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 200;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
    return { ctx, w, h };
  },
  /* datos: [{label, valor}] */
  pie(canvas, datos) {
    const { ctx, w, h } = this._prep(canvas);
    const total = datos.reduce((s, d) => s + d.valor, 0);
    const cx = w * 0.32, cy = h / 2, r = Math.min(cx, cy) - 12;
    ctx.textBaseline = 'middle';
    if (!total) {
      ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
      ctx.fillText('Sin datos', w / 2, cy); return;
    }
    let a = -Math.PI / 2;
    datos.forEach((d, i) => {
      const ang = (d.valor / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a, a + ang); ctx.closePath();
      ctx.fillStyle = this.PALETA[i % this.PALETA.length];
      ctx.fill(); a += ang;
    });
    /* leyenda */
    let y = Math.max(14, cy - datos.length * 9);
    ctx.textAlign = 'left';
    datos.forEach((d, i) => {
      ctx.fillStyle = this.PALETA[i % this.PALETA.length];
      ctx.fillRect(w * 0.6, y - 5, 10, 10);
      ctx.fillStyle = '#334155';
      ctx.fillText(d.label + ' (' + d.valor + ')', w * 0.6 + 16, y);
      y += 18;
    });
  },
  barras(canvas, datos) {
    const { ctx, w, h } = this._prep(canvas);
    const max = Math.max(1, ...datos.map(d => d.valor));
    const padL = 8, padB = 34, padT = 14;
    const n = datos.length || 1;
    const bw = Math.min(64, (w - padL * 2) / n - 14);
    const x0 = padL + ((w - padL * 2) - n * (bw + 14)) / 2;
    ctx.textAlign = 'center';
    datos.forEach((d, i) => {
      const bh = (d.valor / max) * (h - padT - padB);
      const x = x0 + i * (bw + 14), y = h - padB - bh;
      ctx.fillStyle = this.PALETA[i % this.PALETA.length];
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bw, Math.max(bh, 2), [6, 6, 0, 0]);
      else ctx.rect(x, y, bw, Math.max(bh, 2));
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillText(String(d.valor), x + bw / 2, y - 8);
      ctx.fillStyle = '#64748b';
      const lbl = d.label.length > 12 ? d.label.slice(0, 11) + '…' : d.label;
      ctx.fillText(lbl, x + bw / 2, h - padB + 14);
    });
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(0, h - padB + .5);
    ctx.lineTo(w, h - padB + .5); ctx.stroke();
  }
};
