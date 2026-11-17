import {rng} from '../../../comun/curvas';
import {BORDE, MESA_Y, SUELO, type P} from '../../gato/escena';
import {
  CARBON, CAOLIN, OCRE_AMARILLO, OCRE_MARRON, OCRE_ROJO, OCRE_ROJO_OSCURO, type Ctx, camino, cajaDe, capa, fino, lienzo, ctx, mano, nube,
  remuestrea, soplar, suave, trazoVivo,
} from './pigmento';
import {BULTO_CABALLO, H, W, perlin} from './roca';

// LO QUE ESTÁ PINTADO EN LA PARED Y NO SE MUEVE: la mesa hecha losa de piedra sobre dos piedras de pie
// (un dolmen pintado), la raya del suelo donde se rompe la vasija, las manos en negativo (pigmento soplado alrededor de una mano),
// un caballito y un ciervo pequeños y lejos (el caballito, sobre un bulto de la roca, como hacían), los puntos de dedo en filas y
// las rayas de carbón. Se pinta una vez en su lienzo de pintura y cada cuadro se copia debajo de lo que se mueve.

let FIJO: HTMLCanvasElement | null = null;

const r = rng(2024);
const temblon = (pts: P[], a: number, s: number): P[] => pts.map(([x, y], i) => [x + a * perlin(i * 0.37 + s, 1.3), y + a * perlin(i * 0.37 + s, 7.9)]);

// la losa y sus dos piedras de pie
const LOSA: P[] = [[38, MESA_Y + 3], [200, MESA_Y - 1], [420, MESA_Y + 1], [600, MESA_Y - 1], [BORDE + 2, MESA_Y], [BORDE + 8, MESA_Y + 30],
  [BORDE - 2, MESA_Y + 66], [560, MESA_Y + 74], [330, MESA_Y + 68], [130, MESA_Y + 76], [44, MESA_Y + 60], [28, MESA_Y + 30]];
const PIEDRA_IZQ: P[] = [[96, MESA_Y + 70], [196, MESA_Y + 72], [206, 1300], [214, SUELO + 2], [82, SUELO + 4], [88, 1320]];
const PIEDRA_DER: P[] = [[548, MESA_Y + 72], [652, MESA_Y + 70], [658, 1340], [668, SUELO + 2], [536, SUELO + 4], [544, 1300]];
// la raya del suelo
const SUELO_PTS: P[] = Array.from({length: 28}, (_, i) => [-10 + i * 41, SUELO + 6 + 7 * perlin(i * 0.5, 4.2)] as P);

// el caballito (mirando a la izquierda), en px de su dibujo; se pone en el bulto de la roca
const CABALLO: P[] = [
  [-120, 6], [-112, -14], [-98, -36], [-86, -52], [-78, -66], [-70, -52], [-50, -58], [-24, -48], [8, -40], [44, -42], [80, -36],
  [104, -22], [112, -6], [110, 14], [104, 36], [100, 62], [104, 84], [90, 86], [86, 60], [72, 34], [40, 44], [0, 48], [-36, 40],
  [-46, 60], [-46, 86], [-60, 86], [-62, 56], [-70, 30], [-86, 22], [-102, 24], [-118, 22],
];
const CABALLO_PIERNA_LEJOS: P[][] = [[[-28, 40], [-24, 84]], [[60, 38], [70, 84]]];
const CABALLO_CRIN: P[] = [[-86, -50], [-64, -56], [-40, -54], [-16, -46]];
const CABALLO_COLA: P[] = [[112, -6], [128, 10], [134, 36], [130, 60]];

// el ciervo (mirando a la derecha), en px de su dibujo
const CIERVO: P[] = [
  [-86, -6], [-60, -16], [-20, -18], [24, -16], [52, -22], [66, -44], [74, -62], [88, -64], [100, -56], [112, -50], [102, -42],
  [88, -38], [80, -18], [72, 6], [64, 22], [58, 30], [60, 70], [52, 70], [48, 32], [20, 30], [-30, 30], [-50, 30], [-52, 70], [-60, 70],
  [-64, 28], [-84, 14],
];
const CIERVO_PIERNA_LEJOS: P[][] = [[[40, 30], [34, 68]], [[-40, 30], [-44, 68]]];
const CIERVO_CUERNA: P[][] = [
  [[82, -64], [74, -96], [62, -124], [52, -146]], [[76, -92], [92, -110]], [[66, -118], [80, -138]], [[64, -122], [46, -128]],
  [[90, -62], [96, -92], [106, -116]], [[96, -90], [112, -98]],
];

// el bisonte viejo (mirando a la izquierda): la joroba alta, la cabeza baja con su barba y sus cuernos
const BISONTE: P[] = [
  [-150, 10], [-148, -20], [-132, -44], [-110, -70], [-74, -96], [-30, -102], [20, -84], [70, -66], [118, -54], [150, -34], [162, -6],
  [156, 30], [146, 56], [146, 92], [128, 92], [124, 60], [96, 52], [40, 56], [-20, 58], [-50, 62], [-56, 96], [-74, 96], [-80, 64],
  [-104, 54], [-122, 60], [-140, 40],
];
const BISONTE_LINEAS: P[][] = [
  [[-136, -40], [-150, -60], [-140, -76]], [[-120, -50], [-118, -74], [-104, -84]], // los cuernos
  [[-30, 58], [-26, 94]], [[110, 56], [116, 92]], // las patas de lejos
  [[162, -6], [176, 20], [172, 52]], // la cola
];

const enDibujo = (pts: P[], cx: number, cy: number, esc: number, ang = 0): P[] =>
  pts.map(([x, y]) => [cx + esc * (x * Math.cos(ang) - y * Math.sin(ang)), cy + esc * (x * Math.sin(ang) + y * Math.cos(ang))]);

const contorno = (c: Ctx, pts: P[], w: number, s: number) => {
  c.strokeStyle = CARBON;
  trazoVivo(c, remuestrea(pts, 5), (u) => w * (0.7 + 0.45 * (0.5 + 0.5 * perlin(u * 9 + s, 2.2))));
};

const manoNegativa = (c: Ctx, cx: number, cy: number, ang: number, esc: number, color: string, semilla: number) => {
  const caja: [number, number, number, number] = [cx - 200 * esc, cy - 210 * esc, cx + 200 * esc, cy + 210 * esc];
  // el centro del soplido, hacia los dedos
  const [ox, oy] = [cx + Math.sin(ang) * 14 * esc, cy - Math.cos(ang) * 14 * esc];
  soplar(c, caja, (x) => {
    nube(x, ox, oy, 155 * esc, color, semilla, 11, 1);
    nube(x, ox, oy, 120 * esc, color, semilla + 1, 7, 1);
    nube(x, ox, oy, 95 * esc, color, semilla + 2, 5, 1);
    // las motas que salen más lejos del soplido
    const rr = rng(semilla + 5);
    x.fillStyle = color;
    for (let k = 0; k < 90; k++) {
      const a = rr() * Math.PI * 2, d = (115 + rr() * 85) * esc;
      x.globalAlpha = 0.5 + rr() * 0.5;
      x.beginPath();
      x.arc(ox + Math.cos(a) * d, oy + Math.sin(a) * d, 2 + rr() * 4, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
  }, 6);
  // y la mano que tapaba la piedra: su silueta queda limpia (estaba apoyada en la pared)
  capa(c, caja, (x) => {
    x.fillStyle = '#000';
    x.fill(mano(cx, cy, ang, esc, semilla));
  }, {radio: 1.6, modo: 'destination-out'});
};

const puntos = (c: Ctx, pts: P[], rad: number, color: string, semilla: number) => {
  const rr = rng(semilla);
  fino(c, cajaDe(pts, rad * 2), (x) => {
    x.fillStyle = color;
    for (const [px, py] of pts) {
      x.beginPath();
      x.ellipse(px + (rr() - 0.5) * 4, py + (rr() - 0.5) * 4, rad * (0.85 + rr() * 0.3), rad * (0.75 + rr() * 0.3), rr() * 3, 0, Math.PI * 2);
      x.fill();
    }
  }, 2.6);
};

const rayas = (c: Ctx, lineas: P[][], w: number, color: string, alfa = 1) => {
  const todas = lineas.flat();
  fino(c, cajaDe(todas, w * 2), (x) => {
    x.strokeStyle = color;
    lineas.forEach((l, i) => trazoVivo(x, remuestrea(suave(l, false, 6), 5), (u) => w * (0.55 + 0.6 * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.05))) * (0.9 + 0.2 * perlin(i, 3))));
  }, 1.5, alfa);
};

export const decoradoFijo = (): HTMLCanvasElement => {
  if (FIJO) return FIJO;
  const cv = lienzo();
  const c = ctx(cv);
  c.clearRect(0, 0, W, H);

  // ---- lo más viejo, apagado: un bisonte rojo grande debajo de todo (la pared se pintó muchas veces), mirando a la izquierda
  const [bx, by, be] = [878, 1300, 1.0];
  const bis = suave(enDibujo(BISONTE, bx, by, be), true, 5);
  soplar(c, cajaDe(bis, 30), (x) => {
    x.fillStyle = OCRE_ROJO;
    x.fill(camino(bis));
    nube(x, bx - 60, by - 40, 70, CARBON, 41, 4, 0.5); // la joroba y la cabeza, más oscuras (los bisontes de dos colores)
  }, 10, 0.42, {min: 0.3, semilla: 23});
  fino(c, cajaDe(bis, 60), (x) => {
    contorno(x, bis, 9, 4);
    x.strokeStyle = CARBON;
    for (const l of BISONTE_LINEAS) trazoVivo(x, remuestrea(suave(enDibujo(l, bx, by, be), false, 5), 4), (u) => 8 * (1 - 0.5 * u));
  }, 2, 0.5, {min: 0.25, semilla: 5});

  // ---- las manos en negativo
  manoNegativa(c, 176, 334, -0.3, 1.05, '#bd4526', 31);
  manoNegativa(c, 96, 1712, 0.3, 0.85, CARBON, 47);

  // ---- el caballito, sobre su bulto
  const [hx, hy] = BULTO_CABALLO;
  const cab = suave(enDibujo(CABALLO, hx, hy, 0.95), true, 5);
  soplar(c, cajaDe(cab, 30), (x) => {
    x.fillStyle = OCRE_AMARILLO;
    x.fill(camino(cab));
    // la tripa más clara y el lomo y las patas más rojos (los dos colores de los caballos de las cuevas)
    nube(x, hx - 10, hy + 22, 46, CAOLIN, 3, 4, 0.55);
    nube(x, hx + 40, hy - 26, 50, OCRE_ROJO, 4, 4, 0.5);
  }, 6);
  fino(c, cajaDe(cab, 30), (x) => {
    contorno(x, cab, 9, 1);
    x.strokeStyle = CARBON;
    for (const l of CABALLO_PIERNA_LEJOS) trazoVivo(x, remuestrea(enDibujo(l, hx, hy, 0.95), 5), (u) => 8 * (1 - 0.4 * u));
    // la crin, a pelos cortos, y la cola
    const crin = remuestrea(suave(enDibujo(CABALLO_CRIN, hx, hy, 0.95), false, 6), 7);
    trazoVivo(x, crin, () => 13);
    crin.forEach(([px, py], i) => {
      x.lineWidth = 5;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + 3 + (i % 2) * 3, py - 14 - (i % 3) * 3);
      x.stroke();
    });
    trazoVivo(x, remuestrea(suave(enDibujo(CABALLO_COLA, hx, hy, 0.95), false, 6), 5), (u) => 12 * (1 - 0.6 * u));
    // el ojo y el hocico
    x.fillStyle = CARBON;
    x.beginPath();
    x.arc(hx - 92 * 0.95, hy - 30 * 0.95, 4.5, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.arc(hx - 112 * 0.95, hy + 12 * 0.95, 4, 0, Math.PI * 2);
    x.fill();
  }, 1.4, 1, {min: 0.5, semilla: 13});
  // una fila de puntos rojos bajo el caballito
  puntos(c, Array.from({length: 7}, (_, i) => [hx - 150 + i * 46, hy + 128 + 10 * Math.sin(i * 0.9)] as P), 11, OCRE_ROJO, 61);

  // ---- el ciervo, pequeño y lejos, abajo a la izquierda
  const [dx, dy] = [380, 1726];
  const cie = suave(enDibujo(CIERVO, dx, dy, 0.92), true, 5);
  soplar(c, cajaDe(cie, 30), (x) => {
    x.fillStyle = OCRE_ROJO;
    x.fill(camino(cie));
    nube(x, dx - 6, dy + 14, 34, OCRE_AMARILLO, 8, 3, 0.5);
  }, 5);
  fino(c, cajaDe(cie, 150), (x) => {
    contorno(x, cie, 8, 9);
    x.strokeStyle = CARBON;
    for (const l of CIERVO_PIERNA_LEJOS) trazoVivo(x, remuestrea(enDibujo(l, dx, dy, 0.92), 5), (u) => 6.5 * (1 - 0.3 * u));
    for (const l of CIERVO_CUERNA) trazoVivo(x, remuestrea(suave(enDibujo(l, dx, dy, 0.92), false, 6), 4), (u) => 7 * (1 - 0.55 * u));
    x.fillStyle = CARBON;
    x.beginPath();
    x.arc(dx + 92 * 0.92, dy - 54 * 0.92, 3.6, 0, Math.PI * 2);
    x.fill();
  }, 1.4);

  // ---- puntos y rayas: bajo la losa, en la pared de la derecha y junto al ciervo
  const filas: P[] = [];
  for (let f = 0; f < 3; f++) for (let k = 0; k < 5; k++) filas.push([272 + k * 54 + (f % 2) * 14, 1168 + f * 54]);
  puntos(c, filas, 13, OCRE_ROJO, 71);
  rayas(c, Array.from({length: 6}, (_, i) => [[290 + i * 30, 1380 + 6 * Math.sin(i)], [284 + i * 30 + 4, 1478 - 4 * Math.cos(i * 1.3)]] as P[]), 11, CARBON, 0.92);
  rayas(c, [[[268, 1520], [470, 1512]]], 9, OCRE_ROJO, 0.9);
  puntos(c, Array.from({length: 7}, (_, i) => [1028 + 6 * Math.sin(i * 1.7), 1040 + i * 58] as P), 12, OCRE_ROJO, 81);
  puntos(c, Array.from({length: 5}, (_, i) => [530 + i * 40, 1690 + 8 * Math.sin(i * 2.1)] as P), 10, CARBON, 83);
  puntos(c, Array.from({length: 6}, (_, i) => [872 + i * 24, 936 - 30 * Math.sin((i / 5) * Math.PI)] as P), 10, OCRE_AMARILLO, 87);
  // un signo en forma de escalera, arriba en el centro
  rayas(c, [[[330, 180], [330, 300]], [[372, 176], [374, 296]], ...[0, 1, 2, 3].map((k) => [[330, 196 + k * 30], [374, 194 + k * 30]] as P[])], 8, OCRE_ROJO, 0.95);

  // ---- la mesa: la losa sobre sus dos piedras, en carbón soplado gris y con su contorno
  const losa = suave(temblon(LOSA, 2, 1), true, 4);
  const pi = suave(temblon(PIEDRA_IZQ, 2.5, 2), true, 4);
  const pd = suave(temblon(PIEDRA_DER, 2.5, 3), true, 4);
  soplar(c, [20, MESA_Y - 20, 740, SUELO + 20], (x) => {
    x.fillStyle = '#2a2420';
    x.globalAlpha = 0.58;
    x.fill(camino(pi));
    x.fill(camino(pd));
    x.globalAlpha = 0.72;
    x.fill(camino(losa));
    x.globalAlpha = 1;
    // la luz de la piedra: un poco de caolín por arriba de la losa
    nube(x, 380, MESA_Y + 24, 120, CAOLIN, 15, 6, 0.28);
  }, 5, 1, {min: 0.72, semilla: 19});
  fino(c, [10, MESA_Y - 30, 760, SUELO + 30], (x) => {
    contorno(x, pi, 11, 11);
    contorno(x, pd, 11, 12);
    contorno(x, losa, 12, 13);
    // las grietas de la piedra
    x.strokeStyle = CARBON;
    const grietas: P[][] = [[[160, MESA_Y + 18], [196, MESA_Y + 36], [240, MESA_Y + 40]], [[470, MESA_Y + 50], [500, MESA_Y + 30], [540, MESA_Y + 26]],
      [[130, 1200], [150, 1260], [140, 1330]], [[600, 1250], [588, 1330], [604, 1400]], [[120, 1450], [156, 1500]]];
    for (const g of grietas) trazoVivo(x, remuestrea(g, 5), (u) => 5 * Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.03)));
  }, 1.4, 1, {min: 0.4, semilla: 17});

  // ---- el suelo: una banda de tierra soplada y su raya de carbón
  soplar(c, [-10, SUELO - 10, W + 10, SUELO + 90], (x) => {
    for (let k = 0; k < 12; k++) nube(x, 40 + k * 92 + r() * 30, SUELO + 34, 56, OCRE_ROJO, 100 + k, 3, 0.16);
  }, 10);
  fino(c, [-10, SUELO - 20, W + 10, SUELO + 30], (x) => {
    x.strokeStyle = CARBON;
    trazoVivo(x, remuestrea(suave(SUELO_PTS, false, 6), 5), (u) => 9 + 4 * perlin(u * 14, 6));
  }, 1.4);
  // y unos trazos de rojo oscuro que llegan a la losa por la izquierda (lo que queda de otro animal)
  rayas(c, [[[40, 640], [70, 600], [120, 590]], [[30, 700], [60, 690]]], 9, OCRE_ROJO_OSCURO, 0.55);

  FIJO = cv;
  return cv;
};
