import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, mix, rng, ruido} from '../../../comun/curvas';
import {T_CAE, curva, vapor} from '../../gato/escena';
import {BOMBILLA, LUCES_GUIRNALDA, VENTANA} from './cocina';

// PELÍCULA ANIMADA, LA LUZ: lo que en una película hace la cámara y el aire, pintado encima en 2D: los RAYOS de
// sol que entran por la ventana en diagonal, el polvo que flota y brilla dentro de ellos, el bokeh (los círculos de luz de lo que
// está desenfocado: la guirnalda y la lámpara), el vapor del café, el brillo de la ventana que se come los bordes del gato
// (lo que pasa con un contraluz de verdad), la mancha de sol en el suelo y la viñeta. Todo sale de t: el mismo segundo, el mismo
// cuadro. Coordenadas de la pantalla (1080 × 1920).

// hacia dónde va la luz en la pantalla: de la ventana (arriba a la derecha) hacia abajo a la izquierda
const DIR = (() => {
  const d = [-0.62, 1];
  const l = Math.hypot(d[0], d[1]);
  return [d[0] / l, d[1] / l] as [number, number];
})();
const NORMAL: [number, number] = [DIR[1], -DIR[0]];

// los haces: salen de la ventana, cada uno con su ancho, su fuerza y su latido
type Haz = {x: number; y: number; ancho: number; largo: number; fuerza: number; fase: number};
const HACES: Haz[] = (() => {
  const r = rng(808);
  const out: Haz[] = [];
  const V = VENTANA;
  for (let i = 0; i < 9; i++) {
    const k = (i + 0.5) / 9;
    out.push({
      x: mix(V.x0 + 30, V.x1 + 40, k) + (r() - 0.5) * 30, y: mix(V.y0 + 60, V.y1 - 120, r()),
      ancho: 40 + r() * 70, largo: 1500 + r() * 500, fuerza: 0.5 + r() * 0.5, fase: r() * 10,
    });
  }
  return out;
})();
const enHaz = (x: number, y: number, t: number) => {
  let s = 0;
  for (const h of HACES) {
    const dx = x - h.x, dy = y - h.y;
    const a = dx * DIR[0] + dy * DIR[1];
    if (a < 0 || a > h.largo) continue;
    const b = Math.abs(dx * NORMAL[0] + dy * NORMAL[1]);
    s += h.fuerza * clamp(1 - b / (h.ancho * 0.6)) * (1 - a / h.largo) * (0.75 + 0.25 * ruido(t * 0.7 + h.fase, 3));
  }
  return clamp(s);
};

export const Rayos: React.FC<{t: number; op?: number; id: string}> = ({t, op = 1, id}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen', opacity: op, filter: 'blur(14px)'}}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>
        <linearGradient id={`haz-${id}`} gradientUnits="objectBoundingBox" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE2A6" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#FFC27A" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FF9E5E" stopOpacity="0" />
        </linearGradient>
      </defs>
      {HACES.map((h, i) => {
        // el haz se abre un poco al alejarse, y su fuerza late despacio (el polvo, el aire)
        const lat = 0.7 + 0.3 * ruido(t * 0.6 + h.fase, 7);
        const ang = (Math.atan2(DIR[1], DIR[0]) * 180) / Math.PI - 90;
        return (
          <g key={i} transform={`translate(${h.x} ${h.y}) rotate(${ang})`} opacity={h.fuerza * lat * 0.55}>
            <polygon points={`${-h.ancho / 2},0 ${h.ancho / 2},0 ${h.ancho * 0.9},${h.largo} ${-h.ancho * 0.9},${h.largo}`} fill={`url(#haz-${id})`} />
          </g>
        );
      })}
    </svg>
  </AbsoluteFill>
);

// la mancha de sol en el suelo, justo donde se rompe la taza: los cuatro cristales de la ventana, estirados (así el golpe, los trozos y
// el café pasan en la luz y se leen)
export const ManchaSol: React.FC<{t: number}> = ({t}) => {
  const lat = 0.85 + 0.15 * ruido(t * 0.5, 11);
  const vidrio = (x: number, y: number, w: number, h: number) => {
    const sx = -0.9; // el sesgo de la luz que entra de lado
    return `${x},${y} ${x + w},${y} ${x + w + sx * h},${y + h} ${x + sx * h},${y + h}`;
  };
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', opacity: 0.62 * lat, filter: 'blur(7px)'}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <g fill="#FFB25E">
          <polygon points={vidrio(700, 1500, 205, 62)} />
          <polygon points={vidrio(925, 1500, 205, 62)} />
          <polygon points={vidrio(640, 1576, 240, 88)} />
          <polygon points={vidrio(902, 1576, 240, 88)} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// el bokeh: lo que brilla y está desenfocado se vuelve un círculo de borde suave (con el aro un poco más claro, como en un objetivo)
type Disco = {x: number; y: number; r: number; color: string; op: number; fase: number};
const DISCOS: Disco[] = (() => {
  const r = rng(515);
  const out: Disco[] = [];
  LUCES_GUIRNALDA.forEach(([x, y], i) => out.push({x, y: y + 14, r: 22 + r() * 10, color: i % 3 === 0 ? '#FFD27A' : i % 3 === 1 ? '#FFB45E' : '#FFE6A8', op: 0.75, fase: r() * 9}));
  out.push({x: BOMBILLA[0], y: BOMBILLA[1], r: 62, color: '#FFE0A0', op: 0.6, fase: 1});
  // destellos del sol entre las hojas y en los cristales, dentro de la ventana
  for (let i = 0; i < 14; i++) {
    out.push({
      x: mix(VENTANA.x0 + 20, VENTANA.x1 - 10, r()), y: mix(VENTANA.y0 + 380, VENTANA.y1 - 10, r()), r: 14 + r() * 26,
      color: r() < 0.5 ? '#FFF1C4' : '#FFC98A', op: 0.3 + r() * 0.35, fase: r() * 9,
    });
  }
  // y algunos del lado de la lámpara (los botes de cristal de la balda)
  for (let i = 0; i < 6; i++) out.push({x: 20 + r() * 420, y: 230 + r() * 140, r: 12 + r() * 16, color: '#FFC36E', op: 0.25 + r() * 0.25, fase: r() * 9});
  return out;
})();
export const Bokeh: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen'}}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      {DISCOS.map((d, i) => (
        <g key={i} opacity={d.op * (0.8 + 0.2 * Math.sin(t * 1.7 + d.fase))} style={{filter: 'blur(1.4px)'}}>
          <circle cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity={0.62} />
          <circle cx={d.x} cy={d.y} r={d.r - 1.5} fill="none" stroke={d.color} strokeWidth={3} opacity={0.9} />
        </g>
      ))}
    </svg>
  </AbsoluteFill>
);

// el polvo que flota en el aire: brilla solo dentro de los rayos. Unos pocos, muy cerca de la cámara, son discos grandes y borrosos.
type Mota = {x: number; y: number; r: number; v: number; fase: number; cerca: boolean};
const MOTAS: Mota[] = (() => {
  const r = rng(4242);
  const out: Mota[] = [];
  for (let i = 0; i < 110; i++) out.push({x: r() * 1080, y: 80 + r() * 1500, r: 1.6 + r() * 2.6, v: 6 + r() * 14, fase: r() * 100, cerca: false});
  for (let i = 0; i < 9; i++) out.push({x: r() * 1080, y: 200 + r() * 1400, r: 16 + r() * 22, v: 4 + r() * 6, fase: r() * 100, cerca: true});
  return out;
})();
export const Polvo: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen'}}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      {MOTAS.map((m, i) => {
        // flota: deriva lenta con remolinos (y baja muy poco a poco), y vuelve a entrar por arriba
        const x = m.x + 46 * ruido(t * 0.22 + m.fase, 1) + 14 * Math.sin(t * 0.9 + m.fase);
        let y = m.y + m.v * t + 30 * ruido(t * 0.18 + m.fase, 2);
        y = 60 + ((((y - 60) % 1560) + 1560) % 1560);
        const luz = enHaz(x, y, t);
        const brilla = 0.55 + 0.45 * Math.sin(t * (2 + (i % 5)) + m.fase);
        const op = m.cerca ? 0.1 + 0.22 * luz : luz * (0.35 + 0.65 * brilla);
        if (op < 0.03) return null;
        return (
          <circle key={i} cx={x} cy={y} r={m.r} fill={m.cerca ? '#FFD9A0' : '#FFF4DC'} opacity={op}
            style={m.cerca ? {filter: 'blur(5px)'} : undefined} />
        );
      })}
    </svg>
  </AbsoluteFill>
);

// el vapor del café: hilos suaves que suben ondulando, con el sol detrás (brillan)
export const Vapor: React.FC<{t: number}> = ({t}) => {
  const hilos = vapor(t);
  if (!hilos.length) return null;
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', filter: 'blur(4px)'}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        {hilos.map((h, i) => (
          <g key={i}>
            <path d={curva(h.pts)} stroke="#FFF1DE" strokeWidth={t < T_CAE + 0.3 ? 15 : 22} strokeLinecap="round" fill="none" opacity={h.alfa * 0.32} />
            <path d={curva(h.pts.slice(0, 10))} stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" fill="none" opacity={h.alfa * 0.35} />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// el brillo de la ventana: se derrama sobre lo que tiene delante (el contorno del gato se «come» con la luz, como en un contraluz)
export const BrilloVentana: React.FC<{t: number; sol: [number, number]}> = ({t, sol}) => {
  const V = VENTANA;
  const lat = 0.92 + 0.08 * ruido(t * 0.5, 21);
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: V.x0 + 30, top: V.y0 + 30, width: V.x1 - V.x0 - 60, height: V.y1 - V.y0 - 60, background: '#FFB868',
        opacity: 0.32 * lat, filter: 'blur(46px)', borderRadius: 40}} />
      <div style={{position: 'absolute', left: sol[0] - 260, top: sol[1] - 260, width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,246,214,0.95) 0%, rgba(255,214,150,0.5) 30%, rgba(255,170,100,0) 70%)', opacity: 0.65 * lat}} />
    </AbsoluteFill>
  );
};

export const Vineta: React.FC = () => (
  <>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 62% at 55% 46%, rgba(0,0,0,0) 55%, rgba(14,22,38,0.5) 100%)', pointerEvents: 'none'}} />
    {/* el etalonaje: un pelo de calor arriba y de frío abajo */}
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(255,170,90,0.10) 0%, rgba(255,170,90,0) 45%, rgba(40,90,140,0) 60%, rgba(40,90,140,0.14) 100%)',
      mixBlendMode: 'soft-light', pointerEvents: 'none'}} />
  </>
);
