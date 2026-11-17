import {mix} from '../../../comun/curvas';
import {rot, suma, type Elipse, type Gato, type Oreja, type P, type Pata} from '../../gato/escena';
import {
  CERA, borrar, colorear, contorno, formaCapsula, formaCinta, formaElipse, formaPoli, raya, repasar, trazarFormas, unir,
  type Capa, type Forma, type RGB,
} from './ceras';

// EL GATO A CERAS: el gato naranja grande de la escena, dibujado como lo dibuja un niño. Cada parte se
// colorea con un garabato naranja que se sale un poco y se repasa con un contorno marrón temblón, dos veces; las rayas, cuatro
// trazos rojizos de cera; los ojos, blancos (el papel) con el iris verde y la pupila negra; los mofletes rosas, la nariz rosa y los
// bigotes de raya negra, largos. Todo sale de la pose de la escena (gato(t)), en sus medidas: se pinta dentro de TRANSFORMA_GATO.
// Orden: la cola, la pata de detrás, el cuerpo, la pata de delante, las orejas y la cabeza. Antes de cada parte se borra lo que
// queda debajo (en la misma capa), para que por sus huecos asome el papel y no lo de detrás.

const NARANJA: RGB = [247, 138, 24];
const NARANJA_LEJOS: RGB = [226, 112, 18];
const RAYA: RGB = [196, 62, 16];
const TINTA: RGB = [92, 40, 18];
const NEGRO = CERA.negro;
const VERDE_OJO: RGB = [104, 190, 40];

const enE = (e: Elipse, u: number, v: number): P => suma(e.c, rot([u * e.rx, v * e.ry], e.ang));
const orejaForma = (o: Oreja): Forma => {
  const [b1, b2] = o.base;
  const m1 = suma(mixP(b1, o.punta, 0.5), rot(norm(sub(o.punta, b1)), -Math.PI / 2).map((x) => x * 7) as P);
  const m2 = suma(mixP(b2, o.punta, 0.5), rot(norm(sub(o.punta, b2)), Math.PI / 2).map((x) => x * 7) as P);
  return formaPoli([b1, m1, o.punta, m2, b2]);
};
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const norm = (a: P): P => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const mixP = (a: P, b: P, k: number): P => [mix(a[0], b[0], k), mix(a[1], b[1], k)];

const pataFormas = (pt: Pata): Forma[] => [formaCapsula(pt.hombro, pt.codo, 32, 23), formaCapsula(pt.codo, pt.mano, 23, 18), formaElipse(pt.pie)];
export const formasGato = (g: Gato) => ({
  cola: formaCinta(g.cola.pts, g.cola.r),
  pataLejos: pataFormas(g.pataLejos),
  cuerpo: [
    formaElipse(g.cadera), formaElipse(g.torso), formaElipse(g.pecho), formaElipse(g.barriga), formaCapsula(g.cuello[0], g.cuello[1], 62, 58),
    formaElipse(g.pieTrasero),
  ],
  pataCerca: pataFormas(g.pataCerca),
  orejaLejos: orejaForma(g.orejaLejos),
  orejaCerca: orejaForma(g.orejaCerca),
  cabeza: [formaElipse(g.cabeza), formaElipse(g.hocico)],
});
// la silueta entera (donde va papel limpio debajo), en las medidas del gato
export const siluetaGato = (c: CanvasRenderingContext2D, g: Gato) => {
  const F = formasGato(g);
  trazarFormas(c, [F.cola, ...F.pataLejos, ...F.cuerpo, ...F.pataCerca, F.orejaLejos, F.orejaCerca, ...F.cabeza]);
};

export const pintarGato = (cp: Capa, g: Gato, semilla: number) => {
  let n = 0;
  const s = () => semilla + n++ * 23;
  const F = formasGato(g);
  const borde = {color: TINTA, ancho: 8, alfa: 0.95, temblor: 2.6};

  // la cola, con sus anillos
  const cpts = g.cola.pts;
  const angCola = Math.atan2(cpts[cpts.length - 1][1] - cpts[0][1], cpts[cpts.length - 1][0] - cpts[0][0]) + Math.PI / 2;
  colorear(cp, F.cola, {color: NARANJA, ancho: 11, sep: 9, ang: angCola, alfa: 0.9, semilla: s(), sobra: 6});
  [5, 8, 11, 14].forEach((i) => {
    const a = cpts[i - 1], b = cpts[Math.min(cpts.length - 1, i + 1)];
    const u = norm(sub(b, a));
    const nn: P = [-u[1], u[0]];
    const r = g.cola.r[i] * 0.95;
    raya(cp, [suma(cpts[i], [nn[0] * r, nn[1] * r]), suma(cpts[i], [u[0] * 4, u[1] * 4]), suma(cpts[i], [-nn[0] * r, -nn[1] * r])], {
      color: RAYA, ancho: 8, alfa: 0.92, semilla: s(), temblor: 1.2, repasa: false,
    });
  });
  repasar(cp, [F.cola], {...borde, semilla: s()});

  // la pata de detrás
  colorear(cp, unir(F.pataLejos), {color: NARANJA_LEJOS, ancho: 11, sep: 9, ang: 1.2, alfa: 0.9, semilla: s(), sobra: 5});
  repasar(cp, F.pataLejos, {...borde, semilla: s()});

  // el cuerpo: se borra lo de detrás, se colorea a dos garabatos y se repasa el contorno de fuera
  borrar(cp, F.cuerpo);
  const cuerpo = unir(F.cuerpo);
  colorear(cp, cuerpo, {color: NARANJA, ancho: 13, sep: 11, ang: 0.62, alfa: 0.9, semilla: s(), sobra: 10, cruzado: true});
  // las rayas del lomo y del muslo
  const T = g.torso, Ca = g.cadera;
  [-0.62, -0.32, -0.02, 0.28].forEach((v, i) => {
    raya(cp, [enE(T, -1.0, v), enE(T, -0.7, v + 0.03), enE(T, -0.42, v + 0.08 + i * 0.01)], {color: RAYA, ancho: 10, alfa: 0.92, semilla: s(), temblor: 1.5, repasa: false});
  });
  [-0.5, -0.12, 0.26].forEach((u) => {
    raya(cp, [enE(Ca, u - 0.06, -0.98), enE(Ca, u, -0.7), enE(Ca, u + 0.08, -0.42)], {color: RAYA, ancho: 10, alfa: 0.92, semilla: s(), temblor: 1.5, repasa: false});
  });
  repasar(cp, F.cuerpo, {...borde, semilla: s()});

  // la pata de delante, con sus dedos
  borrar(cp, F.pataCerca);
  colorear(cp, unir(F.pataCerca), {color: NARANJA, ancho: 11, sep: 9, ang: 1.25, alfa: 0.92, semilla: s(), sobra: 5});
  const pc = g.pataCerca;
  raya(cp, [mixP(pc.hombro, pc.codo, 0.45), suma(mixP(pc.hombro, pc.codo, 0.5), rot([26, 0], Math.atan2(pc.codo[1] - pc.hombro[1], pc.codo[0] - pc.hombro[0]) - 1.3))],
    {color: RAYA, ancho: 8, alfa: 0.9, semilla: s(), temblor: 1, repasa: false});
  repasar(cp, F.pataCerca, {...borde, semilla: s()});
  for (const u of [0.25, 0.62]) raya(cp, [enE(pc.pie, u, -0.95), enE(pc.pie, u + 0.04, 0.05)], {color: TINTA, ancho: 4.5, alfa: 0.9, semilla: s(), temblor: 0.6, repasa: false});

  // las orejas (detrás de la cabeza), con su rosa dentro
  for (const [f, o] of [[F.orejaLejos, g.orejaLejos], [F.orejaCerca, g.orejaCerca]] as [Forma, Oreja][]) {
    borrar(cp, [f]);
    colorear(cp, f, {color: NARANJA, ancho: 10, sep: 8, ang: 1.0, alfa: 0.92, semilla: s(), sobra: 4});
    const dentro = formaPoli(o.dentro);
    colorear(cp, dentro, {color: CERA.rosa, ancho: 8, sep: 6, ang: 0.3, alfa: 0.95, semilla: s(), sobra: 2});
    repasar(cp, [f], {...borde, semilla: s()});
  }

  // la cabeza: naranja, el hocico claro, las rayas de la frente y el contorno
  borrar(cp, F.cabeza);
  const cab = g.cabeza;
  colorear(cp, F.cabeza[0], {color: NARANJA, ancho: 13, sep: 11, ang: -0.5, alfa: 0.9, semilla: s(), sobra: 8, cruzado: true});
  borrar(cp, [formaElipse({...g.hocico, rx: g.hocico.rx - 4, ry: g.hocico.ry - 4})]);
  colorear(cp, formaElipse(g.hocico), {color: CERA.crema, ancho: 10, sep: 8, ang: 0.2, alfa: 0.85, semilla: s(), sobra: 2});
  const fx = mix(34, 0, g.giro);
  [-1, 0, 1].forEach((j) => {
    const a = suma(cab.c, rot([fx + j * 24, -90 + Math.abs(j) * 8], cab.ang));
    const b = suma(cab.c, rot([fx + j * 21, -60 + Math.abs(j) * 6], cab.ang));
    raya(cp, [a, b], {color: RAYA, ancho: 9, alfa: 0.92, semilla: s(), temblor: 1, repasa: false});
  });
  repasar(cp, F.cabeza, {...borde, semilla: s()});

  // los mofletes
  for (const o of [g.ojoLejos, g.ojoCerca]) {
    if (o.rx < 22) continue;
    const m = suma(o.c, rot([o === g.ojoCerca ? -14 : 14, 46], cab.ang));
    colorear(cp, formaElipse({c: m, rx: 17, ry: 12, ang: cab.ang}), {color: CERA.rosa, ancho: 8, sep: 6, ang: 0.4, alfa: 0.75, semilla: s(), sobra: 2});
  }

  // los ojos: el papel, el iris verde, la pupila negra y su brillo
  for (const o of [g.ojoLejos, g.ojoCerca]) {
    if (o.cerrado || o.visible.length < 3) {
      raya(cp, o.arco, {color: NEGRO, ancho: 6, alfa: 0.95, semilla: s(), temblor: 0.8});
      continue;
    }
    const fo = formaPoli(o.visible);
    borrar(cp, [fo]);
    const {c} = cp;
    c.save();
    c.beginPath();
    trazarFormas(c, [fo]);
    c.clip();
    const iris = formaElipse({c: o.pupila.c, rx: o.ry * 0.86, ry: o.ry * 0.86, ang: 0});
    colorear(cp, iris, {color: VERDE_OJO, ancho: 7, sep: 5, ang: 0.6, alfa: 0.95, semilla: s(), sobra: 1});
    const pu = o.pupila;
    if (pu.rx < 7) {
      raya(cp, [suma(pu.c, rot([0, -pu.ry], pu.ang)), suma(pu.c, rot([0, pu.ry], pu.ang))], {color: NEGRO, ancho: 2 * pu.rx + 4, alfa: 1, semilla: s(), temblor: 0.4, repasa: false});
    } else {
      colorear(cp, formaElipse(pu), {color: NEGRO, ancho: 7, sep: 4, ang: 0.9, alfa: 1, semilla: s(), sobra: 0, cruzado: true});
    }
    c.restore();
    borrar(cp, [formaElipse({c: o.brillo, rx: 5.5, ry: 5.5, ang: 0})]);
    contorno(cp, o.visible, {color: NEGRO, ancho: 5.5, alfa: 0.95, semilla: s(), temblor: 1, vueltas: 1});
  }

  // la nariz, la boca y los bigotes de raya
  const nariz = formaPoli(g.nariz);
  colorear(cp, nariz, {color: CERA.rosa, ancho: 7, sep: 4, ang: 0.2, alfa: 1, semilla: s(), sobra: 1});
  contorno(cp, g.nariz, {color: TINTA, ancho: 4, alfa: 0.9, semilla: s(), temblor: 0.6, vueltas: 1});
  raya(cp, g.surco, {color: NEGRO, ancho: 4.5, alfa: 0.92, semilla: s(), temblor: 0.5, repasa: false});
  raya(cp, g.boca, {color: NEGRO, ancho: 5, alfa: 0.95, semilla: s(), temblor: 0.8, repasa: false});
  for (const b of g.bigotes) {
    const fin = suma(b[2], [(b[2][0] - b[0][0]) * 0.15, (b[2][1] - b[0][1]) * 0.15]);
    raya(cp, [b[0], b[1], fin], {color: NEGRO, ancho: 4.5, alfa: 0.92, semilla: s(), temblor: 1.2, repasa: false});
  }
  if (g.lengua) colorear(cp, formaElipse(g.lengua), {color: CERA.rosa, ancho: 7, sep: 4, ang: 0.3, alfa: 1, semilla: s(), sobra: 1});
};
