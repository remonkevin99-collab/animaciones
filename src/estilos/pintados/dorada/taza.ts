import {E, clamp, mix, rng} from '../../../comun/curvas';
import {IMPACTO, SUELO, T_SUELO, cafe, piezasTaza, poli, taza, trozos, vapor, type P} from '../../gato/escena';
import {SOL} from './cielo';
import {sombraLarga} from './porche';
import {css, ctx, hex, lienzo, limpio, mezcla, pincelada, type RGB} from './pincel';

// LA TAZA A CONTRALUZ: una silueta de cerámica oscura con el reflejo del cielo en su esmalte (el borde de luz lo pone ./luz.ts). Su
// vapor brilla al pasar por delante del sol. Al caer, el café es ÁMBAR: el sol lo atraviesa y cada gota y el chorro en arco brillan
// como miel; al romperse, salta una corona de gotas con destellos de estrella, el polvo del suelo se levanta y brilla en el aire, los
// trozos echan su sombra larga hacia nosotros y el charco refleja el cielo.

const cerca = (q: P, r: number) => Math.exp(-Math.hypot(q[0] - SOL[0], q[1] - SOL[1]) / r);
const CERAMICA = hex('#2D1828');

// ---------------------------------------------------------------- la taza
export const pintarTaza = (c: CanvasRenderingContext2D, t: number) => {
  if (t >= T_SUELO) return;
  const tz = taza(t);
  const pz = piezasTaza(tz);
  limpio(c);
  const cuerpo = new Path2D(poli(pz.cuerpo));
  const asa = new Path2D(poli(pz.asa));
  c.fillStyle = css(CERAMICA);
  c.fill(cuerpo);
  c.fill(asa);
  // el esmalte, en las medidas de la taza: el reflejo malva del cielo a la izquierda, unas pinceladas de pie y el filo de la boca
  c.save();
  c.clip(cuerpo);
  const co = Math.cos(tz.ang), si = Math.sin(tz.ang);
  const r = rng(91);
  for (let i = 0; i < 16; i++) {
    const x = -46 + r() * 92, y = -50 + r() * 96;
    const col: RGB = x < -18 ? mezcla(hex('#4A2A44'), hex('#7A4A68'), r()) : mezcla(hex('#2A1424'), hex('#3E2234'), r());
    const wx = tz.c[0] + co * x - si * y, wy = tz.c[1] + si * x + co * y;
    pincelada(c, wx, wy, tz.ang + Math.PI / 2 + (r() - 0.5) * 0.2, 40 + r() * 30, 12 + r() * 6, col, 0.8, i, 0.5);
  }
  c.setTransform(co, si, -si, co, tz.c[0], tz.c[1]);
  c.globalAlpha = 0.6;
  c.fillStyle = css(hex('#9A6080'));
  c.fillRect(-40, -46, 7, 86);
  c.restore();
  limpio(c);
};

// ---------------------------------------------------------------- el vapor, que brilla a contraluz
let VAHO: HTMLCanvasElement | null = null;
export const pintarVapor = (c: CanvasRenderingContext2D, t: number) => {
  const hilos = vapor(t);
  if (!hilos.length) return;
  VAHO ??= lienzo(540, 960);
  const v = ctx(VAHO);
  limpio(v);
  v.clearRect(0, 0, 540, 960);
  v.setTransform(0.5, 0, 0, 0.5, 0, 0);
  v.lineCap = 'round';
  v.lineJoin = 'round';
  for (const h of hilos) {
    const p = new Path2D();
    h.pts.forEach(([x, y], i) => (i === 0 ? p.moveTo(x, y) : p.lineTo(x, y)));
    const medio = h.pts[Math.floor(h.pts.length / 2)];
    const luz = 0.5 + 0.9 * cerca(medio, 260);
    for (const [w, a] of [[30, 0.05], [16, 0.09], [6, 0.24]] as [number, number][]) {
      v.strokeStyle = `rgba(255,232,190,${clamp(a * h.alfa * luz)})`;
      v.lineWidth = w;
      v.stroke(p);
    }
  }
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  c.filter = 'blur(3px)';
  c.drawImage(VAHO, 0, 0, 1080, 1920);
  limpio(c);
};

// ---------------------------------------------------------------- el café: oscuro, con el filo encendido por el sol que lo atraviesa
const CAFE = hex('#4E1D07');
const hash01 = (i: number) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
const gotaLuz = (c: CanvasRenderingContext2D, q: P, r: number, ang: number, estira: number) => {
  limpio(c);
  c.setTransform(Math.cos(ang), Math.sin(ang), -Math.sin(ang), Math.cos(ang), q[0], q[1]);
  const rx = r * estira, ry = r * 0.86;
  c.fillStyle = css(CAFE, 0.95);
  c.beginPath();
  c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = 'lighter';
  // por dentro, el ámbar de la luz que lo atraviesa; por fuera, el filo del lado del sol
  const hs = Math.atan2(SOL[1] - q[1], SOL[0] - q[0]) - ang;
  const g = c.createRadialGradient(Math.cos(hs) * rx * 0.35, Math.sin(hs) * ry * 0.35, 0, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, 'rgba(255,128,40,0.34)');
  g.addColorStop(0.6, 'rgba(255,100,30,0.12)');
  g.addColorStop(1, 'rgba(255,100,30,0)');
  c.fillStyle = g;
  c.fillRect(-rx, -ry, rx * 2, ry * 2);
  c.strokeStyle = 'rgba(255,214,150,0.85)';
  c.lineWidth = Math.max(1.4, r * 0.16);
  c.beginPath();
  c.ellipse(0, 0, rx * 0.9, ry * 0.9, 0, hs - 0.9, hs + 0.9);
  c.stroke();
  limpio(c);
};
export const pintarCafe = (c: CanvasRenderingContext2D, t: number) => {
  const cf = cafe(t);
  const antes = cafe(t - 1 / 120);
  const vel = new Map<number, P>();
  for (const g of antes.gotas) vel.set(g.i, g.c);
  // el charco y las manchas del suelo: café mojado que refleja el cielo
  const mojado = (q: P, rx: number, ry: number, brillo: number) => {
    limpio(c);
    c.fillStyle = css(hex('#2E1206'), 0.94);
    c.beginPath();
    c.ellipse(q[0], q[1], rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = `rgba(255,196,120,${0.55 * brillo})`;
    c.lineWidth = Math.max(1.5, ry * 0.3);
    c.beginPath();
    c.ellipse(q[0], q[1] + ry * 0.12, rx * 0.86, ry * 0.7, 0, Math.PI * 1.08, Math.PI * 1.92);
    c.stroke();
    limpio(c);
  };
  if (cf.charco) {
    const ch = cf.charco;
    mojado(ch.c, ch.rx, ch.ry, 1);
    // el sol reflejado en el charco: un destello alargado en la parte de atrás
    limpio(c);
    c.globalCompositeOperation = 'lighter';
    const gx = clamp(SOL[0] + 30, ch.c[0] - ch.rx * 0.75, ch.c[0] + ch.rx * 0.75);
    const g = c.createRadialGradient(gx, ch.c[1] - ch.ry * 0.25, 0, gx, ch.c[1] - ch.ry * 0.25, ch.rx * 0.5);
    g.addColorStop(0, 'rgba(255,236,180,0.85)');
    g.addColorStop(0.3, 'rgba(255,190,110,0.4)');
    g.addColorStop(1, 'rgba(255,160,90,0)');
    c.fillStyle = g;
    c.setTransform(1, 0, 0, 0.22, 0, (ch.c[1] - ch.ry * 0.25) * 0.78);
    c.fillRect(gx - ch.rx * 0.5, ch.c[1] - ch.ry * 0.25 - ch.rx * 0.5, ch.rx, ch.rx);
    limpio(c);
  }
  for (const m of cf.manchas) mojado(m.c, m.rx, m.ry, 0.8);
  // el chorro: un hilo continuo que baja (las gotas del arco, de arriba abajo, unidas por una curva suave) con su filo encendido
  const arco = cf.gotas.filter((g) => g.i < 100).sort((a, b) => a.c[1] - b.c[1]);
  const unidas = new Set<number>();
  const hilos: (typeof arco)[] = [];
  for (const g of arco) {
    const ult = hilos[hilos.length - 1];
    const prev = ult?.[ult.length - 1];
    if (prev && Math.hypot(g.c[0] - prev.c[0], g.c[1] - prev.c[1]) < 90) ult.push(g);
    else hilos.push([g]);
  }
  limpio(c);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const trazaHilo = (h: typeof arco, dx: number, dy: number) => {
    c.beginPath();
    c.moveTo(h[0].c[0] + dx, h[0].c[1] + dy);
    for (let i = 1; i < h.length - 1; i++) {
      const m: P = [(h[i].c[0] + h[i + 1].c[0]) / 2, (h[i].c[1] + h[i + 1].c[1]) / 2];
      c.quadraticCurveTo(h[i].c[0] + dx, h[i].c[1] + dy, m[0] + dx, m[1] + dy);
    }
    const f = h[h.length - 1];
    c.lineTo(f.c[0] + dx, f.c[1] + dy);
  };
  for (const h of hilos) {
    if (h.length < 2) continue;
    for (const g of h) unidas.add(g.i);
    const w = h.reduce((s, g) => s + g.r, 0) / h.length;
    const m = h[Math.floor(h.length / 2)].c;
    const hs = Math.atan2(SOL[1] - m[1], SOL[0] - m[0]);
    limpio(c);
    c.strokeStyle = css(CAFE, 0.92);
    c.lineWidth = w * 1.3;
    trazaHilo(h, 0, 0);
    c.stroke();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = 'rgba(255,120,36,0.3)';
    c.lineWidth = w * 0.7;
    trazaHilo(h, Math.cos(hs) * w * 0.12, Math.sin(hs) * w * 0.12);
    c.stroke();
    c.strokeStyle = 'rgba(255,216,150,0.75)';
    c.lineWidth = Math.max(1.5, w * 0.14);
    trazaHilo(h, Math.cos(hs) * w * 0.5, Math.sin(hs) * w * 0.5);
    c.stroke();
  }
  limpio(c);
  for (const g of cf.gotas) {
    const p0 = vel.get(g.i);
    const v: P = p0 ? [(g.c[0] - p0[0]) * 120, (g.c[1] - p0[1]) * 120] : [0, 0];
    const sp = Math.hypot(v[0], v[1]);
    if (unidas.has(g.i) && hash01(g.i) < 0.6) continue;
    gotaLuz(c, g.c, g.r * (unidas.has(g.i) ? 0.8 : 0.9), Math.atan2(v[1], v[0]), 1 + Math.min(0.9, sp / 900));
  }
  // destellos de estrella en algunas gotas de la corona
  for (const g of cf.gotas) {
    if (g.i < 100 || g.i % 3 !== 0) continue;
    estrella(c, g.c, 12 + 6 * Math.sin(t * 40 + g.i), 0.85);
  }
};

// un destello de cuatro puntas
const estrella = (c: CanvasRenderingContext2D, q: P, s: number, a: number) => {
  if (s <= 0 || a <= 0) return;
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], s * 0.9);
  g.addColorStop(0, `rgba(255,246,214,${0.8 * a})`);
  g.addColorStop(1, 'rgba(255,200,120,0)');
  c.fillStyle = g;
  c.fillRect(q[0] - s, q[1] - s, s * 2, s * 2);
  c.fillStyle = `rgba(255,248,226,${0.95 * a})`;
  for (const ang of [0, Math.PI / 2]) {
    c.setTransform(Math.cos(ang), Math.sin(ang), -Math.sin(ang), Math.cos(ang), q[0], q[1]);
    c.beginPath();
    c.moveTo(-s * 1.6, 0);
    c.quadraticCurveTo(0, -s * 0.09, s * 1.6, 0);
    c.quadraticCurveTo(0, s * 0.09, -s * 1.6, 0);
    c.fill();
  }
  limpio(c);
};

// ---------------------------------------------------------------- los trozos, con su sombra larga
export const pintarTrozos = (c: CanvasRenderingContext2D, t: number) => {
  const tr = trozos(t);
  if (!tr.length) return;
  for (const z of tr) {
    const alto = clamp(1 - (SUELO - z.c[1]) / 60);
    if (alto > 0) sombraLarga(c, z.c[0], Math.max(z.c[1], SUELO - 6), 26, 60 + 70 * z.quieto, 0.4 * alto);
  }
  limpio(c);
  for (const z of tr) {
    const p = new Path2D(poli(z.pts));
    c.fillStyle = css(CERAMICA);
    c.fill(p);
    // el esmalte claro de dentro de la taza, en el canto roto (de lado, en sombra)
    c.save();
    c.clip(p);
    const co = Math.cos(z.ang), si = Math.sin(z.ang);
    c.setTransform(co, si, -si, co, z.c[0], z.c[1]);
    c.fillStyle = css(hex('#9A7088'), 0.85);
    c.fillRect(-60, -60, 120, 16);
    c.fillStyle = css(hex('#5A3850'), 0.85);
    c.fillRect(-60, -44, 120, 30);
    c.restore();
    limpio(c);
  }
};
export const siluetaTaza = (c: CanvasRenderingContext2D, t: number) => {
  limpio(c);
  c.fillStyle = '#000';
  if (t < T_SUELO) {
    const pz = piezasTaza(taza(t));
    c.fill(new Path2D(poli(pz.cuerpo)));
    c.fill(new Path2D(poli(pz.asa)));
  }
  for (const z of trozos(t)) c.fill(new Path2D(poli(z.pts)));
};

// ---------------------------------------------------------------- el golpe: destellos que saltan, el polvo que brilla y un fogonazo
const CHISPAS = (() => {
  const r = rng(131);
  return Array.from({length: 18}, (_, i) => ({
    p0: [IMPACTO[0] + (r() - 0.5) * 40, SUELO - 14] as P,
    v: [(i % 2 ? 1 : -1) * (80 + r() * 460), -(320 + r() * 780)] as P,
    vida: 0.45 + r() * 0.5, s: 9 + r() * 12, fase: r() * 6.28, t0: r() * 0.06,
  }));
})();
const POLVO = (() => {
  const r = rng(137);
  return Array.from({length: 54}, () => ({
    p0: [IMPACTO[0] + (r() - 0.5) * 120, SUELO - 4 - r() * 10] as P,
    v: [(r() - 0.5) * 520, -(40 + r() * 260)] as P,
    s: 2 + r() * 6, vida: 0.9 + r() * 1.4, fase: r() * 6.28,
  }));
})();
const NUBES_POLVO = Array.from({length: 6}, (_, i) => ({dx: (i - 2.5) * 34, dy: -10 - (i % 3) * 14, r0: 24 + (i % 2) * 10}));
export const pintarGolpe = (c: CanvasRenderingContext2D, t: number) => {
  const tau = t - T_SUELO;
  if (tau < 0) return;
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  // el fogonazo
  if (tau < 0.3) {
    const k = 1 - tau / 0.3;
    const g = c.createRadialGradient(IMPACTO[0], SUELO - 20, 0, IMPACTO[0], SUELO - 20, 220);
    g.addColorStop(0, `rgba(255,226,160,${0.55 * k * k})`);
    g.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = g;
    c.fillRect(IMPACTO[0] - 220, SUELO - 240, 440, 440);
  }
  // la nube de polvo dorado que se levanta y se deshace
  for (const n of NUBES_POLVO) {
    const k = clamp(tau / 1.6);
    if (k >= 1) continue;
    const rr = n.r0 + 120 * E.outCubic(k);
    const q: P = [IMPACTO[0] + n.dx * (1 + 1.6 * k), SUELO + n.dy - 50 * E.outCubic(k)];
    const a = 0.22 * (1 - k) ** 1.5 * clamp(tau / 0.06);
    const g = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], rr);
    g.addColorStop(0, `rgba(255,200,130,${a})`);
    g.addColorStop(1, 'rgba(255,170,100,0)');
    c.fillStyle = g;
    c.fillRect(q[0] - rr, q[1] - rr, rr * 2, rr * 2);
  }
  // las motas del polvo: salen, frenan y suben despacio, titilando
  for (const m of POLVO) {
    if (tau > m.vida) continue;
    const fr = 1 - Math.exp(-tau * 3.2);
    const x = m.p0[0] + (m.v[0] / 3.2) * fr;
    const y = m.p0[1] + (m.v[1] / 3.2) * fr - 18 * tau;
    const k = tau / m.vida;
    const a = (1 - k) ** 1.2 * (0.55 + 0.45 * Math.sin(t * 9 + m.fase) ** 2);
    c.fillStyle = `rgba(255,214,140,${0.8 * a})`;
    c.beginPath();
    c.arc(x, y, m.s * (0.6 + 0.4 * (1 - k)), 0, Math.PI * 2);
    c.fill();
  }
  limpio(c);
  // los destellos que saltan
  for (const ch of CHISPAS) {
    const s = tau - ch.t0;
    if (s < 0 || s > ch.vida) continue;
    const q: P = [ch.p0[0] + ch.v[0] * s, ch.p0[1] + ch.v[1] * s + 0.5 * 2600 * s * s];
    if (q[1] > SUELO + 10) continue;
    const k = s / ch.vida;
    estrella(c, q, ch.s * (1 - k * 0.6) * (0.7 + 0.3 * Math.sin(t * 34 + ch.fase)), 1 - k * k);
  }
};
