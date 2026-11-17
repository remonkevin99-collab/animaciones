import {mix, rng} from '../../../comun/curvas';
import type {P} from '../../gato/escena';
import {H, W, fbm} from './roca';

// LOS PIGMENTOS: las ayudas para pintar en el lienzo de pintura, que después roca.iluminar() pone sobre la
// piedra. Aquí solo se decide DÓNDE va cada color y con qué borde: soplado (difuminado ancho, que en la piedra se rompe en motas),
// a dedo (borde blando pero corto) o a carbón (el contorno grueso y oscuro). El grano de la roca y sus poros los pone la luz.
// Todo en px del cuadro (1080 × 1920). Los lienzos de trabajo van en la CPU (willReadFrequently): el de pintura se lee cada cuadro
// y así no hay viajes a la tarjeta gráfica.

export type Ctx = CanvasRenderingContext2D;
export type Caja = [number, number, number, number]; // x0 y0 x1 y1

// los cuatro pigmentos de las cuevas (y el café, ocre marrón)
export const OCRE_ROJO = '#ad3c20';
export const OCRE_ROJO_OSCURO = '#7a2414';
export const OCRE_NARANJA = '#bf5e26';
export const OCRE_AMARILLO = '#d39a3a';
export const CARBON = '#17110e';
export const CAOLIN = '#f4efe2';
export const OCRE_MARRON = '#552a10';

export const lienzo = (w = W, h = H): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  c.getContext('2d', {willReadFrequently: true});
  return c;
};
export const ctx = (c: HTMLCanvasElement) => c.getContext('2d', {willReadFrequently: true}) as Ctx;

// la caja de unos puntos, con margen
export const cajaDe = (pts: P[], m = 0): Caja => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0 - m, y0 - m, x1 + m, y1 + m];
};

// ---------------------------------------------------------------- las capas de trabajo
type Capa = {a: HTMLCanvasElement; b: HTMLCanvasElement; xa: Ctx; xb: Ctx; e: number};
const POOL: Record<string, Capa[]> = {};
let HONDO = 0;
const tomar = (e: number): Capa => {
  const clave = String(e);
  POOL[clave] ??= [];
  const pila = POOL[clave];
  if (!pila[HONDO]) {
    const a = lienzo(W * e, H * e), b = lienzo(W * e, H * e);
    pila[HONDO] = {a, b, xa: ctx(a), xb: ctx(b), e};
  }
  return pila[HONDO++];
};
const limpia = (x: Ctx) => {
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.filter = 'none';
};

// LA PRESIÓN DE LA MANO: un velo de ruido que deja el pigmento más cargado en unos sitios y más flojo en otros (el carbón que
// aprieta y que apenas roza, el soplido que no es parejo). Se hace una vez, algo más grande que el cuadro, y cada capa lo usa
// corrido según su semilla.
let VELO: HTMLCanvasElement | null = null;
const velo = () => {
  if (VELO) return VELO;
  const w = 700, h = 1200; // a ~0,55 del cuadro y con margen para correrlo
  const c = lienzo(w, h);
  const x = ctx(c);
  const img = x.createImageData(w, h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const n = fbm(i / 22, j / 22, 3, 21) * 0.75 + fbm(i / 6, j / 6, 2, 22) * 0.25;
      const k = 4 * (j * w + i);
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 0;
      img.data[k + 3] = 255 * Math.min(1, Math.max(0, 0.5 + 1.1 * n));
    }
  }
  x.putImageData(img, 0, 0);
  VELO = c;
  return c;
};
type Presion = {min: number; semilla: number};

// UNA CAPA: lo que pinta «forma» (con el color que ponga ella), a la escala e (0,5 = a media resolución, para lo soplado, que es
// más barato y sale más blando), difuminado «radio» px del cuadro y volcado en dst con su opacidad. Solo dentro de la caja.
export const capa = (
  dst: Ctx, caja: Caja, forma: (c: Ctx) => void,
  o: {e?: number; radio?: number; alfa?: number; modo?: GlobalCompositeOperation; presion?: Presion} = {},
) => {
  const e = o.e ?? 1;
  const radio = o.radio ?? 0;
  const m = radio * 2.5 + 2;
  const x0 = Math.max(0, Math.floor((caja[0] - m) * e)), y0 = Math.max(0, Math.floor((caja[1] - m) * e));
  const x1 = Math.min(Math.round(W * e), Math.ceil((caja[2] + m) * e)), y1 = Math.min(Math.round(H * e), Math.ceil((caja[3] + m) * e));
  if (x1 <= x0 || y1 <= y0) return;
  const bw = x1 - x0, bh = y1 - y0;
  const s = tomar(e);
  limpia(s.xa);
  s.xa.clearRect(x0, y0, bw, bh);
  s.xa.setTransform(e, 0, 0, e, 0, 0);
  s.xa.save();
  forma(s.xa);
  s.xa.restore();
  if (o.presion) {
    // el velo: «min» es lo que queda donde menos aprieta
    const {min, semilla} = o.presion;
    const ox = -((semilla * 37) % 60) - 10, oy = -((semilla * 53) % 80) - 10;
    s.xa.save();
    s.xa.setTransform(e, 0, 0, e, 0, 0);
    s.xa.globalCompositeOperation = 'destination-out';
    s.xa.globalAlpha = 1 - min;
    s.xa.drawImage(velo(), ox, oy, W * 1.18, H * 1.15);
    s.xa.restore();
  }
  let src = s.a;
  if (radio > 0.05) {
    limpia(s.xb);
    s.xb.clearRect(x0, y0, bw, bh);
    s.xb.filter = `blur(${(radio * e).toFixed(2)}px)`;
    s.xb.drawImage(s.a, x0, y0, bw, bh, x0, y0, bw, bh);
    s.xb.filter = 'none';
    src = s.b;
  }
  dst.save();
  dst.setTransform(1, 0, 0, 1, 0, 0);
  dst.globalAlpha = o.alfa ?? 1;
  dst.globalCompositeOperation = o.modo ?? 'source-over';
  dst.imageSmoothingEnabled = true;
  dst.drawImage(src, x0, y0, bw, bh, x0 / e, y0 / e, bw / e, bh / e);
  dst.restore();
  HONDO--;
};

// soplado: difuminado ancho, a media resolución
export const soplar = (dst: Ctx, caja: Caja, forma: (c: Ctx) => void, radio = 9, alfa = 1, presion?: Presion) =>
  capa(dst, caja, forma, {e: 0.5, radio, alfa, presion});
// a dedo o a carbón: borde corto
export const fino = (dst: Ctx, caja: Caja, forma: (c: Ctx) => void, radio = 1.4, alfa = 1, presion?: Presion) =>
  capa(dst, caja, forma, {e: 1, radio, alfa, presion});

// ---------------------------------------------------------------- trazos
// un trazo de dedo o de carbón con su grueso variable (w(s), s de 0 a 1 a lo largo): cápsulas seguidas
export const trazoVivo = (c: Ctx, pts: P[], w: (s: number) => number) => {
  if (pts.length < 2) return;
  const largos = [0];
  for (let i = 1; i < pts.length; i++) largos.push(largos[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = largos[largos.length - 1] || 1;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let i = 1; i < pts.length; i++) {
    c.lineWidth = Math.max(0.5, w((largos[i - 1] + largos[i]) / 2 / total));
    c.beginPath();
    c.moveTo(pts[i - 1][0], pts[i - 1][1]);
    c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
};
// reparte una curva en puntos cada «paso» px (para trazarla con grueso variable)
export const remuestrea = (pts: P[], paso = 6): P[] => {
  if (pts.length < 2) return pts;
  const out: P[] = [pts[0]];
  let resto = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const l = Math.hypot(bx - ax, by - ay);
    let d = paso - resto;
    while (d <= l) {
      out.push([mix(ax, bx, d / l), mix(ay, by, d / l)]);
      d += paso;
    }
    resto = l - (d - paso);
  }
  out.push(pts[pts.length - 1]);
  return out;
};
// una curva suave por puntos (Catmull-Rom), en puntos
export const suave = (pts: P[], cerrar = false, n = 8): P[] => {
  const out: P[] = [];
  const L = pts.length;
  const at = (i: number) => (cerrar ? pts[((i % L) + L) % L] : pts[Math.min(L - 1, Math.max(0, i))]);
  const fin = cerrar ? L : L - 1;
  for (let i = 0; i < fin; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
      ]);
    }
  }
  out.push(cerrar ? pts[0] : pts[L - 1]);
  return out;
};
export const camino = (pts: P[], cerrar = true) => {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  if (cerrar) p.closePath();
  return p;
};

// ---------------------------------------------------------------- el soplado de un color alrededor (manchas irregulares)
// una nube de pigmento soplado: varias manchas redondas que se solapan, más fuerte en medio
export const nube = (c: Ctx, cx: number, cy: number, r: number, color: string, semilla: number, n = 7, fuerza = 0.85) => {
  const rr = rng(semilla);
  for (let k = 0; k < n; k++) {
    const a = rr() * Math.PI * 2, d = rr() * r * 0.35;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    const rk = r * (0.55 + rr() * 0.45);
    const g = c.createRadialGradient(x, y, 0, x, y, rk);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = fuerza * (0.55 + rr() * 0.45);
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, rk, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
};

// ---------------------------------------------------------------- una mano (para las manos en negativo)
// la silueta de una mano abierta, con la muñeca abajo: palma, cinco dedos separados y el antebrazo. En px de la mano (largo ~200).
export const mano = (cx: number, cy: number, ang: number, esc: number, semilla: number): Path2D => {
  const r = rng(semilla);
  const p = new Path2D();
  const m = new DOMMatrix().translate(cx, cy).rotate((ang * 180) / Math.PI).scale(esc);
  const add = (q: Path2D) => p.addPath(q, m);
  // la palma
  const palma = new Path2D();
  palma.ellipse(0, 12, 40, 46, 0, 0, Math.PI * 2);
  add(palma);
  // la muñeca
  const brazo = new Path2D();
  brazo.moveTo(-31, 36);
  brazo.quadraticCurveTo(-24, 70, -22, 120);
  brazo.lineTo(24, 120);
  brazo.quadraticCurveTo(26, 70, 33, 36);
  brazo.closePath();
  add(brazo);
  // los dedos: [ángulo, largo, grueso, dónde nace]
  const dedos: [number, number, number, P][] = [
    [-1.1, 50, 12, [-36, 20]], [-0.38, 66, 11, [-24, -26]], [-0.1, 76, 11, [-6, -34]], [0.2, 70, 10.5, [13, -31]], [0.5, 54, 9.5, [29, -20]],
  ];
  for (const [a0, l0, g, [bx, by]] of dedos) {
    const a = a0 + (r() - 0.5) * 0.12, l = l0 * (0.95 + r() * 0.1);
    const d = new Path2D();
    const ex = bx + Math.sin(a) * l, ey = by - Math.cos(a) * l;
    const nx = Math.cos(a) * g, ny = Math.sin(a) * g;
    d.moveTo(bx - nx, by - ny);
    d.lineTo(ex - nx * 0.85, ey - ny * 0.85);
    d.arc(ex, ey, g * 0.85, a + Math.PI, a, false);
    d.lineTo(bx + nx, by + ny);
    d.closePath();
    add(d);
  }
  return p;
};
