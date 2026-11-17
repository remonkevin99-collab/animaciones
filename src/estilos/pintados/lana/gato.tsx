import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {E, clamp, mix, p} from '../../../comun/curvas';
import {ESCALA_GATO, T_SUELO, type Elipse, type Gato, type P, type Pata} from '../../gato/escena';
import {type V3, brillo, fieltro, geoFigura, geoOvoide, geoTorno, geoTubo, lana, mancha, tiembla} from './punto';
import {Tejido} from './tejido';

// MUÑECO DE LANA, EL GATO: el gato de escena.ts hecho amigurumi, un muñeco de ganchillo relleno. Naranja
// con las rayas tejidas (vueltas de lana más oscura: anillos en la cola y en el lomo y la diana en el muslo), el hocico, el babero y
// los calcetines blancos. Ojos de seguridad grandes y brillantes (iris verde, la pupila que pasa de rendija a redonda) con párpados
// de punto que bajan cuando trama algo; orejas de cucurucho con el fieltro rosa dentro, la nariz bordada a punto de satén, la boca
// de hilo marrón, bigotes de hilo y coloretes de fieltro. Todo con su pelusilla (tejido.tsx). La cabeza gira de verdad en 3D (de
// tres cuartos a mirarte). Cada pieza tiembla un pelo distinto en cada postura, como un muñeco que se mueve a mano.
// Coordenadas: las del dibujo del gato (escena.ts) con la y hacia arriba (x, −y) y z hacia la cámara; se pinta 1,14 veces más
// grande desde donde se sienta, como en los estilos planos.

export const COL_GATO = {
  naranja: '#FF9433', raya: '#C2470F', blanco: '#FFFDF8', rosa: '#F48FA6', colorete: '#F7708E', iris: '#9BD14A', pupila: '#0E0B0C',
  boca: '#4A2016', bigote: '#FFF7EA',
};
const C = COL_GATO;
const N = C.naranja, D = C.raya;
// las vueltas de la tesela (12): dos rayas de dos vueltas
const RAYAS = [N, N, N, N, D, D, N, N, N, N, D, D];
const RAYAS_COLA = [N, N, N, D, D, N, N, N, N, D, D, N];

type Curva = (x: number) => number;
type Clave = [number, number, Curva?];
const kv = (t: number, claves: Clave[], def: Curva = E.inOutCubic) => {
  if (t <= claves[0][0]) return claves[0][1];
  for (let i = 1; i < claves.length; i++) {
    const [t1, v1, e] = claves[i];
    const [t0, v0] = claves[i - 1];
    if (t <= t1) return mix(v0, v1, (e || def)(p(t, t0, t1 - t0)));
  }
  return claves[claves.length - 1][1];
};
const pulso = (t: number, t0: number, sube: number, baja: number) =>
  t < t0 ? 0 : t < t0 + sube ? E.outCubic((t - t0) / sube) : 1 - E.inOutCubic(clamp((t - t0 - sube) / baja));

// los gestos que escena.ts no devuelve sueltos (los mismos tiempos que allí)
const PARPADO: Clave[] = [
  [0, 0.1], [0.58, 0.1], [0.76, 0.5], [1.0, 0.5], [1.14, 0.06], [1.56, 0.06], [1.6, 1, E.lin], [1.67, 0.06, E.lin], [2.2, 0.06],
  [2.4, 0.52], [2.74, 0.52], [2.79, 0, E.lin], [4.18, 0.04], [4.36, 0.55], [4.58, 0.55], [4.72, 1], [4.86, 1], [5.0, 0.55],
  [5.12, 0.97],
];
const PICARDIA: Clave[] = [[0, 0], [0.58, 0], [0.76, 1], [1.0, 1], [1.14, 0], [2.2, 0], [2.4, 1], [2.76, 1], [2.8, 0, E.lin], [4.18, 0], [4.36, 0.5]];
const SONRISA: Clave[] = [[0, 0], [0.7, 0], [0.82, 1], [1.0, 1], [1.12, 0], [2.36, 0], [2.5, 1], [2.78, 1], [2.86, 0], [4.3, 0], [4.46, 1], [4.98, 1], [5.1, 0.4]];

const RAD = Math.PI / 180;
const H90 = Math.PI / 2;
const n3 = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const sum3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const mix3 = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

type Mat = THREE.Material;
const S = ESCALA_GATO;

// un tubo que cambia en cada postura: se hace al pintar y se tira cuando ya no sirve
const Tubo: React.FC<{pts: V3[]; r: number[]; mat: Mat; puntas?: [boolean, boolean]; sombra?: boolean; tipo?: 'ganchillo' | 'cordon'; v0?: number; pelusa?: boolean}> = ({
  pts, r, mat, puntas, sombra = true, tipo, v0, pelusa = false,
}) => {
  const clave = JSON.stringify([pts.map((q) => q.map((x) => Math.round(x * 4))), r, puntas, tipo, v0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => geoTubo(pts, r, {puntas, tipo, v0}), [clave]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <Tejido geometry={geo} material={mat} sombra={sombra} pelusa={pelusa} />;
};

// un trozo del cuerpo: un ovoide relleno (la elipse de escena.ts con su fondo rz). «frente»: el polo mira a la cámara (las vueltas
// hacen la diana en el lado que se ve, como el muslo de un amigurumi)
const Ovoide: React.FC<{e: Elipse; rz: number; z?: number; mat: Mat; semilla: number; j?: V3; frente?: boolean; children?: React.ReactNode}> = ({
  e, rz, z = 0, mat, semilla, j = [0, 0, 0], frente, children,
}) => (
  <group position={[e.c[0] + j[0], -e.c[1] + j[1], z]} rotation={[0, 0, -e.ang + j[2]]}>
    {frente ? (
      <Tejido geometry={geoOvoide(Math.round(e.rx), rz, Math.round(e.ry), semilla, {escala: S, costura: Math.PI / 2})} material={mat}
        rotation={[H90, 0, 0]} />
    ) : (
      <Tejido geometry={geoOvoide(Math.round(e.rx), Math.round(e.ry), rz, semilla, {escala: S})} material={mat} />
    )}
    {children}
  </group>
);

// ---------------------------------------------------------------- la cabeza
const A = 96, B = 88, Cz = 106; // la cabeza: hacia el hocico, hacia arriba y de lado a lado
const YAW0 = 0.8; // de «lado» la cara no está de perfil puro: tres cuartos, para que se lean los dos ojos
const RE = 27; // el radio del ojo
const CABEZA = 1.18; // la cabeza, más grande que en los estilos planos: es un muñeco
const OJO: V3 = (() => {
  const d = n3([Math.cos(8 * RAD) * Math.cos(33 * RAD), Math.sin(8 * RAD), Math.cos(8 * RAD) * Math.sin(33 * RAD)]);
  const t = 1 / Math.sqrt((d[0] / A) ** 2 + (d[1] / B) ** 2 + (d[2] / Cz) ** 2);
  return mul3(d, t - RE * 0.5);
})();
type Mats = Record<'cuerpo' | 'cola' | 'liso' | 'blanco' | 'raya' | 'rosa' | 'colorete' | 'nariz' | 'iris' | 'pupila' | 'luz' | 'boca' | 'bigote' | 'parpado', Mat>;
const matsGato = (): Mats => ({
  cuerpo: lana(RAYAS), cola: lana(RAYAS_COLA), liso: lana(N), blanco: lana(C.blanco, 'ganchillo', {hondo: 0.62}), raya: lana(D, 'cordon'),
  rosa: fieltro(C.rosa), colorete: fieltro(C.colorete), nariz: lana(C.rosa, 'cordon', {pelusa: 0.3}),
  iris: brillo(C.iris, {rough: 0.12}), pupila: brillo(C.pupila, {rough: 0.08}), luz: brillo('#FFFFFF', {emite: '#FFFFFF', fuerza: 1.4}),
  boca: lana(C.boca, 'cordon', {pelusa: 0}), bigote: lana(C.bigote, 'cordon', {pelusa: 0.4}), parpado: lana(N),
});
// lo que brilla (para los reflejos del estudio): [material, cuánto refleja]
export const brillantesGato = (): [THREE.MeshPhysicalMaterial, number][] => {
  const m = matsGato();
  return [[m.iris, 0.9], [m.pupila, 1.2]] as [THREE.MeshPhysicalMaterial, number][];
};

const Ojo: React.FC<{c: V3; lado: 1 | -1; parp: number; pic: number; dil: number; mx: number; my: number; m: Mats}> = ({c, lado, parp, pic, dil, mx, my, m}) => {
  // el párpado: media bola tejida que gira sobre el ojo (abierto = metida detrás) y se inclina hacia la nariz cuando trama
  let beta = Math.asin(clamp(1 - 2 * Math.min(parp, 1), -1, 1));
  if (parp < 0.14) beta += (1 - parp / 0.14) * 0.5;
  const sigma = -lado * pic * 0.42;
  const w = mix(0.26, 0.74, dil);
  const hl = n3([0.92, 0.32 - 0.25 * Math.min(parp, 0.55), 0.3]);
  return (
    <group position={c}>
      {/* el ojo de seguridad: una cúpula de plástico verde con su pupila; el aro de detrás, hundido en el punto */}
      <mesh geometry={geoOvoide(RE, RE, RE, 900 + lado, {bultos: 0})} material={m.iris} scale={[0.92, 1, 1]} castShadow receiveShadow />
      <group rotation={[0, mx * 0.3, -my * 0.45]}>
        <mesh geometry={geoOvoide(RE, RE, RE, 910, {bultos: 0})} material={m.pupila} position={[RE * 0.62, 0, 0]} scale={[0.42, 0.82, w]} />
      </group>
      <mesh geometry={geoOvoide(RE * 0.17, RE * 0.17, RE * 0.17, 920, {bultos: 0})} material={m.luz} position={mul3(hl, RE * 0.98)} />
      <mesh geometry={geoOvoide(RE * 0.08, RE * 0.08, RE * 0.08, 921, {bultos: 0})} material={m.luz} position={mul3(n3([0.9, -0.3, 0.36]), RE * 0.97)} />
      <group rotation={[sigma, 0, beta]}>
        <mesh geometry={geoOvoide(RE * 1.17, RE * 1.17, RE * 1.17, 930 + lado, {bultos: 0.01, arriba: Math.PI / 2, escala: CABEZA * S})} material={m.parpado}
          castShadow receiveShadow />
      </group>
    </group>
  );
};

const Oreja: React.FC<{lado: 1 | -1; atras: number; tic: number; m: Mats}> = ({lado, atras, tic, m}) => {
  const base: V3 = [-16, 58, lado * 54];
  const dir = n3([-0.12, 1, lado * 0.46]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir));
  // el cucurucho tejido, aplastado, con el triángulo de fieltro rosa delante
  const perfil: [number, number][] = [[0.5, -4], [24, -2], [36, 8], [36, 22], [30, 42], [20, 60], [10, 74], [3, 82], [0.5, 84]];
  return (
    <group position={base} rotation={[lado * (0.6 * atras + 0.18 * tic), 0, 0.55 * atras + 0.32 * tic]}>
      <group quaternion={[q.x, q.y, q.z, q.w]}>
        <Tejido geometry={geoTorno('oreja', perfil, {lados: 30})} material={m.liso} scale={[0.46, 1, 1]} />
        <group position={[17, 6, 0]} rotation={[0, 0, 0.16]}>
          <mesh geometry={geoFigura('oreja-dentro', [[-22, 2], [22, 2], [3, -58], [-3, -58]], 4, 1.6)} material={m.rosa} rotation={[0, H90, 0]} />
        </group>
      </group>
    </group>
  );
};

const Bigotes: React.FC<{lado: 1 | -1; t: number; m: Mats}> = ({lado, t, m}) => {
  const P0: V3 = [92, -22, lado * 20];
  return (
    <>
      {[0, 1, 2].map((j) => {
        const s = sum3(P0, mul3(n3([0.5, 0.25 - 0.24 * j, lado * 0.85]), 18));
        const vib = 1.6 * Math.sin(t * 7 + j);
        const mid = sum3(s, [3, 1 - 3 * j + vib * 0.5, lado * 44]);
        const e = sum3(s, [-10, -10 - 12 * j + vib, lado * 88]);
        return <Tubo key={j} pts={[s, mid, e]} r={[2.6, 2.3, 1.8]} mat={m.bigote} sombra={false} tipo="cordon" />;
      })}
    </>
  );
};

const Cabeza: React.FC<{g: Gato; t: number; paso: number; m: Mats}> = ({g, t, paso, m}) => {
  const jh = tiembla(paso, 42, 1.2);
  const yaw = mix(YAW0, Math.PI / 2, g.giro);
  const parp = kv(t, PARPADO), pic = kv(t, PICARDIA), sm = kv(t, SONRISA);
  const o = g.ojoCerca;
  const dil = clamp((o.pupila.rx - 3.6) / Math.max(1, o.rx * 0.64 - 3.6));
  const dc: P = [o.pupila.c[0] - o.c[0], o.pupila.c[1] - o.c[1]];
  const pc: P = [dc[0] * Math.cos(-g.inclina) - dc[1] * Math.sin(-g.inclina), dc[0] * Math.sin(-g.inclina) + dc[1] * Math.cos(-g.inclina)];
  const mx = pc[0] / (0.36 * o.rx), my = pc[1] / (0.3 * o.ry);
  const tic = (t0: number) => pulso(t, t0, 0.06, 0.22);
  const atras = pulso(t, T_SUELO, 0.07, 0.35);
  const lame = g.lengua ? clamp((g.lengua.ry - 5) / 9) : 0;
  const asombro = t >= T_SUELO && t < 3.95; // la boca de recambio en «o»
  const H = g.cabeza.c;
  return (
    <group position={[H[0] + jh[0], -H[1] + jh[1], 6]} rotation={[0, 0, -g.inclina + jh[2]]}>
      <group rotation={[0, -yaw, 0]} scale={[CABEZA, CABEZA, CABEZA]}>
        {/* la bola de la cabeza: las vueltas salen de la nariz (el polo, delante) */}
        <Tejido geometry={geoOvoide(B, A, Cz, 70, {escala: CABEZA * S, costura: 0, bultos: 0.02})} material={m.liso} rotation={[0, 0, -H90]} />
        {/* los mofletes, con su colorete de fieltro */}
        {([1, -1] as const).map((lado) => (
          <group key={lado}>
            <Tejido geometry={geoOvoide(38, 36, 30, 71 + lado, {escala: CABEZA * S})} material={m.liso} position={[34, -30, lado * 70]} />
            <mesh geometry={geoOvoide(15, 11, 4, 75 + lado, {bultos: 0})} material={m.colorete} position={[54, -34, lado * 95]}
              rotation={[0, lado > 0 ? 0.52 : Math.PI - 0.52, 0]} />
          </group>
        ))}
        {/* el hocico blanco: las dos almohadillas de los bigotes y la barbilla */}
        <Tejido geometry={geoOvoide(22, 20, 22, 73, {escala: CABEZA * S})} material={m.blanco} position={[90, -24, 18]} />
        <Tejido geometry={geoOvoide(22, 20, 22, 74, {escala: CABEZA * S})} material={m.blanco} position={[90, -24, -18]} />
        <Tejido geometry={geoOvoide(15, 13, 17, 75, {escala: CABEZA * S})} material={m.blanco} position={[80, asombro ? -60 : -50, 0]} />
        {/* la nariz bordada a punto de satén (hebras rosas en paralelo) */}
        <group position={[109, -6, 0]} rotation={[0, H90, 0]}>
          <mesh geometry={geoFigura('nariz', [[-15, -6], [15, -6], [9, 4], [0, 11], [-9, 4]], 8, 3.5, 14)} material={m.nariz} castShadow />
        </group>
        {/* la boca de hilo marrón: la raya del centro y la sonrisa (más alta de un lado: la de «lo voy a hacer»), o la «o» del susto */}
        <Tubo pts={[[106, -16, 0], [104.5, -28, 0], [103, -38, 0]]} r={[2.2, 2.2, 2.2]} mat={m.boca} sombra={false} tipo="cordon" />
        {asombro ? (
          <mesh geometry={geoOvoide(11, 11, 11, 78, {bultos: 0})} material={m.boca} position={[97, -47, 0]} scale={[0.5, 1, 0.9]} />
        ) : (
          ([1, -1] as const).map((lado) => {
            const k = lado > 0 ? 1.35 : 0.65;
            return (
              <Tubo key={lado} pts={[[103, -38, 0], [99, -45, lado * 9], [92, -45 + 4 * sm * k, lado * 19], [84, -39 + 8 * sm * k, lado * 26]]}
                r={[2.3, 2.3, 2.2, 2]} mat={m.boca} sombra={false} tipo="cordon" />
            );
          })
        )}
        {lame > 0.02 && <mesh geometry={geoOvoide(12, 12, 12, 82, {bultos: 0})} material={m.rosa} position={[97, -50 - 7 * lame, 0]} scale={[0.5, 0.45 + 0.55 * lame, 0.75]} />}
        <Bigotes lado={1} t={t} m={m} />
        <Bigotes lado={-1} t={t} m={m} />
        <Ojo c={OJO} lado={1} parp={parp} pic={pic} dil={dil} mx={mx} my={my} m={m} />
        <Ojo c={[OJO[0], OJO[1], -OJO[2]]} lado={-1} parp={parp} pic={pic} dil={dil} mx={mx} my={my} m={m} />
        <Oreja lado={1} atras={atras} tic={tic(0.84) + tic(5.55)} m={m} />
        <Oreja lado={-1} atras={atras} tic={tic(1.62)} m={m} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- las patas de delante: un tubo naranja y el calcetín blanco
const PataLana: React.FC<{pt: Pata; z: [number, number]; paso: number; i0: number; m: Mats; lamer?: V3 | null; w?: number}> = ({
  pt, z, paso, i0, m, lamer = null, w = 0,
}) => {
  const j1 = tiembla(paso, i0), j2 = tiembla(paso, i0 + 1);
  const W = (q: P, zz: number, j: V3): V3 => [q[0] + j[0], -q[1] + j[1], zz];
  const ho = W(pt.hombro, z[0], [0, 0, 0]);
  let co = W(pt.codo, mix(z[0], z[1], 0.5), j1), ma = W(pt.mano, z[1], j2);
  if (lamer && w > 0) {
    ma = mix3(ma, lamer, w);
    co = [co[0], co[1], mix(co[2], lamer[2] * 0.6, w)];
  }
  const mid = mix3(co, ma, 0.4);
  const pie = {...pt.pie, c: [ma[0] + pt.pie.c[0] - pt.mano[0], -(ma[1] - (pt.pie.c[1] - pt.mano[1]))] as P};
  return (
    <group>
      <Tubo pts={[ho, mix3(ho, co, 0.5), co, mid]} r={[31, 27, 23, 21]} mat={m.cuerpo} puntas={[true, false]} pelusa />
      <Tubo pts={[sum3(mid, mul3(n3([mid[0] - co[0], mid[1] - co[1], 0]), -4)), mix3(mid, ma, 0.5), ma]} r={[21.5, 20, 19]} mat={m.blanco} puntas={[false, false]} pelusa />
      <group position={[pie.c[0], -pie.c[1], ma[2]]} rotation={[0, 0, -pie.ang]}>
        <Tejido geometry={geoOvoide(32, 17, 24, i0 + 4, {escala: S})} material={m.blanco} />
        {/* los deditos, marcados con dos puntadas de hilo marrón */}
        {[-8, 8].map((dz, i) => (
          <Tubo key={i} pts={[[22, 12, dz], [29, 5, dz * 1.05], [31, -3, dz * 1.08]]} r={[1.4, 1.6, 1.4]} mat={m.boca} sombra={false} tipo="cordon" />
        ))}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- el gato entero
export const GatoLana: React.FC<{g: Gato; t: number; paso: number}> = ({g, t, paso}) => {
  const m = matsGato();
  const jt = tiembla(paso, 1), jc = tiembla(paso, 2), jp = tiembla(paso, 3), jb = tiembla(paso, 4), jk = tiembla(paso, 5);
  const tor = g.torso, cad = g.cadera, pec = g.pecho;
  const wLame = kv(t, [[4.95, 0], [5.15, 1]]);
  const lamer: V3 | null = (() => {
    if (wLame <= 0) return null;
    const yaw = mix(YAW0, Math.PI / 2, g.giro);
    const lx = 92 * CABEZA, ly = -52 * CABEZA;
    const x1 = lx * Math.cos(yaw), z1 = lx * Math.sin(yaw);
    const a = -g.inclina;
    return [g.cabeza.c[0] + x1 * Math.cos(a) - ly * Math.sin(a), -g.cabeza.c[1] + x1 * Math.sin(a) + ly * Math.cos(a) - 6, 6 + z1 + 14];
  })();
  // la cola: un solo tubo tejido, gordo, por detrás del cuerpo, con sus anillos
  const jcola = tiembla(paso, 6, 1);
  const cola: V3[] = g.cola.pts.map((q, i) => [q[0] + jcola[0] * (i / 16), -q[1] + jcola[1] * (i / 16), -40]);
  const radCola = g.cola.r.map((r) => r * 1.08);
  const pieT = (z: number, semilla: number) => (
    <group position={[g.pieTrasero.c[0], -g.pieTrasero.c[1], z]} rotation={[0, 0, -g.pieTrasero.ang]}>
      <Tejido geometry={geoOvoide(56, 20, 28, semilla, {escala: S})} material={m.blanco} />
    </group>
  );
  return (
    <group position={[300 * (1 - S), -1010 * (1 - S), 0]} scale={[S, S, S]} dispose={null}>
      {/* la sombra de contacto en la mesa, donde se sienta */}
      <mesh position={[330, -1010 + 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[360, 220, 1]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={mancha()} color="#3a1606" transparent opacity={0.55} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* lo del otro lado, detrás */}
      <PataLana pt={g.pataLejos} z={[-44, -40]} paso={paso} i0={300} m={m} />
      {pieT(-62, 320)}
      <Tubo pts={cola} r={radCola} mat={m.cola} puntas={[false, true]} pelusa />

      {/* el cuerpo: el muslo con su diana, el lomo con sus rayas, el pecho con el babero y la barriga */}
      <Ovoide e={cad} rz={92} mat={m.cuerpo} semilla={101} j={jk} frente />
      <Ovoide e={tor} rz={82} mat={m.cuerpo} semilla={102} j={jt} />
      <Ovoide e={pec} rz={72} mat={m.liso} semilla={103} j={jp}>
        <Tejido geometry={geoOvoide(52, 92, 50, 104, {escala: S})} material={m.blanco} position={[28, -8, 14]} />
      </Ovoide>
      <Ovoide e={g.barriga} rz={80} mat={m.blanco} semilla={105} j={jb} />
      <Tubo pts={[[g.cuello[0][0] + jc[0], -g.cuello[0][1] + jc[1], 0], [g.cuello[1][0], -g.cuello[1][1], 0]]} r={[60, 56]} mat={m.liso} pelusa />
      <Tubo pts={[[g.cuello[0][0] + 24 + jc[0], -g.cuello[0][1] + jc[1], 12], [g.cuello[1][0] + 20, -g.cuello[1][1] - 20, 12]]} r={[38, 32]} mat={m.blanco} pelusa />

      <Cabeza g={g} t={t} paso={paso} m={m} />

      {/* lo de este lado, delante */}
      {pieT(62, 330)}
      <PataLana pt={g.pataCerca} z={[44, 34]} paso={paso} i0={340} m={m} lamer={lamer} w={wLame} />
    </group>
  );
};
