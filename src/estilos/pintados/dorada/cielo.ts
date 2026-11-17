import {clamp, mix, rng} from '../../../comun/curvas';
import {aclara, css, ctx, hex, lienzo, limpio, mezcla, pincelada, rampa, type P, type RGB} from './pincel';

// EL CIELO DE LA HORA DORADA: de violeta arriba a rosa, naranja y oro abajo, con el sol bajo casi tocando las colinas. Se pinta UNA
// vez (es fijo) con miles de pinceladas sueltas y horizontales que mezclan el color de su altura con el de un poco más arriba o más
// abajo (el color roto de la pintura al aire libre). Las nubes van aparte, cada una en su lienzo y alargada, oscura por arriba y
// encendida por debajo, y se mueven despacio (las de arriba un poco más deprisa). Los rayos y los pájaros se pintan en cada cuadro.

export const SOL: P = [652, 872];
export const R_SOL = 50;
export const HORIZ = 924; // la línea de las colinas lejanas

const PARADAS: [number, RGB][] = [
  [0, hex('#24245E')], [0.15, hex('#40307A')], [0.3, hex('#6E3D88')], [0.44, hex('#A84C84')], [0.57, hex('#DA6670')],
  [0.7, hex('#EF8C51')], [0.81, hex('#F7AF50')], [0.91, hex('#FCD07A')], [1, hex('#FFE5A6')],
];
const CALIDO = hex('#FFAD4A');
const BLANCO_SOL = hex('#FFF2C9');
export const colorCielo = (x: number, y: number): RGB => {
  const k = clamp(y / HORIZ, 0, 1.05);
  let c = rampa(PARADAS, k);
  const d = Math.hypot(x - SOL[0], (y - SOL[1]) * 1.35); // el resplandor, más ancho que alto
  c = mezcla(c, CALIDO, 0.4 * Math.exp(-d / 420) * clamp(k * 1.6 - 0.3));
  c = mezcla(c, BLANCO_SOL, 0.85 * Math.exp(-d / 80));
  return c;
};

// ---------------------------------------------------------------- el cielo fijo (con el disco del sol)
const ALTO_CIELO = 1000;
let CIELO: HTMLCanvasElement | null = null;
export const cielo = () => {
  if (CIELO) return CIELO;
  const cv = lienzo(1080, ALTO_CIELO);
  const c = ctx(cv);
  // la base: el color exacto, calculado en pequeño y estirado (sale liso, sin escalones)
  const bw = 135, bh = 125;
  const base = lienzo(bw, bh);
  const bc = ctx(base);
  const img = bc.createImageData(bw, bh);
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) {
      const col = colorCielo(((i + 0.5) / bw) * 1080, ((j + 0.5) / bh) * ALTO_CIELO);
      const k = 4 * (j * bw + i);
      img.data[k] = col[0];
      img.data[k + 1] = col[1];
      img.data[k + 2] = col[2];
      img.data[k + 3] = 255;
    }
  }
  bc.putImageData(img, 0, 0);
  c.imageSmoothingQuality = 'high';
  c.drawImage(base, 0, 0, 1080, ALTO_CIELO);

  // las pinceladas: filas horizontales sueltas, unas encima de otras
  const r = rng(11);
  const tonos: RGB[] = [hex('#E9788C'), hex('#FFC35A'), hex('#7A4A8C'), hex('#FF9A62')];
  const pinta = (x: number, y: number, l: number, w: number, a: number, va: number) => {
    const d = Math.hypot(x - SOL[0], y - SOL[1]);
    let col = colorCielo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 46);
    col = aclara(col, (r() - 0.5) * 0.1);
    if (r() < 0.16 && d > 120) col = mezcla(col, tonos[Math.floor(r() * 4)], 0.18 + r() * 0.14);
    const lc = d < 260 ? l * (0.55 + 0.45 * (d / 260)) : l;
    pincelada(c, x, y, (r() - 0.5) * 0.07 + (y < 500 ? -0.012 : 0.01), lc, w, col, a, Math.floor(r() * 10), va);
  };
  for (let y = -6; y < ALTO_CIELO + 10; y += 8 + r() * 3) {
    for (let x = -90 + r() * 60; x < 1170; ) {
      const l = 70 + r() * 120;
      pinta(x, y, l, 12 + r() * 10, 0.5 + r() * 0.4, 0.4);
      x += l * (0.5 + r() * 0.35);
    }
  }
  for (let i = 0; i < 1500; i++) pinta(r() * 1080, r() * ALTO_CIELO, 40 + r() * 70, 8 + r() * 8, 0.45 + r() * 0.4, 0.5);

  // el disco del sol: pintado, con su borde de pinceladas que dan la vuelta
  limpio(c);
  c.fillStyle = css(hex('#FFF6DA'));
  c.beginPath();
  c.arc(SOL[0], SOL[1], R_SOL, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const rr = R_SOL * (0.55 + r() * 0.5);
    const col = r() < 0.5 ? hex('#FFFBEA') : hex('#FFE7A0');
    pincelada(c, SOL[0] + Math.cos(a) * rr, SOL[1] + Math.sin(a) * rr, a + Math.PI / 2 + (r() - 0.5) * 0.3, 18 + r() * 22, 7 + r() * 5, col, 0.85, i, 0.25);
  }
  limpio(c);
  CIELO = cv;
  return cv;
};

// ---------------------------------------------------------------- las nubes: alargadas, encendidas por debajo
type Nube = {cx: number; cy: number; L: number; T: number; v: number; lienzo: HTMLCanvasElement; ox: number; oy: number};
const DEF_NUBES: [number, number, number, number][] = [
  // centro x, centro y, largo, grueso
  [300, 150, 760, 54], [880, 225, 640, 60], [140, 340, 500, 46], [930, 395, 540, 52], [100, 500, 420, 34], [900, 600, 480, 36],
  [830, 712, 560, 18], [230, 800, 480, 14], [570, 268, 320, 20], [500, 50, 600, 30],
];
let NUBES: Nube[] | null = null;
const pintarNube = (cx: number, cy: number, L: number, T: number, semilla: number) => {
  const r = rng(semilla);
  const M = 70;
  const w = L + 2 * M, h = T * 2.4 + 2 * M;
  const cv = lienzo(w, h);
  const c = ctx(cv);
  const ox = w / 2, oy = h / 2 + T * 0.3; // dónde cae el centro de la nube en su lienzo
  // la forma: arriba con bultos, abajo casi recta; se afila en las puntas
  const bultos = Array.from({length: 5}, () => ({f: 1 + r() * 4, ph: r() * 6.28, a: 0.3 + r() * 0.7}));
  const arriba = (u: number) => {
    const s = u / (L / 2);
    const env = Math.max(0, 1 - s * s) ** 0.55;
    let b = 0;
    for (const o of bultos) b += o.a * (0.5 + 0.5 * Math.sin(o.f * s * Math.PI + o.ph));
    return -T * (0.55 + 0.7 * (b / bultos.length)) * env;
  };
  const abajo = (u: number) => {
    const s = u / (L / 2);
    return T * 0.42 * Math.max(0, 1 - s * s) ** 0.7;
  };
  // los colores según la altura: las altas, violetas con el vientre rosa; las bajas, malvas con el vientre de oro
  const alta = clamp((520 - cy) / 420);
  const cuerpo = mezcla(hex('#8A4C72'), hex('#5E3A78'), alta);
  const vientre = mezcla(hex('#FFC871'), hex('#FF8E86'), alta);
  const vivo = mezcla(hex('#FFE7A8'), hex('#FFB59A'), alta);
  const N = Math.round((L * T) / 70) + 40;
  for (let i = 0; i < N; i++) {
    const u = (r() - 0.5) * L * 0.98;
    const t0 = arriba(u), t1 = abajo(u);
    if (t1 - t0 < 2) continue;
    const k = Math.pow(r(), 0.8);
    const v = mix(t0, t1, k);
    let col: RGB;
    if (k < 0.3) col = mezcla(colorCielo(cx + u, cy + v - T), cuerpo, 0.35 + k * 1.6);
    else if (k < 0.66) col = cuerpo;
    else col = mezcla(cuerpo, vientre, escalon01((k - 0.62) / 0.3));
    col = aclara(col, (r() - 0.5) * 0.1);
    const ww = clamp((t1 - t0) * 0.45, 5, 16);
    pincelada(c, ox + u, oy + v, (r() - 0.5) * 0.06, 30 + r() * 70, ww, col, 0.7 + r() * 0.3, i, 0.55);
  }
  // el filo encendido de abajo: pinceladas finas y largas
  for (let i = 0; i < Math.round(L / 28); i++) {
    const u = (r() - 0.5) * L * 0.9;
    const v = abajo(u) - 2 - r() * 3;
    pincelada(c, ox + u, oy + v, (r() - 0.5) * 0.05, 40 + r() * 80, 3 + r() * 4, r() < 0.5 ? vivo : vientre, 0.75 + r() * 0.25, i + 3, 0.3);
  }
  limpio(c);
  return {lienzo: cv, ox, oy};
};
const escalon01 = (x: number) => {
  const k = clamp(x);
  return k * k * (3 - 2 * k);
};
const nubes = () => {
  if (NUBES) return NUBES;
  NUBES = DEF_NUBES.map(([cx, cy, L, T], i) => {
    const {lienzo: cv, ox, oy} = pintarNube(cx, cy, L, T, 300 + i * 13);
    return {cx, cy, L, T, v: mix(13, 4, clamp(cy / 820)) * (i % 3 === 1 ? 0.8 : 1), lienzo: cv, ox, oy};
  });
  return NUBES;
};
export const pintarNubes = (c: CanvasRenderingContext2D, t: number) => {
  limpio(c);
  for (const n of nubes()) c.drawImage(n.lienzo, n.cx - n.ox + n.v * (t - 3), n.cy - n.oy);
};

// ---------------------------------------------------------------- el resplandor del sol (se suma a lo que haya)
export const pintarResplandor = (c: CanvasRenderingContext2D, t: number, fuerza = 1) => {
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  const late = 1 + 0.04 * Math.sin(t * 1.7);
  const capas: [number, string, number][] = [
    [480 * late, '255,160,70', 0.1], [200 * late, '255,190,110', 0.16], [R_SOL * 1.5, '255,236,190', 0.45],
  ];
  for (const [rr, col, a] of capas) {
    const g = c.createRadialGradient(SOL[0], SOL[1], 0, SOL[0], SOL[1], rr);
    g.addColorStop(0, `rgba(${col},${a * fuerza})`);
    g.addColorStop(0.35, `rgba(${col},${a * fuerza * 0.45})`);
    g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g;
    c.fillRect(SOL[0] - rr, SOL[1] - rr, rr * 2, rr * 2);
  }
  limpio(c);
};

// ---------------------------------------------------------------- los rayos: conos de luz que salen del sol (se pintan en pequeño)
const R4 = 4; // a un cuarto
let RAYOS: HTMLCanvasElement | null = null;
const DEF_RAYOS = Array.from({length: 15}, (_, i) => {
  const r = rng(90 + i * 7);
  return {a: -Math.PI + (i + 0.2 + r() * 0.6) * (Math.PI / 14.5), ancho: 0.025 + r() * 0.06, fuerza: 0.35 + r() * 0.65, fase: r() * 6.28};
});
export const pintarRayos = (c: CanvasRenderingContext2D, t: number) => {
  RAYOS ??= lienzo(1080 / R4, 1920 / R4);
  const rc = ctx(RAYOS);
  limpio(rc);
  rc.clearRect(0, 0, RAYOS.width, RAYOS.height);
  rc.globalCompositeOperation = 'lighter';
  const sx = SOL[0] / R4, sy = SOL[1] / R4, largo = 1500 / R4;
  for (const ry of DEF_RAYOS) {
    const a = ry.a + 0.035 * Math.sin(t * 0.35 + ry.fase); // se mecen despacio
    const f = ry.fuerza * (0.75 + 0.25 * Math.sin(t * 0.9 + ry.fase * 2));
    const g = rc.createRadialGradient(sx, sy, 0, sx, sy, largo);
    g.addColorStop(0, `rgba(255,214,140,${0.34 * f})`);
    g.addColorStop(0.3, `rgba(255,190,110,${0.16 * f})`);
    g.addColorStop(1, 'rgba(255,170,90,0)');
    rc.fillStyle = g;
    rc.beginPath();
    rc.moveTo(sx, sy);
    rc.lineTo(sx + Math.cos(a - ry.ancho) * largo, sy + Math.sin(a - ry.ancho) * largo);
    rc.lineTo(sx + Math.cos(a + ry.ancho) * largo, sy + Math.sin(a + ry.ancho) * largo);
    rc.closePath();
    rc.fill();
  }
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  c.imageSmoothingQuality = 'high';
  c.filter = 'blur(6px)';
  c.drawImage(RAYOS, 0, 0, 1080, 1920);
  limpio(c);
};

// ---------------------------------------------------------------- los pájaros: una bandada pequeña y lejos, batiendo las alas
const BANDADA = Array.from({length: 7}, (_, i) => {
  const r = rng(200 + i * 5);
  const fila = i === 0 ? 0 : Math.ceil(i / 2);
  const lado = i === 0 ? 0 : i % 2 ? -1 : 1;
  return {dx: fila * 34 + r() * 10, dy: lado * fila * 20 + (r() - 0.5) * 10, s: 0.75 + r() * 0.4, f: 2.6 + r() * 0.9, fase: r() * 6.28};
});
const OTRA = Array.from({length: 4}, (_, i) => {
  const r = rng(260 + i * 5);
  return {dx: i * 22 + r() * 8, dy: (r() - 0.5) * 14, s: 0.45 + r() * 0.15, f: 3 + r(), fase: r() * 6.28};
});
export const pintarPajaros = (c: CanvasRenderingContext2D, t: number) => {
  limpio(c);
  c.strokeStyle = css(hex('#2E1832'), 0.9);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const pajaro = (x: number, y: number, s: number, ala: number) => {
    const e = 13 * s;
    const alto = ala * 9 * s;
    c.lineWidth = 3.4 * s;
    c.beginPath();
    c.moveTo(x - e, y - alto);
    c.quadraticCurveTo(x - e * 0.45, y - alto * 0.2 - 3 * s, x, y);
    c.quadraticCurveTo(x + e * 0.45, y - alto * 0.2 - 3 * s, x + e, y - alto);
    c.stroke();
  };
  const x0 = 1010 - 30 * t, y0 = 330 + 4 * Math.sin(t * 0.8);
  for (const b of BANDADA) pajaro(x0 + b.dx, y0 + b.dy + 3 * Math.sin(t * 1.3 + b.fase), b.s, Math.sin(t * b.f * 2 * Math.PI + b.fase));
  const x1 = 40 + 16 * t, y1 = 236;
  for (const b of OTRA) pajaro(x1 + b.dx, y1 + b.dy + 2 * Math.sin(t * 1.1 + b.fase), b.s, Math.sin(t * b.f * 2 * Math.PI + b.fase));
  limpio(c);
};
