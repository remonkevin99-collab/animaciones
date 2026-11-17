import React from 'react';
import {mix, rng} from '../../../comun/curvas';
import {BORDE, MESA_Y, SUELO, type P} from '../../gato/escena';
import {Seco, bandaD, circD, elipD, f1, lerp, manchaPts, ondas, rectD, ruta} from './pincel';

// EL DECORADO DE LA PINTURA NOCTURNA: la cabaña de troncos de noche, con la ventana grande abierta al paisaje nevado. Fuera, el
// cielo en bandas planas de azul noche, la luna llena con sus dos halos, dos cordilleras con la nieve en las cumbres (la cara que da
// a la luna, clara), tres filas de pinos con su nieve, las lomas de nieve y una cabaña lejos con su ventana encendida. Dentro, los
// troncos de la pared, la guirnalda de pino, las dos velas en el alféizar (la luz cálida), la mesa, la cesta de leña, la alfombra
// trenzada y el suelo de tablas. Todo quieto: se pinta una vez por copia. Lo que se mueve (la nieve, las estrellas, el humo, las
// llamas, la mancha de luna con la sombra del gato) va aparte, en PinturaNocturna.tsx.

// ---------------------------------------------------------------- la paleta (pocos tonos, opacos)
export const C = {
  papel: '#ECE2CB',
  cielo: ['#0C1130', '#121A43', '#1A2353', '#222D63', '#2B3873', '#354584', '#425496'],
  luna: '#F3EACB', crater: '#DDD1A9', halo: '#C3CFF6',
  montA: '#2C396D', montALuz: '#56679F', nieveA: '#C6D1F1', nieveASombra: '#7E8FC4',
  montB: '#212B58', montBLuz: '#37457C', nieveB: '#A5B4E1', nieveBSombra: '#6878AE',
  loma: ['#5D6EA8', '#7D8FC7', '#A6B6E4'], sombraNieve: '#52619A',
  pino: ['#25336A', '#1A2453', '#10173A'], pinoNieve: ['#7C8EC6', '#97A8DB', '#BECBEE'],
  copo: '#E6ECFA',
  // dentro
  tronco: ['#2F2135', '#34253A'], troncoLuz: '#433049', junta: '#1A1221', viga: '#1A1220',
  marco: '#3A2630', marcoOsc: '#22161E', marcoLuz: '#9A6542',
  alfeizar: '#5A3B35', alfeizarFrente: '#2A1C25', alfeizarLuz: '#A36D45',
  cera: '#E9DDC3', ceraSombra: '#B6A58F', ceraLuz: '#FBF3DE', laton: '#8F6B3B', latonLuz: '#C99D57',
  mesaArriba: '#7A4E39', mesaArribaLuz: '#B0703F', mesaFrente: '#43291F', mesaFrenteLuz: '#74432A', pata: '#36221F',
  suelo: ['#3A2A31', '#33252B', '#3F2E35'], sueloJunta: '#1F151B', zocalo: '#22171D',
  luzLuna: '#A9BAF1',
  verde: '#1D3A33', verdeLuz: '#2F5548', baya: '#B8443E', estrellaPaja: '#E2B45A',
  mimbre: '#6E4A2E', mimbreOsc: '#553722', lenaCorte: '#B98451', lenaAnillo: '#8C5C37', corteza: '#3B2822',
};

// ---------------------------------------------------------------- las medidas
export const PINT = {x0: 22, y0: 22, x1: 1058, y1: 1898}; // lo pintado (el resto es el papel)
export const MARCO = {x0: 64, y0: 112, x1: 1016, y1: 900};
export const VIDRIO = {x0: 92, y0: 140, x1: 988, y1: 900};
export const MAINELES: [number, number][] = [[320, 338], [750, 768]];
export const TRAVESANO: [number, number] = [262, 278];
export const PANELES: [number, number, number, number][] = [
  [92, 140, 320, 262], [338, 140, 750, 262], [768, 140, 988, 262],
  [92, 278, 320, 900], [338, 278, 750, 900], [768, 278, 988, 900],
];
export const ALFEIZAR = 900; // la cara de arriba del alféizar: de 900 a 926; el frente, de 926 a 954
export const VELAS = [
  {x: 936, base: 916, alto: 124, ancho: 36},
  {x: 878, base: 916, alto: 70, ancho: 30},
];
export const LUZ_VELA: P = [912, 792];
export const LUNA: P = [206, 394];
export const R_LUNA = 46;
export const PARED_FIN = 1540;
export const CABANA: P = [818, 742];
export const CHIMENEA: P = [838, 712];
const MESA_X0 = 66;
const PATAS: [number, number][] = [[96, 132], [652, 688]];

// la mancha de luna del suelo: la ventana proyectada (una transformación afín, así la sombra del gato cae con la misma)
// x' = 0,554·x − 0,237·y + 722 · y' = −0,46·y + 1962 (la ventana de abajo cae junto a la pared y la de arriba, hacia delante)
export const A_SUELO = {a: 0.5536, b: 0, c: -0.2368, d: -0.4605, e: 722.2, f: 1962.5};
export const aSuelo = ([x, y]: P): P => [A_SUELO.a * x + A_SUELO.c * y + A_SUELO.e, A_SUELO.b * x + A_SUELO.d * y + A_SUELO.f];
export const MATRIZ_SUELO = `matrix(${A_SUELO.a} ${A_SUELO.b} ${A_SUELO.c} ${A_SUELO.d} ${A_SUELO.e} ${A_SUELO.f})`;

// ---------------------------------------------------------------- un lienzo donde ir pintando
const lienzo = () => {
  const out: React.ReactNode[] = [];
  let n = 0;
  const seco = (d: string, color: string, w = 9, op = 1, regla?: 'evenodd') =>
    out.push(
      regla ? (
        <g key={n++} opacity={op === 1 ? undefined : op}>
          <path d={d} fill={color} fillRule={regla} />
        </g>
      ) : (
        <Seco key={n++} d={d} color={color} w={w} semilla={n * 7 + 3} op={op} />
      ),
    );
  const plano = (d: string, color: string, op = 1) => out.push(<path key={n++} d={d} fill={color} fillOpacity={op} />);
  const raya = (d: string, color: string, w: number, op = 1) =>
    out.push(<path key={n++} d={d} fill="none" stroke={color} strokeWidth={w} strokeOpacity={op} strokeLinecap="round" />);
  const nodo = (el: React.ReactElement) => out.push(React.cloneElement(el, {key: n++}));
  return {out, seco, plano, raya, nodo};
};
type Lienzo = ReturnType<typeof lienzo>;

// la altura de la cresta de una cordillera en x (para que las estrellas no caigan encima de una montaña)
const crestaEn = (pts: P[], x: number) => {
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return mix(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  return pts[pts.length - 1][1];
};
// valle, cumbre, valle… (la luna está arriba a la izquierda: la cara izquierda de cada cumbre es la clara)
const CORD_A: P[] = [[80, 600], [150, 508], [214, 556], [298, 470], [380, 536], [470, 486], [556, 548], [660, 468], [722, 514], [852, 396], [936, 462], [1000, 428]];
const CORD_B: P[] = [[80, 690], [176, 616], [262, 662], [362, 604], [470, 664], [590, 610], [690, 660], [802, 596], [902, 648], [1000, 606]];
export const cresta = (x: number) => Math.min(crestaEn(CORD_A, x), crestaEn(CORD_B, x));

const cordillera = (L: Lienzo, pts: P[], base: number, tonos: {m: string; luz: string; nieve: string; nieveS: string}) => {
  L.seco(ruta([...pts, [pts[pts.length - 1][0], base], [pts[0][0], base]]), tonos.m, 10);
  for (let i = 1; i < pts.length; i += 2) {
    const izq = pts[i - 1], cima = pts[i], der = pts[Math.min(pts.length - 1, i + 1)];
    const pie: P = [cima[0] + (der[0] - cima[0]) * 0.16, base];
    // la cara que mira a la luna, clara; y la nieve de la cumbre, con su borde en dientes (clara a la izquierda de la arista)
    L.seco(ruta([izq, cima, pie, [izq[0], base]]), tonos.luz, 8);
    const a = lerp(cima, izq, 0.46), b = lerp(cima, pie, 0.4), c = lerp(cima, der, 0.36);
    const diente = (p: P, q: P, k: number): P[] => [lerp(p, q, 0.3), lerp(p, q, 0.55), lerp(p, q, 0.8)].map((m, j) => [m[0], m[1] + (j % 2 ? -k : k)]);
    L.seco(ruta([cima, a, ...diente(a, b, 9), b]), tonos.nieve, 6);
    L.seco(ruta([cima, b, ...diente(b, c, 7), c]), tonos.nieveS, 6);
  }
};

// un pino: pisos de ramas con el borde en dientes y la nieve encima, del lado de la luna
const pino = (L: Lienzo, x: number, base: number, alto: number, ancho: number, color: string, nieve: string, semilla: number, pisos = 4) => {
  const r = rng(semilla);
  L.plano(rectD(x - ancho * 0.06, base - alto * 0.12, ancho * 0.12, alto * 0.14), '#120E22');
  for (let k = 0; k < pisos; k++) {
    const arriba = base - alto + k * alto * 0.2;
    const abajo = arriba + alto * (k === pisos - 1 ? 0.42 : 0.34);
    const hw = (ancho / 2) * (0.38 + (0.62 * (k + 1)) / pisos);
    const dientes: P[] = [];
    const nd = 3 + k;
    for (let j = nd; j >= 0; j--) {
      const xx = x - hw + (2 * hw * j) / nd;
      dientes.push([xx + (r() - 0.5) * 4, abajo - (j % 2 ? 0 : 6 + r() * 4)]);
    }
    L.seco(ruta([[x, arriba], [x + hw, abajo], ...dientes, [x - hw, abajo]]), color, 6);
    // la nieve: una lengua plana en la ladera izquierda de cada piso
    const n1 = lerp([x, arriba + 2], [x - hw, abajo], 0.15), n2 = lerp([x, arriba], [x - hw, abajo], 0.78);
    L.seco(ruta([[x + 2, arriba + 5], n1, n2, [x - hw * 0.55, abajo - 4], [x - hw * 0.1, abajo - 9 - r() * 4], [x + hw * 0.25, arriba + alto * 0.18]]), nieve, 4);
  }
};

const fila = (L: Lienzo, x0: number, x1: number, linea: (x: number) => number, sep: number, alto: [number, number], ancho: [number, number],
  color: string, nieve: string, sombra: string, semilla: number, saltar: (x: number) => boolean = () => false) => {
  const r = rng(semilla);
  for (let x = x0 + r() * sep * 0.5; x < x1; x += sep * (0.7 + r() * 0.6)) {
    const a = mix(alto[0], alto[1], r()), w = mix(ancho[0], ancho[1], r());
    if (saltar(x)) continue;
    const b = linea(x) + 4;
    // su sombra en la nieve, hacia la derecha (la luna está a la izquierda)
    L.seco(ruta([[x - w * 0.2, b], [x + w * 1.6, b + 3], [x + w * 1.4, b + 9], [x - w * 0.1, b + 7]]), sombra, 4, 0.8);
    pino(L, x, b, a, w, color, nieve, semilla * 31 + Math.round(x));
  }
};

// ---------------------------------------------------------------- fuera: el paisaje (se pinta recortado al vidrio)
const pintaPaisaje = (L: Lienzo) => {
  // el cielo: siete bandas planas, de la noche cerrada de arriba a la claridad del horizonte
  const cortes = [0, 222, 296, 362, 426, 488, 548];
  cortes.forEach((y, i) => L.seco(bandaD(i === 0 ? [[84, 130], [996, 130]] : ondas(84, 996, y, 7, 40 + i), 760), C.cielo[i], 10));
  // la luna: dos halos planos, el disco y sus mares
  L.seco(ruta(manchaPts(LUNA, 138, 136, 11, 0.03, 48)), C.halo, 10, 0.15);
  L.seco(ruta(manchaPts(LUNA, 88, 87, 12, 0.03, 40)), C.halo, 8, 0.24);
  L.seco(circD(LUNA, R_LUNA), C.luna, 6);
  L.plano(elipD([LUNA[0] - 14, LUNA[1] - 10], 14, 10, 0.4), C.crater);
  L.plano(elipD([LUNA[0] + 15, LUNA[1] + 8], 11, 8, -0.3), C.crater);
  L.plano(elipD([LUNA[0] - 4, LUNA[1] + 22], 8, 5, 0.2), C.crater);

  // las dos cordilleras
  cordillera(L, CORD_A, 760, {m: C.montA, luz: C.montALuz, nieve: C.nieveA, nieveS: C.nieveASombra});
  cordillera(L, CORD_B, 790, {m: C.montB, luz: C.montBLuz, nieve: C.nieveB, nieveS: C.nieveBSombra});

  // las lomas de nieve y sus filas de pinos (la de lejos, la del medio y la de cerca)
  const loma1 = ondas(84, 996, 716, 10, 51);
  const loma2 = ondas(84, 996, 784, 13, 52);
  const loma3 = ondas(84, 996, 852, 12, 53);
  const enLoma = (l: P[]) => (x: number) => crestaEn(l, x);
  L.seco(bandaD(loma1, 912), C.loma[0], 10);
  fila(L, 92, 990, enLoma(loma1), 30, [42, 66], [22, 32], C.pino[0], C.pinoNieve[0], C.sombraNieve, 61);
  L.seco(bandaD(loma2, 912), C.loma[1], 10);
  // la cabaña de lejos (la ventana encendida y el humo van aparte), entre los pinos del medio
  const [cx, cy] = CABANA;
  L.seco(rectD(cx - 26, cy - 4, 52, 30), '#2A2038', 5);
  L.seco(rectD(CHIMENEA[0] - 5, CHIMENEA[1], 10, 20), '#2A2038', 4);
  L.seco(ruta([[cx - 38, cy + 1], [cx, cy - 32], [cx + 38, cy + 1], [cx + 30, cy + 6], [cx, cy - 20], [cx - 30, cy + 6]]), '#D2DCF5', 5);
  L.plano(rectD(cx - 8, cy + 6, 13, 11), '#F3C25C');
  fila(L, 92, 990, enLoma(loma2), 64, [86, 132], [42, 62], C.pino[1], C.pinoNieve[1], C.sombraNieve, 62, (x) => Math.abs(x - cx) < 50);
  L.seco(bandaD(loma3, 912), C.loma[2], 10);
  // la fila de cerca, solo a los lados (el centro lo tapa el gato)
  [[118, 196, 92], [214, 168, 80], [800, 150, 74], [972, 212, 96]].forEach(([x, a, w], i) =>
    (() => {
      const b = crestaEn(loma3, x) + 6;
      L.seco(ruta([[x - w * 0.2, b], [x + w * 1.8, b + 4], [x + w * 1.5, b + 13], [x - w * 0.1, b + 10]]), C.sombraNieve, 4, 0.85);
      pino(L, x, b, a, w, C.pino[2], C.pinoNieve[2], 900 + i, 5);
    })(),
  );
  // la nieve amontonada fuera, al pie de cada vidrio
  PANELES.slice(3).forEach(([x0, , x1], i) => {
    const arriba = ondas(x0 - 6, x1 + 6, 880, 7, 70 + i, 10).map(([x, y]): P => [x, y - 10 * Math.exp(-(((x - x0) / 40) ** 2)) - 14 * Math.exp(-(((x - x1) / 46) ** 2))]);
    L.seco(bandaD(arriba, 912), '#DCE4F6', 5);
  });
};

// ---------------------------------------------------------------- la guirnalda de pino sobre la ventana (también va encima de la nieve)
export const pintaGuirnalda = (L: Lienzo) => {
  const r = rng(808);
  const anclas: P[] = [[66, 112], [386, 116], [700, 116], [1014, 112]];
  for (let s = 0; s < 3; s++) {
    const a = anclas[s], b = anclas[s + 1];
    const n = 15;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const c: P = [mix(a[0], b[0], k), mix(a[1], b[1], k) + 46 * Math.sin(Math.PI * k)];
      for (let j = 0; j < 3; j++) {
        const ang = (r() - 0.5) * 1.6 + (j - 1) * 0.9;
        L.seco(elipD([c[0] + (r() - 0.5) * 12, c[1] + (r() - 0.5) * 10], 17 + r() * 6, 7 + r() * 2, ang), j === 1 ? C.verdeLuz : C.verde, 4);
      }
      if (i % 3 === 1) L.seco(circD([c[0] + (r() - 0.5) * 14, c[1] + 8 + r() * 6], 5.5), C.baya, 3);
      if (i % 5 === 3) {
        const e: P = [c[0], c[1] + 18];
        const pts: P[] = Array.from({length: 10}, (_, q) => {
          const ang = (q / 10) * Math.PI * 2 - Math.PI / 2;
          const rr = q % 2 ? 4.5 : 11;
          return [e[0] + Math.cos(ang) * rr, e[1] + Math.sin(ang) * rr];
        });
        L.raya(`M ${f1(c[0])} ${f1(c[1])} L ${f1(e[0])} ${f1(e[1] - 10)}`, '#C9A15A', 1.6, 0.8);
        L.seco(ruta(pts), C.estrellaPaja, 3);
      }
    }
  }
};

// ---------------------------------------------------------------- las velas (también van encima de la nieve)
export const pintaVelas = (L: Lienzo) => {
  VELAS.forEach((v, i) => {
    const x0 = v.x - v.ancho / 2, top = v.base - v.alto;
    L.seco(elipD([v.x, v.base + 2], v.ancho * 0.95, 8), C.laton, 4);
    L.seco(elipD([v.x, v.base - 1], v.ancho * 0.7, 4.5), C.latonLuz, 3);
    L.seco(rectD(x0, top, v.ancho, v.alto), C.cera, 5);
    L.plano(rectD(x0, top + 6, v.ancho * 0.34, v.alto - 6), C.ceraSombra);
    L.plano(rectD(x0 + v.ancho * 0.74, top + 6, v.ancho * 0.18, v.alto - 10), C.ceraLuz);
    // la boca derretida y dos chorretones
    L.seco(ruta(manchaPts([v.x, top + 2], v.ancho * 0.56, 6, 300 + i, 0.25, 20)), C.ceraLuz, 3);
    L.seco(`M ${f1(x0 + v.ancho * 0.72)} ${f1(top)} h 7 v ${f1(v.alto * 0.32)} a 3.5 3.5 0 0 1 -7 0 Z`, C.ceraLuz, 3);
    L.seco(`M ${f1(x0 + 3)} ${f1(top)} h 6 v ${f1(v.alto * 0.18)} a 3 3 0 0 1 -6 0 Z`, C.cera, 3);
    L.raya(`M ${f1(v.x)} ${f1(top + 1)} L ${f1(v.x + 1)} ${f1(top - 9)}`, '#2A1C1C', 2.6);
  });
};

// ---------------------------------------------------------------- la pata derecha de la mesa (se repinta encima del café del suelo)
export const pintaPataDerecha = (L: Lienzo) => {
  const [x0, x1] = PATAS[1];
  L.seco(rectD(x0, 1440, x1 - x0, SUELO - 1440), C.pata, 6);
  L.plano(rectD(x1 - 9, 1440, 7, SUELO - 1440 - 4), '#4E3027');
};

// ---------------------------------------------------------------- dentro: la cabaña
const pintaCabana = (L: Lienzo) => {
  // la pared de troncos, entera (la ventana se pinta encima)
  for (let i = 0, y = 22; y < PARED_FIN; i++, y += 46) {
    L.seco(rectD(14, y, 1052, 48), C.tronco[i % 2], 6);
    L.seco(bandaD(ondas(14, 1066, y + 6, 2.5, 100 + i, 30), y + 13), C.troncoLuz, 5);
    L.plano(rectD(14, y + 40, 1052, 6), C.junta);
    const r = rng(500 + i);
    for (let k = 0; k < 3; k++) {
      const x = 40 + r() * 1000;
      L.plano(elipD([x, y + 20 + r() * 14], 40 + r() * 70, 2.2, 0), '#271A2C', 0.9);
    }
  }
  // la viga del techo
  L.seco(rectD(14, 14, 1052, 72), C.viga, 6);
  L.plano(rectD(14, 80, 1052, 7), '#33232F');
  // la luz de las velas en la pared de debajo de la ventana (dos manchas planas)
  L.seco(ruta(manchaPts([930, 1000], 250, 120, 21, 0.06, 40)), '#C27443', 8, 0.12);
  L.seco(ruta(manchaPts([940, 985], 150, 64, 22, 0.06, 36)), '#E59A55', 6, 0.12);
};

// el perchero bajo la ventana, a la derecha: la bufanda roja de punto y las manoplas colgadas de un cordel
const pintaPerchero = (L: Lienzo) => {
  L.seco(rectD(872, 982, 168, 16), '#4A2F2A', 4);
  L.plano(rectD(872, 982, 168, 4), '#7A4E36');
  [[912, 990], [1006, 990]].forEach(([x, y]) => L.seco(circD([x, y], 7), '#6B4430', 3));
  // la bufanda: dos caídas con rayas crema y los flecos
  const caida = (x: number, ancho: number, largo: number, inclina: number) => {
    const pts: P[] = [[x - ancho / 2, 996], [x + ancho / 2, 996], [x + ancho / 2 + inclina, 996 + largo], [x - ancho / 2 + inclina, 996 + largo]];
    L.seco(ruta(pts), '#A8343A', 5);
    for (let k = 1; k <= 3; k++) {
      const y = 996 + largo * (0.42 + k * 0.13);
      const dx = inclina * ((y - 996) / largo);
      L.plano(rectD(x - ancho / 2 + dx, y, ancho, 9), '#E6D6B4');
    }
    L.plano(rectD(x - ancho / 2 + inclina, 996, ancho * 0.28, largo), '#7E2430', 0.55);
    for (let k = 0; k < 6; k++) L.raya(`M ${f1(x - ancho / 2 + inclina + 4 + k * (ancho - 8) / 5)} ${f1(996 + largo)} l 0 14`, '#C8505A', 3);
  };
  caida(898, 40, 196, -6);
  caida(932, 38, 168, 4);
  L.seco(elipD([915, 1004], 34, 14), '#B83C42', 5);
  // las manoplas
  L.raya('M 1006 994 Q 990 1030 978 1052 M 1006 994 Q 1020 1030 1030 1050', '#D9C9A6', 2.2);
  [[976, 1080, -0.12], [1030, 1076, 0.14]].forEach(([x, y, a], i) => {
    L.seco(elipD([x, y], 22, 32, a), '#2E5F8E', 5);
    L.seco(elipD([x + (i ? 18 : -18), y - 8], 9, 14, a + (i ? 0.5 : -0.5)), '#2E5F8E', 3);
    L.plano(rectD(x - 22, y + 22, 44, 12), '#E6D6B4');
    [[-8, -6], [8, 2], [-4, 12]].forEach(([dx, dy]) => L.plano(circD([x + dx, y + dy], 3), '#E6EEF9'));
  });
};

const pintaVentana = (L: Lienzo) => {
  const {x0, y0, x1, y1} = MARCO;
  const v = VIDRIO;
  // el marco: un anillo (lo de fuera menos el vidrio), con la sombra en su canto de arriba y de la izquierda
  L.seco(rectD(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8) + ' ' + rectD(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0), C.marco, 8, 1, 'evenodd');
  L.plano(rectD(x0 - 4, y0 - 4, x1 - x0 + 8, 6), '#4F3441');
  L.plano(rectD(v.x0 - 8, v.y0 - 8, v.x1 - v.x0 + 16, 8), C.marcoOsc);
  L.plano(rectD(v.x0 - 8, v.y0, 8, v.y1 - v.y0), C.marcoOsc);
  // los dos mainels y el travesaño
  MAINELES.forEach(([a, b]) => {
    L.seco(rectD(a, v.y0, b - a, v.y1 - v.y0), C.marco, 5);
    L.plano(rectD(a, v.y0, 5, v.y1 - v.y0), C.marcoOsc);
  });
  L.seco(rectD(v.x0, TRAVESANO[0], v.x1 - v.x0, TRAVESANO[1] - TRAVESANO[0]), C.marco, 5);
  L.plano(rectD(v.x0, TRAVESANO[0], v.x1 - v.x0, 4), C.marcoOsc);
  // los cantos que dan a las velas, con su luz cálida
  L.plano(rectD(MAINELES[1][1] - 6, 600, 6, v.y1 - 600), C.marcoLuz, 0.85);
  L.plano(rectD(v.x1 - 2, 640, 8, v.y1 - 640), C.marcoLuz, 0.75);
  // el alféizar: la cara de arriba (clara junto a las velas) y el frente; y su sombra en la pared
  L.seco(rectD(40, ALFEIZAR, 1000, 26), C.alfeizar, 6);
  L.seco(ruta(manchaPts([930, ALFEIZAR + 13], 160, 13, 31, 0.1)), C.alfeizarLuz, 4, 0.9);
  L.seco(rectD(40, ALFEIZAR + 26, 1000, 28), C.alfeizarFrente, 6);
  L.seco(ruta(manchaPts([930, ALFEIZAR + 40], 140, 13, 32, 0.1)), '#5E3A2D', 4, 0.9);
  L.plano(rectD(40, ALFEIZAR + 54, 1000, 10), '#170F1C', 0.8);
};

const pintaSuelo = (L: Lienzo) => {
  // las tablas, en filas que se abren hacia delante
  const filas = [PARED_FIN, 1572, 1606, 1646, 1694, 1752, 1822, 1910];
  for (let i = 0; i < filas.length - 1; i++) {
    const y = filas[i], h = filas[i + 1] - y;
    L.seco(rectD(10, y, 1060, h + 2), C.suelo[i % 3], 6);
    L.plano(rectD(10, y, 1060, 3 + i * 0.4), C.sueloJunta);
    const r = rng(700 + i);
    for (let x = 30 + r() * 200; x < 1060; x += 240 + r() * 200) L.plano(rectD(x, y, 3 + i * 0.3, h), C.sueloJunta);
    L.plano(elipD([100 + r() * 800, y + h * 0.5], 90 + r() * 60, 1.8 + i * 0.3), '#2B1E25', 0.8);
  }
  // el zócalo
  L.seco(rectD(10, PARED_FIN - 16, 1060, 22), C.zocalo, 5);
  L.plano(rectD(10, PARED_FIN - 16, 1060, 4), '#3B2B33');
  // la alfombra trenzada: anillos planos
  const anillos: [number, number, string][] = [
    [300, 96, '#6A2B36'], [262, 82, '#A0693A'], [226, 70, '#2D4170'], [188, 58, '#8B3A3D'], [148, 46, '#C2964F'], [104, 32, '#2D4170'], [58, 18, '#A0693A'],
  ];
  anillos.forEach(([rx, ry, col], i) => L.seco(ruta(manchaPts([360, 1772], rx, ry, 40 + i, 0.025, 56)), col, 7));
  // las puntadas de la trenza en dos anillos
  [[244, 76], [168, 52]].forEach(([rx, ry], j) => {
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * Math.PI * 2;
      const c: P = [360 + Math.cos(a) * rx, 1772 + Math.sin(a) * ry];
      L.plano(elipD(c, 7, 2.4, a + Math.PI / 2 + 0.6), j ? '#D9B36A' : '#B9824A', 0.8);
    }
  });
};

const pintaMesa = (L: Lienzo) => {
  // las patas, el faldón, el frente y la cara de arriba (la luz de las velas, en la punta derecha)
  PATAS.forEach(([a, b], i) => {
    L.seco(rectD(a, 1040, b - a, SUELO - 1040), C.pata, 6);
    if (i === 1) L.plano(rectD(b - 9, 1046, 7, SUELO - 1050), '#4E3027');
    L.plano(elipD([(a + b) / 2 + 6, SUELO + 2], 30, 6), '#140D14', 0.7);
  });
  L.seco(rectD(PATAS[0][0], 1044, PATAS[1][1] - PATAS[0][0], 32), '#2D1B1E', 5);
  L.seco(rectD(MESA_X0, MESA_Y, BORDE + 2 - MESA_X0, 36), C.mesaFrente, 6);
  L.seco(rectD(470, MESA_Y + 2, BORDE + 2 - 470, 32), C.mesaFrenteLuz, 4, 0.9);
  L.plano(rectD(MESA_X0, MESA_Y + 30, BORDE + 2 - MESA_X0, 6), '#2A1813');
  L.seco(rectD(MESA_X0, MESA_Y - 14, BORDE + 2 - MESA_X0, 15), C.mesaArriba, 5);
  L.seco(rectD(430, MESA_Y - 14, BORDE + 2 - 430, 15), C.mesaArribaLuz, 4, 0.85);
  // las vetas del frente
  L.plano(elipD([260, MESA_Y + 14], 120, 2), '#352018', 0.9);
  L.plano(elipD([560, MESA_Y + 22], 90, 2), '#5A341F', 0.9);
};

const pintaCesta = (L: Lienzo) => {
  // la cesta de leña bajo la mesa, contra la pared
  const r = rng(91);
  const troncos: [number, number, number][] = [[234, 1436, 23], [280, 1420, 21], [328, 1434, 25], [376, 1418, 21], [414, 1438, 19], [304, 1404, 18]];
  troncos.forEach(([x, y, rr]) => {
    L.seco(elipD([x - 6, y + 4], rr + 3, rr + 2), C.corteza, 4);
    L.seco(circD([x, y], rr), C.lenaCorte, 4);
    L.plano(circD([x, y], rr * 0.62), C.lenaAnillo, 0.8);
    L.plano(circD([x, y], rr * 0.5), C.lenaCorte);
    L.plano(circD([x + r() * 3, y], rr * 0.2), C.lenaAnillo, 0.9);
  });
  L.seco(ruta([[196, 1446], [450, 1446], [436, 1560], [212, 1560]]), C.mimbre, 6);
  for (let y = 1458; y < 1556; y += 16) L.plano(rectD(200 + (y - 1446) * 0.13, y, 246 - (y - 1446) * 0.26, 6), C.mimbreOsc);
  for (let x = 222; x < 436; x += 22) L.plano(rectD(x, 1452, 4, 104), C.mimbreOsc, 0.7);
  L.seco(rectD(190, 1440, 266, 14), '#8B5E38', 4);
  L.plano(elipD([326, 1564], 140, 9), '#120B12', 0.6);
};

// ---------------------------------------------------------------- todo junto (una vez por copia)
type Decorado = {fondo: React.ReactNode[]; guirnalda: React.ReactNode[]; velas: React.ReactNode[]; pata: React.ReactNode[]};
const hechos = new Map<string, Decorado>();
export const decorado = (clipVidrio: string, clave: string): Decorado => {
  const hecho = hechos.get(clave);
  if (hecho) return hecho;
  const F = lienzo();
  pintaCabana(F);
  const P = lienzo();
  pintaPaisaje(P);
  F.nodo(<g clipPath={`url(#${clipVidrio})`}>{P.out}</g>);
  pintaVentana(F);
  pintaPerchero(F);
  pintaGuirnalda(F);
  pintaVelas(F);
  pintaSuelo(F);
  pintaCesta(F);
  pintaMesa(F);
  const G = lienzo();
  pintaGuirnalda(G);
  const V = lienzo();
  pintaVelas(V);
  const Pt = lienzo();
  pintaPataDerecha(Pt);
  const d = {fondo: F.out, guirnalda: G.out, velas: V.out, pata: Pt.out};
  hechos.set(clave, d);
  return d;
};

// las estrellas: siempre las mismas, solo en el cielo (ni detrás de las montañas, ni de la luna, ni de los palos de la ventana)
export const ESTRELLAS = (() => {
  const r = rng(1717);
  const out: {c: P; r: number; fase: number; brillo: boolean}[] = [];
  let intentos = 0;
  while (out.length < 46 && intentos < 2000) {
    intentos++;
    const c: P = [VIDRIO.x0 + 8 + r() * (VIDRIO.x1 - VIDRIO.x0 - 16), VIDRIO.y0 + 50 + r() * 380];
    const rr = 1.8 + r() * 2.2, fase = r() * 6.28, brillo = r() < 0.16;
    if (Math.hypot(c[0] - LUNA[0], c[1] - LUNA[1]) < 150) continue;
    if (c[1] > cresta(c[0]) - 18) continue;
    if (MAINELES.some(([a, b]) => c[0] > a - 8 && c[0] < b + 8)) continue;
    if (c[1] > TRAVESANO[0] - 8 && c[1] < TRAVESANO[1] + 8) continue;
    out.push({c, r: brillo ? 7 + r() * 3 : rr, fase, brillo});
  }
  return out;
})();
