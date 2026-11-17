import {E, clamp, mix, rng} from '../../../comun/curvas';
import {IMPACTO, SUELO, T_SUELO, cafe, rot, suma, trozos, vapor, type P, type Taza} from '../../gato/escena';
import {
  CAOLIN, CARBON, OCRE_MARRON, OCRE_ROJO, OCRE_ROJO_OSCURO, type Ctx, cajaDe, camino, fino, nube, remuestrea, soplar, suave, trazoVivo,
} from './pigmento';
import {perlin} from './roca';

// LA VASIJA DE BARRO Y EL CAFÉ. La taza de la escena hecha vasija: panza redonda, cuello corto, labio y un
// asa de lado; de ocre rojo oscuro (el barro), con su contorno de carbón y una cenefa de puntos de caolín y un zigzag. Al caer deja
// rastro (la vasija repetida en los pasos de antes, cada vez más floja). El café es ocre marrón soplado: las gotas en arco, las
// manchas que deja, el charco, y al romperse una salpicadura que se queda pegada a la roca, con sus rayas de carbón alrededor
// (el golpe) y los trozos de la vasija hechos trazos de carbón. El vapor, hilos finos de carbón que ondulan.

// la vasija en coordenadas de la taza (centro en 0, y hacia abajo; la taza mide 104 × 118)
const PERFIL: P[] = [
  [-33, -59], [-27, -51], [-25, -44], [-36, -34], [-50, -18], [-56, 4], [-50, 30], [-36, 48], [-24, 58],
  [24, 58], [36, 48], [50, 30], [56, 4], [50, -18], [36, -34], [25, -44], [27, -51], [33, -59],
];
const ASA: P[] = [[44, -26], [62, -30], [80, -20], [84, 0], [74, 16], [56, 18]];
const enTaza = (tz: {c: P; ang: number}, q: P): P => suma(tz.c, rot(q, tz.ang));

const formaVasija = (tz: {c: P; ang: number}) => camino(suave(PERFIL.map((q) => enTaza(tz, q)), true, 5));
const asaVasija = (tz: {c: P; ang: number}) => suave(ASA.map((q) => enTaza(tz, q)), false, 5);

export const pintarVasija = (c: Ctx, tz: Taza, fuerza = 1, rastro = false) => {
  const cuerpo = suave(PERFIL.map((q) => enTaza(tz, q)), true, 5);
  const asa = asaVasija(tz);
  const caja = cajaDe([...cuerpo, ...asa], 30);
  // el barro, soplado
  soplar(c, caja, (x) => {
    x.fillStyle = OCRE_ROJO;
    x.fill(formaVasija(tz));
    if (!rastro) {
      // el fondo de la panza, más oscuro
      const l = enTaza(tz, [6, 34]);
      nube(x, l[0], l[1], 38, OCRE_ROJO_OSCURO, 3, 3, 0.9);
    }
  }, rastro ? 5 : 3, rastro ? fuerza * 0.5 : 1);
  // el contorno, el asa y la decoración, a carbón y caolín
  fino(c, caja, (x) => {
    x.strokeStyle = CARBON;
    trazoVivo(x, remuestrea(cuerpo, 5), (u) => (rastro ? 7 : 10) * (0.8 + 0.35 * (0.5 + 0.5 * perlin(u * 8, 3))));
    trazoVivo(x, remuestrea(asa, 4), () => (rastro ? 6 : 9.5));
    if (rastro) return;
    // la boca: una raya clara en el labio
    x.strokeStyle = CAOLIN;
    trazoVivo(x, [enTaza(tz, [-26, -55]), enTaza(tz, [26, -55])], () => 5);
    // el zigzag de la panza
    x.strokeStyle = CARBON;
    const zz: P[] = Array.from({length: 9}, (_, i) => enTaza(tz, [-44 + i * 11, i % 2 ? 2 : -10]));
    trazoVivo(x, remuestrea(zz, 4), () => 4.5);
    // la cenefa de puntos de caolín en el hombro
    x.fillStyle = CAOLIN;
    for (let i = 0; i < 5; i++) {
      const q = enTaza(tz, [-30 + i * 15, -28]);
      x.beginPath();
      x.arc(q[0], q[1], 4.2, 0, Math.PI * 2);
      x.fill();
    }
  }, rastro ? 1.6 : 1.2, fuerza);
};

// ---------------------------------------------------------------- el café: gotas, manchas y el charco
export const pintarCafe = (c: Ctx, t: number) => {
  const cf = cafe(t);
  if (!cf.gotas.length && !cf.manchas.length && !cf.charco) return;
  const pts: P[] = [...cf.gotas.map((g) => g.c), ...cf.manchas.map((m) => m.c)];
  if (cf.charco) pts.push(cf.charco.c);
  soplar(c, cajaDe(pts, 200), (x) => {
    x.fillStyle = OCRE_MARRON;
    for (const g of cf.gotas) {
      x.beginPath();
      x.arc(g.c[0], g.c[1], g.r * 1.25, 0, Math.PI * 2);
      x.fill();
    }
    for (const m of cf.manchas) {
      x.beginPath();
      x.ellipse(m.c[0], m.c[1], m.rx * 1.1, m.ry * 1.4, 0, 0, Math.PI * 2);
      x.fill();
    }
    if (cf.charco) {
      x.beginPath();
      x.ellipse(cf.charco.c[0], cf.charco.c[1] + 4, cf.charco.rx, cf.charco.ry * 1.6, 0, 0, Math.PI * 2);
      x.fill();
    }
  }, 3.5);
};

// ---------------------------------------------------------------- la salpicadura que se pega a la roca (al romperse)
type Gota = {a: number; d: number; r: number; v: number; alarga: number};
const SALPICA: Gota[] = (() => {
  const r = rng(303);
  return Array.from({length: 78}, (_, i) => {
    // un abanico hacia arriba y a los lados (el café salta contra la pared)
    const lado = i % 2 ? 1 : -1;
    const a = -Math.PI / 2 + lado * (0.1 + r() * 1.42);
    const d = 70 + 400 * r() ** 0.8;
    return {a, d, r: mix(21, 5, d / 470) * (0.7 + r() * 0.6), v: 2100 + r() * 1500, alarga: 1.4 + r() * 1.9};
  });
})();
export const pintarSalpicadura = (c: Ctx, t: number) => {
  if (t < T_SUELO) return;
  const s = t - T_SUELO;
  const [ix, iy] = [IMPACTO[0], SUELO - 6];
  const k = E.outCubic(clamp(s / 0.1));
  // la mancha grande del golpe, ancha y pegada al suelo
  soplar(c, [ix - 260, iy - 200, ix + 260, iy + 60], (x) => {
    nube(x, ix, iy - 26, 34 + 96 * k, OCRE_MARRON, 404, 9, 1);
    x.fillStyle = OCRE_MARRON;
    x.beginPath();
    x.ellipse(ix, iy - 4, 40 + 140 * k, 16 + 22 * k, 0, 0, Math.PI * 2);
    x.fill();
  }, 6);
  // las gotas: vuelan hasta su sitio y se quedan pegadas a la roca, alargadas hacia donde iban
  fino(c, [ix - 500, iy - 500, ix + 500, iy + 40], (x) => {
    x.fillStyle = OCRE_MARRON;
    for (const g of SALPICA) {
      const vuela = clamp((s * g.v) / g.d);
      const d = g.d * E.outCubic(vuela);
      const px = ix + Math.cos(g.a) * d, py = iy - 26 + Math.sin(g.a) * d;
      x.save();
      x.translate(px, py);
      x.rotate(g.a);
      x.beginPath();
      x.ellipse(-g.r * (g.alarga - 1) * 0.6, 0, g.r * g.alarga, g.r * 0.75, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
  }, 2.2);
};

// las rayas de carbón del golpe (las de las cuevas): salen de golpe alrededor y se van en unos pocos pasos
export const pintarGolpe = (c: Ctx, t: number) => {
  const s = t - T_SUELO;
  if (s < 0 || s > 0.42) return;
  const k = s / 0.42;
  const [ix, iy] = [IMPACTO[0], SUELO - 40];
  const lineas: P[][] = [];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * (0.05 + 0.9 * (i / 8)) + 0.08 * Math.sin(i * 3.1);
    const r0 = mix(110, 170, k) + (i % 2) * 18, r1 = r0 + mix(70, 30, k);
    lineas.push([[ix + Math.cos(a) * r0, iy + Math.sin(a) * r0 * 0.9], [ix + Math.cos(a) * r1, iy + Math.sin(a) * r1 * 0.9]]);
  }
  fino(c, cajaDe(lineas.flat(), 20), (x) => {
    x.strokeStyle = CARBON;
    lineas.forEach((l) => trazoVivo(x, remuestrea(l, 4), (u) => 13 * (1 - 0.6 * u)));
  }, 1.4, 1 - k * 0.5);
};

// ---------------------------------------------------------------- los trozos: trazos de carbón con su barro
export const pintarTrozos = (c: Ctx, t: number) => {
  const tr = trozos(t);
  if (!tr.length) return;
  const caja = cajaDe(tr.flatMap((q) => q.pts), 30);
  soplar(c, caja, (x) => {
    x.fillStyle = OCRE_ROJO;
    for (const q of tr) x.fill(camino(q.pts));
  }, 2.5);
  fino(c, caja, (x) => {
    x.strokeStyle = CARBON;
    for (const q of tr) {
      const pts = [...q.pts, q.pts[0]];
      trazoVivo(x, remuestrea(pts, 4), (u) => 7.5 * (0.75 + 0.4 * (0.5 + 0.5 * perlin(u * 6 + q.n, 2))));
    }
  }, 1.2);
};

// ---------------------------------------------------------------- el vapor: hilos finos de carbón
export const pintarVapor = (c: Ctx, t: number) => {
  const hs = vapor(t);
  if (!hs.length) return;
  const caja = cajaDe(hs.flatMap((h) => h.pts), 30);
  hs.forEach((h) => {
    if (h.alfa < 0.04) return;
    fino(c, caja, (x) => {
      x.strokeStyle = CARBON;
      trazoVivo(x, remuestrea(h.pts, 5), (u) => 7.5 * (1 - 0.6 * u) * Math.min(1, u * 6 + 0.2));
    }, 1.8, Math.min(1, h.alfa * 0.8));
  });
};

export {formaVasija};
