import React from 'react';
import {E, clamp, rng} from '../../../comun/curvas';
import {capsula} from '../../formas';
import {
  arcoElipse, bigote, cinta, cuerpoTrazos, curva, elipse, oreja, pataTrazos, poli, resta, rot, suma,
  type Elipse, type Gato, type P, type Pata,
} from '../../gato/escena';
import {Anclado, FiltroPintura, f1, lerp, type Bandas} from './pincel';

// EL GATO DE LA PINTURA NOCTURNA: un atigrado naranja pintado a la gouache, en tres tonos planos por parte (la sombra fría del lado
// de la ventana, el naranja y la luz cálida de las velas, que le dan por la derecha) y el borde de luz de luna, de un solo tono, en
// su contorno de arriba a la izquierda (la luna está detrás, en la ventana). Las bandas las saca el filtro de la silueta de cada
// parte; las rayas y el pecho crema van debajo y se oscurecen con la sombra. La cara (los ojos, la nariz, la boca, los bigotes) se
// pinta encima con pincel fino, nítida, para que se lea a 505 px. Y su vaho: una nubecita cuando te mira satisfecho.

const NARANJA = '#B4613A';
const LEJOS = '#844530';
const RAYA = '#702F1D';
const CREMA = '#DDC29D';
const CREMA_LEJOS = '#A88C76';
const ROSA = '#D98C8A';
const NARIZ = '#D9848A';
const IRIS = '#D8DF5E';
const TINTA = '#1E121A';

// las luces: la sombra (fría, del lado de la ventana), la luz de las velas (cálida, por la derecha) y el borde de luna (arriba izq.)
const BANDAS: Bandas = {
  sombra: {d: [32, -10], color: '#1C1036', op: 0.5},
  luz: {d: [-24, -8], color: '#FFB660', op: 0.6},
  borde: {d: [5, 6], color: '#B7CAF6', op: 0.92},
};
const BANDAS_PATA: Bandas = {sombra: BANDAS.sombra, luz: {d: [-18, -6], color: '#FFB660', op: 0.6}};
const BANDAS_LEJOS: Bandas = {sombra: {d: [22, -8], color: '#24163A', op: 0.4}, borde: {d: [4, 5], color: '#A9BCEB', op: 0.85}};

const enE = (e: Elipse, u: number, v: number): P => suma(e.c, rot([u * e.rx, v * e.ry], e.ang));
const unit = (a: P): P => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const esc = (a: P, k: number): P => [a[0] * k, a[1] * k];

// una raya del pelaje que cruza un segmento (las patas, la cola)
const rayaCruzada = (a: P, b: P, k: number, ancho: number, grosor: number) => {
  const c = lerp(a, b, k);
  const u = unit(resta(b, a));
  const n: P = [-u[1], u[0]];
  return cinta([suma(c, esc(n, -ancho)), suma(c, esc(u, ancho * 0.22)), suma(c, esc(n, ancho))], [grosor * 0.35, grosor, grosor * 0.35]);
};
const rayasCuerpo = (g: Gato): string[] => {
  const T = g.torso, Ca = g.cadera;
  const out: string[] = [];
  [-0.64, -0.34, -0.04, 0.26].forEach((v, i) => {
    out.push(cinta([enE(T, -1.12, v - 0.04), enE(T, -0.76, v), enE(T, -0.44, v + 0.05), enE(T, -0.16, v + 0.12)], [2, 12 - i * 0.6, 8, 1.5]));
  });
  [0.5, 0.74, 0.98].forEach((s, i) => {
    const e: Elipse = {c: enE(Ca, 0.12, 0.18), rx: Ca.rx * s, ry: Ca.ry * s, ang: Ca.ang};
    out.push(cinta(arcoElipse(e, 3.3 + i * 0.05, 4.4 - i * 0.08, 5), [1.5, 7, 10, 9, 6, 1.5]));
  });
  return out;
};
const rayasPata = (pt: Pata) => [
  rayaCruzada(pt.hombro, pt.codo, 0.42, 36, 7),
  rayaCruzada(pt.hombro, pt.codo, 0.76, 30, 6.5),
  rayaCruzada(pt.codo, pt.mano, 0.3, 26, 6),
];

const PataGouache: React.FC<{pt: Pata; filtro: string; clip: string; color: string; crema: string}> = ({pt, filtro, clip, color, crema}) => {
  const ds = pataTrazos(pt);
  return (
    <Anclado c={pt.hombro} filtro={filtro}>
      <defs>
        <clipPath id={clip}>{ds.slice(0, 2).map((d, i) => <path key={i} d={d} />)}</clipPath>
      </defs>
      {ds.slice(0, 2).map((d, i) => <path key={i} d={d} fill={color} />)}
      <g clipPath={`url(#${clip})`}>
        {rayasPata(pt).map((d, i) => <path key={i} d={d} fill={RAYA} fillOpacity={0.9} />)}
      </g>
      <path d={capsula(lerp(pt.codo, pt.mano, 0.64), pt.mano, 21, 18.5)} fill={crema} />
      <path d={elipse(pt.pie)} fill={crema} />
    </Anclado>
  );
};
const dedos = (pt: Pata) => {
  const {c, rx, ang} = pt.pie;
  return [0.38, 0.7].map((s) => {
    const a = suma(c, rot([rx * s, -5], ang)), b = suma(c, rot([rx * s, 8], ang));
    return `M ${f1(a[0])} ${f1(a[1])} L ${f1(b[0])} ${f1(b[1])}`;
  }).join(' ');
};

// el vaho: una nubecita que sale de la boca cuando te mira satisfecho, sube y se deshace
const VAHOS = [0.84, 2.46, 4.46];
const Vaho: React.FC<{g: Gato; t: number; filtro: string}> = ({g, t, filtro}) => {
  const boca = g.boca[2];
  return (
    <g filter={`url(#${filtro})`}>
      {VAHOS.map((t0, i) => {
        const s = t - t0;
        if (s < 0 || s > 0.9) return null;
        const k = E.outCubic(clamp(s / 0.9));
        const va = s < 0.12 ? s / 0.12 : 1 - clamp((s - 0.3) / 0.6);
        const c: P = [boca[0] + 44 + 78 * k, boca[1] + 14 - 34 * k];
        const r = 13 + 26 * k;
        return (
          <g key={i} opacity={0.9 * va}>
            <circle cx={c[0]} cy={c[1]} r={r} fill="#DFE6F8" />
            <circle cx={c[0] - r * 0.85} cy={c[1] + r * 0.35} r={r * 0.66} fill="#DFE6F8" />
            <circle cx={c[0] + r * 0.8} cy={c[1] + r * 0.3} r={r * 0.6} fill="#DFE6F8" />
            <circle cx={c[0] - r * 0.25} cy={c[1] - r * 0.2} r={r * 0.6} fill="#F4F7FE" />
          </g>
        );
      })}
    </g>
  );
};

export const GatoNocturno: React.FC<{g: Gato; t: number; paso: number; id: (s: string) => string}> = ({g, t, paso, id}) => {
  const lame = t > 4.95;
  const cuerpo = cuerpoTrazos(g);
  const H = g.cabeza.c, th = g.cabeza.ang;
  const L = (lado: P, frente: P): P => suma(H, rot(lerp(lado, frente, g.giro), th));
  const rl = rng(31);

  // la cola: aros oscuros y la punta
  const cola = cinta(g.cola.pts, g.cola.r);
  const cp = g.cola.pts, cr = g.cola.r;
  const aros = [4, 7, 10, 12, 14].map((i) => rayaCruzada(cp[i - 1], cp[i + 1], 0.5, cr[i] * 1.4, 5 + i * 0.25));
  const punta = cinta(cp.slice(-3), cr.slice(-3).map((q) => q * 1.15));

  // la cabeza: las rayas de la frente (la «M») y de los mofletes, de lado y de frente
  const raya3 = (a: [P, P], b: [P, P], c: [P, P], w: number) => cinta([L(...a), L(...b), L(...c)], [w * 0.3, w, w * 0.3]);
  const rayasCara = [
    raya3([[44, -70], [0, -70]], [[45, -56], [0, -56]], [[46, -40], [0, -40]], 6),
    raya3([[24, -64], [-24, -64]], [[27, -51], [-19, -51]], [[30, -38], [-14, -38]], 5),
    raya3([[64, -64], [24, -64]], [[63, -52], [19, -51]], [[62, -40], [14, -38]], 5),
    raya3([[-62, 2], [-110, 4]], [[-46, 6], [-95, 8]], [[-30, 10], [-80, 12]], 6),
    raya3([[-58, 22], [-106, 24]], [[-43, 24], [-92, 26]], [[-28, 27], [-78, 28]], 5.4),
  ];
  const lejosCara = [
    raya3([[124, 2], [110, 4]], [[120, 6], [95, 8]], [[116, 10], [80, 12]], 6 * g.giro),
    raya3([[122, 22], [106, 24]], [[118, 24], [92, 26]], [[114, 27], [78, 28]], 5.4 * g.giro),
  ];

  const pataCerca = (
    <g>
      <PataGouache pt={g.pataCerca} filtro={id('g-pata')} clip={id('clip-pc')} color={NARANJA} crema={CREMA} />
      <path d={dedos(g.pataCerca)} fill="none" stroke={TINTA} strokeWidth={2.4} strokeOpacity={0.7} strokeLinecap="round" />
    </g>
  );

  return (
    <g>
      <defs>
        <FiltroPintura id={id('g-cuerpo')} semilla={40} paso={paso} desplaza={7} hierve={3.5} seco={0.8} bandas={BANDAS} />
        <FiltroPintura id={id('g-cola')} semilla={44} paso={paso} desplaza={6} hierve={3} seco={0.8} bandas={BANDAS} />
        <FiltroPintura id={id('g-lejos')} semilla={46} paso={paso} desplaza={6} hierve={3} seco={0.6} bandas={BANDAS_LEJOS} />
        <FiltroPintura id={id('g-pata')} semilla={48} paso={paso} desplaza={5} hierve={3} seco={0.6} bandas={BANDAS_PATA} />
        <FiltroPintura id={id('g-cabeza')} semilla={50} paso={paso} desplaza={4.5} hierve={2.5} seco={0.6} bandas={BANDAS} />
        <FiltroPintura id={id('g-vaho')} semilla={52} paso={paso} desplaza={9} hierve={5} seco={0.35} frecuencia={0.03} margen={60} />
      </defs>

      {/* lo de detrás: la otra pata y la cola */}
      <PataGouache pt={g.pataLejos} filtro={id('g-lejos')} clip={id('clip-pl')} color={LEJOS} crema={CREMA_LEJOS} />
      <Anclado c={cp[0]} filtro={id('g-cola')}>
        <defs>
          <clipPath id={id('clip-cola')}><path d={cola} /></clipPath>
        </defs>
        <path d={cola} fill="#BF6A3B" />
        <g clipPath={`url(#${id('clip-cola')})`}>
          {aros.map((d, i) => <path key={i} d={d} fill={RAYA} fillOpacity={0.9} />)}
          <path d={punta} fill={RAYA} fillOpacity={0.95} />
        </g>
      </Anclado>

      {/* el cuerpo, de una pieza: naranja, el pecho crema y las rayas (las luces las pone el filtro) */}
      <Anclado c={[300, 1010]} filtro={id('g-cuerpo')}>
        <defs>
          <clipPath id={id('clip-cuerpo')}>{cuerpo.map((d, i) => <path key={i} d={d} />)}</clipPath>
        </defs>
        {cuerpo.map((d, i) => <path key={i} d={d} fill={NARANJA} />)}
        <g clipPath={`url(#${id('clip-cuerpo')})`}>
          <path d={elipse({c: enE(g.pecho, 0.32, 0.1), rx: g.pecho.rx * 0.72, ry: g.pecho.ry * 0.84, ang: g.pecho.ang})} fill={CREMA} />
          <path d={elipse({c: suma(lerp(g.cuello[0], g.cuello[1], 0.45), [26, 0]), rx: 36, ry: 62, ang: 0.3})} fill={CREMA} />
          <path d={elipse({c: enE(g.barriga, 0.22, 0.35), rx: g.barriga.rx * 0.76, ry: g.barriga.ry * 0.6, ang: g.barriga.ang})} fill={CREMA} />
          {rayasCuerpo(g).map((d, i) => <path key={i} d={d} fill={RAYA} fillOpacity={0.9} />)}
        </g>
      </Anclado>

      {!lame && pataCerca}

      {/* la cabeza: orejas, cabeza, rayas, hocico, el color de los ojos */}
      <Anclado c={H} filtro={id('g-cabeza')}>
        <defs>
          <clipPath id={id('clip-cabeza')}><path d={elipse(g.cabeza)} /></clipPath>
        </defs>
        <path d={oreja(g.orejaLejos)} fill={LEJOS} />
        <path d={poli(g.orejaLejos.dentro)} fill={ROSA} />
        <path d={oreja(g.orejaCerca)} fill={NARANJA} />
        <path d={poli(g.orejaCerca.dentro)} fill={ROSA} />
        <path d={elipse(g.cabeza)} fill={NARANJA} />
        <g clipPath={`url(#${id('clip-cabeza')})`}>
          {rayasCara.map((d, i) => <path key={i} d={d} fill={RAYA} fillOpacity={0.9} />)}
          {g.giro > 0.05 && lejosCara.map((d, i) => <path key={'l' + i} d={d} fill={RAYA} fillOpacity={0.9} />)}
        </g>
        <path d={elipse(g.hocico)} fill={CREMA} />
        <path d={elipse({c: L([70, 60], [0, 60]), rx: 30, ry: 15, ang: th})} fill={CREMA} />
      </Anclado>

      {/* la cara, con pincel fino: los ojos que brillan con la vela, la nariz, la boca y los bigotes claros */}
      {[g.ojoLejos, g.ojoCerca].map((o, i) =>
        o.cerrado ? (
          <path key={i} d={curva(o.arco)} fill="none" stroke={TINTA} strokeWidth={5} strokeLinecap="round" />
        ) : o.visible.length > 2 ? (
          <g key={i}>
            <clipPath id={id('ojo' + i)}><path d={poli(o.visible)} /></clipPath>
            <path d={poli(o.visible)} fill={IRIS} />
            <g clipPath={`url(#${id('ojo' + i)})`}>
              <path d={elipse({c: suma(o.c, rot([0, -o.ry * 0.85], o.ang)), rx: o.rx * 1.2, ry: o.ry * 0.5, ang: o.ang})} fill="#949B32" />
              <path d={elipse(o.pupila)} fill="#120C18" />
              <circle cx={o.brillo[0]} cy={o.brillo[1]} r={6.5} fill="#FFFDF2" />
              <circle cx={o.brillo[0] + 9} cy={o.brillo[1] + 11} r={2.8} fill="#FFFDF2" fillOpacity={0.85} />
            </g>
            <path d={poli(o.visible)} fill="none" stroke={TINTA} strokeWidth={3.6} strokeLinejoin="round" />
          </g>
        ) : null,
      )}
      <path d={poli(g.nariz)} fill={NARIZ} />
      <g fill="none" stroke={TINTA} strokeLinecap="round" strokeLinejoin="round">
        <path d={poli(g.nariz)} strokeWidth={2.4} strokeOpacity={0.85} />
        <path d={`M ${f1(g.surco[0][0])} ${f1(g.surco[0][1])} L ${f1(g.surco[1][0])} ${f1(g.surco[1][1])}`} strokeWidth={2.4} strokeOpacity={0.85} />
        <path d={curva(g.boca)} strokeWidth={3.2} strokeOpacity={0.9} />
        {[g.orejaLejos, g.orejaCerca].map((o, i) => {
          const m = lerp(o.base[0], o.base[1], 0.5);
          const a = lerp(lerp(m, o.base[0], 0.4), o.punta, 0.2), b = lerp(o.bc, o.punta, 0.55);
          return <path key={'o' + i} strokeWidth={2} strokeOpacity={0.45} d={`M ${f1(a[0])} ${f1(a[1])} L ${f1(b[0] + (rl() - 0.5) * 3)} ${f1(b[1])}`} />;
        })}
      </g>
      <g fill="none" stroke="#F3E7D2" strokeLinecap="round" strokeOpacity={0.85}>
        {g.bigotes.map((b, i) => <path key={i} d={bigote(b)} strokeWidth={2.3} />)}
      </g>

      {lame && pataCerca}
      {g.lengua && <path d={elipse(g.lengua)} fill="#E27D83" stroke={TINTA} strokeWidth={1.8} strokeOpacity={0.6} />}

      <Vaho g={g} t={t} filtro={id('g-vaho')} />
    </g>
  );
};

// la silueta del gato (para su sombra en la mancha de luna del suelo)
export const siluetaGato = (g: Gato): string[] => [
  ...cuerpoTrazos(g), elipse(g.cabeza), oreja(g.orejaLejos), oreja(g.orejaCerca), cinta(g.cola.pts, g.cola.r),
  ...pataTrazos(g.pataCerca), ...pataTrazos(g.pataLejos),
];
