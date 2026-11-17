import {clamp, mix, rng, ruido} from '../../../comun/curvas';
import {BORDE, MESA_G, MESA_Y, SUELO} from '../../gato/escena';
import {SOL} from './cielo';
import {aclara, camino, css, ctx, hex, lienzo, limpio, mezcla, pincelada, type P, type RGB} from './pincel';

// EL PORCHE: el suelo de tablas que se va hacia el paisaje (con el brillo del cielo en la madera del fondo y las sombras largas de
// las patas, que vienen hacia nosotros porque el sol está detrás), la mesa de madera a contraluz (su tablero refleja el cielo como un
// espejo y por eso es la línea más clara de todo el cuadro) y, en su punta izquierda, un jarrón con plumeros de pampa que brillan.

export const SUELO_FONDO = 1540; // donde acaban las tablas por detrás (y empieza el prado)
export const SUELO_FRENTE = 1850; // el canto de delante del porche
const FUGA: P = [600, 932]; // a dónde van las tablas
export const SOL_SUELO: P = [SOL[0], 942]; // de dónde salen las sombras
const MESA_X0 = 28;

const cerca = (x: number, y: number, r: number) => Math.exp(-Math.hypot(x - SOL[0], y - SOL[1]) / r);
// el punto de una tabla a una altura dada (las líneas van al punto de fuga)
const enTabla = (xFrente: number, y: number): P => [FUGA[0] + ((xFrente - FUGA[0]) * (y - FUGA[1])) / (SUELO_FRENTE - FUGA[1]), y];

// ---------------------------------------------------------------- las piezas de la mesa (también para su silueta)
export const piezasMesa = () => {
  const p = new Path2D();
  p.rect(MESA_X0, MESA_Y - 15, BORDE + 2 - MESA_X0, 15 + MESA_G); // tablero (lo de arriba y el canto)
  p.rect(56, MESA_Y + MESA_G - 1, 646, 34); // el faldón
  p.rect(106, MESA_Y + MESA_G, 22, SUELO - 20 - MESA_Y - MESA_G); // las patas de atrás
  p.rect(628, MESA_Y + MESA_G, 22, SUELO - 20 - MESA_Y - MESA_G);
  p.rect(56, MESA_Y + MESA_G, 34, SUELO + 8 - MESA_Y - MESA_G); // las de delante
  p.rect(664, MESA_Y + MESA_G, 34, SUELO + 8 - MESA_Y - MESA_G);
  return p;
};
// el jarrón de la punta izquierda
const JARRON: P = [84, MESA_Y - 15];
export const formaJarron = () => {
  const [x, y] = JARRON;
  const p = new Path2D();
  p.moveTo(x - 20, y);
  p.bezierCurveTo(x - 46, y - 30, x - 40, y - 74, x - 14, y - 86);
  p.lineTo(x - 13, y - 104);
  p.lineTo(x - 18, y - 110);
  p.lineTo(x + 18, y - 110);
  p.lineTo(x + 13, y - 104);
  p.lineTo(x + 14, y - 86);
  p.bezierCurveTo(x + 40, y - 74, x + 46, y - 30, x + 20, y);
  p.closePath();
  return p;
};

// ---------------------------------------------------------------- el porche fijo: tablas, sombras, mesa y jarrón
let PORCHE: HTMLCanvasElement | null = null;
export const porche = () => {
  if (PORCHE) return PORCHE;
  const cv = lienzo(1080, 1920);
  const c = ctx(cv);
  const r = rng(61);

  // las tablas
  const N = 22;
  const ancho = 1500 / N;
  for (let i = 0; i < N; i++) {
    const x0 = -210 + i * ancho, x1 = x0 + ancho;
    const q = camino([enTabla(x0, SUELO_FONDO), enTabla(x1, SUELO_FONDO), enTabla(x1, SUELO_FRENTE), enTabla(x0, SUELO_FRENTE)]);
    const tono = r();
    limpio(c);
    const g = c.createLinearGradient(0, SUELO_FONDO, 0, SUELO_FRENTE);
    g.addColorStop(0, css(mezcla(hex('#7A4A50'), hex('#8E5A56'), tono)));
    g.addColorStop(0.35, css(mezcla(hex('#5A3540'), hex('#684048'), tono)));
    g.addColorStop(1, css(mezcla(hex('#3E2430'), hex('#4A2C36'), tono)));
    c.fillStyle = g;
    c.fill(q);
    c.save();
    c.clip(q);
    // las vetas de la madera, a lo largo de la tabla
    for (let j = 0; j < 46; j++) {
      const y = SUELO_FONDO + Math.pow(r(), 0.9) * (SUELO_FRENTE - SUELO_FONDO);
      const u = r();
      const a = enTabla(mix(x0, x1, u), y);
      const b = enTabla(mix(x0, x1, u), y + 30);
      const k = (y - SUELO_FONDO) / (SUELO_FRENTE - SUELO_FONDO);
      let col = aclara(mezcla(hex('#704450'), hex('#3A2230'), k), (r() - 0.5) * 0.16);
      if (r() < 0.3) col = mezcla(col, hex('#FFC27A'), 0.35 * (1 - k) * (0.4 + cerca(a[0], 1000, 500)));
      pincelada(c, a[0], a[1], Math.atan2(b[1] - a[1], b[0] - a[0]), mix(26, 80, k), mix(4, 10, k), col, 0.7, j, 0.6);
    }
    c.restore();
  }
  // las rendijas entre tablas
  limpio(c);
  c.strokeStyle = css(hex('#1E0E18'), 0.85);
  for (let i = 0; i <= N; i++) {
    const x = -210 + i * ancho;
    const a = enTabla(x, SUELO_FONDO), b = enTabla(x, SUELO_FRENTE);
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  }
  // el brillo del cielo en la madera del fondo, más fuerte debajo del sol (como un reflejo en el agua)
  limpio(c);
  c.globalCompositeOperation = 'lighter';
  {
    const g = c.createLinearGradient(0, SUELO_FONDO, 0, SUELO_FONDO + 170);
    g.addColorStop(0, 'rgba(255,190,110,0.3)');
    g.addColorStop(1, 'rgba(255,170,100,0)');
    c.fillStyle = g;
    c.fillRect(0, SUELO_FONDO, 1080, 170);
    c.setTransform(1, 0, 0, 0.32, 0, SUELO_FONDO * 0.68);
    const g2 = c.createRadialGradient(SOL[0], SUELO_FONDO + 20, 0, SOL[0], SUELO_FONDO + 20, 340);
    g2.addColorStop(0, 'rgba(255,214,150,0.3)');
    g2.addColorStop(1, 'rgba(255,170,100,0)');
    c.fillStyle = g2;
    c.fillRect(SOL[0] - 340, SUELO_FONDO - 320, 680, 680);
  }
  // la viga del fondo del porche, con su filo de luz
  limpio(c);
  c.fillStyle = css(hex('#3A1E2C'));
  c.fillRect(-10, SUELO_FONDO - 6, 1100, 9);
  c.globalCompositeOperation = 'lighter';
  for (let x = -20; x < 1100; x += 24 + r() * 20) {
    const k = 0.35 + 0.65 * cerca(x, SUELO_FONDO, 520);
    pincelada(c, x, SUELO_FONDO - 6, (r() - 0.5) * 0.02, 40 + r() * 40, 3, mezcla(hex('#C9705A'), hex('#FFE0A0'), k), 0.7 * k, Math.floor(x), 0.15);
  }
  // las sombras largas de las patas, que vienen hacia nosotros
  limpio(c);
  const sombra = (xc: number, ancho: number, yBase: number, fuerza: number) => {
    const dx = xc - SOL_SUELO[0], dy = yBase - SOL_SUELO[1];
    const k = (SUELO_FRENTE + 40 - yBase) / dy;
    const fin: P = [xc + dx * k, yBase + dy * k];
    const n: P = [-dy / Math.hypot(dx, dy), dx / Math.hypot(dx, dy)];
    const w0 = ancho / 2, w1 = ancho * 0.9;
    c.globalAlpha = fuerza;
    c.fillStyle = css(hex('#1C0C16'));
    c.filter = 'blur(2.5px)';
    c.fill(camino([[xc + n[0] * w0, yBase], [fin[0] + n[0] * w1, fin[1] + n[1] * w1], [fin[0] - n[0] * w1, fin[1] - n[1] * w1], [xc - n[0] * w0, yBase]]));
    c.filter = 'none';
  };
  sombra(117, 22, SUELO - 20, 0.38);
  sombra(639, 22, SUELO - 20, 0.38);
  sombra(73, 34, SUELO + 8, 0.55);
  sombra(681, 34, SUELO + 8, 0.55);
  limpio(c);
  // el canto de delante del porche
  c.fillStyle = css(hex('#2A1520'));
  c.fillRect(-10, SUELO_FRENTE, 1100, 1920 - SUELO_FRENTE);
  for (let x = -30; x < 1100; x += 50 + r() * 30) {
    pincelada(c, x, SUELO_FRENTE + 16 + r() * 20, (r() - 0.5) * 0.03, 70 + r() * 60, 9 + r() * 6, mezcla(hex('#3A1E2C'), hex('#4E2A36'), r()), 0.8, Math.floor(x), 0.6);
  }
  c.globalCompositeOperation = 'lighter';
  for (let x = -20; x < 1100; x += 30 + r() * 20) {
    const k = 0.3 + 0.7 * cerca(x, SUELO_FRENTE, 700);
    pincelada(c, x, SUELO_FRENTE + 1, 0, 40 + r() * 40, 2.5, mezcla(hex('#B05A50'), hex('#FFC27A'), k), 0.5 * k, Math.floor(x) + 3, 0.15);
  }
  limpio(c);

  // la mesa
  c.fillStyle = css(hex('#341B26'));
  c.fill(piezasMesa());
  c.save();
  c.clip(piezasMesa());
  // el canto y el faldón: vetas horizontales
  for (let i = 0; i < 260; i++) {
    const x = MESA_X0 + r() * (BORDE - MESA_X0);
    const y = MESA_Y + 2 + r() * (MESA_G + 30);
    const col = aclara(mezcla(hex('#4A2632'), hex('#2A141E'), r()), (r() - 0.5) * 0.1);
    pincelada(c, x, y, (r() - 0.5) * 0.03, 40 + r() * 60, 5 + r() * 4, col, 0.75, i, 0.55);
  }
  // las patas: vetas de pie
  for (const [x0, w] of [[56, 34], [664, 34], [106, 22], [628, 22]] as P[]) {
    for (let i = 0; i < 70; i++) {
      const y = MESA_Y + MESA_G + 30 + r() * (SUELO - MESA_Y - MESA_G - 20);
      pincelada(c, x0 + r() * w, y, Math.PI / 2 + (r() - 0.5) * 0.04, 30 + r() * 50, 4 + r() * 3, mezcla(hex('#43222E'), hex('#26121B'), r()), 0.75, i, 0.5);
    }
  }
  // el tablero visto un poco desde arriba: un espejo del cielo, que arde debajo del sol
  limpio(c);
  {
    const g = c.createLinearGradient(MESA_X0, 0, BORDE, 0);
    for (let k = 0; k <= 1; k += 0.1) {
      const x = mix(MESA_X0, BORDE, k);
      g.addColorStop(k, css(mezcla(hex('#B0607A'), hex('#FFE4A6'), clamp(cerca(x, MESA_Y, 330) * 1.25))));
    }
    c.fillStyle = g;
    c.fillRect(MESA_X0, MESA_Y - 15, BORDE + 2 - MESA_X0, 14);
  }
  for (let i = 0; i < 140; i++) {
    const x = MESA_X0 + r() * (BORDE - MESA_X0);
    const k = clamp(cerca(x, MESA_Y, 330) * 1.25);
    pincelada(c, x, MESA_Y - 12 + r() * 10, (r() - 0.5) * 0.02, 30 + r() * 60, 3 + r() * 3, aclara(mezcla(hex('#9A5272'), hex('#FFE9B4'), k), (r() - 0.5) * 0.12), 0.7, i, 0.4);
  }
  // el filo del tablero (donde la luz cae rasante)
  c.globalCompositeOperation = 'lighter';
  for (let x = MESA_X0; x < BORDE; x += 18 + r() * 12) {
    const k = 0.3 + 0.7 * cerca(x, MESA_Y, 360);
    pincelada(c, x + 10, MESA_Y - 15, 0, 34 + r() * 20, 2.6, mezcla(hex('#FF9A70'), hex('#FFF4D2'), k), 0.85 * k, Math.floor(x), 0.15);
  }
  c.restore();
  limpio(c);

  // el jarrón: cerámica oscura, con el reflejo del cielo
  c.fillStyle = css(hex('#311A26'));
  c.fill(formaJarron());
  c.save();
  c.clip(formaJarron());
  for (let i = 0; i < 40; i++) {
    const y = JARRON[1] - r() * 108;
    pincelada(c, JARRON[0] - 30 + r() * 60, y, Math.PI / 2 + (r() - 0.5) * 0.3, 16 + r() * 18, 6 + r() * 4, mezcla(hex('#3E2232'), hex('#5A3448'), r()), 0.8, i, 0.5);
  }
  pincelada(c, JARRON[0] - 16, JARRON[1] - 50, Math.PI / 2 + 0.1, 44, 6, hex('#8A5272'), 0.6, 2, 0.3);
  c.restore();
  limpio(c);

  PORCHE = cv;
  return cv;
};

// la silueta fija de lo de delante (la mesa y el jarrón), para el borde de luz
let SILUETA: HTMLCanvasElement | null = null;
export const siluetaPorche = () => {
  if (SILUETA) return SILUETA;
  const cv = lienzo(1080, 1920);
  const c = ctx(cv);
  c.fillStyle = '#000';
  c.fill(piezasMesa());
  c.fill(formaJarron());
  SILUETA = cv;
  return cv;
};

// ---------------------------------------------------------------- los plumeros de pampa del jarrón (se mecen y brillan)
const PLUMEROS = (() => {
  const r = rng(71);
  return Array.from({length: 7}, (_, i) => ({
    ang: -Math.PI / 2 - 0.05 - i * 0.07 + (r() - 0.5) * 0.05, // salen abiertos hacia la izquierda
    largo: 230 + r() * 140,
    curva: -0.2 - r() * 0.25,
    fase: r() * 6.28,
    ancho: 24 + r() * 14,
    pelos: Array.from({length: 120}, () => ({s: r(), lado: r() * 2 - 1, l: 16 + r() * 22, tono: r(), gira: (r() - 0.5) * 0.5})),
  }));
})();
export const pintarPlumeros = (c: CanvasRenderingContext2D, t: number) => {
  limpio(c);
  const base: P = [JARRON[0], JARRON[1] - 106];
  for (const pl of PLUMEROS) {
    const mece = 0.05 * Math.sin(t * 1.25 + pl.fase) + 0.03 * ruido(t * 0.7 + pl.fase, 8);
    const a = pl.ang + mece;
    const punta: P = [base[0] + Math.cos(a) * pl.largo, base[1] + Math.sin(a) * pl.largo];
    const ctrl: P = [base[0] + Math.cos(a - pl.curva) * pl.largo * 0.55, base[1] + Math.sin(a - pl.curva) * pl.largo * 0.55];
    const en = (s: number): P => [
      (1 - s) ** 2 * base[0] + 2 * (1 - s) * s * ctrl[0] + s * s * punta[0],
      (1 - s) ** 2 * base[1] + 2 * (1 - s) * s * ctrl[1] + s * s * punta[1],
    ];
    limpio(c);
    c.strokeStyle = css(hex('#3A2030'));
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(base[0], base[1]);
    c.quadraticCurveTo(ctrl[0], ctrl[1], punta[0], punta[1]);
    c.stroke();
    // el plumero: un huso suave de luz y, encima, sus pelos finos encendidos que salen hacia arriba
    const S0 = 0.5;
    const grosor = (s: number) => Math.sin(Math.PI * clamp((s - S0) / (1 - S0))) ** 0.7 * pl.ancho;
    c.globalCompositeOperation = 'source-over';
    for (let i = 0; i <= 12; i++) {
      const s = mix(S0, 1, i / 12);
      const q = en(s);
      const g = grosor(s);
      if (g < 2) continue;
      const gr = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], g);
      gr.addColorStop(0, 'rgba(214,140,120,0.45)');
      gr.addColorStop(1, 'rgba(214,140,120,0)');
      c.fillStyle = gr;
      c.fillRect(q[0] - g, q[1] - g, g * 2, g * 2);
    }
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    for (const p of pl.pelos) {
      const s = mix(S0, 1, p.s);
      const q = en(s), q2 = en(Math.min(1, s + 0.02));
      const dir = Math.atan2(q2[1] - q[1], q2[0] - q[0]);
      const g = grosor(s);
      const x = q[0] + Math.cos(dir + Math.PI / 2) * p.lado * g * 0.6;
      const y = q[1] + Math.sin(dir + Math.PI / 2) * p.lado * g * 0.6;
      const b = dir + p.lado * 0.75 + p.gira; // los pelos se abren hacia fuera y hacia la punta
      const k = 0.5 + 0.5 * Math.abs(p.lado);
      c.strokeStyle = css(mezcla(hex('#F0A070'), hex('#FFE6B0'), p.tono), 0.28 + 0.3 * k);
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(b) * p.l * k, y + Math.sin(b) * p.l * k);
      c.stroke();
    }
  }
  limpio(c);
};

// las sombras largas de lo que hay en el suelo (los trozos de la taza): una mancha que viene hacia nosotros
export const sombraLarga = (c: CanvasRenderingContext2D, x: number, y: number, ancho: number, largo: number, fuerza: number, col: RGB = hex('#1C0C16')) => {
  const dx = x - SOL_SUELO[0], dy = y - SOL_SUELO[1];
  const d = Math.hypot(dx, dy);
  const u: P = [dx / d, dy / d];
  limpio(c);
  c.globalAlpha = clamp(fuerza);
  c.fillStyle = css(col);
  c.setTransform(u[0], u[1], -u[1], u[0], x, y);
  c.beginPath();
  c.ellipse(largo / 2, 0, largo / 2, ancho / 2, 0, 0, Math.PI * 2);
  c.fill();
  limpio(c);
};
