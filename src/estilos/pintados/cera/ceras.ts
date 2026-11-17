import {clamp, mix, rng, ruido} from '../../../comun/curvas';
import {resta, rot, suma, type Elipse, type P} from '../../gato/escena';

// LAS CERAS DE COLORES: el motor del dibujo de niño. Todo se pinta en un <canvas> como se pinta con una cera:
//  · el PAPEL tiene relieve (un mapa de alturas fijo, hecho una vez con ruido de varias escalas). La cera solo se queda en las
//    crestas: cuanto menos se aprieta, más huecos blancos asoman por dentro del color. Eso es el «grano».
//  · cada cosa se pinta primero en una CAPA aparte, con trazos opacos o flojos según lo que se apriete (la opacidad del trazo es la
//    presión); después la capa pasa por el papel (se queda solo donde la cresta es más alta que lo que pide la presión) y se pega.
//    Si una cosa tapa lo de detrás (el gato, la taza), antes se pinta papel limpio en su silueta: así por sus huecos asoma el blanco.
//  · los TRAZOS tiemblan (un ruido suave por la normal) y llevan vetas (dos pasadas finas al lado), los contornos se repasan dos
//    veces y no cierran justos, y los rellenos son GARABATOS de ida y vuelta que se salen un poco de la raya.
// Todo con semillas: el mismo segundo da siempre el mismo dibujo.

export type RGB = [number, number, number];
export type Caja = [number, number, number, number];

// las ceras de la caja: colores vivos y puros
export const CERA = {
  rojo: [226, 36, 40] as RGB,
  rojoOsc: [150, 22, 30] as RGB,
  azul: [34, 86, 210] as RGB,
  azulOsc: [24, 50, 140] as RGB,
  celeste: [104, 182, 238] as RGB,
  amarillo: [252, 210, 22] as RGB,
  verde: [46, 168, 60] as RGB,
  verdeOsc: [24, 112, 48] as RGB,
  verdeClaro: [140, 206, 70] as RGB,
  naranja: [246, 132, 22] as RGB,
  naranjaOsc: [204, 84, 16] as RGB,
  negro: [36, 30, 36] as RGB,
  marron: [134, 78, 34] as RGB,
  marronOsc: [92, 48, 22] as RGB,
  cafe: [96, 52, 22] as RGB,
  rosa: [244, 120, 168] as RGB,
  morado: [126, 66, 190] as RGB,
  gris: [128, 128, 138] as RGB,
  crema: [255, 226, 146] as RGB,
  piel: [252, 186, 140] as RGB,
};
export const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

// ---------------------------------------------------------------- el papel
type Papel = {W: number; H: number; k: number; h: Float32Array; fondo: HTMLCanvasElement};
let PAPEL: Papel | null = null;
export const PAPEL_COLOR: RGB = [255, 253, 245];

// el relieve: ruido de valor en varias escalas (en píxeles del mundo, así sale igual a cualquier escala de render)
const generarPapel = (W: number, H: number, k: number): Papel => {
  const h = new Float32Array(W * H);
  const octava = (cel: number, peso: number, semilla: number, estira = 1) => {
    const cx = Math.max(0.5, cel * k * estira), cy = Math.max(0.5, cel * k);
    const gw = Math.ceil(W / cx) + 2, gh = Math.ceil(H / cy) + 2;
    const r = rng(semilla);
    const g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = r();
    for (let y = 0; y < H; y++) {
      const fy = y / cy, iy = fy | 0;
      let ty = fy - iy;
      ty = ty * ty * (3 - 2 * ty);
      const f0 = iy * gw, f1 = f0 + gw;
      let j = y * W;
      for (let x = 0; x < W; x++, j++) {
        const fx = x / cx, ix = fx | 0;
        let tx = fx - ix;
        tx = tx * tx * (3 - 2 * tx);
        const a = g[f0 + ix], b = g[f0 + ix + 1], c = g[f1 + ix], d = g[f1 + ix + 1];
        h[j] += peso * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      }
    }
  };
  // el diente fino del papel (algo estirado, como sus fibras), el grano medio, y las zonas donde la mano apretó más o menos
  octava(2.7, 0.5, 11);
  octava(5.2, 0.3, 12);
  octava(20, 0.1, 13);
  octava(80, 0.1, 14);
  // se reparte en 0–1 por igual (por su histograma): así la presión dice qué parte del papel cubre la cera
  const N = 2048;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < h.length; i++) { if (h[i] < lo) lo = h[i]; if (h[i] > hi) hi = h[i]; }
  const hist = new Float64Array(N + 1);
  const esc = N / (hi - lo || 1);
  for (let i = 0; i < h.length; i++) hist[((h[i] - lo) * esc) | 0]++;
  for (let i = 1; i <= N; i++) hist[i] += hist[i - 1];
  for (let i = 0; i <= N; i++) hist[i] /= h.length;
  for (let i = 0; i < h.length; i++) h[i] = hist[((h[i] - lo) * esc) | 0];

  // el papel limpio: blanco cálido con su relieve apenas sombreado (como una hoja escaneada)
  const fondo = document.createElement('canvas');
  fondo.width = W;
  fondo.height = H;
  const fc = fondo.getContext('2d')!;
  const img = fc.createImageData(W, H);
  const d = img.data;
  for (let i = 0, j = 0; j < h.length; j++, i += 4) {
    const s = 1 - 0.045 * (1 - h[j]) ** 2;
    d[i] = PAPEL_COLOR[0] * s;
    d[i + 1] = PAPEL_COLOR[1] * s;
    d[i + 2] = PAPEL_COLOR[2] * s * 0.995;
    d[i + 3] = 255;
  }
  fc.putImageData(img, 0, 0);
  return {W, H, k, h, fondo};
};
const papel = (W: number, H: number, k: number) => {
  if (!PAPEL || PAPEL.W !== W || PAPEL.H !== H) PAPEL = generarPapel(W, H, k);
  return PAPEL;
};

// cuánto papel cubre la cera según la presión (la opacidad con la que se pintó la capa): floja, solo las crestas
const UMBRAL = Float32Array.from({length: 256}, (_, a) => 1 - Math.min(0.93, 0.03 + 0.97 * (a / 255) ** 0.8));

// ---------------------------------------------------------------- el lienzo y sus capas
export type Lienzo = {
  k: number; W: number; H: number;
  c: CanvasRenderingContext2D; // el dibujo
  capa: CanvasRenderingContext2D; // donde se pinta cada capa antes de pasarla por el papel
  papel: Papel;
  ox: number; oy: number; // el temblor del golpe, en píxeles del mundo
};
let CAPA: HTMLCanvasElement | null = null;
export const lienzo = (canvas: HTMLCanvasElement, k: number): Lienzo => {
  const W = canvas.width, H = canvas.height;
  CAPA ??= document.createElement('canvas');
  if (CAPA.width !== W || CAPA.height !== H) {
    CAPA.width = W;
    CAPA.height = H;
  }
  return {k, W, H, c: canvas.getContext('2d')!, capa: CAPA.getContext('2d', {willReadFrequently: true})!, papel: papel(W, H, k), ox: 0, oy: 0};
};

// lo que recibe quien dibuja una capa
export type Capa = {
  c: CanvasRenderingContext2D;
  caja: Caja; // lo pintado, en el mundo (solo eso pasa por el papel)
  aMundo: (q: P) => P; // si se pinta dentro de otra transformación (el gato va 1,14 veces más grande)
  // el hervor suave: el mismo dibujo, vuelto a calcar con la mano un poco movida (cada «fase», otra calcada)
  hervor?: {amp: number; fase: number};
};
const calca = (pts: P[], h: {amp: number; fase: number}): P[] =>
  pts.map(([x, y]) => [x + h.amp * ruido(y / 61 + h.fase * 9.7, 21), y + h.amp * ruido(x / 67 + h.fase * 6.3, 22)] as P);
const marca = (cp: Capa, q: P, r: number) => {
  const w = cp.aMundo(q);
  const k = cp.caja;
  if (w[0] - r < k[0]) k[0] = w[0] - r;
  if (w[1] - r < k[1]) k[1] = w[1] - r;
  if (w[0] + r > k[2]) k[2] = w[0] + r;
  if (w[1] + r > k[3]) k[3] = w[1] + r;
};

// pasa lo pintado por el papel: la cera se queda donde la cresta es más alta que lo que pide la presión
const granular = (l: Lienzo, bx: number, by: number, bw: number, bh: number) => {
  const img = l.capa.getImageData(bx, by, bw, bh);
  const d = img.data;
  const h = l.papel.h;
  const W = l.W;
  for (let y = 0; y < bh; y++) {
    let j = (by + y) * W + bx;
    let i = y * bw * 4;
    for (let x = 0; x < bw; x++, j++, i += 4) {
      const a = d[i + 3];
      if (a === 0) continue;
      const v = (h[j] - UMBRAL[a]) * 11 + 0.5;
      if (v <= 0) d[i + 3] = 0;
      else {
        d[i + 3] = v >= 1 ? 255 : (v * 255) | 0;
        // donde la cera se amontona (las crestas más altas) sale un pelo más oscura y brillante
        const o = 1 - 0.1 * clamp((h[j] - 0.82) * 5);
        d[i] *= o;
        d[i + 1] *= o;
        d[i + 2] *= o;
      }
    }
  }
  l.capa.putImageData(img, bx, by);
};

export type OpcCapa = {
  tapar?: (c: CanvasRenderingContext2D) => void; // la silueta donde antes se pone papel limpio (camino en el mundo)
  aMundo?: (q: P) => P;
  sinGrano?: boolean;
};
// pinta una capa: la dibuja aparte, la pasa por el papel y la pega en el dibujo
export const capa = (l: Lienzo, dibuja: (cp: Capa) => void, o: OpcCapa = {}) => {
  const {k, W, H, capa: s} = l;
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.clearRect(0, 0, W, H);
  s.globalCompositeOperation = 'source-over';
  s.setTransform(k, 0, 0, k, l.ox * k, l.oy * k);
  const cp: Capa = {c: s, caja: [Infinity, Infinity, -Infinity, -Infinity], aMundo: o.aMundo ?? ((q) => q)};
  dibuja(cp);
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-over';
  const [x0, y0, x1, y1] = cp.caja;
  if (!(x1 > x0 && y1 > y0)) return;
  const bx = clamp(Math.floor((x0 + l.ox) * k) - 2, 0, W), by = clamp(Math.floor((y0 + l.oy) * k) - 2, 0, H);
  const bw = clamp(Math.ceil((x1 + l.ox) * k) + 2, 0, W) - bx, bh = clamp(Math.ceil((y1 + l.oy) * k) + 2, 0, H) - by;
  if (bw <= 0 || bh <= 0) return;
  if (!o.sinGrano) granular(l, bx, by, bw, bh);
  if (o.tapar) {
    l.c.save();
    l.c.setTransform(k, 0, 0, k, l.ox * k, l.oy * k);
    l.c.beginPath();
    o.tapar(l.c);
    l.c.clip();
    l.c.setTransform(1, 0, 0, 1, 0, 0);
    l.c.drawImage(l.papel.fondo, 0, 0);
    l.c.restore();
  }
  l.c.drawImage(s.canvas, bx, by, bw, bh, bx, by, bw, bh);
};
// el papel entero, de fondo
export const pintarPapel = (l: Lienzo) => {
  l.c.setTransform(1, 0, 0, 1, 0, 0);
  l.c.drawImage(l.papel.fondo, 0, 0);
};

// ---------------------------------------------------------------- geometría
const largo = (a: P) => Math.hypot(a[0], a[1]);
export const lerp = (a: P, b: P, k: number): P => [mix(a[0], b[0], k), mix(a[1], b[1], k)];
// reparte los puntos de una línea cada `paso` píxeles (el temblor necesita puntos parejos)
export const remuestrea = (pts: P[], paso = 8, cerrado = false): P[] => {
  const src = cerrado ? [...pts, pts[0]] : pts;
  const out: P[] = [src[0]];
  let resto = 0;
  for (let i = 1; i < src.length; i++) {
    const a = src[i - 1], b = src[i];
    const L = largo(resta(b, a));
    let s = paso - resto;
    while (s <= L) {
      out.push(lerp(a, b, s / L));
      s += paso;
    }
    resto = L - (s - paso);
  }
  if (!cerrado) {
    const ult = src[src.length - 1];
    if (largo(resta(ult, out[out.length - 1])) > 0.5) out.push(ult);
  } else if (out.length > 2 && largo(resta(out[out.length - 1], out[0])) < paso * 0.5) out.pop();
  return out;
};
const normales = (pts: P[], cerrado: boolean): P[] =>
  pts.map((_, i) => {
    const n = pts.length;
    const a = cerrado ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
    const b = cerrado ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)];
    const u = resta(b, a);
    const L = largo(u) || 1;
    return [-u[1] / L, u[0] / L] as P;
  });
// el pulso de la mano: cada punto se corre por la normal con un ruido suave a lo largo del trazo
export const tiembla = (pts: P[], amp: number, semilla: number, cerrado = false): P[] => {
  if (amp <= 0 || pts.length < 2) return pts;
  const ns = normales(pts, cerrado);
  let s = 0;
  return pts.map((q, i) => {
    if (i > 0) s += largo(resta(q, pts[i - 1]));
    const d = amp * (ruido(s / 46 + semilla * 3.13, semilla % 97) + 0.35 * ruido(s / 12 + semilla * 1.71, (semilla + 5) % 97));
    return [q[0] + ns[i][0] * d, q[1] + ns[i][1] * d] as P;
  });
};

// ---------------------------------------------------------------- los trazos
export type OpcTrazo = {color: RGB; ancho: number; alfa?: number; vetas?: boolean};
// un camino suave por los puntos (por los puntos medios, como una mano rápida)
const camino = (c: CanvasRenderingContext2D, pts: P[]) => {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) {
    c.lineTo(pts[1][0], pts[1][1]);
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const m = lerp(pts[i], pts[i + 1], 0.5);
    c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  const u = pts[pts.length - 1];
  c.lineTo(u[0], u[1]);
};
// una raya de cera: el trazo y, a sus lados, dos pasadas finas más flojas (las vetas de la cera)
export const linea = (cp: Capa, pts0: P[], o: OpcTrazo) => {
  if (pts0.length < 2) return;
  const pts = cp.hervor ? calca(pts0, cp.hervor) : pts0;
  const {c} = cp;
  const alfa = o.alfa ?? 0.9;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = css(o.color, alfa);
  c.lineWidth = o.ancho;
  camino(c, pts);
  c.stroke();
  if (o.vetas !== false && o.ancho >= 6) {
    const ns = normales(pts, false);
    c.strokeStyle = css(o.color, alfa * 0.55);
    c.lineWidth = o.ancho * 0.4;
    for (const lado of [0.33, -0.36]) {
      camino(c, pts.map((q, i) => [q[0] + ns[i][0] * o.ancho * lado, q[1] + ns[i][1] * o.ancho * lado] as P));
      c.stroke();
    }
  }
  for (let i = 0; i < pts.length; i += 2) marca(cp, pts[i], o.ancho);
  marca(cp, pts[pts.length - 1], o.ancho);
};
// una raya hecha a mano: remuestreada, temblona y repasada (la segunda pasada, más floja y algo corrida)
export const raya = (cp: Capa, pts: P[], o: OpcTrazo & {semilla: number; temblor?: number; repasa?: boolean}) => {
  const base = remuestrea(pts, 7);
  const amp = o.temblor ?? 3;
  linea(cp, tiembla(base, amp, o.semilla), o);
  if (o.repasa !== false) linea(cp, tiembla(base, amp * 1.1, o.semilla + 57), {...o, ancho: o.ancho * 0.8, alfa: (o.alfa ?? 0.9) * 0.7});
};
// un contorno cerrado: dos vueltas que no cierran justas (una se pasa, la otra se queda corta), cada una empezando en otro sitio
export const contorno = (cp: Capa, borde: P[], o: OpcTrazo & {semilla: number; temblor?: number; vueltas?: number}) => {
  const pts = remuestrea(borde, 7, true);
  const n = pts.length;
  if (n < 3) return;
  const r = rng(o.semilla);
  const vueltas = o.vueltas ?? 2;
  for (let v = 0; v < vueltas; v++) {
    const ini = Math.floor(r() * n);
    const cuantos = Math.floor(n * (v === 0 ? 1.05 + r() * 0.07 : 0.8 + r() * 0.25));
    const tramo = Array.from({length: cuantos + 1}, (_, i) => pts[(ini + i) % n]);
    linea(cp, tiembla(tramo, (o.temblor ?? 3) * (v ? 1.15 : 1), o.semilla * 7 + v * 31), {
      ...o, ancho: o.ancho * (v ? 0.8 : 1), alfa: (o.alfa ?? 0.9) * (v ? 0.72 : 1),
    });
  }
};
// un punto gordo de cera (un ojo de palitos, una gota): una espiral apretada
export const punto = (cp: Capa, c: P, r: number, o: OpcTrazo & {semilla: number}) => {
  const rr = rng(o.semilla);
  const pts: P[] = [];
  const vueltas = 2.2;
  const a0 = rr() * 6.28;
  for (let i = 0; i <= 22; i++) {
    const k = i / 22;
    const a = a0 + k * vueltas * Math.PI * 2;
    const rad = Math.max(0.5, r * (1 - k * 0.85)) - o.ancho * 0.35;
    pts.push([c[0] + Math.cos(a) * Math.max(0, rad), c[1] + Math.sin(a) * Math.max(0, rad)]);
  }
  linea(cp, pts, {...o, vetas: false});
};

// ---------------------------------------------------------------- las formas (para rellenar, tapar y repasar el borde)
export type Forma = {borde: P[]; dentro: (q: P, m?: number) => boolean; caja: Caja};
const cajaDe = (pts: P[]): Caja => {
  const k: Caja = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of pts) {
    if (x < k[0]) k[0] = x;
    if (y < k[1]) k[1] = y;
    if (x > k[2]) k[2] = x;
    if (y > k[3]) k[3] = y;
  }
  return k;
};
const areaFirmada = (pts: P[]) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};
// todas las formas giran igual (así la unión de varias, al recortar, es la suma de todas)
const horario = (pts: P[]) => (areaFirmada(pts) < 0 ? [...pts].reverse() : pts);

export const formaElipse = (e: Elipse, crece = 0): Forma => {
  const rx = e.rx + crece, ry = e.ry + crece;
  const n = Math.max(18, Math.round((Math.PI * (rx + ry)) / 8));
  const borde = horario(Array.from({length: n}, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return suma(e.c, rot([Math.cos(a) * rx, Math.sin(a) * ry], e.ang));
  }));
  return {
    borde, caja: cajaDe(borde),
    dentro: (q, m = 0) => {
      const u = rot(resta(q, e.c), -e.ang);
      return (u[0] / Math.max(1, rx + m)) ** 2 + (u[1] / Math.max(1, ry + m)) ** 2 <= 1;
    },
  };
};
export const formaCirculo = (c: P, r: number) => formaElipse({c, rx: r, ry: r, ang: 0});

export const formaCapsula = (a: P, b: P, ra: number, rb: number, crece = 0): Forma => {
  const u = resta(b, a);
  const L = largo(u) || 1;
  const v: P = [u[0] / L, u[1] / L], nn: P = [-v[1], v[0]];
  const RA = ra + crece, RB = rb + crece;
  const borde: P[] = [];
  const en = (c: P, r: number, th: number): P => [c[0] + (Math.cos(th) * v[0] + Math.sin(th) * nn[0]) * r, c[1] + (Math.cos(th) * v[1] + Math.sin(th) * nn[1]) * r];
  const na = Math.max(8, Math.round((Math.PI * RA) / 8)), nb = Math.max(8, Math.round((Math.PI * RB) / 8));
  for (let i = 0; i <= na; i++) borde.push(en(a, RA, Math.PI / 2 + (i / na) * Math.PI));
  for (let i = 0; i <= nb; i++) borde.push(en(b, RB, -Math.PI / 2 + (i / nb) * Math.PI));
  const bh = horario(borde);
  return {
    borde: bh, caja: cajaDe(bh),
    dentro: (q, m = 0) => {
      const w = resta(q, a);
      const t = clamp((w[0] * v[0] + w[1] * v[1]) / L);
      const p: P = [a[0] + v[0] * t * L, a[1] + v[1] * t * L];
      return largo(resta(q, p)) <= mix(RA, RB, t) + m;
    },
  };
};

const dentroPoli = (q: P, pts: P[]) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > q[1]) !== (yj > q[1]) && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
// distancia de un punto al borde de un polígono (para el margen)
const distBorde = (q: P, pts: P[]) => {
  let d = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[j], b = pts[i];
    const u = resta(b, a);
    const L2 = u[0] * u[0] + u[1] * u[1] || 1;
    const t = clamp(((q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1]) / L2);
    d = Math.min(d, Math.hypot(q[0] - a[0] - u[0] * t, q[1] - a[1] - u[1] * t));
  }
  return d;
};
export const formaPoli = (pts: P[]): Forma => {
  const borde = horario(remuestrea(pts, 7, true));
  return {
    borde, caja: cajaDe(borde),
    dentro: (q, m = 0) => {
      const d = dentroPoli(q, pts);
      if (m === 0) return d;
      const db = distBorde(q, pts);
      return m > 0 ? d || db <= m : d && db >= -m;
    },
  };
};
// una cinta que adelgaza (la cola, una pata de palitos gorda): los puntos y su radio en cada uno
export const formaCinta = (pts: P[], r: number[], crece = 0): Forma => {
  const izq: P[] = [], der: P[] = [];
  const ns = normales(pts, false);
  pts.forEach((q, i) => {
    izq.push([q[0] + ns[i][0] * (r[i] + crece), q[1] + ns[i][1] * (r[i] + crece)]);
    der.push([q[0] - ns[i][0] * (r[i] + crece), q[1] - ns[i][1] * (r[i] + crece)]);
  });
  const fin = pts[pts.length - 1], antes = pts[pts.length - 2];
  const u = resta(fin, antes);
  const L = largo(u) || 1;
  const rf = r[r.length - 1] + crece;
  const punta: P[] = [-0.6, -0.3, 0, 0.3, 0.6].map((a) => {
    const d = rot([u[0] / L, u[1] / L], a);
    return [fin[0] + d[0] * rf, fin[1] + d[1] * rf] as P;
  });
  const b0 = pts[0], u0 = resta(pts[1], pts[0]);
  const L0 = largo(u0) || 1;
  const r0 = r[0] + crece;
  const cola: P[] = [-0.6, -0.3, 0, 0.3, 0.6].map((a) => {
    const d = rot([-u0[0] / L0, -u0[1] / L0], a);
    return [b0[0] + d[0] * r0, b0[1] + d[1] * r0] as P;
  });
  const borde = horario([...izq, ...punta.reverse(), ...der.reverse(), ...cola]);
  return {
    borde, caja: cajaDe(borde),
    dentro: (q, m = 0) => {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const w = resta(b, a);
        const L2 = w[0] * w[0] + w[1] * w[1] || 1;
        const t = clamp(((q[0] - a[0]) * w[0] + (q[1] - a[1]) * w[1]) / L2);
        if (Math.hypot(q[0] - a[0] - w[0] * t, q[1] - a[1] - w[1] * t) <= mix(r[i - 1], r[i], t) + crece + m) return true;
      }
      return false;
    },
  };
};
// varias formas como una sola
export const unir = (fs: Forma[]): Forma => {
  const caja: Caja = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of fs) {
    caja[0] = Math.min(caja[0], f.caja[0]);
    caja[1] = Math.min(caja[1], f.caja[1]);
    caja[2] = Math.max(caja[2], f.caja[2]);
    caja[3] = Math.max(caja[3], f.caja[3]);
  }
  return {borde: fs[0]?.borde ?? [], caja, dentro: (q, m = 0) => fs.some((f) => f.dentro(q, m))};
};
// el borde de fuera de varias formas juntas: los trozos del borde de cada una que no caen dentro de otra
export const bordeUnion = (fs: Forma[]): {pts: P[]; cerrado: boolean}[] => {
  const out: {pts: P[]; cerrado: boolean}[] = [];
  fs.forEach((f, i) => {
    const fuera = f.borde.map((q) => !fs.some((g, j) => j !== i && g.dentro(q, -2.5)));
    const n = f.borde.length;
    if (fuera.every(Boolean)) {
      out.push({pts: f.borde, cerrado: true});
      return;
    }
    if (!fuera.some(Boolean)) return;
    let ini = fuera.findIndex((x, k) => x && !fuera[(k - 1 + n) % n]);
    if (ini < 0) ini = 0;
    let run: P[] = [];
    for (let s = 0; s <= n; s++) {
      const k = (ini + s) % n;
      if (fuera[k]) {
        if (!run.length) run.push(f.borde[(k - 1 + n) % n]);
        run.push(f.borde[k]);
      } else if (run.length) {
        run.push(f.borde[k]);
        out.push({pts: run, cerrado: false});
        run = [];
      }
    }
    if (run.length > 1) out.push({pts: run, cerrado: false});
  });
  return out;
};
// las formas como camino (para recortar, tapar o borrar)
export const trazarFormas = (c: CanvasRenderingContext2D, fs: Forma[]) => {
  for (const f of fs) {
    const b = f.borde;
    if (b.length < 3) continue;
    c.moveTo(b[0][0], b[0][1]);
    for (let i = 1; i < b.length; i++) c.lineTo(b[i][0], b[i][1]);
    c.closePath();
  }
};
// borra de la capa lo que queda debajo de unas formas (lo de detrás no se ve por los huecos de lo de delante)
export const borrar = (cp: Capa, fs: Forma[]) => {
  const {c} = cp;
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath();
  trazarFormas(c, fs);
  c.fillStyle = '#000';
  c.fill();
  c.restore();
};
// el contorno de una o varias formas, repasado
export const repasar = (cp: Capa, fs: Forma[], o: OpcTrazo & {semilla: number; temblor?: number}) => {
  bordeUnion(fs).forEach((t, i) => {
    if (t.cerrado) contorno(cp, t.pts, {...o, semilla: o.semilla + i * 13});
    else raya(cp, t.pts, {...o, semilla: o.semilla + i * 13});
  });
};

// ---------------------------------------------------------------- el garabato: el relleno de ida y vuelta
export type OpcGarabato = OpcTrazo & {
  sep: number; // lo que avanza cada pasada
  ang: number; // la dirección de las pasadas (radianes)
  semilla: number;
  sobra?: number; // lo que se sale de la raya, como mucho
  tramo?: number; // cuántas idas y vueltas antes de levantar la cera
};
export const garabato = (cp: Capa, f: Forma, o: OpcGarabato) => {
  const r = rng(o.semilla);
  const [x0, y0, x1, y1] = f.caja;
  const C: P = [(x0 + x1) / 2, (y0 + y1) / 2];
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  const u: P = [Math.cos(o.ang), Math.sin(o.ang)], n: P = [-u[1], u[0]];
  const sobra = o.sobra ?? 8;
  const tramo = o.tramo ?? 24;
  const pasoS = 3.5;
  // cada cadena es un garabato de ida y vuelta; si una pasada se parte en dos (una forma cóncava, un hueco), salen dos cadenas
  type Cadena = {pts: P[]; ult: [number, number]; lado: number};
  let cadenas: Cadena[] = [];
  const suelta = (ca: Cadena) => {
    if (ca.pts.length >= 2) linea(cp, ca.pts, {...o, alfa: (o.alfa ?? 0.85) * (0.82 + 0.3 * r())});
  };
  for (let d = -R + r() * o.sep; d <= R; d += o.sep * (0.8 + 0.4 * r())) {
    const tramos: [number, number][] = [];
    let ini = NaN;
    for (let s = -R; s <= R + pasoS; s += pasoS) {
      const q: P = [C[0] + n[0] * d + u[0] * s, C[1] + n[1] * d + u[1] * s];
      const dn = s <= R && f.dentro(q);
      if (dn && Number.isNaN(ini)) ini = s;
      if (!dn && !Number.isNaN(ini)) {
        tramos.push([ini, s - pasoS]);
        ini = NaN;
      }
    }
    const nuevas: Cadena[] = [];
    const usadas = new Set<Cadena>();
    for (const tr of tramos) {
      let mejor: Cadena | null = null;
      let solape = 0;
      for (const ca of cadenas) {
        if (usadas.has(ca)) continue;
        const ov = Math.min(ca.ult[1], tr[1]) - Math.max(ca.ult[0], tr[0]);
        if (ov > solape) {
          solape = ov;
          mejor = ca;
        }
      }
      const ca: Cadena = mejor ?? {pts: [], ult: tr, lado: r() < 0.5 ? 0 : 1};
      usadas.add(ca);
      const corto = tr[1] - tr[0] < o.ancho * 0.6;
      const sale = sobra * (r() * 1.35 - 0.35);
      const s = corto ? (tr[0] + tr[1]) / 2 : ca.lado % 2 === 0 ? tr[0] - sale : tr[1] + sale;
      const dd = d + (r() - 0.5) * o.sep * 0.3;
      ca.pts.push([C[0] + n[0] * dd + u[0] * s, C[1] + n[1] * dd + u[1] * s]);
      ca.lado++;
      ca.ult = tr;
      if (ca.pts.length >= tramo) {
        const ult = ca.pts[ca.pts.length - 1];
        suelta(ca);
        ca.pts = [ult];
      }
      nuevas.push(ca);
    }
    for (const ca of cadenas) if (!usadas.has(ca)) suelta(ca);
    cadenas = nuevas;
  }
  for (const ca of cadenas) suelta(ca);
};
// colorear una zona grande como lo hace un niño: a manchas de garabato, cada una hacia un lado, que se pisan y dejan huecos
export const aManchas = (cp: Capa, f: Forma, o: OpcGarabato & {tam: [number, number]; giro?: number}) => {
  const r = rng(o.semilla);
  const [x0, y0, x1, y1] = f.caja;
  const [tw, th] = o.tam;
  let fila = 0;
  for (let y = y0 + th * 0.35 * r(); y < y1 + th * 0.3; y += th * (0.62 + 0.16 * r()), fila++) {
    for (let x = x0 + (fila % 2 ? tw * 0.4 : 0) - tw * 0.2 * r(); x < x1 + tw * 0.3; x += tw * (0.66 + 0.18 * r())) {
      const e = {c: [x + (r() - 0.5) * tw * 0.2, y + (r() - 0.5) * th * 0.2] as P, rx: tw * (0.5 + 0.14 * r()), ry: th * (0.5 + 0.14 * r()), ang: (r() - 0.5) * 0.6};
      const m = formaElipse(e);
      const parche: Forma = {borde: m.borde, caja: m.caja, dentro: (q) => m.dentro(q) && f.dentro(q)};
      garabato(cp, parche, {...o, ang: (o.ang ?? 0) + (r() - 0.5) * 2 * (o.giro ?? 0.7), semilla: o.semilla + fila * 101 + Math.floor(x)});
    }
  }
};
// el relleno de siempre: un garabato y, si se aprieta, otro cruzado más flojo encima
export const colorear = (cp: Capa, f: Forma, o: OpcGarabato & {cruzado?: boolean}) => {
  garabato(cp, f, o);
  if (o.cruzado) garabato(cp, f, {...o, ang: o.ang + 0.9 + 0.3 * rng(o.semilla + 3)(), semilla: o.semilla + 101, alfa: (o.alfa ?? 0.85) * 0.6, sep: o.sep * 1.4});
};
