import {rng} from '../../../comun/curvas';
import {rot, suma, type P} from '../../gato/escena';
import {punto, raya, type Capa, type RGB} from './ceras';

// LA LETRA DE NIÑO: mayúsculas de palitos, cada una de un trazo de cera, torcida, de su tamaño y saltando
// de la línea, repasada dos veces. Sin fuente: así la letra lleva el grano del papel como todo lo demás y tiembla igual.
// Cada letra, en una caja de 1 de alto (y hacia abajo); `w` es su ancho.

const arco = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 16): P[] =>
  Array.from({length: n + 1}, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P;
  });

type Letra = {w: number; t: P[][]; puntos?: P[]};
const LETRAS: Record<string, Letra> = {
  A: {w: 0.9, t: [[[0, 1], [0.45, 0], [0.9, 1]], [[0.2, 0.62], [0.72, 0.6]]]},
  C: {w: 0.85, t: [arco(0.47, 0.5, 0.45, 0.5, -38, -318)]},
  G: {w: 0.92, t: [[...arco(0.48, 0.5, 0.46, 0.5, -38, -328), [0.9, 0.56], [0.56, 0.56]]]},
  I: {w: 0.42, t: [[[0, 0.01], [0.42, 0]], [[0.21, 0], [0.22, 1]], [[0, 1], [0.42, 0.99]]]},
  M: {w: 1.05, t: [[[0, 1], [0.04, 0], [0.52, 0.64], [1.0, 0], [1.05, 1]]]},
  O: {w: 0.92, t: [arco(0.46, 0.5, 0.46, 0.5, -110, 268, 24)]},
  R: {w: 0.82, t: [[[0, 1], [0, 0], [0.42, 0], ...arco(0.42, 0.25, 0.32, 0.25, -90, 90, 10), [0, 0.5]], [[0.34, 0.5], [0.82, 1]]]},
  S: {w: 0.76, t: [[[0.74, 0.13], [0.52, 0.0], [0.2, 0.03], [0.04, 0.22], [0.18, 0.42], [0.56, 0.55], [0.76, 0.74], [0.64, 0.95], [0.32, 1.0], [0.02, 0.86]]]},
  T: {w: 0.88, t: [[[0, 0.03], [0.88, 0]], [[0.44, 0.01], [0.46, 1]]]},
  Y: {w: 0.86, t: [[[0, 0], [0.43, 0.5], [0.86, 0]], [[0.43, 0.5], [0.44, 1]]]},
  '!': {w: 0.22, t: [[[0.11, 0], [0.11, 0.64]]], puntos: [[0.11, 0.92]]},
  '¡': {w: 0.22, t: [[[0.11, 0.36], [0.11, 1]]], puntos: [[0.11, 0.08]]},
  '?': {w: 0.7, t: [[[0.04, 0.24], [0.2, 0.04], [0.5, 0], [0.7, 0.18], [0.6, 0.4], [0.36, 0.52], [0.36, 0.68]]], puntos: [[0.36, 0.93]]},
  '¿': {w: 0.7, t: [[[0.66, 0.76], [0.5, 0.96], [0.2, 1], [0, 0.82], [0.1, 0.6], [0.34, 0.48], [0.34, 0.32]]], puntos: [[0.34, 0.07]]},
  ' ': {w: 0.42, t: []},
};

export type OpcEscribir = {
  x: number; y: number; // arriba a la izquierda
  alto: number;
  colores: RGB[]; // uno por letra (se repiten)
  ancho: number;
  semilla: number;
  separa?: number; // el aire entre letras (en altos)
  torcido?: number; // lo que se tuerce cada letra (radianes)
  salta?: number; // lo que se sale de la línea (en altos)
  alfa?: number;
};
// escribe y devuelve el ancho que ocupó
export const escribir = (cp: Capa, texto: string, o: OpcEscribir) => {
  const r = rng(o.semilla);
  let x = o.x;
  [...texto].forEach((ch, i) => {
    const L = LETRAS[ch] ?? LETRAS[' '];
    const s = o.alto * (0.9 + 0.22 * r());
    const ang = (r() - 0.5) * 2 * (o.torcido ?? 0.12);
    const dy = (r() - 0.5) * 2 * (o.salta ?? 0.07) * o.alto + (o.alto - s) * 0.6;
    const centro: P = [x + (L.w * s) / 2, o.y + dy + s / 2];
    const a = (q: P): P => suma(centro, rot([(q[0] - L.w / 2) * s, (q[1] - 0.5) * s], ang));
    const color = o.colores[i % o.colores.length];
    L.t.forEach((tr, j) => raya(cp, tr.map(a), {color, ancho: o.ancho, alfa: o.alfa ?? 0.95, semilla: o.semilla * 31 + i * 7 + j, temblor: o.alto * 0.022}));
    (L.puntos ?? []).forEach((q, j) => punto(cp, a(q), o.ancho * 0.75, {color, ancho: o.ancho * 0.55, alfa: o.alfa ?? 0.95, semilla: o.semilla + i * 11 + j}));
    x += (L.w + (o.separa ?? 0.22)) * s;
  });
  return x - o.x;
};
// lo que mide un texto (para centrarlo), con el tamaño medio de las letras
export const medir = (texto: string, alto: number, separa = 0.22) =>
  [...texto].reduce((s, ch) => s + ((LETRAS[ch] ?? LETRAS[' ']).w + separa) * alto * 1.01, 0) - separa * alto;
