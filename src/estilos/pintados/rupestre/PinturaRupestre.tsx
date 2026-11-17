import React, {useLayoutEffect, useRef, useState} from 'react';
import {clamp, temblor} from '../../../comun/curvas';
import {DUR, T_CAE, T_SUELO, gato, taza} from '../../gato/escena';
import {luzDe, pintarAntorcha} from './antorcha';
import {decoradoFijo} from './decorado';
import {pintarGato, rastroGato} from './gato';
import {ctx, lienzo} from './pigmento';
import {H, W, iluminar, roca} from './roca';
import {pintarCafe, pintarGolpe, pintarSalpicadura, pintarTrozos, pintarVapor, pintarVasija} from './vasija';

// EL GATO EN PINTURA RUPESTRE (la escena en ../../gato/escena.ts). La escena pintada
// en la pared de una cueva hace 30.000 años y alumbrada por una antorcha. La roca es de verdad (./roca.ts): bultos, grietas que
// serpentean, vetas de calcita, zonas claras y oscuras, el hollín encima de la antorcha, el techo con sus estalactitas y el suelo
// de guijarros; la luz de la antorcha le llega rasante, de lado, y como la llama se mece y parpadea, el relieve se mueve con ella.
// Encima, los pigmentos de las cuevas (ocre rojo, ocre amarillo, carbón y caolín), soplados y a dedo (./pigmento.ts): no cubren
// del todo, se meten en los poros y sus bordes se rompen en motas con el grano de la piedra. Lo pintado que no se mueve
// (./decorado.ts): la mesa hecha losa sobre dos piedras de pie, la raya del suelo, tres manos en negativo, un caballito sobre un
// bulto de la roca, un ciervo pequeño, puntos y rayas. El gato (./gato.ts), como los animales de las cuevas: ocre soplado, rayas
// de carbón a dedo y contorno grueso, con la pata que empuja y la cola repetidas en los pasos de antes (el truco de los pintores
// de cuevas para el movimiento). La taza es una vasija de barro (./vasija.ts): al caer deja la vasija repetida detrás; al romperse,
// el café de ocre marrón salpica la roca, saltan los trozos hechos trazos de carbón y salen las rayas del golpe.
// Lo pintado se mueve a pasos de 12 por segundo, con la rejilla puesta en el golpe (así se rompe en su cuadro); la luz de la
// antorcha y el temblor del golpe, fluidos.

const FPS_PINTA = 12;
const pasoDe = (t: number) => Math.floor((t - T_SUELO) * FPS_PINTA + 1e-6);
const tDePaso = (n: number) => clamp(T_SUELO + n / FPS_PINTA, 0, DUR);

let EST: {pig: HTMLCanvasElement; fin: HTMLCanvasElement; img: ImageData} | null = null;

const pintarCuadro = (destino: HTMLCanvasElement, tt: number, dpr: number) => {
  const t = clamp(tt, 0, DUR);
  roca();
  if (!EST) {
    const pig = lienzo(), fin = lienzo();
    EST = {pig, fin, img: ctx(fin).createImageData(W, H)};
  }
  const n = pasoDe(t);
  const ts = tDePaso(n);

  // 1 · la pintura: lo fijo, y encima lo que se mueve (a pasos)
  const pc = ctx(EST.pig);
  pc.setTransform(1, 0, 0, 1, 0, 0);
  pc.globalAlpha = 1;
  pc.globalCompositeOperation = 'source-over';
  pc.filter = 'none';
  pc.clearRect(0, 0, W, H);
  pc.drawImage(decoradoFijo(), 0, 0);
  pintarSalpicadura(pc, ts);
  pintarGolpe(pc, ts);
  pintarVapor(pc, ts);
  const g = gato(ts);
  const antes = [1, 2, 3].map((k) => tDePaso(n - k)).filter((ta) => ta < ts).map((ta) => gato(ta));
  rastroGato(pc, g, antes);
  // la vasija: su rastro mientras cae, y ella
  const tz = taza(ts);
  if (tz.estado === 'cae' || ts < T_SUELO + 0.2) {
    // el rastro de la vasija: los pasos de antes en el aire (también un momento después de romperse)
    [3, 2, 1].forEach((k) => {
      const ta = tDePaso(n - k);
      if (ta < T_CAE + 0.05 || ta >= T_SUELO) return;
      const fu = [0.85, 0.6, 0.38][k - 1] * (tz.estado === 'suelo' ? 0.7 : 1);
      pintarVasija(pc, taza(ta), fu, true);
    });
  }
  if (tz.estado !== 'suelo') pintarVasija(pc, tz);
  pintarGato(pc, g, n);
  pintarCafe(pc, ts);
  pintarTrozos(pc, ts);

  // 2 · la pintura sobre la roca, alumbrada por la antorcha (fluida); y la antorcha encima
  const pig = pc.getImageData(0, 0, W, H).data;
  const golpe = t >= T_SUELO ? Math.max(0, 1 - (t - T_SUELO) / 0.25) : 0;
  iluminar(pig, EST.img.data, luzDe(t, golpe));
  const fc = ctx(EST.fin);
  fc.putImageData(EST.img, 0, 0);
  pintarAntorcha(fc, t);

  // 3 · a la pantalla, con el temblor del golpe (una sacudida y un empujón hacia dentro que tapa los bordes)
  const [sx, sy] = temblor(t, T_SUELO, 0.3, 10, 6);
  const k = clamp((t - T_SUELO) / 0.3);
  const z = t >= T_SUELO && k < 1 ? 1 + 0.03 * (1 - k) ** 2 : 1;
  const c = destino.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.setTransform(dpr * z, 0, 0, dpr * z, dpr * (sx + (W * (1 - z)) / 2), dpr * (sy + (H * (1 - z)) / 2));
  c.drawImage(EST.fin, 0, 0, W, H);
};

export const PinturaRupestre: React.FC<{t: number}> = ({t}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dpr] = useState(() => Math.min(2, Math.max(0.25, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)));
  useLayoutEffect(() => {
    if (ref.current) pintarCuadro(ref.current, t, dpr);
  }, [t, dpr]);
  return (
    <canvas ref={ref} width={Math.round(W * dpr)} height={Math.round(H * dpr)}
      style={{position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#2a1a10'}} />
  );
};
