import React from 'react';
import * as THREE from 'three';
import {mix, rng} from '../../../comun/curvas';
import {MESA_G, MESA_Y, SUELO} from '../../gato/escena';
import {PUNTO, VUELTA, type V3, brillo, fieltro, geoCajaTejida, geoFigura, geoOvoide, geoTuboFijo, lana, madera, mancha, type Tipo} from './punto';

// MUÑECO DE LANA, EL DECORADO: el cuarto en miniatura de un estudio de stop motion, todo de lana y
// fieltro. Detrás (muy desenfocado, como en una foto macro): la pared tejida a punto de media en verde azulado, la ventana de fieltro
// con su cielo, el sol, las nubes de algodón y las colinas, las cortinas de punto rosas, el banderín de fieltro, la guirnalda de
// lucecitas, el bastidor con un corazón bordado, la balda con ovillos y un cactus de ganchillo, y debajo de la mesa una cesta de
// ovillos. El suelo de tablas con la alfombra redonda de trapillo (un poco desenfocado). Nítida, la mesa: el mantel tejido verde
// menta con su puntilla blanca y las patas forradas de lana. Delante, fuera de foco, un ovillo rosa con sus agujas.
// LA CÁMARA (la misma idea que la plastilina): mira de frente; el plano del gato (z = 0) sale 1:1 en la pantalla, pero la
// cámara está a la altura de sus ojos (y 560) con el objetivo descentrado: así se ve la mesa por encima y el suelo donde se rompe.

export const FOV = 30;
export const D = 960 / Math.tan((FOV / 2) * (Math.PI / 180)); // la distancia de la cámara al plano z = 0
export const CAM_Y = 560;
export const Z_PARED = -420;
const PR = 220; // media profundidad de la mesa

// una capa a la profundidad z, escalada para que sus coordenadas (las de la pantalla, y hacia abajo) caigan en su sitio
export const Capa: React.FC<{z: number; children: React.ReactNode}> = ({z, children}) => {
  const s = (D - z) / D;
  return <group position={[540 * (1 - s), -CAM_Y * (1 - s), z]} scale={[s, s, s]}>{children}</group>;
};
// a qué profundidad está el suelo que en la pantalla sale en la y dada
export const zSuelo = (y: number) => D * (1 - (SUELO - CAM_Y) / Math.max(1, y - CAM_Y));
// dónde sale en la pantalla un punto del mundo (x, y hacia abajo, z)
export const enPantalla = (x: number, y: number, z: number): [number, number] => {
  const k = D / (D - z);
  return [540 + (x - 540) * k, CAM_Y + (y - CAM_Y) * k];
};

export const COL = {
  pared: '#22AAA4', paredHondo: '#178A88', zocalo: '#F6E7CF', cielo: '#8DD8F8', sol: '#FFD23F', nube: '#FFFFFF', colina: '#73C84E',
  colina2: '#4FAE3E', marco: '#FFF4E2', cortina: '#FF7FA8', cortina2: '#F35E8E', cuerda: '#FFF4E2', bombilla: '#FFE7A0',
  banderin: ['#FF5C7A', '#FFC83D', '#59D3B0', '#8E6CF0', '#FF8A3D', '#3FA9F5'], madera: '#D99A5B', maderaOscura: '#B97B42',
  tela: '#FFF6E8', corazon: '#F2394D', balda: '#E3A766', cesta: '#C98A4A', menta: '#7FE0C2', menta2: '#5FCFAE', puntilla: '#FFFFFF',
  pata: '#FFB938', pata2: '#FF6F61', suelo1: '#E2A86C', suelo2: '#D69A5E', suelo3: '#EAB57B', hueco: '#8A5530',
  alfombra: ['#FFC23D', '#FF6F61', '#FFF1DC', '#3FC1C9', '#FF8FB8', '#FFC23D', '#8E6CF0', '#FFF1DC'],
  ovillo: '#FF6FA2', ovillo2: '#FFD23F', ovillo3: '#9B7BF2', ovillo4: '#59D3B0', aguja: '#E8C08A', bola: '#FF5C7A', cactus: '#4DBB6B',
  maceta: '#E07A4F',
};

// un plano tejido con el punto a la escala que se pida (k: cuántas veces más grande que el del gato)
const planos = new Map<string, THREE.PlaneGeometry>();
const geoPlanoTejido = (w: number, h: number, k: number, tipo: Tipo) => {
  const clave = `${w}x${h}x${k}${tipo}`;
  let g = planos.get(clave);
  if (g) return g;
  g = new THREE.PlaneGeometry(w, h);
  const [S, R] = tipo === 'media' ? [6, 8] : tipo === 'cordon' ? [2, 4] : [8, 12];
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / (PUNTO * k) / S, (uv.getY(i) * h) / (VUELTA * k) / R);
  planos.set(clave, g);
  return g;
};

// un ovillo: la bola de hebras y unas vueltas cruzadas por encima
const Ovillo: React.FC<{c: V3; r: number; color: string; semilla: number}> = ({c, r, color, semilla}) => {
  const rr = rng(semilla);
  const m = lana(color, 'cordon', {pelusa: 1.4});
  return (
    <group position={c}>
      <mesh geometry={geoOvoide(r, r, r, semilla, {tipo: 'cordon', bultos: 0.03})} material={m} rotation={[rr() * 3, rr() * 3, rr() * 3]} castShadow receiveShadow />
      {[0, 1, 2].map((k) => {
        const a = rr() * Math.PI, b = rr() * Math.PI;
        const pts: V3[] = Array.from({length: 25}, (_, i) => {
          const f = (i / 24) * Math.PI * 1.3 - 0.2;
          return [Math.cos(f) * (r + 2), Math.sin(f) * (r + 2), 0] as V3;
        });
        return (
          <group key={k} rotation={[a, b, 0]}>
            <mesh geometry={geoTuboFijo(`ovillo${semilla}-${k}-${r}`, pts, pts.map(() => 4.5), {tipo: 'cordon'})} material={m} castShadow />
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------- la pared (va muy desenfocada)
export const Pared: React.FC<{tq: number}> = ({tq}) => {
  // el banderín: una cuerda que cuelga y los triángulos de fieltro que se mecen un poco
  const cuerda = (x: number, y0: number, y1: number, cae: number) => mix(y0, y1, (x + 60) / 1200) + cae * Math.sin(Math.PI * ((x + 60) / 1200));
  const banderas: React.ReactNode[] = [];
  for (let i = 0; i < 13; i++) {
    const x = -20 + i * 92;
    const y = cuerda(x, 70, 100, 80);
    const vaiven = 0.06 * Math.sin(tq * 2.2 + i * 1.3);
    banderas.push(
      <group key={i} position={[x, -y, 30]} rotation={[0, 0, vaiven]}>
        <mesh geometry={geoFigura('bandera', [[-38, 0], [38, 0], [0, 84]], 7, 2.5)} material={fieltro(COL.banderin[i % COL.banderin.length])} castShadow receiveShadow />
      </group>,
    );
  }
  const ptsCuerda: V3[] = Array.from({length: 24}, (_, i) => {
    const x = -60 + (i / 23) * 1200;
    return [x, -cuerda(x, 70, 100, 80), 30];
  });
  // la guirnalda de lucecitas (sus brillos los pinta el desenfoque de delante)
  const ptsLuces: V3[] = Array.from({length: 24}, (_, i) => {
    const x = -60 + (i / 23) * 1200;
    return [x, -LUCES_Y(x), 40];
  });
  const fondo = lana([COL.pared, COL.pared, COL.pared, COL.pared, COL.pared, COL.pared, COL.pared, COL.paredHondo], 'media', {pelusa: 0.6, hondo: 0.45});
  return (
    <group dispose={null}>
      <mesh geometry={geoPlanoTejido(6000, 4000, 2.6, 'media')} material={fondo} position={[540, -900, Z_PARED]} receiveShadow />
      {/* el zócalo, de verdad en el suelo */}
      <mesh geometry={geoCajaTejida(6000, 40, 26, 'cordon')} material={lana(COL.zocalo, 'cordon')} position={[540, -SUELO + 20, Z_PARED + 13]} castShadow receiveShadow />
      <Capa z={Z_PARED + 1}>
        {/* la ventana: el cielo que brilla, el sol, las nubes de algodón y las colinas, el marco y el alféizar */}
        <mesh position={[825, -470, 2]}>
          <planeGeometry args={[440, 600]} />
          <meshStandardMaterial color={COL.cielo} emissive={COL.cielo} emissiveIntensity={1.15} roughness={1} />
        </mesh>
        <group position={[940, -270, 8]}>
          <mesh geometry={geoOvoide(52, 52, 8, 401, {bultos: 0})} material={fieltro(COL.sol, {emite: '#FFC93A', fuerza: 0.7})} rotation={[Math.PI / 2, 0, 0]} />
          {Array.from({length: 9}, (_, i) => {
            const a = (i / 9) * Math.PI * 2 + 0.2;
            return (
              <group key={i} position={[Math.cos(a) * 68, Math.sin(a) * 68, 0]} rotation={[0, 0, a - Math.PI / 2]}>
                <mesh geometry={geoFigura('rayo', [[-10, 0], [10, 0], [0, -26]], 6, 2)} material={fieltro(COL.sol, {emite: '#FFC93A', fuerza: 0.5})} />
              </group>
            );
          })}
        </group>
        {[[700, 330, 1], [860, 470, 0.75], [690, 560, 0.6]].map(([nx, ny, s], n) => (
          <group key={n} position={[nx, -ny, 18]} scale={[s, s, s]}>
            {[[-46, 8, 30], [-12, -12, 42], [28, -2, 36], [58, 10, 24], [10, 14, 30]].map(([bx, by, br], k) => (
              <mesh key={k} geometry={geoOvoide(br, br * 0.85, br * 0.6, 410 + n * 10 + k, {tipo: 'cordon', bultos: 0.08})}
                material={lana(COL.nube, 'cordon', {pelusa: 3, hondo: 0.75})} position={[bx, -by, 0]} />
            ))}
          </group>
        ))}
        <mesh geometry={geoFigura('colina1', [[600, 770], [600, 680], [680, 640], [780, 650], [880, 700], [960, 740], [1050, 760], [1050, 770]], 10, 3)}
          material={fieltro(COL.colina)} position={[0, 0, 10]} />
        <mesh geometry={geoFigura('colina2', [[600, 775], [700, 720], [820, 700], [940, 680], [1050, 700], [1050, 775]], 10, 3)}
          material={fieltro(COL.colina2)} position={[0, 0, 14]} />
        {/* el marco y el alféizar, de fieltro crema */}
        {([[590, 160, 470, 24], [590, 770, 470, 24], [590, 160, 24, 634], [1036, 160, 24, 634], [814, 170, 14, 600], [600, 458, 440, 14]] as const).map(([x, y, w, h], i) => (
          <mesh key={i} geometry={geoCajaTejida(w, h, 30, 'cordon')} material={lana(COL.marco, 'cordon', {pelusa: 0.8})} position={[x + w / 2, -(y + h / 2), 20]} castShadow receiveShadow />
        ))}
        <mesh geometry={geoCajaTejida(520, 24, 80, 'cordon')} material={lana(COL.marco, 'cordon')} position={[825, -800, 40]} castShadow receiveShadow />
        {/* las cortinas de punto rosa, con sus pliegues y la barra */}
        <mesh geometry={geoTuboFijo('barra', [[540, -140, 60], [1110, -140, 60]], [9, 9])} material={madera(COL.maderaOscura)} castShadow />
        {[0, 1].map((n) =>
          [0, 1, 2, 3].map((k) => {
            const x = n === 0 ? 560 + k * 30 : 1090 - k * 30;
            const pts: V3[] = [[x, -150, 60 + (k % 2) * 12], [x + (n ? -1 : 1) * k * 4, -480, 62 + (k % 2) * 12], [x + (n ? -1 : 1) * (k * 10 - 4), -860, 64 + (k % 2) * 12]];
            return <mesh key={`${n}-${k}`} geometry={geoTuboFijo(`cortina${n}${k}`, pts, [20, 22, 26], {puntas: [false, true]})}
              material={lana(k % 2 ? COL.cortina : COL.cortina2, 'media')} castShadow receiveShadow />;
          }),
        )}

        {/* el banderín y la guirnalda */}
        <mesh geometry={geoTuboFijo('cuerda', ptsCuerda, ptsCuerda.map(() => 3.5), {tipo: 'cordon'})} material={lana(COL.cuerda, 'cordon')} />
        {banderas}
        <mesh geometry={geoTuboFijo('luces', ptsLuces, ptsLuces.map(() => 2.5), {tipo: 'cordon'})} material={lana('#3E6B3A', 'cordon')} />
        {LUCES.map(([x, y], i) => (
          <mesh key={i} geometry={geoOvoide(9, 13, 9, 430 + i, {bultos: 0})} material={brillo(COL.bombilla, {emite: '#FFD27A', fuerza: 2.2})} position={[x, -y, 46]} />
        ))}

        {/* el bastidor con un corazón bordado */}
        <group position={[175, -330, 16]}>
          <mesh geometry={geoOvoide(92, 92, 4, 440, {bultos: 0})} material={fieltro(COL.tela)} rotation={[Math.PI / 2, 0, 0]} receiveShadow />
          <mesh material={madera(COL.madera)} castShadow>
            <torusGeometry args={[94, 8, 14, 64]} />
          </mesh>
          <mesh geometry={geoTuboFijo('tornillo', [[-8, 106, 4], [8, 106, 4]], [7, 7])} material={madera(COL.maderaOscura)} />
          <mesh geometry={geoFigura('corazon', CORAZON, 8, 3, 12)} material={lana(COL.corazon, 'cordon', {pelusa: 0.6})} position={[0, 0, 6]} />
        </group>

        {/* la balda con ovillos y el cactus de ganchillo en su maceta */}
        <mesh geometry={geoCajaTejida(380, 22, 110, 'cordon')} material={madera(COL.balda)} position={[150, -620, 55]} castShadow receiveShadow />
        <Ovillo c={[20, -572, 60]} r={42} color={COL.ovillo} semilla={450} />
        <Ovillo c={[100, -580, 70]} r={34} color={COL.ovillo2} semilla={451} />
        <Ovillo c={[-50, -580, 72]} r={34} color={COL.ovillo3} semilla={452} />
        <group position={[250, -609, 60]}>
          <mesh geometry={geoOvoide(40, 30, 40, 460, {arriba: Math.PI * 0.55})} material={fieltro(COL.maceta)} rotation={[Math.PI, 0, 0]} position={[0, 26, 0]} castShadow />
          <mesh geometry={geoOvoide(26, 62, 26, 461)} material={lana(COL.cactus)} position={[0, 82, 0]} castShadow />
          <mesh geometry={geoTuboFijo('brazo-cactus', [[18, 78, 0], [40, 82, 0], [44, 110, 0]], [12, 12, 12])} material={lana(COL.cactus)} castShadow />
          <mesh geometry={geoOvoide(9, 9, 9, 462, {bultos: 0})} material={fieltro('#FF6FA2')} position={[0, 146, 0]} />
        </group>

        {/* la cesta de ovillos, debajo de la mesa */}
        <group position={[380, -1430, 30]}>
          <mesh geometry={geoOvoide(150, 80, 90, 470, {tipo: 'media', arriba: Math.PI * 0.5})} material={lana(COL.cesta, 'media')} rotation={[Math.PI, 0, 0]} castShadow receiveShadow />
          <Ovillo c={[-80, 10, 20]} r={48} color={COL.ovillo4} semilla={471} />
          <Ovillo c={[0, 24, 10]} r={54} color={COL.ovillo} semilla={472} />
          <Ovillo c={[80, 8, 20]} r={46} color={COL.ovillo3} semilla={473} />
          <Ovillo c={[38, 6, 60]} r={36} color={COL.ovillo2} semilla={474} />
        </group>
      </Capa>
    </group>
  );
};
const LUCES_Y = (x: number) => mix(200, 230, (x + 60) / 1200) + 60 * Math.sin(Math.PI * ((x + 60) / 1200)) + 14 * Math.sin(x * 0.02);
// dónde van las lucecitas (en la pantalla, porque la capa de la pared cae 1:1)
export const LUCES: [number, number][] = Array.from({length: 17}, (_, i) => {
  const x = -30 + i * 70;
  return [x, LUCES_Y(x) + 12];
});
const CORAZON: [number, number][] = Array.from({length: 40}, (_, i) => {
  const a = (i / 40) * Math.PI * 2;
  const x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
  return [x * 3.4, -y * 3.4 + 6] as [number, number];
});

// ---------------------------------------------------------------- el suelo de tablas y la alfombra de trapillo (un poco desenfocado)
export const Suelo: React.FC = () => {
  const tablas: React.ReactNode[] = [];
  const r = rng(717);
  const cols = [COL.suelo1, COL.suelo2, COL.suelo3];
  for (let fila = 0; fila < 14; fila++) {
    const z = Z_PARED + 50 + fila * 100;
    let x = -1400 - r() * 600;
    let k = 0;
    while (x < 2500) {
      const largo = 700 + r() * 600;
      tablas.push(
        <mesh key={`${fila}-${k}`} position={[x + largo / 2, -SUELO - 6, z]} castShadow receiveShadow>
          <boxGeometry args={[largo - 6, 12, 94]} />
          <meshPhysicalMaterial color={cols[(fila + k) % 3]} roughness={0.6} clearcoat={0.2} clearcoatRoughness={0.5} />
        </mesh>,
      );
      x += largo;
      k++;
    }
  }
  // la alfombra: anillos de trapillo (cinta gorda y aplastada) cosidos uno al lado del otro
  const anillos: React.ReactNode[] = [];
  const CX = 600, CZ = 140;
  for (let i = 0; i < 17; i++) {
    const rx = 40 + i * 27, rz = rx * 0.56;
    const pts: V3[] = Array.from({length: 49}, (_, k) => {
      const a = (k / 48) * Math.PI * 2;
      return [CX + Math.cos(a) * rx, -SUELO + 6, CZ + Math.sin(a) * rz];
    });
    anillos.push(
      <mesh key={i} geometry={geoTuboFijo(`alfombra${i}`, pts, pts.map(() => 14), {tipo: 'cordon', puntas: [false, false], lados: 12})}
        material={lana(COL.alfombra[i % COL.alfombra.length], 'cordon', {pelusa: 0.5})} scale={[1, 0.5, 1]} position={[0, -SUELO * 0.5 + 3, 0]} receiveShadow />,
    );
  }
  return (
    <group dispose={null}>
      <mesh position={[540, -SUELO - 10, Z_PARED + 850]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7000, 1700]} />
        <meshStandardMaterial color={COL.hueco} roughness={1} />
      </mesh>
      {tablas}
      {anillos}
    </group>
  );
};

// ---------------------------------------------------------------- la mesa (nítida): el mantel tejido, la puntilla y las patas forradas
export const Mesa: React.FC = () => {
  const y0 = MESA_Y, g = MESA_G;
  const mantel = lana([COL.menta, COL.menta, COL.menta, COL.menta, COL.menta, COL.menta, COL.menta, COL.menta, COL.menta, COL.menta, COL.menta2, COL.menta2]);
  const forro = lana([COL.pata, COL.pata, COL.pata, COL.pata2], 'cordon', {pelusa: 0.8});
  // la puntilla: ondas de ganchillo blanco colgando del canto de delante
  const ondas: React.ReactNode[] = [];
  for (let i = 0; i < 17; i++) {
    const x0 = -60 + i * 46;
    const pts: V3[] = Array.from({length: 9}, (_, k) => {
      const a = (k / 8) * Math.PI;
      return [x0 + 23 - Math.cos(a) * 21, -(y0 + g + Math.sin(a) * 20), PR + 3];
    });
    ondas.push(<mesh key={i} geometry={geoTuboFijo('onda', pts.map(([x, y, z]) => [x - x0, y, z] as V3), pts.map(() => 4.2), {tipo: 'cordon'})}
      material={lana(COL.puntilla, 'cordon', {pelusa: 0.6})} position={[x0, 0, 0]} castShadow />);
    ondas.push(<mesh key={`b${i}`} geometry={geoOvoide(5, 5, 5, 480, {bultos: 0})} material={lana(COL.puntilla, 'cordon')} position={[x0 + 23, -(y0 + g + 25), PR + 3]} />);
  }
  return (
    <group dispose={null}>
      <mesh geometry={geoCajaTejida(790, g, 2 * PR)} material={mantel} position={[325, -(y0 + g / 2), 0]} castShadow receiveShadow />
      {/* el canto del mantel: un cordón enrollado */}
      <mesh geometry={geoTuboFijo('canto', [[-70, -(y0 + g), PR], [720, -(y0 + g), PR]], [5, 5], {tipo: 'cordon'})} material={lana(COL.menta2, 'cordon')} castShadow />
      {ondas}
      {/* las cuatro patas, forradas de lana enrollada */}
      {[123, 665].map((x) => [PR - 30, -PR + 30].map((z) => (
        <mesh key={`${x}-${z}`} geometry={geoTuboFijo(`pata${x}${z}`, [[x, -(y0 + g), z], [x, -SUELO, z]], [17, 17], {tipo: 'cordon', puntas: [false, false]})}
          material={forro} castShadow receiveShadow />
      )))}
      {[123, 665].map((x) => [PR - 30, -PR + 30].map((z) => (
        <mesh key={`s${x}-${z}`} position={[x + 12, -SUELO + 0.8, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[90, 60, 1]} renderOrder={2}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={mancha()} color="#2a1206" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
        </mesh>
      )))}
    </group>
  );
};

// ---------------------------------------------------------------- delante, fuera de foco: el ovillo rosa con sus agujas
export const Delante: React.FC = () => {
  const z = 560;
  return (
    <group dispose={null}>
      <Ovillo c={[215, -SUELO + 115, z]} r={115} color={COL.ovillo} semilla={490} />
      <mesh geometry={geoTuboFijo('aguja1', [[90, -SUELO + 70, z + 60], [400, -SUELO + 330, z - 40]], [7, 7])} material={madera(COL.aguja, 0.4)} castShadow />
      <mesh geometry={geoOvoide(16, 16, 16, 491, {bultos: 0})} material={brillo(COL.bola)} position={[400, -SUELO + 330, z - 40]} />
      <mesh geometry={geoTuboFijo('aguja2', [[150, -SUELO + 50, z + 80], [470, -SUELO + 240, z - 20]], [7, 7])} material={madera(COL.aguja, 0.4)} castShadow />
      <mesh geometry={geoOvoide(16, 16, 16, 492, {bultos: 0})} material={brillo('#3FA9F5')} position={[470, -SUELO + 240, z - 20]} />
      {/* la hebra suelta que se va por el suelo */}
      <mesh geometry={geoTuboFijo('hebra-suelta', [[300, -SUELO + 30, z], [420, -SUELO + 8, z - 40], [560, -SUELO + 7, z - 10], [700, -SUELO + 7, z - 90]], [4.5, 4.5, 4.5, 4.5], {tipo: 'cordon'})}
        material={lana(COL.ovillo, 'cordon')} castShadow />
    </group>
  );
};
