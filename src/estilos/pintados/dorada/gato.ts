import {clamp, mix, rng} from '../../../comun/curvas';
import {
  ESCALA_GATO, MESA_Y, bigote, cinta, cuerpoTrazos, curva, elipse, enMundo, oreja, pataTrazos, poli, rot, suma,
  type Elipse, type Gato, type Oreja, type P, type Pata,
} from '../../gato/escena';
import {SOL} from './cielo';
import {aclara, css, hash, hex, limpio, mezcla, pincelada, type RGB} from './pincel';

// EL GATO A CONTRALUZ: casi una silueta, pero cálida y pintada. El cuerpo es un ciruela muy oscuro hecho de pinceladas que siguen el
// pelo; por arriba le llega un poco de malva del cielo (la luz que rebota) y por el lado del sol se calienta hacia brasa, que es la
// luz que atraviesa el borde del pelo. Las orejas, finas, dejan pasar el sol y brillan naranja; los bigotes son hilos de oro; los ojos
// son ámbar y se leen sobre la cara oscura (por eso se entiende que te mira y lo que trama). El borde de luz dorada y los pelos que
// brillan en el contorno los pone ./luz.ts con su silueta. Todo se calcula con la forma de ../../gato/escena.ts.

const K = ESCALA_GATO;
const PIV: P = [300, MESA_Y];
const MATRIZ: [number, number, number, number, number, number] = [K, 0, 0, K, PIV[0] * (1 - K), PIV[1] * (1 - K)];

const BASE = hex('#311827');
const OSC = hex('#200C17');
const REBOTE = hex('#7E4C76');
const CALIDO = hex('#94422E');
const PECHO = hex('#4C3046');
const PECHO_LUZ = hex('#87607A');
const RAYA = hex('#1F0C17');
const LEJOS = hex('#2A1420');

const enE = (e: Elipse, u: number, v: number): P => suma(e.c, rot([u * e.rx, v * e.ry], e.ang));
const unit = (a: P): P => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
// hacia dónde queda el sol desde un punto del mundo
const haciaSol = (q: P): P => unit([SOL[0] - q[0], SOL[1] - q[1]]);

// una pincelada en las medidas del gato (se pasa al mundo)
const pinG = (c: CanvasRenderingContext2D, q: P, ang: number, l: number, w: number, col: RGB, a = 0.9, v = 0, vetas = 0.5) => {
  const m = enMundo(q);
  pincelada(c, m[0], m[1], ang, l * K, w * K, col, a, v, vetas);
};
// a las medidas del gato, opaco (cada pincelada deja su opacidad puesta: aquí se vuelve a 1)
const enGato = (c: CanvasRenderingContext2D) => {
  limpio(c);
  c.setTransform(...MATRIZ);
};

// las pinceladas de cada parte, fijas en su sitio (u, v en el disco de la elipse): se mueven con ella
type Pin = {u: number; v: number; l: number; w: number; tono: number; gira: number; var: number};
const hacerPins = (n: number, semilla: number): Pin[] => {
  const r = rng(semilla);
  return Array.from({length: n}, () => {
    const a = r() * Math.PI * 2, s = Math.sqrt(r()) * 0.98;
    return {u: Math.cos(a) * s, v: Math.sin(a) * s, l: 20 + r() * 18, w: 7 + r() * 5, tono: r(), gira: (r() - 0.5) * 0.5, var: Math.floor(r() * 10)};
  });
};
const PINS = {
  cadera: hacerPins(130, 401), torso: hacerPins(120, 402), pecho: hacerPins(80, 403), barriga: hacerPins(46, 404),
  cuello: hacerPins(40, 405), cabeza: hacerPins(130, 406), hocico: hacerPins(34, 407), pie: hacerPins(14, 408),
};
const PINS_COLA = (() => {
  const r = rng(409);
  return Array.from({length: 90}, () => ({s: r(), lado: r() - 0.5, l: 16 + r() * 14, w: 6 + r() * 4, tono: r(), var: Math.floor(r() * 10)}));
})();
const PINS_PATA = (() => {
  const r = rng(410);
  return Array.from({length: 30}, () => ({tramo: r(), s: r(), lado: r() - 0.5, l: 14 + r() * 12, w: 6 + r() * 3, tono: r(), var: Math.floor(r() * 10)}));
})();

// el color de una pincelada del pelo: oscuro, con el malva del cielo arriba y la brasa del lado del sol
const colorPelo = (e: Elipse, p: Pin, claro: boolean): RGB => {
  const off = rot([p.u * e.rx, p.v * e.ry], e.ang);
  const arriba = clamp(-off[1] / Math.max(e.rx, e.ry));
  const s = Math.hypot(p.u, p.v);
  const mundo = enMundo(suma(e.c, off));
  const n = unit(off);
  const hs = haciaSol(mundo);
  const frente = clamp(n[0] * hs[0] + n[1] * hs[1]) * s * s;
  let col = claro ? mezcla(PECHO, aclara(PECHO, -0.25), p.tono * 0.6) : mezcla(BASE, OSC, p.tono * 0.7);
  col = mezcla(col, claro ? PECHO_LUZ : REBOTE, (claro ? 0.75 : 0.78) * arriba ** 1.1 * (0.4 + 0.6 * p.tono));
  col = mezcla(col, CALIDO, 0.85 * frente);
  return col;
};
const pintarParte = (c: CanvasRenderingContext2D, e: Elipse, pins: Pin[], claro = false, vetas = 0.5) => {
  for (const p of pins) {
    const q = enE(e, p.u, p.v);
    // el pelo sigue la forma (la tangente de su elipse) y cae un poco hacia abajo
    let tg = unit(rot([-p.v * e.rx, p.u * e.ry], e.ang));
    if (tg[1] < 0) tg = [-tg[0], -tg[1]];
    const dir = unit([tg[0] * 0.65, tg[1] * 0.65 + 0.35]);
    pinG(c, q, Math.atan2(dir[1], dir[0]) + p.gira, p.l, p.w, colorPelo(e, p, claro), 0.88, p.var, vetas);
  }
};

const pintarPata = (c: CanvasRenderingContext2D, pt: Pata, lejos: boolean) => {
  enGato(c);
  c.globalAlpha = 1;
  c.fillStyle = css(lejos ? LEJOS : BASE);
  for (const d of pataTrazos(pt)) c.fill(new Path2D(d));
  const tramos: [P, P][] = [[pt.hombro, pt.codo], [pt.codo, pt.mano]];
  for (const p of PINS_PATA) {
    const [a, b] = tramos[p.tramo < 0.5 ? 0 : 1];
    const q: P = [mix(a[0], b[0], p.s), mix(a[1], b[1], p.s)];
    const u = unit([b[0] - a[0], b[1] - a[1]]);
    const off: P = [-u[1] * p.lado * 30, u[0] * p.lado * 30];
    const m = enMundo(suma(q, off));
    const hs = haciaSol(m);
    const frente = clamp((-u[1] * hs[0] + u[0] * hs[1]) * Math.sign(p.lado || 1)) * Math.abs(p.lado) * 2;
    let col = lejos ? mezcla(LEJOS, OSC, p.tono * 0.6) : mezcla(BASE, OSC, p.tono * 0.6);
    col = mezcla(col, CALIDO, (lejos ? 0.4 : 0.8) * frente);
    pinG(c, suma(q, off), Math.atan2(u[1], u[0]), p.l, p.w, col, 0.85, p.var);
  }
  // la mano, con su almohadilla un poco más clara
  const pie = pt.pie;
  for (let i = 0; i < 6; i++) {
    const q = enE(pie, (hash(i, 3) - 0.5) * 1.2, (hash(i, 5) - 0.5) * 0.8);
    pinG(c, q, pie.ang + (hash(i, 7) - 0.5) * 0.4, 18, 8, mezcla(lejos ? LEJOS : PECHO, CALIDO, lejos ? 0.1 : 0.25), 0.8, i);
  }
  limpio(c);
};

// la oreja: oscura por fuera y, dentro, el sol que la atraviesa
const pintarOreja = (c: CanvasRenderingContext2D, o: Oreja, lejos: boolean) => {
  enGato(c);
  c.fillStyle = css(lejos ? LEJOS : BASE);
  c.fill(new Path2D(oreja(o)));
  const [a, b, d] = o.dentro;
  const cen: P = [(a[0] + b[0] + d[0]) / 3, (a[1] + b[1] + d[1]) / 3];
  const radio = Math.hypot(b[0] - cen[0], b[1] - cen[1]) * 1.35;
  const g = c.createRadialGradient(cen[0], cen[1] + radio * 0.15, 0, cen[0], cen[1], radio);
  const f = lejos ? 0.7 : 1;
  g.addColorStop(0, `rgba(255,150,80,${0.95 * f})`);
  g.addColorStop(0.45, `rgba(232,92,58,${0.85 * f})`);
  g.addColorStop(1, `rgba(120,40,46,${0.2 * f})`);
  c.fillStyle = g;
  c.fill(new Path2D(poli(o.dentro)));
  // los pelillos de dentro de la oreja, encendidos
  c.strokeStyle = `rgba(255,214,150,${0.7 * f})`;
  c.lineWidth = 1.6;
  c.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const s = 0.15 + i * 0.15;
    const p0: P = [mix(o.bc[0], o.punta[0], 0.05), mix(o.bc[1], o.punta[1], 0.05)];
    const q: P = [mix(mix(a[0], d[0], s), o.punta[0], 0.45), mix(mix(a[1], d[1], s), o.punta[1], 0.45)];
    c.beginPath();
    c.moveTo(mix(p0[0], q[0], 0.35), mix(p0[1], q[1], 0.35));
    c.lineTo(q[0], q[1]);
    c.stroke();
  }
  limpio(c);
};

export const pintarGato = (c: CanvasRenderingContext2D, g: Gato) => {
  limpio(c);
  const lame = !!g.lengua;
  // lo de detrás: la otra pata y la cola
  pintarPata(c, g.pataLejos, true);
  enGato(c);
  const cola = new Path2D(cinta(g.cola.pts, g.cola.r));
  c.fillStyle = css(BASE);
  c.fill(cola);
  limpio(c);
  {
    const pts = g.cola.pts;
    for (const p of PINS_COLA) {
      const f = p.s * (pts.length - 1.001);
      const i = Math.floor(f), k = f - i;
      const a = pts[i], b = pts[i + 1];
      const u = unit([b[0] - a[0], b[1] - a[1]]);
      const r = mix(g.cola.r[i], g.cola.r[i + 1], k);
      const q: P = [mix(a[0], b[0], k) - u[1] * p.lado * r * 1.5, mix(a[1], b[1], k) + u[0] * p.lado * r * 1.5];
      const anillo = Math.floor(f / 2.3) % 2 === 0;
      let col = mezcla(anillo ? BASE : OSC, OSC, p.tono * 0.5);
      if (p.lado < -0.15) col = mezcla(col, REBOTE, 0.35 * p.tono);
      pinG(c, q, Math.atan2(u[1], u[0]), p.l, p.w, col, 0.9, p.var);
    }
  }
  // el cuerpo: cada parte rellena por separado (la unión de caminos se anula donde giran al revés) y sus pinceladas recortadas a ella
  const cuello: Elipse = (() => {
    const [a, b] = g.cuello;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return {c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], rx: 58, ry: d / 2 + 40, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2};
  })();
  enGato(c);
  c.fillStyle = css(BASE);
  for (const d of cuerpoTrazos(g)) c.fill(new Path2D(d));
  limpio(c);
  const recortada = (e: Elipse, pinta: () => void) => {
    enGato(c);
    c.save();
    c.clip(new Path2D(elipse(e)));
    limpio(c);
    pinta();
    c.restore();
    limpio(c);
  };
  recortada(g.cadera, () => pintarParte(c, g.cadera, PINS.cadera));
  recortada(cuello, () => pintarParte(c, cuello, PINS.cuello));
  recortada(g.torso, () => pintarParte(c, g.torso, PINS.torso));
  recortada(g.barriga, () => pintarParte(c, g.barriga, PINS.barriga, true));
  // el pecho claro (en sombra), que separa la silueta del cuerpo
  recortada(g.pecho, () => pintarParte(c, {c: enE(g.pecho, 0.25, 0.05), rx: g.pecho.rx * 0.85, ry: g.pecho.ry * 0.95, ang: g.pecho.ang}, PINS.pecho, true));
  recortada(g.pieTrasero, () => pintarParte(c, g.pieTrasero, PINS.pie));
  // las rayas del lomo y de la cadera, apenas más oscuras
  recortada(g.torso, () => {
    for (let i = 0; i < 4; i++) {
      const v = -0.62 + i * 0.3;
      const pts: P[] = [enE(g.torso, -1.08, v - 0.04), enE(g.torso, -0.72, v), enE(g.torso, -0.4, v + 0.06)];
      for (let j = 0; j < 2; j++) pinG(c, pts[j], Math.atan2(pts[j + 1][1] - pts[j][1], pts[j + 1][0] - pts[j][0]), 34, 10 - i, RAYA, 0.55, i + j);
    }
  });
  recortada(g.cadera, () => {
    for (let i = 0; i < 3; i++) {
      const e: Elipse = {c: enE(g.cadera, 0.1, 0.18), rx: g.cadera.rx * (0.55 + i * 0.22), ry: g.cadera.ry * (0.55 + i * 0.22), ang: g.cadera.ang};
      const a = enE(e, -0.85, -0.5), b = enE(e, -0.3, -0.95);
      pinG(c, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], Math.atan2(b[1] - a[1], b[0] - a[0]), 60, 10, RAYA, 0.5, i + 4);
    }
  });

  if (!lame) pintarPata(c, g.pataCerca, false);

  // la cabeza: las orejas que brillan, la cabeza, el hocico claro
  pintarOreja(c, g.orejaLejos, true);
  pintarOreja(c, g.orejaCerca, false);
  enGato(c);
  const cabeza = new Path2D(elipse(g.cabeza));
  c.fillStyle = css(BASE);
  c.fill(cabeza);
  c.save();
  c.clip(cabeza);
  limpio(c);
  pintarParte(c, g.cabeza, PINS.cabeza);
  // las rayas de la frente
  for (let i = 0; i < 3; i++) {
    const a = enE(g.cabeza, -0.2 + i * 0.16, -0.95), b = enE(g.cabeza, -0.16 + i * 0.13, -0.6);
    pinG(c, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], Math.atan2(b[1] - a[1], b[0] - a[0]), 34, 9, RAYA, 0.55, i + 7);
  }
  enGato(c);
  c.fillStyle = css(PECHO);
  c.fill(new Path2D(elipse(g.hocico)));
  limpio(c);
  pintarParte(c, g.hocico, PINS.hocico, true, 0.35);
  c.restore();
  limpio(c);

  // la cara: los ojos de ámbar, la nariz, la boca
  enGato(c);
  for (const o of [g.ojoLejos, g.ojoCerca]) {
    if (o.cerrado) {
      c.strokeStyle = css(hex('#A0687A'), 0.85);
      c.lineWidth = 4.5;
      c.lineCap = 'round';
      c.stroke(new Path2D(curva(o.arco)));
      continue;
    }
    if (o.visible.length < 3) continue;
    const ojo = new Path2D(poli(o.visible));
    c.save();
    c.clip(ojo);
    const gr = c.createRadialGradient(o.c[0], o.c[1] + o.ry * 0.2, 0, o.c[0], o.c[1], Math.max(o.rx, o.ry) * 1.1);
    gr.addColorStop(0, '#FFE08A');
    gr.addColorStop(0.55, '#F6A640');
    gr.addColorStop(1, '#9A4A1E');
    c.fillStyle = gr;
    c.fill(ojo);
    c.fillStyle = '#150910';
    c.fill(new Path2D(elipse(o.pupila)));
    c.fillStyle = '#FFF8E8';
    c.beginPath();
    c.arc(o.brillo[0], o.brillo[1], 6, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.8;
    c.beginPath();
    c.arc(o.brillo[0] + 9, o.brillo[1] + 11, 2.6, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    c.restore();
    c.strokeStyle = '#12060D';
    c.lineWidth = 3.4;
    c.lineJoin = 'round';
    c.stroke(ojo);
  }
  c.fillStyle = css(hex('#7A4052'));
  c.fill(new Path2D(poli(g.nariz)));
  c.strokeStyle = 'rgba(20,8,14,0.85)';
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.stroke(new Path2D(curva(g.boca)));
  c.stroke(new Path2D(`M ${g.surco[0][0]} ${g.surco[0][1]} L ${g.surco[1][0]} ${g.surco[1][1]}`));

  if (lame) {
    limpio(c);
    pintarPata(c, g.pataCerca, false);
    enGato(c);
  }
  if (g.lengua) {
    c.fillStyle = css(hex('#C8606E'));
    c.fill(new Path2D(elipse(g.lengua)));
  }
  limpio(c);
};

// los bigotes: hilos de oro a contraluz (se suman a la luz)
export const pintarBigotes = (c: CanvasRenderingContext2D, g: Gato) => {
  enGato(c);
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (const b of g.bigotes) {
    c.strokeStyle = 'rgba(255,214,140,0.6)';
    c.lineWidth = 1.9;
    c.stroke(new Path2D(bigote(b)));
  }
  limpio(c);
};

// la silueta del gato, en negro, para el borde de luz
export const siluetaGato = (c: CanvasRenderingContext2D, g: Gato) => {
  enGato(c);
  c.fillStyle = '#000';
  const ds = [
    ...cuerpoTrazos(g), elipse(g.cabeza), elipse(g.hocico), oreja(g.orejaLejos), oreja(g.orejaCerca), cinta(g.cola.pts, g.cola.r),
    ...pataTrazos(g.pataCerca), ...pataTrazos(g.pataLejos),
  ];
  for (const d of ds) c.fill(new Path2D(d));
  limpio(c);
};

// los puntos del contorno donde nacen los pelos que brillan (en el mundo, con su normal hacia fuera)
export type Pelo = {p: P; n: P; l: number; fino: boolean};
export const pelosGato = (g: Gato): Pelo[] => {
  const out: Pelo[] = [];
  const mundoN = (n: P): P => n; // la escala es igual en x e y: la normal no cambia
  const deElipse = (e: Elipse, paso: number, semilla: number, lMin = 7, lMax = 15) => {
    const per = Math.PI * (3 * (e.rx + e.ry) - Math.sqrt((3 * e.rx + e.ry) * (e.rx + 3 * e.ry)));
    const n = Math.round(per / paso);
    for (let i = 0; i < n; i++) {
      const a = ((i + hash(i, semilla) * 0.8) / n) * Math.PI * 2;
      const q = enE(e, Math.cos(a), Math.sin(a));
      const nn = unit(rot([Math.cos(a) / e.rx, Math.sin(a) / e.ry], e.ang));
      out.push({p: enMundo(q), n: mundoN(nn), l: mix(lMin, lMax, hash(i, semilla + 1)), fino: false});
    }
  };
  deElipse(g.cadera, 6, 11);
  deElipse(g.torso, 6, 12);
  deElipse(g.pecho, 6, 13);
  deElipse(g.barriga, 7, 14);
  deElipse(g.cabeza, 5.5, 15);
  deElipse(g.hocico, 7, 16, 5, 9);
  // la cola, por los dos lados
  const pts = g.cola.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const u = unit([b[0] - a[0], b[1] - a[1]]);
    for (let j = 0; j < 4; j++) {
      const k = (j + 0.5) / 4;
      const r = mix(g.cola.r[i], g.cola.r[i + 1], k);
      for (const lado of [-1, 1]) {
        const n: P = [-u[1] * lado, u[0] * lado];
        const q: P = [mix(a[0], b[0], k) + n[0] * r, mix(a[1], b[1], k) + n[1] * r];
        out.push({p: enMundo(q), n, l: mix(7, 14, hash(i * 8 + j, lado + 20)), fino: false});
      }
    }
  }
  // la punta de la cola
  {
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    const u = unit([b[0] - a[0], b[1] - a[1]]);
    for (let j = -2; j <= 2; j++) {
      const n = unit(suma(u, [-u[1] * j * 0.45, u[0] * j * 0.45]));
      out.push({p: enMundo(suma(b, [n[0] * 12, n[1] * 12])), n, l: 12, fino: false});
    }
  }
  // las orejas: pelos finos por sus dos lados
  for (const o of [g.orejaLejos, g.orejaCerca]) {
    for (const base of o.base) {
      const u = unit([o.punta[0] - base[0], o.punta[1] - base[1]]);
      const haciaFuera = unit([base[0] - o.bc[0], base[1] - o.bc[1]]);
      for (let j = 0; j < 14; j++) {
        const k = (j + 0.5) / 14;
        const q: P = [mix(base[0], o.punta[0], k), mix(base[1], o.punta[1], k)];
        let n: P = [-u[1], u[0]];
        if (n[0] * haciaFuera[0] + n[1] * haciaFuera[1] < 0) n = [-n[0], -n[1]];
        out.push({p: enMundo(q), n, l: mix(4, 8, hash(j, 30)), fino: true});
      }
    }
    out.push({p: enMundo(o.punta), n: unit([o.punta[0] - o.bc[0], o.punta[1] - o.bc[1]]), l: 10, fino: true});
  }
  // las patas de delante
  for (const pt of [g.pataCerca]) {
    for (const [a, b, ra, rb] of [[pt.hombro, pt.codo, 32, 23], [pt.codo, pt.mano, 23, 18]] as [P, P, number, number][]) {
      const u = unit([b[0] - a[0], b[1] - a[1]]);
      for (let j = 0; j < 12; j++) {
        const k = (j + 0.5) / 12;
        for (const lado of [-1, 1]) {
          const n: P = [-u[1] * lado, u[0] * lado];
          const r = mix(ra, rb, k);
          out.push({p: enMundo([mix(a[0], b[0], k) + n[0] * r, mix(a[1], b[1], k) + n[1] * r]), n, l: mix(5, 10, hash(j, lado + 40)), fino: false});
        }
      }
    }
    deElipse(pt.pie, 6, 50, 4, 8);
  }
  return out;
};
