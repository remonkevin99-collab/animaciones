import React from 'react';
import * as THREE from 'three';
import {E, clamp, mix, p} from '../../../comun/curvas';
import {ESCALA_GATO, MESA_Y, T_SUELO, type Elipse, type Gato, type Ojo, type P, type Pata} from '../../gato/escena';
import {Mancha, Palo} from './mundo';
import {type V3, azar, bolaGeo, conoGeo, geo, mat, orienta, planoGeo, textura, texturaViva, trama, troncoGeo} from './retro';

// VIDEOJUEGO RETRO, EL GATO: el gato de la escena como el protagonista de un juego 3D de principios de los
// 2000: pocas caras y sombreado plano (se ven las facetas), pelaje naranja con las rayas pintadas en una textura de 32 px sin
// filtrar, el babero, el hocico y los calcetines blancos, orejas de pirámide y mechones de pincho en los mofletes. Los OJOS Y LA
// BOCA SON TEXTURAS que se repintan en cada cuadro (como las caras de los muñecos de entonces): el párpado de «lo voy a hacer», la
// pupila que pasa de rendija a redonda y su brillo, todo a 24 px. La cabeza gira de verdad en 3D (de tres cuartos a mirarte).
// La postura y los tiempos salen de gato(t) de la escena; coordenadas del dibujo del gato con la y hacia arriba y z hacia la cámara,
// y se pinta 1,14 veces más grande desde donde se sienta, como en los estilos planos.

const C = {
  pelo: '#ff8a1c', pelo2: '#ffa43a', raya: '#b8460c', raya2: '#e06a10', blanco: '#fff6e6', blanco2: '#ffe2c2',
  rosa: '#ff8fb5', rosa2: '#ff5c95', oscuro: '#2a0f05', iris: '#d9f23a', iris2: '#9ccb10', pupila: '#120814',
};

// ---------------------------------------------------------------- las texturas del pelo (fijas)
const pelajeTex = () => textura('pelaje', 64, 64, (x, y) => {
  // las rayas van en anillos alrededor de cada bola del cuerpo: una cada 16 px, que va y viene y se corta por algunos sitios, y motas
  const ola = Math.round(1.5 * Math.sin(x * 0.4) + azar(x >> 2, 1, 5));
  const fila = (y + ola + 64) % 16;
  const corta = azar(x >> 4, (y + 4) >> 4, 9) < 0.25;
  if (!corta && (fila < 3 || (fila === 3 && azar(x, y, 6) < 0.5))) return C.raya;
  if (!corta && fila === 4 && azar(x, y, 7) < 0.35) return C.raya2;
  const r = azar(x, y, 8);
  return r < 0.07 ? C.pelo2 : C.pelo;
});
const blancoTex = () => textura('blanco', 16, 16, (x, y) => (azar(x, y, 14) < 0.12 ? C.blanco2 : C.blanco));
const caraTex = () => textura('cara', 32, 32, (x, y) => {
  const r = azar(x, y, 12);
  // la «M» de la frente (arriba, hacia el hocico, que es u = 0,5), las rayas de los mofletes y la barbilla clara
  const centro = x === 16 || x === 17;
  if ((centro && y >= 2 && y <= 11) || ([12, 13, 20, 21].includes(x) && y >= 3 && y <= 9)) return y > 8 && !centro ? C.raya2 : C.raya;
  if (y >= 15 && y <= 21 && (y === 16 || y === 19) && ((x >= 5 && x <= 10) || (x >= 22 && x <= 27))) return C.raya;
  if (y >= 20 && x >= 12 && x <= 20) return trama(x, y, 0.2) ? C.blanco2 : C.blanco;
  return r < 0.07 ? C.pelo2 : C.pelo;
});
const colaTex = () => textura('cola', 8, 8, (x, y) => (azar(x, y, 13) < 0.1 ? C.pelo2 : C.pelo));

// ---------------------------------------------------------------- los ojos y la boca: texturas vivas
const dentroPoli = (q: P, poly: P[]) => {
  let s = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > q[1] !== yj > q[1] && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) s = !s;
  }
  return s;
};
// el ojo de la escena pasado a su círculo unidad (sin el escorzo del dibujo plano: el 3D ya lo pone)
const normaliza = (o: Ojo, q: P): P => {
  const dx = q[0] - o.c[0], dy = q[1] - o.c[1];
  const c = Math.cos(-o.ang), s = Math.sin(-o.ang);
  return [(dx * c - dy * s) / o.rx, (dx * s + dy * c) / o.ry];
};
const N_OJO = 24;
const pintaOjo = (clave: string, o: Ojo) => {
  const viva = texturaViva(clave, N_OJO, N_OJO);
  const vis = o.visible.map((q) => normaliza(o, q));
  const pc = normaliza(o, o.pupila.c);
  const pw = o.pupila.rx / o.rx, ph = o.pupila.ry / o.ry;
  const br = normaliza(o, o.brillo);
  viva.pinta((x, y) => {
    const u = ((x + 0.5) / N_OJO) * 2 - 1, v = ((y + 0.5) / N_OJO) * 2 - 1;
    const r2 = u * u + v * v;
    if (r2 > 1) return null;
    if (r2 > 0.76) return C.oscuro; // el contorno
    if (o.cerrado) {
      // cerrado: pelo con la raya del párpado (el arco de la escena, ya en su círculo)
      return Math.abs(v - (0.12 - 0.42 * (1 - u * u))) < 0.13 ? C.oscuro : C.pelo;
    }
    const q: P = [u, v];
    if (!dentroPoli(q, vis)) {
      // el párpado: pelo, con su canto oscuro justo encima de lo que se ve
      return dentroPoli([u, v + 2.2 / N_OJO], vis) ? C.oscuro : C.pelo;
    }
    // la pupila, el brillo y el iris (más oscuro arriba, bajo el párpado, y en el aro)
    if (((u - pc[0]) / pw) ** 2 + ((v - pc[1]) / ph) ** 2 <= 1) {
      return Math.abs(u - br[0]) < 0.13 && Math.abs(v - br[1]) < 0.13 ? '#ffffff' : C.pupila;
    }
    if (Math.abs(u - br[0]) < 0.13 && Math.abs(v - br[1]) < 0.13) return '#ffffff';
    if (r2 > 0.5) return C.iris2;
    return trama(x, y, clamp(0.55 - v * 0.6)) ? C.iris : '#f4ff8a';
  });
  return viva.tex;
};
const pintaBoca = (sm: number, asombro: boolean, lame: number) => {
  const viva = texturaViva('boca', 24, 14);
  // la boca vista de frente: la raya que baja de la nariz y la sonrisa de lado (más alta por un lado), o la «o» del susto
  const k1 = 1.35 * sm, k2 = 0.65 * sm;
  const izq: P[] = [[12, 3], [9.5, 6.5], [6, 7 - 2.2 * k1], [2.5, 5.5 - 4 * k1]];
  const der: P[] = [[12, 3], [14.5, 6.5], [18, 7 - 2.2 * k2], [21.5, 5.5 - 4 * k2]];
  const dSeg = (q: P, a: P, b: P) => {
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const k = clamp(((q[0] - a[0]) * abx + (q[1] - a[1]) * aby) / (abx * abx + aby * aby));
    return Math.hypot(q[0] - a[0] - abx * k, q[1] - a[1] - aby * k);
  };
  const dLinea = (q: P, l: P[]) => Math.min(...l.slice(0, -1).map((a, i) => dSeg(q, a, l[i + 1])));
  viva.pinta((x, y) => {
    const q: P = [x + 0.5, y + 0.5];
    if (asombro) {
      const r = ((q[0] - 12) / 4) ** 2 + ((q[1] - 7.5) / 5) ** 2;
      if (r <= 1) return r < 0.45 ? C.rosa2 : C.oscuro;
      return dSeg(q, [12, 0], [12, 2.6]) < 0.8 ? C.oscuro : null;
    }
    if (lame > 0.05 && ((q[0] - 12) / 3.2) ** 2 + ((q[1] - 7 - 3 * lame) / (2 + 3 * lame)) ** 2 <= 1) return C.rosa2;
    if (dSeg(q, [12, 0], [12, 3]) < 0.8 || dLinea(q, izq) < 0.85 || dLinea(q, der) < 0.85) return C.oscuro;
    return null;
  });
  return viva.tex;
};

// ---------------------------------------------------------------- piezas
type Mats = Record<'pelo' | 'cara' | 'blanco' | 'raya' | 'rosa' | 'oscuro' | 'bigote' | 'cola' | 'colaRaya', THREE.Material>;
const matsGato = (): Mats => ({
  pelo: mat('g-pelo', {mapa: pelajeTex()}),
  cara: mat('g-cara', {mapa: caraTex()}),
  blanco: mat('g-blanco', {mapa: blancoTex(), emite: '#3a2c26'}), // un pelo de luz propia: si no, lo blanco en sombra sale gris morado
  raya: mat('g-raya', {color: C.raya}),
  rosa: mat('g-rosa', {color: C.rosa, brillo: 20}),
  oscuro: mat('g-oscuro', {color: C.oscuro}),
  bigote: mat('g-bigote', {color: '#ffffff', emite: '#666666'}),
  cola: mat('g-cola', {mapa: colaTex()}),
  colaRaya: mat('g-cola-raya', {color: C.raya}),
});

const Ovoide: React.FC<{e: Elipse; rz: number; z?: number; m: THREE.Material; seg?: [number, number]; children?: React.ReactNode}> = ({e, rz, z = 0, m, seg = [10, 8], children}) => (
  <group position={[e.c[0], -e.c[1], z]} rotation={[0, 0, -e.ang]}>
    <mesh geometry={bolaGeo(seg[0], seg[1])} material={m} scale={[e.rx, e.ry, rz]} />
    {children}
  </group>
);
// un tramo de tubo de a a b que adelgaza (de ra a rb), con una bola en cada junta para que no se abra
const Tramo: React.FC<{a: V3; b: V3; ra: number; rb: number; m: THREE.Material; lados?: number; juntas?: boolean}> = ({a, b, ra, rb, m, lados = 6, juntas = true}) => {
  const {L, quat} = orienta(a, b);
  return (
    <>
      <mesh geometry={troncoGeo(ra, rb, lados)} material={m} position={a} quaternion={quat} scale={[ra, L, ra]} />
      {juntas && <mesh geometry={bolaGeo(lados, 4)} material={m} position={b} scale={[rb, rb, rb]} />}
    </>
  );
};
// un pincho (oreja, mechón): una pirámide desde la base a hacia la dirección d
const Pincho: React.FC<{a: V3; d: V3; L: number; r: number; m: THREE.Material; plano?: number; lados?: number}> = ({a, d, L, r, m, plano = 1, lados = 4}) => {
  const n = Math.hypot(d[0], d[1], d[2]) || 1;
  const b: V3 = [a[0] + (d[0] / n) * L, a[1] + (d[1] / n) * L, a[2] + (d[2] / n) * L];
  const {quat} = orienta(a, b);
  return (
    <group position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={quat}>
      <mesh geometry={conoGeo(lados)} material={m} scale={[r * plano, L, r]} />
    </group>
  );
};

// ---------------------------------------------------------------- la cabeza
const A = 96, B = 88, Cz = 104; // hacia el hocico, hacia arriba y de lado a lado
const YAW0 = 0.8; // de «lado», tres cuartos
const CABEZA = 1.15;
const n3 = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
// dónde va el ojo en la cabeza y hacia dónde mira su cara
const OJO = (() => {
  const RAD = Math.PI / 180;
  const d = n3([Math.cos(9 * RAD) * Math.cos(33 * RAD), Math.sin(9 * RAD), Math.cos(9 * RAD) * Math.sin(33 * RAD)]);
  const k = 1 / Math.sqrt((d[0] / A) ** 2 + (d[1] / B) ** 2 + (d[2] / Cz) ** 2);
  const pos: V3 = [d[0] * k, d[1] * k, d[2] * k];
  const nor = n3([pos[0] / A ** 2, pos[1] / B ** 2, pos[2] / Cz ** 2]);
  return {pos: [pos[0] + nor[0] * 3, pos[1] + nor[1] * 3, pos[2] + nor[2] * 3] as V3, nor};
})();
const quatDe = (nor: V3) => {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...nor));
  return [q.x, q.y, q.z, q.w] as [number, number, number, number];
};
const Q_OJO = quatDe(OJO.nor);
const Q_OJO2 = quatDe([OJO.nor[0], OJO.nor[1], -OJO.nor[2]]);

type Curva = (x: number) => number;
const kv = (t: number, claves: [number, number, Curva?][], def: Curva = E.inOutCubic) => {
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
const SONRISA: [number, number][] = [[0, 0], [0.7, 0], [0.82, 1], [1.0, 1], [1.12, 0], [2.36, 0], [2.5, 1], [2.78, 1], [2.86, 0], [4.3, 0], [4.46, 1], [4.98, 1], [5.1, 0.4]];

const Cabeza: React.FC<{g: Gato; t: number; m: Mats}> = ({g, t, m}) => {
  const yaw = mix(YAW0, Math.PI / 2, g.giro);
  const sm = kv(t, SONRISA);
  const asombro = t >= T_SUELO && t < 3.95;
  const lame = g.lengua ? clamp((g.lengua.ry - 5) / 9) : 0;
  const atras = pulso(t, T_SUELO, 0.07, 0.35);
  const tic = (t0: number) => pulso(t, t0, 0.06, 0.22);
  const ojo1 = pintaOjo('ojo-cerca', g.ojoCerca);
  const ojo2 = pintaOjo('ojo-lejos', g.ojoLejos);
  const boca = pintaBoca(sm, asombro, lame);
  const H = g.cabeza.c;
  const oreja = (lado: 1 | -1, ticK: number) => {
    const giroOreja = 0.55 * atras + 0.32 * ticK;
    const d = n3([-0.14 - 0.5 * giroOreja, 1, lado * (0.44 + 0.3 * giroOreja)]);
    const a: V3 = [-14, 58, lado * 54];
    return (
      <group key={lado}>
        <Pincho a={a} d={d} L={92} r={42} m={m.pelo} plano={0.42} />
        <Pincho a={[a[0] + 10, a[1] + 4, a[2] - lado * 2]} d={d} L={70} r={26} m={m.rosa} plano={0.3} />
      </group>
    );
  };
  return (
    <group position={[H[0], -H[1], 6]} rotation={[0, 0, -g.inclina]}>
      <group rotation={[0, -yaw, 0]} scale={[CABEZA, CABEZA, CABEZA]}>
        <mesh geometry={bolaGeo(10, 8)} material={m.cara} scale={[A, B, Cz]} />
        {/* los mechones de los mofletes: pinchos hacia fuera y abajo */}
        {([1, -1] as const).map((lado) => (
          <group key={lado}>
            <Pincho a={[18, -26, lado * 78]} d={[-0.2, -0.45, lado]} L={52} r={30} m={m.pelo} />
            <Pincho a={[-8, -10, lado * 88]} d={[-0.5, -0.2, lado]} L={42} r={26} m={m.pelo} />
          </group>
        ))}
        {/* el hocico: dos almohadillas, la barbilla, la nariz y la boca pintada */}
        <mesh geometry={bolaGeo(7, 5)} material={m.blanco} position={[88, -24, 19]} scale={[24, 21, 23]} />
        <mesh geometry={bolaGeo(7, 5)} material={m.blanco} position={[88, -24, -19]} scale={[24, 21, 23]} />
        <mesh geometry={bolaGeo(6, 4)} material={m.blanco} position={[78, asombro ? -56 : -48, 0]} scale={[17, 14, 18]} />
        <mesh geometry={geo('nariz', () => new THREE.OctahedronGeometry(1, 0))} material={m.rosa} position={[106, -6, 0]} scale={[9, 8, 13]} />
        <mesh geometry={planoGeo()} material={mat('boca', {mapa: boca, recorte: true})} position={[108.5, -30, 0]} rotation={[0, Math.PI / 2, 0]}
          scale={[46, 27, 1]} />
        {/* los bigotes */}
        {([1, -1] as const).map((lado) => [0, 1, 2].map((j) => {
          const vib = 1.5 * Math.sin(t * 7 + j);
          const a: V3 = [96, -20 - 5 * j, lado * 32];
          const b: V3 = [82, -10 - 14 * j + vib, lado * 130];
          return <Palo key={`${lado}-${j}`} a={a} b={b} r={1.8} m={m.bigote} lados={3} />;
        }))}
        {/* los ojos: dos planos con su textura viva */}
        <mesh geometry={planoGeo()} material={mat('ojo1', {mapa: ojo1, recorte: true, sinLuz: true})} position={OJO.pos} quaternion={Q_OJO} scale={[64, 66, 1]} />
        <mesh geometry={planoGeo()} material={mat('ojo2', {mapa: ojo2, recorte: true, sinLuz: true})} position={[OJO.pos[0], OJO.pos[1], -OJO.pos[2]]}
          quaternion={Q_OJO2} scale={[64, 66, 1]} />
        {oreja(1, tic(0.84) + tic(5.55))}
        {oreja(-1, tic(1.62))}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- las patas
const Pata3: React.FC<{pt: Pata; z: [number, number]; m: Mats; lamer?: V3 | null; w?: number}> = ({pt, z, m, lamer = null, w = 0}) => {
  const W = (q: P, zz: number): V3 => [q[0], -q[1], zz];
  const ho = W(pt.hombro, z[0]);
  let co = W(pt.codo, mix(z[0], z[1], 0.5));
  let ma = W(pt.mano, z[1]);
  if (lamer && w > 0) {
    ma = [mix(ma[0], lamer[0], w), mix(ma[1], lamer[1], w), mix(ma[2], lamer[2], w)];
    co = [co[0], co[1], mix(co[2], lamer[2] * 0.6, w)];
  }
  const mid: V3 = [mix(co[0], ma[0], 0.42), mix(co[1], ma[1], 0.42), mix(co[2], ma[2], 0.42)];
  const pie: V3 = [ma[0] + pt.pie.c[0] - pt.mano[0], ma[1] - (pt.pie.c[1] - pt.mano[1]), ma[2]];
  return (
    <group>
      <mesh geometry={bolaGeo(6, 4)} material={m.pelo} position={ho} scale={[31, 31, 31]} />
      <Tramo a={ho} b={co} ra={31} rb={24} m={m.pelo} />
      <Tramo a={co} b={mid} ra={24} rb={21} m={m.pelo} />
      <Tramo a={mid} b={ma} ra={21} rb={19} m={m.blanco} />
      <group position={pie} rotation={[0, 0, -pt.pie.ang]}>
        <mesh geometry={bolaGeo(7, 4)} material={m.blanco} scale={[32, 17, 25]} />
        {[-11, 0, 11].map((dz, i) => (
          <mesh key={i} geometry={bolaGeo(5, 3)} material={m.blanco} position={[26, 4, dz]} scale={[9, 8, 9]} />
        ))}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- el gato entero
export const GatoRetro: React.FC<{g: Gato; t: number}> = ({g, t}) => {
  const m = matsGato();
  const S = ESCALA_GATO;
  const wLame = kv(t, [[4.95, 0], [5.15, 1]]);
  const lamer: V3 | null = (() => {
    if (wLame <= 0) return null;
    const yaw = mix(YAW0, Math.PI / 2, g.giro);
    const lx = 92 * CABEZA, ly = -52 * CABEZA;
    const x1 = lx * Math.cos(yaw), z1 = lx * Math.sin(yaw);
    const a = -g.inclina;
    return [g.cabeza.c[0] + x1 * Math.cos(a) - ly * Math.sin(a), -g.cabeza.c[1] + x1 * Math.sin(a) + ly * Math.cos(a) - 6, 6 + z1 + 14];
  })();
  // la cola, por detrás: tramos que adelgazan, con un anillo oscuro cada tres
  const zc = -38;
  const cola = g.cola.pts.slice(0, -1).map((a, i) => {
    const b = g.cola.pts[i + 1];
    return (
      <Tramo key={i} a={[a[0], -a[1], zc]} b={[b[0], -b[1], zc]} ra={g.cola.r[i]} rb={g.cola.r[i + 1]} m={i % 3 === 1 ? m.colaRaya : m.cola} />
    );
  });
  const pieT = (z: number) => (
    <group position={[g.pieTrasero.c[0], -g.pieTrasero.c[1], z]}>
      <mesh geometry={bolaGeo(8, 4)} material={m.blanco} scale={[56, 20, 27]} />
    </group>
  );
  return (
    <group>
      {/* la sombra de mancha en la mesa */}
      <Mancha x={360} y={MESA_Y} z={0} rx={250} rz={130} o={0.45} />
      <group position={[300 * (1 - S), -1010 * (1 - S), 0]} scale={[S, S, S]}>
        {/* lo del otro lado, detrás */}
        <Pata3 pt={g.pataLejos} z={[-44, -40]} m={m} />
        {pieT(-64)}
        {cola}
        {/* el cuerpo: la cadera, el lomo, el pecho con su babero, la barriga y el cuello */}
        <Ovoide e={g.cadera} rz={92} m={m.pelo} />
        <Ovoide e={g.torso} rz={80} m={m.pelo} />
        <Ovoide e={g.pecho} rz={72} m={m.pelo}>
          <mesh geometry={bolaGeo(9, 7)} material={m.blanco} position={[26, -8, 6]} scale={[52, 0.88 * g.pecho.ry, 60]} />
        </Ovoide>
        <Ovoide e={g.barriga} rz={80} m={m.blanco} />
        <Tramo a={[g.cuello[0][0], -g.cuello[0][1], 0]} b={[g.cuello[1][0], -g.cuello[1][1], 0]} ra={60} rb={56} m={m.pelo} lados={8} />
        <Tramo a={[g.cuello[0][0] + 22, -g.cuello[0][1], 10]} b={[g.cuello[1][0] + 20, -g.cuello[1][1] - 20, 10]} ra={40} rb={34} m={m.blanco} lados={7} />
        <Cabeza g={g} t={t} m={m} />
        {/* lo de este lado, delante */}
        {pieT(64)}
        <Pata3 pt={g.pataCerca} z={[44, 34]} m={m} lamer={lamer} w={wLame} />
      </group>
    </group>
  );
};
