import {perlin} from './roca';
import {
  TRANSFORMA_GATO, arcoElipse, bigote, cinta, elipse, oreja, pataTrazos, poli, rot, suma,
  type Elipse, type Gato, type P, type Pata,
} from '../../gato/escena';
import {capsula} from '../../formas';
import {
  CAOLIN, CARBON, OCRE_AMARILLO, OCRE_NARANJA, OCRE_ROJO, OCRE_ROJO_OSCURO, type Caja, type Ctx, fino, nube, remuestrea,
  soplar, trazoVivo,
} from './pigmento';

// EL GATO PINTADO COMO LOS ANIMALES DE LAS CUEVAS. Relleno de ocre soplado (naranja, con el lomo en rojo y
// la tripa y el hocico más claros), las rayas del gato atigrado a dedo con carbón (como las manchas de los bisontes), y el contorno
// de carbón grueso por fuera. La cara con algo de detalle: los ojos de caolín con la pupila de carbón, la nariz, la boca y los
// bigotes. El truco de los pintores de cuevas para el movimiento: la pata que empuja y la cola se repiten en los pasos de antes, más
// flojas, y dejan rastro. Todo en las medidas del gato de la escena y con TRANSFORMA_GATO (el gato, 1,14 veces más grande).

// la transformación del gato, para el canvas
const M_GATO = (() => {
  const m = TRANSFORMA_GATO.match(/translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/)!;
  const [tx, ty, s] = [+m[1], +m[2], +m[3]];
  return {tx, ty, s};
})();
const enGato = (c: Ctx) => {
  c.translate(M_GATO.tx, M_GATO.ty);
  c.scale(M_GATO.s, M_GATO.s);
  c.translate(-M_GATO.tx, -M_GATO.ty);
};
// la caja del gato en el cuadro (holgada: se inclina para asomarse)
export const CAJA_GATO: Caja = [10, 180, 900, 1100];

const p2 = (d: string) => new Path2D(d);
const enE = (e: Elipse, u: number, v: number): P => suma(e.c, rot([u * e.rx, v * e.ry], e.ang));

// las formas del gato (en sus medidas)
const formasPata = (pt: Pata) => pataTrazos(pt).map(p2);
const formasCuerpo = (g: Gato) => [
  elipse(g.cadera), elipse(g.torso), elipse(g.pecho), elipse(g.barriga), capsula(g.cuello[0], g.cuello[1], 62, 58), elipse(g.pieTrasero),
].map(p2);
const formasCabeza = (g: Gato) => [elipse(g.cabeza), elipse(g.hocico)].map(p2);
const formasOrejas = (g: Gato) => [oreja(g.orejaLejos), oreja(g.orejaCerca)].map(p2);
const formaCola = (g: Gato) => p2(cinta(g.cola.pts, g.cola.r));
const silueta = (g: Gato) => [...formasPata(g.pataLejos), formaCola(g), ...formasCuerpo(g), ...formasOrejas(g), ...formasCabeza(g), ...formasPata(g.pataCerca)];

// el contorno de carbón por FUERA de unas formas: se trazan gruesas y se les quita el relleno
const contornoFuera = (c: Ctx, formas: Path2D[], w: number, col = CARBON) => {
  c.save();
  enGato(c);
  c.strokeStyle = col;
  c.lineWidth = 2 * w;
  c.lineJoin = 'round';
  for (const f of formas) c.stroke(f);
  c.globalCompositeOperation = 'destination-out';
  for (const f of formas) c.fill(f);
  c.restore();
};

// ---------------------------------------------------------------- el rastro: la pata y la cola de los pasos de antes
export const rastroGato = (c: Ctx, actual: Gato, antes: Gato[]) => {
  antes.forEach((g, k) => {
    const fuerza = [0.62, 0.4, 0.24][k] ?? 0.2;
    // la pata que empuja: solo si se ha movido
    const dm = Math.hypot(g.pataCerca.mano[0] - actual.pataCerca.mano[0], g.pataCerca.mano[1] - actual.pataCerca.mano[1]);
    if (dm > 9) {
      const fp = formasPata(g.pataCerca);
      soplar(c, CAJA_GATO, (x) => {
        enGato(x);
        x.fillStyle = OCRE_NARANJA;
        for (const f of fp) x.fill(f);
      }, 5, fuerza * 0.55);
      fino(c, CAJA_GATO, (x) => contornoFuera(x, fp, 6), 1.3, fuerza);
    }
    // la cola: solo si la punta se ha movido
    const a = g.cola.pts[g.cola.pts.length - 1], b = actual.cola.pts[actual.cola.pts.length - 1];
    if (k < 2 && Math.hypot(a[0] - b[0], a[1] - b[1]) > 8) {
      const fc = formaCola(g);
      soplar(c, CAJA_GATO, (x) => {
        enGato(x);
        x.fillStyle = OCRE_NARANJA;
        x.fill(fc);
      }, 5, fuerza * 0.5);
      fino(c, CAJA_GATO, (x) => contornoFuera(x, [fc], 6), 1.3, fuerza * 0.9);
    }
  });
};

// ---------------------------------------------------------------- el gato
export const pintarGato = (c: Ctx, g: Gato, paso = 0) => {
  // cada paso se repinta: la presión de la mano cambia un poco (el temblor de lo hecho a mano, 12 veces por segundo)
  const sm = ((paso % 9) + 9) % 9;
  const todas = silueta(g);
  // 1 · el relleno de ocre soplado: naranja de base, el lomo en rojo, la tripa, el pecho y el hocico claros
  soplar(c, CAJA_GATO, (x) => {
    enGato(x);
    x.fillStyle = OCRE_NARANJA;
    for (const f of todas) x.fill(f);
    // la pata de lejos, más oscura (está detrás)
    x.fillStyle = OCRE_ROJO_OSCURO;
    x.globalAlpha = 0.55;
    for (const f of formasPata(g.pataLejos)) x.fill(f);
    x.globalAlpha = 1;
  }, 6, 1, {min: 0.62, semilla: 3 + sm * 5});
  soplar(c, CAJA_GATO, (x) => {
    enGato(x);
    // el lomo: una banda roja por la espalda (de la cadera al cuello) y la cola
    x.strokeStyle = OCRE_ROJO;
    x.lineCap = 'round';
    x.lineWidth = 64;
    x.globalAlpha = 0.85;
    const lomo = [...arcoElipse({...g.cadera, rx: g.cadera.rx * 0.8, ry: g.cadera.ry * 0.8}, Math.PI * 1.05, Math.PI * 1.45, 6),
      ...arcoElipse({...g.torso, rx: g.torso.rx * 0.78, ry: g.torso.ry * 0.86}, Math.PI * 1.08, Math.PI * 1.5, 8)];
    x.beginPath();
    lomo.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    x.stroke();
    x.lineWidth = 22;
    x.beginPath();
    g.cola.pts.slice(6).forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    x.stroke();
    // el soplado no es parejo: manchas más rojas por el cuerpo
    for (const [e, u, v, rad, sem] of [[g.cadera, -0.3, -0.2, 60, 11], [g.torso, -0.2, 0.3, 55, 12], [g.cadera, 0.3, 0.45, 50, 13]] as [Elipse, number, number, number, number][]) {
      const q = enE(e, u, v);
      nube(x, q[0], q[1], rad, OCRE_ROJO_OSCURO, sem, 3, 0.5);
    }
    // la frente y lo alto de la cabeza, más rojos
    const fr = enE(g.cabeza, -0.1, -0.55);
    nube(x, fr[0], fr[1], 70, OCRE_ROJO, 5, 3, 0.55);
    // la tripa y el pecho, de ocre amarillo claro; el hocico, de caolín
    x.globalAlpha = 1;
    x.fillStyle = OCRE_AMARILLO;
    const tr = enE(g.barriga, 0.1, 0.15);
    x.beginPath();
    x.ellipse(tr[0], tr[1], g.barriga.rx * 0.85, g.barriga.ry * 0.7, g.barriga.ang, 0, Math.PI * 2);
    x.fill();
    const pe = enE(g.pecho, 0.35, 0.2);
    x.beginPath();
    x.ellipse(pe[0], pe[1], g.pecho.rx * 0.55, g.pecho.ry * 0.62, g.pecho.ang, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = CAOLIN;
    x.globalAlpha = 0.9;
    x.beginPath();
    x.ellipse(g.hocico.c[0], g.hocico.c[1] + 4, g.hocico.rx * 0.82, g.hocico.ry * 0.78, g.hocico.ang, 0, Math.PI * 2);
    x.fill();
    // la parte de dentro de las orejas
    x.globalAlpha = 0.9;
    x.fillStyle = OCRE_ROJO_OSCURO;
    for (const o of [g.orejaLejos, g.orejaCerca]) {
      x.beginPath();
      x.moveTo(o.dentro[0][0], o.dentro[0][1]);
      x.lineTo(o.dentro[1][0], o.dentro[1][1]);
      x.lineTo(o.dentro[2][0], o.dentro[2][1]);
      x.closePath();
      x.fill();
    }
    x.globalAlpha = 1;
  }, 7);

  // 2 · las rayas del atigrado, a dedo con carbón
  fino(c, CAJA_GATO, (x) => {
    enGato(x);
    x.strokeStyle = CARBON;
    const raya = (pts: P[], w: number, s: number) => trazoVivo(x, remuestrea(pts, 4), (u) => w * Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.88)) * (0.85 + 0.3 * perlin(s, u * 3)));
    // en el lomo (del borde de la espalda hacia dentro, con curva)
    [1.06, 1.2, 1.34, 1.48].forEach((a, i) => {
      const t = g.torso;
      const ang = Math.PI * a;
      raya([0.98, 0.78, 0.55].map((k, j) => enE(t, Math.cos(ang + j * 0.07) * k, Math.sin(ang + j * 0.07) * k)), 17, i);
    });
    [1.02, 1.2, 1.38].forEach((a, i) => {
      const t = g.cadera;
      const ang = Math.PI * a;
      raya([0.98, 0.76, 0.5].map((k, j) => enE(t, Math.cos(ang - j * 0.09) * k, Math.sin(ang - j * 0.09) * k)), 18, i + 10);
    });
    // en la cola, anillos
    [5, 8, 11, 14].forEach((i, k) => {
      const q = g.cola.pts[i], a = g.cola.pts[i - 1], b = g.cola.pts[i + 1] ?? q;
      const d: P = [b[0] - a[0], b[1] - a[1]];
      const l = Math.hypot(d[0], d[1]) || 1;
      const n: P = [-d[1] / l, d[0] / l];
      const rr = g.cola.r[i] * 1.05;
      raya([[q[0] + n[0] * rr, q[1] + n[1] * rr], [q[0], q[1]], [q[0] - n[0] * rr, q[1] - n[1] * rr]], 11, k + 20);
    });
    // en la frente, la «M»
    for (const [u0, v0, u1, v1] of [[-0.3, -0.92, -0.24, -0.58], [-0.04, -1.0, -0.02, -0.62], [0.22, -0.95, 0.17, -0.6]]) {
      raya([enE(g.cabeza, u0, v0), enE(g.cabeza, (u0 + u1) / 2 + 0.03, (v0 + v1) / 2), enE(g.cabeza, u1, v1)], 11, u0 * 10);
    }
    // en las patas
    for (const pt of [g.pataCerca, g.pataLejos]) {
      for (const k of [0.3, 0.6]) {
        const q: P = [pt.hombro[0] + (pt.codo[0] - pt.hombro[0]) * (k + 0.4), pt.hombro[1] + (pt.codo[1] - pt.hombro[1]) * (k + 0.4)];
        const d: P = [pt.codo[0] - pt.hombro[0], pt.codo[1] - pt.hombro[1]];
        const l = Math.hypot(d[0], d[1]) || 1;
        const n: P = [-d[1] / l, d[0] / l];
        raya([[q[0] - n[0] * 22, q[1] - n[1] * 22], [q[0] + n[0] * 22, q[1] + n[1] * 22]], 10, k * 7);
      }
    }
  }, 1.6, 0.95, {min: 0.5, semilla: 11 + sm * 4});

  // 3 · el contorno de carbón: la silueta por fuera, y la cabeza y la pata de delante encima del cuerpo
  fino(c, CAJA_GATO, (x) => {
    contornoFuera(x, todas, 11);
    contornoFuera(x, [...formasCabeza(g), ...formasOrejas(g)], 7);
    contornoFuera(x, formasPata(g.pataCerca), 7);
  }, 1.5, 1, {min: 0.45, semilla: 7 + sm * 3});

  // 4 · la cara: los ojos de caolín con su pupila, la nariz, la boca, los bigotes y la lengua
  fino(c, CAJA_GATO, (x) => {
    enGato(x);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    for (const o of [g.ojoLejos, g.ojoCerca]) {
      if (o.cerrado || o.visible.length < 3) {
        x.strokeStyle = CARBON;
        x.lineWidth = 7;
        x.stroke(p2('M ' + o.arco.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(' L ')));
        continue;
      }
      const ojo = p2(poli(o.visible));
      x.fillStyle = CAOLIN;
      x.fill(ojo);
      x.save();
      x.clip(ojo);
      x.fillStyle = CARBON;
      x.fill(p2(elipse(o.pupila)));
      x.fillStyle = CAOLIN;
      x.beginPath();
      x.arc(o.brillo[0], o.brillo[1], Math.max(2.5, o.pupila.rx * 0.28), 0, Math.PI * 2);
      x.fill();
      x.restore();
      x.strokeStyle = CARBON;
      x.lineWidth = 6;
      x.stroke(ojo);
    }
    x.fillStyle = CARBON;
    x.fill(p2(poli(g.nariz)));
    x.strokeStyle = CARBON;
    x.lineWidth = 5.5;
    x.stroke(p2('M ' + g.boca.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(' L ')));
    x.lineWidth = 4.5;
    x.stroke(p2(`M ${g.surco[0][0]} ${g.surco[0][1]} L ${g.surco[1][0]} ${g.surco[1][1]}`));
    if (g.lengua) {
      x.fillStyle = OCRE_ROJO;
      x.fill(p2(elipse(g.lengua)));
    }
    x.lineWidth = 3.4;
    for (const b of g.bigotes) x.stroke(p2(bigote(b)));
  }, 1.1);
};
