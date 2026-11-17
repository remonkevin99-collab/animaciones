import React, {useLayoutEffect, useRef, useState} from 'react';
import {E, clamp, temblor} from '../../../comun/curvas';
import {DUR, T_SUELO, gato} from '../../gato/escena';
import {cielo, pintarNubes, pintarPajaros, pintarRayos, pintarResplandor} from './cielo';
import {pelosGato, pintarBigotes, pintarGato, siluetaGato} from './gato';
import {leerMascara, mascara, pintarAcabado, pintarBordeLuz, pintarBrillo, pintarHaces, pintarMotas, pintarPelos} from './luz';
import {pintarArboles, pintarHierbaDelante, pintarHierbaMedia, tierra} from './paisaje';
import {ALTO, ANCHO, ctx, lienzo, limpio} from './pincel';
import {pintarPlumeros, porche, siluetaPorche} from './porche';
import {pintarCafe, pintarGolpe, pintarTaza, pintarTrozos, pintarVapor, siluetaTaza} from './taza';

// EL GATO EN HORA DORADA (la escena en ../../gato/escena.ts). Una
// pintura de la hora dorada. La mesa está en un porche de madera al atardecer, con el sol bajo justo detrás de la taza,
// casi tocando las colinas; el cielo de pinceladas sueltas y horizontales (violeta, malva, rosa, naranja y oro) con nubes alargadas
// encendidas por debajo, las colinas en capas de bruma, cipreses y pinos de copa plana a contraluz, una bandada lejos, el prado con
// un camino que lleva al sol, pampas en un jarrón y hierba alta que se mece delante. A CONTRALUZ: el gato y la taza son siluetas
// oscuras y cálidas con un borde fino de luz dorada (más gordo por el lado del sol), los pelos del contorno brillan, las orejas dejan
// pasar el sol, salen haces de luz entre las siluetas y el polvo dorado flota en el aire. EL MOMENTO: el vapor brilla delante del sol
// mientras la empuja mirándote; al caer, el café es ámbar y brilla como miel; al romperse, una corona de gotas con destellos de
// estrella, el polvo del suelo que se levanta y brilla, un golpe suave de cámara y los trozos con su sombra larga.
// Cómo se pinta (en un <canvas>, fluido, sin temblor de cuadro a cuadro): lo fijo (el cielo, la tierra, el porche) se pinta UNA vez
// con miles de pinceladas (./pincel.ts) y se guarda; en cada cuadro, las nubes que se mueven, los árboles que se mecen, la hierba, el
// gato (./gato.ts), la taza y su café (./taza.ts) y toda la luz (./luz.ts); al final, el brillo, la viñeta y la tela del lienzo.

let CUADRO: HTMLCanvasElement | null = null;

const pintarCuadro = (destino: HTMLCanvasElement, tt: number, dpr: number) => {
  const t = clamp(tt, 0, DUR);
  CUADRO ??= lienzo(ANCHO, ALTO);
  const c = ctx(CUADRO);
  limpio(c);
  const g = gato(t);

  // el cielo y lo que hay en él
  c.drawImage(cielo(), 0, 0);
  pintarResplandor(c, t, 0.8);
  pintarNubes(c, t);
  pintarRayos(c, t);
  pintarPajaros(c, t);
  // el paisaje
  c.drawImage(tierra(), 0, 0);
  pintarArboles(c, t);
  pintarHierbaMedia(c, t);
  // el porche, la taza y el gato
  c.drawImage(porche(), 0, 0);
  pintarPlumeros(c, t);
  pintarVapor(c, t);
  pintarTaza(c, t);
  pintarGato(c, g);
  pintarTrozos(c, t);
  // la silueta de lo que está a contraluz, y su borde de luz
  const {lienzo: silueta, c: mc} = mascara();
  mc.clearRect(0, 0, ANCHO, ALTO);
  mc.drawImage(siluetaPorche(), 0, 0);
  siluetaGato(mc, g);
  siluetaTaza(mc, t);
  leerMascara();
  pintarBordeLuz(c);
  pintarPelos(c, pelosGato(g), t);
  pintarBigotes(c, g);
  // el café y el golpe
  pintarCafe(c, t);
  pintarGolpe(c, t);
  // el aire: los haces del sol, el polvo, la hierba de delante
  pintarHaces(c, t, [tierra(), silueta]);
  pintarMotas(c, t);
  pintarHierbaDelante(c, t);
  // el acabado
  pintarBrillo(c, CUADRO, 0.36);
  pintarAcabado(c);

  // a la pantalla: la cámara se acerca despacio todo el rato y da un golpe suave al romperse la taza
  const [sx, sy] = temblor(t, T_SUELO, 0.36, 7, 5);
  const k = clamp((t - T_SUELO) / 0.36);
  const golpe = t >= T_SUELO && k < 1 ? 0.016 * (1 - E.outCubic(k)) : 0;
  const z = 1.012 + 0.03 * (t / DUR) + golpe;
  const cx = 600, cy = 1000;
  const d = destino.getContext('2d')!;
  d.setTransform(1, 0, 0, 1, 0, 0);
  d.imageSmoothingEnabled = true;
  d.imageSmoothingQuality = 'high';
  d.setTransform(dpr * z, 0, 0, dpr * z, dpr * (sx + cx - cx * z), dpr * (sy + cy - cy * z));
  d.drawImage(CUADRO, 0, 0, ANCHO, ALTO);
};

export const HoraDorada: React.FC<{t: number}> = ({t}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dpr] = useState(() => Math.min(2, Math.max(0.25, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)));
  useLayoutEffect(() => {
    if (ref.current) pintarCuadro(ref.current, t, dpr);
  }, [t, dpr]);
  return (
    <canvas ref={ref} width={Math.round(ANCHO * dpr)} height={Math.round(ALTO * dpr)}
      style={{position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#2A1A30'}} />
  );
};
