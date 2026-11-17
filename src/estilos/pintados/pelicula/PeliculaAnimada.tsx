import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp, p, temblor} from '../../../comun/curvas';
import {DUR, SUELO, T_SUELO, gato} from '../../gato/escena';
import {BOMBILLA, Mesa, Pared, Suelo, Z_LAMPARA} from './cocina';
import {CAM_Y, D, FOV, type V3, Z_PARED} from './comun';
import {GatoPelicula} from './gato';
import {BrilloVentana, Bokeh, ManchaSol, Polvo, Rayos, Vapor, Vineta} from './luz';
import {conReflejos, cornea} from './materiales';
import {TazaPelicula} from './taza';

// EL GATO EN PELÍCULA ANIMADA: la escena de escena.ts como un fotograma de una película de
// animación 3D de estudio grande (sin copiar a ninguno): un gatito atigrado gris de ojos enormes, liso y suave, en una cocina
// acogedora al caer la tarde. LA LUZ manda: el sol dorado entra por la ventana de detrás en rayos con polvo flotando, le hace al gato
// un borde de luz cálido, un relleno frío por la izquierda le da volumen, la lámpara del techo y la guirnalda se vuelven bokeh en el
// fondo desenfocado. La taza es de cerámica roja esmaltada; al caer gira, al romperse salta en trozos con su sombra, el café salpica
// brillante y la cámara da una sacudida pequeña. Todo fluido (a 60 cuadros por segundo) y la cámara se acerca muy despacio.
// Tres lienzos de Three.js, como un objetivo de cine: la pared muy desenfocada, el suelo un poco y, nítido, el plano del gato (la
// mesa, él, la taza y lo que se rompe), con la luz en 2D por encima (./luz). Se renderiza con --gl=angle.

const MARGEN = 60; // el lienzo de la pared es más grande, para que el desenfoque no oscurezca los bordes
const DESENFOQUE = 9; // px de desenfoque de la pared (a 1080)
const DESENFOQUE_SUELO = 2.4;
const SOL: [number, number] = [930, 640]; // dónde cae el sol en la pantalla (dentro de la ventana)
const FOCO = '600px 1000px'; // hacia dónde se acerca la cámara

const Camara: React.FC<{ancho: number; alto: number}> = ({ancho, alto}) => {
  const {camera} = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = (2 * Math.atan(alto / 2 / D) * 180) / Math.PI;
  cam.aspect = ancho / alto;
  cam.near = 60;
  cam.far = 20000;
  cam.position.set(540, -CAM_Y, D);
  cam.lookAt(540, -CAM_Y, 0);
  // el objetivo descentrado: la cámara está a la altura de la cabeza del gato, pero el cuadro es el de siempre
  cam.setViewOffset(ancho, alto, 0, alto / 2 - CAM_Y - (alto - 1920) / 2, ancho, alto);
  cam.updateProjectionMatrix();
  return null;
};

const Tono: React.FC<{exp?: number}> = ({exp = 1}) => {
  const {gl} = useThree();
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = exp;
  return null;
};

// los reflejos: un cuarto pequeño con la ventana encendida a la derecha y detrás, la lámpara arriba y una luz suave delante.
// Así en el esmalte de la taza, en el café y en los ojos se refleja la ventana de verdad.
const Entorno: React.FC = () => {
  const {gl} = useThree();
  const tex = useMemo(() => {
    const esc = new THREE.Scene();
    esc.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({color: '#173943', side: THREE.BackSide})));
    const panel = (w: number, h: number, c: THREE.Color, pos: V3, rot: V3) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: c, side: THREE.DoubleSide}));
      m.position.set(...pos);
      m.rotation.set(...rot);
      esc.add(m);
    };
    panel(3.6, 4.4, new THREE.Color(7, 4.6, 2.6), [2.2, 1.2, -4.9], [0, 0, 0]); // la ventana
    panel(1.2, 1.2, new THREE.Color(6, 4, 2.2), [-1.6, 4.9, -0.6], [Math.PI / 2, 0, 0]); // la lámpara
    panel(6, 3, new THREE.Color(1.1, 1.05, 1.0), [0, 1.5, 4.9], [0, Math.PI, 0]); // la luz suave de delante
    panel(10, 10, new THREE.Color(0.5, 0.28, 0.16), [0, -4.9, 0], [-Math.PI / 2, 0, 0]); // el suelo de madera
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(esc, 0.035).texture;
    pm.dispose();
    return t;
  }, [gl]);
  for (const [m, k] of [...conReflejos(), [cornea(), 1.6] as [THREE.MeshPhysicalMaterial, number]]) {
    if (m.envMap !== tex) {
      m.envMap = tex;
      m.needsUpdate = true;
    }
    m.envMapIntensity = k;
  }
  return null;
};

// una luz que apunta a un sitio (las direccionales necesitan su objetivo en la escena)
const Direccional: React.FC<{desde: V3; a: V3; color: string; fuerza: number; sombra?: boolean; caja?: number; radio?: number}> = ({
  desde, a, color, fuerza, sombra = false, caja = 1100, radio = 6,
}) => {
  const tgt = useMemo(() => new THREE.Object3D(), []);
  tgt.position.set(...a);
  tgt.updateMatrixWorld();
  const n = Math.hypot(...desde);
  const lejos = 4000;
  const pos: V3 = [a[0] + (desde[0] / n) * lejos, a[1] + (desde[1] / n) * lejos, a[2] + (desde[2] / n) * lejos];
  return (
    <>
      <primitive object={tgt} />
      <directionalLight position={pos} target={tgt} intensity={fuerza} color={color} castShadow={sombra}
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0004} shadow-normalBias={2} shadow-radius={radio}
        shadow-blurSamples={16} shadow-camera-left={-caja} shadow-camera-right={caja} shadow-camera-top={caja} shadow-camera-bottom={-caja}
        shadow-camera-near={100} shadow-camera-far={9000} />
    </>
  );
};

// LA LUZ DEL PLANO DEL GATO: el sol de la ventana por detrás a la derecha (el borde dorado y las sombras largas hacia delante), una
// luz principal cálida y suave por delante a la derecha (la cara se lee), el relleno frío por la izquierda, la lámpara de arriba y el
// rebote del suelo
const LucesGato: React.FC = () => (
  <>
    <hemisphereLight args={['#9CC2E6', '#7A4630', 0.42]} />
    <Direccional desde={[0.62, 0.5, -0.6]} a={[560, -1150, 0]} color="#FFAE55" fuerza={4.6} sombra caja={1150} radio={7} />
    <Direccional desde={[0.45, 0.6, 0.66]} a={[540, -900, 0]} color="#FFDDB8" fuerza={2.1} sombra caja={1000} radio={9} />
    <Direccional desde={[-0.75, 0.15, 0.62]} a={[540, -900, 0]} color="#6F9BFF" fuerza={0.6} />
    <pointLight position={[BOMBILLA[0], -BOMBILLA[1] + 40, -60]} color="#FFC57A" intensity={1.1} distance={1600} decay={0} />
    {/* el rebote de la mesa: aclara la barbilla, el pecho y lo de abajo (sin él, debajo de la cabeza queda sucio) */}
    <Direccional desde={[0.25, -0.55, 0.8]} a={[480, -800, 0]} color="#FFC79A" fuerza={0.75} />
    {/* el rebote de la mancha de sol del suelo: ilumina desde abajo lo que se rompe ahí */}
    <pointLight position={[860, -SUELO + 120, 260]} color="#FFB062" intensity={1.6} distance={720} decay={0} />
  </>
);

export const PeliculaAnimada: React.FC<{t: number}> = ({t: tt}) => {
  const t = clamp(tt, 0, DUR);
  const g = gato(t);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  // la cámara se acerca muy despacio (más lo de cerca que el fondo: así se nota la profundidad)
  const sCerca = 1 + 0.013 * t;
  const sLejos = 1 + 0.006 * t;
  const sPolvo = 1 + 0.02 * t;
  // el golpe: la cámara tiembla un momento y da un pequeño empujón
  const [sx, sy] = temblor(t, T_SUELO, 0.42, 13, 5);
  const [gr] = temblor(t, T_SUELO, 0.42, 0.5, 9);
  const golpe = t >= T_SUELO ? 1 - p(t, T_SUELO, 0.4) : 0;
  const mover = `translate(${sx}px, ${sy}px) rotate(${gr}deg) scale(${1 + 0.014 * golpe})`;
  const lejos = {transform: `scale(${sLejos})`, transformOrigin: FOCO};
  const cerca = {transform: `scale(${sCerca})`, transformOrigin: FOCO};

  return (
    <AbsoluteFill style={{background: '#163A44', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: mover, transformOrigin: '50% 60%'}}>
        {/* la pared, la ventana y la encimera, muy desenfocadas, con su bokeh y los rayos por detrás del gato */}
        <AbsoluteFill style={lejos}>
          <div style={{position: 'absolute', left: -MARGEN, top: -MARGEN, width: 1080 + 2 * MARGEN, height: 1920 + 2 * MARGEN, filter: `blur(${DESENFOQUE}px)`}}>
            <ThreeCanvas width={1080 + 2 * MARGEN} height={1920 + 2 * MARGEN} dpr={dpr} shadows="percentage" gl={{antialias: true}}
              camera={{fov: FOV, near: 60, far: 20000, position: [540, -CAM_Y, D]}}>
              <Camara ancho={1080 + 2 * MARGEN} alto={1920 + 2 * MARGEN} />
              <Tono exp={1.05} />
              <color attach="background" args={['#1E4B57']} />
              <hemisphereLight args={['#8CC3D3', '#6A4030', 0.9]} />
              <Direccional desde={[-0.3, 0.4, 1]} a={[540, -900, Z_PARED]} color="#BFD8FF" fuerza={0.55} />
              <Direccional desde={[0.4, 0.5, -1]} a={[540, -900, Z_PARED]} color="#FFB060" fuerza={2.4} />
              <Direccional desde={[0.5, 0.8, 0.5]} a={[700, -900, Z_PARED]} color="#FFC890" fuerza={0.9} sombra caja={1300} radio={4} />
              <pointLight position={[BOMBILLA[0], -BOMBILLA[1] - 10, Z_LAMPARA + 20]} color="#FFB868" intensity={2.4} distance={1100} decay={0} />
              <Pared t={t} />
            </ThreeCanvas>
          </div>
          <Bokeh t={t} />
          <Rayos t={t} id="detras" />
        </AbsoluteFill>
        {/* el suelo, un poco desenfocado, con la mancha de sol */}
        <AbsoluteFill style={cerca}>
          <div style={{position: 'absolute', inset: 0, filter: `blur(${DESENFOQUE_SUELO}px)`}}>
            <ThreeCanvas width={1080} height={1920} dpr={dpr} shadows="percentage" gl={{antialias: true, alpha: true}}
              camera={{fov: FOV, near: 60, far: 20000, position: [540, -CAM_Y, D]}}>
              <Camara ancho={1080} alto={1920} />
              <Tono exp={1.05} />
              <hemisphereLight args={['#9CC4DA', '#5A3420', 0.85]} />
              <Direccional desde={[0.5, 0.45, -0.7]} a={[540, -SUELO, 200]} color="#FFB060" fuerza={2.2} />
              <Direccional desde={[-0.5, 0.6, 0.6]} a={[540, -SUELO, 200]} color="#FFE6CC" fuerza={0.9} />
              <Suelo />
            </ThreeCanvas>
          </div>
          <ManchaSol t={t} />
        </AbsoluteFill>
        {/* nítido: la mesa, el gato y la taza, con sus sombras en la mesa y en el suelo, y el vapor */}
        <AbsoluteFill style={cerca}>
          <ThreeCanvas width={1080} height={1920} dpr={dpr} shadows="percentage" gl={{antialias: true, alpha: true}} style={{position: 'absolute', left: 0, top: 0}}
            camera={{fov: FOV, near: 60, far: 20000, position: [540, -CAM_Y, D]}}>
            <Camara ancho={1080} alto={1920} />
            <Tono exp={1.0} />
            <LucesGato />
            <mesh position={[540, -SUELO + 0.3, 250]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[3600, 1500]} />
              <shadowMaterial color="#2A1426" opacity={0.42} transparent />
            </mesh>
            <Mesa />
            <GatoPelicula g={g} t={t} />
            <TazaPelicula t={t} />
            <Entorno />
          </ThreeCanvas>
          <Vapor t={t} />
        </AbsoluteFill>
        {/* la luz por delante: un velo de los rayos, el brillo de la ventana que se come los bordes y el polvo */}
        <AbsoluteFill style={lejos}>
          <Rayos t={t} op={0.32} id="delante" />
          <BrilloVentana t={t} sol={SOL} />
        </AbsoluteFill>
        <AbsoluteFill style={{transform: `scale(${sPolvo})`, transformOrigin: FOCO}}>
          <Polvo t={t} />
        </AbsoluteFill>
      </AbsoluteFill>
      <Vineta />
    </AbsoluteFill>
  );
};
