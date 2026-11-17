import React from 'react';
import * as THREE from 'three';
import {rng} from '../../../comun/curvas';

// VIDEOJUEGO RETRO, EL MOTOR DE ÉPOCA: lo que hace que el 3D parezca de una consola de principios de los 2000.
// - Las texturas: lienzos de 16 a 128 px pintados píxel a píxel, sin filtrar (NearestFilter) y sin mipmaps: se ven los píxeles.
// - El temblor de los vértices: cada vértice cae en una rejilla de 270 × 480 puntos de la pantalla (4 px a 1080), así que lo que se
//   mueve despacio «baila» un poco, como en esas consolas. Sutil.
// - El baile de las texturas: en el suelo y la pared, la textura se reparte sin corregir la perspectiva (como entonces), a medias.
// - Las geometrías, de pocas caras y con sombreado plano.
// Todo se guarda la primera vez (texturas, materiales y geometrías) y es determinista: el mismo cuadro sale siempre igual.

export type V3 = [number, number, number];

// ---------------------------------------------------------------- la cámara del juego: FOV 40° y el plano del gato (z = 0) 1:1
export const FOV = 40;
export const D = 960 / Math.tan((FOV / 2) * (Math.PI / 180)); // 2637: a esta distancia el plano z = 0 sale a su tamaño
export const CAM_Y = 640; // la altura de la cámara (en la pantalla, sobre el plano del gato): se ve la mesa por encima
export const Z_PARED = -420;

// una capa a la profundidad z, escalada para que sus coordenadas (las de la pantalla) caigan en su sitio con la cámara quieta
export const escalaCapa = (z: number) => (D - z) / D;
export const Capa: React.FC<{z: number; children: React.ReactNode}> = ({z, children}) => {
  const s = escalaCapa(z);
  return <group position={[540 * (1 - s), -CAM_Y * (1 - s), z]} scale={[s, s, s]}>{children}</group>;
};
// el punto de la pantalla (x, y) llevado a la profundidad z
export const enPlano = (x: number, y: number, z: number): V3 => {
  const s = escalaCapa(z);
  return [540 + (x - 540) * s, -(CAM_Y + (y - CAM_Y) * s), z];
};

// ---------------------------------------------------------------- el temblor de los vértices y el baile de las texturas
const REJILLA = [135, 240]; // media rejilla en coordenadas de pantalla normalizadas (270 × 480 puntos)
export const retro = <M extends THREE.Material>(m: M, afin = 0): M => {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec2 rej = vec2(${REJILLA[0]}.0, ${REJILLA[1]}.0);
        vec4 q = gl_Position;
        q.xy = floor(q.xy / q.w * rej + 0.5) / rej * q.w;
        gl_Position = q;
      }`,
    );
    if (afin > 0) {
      sh.vertexShader = 'varying vec3 vAfin;\n' + sh.vertexShader.replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>
        #ifdef USE_MAP
          vAfin = vec3(vMapUv * gl_Position.w, gl_Position.w);
        #endif`,
      );
      sh.fragmentShader = 'varying vec3 vAfin;\n' + sh.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D(map, mix(vMapUv, vAfin.xy / vAfin.z, ${afin.toFixed(2)}));
          diffuseColor *= sampledDiffuseColor;
        #endif`,
      );
    }
  };
  m.customProgramCacheKey = () => `retro-${afin}`;
  return m;
};

// ---------------------------------------------------------------- lo guardado
const guardado = new Map<string, unknown>();
export const una = <T,>(clave: string, haz: () => T): T => {
  if (!guardado.has(clave)) guardado.set(clave, haz());
  return guardado.get(clave) as T;
};

// ---------------------------------------------------------------- lienzos de píxeles
export type Pixel = (x: number, y: number) => string | null; // el color de cada píxel (o nada: transparente)
const hex = (c: string): [number, number, number] => {
  const h = c.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const pintaPixeles = (cv: HTMLCanvasElement, w: number, h: number, px: Pixel) => {
  const g = cv.getContext('2d')!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = px(x, y);
    const i = (y * w + x) * 4;
    if (!c) { img.data[i + 3] = 0; continue; }
    const [r, gg, b] = hex(c);
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
};
const aTextura = (cv: HTMLCanvasElement, repite = true) => {
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repite) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
};
// una textura fija, pintada una vez
export const textura = (clave: string, w: number, h: number, px: Pixel, repite = true): THREE.CanvasTexture =>
  una(`tex-${clave}`, () => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    pintaPixeles(cv, w, h, px);
    return aTextura(cv, repite);
  });
// una textura que se repinta en cada cuadro (los ojos, la boca)
export const texturaViva = (clave: string, w: number, h: number) =>
  una(`viva-${clave}`, () => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const tex = aTextura(cv, false);
    return {tex, pinta: (px: Pixel) => { pintaPixeles(cv, w, h, px); tex.needsUpdate = true; }};
  });

// el tramado: un 4 × 4 de Bayer, para mezclar dos colores a píxeles
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const trama = (x: number, y: number, k: number) => k > BAYER[(y & 3) * 4 + (x & 3)];
// un ruido de píxeles con semilla (para las vetas, las motas…)
export const azar = (x: number, y: number, s: number) => rng(x * 7919 + y * 104729 + s * 15485863)();

// ---------------------------------------------------------------- materiales
type OpMat = {mapa?: THREE.Texture; color?: string; brillo?: number; emite?: string; afin?: number; liso?: boolean; transparente?: number;
  recorte?: boolean; doble?: boolean; aditivo?: boolean; sinNiebla?: boolean; sinLuz?: boolean};
export const mat = (clave: string, o: OpMat) =>
  una(`mat-${clave}`, () => {
    const comun = {
      map: o.mapa ?? null, color: new THREE.Color(o.color ?? '#ffffff'), fog: !o.sinNiebla,
      transparent: o.transparente !== undefined || !!o.aditivo, opacity: o.transparente ?? 1, alphaTest: o.recorte ? 0.5 : 0,
      side: o.doble ? THREE.DoubleSide : THREE.FrontSide, blending: o.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: !(o.aditivo || o.transparente !== undefined),
    };
    let m: THREE.Material;
    if (o.sinLuz) m = new THREE.MeshBasicMaterial(comun);
    else if (o.brillo) {
      m = new THREE.MeshPhongMaterial({...comun, flatShading: !o.liso, shininess: o.brillo, specular: new THREE.Color('#ffffff').multiplyScalar(0.55),
        emissive: new THREE.Color(o.emite ?? '#000000')});
    } else m = new THREE.MeshLambertMaterial({...comun, flatShading: !o.liso, emissive: new THREE.Color(o.emite ?? '#000000')});
    return retro(m, o.afin ?? 0);
  });

// ---------------------------------------------------------------- geometrías de pocas caras
export const geo = <G extends THREE.BufferGeometry>(clave: string, haz: () => G): G => una(`geo-${clave}`, haz);
export const bolaGeo = (seg = 9, anillos = 7) => geo(`bola-${seg}-${anillos}`, () => new THREE.SphereGeometry(1, seg, anillos));
export const cajaGeo = () => geo('caja', () => new THREE.BoxGeometry(1, 1, 1));
export const planoGeo = (sx = 1, sy = 1) => geo(`plano-${sx}-${sy}`, () => new THREE.PlaneGeometry(1, 1, sx, sy));
export const tuboGeo = (lados = 6) => geo(`tubo-${lados}`, () => new THREE.CylinderGeometry(1, 1, 1, lados, 1));
export const conoGeo = (lados = 4) => geo(`cono-${lados}`, () => new THREE.ConeGeometry(1, 1, lados, 1));
export const gemaGeo = () => geo('gema', () => new THREE.IcosahedronGeometry(1, 0));

// un segmento (tubo) de a a b, con sus radios en cada punta
const Y = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const qq = new THREE.Quaternion();
export const orienta = (a: V3, b: V3): {L: number; quat: [number, number, number, number]} => {
  dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = dir.length();
  dir.normalize();
  qq.setFromUnitVectors(Y, dir);
  return {L, quat: [qq.x, qq.y, qq.z, qq.w]};
};
export const troncoGeo = (ra: number, rb: number, lados = 6) => {
  const k = `${(rb / Math.max(ra, 0.001)).toFixed(2)}-${lados}`;
  // de radio 1 abajo a rb/ra arriba, de alto 1 y con la base en el origen (se escala con el radio de abajo y el largo)
  return geo(`tronco-${k}`, () => {
    const g = new THREE.CylinderGeometry(rb / Math.max(ra, 0.001), 1, 1, lados, 1);
    g.translate(0, 0.5, 0);
    return g;
  });
};
