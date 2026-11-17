import {E, clamp, rng} from '../../../comun/curvas';
import {
  IMPACTO, T_CAE, T_SUELO, cafe, piezasTaza, trozos, vapor, type P, type Taza,
} from '../../gato/escena';
import {calar, centro, ctx, lienzo, limpia, poligono, type Ctx} from './lienzos';

// LA TAZA, EL CAFÉ Y EL «¡CRAS!». La taza es otra pieza de cartón, con su asa hueca, una florecita calada
// (papel rojo detrás) y una cenefa de puntitos (papel amarillo). Mientras está en la mesa va pegada a la pantalla; al caer se
// separa de ella y se acerca a la luz, así que su sombra CRECE y se desenfoca, y vuelve a la pantalla al llegar al suelo. Los
// trozos llevan lo calado que les tocó y se van afinando al quedarse quietos. El café es de papel de seda marrón: sombra no del todo
// negra, con el marrón rojizo de la luz que pasa. El vapor, humo de verdad entre la luz y la pantalla: sombra blanda que sube.
// Y en el golpe, un letrero de cartón con «¡CRAS!» calado que sube en su varilla.

// la pieza de la taza, a doble resolución, en sus coordenadas (centro en 0): de x -60 a 100 y de y -70 a 70
const X0 = -60, Y0 = -70, AW = 160, AH = 140, K = 2;
let PIEZA: {sombra: HTMLCanvasElement; color: HTMLCanvasElement; tmp: HTMLCanvasElement} | null = null;
const LOCAL = piezasTaza({c: [0, 0], ang: 0});

const flor = (x: Ctx, c: P, r: number) => {
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    x.beginPath();
    x.ellipse(c[0] + Math.cos(a) * r * 0.55, c[1] + Math.sin(a) * r * 0.55, r * 0.46, r * 0.27, a, 0, Math.PI * 2);
    x.fill();
  }
};
const FLOR: P = [-2, 6];

const pieza = () => {
  if (PIEZA) return PIEZA;
  const sombra = lienzo(AW * K, AH * K), color = lienzo(AW * K, AH * K), tmp = lienzo(AW * K, AH * K);
  const s = ctx(sombra), c = ctx(color);
  for (const x of [s, c]) {
    x.setTransform(K, 0, 0, K, -X0 * K, -Y0 * K);
  }
  s.fillStyle = '#000';
  poligono(s, LOCAL.cuerpo);
  s.fill();
  poligono(s, LOCAL.asa);
  s.fill();
  calar(s, () => {
    flor(s, FLOR, 24);
    for (let i = 0; i < 7; i++) {
      s.beginPath();
      s.arc(-36 + i * 12, -42, 3.4, 0, Math.PI * 2);
      s.fill();
    }
    s.fillRect(-44, -52, 88, 2.4);
    s.fillRect(-44, 34, 88, 2.4);
  });
  // el centro de la flor, otra vez en negro
  s.beginPath();
  s.arc(FLOR[0], FLOR[1], 5, 0, Math.PI * 2);
  s.fill();
  c.fillStyle = 'rgba(240,30,36,0.92)';
  c.beginPath();
  c.arc(FLOR[0], FLOR[1], 26, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,220,50,0.92)';
  c.fillRect(-44, -48, 88, 12);
  PIEZA = {sombra, color, tmp};
  return PIEZA;
};

// lo lejos que está de la pantalla (0 pegada … 1 muy cerca de la luz): crece y se desenfoca
export const hondoTaza = (t: number) => {
  const t0 = T_CAE + 0.1;
  if (t < t0) return 0;
  const k = clamp((t - t0) / (T_SUELO - t0));
  return 0.95 * Math.sin(Math.PI * 0.8 * k);
};
const crece = (d: number) => 1 + 0.5 * d;
const blando = (d: number) => 0.5 + 10 * d;

export const pintarTaza = (s: Ctx, c: Ctx, tz: Taza, t: number) => {
  if (tz.estado === 'suelo') return;
  const P = pieza();
  const d = hondoTaza(t);
  for (const [x, img, color] of [[s, P.sombra, false], [c, P.color, true]] as [Ctx, HTMLCanvasElement, boolean][]) {
    x.save();
    x.translate(tz.c[0], tz.c[1]);
    x.rotate(tz.ang);
    x.scale(crece(d), crece(d));
    x.filter = `blur(${blando(d).toFixed(2)}px)`;
    x.globalAlpha = color ? 1 : 1 - 0.12 * d;
    x.drawImage(img, X0, Y0, AW, AH);
    x.restore();
  }
};

// ---------------------------------------------------------------- los trozos (las mismas seis piezas de la escena)
const TROZOS_LOCAL: P[][] = [
  [[-52, -59], [-6, -59], [-15, -20], [-52, -8]],
  [[-6, -59], [52, -59], [52, -22], [18, -12], [-15, -20]],
  [[-52, -8], [-15, -20], [0, 18], [-52, 30]],
  [[-15, -20], [18, -12], [52, -22], [52, 26], [0, 18]],
  [[-52, 30], [0, 18], [52, 26], [52, 45], [38, 59], [-38, 59], [-52, 45]],
  LOCAL.asa,
];
const CENTROS = TROZOS_LOCAL.map(centro);

export const pintarTrozos = (s: Ctx, c: Ctx, t: number) => {
  if (t < T_SUELO) return;
  const P = pieza();
  const tm = ctx(P.tmp);
  const tau = t - T_SUELO;
  for (const tr of trozos(t)) {
    const i = tr.n - 1;
    const d = (0.5 * (1 - E.outCubic(clamp(tau / 0.5))) + 0.05) * (1 - 0.7 * tr.quieto);
    for (const [x, img, color] of [[s, P.sombra, false], [c, P.color, true]] as [Ctx, HTMLCanvasElement, boolean][]) {
      // el trozo, recortado de la pieza entera en un lienzo aparte (si se recortara al pintarlo, el desenfoque saldría cortado)
      limpia(tm);
      tm.save();
      tm.setTransform(K, 0, 0, K, -X0 * K, -Y0 * K);
      poligono(tm, TROZOS_LOCAL[i]);
      tm.clip();
      tm.drawImage(img, X0, Y0, AW, AH);
      tm.restore();
      x.save();
      x.translate(tr.c[0], tr.c[1]);
      x.scale(crece(d), crece(d));
      x.rotate(tr.ang);
      x.translate(-CENTROS[i][0], -CENTROS[i][1]);
      x.filter = `blur(${blando(d).toFixed(2)}px)`;
      if (!color) x.globalAlpha = 1 - 0.12 * d;
      x.drawImage(P.tmp, X0, Y0, AW, AH);
      x.restore();
    }
  }
};

// ---------------------------------------------------------------- el café: papel de seda marrón
export const pintarCafe = (s: Ctx, c: Ctx, t: number) => {
  const cf = cafe(t);
  if (!cf.gotas.length && !cf.manchas.length && !cf.charco) return;
  // los mismos dibujos dos veces: la sombra (casi negra) y su marrón rojizo en la luz
  const dibuja = (x: Ctx) => {
    const chorro = cf.gotas.filter((g) => g.i < 100).sort((a, b) => a.i - b.i);
    const corona = cf.gotas.filter((g) => g.i >= 100);
    // el chorro, lejos de la pantalla (cae con la taza): blando y algo más grande, con las gotas unidas en una cinta
    x.save();
    x.filter = 'blur(1.8px)';
    x.lineCap = 'round';
    for (let i = 1; i < chorro.length; i++) {
      const a = chorro[i - 1], b = chorro[i];
      if (b.i - a.i > 2 || Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1]) > 70) continue;
      x.lineWidth = 2 * Math.min(a.r, b.r) * 0.9;
      x.beginPath();
      x.moveTo(a.c[0], a.c[1]);
      x.lineTo(b.c[0], b.c[1]);
      x.stroke();
    }
    for (const g of chorro) {
      x.beginPath();
      x.arc(g.c[0], g.c[1], g.r, 0, Math.PI * 2);
      x.fill();
    }
    x.restore();
    // la corona del golpe y lo del suelo: más cerca de la pantalla
    x.save();
    x.filter = 'blur(1.1px)';
    for (const g of corona) {
      x.beginPath();
      x.arc(g.c[0], g.c[1], g.r, 0, Math.PI * 2);
      x.fill();
    }
    for (const m of cf.manchas) {
      x.beginPath();
      x.ellipse(m.c[0], m.c[1], m.rx, m.ry, 0, 0, Math.PI * 2);
      x.fill();
    }
    if (cf.charco) {
      const e = cf.charco;
      x.beginPath();
      x.ellipse(e.c[0], e.c[1], e.rx, e.ry, e.ang, 0, Math.PI * 2);
      x.fill();
    }
    x.restore();
  };
  // todo junto en un lienzo aparte, opaco (así las gotas que se pisan no se oscurecen: una sola lámina de café), y de ahí a los dos
  CAFE_L ??= lienzo();
  const T = ctx(CAFE_L);
  limpia(T);
  T.fillStyle = T.strokeStyle = '#000';
  dibuja(T);
  s.save();
  s.globalAlpha = 0.3;
  s.drawImage(CAFE_L, 0, 0);
  s.restore();
  T.globalCompositeOperation = 'source-in';
  T.fillStyle = '#b04c14';
  T.fillRect(0, 0, T.canvas.width, T.canvas.height);
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.drawImage(CAFE_L, 0, 0);
  c.restore();
};
let CAFE_L: HTMLCanvasElement | null = null;

// ---------------------------------------------------------------- el vapor: humo entre la luz y la pantalla, sombra blanda
export const pintarVapor = (s: Ctx, t: number) => {
  const hilos = vapor(t);
  if (!hilos.length) return;
  s.save();
  s.filter = 'blur(2.6px)';
  s.lineCap = 'round';
  s.lineJoin = 'round';
  for (const h of hilos) {
    const a = h.pts[0], b = h.pts[h.pts.length - 1];
    const g = s.createLinearGradient(a[0], a[1], b[0], b[1]);
    g.addColorStop(0, `rgba(0,0,0,${(0.6 * h.alfa).toFixed(3)})`);
    g.addColorStop(0.7, `rgba(0,0,0,${(0.35 * h.alfa).toFixed(3)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    s.strokeStyle = g;
    s.lineWidth = 9;
    s.beginPath();
    h.pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.stroke();
  }
  s.restore();
};

// ---------------------------------------------------------------- el letrero del «¡CRAS!»: estrella de cartón con las letras caladas
const LW = 380, LH = 280; // de -190 a 190 y de -140 a 140, a doble resolución
let LETRERO: {sombra: HTMLCanvasElement; color: HTMLCanvasElement} | null = null;
const estrella = (x: Ctx, semilla: number, ex: number, ey: number, ix: number, iy: number) => {
  const r = rng(semilla);
  const n = 15;
  const pts: P[] = [];
  for (let i = 0; i < 2 * n; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n + (r() - 0.5) * 0.12;
    const f = i % 2 === 0 ? 0.9 + r() * 0.2 : 1;
    pts.push(i % 2 === 0 ? [Math.cos(a) * ex * f, Math.sin(a) * ey * f] : [Math.cos(a) * ix, Math.sin(a) * iy]);
  }
  poligono(x, pts);
};
// las letras, a tijera: trazos gruesos de punta redonda (de -115 a 115 de ancho y de -28 a 28 de alto)
const letras = (x: Ctx) => {
  x.lineWidth = 13;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  const raya = (pts: P[]) => {
    x.beginPath();
    pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
    x.stroke();
  };
  const punto = (cx: number, cy: number) => {
    x.beginPath();
    x.arc(cx, cy, 8, 0, Math.PI * 2);
    x.fill();
  };
  // ¡
  punto(-108, -22);
  raya([[-108, -6], [-106, 28]]);
  // C
  x.beginPath();
  x.arc(-66, 0, 25, 0.28 * Math.PI, 1.72 * Math.PI);
  x.stroke();
  // R
  raya([[-26, 28], [-26, -28], [-12, -28]]);
  x.beginPath();
  x.arc(-12, -14, 14, -Math.PI / 2, Math.PI / 2);
  x.stroke();
  raya([[-26, 0], [-12, 0], [6, 28]]);
  // A
  raya([[18, 28], [36, -28], [54, 28]]);
  raya([[26, 10], [46, 10]]);
  // S
  x.beginPath();
  x.moveTo(90, -20);
  x.bezierCurveTo(84, -32, 62, -32, 64, -14);
  x.bezierCurveTo(66, -2, 92, -2, 92, 14);
  x.bezierCurveTo(94, 32, 66, 34, 60, 20);
  x.stroke();
  // !
  raya([[112, -28], [110, 8]]);
  punto(110, 24);
};
const letrero = () => {
  if (LETRERO) return LETRERO;
  const sombra = lienzo(LW * K, LH * K), color = lienzo(LW * K, LH * K);
  const s = ctx(sombra), c = ctx(color);
  for (const x of [s, c]) x.setTransform(K, 0, 0, K, (LW / 2) * K, (LH / 2) * K);
  s.fillStyle = '#000';
  estrella(s, 88, 182, 128, 146, 98);
  s.fill();
  calar(s, () => {
    s.save();
    s.rotate(-0.06);
    letras(s);
    s.restore();
    // un filete calado por dentro del borde
    s.lineWidth = 3;
    estrella(s, 88, 158, 108, 128, 84);
    s.stroke();
  });
  c.fillStyle = 'rgba(255,216,30,0.94)';
  c.beginPath();
  c.ellipse(0, 0, 130, 50, -0.06, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(240,34,30,0.92)';
  c.lineWidth = 10;
  estrella(c, 88, 158, 108, 128, 84);
  c.stroke();
  LETRERO = {sombra, color};
  return LETRERO;
};

export const CRAS_C: P = [826, 1236];
// cómo está el letrero en el paso de marioneta ts: sale de abajo con un rebote y tiembla un poco; se va al final
export const estadoCras = (ts: number) => {
  if (ts < T_SUELO - 1e-6) return null;
  const n = Math.round((ts - T_SUELO) * 15);
  const ESCALAS = [0.55, 1.2, 0.92, 1.05, 0.98];
  const sc = n < ESCALAS.length ? ESCALAS[n] : 1;
  const r = rng(700 + n);
  const giro = n < 4 ? [-0.14, 0.09, -0.05, 0.03][n] : (r() - 0.5) * 0.05;
  const baja = 700 * E.inCubic(clamp((ts - 4.5) / 0.45));
  const sube = n === 0 ? 70 : 0;
  if (baja > 690) return null;
  return {c: [CRAS_C[0] + (r() - 0.5) * 3, CRAS_C[1] + baja + sube] as P, sc, giro};
};

export const pintarCras = (s: Ctx, c: Ctx, ts: number) => {
  const e = estadoCras(ts);
  if (!e) return null;
  const L = letrero();
  for (const [x, img] of [[s, L.sombra], [c, L.color]] as [Ctx, HTMLCanvasElement][]) {
    x.save();
    x.translate(e.c[0], e.c[1]);
    x.rotate(e.giro);
    x.scale(e.sc, e.sc);
    x.drawImage(img, -LW / 2, -LH / 2, LW, LH);
    x.restore();
  }
  // dónde se agarra su varilla (abajo de la estrella)
  return [e.c[0] + 20 * e.sc, e.c[1] + 96 * e.sc] as P;
};

export const IMPACTO_X = IMPACTO[0];
