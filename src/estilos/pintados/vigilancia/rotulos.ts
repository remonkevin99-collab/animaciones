import {clamp, ruido} from '../../../comun/curvas';
import {T_CAE, T_SUELO} from '../../gato/escena';

// LOS RÓTULOS DE LA CÁMARA: lo que el grabador escribe encima de la imagen, nítido y con letra de sistema
// (VT323) con su borde negro: arriba «CAM 02 · COCINA» y «● REC» que parpadea; abajo la fecha con la hora que corre segundo a segundo
// y el medidor de sonido, que salta al rojo con el golpe. Y el recuadro de la cámara «lista»: «MOVIMIENTO DETECTADO» sobre la pata y
// la taza (y sobre la taza mientras cae, a saltos como la cámara) y, después del golpe, «SOSPECHOSO» sobre el gato.
// Se pinta en medidas del cuadro (1080 × 1920).

export type Caja = [number, number, number, number];
const BLANCO = '#F1F6EF';
const ROJO = '#FF3B30';

const texto = (c: CanvasRenderingContext2D, fuente: string, s: string, x: number, y: number, tam: number, alinea: CanvasTextAlign = 'left', color = BLANCO) => {
  c.font = `${tam}px "${fuente}"`;
  c.textAlign = alinea;
  c.textBaseline = 'alphabetic';
  c.lineJoin = 'round';
  c.lineWidth = tam * 0.17;
  c.strokeStyle = 'rgba(0,0,0,0.92)';
  c.strokeText(s, x, y);
  c.fillStyle = color;
  c.fillText(s, x, y);
  return c.measureText(s).width;
};

// el nivel del sonido que oye la cámara: un murmullo, los roces de la taza al empujarla y el golpe
const nivel = (t: number) => {
  const golpe = t >= T_SUELO ? Math.exp(-(t - T_SUELO) * 3.2) : 0;
  const roce = t > 2.36 && t < T_CAE + 0.05 ? 0.35 : 0;
  return clamp(0.1 + 0.06 * (ruido(t * 9, 4) + 1) + roce + golpe * 0.95);
};

const recuadro = (c: CanvasRenderingContext2D, fuente: string, b: Caja, etiqueta: string, color: string) => {
  const [x0, y0, x1, y1] = b;
  c.save();
  c.lineCap = 'square';
  // el marco fino entero y las esquinas gruesas, con su sombra para que se lea sobre lo claro
  for (const [ancho, col] of [[11, 'rgba(0,0,0,0.55)'], [5, color]] as [number, string][]) {
    c.strokeStyle = col;
    c.lineWidth = ancho - 2;
    c.strokeRect(x0, y0, x1 - x0, y1 - y0);
    c.lineWidth = ancho + 4;
    const L = Math.min(54, (x1 - x0) / 3, (y1 - y0) / 3);
    c.beginPath();
    for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      c.moveTo(x + sx * L, y);
      c.lineTo(x, y);
      c.lineTo(x, y + sy * L);
    }
    c.stroke();
  }
  // la etiqueta, pegada encima (o debajo, si no cabe arriba)
  const tam = 52;
  c.font = `${tam}px "${fuente}"`;
  const w = c.measureText(etiqueta).width + 26;
  const arriba = y0 - tam - 14 > 150;
  const ex = clamp(x0 - 2.5, 70, 1010 - w);
  const ey = arriba ? y0 - tam - 6 : y1 + 6;
  c.fillStyle = color;
  c.fillRect(ex, ey, w, tam + 4);
  c.fillStyle = BLANCO;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillText(etiqueta, ex + 13, ey + tam - 6);
  c.restore();
};

export type Recuadro = {caja: Caja; etiqueta: string};

// tc: el reloj de la cámara (a saltos); las cajas ya en la pantalla
export const pintarRotulos = (c: CanvasRenderingContext2D, fuente: string, tc: number, recuadros: Recuadro[]) => {
  c.save();
  // arriba: la cámara y el REC (el punto, rojo, parpadea una vez por segundo)
  texto(c, fuente, 'CAM 02 · COCINA', 74, 136, 62);
  const w = texto(c, fuente, 'REC', 1006, 136, 62, 'right');
  if ((tc + 0.25) % 1 < 0.62) {
    c.beginPath();
    c.arc(1006 - w - 34, 116, 17, 0, Math.PI * 2);
    c.fillStyle = 'rgba(0,0,0,0.9)';
    c.fill();
    c.beginPath();
    c.arc(1006 - w - 34, 116, 13, 0, Math.PI * 2);
    c.fillStyle = ROJO;
    c.fill();
  }
  // abajo: la fecha y la hora (las 3:14 de la madrugada, y corre)
  const seg = 2 + Math.floor(tc + 1e-6);
  const hora = `03:14:${String(seg).padStart(2, '0')}`;
  texto(c, fuente, `17-11-2026  ${hora}`, 74, 1858, 58);
  // el medidor de sonido: el altavoz y diez barras (verdes, ámbar y rojas)
  const n = nivel(tc);
  const bx = 820, by = 1858;
  c.fillStyle = 'rgba(0,0,0,0.85)';
  c.fillRect(bx - 66, by - 44, 48, 48);
  c.fillStyle = BLANCO;
  c.beginPath();
  c.moveTo(bx - 60, by - 28);
  c.lineTo(bx - 48, by - 28);
  c.lineTo(bx - 32, by - 40);
  c.lineTo(bx - 32, by);
  c.lineTo(bx - 48, by - 12);
  c.lineTo(bx - 60, by - 12);
  c.closePath();
  c.fill();
  for (let k = 0; k < 10; k++) {
    const x = bx + k * 19;
    const h = 12 + k * 3.4;
    const encendida = n * 10 > k + 0.2;
    c.fillStyle = 'rgba(0,0,0,0.85)';
    c.fillRect(x - 3, by - h - 3, 16, h + 6);
    c.fillStyle = encendida ? (k >= 8 ? ROJO : k >= 6 ? '#FFC23A' : '#7CF08A') : 'rgba(241,246,239,0.22)';
    c.fillRect(x, by - h, 10, h);
  }
  for (const r of recuadros) recuadro(c, fuente, r.caja, r.etiqueta, ROJO);
  c.restore();
};
