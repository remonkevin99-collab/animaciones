import React from 'react';
import * as THREE from 'three';
import {E, clamp, mix} from '../../../comun/curvas';
import {ESCALA_GATO, T_SUELO, type Elipse, type Gato, type P, type Pata} from '../../gato/escena';
import {Capsula, Contacto, type Clave, type V3, geoAro, geoEsfera, kv, mix3, mul3, n3, pulso, sum3} from './comun';
import {cornea, iris, liso, pelo} from './materiales';

// PELÍCULA ANIMADA, EL GATO: el gato de escena.ts como el protagonista de una película de animación 3D: un gatito
// atigrado naranja (contra la pared verde azulada: los colores que más se ven) con el pecho, el hocico y los calcetines blancos, la cabeza grande y redonda, ojos ENORMES de iris verde y
// dorado con la córnea mojada y su brillo, orejas grandes que la ventana atraviesa (rosas por dentro, encendidas) y la cola gorda
// y lisa. La cabeza gira de verdad en 3D (de tres cuartos a mirarte). Las piezas salen de gato(t): las mismas que pintan los
// estilos planos, hechas volumen. Coordenadas: las del dibujo del gato con y hacia arriba y z hacia la cámara; se pinta 1,14 veces
// más grande desde donde se sienta, como en los demás estilos.

export const COL_GATO = {
  lomo: '#EE7F2E', vientre: '#FFC48C', raya: '#A9431A', blanco: '#FFF5EA', nariz: '#F28C9C', dentro: '#F7A3A6',
  boca: '#33222A', lengua: '#EC7484', bigote: '#FFFFFF', almohadilla: '#EE8E9C', borde: '#1E1A22',
};
const RIM = '#FFB25C';

// los gestos que escena.ts no devuelve sueltos (sus mismos tiempos)
const PARPADO: Clave[] = [
  [0, 0.1], [0.58, 0.1], [0.76, 0.5], [1.0, 0.5], [1.14, 0.06], [1.56, 0.06], [1.6, 1, E.lin], [1.67, 0.06, E.lin], [2.2, 0.06],
  [2.4, 0.52], [2.74, 0.52], [2.79, 0, E.lin], [4.18, 0.04], [4.36, 0.55], [4.58, 0.55], [4.72, 1], [4.86, 1], [5.0, 0.55],
  [5.12, 0.97],
];
const PICARDIA: Clave[] = [[0, 0], [0.58, 0], [0.76, 1], [1.0, 1], [1.14, 0], [2.2, 0], [2.4, 1], [2.76, 1], [2.8, 0, E.lin], [4.18, 0], [4.36, 0.5]];
const SONRISA: Clave[] = [[0, 0], [0.7, 0], [0.82, 1], [1.0, 1], [1.12, 0], [2.36, 0], [2.5, 1], [2.78, 1], [2.86, 0], [4.3, 0], [4.46, 1], [4.98, 1], [5.1, 0.4]];

const RAD = Math.PI / 180;
const H90 = Math.PI / 2;

// ---------------------------------------------------------------- los materiales del gato
const mats = () => {
  const comun = {color: COL_GATO.lomo, vientre: COL_GATO.vientre, raya: COL_GATO.raya, rim: RIM};
  return {
    torso: pelo({...comun, rayas: 0.85, eje: [0, 1, 0], freq: 10.5}),
    cadera: pelo({...comun, rayas: 0.8, eje: [0.9, 0.45, 0], freq: 9}),
    cuello: pelo({...comun, rayas: 0.5, eje: [0, 1, 0], freq: 0.07, escala: 1}),
    cabeza: pelo({...comun, rayas: 0.75, eje: [0, 0, 1], freq: 15, dorso: [0.1, 1, 0], rayasDir: [0.3, 1, 0]}),
    moflete: pelo({...comun, rayas: 0.55, eje: [0, 1, 0], freq: 11, dorso: [0, 1, 0], rayasDir: [-0.2, 0.6, 0.3]}),
    parpado: pelo({color: '#EA7A2C', rim: RIM, rimFuerza: 0.5}),
    pata: pelo({...comun, rayas: 0.7, eje: [0, 1, 0], freq: 9, dorso: [-0.6, 0.6, 0.3], rayasDir: [-0.4, 0.5, 0.6]}),
    oreja: pelo({...comun, dorso: [0, 0, -1]}),
    cola: pelo({...comun, rayas: 0.95, freq: 0.12, escala: 60, largo: true, dorso: [-0.5, 0.6, 0.6], rayasDir: [0, 0.3, 1], terciopelo: 0.25}),
    blanco: pelo({color: COL_GATO.blanco, vientre: '#E9E3DC', rim: RIM, dorso: [0, 1, 0.4]}),
    dentro: pelo({color: COL_GATO.dentro, rim: '#FF9B70', rimFuerza: 0.6, emite: '#FF8A6A', emiteFuerza: 0.42}),
    nariz: liso(COL_GATO.nariz, {rough: 0.32, capa: 0.6, capaRough: 0.2, refleja: 0.5}),
    boca: liso(COL_GATO.boca, {rough: 0.6}),
    lengua: liso(COL_GATO.lengua, {rough: 0.3, capa: 0.5, refleja: 0.4}),
    bigote: liso(COL_GATO.bigote, {rough: 0.4, emite: '#FFF2DE', fuerza: 0.35}),
    borde: liso(COL_GATO.borde, {rough: 0.6}),
    brillo: liso('#FFFFFF', {emite: '#FFFFFF', fuerza: 2.2}),
    almohadilla: liso(COL_GATO.almohadilla, {rough: 0.45}),
  };
};
type Mats = ReturnType<typeof mats>;

// un trozo del cuerpo: un ovoide (la elipse de escena.ts con su fondo rz)
const Ovoide: React.FC<{e: Elipse; rz: number; z?: number; mat: THREE.Material; children?: React.ReactNode}> = ({e, rz, z = 0, mat, children}) => (
  <group position={[e.c[0], -e.c[1], z]} rotation={[0, 0, -e.ang]}>
    <mesh geometry={geoEsfera()} material={mat} scale={[e.rx, e.ry, rz]} castShadow receiveShadow />
    {children}
  </group>
);

// ---------------------------------------------------------------- la cabeza
const A = 94, B = 88, C = 102; // la cabeza: hacia el hocico, hacia arriba y de lado a lado
const YAW0 = 0.82; // de «lado», tres cuartos: se leen los dos ojos
const RE = 35; // el radio del ojo: grande, de película
const CABEZA = 1.2; // la cabeza, más grande que en los estilos planos: es un gatito de dibujo animado
const OJO: V3 = (() => {
  const d = n3([Math.cos(6 * RAD) * Math.cos(29 * RAD), Math.sin(6 * RAD), Math.cos(6 * RAD) * Math.sin(29 * RAD)]);
  const t = 1 / Math.sqrt((d[0] / A) ** 2 + (d[1] / B) ** 2 + (d[2] / C) ** 2);
  return mul3(d, t - RE * 0.7); // hundido en la cabeza: si sale mucho, al girar parecen gafas
})();

const Ojo: React.FC<{c: V3; lado: 1 | -1; parp: number; pic: number; yaw: number; incl: number; m: Mats}> = ({c, lado, parp, pic, yaw, incl, m}) => {
  // el párpado: media esfera de pelo que gira sobre el ojo (abierto = metida detrás) y se inclina hacia la nariz cuando trama
  let beta = Math.asin(clamp(1 - 2 * Math.min(parp, 1), -1, 1));
  if (parp < 0.14) beta += (1 - parp / 0.14) * 0.5;
  const sigma = -lado * pic * 0.12; // la inclinación pícara (más, y parece enfadado)
  return (
    <group position={c}>
      <mesh geometry={geoEsfera()} material={iris()} scale={[RE, RE, RE]} />
      {/* la córnea: solo los reflejos, encima */}
      <mesh geometry={geoEsfera()} material={cornea()} position={[RE * 0.08, 0, 0]} scale={[RE * 1.0, RE * 1.0, RE * 1.0]} renderOrder={3} />
      {/* los brillos del ojo: se quedan mirando a la luz aunque la cabeza gire (deshacen el giro) */}
      <group rotation={[0, yaw, 0]}>
        <group rotation={[0, 0, incl]}>
          <mesh geometry={geoEsfera()} material={m.brillo} position={mul3(n3([0.42, 0.5, 0.76]), RE * 1.02)} scale={[RE * 0.2, RE * 0.2, RE * 0.06]} />
          <mesh geometry={geoEsfera()} material={m.brillo} position={mul3(n3([-0.32, -0.36, 0.88]), RE * 1.02)} scale={[RE * 0.085, RE * 0.085, RE * 0.03]} />
        </group>
      </group>
      <group rotation={[sigma, 0, beta]}>
        <mesh geometry={geoEsfera(Math.PI / 2)} material={m.parpado} scale={[RE * 1.07, RE * 1.07, RE * 1.07]} castShadow receiveShadow />
        {/* el canto del párpado, oscuro: es lo que hace que se lea la mirada (con el ojo abierto, metido detrás, no se pinta) */}
        <group rotation={[0, H90, 0]} visible={parp > 0.16}>
          <mesh geometry={geoAro(RE * 1.06, 2.6, Math.PI)} material={m.borde} rotation={[H90, 0, 0]} />
        </group>
      </group>
    </group>
  );
};

const Oreja: React.FC<{lado: 1 | -1; atras: number; tic: number; m: Mats}> = ({lado, atras, tic, m}) => {
  const base: V3 = [-12, 58, lado * 58];
  const dir = n3([-0.1, 1, lado * 0.42]);
  const L = 92;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir));
  return (
    <group position={base} rotation={[lado * (0.6 * atras + 0.18 * tic), 0, 0.55 * atras + 0.32 * tic]}>
      <group quaternion={q}>
        {/* la oreja: un cono redondeado, aplastado de delante a atrás */}
        <group scale={[0.42, 1, 1]}>
          <Capsula a={[0, 0, 0]} b={[0, L, 0]} ra={40} rb={7} mat={m.oreja} />
        </group>
        {/* lo de dentro, rosa y encendido por la luz que la atraviesa */}
        <group position={[13, 8, 0]} scale={[0.22, 1, 1]}>
          <Capsula a={[0, 0, 0]} b={[0, L * 0.74, 0]} ra={27} rb={5} mat={m.dentro} sombra={false} />
        </group>
      </group>
    </group>
  );
};

const Bigotes: React.FC<{lado: 1 | -1; t: number; m: Mats}> = ({lado, t, m}) => {
  const P0: V3 = [90, -24, lado * 22];
  return (
    <>
      {[0, 1, 2].map((j) => {
        const s = sum3(P0, mul3(n3([0.5, 0.25 - 0.24 * j, lado * 0.85]), 18));
        const vib = 1.6 * Math.sin(t * 7 + j);
        const mid = sum3(s, [2, 3 - 3 * j + vib * 0.5, lado * 52]);
        const e = sum3(s, [-10, -2 - 12 * j + vib, lado * 104]);
        return (
          <group key={j}>
            <Capsula a={s} b={mid} ra={2.1} rb={1.8} mat={m.bigote} sombra={false} />
            <Capsula a={mid} b={e} ra={1.8} rb={1.1} mat={m.bigote} sombra={false} />
          </group>
        );
      })}
    </>
  );
};

const Cabeza: React.FC<{g: Gato; t: number; m: Mats}> = ({g, t, m}) => {
  const yaw = mix(YAW0, Math.PI / 2, g.giro);
  const parp = kv(t, PARPADO), pic = kv(t, PICARDIA), sm = kv(t, SONRISA);
  // la mirada y la pupila, de los ojos que devuelve la escena
  const o = g.ojoCerca;
  const dil = clamp((o.pupila.rx - 3.6) / Math.max(1, o.rx * 0.64 - 3.6));
  const dc: P = [o.pupila.c[0] - o.c[0], o.pupila.c[1] - o.c[1]];
  const pc: P = [dc[0] * Math.cos(-g.inclina) - dc[1] * Math.sin(-g.inclina), dc[0] * Math.sin(-g.inclina) + dc[1] * Math.cos(-g.inclina)];
  const mx = pc[0] / (0.36 * o.rx), my = pc[1] / (0.3 * o.ry);
  const tic = (t0: number) => pulso(t, t0, 0.06, 0.22);
  const atras = pulso(t, T_SUELO, 0.07, 0.35);
  const lame = g.lengua ? clamp((g.lengua.ry - 5) / 9) : 0;
  const asombro = t >= T_SUELO && t < 3.95; // la boca abierta del «¡oh!»
  const H = g.cabeza.c;
  // la pupila (pintada en el iris): hacia dónde mira y cómo de abierta (rendija cuando trama, redonda y enorme cuando se asusta)
  const u = iris().userData.u;
  u.uMira.value.set(1, 0, 0).applyEuler(new THREE.Euler(0, mx * 0.3, -my * 0.36));
  u.uAncho.value = mix(0.09, 0.5, dil);
  u.uAlto.value = mix(0.6, 0.56, dil);
  return (
    <group position={[H[0], -H[1], 8]} rotation={[0, 0, -g.inclina]}>
      <group rotation={[0, -yaw, 0]} scale={[CABEZA, CABEZA, CABEZA]}>
        <mesh geometry={geoEsfera()} material={m.cabeza} scale={[A, B, C]} castShadow receiveShadow />
        {/* los mofletes, anchos y mullidos (los de un gatito) */}
        {([1, -1] as const).map((lado) => (
          <mesh key={lado} geometry={geoEsfera()} material={m.moflete} position={[22, -34, lado * 66]} scale={[44, 40, 42]} castShadow receiveShadow />
        ))}
        {/* el hocico blanco: las dos almohadillas de los bigotes, la barbilla y la nariz */}
        {([1, -1] as const).map((lado) => (
          <mesh key={lado} geometry={geoEsfera()} material={m.blanco} position={[84, -26, lado * 19]} scale={[22, 20, 22]} castShadow receiveShadow />
        ))}
        <mesh geometry={geoEsfera()} material={m.blanco} position={[72, asombro ? -62 : -52, 0]} scale={[17, 14, 19]} castShadow receiveShadow />
        <mesh geometry={geoEsfera()} material={m.blanco} position={[60, -6, 0]} scale={[30, 26, 30]} receiveShadow />
        <mesh geometry={geoEsfera()} material={m.nariz} position={[101, -8, 0]} scale={[9, 8, 14]} castShadow />
        {/* la boca: la raya del centro y la sonrisa de lado (más alta por un lado: la de «lo voy a hacer»), o la «o» del susto */}
        <Capsula a={[100, -15, 0]} b={[97, -38, 0]} ra={2} rb={2} mat={m.boca} sombra={false} />
        {asombro ? (
          <mesh geometry={geoEsfera()} material={m.boca} position={[90, -47, 0]} scale={[6, 11, 10]} />
        ) : (
          ([1, -1] as const).map((lado) => {
            const k = lado > 0 ? 1.35 : 0.65;
            const pts: V3[] = [[97, -38, 0], [93, -44, lado * 9], [86, -44 + 6 * sm * k, lado * 19], [79, -38 + 13 * sm * k, lado * 26]];
            return (
              <group key={lado}>
                {pts.slice(0, -1).map((a, i) => <Capsula key={i} a={a} b={pts[i + 1]} ra={2.2} rb={2} mat={m.boca} sombra={false} />)}
              </group>
            );
          })
        )}
        {lame > 0.02 && <mesh geometry={geoEsfera()} material={m.lengua} position={[92, -50 - 7 * lame, 0]} scale={[6, 6 + 6 * lame, 9]} />}
        <Bigotes lado={1} t={t} m={m} />
        <Bigotes lado={-1} t={t} m={m} />
        <Ojo c={OJO} lado={1} parp={parp} pic={pic} yaw={yaw} incl={g.inclina} m={m} />
        <Ojo c={[OJO[0], OJO[1], -OJO[2]]} lado={-1} parp={parp} pic={pic} yaw={yaw} incl={g.inclina} m={m} />
        {/* las orejas: un tic al tramar, hacia atrás al romperse la taza, otro al lamerse */}
        <Oreja lado={1} atras={atras} tic={tic(0.84) + tic(5.55)} m={m} />
        <Oreja lado={-1} atras={atras} tic={tic(1.62)} m={m} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- las patas de delante: hombro, codo, mano y el pie con sus dedos
const PataGato: React.FC<{pt: Pata; z: [number, number]; m: Mats; lamer?: V3 | null; w?: number}> = ({pt, z, m, lamer = null, w = 0}) => {
  const W = (q: P, zz: number): V3 => [q[0], -q[1], zz];
  const ho = W(pt.hombro, z[0]);
  let co = W(pt.codo, mix(z[0], z[1], 0.5)), ma = W(pt.mano, z[1]);
  if (lamer && w > 0) {
    ma = mix3(ma, lamer, w);
    co = [co[0], co[1], mix(co[2], lamer[2] * 0.6, w)];
  }
  const mid = mix3(co, ma, 0.45);
  const pie = {c: [ma[0] + pt.pie.c[0] - pt.mano[0], -(ma[1] - (pt.pie.c[1] - pt.mano[1]))] as P, ang: pt.pie.ang};
  return (
    <group>
      <Capsula a={ho} b={co} ra={32} rb={25} mat={m.pata} />
      <Capsula a={co} b={mid} ra={25} rb={22} mat={m.pata} />
      <Capsula a={mid} b={ma} ra={22} rb={20} mat={m.blanco} />
      <group position={[pie.c[0], -pie.c[1], ma[2]]} rotation={[0, 0, -pie.ang]}>
        <mesh geometry={geoEsfera()} material={m.blanco} scale={[33, 17, 25]} castShadow receiveShadow />
        {[-12, 0, 12].map((dz, i) => (
          <mesh key={i} geometry={geoEsfera()} material={m.blanco} position={[24, 5, dz]} scale={[10, 9, 9]} castShadow receiveShadow />
        ))}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- la cola: un tubo liso que adelgaza (se rehace en cada cuadro)
const ANILLO = 22;
const N_COLA = 48;
let colaGeo: THREE.BufferGeometry | null = null;
const geoCola = (pts: V3[], radios: number[]): THREE.BufferGeometry => {
  // la curva suave por los puntos de la escena, remuestreada
  const curva = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)), false, 'centripetal');
  const ps = curva.getSpacedPoints(N_COLA - 1);
  const marcos = curva.computeFrenetFrames(N_COLA - 1, false);
  const total = curva.getLength();
  if (!colaGeo) {
    colaGeo = new THREE.BufferGeometry();
    colaGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N_COLA * (ANILLO + 1) * 3), 3));
    colaGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N_COLA * (ANILLO + 1) * 3), 3));
    colaGeo.setAttribute('aLargo', new THREE.BufferAttribute(new Float32Array(N_COLA * (ANILLO + 1)), 1));
    const idx: number[] = [];
    for (let i = 0; i < N_COLA - 1; i++) for (let j = 0; j < ANILLO; j++) {
      const a = i * (ANILLO + 1) + j, b = a + ANILLO + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1); // (en este orden la cara mira hacia fuera)
    }
    colaGeo.setIndex(idx);
  }
  const pos = colaGeo.attributes.position as THREE.BufferAttribute;
  const nor = colaGeo.attributes.normal as THREE.BufferAttribute;
  const lar = colaGeo.attributes.aLargo as THREE.BufferAttribute;
  for (let i = 0; i < N_COLA; i++) {
    const k = i / (N_COLA - 1);
    const fi = k * (radios.length - 1);
    const i0 = Math.floor(fi), i1 = Math.min(radios.length - 1, i0 + 1);
    let r = mix(radios[i0], radios[i1], fi - i0);
    if (k > 0.94) r *= Math.sqrt(Math.max(0.02, 1 - (k - 0.94) / 0.06)); // la punta, redonda
    const N = marcos.normals[i], Bn = marcos.binormals[i];
    for (let j = 0; j <= ANILLO; j++) {
      const a = (j / ANILLO) * Math.PI * 2;
      const nx = Math.cos(a) * N.x + Math.sin(a) * Bn.x, ny = Math.cos(a) * N.y + Math.sin(a) * Bn.y, nz = Math.cos(a) * N.z + Math.sin(a) * Bn.z;
      const v = i * (ANILLO + 1) + j;
      pos.setXYZ(v, ps[i].x + nx * r, ps[i].y + ny * r, ps[i].z + nz * r);
      nor.setXYZ(v, nx, ny, nz);
      lar.setX(v, k * total);
    }
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  lar.needsUpdate = true;
  colaGeo.computeBoundingSphere();
  return colaGeo;
};

// ---------------------------------------------------------------- el gato entero
export const GatoPelicula: React.FC<{g: Gato; t: number}> = ({g, t}) => {
  const m = mats();
  const S = ESCALA_GATO;
  const tor = g.torso, cad = g.cadera, pec = g.pecho;
  // dónde está el hocico de verdad (la cabeza gira en 3D): ahí va la pata al lamerse
  const wLame = kv(t, [[4.95, 0], [5.15, 1]]);
  const lamer: V3 | null = (() => {
    if (wLame <= 0) return null;
    const yaw = mix(YAW0, Math.PI / 2, g.giro);
    const lx = 88 * CABEZA, ly = -52 * CABEZA;
    const x1 = lx * Math.cos(yaw), z1 = lx * Math.sin(yaw);
    const a = -g.inclina;
    return [g.cabeza.c[0] + x1 * Math.cos(a) - ly * Math.sin(a), -g.cabeza.c[1] + x1 * Math.sin(a) + ly * Math.cos(a) - 6, 8 + z1 + 14];
  })();
  // la cola, detrás del cuerpo; los radios, un poco más gordos (mullida)
  const colaPts: V3[] = g.cola.pts.map((q, i) => [q[0], -q[1], -40 - 4 * Math.sin(i * 0.4)]);
  const colaR = g.cola.r.map((r) => r * 1.22);
  const pieT = (z: number) => (
    <group position={[g.pieTrasero.c[0], -g.pieTrasero.c[1], z]} rotation={[0, 0, -g.pieTrasero.ang]}>
      <mesh geometry={geoEsfera()} material={m.blanco} scale={[56, 20, 28]} castShadow receiveShadow />
      {[-11, 0, 11].map((dz, i) => (
        <mesh key={i} geometry={geoEsfera()} material={m.blanco} position={[50, 4, dz]} scale={[10, 9, 9]} castShadow receiveShadow />
      ))}
    </group>
  );
  return (
    <group position={[300 * (1 - S), -1010 * (1 - S), 0]} scale={[S, S, S]} dispose={null}>
      {/* la sombra de contacto en la mesa, donde se sienta */}
      <Contacto x={330} y={1010} w={360} d={220} op={0.55} />

      {/* lo del otro lado, detrás */}
      <PataGato pt={g.pataLejos} z={[-44, -40]} m={m} />
      {pieT(-64)}
      <mesh geometry={geoCola(colaPts, colaR)} material={m.cola} castShadow receiveShadow />
      <mesh geometry={geoEsfera()} material={m.cola} position={colaPts[0]} scale={[colaR[0], colaR[0], colaR[0]]} />

      {/* el cuerpo: la cadera, el lomo, el pecho con el babero blanco y la barriga */}
      <Ovoide e={cad} rz={94} mat={m.cadera} />
      <Ovoide e={tor} rz={82} mat={m.torso} />
      <Ovoide e={pec} rz={74} mat={m.torso}>
        <mesh geometry={geoEsfera()} material={m.blanco} position={[28, -6, 8]} scale={[pec.rx * 0.58, pec.ry * 0.9, 50]} castShadow receiveShadow />
      </Ovoide>
      <Ovoide e={g.barriga} rz={82} mat={m.blanco} />
      <Capsula a={[g.cuello[0][0], -g.cuello[0][1], 0]} b={[g.cuello[1][0], -g.cuello[1][1], 0]} ra={62} rb={58} mat={m.torso} />
      <Capsula a={[g.cuello[0][0] + 24, -g.cuello[0][1], 10]} b={[g.cuello[1][0] + 22, -g.cuello[1][1] - 20, 10]} ra={42} rb={36} mat={m.blanco} />

      <Cabeza g={g} t={t} m={m} />

      {/* lo de este lado, delante */}
      {pieT(64)}
      <PataGato pt={g.pataCerca} z={[46, 36]} m={m} lamer={lamer} w={wLame} />
    </group>
  );
};
