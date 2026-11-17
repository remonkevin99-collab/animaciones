import {clamp, mix, rng} from '../../../comun/curvas';

// EL PINCEL DE LA HORA DORADA. Una pincelada es una forma de pincel (ahusada al empezar, redondeada al
// levantar el pincel, con los bordes que ondulan) rellena de un color, y encima sus VETAS: las rayas claras y oscuras que dejan las
// cerdas, ya recortadas a esa forma. Hay diez formas distintas para que no se repitan. Todo en coordenadas del cuadro (1080 × 1920).

export type RGB = [number, number, number];
export type P = [number, number];
export const ANCHO = 1080;
export const ALTO = 1920;

export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const css = (c: RGB, a = 1) =>
  a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(3)})`;
export const mezcla = (a: RGB, b: RGB, k: number): RGB => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
// más claro (k > 0) o más oscuro (k < 0)
export const aclara = (c: RGB, k: number): RGB => (k >= 0 ? mezcla(c, [255, 255, 255], k) : mezcla(c, [0, 0, 0], -k));
export const escalon = (a: number, b: number, x: number) => {
  const k = clamp((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
// un color de una rampa de paradas [k, color]
export const rampa = (paradas: [number, RGB][], k: number): RGB => {
  if (k <= paradas[0][0]) return paradas[0][1];
  for (let i = 1; i < paradas.length; i++) {
    if (k <= paradas[i][0]) return mezcla(paradas[i - 1][1], paradas[i][1], (k - paradas[i - 1][0]) / (paradas[i][0] - paradas[i - 1][0]));
  }
  return paradas[paradas.length - 1][1];
};
// un número de 0 a 1 que sale siempre igual para la misma pareja
export const hash = (a: number, b = 0) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
export const ctx = (c: HTMLCanvasElement, leer = false) => c.getContext('2d', leer ? {willReadFrequently: true} : undefined)!;
// deja el contexto como nuevo (sin transformación, opaco, pintando encima)
export const limpio = (c: CanvasRenderingContext2D) => {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.filter = 'none';
};

// ---------------------------------------------------------------- las formas del pincel
const NV = 10;
const SL = 96, SW = 24;
type Sello = {forma: Path2D; vetas: HTMLCanvasElement};
let SELLOS: Sello[] | null = null;

const hacerSellos = (): Sello[] => {
  const out: Sello[] = [];
  for (let v = 0; v < NV; v++) {
    const r = rng(500 + v * 31);
    type Onda = {f: number; ph: number; a: number};
    const ondas = (n: number, f0: number, f1: number): Onda[] =>
      Array.from({length: n}, () => ({f: f0 + r() * (f1 - f0), ph: r() * Math.PI * 2, a: 0.5 + r() * 0.5}));
    const onda = (os: Onda[], x: number) => {
      let s = 0, n = 0;
      for (const o of os) {
        s += o.a * Math.sin(o.f * x * 2 * Math.PI + o.ph);
        n += o.a;
      }
      return s / n;
    };
    const bordeA = ondas(3, 1.5, 5), bordeB = ondas(3, 1.5, 5), cerdas = ondas(5, 2.5, 7.5), largo = ondas(2, 0.6, 2);
    const ahusa = 0.4 + r() * 0.35; // lo fina que empieza
    const cola = 0.08 + r() * 0.08; // lo que tarda en redondearse el final
    const ancho = (s: number, arriba: boolean) => {
      let w = mix(ahusa, 1, escalon(0, 0.3, s));
      if (s < 0.05) w *= Math.sqrt(Math.max(0, 1 - ((0.05 - s) / 0.05) ** 2));
      if (s > 1 - cola) w *= Math.sqrt(Math.max(0, 1 - ((s - (1 - cola)) / cola) ** 2));
      w *= 1 + 0.12 * onda(arriba ? bordeA : bordeB, s);
      return 0.5 * w;
    };
    const forma = new Path2D();
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      if (i === 0) forma.moveTo(s - 0.5, -ancho(s, true));
      else forma.lineTo(s - 0.5, -ancho(s, true));
    }
    for (let i = N; i >= 0; i--) forma.lineTo(i / N - 0.5, ancho(i / N, false));
    forma.closePath();
    // las vetas: rayas de las cerdas a lo largo, más marcadas donde el pincel se queda sin pintura (el principio y el final)
    const vetas = lienzo(SL, SW);
    const cx = ctx(vetas);
    const img = cx.createImageData(SL, SW);
    for (let j = 0; j < SW; j++) {
      for (let i = 0; i < SL; i++) {
        const s = (i + 0.5) / SL;
        const y = (j + 0.5) / SW - 0.5;
        const w = ancho(s, y < 0);
        const dentro = clamp((w - Math.abs(y)) * SW + 0.5);
        if (dentro <= 0) continue;
        const n = clamp(y / Math.max(1e-3, w), -1, 1);
        const seco = 0.6 + 0.6 * (1 - escalon(0, 0.25, s)) + 0.5 * escalon(0.75, 1, s);
        const cer = onda(cerdas, n * 0.5 + 0.04 * onda(largo, s)) * seco;
        const k = 4 * (j * SL + i);
        if (cer > 0.18) {
          img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
          img.data[k + 3] = clamp((cer - 0.18) * 0.9) * 255 * dentro;
        } else if (cer < -0.18) {
          img.data[k + 3] = clamp((-cer - 0.18) * 1.0) * 255 * dentro;
        }
        // el labio de pintura en los bordes, un poco más oscuro
        const lab = escalon(0.72, 1, Math.abs(n)) * 0.28;
        if (lab > 0 && img.data[k] === 0) img.data[k + 3] = Math.max(img.data[k + 3], lab * 255 * dentro);
      }
    }
    cx.putImageData(img, 0, 0);
    out.push({forma, vetas});
  }
  return out;
};

// UNA PINCELADA: centro, ángulo, largo y ancho (px del cuadro), color, opacidad, cuál de las formas y lo que pesan sus vetas
export const pincelada = (
  c: CanvasRenderingContext2D, x: number, y: number, ang: number, l: number, w: number, col: RGB, a = 1, v = 0, vetas = 0.6,
) => {
  const S = (SELLOS ??= hacerSellos());
  const sel = S[(((Math.floor(v) % NV) + NV) % NV)];
  const co = Math.cos(ang), si = Math.sin(ang);
  c.setTransform(co * l, si * l, -si * w, co * w, x, y);
  c.globalAlpha = clamp(a);
  c.fillStyle = css(col);
  c.fill(sel.forma);
  if (vetas > 0) {
    c.globalAlpha = clamp(a * vetas);
    c.drawImage(sel.vetas, -0.5, -0.5, 1, 1);
  }
};
// una pincelada de un punto a otro
export const pinceladaAB = (c: CanvasRenderingContext2D, p: P, q: P, w: number, col: RGB, a = 1, v = 0, vetas = 0.6) => {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  pincelada(c, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, Math.atan2(dy, dx), Math.hypot(dx, dy) + w * 0.6, w, col, a, v, vetas);
};

// un camino de polígono (para rellenos y máscaras)
export const camino = (pts: P[], cerrar = true) => {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i === 0 ? p.moveTo(x, y) : p.lineTo(x, y)));
  if (cerrar) p.closePath();
  return p;
};

// la textura de la tela: un tejido de hilos con su grano, en una baldosa que se repite (gris medio = no cambia nada en «overlay»)
let TELA: HTMLCanvasElement | null = null;
export const tela = () => {
  if (TELA) return TELA;
  const N = 384;
  const cv = lienzo(N, N);
  const cx = ctx(cv);
  const img = cx.createImageData(N, N);
  const r = rng(7);
  const ruidoFino = new Float32Array(N * N).map(() => r() - 0.5);
  const P_HILO = 6; // un hilo cada 6 px
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const fx = (x % P_HILO) / P_HILO, fy = (y % P_HILO) / P_HILO;
      const cel = (Math.floor(x / P_HILO) + Math.floor(y / P_HILO)) & 1; // por encima o por debajo
      const hiloH = Math.sin(Math.PI * fy), hiloV = Math.sin(Math.PI * fx);
      let v = cel ? 0.55 * hiloH + 0.2 * hiloV : 0.2 * hiloH + 0.55 * hiloV;
      v = v - 0.38 + 0.22 * ruidoFino[y * N + x] + 0.1 * Math.sin(x * 0.05 + Math.sin(y * 0.031) * 3) * Math.sin(y * 0.043);
      const g = clamp(0.5 + v * 0.55) * 255;
      const k = 4 * (y * N + x);
      img.data[k] = img.data[k + 1] = img.data[k + 2] = g;
      img.data[k + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0);
  TELA = cv;
  return cv;
};
