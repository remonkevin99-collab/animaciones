import {rng} from '../../../comun/curvas';
import {capsula} from '../../formas';
import {
  ESCALA_GATO, arcoElipse, bigote, cinta, cuerpoTrazos, curva, elipse, enMundo, oreja, pataTrazos, poli, resta, rot, suma,
  type Elipse, type Gato, type Ojo, type P, type Pata,
} from '../../gato/escena';
import {base, blur, cajaDe, deTrazos, destello, juntar, pintaPieza, punto, type Caja, type Ctx, type Forma} from './espray';

// EL GATO DE GRAFITI: el atigrado de la escena hecho personaje de pared. Contorno negro gordo con su corte
// blanco por fuera (lo que lo despega del fondo cian), relleno de espray de amarillo a naranja y a rojo, la sombra fucsia que se
// funde por abajo a la derecha, la raya blanca del brillo arriba a la izquierda y las rayas del pelo en rojo. La cara, encima:
// ojos de verde ácido con su brillo, cejas negras de «tengo actitud», nariz fucsia y bigotes negros.

const AMARILLO = '#FFC424';
const NARANJA = '#FF8A1A';
const ROJIZO = '#F0462A';
const LEJOS = '#D9561F';
const SOMBRA = '#B3125A';
const RAYA = '#B8231B';
const CREMA = '#FFF2D4';
const ROSA = '#FF5FA8';
const IRIS = '#DDFF3A';
const NEGRO = '#15121A';
const BLANCO = '#FFFDF6';

// el gato se calcula a su tamaño y se pinta 1,14 veces más grande desde donde se sienta
const MG = new DOMMatrix().translate(300, 1010).scale(ESCALA_GATO).translate(-300, -1010);
const pM = (d: string) => {
  const p = new Path2D();
  p.addPath(new Path2D(d), MG);
  return p;
};
const pMs = (ds: string[]) => ds.map(pM);

const enE = (e: Elipse, u: number, v: number): P => suma(e.c, rot([u * e.rx, v * e.ry], e.ang));
const unit = (a: P): P => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const esc = (a: P, k: number): P => [a[0] * k, a[1] * k];
const lerp = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

// una raya que cruza un segmento (las patas, la cola)
const rayaCruzada = (a: P, b: P, k: number, ancho: number, grosor: number) => {
  const c = lerp(a, b, k);
  const u = unit(resta(b, a));
  const n: P = [-u[1], u[0]];
  return cinta([suma(c, esc(n, -ancho)), suma(c, esc(u, ancho * 0.25)), suma(c, esc(n, ancho))], [grosor * 0.35, grosor, grosor * 0.35]);
};

// la silueta entera (para los restos del cuadro de antes)
export const siluetaGato = (g: Gato): Forma =>
  deTrazos(pMs([
    ...cuerpoTrazos(g), elipse(g.cabeza), elipse(g.hocico), oreja(g.orejaLejos), oreja(g.orejaCerca), cinta(g.cola.pts, g.cola.r),
    ...pataTrazos(g.pataCerca), ...pataTrazos(g.pataLejos),
  ]));

export const cajaGato = (g: Gato, margen = 60): Caja => {
  const pts: P[] = [];
  for (const e of [g.cadera, g.torso, g.pecho, g.barriga, g.pieTrasero, g.cabeza, g.hocico]) {
    const R = Math.max(e.rx, e.ry);
    pts.push([e.c[0] - R, e.c[1] - R], [e.c[0] + R, e.c[1] + R]);
  }
  for (const o of [g.orejaLejos, g.orejaCerca]) pts.push(o.punta, ...o.base);
  g.cola.pts.forEach((q, i) => pts.push([q[0] - g.cola.r[i], q[1] - g.cola.r[i]], [q[0] + g.cola.r[i], q[1] + g.cola.r[i]]));
  for (const pt of [g.pataCerca, g.pataLejos]) pts.push(pt.hombro, pt.codo, [pt.pie.c[0] - 36, pt.pie.c[1] - 36], [pt.pie.c[0] + 36, pt.pie.c[1] + 36]);
  return cajaDe(pts.map(enMundo), margen);
};

// el degradado de espray del pelo: de amarillo arriba a rojizo abajo (en el mundo)
const pelo = (c: Ctx, y0: number, y1: number, claro = AMARILLO, medio = NARANJA, oscuro = ROJIZO) => {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, claro);
  g.addColorStop(0.5, medio);
  g.addColorStop(1, oscuro);
  return g;
};

const ESTILO = {
  linea: 8,
  corte: {color: BLANCO, ancho: 7},
  niebla: {radio: 15, alfa: 0.5},
  nieblaRelleno: {color: NARANJA, radio: 16, alfa: 0.32},
  sombra: {color: SOMBRA, d: [-22, -18] as P, alfa: 0.82, difumina: 7},
  brillo: {color: '#FFF1A8', d: [16, 14] as P, alfa: 0.45, difumina: 9},
  luz: {d: [6, 6] as P, ancho: 5.5},
};

// dentro del gato se pinta con la transformación del gato (sus medidas)
const conGato = (c: Ctx, f: (c: Ctx) => void) => {
  c.save();
  c.transform(MG.a, MG.b, MG.c, MG.d, MG.e, MG.f);
  f(c);
  c.restore();
};
const rellenaD = (c: Ctx, d: string, color: string) => {
  c.fillStyle = color;
  c.fill(new Path2D(d));
};

const pata = (c: Ctx, pt: Pata, caja: Caja, cerca: boolean, semilla: number) => {
  const ds = pataTrazos(pt);
  pintaPieza(c, {
    ...ESTILO, caja, forma: deTrazos(pMs(ds)), semilla,
    corte: cerca ? ESTILO.corte : {color: BLANCO, ancho: 4},
    relleno: (q) => (cerca ? pelo(q, enMundo(pt.hombro)[1] - 40, enMundo(pt.pie.c)[1] + 20) : LEJOS),
    sombra: cerca ? ESTILO.sombra : {...ESTILO.sombra, alfa: 0.9},
    dentro: (q) => conGato(q, (b) => {
      [[0.42, 34, 8], [0.76, 30, 7]].forEach(([k, a, gr]) => rellenaD(b, rayaCruzada(pt.hombro, pt.codo, k, a, gr), RAYA));
      rellenaD(b, rayaCruzada(pt.codo, pt.mano, 0.3, 26, 7), RAYA);
      rellenaD(b, capsula(lerp(pt.codo, pt.mano, 0.62), pt.mano, 22, 18.5), cerca ? CREMA : '#E9C9A9');
      rellenaD(b, elipse(pt.pie), cerca ? CREMA : '#E9C9A9');
    }),
  });
  // los dedos
  conGato(c, (b) => {
    const {c: pc, rx, ang} = pt.pie;
    b.strokeStyle = NEGRO;
    b.lineWidth = 3.4;
    b.lineCap = 'round';
    for (const s of [0.36, 0.7]) {
      const a = suma(pc, rot([rx * s, -4], ang)), e = suma(pc, rot([rx * s, 9], ang));
      b.beginPath();
      b.moveTo(a[0], a[1]);
      b.lineTo(e[0], e[1]);
      b.stroke();
    }
  });
};

// las rayas del lomo y de la cadera
const rayasCuerpo = (g: Gato): string[] => {
  const T = g.torso, Ca = g.cadera;
  const out: string[] = [];
  [-0.66, -0.36, -0.06, 0.24].forEach((v, i) => {
    out.push(cinta([enE(T, -1.12, v - 0.04), enE(T, -0.76, v), enE(T, -0.42, v + 0.05), enE(T, -0.14, v + 0.12)], [2, 14 - i * 0.6, 9, 1.5]));
  });
  [0.5, 0.74, 0.98].forEach((s, i) => {
    const e: Elipse = {c: enE(Ca, 0.12, 0.18), rx: Ca.rx * s, ry: Ca.ry * s, ang: Ca.ang};
    out.push(cinta(arcoElipse(e, 3.3 + i * 0.05, 4.4 - i * 0.08, 5), [1.5, 8, 11, 10, 7, 1.5]));
  });
  return out;
};

// un ojo: verde ácido, pupila negra, el brillo blanco grande y el contorno gordo; cerrado, un arco
const ojo = (c: Ctx, o: Ojo) => {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (o.cerrado) {
    c.strokeStyle = NEGRO;
    c.lineWidth = 7;
    c.stroke(new Path2D(curva(o.arco)));
    return;
  }
  if (o.visible.length < 3) return;
  const v = new Path2D(poli(o.visible));
  c.fillStyle = IRIS;
  c.fill(v);
  c.save();
  c.clip(v);
  // la sombra del párpado arriba y la pupila
  c.fillStyle = 'rgba(60,120,20,0.55)';
  c.fill(new Path2D(elipse({c: suma(o.c, rot([0, -o.ry * 0.9], o.ang)), rx: o.rx * 1.3, ry: o.ry * 0.55, ang: o.ang})));
  c.fillStyle = NEGRO;
  c.fill(new Path2D(elipse(o.pupila)));
  punto(c, o.brillo[0], o.brillo[1], 7, BLANCO);
  punto(c, o.brillo[0] + 9, o.brillo[1] + 12, 3, BLANCO);
  c.restore();
  c.strokeStyle = NEGRO;
  c.lineWidth = 5.5;
  c.stroke(v);
};

// la ceja: un trazo negro gordo encima del ojo, más bajo del lado de la nariz (mirada de «lo voy a hacer»)
const ceja = (c: Ctx, o: Ojo, nariz: P, alto: number) => {
  if (o.rx < 8) return;
  const haciaNariz = rot(resta(nariz, o.c), -o.ang)[0] > 0 ? 1 : -1;
  const a = suma(o.c, rot([-haciaNariz * o.rx * 1.05, -o.ry * (1.3 + alto)], o.ang));
  const m = suma(o.c, rot([0, -o.ry * (1.42 + alto)], o.ang));
  const e = suma(o.c, rot([haciaNariz * o.rx * 0.95, -o.ry * (0.98 + alto * 0.5)], o.ang));
  c.strokeStyle = NEGRO;
  c.lineWidth = 9;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.quadraticCurveTo(m[0], m[1], e[0], e[1]);
  c.stroke();
};

export const gatoGrafiti = (c: Ctx, g: Gato, semilla: number) => {
  const caja = cajaGato(g);
  const lame = !!g.lengua || g.mira === 'pata';
  base(c);

  // la cola, detrás de todo
  const cp = g.cola.pts, cr = g.cola.r;
  pintaPieza(c, {
    ...ESTILO, caja, forma: deTrazos([pM(cinta(cp, cr))]), semilla: semilla + 1,
    relleno: (q) => {
      const a = enMundo(cp[0]), b = enMundo(cp[cp.length - 1]);
      const gr = q.createLinearGradient(a[0], a[1], b[0], b[1]);
      gr.addColorStop(0, ROJIZO);
      gr.addColorStop(0.6, NARANJA);
      gr.addColorStop(1, AMARILLO);
      return gr;
    },
    dentro: (q) => conGato(q, (b) => {
      [4, 7, 10, 12].forEach((i) => rellenaD(b, rayaCruzada(cp[i - 1], cp[i + 1], 0.5, cr[i] * 1.5, 6 + i * 0.3), RAYA));
      rellenaD(b, cinta(cp.slice(-3), cr.slice(-3).map((q2) => q2 * 1.2)), RAYA);
    }),
  });

  // la otra pata, detrás
  pata(c, g.pataLejos, caja, false, semilla + 2);

  // el cuerpo, de una pieza: el pecho y la barriga crema, las rayas
  const cuerpo = cuerpoTrazos(g);
  pintaPieza(c, {
    ...ESTILO, caja, forma: deTrazos(pMs(cuerpo)), semilla: semilla + 3,
    relleno: (q) => pelo(q, 640, 1010),
    dentro: (q) => conGato(q, (b) => {
      rellenaD(b, elipse({c: enE(g.pecho, 0.34, 0.1), rx: g.pecho.rx * 0.7, ry: g.pecho.ry * 0.84, ang: g.pecho.ang}), CREMA);
      rellenaD(b, elipse({c: suma(lerp(g.cuello[0], g.cuello[1], 0.45), [26, 0]), rx: 36, ry: 62, ang: 0.3}), CREMA);
      rellenaD(b, elipse({c: enE(g.barriga, 0.22, 0.35), rx: g.barriga.rx * 0.76, ry: g.barriga.ry * 0.6, ang: g.barriga.ang}), CREMA);
      rayasCuerpo(g).forEach((d) => rellenaD(b, d, RAYA));
    }),
  });

  const pataCerca = () => pata(c, g.pataCerca, caja, true, semilla + 4);
  if (!lame) pataCerca();

  // la cabeza con las orejas, de una pieza
  const H = g.cabeza.c, th = g.cabeza.ang;
  const L = (lado: P, frente: P): P => suma(H, rot(lerp(lado, frente, g.giro), th));
  const raya3 = (a: [P, P], b: [P, P], m: [P, P], w: number) => cinta([L(...a), L(...b), L(...m)], [w * 0.3, w, w * 0.3]);
  const rayasCara = [
    raya3([[44, -72], [0, -72]], [[45, -57], [0, -57]], [[46, -40], [0, -40]], 8),
    raya3([[24, -66], [-26, -66]], [[27, -52], [-20, -52]], [[30, -38], [-15, -38]], 6.5),
    raya3([[64, -66], [26, -66]], [[63, -53], [20, -52]], [[62, -40], [15, -38]], 6.5),
    raya3([[-62, 2], [-112, 4]], [[-46, 6], [-96, 8]], [[-30, 10], [-80, 12]], 7),
    raya3([[-58, 22], [-108, 24]], [[-43, 24], [-92, 26]], [[-28, 27], [-78, 28]], 6),
  ];
  const lejosCara = [
    raya3([[124, 2], [112, 4]], [[120, 6], [96, 8]], [[116, 10], [80, 12]], 7 * g.giro),
    raya3([[122, 22], [108, 24]], [[118, 24], [92, 26]], [[114, 27], [78, 28]], 6 * g.giro),
  ];
  const cabeza: Forma = juntar(
    deTrazos(pMs([oreja(g.orejaLejos), oreja(g.orejaCerca)])),
    deTrazos(pMs([elipse(g.cabeza), elipse(g.hocico)])),
  );
  const yCab = enMundo(H)[1];
  pintaPieza(c, {
    ...ESTILO, caja, forma: cabeza, semilla: semilla + 5,
    relleno: (q) => pelo(q, yCab - 190, yCab + 120, '#FFD43A', NARANJA, '#F25A22'),
    dentro: (q) => conGato(q, (b) => {
      rellenaD(b, poli(g.orejaLejos.dentro), ROSA);
      rellenaD(b, poli(g.orejaCerca.dentro), ROSA);
      rayasCara.forEach((d) => rellenaD(b, d, RAYA));
      if (g.giro > 0.05) lejosCara.forEach((d) => rellenaD(b, d, RAYA));
      rellenaD(b, elipse(g.hocico), CREMA);
      rellenaD(b, elipse({c: L([70, 60], [0, 60]), rx: 30, ry: 15, ang: th}), CREMA);
    }),
  });

  // la cara, encima y nítida (en las medidas del gato)
  conGato(c, (b) => {
    // el contorno de dentro de las orejas
    b.strokeStyle = NEGRO;
    b.lineWidth = 4;
    b.lineJoin = 'round';
    b.stroke(new Path2D(poli(g.orejaCerca.dentro)));
    b.globalAlpha = 0.8;
    b.stroke(new Path2D(poli(g.orejaLejos.dentro)));
    b.globalAlpha = 1;
    // el hocico, perfilado fino
    b.lineWidth = 3.5;
    b.stroke(new Path2D(elipse(g.hocico)));
    const nar = g.nariz[2];
    for (const o of [g.ojoLejos, g.ojoCerca]) {
      ojo(b, o);
      ceja(b, o, nar, 0.12);
    }
    b.fillStyle = ROSA;
    b.fill(new Path2D(poli(g.nariz)));
    b.strokeStyle = NEGRO;
    b.lineWidth = 3.4;
    b.lineCap = 'round';
    b.stroke(new Path2D(poli(g.nariz)));
    b.beginPath();
    b.moveTo(g.surco[0][0], g.surco[0][1]);
    b.lineTo(g.surco[1][0], g.surco[1][1]);
    b.stroke();
    b.lineWidth = 4.6;
    b.stroke(new Path2D(curva(g.boca)));
    // los bigotes: negros, con un poco de niebla
    b.lineWidth = 3.6;
    g.bigotes.forEach((w) => b.stroke(new Path2D(bigote(w))));
  });

  if (lame) pataCerca();
  if (g.lengua) {
    conGato(c, (b) => {
      b.fillStyle = '#FF6E9C';
      b.fill(new Path2D(elipse(g.lengua as Elipse)));
      b.strokeStyle = NEGRO;
      b.lineWidth = 3;
      b.stroke(new Path2D(elipse(g.lengua as Elipse)));
    });
  }

  // brillos de grafiti en la cabeza y el lomo
  const r = rng(semilla);
  const b1 = enMundo(suma(H, rot([-60, -64], th)));
  const b2 = enMundo(enE(g.torso, -0.55, -0.62));
  c.save();
  c.filter = blur(0.5);
  destello(c, b1[0], b1[1], 15 + r() * 3, BLANCO);
  destello(c, b2[0], b2[1], 13 + r() * 3, BLANCO);
  c.restore();
  punto(c, b1[0] + 20, b1[1] + 12, 3.5, BLANCO);
};
