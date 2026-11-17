import React from 'react';
import * as THREE from 'three';
import {BORDE, MESA_G, MESA_Y, SUELO} from '../../gato/escena';
import {type V3, Capa, Z_PARED, azar, escalaCapa, una, bolaGeo, cajaGeo, conoGeo, enPlano, geo, gemaGeo, mat, orienta, planoGeo, textura, trama, tuboGeo} from './retro';

// VIDEOJUEGO RETRO, EL NIVEL: la cocina del gato como un nivel de un juego 3D de principios de los 2000.
// Pared morada con papel de rombos y azulejos turquesa abajo, una ventana enorme detrás del gato con un cielo azul muy saturado (a
// bandas tramadas, como los cielos de entonces), colinas verdes de pocas caras, árboles de cono, un molino que gira, nubes de
// poliedros y el sol; cortinas rojas, la balda con sus botes, el cuadro del pez, el reloj, la encimera con su frutero, el suelo de
// damero azul y crema (con su textura que baila), las monedas que flotan debajo de la mesa y el ovillo. La luz: el sol que entra por
// la ventana (contraluz cálido y haces de luz), un relleno magenta y el cielo azul; sin sombras de verdad: manchas debajo de cada
// cosa, como entonces. La niebla de distancia azul se come lo lejano.

export const PAL = {
  cielo: ['#0c26b8', '#1440e6', '#1f68ff', '#2f95ff', '#45c0ff', '#72dcff', '#b6f1ff'],
  niebla: '#8fdcff',
  pared: '#6a2ed2', pared2: '#8d55f2', pared3: '#4d1ca6',
  azulejo: '#16c9b8', azulejo2: '#0ea99e', junta: '#08707a',
  marco: '#fff3d8', marco2: '#e3c79c',
  cortina: '#ff2f5f', cortina2: '#c81d4c',
  suelo1: '#fff1cf', suelo2: '#2f44e6', sueloJ: '#1b2797',
  madera: '#c4561f', madera2: '#e07a32', madera3: '#8d3412',
  colina: '#35d44a', colina2: '#1fa83d', colina3: '#5ce86a', pino: '#127a3a', tronco: '#7a3d17',
  oro: '#ffc21a', oro2: '#ff9a0a',
  sombra: '#1a0b3a',
};

// ---------------------------------------------------------------- texturas (píxel a píxel)
const cieloTex = () => textura('cielo', 8, 56, (x, y) => {
  const k = y / 55;
  const n = PAL.cielo.length - 1;
  const f = k * n;
  const i = Math.min(n - 1, Math.floor(f));
  return trama(x, y, f - i) ? PAL.cielo[i + 1] : PAL.cielo[i];
}, false);
const papelTex = () => textura('papel', 32, 32, (x, y) => {
  // rombos claros sobre morado, con una estrellita en medio y motas
  const dx = Math.abs(((x + 8) % 16) - 8), dy = Math.abs(((y + 8) % 16) - 8);
  const d = dx + dy;
  if (d === 6) return PAL.pared2;
  if (d < 2) return '#ffd34d';
  if (d < 6 && azar(x, y, 3) < 0.18) return PAL.pared3;
  return azar(x, y, 4) < 0.08 ? PAL.pared3 : PAL.pared;
});
const azulejoTex = () => textura('azulejo', 16, 16, (x, y) => {
  if (x === 0 || y === 0) return PAL.junta;
  if (x === 1 && y > 0 && y < 15) return '#7af3e6';
  if (y === 1 && x > 0) return '#7af3e6';
  return trama(x, y, 0.15 + 0.4 * (x + y) / 30) ? PAL.azulejo2 : PAL.azulejo;
});
const sueloTex = () => textura('suelo', 32, 32, (x, y) => {
  const cx = x < 16 ? 0 : 1, cy = y < 16 ? 0 : 1;
  const u = x % 16, w = y % 16;
  if (u === 0 || w === 0) return PAL.sueloJ;
  const claro = (cx + cy) % 2 === 0;
  if (claro) return azar(x, y, 7) < 0.1 ? '#f2dcae' : u === 1 || w === 1 ? '#ffffff' : PAL.suelo1;
  return azar(x, y, 8) < 0.1 ? PAL.sueloJ : u === 1 || w === 1 ? '#5f74ff' : PAL.suelo2;
});
export const maderaTex = () => textura('madera', 32, 16, (x, y) => {
  // tablas a lo largo, con vetas y nudos
  if (y % 8 === 0) return PAL.madera3;
  const veta = Math.sin(x * 0.55 + y * 1.7 + Math.floor(y / 8) * 2.1) > 0.82;
  if (veta) return PAL.madera3;
  return trama(x, y, 0.35 + 0.3 * Math.sin(x * 0.3 + y)) ? PAL.madera2 : PAL.madera;
});
const muebleTex = () => textura('mueble', 32, 32, (x, y) => {
  // la puerta de un armario: marco, panel y tirador
  if (x === 0 || y === 0 || x === 31 || y === 31) return '#1d5c8f';
  if (x < 3 || y < 3 || x > 28 || y > 28) return '#ffffff';
  if (x === 3 || y === 3 || x === 28 || y === 28) return '#a9c9ef';
  if (x >= 24 && x <= 26 && y >= 12 && y <= 19) return '#ffc21a';
  return trama(x, y, 0.25) ? '#3f8fe0' : '#4aa3f5';
});
const cuadroTex = () => textura('cuadro-pez', 32, 24, (x, y) => {
  // un pez naranja sobre agua
  const ex = (x - 14) / 9, ey = (y - 12) / 5.5;
  if (ex * ex + ey * ey < 1) return x === 19 && y === 10 ? '#1a0b3a' : y < 11 ? '#ffb02e' : '#ff7a1a';
  if (x >= 22 && x <= 27 && Math.abs(y - 12) <= (x - 21) * 0.9) return '#ff5a1a';
  if (azar(x, y, 11) < 0.05) return '#ffffff';
  return trama(x, y, y / 24) ? '#1d8fe6' : '#4cc3ff';
}, false);
const relojTex = () => textura('reloj', 32, 32, (x, y) => {
  const r = Math.hypot(x - 15.5, y - 15.5);
  if (r > 15.5) return null;
  if (r > 13.5) return '#ff2f5f';
  // las marcas de las horas
  const a = Math.atan2(y - 15.5, x - 15.5);
  if (r > 10.5 && Math.abs(Math.sin(a * 6)) < 0.18) return '#1a0b3a';
  return '#fff8e6';
}, false);
const ovilloTex = () => textura('ovillo', 16, 16, (x, y) => ((x + y * 2) % 6 < 2 ? '#c2185b' : (x * 2 + y) % 7 === 0 ? '#ff9ad0' : '#ff4fa3'));
export const brilloTex = () => textura('brillo', 32, 32, (x, y) => {
  // un brillo redondo de píxeles, tramado hacia fuera
  const r = Math.hypot(x - 15.5, y - 15.5) / 15.5;
  if (r > 1) return null;
  const k = 1 - r;
  if (k > 0.75) return '#ffffff';
  if (k > 0.5) return trama(x, y, (k - 0.5) * 4) ? '#ffffff' : '#ffe9a0';
  if (k > 0.22) return trama(x, y, (k - 0.22) * 3.6) ? '#ffe9a0' : '#ffb84a';
  return trama(x, y, k * 4) ? '#ff8a2a' : null;
}, false);
export const manchaTex = () => textura('mancha', 16, 16, (x, y) => {
  // la sombra de mancha de los juegos de entonces: un óvalo tramado
  const r = Math.hypot(x - 7.5, y - 7.5) / 7.5;
  if (r > 1) return null;
  return trama(x, y, 1.15 - r) ? '#ffffff' : null;
}, false);
const hazTex = () => textura('haz', 8, 32, (x, y) => {
  const k = 1 - y / 31;
  return trama(x, y, k * 0.95) ? '#ffffff' : null;
}, false);

// el resplandor (lo único suavizado: los brillos de entonces sí se filtraban): blanco en el centro y transparente fuera
export const resplandorTex = () => una('tex-resplandor', () => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
});
// la luz del sol en el suelo: la forma de la ventana, con su cruz, y el borde tramado
const solSueloTex = () => textura('sol-suelo', 32, 32, (x, y) => {
  if (x === 15 || x === 16 || y === 15 || y === 16) return null;
  const borde = Math.min(x, y, 31 - x, 31 - y);
  if (borde === 0) return trama(x, y, 0.5) ? '#ffffff' : null;
  return '#ffffff';
}, false);

// ---------------------------------------------------------------- piezas
// un rectángulo de pantalla (en una Capa), con la textura repetida cada «teja» px y partido en trozos (para el baile de la textura)
const rect = (x0: number, y0: number, x1: number, y1: number, teja: number, partes = 6) =>
  geo(`rect-${x0}-${y0}-${x1}-${y1}-${teja}-${partes}`, () => {
    const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0, partes, partes);
    g.translate((x0 + x1) / 2, -(y0 + y1) / 2, 0);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / teja, pos.getY(i) / teja);
    return g;
  });
const Rect: React.FC<{r: [number, number, number, number]; teja: number; m: THREE.Material; z?: number; partes?: number}> = ({r, teja, m, z = 0, partes}) => (
  <mesh geometry={rect(r[0], r[1], r[2], r[3], teja, partes)} material={m} position={[0, 0, z]} />
);
// una caja dada por sus esquinas en x e y (de pantalla, en una Capa o en el plano del gato) y su fondo en z
export const Caja: React.FC<{x: [number, number]; y: [number, number]; z: [number, number]; m: THREE.Material | THREE.Material[]}> = ({x, y, z, m}) => (
  <mesh geometry={cajaGeo()} material={m} position={[(x[0] + x[1]) / 2, -(y[0] + y[1]) / 2, (z[0] + z[1]) / 2]}
    scale={[x[1] - x[0], y[1] - y[0], z[1] - z[0]]} />
);
export const Palo: React.FC<{a: V3; b: V3; r: number; m: THREE.Material; lados?: number}> = ({a, b, r, m, lados = 6}) => {
  const {L, quat} = orienta(a, b);
  return (
    <mesh geometry={tuboGeo(lados)} material={m} quaternion={quat} scale={[r, L, r]}
      position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} />
  );
};
// la sombra de mancha en el suelo (o en la mesa): un óvalo oscuro en el plano y
export const Mancha: React.FC<{x: number; y: number; z: number; rx: number; rz: number; o?: number}> = ({x, y, z, rx, rz, o = 0.5}) => (
  <mesh geometry={planoGeo()} material={mat(`mancha-${o.toFixed(2)}`, {mapa: manchaTex(), color: PAL.sombra, transparente: o, sinLuz: true, recorte: false})}
    position={[x, -y + 0.8, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[rx * 2, rz * 2, 1]} renderOrder={3} />
);

// ---------------------------------------------------------------- fuera: el cielo, el sol, las nubes, las colinas y el molino
const Fuera: React.FC<{t: number}> = ({t}) => {
  const verde = mat('colina', {color: PAL.colina});
  const verde2 = mat('colina2', {color: PAL.colina2});
  const verde3 = mat('colina3', {color: PAL.colina3});
  const pino = mat('pino', {color: PAL.pino});
  const tronco = mat('tronco', {color: PAL.tronco});
  const nube = mat('nube', {color: '#ffffff', emite: '#8fb2ec', sinNiebla: true});
  const blanco = mat('molino', {color: '#fff6e8'});
  const tejado = mat('tejado', {color: '#ff3b5c'});
  // las colinas: medias bolas de pocas caras, unas detrás de otras (las de atrás se las come la niebla)
  const colinas: [number, number, number, number, number, THREE.Material][] = [
    // [x de pantalla, y de pantalla de la cima, z, ancho, alto, material]
    [180, 700, -5200, 1900, 520, verde2], [980, 660, -5600, 2300, 600, verde], [560, 770, -3400, 1700, 360, verde3],
    [1200, 790, -2600, 1300, 300, verde2], [-120, 800, -2300, 1300, 320, verde],
  ];
  const pinos: [number, number, number, number][] = [
    [300, 800, -2500, 1], [380, 805, -2450, 0.8], [1010, 790, -2300, 1.1], [1080, 800, -2350, 0.85], [700, 760, -3300, 1.2],
    [780, 770, -3250, 0.9], [150, 700, -5000, 1.4], [240, 690, -5100, 1.2],
  ];
  // el molino, en la colina del fondo a la derecha: sus aspas giran sin parar
  const mol = enPlano(790, 600, -5400);
  const aspas = t * 1.6;
  return (
    <group>
      {/* el cielo: un telón lejos, sin niebla, a bandas tramadas */}
      <mesh geometry={planoGeo()} material={mat('cielo', {mapa: cieloTex(), sinLuz: true, sinNiebla: true})}
        position={enPlano(540, 410, -9000)} scale={[3800 * D_ESC(-9000), 700 * D_ESC(-9000), 1]} />
      {colinas.map(([x, y, z, w, h, m], i) => {
        const c = enPlano(x, y, z);
        return <mesh key={i} geometry={geo('colina', () => new THREE.SphereGeometry(1, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2))} material={m}
          position={[c[0], c[1] - h * D_ESC(z), c[2]]} scale={[(w / 2) * D_ESC(z), h * D_ESC(z), 500 * D_ESC(z)]} />;
      })}
      {/* el suelo de fuera, para que no se vea el vacío */}
      <mesh geometry={planoGeo()} material={verde2} position={[540, enPlano(540, 840, -2200)[1], -6200]} rotation={[-Math.PI / 2, 0, 0]} scale={[16000, 7600, 1]} />
      {pinos.map(([x, y, z, s], i) => {
        const c = enPlano(x, y, z);
        const k = (D_ESC(z)) * s;
        return (
          <group key={i} position={c}>
            <mesh geometry={conoGeo(5)} material={pino} position={[0, 95 * k, 0]} scale={[48 * k, 150 * k, 48 * k]} />
            <mesh geometry={conoGeo(5)} material={pino} position={[0, 150 * k, 0]} scale={[36 * k, 110 * k, 36 * k]} />
            <mesh geometry={tuboGeo(4)} material={tronco} position={[0, 15 * k, 0]} scale={[9 * k, 40 * k, 9 * k]} />
          </group>
        );
      })}
      <group position={mol} scale={[D_ESC(-5400), D_ESC(-5400), D_ESC(-5400)]}>
        <mesh geometry={conoGeo(6)} material={blanco} position={[0, 190, 0]} scale={[85, 380, 85]} />
        <mesh geometry={conoGeo(6)} material={tejado} position={[0, 400, 0]} scale={[60, 90, 60]} />
        <group position={[0, 330, 70]} rotation={[0, 0, aspas]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} geometry={cajaGeo()} material={blanco} rotation={[0, 0, (i * Math.PI) / 2]} position={[Math.cos((i * Math.PI) / 2) * 120, Math.sin((i * Math.PI) / 2) * 120, 0]}
              scale={[230, 34, 6]} />
          ))}
        </group>
      </group>
      {/* las nubes: cúmulos de bolas de pocas caras, blancas, que van despacio hacia la derecha */}
      {([[330, 300, -4200, 1.0], [700, 250, -4800, 1.25], [1000, 390, -3800, 0.8], [-60, 420, -4400, 0.9]] as const).map(([x, y, z, s], i) => {
        const c = enPlano(x + t * (6 + i * 3), y, z);
        const k = s * D_ESC(z);
        const bolas: [number, number, number][] = [[-95, 0, 42], [-40, -6, 56], [25, -4, 60], [88, 2, 44], [-58, 34, 44], [8, 44, 54], [62, 30, 40]];
        return (
          <group key={i} position={c} scale={[k, k, k]}>
            {bolas.map(([bx, by, br], j) => (
              <mesh key={j} geometry={bolaGeo(7, 5)} material={nube} position={[bx, by, (j % 3) * 8]} scale={[br * (1 + 0.15 * Math.sin(i + j)), br * 0.82, br * 0.8]} />
            ))}
          </group>
        );
      })}
      {/* el sol: un brillo de píxeles, que suma luz */}
      <mesh geometry={planoGeo()} material={mat('sol', {mapa: brilloTex(), sinLuz: true, sinNiebla: true, aditivo: true})}
        position={enPlano(800, 330, -8800)} scale={[330 * D_ESC(-8800), 330 * D_ESC(-8800), 1]} />
    </group>
  );
};
const D_ESC = escalaCapa;

// ---------------------------------------------------------------- la pared del fondo con su ventana
export const VENTANA = {x0: 250, x1: 905, y0: 175, y1: 860}; // en la pantalla, sobre la pared
const ALICATADO = 930; // de aquí abajo, azulejos
const SUELO_PARED = 1468; // donde el suelo toca la pared, en sus coordenadas de pantalla

const Pared: React.FC<{t: number}> = ({t}) => {
  const papel = mat('papel', {mapa: papelTex(), afin: 0.6});
  const azulejo = mat('azulejo', {mapa: azulejoTex(), afin: 0.6});
  const marco = mat('marco', {color: PAL.marco});
  const marco2 = mat('marco2', {color: PAL.marco2});
  const cortina = mat('cortina', {color: PAL.cortina});
  const cortina2 = mat('cortina2', {color: PAL.cortina2});
  const V = VENTANA;
  const W = 34; // el marco
  // la cortina: una tira de pliegues (zigzag en z) que se recoge a media altura
  const cortinaGeo = (lado: number) => geo(`cortina-${lado}`, () => {
    const g = new THREE.BufferGeometry();
    const filas = [V.y0 - 20, 560, 640, V.y1 + 40];
    const ancho = [210, 70, 70, 150];
    const n = 7;
    const pts: number[] = [];
    const idx: number[] = [];
    filas.forEach((y, f) => {
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const x0 = lado < 0 ? V.x0 - 40 : V.x1 + 40;
        const x = x0 - lado * k * ancho[f] + (f === 3 ? lado * 30 * Math.sin(k * 3) : 0);
        pts.push(x, -y, (i % 2 ? 16 : -6) + 40);
      }
    });
    for (let f = 0; f < filas.length - 1; f++) for (let i = 0; i < n; i++) {
      const a = f * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
  // el reloj: la aguja de los segundos salta cada segundo
  const seg = (Math.floor(t) / 60) * Math.PI * 2 + 2.1;
  return (
    <Capa z={Z_PARED}>
      {/* el papel morado alrededor de la ventana y los azulejos de abajo */}
      <Rect r={[-500, -400, V.x0, ALICATADO]} teja={96} m={papel} />
      <Rect r={[V.x1, -400, 1700, ALICATADO]} teja={96} m={papel} />
      <Rect r={[V.x0, -400, V.x1, V.y0]} teja={96} m={papel} />
      <Rect r={[V.x0, V.y1, V.x1, ALICATADO]} teja={96} m={papel} partes={2} />
      <Rect r={[-500, ALICATADO, 1700, SUELO_PARED + 10]} teja={64} m={azulejo} partes={10} />
      {/* la moldura entre el papel y los azulejos y el zócalo */}
      <Caja x={[-500, 1700]} y={[ALICATADO - 14, ALICATADO + 6]} z={[0, 22]} m={marco} />
      <Caja x={[-500, 1700]} y={[SUELO_PARED - 34, SUELO_PARED]} z={[0, 26]} m={marco2} />
      {/* el hueco de la ventana: el fondo del muro, el marco, la cruz y el alféizar */}
      <Caja x={[V.x0, V.x0 + 30]} y={[V.y0, V.y1]} z={[-90, 0]} m={marco2} />
      <Caja x={[V.x1 - 30, V.x1]} y={[V.y0, V.y1]} z={[-90, 0]} m={marco2} />
      <Caja x={[V.x0, V.x1]} y={[V.y0, V.y0 + 30]} z={[-90, 0]} m={marco2} />
      <Caja x={[V.x0 - W, V.x0]} y={[V.y0 - W, V.y1 + W]} z={[0, 14]} m={marco} />
      <Caja x={[V.x1, V.x1 + W]} y={[V.y0 - W, V.y1 + W]} z={[0, 14]} m={marco} />
      <Caja x={[V.x0 - W, V.x1 + W]} y={[V.y0 - W, V.y0]} z={[0, 14]} m={marco} />
      <Caja x={[(V.x0 + V.x1) / 2 - 12, (V.x0 + V.x1) / 2 + 12]} y={[V.y0, V.y1]} z={[-60, -40]} m={marco} />
      <Caja x={[V.x0, V.x1]} y={[470, 494]} z={[-60, -40]} m={marco} />
      <Caja x={[V.x0 - 50, V.x1 + 50]} y={[V.y1, V.y1 + 30]} z={[-90, 70]} m={marco} />
      <Caja x={[V.x0 - 40, V.x1 + 40]} y={[V.y1 + 30, V.y1 + 46]} z={[0, 40]} m={marco2} />
      {/* el reflejo del cristal: dos rayas en diagonal */}
      {[[420, 0.11, 70], [520, 0.07, 34]].map(([x, o, w], i) => (
        <mesh key={i} geometry={planoGeo()} material={mat(`reflejo-${i}`, {color: '#ffffff', transparente: o, sinLuz: true})}
          position={[x, -520, -48]} rotation={[0, 0, -0.62]} scale={[w, 820, 1]} />
      ))}
      {/* la barra y las cortinas */}
      <mesh geometry={tuboGeo(6)} material={mat('barra', {color: '#ffc21a', brillo: 40})} position={[(V.x0 + V.x1) / 2, -(V.y0 - 46), 54]}
        rotation={[0, 0, Math.PI / 2]} scale={[9, V.x1 - V.x0 + 330, 9]} />
      <mesh geometry={cortinaGeo(-1)} material={cortina} />
      <mesh geometry={cortinaGeo(1)} material={cortina} />
      <Caja x={[V.x0 - 120, V.x0 - 40]} y={[585, 615]} z={[50, 64]} m={cortina2} />
      <Caja x={[V.x1 + 40, V.x1 + 120]} y={[585, 615]} z={[50, 64]} m={cortina2} />
      {/* en el alféizar: una maceta con una planta de pocas caras */}
      <group position={[V.x1 - 70, -(V.y1 - 2), 20]}>
        <mesh geometry={tuboGeo(6)} material={mat('maceta', {color: '#ff6a2a'})} position={[0, 32, 0]} scale={[34, 64, 34]} />
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} geometry={conoGeo(3)} material={mat(i % 2 ? 'hoja' : 'hoja2', {color: i % 2 ? '#2fd14a' : '#16a83a'})}
            position={[Math.cos(i * 1.3) * 22, 110 + (i % 3) * 14, Math.sin(i * 1.3) * 22]}
            rotation={[Math.sin(i * 1.3) * 0.5, 0, -Math.cos(i * 1.3) * 0.5 + 0.08 * Math.sin(t * 2 + i)]} scale={[22, 110, 10]} />
        ))}
      </group>
      {/* la balda de la izquierda, con sus botes, y el cuadro del pez */}
      <Caja x={[-60, 215]} y={[455, 475]} z={[0, 90]} m={mat('balda', {mapa: maderaTex()})} />
      {([[-10, '#ff3b5c', 70], [50, '#ffc21a', 92], [112, '#16c9b8', 64], [165, '#ffffff', 80]] as const).map(([x, c, h], i) => (
        <group key={i} position={[x + 24, -455, 48]}>
          <mesh geometry={tuboGeo(8)} material={mat(`bote-${i}`, {color: c, brillo: 30})} position={[0, h / 2, 0]} scale={[23, h, 23]} />
          <mesh geometry={tuboGeo(8)} material={mat('tapa', {color: '#5b2bc0'})} position={[0, h + 6, 0]} scale={[25, 12, 25]} />
        </group>
      ))}
      <Caja x={[-30, 215]} y={[185, 380]} z={[0, 14]} m={mat('marco-cuadro', {color: '#ffc21a', brillo: 30})} />
      <mesh geometry={planoGeo()} material={mat('cuadro', {mapa: cuadroTex()})} position={[92, -282, 15]} scale={[210, 160, 1]} />
      {/* el reloj */}
      <group position={[1040, -330, 18]}>
        <mesh geometry={tuboGeo(12)} material={mat('reloj-aro', {color: '#ff2f5f', brillo: 30})} rotation={[Math.PI / 2, 0, 0]} scale={[96, 18, 96]} />
        <mesh geometry={planoGeo()} material={mat('reloj', {mapa: relojTex(), recorte: true})} position={[0, 0, 10]} scale={[180, 180, 1]} />
        <mesh geometry={cajaGeo()} material={mat('aguja', {color: '#1a0b3a'})} position={[Math.sin(seg) * 40, Math.cos(seg) * 40, 13]} rotation={[0, 0, -seg]}
          scale={[6, 84, 3]} />
        <mesh geometry={cajaGeo()} material={mat('aguja-h', {color: '#1a0b3a'})} position={[18, 10, 14]} rotation={[0, 0, -1.1]} scale={[10, 60, 3]} />
      </group>
    </Capa>
  );
};

// ---------------------------------------------------------------- la encimera de la derecha, con su frutero
const Encimera: React.FC = () => {
  const puerta = mat('mueble', {mapa: muebleTex()});
  const tabla = mat('encimera', {color: '#fff3d8'});
  return (
    <Capa z={-260}>
      <Caja x={[905, 1600]} y={[1120, SUELO_EN(-260)]} z={[-150, 170]} m={puerta} />
      <Caja x={[890, 1600]} y={[1094, 1122]} z={[-10, 190]} m={tabla} />
      {/* el frutero: un cuenco y fruta de pocas caras */}
      <group position={[1010, -1094, 100]}>
        <mesh geometry={geo('cuenco', () => new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2))}
          material={mat('cuenco', {color: '#16c9b8', brillo: 30, doble: true})} position={[0, 40, 0]} scale={[80, 40, 70]} />
        {([[-30, 58, '#ff2f3f'], [14, 64, '#ffd21a'], [42, 52, '#ff7a1a'], [-6, 86, '#7ee03a']] as const).map(([x, y, c], i) => (
          <mesh key={i} geometry={bolaGeo(7, 5)} material={mat(`fruta-${i}`, {color: c, brillo: 20})} position={[x, y, (i % 2) * 14]} scale={[26, 26, 26]} />
        ))}
      </group>
    </Capa>
  );
};
// la y de la pantalla donde el suelo toca algo puesto a la profundidad z (en las coordenadas de su Capa)
const SUELO_EN = (z: number) => 640 + (SUELO - 640) / D_ESC(z);

// ---------------------------------------------------------------- el suelo de damero
const Suelo: React.FC = () => (
  <mesh geometry={geo('suelo', () => {
    const g = new THREE.PlaneGeometry(3200, 1500, 24, 12);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 230, pos.getY(i) / 230);
    return g;
  })} material={mat('suelo', {mapa: sueloTex(), afin: 0.85})} position={[540, -SUELO, Z_PARED + 750]} rotation={[-Math.PI / 2, 0, 0]} />
);

// ---------------------------------------------------------------- la mesa
export const MESA_X: [number, number] = [-60, BORDE];
export const MESA_Z = 150;
export const Mesa: React.FC = () => {
  const tablero = mat('tablero', {mapa: maderaTex()});
  const pata = mat('pata', {color: PAL.madera3});
  const canto = mat('canto', {color: PAL.madera2});
  const y0 = MESA_Y, g = MESA_G;
  return (
    <group>
      <Caja x={MESA_X} y={[y0, y0 + g]} z={[-MESA_Z, MESA_Z]} m={[canto, canto, tablero, tablero, canto, canto]} />
      <Caja x={[MESA_X[0] + 40, BORDE - 40]} y={[y0 + g, y0 + g + 34]} z={[MESA_Z - 34, MESA_Z - 18]} m={pata} />
      {[110, 640].map((x) => [MESA_Z - 34, -MESA_Z + 34].map((z) => (
        <Caja key={`${x}-${z}`} x={[x - 17, x + 17]} y={[y0 + g, SUELO]} z={[z - 17, z + 17]} m={pata} />
      )))}
      <Mancha x={330} y={SUELO} z={0} rx={470} rz={190} o={0.42} />
    </group>
  );
};

// ---------------------------------------------------------------- las monedas que flotan debajo de la mesa y el ovillo
export const monedaGeo = () => geo('moneda', () => {
  const g = new THREE.CylinderGeometry(1, 1, 0.22, 10, 1);
  g.rotateX(Math.PI / 2);
  return g;
});
export const matOro = () => mat('oro', {color: PAL.oro, brillo: 60, emite: '#7a4300'});
const Monedas: React.FC<{t: number}> = ({t}) => (
  <group>
    {[0, 1, 2, 3].map((i) => {
      const x = 205 + i * 110;
      const y = 1330 - Math.sin((i / 3) * Math.PI) * 60 + 10 * Math.sin(t * 3.2 + i * 0.9);
      return (
        <group key={i} position={[x, -y, 40]}>
          <mesh geometry={monedaGeo()} material={matOro()} rotation={[0, t * 3.4 + i * 0.7, 0]} scale={[36, 36, 36]} />
          <Mancha x={0} y={SUELO - y} z={-40} rx={30} rz={14} o={0.3} />
        </group>
      );
    })}
    <group position={[470, -SUELO + 52, -170]}>
      <mesh geometry={bolaGeo(8, 6)} material={mat('ovillo', {mapa: ovilloTex()})} rotation={[0.4, 0.8, 0.2]} scale={[52, 52, 52]} />
      <Palo a={[30, -40, 30]} b={[160, -52, 120]} r={4} m={mat('hilo', {color: '#ff4fa3'})} lados={4} />
    </group>
    <Mancha x={470} y={SUELO} z={-170} rx={70} rz={40} o={0.45} />
  </group>
);

// ---------------------------------------------------------------- los haces de luz que entran por la ventana y las motas
const Haces: React.FC<{t: number}> = ({t}) => (
  <group>
    {([[430, 0.06, 150], [600, 0.08, 210], [780, 0.05, 130]] as const).map(([x, o, w], i) => {
      const a = enPlano(x, 330, Z_PARED - 40);
      const b: V3 = [x - 430, -SUELO + 20, 420];
      const {L, quat} = orienta(b, a);
      const latido = 1 + 0.18 * Math.sin(t * 1.7 + i * 2);
      return (
        <mesh key={i} geometry={planoGeo()} material={mat(`haz-${i}`, {mapa: hazTex(), color: '#ffe08a', transparente: o * latido, aditivo: true, sinLuz: true, doble: true})}
          quaternion={quat} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} scale={[w, L, 1]} />
      );
    })}
    {/* el resplandor de la ventana, que se come un poco el marco, y la luz del sol en el suelo */}
    <mesh geometry={planoGeo()} material={mat('resplandor-ventana', {mapa: resplandorTex(), color: '#fff2b0', transparente: 0.5, aditivo: true, sinLuz: true})}
      position={enPlano(600, 470, Z_PARED + 30)} scale={[1050, 1000, 1]} />
    <mesh geometry={planoGeo(2, 2)} material={mat('sol-suelo', {mapa: solSueloTex(), color: '#ffe27a', transparente: 0.3, aditivo: true, sinLuz: true})}
      position={[800, -SUELO + 2, 170]} rotation={[-Math.PI / 2, 0, 0.3]} scale={[600, 400, 1]} />
    {Array.from({length: 18}, (_, i) => {
      const x = 260 + azar(i, 1, 51) * 600 + Math.sin(t * 0.6 + i) * 20;
      const y = 300 + ((azar(i, 2, 52) * 900 + t * 24) % 900);
      return (
        <mesh key={`m${i}`} geometry={planoGeo()} material={mat('mota', {color: '#fff4c2', transparente: 0.8, aditivo: true, sinLuz: true})}
          position={[x, -y, -60 + azar(i, 3, 53) * 200]} scale={[5, 5, 1]} />
      );
    })}
  </group>
);

// ---------------------------------------------------------------- las luces de colores
export const Luces: React.FC = () => (
  <>
    <hemisphereLight args={['#a8dcff', '#6a2ab8', 1.6]} />
    {/* el sol que entra por la ventana: contraluz cálido, desde atrás y arriba a la derecha */}
    <directionalLight position={[2600, 1600, -3000]} intensity={4.4} color="#ffe9a0" />
    {/* la principal: cálida, arriba a la izquierda y por delante */}
    <directionalLight position={[-1600, 2200, 2600]} intensity={3.0} color="#ffd890" />
    {/* el relleno de color: magenta, bajo y desde la derecha */}
    <directionalLight position={[2600, 200, 600]} intensity={1.4} color="#ff5ad1" />
  </>
);

export const Nivel: React.FC<{t: number}> = ({t}) => (
  <group>
    <Fuera t={t} />
    <Pared t={t} />
    <Encimera />
    <Suelo />
    <Mesa />
    <Monedas t={t} />
    <Haces t={t} />
  </group>
);
