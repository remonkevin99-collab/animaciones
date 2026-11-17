import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {E, clamp, p, temblor} from '../../../comun/curvas';
import {DUR, T_SUELO, gato} from '../../gato/escena';
import {aplicaCamara, camara} from './camara';
import {GatoRetro} from './gato';
import {Hud} from './hud';
import {Luces, Nivel, PAL} from './mundo';
import {CAM_Y, D, FOV} from './retro';
import {TazaRetro} from './taza';

// EL GATO EN VIDEOJUEGO RETRO: la escena del gato que tira la taza como un juego 3D de consola de principios
// de los 2000 (sin nombrar ni copiar ninguna). El gato es el protagonista: pocas caras, sombreado plano, pelaje en una textura de
// 32 px sin filtrar y los ojos y la boca pintados en texturas que cambian (./gato.tsx). La cocina es un nivel (./mundo.tsx): ventana
// enorme con un cielo azul a bandas, colinas, molino, haces de luz, damero y monedas que flotan. La taza (./taza.tsx) se rompe en
// trozos de cerámica, café de poliedros y monedas que saltan. Encima, el HUD (./hud.tsx): travesura, puntos, objetivo, el aviso de
// EMPUJAR y, en el golpe, ¡+100!, ¡TAZA ROTA! y ¡COMBO x2!.
// Lo de época (./retro.tsx): el 3D se pinta a media resolución (540 × 960) y se agranda sin suavizar, sin antialias; los vértices caen
// en una rejilla (tiemblan un pelo) y las texturas del suelo y la pared bailan sin corregir la perspectiva; niebla de distancia; sin
// sombras de verdad, manchas debajo de cada cosa. Todo el 3D (también la cámara, ./camara.ts) va a 30 cuadros por segundo, como esas
// consolas; el HUD, fluido. En el golpe, la pantalla se sacude y acerca un poco.

const PASOS = 30;

const Camara: React.FC<{t: number}> = ({t}) => {
  const {camera} = useThree();
  aplicaCamara(camera as THREE.PerspectiveCamera, camara(t));
  return null;
};
// sin el tono de cine: los colores saturados, tal cual (como entonces)
const Tono: React.FC = () => {
  const {gl} = useThree();
  gl.toneMapping = THREE.NoToneMapping;
  gl.outputColorSpace = THREE.SRGBColorSpace;
  return null;
};

export const VideojuegoRetro: React.FC<{t: number}> = ({t: tt}) => {
  const t = clamp(tt + 1e-6, 0, DUR); // (el pelo de más: 2,3 + 24/30 da 3,0999…, y el golpe es a los 3,1)
  // el 3D, a 30 cuadros por segundo (el golpe, 3,1 s, cae justo en uno)
  const tq = Math.floor(t * PASOS + 1e-6) / PASOS;
  const g = gato(tq);
  const golpe = tq >= T_SUELO ? 1 - E.outCubic(p(tq, T_SUELO, 0.45)) : 0;
  const [sx, sy] = temblor(tq, T_SUELO, 0.45, 26, 7);
  return (
    <AbsoluteFill style={{background: PAL.cielo[2], overflow: 'hidden'}}>
      <style>{'.vj-3d canvas { image-rendering: pixelated; }'}</style>
      <AbsoluteFill className="vj-3d" style={{transform: `translate(${sx}px, ${sy}px) scale(${1 + 0.06 * golpe})`, transformOrigin: '70% 75%'}}>
        <ThreeCanvas width={1080} height={1920} dpr={0.5} gl={{antialias: false}}
          camera={{fov: FOV, near: 50, far: 30000, position: [540, -CAM_Y, D]}}>
          <Camara t={tq} />
          <Tono />
          <color attach="background" args={[PAL.niebla]} />
          <fog attach="fog" args={[PAL.niebla, 3600, 11000]} />
          <Luces />
          <Nivel t={tq} />
          <GatoRetro g={g} t={tq} />
          <TazaRetro tq={tq} />
        </ThreeCanvas>
      </AbsoluteFill>
      {/* la viñeta morada: las esquinas, más oscuras */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 62% at 52% 46%, rgba(40,0,80,0) 55%, rgba(40,0,80,0.38) 100%)', pointerEvents: 'none'}} />
      <AbsoluteFill style={{transform: `translate(${sx * 0.35}px, ${sy * 0.35}px)`}}>
        <Hud t={t} tq={tq} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
