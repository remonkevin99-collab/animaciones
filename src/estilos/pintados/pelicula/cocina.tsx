import React from 'react';
import * as THREE from 'three';
import {rng} from '../../../comun/curvas';
import {BORDE, MESA_G, MESA_Y, SUELO} from '../../gato/escena';
import {Capa, Capsula, Contacto, type V3, Z_PARED, geoCaja, geoEsfera, geoPlano, geoTorno, ySuelo} from './comun';
import {liso} from './materiales';

// PELÍCULA ANIMADA, LA COCINA: una cocina pequeña y acogedora al caer la tarde, como el decorado de una película
// de animación: la pared verde azulado, la VENTANA grande con el cielo del atardecer (de ahí sale la luz dorada que entra a rayos),
// las cortinas finas que brillan, la guirnalda de lucecitas, la lámpara de techo encendida, la balda con sus botes y una planta que
// cuelga, la encimera con la fruta y los cacharros, los muebles de abajo y el suelo de tablas barnizadas. La pared y la encimera van
// desenfocadas (el objetivo enfoca al gato); la mesa, nítida. Todo en coordenadas de la pantalla, cada cosa a su profundidad.

export const VENTANA = {x0: 548, x1: 1036, y0: 132, y1: 872}; // el hueco, en la pared (en la pantalla)
export const ENCIMERA_Y = 872;
export const COL = {
  pared: '#2C6C78', pared2: '#24596A', marco: '#FFF0DC', encimera: '#D99A5C', encimeraCanto: '#B9783F',
  mueble: '#1F5566', muebleMarco: '#2C7184', tirador: '#E9B964', zocalo: '#173D49', balda: '#C78446',
  suelo: ['#B9784A', '#A9683D', '#C3875A', '#B07043'], alfombra: '#2E8C8C', alfombra2: '#F2D6A2', alfombra3: '#D9573A',
  mesa: '#7A3F22', mesaPata: '#6A361D', lampara: '#F0B53F', cortina: '#FFE2BF',
};

// ---------------------------------------------------------------- el cielo de la ventana: un lienzo pintado una vez (con su sol)
let cieloHecho: THREE.CanvasTexture | null = null;
const cielo = (): THREE.CanvasTexture => {
  if (cieloHecho) return cieloHecho;
  const W = 512, Hh = 768;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = Hh;
  const g = cv.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, Hh);
  gr.addColorStop(0, '#F27D72');
  gr.addColorStop(0.32, '#FFA36A');
  gr.addColorStop(0.62, '#FFCB72');
  gr.addColorStop(0.8, '#FFE6A6');
  gr.addColorStop(1, '#FFD27E');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, Hh);
  // el sol, bajo y a la derecha, con su halo
  const sx = W * 0.74, sy = Hh * 0.6;
  const halo = g.createRadialGradient(sx, sy, 0, sx, sy, W * 0.75);
  halo.addColorStop(0, 'rgba(255,252,230,1)');
  halo.addColorStop(0.08, 'rgba(255,245,200,1)');
  halo.addColorStop(0.25, 'rgba(255,214,140,0.6)');
  halo.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, W, Hh);
  // nubes largas, rosas por debajo
  const r = rng(303);
  for (let i = 0; i < 7; i++) {
    const cx = r() * W, cy = Hh * (0.12 + r() * 0.42), w = 120 + r() * 220, h = 14 + r() * 18;
    const ng = g.createLinearGradient(0, cy - h, 0, cy + h);
    ng.addColorStop(0, 'rgba(255,214,190,0.0)');
    ng.addColorStop(0.5, 'rgba(255,190,170,0.75)');
    ng.addColorStop(1, 'rgba(232,120,120,0.0)');
    g.fillStyle = ng;
    g.beginPath();
    g.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
    g.fill();
  }
  // los tejados y los árboles de lejos, a contraluz (malva)
  g.fillStyle = '#9A5A72';
  g.beginPath();
  g.moveTo(0, Hh);
  let x = 0;
  while (x < W) {
    const w = 40 + r() * 70, h = Hh * (0.13 + r() * 0.1);
    g.lineTo(x, Hh - h);
    if (r() < 0.5) g.lineTo(x + w / 2, Hh - h - 30);
    g.lineTo(x + w, Hh - h);
    x += w;
  }
  g.lineTo(W, Hh);
  g.fill();
  g.fillStyle = '#7C4560';
  for (let i = 0; i < 5; i++) {
    const cx = r() * W, cy = Hh * (0.84 + r() * 0.05), rr = 30 + r() * 40;
    g.beginPath();
    g.arc(cx, cy, rr, 0, Math.PI * 2);
    g.fill();
  }
  cieloHecho = new THREE.CanvasTexture(cv);
  cieloHecho.colorSpace = THREE.SRGBColorSpace;
  return cieloHecho;
};

// una caja con su sitio en la pantalla (x, y arriba a la izquierda, w, h) y su fondo d
const Caja: React.FC<{x: number; y: number; w: number; h: number; d: number; z?: number; r?: number; mat: THREE.Material; sombra?: boolean}> = ({
  x, y, w, h, d, z = 0, r = 4, mat, sombra = true,
}) => <mesh geometry={geoCaja(w, h, d, r)} material={mat} position={[x + w / 2, -(y + h / 2), z]} castShadow={sombra} receiveShadow />;
const Bola: React.FC<{c: V3; s: V3; mat: THREE.Material}> = ({c, s, mat}) => <mesh geometry={geoEsfera()} material={mat} position={c} scale={s} castShadow receiveShadow />;

// un bote de torno (de cocina): cuerpo, hombro y tapa
const Bote: React.FC<{x: number; y: number; r: number; h: number; mat: THREE.Material; tapa: THREE.Material; z?: number}> = ({x, y, r, h, mat, tapa, z = 40}) => (
  <group position={[x, -y, z]}>
    <mesh geometry={geoTorno([[0, 0], [r * 0.92, 0], [r, r * 0.12], [r, h * 0.82], [r * 0.82, h * 0.92], [r * 0.62, h * 0.96], [0, h * 0.96]], `bote${r}-${h}`, 40)}
      material={mat} castShadow receiveShadow />
    <mesh geometry={geoTorno([[0, h * 0.94], [r * 0.7, h * 0.94], [r * 0.72, h * 1.02], [r * 0.6, h * 1.08], [0, h * 1.08]], `tapa${r}-${h}`, 32)}
      material={tapa} castShadow receiveShadow />
  </group>
);

// ---------------------------------------------------------------- la pared y la encimera (van desenfocadas)
export const LUCES_GUIRNALDA: [number, number][] = (() => {
  // la guirnalda cuelga en dos curvas por encima de la ventana
  const out: [number, number][] = [];
  for (const [x0, x1, y0, cae] of [[500, 790, 112, 74], [790, 1090, 112, 82]] as const) {
    for (let i = 0; i <= 7; i++) {
      const k = i / 7;
      if (x0 === 790 && i === 0) continue;
      out.push([x0 + (x1 - x0) * k, y0 + cae * Math.sin(Math.PI * k)]);
    }
  }
  return out;
})();
export const BOMBILLA: [number, number] = [292, 176]; // la lámpara del techo (en la pantalla, a su profundidad)
export const Z_LAMPARA = -150;

export const Pared: React.FC<{t: number}> = ({t}) => {
  const m = {
    pared: liso(COL.pared, {rough: 0.95}),
    marco: liso(COL.marco, {rough: 0.55, capa: 0.3}),
    encimera: liso(COL.encimera, {rough: 0.45, capa: 0.5}),
    canto: liso(COL.encimeraCanto, {rough: 0.5, capa: 0.4}),
    mueble: liso(COL.mueble, {rough: 0.55, capa: 0.25}),
    muebleMarco: liso(COL.muebleMarco, {rough: 0.5, capa: 0.25}),
    tirador: liso(COL.tirador, {rough: 0.25, metal: 0.9}),
    zocalo: liso(COL.zocalo, {rough: 0.8}),
    balda: liso(COL.balda, {rough: 0.6}),
    cortina: liso(COL.cortina, {rough: 0.9, emite: '#FFC98E', fuerza: 0.55}),
    bombilla: liso('#FFF4D6', {emite: '#FFD08A', fuerza: 4}),
    luz: liso('#FFF1C8', {emite: '#FFC870', fuerza: 6}),
    cable: liso('#2A2A30', {rough: 0.6}),
  };
  const vidrioAmbar = liso('#E8933A', {rough: 0.15, capa: 1, emite: '#7A3A10', fuerza: 0.4});
  const vidrioVerde = liso('#5FB39A', {rough: 0.15, capa: 1, emite: '#1E5A48', fuerza: 0.4});
  const crema = liso('#F4E6CF', {rough: 0.4, capa: 0.6});
  const terracota = liso('#D0673E', {rough: 0.6});
  const hoja = liso('#3E9A55', {rough: 0.5, capa: 0.3});
  const hoja2 = liso('#5DBA62', {rough: 0.5, capa: 0.3});
  const naranja = liso('#FF8A1E', {rough: 0.35, capa: 0.5});
  const limon = liso('#FFD23A', {rough: 0.35, capa: 0.5});
  const cuenco = liso('#3F8FB8', {rough: 0.3, capa: 0.8});
  const libros = ['#E04E3A', '#F2B33D', '#3E7FC1', '#7A4FA0', '#F4E6CF'].map((c) => liso(c, {rough: 0.6}));
  const madera = liso('#9C5A2C', {rough: 0.6});
  const V = VENTANA;
  // la guirnalda tiembla un poco con el aire de la ventana
  const brisa = Math.sin(t * 1.3) * 2;
  return (
    <group dispose={null}>
      <Capa z={Z_PARED}>
        {/* la pared, con el hueco de la ventana */}
        <Caja x={-400} y={-400} w={V.x0 + 400} h={2000} d={10} z={-5} r={1} mat={m.pared} sombra={false} />
        <Caja x={V.x1} y={-400} w={600} h={2000} d={10} z={-5} r={1} mat={m.pared} sombra={false} />
        <Caja x={V.x0} y={-400} w={V.x1 - V.x0} h={V.y0 + 400} d={10} z={-5} r={1} mat={m.pared} sombra={false} />
        {/* el cielo, detrás de la ventana: brilla solo (más que nada en la escena) */}
        <mesh position={[(V.x0 + V.x1) / 2, -(V.y0 + V.y1) / 2, -160]} scale={[(V.x1 - V.x0) * 1.5, (V.y1 - V.y0) * 1.3, 1]} geometry={geoPlano()}>
          <meshBasicMaterial map={cielo()} toneMapped={false} color={new THREE.Color(1.35, 1.25, 1.15)} />
        </mesh>
        {/* el marco blanco con su cruz */}
        <Caja x={V.x0 - 24} y={V.y0 - 24} w={V.x1 - V.x0 + 48} h={26} d={40} z={14} r={6} mat={m.marco} />
        <Caja x={V.x0 - 24} y={V.y0 - 24} w={26} h={V.y1 - V.y0 + 30} d={40} z={14} r={6} mat={m.marco} />
        <Caja x={V.x1 - 2} y={V.y0 - 24} w={26} h={V.y1 - V.y0 + 30} d={40} z={14} r={6} mat={m.marco} />
        <Caja x={(V.x0 + V.x1) / 2 - 8} y={V.y0} w={16} h={V.y1 - V.y0} d={18} z={4} r={3} mat={m.marco} />
        <Caja x={V.x0} y={(V.y0 + V.y1) / 2 - 30} w={V.x1 - V.x0} h={16} d={18} z={4} r={3} mat={m.marco} />
        {/* las cortinas finas, recogidas a los lados: la luz las atraviesa */}
        {[[V.x0 - 60, 1], [V.x1 - 30, -1]].map(([x0, lado], n) =>
          [0, 1, 2].map((k) => {
            const x = x0 + k * 30;
            return <Capsula key={`${n}-${k}`} a={[x, -V.y0 + 40, 60 + k * 6]} b={[x + lado * (12 - k * 10), -V.y1 + 10, 60 + k * 6]} ra={20} rb={28} mat={m.cortina} sombra={false} />;
          }),
        )}
        <Capsula a={[V.x0 - 90, -V.y0 + 46, 70]} b={[V.x1 + 70, -V.y0 + 46, 70]} ra={7} rb={7} mat={m.cable} sombra={false} />

        {/* la guirnalda de lucecitas: el cable y sus bombillas */}
        {LUCES_GUIRNALDA.map(([x, y], i) => (
          <group key={i}>
            {i > 0 && LUCES_GUIRNALDA[i - 1][0] < x && (
              <Capsula a={[LUCES_GUIRNALDA[i - 1][0], -LUCES_GUIRNALDA[i - 1][1] - brisa, 90]} b={[x, -y - brisa, 90]} ra={2} rb={2} mat={m.cable} sombra={false} />
            )}
            <mesh geometry={geoEsfera()} material={m.luz} position={[x, -y - 12 - brisa, 92]} scale={[8, 11, 8]} />
          </group>
        ))}

        {/* la balda de la izquierda: botes de cristal, libros y una planta que cuelga */}
        <Caja x={-60} y={360} w={500} h={20} d={110} z={50} r={4} mat={m.balda} />
        <Bote x={20} y={360} r={34} h={108} mat={vidrioAmbar} tapa={madera} z={60} />
        <Bote x={98} y={360} r={28} h={80} mat={vidrioVerde} tapa={crema} z={60} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Caja key={i} x={148 + i * 26} y={250 + (i % 2) * 14} w={23} h={110 - (i % 2) * 14} d={80} z={55} r={3} mat={libros[i]} />
        ))}
        <Bote x={330} y={360} r={40} h={64} mat={terracota} tapa={terracota} z={60} />
        {[[-0.7, 70], [-0.25, 90], [0.2, 84], [0.6, 66], [0.0, 60], [1.0, 50]].map(([a, l], k) => (
          <Capsula key={k} a={[330, -298, 60]} b={[330 + Math.sin(a) * l, -298 + Math.cos(a) * l, 60 + (k - 2) * 8]} ra={10} rb={4} mat={k % 2 ? hoja2 : hoja} />
        ))}
        {/* la planta que cuelga de la balda (por la izquierda) */}
        {Array.from({length: 9}, (_, i) => {
          const y = 384 + i * 42, x = 30 + Math.sin(i * 0.9 + t * 0.6) * 8;
          return <Bola key={i} c={[x + (i % 2 ? 14 : -14), -y, 70]} s={[16, 11, 10]} mat={i % 2 ? hoja : hoja2} />;
        })}

        {/* la encimera (a la altura del alféizar) y lo que hay encima */}
        <Caja x={-400} y={ENCIMERA_Y} w={1900} h={30} d={150} z={60} r={6} mat={m.encimera} />
        <Caja x={-400} y={ENCIMERA_Y + 26} w={1900} h={10} d={140} z={62} r={3} mat={m.canto} />
        {/* el cuenco azul con naranjas y un limón */}
        <mesh geometry={geoTorno([[0, 0], [40, 0], [70, 30], [82, 52], [76, 54], [0, 54]], 'cuenco', 48)} material={cuenco}
          position={[880, -ENCIMERA_Y, 70]} castShadow receiveShadow />
        <Bola c={[850, -ENCIMERA_Y + 70, 70]} s={[34, 32, 34]} mat={naranja} />
        <Bola c={[905, -ENCIMERA_Y + 74, 62]} s={[36, 34, 36]} mat={naranja} />
        <Bola c={[878, -ENCIMERA_Y + 104, 66]} s={[30, 26, 30]} mat={limon} />
        {/* el bote de los cucharones */}
        <Bote x={1000} y={ENCIMERA_Y} r={36} h={96} mat={crema} tapa={crema} z={70} />
        {[[-12, 1.1], [6, 1.25], [16, 0.95]].map(([dx, k], i) => (
          <Capsula key={i} a={[1000 + dx, -ENCIMERA_Y + 80, 70]} b={[1000 + dx * 3.2, -ENCIMERA_Y + 80 + 90 * k, 70]} ra={6} rb={9} mat={madera} />
        ))}

        {/* los muebles de abajo: puertas con su marco y los tiradores de latón */}
        <Caja x={-400} y={ENCIMERA_Y + 36} w={1900} h={ySuelo(Z_PARED) - ENCIMERA_Y - 36 + 40} d={20} z={20} r={2} mat={m.mueble} sombra={false} />
        {[-180, 70, 320, 570, 820, 1070].map((x, i) => (
          <group key={i}>
            <Caja x={x + 12} y={ENCIMERA_Y + 52} w={226} h={120} d={18} z={36} r={8} mat={m.muebleMarco} />
            <Caja x={x + 12} y={ENCIMERA_Y + 186} w={226} h={ySuelo(Z_PARED) - ENCIMERA_Y - 186 - 60} d={18} z={36} r={8} mat={m.muebleMarco} />
            <Caja x={x + 34} y={ENCIMERA_Y + 208} w={182} h={ySuelo(Z_PARED) - ENCIMERA_Y - 252 - 60} d={10} z={46} r={6} mat={m.mueble} />
            <Capsula a={[x + 95, -(ENCIMERA_Y + 112), 52]} b={[x + 155, -(ENCIMERA_Y + 112), 52]} ra={6} rb={6} mat={m.tirador} />
            <Bola c={[x + (i % 2 ? 40 : 210), -(ENCIMERA_Y + 260), 54]} s={[9, 9, 9]} mat={m.tirador} />
          </group>
        ))}
        <Caja x={-400} y={ySuelo(Z_PARED) - 48} w={1900} h={60} d={30} z={30} r={2} mat={m.zocalo} sombra={false} />
      </Capa>

      {/* la lámpara del techo, por delante de la pared: la pantalla de chapa y la bombilla encendida */}
      <Capa z={Z_LAMPARA}>
        <Capsula a={[BOMBILLA[0], 200, 0]} b={[BOMBILLA[0], -110, 0]} ra={4} rb={4} mat={m.cable} sombra={false} />
        <mesh geometry={geoTorno([[0, 70], [16, 70], [22, 56], [70, 8], [96, -26], [92, -30], [64, -2], [18, 46], [0, 50]], 'lampara', 64)}
          material={liso(COL.lampara, {rough: 0.35, capa: 0.6})} position={[BOMBILLA[0], -(BOMBILLA[1] - 26), 0]} castShadow receiveShadow />
        <mesh geometry={geoEsfera()} material={m.bombilla} position={[BOMBILLA[0], -BOMBILLA[1], 0]} scale={[26, 30, 26]} />
      </Capa>
    </group>
  );
};

// ---------------------------------------------------------------- el suelo de tablas barnizadas y la alfombra (va un poco desenfocado)
export const Suelo: React.FC = () => {
  const tablas: React.ReactNode[] = [];
  const r = rng(717);
  // las tablas van hacia el fondo: sus juntas se juntan en el horizonte (dan profundidad)
  for (let col = -14; col < 16; col++) {
    let z = Z_PARED;
    let k = 0;
    while (z < 1400) {
      const largo = 500 + r() * 700;
      tablas.push(
        <mesh key={`${col}-${k}`} geometry={geoCaja(84, 10, Math.round(largo - 5), 3)}
          material={liso(COL.suelo[(col + 20 + k) % 4], {rough: 0.32, capa: 0.7, capaRough: 0.15})}
          position={[540 + col * 88, -SUELO - 5, z + largo / 2]} receiveShadow />,
      );
      z += largo;
      k++;
    }
  }
  return (
    <group dispose={null}>
      <mesh geometry={geoPlano()} position={[540, -SUELO - 8, 500]} rotation={[-Math.PI / 2, 0, 0]} scale={[8000, 3000, 1]}>
        <meshStandardMaterial color="#4A2814" roughness={1} />
      </mesh>
      {tablas}
      {/* la alfombra redonda, debajo de la mesa: mostaza con sus anillos */}
      {[[440, COL.alfombra], [372, COL.alfombra2], [318, COL.alfombra3], [246, COL.alfombra], [170, COL.alfombra2]].map(([R, c], i) => (
        <mesh key={i} position={[250, -SUELO + 1 + i * 0.6, 150]} rotation={[-Math.PI / 2, 0, 0]} scale={[R as number, (R as number) * 0.62, 1]}>
          <circleGeometry args={[1, 72]} />
          <meshStandardMaterial color={c as string} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- la mesa (nítida): el tablero barnizado, el faldón y las patas torneadas
const PR = 220; // media profundidad de la mesa
const PERFIL_PATA: [number, number][] = (() => {
  // de abajo arriba: el pie, dos bolas torneadas, el fuste que adelgaza y el dado de arriba
  const alto = SUELO - MESA_Y - MESA_G;
  const k = (y: number) => y * alto;
  return [
    [0, 0], [15, 0], [17, k(0.02)], [14, k(0.05)], [13, k(0.1)], [18, k(0.16)], [13, k(0.22)], [11, k(0.5)], [14, k(0.62)], [19, k(0.68)],
    [14, k(0.74)], [17, k(0.8)], [19, k(0.82)], [19, alto], [0, alto],
  ];
})();
export const Mesa: React.FC = () => {
  const madera = liso(COL.mesa, {rough: 0.38, capa: 0.75, capaRough: 0.12, refleja: 0.8});
  const pata = liso(COL.mesaPata, {rough: 0.42, capa: 0.6, capaRough: 0.15, refleja: 0.5});
  const azucar = liso('#F6EEDF', {rough: 0.25, capa: 1, refleja: 0.7});
  const azul = liso('#3D86C6', {rough: 0.25, capa: 1, refleja: 0.7});
  const plata = liso('#E6E3DE', {rough: 0.15, metal: 1, refleja: 1});
  const y0 = MESA_Y, g = MESA_G;
  const ancho = BORDE + 60;
  return (
    <group dispose={null}>
      <mesh geometry={geoCaja(ancho, g, 2 * PR, 10)} material={madera} position={[BORDE - ancho / 2, -(y0 + g / 2), 0]} castShadow receiveShadow />
      {/* el faldón */}
      <mesh geometry={geoCaja(ancho - 90, 40, 18, 5)} material={pata} position={[BORDE - ancho / 2, -(y0 + g + 20), PR - 30]} castShadow receiveShadow />
      {[100, 666].map((x) => [PR - 30, -PR + 30].map((z) => (
        <group key={`${x}-${z}`}>
          <mesh geometry={geoTorno(PERFIL_PATA, 'pata', 40)} material={pata} position={[x, -SUELO, z]} castShadow receiveShadow />
          <Contacto x={x + 4} y={SUELO} z={z} w={110} d={70} op={0.55} />
        </group>
      )))}
      {/* el azucarero azul y blanco con su cucharilla, a la izquierda del gato */}
      <group position={[52, -y0, -40]}>
        <mesh geometry={geoTorno([[0, 0], [30, 0], [40, 10], [44, 34], [40, 52], [30, 58], [0, 58]], 'azucar', 48)} material={azucar} castShadow receiveShadow />
        <mesh geometry={geoTorno([[0, 22], [44.5, 22], [45, 30], [0, 30]], 'azucar-raya', 48)} material={azul} />
        <mesh geometry={geoTorno([[0, 56], [33, 56], [35, 62], [24, 68], [10, 72], [8, 80], [0, 82]], 'azucar-tapa', 48)} material={azucar} castShadow receiveShadow />
      </group>
      <group position={[50, -y0 - 3, 70]} rotation={[0, 0.5, 0.05]}>
        <Capsula a={[-40, 0, 0]} b={[22, 0, 0]} ra={2.6} rb={3.4} mat={plata} />
        <mesh geometry={geoEsfera()} material={plata} position={[34, 0, 0]} scale={[15, 4, 10]} castShadow />
      </group>
      <Contacto x={52} y={y0} z={-40} w={130} d={90} op={0.55} />
    </group>
  );
};
