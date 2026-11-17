import React from 'react';
import {mix, rng} from '../../../comun/curvas';
import {elipse, rot, suma, type P} from '../../gato/escena';

// EL PINCEL DE LA PINTURA NOCTURNA: las ayudas para pintar a la gouache. Formas planas y opacas, sin
// degradados de ordenador (los cambios de tono van por bandas planas), y el borde de pincel seco: un trazo del mismo color, cortado
// a saltos, que se sale un poco de la forma (el pincel casi sin pintura que salta sobre el papel), y encima el filtro que lo tuerce
// con un ruido fijo y otro que «hierve» a 12 cuadros por segundo. Las luces de cada cosa (la sombra, la luz cálida de la vela y el
// borde frío de la luna) también son bandas planas: las saca el filtro de su propia silueta, corrida hacia un lado.

export const f1 = (n: number) => n.toFixed(1);
export const ruta = (pts: P[], cerrar = true) => 'M ' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L ') + (cerrar ? ' Z' : '');
export const rectD = (x: number, y: number, w: number, h: number) => `M ${f1(x)} ${f1(y)} H ${f1(x + w)} V ${f1(y + h)} H ${f1(x)} Z`;
export const circD = (c: P, r: number) =>
  `M ${f1(c[0] - r)} ${f1(c[1])} A ${f1(r)} ${f1(r)} 0 1 0 ${f1(c[0] + r)} ${f1(c[1])} A ${f1(r)} ${f1(r)} 0 1 0 ${f1(c[0] - r)} ${f1(c[1])} Z`;
export const elipD = (c: P, rx: number, ry: number, ang = 0) => elipse({c, rx, ry, ang});
export const lerp = (a: P, b: P, k: number): P => [mix(a[0], b[0], k), mix(a[1], b[1], k)];
export const grados = (r: number) => ((r * 180) / Math.PI).toFixed(2);

// una mancha cerrada con lóbulos (un charco, una nube, un halo pintado a mano)
export const manchaPts = (c: P, rx: number, ry: number, semilla: number, lobulos = 0.16, n = 30, ang = 0): P[] => {
  const r = rng(semilla);
  const f = [r() * 6.28, r() * 6.28, r() * 6.28];
  return Array.from({length: n}, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + lobulos * (0.5 * Math.sin(3 * a + f[0]) + 0.3 * Math.sin(5 * a + f[1]) + 0.2 * Math.sin(9 * a + f[2]));
    return suma(c, rot([Math.cos(a) * rx * k, Math.sin(a) * ry * k], ang));
  });
};

// una línea ondulada de x0 a x1 (el borde de una banda del cielo, la cima de una loma)
export const ondas = (x0: number, x1: number, y: number, amp: number, semilla: number, paso = 18): P[] => {
  const r = rng(semilla);
  const a = r() * 6.28, b = r() * 6.28, c = r() * 6.28;
  const pts: P[] = [];
  for (let x = x0; x <= x1 + 0.01; x += paso)
    pts.push([x, y + amp * (0.55 * Math.sin(x * 0.009 + a) + 0.3 * Math.sin(x * 0.023 + b) + 0.15 * Math.sin(x * 0.061 + c))]);
  return pts;
};
// una banda plana: de su borde de arriba hasta abajo del todo (cada banda tapa a la de detrás)
export const bandaD = (arriba: P[], abajo: number) =>
  ruta([...arriba, [arriba[arriba.length - 1][0], abajo], [arriba[0][0], abajo]]);

// el pincel seco: trazos cortados a saltos, siempre los mismos para la misma semilla
const saltos = new Map<string, string>();
export const rayasSecas = (semilla: number, largo = 26, hueco = 9) => {
  const clave = `${semilla}-${largo}-${hueco}`;
  const hecha = saltos.get(clave);
  if (hecha) return hecha;
  const r = rng(semilla);
  const out: string[] = [];
  for (let i = 0; i < 28; i++) out.push(f1(2 + r() * largo), f1(1.5 + r() * hueco));
  const s = out.join(' ');
  saltos.set(clave, s);
  return s;
};

// una forma pintada a la gouache: el relleno plano y, por fuera, el borde de pincel seco (dos pasadas, la de fuera más rota)
export const Seco: React.FC<{d: string; color: string; w?: number; semilla?: number; op?: number; borde?: boolean}> = ({
  d, color, w = 10, semilla = 1, op = 1, borde = true,
}) => (
  <g opacity={op === 1 ? undefined : op}>
    <path d={d} fill={color} />
    {borde && (
      <>
        <path d={d} fill="none" stroke={color} strokeWidth={w} strokeDasharray={rayasSecas(semilla)} strokeLinejoin="round" />
        <path d={d} fill="none" stroke={color} strokeWidth={w * 1.9} strokeOpacity={0.7} strokeDasharray={rayasSecas(semilla + 77, 9, 22)}
          strokeLinejoin="round" />
      </>
    )}
  </g>
);

// los ids de los filtros, únicos por copia (en la cortinilla se pintan dos estilos a la vez)
export const useIds = () => {
  const base = 'noc' + React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return React.useMemo(() => (s: string) => `${base}-${s}`, [base]);
};

// ---------------------------------------------------------------- el filtro de la pintura
// Una banda de luz plana: la silueta, menos la misma silueta corrida `d`; queda una franja en el lado contrario a `d`.
export type Banda = {d: P; color: string; op: number};
export type Bandas = {sombra?: Banda; luz?: Banda; borde?: Banda};

const banda = (nombre: string, b: Banda) => (
  <React.Fragment key={nombre}>
    <feOffset in="d" dx={f1(b.d[0])} dy={f1(b.d[1])} result={`o${nombre}`} />
    <feComposite in="d" in2={`o${nombre}`} operator="out" result={`m${nombre}`} />
    <feFlood floodColor={b.color} floodOpacity={b.op} />
    <feComposite in2={`m${nombre}`} operator="in" result={`b${nombre}`} />
  </React.Fragment>
);

// desplaza: lo que tuerce el borde el ruido fijo · hierve: el que cambia cada «paso» · seco: los huecos del pincel seco en el borde
export const FiltroPintura: React.FC<{
  id: string; semilla: number; paso: number; desplaza: number; hierve: number; seco?: number; bandas?: Bandas;
  frecuencia?: number; margen?: number;
}> = ({id, semilla, paso, desplaza, hierve, seco = 0, bandas = {}, frecuencia = 0.022, margen = 25}) => {
  const lista = (['sombra', 'luz', 'borde'] as const).filter((k) => bandas[k]);
  return (
    <filter id={id} x={`-${margen}%`} y={`-${margen}%`} width={`${100 + 2 * margen}%`} height={`${100 + 2 * margen}%`}
      colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={frecuencia} numOctaves={3} seed={semilla} result="n1" />
      <feTurbulence type="fractalNoise" baseFrequency={frecuencia * 2.8} numOctaves={2} seed={semilla * 13 + paso} result="n2" />
      <feDisplacementMap in="SourceGraphic" in2="n1" scale={desplaza} xChannelSelector="R" yChannelSelector="G" result="d1" />
      <feDisplacementMap in="d1" in2="n2" scale={hierve} xChannelSelector="G" yChannelSelector="B" result="d" />
      {lista.map((k) => banda(k, bandas[k] as Banda))}
      <feMerge result="c">
        <feMergeNode in="d" />
        {lista.map((k) => <feMergeNode key={k} in={`b${k}`} />)}
      </feMerge>
      {seco > 0 && (
        <>
          {/* el pincel seco: rayas largas de ruido que solo muerden cerca del borde */}
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.12" numOctaves={2} seed={semilla * 7 + paso} result="n3" />
          <feColorMatrix in="n3" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  9 0 0 0 -4.9" result="h" />
          <feGaussianBlur in="d" stdDeviation={3.2} result="bl" />
          <feComponentTransfer in="bl" result="e">
            <feFuncA type="linear" slope={-2.4 * seco} intercept={2.4 * seco} />
          </feComponentTransfer>
          <feComposite in="e" in2="h" operator="arithmetic" k1={1} result="cut" />
          <feComposite in="c" in2="cut" operator="out" />
        </>
      )}
    </filter>
  );
};

// una cosa pintada anclada a su sitio: el ruido del filtro viaja (y gira) con ella, así la textura no resbala
export const Anclado: React.FC<{c: P; ang?: number; filtro: string; children: React.ReactNode}> = ({c, ang = 0, filtro, children}) => (
  <g transform={`translate(${f1(c[0])} ${f1(c[1])}) rotate(${grados(ang)})`}>
    <g filter={`url(#${filtro})`}>
      <g transform={`rotate(${grados(-ang)}) translate(${f1(-c[0])} ${f1(-c[1])})`}>{children}</g>
    </g>
  </g>
);
