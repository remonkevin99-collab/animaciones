import React from 'react';
import {loadFont as cargarCaveatBrush} from '@remotion/google-fonts/CaveatBrush';
import {E, clamp, mix, rng, ruido, temblor} from '../../../comun/curvas';
import {
  DUR, IMPACTO, SUELO, TRANSFORMA_GATO, T_SUELO, cafe, cinta, gato, piezasTaza, poli, rot, suma, taza, trozos, vapor,
  type P, type Taza,
} from '../../gato/escena';
import {
  C, CABANA, CHIMENEA, ESTRELLAS, LUZ_VELA, MATRIZ_SUELO, PANELES, PARED_FIN, PINT, VELAS, VIDRIO, aSuelo, decorado,
} from './decorado';
import {GatoNocturno, siluetaGato} from './gato';
import {Anclado, FiltroPintura, circD, elipD, f1, lerp, manchaPts, ruta, useIds, type Bandas} from './pincel';

// EL GATO EN PINTURA NOCTURNA. Una noche de nieve pintada a la gouache: formas planas y opacas, los
// cambios de tono en bandas planas (sin degradados de ordenador) y el borde de pincel seco, que salta y «hierve» a 12 cuadros por
// segundo. El gato atigrado, en su mesa de la cabaña, delante de la ventana grande: fuera, la luna llena con sus dos halos, las
// cordilleras, los pinos con nieve y la nieve que cae todo el rato; dentro, las dos velas del alféizar. La luz del gato es de dos
// colores, como en un cuento: el borde frío de la luna por detrás y el cálido de las velas por delante. La luna entra por la ventana
// y pinta en el suelo una mancha clara con los palos de la ventana y la sombra del gato, que se mueve con él.
// EL MOMENTO: empuja la taza de esmalte mirándote (y suelta su vaho), la taza gira por el borde echando el café en una cinta plana y
// se rompe en la mancha de luna: el café salpica en manchas planas (también en la pared), los trozos saltan y se quedan con su
// sombra plana, y un «¡cras!» pintado a pincel. Encima de todo, el grano del papel y las rayas del pincel; alrededor, el papel.
// Detalles: decorado.tsx (la cabaña y el paisaje), gato.tsx (el gato), pincel.tsx (el pincel seco y los filtros).

const {fontFamily: PINCEL} = cargarCaveatBrush('normal', {weights: ['400'], subsets: ['latin']});

const CAFE = '#7A4527';
const CAFE_LUZ = '#C9874F';
const CAFE_OSC = '#4A291B';
const CAFE_PARED = '#8E5531';
const ESMALTE = '#EDE5D0';
const AZUL_TAZA = '#25315F';
const CREMA_LETRA = '#F2E7CB';
const NOCHE = '#151B3F';

// ---------------------------------------------------------------- la nieve: tres capas que caen despacio, siempre las mismas
const CAPAS = [
  {n: 84, r: [1.6, 2.7], v: 32, amp: 6, op: 0.55, semilla: 11},
  {n: 46, r: [3.2, 4.6], v: 58, amp: 11, op: 0.85, semilla: 12},
  {n: 22, r: [5.8, 8.2], v: 96, amp: 16, op: 0.97, semilla: 13},
];
const COPOS = CAPAS.map((c) => {
  const r = rng(c.semilla);
  return Array.from({length: c.n}, () => ({x0: r() * 900, y0: r() * 800, r: mix(c.r[0], c.r[1], r()), fase: r() * 6.28, w: 0.8 + r() * 0.8}));
});
const ANCHO_V = VIDRIO.x1 - VIDRIO.x0 + 40;
const ALTO_V = VIDRIO.y1 - VIDRIO.y0 + 40;
const Nieve: React.FC<{t: number; clip: string}> = ({t, clip}) => (
  <g clipPath={`url(#${clip})`}>
    {CAPAS.map((c, i) => (
      <g key={i} fill={C.copo} fillOpacity={c.op}>
        {COPOS[i].map((q, j) => {
          const y = VIDRIO.y0 - 20 + ((((q.y0 + c.v * t) % ALTO_V) + ALTO_V) % ALTO_V);
          const x = VIDRIO.x0 - 20 + ((((q.x0 + 9 * t + c.amp * Math.sin(t * q.w + q.fase)) % ANCHO_V) + ANCHO_V) % ANCHO_V);
          return <circle key={j} cx={f1(x)} cy={f1(y)} r={f1(q.r)} />;
        })}
      </g>
    ))}
  </g>
);

// ---------------------------------------------------------------- las llamas (a 12 cuadros por segundo) y su luz en bandas planas
const llamaD = (b: P, h: number, w: number, lado: number) => {
  const tip: P = [b[0] + lado, b[1] - h];
  return `M ${f1(b[0])} ${f1(b[1] + 2)} C ${f1(b[0] - w)} ${f1(b[1])} ${f1(b[0] - w * 0.8)} ${f1(b[1] - h * 0.45)} ${f1(tip[0])} ${f1(tip[1])}`
    + ` C ${f1(b[0] + w * 0.8)} ${f1(b[1] - h * 0.45)} ${f1(b[0] + w)} ${f1(b[1])} ${f1(b[0])} ${f1(b[1] + 2)} Z`;
};
const Velas: React.FC<{paso: number; filtro: string}> = ({paso, filtro}) => {
  const k = 1 + 0.03 * ruido(paso * 0.8, 3);
  return (
    <g>
      <g filter={`url(#${filtro})`}>
        <path d={ruta(manchaPts(LUZ_VELA, 236 * k, 226 * k, 61, 0.05, 44))} fill="#E88B4E" fillOpacity={0.12} />
        <path d={ruta(manchaPts(LUZ_VELA, 146 * k, 140 * k, 62, 0.06, 40))} fill="#F6A95B" fillOpacity={0.17} />
        <path d={ruta(manchaPts([LUZ_VELA[0] + 6, LUZ_VELA[1] - 4], 74 * k, 70 * k, 63, 0.07, 32))} fill="#FFD27A" fillOpacity={0.26} />
      </g>
      {VELAS.map((v, i) => {
        const b: P = [v.x, v.base - v.alto - 6];
        const h = (i === 0 ? 46 : 36) * (1 + 0.12 * ruido(paso * 0.73 + i * 5, 7 + i));
        const lado = 4 * ruido(paso * 0.91 + i * 3, 11 + i);
        return (
          <g key={i}>
            <path d={llamaD(b, h, 11, lado)} fill="#F2A13E" />
            <path d={llamaD([b[0], b[1] - 1], h * 0.72, 7.5, lado * 0.8)} fill="#FFD36E" />
            <path d={llamaD([b[0], b[1] - 2], h * 0.38, 4, lado * 0.5)} fill="#FFF7DC" />
            <path d={elipD([b[0], b[1] - 1], 3.4, 4.5)} fill="#5E6FC4" fillOpacity={0.75} />
          </g>
        );
      })}
    </g>
  );
};

// el humo de la chimenea de la cabaña de lejos y el brillo de su ventana
const Humo: React.FC<{t: number; paso: number; filtro: string}> = ({t, paso, filtro}) => {
  const pts: P[] = [];
  const r: number[] = [];
  for (let j = 0; j <= 12; j++) {
    const h = j * 13;
    pts.push([CHIMENEA[0] + h * 0.22 + 7 * Math.sin(h * 0.045 - t * 1.6) * (0.3 + h / 160), CHIMENEA[1] - 2 - h]);
    r.push(3.5 + h * 0.07);
  }
  const brillo = 0.22 + 0.06 * ruido(paso * 0.6, 21);
  return (
    <g>
      <path d={circD([CABANA[0] - 1.5, CABANA[1] + 11.5], 15)} fill="#F3C25C" fillOpacity={brillo} />
      <g filter={`url(#${filtro})`} opacity={0.6}>
        <path d={cinta(pts, r)} fill="#8D9BC8" />
      </g>
    </g>
  );
};

// las estrellas: titilan a 12 cuadros por segundo; unas pocas, de cuatro puntas
const Estrellas: React.FC<{paso: number}> = ({paso}) => (
  <g fill="#EDEFFB">
    {ESTRELLAS.map((s, i) => {
      const op = 0.55 + 0.45 * Math.sin(paso * 0.9 + s.fase * 3);
      if (!s.brillo) return <circle key={i} cx={f1(s.c[0])} cy={f1(s.c[1])} r={f1(s.r)} fillOpacity={op} />;
      const R = s.r * (0.85 + 0.2 * op), q = R * 0.22;
      const [x, y] = s.c;
      return (
        <path key={i} fillOpacity={0.9}
          d={`M ${f1(x)} ${f1(y - R)} Q ${f1(x + q)} ${f1(y - q)} ${f1(x + R)} ${f1(y)} Q ${f1(x + q)} ${f1(y + q)} ${f1(x)} ${f1(y + R)} Q ${f1(x - q)} ${f1(y + q)} ${f1(x - R)} ${f1(y)} Q ${f1(x - q)} ${f1(y - q)} ${f1(x)} ${f1(y - R)} Z`} />
      );
    })}
  </g>
);

// ---------------------------------------------------------------- la taza de esmalte
const enTaza = (tz: {c: P; ang: number}, q: P): P => suma(tz.c, rot(q, tz.ang));
// las luces de lo que gira: el filtro gira con la cosa, así que el corrimiento de cada banda se gira al revés
const girar = (b: Bandas, ang: number): Bandas => {
  const out: Bandas = {};
  (['sombra', 'luz', 'borde'] as const).forEach((k) => {
    const x = b[k];
    if (x) out[k] = {...x, d: rot(x.d, -ang)};
  });
  return out;
};
const LUZ_TAZA: Bandas = {
  sombra: {d: [24, -4], color: '#2A2148', op: 0.42},
  luz: {d: [-14, 8], color: '#FFC27A', op: 0.55},
  borde: {d: [6, 7], color: '#D3DEFF', op: 0.9},
};
const TazaGouache: React.FC<{tz: Taza; filtro: string}> = ({tz, filtro}) => {
  const pz = piezasTaza(tz);
  const banda = (x0: number, y0: number, x1: number, y1: number) =>
    ruta(([[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as P[]).map((q) => enTaza(tz, q)));
  return (
    <Anclado c={tz.c} ang={tz.ang} filtro={filtro}>
      <path d={poli(pz.asa)} fill={AZUL_TAZA} />
      <path d={poli(pz.cuerpo)} fill={ESMALTE} />
      <path d={banda(-52, -59, 52, -48)} fill={AZUL_TAZA} />
      <path d={ruta(manchaPts(enTaza(tz, [-30, 30]), 7, 5, 7, 0.3, 10, tz.ang))} fill={AZUL_TAZA} />
    </Anclado>
  );
};

// ---------------------------------------------------------------- el café
// la corona del golpe: una salpicadura con puntas que sube, se abre y vuelve a caer en gotas
const PUNTAS = (() => {
  const r = rng(1201);
  return Array.from({length: 13}, (_, i) => ({a: ((196 + (i / 12) * 148 + (r() - 0.5) * 10) * Math.PI) / 180, l: 80 + r() * 80, w: 12 + r() * 7}));
})();
const Corona: React.FC<{t: number}> = ({t}) => {
  const s = t - T_SUELO;
  if (s < 0 || s > 0.45) return null;
  const sube = E.outCubic(clamp(s / 0.1));
  const cae = clamp((s - 0.1) / 0.35);
  const base: P = [IMPACTO[0] - 6, SUELO - 6];
  const rx = 56 + 56 * sube, ry = 18;
  return (
    <g>
      <path d={elipD(base, rx, ry * (1 - 0.6 * cae))} fill={CAFE} fillOpacity={1 - cae} />
      {PUNTAS.map((pt, i) => {
        const u: P = [Math.cos(pt.a), Math.sin(pt.a)];
        const raiz: P = [base[0] + u[0] * rx * 0.85, base[1] + u[1] * ry * 0.6];
        const largoP = pt.l * sube * (1 - cae ** 0.7);
        const punta: P = [raiz[0] + u[0] * largoP, raiz[1] + u[1] * largoP];
        const gota: P = [raiz[0] + u[0] * pt.l * (0.9 + 0.5 * cae), raiz[1] + u[1] * pt.l * (0.9 + 0.2 * cae) + 520 * cae * cae];
        return (
          <g key={i}>
            {largoP > 3 && <path d={cinta([raiz, lerp(raiz, punta, 0.55), punta], [pt.w * 0.5, pt.w * 0.32, pt.w * 0.18])} fill={CAFE} />}
            {sube > 0.6 && gota[1] < SUELO + 8 && (
              <circle cx={f1(cae > 0.05 ? gota[0] : punta[0])} cy={f1(cae > 0.05 ? gota[1] : punta[1])} r={f1(pt.w * 0.45)} fill={CAFE} />
            )}
          </g>
        );
      })}
    </g>
  );
};

// las salpicaduras en la pared de troncos: manchas planas que aparecen al romperse, algunas con su chorretón
const SALPICA_PARED = (() => {
  const r = rng(2024);
  // pegadas a los troncos de abajo, junto al golpe (si suben mucho, en la pared oscura parecen bichos volando)
  return Array.from({length: 9}, () => {
    const a = Math.PI * (1.12 + r() * 0.76);
    const d = 50 + r() * 100;
    return {c: [IMPACTO[0] + Math.cos(a) * d * 1.5, PARED_FIN - 18 + Math.sin(a) * d * 0.55] as P, r: 6 + r() * 7, t0: T_SUELO + 0.05 + r() * 0.06, chorro: r() < 0.6 ? 12 + r() * 22 : 0, sem: Math.floor(r() * 1000)};
  }).filter((s) => s.c[1] < PARED_FIN - 20);
})();

const CafeSuelo: React.FC<{t: number; filtro: string}> = ({t, filtro}) => {
  if (t < T_SUELO) return null;
  const cf = cafe(t);
  const ch = cf.charco;
  return (
    <g filter={`url(#${filtro})`}>
      {SALPICA_PARED.map((s, i) => {
        const k = E.outBack(clamp((t - s.t0) / 0.08));
        if (k <= 0) return null;
        const lc = s.chorro * E.outCubic(clamp((t - s.t0 - 0.05) / 0.9));
        return (
          <g key={'p' + i}>
            <path d={ruta(manchaPts(s.c, s.r * k, s.r * k * 0.9, s.sem, 0.3, 14))} fill={CAFE_PARED} />
            {lc > 1 && <path d={`M ${f1(s.c[0] - 2.5)} ${f1(s.c[1])} v ${f1(lc)} a 2.5 2.5 0 0 0 5 0 v ${f1(-lc)} Z`} fill={CAFE_PARED} />}
          </g>
        );
      })}
      {ch && (
        <g>
          <path d={ruta(manchaPts(ch.c, ch.rx, ch.ry * 1.35, 5, 0.2, 44))} fill={CAFE_OSC} />
          <path d={ruta(manchaPts([ch.c[0] - ch.rx * 0.08, ch.c[1] - ch.ry * 0.12], ch.rx * 0.66, ch.ry * 0.7, 6, 0.18, 36))} fill={CAFE} />
          {/* el reflejo de la luna en el charco, una raya plana */}
          <path d={elipD([ch.c[0] - ch.rx * 0.22, ch.c[1] - ch.ry * 0.3], ch.rx * 0.34, Math.max(2, ch.ry * 0.22), -0.04)} fill="#A9B8EC" fillOpacity={0.75} />
        </g>
      )}
      {cf.manchas.map((m) => (
        <path key={m.i} d={ruta(manchaPts(m.c, m.rx * 1.1, m.ry * 1.25, 900 + m.i, 0.22, 16))} fill={m.i % 3 ? CAFE_OSC : CAFE} />
      ))}
    </g>
  );
};

const CafeAire: React.FC<{t: number; filtro: string}> = ({t, filtro}) => {
  const cf = cafe(t);
  // el chorro: las gotas de la boca de la taza, unidas en tramos (rota la taza, lo que queda en el aire se va al charco enseguida)
  const chorro = cf.gotas
    .filter((d) => d.i < 100)
    .map((d) => (t > T_SUELO ? {...d, c: [d.c[0], d.c[1] + 3200 * (t - T_SUELO) ** 2] as P} : d))
    .filter((d) => d.c[1] < SUELO + 6);
  // cada gota sabe cuánto hace que salió: la cinta es gruesa junto a la boca y se adelgaza hasta romperse en gotas sueltas
  const tramos: {c: P; r: number; edad: number}[][] = [];
  chorro.forEach((d, i) => {
    const edad = Math.max(0, t - (2.76 + 0.27 * (d.i / 37) ** 0.9));
    if (i === 0 || Math.hypot(d.c[0] - chorro[i - 1].c[0], d.c[1] - chorro[i - 1].c[1]) > 70) tramos.push([]);
    tramos[tramos.length - 1].push({c: d.c, r: d.r, edad});
  });
  const fuera = 1 - clamp((t - T_SUELO) / 0.1);
  const grueso = (d: {r: number; edad: number}) => d.r * (1.0 - 0.75 * clamp(d.edad / 0.22));
  return (
    <g filter={`url(#${filtro})`}>
      {fuera > 0 && tramos.filter((q) => q.length > 2).map((q, i) => (
        <path key={i} d={cinta(q.map((d) => d.c), q.map(grueso))} fill={CAFE} opacity={fuera} />
      ))}
      {tramos.flat().map((d, j) => (
        <circle key={j} cx={f1(d.c[0])} cy={f1(d.c[1])} r={f1(d.r * (0.5 + 0.35 * clamp(d.edad / 0.2)))} fill={CAFE} />
      ))}
      {cf.gotas.filter((d) => d.i >= 100).map((d) => <circle key={d.i} cx={f1(d.c[0])} cy={f1(d.c[1])} r={f1(d.r)} fill={CAFE} />)}
      <Corona t={t} />
    </g>
  );
};

// ---------------------------------------------------------------- los trozos de la taza, con su sombra plana
const SUELO_TROZO = trozos(DUR - 0.01).map((q) => q.c[1]);
const LUZ_TROZO: Bandas = {
  sombra: {d: [-9, -9], color: '#231C40', op: 0.45},
  borde: {d: [5, 6], color: '#DCE6FF', op: 0.95},
};
const Trozos: React.FC<{t: number; id: (s: string) => string; paso: number}> = ({t, id, paso}) => {
  const tr = trozos(t);
  if (!tr.length) return null;
  return (
    <g>
      <defs>
        {tr.map((q) => (
          <FiltroPintura key={q.n} id={id('trozo' + q.n)} semilla={70 + q.n} paso={paso} desplaza={4} hierve={2.5} seco={0.5}
            bandas={girar(LUZ_TROZO, q.ang)} frecuencia={0.04} margen={40} />
        ))}
      </defs>
      {/* las sombras: una mancha bajo cada trozo que vuela; en el suelo, la forma del trozo corrida */}
      <g fill="#120A16">
        {tr.map((q) => {
          const piso = SUELO_TROZO[q.n - 1];
          const alto = Math.max(0, piso - q.c[1]);
          if (alto > 4) {
            const k = clamp(1 - alto / 260);
            return <path key={q.n} d={elipD([q.c[0] + 6, piso + 10], 12 + 20 * k, 3 + 3 * k)} fillOpacity={0.55 * k} />;
          }
          return <path key={q.n} d={poli(q.pts.map((v) => [v[0] + 8, v[1] + 7] as P))} fillOpacity={0.62} />;
        })}
      </g>
      {tr.map((q) => (
        <Anclado key={q.n} c={q.c} ang={q.ang} filtro={id('trozo' + q.n)}>
          <defs>
            <clipPath id={id('clip-trozo' + q.n)}><path d={poli(q.pts)} /></clipPath>
          </defs>
          <path d={poli(q.pts)} fill={q.n === 6 ? AZUL_TAZA : ESMALTE} />
          {q.n <= 2 && (
            <g clipPath={`url(#${id('clip-trozo' + q.n)})`}>
              <path d={`M ${f1(q.pts[0][0])} ${f1(q.pts[0][1])} L ${f1(q.pts[1][0])} ${f1(q.pts[1][1])}`} stroke={AZUL_TAZA} strokeWidth={22} fill="none" />
            </g>
          )}
        </Anclado>
      ))}
    </g>
  );
};

// ---------------------------------------------------------------- el golpe: rayas planas y el «¡cras!» a pincel
const Golpe: React.FC<{t: number; filtro: string}> = ({t, filtro}) => {
  const s = t - T_SUELO;
  if (s < 0) return null;
  const kR = clamp(s / 0.09);
  const fueraR = 1 - clamp((s - 0.22) / 0.3);
  const kC = E.outBack(clamp((s - 0.04) / 0.2));
  const fueraC = 1 - clamp((t - 4.5) / 0.4);
  return (
    <g filter={`url(#${filtro})`}>
      {fueraR > 0 && (
        <g opacity={fueraR} fill={CREMA_LETRA}>
          {[200, 224, 248, 272, 296, 320, 342].map((a, i) => {
            const u: P = [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)];
            const r0 = 96 + (i % 2) * 20, r1 = r0 + 70 * kR;
            const c0: P = [IMPACTO[0] + u[0] * r0, SUELO - 24 + u[1] * r0 * 0.8];
            const c1: P = [IMPACTO[0] + u[0] * r1, SUELO - 24 + u[1] * r1 * 0.8];
            return <path key={i} d={cinta([c0, lerp(c0, c1, 0.5), c1], [2, 5.5, 2])} />;
          })}
        </g>
      )}
      {kC > 0 && fueraC > 0 && (
        <g opacity={fueraC} transform={`translate(868 1296) rotate(-9) scale(${f1(0.35 + 0.65 * kC)})`}>
          <text textAnchor="middle" fontFamily={PINCEL} fontSize={132} fill={CREMA_LETRA} stroke={NOCHE} strokeWidth={12} paintOrder="stroke"
            strokeLinejoin="round">¡cras!</text>
        </g>
      )}
    </g>
  );
};

// ---------------------------------------------------------------- la mancha de luna del suelo (con la sombra del gato)
const LunaSuelo: React.FC<{t: number; id: (s: string) => string; filtro: string}> = ({t, id, filtro}) => {
  const g = gato(t);
  const quads = PANELES.map(([x0, y0, x1, y1]) => ruta([aSuelo([x0, y0]), aSuelo([x1, y0]), aSuelo([x1, y1]), aSuelo([x0, y1])]));
  return (
    <g>
      <defs>
        <mask id={id('m-luna')} maskUnits="userSpaceOnUse" x={0} y={1500} width={1080} height={420}>
          <rect x={0} y={1500} width={1080} height={420} fill="white" />
          <g transform={MATRIZ_SUELO}>
            <g transform={TRANSFORMA_GATO}>{siluetaGato(g).map((d, i) => <path key={i} d={d} fill="#5A5A5A" />)}</g>
          </g>
        </mask>
      </defs>
      <g filter={`url(#${filtro})`}>
        <g mask={`url(#${id('m-luna')})`}>{quads.map((d, i) => <path key={i} d={d} fill={C.luzLuna} fillOpacity={0.33} />)}</g>
      </g>
    </g>
  );
};

// ---------------------------------------------------------------- el papel: el grano y las rayas del pincel, encima de todo
const Textura: React.FC<{id: (s: string) => string}> = ({id}) => (
  <svg viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
    <defs>
      <filter id={id('grano')} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves={2} seed={8} result="fino" />
        <feColorMatrix in="fino" type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 0 0.08  1.7 0 0 0 -1.02" result="osc" />
        <feColorMatrix in="fino" type="matrix" values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.94  -1.5 0 0 0 0.6" result="cla" />
        <feTurbulence type="fractalNoise" baseFrequency="0.004 0.03" numOctaves={3} seed={4} result="pincel" />
        <feColorMatrix in="pincel" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0.04  0.9 0 0 0 -0.5" result="pOsc" />
        <feMerge>
          <feMergeNode in="pOsc" />
          <feMergeNode in="osc" />
          <feMergeNode in="cla" />
        </feMerge>
      </filter>
    </defs>
    <rect width={1080} height={1920} filter={`url(#${id('grano')})`} opacity={0.6} />
  </svg>
);

// ---------------------------------------------------------------- la escena
export const PinturaNocturna: React.FC<{t: number}> = ({t: tt}) => {
  const id = useIds();
  const t = clamp(tt, 0, DUR);
  const paso = Math.floor(t * 12 + 1e-6) % 48; // el borde «hierve» a 12 cuadros por segundo
  const g = gato(t);
  const tz = taza(t);
  const vp = vapor(t);
  const deco = decorado(id('vidrio'), id('deco'));
  const [sx, sy] = temblor(t, T_SUELO, 0.3, 9, 5);
  const {x0, y0, x1, y1} = PINT;

  return (
    <div style={{position: 'absolute', inset: 0, background: C.papel, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${(sx / 2).toFixed(2)}px, ${(sy / 2).toFixed(2)}px)`}}>
        <svg viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
          <defs>
            <clipPath id={id('vidrio')}>
              <rect x={VIDRIO.x0 - 10} y={VIDRIO.y0 - 10} width={VIDRIO.x1 - VIDRIO.x0 + 20} height={VIDRIO.y1 - VIDRIO.y0 + 16} />
            </clipPath>
            <clipPath id={id('paneles')}>
              {PANELES.map(([a, b, c, d], i) => <rect key={i} x={a} y={b} width={c - a} height={d - b} />)}
            </clipPath>
            <FiltroPintura id={id('deco')} semilla={3} paso={paso} desplaza={9} hierve={3.5} frecuencia={0.02} margen={3} />
            <FiltroPintura id={id('humo')} semilla={9} paso={paso} desplaza={10} hierve={5} frecuencia={0.03} margen={60} />
            <FiltroPintura id={id('luz')} semilla={15} paso={paso} desplaza={14} hierve={5} frecuencia={0.018} margen={10} />
            <FiltroPintura id={id('taza')} semilla={90} paso={paso} desplaza={5} hierve={2.5} seco={0.5} bandas={girar(LUZ_TAZA, tz.ang)}
              frecuencia={0.035} margen={30} />
            <FiltroPintura id={id('cafe')} semilla={30} paso={paso} desplaza={3.5} hierve={2.5} seco={0.3} frecuencia={0.03} margen={40}
              bandas={{luz: {d: [-4, 5], color: CAFE_LUZ, op: 0.95}}} />
            <FiltroPintura id={id('cafeSuelo')} semilla={31} paso={paso} desplaza={8} hierve={4} seco={0.5} frecuencia={0.035} margen={20} />
            <FiltroPintura id={id('letras')} semilla={33} paso={paso} desplaza={6} hierve={3} seco={0.5} frecuencia={0.04} margen={20} />
            {/* el borde de lo pintado: roto, con las rayas del pincel seco */}
            <filter id={id('rasgado')} x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={3} seed={21} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={16} xChannelSelector="R" yChannelSelector="G" result="d" />
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.09" numOctaves={2} seed={22} result="n3" />
              <feColorMatrix in="n3" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  8 0 0 0 -4.3" result="h" />
              <feGaussianBlur in="d" stdDeviation={6} result="bl" />
              <feComponentTransfer in="bl" result="e">
                <feFuncA type="linear" slope={-2.2} intercept={2.2} />
              </feComponentTransfer>
              <feComposite in="e" in2="h" operator="arithmetic" k1={1} result="cut" />
              <feComposite in="d" in2="cut" operator="out" />
            </filter>
            <mask id={id('pintado')} maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
              <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="white" filter={`url(#${id('rasgado')})`} />
            </mask>
          </defs>

          <g mask={`url(#${id('pintado')})`}>
            {/* la cabaña y el paisaje, quietos */}
            <g filter={`url(#${id('deco')})`}>{deco.fondo}</g>
            {/* lo que se mueve fuera: las estrellas, el humo de la cabaña de lejos y la nieve; y encima, la guirnalda y las velas */}
            <g clipPath={`url(#${id('paneles')})`}>
              <Estrellas paso={paso} />
              <Humo t={t} paso={paso} filtro={id('humo')} />
            </g>
            <Nieve t={t} clip={id('paneles')} />
            <g filter={`url(#${id('deco')})`}>{deco.guirnalda}</g>
            <g filter={`url(#${id('deco')})`}>{deco.velas}</g>
            <Velas paso={paso} filtro={id('luz')} />

            {/* el suelo: la mancha de luna con la sombra del gato */}
            <LunaSuelo t={t} id={id} filtro={id('deco')} />

            {/* las sombras en la mesa */}
            <g fill="#150C18">
              <path d={elipD([g.torso.c[0] - 30, 1003], 222, 8)} fillOpacity={0.55} />
              {tz.estado === 'mesa' && <path d={elipD([tz.c[0] + 10, 1004], 56, 5)} fillOpacity={0.6} />}
              {tz.estado === 'cae' && (() => {
                const k = clamp((tz.c[1] - 1100) / 450);
                return <path d={elipD([tz.c[0] + 10, SUELO + 6], 24 + 34 * k, 5 + 5 * k)} fillOpacity={0.55 * k} />;
              })()}
            </g>

            {/* el vapor de la taza */}
            <g filter={`url(#${id('humo')})`}>
              {vp.map((h, i) => (
                <path key={i} d={cinta(h.pts, h.pts.map((_, j) => 2.5 + j * 0.42))} fill="#CBD3EC" fillOpacity={0.42 * h.alfa * (t > T_SUELO ? 0.55 : 1)} />
              ))}
            </g>

            {/* la taza, entera mientras no llega al suelo */}
            {tz.estado !== 'suelo' && <TazaGouache tz={tz} filtro={id('taza')} />}

            {/* el café del suelo y de la pared, y la pata de la mesa por delante */}
            <CafeSuelo t={t} filtro={id('cafeSuelo')} />
            <g filter={`url(#${id('deco')})`}>{deco.pata}</g>

            {/* EL GATO */}
            <g transform={TRANSFORMA_GATO}>
              <GatoNocturno g={g} t={t} paso={paso} id={id} />
            </g>

            {/* el café en el aire, los trozos y el golpe */}
            <CafeAire t={t} filtro={id('cafe')} />
            <Trozos t={t} id={id} paso={paso} />
            <Golpe t={t} filtro={id('letras')} />
          </g>
        </svg>
        <Textura id={id} />
      </div>
    </div>
  );
};
