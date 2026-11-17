import {clamp} from '../../../comun/curvas';
import {
  ESCALA_GATO, arcoElipse, bigote, cinta, cuerpoTrazos, curva, elipse, oreja, pataTrazos, poli, resta, rot, suma,
  type Elipse, type Gato, type P,
} from '../../gato/escena';
import {gris} from './cocina';

// EL GATO VISTO POR EL INFRARROJO. El pelo devuelve mucha luz infrarroja: sale casi blanco, más claro en
// el centro de cada forma (de frente al foco de la cámara) y más gris en los bordes, con las rayas del atigrado apagadas. La nariz y
// la boca, oscuras; los bigotes, blancos (en estos vídeos se ven mucho). Y los ojos, que es lo que se recuerda de las cámaras de
// noche: el fondo del ojo devuelve el infrarrojo y brillan en blanco (ojosQueBrillan, que se SUMA después de la luz). Todo con las
// piezas de la escena, en sus medidas, 1,14 veces más grande desde donde se sienta.

const PIVOTE: P = [300, 1010];
const enE = (e: Elipse, u: number, v: number): P => suma(e.c, rot([u * e.rx, v * e.ry], e.ang));
const unit = (a: P): P => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const lerp = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const P2 = (d: string) => new Path2D(d);

const aGato = (c: CanvasRenderingContext2D) => {
  c.translate(PIVOTE[0], PIVOTE[1]);
  c.scale(ESCALA_GATO, ESCALA_GATO);
  c.translate(-PIVOTE[0], -PIVOTE[1]);
};

// el sombreado del foco: claro en el centro, gris en el borde
const foco = (c: CanvasRenderingContext2D, centro: P, r: number, dentro: number, fuera: number) => {
  const g = c.createRadialGradient(centro[0], centro[1], r * 0.08, centro[0], centro[1], r);
  g.addColorStop(0, gris(dentro));
  g.addColorStop(0.62, gris((dentro * 2 + fuera) / 3));
  g.addColorStop(1, gris(fuera));
  return g;
};

const rayaCruzada = (a: P, b: P, k: number, ancho: number, grosor: number) => {
  const cc = lerp(a, b, k);
  const u = unit(resta(b, a));
  const n: P = [-u[1], u[0]];
  return cinta([suma(cc, [n[0] * -ancho, n[1] * -ancho]), suma(cc, [u[0] * ancho * 0.22, u[1] * ancho * 0.22]), suma(cc, [n[0] * ancho, n[1] * ancho])],
    [grosor * 0.35, grosor, grosor * 0.35]);
};
const rayasCuerpo = (g: Gato): string[] => {
  const T = g.torso, Ca = g.cadera;
  const out: string[] = [];
  [-0.64, -0.3, 0.04, 0.36].forEach((v, i) => {
    out.push(cinta([enE(T, -1.12, v - 0.04), enE(T, -0.74, v), enE(T, -0.4, v + 0.05), enE(T, -0.1, v + 0.12)], [2, 15 - i, 10, 2]));
  });
  [0.52, 0.78].forEach((s, i) => {
    const e: Elipse = {c: enE(Ca, 0.12, 0.18), rx: Ca.rx * s, ry: Ca.ry * s, ang: Ca.ang};
    out.push(cinta(arcoElipse(e, 3.3 + i * 0.05, 4.4 - i * 0.08, 5), [2, 9, 13, 11, 7, 2]));
  });
  return out;
};

const pintarPata = (c: CanvasRenderingContext2D, pt: Gato['pataCerca'], claro: number, oscuro: number) => {
  const ds = pataTrazos(pt);
  const fill = foco(c, lerp(pt.hombro, pt.mano, 0.4), 150, claro, oscuro);
  c.fillStyle = fill;
  for (const d of ds) c.fill(P2(d));
  c.save();
  c.clip(P2(ds[0]));
  c.fillStyle = gris(oscuro - 0.18, 0.55);
  for (const d of [rayaCruzada(pt.hombro, pt.codo, 0.45, 40, 11), rayaCruzada(pt.hombro, pt.codo, 0.78, 34, 10)]) c.fill(P2(d));
  c.restore();
};

// la sombra del gato en el tablero (va antes que él)
export const sombraGato = (c: CanvasRenderingContext2D, g: Gato) => {
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.42)';
  c.beginPath();
  const x = g.cadera.c[0] + 20;
  c.ellipse(PIVOTE[0] + (x - PIVOTE[0]) * ESCALA_GATO + 30, 1008, 250, 16, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
};

export const pintarGato = (c: CanvasRenderingContext2D, g: Gato) => {
  const lame = !!g.lengua;
  c.save();
  aGato(c);
  c.lineCap = 'round';
  c.lineJoin = 'round';

  // la otra pata y la cola, detrás
  pintarPata(c, g.pataLejos, 0.62, 0.4);
  const cola = P2(cinta(g.cola.pts, g.cola.r));
  const cp = g.cola.pts, cr = g.cola.r;
  const gc = c.createLinearGradient(cp[0][0], cp[0][1], cp[cp.length - 1][0], cp[cp.length - 1][1]);
  gc.addColorStop(0, gris(0.58));
  gc.addColorStop(1, gris(0.84));
  c.fillStyle = gc;
  c.fill(cola);
  c.save();
  c.clip(cola);
  c.fillStyle = gris(0.42, 0.6);
  for (const i of [4, 7, 10, 13]) c.fill(P2(rayaCruzada(cp[i - 1], cp[i + 1], 0.5, cr[i] * 1.4, 8)));
  c.fill(P2(cinta(cp.slice(-3), cr.slice(-3).map((q) => q * 1.15))));
  c.restore();

  // el cuerpo, de una pieza: blanco de frente, gris en los bordes, con las rayas apagadas
  const cuerpo = cuerpoTrazos(g).map(P2);
  c.fillStyle = foco(c, enE(g.pecho, -0.3, -0.1), 330, 0.88, 0.46);
  for (const p of cuerpo) c.fill(p);
  c.save();
  const clipCuerpo = new Path2D();
  for (const p of cuerpo) clipCuerpo.addPath(p);
  c.clip(clipCuerpo);
  c.fillStyle = gris(0.4, 0.42);
  for (const d of rayasCuerpo(g)) c.fill(P2(d));
  // el pecho, aún más claro
  c.fillStyle = gris(1, 0.5);
  c.fill(P2(elipse({c: enE(g.pecho, 0.34, 0.12), rx: g.pecho.rx * 0.66, ry: g.pecho.ry * 0.8, ang: g.pecho.ang})));
  c.restore();

  if (!lame) pintarPata(c, g.pataCerca, 0.9, 0.56);

  // las orejas y la cabeza
  const H = g.cabeza.c, th = g.cabeza.ang;
  const fCab = foco(c, suma(H, rot([-8, 6], th)), 150, 0.8, 0.48);
  for (const o of [g.orejaLejos, g.orejaCerca]) {
    c.fillStyle = fCab;
    c.fill(P2(oreja(o)));
    c.fillStyle = gris(0.42);
    c.fill(P2(poli(o.dentro)));
  }
  const cab = P2(elipse(g.cabeza));
  c.fillStyle = fCab;
  c.fill(cab);
  // la «M» de la frente y las rayas de los mofletes
  const L = (lado: P, frente: P): P => suma(H, rot(lerp(lado, frente, g.giro), th));
  const raya3 = (a: [P, P], b: [P, P], d: [P, P], w: number) => cinta([L(...a), L(...b), L(...d)], [w * 0.3, w, w * 0.3]);
  c.save();
  c.clip(cab);
  c.fillStyle = gris(0.42, 0.55);
  for (const d of [
    raya3([[44, -72], [0, -72]], [[45, -56], [0, -56]], [[46, -40], [0, -40]], 8),
    raya3([[24, -66], [-26, -66]], [[27, -52], [-20, -52]], [[30, -38], [-14, -38]], 7),
    raya3([[64, -66], [26, -66]], [[63, -52], [20, -52]], [[62, -40], [14, -38]], 7),
    raya3([[-62, 2], [-110, 4]], [[-46, 6], [-95, 8]], [[-30, 10], [-80, 12]], 8),
  ]) c.fill(P2(d));
  c.restore();
  c.fillStyle = gris(0.86);
  c.fill(P2(elipse(g.hocico)));

  // los ojos: aquí solo su hueco (el brillo se suma después); cerrados, la raya
  for (const o of [g.ojoLejos, g.ojoCerca]) {
    if (o.cerrado) {
      c.strokeStyle = gris(0.18);
      c.lineWidth = 6;
      c.stroke(P2(curva(o.arco)));
    } else if (o.visible.length > 2) {
      // la cuenca, algo más oscura (así el brillo resalta) y el hueco del ojo
      c.fillStyle = gris(0.3, 0.55);
      c.fill(P2(elipse({c: o.c, rx: o.rx * 1.3, ry: o.ry * 1.25, ang: o.ang})));
      c.fillStyle = gris(0.4);
      c.fill(P2(poli(o.visible)));
    }
  }
  // la nariz, la boca y los bigotes
  c.fillStyle = gris(0.3);
  c.fill(P2(poli(g.nariz)));
  c.strokeStyle = gris(0.2);
  c.lineWidth = 4.5;
  c.stroke(P2(curva(g.boca)));
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(g.surco[0][0], g.surco[0][1]);
  c.lineTo(g.surco[1][0], g.surco[1][1]);
  c.stroke();
  c.strokeStyle = gris(1, 0.95);
  c.lineWidth = 3.2;
  for (const b of g.bigotes) c.stroke(P2(bigote(b)));

  if (lame) pintarPata(c, g.pataCerca, 0.9, 0.56);
  if (g.lengua) {
    c.fillStyle = gris(0.62);
    c.fill(P2(elipse(g.lengua)));
  }
  c.restore();
};

// el brillo de los ojos (se suma con 'lighter' encima de todo, ya con la luz puesta): el ojo entero claro, la pupila al blanco y un
// halo alrededor. Brilla más cuando te mira (de frente devuelve más luz a la cámara) y con la pupila abierta
export const ojosQueBrillan = (c: CanvasRenderingContext2D, g: Gato, alfa = 1) => {
  c.save();
  aGato(c);
  for (const o of [g.ojoLejos, g.ojoCerca]) {
    if (o.cerrado || o.visible.length < 3) continue;
    const abierto = clamp((o.pupila.rx - 3) / (o.rx * 0.6));
    const f = alfa * (0.62 + 0.38 * g.giro) * (0.75 + 0.25 * abierto);
    const vis = P2(poli(o.visible));
    // el halo sale del centro de lo que se ve del ojo (así, entornado, brilla en media luna y se lee el párpado)
    const cv = o.visible.reduce((a, q) => [a[0] + q[0] / o.visible.length, a[1] + q[1] / o.visible.length] as P, [0, 0] as P);
    const R = Math.max(o.rx, 22) * 1.9;
    const h = c.createRadialGradient(cv[0], cv[1], 0, cv[0], cv[1], R);
    h.addColorStop(0, `rgba(255,255,255,${(0.4 * f).toFixed(3)})`);
    h.addColorStop(0.35, `rgba(255,255,255,${(0.15 * f).toFixed(3)})`);
    h.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = h;
    c.fillRect(cv[0] - R, cv[1] - R, 2 * R, 2 * R);
    c.fillStyle = `rgba(255,255,255,${(0.8 * f).toFixed(3)})`;
    c.fill(vis);
    c.save();
    c.clip(vis);
    c.fillStyle = `rgba(255,255,255,${f.toFixed(3)})`;
    c.fill(P2(elipse({...o.pupila, rx: o.pupila.rx + 4, ry: o.pupila.ry + 2})));
    c.restore();
  }
  c.restore();
};

// la caja que ocupa el gato (en medidas del cuadro), para el recuadro de «sospechoso»
export const cajaGato = (g: Gato): [number, number, number, number] => {
  const pts: P[] = [
    ...g.orejaCerca.base, g.orejaCerca.punta, g.orejaLejos.punta, ...g.cola.pts,
    enE(g.cabeza, 1, 0), enE(g.cabeza, -1, 0), enE(g.cabeza, 0, 1), enE(g.cadera, -1, 0), enE(g.cadera, 0, 1),
    g.pataCerca.mano, enE(g.pecho, 1, 0), enE(g.hocico, 1, 0),
  ].map((q) => [PIVOTE[0] + (q[0] - PIVOTE[0]) * ESCALA_GATO, PIVOTE[1] + (q[1] - PIVOTE[1]) * ESCALA_GATO] as P);
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
