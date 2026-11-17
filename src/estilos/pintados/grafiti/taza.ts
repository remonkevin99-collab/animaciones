import {E, clamp, mix, rng} from '../../../comun/curvas';
import {
  IMPACTO, SUELO, T_SUELO, cafe, piezasTaza, poli, rot, suma, trozos, vapor, type P, type Taza,
} from '../../gato/escena';
import {
  PINTA, base, blur, cajaDe, camino, destello, enCapa, goteron, lienzo, manchaPts, motear, niebla, pintaPieza, punto, suave,
  type Caja, type Ctx, type Forma,
} from './espray';
import {C, bloque, letrasForma} from './pared';

// LA TAZA, EL CAFÉ Y EL «¡CRASH!» DEL GRAFITI. La taza, fucsia con su estrella amarilla, pintada como una
// pieza más (contorno, corte blanco, sombra y brillo). El café, a espray marrón: el chorro en arco hecho de gotas gordas con su
// borde negro, y al romperse la salpicadura que sube por la pared con sus goterones que bajan, el charco, las manchas y los trozos.
// El «¡CRASH!», letras de grafiti con volumen sobre una explosión amarilla, que entra de golpe.

const CAFE = '#7A3E1C';
const CAFE_LUZ = '#C27A42';
const CAFE_OSC = '#3E1F0E';
const FUCSIA_CLARO = '#FF8CC4';
const FUCSIA_OSC = '#A80F55';

const tazaForma = (pz: ReturnType<typeof piezasTaza>): Forma => {
  const cuerpo = new Path2D(poli(pz.cuerpo));
  const asa = new Path2D(poli(pz.asaFuera) + ' ' + poli(pz.asaDentro));
  return {
    rellena: (c) => { c.fill(cuerpo); c.fill(asa, 'evenodd'); },
    traza: (c) => { c.stroke(cuerpo); c.stroke(asa); },
  };
};

export const tazaGrafiti = (c: Ctx, tz: Taza, semilla: number) => {
  const pz = piezasTaza(tz);
  const caja = cajaDe([...pz.cuerpo, ...pz.asa], 50);
  const vacia = tz.estado !== 'mesa' && tz.ang > 1.2;
  pintaPieza(c, {
    caja, forma: tazaForma(pz), linea: 6, corte: {color: C.blanco, ancho: 5}, niebla: {radio: 8, alfa: 0.4}, semilla,
    relleno: (q) => {
      const [a, b] = pz.borde;
      const g = q.createLinearGradient(a[0], a[1], b[0], b[1]);
      g.addColorStop(0, FUCSIA_CLARO);
      g.addColorStop(0.45, C.fucsia);
      g.addColorStop(1, FUCSIA_OSC);
      return g;
    },
    sombra: {color: '#5E0A35', d: [-13, -11], alfa: 0.7, difumina: 4},
    luz: {d: [4, 4], ancho: 4.5},
    dentro: (q) => {
      // la estrella amarilla de la taza, que gira con ella
      const e = suma(tz.c, rot([-6, 4], tz.ang));
      q.save();
      q.translate(e[0], e[1]);
      q.rotate(tz.ang + 0.3);
      destello(q, 0, 0, 25, C.negro);
      destello(q, 0, 0, 19, C.amarillo);
      q.restore();
    },
  });
  // la boca de la taza: el café dentro (o vacía, al volcar)
  const boca = suma(tz.c, rot([0, -58], tz.ang));
  c.save();
  c.translate(boca[0], boca[1]);
  c.rotate(tz.ang);
  c.beginPath();
  c.ellipse(0, 0, 49, 10, 0, 0, Math.PI * 2);
  c.fillStyle = vacia ? '#6E0B3C' : CAFE;
  c.fill();
  c.lineWidth = 5;
  c.strokeStyle = C.negro;
  c.stroke();
  if (!vacia) {
    c.fillStyle = CAFE_LUZ;
    c.beginPath();
    c.ellipse(-14, -2, 16, 3.5, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
};

// ---------------------------------------------------------------- el vapor: hilos de espray blanco
export const vaporGrafiti = (c: Ctx, t: number) => {
  for (const h of vapor(t)) {
    if (h.alfa < 0.03) continue;
    const cam = suave(h.pts, false);
    enCapa(c, cajaDe(h.pts, 40), (b) => {
      b.lineCap = 'round';
      b.strokeStyle = '#FFFFFF';
      b.filter = blur(7);
      b.lineWidth = 30;
      b.stroke(cam);
      b.filter = 'none';
      motear(b, cajaDe(h.pts, 40), false, 3);
      b.filter = blur(1.8);
      b.lineWidth = 11;
      b.stroke(cam);
    }, {alfa: Math.min(1, 1.05 * h.alfa)});
  }
};

// ---------------------------------------------------------------- el café
const gotaNegra = (c: Ctx, q: P, r: number) => punto(c, q[0], q[1], r + 3.5, C.negro);
export const cafeGrafiti = (c: Ctx, t: number) => {
  const cf = cafe(t);
  // la niebla marrón del chorro
  if (cf.gotas.length) {
    const pts = cf.gotas.map((g) => g.c);
    niebla(c, cajaDe(pts, 70), (b) => cf.gotas.forEach((g) => punto(b, g.c[0], g.c[1], g.r * 2.2, CAFE)), CAFE, 10, 0.55, 5);
  }
  // el charco y las manchas del suelo
  c.save();
  c.filter = blur(0.7);
  if (cf.charco) {
    const ch = cf.charco;
    const pts = manchaPts(ch.c, ch.rx, ch.ry + 4, 88, 0.22, 40);
    c.lineJoin = 'round';
    c.lineWidth = 9;
    c.strokeStyle = C.negro;
    camino(c, pts);
    c.stroke();
    c.fillStyle = CAFE;
    c.fill();
    c.fillStyle = CAFE_LUZ;
    c.beginPath();
    c.ellipse(ch.c[0] - ch.rx * 0.3, ch.c[1] - ch.ry * 0.3, ch.rx * 0.35, Math.max(2, ch.ry * 0.25), 0, 0, Math.PI * 2);
    c.fill();
  }
  for (const m of cf.manchas) {
    c.fillStyle = C.negro;
    c.beginPath();
    c.ellipse(m.c[0], m.c[1], m.rx + 3.5, m.ry + 3.5, 0, 0, Math.PI * 2);
    c.fill();
  }
  for (const m of cf.manchas) {
    c.fillStyle = CAFE;
    c.beginPath();
    c.ellipse(m.c[0], m.c[1], m.rx, m.ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  // las gotas en el aire: gordas, con su borde negro y su brillo
  for (const g of cf.gotas) gotaNegra(c, g.c, g.r * 1.3);
  for (const g of cf.gotas) punto(c, g.c[0], g.c[1], g.r * 1.3, CAFE);
  for (const g of cf.gotas) if (g.r > 7) punto(c, g.c[0] - g.r * 0.4, g.c[1] - g.r * 0.4, g.r * 0.35, CAFE_LUZ);
  c.restore();
};

// ---------------------------------------------------------------- la salpicadura que sube por la pared al romperse
const SALPICA = (() => {
  const r = rng(707);
  const puntas: {a: number; l: number; w: number; gota: number}[] = [];
  for (let i = 0; i < 15; i++) {
    const a = mix(-Math.PI * 0.97, -Math.PI * 0.03, i / 14) + (r() - 0.5) * 0.12;
    const vertical = 1 - Math.abs(Math.cos(a));
    puntas.push({a, l: 70 + r() * 70 + vertical * 110, w: 14 + r() * 12, gota: 7 + r() * 9});
  }
  const motas: {d: P; r: number}[] = [];
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * (0.05 + 0.9 * r());
    const d = 150 + r() * 160;
    motas.push({d: [Math.cos(a) * d * 1.15, Math.sin(a) * d], r: 3 + r() * 7});
  }
  return {puntas, motas};
})();

export const salpicaduraGrafiti = (c: Ctx, t: number) => {
  if (t < T_SUELO) return;
  const s = t - T_SUELO;
  const k = s < 1 / 12 ? 0.55 : s < 2 / 12 ? 0.9 : 1;
  const o: P = [IMPACTO[0] + 4, SUELO - 4];
  const forma: P[] = [];
  const pasoA = Math.PI / 60;
  const r0 = 48 * k;
  // la mancha: un abanico hacia arriba con sus puntas
  for (let a = -Math.PI; a <= 0.001; a += pasoA) {
    let R = r0;
    for (const pt of SALPICA.puntas) {
      const d = Math.abs(a - pt.a);
      const ancho = pt.w / (pt.l * k);
      if (d < ancho * 1.4) R = Math.max(R, r0 + (pt.l * k) * Math.max(0, 1 - d / (ancho * 1.4)) ** 1.6);
    }
    forma.push([o[0] + Math.cos(a) * R * 1.25, o[1] + Math.sin(a) * R]);
  }
  forma.push([o[0] + r0 * 1.3, o[1] + 14], [o[0] - r0 * 1.3, o[1] + 14]);
  const caja: Caja = [o[0] - 330, o[1] - 330, o[0] + 330, o[1] + 120];
  // la niebla de detrás y la mancha con su borde negro
  niebla(c, caja, (b) => {
    camino(b, forma);
    b.fill();
    SALPICA.motas.forEach((m) => punto(b, o[0] + m.d[0] * k, o[1] + m.d[1] * k, m.r * 2.4, CAFE));
  }, CAFE, 14, 0.6, 8);
  c.save();
  c.lineJoin = 'round';
  c.filter = blur(0.8);
  c.lineWidth = 9;
  c.strokeStyle = C.negro;
  camino(c, forma);
  c.stroke();
  c.fillStyle = CAFE;
  c.fill();
  // las gotas sueltas de alrededor
  for (const m of SALPICA.motas) {
    const q: P = [o[0] + m.d[0] * k, o[1] + m.d[1] * k];
    punto(c, q[0], q[1], m.r + 3, C.negro);
    punto(c, q[0], q[1], m.r, CAFE);
  }
  // las gotas en la punta de cada brazo
  for (const pt of SALPICA.puntas) {
    const R = r0 + pt.l * k + pt.gota * 0.6;
    const q: P = [o[0] + Math.cos(pt.a) * R * 1.25, o[1] + Math.sin(pt.a) * R];
    punto(c, q[0], q[1], pt.gota + 3.5, C.negro);
    punto(c, q[0], q[1], pt.gota, CAFE);
  }
  // los goterones que bajan de los brazos: crecen con el tiempo
  const cae = clamp(s / 1.1);
  for (const [i, pt] of SALPICA.puntas.entries()) {
    if (i % 2 === 1) continue;
    const R = r0 + pt.l * k * 0.7;
    const q: P = [o[0] + Math.cos(pt.a) * R * 1.25, o[1] + Math.sin(pt.a) * R];
    const largo = Math.max(0, Math.min(SUELO + 40 - q[1], 30 + 160 * E.outCubic(cae)) * (0.5 + 0.5 * ((i * 37) % 10) / 10));
    goteron(c, q[0], q[1], largo + 5, 14, C.negro, 900 + i, false);
    goteron(c, q[0], q[1], largo, 9, CAFE, 800 + i, false);
  }
  // el brillo de la mancha
  c.fillStyle = CAFE_LUZ;
  c.beginPath();
  c.ellipse(o[0] - 40 * k, o[1] - 28 * k, 26 * k, 9 * k, -0.4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = CAFE_OSC;
  c.beginPath();
  c.ellipse(o[0] + 10, o[1] + 2, 60 * k, 12 * k, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
};

// ---------------------------------------------------------------- los trozos de la taza
export const trozosGrafiti = (c: Ctx, t: number) => {
  for (const tr of trozos(t)) {
    const pth = new Path2D(poli(tr.pts));
    const f: Forma = {rellena: (b) => b.fill(pth), traza: (b) => b.stroke(pth)};
    const caja = cajaDe(tr.pts, 30);
    pintaPieza(c, {
      caja, forma: f, linea: 5, corte: {color: C.blanco, ancho: 3.5}, semilla: tr.n,
      relleno: () => (tr.n === 6 ? C.fucsia : tr.n % 2 ? '#FF5AA6' : C.fucsia),
      sombra: {color: '#5E0A35', d: [-8, -7], alfa: 0.7, difumina: 2},
      luz: {d: [3, 3], ancho: 3.5},
    });
  }
};

// ---------------------------------------------------------------- «¡CRASH!»
type Lt = {ch: string; x: number; y: number; ang: number; esc: number};
const CRASH: Lt[] = [
  {ch: '¡', x: 0, y: 0, ang: -0.1, esc: 0.9},
  {ch: 'C', x: 44, y: 6, ang: -0.12, esc: 1.0},
  {ch: 'R', x: 140, y: -4, ang: -0.04, esc: 1.04},
  {ch: 'A', x: 236, y: 4, ang: 0.04, esc: 1.0},
  {ch: 'S', x: 334, y: -6, ang: 0.08, esc: 1.06},
  {ch: 'H', x: 424, y: 2, ang: 0.12, esc: 1.0},
  {ch: '!', x: 524, y: -2, ang: 0.16, esc: 0.95},
];
const TAM = 128;
let ARTE: {dpr: number; fuente: string; c: HTMLCanvasElement} | null = null;
const AW = 760, AH = 400, AX = 90, AY = 260; // el lienzo del letrero y dónde cae la línea de base
const arteCrash = (fuente: string) => {
  if (ARTE && ARTE.dpr === PINTA.dpr && ARTE.fuente === fuente) return ARTE.c;
  const cv = lienzo(AW, AH);
  const c = cv.getContext('2d') as Ctx;
  base(c);
  const lista = CRASH.map((l) => ({...l, x: l.x + AX, y: l.y + AY}));
  const f = letrasForma(fuente, lista, TAM);
  const caja: Caja = [0, 0, AW, AH];
  const conBloque: Forma = {
    rellena: (b) => { for (let i = 0; i <= 5; i++) { b.save(); b.translate(i * 3, i * 3); f.rellena(b); b.restore(); } },
    traza: (b) => { for (let i = 0; i <= 5; i++) { b.save(); b.translate(i * 3, i * 3); f.traza(b); b.restore(); } },
  };
  c.save();
  c.lineJoin = 'round';
  c.filter = blur(0.8);
  c.strokeStyle = C.negro;
  c.lineWidth = 40;
  conBloque.traza(c);
  c.strokeStyle = C.blanco;
  c.lineWidth = 30;
  conBloque.traza(c);
  c.restore();
  bloque(c, f, [15, 14], 5, '#0B8FB0', 7, caja);
  pintaPieza(c, {
    caja, forma: f, linea: 7,
    relleno: (q) => {
      const g = q.createLinearGradient(0, -TAM * 0.72, 0, 0); // en las medidas de cada letra
      g.addColorStop(0, '#FFF27A');
      g.addColorStop(0.5, C.amarillo);
      g.addColorStop(1, C.naranja);
      return g;
    },
    sombra: {color: '#E0420F', d: [-9, -10], alfa: 0.8, difumina: 4},
    luz: {d: [5, 5], ancho: 5},
    semilla: 17,
  });
  const r = rng(708);
  c.save();
  c.filter = blur(0.4);
  for (const x of [130, 260, 370, 470]) {
    goteron(c, AX + x, AY - 4, 30 + r() * 60, 12, C.negro, x + 1, false);
    goteron(c, AX + x, AY - 6, 26 + r() * 54, 7, C.naranja, x, true);
  }
  c.restore();
  destello(c, AX + 70, AY - 110, 20, C.blanco);
  destello(c, AX + 470, AY - 104, 16, C.blanco);
  ARTE = {dpr: PINTA.dpr, fuente, c: cv};
  return cv;
};

// la explosión de detrás: una estrella de puntas irregulares que «hierve» con cada paso
const explosion = (c: Ctx, o: P, R: number, paso: number) => {
  const r = rng(709 + (paso % 3));
  const pts: P[] = [];
  const n = 18;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const k = i % 2 ? 0.62 + r() * 0.1 : 0.95 + r() * 0.25;
    pts.push([o[0] + Math.cos(a) * R * 1.55 * k, o[1] + Math.sin(a) * R * 0.78 * k]);
  }
  c.save();
  c.lineJoin = 'round';
  c.filter = blur(0.8);
  c.lineWidth = 16;
  c.strokeStyle = C.negro;
  camino(c, pts);
  c.stroke();
  c.fillStyle = C.blanco;
  c.fill();
  c.restore();
  enCapa(c, [o[0] - R * 2, o[1] - R, o[0] + R * 2, o[1] + R], (b) => {
    camino(b, pts.map(([x, y]) => [mix(o[0], x, 0.84), mix(o[1], y, 0.84)] as P));
    const g = b.createRadialGradient(o[0], o[1], 10, o[0], o[1], R * 1.4);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.3, '#FFF27A');
    g.addColorStop(1, C.fucsia);
    b.fillStyle = g;
    b.filter = blur(2);
    b.fill();
  });
};

export const CRASH_C: P = [560, 1286];
const ESC_CRASH = 0.86;
export const crashGrafiti = (c: Ctx, t: number, fuente: string) => {
  if (t < T_SUELO) return;
  const s = t - T_SUELO;
  const paso = Math.round(s * 12);
  // entra de golpe: pequeño, se pasa y se queda (a pasos)
  const k = paso === 0 ? 0.78 : paso === 1 ? 1.12 : paso === 2 ? 0.97 : 1;
  const ang = -0.09 + (paso < 3 ? (paso % 2 ? 0.03 : -0.02) : 0);
  const o = CRASH_C;
  c.save();
  c.translate(o[0], o[1]);
  c.rotate(ang);
  c.scale(k * ESC_CRASH, k * ESC_CRASH);
  c.translate(-o[0], -o[1]);
  explosion(c, o, 175, paso);
  const arte = arteCrash(fuente);
  // el letrero: la línea de base, centrada en la explosión
  const x0 = o[0] - (AX + 300), y0 = o[1] - (AY - 48);
  c.drawImage(arte, x0, y0, AW, AH);
  c.restore();
};

// ---------------------------------------------------------------- lo que queda del cuadro anterior, a medio tapar
// En las animaciones pintadas en una pared, cada cuadro se pinta encima del anterior: se tapa con gris y blanco, y siempre queda
// algo. Aquí, los dos cuadros de antes: su contorno flojo y encima la mancha de tapar.
export const restos = (c: Ctx, formas: {f: Forma; caja: Caja; edad: number}[]) => {
  for (const {f, caja, edad} of formas) {
    const fuerza = edad === 1 ? 1.35 : 0.7;
    enCapa(c, caja, (b) => {
      b.lineJoin = 'round';
      b.strokeStyle = C.negro;
      b.lineWidth = 12;
      b.filter = blur(1.2);
      f.traza(b);
      b.fillStyle = 'rgba(255,138,26,0.5)';
      f.rellena(b);
      // la pintura de tapar, que no llega a todo
      b.globalCompositeOperation = 'source-atop';
      b.filter = blur(8);
      b.fillStyle = 'rgba(214,208,196,0.82)';
      f.rellena(b);
    }, {alfa: 0.42 * fuerza});
    niebla(c, caja, (b) => {
      b.lineWidth = 30;
      f.traza(b);
    }, '#E8E2D6', 10, 0.3 * fuerza, 60 + edad);
  }
};
