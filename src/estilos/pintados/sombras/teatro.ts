import {E, clamp, mix, rng, ruido} from '../../../comun/curvas';
import {T_CAE, T_SUELO, type P} from '../../gato/escena';
import {H, PANT, W, ctx, lerp, lienzo, poligono, type Ctx} from './lienzos';
import type {Luz} from './luz';

// EL TEATRILLO Y EL PÚBLICO: lo que no es la pantalla. El marco de madera oscura con su moldura dorada, el
// copete con el sol tallado, el bambalinón rojo de ondas con flecos y borlas, las dos cortinas de terciopelo recogidas con su cordón
// y el frente del escenario. No hay más luz en la sala que la de la pantalla: el marco está a oscuras y solo se encienden los cantos
// que la miran (la moldura, el borde de las cortinas, el bajo del bambalinón y el labio del escenario), con la llama. Se pinta una
// vez en dos lienzos: OSCURO (todo, apagado) y LUZ (solo lo que enciende la pantalla, que se suma con su brillo de cada cuadro).
// Delante de todo, desenfocadas y recortadas contra la pantalla, las cabezas de dos niños mirando (la de las coletas y el del remolino),
// con su borde encendido, que se mueven un poco y dan un respingo con el golpe; y el polvo que flota en la luz.

let MARCO: {oscuro: HTMLCanvasElement; luz: HTMLCanvasElement} | null = null;

const ORO = '#c8902e';
const ORO_OSC = '#6e4512';

// los bordes de dentro de las cortinas, de arriba abajo [x, y]
const CORTINA_IZQ: P[] = [[184, 196], [178, 300], [156, 420], [116, 560], [78, 700], [58, 800], [72, 900], [96, 1060], [110, 1250], [114, 1450], [106, 1668]];
const CORTINA_DER: P[] = [[928, 196], [934, 300], [950, 420], [976, 560], [1002, 700], [1020, 800], [1008, 900], [990, 1060], [978, 1250], [974, 1450], [980, 1668]];
const LAZO_Y = 800;

const hueco = (x: Ctx) => {
  const p = new Path2D();
  p.rect(-10, -10, W + 20, H + 20);
  p.rect(PANT.x0, PANT.y0, PANT.x1 - PANT.x0, PANT.y1 - PANT.y0);
  return p;
};

// las vetas de la madera, en un rectángulo
const vetas = (x: Ctx, x0: number, y0: number, w: number, h: number, vertical: boolean, semilla: number) => {
  const r = rng(semilla);
  x.save();
  x.beginPath();
  x.rect(x0, y0, w, h);
  x.clip();
  x.lineCap = 'round';
  const n = Math.round((vertical ? w : h) / 4);
  for (let i = 0; i < n; i++) {
    const o = (vertical ? x0 : y0) + r() * (vertical ? w : h);
    x.strokeStyle = r() < 0.5 ? `rgba(92,52,24,${0.2 + r() * 0.3})` : `rgba(8,3,1,${0.2 + r() * 0.35})`;
    x.lineWidth = 0.8 + r() * 2.2;
    x.beginPath();
    const fase = r() * 10, amp = 1 + r() * 4;
    const L = vertical ? h : w;
    for (let s = 0; s <= L; s += 24) {
      const d = amp * Math.sin(s * 0.01 + fase) + amp * 0.5 * Math.sin(s * 0.037 + fase * 2);
      const px = vertical ? o + d : x0 + s, py = vertical ? y0 + s : o + d;
      if (s) x.lineTo(px, py); else x.moveTo(px, py);
    }
    x.stroke();
  }
  x.restore();
};

const cortina = (x: Ctx, borde: P[], izq: boolean, luz: boolean) => {
  const fuera = izq ? -10 : W + 10;
  const forma: P[] = [[fuera, borde[0][1]], ...borde, [fuera, PANT.y1 + 4]];
  x.save();
  poligono(x, forma);
  x.clip();
  if (!luz) {
    x.fillStyle = '#4a070a';
    x.fillRect(0, 0, W, H);
    // los pliegues: bandas que van del borde de fuera al de dentro y se juntan en el lazo
    const N = 7;
    for (let k = 0; k < N; k++) {
      const f0 = (k + 0.15) / N, f1 = (k + 0.62) / N;
      const banda: P[] = [];
      for (const q of borde) banda.push([mix(fuera, q[0], f0), q[1]]);
      for (const q of [...borde].reverse()) banda.push([mix(fuera, q[0], f1), q[1]]);
      x.save();
      x.filter = 'blur(7px)';
      x.fillStyle = k % 2 ? 'rgba(150,20,24,0.55)' : 'rgba(110,12,18,0.5)';
      poligono(x, banda);
      x.fill();
      x.restore();
    }
    for (let k = 0; k < N; k++) {
      const f = (k + 0.95) / N;
      x.save();
      x.filter = 'blur(4px)';
      x.strokeStyle = 'rgba(20,0,2,0.55)';
      x.lineWidth = 5;
      x.beginPath();
      borde.forEach((q, i) => (i ? x.lineTo(mix(fuera, q[0], f), q[1]) : x.moveTo(mix(fuera, q[0], f), q[1])));
      x.stroke();
      x.restore();
    }
    // lo de fuera, más a oscuras
    const g = x.createLinearGradient(izq ? 0 : W, 0, izq ? 160 : W - 160, 0);
    g.addColorStop(0, 'rgba(10,0,0,0.55)');
    g.addColorStop(1, 'rgba(10,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  } else {
    // el canto que mira a la pantalla se enciende: rojo naranja, como terciopelo a contraluz
    x.filter = 'blur(12px)';
    x.strokeStyle = 'rgba(255,92,40,0.85)';
    x.lineWidth = 34;
    x.beginPath();
    borde.forEach((q, i) => (i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])));
    x.stroke();
    x.filter = 'blur(3px)';
    x.strokeStyle = 'rgba(255,170,110,0.7)';
    x.lineWidth = 6;
    x.stroke();
  }
  x.restore();
  if (!luz) {
    // el cordón dorado del lazo y su borla
    const q = borde.find((b) => b[1] === LAZO_Y)!;
    const x0 = izq ? 0 : q[0] - 6, x1 = izq ? q[0] + 6 : W;
    x.save();
    x.fillStyle = ORO_OSC;
    x.beginPath();
    x.ellipse((x0 + x1) / 2, LAZO_Y, (x1 - x0) / 2 + 4, 13, izq ? 0.12 : -0.12, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = ORO;
    x.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      x.beginPath();
      x.ellipse((x0 + x1) / 2, LAZO_Y + i * 7, (x1 - x0) / 2 + 2, 4, izq ? 0.12 : -0.12, 0, Math.PI * 2);
      x.stroke();
    }
    const bx = izq ? q[0] - 6 : q[0] + 6;
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(bx, LAZO_Y + 8);
    x.lineTo(bx, LAZO_Y + 40);
    x.stroke();
    x.fillStyle = ORO;
    poligono(x, [[bx - 9, LAZO_Y + 40], [bx + 9, LAZO_Y + 40], [bx + 13, LAZO_Y + 96], [bx - 13, LAZO_Y + 96]]);
    x.fill();
    x.restore();
  }
};

// el bambalinón: ondas que cuelgan, con su galón, sus flecos y una borla en cada unión
const ONDAS = 7;
const BAMB_X0 = 30, BAMB_X1 = 1050, BAMB_Y0 = 188;
const bajoOnda = (k: number): P[] => {
  const w = (BAMB_X1 - BAMB_X0) / ONDAS;
  const pts: P[] = [];
  for (let s = 0; s <= 12; s++) {
    const u = s / 12;
    pts.push([BAMB_X0 + w * (k + u), 282 + 38 * Math.sin(Math.PI * u)]);
  }
  return pts;
};
const bambalinon = (x: Ctx, luz: boolean) => {
  const forma: P[] = [[BAMB_X0, BAMB_Y0]];
  for (let k = 0; k < ONDAS; k++) forma.push(...bajoOnda(k));
  forma.push([BAMB_X1, BAMB_Y0]);
  x.save();
  if (!luz) {
    poligono(x, forma);
    const g = x.createLinearGradient(0, BAMB_Y0, 0, 322);
    g.addColorStop(0, '#2a0306');
    g.addColorStop(1, '#6a0b10');
    x.fillStyle = g;
    x.fill();
    x.save();
    x.clip();
    // los fruncidos de cada onda
    for (let k = 0; k < ONDAS; k++) {
      const w = (BAMB_X1 - BAMB_X0) / ONDAS;
      for (let j = 1; j < 5; j++) {
        const xx = BAMB_X0 + w * (k + j / 5);
        x.filter = 'blur(3px)';
        x.strokeStyle = 'rgba(15,0,2,0.5)';
        x.lineWidth = 4;
        x.beginPath();
        x.moveTo(xx, BAMB_Y0);
        x.quadraticCurveTo(xx + (j - 2.5) * 4, 250, xx + (j - 2.5) * 8, 330);
        x.stroke();
      }
    }
    x.restore();
    // el galón dorado y los flecos
    x.filter = 'none';
    for (let k = 0; k < ONDAS; k++) {
      const b = bajoOnda(k);
      x.strokeStyle = ORO;
      x.lineWidth = 5;
      x.beginPath();
      b.forEach((q, i) => (i ? x.lineTo(q[0], q[1] - 12) : x.moveTo(q[0], q[1] - 12)));
      x.stroke();
      x.strokeStyle = ORO_OSC;
      x.lineWidth = 2;
      for (let s = 0; s < b.length - 1; s++) {
        for (const u of [0, 0.33, 0.66]) {
          const q = lerp(b[s], b[s + 1], u);
          x.beginPath();
          x.moveTo(q[0], q[1] - 2);
          x.lineTo(q[0], q[1] + 11);
          x.stroke();
        }
      }
    }
    // las borlas de las uniones
    for (let k = 0; k <= ONDAS; k++) {
      const bx = BAMB_X0 + ((BAMB_X1 - BAMB_X0) * k) / ONDAS;
      x.fillStyle = ORO;
      x.beginPath();
      x.arc(bx, 286, 7, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = ORO_OSC;
      poligono(x, [[bx - 6, 292], [bx + 6, 292], [bx + 9, 330], [bx - 9, 330]]);
      x.fill();
    }
  } else {
    // el bajo de las ondas, a contraluz
    x.beginPath();
    poligono(x, forma);
    x.clip();
    x.filter = 'blur(9px)';
    x.strokeStyle = 'rgba(255,100,46,0.75)';
    x.lineWidth = 26;
    x.beginPath();
    for (let k = 0; k < ONDAS; k++) bajoOnda(k).forEach((q, i) => (i || k ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])));
    x.stroke();
  }
  x.restore();
};

// el copete: la moldura y el sol tallado en el centro, con sus volutas
const copete = (x: Ctx) => {
  x.save();
  x.strokeStyle = ORO;
  x.lineWidth = 5;
  x.beginPath();
  x.roundRect(36, 22, W - 72, 160, 18);
  x.stroke();
  x.strokeStyle = ORO_OSC;
  x.lineWidth = 2;
  x.beginPath();
  x.roundRect(48, 34, W - 96, 136, 12);
  x.stroke();
  // el sol
  const c: P = [540, 104];
  x.fillStyle = '#24110a';
  x.beginPath();
  x.arc(c[0], c[1], 66, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = ORO;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const l = i % 2 ? 54 : 62;
    poligono(x, [
      [c[0] + Math.cos(a - 0.1) * 32, c[1] + Math.sin(a - 0.1) * 32], [c[0] + Math.cos(a) * l, c[1] + Math.sin(a) * l],
      [c[0] + Math.cos(a + 0.1) * 32, c[1] + Math.sin(a + 0.1) * 32],
    ]);
    x.fill();
  }
  x.beginPath();
  x.arc(c[0], c[1], 28, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#5a3410';
  x.beginPath();
  x.arc(c[0], c[1], 21, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = ORO;
  x.lineWidth = 4;
  x.beginPath();
  x.arc(c[0], c[1], 66, 0, Math.PI * 2);
  x.stroke();
  // las volutas, a cada lado
  for (const lado of [-1, 1]) {
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(c[0] + lado * 80, c[1] + 10);
    x.bezierCurveTo(c[0] + lado * 150, c[1] - 50, c[0] + lado * 240, c[1] + 40, c[0] + lado * 320, c[1] - 6);
    x.bezierCurveTo(c[0] + lado * 370, c[1] - 30, c[0] + lado * 400, c[1] + 10, c[0] + lado * 380, c[1] + 24);
    x.stroke();
    x.beginPath();
    x.arc(c[0] + lado * 372, c[1] + 6, 12, 0, Math.PI * 2);
    x.stroke();
    x.beginPath();
    x.arc(c[0] + lado * 196, c[1] + 6, 7, 0, Math.PI * 2);
    x.fill();
  }
  x.restore();
};

// el frente del escenario: el labio dorado, un panel con su moldura y un adorno en medio
const frente = (x: Ctx) => {
  x.save();
  x.fillStyle = ORO_OSC;
  x.fillRect(0, PANT.y1, W, 22);
  x.fillStyle = ORO;
  x.fillRect(0, PANT.y1 + 2, W, 5);
  x.strokeStyle = ORO;
  x.lineWidth = 4;
  x.beginPath();
  x.roundRect(86, 1722, W - 172, 168, 14);
  x.stroke();
  x.lineWidth = 2;
  x.strokeStyle = ORO_OSC;
  x.beginPath();
  x.roundRect(98, 1734, W - 196, 144, 10);
  x.stroke();
  const c: P = [540, 1806];
  x.fillStyle = ORO;
  poligono(x, [[c[0], c[1] - 34], [c[0] + 22, c[1]], [c[0], c[1] + 34], [c[0] - 22, c[1]]]);
  x.fill();
  x.strokeStyle = ORO;
  x.lineWidth = 4;
  for (const lado of [-1, 1]) {
    x.beginPath();
    x.moveTo(c[0] + lado * 32, c[1]);
    x.bezierCurveTo(c[0] + lado * 90, c[1] - 40, c[0] + lado * 150, c[1] + 40, c[0] + lado * 210, c[1]);
    x.stroke();
  }
  x.restore();
};

export const marco = () => {
  if (MARCO) return MARCO;
  const oscuro = lienzo(), luz = lienzo();
  const o = ctx(oscuro), l = ctx(luz);

  // 1 · la madera: todo menos el hueco de la pantalla, con sus vetas
  o.save();
  o.clip(hueco(o), 'evenodd');
  o.fillStyle = '#2e170b';
  o.fillRect(0, 0, W, H);
  vetas(o, 0, 0, W, PANT.y0, false, 401);
  vetas(o, 0, PANT.y1, W, H - PANT.y1, false, 402);
  vetas(o, 0, PANT.y0, PANT.x0, PANT.y1 - PANT.y0, true, 403);
  vetas(o, PANT.x1, PANT.y0, W - PANT.x1, PANT.y1 - PANT.y0, true, 404);
  // la moldura dorada alrededor del hueco
  o.strokeStyle = ORO_OSC;
  o.lineWidth = 14;
  o.strokeRect(PANT.x0 - 7, PANT.y0 - 7, PANT.x1 - PANT.x0 + 14, PANT.y1 - PANT.y0 + 14);
  o.restore();
  copete(o);
  frente(o);
  cortina(o, CORTINA_IZQ, true, false);
  cortina(o, CORTINA_DER, false, false);
  bambalinon(o, false);

  // 2 · lo que enciende la pantalla
  l.save();
  l.clip(hueco(l), 'evenodd');
  l.filter = 'blur(20px)';
  l.strokeStyle = 'rgba(255,150,64,0.6)';
  l.lineWidth = 70;
  l.strokeRect(PANT.x0, PANT.y0, PANT.x1 - PANT.x0, PANT.y1 - PANT.y0);
  l.filter = 'none';
  l.strokeStyle = 'rgba(255,214,130,0.85)';
  l.lineWidth = 4;
  l.strokeRect(PANT.x0 - 3, PANT.y0 - 3, PANT.x1 - PANT.x0 + 6, PANT.y1 - PANT.y0 + 6);
  // el labio del escenario, de lleno
  const g = l.createLinearGradient(0, PANT.y1, 0, PANT.y1 + 80);
  g.addColorStop(0, 'rgba(255,184,96,0.85)');
  g.addColorStop(0.25, 'rgba(255,140,60,0.35)');
  g.addColorStop(1, 'rgba(255,120,50,0)');
  l.fillStyle = g;
  l.fillRect(0, PANT.y1, W, 80);
  l.restore();
  cortina(l, CORTINA_IZQ, true, true);
  cortina(l, CORTINA_DER, false, true);
  bambalinon(l, true);

  MARCO = {oscuro, luz};
  return MARCO;
};

// ---------------------------------------------------------------- el público: dos cabezas desenfocadas
type Cabeza = {c: P; rx: number; ry: number; extra: (x: Ctx, d: P) => void};
const pulso = (t: number, t0: number, sube: number, baja: number) =>
  t < t0 ? 0 : t < t0 + sube ? E.outCubic((t - t0) / sube) : 1 - E.inOutCubic(clamp((t - t0 - sube) / baja));

const NINA: Cabeza = {
  c: [232, 1708], rx: 116, ry: 128,
  extra: (x, [dx, dy]) => {
    // las dos coletas que salen a los lados (con su gomita) y los hombros
    for (const lado of [-1, 1]) {
      x.beginPath();
      x.ellipse(232 + lado * 160 + dx, 1700 + dy, 62, 26, lado * 0.42, 0, Math.PI * 2);
      x.fill();
      x.beginPath();
      x.arc(232 + lado * 112 + dx, 1680 + dy, 20, 0, Math.PI * 2);
      x.fill();
    }
    x.beginPath();
    x.ellipse(232 + dx * 0.5, 1970 + dy * 0.3, 270, 170, 0, 0, Math.PI * 2);
    x.fill();
  },
};
const NINO: Cabeza = {
  c: [516, 1768], rx: 106, ry: 116,
  extra: (x, [dx, dy]) => {
    // el remolino de pelo, las orejas y los hombros
    poligono(x, [[458, 1690], [470, 1632], [496, 1670], [508, 1614], [528, 1668], [556, 1630], [566, 1692]].map(([a, b]) => [a + dx, b + dy] as P));
    x.fill();
    for (const cx of [408, 624]) {
      x.beginPath();
      x.ellipse(cx + dx, 1780 + dy, 20, 28, 0, 0, Math.PI * 2);
      x.fill();
    }
    x.beginPath();
    x.ellipse(516 + dx * 0.5, 2010 + dy * 0.3, 240, 150, 0, 0, Math.PI * 2);
    x.fill();
  },
};

export const publico = (x: Ctx, t: number, l: Luz) => {
  // la niña se mece y se inclina hacia delante mientras cae la taza; el niño da un respingo con el golpe
  const susto = pulso(t, T_SUELO, 0.07, 0.5);
  const mira = clamp((t - T_CAE + 0.2) / 0.4) * (1 - clamp((t - T_SUELO - 0.4) / 0.8));
  const dNina: P = [5 * Math.sin(t * 1.2) + 10 * mira, 3 * Math.sin(t * 1.9 + 1) - 14 * mira - 10 * susto];
  const dNino: P = [4 * Math.sin(t * 1.05 + 2) + 10 * susto, 3 * Math.sin(t * 1.6) - 30 * susto];
  const borde = clamp(0.75 + 0.25 * l.k, 0, 1.4);
  for (const [cab, d] of [[NINA, dNina], [NINO, dNino]] as [Cabeza, P][]) {
    const forma = (xx: Ctx, off: P) => {
      xx.beginPath();
      xx.ellipse(cab.c[0] + d[0] + off[0], cab.c[1] + d[1] + off[1], cab.rx, cab.ry, 0, 0, Math.PI * 2);
      xx.fill();
      cab.extra(xx, [d[0] + off[0], d[1] + off[1]]);
    };
    x.save();
    // el borde encendido por la pantalla (de arriba), y la cabeza en negro encima, un poco más abajo
    x.filter = 'blur(10px)';
    x.fillStyle = `rgba(255,128,52,${(0.8 * Math.min(1, borde)).toFixed(3)})`;
    forma(x, [0, 0]);
    x.fillStyle = 'rgb(8,3,2)';
    forma(x, [0, 9]);
    x.restore();
  }
};

// ---------------------------------------------------------------- el polvo que flota en la luz, delante de la pantalla
const MOTAS = (() => {
  const r = rng(77);
  return Array.from({length: 54}, (_, i) => ({
    x: PANT.x0 + 40 + r() * (PANT.x1 - PANT.x0 - 80), y: PANT.y0 + 60 + r() * (PANT.y1 - PANT.y0 - 120),
    v: 10 + r() * 22, rad: i < 8 ? 6 + r() * 7 : 1.1 + r() * 2.2, f: r() * 10, gorda: i < 8,
  }));
})();
export const polvo = (x: Ctx, t: number, l: Luz) => {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const alto = PANT.y1 - PANT.y0 - 120;
  for (const m of MOTAS) {
    const y = PANT.y0 + 60 + ((((m.y - PANT.y0 - 60 - m.v * t) % alto) + alto) % alto);
    const xx = m.x + 26 * ruido(t * 0.25 + m.f, 90) + 8 * Math.sin(t * 0.9 + m.f);
    const d = Math.hypot(xx - l.c[0], y - l.c[1]);
    const f = clamp(1 - d / 820) * l.k;
    const brilla = 0.6 + 0.4 * Math.sin(t * 2.3 + m.f * 3);
    x.filter = m.gorda ? 'blur(3px)' : 'none';
    x.fillStyle = `rgba(255,226,170,${((m.gorda ? 0.1 : 0.55) * f * brilla).toFixed(3)})`;
    x.beginPath();
    x.arc(xx, y, m.rad, 0, Math.PI * 2);
    x.fill();
  }
  x.restore();
};

// ---------------------------------------------------------------- una varilla: nítida donde se agarra, cada vez más blanda hacia abajo
export const varilla = (x: Ctx, a: P, b: P, alfa = 1) => {
  x.save();
  x.strokeStyle = '#000';
  x.lineCap = 'butt';
  const N = 8;
  for (let i = 0; i < N; i++) {
    const s0 = i / N, s1 = (i + 1) / N, sm = (s0 + s1) / 2;
    const p0 = lerp(a, b, Math.max(0, s0 - 0.004)), p1 = lerp(a, b, s1);
    x.filter = `blur(${(0.3 + 7 * sm * sm + 2 * sm).toFixed(2)}px)`;
    x.globalAlpha = alfa * (0.95 - 0.5 * sm);
    x.lineWidth = 3.2 + 6 * sm;
    x.beginPath();
    x.moveTo(p0[0], p0[1]);
    x.lineTo(p1[0], p1[1]);
    x.stroke();
  }
  x.filter = 'none';
  x.globalAlpha = alfa;
  x.fillStyle = '#000';
  x.beginPath();
  x.arc(a[0], a[1], 5, 0, Math.PI * 2);
  x.fill();
  x.restore();
};
