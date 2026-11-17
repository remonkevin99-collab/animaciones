import {
  bigote, cabezaTrazos, cinta, cuerpoTrazos, curva, elipse, enMundo, oreja, pataTrazos, poli, resta, rot, suma,
  type Elipse, type Gato, type Ojo, type P, type Pata,
} from '../../gato/escena';
import {calar, centro, ctx, enE, enGato, lente, lerp, lienzo, limpia, poligono, rellena, type Ctx} from './lienzos';

// EL GATO MARIONETA: el gato de la escena hecho títere de sombras, de cartón negro y en piezas. Tres piezas
// que se pintan cada una en su lienzo y luego se juntan: lo de atrás (la otra pata, la cola y el cuerpo), la pata de delante y la
// cabeza. Cada pieza lleva sus juntas (una rendija fina por donde asoma la luz, donde una pieza pisa a la otra) y sus remaches
// (el clavito con su arandela), y sus calados: las rayas del lomo y de la cola, la roseta de la cadera, la «M» de la frente, los ojos,
// las orejas, la nariz y la boca. Detrás de los calados, papel de color (como el cuero teñido de los títeres chinos): las rayas
// naranjas, los ojos verde lima, las orejas y la nariz rosa, la roseta roja y el collar rojo con su cascabel.
// pintarGato() deja el gato entero, en negro y en coordenadas del mundo, en su lienzo; colorGato() pinta los papeles de color en el
// lienzo de la luz (solo se ven por los huecos). varillas() da dónde se agarran las varillas.

type Capas = {atras: HTMLCanvasElement; pata: HTMLCanvasElement; cabeza: HTMLCanvasElement; todo: HTMLCanvasElement};
let CAPAS: Capas | null = null;
const capas = () => (CAPAS ??= {atras: lienzo(), pata: lienzo(), cabeza: lienzo(), todo: lienzo()});

const NARANJA = 'rgba(255,128,20,0.86)';
const LIMA = 'rgba(190,245,40,0.9)';
const ROSA = 'rgba(255,70,110,0.88)';
const ROJO = 'rgba(236,26,34,0.9)';
const ORO = 'rgba(255,206,40,0.9)';

// ---------------------------------------------------------------- las piezas de los calados
// la roseta de la cadera: seis pétalos y el centro
const ROSETA = (g: Gato) => ({c: enE(g.cadera, -0.16, -0.02), r: 40, a: g.cadera.ang});
const roseta = (x: Ctx, c: P, r: number, a: number) => {
  for (let i = 0; i < 6; i++) {
    const ai = a + (i * Math.PI) / 3;
    x.beginPath();
    x.ellipse(c[0] + Math.cos(ai) * r * 0.55, c[1] + Math.sin(ai) * r * 0.55, r * 0.36, r * 0.15, ai, 0, Math.PI * 2);
    x.fill();
  }
  x.beginPath();
  x.arc(c[0], c[1], r * 0.13, 0, Math.PI * 2);
  x.fill();
};
// las rayas: rendijas en forma de hoja que cruzan el lomo, la cadera y la cola
const rayasCuerpo = (g: Gato): [P, P, number][] => [
  ...[-0.58, -0.32, -0.06, 0.2].map((v, i) => [enE(g.torso, -0.86, v - 0.04), enE(g.torso, -0.3, v + 0.08), 8 - i * 0.5] as [P, P, number]),
  [enE(g.cadera, -0.55, -0.62), enE(g.cadera, -0.12, -0.5), 7],
  [enE(g.cadera, -0.82, -0.2), enE(g.cadera, -0.5, -0.08), 6],
];
const rayasCola = (g: Gato): [P, P, number][] => {
  const {pts, r} = g.cola;
  const out: [P, P, number][] = [];
  for (const i of [3, 6, 9, 12]) {
    const a = pts[i - 1], b = pts[i + 1];
    const d = resta(b, a);
    const l = Math.max(1e-3, Math.hypot(d[0], d[1]));
    const n: P = [-d[1] / l, d[0] / l];
    const w = r[i] * 0.62;
    out.push([suma(pts[i], [n[0] * w, n[1] * w]), suma(pts[i], [-n[0] * w, -n[1] * w]), 4.5]);
  }
  return out;
};
// la «M» de la frente: tres rayitas
const frente = (g: Gato): [P, P][] => {
  const H = g.cabeza.c, th = g.cabeza.ang, k = g.giro;
  const L = (a: P, b: P): P => suma(H, rot(lerp(a, b, k), th));
  return [
    [L([2, -88], [-28, -86]), L([10, -60], [-20, -58])],
    [L([30, -92], [0, -92]), L([32, -62], [0, -62])],
    [L([58, -86], [28, -86]), L([52, -58], [20, -58])],
  ];
};
// lo de dentro de la oreja, más pequeño, para que quede su marco de cartón
const dentroOreja = (d: [P, P, P]): P[] => {
  const c = centro(d);
  return d.map((q) => lerp(c, q, 0.78));
};

// una junta: la rendija en arco donde una pieza pisa a la otra
const junta = (x: Ctx, c: P, r: number, hacia: number, abre: number) => {
  x.lineWidth = 2.6;
  x.lineCap = 'round';
  x.beginPath();
  x.arc(c[0], c[1], r, hacia - abre / 2, hacia + abre / 2);
  x.stroke();
};
// un remache: su arandela de luz y el clavo
const remache = (x: Ctx, c: P, r = 6) => {
  calar(x, () => {
    x.lineWidth = 2;
    x.beginPath();
    x.arc(c[0], c[1], r + 3.2, 0, Math.PI * 2);
    x.stroke();
  });
  x.fillStyle = '#000';
  x.beginPath();
  x.arc(c[0], c[1], r, 0, Math.PI * 2);
  x.fill();
};
const ang = (a: P, b: P) => Math.atan2(b[1] - a[1], b[0] - a[0]);

// la pata: sus dos huesos y el pie, con su junta en el codo y los dedos
const pataCalada = (x: Ctx, pt: Pata, cerca: boolean) => {
  rellena(x, pataTrazos(pt));
  calar(x, () => {
    // el antebrazo pisa al brazo: la rendija va del lado del hombro
    junta(x, pt.codo, 25.5, ang(pt.codo, pt.hombro), 2.4);
    if (cerca) junta(x, pt.hombro, 33.5, ang(pt.codo, pt.hombro), 3.3);
    // los dedos: dos muescas en la punta del pie
    const p = pt.pie;
    for (const u of [0.28, 0.62]) {
      x.lineWidth = 2.6;
      x.beginPath();
      const a = enE(p, u, 1.1), b = enE(p, u + 0.06, 0.25);
      x.moveTo(a[0], a[1]);
      x.lineTo(b[0], b[1]);
      x.stroke();
    }
  });
  remache(x, pt.codo, 5.5);
  if (cerca) remache(x, pt.hombro, 6.5);
};

// el ojo: el hueco del ojo con su pupila (y el brillo, otro hueco); cerrado, una rendija
const ojoCalado = (x: Ctx, o: Ojo) => {
  if (o.cerrado || o.visible.length < 3) {
    calar(x, () => {
      x.lineWidth = 5;
      x.lineCap = 'round';
      x.stroke(new Path2D(curva(o.arco)));
    });
    return;
  }
  const hueco = new Path2D(poli(o.visible));
  calar(x, () => x.fill(hueco));
  x.save();
  x.clip(hueco);
  rellena(x, [elipse(o.pupila)]);
  calar(x, () => {
    x.beginPath();
    x.arc(o.brillo[0], o.brillo[1], 4.6, 0, Math.PI * 2);
    x.fill();
  });
  x.restore();
};

// el collar: una cinta que cruza el cuello justo debajo de la barbilla, y el cascabel
const collar = (g: Gato) => {
  const [pecho, cab] = g.cuello;
  const m = lerp(cab, pecho, 0.78);
  const d = resta(pecho, cab);
  const l = Math.max(1e-3, Math.hypot(d[0], d[1]));
  const n: P = [-d[1] / l, d[0] / l];
  const u: P = [d[0] / l, d[1] / l];
  const a = suma(m, [n[0] * 58, n[1] * 58]), b = suma(m, [-n[0] * 58, -n[1] * 58]);
  const medio = suma(m, [u[0] * 9, u[1] * 9]);
  const cascabel = suma(m, [u[0] * 22 + n[0] * -6, u[1] * 22 + n[1] * -6]);
  return {a, b, medio, cascabel};
};

// ---------------------------------------------------------------- el gato entero, en negro
export const pintarGato = (g: Gato): HTMLCanvasElement => {
  const C = capas();
  const lame = g.mira === 'pata';

  // 1 · lo de atrás: la otra pata, la cola y el cuerpo, con las rayas y la roseta caladas
  const a = ctx(C.atras);
  limpia(a);
  enGato(a);
  pataCalada(a, g.pataLejos, false);
  rellena(a, [cinta(g.cola.pts, g.cola.r)]);
  rellena(a, cuerpoTrazos(g));
  calar(a, () => {
    for (const [p, q, w] of [...rayasCuerpo(g), ...rayasCola(g)]) {
      lente(a, p, q, w, w * 0.6);
      a.fill();
    }
    const ro = ROSETA(g);
    roseta(a, ro.c, ro.r, ro.a);
    // la cola es de tres piezas: sus juntas
    for (const i of [5, 10]) {
      const p = g.cola.pts[i];
      junta(a, p, g.cola.r[i] + 1.5, ang(p, g.cola.pts[i - 2]), 2.6);
    }
  });
  remache(a, g.cola.pts[1], 6);
  remache(a, g.cola.pts[5], 5);
  remache(a, g.cola.pts[10], 4.5);
  // el anillo de la roseta, en negro, para que se lea como flor
  a.lineWidth = 4;
  a.strokeStyle = '#000';
  const ro = ROSETA(g);
  a.beginPath();
  a.arc(ro.c[0], ro.c[1], ro.r * 0.13, 0, Math.PI * 2);
  a.fill();

  // 2 · la pata de delante, su propia pieza
  const p = ctx(C.pata);
  limpia(p);
  enGato(p);
  pataCalada(p, g.pataCerca, true);

  // 3 · la cabeza: orejas, cabeza y hocico, bigotes de alambre y la cara calada
  const c = ctx(C.cabeza);
  limpia(c);
  enGato(c);
  rellena(c, [oreja(g.orejaLejos), oreja(g.orejaCerca), ...cabezaTrazos(g)]);
  if (g.lengua) rellena(c, [elipse(g.lengua)]);
  c.strokeStyle = '#000';
  c.lineCap = 'round';
  c.lineWidth = 2.8;
  for (const b of g.bigotes) c.stroke(new Path2D(bigote(b)));
  calar(c, () => {
    for (const o of [g.orejaLejos, g.orejaCerca]) {
      poligono(c, dentroOreja(o.dentro));
      c.fill();
    }
    c.fill(new Path2D(poli(g.nariz)));
    c.lineWidth = 3.4;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke(new Path2D(curva(g.boca)));
    for (const [p0, p1] of frente(g)) {
      lente(c, p0, p1, 4.5);
      c.fill();
    }
    // la junta de la cabeza: el borde de abajo, donde pisa al cuello
    const e: Elipse = {...g.cabeza, rx: g.cabeza.rx - 3, ry: g.cabeza.ry - 3};
    c.lineWidth = 2.6;
    c.beginPath();
    c.ellipse(e.c[0], e.c[1], e.rx, e.ry, e.ang, 0.95, 2.85);
    c.stroke();
  });
  ojoCalado(c, g.ojoLejos);
  ojoCalado(c, g.ojoCerca);
  remache(c, suma(g.cabeza.c, rot([-8, 44], g.cabeza.ang)), 6);

  // 4 · juntas las tres; y el collar, que cruza el cuello por encima de todo
  const t = ctx(C.todo);
  limpia(t);
  t.drawImage(C.atras, 0, 0);
  if (!lame) t.drawImage(C.pata, 0, 0);
  t.drawImage(C.cabeza, 0, 0);
  if (lame) t.drawImage(C.pata, 0, 0);
  enGato(t);
  const co = collar(g);
  calar(t, () => {
    t.lineWidth = 15;
    t.lineCap = 'butt';
    t.beginPath();
    t.moveTo(co.a[0], co.a[1]);
    t.quadraticCurveTo(co.medio[0], co.medio[1], co.b[0], co.b[1]);
    t.stroke();
  });
  t.fillStyle = '#000';
  t.beginPath();
  t.arc(co.cascabel[0], co.cascabel[1], 12, 0, Math.PI * 2);
  t.fill();
  calar(t, () => {
    t.lineWidth = 2.4;
    t.beginPath();
    t.moveTo(co.cascabel[0] - 7, co.cascabel[1] + 2);
    t.lineTo(co.cascabel[0] + 7, co.cascabel[1] + 2);
    t.stroke();
    t.beginPath();
    t.arc(co.cascabel[0], co.cascabel[1] + 6, 2.2, 0, Math.PI * 2);
    t.fill();
  });
  return C.todo;
};

// ---------------------------------------------------------------- los papeles de color, detrás de los huecos (en la luz)
export const colorGato = (x: Ctx, g: Gato) => {
  x.save();
  enGato(x);
  // las rayas, naranjas
  x.fillStyle = NARANJA;
  for (const [p, q, w] of [...rayasCuerpo(g), ...rayasCola(g)]) {
    lente(x, p, q, w + 4, w * 0.6);
    x.fill();
  }
  for (const [p0, p1] of frente(g)) {
    lente(x, p0, p1, 8);
    x.fill();
  }
  // la roseta, roja con el centro de oro
  const ro = ROSETA(g);
  x.fillStyle = ROJO;
  x.beginPath();
  x.arc(ro.c[0], ro.c[1], ro.r * 0.98, 0, Math.PI * 2);
  x.fill();
  // los ojos, verde lima
  x.fillStyle = LIMA;
  for (const o of [g.ojoLejos, g.ojoCerca]) {
    x.beginPath();
    x.ellipse(o.c[0], o.c[1], o.rx + 3, o.ry + 3, o.ang, 0, Math.PI * 2);
    x.fill();
  }
  // las orejas y la nariz, rosa
  x.fillStyle = ROSA;
  for (const o of [g.orejaLejos, g.orejaCerca]) {
    poligono(x, o.dentro);
    x.fill();
  }
  const cn = centro(g.nariz);
  x.beginPath();
  x.arc(cn[0], cn[1], 14, 0, Math.PI * 2);
  x.fill();
  // el collar, rojo
  const co = collar(g);
  x.strokeStyle = ROJO;
  x.lineWidth = 22;
  x.beginPath();
  x.moveTo(co.a[0], co.a[1]);
  x.quadraticCurveTo(co.medio[0], co.medio[1], co.b[0], co.b[1]);
  x.stroke();
  x.fillStyle = ORO;
  x.beginPath();
  x.arc(co.cascabel[0], co.cascabel[1] + 4, 9, 0, Math.PI * 2);
  x.fill();
  x.restore();
};

// dónde se agarran las varillas (en el mundo): el cuello y la mano que empuja
export const varillas = (g: Gato): P[] => [enMundo(lerp(g.cuello[0], g.cuello[1], 0.35)), enMundo(g.pataCerca.mano)];
