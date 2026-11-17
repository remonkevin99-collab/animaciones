import {mix, rng} from '../../../comun/curvas';
import type {P} from '../../gato/escena';

// EL ESPRAY DEL GRAFITI: las ayudas para pintar con aerosol en un canvas. Cada forma se pinta como en la
// calle: primero la niebla (overspray, puntitos que se abren alrededor), después el contorno negro gordo, después el relleno con su
// degradado de espray (la sombra que se funde por un lado, la luz por el otro) y encima la raya blanca del brillo (highlight). Los
// goterones, trazos que bajan con su gota al final. Todo en px del cuadro (1080 × 1920); el lienzo va a su densidad (dpr).

export type Ctx = CanvasRenderingContext2D;
export type Caja = [number, number, number, number]; // x0 y0 x1 y1, en px del cuadro

export const W = 1080;
export const H = 1920;

// lo que vale para todo el cuadro que se está pintando: la densidad del lienzo y el paso (12 por segundo)
export const PINTA = {dpr: 1, paso: 0};

export const lienzo = (w = W, h = H): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * PINTA.dpr));
  c.height = Math.max(1, Math.round(h * PINTA.dpr));
  return c;
};
export const base = (c: Ctx) => c.setTransform(PINTA.dpr, 0, 0, PINTA.dpr, 0, 0);

// el desenfoque del canvas va en píxeles del lienzo (no lo escala la transformación): se pasa a la densidad
export const blur = (r: number) => (r > 0.05 ? `blur(${(r * PINTA.dpr).toFixed(2)}px)` : 'none');

// ---------------------------------------------------------------- las capas de trabajo (una pila, para poder anidarlas)
type Capa = {c: HTMLCanvasElement; x: Ctx};
let PILA: Capa[] = [];
let PILA_DPR = 0;
let HONDO = 0;
const tomar = (): Capa => {
  if (PILA_DPR !== PINTA.dpr) { PILA = []; PILA_DPR = PINTA.dpr; }
  if (!PILA[HONDO]) {
    const c = lienzo();
    PILA[HONDO] = {c, x: c.getContext('2d') as Ctx};
  }
  return PILA[HONDO++];
};

const aLienzo = (k: Caja | null): [number, number, number, number] => {
  const d = PINTA.dpr;
  if (!k) return [0, 0, Math.round(W * d), Math.round(H * d)];
  const x0 = Math.max(0, Math.floor(k[0] * d)), y0 = Math.max(0, Math.floor(k[1] * d));
  const x1 = Math.min(Math.round(W * d), Math.ceil(k[2] * d)), y1 = Math.min(Math.round(H * d), Math.ceil(k[3] * d));
  return [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
};

// pinta algo en una capa aparte (solo en su caja) y la vuelca encima, con su opacidad, su modo y su filtro.
// Regla: quien llama tiene `dst` en la transformación base (la densidad, sin más).
export const enCapa = (
  dst: Ctx, caja: Caja | null, pinta: (c: Ctx) => void,
  o: {alfa?: number; modo?: GlobalCompositeOperation; filtro?: string} = {},
) => {
  const s = tomar();
  const [bx, by, bw, bh] = aLienzo(caja);
  const x = s.x;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;
  x.filter = 'none';
  x.clearRect(bx, by, bw, bh);
  base(x);
  x.save();
  pinta(x);
  x.restore();
  dst.save();
  dst.setTransform(1, 0, 0, 1, 0, 0);
  dst.globalAlpha = o.alfa ?? 1;
  dst.globalCompositeOperation = o.modo ?? 'source-over';
  dst.filter = o.filtro ?? 'none';
  dst.drawImage(s.c, bx, by, bw, bh, bx, by, bw, bh);
  dst.restore();
  HONDO--;
};

// ---------------------------------------------------------------- las motas del espray
// Una trama de puntitos (de 1,5 a 3,5 px, para que se vean también en la tarjeta de 505 px). Con «destination-in» convierte una
// mancha difuminada en niebla de espray: muchos puntos donde la mancha es fuerte, pocos donde se apaga.
let MOTAS: {dpr: number; c: HTMLCanvasElement}[] = [];
const motas = (fina: boolean) => {
  const i = fina ? 1 : 0;
  if (MOTAS[i] && MOTAS[i].dpr === PINTA.dpr) return MOTAS[i].c;
  const L = 384;
  const c = lienzo(L, L);
  const x = c.getContext('2d') as Ctx;
  base(x);
  const r = rng(fina ? 913 : 517);
  const n = fina ? 21000 : 9000;
  for (let k = 0; k < n; k++) {
    const px = r() * L, py = r() * L;
    const s = fina ? 1 + r() * 1.6 : 1.4 + r() * 2.4;
    x.globalAlpha = 0.55 + r() * 0.45;
    x.beginPath();
    x.arc(px, py, s / 2, 0, Math.PI * 2);
    x.fill();
  }
  MOTAS[i] = {dpr: PINTA.dpr, c};
  return c;
};
// deja solo los puntitos de lo que haya en la capa (caja); cambian de sitio con el paso, como si se pintara otra vez
export const motear = (c: Ctx, caja: Caja | null, fina = false, semilla = 0) => {
  const pat = c.createPattern(motas(fina), 'repeat');
  if (!pat) return;
  const r = rng(PINTA.paso * 131 + semilla * 7);
  pat.setTransform(new DOMMatrix().translate(r() * 384, r() * 384).scale(1 / PINTA.dpr));
  c.save();
  base(c);
  c.globalCompositeOperation = 'destination-in';
  c.filter = 'none';
  c.fillStyle = pat;
  const k = caja ?? [0, 0, W, H];
  c.fillRect(k[0], k[1], k[2] - k[0], k[3] - k[1]);
  c.restore();
};

// la niebla del espray alrededor de algo: lo que pinta `forma`, difuminado y hecho puntitos
export const niebla = (dst: Ctx, caja: Caja, forma: (c: Ctx) => void, color: string, radio: number, alfa: number, semilla = 0) =>
  enCapa(dst, caja, (c) => {
    c.filter = blur(radio);
    c.fillStyle = color;
    c.strokeStyle = color;
    forma(c);
    c.filter = 'none';
    motear(c, caja, false, semilla);
  }, {alfa});

// ---------------------------------------------------------------- formas
export const cajaDe = (pts: P[], margen: number): Caja => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0 - margen, y0 - margen, x1 + margen, y1 + margen];
};
export const unirCajas = (...ks: Caja[]): Caja =>
  ks.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);

// una forma: rellena su silueta con el fillStyle del lienzo y traza su borde con el strokeStyle
export type Forma = {rellena: (c: Ctx) => void; traza: (c: Ctx) => void};
export const deTrazos = (ps: Path2D[], regla: CanvasFillRule = 'nonzero'): Forma => ({
  rellena: (c) => ps.forEach((p) => c.fill(p, regla)),
  traza: (c) => ps.forEach((p) => c.stroke(p)),
});
export const juntar = (...fs: Forma[]): Forma => ({
  rellena: (c) => fs.forEach((f) => f.rellena(c)),
  traza: (c) => fs.forEach((f) => f.traza(c)),
});
const corrida = (c: Ctx, f: Forma, d: P) => {
  c.save();
  c.translate(d[0], d[1]);
  f.rellena(c);
  c.restore();
};

// una banda dentro de la forma: lo que queda de la forma corrida `a` al quitarle la forma corrida `b`
// Con grano, además, una niebla de espray más ancha hecha puntitos (el degradado de aerosol de verdad, no el de ordenador).
export const banda = (dst: Ctx, caja: Caja, f: Forma, a: P, b: P, color: string, alfa: number, difumina: number, grano = false) => {
  const dibuja = (c: Ctx) => {
    c.fillStyle = color;
    corrida(c, f, a);
    c.globalCompositeOperation = 'destination-out';
    corrida(c, f, b);
  };
  if (!grano) {
    enCapa(dst, caja, dibuja, {alfa, modo: 'source-atop', filtro: blur(difumina)});
    return;
  }
  enCapa(dst, caja, (c) => {
    enCapa(c, caja, dibuja, {filtro: blur(difumina * 2.6)});
    motear(c, caja, false, PINTA.paso);
    enCapa(c, caja, dibuja, {filtro: blur(difumina)});
  }, {alfa, modo: 'source-atop'});
};

// ---------------------------------------------------------------- una pieza de grafiti, entera
export type Pieza = {
  caja: Caja;
  forma: Forma;
  relleno: (c: Ctx) => string | CanvasGradient;
  linea?: number; // lo que sale el contorno negro por fuera de la forma
  corte?: {color: string; ancho: number}; // la línea de corte de fuera (la clara que separa la pieza del fondo)
  niebla?: {color?: string; radio: number; alfa: number};
  nieblaRelleno?: {color: string; radio: number; alfa: number}; // lo que se pasó al rellenar, por fuera del contorno
  sombra?: {color: string; d: P; alfa?: number; difumina?: number}; // la sombra que se funde por un lado (d: hacia la luz)
  brillo?: {color: string; d: P; alfa?: number; difumina?: number}; // la luz ancha y suave del otro lado
  luz?: {d: P; ancho: number; color?: string; alfa?: number}; // la raya del brillo, metida d hacia dentro
  dentro?: (c: Ctx) => void; // lo que va pintado encima del relleno (rayas, manchas), recortado a la pieza
  semilla?: number;
};

const NEGRO = '#15121A';
export const pintaPieza = (dst: Ctx, pz: Pieza) => {
  const L = pz.linea ?? 10;
  const k = pz.caja;
  const s = pz.semilla ?? 0;
  const ext = L + (pz.corte ? pz.corte.ancho : 0);
  // 1 · la niebla de fuera (la del último color que se echó: el corte o el negro)
  if (pz.niebla) {
    niebla(dst, k, (c) => {
      c.lineWidth = 2 * ext + pz.niebla!.radio * 0.8;
      c.lineJoin = 'round';
      pz.forma.traza(c);
      pz.forma.rellena(c);
    }, pz.niebla.color ?? NEGRO, pz.niebla.radio, pz.niebla.alfa, s);
  }
  if (pz.nieblaRelleno) {
    const nr = pz.nieblaRelleno;
    niebla(dst, k, (c) => {
      c.lineWidth = 2 * ext + nr.radio * 1.4;
      c.lineJoin = 'round';
      pz.forma.traza(c);
      pz.forma.rellena(c);
    }, nr.color, nr.radio, nr.alfa, s + 5);
  }
  // 2 · el corte claro y el contorno negro
  dst.save();
  dst.lineJoin = 'round';
  dst.lineCap = 'round';
  if (pz.corte) {
    dst.filter = blur(1);
    dst.strokeStyle = pz.corte.color;
    dst.fillStyle = pz.corte.color;
    dst.lineWidth = 2 * ext;
    pz.forma.traza(dst);
    pz.forma.rellena(dst);
  }
  dst.filter = blur(0.7);
  dst.strokeStyle = NEGRO;
  dst.lineWidth = 2 * L;
  pz.forma.traza(dst);
  dst.restore();
  // 3 · el relleno con su degradado, lo de dentro, la sombra, la luz y la raya del brillo
  enCapa(dst, k, (c) => {
    c.filter = blur(0.9);
    c.fillStyle = pz.relleno(c);
    pz.forma.rellena(c);
    c.filter = 'none';
    if (pz.dentro) {
      c.save();
      c.globalCompositeOperation = 'source-atop';
      pz.dentro(c);
      c.restore();
    }
    if (pz.sombra) {
      const sm = pz.sombra;
      banda(c, k, pz.forma, [0, 0], sm.d, sm.color, sm.alfa ?? 0.85, sm.difumina ?? 7, true);
    }
    if (pz.brillo) {
      const b = pz.brillo;
      banda(c, k, pz.forma, [0, 0], b.d, b.color, b.alfa ?? 0.5, b.difumina ?? 9);
    }
    if (pz.luz) {
      const l = pz.luz;
      const n = Math.hypot(l.d[0], l.d[1]) || 1;
      const e: P = [l.d[0] + (l.d[0] / n) * l.ancho, l.d[1] + (l.d[1] / n) * l.ancho];
      banda(c, k, pz.forma, l.d, e, l.color ?? '#FFFFFF', l.alfa ?? 0.95, 0.8);
    }
  });
};

// ---------------------------------------------------------------- goterones
// un goterón: sale de (x, y), baja `largo` px con un poco de vaivén y acaba en su gota redonda (con su brillito)
export const goteron = (c: Ctx, x: number, y: number, largo: number, ancho: number, color: string, semilla: number, brillo = true) => {
  if (largo < 2) return;
  const r = rng(semilla);
  const n = Math.max(3, Math.round(largo / 14));
  const izq: P[] = [], der: P[] = [];
  const fase = r() * 6.28;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const cx = x + Math.sin(k * 3.1 + fase) * ancho * 0.18 + (r() - 0.5) * ancho * 0.08;
    const w = mix(ancho * 0.62, ancho * 0.36, Math.pow(k, 0.6)) * (0.9 + r() * 0.2);
    izq.push([cx - w, y + k * largo]);
    der.push([cx + w, y + k * largo]);
  }
  const fin = izq[n], finD = der[n];
  const cg: P = [(fin[0] + finD[0]) / 2, y + largo];
  const rg = ancho * (0.62 + r() * 0.18);
  c.beginPath();
  c.moveTo(izq[0][0] - ancho * 0.25, y - ancho * 0.6);
  for (const q of izq) c.lineTo(q[0], q[1]);
  c.arc(cg[0], cg[1] + rg * 0.55, rg, Math.PI * 1.15, Math.PI * -0.15, true);
  for (let i = n; i >= 0; i--) c.lineTo(der[i][0], der[i][1]);
  c.lineTo(der[0][0] + ancho * 0.25, y - ancho * 0.6);
  c.closePath();
  c.fillStyle = color;
  c.fill();
  if (brillo && ancho > 5) {
    c.save();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.arc(cg[0] - rg * 0.32, cg[1] + rg * 0.25, rg * 0.28, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
};

// ---------------------------------------------------------------- brillos de grafiti: la estrella de cuatro puntas y el punto
export const destello = (c: Ctx, x: number, y: number, R: number, color = '#FFFFFF') => {
  const q = R * 0.2;
  c.beginPath();
  c.moveTo(x, y - R);
  c.quadraticCurveTo(x + q, y - q, x + R, y);
  c.quadraticCurveTo(x + q, y + q, x, y + R);
  c.quadraticCurveTo(x - q, y + q, x - R, y);
  c.quadraticCurveTo(x - q, y - q, x, y - R);
  c.closePath();
  c.fillStyle = color;
  c.fill();
};
export const punto = (c: Ctx, x: number, y: number, r: number, color = '#FFFFFF') => {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
};

// una mancha con lóbulos (un charco, una nube, un bote de pintura)
export const manchaPts = (c: P, rx: number, ry: number, semilla: number, lobulos = 0.16, n = 36, ang = 0): P[] => {
  const r = rng(semilla);
  const f = [r() * 6.28, r() * 6.28, r() * 6.28];
  const ca = Math.cos(ang), sa = Math.sin(ang);
  return Array.from({length: n}, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + lobulos * (0.5 * Math.sin(3 * a + f[0]) + 0.3 * Math.sin(5 * a + f[1]) + 0.2 * Math.sin(9 * a + f[2]));
    const u = Math.cos(a) * rx * k, v = Math.sin(a) * ry * k;
    return [c[0] + u * ca - v * sa, c[1] + u * sa + v * ca] as P;
  });
};
export const camino = (c: Ctx, pts: P[], cerrar = true) => {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  if (cerrar) c.closePath();
};
// una curva suave cerrada por los puntos (Catmull-Rom)
export const suave = (pts: P[], cerrar = true): Path2D => {
  const p = new Path2D();
  const n = pts.length;
  const at = (i: number) => (cerrar ? pts[(i + n) % n] : pts[Math.min(n - 1, Math.max(0, i))]);
  p.moveTo(pts[0][0], pts[0][1]);
  const fin = cerrar ? n : n - 1;
  for (let i = 0; i < fin; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (cerrar) p.closePath();
  return p;
};
