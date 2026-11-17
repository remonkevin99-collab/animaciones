import React from 'react';
import {loadFont as cargarLuckiest} from '@remotion/google-fonts/LuckiestGuy';
import {E, clamp, mix, p} from '../../../comun/curvas';
import {ESCALA_GATO, IMPACTO, SUELO, T_CAE, T_SUELO, enMundo, gato} from '../../gato/escena';
import {deEscena, tazaEnPantalla} from './camara';

// VIDEOJUEGO RETRO, EL HUD: lo que el juego pinta encima, nítido y fluido (a 60, aunque el 3D vaya a 30).
// Arriba a la izquierda, el retrato del gato en su aro dorado (su cara cambia: trama, se asusta, sonríe), la barra de TRAVESURA que se
// llena con cada empujón y revienta en ¡MÁX! al romperse la taza, y sus 9 vidas. Arriba a la derecha, los PUNTOS (que suben +100) y
// el OBJETIVO «tirar la taza», que se marca. Encima de la taza, el aviso del juego «EMPUJAR» con su botón, que se hunde con cada
// empujón; el «!» sobre el gato cuando la taza se va; y en el golpe, la estrella del impacto con su onda, «¡+100!» que sube desde el
// suelo, «¡TAZA ROTA!» y «¡COMBO x2!» en letras de juego con contorno, y un destello alrededor del golpe. Las letras, Luckiest Guy.

const {fontFamily: LETRA} = cargarLuckiest('normal', {weights: ['400'], subsets: ['latin']});
const TINTA = '#1a0b3a';

type Curva = (x: number) => number;
const kv = (t: number, claves: [number, number, Curva?][], def: Curva = E.inOutCubic) => {
  if (t <= claves[0][0]) return claves[0][1];
  for (let i = 1; i < claves.length; i++) {
    const [t1, v1, e] = claves[i];
    const [t0, v0] = claves[i - 1];
    if (t <= t1) return mix(v0, v1, (e || def)(p(t, t0, t1 - t0)));
  }
  return claves[claves.length - 1][1];
};
// entra con rebote: de 0 a 1 pasándose un poco
const rebote = (t: number, t0: number, d = 0.28) => (t < t0 ? 0 : E.muelle(clamp((t - t0) / d), 1.2, 5.5));

// un rótulo de juego: relleno con degradado, contorno gordo, otro fino blanco y la sombra abajo
const Rotulo: React.FC<{x: number; y: number; size: number; texto: string; grad: string; ancho?: number; ancla?: 'start' | 'middle' | 'end'; blanco?: boolean}> = ({
  x, y, size, texto, grad, ancho = size * 0.16, ancla = 'middle', blanco = true,
}) => {
  const comun = {x, y, fontFamily: LETRA, fontSize: size, textAnchor: ancla, letterSpacing: size * 0.02} as const;
  return (
    <g>
      <text {...comun} y={y + size * 0.09} fill={TINTA} stroke={TINTA} strokeWidth={ancho} strokeLinejoin="round">{texto}</text>
      <text {...comun} fill={TINTA} stroke={TINTA} strokeWidth={ancho} strokeLinejoin="round">{texto}</text>
      {blanco && <text {...comun} fill="none" stroke="#ffffff" strokeWidth={ancho * 0.36} strokeLinejoin="round">{texto}</text>}
      <text {...comun} fill={`url(#${grad})`}>{texto}</text>
    </g>
  );
};

// la huella de gato (el botón, las vidas)
const Huella: React.FC<{x: number; y: number; s: number; color: string}> = ({x, y, s, color}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
    <ellipse cx={0} cy={6} rx={11} ry={9} />
    <ellipse cx={-12} cy={-6} rx={4.6} ry={5.6} />
    <ellipse cx={-4.5} cy={-12} rx={4.6} ry={5.8} />
    <ellipse cx={4.5} cy={-12} rx={4.6} ry={5.8} />
    <ellipse cx={12} cy={-6} rx={4.6} ry={5.6} />
  </g>
);

// el retrato del gato, de frente, con la cara de cada momento
const Retrato: React.FC<{t: number}> = ({t}) => {
  const cara = t < T_CAE + 0.08 ? 'trama' : t < T_SUELO + 0.05 ? 'susto' : 'feliz';
  const ojo = (cx: number, lado: number) => {
    if (cara === 'feliz') return <path d={`M ${cx - 11} ${4} Q ${cx} ${-10} ${cx + 11} ${4}`} stroke={TINTA} strokeWidth={5} fill="none" strokeLinecap="round" />;
    const r = cara === 'susto' ? 13 : 11;
    return (
      <g>
        <ellipse cx={cx} cy={0} rx={r} ry={r * 1.05} fill="#d9f23a" stroke={TINTA} strokeWidth={3} />
        <ellipse cx={cx} cy={1} rx={cara === 'susto' ? 7 : 2.6} ry={cara === 'susto' ? 8 : 9} fill={TINTA} />
        <rect x={cx - 6} y={-7} width={4} height={4} fill="#fff" />
        {cara === 'trama' && <path d={`M ${cx - 14} ${-12 - lado * 4} L ${cx + 14} ${-12 + lado * 4} L ${cx + 14} ${-16} L ${cx - 14} ${-16} Z`} fill="#ff8a1c" stroke={TINTA} strokeWidth={3} strokeLinejoin="round" />}
      </g>
    );
  };
  return (
    <g>
      <circle r={78} fill="url(#vj-aro)" stroke={TINTA} strokeWidth={6} />
      <circle r={62} fill="url(#vj-fondo-retrato)" stroke={TINTA} strokeWidth={4} />
      <g transform="translate(0 10)">
        <path d="M -48 -16 L -40 -64 L -12 -38 Z" fill="#ff8a1c" stroke={TINTA} strokeWidth={4} strokeLinejoin="round" />
        <path d="M 48 -16 L 40 -64 L 12 -38 Z" fill="#ff8a1c" stroke={TINTA} strokeWidth={4} strokeLinejoin="round" />
        <path d="M -38 -28 L -36 -52 L -22 -38 Z M 38 -28 L 36 -52 L 22 -38 Z" fill="#ff8fb5" />
        <path d="M -50 0 L -42 -30 L -18 -42 L 18 -42 L 42 -30 L 50 0 L 40 26 L 0 40 L -40 26 Z" fill="#ff8a1c" stroke={TINTA} strokeWidth={4} strokeLinejoin="round" />
        <path d="M -8 -42 L -6 -28 M 0 -42 L 0 -26 M 8 -42 L 6 -28" stroke="#b8460c" strokeWidth={4} />
        <path d="M -20 18 L 0 10 L 20 18 L 14 32 L 0 38 L -14 32 Z" fill="#fff6e6" />
        {ojo(-21, 1)}
        {ojo(21, -1)}
        <path d="M -5 14 L 5 14 L 0 20 Z" fill="#ff5c95" stroke={TINTA} strokeWidth={2} />
        {cara === 'susto' ? <ellipse cx={0} cy={28} rx={5} ry={6} fill={TINTA} /> :
          <path d="M 0 20 L 0 24 M -9 24 Q -4 30 0 24 Q 4 30 9 24" stroke={TINTA} strokeWidth={3} fill="none" strokeLinecap="round" />}
      </g>
    </g>
  );
};

// ---------------------------------------------------------------- el HUD entero
export const Hud: React.FC<{t: number; tq: number}> = ({t, tq}) => {
  // la travesura: sube con cada toquecito y con el empujón, y revienta al romperse
  const trav = t >= T_SUELO ? 1 : kv(t, [[0, 0.3], [1.31, 0.34], [1.43, 0.44, E.outCubic], [1.81, 0.55, E.outCubic], [2.38, 0.6], [T_CAE, 0.84, E.lin]]);
  const max = t >= T_SUELO;
  const parpadeo = max && t < T_SUELO + 0.7 ? Math.floor((t - T_SUELO) * 14) % 2 === 0 : false;
  // los puntos: +100 rodando al romperse
  const puntos = Math.round(4250 + 100 * E.outCubic(p(t, T_SUELO + 0.05, 0.5)));
  const latePuntos = 1 + 0.16 * Math.sin(Math.PI * p(t, T_SUELO + 0.05, 0.22));
  const hecho = t >= T_SUELO + 0.1;
  // el aviso de EMPUJAR: encima de la taza mientras está en la mesa; el botón se hunde con cada empujón
  const [cx, cy] = tazaEnPantalla(tq);
  const empuja = (t > 1.22 && t < 1.43) || (t > 1.56 && t < 1.81) || (t > 2.38 && t < T_CAE);
  const avisoSale = p(t, T_CAE, 0.14);
  const avisoEntra = rebote(t, 0.9);
  const avisoK = avisoEntra * (1 - avisoSale);
  const pulsoBoton = empuja ? 0.86 : 1 + 0.06 * Math.sin(t * 12);
  // el «!» sobre el gato
  const g = gato(tq);
  const cabeza = enMundo(g.cabeza.c);
  const [ex, ey] = deEscena(tq, cabeza[0] + 10, cabeza[1] - 200 * ESCALA_GATO * 0.95);
  const exK = rebote(t, T_CAE + 0.08, 0.22) * (1 - p(t, T_SUELO + 0.12, 0.12));
  // el golpe
  const [ix, iy] = deEscena(tq, IMPACTO[0], SUELO - 30);
  const dt = t - T_SUELO;
  const estrella = dt >= 0 && dt < 0.17 ? 1 - p(dt, 0.07, 0.1) : 0;
  const estrellaS = dt >= 0 ? E.outCubic(clamp(dt / 0.07)) : 0;
  const onda = dt >= 0 && dt < 0.5 ? dt / 0.5 : -1;
  const masK = rebote(t, T_SUELO + 0.1, 0.25);
  const masY = iy - 170 - 80 * E.outCubic(p(t, T_SUELO + 0.1, 0.6));
  const masA = 1 - p(t, T_SUELO + 0.5, 0.2);
  const rotaK = rebote(t, T_SUELO + 0.12, 0.32);
  const comboK = rebote(t, T_SUELO + 0.3, 0.3);
  const destello = dt >= 0 && dt < 0.07 ? 1 : 0;
  const estrellaPts = Array.from({length: 20}, (_, i) => {
    const r = i % 2 === 0 ? 92 : 36;
    const a = (i / 20) * Math.PI * 2 + 0.2;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="vj-oro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff7a8" /><stop offset="0.45" stopColor="#ffd21a" /><stop offset="1" stopColor="#ff8a00" />
        </linearGradient>
        <linearGradient id="vj-rosa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd0f0" /><stop offset="0.5" stopColor="#ff4fb8" /><stop offset="1" stopColor="#c8148a" />
        </linearGradient>
        <linearGradient id="vj-cian" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6ffff" /><stop offset="0.5" stopColor="#3fe6ff" /><stop offset="1" stopColor="#1a8cff" />
        </linearGradient>
        <linearGradient id="vj-blanco" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#d8e6ff" />
        </linearGradient>
        <linearGradient id="vj-barra" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff2fa0" /><stop offset="0.6" stopColor="#ff8a1c" /><stop offset="1" stopColor="#ffe21a" />
        </linearGradient>
        <linearGradient id="vj-aro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff7a8" /><stop offset="0.5" stopColor="#ffc21a" /><stop offset="1" stopColor="#d86a00" />
        </linearGradient>
        <radialGradient id="vj-destello">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.85} /><stop offset="0.35" stopColor="#fff6c0" stopOpacity={0.45} />
          <stop offset="1" stopColor="#fff6c0" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="vj-fondo-retrato" cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#7fe0ff" /><stop offset="1" stopColor="#1f5cff" />
        </radialGradient>
      </defs>

      {/* el destello del golpe */}
      {destello > 0 && <circle cx={ix} cy={iy} r={560} fill="url(#vj-destello)" />}

      {/* ---------------- arriba a la izquierda: retrato, travesura y vidas */}
      <g transform="translate(118 150)">
        <Retrato t={t} />
      </g>
      <Rotulo x={214} y={100} size={40} texto="TRAVESURA" grad="vj-rosa" ancla="start" />
      <g transform="translate(214 116)">
        <rect x={0} y={0} width={400} height={50} rx={25} fill={TINTA} stroke="#ffffff" strokeWidth={5} />
        <rect x={7} y={7} width={Math.max(0, 386 * trav)} height={36} rx={18} fill="url(#vj-barra)" />
        {parpadeo && <rect x={7} y={7} width={386} height={36} rx={18} fill="#ffffff" opacity={0.5} />}
        <rect x={16} y={11} width={Math.max(0, 386 * trav - 24)} height={9} rx={4.5} fill="#ffffff" opacity={0.55} />
        {Array.from({length: 9}, (_, i) => <rect key={i} x={7 + (386 / 10) * (i + 1) - 1.5} y={9} width={3} height={32} fill={TINTA} opacity={0.35} />)}
        {max && (
          <g transform={`translate(330 -20) rotate(-10) scale(${rebote(t, T_SUELO, 0.25)})`}>
            <Rotulo x={0} y={0} size={44} texto="¡MÁX!" grad="vj-oro" />
          </g>
        )}
      </g>
      <Huella x={234} y={204} s={1.2} color="#ff8fb5" />
      <Rotulo x={258} y={222} size={36} texto="x9" grad="vj-blanco" ancla="start" />

      {/* ---------------- arriba a la derecha: puntos y objetivo */}
      <Rotulo x={1040} y={92} size={36} texto="PUNTOS" grad="vj-cian" ancla="end" />
      <g transform={`translate(1040 168) scale(${latePuntos}) translate(-1040 -168)`}>
        <Rotulo x={1040} y={168} size={78} texto={String(puntos).padStart(6, '0')} grad="vj-oro" ancla="end" ancho={13} />
      </g>
      <g transform="translate(640 196)">
        <rect x={0} y={0} width={404} height={58} rx={16} fill={TINTA} opacity={0.62} />
        <rect x={14} y={12} width={34} height={34} rx={7} fill={hecho ? '#2fe05a' : '#ffffff'} stroke={TINTA} strokeWidth={3} />
        {hecho && <path d="M 20 28 L 29 38 L 46 14" stroke="#ffffff" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        <text x={62} y={42} fontFamily={LETRA} fontSize={32} fill={hecho ? '#9ff7b4' : '#ffffff'}>TIRAR LA TAZA</text>
        {hecho && <rect x={60} y={26} width={250 * clamp((t - T_SUELO - 0.1) / 0.15)} height={4} fill="#9ff7b4" />}
      </g>

      {/* ---------------- el aviso del juego encima de la taza */}
      {avisoK > 0.01 && (
        <g transform={`translate(${cx + 70} ${cy - 185}) scale(${avisoK * (1 + 0.5 * avisoSale)})`} opacity={1 - avisoSale}>
          <path d="M -110 50 L -84 92 L -60 50 Z" fill="#ffffff" stroke={TINTA} strokeWidth={5} strokeLinejoin="round" />
          <rect x={-150} y={-56} width={300} height={116} rx={58} fill="#ffffff" stroke={TINTA} strokeWidth={6} />
          <g transform={`translate(-88 2) scale(${pulsoBoton})`}>
            <circle r={44} fill={TINTA} transform="translate(0 6)" />
            <circle r={44} fill={empuja ? '#1f9c4a' : '#2fe05a'} stroke={TINTA} strokeWidth={5} />
            <ellipse cx={-10} cy={-18} rx={20} ry={10} fill="#ffffff" opacity={0.45} />
            <Huella x={0} y={4} s={1.45} color="#ffffff" />
          </g>
          <text x={-30} y={20} fontFamily={LETRA} fontSize={48} fill={TINTA}>EMPUJAR</text>
        </g>
      )}

      {/* ---------------- el «!» sobre el gato */}
      {exK > 0.01 && (
        <g transform={`translate(${ex} ${ey}) scale(${exK}) rotate(${6 * Math.sin(t * 30)})`}>
          <path d="M 0 -78 L 22 -40 L 64 -46 L 40 -10 L 62 30 L 18 22 L 0 62 L -18 22 L -62 30 L -40 -10 L -64 -46 L -22 -40 Z"
            fill="#ffffff" stroke={TINTA} strokeWidth={6} strokeLinejoin="round" />
          <Rotulo x={0} y={34} size={96} texto="!" grad="vj-oro" />
        </g>
      )}

      {/* ---------------- el golpe: la onda, la estrella, ¡+100!, ¡TAZA ROTA! y ¡COMBO x2! */}
      {onda >= 0 && (
        <ellipse cx={ix} cy={iy + 10} rx={60 + 300 * E.outCubic(onda)} ry={18 + 80 * E.outCubic(onda)} fill="none" stroke="#ffffff"
          strokeWidth={14 * (1 - onda)} opacity={1 - onda} />
      )}
      {estrella > 0 && (
        <g transform={`translate(${ix - 40} ${iy - 60}) scale(${estrellaS * 1.1}) rotate(${dt * 120})`} opacity={estrella}>
          <polygon points={estrellaPts} fill="#ffe21a" stroke="#ffffff" strokeWidth={10} strokeLinejoin="round" />
          <circle r={28} fill="#ffffff" />
        </g>
      )}
      {masK > 0.01 && masA > 0 && (
        <g transform={`translate(${ix} ${masY}) scale(${masK})`} opacity={masA}>
          <Rotulo x={0} y={0} size={92} texto="¡+100!" grad="vj-oro" />
        </g>
      )}
      {rotaK > 0.01 && (
        <g transform={`translate(470 1178) rotate(-5) scale(${rotaK})`}>
          <Rotulo x={0} y={0} size={128} texto="¡TAZA ROTA!" grad="vj-oro" ancho={22} />
        </g>
      )}
      {comboK > 0.01 && (
        <g transform={`translate(440 1290) rotate(4) scale(${comboK})`}>
          <Rotulo x={0} y={0} size={78} texto="¡COMBO x2!" grad="vj-rosa" ancho={15} />
        </g>
      )}
    </svg>
  );
};
