import * as THREE from 'three';
import {E, mix, p, ruido} from '../../../comun/curvas';
import {T_CAE, T_SUELO, taza} from '../../gato/escena';
import {CAM_Y, D, FOV} from './retro';

// VIDEOJUEGO RETRO, LA CÁMARA: la de un juego en tercera persona. Da una vuelta lenta alrededor del gato
// (unos 9° en toda la escena, así se nota que es 3D: la pared y el cielo se mueven distinto que él), se balancea un pelo como la
// cámara de un juego en reposo, se acerca poco a poco y, cuando la taza se va, la sigue un poco hacia abajo y a la derecha, como
// las cámaras que miran lo que pasa. El plano del gato (z = 0) sale casi 1:1, así que él, la mesa y la taza están donde dice la
// escena. Se mueve a 30 cuadros por segundo, como todo el 3D.

const RAD = Math.PI / 180;
type Clave = [number, number, ((x: number) => number)?];
const kv = (t: number, claves: Clave[]) => {
  if (t <= claves[0][0]) return claves[0][1];
  for (let i = 1; i < claves.length; i++) {
    const [t1, v1, e] = claves[i];
    const [t0, v0] = claves[i - 1];
    if (t <= t1) return mix(v0, v1, (e || E.inOutCubic)(p(t, t0, t1 - t0)));
  }
  return claves[claves.length - 1][1];
};

export type Cam = {pos: THREE.Vector3; yaw: number; pitch: number; desplaza: number};
export const camara = (t: number): Cam => {
  // la vuelta: de −4,5° a +4,5°, más deprisa mientras pasa lo importante
  const yaw = kv(t, [[0, -4.5], [2.2, -2.4], [2.7, -0.4], [3.1, 1.6], [3.9, 3.3], [6, 4.5]]) * RAD;
  // lo que mira: el gato, y al caer la taza, un poco hacia ella
  const sigue = kv(t, [[0, 0], [T_CAE - 0.05, 0], [T_SUELO, 1], [3.7, 1], [4.6, 0.35], [6, 0.3]]);
  const px = mix(520, 600, sigue);
  const py = mix(0, 22, sigue); // baja la mirada (en px de pantalla)
  // se acerca despacio y respira
  const dist = D * kv(t, [[0, 1.05], [6, 0.965]]);
  const bob = 5 * Math.sin(t * 2.1) + 3 * ruido(t * 0.7, 21);
  const pos = new THREE.Vector3(px + Math.sin(yaw) * dist, -(CAM_Y + py) + bob, Math.cos(yaw) * dist);
  return {pos, yaw, pitch: 0, desplaza: 960 - CAM_Y};
};

// la cámara de three con esos datos (para pintar y para saber dónde cae un punto en la pantalla)
export const aplicaCamara = (cam: THREE.PerspectiveCamera, c: Cam, ancho = 1080, alto = 1920) => {
  cam.fov = FOV;
  cam.aspect = ancho / alto;
  cam.near = 50;
  cam.far = 30000;
  cam.position.copy(c.pos);
  cam.rotation.set(c.pitch, c.yaw, 0, 'YXZ');
  // el objetivo descentrado: la cámara está a la altura de CAM_Y, pero el cuadro es el de siempre
  cam.setViewOffset(ancho, alto, 0, (c.desplaza * alto) / 1920, ancho, alto);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
};

const CAM_HUD = new THREE.PerspectiveCamera();
const v = new THREE.Vector3();
// dónde sale en la pantalla (1080 × 1920) un punto del mundo
export const enPantalla = (t: number, x: number, y: number, z: number): [number, number] => {
  aplicaCamara(CAM_HUD, camara(t));
  v.set(x, y, z).project(CAM_HUD);
  return [(v.x + 1) * 540, (1 - v.y) * 960];
};
// y un punto de la escena plana (x, y de la pantalla en el plano del gato)
export const deEscena = (t: number, x: number, y: number, z = 0) => enPantalla(t, x, -y, z);

// dónde está la taza en la pantalla (para el aviso de «EMPUJAR»)
export const tazaEnPantalla = (t: number) => {
  const tz = taza(t);
  return deEscena(t, tz.c[0], tz.c[1]);
};
