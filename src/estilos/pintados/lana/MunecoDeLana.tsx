import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three-stdlib';
import {loadFont} from '@remotion/google-fonts/LilitaOne';
import {clamp, p, rng, ruido, temblor} from '../../../comun/curvas';
import {DUR, IMPACTO, SUELO, T_SUELO, gato} from '../../gato/escena';
import {CAM_Y, D, Delante, LUCES, Mesa, Pared, Suelo, Z_PARED} from './decorado';
import {GatoLana, brillantesGato} from './gato';
import {TazaLana} from './taza';
import {type V3, brillo} from './punto';

// EL GATO EN MUÑECO DE LANA: la escena de escena.ts como un stop motion de muñecos de ganchillo
// (amigurumi). El gato es un muñeco de lana naranja con rayas tejidas, ojos de seguridad brillantes, bigotes de hilo y la nariz
// bordada; la taza, tejida y roja, con una espiral de lana marrón por café; la mesa con su mantel de punto y el cuarto entero de
// lana y fieltro (punto.ts, tejido.tsx, gato.tsx, taza.tsx, decorado.tsx). Se pinta en 3D (three) con texturas de punto hechas en un lienzo:
// filas de «V» con su relieve, los huecos oscuros y la pelusilla, y el brillo de terciopelo de la lana a contraluz.
// Como una foto macro de un plató en miniatura: luz cálida de estudio, la ventana que entra por detrás y perfila la pelusa, el fondo
// muy desenfocado con las lucecitas hechas bokeh, el suelo un poco y, nítido, el plano del gato. Todo lo que se anima va «a dos»
// (12 posturas por segundo, y en cada una cada pieza tiembla un pelo: un muñeco movido a mano); la cámara (el golpe) va «a unos».
// Al romperse: los pedazos de punto, la madeja que se desenrolla y un «¡cras!» de fieltro cosido.

const {fontFamily: LETRA} = loadFont();

const PASOS = 12; // posturas por segundo
// las posturas caen justo en el golpe (3,1 s): así el primer cuadro roto es el del golpe
const FASE = T_SUELO - Math.floor(T_SUELO * PASOS) / PASOS;
const MARGEN = 48; // el lienzo de la pared es más grande para que el desenfoque no oscurezca los bordes
const DESENFOQUE = 9; // px de desenfoque de la pared (a 1080)
const DESENFOQUE_SUELO = 2.2;
const DESENFOQUE_DELANTE = 9;

// la luz principal: arriba a la izquierda y por delante; su sombra cae detrás y a la derecha
const LLAVE: V3 = [-0.5, 1, 0.6];

const Camara: React.FC<{ancho: number; alto: number}> = ({ancho, alto}) => {
  const {camera} = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = (2 * Math.atan(alto / 2 / D) * 180) / Math.PI;
  cam.aspect = ancho / alto;
  cam.near = 60;
  cam.far = 20000;
  cam.position.set(540, -CAM_Y, D);
  cam.lookAt(540, -CAM_Y, 0);
  // el objetivo descentrado: la cámara está a la altura de los ojos del gato, pero el cuadro es el de siempre
  cam.setViewOffset(ancho, alto, 0, 960 - CAM_Y, ancho, alto);
  cam.updateProjectionMatrix();
  return null;
};

const Tono: React.FC<{exp?: number}> = ({exp = 1}) => {
  const {gl} = useThree();
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = exp;
  return null;
};

// los reflejos del estudio, solo en lo que brilla (los ojos de seguridad, las bolas de las agujas, las bombillas)
const Entorno: React.FC = () => {
  const {gl} = useThree();
  const tex = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl]);
  for (const [m, k] of [...brillantesGato(), [brillo('#FF5C7A'), 0.8], [brillo('#3FA9F5'), 0.8]] as [THREE.MeshPhysicalMaterial, number][]) {
    if (m.envMap !== tex) {
      m.envMap = tex;
      m.needsUpdate = true;
    }
    m.envMapIntensity = k;
  }
  return null;
};

// las luces del estudio: el cielo cálido, la principal con sombra suave, la ventana por detrás a la derecha (el contraluz que
// enciende la pelusa) y, en el plano del gato, una débil desde la cámara para el brillo de los ojos
const Luces: React.FC<{objetivo: V3; caja: number; parpadeo: number; mapa: number; frente?: boolean}> = ({objetivo, caja, parpadeo, mapa, frente}) => {
  const tgt = useMemo(() => new THREE.Object3D(), []);
  tgt.position.set(...objetivo);
  tgt.updateMatrixWorld();
  const n = Math.hypot(...LLAVE);
  const lejos = 4000;
  const pos: V3 = [objetivo[0] + (LLAVE[0] / n) * lejos, objetivo[1] + (LLAVE[1] / n) * lejos, objetivo[2] + (LLAVE[2] / n) * lejos];
  return (
    <>
      <hemisphereLight args={['#FFF0DC', '#6A4A5E', 0.9 * parpadeo]} />
      <primitive object={tgt} />
      <directionalLight position={pos} target={tgt} intensity={3.1 * parpadeo} color="#FFDDAE" castShadow
        shadow-mapSize-width={mapa} shadow-mapSize-height={mapa} shadow-bias={-0.0003} shadow-normalBias={2.5} shadow-radius={8}
        shadow-blurSamples={16}
        shadow-camera-left={-caja} shadow-camera-right={caja} shadow-camera-top={caja} shadow-camera-bottom={-caja}
        shadow-camera-near={100} shadow-camera-far={9000} />
      {/* el relleno, por la derecha y algo frío */}
      <directionalLight position={[objetivo[0] + 2600, objetivo[1] + 600, objetivo[2] + 3000]} intensity={0.55 * parpadeo} color="#E8F2FF" />
      {/* la ventana: contraluz dorado desde detrás a la derecha */}
      <directionalLight position={[objetivo[0] + 2200, objetivo[1] + 1400, objetivo[2] - 3600]} intensity={2.7 * parpadeo} color="#FFD49A" />
      {frente && (
        <>
          <directionalLight position={[objetivo[0] - 900, objetivo[1] + 1600, objetivo[2] - 3400]} intensity={0.9 * parpadeo} color="#FFE8C8" />
          <directionalLight position={[objetivo[0] - 300, objetivo[1] + 700, objetivo[2] + 4000]} intensity={0.35 * parpadeo} color="#FFFFFF" />
        </>
      )}
    </>
  );
};

// ---------------------------------------------------------------- lo que va por encima: los destellos y el «¡cras!»
// las lucecitas desenfocadas: discos de luz con el borde un poco más vivo, como un bokeh de verdad; titilan a saltos
const Bokeh: React.FC<{paso: number}> = ({paso}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
    {LUCES.map(([x, y], i) => {
      const r = rng(paso * 13 + i * 71)();
      const brilla = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(paso * 0.9 + i * 2.3)) * (0.85 + 0.15 * r);
      const R = 20 + ((i * 7) % 4) * 4;
      const tono = i % 4 === 1 ? '255,150,90' : i % 4 === 3 ? '255,120,150' : '255,190,80';
      return (
        <div key={i} style={{
          position: 'absolute', left: x - R, top: y - R, width: 2 * R, height: 2 * R, borderRadius: '50%', opacity: brilla,
          background: `radial-gradient(circle, rgba(${tono},0.75) 0%, rgba(${tono},0.62) 60%, rgba(255,236,190,0.9) 76%, rgba(${tono},0) 100%)`,
          boxShadow: `0 0 ${R * 1.4}px rgba(${tono},0.55)`,
        }} />
      );
    })}
  </AbsoluteFill>
);

// la luz de la ventana: rayos suaves que cruzan el cuarto y la pelusilla que flota en ellos
const Rayos: React.FC<{paso: number; t: number}> = ({paso, t}) => {
  const motas = Array.from({length: 34}, (_, i) => {
    const r = rng(500 + i);
    const x0 = 420 + r() * 640, y0 = 120 + r() * 1100, v = 6 + r() * 10, fase = r() * 6.3;
    const tp = paso / PASOS;
    const x = x0 - tp * v * 0.6 + ruido(tp * 0.6 + i, 3) * 18;
    const y = y0 + tp * v + Math.sin(tp * 1.3 + fase) * 10;
    const rr = 1.6 + r() * 2.6;
    const op = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(tp * 2 + fase));
    return <div key={i} style={{position: 'absolute', left: x - rr * 2, top: y - rr * 2, width: rr * 4, height: rr * 4, borderRadius: '50%', opacity: op,
      background: 'radial-gradient(circle, rgba(255,246,225,0.95) 0%, rgba(255,240,210,0.35) 45%, rgba(255,240,210,0) 72%)'}} />;
  });
  const vaiven = 0.03 * Math.sin(t * 0.8);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{mixBlendMode: 'screen', opacity: 0.85 + vaiven,
        background: 'linear-gradient(118deg, rgba(0,0,0,0) 26%, rgba(255,222,160,0.3) 34%, rgba(0,0,0,0) 41%, rgba(255,222,160,0.22) 47%, rgba(0,0,0,0) 54%, rgba(255,222,160,0.18) 60%, rgba(0,0,0,0) 68%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 82% 22%, #000 25%, rgba(0,0,0,0) 85%)',
        maskImage: 'radial-gradient(ellipse 80% 60% at 82% 22%, #000 25%, rgba(0,0,0,0) 85%)'}} />
      {/* el resplandor de la ventana y la mancha de sol que entra por ella */}
      <AbsoluteFill style={{mixBlendMode: 'screen', background: 'radial-gradient(ellipse 36% 22% at 78% 24%, rgba(255,226,170,0.4) 0%, rgba(255,226,170,0) 100%)'}} />
      <AbsoluteFill style={{mixBlendMode: 'soft-light', background: 'radial-gradient(ellipse 60% 40% at 40% 42%, rgba(255,214,140,0.55) 0%, rgba(255,214,140,0) 100%)'}} />
      <AbsoluteFill style={{mixBlendMode: 'screen'}}>{motas}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// el «¡cras!» de fieltro: una estrella amarilla con su canto y la palabra roja cosida a punto de hilván; entra de golpe a saltos
const ESTRELLA = (() => {
  const pts: string[] = [];
  const n = 13;
  const r = rng(321);
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const R = i % 2 === 0 ? 205 + r() * 40 : 128 + r() * 16;
    pts.push(`${(Math.cos(a) * R * 1.12).toFixed(1)},${(Math.sin(a) * R * 0.62).toFixed(1)}`);
  }
  return pts.join(' ');
})();
const Cras: React.FC<{t: number; paso: number}> = ({t, paso}) => {
  if (t < T_SUELO - 1e-6) return null;
  const n = Math.round((t - T_SUELO) * PASOS);
  const s = [0.75, 1.18, 0.95, 1.04, 1][Math.min(n, 4)];
  const r = rng(paso * 17 + 5);
  const giro = -8 + (r() - 0.5) * 2.2;
  const dx = (r() - 0.5) * 3, dy = (r() - 0.5) * 3;
  const cx = 846 + dx, cy = 1268 + dy;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
      <defs>
        <filter id="fieltro-cras" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="9" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.02" result="motas" />
          <feComposite in="motas" in2="d" operator="in" result="motasDentro" />
          <feGaussianBlur in="d" stdDeviation="5" result="b" />
          <feComposite in="d" in2="b" operator="arithmetic" k2="1" k3="-1" result="bordeClaro" />
          <feColorMatrix in="bordeClaro" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.25 0" result="brilloBorde" />
          <feMerge>
            <feMergeNode in="d" />
            <feMergeNode in="motasDentro" />
            <feMergeNode in="brilloBorde" />
          </feMerge>
        </filter>
        <filter id="sombra-cras" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      {/* las rayas del golpe, cosidas a punto de hilván: salen del suelo en abanico y se van en cuatro posturas */}
      {n < 4 && Array.from({length: 7}, (_, i) => {
        const a = (-160 + i * 23.3 + (rng(i * 7 + 3)() - 0.5) * 8) * (Math.PI / 180);
        const r0 = 95 + n * 34, r1 = r0 + 46 - n * 6;
        const x0 = IMPACTO[0] + Math.cos(a) * r0, y0 = SUELO - 18 + Math.sin(a) * r0 * 0.8;
        const x1 = IMPACTO[0] + Math.cos(a) * r1, y1 = SUELO - 18 + Math.sin(a) * r1 * 0.8;
        const d = `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)}`;
        return (
          <g key={`r${i}`} opacity={1 - n * 0.22}>
            <path d={d} stroke="rgba(60,20,10,0.45)" strokeWidth={9} strokeLinecap="round" />
            <path d={d} stroke="#FFF4E0" strokeWidth={6} strokeDasharray="11 7" strokeLinecap="round" />
          </g>
        );
      })}
      <g transform={`translate(${cx} ${cy}) rotate(${giro}) scale(${s})`}>
        <polygon points={ESTRELLA} fill="rgba(40,10,0,0.45)" transform="translate(10 16)" filter="url(#sombra-cras)" />
        <polygon points={ESTRELLA} fill="#D99413" transform="translate(4 7)" filter="url(#fieltro-cras)" />
        <polygon points={ESTRELLA} fill="#FFD23F" filter="url(#fieltro-cras)" />
        <polygon points={ESTRELLA} fill="none" stroke="#B9700C" strokeWidth={3.2} strokeDasharray="11 9" strokeLinecap="round" transform="scale(0.9)" />
        <g style={{fontFamily: LETRA}} textAnchor="middle" fontSize={124}>
          <text x={6} y={48} fill="rgba(60,0,0,0.35)" filter="url(#sombra-cras)">¡CRAS!</text>
          <text x={4} y={48} fill="#9C1620" filter="url(#fieltro-cras)">¡CRAS!</text>
          <text x={0} y={42} fill="#EC3340" filter="url(#fieltro-cras)">¡CRAS!</text>
          <text x={0} y={42} fill="none" stroke="#FFF3E2" strokeWidth={2.6} strokeDasharray="7 7" strokeLinecap="round" transform="translate(0 0)">¡CRAS!</text>
        </g>
      </g>
    </svg>
  );
};

export const MunecoDeLana: React.FC<{t: number}> = ({t: tt}) => {
  const t = clamp(tt, 0, DUR);
  // a dos: el tiempo salta de 1/12 en 1/12 de segundo (con las posturas puestas para que una caiga en el golpe)
  const paso = Math.max(0, Math.floor((t - FASE) * PASOS + 1e-6));
  const tq = paso / PASOS + FASE;
  const g = gato(tq);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  // el parpadeo de la luz entre foto y foto (muy poco)
  const parpadeo = 1 + (rng(paso * 31 + 3)() - 0.5) * 0.035;
  // el golpe: la cámara tiembla un momento (a unos, suave)
  const [sx, sy] = temblor(t, T_SUELO, 0.36, 11, 5);
  const golpe = t >= T_SUELO ? 1 - p(t, T_SUELO, 0.36) : 0;
  const mover = `translate(${sx}px, ${sy}px) scale(${1 + 0.02 * golpe})`;

  return (
    <AbsoluteFill style={{background: '#22AAA4', overflow: 'hidden'}}>
      {/* el revelado: colores vivos y algo de contraste, como la foto de un plató bien iluminado */}
      <AbsoluteFill style={{transform: mover, transformOrigin: '50% 60%', filter: 'saturate(1.14) contrast(1.06)'}}>
        {/* la pared, muy desenfocada */}
        <div style={{position: 'absolute', left: -MARGEN, top: -MARGEN, width: 1080 + 2 * MARGEN, height: 1920 + 2 * MARGEN, filter: `blur(${DESENFOQUE}px)`}}>
          <ThreeCanvas width={1080 + 2 * MARGEN} height={1920 + 2 * MARGEN} dpr={dpr} shadows="percentage" gl={{antialias: true}}
            camera={{fov: 30, near: 60, far: 20000, position: [540, -CAM_Y, D]}}>
            <Camara ancho={1080 + 2 * MARGEN} alto={1920 + 2 * MARGEN} />
            <Tono exp={1.02} />
            <color attach="background" args={['#22AAA4']} />
            <Luces objetivo={[560, -900, Z_PARED]} caja={1500} parpadeo={parpadeo} mapa={1024} />
            <Pared tq={tq} />
          </ThreeCanvas>
        </div>
        {/* el suelo y la alfombra, un poco desenfocados */}
        <div style={{position: 'absolute', inset: 0, filter: `blur(${DESENFOQUE_SUELO}px)`}}>
          <ThreeCanvas width={1080} height={1920} dpr={dpr} shadows="percentage" gl={{antialias: true, alpha: true}}
            camera={{fov: 30, near: 60, far: 20000, position: [540, -CAM_Y, D]}}>
            <Camara ancho={1080} alto={1920} />
            <Tono />
            <Luces objetivo={[540, -SUELO, 200]} caja={1300} parpadeo={parpadeo} mapa={1024} />
            <Suelo />
          </ThreeCanvas>
        </div>
        {/* nítido: la mesa, el gato y la taza, con sus sombras en el suelo */}
        <ThreeCanvas width={1080} height={1920} dpr={dpr} shadows="percentage" gl={{antialias: true, alpha: true}} style={{position: 'absolute', left: 0, top: 0}}
          camera={{fov: 30, near: 60, far: 20000, position: [540, -CAM_Y, D]}}>
          <Camara ancho={1080} alto={1920} />
          <Tono />
          <Luces objetivo={[540, -1050, 0]} caja={1000} parpadeo={parpadeo} mapa={2048} frente />
          <Entorno />
          <mesh position={[540, -SUELO + 0.3, 300]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[3000, 1400]} />
            <shadowMaterial color="#3A1A10" opacity={0.42} transparent />
          </mesh>
          <Mesa />
          <GatoLana g={g} t={tq} paso={paso} />
          <TazaLana tq={tq} paso={paso} />
        </ThreeCanvas>
        {/* delante, fuera de foco */}
        <div style={{position: 'absolute', inset: 0, filter: `blur(${DESENFOQUE_DELANTE}px)`}}>
          <ThreeCanvas width={1080} height={1920} dpr={dpr} shadows="percentage" gl={{antialias: true, alpha: true}}
            camera={{fov: 30, near: 60, far: 20000, position: [540, -CAM_Y, D]}}>
            <Camara ancho={1080} alto={1920} />
            <Tono />
            <Luces objetivo={[200, -SUELO, 560]} caja={700} parpadeo={parpadeo} mapa={1024} />
            <Delante />
          </ThreeCanvas>
        </div>
        <Bokeh paso={paso} />
        <Rayos paso={paso} t={t} />
        <Cras t={t} paso={paso} />
      </AbsoluteFill>
      {/* la viñeta cálida de la foto */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 78% 64% at 50% 46%, rgba(0,0,0,0) 52%, rgba(36,14,26,0.5) 100%)', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
