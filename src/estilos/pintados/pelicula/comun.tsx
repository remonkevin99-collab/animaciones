import React from 'react';
import * as THREE from 'three';
import {E, clamp, mix, p} from '../../../comun/curvas';
import {MESA_Y, SUELO} from '../../gato/escena';

// PELÍCULA ANIMADA, lo común: la cámara, las capas a su profundidad y las formas LISAS (nada de abolladuras: esto
// es una película de estudio, no plastilina). Coordenadas como en la plastilina: x de la pantalla, y hacia arriba (−y de la
// pantalla) y z hacia la cámara; el plano z = 0 (el del gato, la mesa y la taza) sale 1:1 en la pantalla.

export type V3 = [number, number, number];

export const FOV = 30;
export const D = 960 / Math.tan((FOV / 2) * (Math.PI / 180)); // la distancia de la cámara al plano del gato
export const CAM_Y = 600; // a qué altura de la pantalla está la cámara: un pelo por encima de los ojos del gato
export const Z_PARED = -420;
export { MESA_Y, SUELO };

// una capa a la profundidad z, escalada para que sus coordenadas (las de la pantalla) caigan en su sitio
export const Capa: React.FC<{z: number; children: React.ReactNode}> = ({z, children}) => {
  const s = (D - z) / D;
  return <group position={[540 * (1 - s), -CAM_Y * (1 - s), z]} scale={[s, s, s]}>{children}</group>;
};
// a qué profundidad está el suelo que sale en la y dada de la pantalla (para lo que se queda en el suelo)
export const zSuelo = (y: number) => D * (1 - (SUELO - CAM_Y) / Math.max(1, y - CAM_Y));
// y al revés: dónde sale en la pantalla un punto del suelo a la profundidad z
export const ySuelo = (z: number) => CAM_Y + ((SUELO - CAM_Y) * D) / (D - z);

// ---------------------------------------------------------------- fotogramas clave (los de escena.ts, que no los exporta)
type Curva = (x: number) => number;
export type Clave = [number, number, Curva?];
export const kv = (t: number, claves: Clave[], def: Curva = E.inOutCubic) => {
  if (t <= claves[0][0]) return claves[0][1];
  for (let i = 1; i < claves.length; i++) {
    const [t1, v1, e] = claves[i];
    const [t0, v0] = claves[i - 1];
    if (t <= t1) return mix(v0, v1, (e || def)(p(t, t0, t1 - t0)));
  }
  return claves[claves.length - 1][1];
};
export const pulso = (t: number, t0: number, sube: number, baja: number) =>
  t < t0 ? 0 : t < t0 + sube ? E.outCubic((t - t0) / sube) : 1 - E.inOutCubic(clamp((t - t0 - sube) / baja));

export const n3 = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
export const sum3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const mix3 = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// ---------------------------------------------------------------- las formas lisas (guardadas: se hacen una vez)
const hechas = new Map<string, THREE.BufferGeometry>();
const guarda = (k: string, hacer: () => THREE.BufferGeometry) => {
  let g = hechas.get(k);
  if (!g) {
    g = hacer();
    hechas.set(k, g);
  }
  return g;
};
// la esfera de radio 1 (o un casquete hasta `arriba`), con muchos lados: en primer plano no puede verse poligonal
export const geoEsfera = (arriba = Math.PI, lados = 56) =>
  guarda(`e${arriba.toFixed(3)}-${lados}`, () => new THREE.SphereGeometry(1, lados, Math.round(lados * 0.7), 0, Math.PI * 2, 0, arriba));
// el tronco de cono de altura 1 (de y 0 a 1), abierto: con dos esferas en las puntas hace una cápsula que se estira sin rehacerse
export const geoTronco = (rAbajo: number, rArriba: number) =>
  guarda(`t${rAbajo.toFixed(2)}-${rArriba.toFixed(2)}`, () => {
    const g = new THREE.CylinderGeometry(rArriba, rAbajo, 1, 40, 1, true);
    g.translate(0, 0.5, 0);
    return g;
  });
export const geoAro = (R: number, tubo: number, arco = Math.PI * 2) =>
  guarda(`a${R}-${tubo}-${arco.toFixed(3)}`, () => new THREE.TorusGeometry(R, tubo, 20, 64, arco));
export const geoPlano = () => guarda('plano', () => new THREE.PlaneGeometry(1, 1));
export const geoCaja = (w: number, h: number, d: number, r: number) =>
  guarda(`k${w.toFixed(0)}-${h.toFixed(0)}-${d.toFixed(0)}-${r.toFixed(1)}`, () => {
    // la caja redondeada de three-stdlib, sin depender de ella: un cubo con las esquinas suavizadas por segmentos
    const rr = Math.max(0.5, Math.min(r, w * 0.45, h * 0.45, d * 0.45));
    const sh = new THREE.Shape();
    const x0 = -w / 2, y0 = -h / 2;
    sh.moveTo(x0 + rr, y0);
    sh.lineTo(x0 + w - rr, y0);
    sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rr);
    sh.lineTo(x0 + w, y0 + h - rr);
    sh.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rr, y0 + h);
    sh.lineTo(x0 + rr, y0 + h);
    sh.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rr);
    sh.lineTo(x0, y0 + rr);
    sh.quadraticCurveTo(x0, y0, x0 + rr, y0);
    const fondo = Math.max(1, d - 2 * rr);
    const g = new THREE.ExtrudeGeometry(sh, {depth: fondo, bevelEnabled: true, bevelThickness: rr, bevelSize: rr * 0.6, bevelSegments: 4, curveSegments: 6});
    g.translate(0, 0, -fondo / 2);
    g.computeVertexNormals();
    return g;
  });
// una figura plana (puntos en px de pantalla, y hacia abajo) con grosor y el canto redondeado (los trozos de la taza)
export const geoFigura = (pts: [number, number][], hondo: number, canto: number, clave: string) =>
  guarda(`f${clave}-${hondo}-${canto}`, () => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, -y)));
    const g = new THREE.ExtrudeGeometry(sh, {depth: Math.max(1, hondo - 2 * canto), bevelEnabled: true, bevelThickness: canto, bevelSize: canto * 0.7, bevelSegments: 3, curveSegments: 8});
    g.translate(0, 0, -(hondo - 2 * canto) / 2);
    g.computeVertexNormals();
    return g;
  });
// una pieza de torno: el perfil (radio, altura) que gira
export const geoTorno = (perfil: [number, number][], clave: string, seg = 72) =>
  guarda(`l${clave}`, () => {
    const g = new THREE.LatheGeometry(perfil.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    g.computeVertexNormals();
    return g;
  });

// para orientar de a a b (el eje y del objeto)
const Y = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const qq = new THREE.Quaternion();
export const orienta = (a: V3, b: V3): {L: number; quat: [number, number, number, number]} => {
  dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = dir.length();
  dir.normalize();
  qq.setFromUnitVectors(Y, L > 1e-6 ? dir : Y);
  return {L, quat: [qq.x, qq.y, qq.z, qq.w]};
};

// una cápsula de a a b con los radios de cada punta: dos esferas y el tronco que las une (sin rehacer geometría en cada cuadro)
export const Capsula: React.FC<{a: V3; b: V3; ra: number; rb: number; mat: THREE.Material; sombra?: boolean}> = ({a, b, ra, rb, mat, sombra = true}) => {
  const {L, quat} = orienta(a, b);
  const k = (Math.round((rb / ra) * 20) / 20) || 1;
  return (
    <group>
      <mesh geometry={geoEsfera()} material={mat} position={a} scale={[ra, ra, ra]} castShadow={sombra} receiveShadow />
      <mesh geometry={geoEsfera()} material={mat} position={b} scale={[rb, rb, rb]} castShadow={sombra} receiveShadow />
      <mesh geometry={geoTronco(1, k)} material={mat} position={a} quaternion={quat} scale={[ra, Math.max(0.01, L), ra]} castShadow={sombra} receiveShadow />
    </group>
  );
};

// la mancha suave de sombra de contacto (blanco en el centro, que el material tiñe): la oclusión donde algo toca
let manchaHecha: THREE.CanvasTexture | null = null;
export const mancha = (): THREE.CanvasTexture => {
  if (manchaHecha) return manchaHecha;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  manchaHecha = new THREE.CanvasTexture(cv);
  return manchaHecha;
};
export const Contacto: React.FC<{x: number; y: number; z?: number; w: number; d: number; op?: number; color?: string}> = ({
  x, y, z = 0, w, d, op = 0.5, color = '#1a0c10',
}) => (
  <mesh geometry={geoPlano()} position={[x, -y + 0.6, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[w, d, 1]} renderOrder={2}>
    <meshBasicMaterial map={mancha()} color={color} transparent opacity={op} depthWrite={false} toneMapped={false} />
  </mesh>
);
