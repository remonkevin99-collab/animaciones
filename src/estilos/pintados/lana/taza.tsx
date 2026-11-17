import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {E, clamp, mix, p, rng} from '../../../comun/curvas';
import {IMPACTO, SUELO, T_CAE, T_SUELO, cafe, piezasTaza, taza, trozos, vapor, type P} from '../../gato/escena';
import {type V3, algodon, geoFiguraTejida, geoOvoide, geoTorno, geoTubo, geoTuboFijo, lana, mancha, tiembla} from './punto';
import {Tejido} from './tejido';

// MUÑECO DE LANA, LA TAZA: una taza tejida a ganchillo, roja con una franja crema, su asa de tubo y el
// «café»: una espiral de lana marrón enrollada dentro. El vapor son mechas de lana blanca sin hilar que suben ondeando. Cae girando a
// saltos de stop motion; al caer, la lana del café se le sale por la boca y queda colgando en arco (el chorro de escena.ts, hecho
// hebra), y al romperse en el suelo la taza se deshace en pedazos de punto con los hilos sueltos, saltan pompones marrones (la
// salpicadura) y la madeja del café se desenrolla por el suelo en lazadas. Todo sale de escena.ts (taza, trozos, cafe, vapor).

const D_CAM = 960 / Math.tan((15 * Math.PI) / 180); // la distancia de la cámara (decorado.tsx)

export const COL_TAZA = {roja: '#E2333A', crema: '#FFF1DC', cafe: '#6E3B1F', cafeClaro: '#9A5B30', crema2: '#C98A55', vapor: '#FFFFFF'};
const R = COL_TAZA.roja, W = COL_TAZA.crema;
// (en los tornos las vueltas van al revés en la tesela: la franja crema cae justo debajo del borde)
const FILAS_TAZA = [R, W, W, R, R, R, R, R, R, R, R, R];

// el perfil de la taza [radio, altura] (y hacia arriba; la escena la mide de −59 a 59): el fondo, la pared, el borde enrollado y el
// interior hasta la lana del café
const PERFIL: [number, number][] = [
  [0.5, -59], [20, -59], [38, -58.5], [47, -56.5], [52, -51], [53, -36], [53.5, -10], [53.5, 20], [53, 46], [54.5, 53], [53, 58.5],
  [49.5, 60.5], [46.5, 57], [46, 50], [46, 43], [30, 42.5], [0.5, 42],
];
// el asa: el centro del tubo (en las medidas de la escena, con la y hacia arriba)
const ASA: V3[] = [[49, 33, 0], [66, 33, 0], [80, 23, 0], [84, 4, 0], [79, -14, 0], [65, -23, 0], [49, -23, 0]];
// la espiral de lana del café
const ESPIRAL: V3[] = (() => {
  const out: V3[] = [];
  const vueltas = 4.2;
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const a = k * vueltas * Math.PI * 2;
    const r = 4 + 37 * k;
    out.push([r * Math.cos(a), 46 + 2.5 * Math.sin(Math.PI * k), r * Math.sin(a)]);
  }
  return out;
})();

type Mats = Record<'taza' | 'asa' | 'cafe' | 'pompon', THREE.Material>;
const matsTaza = (): Mats => ({
  taza: lana(FILAS_TAZA), asa: lana(R), cafe: lana([COL_TAZA.cafe, COL_TAZA.cafeClaro, COL_TAZA.cafe, COL_TAZA.cafe], 'cordon', {pelusa: 1.6}),
  pompon: lana([COL_TAZA.cafeClaro, COL_TAZA.crema2], 'ganchillo', {pelusa: 3, hondo: 0.5, normal: 1.6}),
});

// un tubo que cambia en cada postura
const Tubo: React.FC<{pts: V3[]; r: number[]; mat: THREE.Material; puntas?: [boolean, boolean]; tipo?: 'ganchillo' | 'cordon'; sombra?: boolean; pelusa?: boolean}> = ({
  pts, r, mat, puntas, tipo, sombra = true, pelusa = false,
}) => {
  const clave = JSON.stringify([pts.map((q) => q.map((x) => Math.round(x * 2))), r.map((x) => Math.round(x * 4)), puntas, tipo]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => geoTubo(pts, r, {puntas, tipo}), [clave]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <Tejido geometry={geo} material={mat} sombra={sombra} pelusa={pelusa} />;
};

const Taza3D: React.FC<{c: P; ang: number; giro: number; m: Mats}> = ({c, ang, giro, m}) => (
  <group position={[c[0], -c[1], 0]} rotation={[0, 0, -ang]}>
    <group rotation={[0, giro, 0]}>
      <Tejido geometry={geoTorno('taza', PERFIL, {lados: 48})} material={m.taza} />
      <Tejido geometry={geoTuboFijo('asa', ASA, ASA.map(() => 10))} material={m.asa} />
      <mesh geometry={geoTuboFijo('espiral', ESPIRAL, ESPIRAL.map(() => 5.2), {tipo: 'cordon', muestras: 220})} material={m.cafe} castShadow receiveShadow />
    </group>
  </group>
);

// ---------------------------------------------------------------- el vapor: mechas de lana blanca sin hilar
const TRAMOS_VAPOR: [number, number, number][] = [[0, 6, 1], [5, 10, 0.68], [9, 14, 0.38]]; // [desde, hasta, opacidad]
const Vapor3D: React.FC<{tq: number}> = ({tq}) => (
  <group>
    {vapor(tq).map((h, i) => {
      if (h.alfa < 0.05 || h.pts.length < 3) return null;
      const n = h.pts.length;
      const todos: V3[] = h.pts.map(([x, y]) => [x, -y, 14]);
      const radio = (k: number) => (5 + 8 * (k / (n - 1))) * (1 - 0.7 * (k / (n - 1)) ** 5);
      // mechas de algodón: gruesas y vivas abajo, más finas y transparentes según suben (en tres tramos)
      return TRAMOS_VAPOR.map(([a, b, f], k) => {
        const op = Math.round(clamp(h.alfa * 0.8 * f) * 10) / 10;
        if (op < 0.1) return null;
        const pts = todos.slice(a, Math.min(b + 1, n));
        if (pts.length < 2) return null;
        return <Tubo key={`${i}-${k}`} pts={pts} r={pts.map((_, q) => radio(a + q))} mat={algodon(op)} sombra={false} pelusa puntas={[k === 0, k === 2]} />;
      });
    })}
  </group>
);

// ---------------------------------------------------------------- el café hecho lana: la hebra que se sale y la madeja del suelo
const Z_HEBRA = 6;
// la madeja que se desenrolla: lazadas por el suelo desde el golpe (k: lo desenrollado, de 0 a 1; ancho: el charco)
const LAZADAS: {a: number; r: number; dz: number}[] = (() => {
  const r = rng(808);
  const out: {a: number; r: number; dz: number}[] = [];
  const n = 70;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    out.push({a: k * Math.PI * 2 * 3.2 + Math.sin(k * 17) * 0.4, r: (0.12 + 0.88 * k) * (0.82 + 0.3 * r()), dz: (r() - 0.5) * 0.3});
  }
  return out;
})();

const Cafe3D: React.FC<{tq: number; m: Mats}> = ({tq, m}) => {
  const cf = cafe(tq);
  const chorro = cf.gotas.filter((g) => g.i < 100).sort((a, b) => b.i - a.i);
  const suelo = cf.manchas.filter((g) => g.i < 100).sort((a, b) => b.i - a.i);
  const salpica = cf.gotas.filter((g) => g.i >= 100);
  const salpicaSuelo = cf.manchas.filter((g) => g.i >= 100);
  const piezas: React.ReactNode[] = [];
  // la hebra: de la boca de la taza (si sigue entera) por el arco del chorro hasta lo que ya cayó al suelo
  const camino: V3[] = [];
  if (tq < T_SUELO && tq > T_CAE + 0.04) {
    const b = piezasTaza(taza(tq)).boca;
    camino.push([b[0], -b[1], Z_HEBRA]);
  }
  for (const g of chorro) camino.push([g.c[0], -g.c[1], Z_HEBRA]);
  for (const g of suelo) camino.push([g.c[0], -SUELO + 4, Z_HEBRA + 12 * Math.sin(g.i)]);
  // se suaviza (las gotas salen con su azar) y se quitan los puntos demasiado juntos
  const suave: V3[] = [];
  for (let i = 0; i < camino.length; i++) {
    const a = camino[Math.max(0, i - 1)], b = camino[i], c = camino[Math.min(camino.length - 1, i + 1)];
    const q: V3 = i === 0 || i === camino.length - 1 ? b : [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4, (a[2] + 2 * b[2] + c[2]) / 4];
    const u = suave[suave.length - 1];
    if (!u || Math.hypot(q[0] - u[0], q[1] - u[1]) > 7) suave.push(q);
  }
  if (suave.length >= 2) piezas.push(<Tubo key="hebra" pts={suave} r={suave.map(() => 6.5)} mat={m.cafe} tipo="cordon" />);
  // la salpicadura: pompones de lana marrón que saltan y se quedan en el suelo
  salpica.forEach((g) => {
    const rr = 5 + g.r * 0.9;
    piezas.push(<mesh key={`s${g.i}`} geometry={geoOvoide(Math.round(rr), Math.round(rr), Math.round(rr), 600 + g.i, {bultos: 0.12})} material={m.pompon}
      position={[g.c[0], -g.c[1], Z_HEBRA + 20 * Math.sin(g.i * 1.7)]} rotation={[g.i, g.i * 2, 0]} castShadow />);
  });
  salpicaSuelo.forEach((g) => {
    const rr = 5 + g.rx * 0.45;
    piezas.push(<mesh key={`ss${g.i}`} geometry={geoOvoide(Math.round(rr), Math.round(rr * 0.75), Math.round(rr), 600 + g.i, {bultos: 0.12})} material={m.pompon}
      position={[g.c[0], -SUELO + rr * 0.6, Z_HEBRA + 20 * Math.sin(g.i * 1.7)]} castShadow />);
  });
  // la madeja: se desenrolla por el suelo desde el golpe, en lazadas (crece con el charco)
  if (cf.charco) {
    const k = clamp((cf.charco.rx - 40) / 120);
    const n = Math.max(3, Math.round(LAZADAS.length * (0.25 + 0.75 * E.outCubic(k))));
    const ancho = cf.charco.rx * 1.05;
    const pts: V3[] = LAZADAS.slice(0, n).map((l) => [
      IMPACTO[0] + 4 + Math.cos(l.a) * l.r * ancho, -SUELO + 5.5, Math.sin(l.a) * l.r * ancho * 0.55 + l.dz * 30 + 10,
    ]);
    piezas.push(<Tubo key="madeja" pts={pts} r={pts.map(() => 6.8)} mat={m.cafe} tipo="cordon" />);
  }
  return <group>{piezas}</group>;
};

// ---------------------------------------------------------------- los pedazos de punto
// las formas de los trozos (las de escena.ts, en las medidas de la taza y con su centro en 0) y por dónde se deshilachan
const FORMAS: [number, number][][] = [
  [[-52, -59], [-6, -59], [-15, -20], [-52, -8]],
  [[-6, -59], [52, -59], [52, -22], [18, -12], [-15, -20]],
  [[-52, -8], [-15, -20], [0, 18], [-52, 30]],
  [[-15, -20], [18, -12], [52, -22], [52, 26], [0, 18]],
  [[-52, 30], [0, 18], [52, 26], [52, 45], [38, 59], [-38, 59], [-52, 45]],
];
const centro = (pts: [number, number][]): [number, number] => [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length];
// el borde roto: zigzag de puntos sueltos entre los vértices que eran el corte (no los del borde de la taza)
const roto = (pts: [number, number][], semilla: number): [number, number][] => {
  const r = rng(semilla);
  const out: [number, number][] = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    out.push(a);
    const borde = (Math.abs(a[0]) > 51 && Math.abs(b[0]) > 51 && Math.sign(a[0]) === Math.sign(b[0])) || (Math.abs(a[1]) > 58 && Math.abs(b[1]) > 58);
    if (borde) return;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(L / 9);
    const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    for (let k = 1; k < n; k++) {
      const s = k / n, d = (k % 2 ? 1 : -1) * (2 + r() * 3);
      out.push([mix(a[0], b[0], s) + nx * d, mix(a[1], b[1], s) + ny * d]);
    }
  });
  return out;
};
const FORMAS_ROTAS = FORMAS.map((f, i) => {
  const c = centro(f);
  return roto(f, 70 + i).map(([x, y]) => [x - c[0], y - c[1]] as [number, number]);
});
// los hilos sueltos de cada trozo: de un punto del borde roto hacia fuera, rizados
const HILOS: V3[][][] = FORMAS_ROTAS.map((f, i) => {
  const r = rng(90 + i);
  return [0, 1].map((h) => {
    const q = f[Math.floor(r() * f.length)];
    const l = Math.hypot(q[0], q[1]) || 1;
    const ux = q[0] / l, uy = q[1] / l;
    const largo = 22 + r() * 18;
    const riza = (r() - 0.5) * 2;
    return [0, 0.35, 0.7, 1].map((s) => [q[0] + ux * largo * s + -uy * riza * 10 * Math.sin(s * 3), -(q[1] + uy * largo * s + ux * riza * 10 * Math.sin(s * 3)), 4 + h * 3] as V3);
  });
});
const ASA_C = (() => {
  const c = ASA.reduce((a, q) => [a[0] + q[0], a[1] + q[1], 0] as V3, [0, 0, 0] as V3);
  return [c[0] / ASA.length, c[1] / ASA.length, 0] as V3;
})();

// dónde se queda cada trozo (para ponerlo a su profundidad: lo que en la pantalla queda más abajo, más cerca)
const REPOSO = trozos(T_SUELO + 3).map((tr) => tr.c);
const zSuelo = (y: number) => D_CAM * (1 - (SUELO - 560) / Math.max(1, y - 560));
const Trozos3D: React.FC<{tq: number; paso: number; m: Mats}> = ({tq, paso, m}) => (
  <group>
    {trozos(tq).map((tr, i) => {
      const j = tiembla(paso, 700 + i, 1);
      const vuela = 1 - tr.quieto;
      const tumbo: V3 = [0.9 * vuela * Math.sin(i * 2.1 + tq * 9), 0.7 * vuela * Math.cos(i * 1.3 + tq * 7), 0];
      // al pararse se tumba en el suelo, de cara arriba (la cámara lo ve desde un poco más alto)
      const tumba = -0.75 * E.outCubic(tr.quieto);
      const z = clamp(zSuelo(REPOSO[i][1] + 22), 0, 90) + (i % 2) * 10;
      const y = -Math.min(tr.c[1], SUELO - 30 + 22 * tr.quieto);
      return (
        <group key={i} position={[tr.c[0] + j[0], y + j[1], z]} rotation={[tumba, 0, 0]}>
          <group rotation={[0, 0, -tr.ang]} scale={[1.12, 1.12, 1.12]}>
            <group rotation={tumbo}>
              {i < 5 ? (
                <>
                  <Tejido geometry={geoFiguraTejida(`trozo${i}`, FORMAS_ROTAS[i], 13, 4.5)} material={m.taza} />
                  {HILOS[i].map((h, k) => <Tubo key={k} pts={h} r={[2.8, 2.6, 2.4, 2.1]} mat={m.asa} tipo="cordon" sombra={false} />)}
                </>
              ) : (
                <mesh geometry={geoTuboFijo('asa-suelta', ASA.map((q) => [q[0] - ASA_C[0], q[1] - ASA_C[1], 0] as V3), ASA.map(() => 10))} material={m.asa}
                  castShadow receiveShadow />
              )}
            </group>
          </group>
        </group>
      );
    })}
  </group>
);

// ---------------------------------------------------------------- la taza entera: en la mesa, cayendo y rota
export const TazaLana: React.FC<{tq: number; paso: number}> = ({tq, paso}) => {
  const m = matsTaza();
  const tz = taza(tq);
  const j = tiembla(paso, 600, tz.estado === 'mesa' ? 0.8 : 1.6);
  // al caer gira también sobre su eje (el asa viene hacia la cámara), a saltos
  const giro = tz.estado === 'mesa' ? 0 : -1.1 * E.inOutCubic(p(tq, T_CAE, T_SUELO - T_CAE));
  return (
    <group dispose={null}>
      {tz.estado !== 'suelo' && <Taza3D c={[tz.c[0] + j[0], tz.c[1] - j[1]]} ang={tz.ang + j[2]} giro={giro} m={m} />}
      {tz.estado === 'mesa' && (
        <mesh position={[tz.c[0] + 6, -1010 + 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[150, 100, 1]} renderOrder={2}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={mancha()} color="#3a1606" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <Vapor3D tq={tq} />
      <Cafe3D tq={tq} m={m} />
      <Trozos3D tq={tq} paso={paso} m={m} />
    </group>
  );
};
