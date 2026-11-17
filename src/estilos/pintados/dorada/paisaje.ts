import {clamp, mix, rng, ruido} from '../../../comun/curvas';
import {HORIZ, SOL, colorCielo} from './cielo';
import {aclara, camino, css, ctx, hex, lienzo, limpio, mezcla, pincelada, type P, type RGB} from './pincel';

// EL PAISAJE DE LA HORA DORADA: lo que se ve desde el porche. Las colinas lejanas en capas de bruma (cuanto más lejos, más rosas y
// más claras; con el filo de la cresta encendido cerca del sol), la neblina dorada del valle, los cipreses a la izquierda y los pinos
// de copa plana a la derecha (a contraluz, con su borde de luz), y el prado que baja hacia el porche con un camino claro que lleva al
// sol, unos arbustos y dos pacas de heno. Todo fijo y pintado una vez, salvo los árboles (que se mecen) y la hierba alta del borde
// del porche, que se pinta en cada cuadro.

const dist = (x: number, y: number) => Math.hypot(x - SOL[0], y - SOL[1]);
const cerca = (x: number, y: number, r = 360) => Math.exp(-dist(x, y) / r);

// las crestas
export const crestaA = (x: number) =>
  HORIZ + 2 - 16 * Math.exp(-(((x - 230) / 120) ** 2)) - 11 * Math.exp(-(((x - 880) / 95) ** 2)) + 3 * Math.sin(x / 23) + 2 * Math.sin(x / 9.7);
export const crestaB = (x: number) =>
  1012 - 150 * Math.exp(-(((x + 30) / 250) ** 2)) - 26 * Math.exp(-(((x - 250) / 110) ** 2)) - 158 * Math.exp(-(((x - 1110) / 270) ** 2)) -
  24 * Math.exp(-(((x - 830) / 90) ** 2)) + 3 * Math.sin(x / 17);
export const crestaC = (x: number) => 1046 + 10 * Math.sin(x / 140 + 1) + 6 * Math.sin(x / 47);

// el camino: su centro y su ancho a cada altura (se estrecha hacia el sol)
const camCentro = (y: number) => {
  const k = clamp((y - 1040) / 520);
  return mix(694, 836, k ** 1.3) + 18 * Math.sin(k * 5.5);
};
const camAncho = (y: number) => mix(8, 220, clamp((y - 1040) / 520) ** 1.6);

// ---------------------------------------------------------------- la tierra fija: crestas, neblina, prado, camino, arbustos
let TIERRA: HTMLCanvasElement | null = null;
export const tierra = () => {
  if (TIERRA) return TIERRA;
  const cv = lienzo(1080, 1920);
  const c = ctx(cv);
  const r = rng(21);
  const relleno = (cresta: (x: number) => number, hasta: number, col: (y: number) => RGB) => {
    limpio(c);
    const p = new Path2D();
    p.moveTo(-10, hasta);
    for (let x = -10; x <= 1090; x += 6) p.lineTo(x, cresta(x));
    p.lineTo(1090, hasta);
    p.closePath();
    const g = c.createLinearGradient(0, 860, 0, hasta);
    for (let k = 0; k <= 1; k += 0.25) g.addColorStop(k, css(col(mix(860, hasta, k))));
    c.fillStyle = g;
    c.fill(p);
  };
  // pinceladas que siguen la cresta, entre la cresta y «grueso» más abajo
  const pinceladasCresta = (cresta: (x: number) => number, grueso: number, n: number, col: (x: number, y: number, k: number) => RGB, lw: [number, number]) => {
    for (let i = 0; i < n; i++) {
      const x = r() * 1100 - 10;
      const k = Math.pow(r(), 0.85);
      const y = cresta(x) + 3 + k * grueso;
      const pend = (cresta(x + 6) - cresta(x - 6)) / 12;
      pincelada(c, x, y, Math.atan(pend) * (1 - k * 0.7) + (r() - 0.5) * 0.08, lw[0] + r() * (lw[1] - lw[0]), 6 + r() * 7, col(x, y, k), 0.6 + r() * 0.35, i, 0.5);
    }
  };
  const filo = (cresta: (x: number) => number, n: number, radio: number, fuerza: number) => {
    for (let i = 0; i < n; i++) {
      const x = r() * 1100 - 10;
      const y = cresta(x) + 1.5;
      const k = cerca(x, y, radio) * fuerza;
      if (k < 0.06) continue;
      const pend = (cresta(x + 5) - cresta(x - 5)) / 10;
      pincelada(c, x, y, Math.atan(pend), 18 + r() * 30, 3 + r() * 2.5, mezcla(hex('#FFB866'), hex('#FFF0BE'), clamp(k)), clamp(k * 1.2), i, 0.2);
    }
  };

  // la cresta más lejana: casi del color del cielo, un poco más rosa y más oscura
  const brumaA = (x: number, y: number): RGB => mezcla(aclara(colorCielo(x, HORIZ - 6), -0.1), hex('#C47A92'), 0.35 + 0.25 * (1 - cerca(x, y, 300)));
  relleno(crestaA, 1120, (y) => mezcla(brumaA(540, y), hex('#B06A8A'), clamp((y - HORIZ) / 140)));
  pinceladasCresta(crestaA, 70, 700, (x, y, k) => aclara(mezcla(brumaA(x, y), hex('#A8668A'), k * 0.5), (r() - 0.5) * 0.08), [24, 60]);
  filo(crestaA, 260, 260, 1);
  // árboles diminutos en la cresta lejana (la escala del paisaje)
  for (let i = 0; i < 26; i++) {
    const x = 740 + r() * 340;
    const y = crestaA(x) + 2;
    const h = 7 + r() * 9;
    pincelada(c, x, y - h / 2, -Math.PI / 2, h, 4 + r() * 3, mezcla(hex('#A35E86'), brumaA(x, y), 0.3), 0.85, i, 0.2);
  }
  // la neblina dorada del valle, entre las dos crestas
  for (let i = 0; i < 380; i++) {
    const x = r() * 1120 - 20;
    const y = HORIZ + 8 + r() * 80;
    const k = cerca(x, y, 420);
    pincelada(c, x, y, (r() - 0.5) * 0.04, 60 + r() * 120, 8 + r() * 10, mezcla(hex('#E7949A'), hex('#FFD596'), k), 0.18 + 0.3 * k, i, 0.3);
  }
  // la segunda cresta, malva
  const malva = (x: number, y: number): RGB => mezcla(hex('#93597F'), hex('#C77E8C'), 0.55 * cerca(x, y, 300));
  relleno(crestaB, 1200, (y) => mezcla(hex('#8E5680'), hex('#6E3F66'), clamp((y - 900) / 220)));
  pinceladasCresta(crestaB, 150, 1100, (x, y, k) => aclara(mezcla(malva(x, y), hex('#64395F'), k * 0.65), (r() - 0.5) * 0.09), [26, 70]);
  filo(crestaB, 340, 420, 0.95);

  // el prado: lomas que bajan hacia el porche, cada una con su cresta encendida (la hierba a contraluz) y su sombra debajo; de lejos,
  // rosas y con bruma; de cerca, ciruela oscuro. Entre loma y loma, setos oscuros.
  const LOMAS: {cresta: (x: number) => number; arriba: RGB; abajo: RGB; luz: number}[] = [
    {cresta: crestaC, arriba: hex('#B37C92'), abajo: hex('#8E5876'), luz: 1},
    {cresta: (x) => 1128 + 26 * Math.sin(x / 210 + 2) + 9 * Math.sin(x / 71), arriba: hex('#9C6482'), abajo: hex('#6E405F'), luz: 0.9},
    {cresta: (x) => 1252 + 36 * Math.sin(x / 260 + 0.5) + 11 * Math.sin(x / 90), arriba: hex('#83506C'), abajo: hex('#56304A'), luz: 0.8},
    {cresta: (x) => 1398 + 28 * Math.sin(x / 240 + 3) + 9 * Math.sin(x / 80), arriba: hex('#6A3E57'), abajo: hex('#43253A'), luz: 0.7},
  ];
  const calidos: RGB[] = [hex('#9A6458'), hex('#7A4A66'), hex('#B0707A'), hex('#6A4058')];
  LOMAS.forEach((lm, n) => {
    const hasta = n < 3 ? LOMAS[n + 1].cresta(540) + 120 : 1640;
    const alto = hasta - lm.cresta(540);
    relleno(lm.cresta, 1700, (y) => mezcla(lm.arriba, lm.abajo, clamp((y - lm.cresta(540)) / alto)));
    // los campos: pinceladas que siguen la loma
    for (let i = 0; i < 900; i++) {
      const x = r() * 1100 - 10;
      const k = Math.pow(r(), 1.1);
      const y = lm.cresta(x) + 4 + k * alto;
      const pend = (lm.cresta(x + 6) - lm.cresta(x - 6)) / 12;
      let col = aclara(mezcla(lm.arriba, lm.abajo, k), (r() - 0.5) * 0.12);
      if (r() < 0.25) col = mezcla(col, calidos[Math.floor(r() * 4)], 0.3);
      const vert = n === 3 && r() < 0.5; // en la loma de cerca, hierba de pie
      const ang = vert ? -Math.PI / 2 + (r() - 0.5) * 0.6 : Math.atan(pend) * (1 - k * 0.5) + (r() - 0.5) * 0.12;
      pincelada(c, x, y, ang, vert ? 14 + r() * 18 : 26 + r() * 50, 6 + r() * 6 + n * 1.5, col, 0.6 + r() * 0.35, i, 0.45);
    }
    // la cresta encendida: la hierba de arriba con el sol detrás
    for (let i = 0; i < 380; i++) {
      const x = r() * 1100 - 10;
      const y = lm.cresta(x) + 2 + r() * 5;
      const kk = (0.35 + 0.65 * cerca(x, y, 520)) * lm.luz;
      const col = mezcla(hex('#E8866A'), hex('#FFE2A0'), cerca(x, y, 420) * (0.6 + r() * 0.4));
      if (r() < 0.55) {
        pincelada(c, x, y - 3, -Math.PI / 2 + (r() - 0.5) * 0.7, 8 + r() * 12, 2.5 + r() * 2, col, 0.85 * kk, i, 0.2);
      } else {
        const pend = (lm.cresta(x + 5) - lm.cresta(x - 5)) / 10;
        pincelada(c, x, y, Math.atan(pend), 20 + r() * 34, 3 + r() * 2.5, col, 0.75 * kk, i, 0.2);
      }
    }
    // un seto a lo largo de la cresta (con huecos)
    if (n === 1 || n === 2) {
      for (let i = 0; i < 260; i++) {
        const x = r() * 1100 - 10;
        if (Math.sin(x / (60 + n * 25) + n * 2) < -0.2) continue;
        const y = lm.cresta(x) - 4 - r() * (10 + n * 4);
        let col = mezcla(hex('#3C2036'), hex('#53304C'), r());
        if (r() < 0.3) col = mezcla(col, hex('#FFB870'), 0.45 * cerca(x, y, 600) + 0.12);
        pincelada(c, x, y, r() * 6.28, 10 + r() * 10 + n * 2, 6 + r() * 5 + n, col, 0.92, i, 0.4);
      }
    }
  });
  // el camino claro que lleva hacia el sol
  {
    limpio(c);
    const izq: P[] = [], der: P[] = [];
    for (let y = 1036; y <= 1600; y += 8) {
      izq.push([camCentro(y) - camAncho(y) / 2, y]);
      der.push([camCentro(y) + camAncho(y) / 2, y]);
    }
    const p = camino([...izq, ...der.reverse()]);
    const g = c.createLinearGradient(0, 1036, 0, 1600);
    g.addColorStop(0, css(hex('#FFD9A0')));
    g.addColorStop(0.25, css(hex('#E2A483')));
    g.addColorStop(1, css(hex('#A0645A')));
    c.fillStyle = g;
    c.fill(p);
    c.save();
    c.clip(p);
    for (let i = 0; i < 700; i++) {
      const y = 1036 + Math.pow(r(), 1.2) * 564;
      const x = camCentro(y) + (r() - 0.5) * camAncho(y) * 1.05;
      const k = clamp((y - 1036) / 560);
      let col = mezcla(hex('#F7C696'), hex('#9C5E58'), k ** 0.8);
      if (r() < 0.35) col = mezcla(col, hex('#FFE2A8'), 0.5 * (1 - k)); // el brillo del cielo en la tierra
      col = aclara(col, (r() - 0.5) * 0.1);
      const pend = (camCentro(y + 5) - camCentro(y - 5)) / 10;
      pincelada(c, x, y, Math.atan2(1, pend) + (r() - 0.5) * 0.4 + (r() < 0.5 ? Math.PI / 2 : 0), mix(10, 40, k), mix(4, 11, k), col, 0.7, i, 0.5);
    }
    c.restore();
    // la hierba que se mete en los bordes del camino
    for (let i = 0; i < 260; i++) {
      const y = 1080 + r() * 500;
      const lado = r() < 0.5 ? -1 : 1;
      const x = camCentro(y) + (lado * camAncho(y)) / 2 + (r() - 0.5) * 16;
      const k = clamp((y - 1036) / 560);
      pincelada(c, x, y, -Math.PI / 2 + (r() - 0.5) * 0.6, mix(8, 30, k), mix(3, 8, k), aclara(mezcla(hex('#9C6482'), hex('#43253A'), clamp((y - 1050) / 520)), (r() - 0.5) * 0.14), 0.8, i, 0.4);
    }
  }
  // los arbustos y las pacas de heno, a contraluz
  const mata = (cx: number, cy: number, rx: number, ry: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, s = Math.sqrt(r());
      const x = cx + Math.cos(a) * rx * s, y = cy + Math.sin(a) * ry * s;
      const arriba = clamp((cy - y) / ry);
      let col = mezcla(hex('#3E2236'), hex('#5D3352'), r() * 0.6);
      if (arriba > 0.6 && r() < 0.6) col = mezcla(col, hex('#FFB466'), 0.5 * arriba);
      pincelada(c, x, y, r() * 6.28, 12 + r() * 14, 7 + r() * 6, col, 0.9, i, 0.4);
    }
  };
  mata(210, 1240, 80, 30, 120);
  mata(310, 1262, 50, 22, 70);
  mata(1040, 1372, 70, 36, 120);
  mata(560, 1120, 46, 14, 60);
  const paca = (cx: number, cy: number, rr: number) => {
    limpio(c);
    c.fillStyle = css(hex('#4A2A35'));
    c.beginPath();
    c.ellipse(cx, cy, rr, rr * 0.82, 0, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, s = 0.25 + r() * 0.7;
      const col = mezcla(hex('#5A3440'), hex('#7A4A48'), r());
      pincelada(c, cx + Math.cos(a) * rr * s, cy + Math.sin(a) * rr * 0.82 * s, a + Math.PI / 2, 10 + r() * 12, 4 + r() * 3, col, 0.8, i, 0.5);
    }
    for (let i = 0; i < 30; i++) {
      const a = -Math.PI * (0.15 + r() * 0.75) + (cx < SOL[0] ? 0.3 : -0.3);
      pincelada(c, cx + Math.cos(a) * rr * 0.98, cy + Math.sin(a) * rr * 0.8, a + Math.PI / 2, 10 + r() * 10, 2.5 + r() * 1.5, hex('#FFC57A'), 0.85, i, 0.2);
    }
    // su sombra larga hacia delante (el sol está detrás)
    limpio(c);
    c.globalAlpha = 0.35;
    c.fillStyle = css(hex('#2E1828'));
    c.beginPath();
    c.ellipse(cx + (cx - SOL[0]) * 0.08, cy + rr * 0.9 + 18, rr * 0.8, 16, 0, 0, Math.PI * 2);
    c.fill();
    limpio(c);
  };
  paca(940, 1178, 30);
  paca(1018, 1190, 26);
  limpio(c);
  TIERRA = cv;
  return cv;
};

// ---------------------------------------------------------------- los árboles a contraluz (cada uno en su lienzo, para mecerlo)
type Arbol = {lienzo: HTMLCanvasElement; bx: number; by: number; ox: number; oy: number; alto: number; fase: number; amp: number};
let ARBOLES: Arbol[] | null = null;
const OSCURO = hex('#3F2343');
const OSCURO2 = hex('#56305A');
const BORDE_LUZ = hex('#FFC56E');

const cipres = (alto: number, ancho: number, semilla: number): Omit<Arbol, 'bx' | 'by' | 'fase' | 'amp'> => {
  const r = rng(semilla);
  const M = 30;
  const cv = lienzo(ancho + 2 * M, alto + 2 * M);
  const c = ctx(cv);
  const ox = cv.width / 2, oy = alto + M; // la base
  const w = (s: number) => ancho * 0.5 * Math.sin(Math.PI * Math.min(1, s ** 0.75)) ** 0.8 * (s > 0.92 ? (1 - s) / 0.08 : 1);
  const p = new Path2D();
  for (let i = 0; i <= 30; i++) {
    const s = i / 30;
    p.lineTo(ox - w(s) * (1 + 0.08 * Math.sin(s * 23)), oy - s * alto);
  }
  for (let i = 30; i >= 0; i--) {
    const s = i / 30;
    p.lineTo(ox + w(s) * (1 + 0.08 * Math.sin(s * 19 + 1)), oy - s * alto);
  }
  p.closePath();
  c.fillStyle = css(OSCURO);
  c.fill(p);
  // las pinceladas del follaje: de pie, en cascada
  for (let i = 0; i < Math.round(alto * 1.2); i++) {
    const s = r();
    const x = ox + (r() - 0.5) * 2 * w(s) * 0.95;
    const y = oy - s * alto;
    const lado = (x - ox) / Math.max(1, w(s));
    let col = mezcla(OSCURO, OSCURO2, r() * 0.7);
    if (lado > 0.55 && r() < 0.7) col = mezcla(col, BORDE_LUZ, 0.35 + 0.4 * (lado - 0.55)); // el lado del sol
    pincelada(c, x, y, -Math.PI / 2 + (r() - 0.5) * 0.6, 14 + r() * 16, 5 + r() * 4, col, 0.9, i, 0.4);
  }
  // el borde de luz por el lado del sol
  for (let i = 0; i < 40; i++) {
    const s = 0.05 + r() * 0.9;
    pincelada(c, ox + w(s) * 0.97, oy - s * alto, -Math.PI / 2 - 0.15, 10 + r() * 12, 2.5 + r() * 1.5, mezcla(BORDE_LUZ, hex('#FFE9B0'), r()), 0.85, i, 0.2);
  }
  limpio(c);
  return {lienzo: cv, ox, oy, alto};
};
const pino = (alto: number, copa: number, semilla: number): Omit<Arbol, 'bx' | 'by' | 'fase' | 'amp'> => {
  const r = rng(semilla);
  const M = 30;
  const hc = copa * 0.3;
  const cv = lienzo(copa + 2 * M, alto + hc + 2 * M);
  const c = ctx(cv);
  const ox = cv.width / 2, oy = alto + hc + M;
  // el tronco, un poco torcido, y dos ramas que abren
  c.strokeStyle = css(OSCURO);
  c.lineCap = 'round';
  const tope: P = [ox + copa * 0.06, oy - alto];
  c.lineWidth = 11;
  c.beginPath();
  c.moveTo(ox, oy);
  c.quadraticCurveTo(ox - copa * 0.08, oy - alto * 0.55, tope[0], tope[1]);
  c.stroke();
  c.lineWidth = 6;
  for (const [dx, dy] of [[-copa * 0.3, -hc * 0.2], [copa * 0.28, -hc * 0.35], [-copa * 0.05, -hc * 0.45]] as P[]) {
    c.beginPath();
    c.moveTo(tope[0], tope[1] + 14);
    c.quadraticCurveTo(tope[0] + dx * 0.4, tope[1] + dy * 0.2, tope[0] + dx, tope[1] + dy);
    c.stroke();
  }
  // la copa plana: muchas manchas cortas, más ancha por arriba y casi recta por abajo
  const cy = oy - alto - hc * 0.45;
  for (let i = 0; i < Math.round(copa * 1.6); i++) {
    const u = (r() - 0.5) * 2;
    const env = Math.sqrt(Math.max(0, 1 - u * u));
    const v = (r() - 0.65) * hc * env * 1.1;
    const x = ox + u * copa * 0.5, y = cy + v;
    const abajo = clamp((v + hc * 0.3) / (hc * 0.5));
    let col = mezcla(OSCURO, OSCURO2, r() * 0.6);
    if (abajo > 0.55 && r() < 0.55 && u < 0.4) col = mezcla(col, BORDE_LUZ, 0.4 * abajo); // la panza de la copa, encendida
    pincelada(c, x, y, (r() - 0.5) * 0.5, 16 + r() * 18, 7 + r() * 5, col, 0.92, i, 0.4);
  }
  for (let i = 0; i < 40; i++) {
    const u = (r() - 0.5) * 1.9;
    const env = Math.sqrt(Math.max(0, 1 - u * u));
    pincelada(c, ox + u * copa * 0.5, cy + hc * 0.32 * env + 2, (r() - 0.5) * 0.2, 12 + r() * 14, 2.5 + r() * 1.5, mezcla(BORDE_LUZ, hex('#FFE6A6'), r()), 0.9, i, 0.2);
  }
  limpio(c);
  return {lienzo: cv, ox, oy, alto: alto + hc};
};
const arboles = () => {
  if (ARBOLES) return ARBOLES;
  const en = (a: Omit<Arbol, 'bx' | 'by' | 'fase' | 'amp'>, bx: number, fase: number, amp: number): Arbol => ({...a, bx, by: crestaB(bx) + 10, fase, amp});
  ARBOLES = [
    en(cipres(250, 48, 31), 22, 0.3, 0.012),
    en(cipres(190, 40, 32), 74, 1.7, 0.014),
    en(cipres(118, 30, 33), 116, 2.9, 0.016),
    en(pino(120, 236, 34), 950, 0.9, 0.006),
    en(pino(88, 160, 35), 1070, 2.2, 0.007),
    en(cipres(70, 22, 36), 812, 1.2, 0.014),
  ];
  return ARBOLES;
};
export const pintarArboles = (c: CanvasRenderingContext2D, t: number) => {
  for (const a of arboles()) {
    // se mecen desde la base: una inclinación pequeña que va y viene
    const k = a.amp * Math.sin(t * 1.1 + a.fase) + a.amp * 0.5 * ruido(t * 0.6 + a.fase, 4);
    c.setTransform(1, 0, -k, 1, a.bx + k * a.by, 0);
    c.globalAlpha = 1;
    c.drawImage(a.lienzo, -a.ox, a.by - a.oy);
  }
  limpio(c);
};

// ---------------------------------------------------------------- la hierba alta del borde del porche (se mece)
type Brizna = {x: number; base: number; h: number; inclina: number; ancho: number; fase: number; espiga: boolean; tono: number};
const BRIZNAS: Brizna[] = (() => {
  const r = rng(51);
  const out: Brizna[] = [];
  const tramo = (x0: number, x1: number, n: number, h0: number, h1: number) => {
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0);
      out.push({x, base: 1552 + r() * 8, h: h0 + r() * (h1 - h0), inclina: (r() - 0.5) * 0.5 + (x - SOL[0]) * 0.0003, ancho: 4 + r() * 4, fase: r() * 6.28, espiga: r() < 0.35, tono: r()});
    }
  };
  tramo(-10, 170, 70, 70, 190);
  tramo(150, 650, 70, 40, 120);
  tramo(880, 1090, 70, 70, 200);
  return out;
})();
export const pintarHierbaMedia = (c: CanvasRenderingContext2D, t: number) => {
  limpio(c);
  for (const b of BRIZNAS) {
    const mece = b.inclina + 0.07 * Math.sin(t * 1.5 + b.fase + b.x * 0.01) + 0.05 * ruido(t * 0.8 + b.x * 0.02, 6);
    const tip: P = [b.x + Math.sin(mece) * b.h, b.base - Math.cos(mece) * b.h];
    const ctrl: P = [b.x + Math.sin(mece * 0.4) * b.h * 0.5, b.base - b.h * 0.55];
    // la brizna: oscura, que se afila
    c.fillStyle = css(mezcla(hex('#33192C'), hex('#4A2640'), b.tono));
    c.beginPath();
    c.moveTo(b.x - b.ancho / 2, b.base);
    c.quadraticCurveTo(ctrl[0] - b.ancho * 0.3, ctrl[1], tip[0], tip[1]);
    c.quadraticCurveTo(ctrl[0] + b.ancho * 0.3, ctrl[1], b.x + b.ancho / 2, b.base);
    c.fill();
    // el filo encendido hacia el sol, más fuerte arriba
    const k = 0.45 + 0.55 * cerca(tip[0], tip[1], 600);
    c.strokeStyle = css(mezcla(hex('#FF9F5A'), hex('#FFE3A0'), k), 0.75 * k + 0.2);
    c.lineWidth = 1.6;
    c.beginPath();
    const m: P = [mix(ctrl[0], tip[0], 0.3), mix(ctrl[1], tip[1], 0.3)];
    c.moveTo(m[0], m[1]);
    c.quadraticCurveTo(mix(m[0], tip[0], 0.5) + 1, mix(m[1], tip[1], 0.5), tip[0], tip[1]);
    c.stroke();
    if (b.espiga) {
      // la espiga, que brilla a contraluz
      const a = Math.atan2(tip[1] - ctrl[1], tip[0] - ctrl[0]);
      c.save();
      c.translate(tip[0], tip[1]);
      c.rotate(a);
      c.fillStyle = css(mezcla(hex('#FFB86A'), hex('#FFE8B0'), k), 0.85);
      c.beginPath();
      c.ellipse(-6, 0, 10, 3.2, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }
  limpio(c);
};

// ---------------------------------------------------------------- la hierba alta de delante: desenfocada, enmarca las esquinas
const DELANTE: Brizna[] = (() => {
  const r = rng(57);
  const out: Brizna[] = [];
  const tramo = (x0: number, x1: number, n: number, h0: number, h1: number) => {
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0);
      // más alta cuanto más cerca del borde del cuadro
      const borde = 1 - Math.min(x, 1080 - x) / 300;
      out.push({x, base: 1935, h: (h0 + r() * (h1 - h0)) * (0.55 + 0.45 * clamp(borde)), inclina: (x < 540 ? 0.12 : -0.12) + (r() - 0.5) * 0.4, ancho: 8 + r() * 9, fase: r() * 6.28, espiga: r() < 0.4, tono: r()});
    }
  };
  tramo(-30, 300, 46, 160, 420);
  tramo(780, 1110, 46, 160, 420);
  tramo(300, 780, 22, 50, 120);
  return out;
})();
let CAPA_DELANTE: HTMLCanvasElement | null = null;
export const pintarHierbaDelante = (c: CanvasRenderingContext2D, t: number) => {
  CAPA_DELANTE ??= lienzo(1080, 1920);
  const d = ctx(CAPA_DELANTE);
  limpio(d);
  d.clearRect(0, 1300, 1080, 620);
  for (const b of DELANTE) {
    const mece = b.inclina + 0.06 * Math.sin(t * 1.2 + b.fase + b.x * 0.004) + 0.05 * ruido(t * 0.6 + b.x * 0.01, 9);
    const tip: P = [b.x + Math.sin(mece) * b.h, b.base - Math.cos(mece) * b.h];
    const ctrl: P = [b.x + Math.sin(mece * 0.35) * b.h * 0.5, b.base - b.h * 0.55];
    d.fillStyle = css(mezcla(hex('#170811'), hex('#2A1222'), b.tono));
    d.beginPath();
    d.moveTo(b.x - b.ancho / 2, b.base);
    d.quadraticCurveTo(ctrl[0] - b.ancho * 0.25, ctrl[1], tip[0], tip[1]);
    d.quadraticCurveTo(ctrl[0] + b.ancho * 0.25, ctrl[1], b.x + b.ancho / 2, b.base);
    d.fill();
    const k = 0.35 + 0.65 * cerca(tip[0], tip[1], 900);
    d.strokeStyle = css(mezcla(hex('#E0784E'), hex('#FFD48E'), k), 0.6 * k + 0.15);
    d.lineWidth = 2.4;
    d.beginPath();
    const m: P = [mix(b.x, tip[0], 0.45), mix(b.base, tip[1], 0.45)];
    d.moveTo(m[0], m[1]);
    d.quadraticCurveTo(mix(m[0], tip[0], 0.5) + 2, mix(m[1], tip[1], 0.5), tip[0], tip[1]);
    d.stroke();
    if (b.espiga) {
      const a = Math.atan2(tip[1] - ctrl[1], tip[0] - ctrl[0]);
      d.save();
      d.translate(tip[0], tip[1]);
      d.rotate(a);
      for (let j = 0; j < 5; j++) {
        d.fillStyle = css(mezcla(hex('#FFA060'), hex('#FFE6A8'), k), 0.75);
        d.beginPath();
        d.ellipse(-8 - j * 9, (j % 2 ? 1 : -1) * 3.5, 8, 3.6, (j % 2 ? 1 : -1) * 0.35, 0, Math.PI * 2);
        d.fill();
      }
      d.restore();
    }
  }
  limpio(c);
  c.filter = 'blur(2.5px)';
  c.drawImage(CAPA_DELANTE, 0, 0);
  limpio(c);
};
