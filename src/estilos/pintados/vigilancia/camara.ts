import {clamp, rng} from '../../../comun/curvas';
import {T_SUELO, type P} from '../../gato/escena';
import {MH, MW, MX, MY, S} from './cocina';

// LA CÁMARA: de la cocina en grises a la imagen que graba una cámara de seguridad de casa, de noche.
// - La lente: gran angular de ojo de pez suave (el centro se acerca y los bordes se curvan) y, como mira hacia abajo desde el techo,
//   las verticales se juntan hacia abajo. Las esquinas se van a negro (el círculo de la lente).
// - El sensor: ruido que cambia en cada cuadro (más en lo oscuro, que es donde la cámara sube la ganancia), un ruido grueso que se
//   mueve a manchas, y la compresión: en bloques de 8 × 8 lo liso se aplana y se escalona (así se ven los bloques suaves de estos
//   vídeos en lo oscuro).
// - La imagen: la curva de la cámara (los negros levantados y lo blanco quemado), el tono gris verdoso de la visión nocturna y
//   las líneas de barrido, con una franja algo más clara que baja despacio.
// - El fallo de señal al romperse la taza: tirones horizontales (franjas de filas que se corren), bloques corridos, estirados o
//   lisos y un fogonazo, en unos pasos que se van calmando.
// Todo a media resolución (540 × 960): la de una cámara así, que después se amplía al cuadro y por eso sale algo blanda.

export const CW = 540;
export const CH = 960;
const CX = 540, CY = 960; // el centro, en medidas del cuadro
const R = Math.hypot(CX, CY);
// el ojo de pez: cada punto de la pantalla mira el mundo a s(u) veces su distancia al centro (u, la distancia en fracción de media
// diagonal): en el centro, 1,09 veces más cerca; hacia los bordes mira cada vez más lejos, hasta un 14 % fuera del cuadro en las
// esquinas (por eso la cocina se pinta con margen), y las rectas de los bordes se curvan
const A_LENTE = 0.92;
const C_LENTE = 0.3;
const sLente = (u2: number) => A_LENTE + C_LENTE * u2 * u2;
const KK = 0.13; // lo que se juntan las verticales hacia abajo (la cámara mira desde el techo)

type Lut = {x: Float32Array; y: Float32Array; vig: Float32Array};
let LUT: Lut | null = null;
const lut = (): Lut => {
  if (LUT) return LUT;
  const n = CW * CH;
  const x = new Float32Array(n), y = new Float32Array(n), vig = new Float32Array(n);
  for (let j = 0; j < CH; j++) {
    for (let i = 0; i < CW; i++) {
      const xo = (i + 0.5) / S, yo = (j + 0.5) / S;
      const dx = xo - CX, dy = yo - CY;
      const r2 = (dx * dx + dy * dy) / (R * R);
      const k = sLente(r2);
      const x1 = CX + dx * k, y1 = CY + dy * k;
      const m = 1 + (KK * (y1 - CY)) / CY;
      const q = j * CW + i;
      x[q] = CX + (x1 - CX) * m;
      y[q] = y1;
      // el círculo de la lente: las esquinas se apagan
      const e = clamp((Math.sqrt(r2) - 0.5) / 0.52);
      vig[q] = 1 - 0.86 * e * e * (3 - 2 * e);
    }
  }
  LUT = {x, y, vig};
  return LUT;
};

// del mundo a la pantalla (medidas del cuadro): dónde se ve un punto de la escena, para poner encima los recuadros
export const aPantalla = (q: P): P => {
  const y1 = q[1];
  const m = 1 + (KK * (y1 - CY)) / CY;
  const x1 = CX + (q[0] - CX) / m;
  const dx = x1 - CX, dy = y1 - CY;
  const r1 = Math.hypot(dx, dy);
  if (r1 < 1e-3) return [CX, CY];
  let r = r1 / A_LENTE;
  for (let it = 0; it < 10; it++) {
    const u2 = (r / R) ** 2;
    r -= (r * sLente(u2) - r1) / (A_LENTE + 5 * C_LENTE * u2 * u2);
  }
  return [CX + (dx * r) / r1, CY + (dy * r) / r1];
};
// una caja del mundo, en la pantalla (la caja que abarca sus bordes ya curvados)
export const cajaEnPantalla = (b: [number, number, number, number]): [number, number, number, number] => {
  const pts: P[] = [];
  for (let k = 0; k <= 4; k++) {
    const x = b[0] + ((b[2] - b[0]) * k) / 4, y = b[1] + ((b[3] - b[1]) * k) / 4;
    pts.push(aPantalla([x, b[1]]), aPantalla([x, b[3]]), aPantalla([b[0], y]), aPantalla([b[2], y]));
  }
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

// ---------------------------------------------------------------- el fallo de señal
export type Fallo = {
  rasgados: {y0: number; y1: number; dx: number; luz: number}[]; // filas de la cámara; dx en medidas del cuadro
  bloques: {i: number; j: number; modo: number; oi: number; oj: number}[]; // bloques de 16 × 16
  luz: number; // el fogonazo
  compresion: number; // los bloques, más bastos
};
// a 24 pasos por segundo (el doble que la cámara: el fallo va más nervioso), cada vez más flojo, con un repunte; corto, para que
// enseguida se vean los trozos y el café en el suelo
const FUERZA = [1, 0.8, 0.34, 0.5, 0.14, 0.05];
export const DUR_FALLO = FUERZA.length / 24;
export const fallo = (t: number, impacto: P): Fallo | null => {
  const s = t - T_SUELO + 1e-6;
  if (s < 0 || s >= DUR_FALLO) return null;
  const paso = Math.min(FUERZA.length - 1, Math.floor(s * 24));
  const f = FUERZA[paso];
  const r = rng(500 + paso * 31);
  const rasgados: Fallo['rasgados'] = [];
  const nr = 2 + Math.round(f * 6);
  for (let k = 0; k < nr; k++) {
    const alto = 4 + Math.round(r() * (10 + 90 * f));
    const y0 = Math.floor(r() * (CH - alto));
    rasgados.push({y0, y1: y0 + alto, dx: (r() < 0.5 ? -1 : 1) * (20 + r() * 170 * f), luz: (r() - 0.45) * 0.3 * f});
  }
  // un tirón grande que cruza el impacto
  if (f > 0.4) {
    const yi = clamp(Math.round(impacto[1] * S) - 40, 0, CH - 130) | 0;
    rasgados.push({y0: yi, y1: yi + 60 + Math.round(r() * 60), dx: 120 * f, luz: 0.06});
  }
  const bloques: Fallo['bloques'] = [];
  const nb = Math.round(f * 64);
  const bi = Math.floor((impacto[0] * S) / 16), bj = Math.floor((impacto[1] * S) / 16);
  for (let k = 0; k < nb; k++) {
    // la mitad, alrededor del golpe; el resto, en cualquier parte (y algunos en fila, como cuando se pierde un trozo del vídeo)
    const cerca = k % 2 === 0 && paso < 2;
    const i = cerca ? bi + Math.round((r() - 0.5) * 14) : Math.floor(r() * (CW / 16));
    const j = cerca ? bj + Math.round((r() - 0.6) * 10) : Math.floor(r() * (CH / 16));
    const largo = r() < 0.3 ? 1 + Math.floor(r() * 6) : 1;
    const modo = Math.floor(r() * 3);
    const oi = Math.round((r() - 0.5) * 8), oj = Math.round((r() - 0.5) * 4);
    for (let l = 0; l < largo; l++) bloques.push({i: i + l, j, modo, oi, oj});
  }
  return {rasgados, bloques, luz: paso === 0 ? 0.14 : paso === 3 ? 0.06 : 0, compresion: 0.55 + 0.45 * f};
};

// ---------------------------------------------------------------- el revelado
// la curva y el tinte: de 0 (negro) a 1 (blanco), gris verdoso
const TINTE: [number, number, number, number][] = [
  [0, 7, 12, 9], [0.22, 38, 50, 41], [0.5, 104, 124, 108], [0.78, 182, 202, 186], [1, 240, 252, 242],
];
const NT = 1024;
const TR = new Uint8ClampedArray(NT), TG = new Uint8ClampedArray(NT), TB = new Uint8ClampedArray(NT);
for (let q = 0; q < NT; q++) {
  // los negros levantados y lo claro que se quema antes
  const v = clamp((q / (NT - 1) - 0.03) * 1.2) ** 0.9;
  let a = TINTE[0], b = TINTE[TINTE.length - 1];
  for (let k = 1; k < TINTE.length; k++) {
    if (v <= TINTE[k][0]) {
      a = TINTE[k - 1];
      b = TINTE[k];
      break;
    }
  }
  const u = (v - a[0]) / Math.max(1e-6, b[0] - a[0]);
  TR[q] = a[1] + (b[1] - a[1]) * u;
  TG[q] = a[2] + (b[2] - a[2]) * u;
  TB[q] = a[3] + (b[3] - a[3]) * u;
}

let BUF: Float32Array | null = null;
let COPIA: Float32Array | null = null;
const DX_FILA = new Float32Array(CH);
const LUZ_FILA = new Float32Array(CH);
const GW = Math.ceil(CW / 12) + 2, GH = Math.ceil(CH / 12) + 2;
const REJILLA = new Float32Array(GW * GH);

const ruidoFino = (k: number, semilla: number) => {
  let h = (Math.imul(k, 374761393) + Math.imul(semilla, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h & 0xffff) / 65535 - 0.5;
};

// mundo: los píxeles del lienzo del mundo (MW × MH, gris en el rojo); salida: la imagen de la cámara (CW × CH)
export const revelar = (mundo: Uint8ClampedArray, salida: ImageData, cuadro: number, sacude: P, banda: number, f: Fallo | null) => {
  const {x: LX, y: LY, vig} = lut();
  BUF ??= new Float32Array(CW * CH);
  const buf = BUF;
  DX_FILA.fill(0);
  LUZ_FILA.fill(0);
  // la franja que baja (un poco más clara y con las filas algo movidas)
  for (let j = Math.max(0, Math.floor(banda - 40)); j < Math.min(CH, banda + 40); j++) {
    const u = 1 - Math.abs(j - banda) / 40;
    LUZ_FILA[j] += 0.04 * u * u;
    DX_FILA[j] += 2.5 * u * Math.sin(j * 0.9 + cuadro);
  }
  if (f) {
    for (const r of f.rasgados) {
      for (let j = Math.max(0, r.y0); j < Math.min(CH, r.y1); j++) {
        DX_FILA[j] += r.dx;
        LUZ_FILA[j] += r.luz;
      }
    }
  }
  const rr = rng(cuadro * 7919 + 13);
  for (let k = 0; k < REJILLA.length; k++) REJILLA[k] = rr() * 2 - 1;
  const expo = f ? f.luz : 0;

  // la lente: cada píxel de la cámara mira su punto del mundo (bilineal), con el ruido del sensor
  const offX = MX * S - 0.5, offY = MY * S - 0.5;
  const maxU = MW - 1.001, maxV = MH - 1.001;
  const fila = MW * 4;
  for (let j = 0; j < CH; j++) {
    const gy = j / 12, gy0 = gy | 0, fy = gy - gy0;
    const dxr = DX_FILA[j] + sacude[0], lr = LUZ_FILA[j] + expo;
    const g0 = gy0 * GW, g1 = g0 + GW;
    for (let i = 0; i < CW; i++) {
      const k = j * CW + i;
      let u = (LX[k] + dxr) * S + offX;
      let v = (LY[k] + sacude[1]) * S + offY;
      if (u < 0) u = 0;
      else if (u > maxU) u = maxU;
      if (v < 0) v = 0;
      else if (v > maxV) v = maxV;
      const x0 = u | 0, y0 = v | 0, fx = u - x0, fv = v - y0;
      const p0 = y0 * fila + x0 * 4;
      const a = mundo[p0], b = mundo[p0 + 4], c = mundo[p0 + fila], d = mundo[p0 + fila + 4];
      const top = a + (b - a) * fx;
      let val = (top + (c + (d - c) * fx - top) * fv) / 255;
      const gx = i / 12, gx0 = gx | 0, fgx = gx - gx0;
      const n0 = REJILLA[g0 + gx0] + (REJILLA[g0 + gx0 + 1] - REJILLA[g0 + gx0]) * fgx;
      const n1 = REJILLA[g1 + gx0] + (REJILLA[g1 + gx0 + 1] - REJILLA[g1 + gx0]) * fgx;
      val = val * vig[k] + lr;
      val += (n0 + (n1 - n0) * fy) * 0.045 + ruidoFino(k, cuadro) * 0.26 * (1.1 - val);
      buf[k] = val;
    }
  }

  // algo de desenfoque (la lente barata y el ruido que se come el detalle): [1 2 1] en las dos direcciones
  COPIA ??= new Float32Array(CW * CH);
  const cp = COPIA;
  for (let j = 0; j < CH; j++) {
    const o = j * CW;
    cp[o] = buf[o];
    cp[o + CW - 1] = buf[o + CW - 1];
    for (let i = 1; i < CW - 1; i++) cp[o + i] = (buf[o + i - 1] + 2 * buf[o + i] + buf[o + i + 1]) * 0.25;
  }
  for (let i = 0; i < CW; i++) {
    buf[i] = cp[i];
    buf[(CH - 1) * CW + i] = cp[(CH - 1) * CW + i];
  }
  for (let j = 1; j < CH - 1; j++) {
    const o = j * CW;
    for (let i = 0; i < CW; i++) buf[o + i] = (cp[o + i - CW] + 2 * cp[o + i] + cp[o + i + CW]) * 0.25;
  }

  // la compresión: bloques de 8 × 8 donde lo liso se aplana y su nivel se escalona
  const comp = f ? f.compresion : 0.7;
  for (let by = 0; by < CH; by += 8) {
    const ey = Math.min(CH, by + 8);
    for (let bx = 0; bx < CW; bx += 8) {
      const ex = Math.min(CW, bx + 8);
      let s1 = 0, s2 = 0, n = 0;
      for (let y = by; y < ey; y++) {
        for (let x = bx, k = y * CW + bx; x < ex; x++, k++) {
          const v = buf[k];
          s1 += v;
          s2 += v * v;
          n++;
        }
      }
      const media = s1 / n;
      const sd = Math.sqrt(Math.max(0, s2 / n - media * media));
      const q = clamp(1 - sd * 5) * comp;
      const salto = (Math.round(media * 22) / 22 - media) * q;
      for (let y = by; y < ey; y++) {
        for (let x = bx, k = y * CW + bx; x < ex; x++, k++) buf[k] += (media - buf[k]) * q + salto;
      }
    }
  }

  // los bloques del fallo: corridos (copiados de otro sitio), estirados (la primera fila hacia abajo) o lisos y claros
  if (f && f.bloques.length) {
    COPIA ??= new Float32Array(CW * CH);
    COPIA.set(buf);
    const src = COPIA;
    for (const bl of f.bloques) {
      const x0 = bl.i * 16, y0 = bl.j * 16;
      if (x0 < 0 || y0 < 0 || x0 + 16 > CW || y0 + 16 > CH) continue;
      if (bl.modo === 0) {
        const sx = clamp(x0 + bl.oi * 16, 0, CW - 16), sy = clamp(y0 + bl.oj * 16, 0, CH - 16);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) buf[(y0 + y) * CW + x0 + x] = src[(sy + y) * CW + sx + x];
      } else if (bl.modo === 1) {
        for (let y = 1; y < 16; y++) for (let x = 0; x < 16; x++) buf[(y0 + y) * CW + x0 + x] = src[y0 * CW + x0 + x];
      } else {
        let m = 0;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) m += src[(y0 + y) * CW + x0 + x];
        m = m / 256 + 0.14;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) buf[(y0 + y) * CW + x0 + x] = m;
      }
    }
  }

  // a color: el grano fino que deja la compresión, las líneas de barrido (cada 8 px del cuadro) y el tinte
  const out = salida.data;
  for (let j = 0; j < CH; j++) {
    const linea = 1 - 0.1 * (0.5 + 0.5 * Math.cos((j * Math.PI) / 2));
    for (let i = 0; i < CW; i++) {
      const k = j * CW + i;
      const v = (buf[k] + ruidoFino(k + 977, cuadro) * 0.085 * (1.1 - buf[k])) * linea;
      const q = v <= 0 ? 0 : v >= 1 ? NT - 1 : (v * (NT - 1)) | 0;
      const o = k * 4;
      out[o] = TR[q];
      out[o + 1] = TG[q];
      out[o + 2] = TB[q];
      out[o + 3] = 255;
    }
  }
};
