import React, {useLayoutEffect, useRef, useState} from 'react';
import {E, clamp, kf, rng, temblor} from '../../../comun/curvas';
import {
  DUR, ESCALA_GATO, IMPACTO, SUELO, T_CAE, T_SUELO, cafe, enMundo, gato, piezasTaza, rot, suma, taza, trozos, type P,
} from '../../gato/escena';
import {
  CERA, borrar, capa, colorear, contorno, formaPoli, lienzo, pintarPapel, punto, raya, repasar, trazarFormas, type Capa, type Forma,
  type Lienzo,
} from './ceras';
import {pintarFijo, pintarVivo, taparVivo} from './decorado';
import {pintarGato, siluetaGato} from './gato';
import {escribir, medir} from './letras';

// EL GATO EN CERA DE COLORES. El dibujo de un niño con ceras sobre papel blanco: la cera no cubre del
// todo y por dentro del color asoman los huecos blancos del relieve del papel; los rellenos son garabatos de ida y vuelta que se
// salen de la raya; los contornos tiemblan y van repasados dos veces; los colores, los de la caja (rojo, azul, amarillo, verde,
// naranja, negro). El cuarto, como lo dibuja un niño: «MI GATO» arriba con letras torcidas, el sol con cara en la esquina, la
// ventana roja con su nube y su árbol, el arcoíris colgado, el reloj, la mesa de patas rectas, la alfombra, la planta, la pelota
// y el niño de palitos que mira. El gato naranja grande, con bigotes de raya; la taza roja con un corazón.
// Todo va «a doses» (12 dibujos por segundo, alineados con el golpe a los 3,1 s) y cada dibujo es otro: el trazo hierve.
// EL MOMENTO: empuja la taza mirándote; la taza cae girando con sus rayitas de movimiento y el café como una raya marrón que se
// sale; al romperse, la estrella amarilla con el «¡CRAS!» de letra de niño, el café hecho un garabato que salpica, los trozos
// rojos que saltan, el niño con las manos arriba y el gato con su gota de sudor: «yo no fui».
// Cómo se pinta: ceras.ts (el papel, el grano, los trazos y los garabatos), decorado.ts (el cuarto y el niño), gato.ts, letras.ts.

const C_CAFE = CERA.cafe;
const PASOS_HERVOR = 3; // lo fijo hierve con tres dibujos que se repiten, como en la animación a mano

// ---------------------------------------------------------------- lo fijo, hecho una vez por cada dibujo del hervor
const FIJO = new Map<string, HTMLCanvasElement>();
const fijo = (l: Lienzo, hervor: number) => {
  const clave = `${l.W}x${l.H}-${hervor}`;
  const hecho = FIJO.get(clave);
  if (hecho) return hecho;
  const cv = document.createElement('canvas');
  cv.width = l.W;
  cv.height = l.H;
  const lf: Lienzo = {...l, c: cv.getContext('2d')!, ox: 0, oy: 0};
  pintarPapel(lf);
  capa(lf, (cp) => pintarFijo(cp, hervor));
  FIJO.set(clave, cv);
  return cv;
};

// ---------------------------------------------------------------- la taza roja
const corazon = (c: P, k: number, ang: number): P[] =>
  Array.from({length: 22}, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const q: P = [16 * Math.sin(a) ** 3 * k, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * k];
    return suma(c, rot(q, ang));
  });
const formasTaza = (t: number) => {
  const tz = taza(t);
  const pz = piezasTaza(tz);
  return {tz, pz, cuerpo: formaPoli(pz.cuerpo), asa: formaPoli(pz.asa)};
};
const taparTaza = (c: CanvasRenderingContext2D, t: number) => {
  if (taza(t).estado === 'suelo') return;
  const {cuerpo, asa} = formasTaza(t);
  trazarFormas(c, [cuerpo, asa]);
};
const pintarTaza = (cp: Capa, t: number, sem: number) => {
  const {tz, pz, cuerpo, asa} = formasTaza(t);
  if (tz.estado === 'suelo') return;
  let n = 0;
  const s = () => sem + n++ * 19;
  // las rayitas de movimiento, detrás de la taza que cae
  if (tz.estado === 'cae' && t > T_CAE + 0.04) {
    const a = taza(t - 0.02).c, b = taza(t + 0.02).c;
    const v: P = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(v[0], v[1]) || 1;
    const d: P = [-v[0] / L, -v[1] / L], nn: P = [-d[1], d[0]];
    [-1, 0, 1].forEach((j) => {
      const ini = suma(tz.c, [d[0] * (104 + 14 * Math.abs(j)) + nn[0] * j * 42, d[1] * (104 + 14 * Math.abs(j)) + nn[1] * j * 42]);
      const fin = suma(ini, [d[0] * (72 - 18 * Math.abs(j)), d[1] * (72 - 18 * Math.abs(j))]);
      raya(cp, [ini, fin], {color: CERA.negro, ancho: 7, alfa: 0.85, semilla: s(), temblor: 1.5, repasa: false});
    });
  }
  colorear(cp, asa, {color: CERA.rojo, ancho: 9, sep: 7, ang: tz.ang + 1.1, alfa: 0.95, semilla: s(), sobra: 2});
  borrar(cp, [cuerpo]);
  colorear(cp, cuerpo, {color: CERA.rojo, ancho: 12, sep: 9.5, ang: tz.ang + 0.5, alfa: 0.92, semilla: s(), sobra: 6, cruzado: true});
  // el corazón amarillo de la taza
  const cpts = corazon(suma(tz.c, rot([-2, 12], tz.ang)), 1.65, tz.ang);
  const cz = formaPoli(cpts);
  borrar(cp, [cz]);
  colorear(cp, cz, {color: CERA.amarillo, ancho: 8, sep: 5.5, ang: tz.ang + 0.3, alfa: 1, semilla: s(), sobra: 1});
  contorno(cp, cpts, {color: CERA.naranja, ancho: 4, alfa: 0.9, semilla: s(), temblor: 0.8, vueltas: 1});
  // el café de arriba, mientras no se derrama
  if (t < T_CAE + 0.08) raya(cp, [pz.cafe[0], pz.cafe[1]], {color: C_CAFE, ancho: 13, alfa: 0.95, semilla: s(), temblor: 1, repasa: false});
  repasar(cp, [cuerpo, asa], {color: CERA.rojoOsc, ancho: 7.5, alfa: 0.95, semilla: s(), temblor: 2});
};

// ---------------------------------------------------------------- el café en el aire: una raya marrón que se sale, y sus gotas
const pintarCafeAire = (cp: Capa, t: number, sem: number) => {
  const cf = cafe(t);
  let n = 0;
  const s = () => sem + n++ * 13;
  const chorro = cf.gotas
    .filter((d) => d.i < 100)
        .filter((d) => d.c[1] < SUELO + 6 && t < T_SUELO + 0.02); // al romperse, el chorro ya es charco
  const tramos: {c: P; r: number}[][] = [];
  chorro.forEach((d, i) => {
    if (i === 0 || Math.hypot(d.c[0] - chorro[i - 1].c[0], d.c[1] - chorro[i - 1].c[1]) > 70) tramos.push([]);
    tramos[tramos.length - 1].push(d);
  });
  for (const tr of tramos) {
    if (tr.length >= 2) {
      const r = tr.reduce((a, d) => a + d.r, 0) / tr.length;
      raya(cp, tr.map((d) => d.c), {color: C_CAFE, ancho: r * 1.5, alfa: 0.95, semilla: s(), temblor: 2.5});
    }
  }
  for (const d of chorro) punto(cp, d.c, d.r * 0.85, {color: C_CAFE, ancho: 7, alfa: 1, semilla: s()});
  for (const d of cf.gotas) if (d.i >= 100) punto(cp, d.c, d.r * 1.6, {color: C_CAFE, ancho: 8, alfa: 1, semilla: s()});
};

// ---------------------------------------------------------------- el golpe
// una mancha con lóbulos (el charco, las salpicaduras), siempre la misma para la misma semilla
const mancha = (c: P, rx: number, ry: number, semilla: number, lobulos = 0.2, n = 26): P[] => {
  const r = rng(semilla);
  const f = [r() * 6.28, r() * 6.28, r() * 6.28];
  return Array.from({length: n}, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + lobulos * (0.5 * Math.sin(3 * a + f[0]) + 0.3 * Math.sin(5 * a + f[1]) + 0.2 * Math.sin(8 * a + f[2]));
    return [c[0] + Math.cos(a) * rx * k, c[1] + Math.sin(a) * ry * k] as P;
  });
};
// la estrella amarilla del golpe: crece de golpe, se pasa un poco y se queda
const ESTRELLA_C: P = [782, 1262];
const estrella = (k: number): P[] => {
  const r = rng(91);
  return Array.from({length: 26}, (_, i) => {
    const a = (i / 26) * Math.PI * 2 - Math.PI / 2;
    const rad = (i % 2 ? 92 : 150 * (0.86 + 0.28 * r())) * k;
    return [ESTRELLA_C[0] + Math.cos(a) * rad * 1.42, ESTRELLA_C[1] + Math.sin(a) * rad] as P;
  });
};
const tamEstrella = (t: number) => {
  const s = t - T_SUELO;
  if (s < 0 || t > 4.7) return 0;
  return kf(s, [[0, 0.92], [1 / 12, 1.14], [2 / 12, 1.0, E.outCubic]]);
};
// la gota de sudor del gato («yo no fui»): junto a la cabeza, del lado de la taza
const sudor = (t: number): {pts: P[]} | null => {
  if (t < T_SUELO + 0.12 || t > 4.3) return null;
  const g = gato(t);
  const c = enMundo(suma(g.cabeza.c, rot([g.cabeza.rx * 1.05, -g.cabeza.ry * 0.55], g.cabeza.ang)));
  const caida = Math.min(18, (t - T_SUELO - 0.12) * 40);
  // la punta arriba y el culo redondo
  const base: P = [c[0], c[1] + caida];
  const arco: P[] = Array.from({length: 15}, (_, i) => {
    const a = ((-62 + (i / 14) * 304) * Math.PI) / 180;
    return [base[0] + Math.cos(a) * 15, base[1] + Math.sin(a) * 15] as P;
  });
  const pts: P[] = [[base[0], base[1] - 34], ...arco];
  return {pts};
};
const formasGolpe = (t: number): Forma[] => {
  const out: Forma[] = trozos(t).map((q) => formaPoli(q.pts));
  const k = tamEstrella(t);
  if (k > 0) out.push(formaPoli(estrella(k)));
  const sd = sudor(t);
  if (sd) out.push(formaPoli(sd.pts));
  return out;
};
const pintarGolpe = (cp: Capa, t: number, sem: number) => {
  if (t < T_SUELO) return;
  let n = 0;
  const s = () => sem + n++ * 29;
  const cf = cafe(t);
  // el charco: un garabato marrón con su raya, que crece
  if (cf.charco) {
    const ch = cf.charco;
    const blob = mancha([ch.c[0], ch.c[1] - 4], ch.rx * 1.05, Math.max(16, ch.ry * 1.9), 5, 0.22);
    const f = formaPoli(blob);
    borrar(cp, [f]);
    colorear(cp, f, {color: C_CAFE, ancho: 11, sep: 7.5, ang: 0.12, alfa: 0.95, semilla: s(), sobra: 5, cruzado: true});
    contorno(cp, blob, {color: CERA.marronOsc, ancho: 6, alfa: 0.9, semilla: s(), temblor: 2, vueltas: 1});
  }
  for (const m of cf.manchas) {
    const f = formaPoli(mancha(m.c, m.rx * 1.25, Math.max(7, m.ry * 1.9), 900 + m.i, 0.25, 14));
    colorear(cp, f, {color: C_CAFE, ancho: 7, sep: 5, ang: 0.3, alfa: 1, semilla: s(), sobra: 2});
  }
  // los trozos rojos
  for (const q of trozos(t)) {
    const f = formaPoli(q.pts);
    borrar(cp, [f]);
    colorear(cp, f, {color: CERA.rojo, ancho: 8, sep: 6, ang: q.ang + 0.4, alfa: 0.95, semilla: s(), sobra: 3});
    repasar(cp, [f], {color: CERA.rojoOsc, ancho: 5.5, alfa: 0.95, semilla: s(), temblor: 1.2});
  }
  // las rayitas del golpe, alrededor
  const sg = t - T_SUELO;
  if (sg < 0.26) {
    [204, 226, 248, 272, 294, 316, 338].forEach((a, i) => {
      const u: P = [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)];
      const r0 = 92 + (i % 2) * 18 + sg * 120;
      const base: P = [IMPACTO[0], SUELO - 24];
      raya(cp, [suma(base, [u[0] * r0 * 1.2, u[1] * r0 * 0.9]), suma(base, [u[0] * (r0 + 62) * 1.2, u[1] * (r0 + 62) * 0.9])],
        {color: CERA.negro, ancho: 8, alfa: 0.9, semilla: s(), temblor: 1.5, repasa: false});
    });
  }
  // las gotas que saltan con el golpe y lo que queda del chorro
  pintarCafeAire(cp, t, sem + 7);
  // la estrella con el «¡CRAS!»
  const k = tamEstrella(t);
  if (k > 0) {
    const pts = estrella(k);
    const f = formaPoli(pts);
    borrar(cp, [f]);
    colorear(cp, f, {color: CERA.amarillo, ancho: 15, sep: 12, ang: 0.45, alfa: 0.95, semilla: s(), sobra: 7, cruzado: true});
    contorno(cp, pts, {color: CERA.naranja, ancho: 10, alfa: 0.95, semilla: s(), temblor: 2.5});
    const alto = 94 * Math.min(1.08, k);
    const ancho = medir('¡CRAS!', alto, 0.18);
    escribir(cp, '¡CRAS!', {x: ESTRELLA_C[0] - ancho / 2, y: ESTRELLA_C[1] - alto * 0.56, alto, ancho: 21, semilla: sem % 977, torcido: 0.16, salta: 0.1,
      separa: 0.18, colores: [CERA.rojo]});
  }
  // la gota de sudor del gato
  const sd = sudor(t);
  if (sd) {
    const f = formaPoli(sd.pts);
    colorear(cp, f, {color: CERA.celeste, ancho: 8, sep: 5, ang: 0.6, alfa: 0.95, semilla: s(), sobra: 2});
    contorno(cp, sd.pts, {color: CERA.azul, ancho: 5, alfa: 0.95, semilla: s(), temblor: 1, vueltas: 1});
  }
};

// ---------------------------------------------------------------- el cuadro entero
const O_GATO = enMundo([0, 0]); // el gato va 1,14 veces más grande desde donde se sienta
const pintar = (canvas: HTMLCanvasElement, tt: number, k: number) => {
  const l = lienzo(canvas, k);
  // a doses: 12 dibujos por segundo, con uno justo en el golpe
  const paso = Math.floor((clamp(tt, 0, DUR) - T_SUELO) * 12 + 1e-6);
  const t = clamp(T_SUELO + paso / 12, 0, DUR);
  const hervor = ((paso % PASOS_HERVOR) + PASOS_HERVOR) % PASOS_HERVOR;
  const sem = 100 + ((paso % 97) + 97) * 53; // y cada dibujo, otra mano
  const [sx, sy] = temblor(t, T_SUELO, 0.3, 12, 5);

  pintarPapel(l);
  l.c.drawImage(fijo(l, hervor), Math.round(sx * k), Math.round(sy * k));
  l.ox = sx;
  l.oy = sy;
  capa(l, (cp) => pintarVivo(cp, t, paso), {tapar: (c) => taparVivo(c, t)});
  capa(l, (cp) => {
    pintarTaza(cp, t, sem + 1);
    if (t < T_SUELO) pintarCafeAire(cp, t, sem + 2);
  }, {tapar: (c) => taparTaza(c, t)});
  const g = gato(t);
  capa(l, (cp) => {
    cp.c.save();
    cp.c.transform(ESCALA_GATO, 0, 0, ESCALA_GATO, O_GATO[0], O_GATO[1]);
    pintarGato(cp, g, sem + 3);
    cp.c.restore();
  }, {
    aMundo: enMundo,
    tapar: (c) => {
      c.save();
      c.transform(ESCALA_GATO, 0, 0, ESCALA_GATO, O_GATO[0], O_GATO[1]);
      siluetaGato(c, g);
      c.restore();
    },
  });
  capa(l, (cp) => pintarGolpe(cp, t, sem + 4), {tapar: (c) => trazarFormas(c, formasGolpe(t))});
};

export const CeraDeColores: React.FC<{t: number}> = ({t}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  // el lienzo, como mucho a 1080 × 1920 (también al sacarlo en 4K)
  const [k] = useState(() => Math.min(1, Math.max(0.25, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)));
  useLayoutEffect(() => {
    if (ref.current) pintar(ref.current, t, k);
  }, [t, k]);
  return (
    <canvas ref={ref} width={Math.round(1080 * k)} height={Math.round(1920 * k)}
      style={{position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#FFFDF5'}} />
  );
};
