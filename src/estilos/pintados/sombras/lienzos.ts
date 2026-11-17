import {clamp} from '../../../comun/curvas';
import {ESCALA_GATO, MESA_Y, T_SUELO, rot, suma, type Elipse, type P} from '../../gato/escena';

// LAS AYUDAS DEL TEATRO DE SOMBRAS: los lienzos de trabajo, la pantalla de papel, el paso de las marionetas
// y cuatro atajos para pintar en un canvas. Todo en px del cuadro (1080 × 1920).

export const W = 1080;
export const H = 1920;
export type Ctx = CanvasRenderingContext2D;

// el hueco del teatrillo, donde está la pantalla de papel (todo lo de la escena pasa aquí dentro)
export const PANT = {x0: 64, y0: 236, x1: 1016, y1: 1668};

// las marionetas van a saltos, a 15 por segundo, con la rejilla puesta en el golpe (así se rompe en su cuadro); la luz, fluida
export const FPS_TITERE = 15;
export const pasoDe = (t: number) => Math.floor((t - T_SUELO) * FPS_TITERE + 1e-6);
export const tDePaso = (n: number) => T_SUELO + n / FPS_TITERE;

export const lienzo = (w = W, h = H): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
export const ctx = (c: HTMLCanvasElement) => c.getContext('2d') as Ctx;
// un lienzo de la CPU (para escribir píxeles a mano una sola vez)
export const ctxCpu = (c: HTMLCanvasElement) => c.getContext('2d', {willReadFrequently: true}) as Ctx;

export const limpia = (x: Ctx) => {
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.filter = 'none';
  x.clearRect(0, 0, x.canvas.width, x.canvas.height);
};

// el gato se calcula a su tamaño de dibujo y se pinta 1,14 veces más grande desde donde se sienta
export const PIVOTE: P = [300, MESA_Y];
export const enGato = (x: Ctx) => {
  x.translate(PIVOTE[0], PIVOTE[1]);
  x.scale(ESCALA_GATO, ESCALA_GATO);
  x.translate(-PIVOTE[0], -PIVOTE[1]);
};

export const lerp = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
// un punto de una elipse en sus propias unidades (u, v de -1 a 1)
export const enE = (e: Elipse, u: number, v: number): P => suma(e.c, rot([u * e.rx, v * e.ry], e.ang));
export const centro = (pts: P[]): P => {
  let x = 0, y = 0;
  for (const q of pts) { x += q[0]; y += q[1]; }
  return [x / pts.length, y / pts.length];
};

export const poligono = (x: Ctx, pts: P[]) => {
  x.beginPath();
  pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  x.closePath();
};
export const linea = (x: Ctx, pts: P[]) => {
  x.beginPath();
  pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
};
export const rellena = (x: Ctx, ds: string[], color = '#000') => {
  x.fillStyle = color;
  for (const d of ds) x.fill(new Path2D(d));
};
// lo calado: lo que se pinta dentro, se quita (por ahí pasa la luz)
export const calar = (x: Ctx, fn: () => void) => {
  x.save();
  x.globalCompositeOperation = 'destination-out';
  x.fillStyle = '#000';
  x.strokeStyle = '#000';
  fn();
  x.restore();
};

// una hoja (dos arcos) entre dos puntos, de ancho w en el centro
export const lente = (x: Ctx, a: P, b: P, w: number, curva = 0) => {
  const m = lerp(a, b, 0.5);
  const d: P = [b[0] - a[0], b[1] - a[1]];
  const l = Math.max(1e-3, Math.hypot(d[0], d[1]));
  const n: P = [-d[1] / l, d[0] / l];
  const c1: P = [m[0] + n[0] * (w + curva), m[1] + n[1] * (w + curva)];
  const c2: P = [m[0] - n[0] * (w - curva), m[1] - n[1] * (w - curva)];
  x.beginPath();
  x.moveTo(a[0], a[1]);
  x.quadraticCurveTo(c1[0], c1[1], b[0], b[1]);
  x.quadraticCurveTo(c2[0], c2[1], a[0], a[1]);
  x.closePath();
};

// un color [r, g, b] por un brillo k (se satura en blanco)
export const rgb = (c: number[], k = 1, a = 1) =>
  `rgba(${Math.round(clamp(c[0] * k, 0, 255))},${Math.round(clamp(c[1] * k, 0, 255))},${Math.round(clamp(c[2] * k, 0, 255))},${a})`;
