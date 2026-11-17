import React from 'react';
import * as THREE from 'three';
import {E, clamp, mix, p, rng} from '../../../comun/curvas';
import {IMPACTO, MESA_Y, SUELO, T_CAE, T_SUELO, cafe, taza, trozos, type P} from '../../gato/escena';
import {Capa, Capsula, Contacto, type V3, geoAro, geoEsfera, geoFigura, geoTorno, orienta, zSuelo} from './comun';
import {liso} from './materiales';

// PELÍCULA ANIMADA, LA TAZA: una taza de cerámica roja esmaltada, brillante como un caramelo, con el borde blanco y
// el café dentro con su espuma. Cae girando (también sobre su eje: el asa viene hacia ti) y al golpear el suelo se aplasta un
// instante, salta en seis trozos que suben girando, rebotan dos veces y se quedan tumbados con su sombra; migas de esmalte y el café,
// que sale en un chorro liso y brillante, salpica en corona y se extiende en un charco que brilla. Todo sale de escena.ts.

export const COL_TAZA = {taza: '#E0262C', borde: '#FFF4EA', dentro: '#FFF1E3', cafe: '#4A1F0B', crema: '#B9773F'};

const mats = () => ({
  taza: liso(COL_TAZA.taza, {rough: 0.2, capa: 1, capaRough: 0.04, refleja: 1}),
  borde: liso(COL_TAZA.borde, {rough: 0.25, capa: 1, capaRough: 0.05, refleja: 0.8}),
  dentro: liso(COL_TAZA.dentro, {rough: 0.3, capa: 0.8, refleja: 0.6}),
  // el café en el aire: a contraluz se vuelve ámbar (el sol lo atraviesa), con su brillo
  cafe: liso(COL_TAZA.cafe, {rough: 0.06, capa: 1, capaRough: 0.02, refleja: 1.1, emite: '#7A3009', fuerza: 0.55}),
  corona: (() => {
    const c = liso('#5C250A', {rough: 0.06, capa: 1, capaRough: 0.02, refleja: 1.1, emite: '#8A3A0C', fuerza: 0.6});
    c.side = THREE.DoubleSide;
    return c;
  })(),
  // el del suelo, visto casi de canto: refleja mucho menos (si no, el charco sale blanco como leche)
  charco: liso('#2E1307', {rough: 0.12, capa: 0.6, capaRough: 0.08, refleja: 0.18}),
  crema: liso(COL_TAZA.crema, {rough: 0.35, capa: 0.4, refleja: 0.5}),
});
type Mats = ReturnType<typeof mats>;

// ---------------------------------------------------------------- la taza: el perfil de torno (radio, altura con y hacia arriba)
const arco = (cx: number, cy: number, r: number, a0: number, a1: number, n: number): [number, number][] =>
  Array.from({length: n + 1}, (_, i) => {
    const a = mix(a0, a1, i / n);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  });
const H = Math.PI / 2;
const FUERA: [number, number][] = [[0, -59], [30, -59], ...arco(38, -45, 14, -H, 0, 8).slice(1), [52, 0], [52, 46]];
const LABIO: [number, number][] = [[52, 46], [52, 54], ...arco(48.75, 55.5, 3.25, 0, Math.PI, 8).slice(1), [45.5, 50]];
const DENTRO: [number, number][] = [[45.5, 50], [45.5, -36], ...arco(37.5, -36, 8, 0, -H, 6).slice(1), [0, -44]];

const Taza3D: React.FC<{c: P; ang: number; giro: number; conCafe: boolean; m: Mats; aplasta?: [number, number]}> = ({c, ang, giro, conCafe, m, aplasta}) => (
  <group position={[c[0], -c[1], 0]} rotation={[0, 0, -ang]} scale={aplasta ? [aplasta[0], aplasta[1], aplasta[0]] : [1, 1, 1]}>
    <group rotation={[0, giro, 0]}>
      <mesh geometry={geoTorno(FUERA, 'fuera')} material={m.taza} castShadow receiveShadow />
      <mesh geometry={geoTorno(LABIO, 'labio')} material={m.borde} castShadow receiveShadow />
      <mesh geometry={geoTorno(DENTRO, 'dentro')} material={m.dentro} receiveShadow />
      <mesh geometry={geoAro(27, 9.5, Math.PI)} material={m.taza} position={[52, 3, 0]} rotation={[0, 0, -H]} castShadow receiveShadow />
      {conCafe && (
        <group position={[0, 40, 0]} rotation={[-H, 0, 0]}>
          <mesh material={m.cafe}>
            <circleGeometry args={[45.6, 64]} />
          </mesh>
          <mesh geometry={geoAro(41, 3.4)} material={m.crema} position={[0, 0, 0.4]} scale={[1, 1, 0.3]} />
        </group>
      )}
    </group>
  </group>
);

// ---------------------------------------------------------------- los trozos: su forma (constante) y su salto
const FORMAS = (() => {
  const tr = trozos(T_SUELO + 0.001);
  return tr.map((q) => q.pts.map(([x, y]): [number, number] => {
    const dx = x - q.c[0], dy = y - q.c[1];
    const a = -q.ang;
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
  }));
})();
const dentroDe = (pt: [number, number], poly: [number, number][]) => {
  let s = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) s = !s;
  }
  return s;
};

// EL SALTO DE LOS TROZOS (el mismo de la plastilina, que se lee también en pequeño): salen de donde los suelta escena.ts y en su
// dirección, con más fuerza; suben ~250 px girando, botan dos veces, resbalan un poco y se quedan tumbados sobre su lado más largo
const G_TROZO = 6800;
const APLASTA = 1 / 30; // lo que dura el aplastón de la taza contra el suelo
type Fis = {p0: P; v: P; w: number; a0: number; piso: number; rho: number; estables: number[]};
const FIS: Fis[] = (() => {
  const a = trozos(T_SUELO), b = trozos(T_SUELO + 0.002), reposo = trozos(5.95);
  return a.map((q, n) => {
    const forma = FORMAS[n];
    let vx = (b[n].c[0] - q.c[0]) / 0.002, vy = (b[n].c[1] - q.c[1]) / 0.002;
    vx *= vx < 0 ? 2.0 : 0.9;
    vy *= 1.75;
    const w = ((b[n].ang - q.ang) / 0.002) * 1.3;
    const rho = Math.max(...forma.map(([x, y]) => Math.hypot(x, y))) * 0.6;
    const lados = forma.map((pt, i) => {
      const q2 = forma[(i + 1) % forma.length];
      const L = Math.hypot(q2[0] - pt[0], q2[1] - pt[1]);
      let nx = (q2[1] - pt[1]) / L, ny = -(q2[0] - pt[0]) / L;
      const mm: [number, number] = [(pt[0] + q2[0]) / 2 + nx * 3, (pt[1] + q2[1]) / 2 + ny * 3];
      if (dentroDe(mm, forma)) { nx = -nx; ny = -ny; }
      return {L, a: Math.PI / 2 - Math.atan2(ny, nx)};
    });
    const Lmax = Math.max(...lados.map((l) => l.L));
    return {p0: q.c, v: [vx, vy] as P, w, a0: q.ang, piso: reposo[n].c[1] + 8, rho, estables: lados.filter((l) => l.L > 0.55 * Lmax).map((l) => l.a)};
  });
})();
const salto = (f: Fis, tau: number): {c: P; ang: number; quieto: number} => {
  const G = G_TROZO;
  const yl = f.piso - f.rho;
  const y0 = Math.min(f.p0[1], yl - 1);
  const t1 = (-f.v[1] + Math.sqrt(f.v[1] ** 2 + 2 * G * (yl - y0))) / G;
  if (tau < t1) return {c: [f.p0[0] + f.v[0] * tau, y0 + f.v[1] * tau + 0.5 * G * tau * tau], ang: f.a0 + f.w * tau, quieto: 0};
  let x = f.p0[0] + f.v[0] * t1, ang = f.a0 + f.w * t1, vx = f.v[0] * 0.6, w = f.w * 0.55, s = tau - t1;
  let vb = -0.4 * (f.v[1] + G * t1);
  for (let bote = 0; bote < 2; bote++) {
    const tb = (-2 * vb) / G;
    if (s < tb) return {c: [x + vx * s, yl + vb * s + 0.5 * G * s * s], ang: ang + w * s, quieto: 0};
    x += vx * tb;
    ang += w * tb;
    s -= tb;
    vb *= 0.35;
    vx *= 0.6;
    w *= 0.5;
  }
  const DUR_R = 0.18;
  const u = Math.min(s, DUR_R);
  const k = E.outCubic(u / DUR_R);
  let meta = ang, mejor = Infinity;
  for (const a of f.estables) {
    const c = a + 2 * Math.PI * Math.round((ang - a) / (2 * Math.PI));
    if (Math.abs(c - ang) < mejor) { mejor = Math.abs(c - ang); meta = c; }
  }
  return {c: [x + vx * u * (1 - u / (2 * DUR_R)), yl], ang: mix(ang, meta, k), quieto: k};
};

const Trozos3D: React.FC<{t: number; m: Mats}> = ({t, m}) => {
  if (t < T_SUELO + APLASTA) return null;
  const tau = t - T_SUELO - APLASTA + 0.02;
  return (
    <group>
      {FIS.map((f, n) => {
        const q = salto(f, tau);
        const z = zSuelo(f.piso);
        const bajo = Math.max(...FORMAS[n].map(([x, y]) => q.c[1] + x * Math.sin(q.ang) + y * Math.cos(q.ang)));
        const dy = Math.min(0, f.piso - 1 - bajo) + q.quieto * Math.max(0, f.piso - 1 - bajo);
        const vuela = 1 - q.quieto;
        // da vueltas en el aire (se ve el blanco de dentro) y se queda un poco inclinado
        const tumbo = 0.3 + 1.3 * vuela * Math.sin(n * 2.1 + tau * 15);
        const giroY = 0.9 * vuela * Math.cos(n * 1.3 + tau * 10) + (n % 2 ? 0.3 : -0.3);
        const alto = clamp(1 - (f.piso - q.c[1] - f.rho) / 200);
        return (
          <Capa key={n} z={z}>
            <group position={[q.c[0], -(q.c[1] + dy), 0]} rotation={[tumbo, giroY, -q.ang]}>
              {/* un trozo de cerámica: fino, rojo y brillante por fuera, blanco por dentro */}
              <mesh geometry={geoFigura(FORMAS[n], n === 5 ? 18 : 9, n === 5 ? 6 : 2.5, `trozo-${n}`)} material={m.taza} position={[0, 0, 3]} castShadow receiveShadow />
              {n !== 5 && <mesh geometry={geoFigura(FORMAS[n], 6, 2, `trozo-${n}`)} material={m.dentro} position={[0, 0, -3.5]} scale={[0.97, 0.97, 1]} castShadow receiveShadow />}
            </group>
            <Contacto x={q.c[0] + 6} y={f.piso} w={120} d={56} op={0.5 * alto} />
          </Capa>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------- las migas de esmalte que saltan al romperse
const G_MIGA = 6200;
const MIGAS = (() => {
  const r = rng(91);
  return Array.from({length: 22}, (_, i) => ({
    v: [(r() - 0.5) * 1400 - 150, -(500 + r() * 950)] as P, rad: 3 + r() * 6, prof: -4 + r() * 24, blanca: i % 4 === 2, dx: (r() - 0.5) * 50,
    rot: r() * 6,
  }));
})();
const Migas: React.FC<{t: number; m: Mats}> = ({t, m}) => {
  if (t < T_SUELO) return null;
  const tau = t - T_SUELO;
  return (
    <group>
      {MIGAS.map((mi, i) => {
        const y0 = SUELO - 34, x0 = IMPACTO[0] + mi.dx, piso = SUELO + mi.prof - mi.rad * 0.6;
        const t1 = (-mi.v[1] + Math.sqrt(mi.v[1] ** 2 + 2 * G_MIGA * (piso - y0))) / G_MIGA;
        let c: P;
        if (tau < t1) c = [x0 + mi.v[0] * tau, y0 + mi.v[1] * tau + 0.5 * G_MIGA * tau * tau];
        else {
          const vy1 = -0.3 * (mi.v[1] + G_MIGA * t1), vx1 = 0.4 * mi.v[0], x1 = x0 + mi.v[0] * t1;
          const t2 = (-2 * vy1) / G_MIGA, s = tau - t1;
          c = s < t2 ? [x1 + vx1 * s, piso + vy1 * s + 0.5 * G_MIGA * s * s] : [x1 + vx1 * t2, piso];
        }
        return (
          <Capa key={i} z={zSuelo(SUELO + mi.prof)}>
            <mesh geometry={geoEsfera()} material={mi.blanca ? m.dentro : m.taza} position={[c[0], -c[1], 0]} rotation={[mi.rot + tau * 9, mi.rot, 0]}
              scale={[mi.rad * 1.3, mi.rad * 0.55, mi.rad]} castShadow />
          </Capa>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------- el café: el chorro liso, la corona de gotas, las manchas y el charco
let charcoHecho: THREE.BufferGeometry | null = null;
const geoCharco = (): THREE.BufferGeometry => {
  if (charcoHecho) return charcoHecho;
  const sh = new THREE.Shape();
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const R = 1 + 0.11 * Math.sin(3 * a + 0.7) + 0.07 * Math.sin(5 * a + 2.1) + 0.05 * Math.sin(9 * a + 1.3);
    const x = 160 * R * Math.cos(a), y = 100 * R * Math.sin(a);
    if (i === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  charcoHecho = new THREE.ExtrudeGeometry(sh, {depth: 1, bevelEnabled: true, bevelThickness: 4, bevelSize: 6, bevelSegments: 5, curveSegments: 8});
  charcoHecho.translate(0, 0, 4);
  charcoHecho.computeVertexNormals();
  return charcoHecho;
};

const Cafe3D: React.FC<{t: number; m: Mats}> = ({t, m}) => {
  const cf = cafe(t);
  const sig = new Map(cafe(t + 0.012).gotas.map((d) => [d.i, d.c]));
  // las gotas seguidas del chorro se juntan en un tubo liso que adelgaza; donde se separan quedan gotas sueltas
  const chorro = cf.gotas.filter((d) => d.i < 100).sort((a, b) => a.i - b.i);
  const grupos: (typeof chorro)[] = [];
  chorro.forEach((d, k) => {
    if (k === 0 || Math.hypot(d.c[0] - chorro[k - 1].c[0], d.c[1] - chorro[k - 1].c[1]) > 46) grupos.push([]);
    grupos[grupos.length - 1].push(d);
  });
  const tramos: React.ReactNode[] = [];
  const sueltas = new Set<number>();
  grupos.forEach((gr, gi) => {
    if (gr.length < 3) { gr.forEach((d) => sueltas.add(d.i)); return; }
    const rIni = Math.max(...gr.map((d) => d.r)), rFin = Math.min(...gr.map((d) => d.r));
    const lis = gr.map((_, k) => {
      const v = gr.slice(Math.max(0, k - 2), k + 3);
      return {c: [v.reduce((s2, d) => s2 + d.c[0], 0) / v.length, v.reduce((s2, d) => s2 + d.c[1], 0) / v.length] as P, r: mix(rFin, rIni, k / (gr.length - 1))};
    });
    for (let k = 1; k < lis.length; k++) {
      const a2 = lis[k - 1], b2 = lis[k];
      tramos.push(<Capsula key={`t${gi}-${k}`} a={[a2.c[0], -a2.c[1], 0]} b={[b2.c[0], -b2.c[1], 0]} ra={a2.r * 0.62} rb={b2.r * 0.62} mat={m.cafe} />);
    }
    sueltas.add(gr[0].i);
    sueltas.add(gr[gr.length - 1].i);
  });
  const zc = zSuelo(SUELO + 6);
  return (
    <group>
      <Corona t={t} m={m} />
      {tramos}
      {cf.gotas.filter((d) => d.i >= 100 || sueltas.has(d.i)).map((d) => {
        const n = sig.get(d.i);
        const v: V3 = n ? [(n[0] - d.c[0]) / 0.012, -(n[1] - d.c[1]) / 0.012, 0] : [0, -1, 0];
        const vel = Math.hypot(v[0], v[1]);
        const {quat} = orienta([0, 0, 0], vel > 1 ? v : [0, 1, 0]);
        const k = Math.min(1, vel / 1400);
        const rr = d.i >= 100 ? d.r * 0.95 : d.r * 0.85; // gotas, no bolas: finas y estiradas por la velocidad
        return (
          <mesh key={d.i} geometry={geoEsfera()} material={m.cafe} position={[d.c[0], -d.c[1], 0]} quaternion={quat}
            scale={[rr * (1 - 0.35 * k), rr * (1 + 1.8 * k), rr * (1 - 0.35 * k)]} castShadow />
        );
      })}
      {cf.manchas.map((s) => (
        <Capa key={`m${s.i}`} z={zSuelo(s.c[1])}>
          <mesh geometry={geoEsfera()} material={m.charco} position={[s.c[0], -s.c[1] + 1, 0]} scale={[s.rx, 3, s.rx * 0.7]} />
        </Capa>
      ))}
      {cf.charco && (
        <Capa z={zc}>
          <group position={[cf.charco.c[0], -cf.charco.c[1], 0]} rotation={[-H, 0, 0]}>
            <mesh geometry={geoCharco()} material={m.charco} scale={[cf.charco.rx / 160, (cf.charco.rx * 0.62) / 100, 1]} receiveShadow />
          </group>
        </Capa>
      )}
    </group>
  );
};

// LA CORONA DEL GOLPE: el café que sube en una hoja fina alrededor de donde cae la taza, se abre en dedos con una gota en cada punta
// y se derrumba en 0,34 s (es lo que hace que un golpe de líquido se lea como salpicadura y no como bolitas)
const DEDOS = (() => {
  const r = rng(63);
  return Array.from({length: 14}, (_, i) => ({a: (i / 14) * Math.PI * 2 + (r() - 0.5) * 0.3, alto: 0.7 + r() * 0.6, grueso: 0.8 + r() * 0.4}));
})();
const PERFIL_CORONA: [number, number][] = [[0.5, 0], [0.72, 0.25], [0.86, 0.55], [0.96, 0.8], [1.05, 0.95], [1.12, 1.0]];
const Corona: React.FC<{t: number; m: Mats}> = ({t, m}) => {
  const tau = t - T_SUELO;
  if (tau < 0 || tau > 0.34) return null;
  const k = tau / 0.34;
  const R = 34 + 110 * E.outCubic(k);
  const sube = Math.sin(Math.PI * Math.min(1, k * 1.1)) * (1 - 0.35 * k);
  const h = 62 * sube;
  const x0 = IMPACTO[0] + 4;
  return (
    <group>
      {h > 3 && (
        <mesh geometry={geoTorno(PERFIL_CORONA, 'corona', 48)} material={m.corona} position={[x0, -SUELO + 2, 0]} scale={[R, h, R * 0.75]} castShadow />
      )}
      {DEDOS.map((d, i) => {
        const hd = h + 70 * d.alto * sube;
        if (hd < 6) return null;
        const c = Math.cos(d.a), s = Math.sin(d.a);
        const a: V3 = [x0 + R * 1.08 * c, -SUELO + 2 + h * 0.9, R * 1.08 * s * 0.75];
        const b: V3 = [x0 + (R * 1.12 + 26 * k + 10) * c, -SUELO + 2 + hd, (R * 1.12 + 26 * k + 10) * s * 0.75];
        const rr = 9 * d.grueso * (1 - 0.45 * k);
        return (
          <group key={i}>
            <Capsula a={a} b={b} ra={rr} rb={rr * 0.55} mat={m.corona} />
            <mesh geometry={geoEsfera()} material={m.corona} position={[b[0] + c * 4, b[1] + 8, b[2]]} scale={[rr * 0.95, rr * 1.25, rr * 0.95]} castShadow />
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------- todo lo de la taza
export const TazaPelicula: React.FC<{t: number}> = ({t}) => {
  const m = mats();
  const tz = taza(t);
  // en el aire también gira sobre su eje: el asa viene hacia la cámara
  const giro = t > T_CAE ? -0.95 * E.inOutCubic(p(t, T_CAE, T_SUELO - T_CAE)) : 0;
  // el golpe: un instante aplastada contra el suelo (como en los dibujos animados), y luego salta en trozos
  const aplastada = t >= T_SUELO && t < T_SUELO + APLASTA;
  const tzA = taza(T_SUELO - 1e-4);
  const kCae = tz.estado === 'cae' ? clamp((tz.c[1] - MESA_Y) / (SUELO - MESA_Y - 60)) : 0;
  return (
    <group dispose={null}>
      {tz.estado !== 'suelo' && <Taza3D c={tz.c} ang={tz.ang} giro={giro} conCafe={t < 2.76} m={m} />}
      {aplastada && <Taza3D c={[tzA.c[0], SUELO - 40]} ang={0.4} giro={-0.95} conCafe={false} m={m} aplasta={[1.25, 0.66]} />}
      {tz.estado === 'mesa' && <Contacto x={tz.c[0] + 4} y={MESA_Y} w={150} d={110} op={0.6} />}
      {kCae > 0 && <Contacto x={tz.c[0] + 10} y={SUELO} w={mix(240, 140, kCae)} d={mix(140, 90, kCae)} op={0.12 + 0.4 * kCae} />}
      <Trozos3D t={t} m={m} />
      <Migas t={t} m={m} />
      <Cafe3D t={t} m={m} />
    </group>
  );
};
