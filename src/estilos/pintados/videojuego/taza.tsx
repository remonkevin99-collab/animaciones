import React from 'react';
import * as THREE from 'three';
import {E, clamp, mix, p, rng} from '../../../comun/curvas';
import {IMPACTO, MESA_Y, SUELO, T_CAE, T_SUELO, cafe, taza, trozos, vapor, type P} from '../../gato/escena';
import {Mancha, brilloTex, matOro, monedaGeo} from './mundo';
import {geo, gemaGeo, mat, planoGeo, textura, trama} from './retro';

// VIDEOJUEGO RETRO, LA TAZA: una taza roja de ocho caras con su corazón blanco pintado en una textura de
// 32 px, el asa de pocas caras y el café dentro. El vapor son nubecitas de píxeles. Cae girando (también sobre su eje) y al romperse:
// seis trozos de cerámica de canto blanco que saltan más alto que en la escena (en pequeño, si no, no se lee), botan dos
// veces y se quedan inclinados en el suelo; el chorro y la corona de café en gotas de poliedro brillante, el charco que se extiende,
// y lo que la hace de juego: SALTAN MONEDAS de dentro de la taza, que botan y se quedan girando en el suelo con su destello.
// Todo sale de escena.ts (taza, trozos, cafe, vapor).

const ROJO = '#ff2450';
const tazaTex = () => textura('taza', 32, 16, (x, y) => {
  // roja, con una franja blanca arriba y el corazón blanco delante (u = 0 es lo que mira a la cámara, por eso da la vuelta al borde)
  if (y === 2 || y === 3) return '#ffffff';
  if (y < 2) return '#ff6a86';
  // el corazón: dos círculos y la punta abajo
  const dx = Math.abs(Math.min(x, 32 - x) - 0.5), dy = y - 8.5;
  const lobulo = Math.hypot(dx - 2.4, dy + 0.6) < 2.9;
  const punta = dy >= -0.6 && dx <= 5.2 - (dy + 0.6) * 1.05;
  if (lobulo || punta) return '#ffffff';
  return trama(x, y, 0.18) ? '#e0163f' : ROJO;
});
const nubeTex = () => textura('nube-vapor', 16, 16, (x, y) => {
  const r = Math.hypot(x - 7.5, y - 7.5) / 7.5;
  if (r > 1) return null;
  return trama(x, y, 1.3 - r * 1.1) ? '#ffffff' : null;
}, false);

const tazaMats = () => ({
  cuerpo: mat('taza', {mapa: tazaTex(), brillo: 60}),
  rojo: mat('taza-rojo', {color: ROJO, brillo: 60}),
  dentro: mat('taza-dentro', {color: '#fff3e0', doble: true}),
  canto: mat('taza-canto', {color: '#fff8ee', brillo: 30}),
  cafe: mat('cafe', {color: '#6b2a0c', brillo: 90, emite: '#1e0700'}),
  cafe2: mat('cafe-crema', {color: '#a5541c', brillo: 60}),
});

// ---------------------------------------------------------------- la taza entera
const cuerpoGeo = () => geo('taza-cuerpo', () => new THREE.CylinderGeometry(52, 47, 118, 8, 1, true));
const dentroGeo = () => geo('taza-dentro', () => new THREE.CylinderGeometry(45, 41, 112, 8, 1, true));
const bordeGeo = () => geo('taza-borde', () => new THREE.RingGeometry(45, 52, 8, 1));
const fondoGeo = () => geo('taza-fondo', () => new THREE.CircleGeometry(47, 8));
const asaGeo = () => geo('taza-asa', () => new THREE.TorusGeometry(27, 9, 4, 6, Math.PI));

const Taza3D: React.FC<{c: P; ang: number; giro: number; conCafe: number}> = ({c, ang, giro, conCafe}) => {
  const m = tazaMats();
  return (
    <group position={[c[0], -c[1], 0]} rotation={[0, 0, -ang]}>
      <group rotation={[0, giro, 0]}>
        <mesh geometry={cuerpoGeo()} material={m.cuerpo} />
        <mesh geometry={dentroGeo()} material={m.dentro} />
        <mesh geometry={bordeGeo()} material={m.canto} position={[0, 59, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        <mesh geometry={fondoGeo()} material={m.rojo} position={[0, -59, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={asaGeo()} material={m.rojo} position={[52, 2, 0]} rotation={[0, 0, -Math.PI / 2]} />
        {conCafe > 0 && (
          <mesh geometry={fondoGeo()} material={m.cafe} position={[0, mix(10, 44, conCafe), 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.93, 0.93, 1]} />
        )}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- los trozos: su forma (constante) y su salto
const FORMAS: P[][] = (() => {
  const tr = trozos(T_SUELO + 0.001);
  return tr.map((q) => q.pts.map(([x, y]): P => {
    const dx = x - q.c[0], dy = y - q.c[1];
    const a = -q.ang;
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
  }));
})();
const trozoGeo = (n: number) => geo(`trozo-${n}`, () => {
  const sh = new THREE.Shape(FORMAS[n].map(([x, y]) => new THREE.Vector2(x, -y)));
  const g = new THREE.ExtrudeGeometry(sh, {depth: n === 5 ? 18 : 12, bevelEnabled: false});
  g.translate(0, 0, n === 5 ? -9 : -6);
  return g;
});
const G_TROZO = 6200;
type Fis = {p0: P; v: P; w: number; a0: number; rho: number; z: number; reposo: [number, number]};
const FIS: Fis[] = (() => {
  const a = trozos(T_SUELO), b = trozos(T_SUELO + 0.002);
  const zs = [-70, 50, -20, 110, 160, 70];
  return a.map((q, n) => {
    let vx = (b[n].c[0] - q.c[0]) / 0.002, vy = (b[n].c[1] - q.c[1]) / 0.002;
    vx *= vx < 0 ? 1.9 : 1.0;
    vy *= 1.8;
    const rho = Math.max(...FORMAS[n].map(([x, y]) => Math.hypot(x, y)));
    return {p0: q.c, v: [vx, vy] as P, w: ((b[n].ang - q.ang) / 0.002) * 1.2, a0: q.ang, rho, z: zs[n], reposo: [-1.05 - 0.15 * (n % 3), (n % 2 ? 0.5 : -0.4)]};
  });
})();
const salto = (f: Fis, tau: number): {c: P; ang: number; quieto: number} => {
  const G = G_TROZO;
  const yl = SUELO - f.rho * 0.4; // el centro, cuando toca el suelo
  const y0 = Math.min(f.p0[1], yl - 1);
  const t1 = (-f.v[1] + Math.sqrt(f.v[1] ** 2 + 2 * G * (yl - y0))) / G;
  if (tau < t1) return {c: [f.p0[0] + f.v[0] * tau, y0 + f.v[1] * tau + 0.5 * G * tau * tau], ang: f.a0 + f.w * tau, quieto: 0};
  let x = f.p0[0] + f.v[0] * t1, ang = f.a0 + f.w * t1, vx = f.v[0] * 0.55, w = f.w * 0.5, s = tau - t1;
  let vb = -0.4 * (f.v[1] + G * t1);
  for (let bote = 0; bote < 2; bote++) {
    const tb = (-2 * vb) / G;
    if (s < tb) return {c: [x + vx * s, yl + vb * s + 0.5 * G * s * s], ang: ang + w * s, quieto: 0};
    x += vx * tb;
    ang += w * tb;
    s -= tb;
    vb *= 0.35;
    vx *= 0.55;
    w *= 0.5;
  }
  const u = Math.min(s, 0.18);
  return {c: [x + vx * u * (1 - u / 0.36), yl], ang: ang + w * u * (1 - u / 0.36), quieto: E.outCubic(u / 0.18)};
};

const Trozos: React.FC<{tq: number}> = ({tq}) => {
  if (tq < T_SUELO) return null;
  const m = tazaMats();
  const tau = tq - T_SUELO;
  return (
    <group>
      {FIS.map((f, n) => {
        const q = salto(f, tau);
        const vuela = 1 - q.quieto;
        // en el aire dan vueltas (se ve el canto blanco); al pararse se quedan inclinados
        const rx = mix(f.reposo[0], f.reposo[0] + 1.6 * Math.sin(n * 2.1 + tau * 15), vuela);
        const ry = mix(f.reposo[1], f.reposo[1] + 1.2 * Math.cos(n * 1.3 + tau * 11), vuela);
        const z = f.z * clamp(tau / 0.35);
        return (
          <group key={n}>
            <group position={[q.c[0], -q.c[1], z]} rotation={[rx, ry, -q.ang]}>
              {/* un poco más grandes que en la escena, para que se lean en pequeño */}
              <mesh geometry={trozoGeo(n)} material={[n === 5 ? m.rojo : m.cuerpo, m.canto]} scale={[1.25, 1.25, 1.25]} />
            </group>
            <Mancha x={q.c[0]} y={SUELO} z={z} rx={f.rho * 0.9} rz={f.rho * 0.45} o={0.4 * clamp(1 - (SUELO - q.c[1] - f.rho) / 200)} />
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------- las monedas que saltan de dentro de la taza
const G_MON = 5200;
const MONEDAS = (() => {
  const r = rng(303);
  return [-1, 1, -0.5, 0.6, 0.15, -0.2].map((lado, i) => ({
    v: [lado * (260 + r() * 260), -(1050 + r() * 420)] as P, z: [40, 90, -30, 140, 10, 110][i], fase: r() * 6, t0: T_SUELO + 0.02 + i * 0.025,
  }));
})();
const Monedas: React.FC<{tq: number}> = ({tq}) => {
  if (tq < T_SUELO) return null;
  const oro = matOro();
  const destello = mat('destello', {mapa: brilloTex(), sinLuz: true, aditivo: true, transparente: 0.9});
  const yl = SUELO - 34; // de canto, apoyadas
  return (
    <group>
      {MONEDAS.map((mo, i) => {
        const tau = tq - mo.t0;
        if (tau < 0) return null;
        const y0 = IMPACTO[1] - 30;
        const t1 = (-mo.v[1] + Math.sqrt(mo.v[1] ** 2 + 2 * G_MON * (yl - y0))) / G_MON;
        let x: number, y: number;
        if (tau < t1) {
          x = IMPACTO[0] + mo.v[0] * tau;
          y = y0 + mo.v[1] * tau + 0.5 * G_MON * tau * tau;
        } else {
          const vb = -0.38 * (mo.v[1] + G_MON * t1);
          const tb = (-2 * vb) / G_MON;
          const s = tau - t1;
          x = IMPACTO[0] + mo.v[0] * t1 + mo.v[0] * 0.4 * Math.min(s, tb);
          y = s < tb ? yl + vb * s + 0.5 * G_MON * s * s : yl - 6 * Math.sin((s - tb) * 4 + mo.fase) ** 2;
        }
        const z = mo.z * clamp(tau / 0.3);
        const brilla = 0.55 + 0.45 * Math.sin(tq * 9 + i * 1.7);
        return (
          <group key={i}>
            <group position={[x, -y, z]}>
              <mesh geometry={monedaGeo()} material={oro} rotation={[0, tau * 10 + mo.fase, 0]} scale={[30, 30, 30]} />
              <mesh geometry={planoGeo()} material={destello} position={[10, 12, 12]} scale={[38 * brilla, 38 * brilla, 1]} />
            </group>
            <Mancha x={x} y={SUELO} z={z} rx={26} rz={13} o={0.35 * clamp(1 - (yl - y) / 300)} />
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------- el café: el chorro, la corona, las manchas y el charco
const Cafe: React.FC<{tq: number}> = ({tq}) => {
  const m = tazaMats();
  const cf = cafe(tq);
  const zMancha = (i: number) => ((i * 37) % 11) * 9 - 30;
  return (
    <group>
      {cf.gotas.map((g) => (
        <mesh key={g.i} geometry={gemaGeo()} material={m.cafe} position={[g.c[0], -g.c[1], g.i >= 100 ? zMancha(g.i) * 0.5 : 0]}
          rotation={[g.i, g.i * 0.7, tq * 6 + g.i]} scale={[g.r * 1.25, g.r * 1.25, g.r * 1.25]} />
      ))}
      {cf.manchas.map((s) => (
        <mesh key={`s${s.i}`} geometry={geo('gota-suelo', () => new THREE.CircleGeometry(1, 7))} material={m.cafe}
          position={[s.c[0], -SUELO + 1.6, zMancha(s.i)]} rotation={[-Math.PI / 2, 0, s.i]} scale={[s.rx * 1.1, s.rx * 0.8, 1]} />
      ))}
      {cf.charco && (
        <>
          <mesh geometry={geo('charco', () => new THREE.CircleGeometry(1, 10))} material={m.cafe} position={[cf.charco.c[0], -SUELO + 1.2, 25]}
            rotation={[-Math.PI / 2, 0, 0.3]} scale={[cf.charco.rx * 1.1, cf.charco.rx * 0.62, 1]} />
          <mesh geometry={geo('charco', () => new THREE.CircleGeometry(1, 10))} material={m.cafe2} position={[cf.charco.c[0] - 20, -SUELO + 1.4, 10]}
            rotation={[-Math.PI / 2, 0, 0.3]} scale={[cf.charco.rx * 0.5, cf.charco.rx * 0.25, 1]} />
        </>
      )}
    </group>
  );
};

// ---------------------------------------------------------------- el vapor: nubecitas de píxeles por los hilos
const Vapor: React.FC<{tq: number}> = ({tq}) => {
  const hilos = vapor(tq);
  return (
    <group>
      {hilos.map((h, i) => h.pts.filter((_, j) => j % 2 === 1).map((q, j) => {
        const k = j / 7;
        const s = mix(16, 46, k);
        const o = h.alfa * (1 - k) * 0.75;
        if (o < 0.04) return null;
        return (
          <mesh key={`${i}-${j}`} geometry={planoGeo()} material={mat(`vapor-${Math.round(o * 10)}`, {mapa: nubeTex(), transparente: Math.round(o * 10) / 10, sinLuz: true})}
            position={[q[0], -q[1], 30]} scale={[s, s, 1]} />
        );
      }))}
    </group>
  );
};

// ---------------------------------------------------------------- todo junto
export const TazaRetro: React.FC<{tq: number}> = ({tq}) => {
  const tz = taza(tq);
  const enAire = tq >= T_CAE;
  const giro = enAire ? (tq - T_CAE) * 3.2 : 0;
  // el café de dentro se va vaciando al volcar
  const conCafe = 1 - p(tq, T_CAE + 0.05, 0.2);
  // la sombra: en la mesa mientras está encima; en el suelo, más grande y más oscura según baja
  const h = SUELO - tz.c[1];
  return (
    <group>
      {tz.estado !== 'suelo' && <Taza3D c={tz.c} ang={tz.ang} giro={giro} conCafe={conCafe} />}
      {!enAire && <Mancha x={tz.c[0] - 4} y={MESA_Y} z={0} rx={66} rz={36} o={0.45} />}
      {enAire && tz.estado !== 'suelo' && <Mancha x={tz.c[0]} y={SUELO} z={0} rx={mix(70, 40, clamp(h / 600))} rz={mix(36, 20, clamp(h / 600))} o={mix(0.5, 0.15, clamp(h / 600))} />}
      <Vapor tq={tq} />
      <Cafe tq={tq} />
      <Trozos tq={tq} />
      <Monedas tq={tq} />
    </group>
  );
};

