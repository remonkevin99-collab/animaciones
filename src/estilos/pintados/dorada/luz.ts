import {clamp, rng} from '../../../comun/curvas';
import {R_SOL, SOL} from './cielo';
import type {Pelo} from './gato';
import {ctx, hash, lienzo, limpio, tela} from './pincel';

// LA LUZ DE LA HORA DORADA, lo que la hace de cine:
// - EL BORDE DE LUZ: de la silueta de todo lo que está a contraluz (la mesa, el jarrón, el gato, la taza y sus trozos) se saca un filo
//   dorado: más grueso por el lado que mira al sol (el contorno «abierto» hacia el sol) y fino por todo alrededor, más fuerte cuanto más
//   cerca del sol y del oro pálido al naranja según se aleja. Se suma nítido y otra vez desenfocado (el filo que «sangra»).
// - LOS PELOS DEL BORDE: pelillos cortos que salen del contorno del gato hacia fuera y brillan, sobre todo los que miran al sol.
// - LOS RAYOS DEL SOL entre las siluetas: la luz del sol, tapada por lo que tiene delante, estirada desde el sol muchas veces (el
//   desenfoque radial), así salen los haces con la sombra de las orejas y la cola.
// - LAS MOTAS de polvo dorado que suben y titilan, más y más brillantes cerca del sol, y algunas grandes y desenfocadas.
// - EL BRILLO (lo más claro sangra un poco), la viñeta cálida y la tela del lienzo por encima de todo.

const W = 1080, H = 1920;
const Y0 = 260, Y1 = 1720; // las filas donde puede haber silueta
const unit = (x: number, y: number): [number, number] => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};

// ---------------------------------------------------------------- la silueta (la pinta el que manda) y el borde de luz
let MASCARA: HTMLCanvasElement | null = null;
let BORDE: HTMLCanvasElement | null = null;
let BORDE_IMG: ImageData | null = null;
let MASC_DATOS: Uint8ClampedArray | null = null;
export const mascara = () => {
  MASCARA ??= lienzo(W, H);
  const c = ctx(MASCARA, true);
  limpio(c);
  return {lienzo: MASCARA, c};
};
// el alfa de la silueta en un punto (0 a 255)
const M = (x: number, y: number) => {
  const xi = x | 0, yi = y | 0;
  if (xi < 0 || xi >= W || yi < Y0 || yi >= Y1) return 0;
  return MASC_DATOS![4 * ((yi - Y0) * W + xi) + 3];
};
export const leerMascara = () => {
  const c = ctx(MASCARA!, true);
  MASC_DATOS = c.getImageData(0, Y0, W, Y1 - Y0).data;
};

export const pintarBordeLuz = (c: CanvasRenderingContext2D) => {
  BORDE ??= lienzo(W, Y1 - Y0);
  const bc = ctx(BORDE);
  BORDE_IMG ??= bc.createImageData(W, Y1 - Y0);
  const out = BORDE_IMG.data;
  out.fill(0);
  const md = MASC_DATOS!;
  for (let y = Y0 + 2; y < Y1 - 2; y++) {
    const fila = (y - Y0) * W;
    for (let x = 2; x < W - 2; x++) {
      const a = md[4 * (fila + x) + 3];
      if (a < 100) continue;
      const dx = SOL[0] - x, dy = SOL[1] - y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const abierto = 1 - (0.55 * M(x + ux * 4.5, y + uy * 4.5) + 0.45 * M(x + ux * 9, y + uy * 9)) / 255;
      const e = 1 - Math.min(md[4 * (fila + x + 2) + 3], md[4 * (fila + x - 2) + 3], M(x, y + 2), M(x, y - 2)) / 255;
      const F = 0.48 + 0.52 * Math.exp(-d / 600);
      let I = F * (1.35 * abierto + 0.8 * e) * (a / 255);
      if (I < 0.02) continue;
      I = Math.min(1, I);
      const k = Math.exp(-d / 420);
      const o = 4 * (fila + x);
      out[o] = 255;
      out[o + 1] = 168 + 80 * k;
      out[o + 2] = 96 + 120 * k;
      out[o + 3] = I * 255;
    }
  }
  bc.putImageData(BORDE_IMG, 0, 0);
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(BORDE, 0, Y0);
  c.globalAlpha = 0.8;
  c.filter = 'blur(4px)';
  c.drawImage(BORDE, 0, Y0);
  c.globalAlpha = 0.5;
  c.filter = 'blur(14px)';
  c.drawImage(BORDE, 0, Y0);
  limpio(c);
};

// los pelillos del contorno que brillan
export const pintarPelos = (c: CanvasRenderingContext2D, pelos: Pelo[], t: number) => {
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  pelos.forEach((pe, i) => {
    const [x, y] = pe.p;
    if (M(x + pe.n[0] * 5, y + pe.n[1] * 5) > 60) return; // tapado por otra parte: no es borde
    if (M(x - pe.n[0] * 3, y - pe.n[1] * 3) < 120) return;
    const [ux, uy] = unit(SOL[0] - x, SOL[1] - y);
    const d = Math.hypot(SOL[0] - x, SOL[1] - y);
    const mira = clamp(pe.n[0] * ux + pe.n[1] * uy);
    let I = (0.22 + 0.78 * mira) * (0.4 + 0.6 * Math.exp(-d / 520));
    I *= 0.85 + 0.15 * Math.sin(t * 3 + i * 1.7);
    if (pe.fino) I *= 0.85;
    if (I < 0.05) return;
    const k = Math.exp(-d / 420);
    const curl = (hash(i, 7) - 0.5) * 0.9;
    const l = pe.l * (0.8 + 0.4 * mira);
    const tx = -pe.n[1], ty = pe.n[0];
    c.strokeStyle = `rgba(255,${(170 + 80 * k) | 0},${(100 + 110 * k) | 0},${clamp(I * 0.95).toFixed(3)})`;
    c.lineWidth = pe.fino ? 1.1 : 1.5;
    c.beginPath();
    c.moveTo(x - pe.n[0] * 1.5, y - pe.n[1] * 1.5);
    c.quadraticCurveTo(x + pe.n[0] * l * 0.55, y + pe.n[1] * l * 0.55, x + pe.n[0] * l + tx * curl * l * 0.5, y + pe.n[1] * l + ty * curl * l * 0.5);
    c.stroke();
  });
  limpio(c);
};

// ---------------------------------------------------------------- los haces del sol entre las siluetas (desenfoque radial)
const R4 = 4;
let HAZ_A: HTMLCanvasElement | null = null;
let HAZ_B: HTMLCanvasElement | null = null;
export const pintarHaces = (c: CanvasRenderingContext2D, t: number, tapan: HTMLCanvasElement[], fuerza = 1) => {
  const w = W / R4, h = H / R4;
  HAZ_A ??= lienzo(w, h);
  HAZ_B ??= lienzo(w, h);
  const a = ctx(HAZ_A), b = ctx(HAZ_B);
  const sx = SOL[0] / R4, sy = SOL[1] / R4;
  limpio(a);
  a.clearRect(0, 0, w, h);
  const g = a.createRadialGradient(sx, sy, 0, sx, sy, 210 / R4);
  g.addColorStop(0, 'rgba(255,244,210,1)');
  g.addColorStop((R_SOL * 1.15) / 210, 'rgba(255,226,160,0.9)');
  g.addColorStop(0.55, 'rgba(255,180,100,0.25)');
  g.addColorStop(1, 'rgba(255,160,90,0)');
  a.fillStyle = g;
  a.fillRect(0, 0, w, h);
  a.globalCompositeOperation = 'destination-out';
  for (const tp of tapan) a.drawImage(tp, 0, 0, w, h);
  limpio(a);
  limpio(b);
  b.clearRect(0, 0, w, h);
  b.globalCompositeOperation = 'lighter';
  const N = 28;
  const late = 1 + 0.05 * Math.sin(t * 1.3);
  for (let i = 0; i < N; i++) {
    const s = 1 + i * 0.07 * late;
    b.globalAlpha = (2.4 / N) * (1 - i / N) ** 1.3;
    b.setTransform(s, 0, 0, s, sx * (1 - s), sy * (1 - s));
    b.drawImage(HAZ_A, 0, 0);
  }
  // delante de las siluetas, la luz casi no se ve (si no, se comen la pata y la taza)
  b.globalCompositeOperation = 'destination-out';
  b.globalAlpha = 0.8;
  for (const tp of tapan.slice(1)) b.drawImage(tp, 0, 0, w, h);
  limpio(b);
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = clamp(0.36 * fuerza);
  c.filter = 'blur(3px)';
  c.drawImage(HAZ_B, 0, 0, W, H);
  limpio(c);
};

// ---------------------------------------------------------------- las motas de polvo dorado
type Mota = {x: number; y: number; vy: number; amp: number; f: number; fase: number; s: number; grande: boolean; tw: number};
const MOTAS: Mota[] = (() => {
  const r = rng(171);
  const out: Mota[] = [];
  for (let i = 0; i < 190; i++) {
    const cercaSol = i % 2 === 0;
    // la mitad, repartidas; la otra mitad, alrededor del sol (donde se ven)
    const x = cercaSol ? SOL[0] + (r() + r() + r() - 1.5) * 420 : r() * W;
    const y = cercaSol ? SOL[1] + (r() + r() + r() - 1.5) * 620 : r() * H;
    const grande = r() < 0.12;
    out.push({x, y, vy: -(10 + r() * 26), amp: 6 + r() * 18, f: 0.15 + r() * 0.45, fase: r() * 6.28, s: grande ? 7 + r() * 9 : 1.3 + r() * 2.6, grande, tw: 0.8 + r() * 2.2});
  }
  return out;
})();
export const pintarMotas = (c: CanvasRenderingContext2D, t: number) => {
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  for (const m of MOTAS) {
    const alto = H + 160;
    const y = ((((m.y + m.vy * t + 80) % alto) + alto) % alto) - 80;
    const x = m.x + m.amp * Math.sin(2 * Math.PI * m.f * t + m.fase) + 6 * t;
    const d = Math.hypot(x - SOL[0], y - SOL[1]);
    const luz = 0.25 + 1.1 * Math.exp(-d / 380);
    const tw = 0.35 + 0.65 * Math.sin(t * m.tw * Math.PI + m.fase) ** 2;
    const a = clamp(luz * tw * (m.grande ? 0.22 : 0.9));
    if (a < 0.02) continue;
    if (m.grande) {
      const g = c.createRadialGradient(x, y, 0, x, y, m.s);
      g.addColorStop(0, `rgba(255,220,150,${a})`);
      g.addColorStop(0.7, `rgba(255,200,130,${a * 0.6})`);
      g.addColorStop(1, 'rgba(255,190,120,0)');
      c.fillStyle = g;
      c.fillRect(x - m.s, y - m.s, m.s * 2, m.s * 2);
    } else {
      c.fillStyle = `rgba(255,226,160,${a})`;
      c.beginPath();
      c.arc(x, y, m.s, 0, Math.PI * 2);
      c.fill();
    }
  }
  limpio(c);
};

// ---------------------------------------------------------------- el brillo de lo más claro, la viñeta y la tela
const RB = 4;
let BR_A: HTMLCanvasElement | null = null;
let BR_B: HTMLCanvasElement | null = null;
export const pintarBrillo = (c: CanvasRenderingContext2D, fuente: HTMLCanvasElement, fuerza = 0.5) => {
  const w = W / RB, h = H / RB;
  BR_A ??= lienzo(w, h);
  BR_B ??= lienzo(w, h);
  const a = ctx(BR_A, true), b = ctx(BR_B);
  limpio(a);
  a.drawImage(fuente, 0, 0, w, h);
  const img = a.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2];
    const k = clamp((l - 205) / 50);
    d[i] *= k;
    d[i + 1] *= k;
    d[i + 2] *= k;
  }
  a.putImageData(img, 0, 0);
  limpio(b);
  b.clearRect(0, 0, w, h);
  b.filter = 'blur(4px)';
  b.drawImage(BR_A, 0, 0);
  b.globalCompositeOperation = 'lighter';
  b.globalAlpha = 0.8;
  b.filter = 'blur(14px)';
  b.drawImage(BR_A, 0, 0);
  limpio(b);
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = fuerza;
  c.drawImage(BR_B, 0, 0, W, H);
  limpio(c);
};

export const pintarAcabado = (c: CanvasRenderingContext2D) => {
  limpio(c);
  // la viñeta, cálida (ciruela) y suave
  c.globalCompositeOperation = 'multiply';
  const g = c.createRadialGradient(600, 940, 420, 560, 960, 1250);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(150,96,128,1)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // la luz dorada que lo baña todo desde el sol (sube el oro y calienta el malva)
  c.globalCompositeOperation = 'soft-light';
  const o = c.createRadialGradient(SOL[0], SOL[1], 0, SOL[0], SOL[1], 1300);
  o.addColorStop(0, 'rgba(255,176,72,0.75)');
  o.addColorStop(0.5, 'rgba(255,150,70,0.45)');
  o.addColorStop(1, 'rgba(255,140,80,0.15)');
  c.fillStyle = o;
  c.fillRect(0, 0, W, H);
  // la tela del lienzo
  c.globalCompositeOperation = 'overlay';
  c.globalAlpha = 0.3;
  const pat = c.createPattern(tela(), 'repeat')!;
  c.fillStyle = pat;
  c.fillRect(0, 0, W, H);
  limpio(c);
};
