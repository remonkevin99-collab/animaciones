import {clamp, mix, ruido} from '../../../comun/curvas';
import {BORDE, MESA_G, MESA_Y, SUELO, T_CAE, T_SUELO, rot, suma, vapor, type P} from '../../gato/escena';
import {
  CERA, aManchas, borrar, colorear, contorno, formaCirculo, formaElipse, formaPoli, punto, raya, remuestrea, repasar, trazarFormas,
  type Capa, type Forma, type RGB,
} from './ceras';
import {escribir} from './letras';

// EL CUARTO DIBUJADO POR UN NIÑO, a ceras sobre papel blanco. Arriba, en el papel sin colorear, el título
// «MI GATO» con letras torcidas de colores y el sol en la esquina (con su cara y sus rayos, que giran). Debajo, la pared coloreada
// deprisa en celeste, a tres manchas de garabato que no se juntan bien (con el blanco asomando por todas partes); la ventana roja con
// el cielo, la colina, el árbol y la nube; la repisa con su flor; el arcoíris enmarcado y colgado de un clavo; el reloj;
// la mesa marrón de patas rectas; el suelo de tablas, la alfombra de rayas, la planta y la pelota. Y el niño de palitos sobre la
// alfombra, que mira al gato y se lleva las manos a la cabeza cuando la taza se rompe.
// Lo fijo se dibuja una vez por cada uno de los tres dibujos del hervor (pintarFijo); lo que se mueve, cada cuadro (pintarVivo).

export const PARED_FIN = 1558; // la raya donde la pared se junta con el suelo
export const VENTANA = {x0: 585, y0: 318, x1: 1010, y1: 812};
const REPISA = {x0: 562, y0: 812, x1: 1032, y1: 842};
const CRUZ: P = [797, 562]; // los palos de la ventana
const CUADRO = {x0: 40, y0: 300, x1: 312, y1: 470};
const CLAVO: P = [176, 256];
const RELOJ: P = [94, 640];
const R_RELOJ = 50;
const MESA = {x0: 108, x1: BORDE + 18, y0: MESA_Y - 4, y1: MESA_Y + MESA_G + 6};
const PATAS: [number, number][] = [[136, 170], [660, 694]];
const ALFOMBRA = {c: [418, 1772] as P, rx: 268, ry: 76};
const PELOTA: P = [980, 1826];
const R_PELOTA = 58;
export const NINO = {x: 418, pies: 1768};

const rect = (x0: number, y0: number, x1: number, y1: number): P[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const formaRect = (x0: number, y0: number, x1: number, y1: number) => formaPoli(rect(x0, y0, x1, y1));
// una banda de color sin borde (para los garabatos grandes: la pared, el suelo, el cielo)
const banda = (x0: number, y0: number, x1: number, y1: number, arriba?: (x: number) => number): Forma => {
  const alto = (x: number) => (arriba ? Math.max(y0, arriba(x)) : y0);
  const n = Math.max(2, Math.ceil((x1 - x0) / 12));
  const borde: P[] = [...Array.from({length: n + 1}, (_, i) => [mix(x0, x1, i / n), alto(mix(x0, x1, i / n))] as P), [x1, y1], [x0, y1]];
  return {borde, caja: [x0, y0, x1, y1], dentro: (q) => q[0] >= x0 && q[0] <= x1 && q[1] <= y1 && q[1] >= alto(q[0])};
};
// el borde de arriba de lo coloreado: el niño no llega igual a todas partes
const techo = (x: number) => 258 + 16 * Math.sin(x * 0.0105 + 0.6) + 10 * ruido(x * 0.023, 3);
const colina = (x: number) => 714 + 24 * Math.sin((x - VENTANA.x0) * 0.013 + 0.4);

// la cera negra de las rayas finas
const tinta = CERA.negro;

// ---------------------------------------------------------------- lo fijo
export const pintarFijo = (cp: Capa, hervor: number) => {
  cp.hervor = {amp: 2.4, fase: hervor}; // cada dibujo del hervor, el mismo dibujo calcado otra vez
  const S = 1000;
  let n = 0;
  const s = () => S + n++ * 17;

  // la pared, coloreada deprisa a manchas de garabato celeste que se pisan y dejan huecos (rodeando lo que cuelga)
  const celeste: RGB = [96, 176, 236];
  const hueco = (q: P) =>
    (q[0] > VENTANA.x0 - 6 && q[0] < REPISA.x1 + 4 && q[1] > VENTANA.y0 - 6 && q[1] < REPISA.y1 + 2) ||
    (q[0] > CUADRO.x0 - 4 && q[0] < CUADRO.x1 + 4 && q[1] > CUADRO.y0 - 4 && q[1] < CUADRO.y1 + 4) ||
    Math.hypot(q[0] - RELOJ[0], q[1] - RELOJ[1]) < R_RELOJ + 6;
  const pared = banda(-20, 0, 1100, PARED_FIN + 4, techo);
  aManchas(cp, {...pared, dentro: (q) => pared.dentro(q) && !hueco(q)}, {color: celeste, ancho: 16, sep: 15, ang: -0.2, giro: 0.75, alfa: 0.4,
    semilla: s(), sobra: 10, tramo: 14, tam: [330, 250]});
  borrar(cp, [formaRect(CUADRO.x0 + 5, CUADRO.y0 + 5, CUADRO.x1 - 5, CUADRO.y1 - 5), formaCirculo(RELOJ, R_RELOJ - 2)]);

  // el suelo de tablas
  const suelo: RGB = [250, 178, 70];
  aManchas(cp, banda(-20, PARED_FIN, 1100, 1940), {color: suelo, ancho: 16, sep: 14, ang: 0.05, giro: 0.35, alfa: 0.5, semilla: s(), sobra: 8, tramo: 12,
    tam: [380, 190]});
  for (const y of [1660, 1764, 1874]) raya(cp, [[-10, y], [360, y + 3], [720, y - 2], [1090, y + 2]], {color: CERA.marron, ancho: 6, alfa: 0.75, semilla: s(), temblor: 3});
  [[1558, 1660, [210, 590, 930]], [1660, 1764, [90, 470, 820]], [1764, 1874, [300, 690]], [1874, 1930, [140, 560, 950]]].forEach(([y0, y1, xs]) =>
    (xs as number[]).forEach((x) => raya(cp, [[x, (y0 as number) + 4], [x + 3, (y1 as number) - 4]], {color: CERA.marron, ancho: 5, alfa: 0.7, semilla: s(), temblor: 2, repasa: false})));
  raya(cp, [[-14, PARED_FIN], [400, PARED_FIN + 4], [800, PARED_FIN - 3], [1094, PARED_FIN + 2]], {color: CERA.marronOsc, ancho: 9, alfa: 0.9, semilla: s(), temblor: 3});

  // la alfombra de rayas, con sus flecos
  const A = ALFOMBRA;
  const alf = formaElipse({c: A.c, rx: A.rx, ry: A.ry, ang: 0});
  borrar(cp, [alf]);
  [CERA.rojo, CERA.amarillo, CERA.azul, CERA.amarillo, CERA.rojo].forEach((color, i) => {
    const ya = A.c[1] - A.ry + (i * 2 * A.ry) / 5 - (i ? 3 : 8), yb = A.c[1] - A.ry + ((i + 1) * 2 * A.ry) / 5 + (i < 4 ? 3 : 8);
    const raya5: Forma = {borde: alf.borde.map((q) => [q[0], clamp(q[1], ya, yb)] as P), caja: [A.c[0] - A.rx, ya, A.c[0] + A.rx, yb],
      dentro: (q) => q[1] >= ya && q[1] <= yb && alf.dentro(q)};
    colorear(cp, raya5, {color, ancho: 13, sep: 9, ang: 0.08 + (i % 2) * 0.1, alfa: 0.9, semilla: s(), sobra: 3});
  });
  contorno(cp, alf.borde, {color: CERA.rojoOsc, ancho: 7, alfa: 0.85, semilla: s(), temblor: 3});
  for (const lado of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      const y = A.c[1] + i * 17;
      const x = A.c[0] + lado * A.rx * Math.sqrt(Math.max(0, 1 - ((y - A.c[1]) / A.ry) ** 2));
      raya(cp, [[x, y], [x + lado * 26, y + 3]], {color: CERA.rojoOsc, ancho: 5, alfa: 0.8, semilla: s(), temblor: 1.5, repasa: false});
    }
  }

  // la ventana: el cielo, la colina con su árbol, el marco rojo y sus palos
  const V = VENTANA;
  colorear(cp, formaRect(V.x0 + 6, V.y0 + 6, V.x1 - 6, V.y1 - 4), {color: [58, 132, 232], ancho: 14, sep: 12, ang: 0.62, alfa: 0.78, semilla: s(), sobra: 2, cruzado: true});
  const fColina: Forma = banda(V.x0 + 6, 600, V.x1 - 6, V.y1 - 4, colina);
  borrar(cp, [fColina]);
  colorear(cp, fColina, {color: CERA.verdeClaro, ancho: 14, sep: 11, ang: -0.25, alfa: 0.9, semilla: s(), sobra: 2});
  raya(cp, remuestrea(Array.from({length: 18}, (_, i) => {
    const x = mix(V.x0 + 6, V.x1 - 6, i / 17);
    return [x, colina(x)] as P;
  }), 10), {color: CERA.verdeOsc, ancho: 6, alfa: 0.8, semilla: s(), temblor: 2});
  // el árbol
  const copa = formaCirculo([940, 616], 50);
  const tronco = formaRect(930, 640, 950, colina(940) + 8);
  borrar(cp, [copa, tronco]);
  colorear(cp, tronco, {color: CERA.marron, ancho: 9, sep: 7, ang: 1.4, alfa: 0.9, semilla: s(), sobra: 2});
  colorear(cp, copa, {color: CERA.verde, ancho: 12, sep: 9, ang: 0.8, alfa: 0.9, semilla: s(), sobra: 4, cruzado: true});
  contorno(cp, copa.borde, {color: CERA.verdeOsc, ancho: 6, alfa: 0.85, semilla: s(), temblor: 3});
  // el marco
  contorno(cp, rect(V.x0, V.y0, V.x1, V.y1), {color: CERA.rojo, ancho: 20, alfa: 0.95, semilla: s(), temblor: 3});
  raya(cp, [[CRUZ[0], V.y0 + 4], [CRUZ[0] + 2, V.y1 - 4]], {color: CERA.rojo, ancho: 15, alfa: 0.95, semilla: s(), temblor: 2.5});
  raya(cp, [[V.x0 + 4, CRUZ[1]], [V.x1 - 4, CRUZ[1] + 3]], {color: CERA.rojo, ancho: 15, alfa: 0.95, semilla: s(), temblor: 2.5});
  // la repisa y la flor en su maceta
  const repisa = formaRect(REPISA.x0, REPISA.y0, REPISA.x1, REPISA.y1);
  borrar(cp, [repisa]);
  colorear(cp, repisa, {color: CERA.marron, ancho: 11, sep: 8, ang: 0.15, alfa: 0.88, semilla: s(), sobra: 3});
  repasar(cp, [repisa], {color: CERA.marronOsc, ancho: 6, alfa: 0.9, semilla: s(), temblor: 2});
  const maceta = formaPoli([[904, 752], [978, 752], [966, 812], [916, 812]]);
  borrar(cp, [maceta]);
  colorear(cp, maceta, {color: CERA.naranjaOsc, ancho: 10, sep: 8, ang: 0.4, alfa: 0.9, semilla: s(), sobra: 3});
  repasar(cp, [maceta], {color: CERA.marronOsc, ancho: 5, alfa: 0.9, semilla: s(), temblor: 2});
  raya(cp, [[941, 752], [944, 718], [941, 684]], {color: CERA.verdeOsc, ancho: 7, alfa: 0.9, semilla: s(), temblor: 2});
  for (const [c, a] of [[[926, 728], -0.6], [[958, 712], 0.6]] as [P, number][]) {
    const hoja = formaElipse({c, rx: 18, ry: 8, ang: a});
    colorear(cp, hoja, {color: CERA.verde, ancho: 8, sep: 6, ang: a, alfa: 0.95, semilla: s(), sobra: 2});
  }
  const flor: P = [942, 668];
  for (let i = 0; i < 6; i++) {
    const q = suma(flor, rot([22, 0], (i / 6) * Math.PI * 2 + 0.3));
    const p = formaCirculo(q, 14);
    colorear(cp, p, {color: CERA.rosa, ancho: 8, sep: 6, ang: i, alfa: 0.95, semilla: s(), sobra: 2});
  }
  const centroFlor = formaCirculo(flor, 13);
  borrar(cp, [centroFlor]);
  colorear(cp, centroFlor, {color: CERA.amarillo, ancho: 8, sep: 5, ang: 0.3, alfa: 1, semilla: s(), sobra: 2});

  // el arcoíris enmarcado, colgado de un clavo
  const C = CUADRO;
  const centroArco: P = [176, 452];
  [CERA.rojo, CERA.naranja, CERA.amarillo, CERA.verde, CERA.azul, CERA.morado].forEach((color, i) => {
    const r = 108 - i * 15;
    const pts = Array.from({length: 19}, (_, j) => suma(centroArco, [Math.cos(Math.PI + (j / 18) * Math.PI) * r, Math.sin(Math.PI + (j / 18) * Math.PI) * r * 0.92]) as P);
    raya(cp, pts, {color, ancho: 17, alfa: 0.95, semilla: s(), temblor: 2});
  });
  for (const [x, lado] of [[84, -1], [268, 1]] as [number, number][]) {
    const nube = [formaCirculo([x - 16 * lado, 448], 20), formaCirculo([x + 8 * lado, 438], 25), formaCirculo([x + 28 * lado, 452], 17)];
    borrar(cp, nube);
    repasar(cp, nube, {color: CERA.celeste, ancho: 5, alfa: 0.9, semilla: s(), temblor: 1.5});
  }
  contorno(cp, rect(C.x0, C.y0, C.x1, C.y1), {color: CERA.marron, ancho: 15, alfa: 0.95, semilla: s(), temblor: 3});
  raya(cp, [CLAVO, [C.x0 + 22, C.y0 + 2]], {color: tinta, ancho: 4, alfa: 0.85, semilla: s(), temblor: 1, repasa: false});
  raya(cp, [CLAVO, [C.x1 - 22, C.y0 + 2]], {color: tinta, ancho: 4, alfa: 0.85, semilla: s(), temblor: 1, repasa: false});
  punto(cp, CLAVO, 8, {color: tinta, ancho: 6, alfa: 0.95, semilla: s()});

  // el reloj (las doce y cuarto, como siempre)
  contorno(cp, formaCirculo(RELOJ, R_RELOJ).borde, {color: tinta, ancho: 8, alfa: 0.92, semilla: s(), temblor: 2});
  for (let i = 0; i < 4; i++) punto(cp, suma(RELOJ, rot([0, -R_RELOJ + 13], (i * Math.PI) / 2)), 4.5, {color: tinta, ancho: 4, alfa: 0.9, semilla: s()});
  raya(cp, [RELOJ, [RELOJ[0] + 1, RELOJ[1] - 34]], {color: CERA.rojo, ancho: 6, alfa: 0.95, semilla: s(), temblor: 1, repasa: false});
  raya(cp, [RELOJ, [RELOJ[0] + 24, RELOJ[1] + 2]], {color: CERA.azul, ancho: 7, alfa: 0.95, semilla: s(), temblor: 1, repasa: false});

  // el título, en el papel de arriba: «MI GATO» con letras de colores, torcidas y de su tamaño
  escribir(cp, 'MI GATO', {x: 56, y: 70, alto: 106, ancho: 17, semilla: 7, torcido: 0.14, salta: 0.08, separa: 0.22,
    colores: [CERA.rojo, CERA.azul, tinta, CERA.verde, CERA.naranja, CERA.morado, CERA.azul]});

  // la mesa: el tablero y dos patas rectas, con sus vetas
  const tablero = formaRect(MESA.x0, MESA.y0, MESA.x1, MESA.y1);
  const patas = PATAS.map(([a, b]) => formaRect(a, MESA.y1 - 4, b, SUELO + 2));
  borrar(cp, [tablero, ...patas]);
  for (const p of patas) colorear(cp, p, {color: CERA.marron, ancho: 11, sep: 8, ang: 1.35, alfa: 0.9, semilla: s(), sobra: 3});
  colorear(cp, tablero, {color: CERA.marron, ancho: 12, sep: 9, ang: 0.1, alfa: 0.92, semilla: s(), sobra: 4, cruzado: true});
  repasar(cp, [tablero], {color: CERA.marronOsc, ancho: 8, alfa: 0.95, semilla: s(), temblor: 2.5});
  for (const p of patas) repasar(cp, [p], {color: CERA.marronOsc, ancho: 7, alfa: 0.92, semilla: s(), temblor: 2});
  raya(cp, [[MESA.x0 + 40, MESA.y0 + 18], [300, MESA.y0 + 15], [420, MESA.y0 + 22], [560, MESA.y0 + 17]], {color: CERA.marronOsc, ancho: 4, alfa: 0.7, semilla: s(), temblor: 2, repasa: false});

  // la planta del rincón, en su maceta
  const hojas: [P, number, number][] = [[[44, 1600], -0.5, 1.0], [[70, 1572], -0.15, 1.15], [[100, 1590], 0.25, 1.05], [[124, 1630], 0.6, 0.85], [[24, 1648], -0.95, 0.8]];
  hojas.forEach(([c, a, k]) => {
    const h = formaElipse({c, rx: 22 * k, ry: 78 * k, ang: a});
    borrar(cp, [h]);
    colorear(cp, h, {color: CERA.verde, ancho: 10, sep: 8, ang: a + 1.3, alfa: 0.92, semilla: s(), sobra: 3});
    repasar(cp, [h], {color: CERA.verdeOsc, ancho: 5, alfa: 0.88, semilla: s(), temblor: 1.5});
    raya(cp, [suma(c, rot([0, 70 * k], a)), suma(c, rot([0, -50 * k], a))], {color: CERA.verdeOsc, ancho: 4, alfa: 0.8, semilla: s(), temblor: 1, repasa: false});
  });
  const tiesto = formaPoli([[16, 1700], [134, 1700], [120, 1836], [30, 1836]]);
  borrar(cp, [tiesto]);
  colorear(cp, tiesto, {color: CERA.naranjaOsc, ancho: 12, sep: 9, ang: 0.35, alfa: 0.9, semilla: s(), sobra: 3});
  repasar(cp, [tiesto], {color: CERA.marronOsc, ancho: 6, alfa: 0.9, semilla: s(), temblor: 2});

  // la pelota de playa
  const pelota = formaCirculo(PELOTA, R_PELOTA);
  borrar(cp, [pelota]);
  [CERA.rojo, null, CERA.azul, null, CERA.amarillo, null].forEach((color, i) => {
    if (!color) return;
    const a0 = (i / 6) * Math.PI * 2 + 0.4, a1 = ((i + 1) / 6) * Math.PI * 2 + 0.4;
    const gajo = formaPoli([PELOTA, ...Array.from({length: 7}, (_, j) => suma(PELOTA, rot([R_PELOTA, 0], mix(a0, a1, j / 6))))]);
    colorear(cp, gajo, {color, ancho: 11, sep: 6, ang: a0 + 0.8, alfa: 0.95, semilla: s(), sobra: 3, cruzado: true});
  });
  contorno(cp, pelota.borde, {color: tinta, ancho: 7, alfa: 0.92, semilla: s(), temblor: 2});
};

// ---------------------------------------------------------------- lo que se mueve: el sol, la nube, el niño, el vapor
const SOL: P = [1068, 50];
const R_SOL = 132;
const nubeFormas = (t: number) => {
  const x = 880 + 3 * t;
  return [formaCirculo([x, 398], 30), formaCirculo([x + 36, 380], 38), formaCirculo([x + 76, 400], 29), formaElipse({c: [x + 36, 410], rx: 60, ry: 20, ang: 0})];
};

// el niño: dónde tiene cada cosa en el segundo t (a cuadros de 12 por segundo)
type Nino = {cabeza: P; r: number; hombros: [P, P]; cadera: P; manos: [P, P]; pies: [P, P]; boca: 'sonrie' | 'o' | 'O'; ojos: number; salto: number};
const nino = (t: number): Nino => {
  const sorpresa = t >= T_CAE + 0.1; // la taza ya se cae
  const golpe = t >= T_SUELO;
  const salto = golpe && t < T_SUELO + 0.17 ? 22 : 0;
  const x = NINO.x, y = NINO.pies - salto;
  const cabeza: P = [x + 4, y - 380];
  const hombros: [P, P] = [[x - 34, y - 296], [x + 34, y - 296]];
  const cadera: P = [x, y - 150];
  // las manos: quietas, a la cara cuando se cae, arriba al romperse y a la cabeza después
  let manos: [P, P] = [[x - 96, y - 196], [x + 96, y - 200]];
  if (sorpresa && !golpe) manos = [[x - 40, y - 352], [x + 50, y - 352]];
  if (golpe) manos = t < T_SUELO + 0.34 ? [[x - 100, y - 470], [x + 110, y - 476]] : [[x - 62, y - 430], [x + 70, y - 432]];
  const pies: [P, P] = [[x - 40, y], [x + 40, y]];
  const boca = golpe ? 'O' : sorpresa ? 'o' : 'sonrie';
  return {cabeza, r: 64, hombros, cadera, manos, pies, boca, ojos: sorpresa ? 1 : 0, salto};
};
const ninoFormas = (n: Nino) => [
  formaCirculo(n.cabeza, n.r),
  formaPoli([n.hombros[0], n.hombros[1], [n.cadera[0] + 58, n.cadera[1] + 6], [n.cadera[0] - 58, n.cadera[1] + 6]]),
];

export const taparVivo = (c: CanvasRenderingContext2D, t: number) => {
  trazarFormas(c, [...nubeFormas(t), ...ninoFormas(nino(t))]);
};

export const pintarVivo = (cp: Capa, t: number, paso: number) => {
  cp.hervor = {amp: 2.4, fase: ((paso % 3) + 3) % 3 + 0.5}; // hierve como lo fijo: el mismo dibujo, calcado a cada paso
  let n = 0;
  const s = () => 5000 + n++ * 17;

  // el sol de la esquina, con su cara; los rayos giran despacio
  const sol = formaCirculo(SOL, R_SOL);
  colorear(cp, sol, {color: CERA.amarillo, ancho: 15, sep: 12, ang: 0.7, alfa: 0.95, semilla: s(), sobra: 6, cruzado: true});
  contorno(cp, sol.borde, {color: CERA.naranja, ancho: 10, alfa: 0.95, semilla: s(), temblor: 3});
  const giro = t * 0.16;
  for (let i = 0; i < 6; i++) {
    const a = ((98 + i * 10.5) * Math.PI) / 180 + 0.12 * Math.sin(giro * 3);
    const largo = i % 2 ? 56 : 84;
    const u: P = [Math.cos(a), Math.sin(a)];
    const a0 = suma(SOL, [u[0] * (R_SOL + 24), u[1] * (R_SOL + 24)]);
    const a1 = suma(SOL, [u[0] * (R_SOL + 24 + largo), u[1] * (R_SOL + 24 + largo)]);
    raya(cp, [a0, a1], {color: i % 2 ? CERA.amarillo : CERA.naranja, ancho: 13, alfa: 0.95, semilla: s(), temblor: 2});
  }
  punto(cp, [990, 70], 9, {color: tinta, ancho: 7, alfa: 0.95, semilla: s()});
  punto(cp, [1040, 58], 9, {color: tinta, ancho: 7, alfa: 0.95, semilla: s()});
  raya(cp, [[976, 110], [1000, 130], [1034, 128], [1056, 106]], {color: tinta, ancho: 7, alfa: 0.92, semilla: s(), temblor: 1.5});
  colorear(cp, formaCirculo([964, 96], 13), {color: CERA.rosa, ancho: 8, sep: 6, ang: 0.5, alfa: 0.8, semilla: s(), sobra: 1});

  // la nube (blanca: el papel, con su raya celeste)
  repasar(cp, nubeFormas(t), {color: [70, 140, 220], ancho: 7, alfa: 0.92, semilla: s(), temblor: 2});

  // el niño de palitos, sobre la alfombra
  const k = nino(t);
  const [cab, camisa] = ninoFormas(k);
  const piel = CERA.piel;
  for (const [h, m] of [[k.hombros[0], k.manos[0]], [k.hombros[1], k.manos[1]]] as [P, P][]) {
    const codo: P = [mix(h[0], m[0], 0.5) + (m[1] < h[1] ? 0 : (m[0] - h[0]) * 0.12), mix(h[1], m[1], 0.5) + 10];
    raya(cp, [h, codo, m], {color: tinta, ancho: 7, alfa: 0.95, semilla: s(), temblor: 2});
    colorear(cp, formaCirculo(m, 15), {color: piel, ancho: 8, sep: 6, ang: 0.4, alfa: 0.95, semilla: s(), sobra: 2});
    contorno(cp, formaCirculo(m, 15).borde, {color: tinta, ancho: 4, alfa: 0.85, semilla: s(), temblor: 1, vueltas: 1});
  }
  for (const p of k.pies) {
    raya(cp, [[k.cadera[0] + (p[0] - k.cadera[0]) * 0.35, k.cadera[1]], [p[0], p[1] - 14]], {color: CERA.azulOsc, ancho: 9, alfa: 0.95, semilla: s(), temblor: 2});
    const zapato = formaElipse({c: [p[0] + (p[0] < k.cadera[0] ? -10 : 10), p[1] - 8], rx: 22, ry: 11, ang: 0});
    colorear(cp, zapato, {color: tinta, ancho: 8, sep: 6, ang: 0.2, alfa: 0.95, semilla: s(), sobra: 2});
  }
  colorear(cp, camisa, {color: CERA.verde, ancho: 12, sep: 10, ang: 1.1, alfa: 0.9, semilla: s(), sobra: 6});
  repasar(cp, [camisa], {color: CERA.verdeOsc, ancho: 6, alfa: 0.9, semilla: s(), temblor: 2});
  raya(cp, [suma(k.cabeza, [0, k.r - 6]), [k.cabeza[0], k.hombros[0][1] + 6]], {color: tinta, ancho: 7, alfa: 0.9, semilla: s(), temblor: 1, repasa: false});
  colorear(cp, cab, {color: piel, ancho: 12, sep: 10, ang: 0.5, alfa: 0.75, semilla: s(), sobra: 4});
  contorno(cp, cab.borde, {color: CERA.marronOsc, ancho: 7, alfa: 0.92, semilla: s(), temblor: 2});
  // el pelo de punta (más de punta con el susto)
  const pelo = k.boca === 'O' ? 1.35 : 1;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.32;
    const b = suma(k.cabeza, [Math.cos(a) * (k.r - 6), Math.sin(a) * (k.r - 6)]);
    const p = suma(k.cabeza, [Math.cos(a) * (k.r + 30 * pelo), Math.sin(a) * (k.r + 30 * pelo)]);
    raya(cp, [b, p], {color: CERA.marron, ancho: 9, alfa: 0.95, semilla: s(), temblor: 1.5, repasa: false});
  }
  // la cara: mira a la derecha, al gato
  const ojo = k.ojos ? 9 : 7;
  punto(cp, suma(k.cabeza, [6, -10]), ojo, {color: tinta, ancho: 6, alfa: 1, semilla: s()});
  punto(cp, suma(k.cabeza, [36, -12]), ojo, {color: tinta, ancho: 6, alfa: 1, semilla: s()});
  if (k.boca === 'sonrie') raya(cp, [suma(k.cabeza, [0, 20]), suma(k.cabeza, [20, 32]), suma(k.cabeza, [40, 20])], {color: CERA.rojo, ancho: 6, alfa: 0.95, semilla: s(), temblor: 1, repasa: false});
  else contorno(cp, formaElipse({c: suma(k.cabeza, [22, 30]), rx: k.boca === 'O' ? 15 : 8, ry: k.boca === 'O' ? 19 : 9, ang: 0}).borde, {color: CERA.rojo, ancho: 6, alfa: 0.95, semilla: s(), temblor: 1});
  if (k.boca === 'O') {
    // las rayitas del susto alrededor de la cabeza
    for (const a of [-2.6, -2.2, -0.95, -0.55]) {
      const u: P = [Math.cos(a), Math.sin(a)];
      raya(cp, [suma(k.cabeza, [u[0] * (k.r + 44), u[1] * (k.r + 44)]), suma(k.cabeza, [u[0] * (k.r + 74), u[1] * (k.r + 74)])], {color: tinta, ancho: 6, alfa: 0.9, semilla: s(), temblor: 1, repasa: false});
    }
  }

  // el vapor de la taza (y luego del charco): rayas grises que ondulan
  vapor(t).forEach((h, i) => {
    if (h.alfa < 0.05) return;
    raya(cp, h.pts, {color: [140, 140, 150], ancho: 7, alfa: clamp(0.85 * h.alfa), semilla: s() + i, temblor: 1.5, repasa: false});
  });
};
