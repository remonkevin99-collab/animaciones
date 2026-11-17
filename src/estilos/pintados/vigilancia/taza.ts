import {clamp, p} from '../../../comun/curvas';
import {SUELO, T_SUELO, cafe, piezasTaza, rot, suma, taza, trozos, vapor, type P} from '../../gato/escena';
import {gris} from './cocina';

// LA TAZA, EL CAFÉ Y LOS TROZOS, COMO LOS VE EL INFRARROJO. La taza es de loza blanca: sale casi blanca,
// con su boca vista desde arriba (la cámara está en el techo) y el café negro dentro. El café, como el agua, se traga el
// infrarrojo: las gotas y el charco salen negros, con el puntito de brillo del foco de la cámara en cada una (y una mancha de reflejo
// en el charco). Los trozos, blancos. La sombra de la taza en el suelo se oscurece mientras cae.

const P2 = (pts: P[]) => {
  const q = new Path2D();
  pts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y)));
  q.closePath();
  return q;
};

export const pintarVapor = (c: CanvasRenderingContext2D, t: number) => {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const h of vapor(t)) {
    if (h.alfa <= 0.02) continue;
    c.strokeStyle = gris(1, 0.16 * h.alfa);
    c.lineWidth = 13;
    c.beginPath();
    h.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
  c.restore();
};

// la sombra de la taza: en el tablero mientras está en la mesa; en el suelo, cada vez más oscura y pequeña según baja
export const pintarSombraTaza = (c: CanvasRenderingContext2D, t: number) => {
  const tz = taza(t);
  if (tz.estado === 'suelo') return;
  c.save();
  if (tz.estado === 'mesa') {
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.beginPath();
    c.ellipse(tz.c[0] + 16, 1008, 66, 9, 0, 0, Math.PI * 2);
    c.fill();
  } else {
    const k = clamp((tz.c[1] - 1010) / (SUELO - 60 - 1010));
    c.fillStyle = `rgba(0,0,0,${(0.12 + 0.4 * k).toFixed(3)})`;
    c.beginPath();
    c.ellipse(tz.c[0] + 10, SUELO + 2, 80 - 26 * k, 14 - 3 * k, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
};

export const pintarTaza = (c: CanvasRenderingContext2D, t: number) => {
  const tz = taza(t);
  if (tz.estado === 'suelo') return;
  const pz = piezasTaza(tz);
  // el asa
  c.fillStyle = gris(0.8);
  c.fill(P2(pz.asa));
  c.strokeStyle = gris(0.45);
  c.lineWidth = 3;
  c.stroke(P2(pz.asa));
  // el cuerpo: claro del lado del foco, gris en el otro
  const a = suma(tz.c, rot([-52, 0], tz.ang)), b = suma(tz.c, rot([52, 0], tz.ang));
  const g = c.createLinearGradient(a[0], a[1], b[0], b[1]);
  g.addColorStop(0, gris(0.98));
  g.addColorStop(0.45, gris(0.94));
  g.addColorStop(1, gris(0.62));
  c.fillStyle = g;
  c.fill(P2(pz.cuerpo));
  c.strokeStyle = gris(0.4);
  c.lineWidth = 3;
  c.stroke(P2(pz.cuerpo));
  // la boca, vista desde arriba: el borde blanco y el café dentro (al volcarse ya casi no queda)
  const vacia = clamp((t - 2.78) / 0.2);
  c.save();
  c.translate(tz.c[0], tz.c[1]);
  c.rotate(tz.ang);
  c.fillStyle = gris(1);
  c.beginPath();
  c.ellipse(0, -59, 53, 17, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = gris(0.06 + 0.4 * vacia);
  c.beginPath();
  c.ellipse(0, -58, 44, 12, 0, 0, Math.PI * 2);
  c.fill();
  if (vacia < 1) {
    c.fillStyle = gris(1, 0.8 * (1 - vacia));
    c.beginPath();
    c.ellipse(-14, -61, 11, 3.5, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
};

const gota = (c: CanvasRenderingContext2D, q: P, r: number) => {
  c.fillStyle = gris(0.05);
  c.beginPath();
  c.arc(q[0], q[1], r, 0, Math.PI * 2);
  c.fill();
  // el puntito de brillo del foco de la cámara
  c.fillStyle = gris(0.9, 0.75);
  c.beginPath();
  c.arc(q[0] - r * 0.3, q[1] - r * 0.32, Math.max(1.5, r * 0.22), 0, Math.PI * 2);
  c.fill();
};

export const pintarCafe = (c: CanvasRenderingContext2D, t: number) => {
  const cf = cafe(t);
  c.save();
  if (cf.charco) {
    const e = cf.charco;
    c.fillStyle = gris(0.06);
    c.beginPath();
    c.ellipse(e.c[0], e.c[1], e.rx, e.ry * 1.5, 0, 0, Math.PI * 2);
    c.fill();
    // el reflejo del foco de la cámara en el charco
    const k = p(t, T_SUELO, 0.5);
    c.fillStyle = gris(0.85, 0.55 * k);
    c.beginPath();
    c.ellipse(e.c[0] - e.rx * 0.25, e.c[1] - e.ry * 0.5, e.rx * 0.32, e.ry * 0.35, -0.08, 0, Math.PI * 2);
    c.fill();
  }
  for (const m of cf.manchas) {
    c.fillStyle = gris(0.07);
    c.beginPath();
    c.ellipse(m.c[0], m.c[1], m.rx, m.ry * 1.4, 0, 0, Math.PI * 2);
    c.fill();
  }
  // el chorro: las gotas del arco, unidas en un hilo de café que se va rompiendo (si dos seguidas están lejos, se separan)
  const chorro = cf.gotas.filter((g) => g.i < 100).sort((a, b) => a.i - b.i);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = gris(0.05);
  for (let k = 1; k < chorro.length; k++) {
    const a = chorro[k - 1], b = chorro[k];
    if (Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]) > 46) continue;
    c.lineWidth = Math.min(a.r, b.r) * 1.5;
    c.beginPath();
    c.moveTo(a.c[0], a.c[1]);
    c.lineTo(b.c[0], b.c[1]);
    c.stroke();
  }
  for (const g of cf.gotas) gota(c, g.c, g.r * (g.i < 100 ? 0.8 : 0.9));
  c.restore();
};

export const pintarTrozos = (c: CanvasRenderingContext2D, t: number) => {
  c.save();
  c.lineJoin = 'round';
  for (const tr of trozos(t)) {
    // su sombra en el suelo, y el trozo
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.ellipse(tr.c[0] + 6, SUELO + 10, 30, 7, 0, 0, Math.PI * 2);
    c.fill();
    const q = P2(tr.pts);
    c.fillStyle = gris(tr.n === 6 ? 0.82 : 0.94);
    c.fill(q);
    c.strokeStyle = gris(0.38);
    c.lineWidth = 3;
    c.stroke(q);
  }
  c.restore();
};

// la caja de la taza (o de lo que queda de ella), en medidas del cuadro
export const cajaTaza = (t: number): [number, number, number, number] | null => {
  if (t < T_SUELO) {
    const pz = piezasTaza(taza(t));
    const pts = [...pz.cuerpo, ...pz.asa];
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  const tr = trozos(t);
  if (!tr.length) return null;
  const pts = tr.flatMap((x) => x.pts);
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
