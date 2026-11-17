import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {loadFont as cargarTitan} from '@remotion/google-fonts/TitanOne';
import {clamp, temblor} from '../../../comun/curvas';
import {DUR, T_SUELO, gato, taza} from '../../gato/escena';
import {piezasTaza, poli} from '../../gato/escena';
import {H, PINTA, W, base, cajaDe, lienzo, type Ctx} from './espray';
import {cajaGato, gatoGrafiti, siluetaGato} from './gato';
import {pared} from './pared';
import {cafeGrafiti, crashGrafiti, restos, salpicaduraGrafiti, tazaGrafiti, trozosGrafiti, vaporGrafiti} from './taza';

// EL GATO EN GRAFITI. Toda la escena pintada con espray en una pared de ladrillo de la calle, como una
// animación hecha pintando la pared cuadro a cuadro. Debajo, los ladrillos de verdad (sus juntas, manchas, churretes y
// desconchones) con las capas viejas (gris de tapar, restos de otras piezas, firmas que no se leen); encima, la pieza nueva: la nube
// cian, el «MIAU» con volumen, la espina de pescado, la mesa verde y el gato hecho personaje de grafiti, gordo y con cejas de
// actitud. Cada cosa con su niebla de espray, su contorno negro gordo, su corte blanco, su degradado y su raya de brillo. El
// relieve del ladrillo se ve a través de toda la pintura. Delante, la acera de verdad con un bote tirado.
// Se pinta a pasos, a 12 por segundo (la rejilla cae justo en el golpe), y quedan a medio tapar los dos cuadros de antes del gato y
// de la taza. EL MOMENTO: empuja la taza fucsia mirándote, la taza gira por el borde echando el café en un arco de gotas gordas y
// se rompe: el café salpica por la pared con sus goterones, saltan los trozos y entra de golpe un «¡CRASH!» con su explosión.
// El temblor del golpe, fluido. Piezas: espray.ts (el aerosol), pared.ts (lo que no se mueve), gato.ts y taza.ts.

const {fontFamily: TITAN, waitUntilDone} = cargarTitan('normal', {weights: ['400'], subsets: ['latin']});

// a pasos de 12 por segundo, con la rejilla puesta en el golpe (así el golpe cae en su cuadro)
const FPS_PINTA = 12;
const pasoDe = (t: number) => Math.floor((t - T_SUELO) * FPS_PINTA + 1e-6);
const tDePaso = (n: number) => clamp(T_SUELO + n / FPS_PINTA, 0, DUR);

let CUADRO: {dpr: number; c: HTMLCanvasElement} | null = null;

const pintar = (cv: HTMLCanvasElement, t: number, dpr: number) => {
  PINTA.dpr = dpr;
  const n = pasoDe(t);
  const ts = tDePaso(n);
  PINTA.paso = n + 1000;
  const P = pared(TITAN);
  if (!CUADRO || CUADRO.dpr !== dpr) CUADRO = {dpr, c: lienzo()};
  const c = CUADRO.c.getContext('2d') as Ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.filter = 'none';
  c.clearRect(0, 0, CUADRO.c.width, CUADRO.c.height);
  base(c);
  c.drawImage(P.fondo, 0, 0, W, H);

  // lo que queda de los dos cuadros de antes (el gato y la taza), tapado a medias
  const antes = [2, 1].flatMap((edad) => {
    const ta = tDePaso(n - edad);
    if (ta >= ts) return [];
    const g = gato(ta);
    const out = [{f: siluetaGato(g), caja: cajaGato(g, 40), edad}];
    const tz = taza(ta);
    if (tz.estado !== 'suelo') {
      const pz = piezasTaza(tz);
      const cu = new Path2D(poli(pz.cuerpo));
      const as = new Path2D(poli(pz.asa));
      out.push({f: {rellena: (b) => { b.fill(cu); b.fill(as); }, traza: (b) => { b.stroke(cu); b.stroke(as); }}, caja: cajaDe(pz.asa.concat(pz.cuerpo), 40), edad});
    }
    return out;
  });
  restos(c, antes);

  // el café que ya ha salpicado va detrás de todo lo que se mueve
  salpicaduraGrafiti(c, ts);
  crashGrafiti(c, ts, TITAN);
  vaporGrafiti(c, ts);
  const tz = taza(ts);
  gatoGrafiti(c, gato(ts), n * 7 + 3);
  if (tz.estado !== 'suelo') tazaGrafiti(c, tz, n + 50);
  cafeGrafiti(c, ts);
  trozosGrafiti(c, ts);

  // el relieve del ladrillo, por encima de toda la pintura; y la acera delante
  base(c);
  c.drawImage(P.relieve, 0, 0, W, H);
  c.drawImage(P.acera, 0, 0, W, H);

  // al lienzo de verdad, con el temblor del golpe (fluido, sin pasos)
  const x = cv.getContext('2d') as Ctx;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, cv.width, cv.height);
  const [dx, dy] = temblor(t, T_SUELO, 0.32, 11, 5);
  const z = dx || dy ? 1.025 : 1;
  x.setTransform(dpr * z, 0, 0, dpr * z, dpr * (dx + (W * (1 - z)) / 2), dpr * (dy + (H * (1 - z)) / 2));
  x.drawImage(CUADRO.c, 0, 0, W, H);
};

export const Grafiti: React.FC<{t: number}> = ({t: tt}) => {
  const t = clamp(tt, 0, DUR);
  const ref = useRef<HTMLCanvasElement>(null);
  const [dpr] = useState(() => Math.min(2, Math.max(0.25, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)));
  const [espera] = useState(() => delayRender('Grafiti del gato: la letra de las piezas'));
  const suelta = useRef(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vivo = true;
    waitUntilDone()
      .then(() => document.fonts.load(`400 100px "${TITAN}"`))
      .catch(() => undefined)
      .then(() => { if (vivo) setListo(true); });
    return () => {
      vivo = false;
      if (!suelta.current) { suelta.current = true; continueRender(espera); }
    };
  }, [espera]);

  useLayoutEffect(() => {
    if (!listo || !ref.current) return;
    pintar(ref.current, t, dpr);
    if (!suelta.current) { suelta.current = true; continueRender(espera); }
  }, [t, listo, dpr, espera]);

  return (
    <canvas ref={ref} width={Math.round(W * dpr)} height={Math.round(H * dpr)}
      style={{position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#5A2A1E'}} />
  );
};
