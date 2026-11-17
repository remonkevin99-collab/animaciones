import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {loadFont as cargarVT323} from '@remotion/google-fonts/VT323';
import {clamp, temblor} from '../../../comun/curvas';
import {DUR, IMPACTO, T_CAE, T_SUELO, gato, type Gato, type P} from '../../gato/escena';
import {CH, CW, DUR_FALLO, aPantalla, cajaEnPantalla, fallo, revelar} from './camara';
import {MH, MW, S, brillaSolo, decorado, enMedidas, lienzo, luzIR} from './cocina';
import {cajaGato, ojosQueBrillan, pintarGato, sombraGato} from './gato';
import {pintarRotulos, type Recuadro} from './rotulos';
import {cajaTaza, pintarCafe, pintarSombraTaza, pintarTaza, pintarTrozos, pintarVapor} from './taza';

// EL GATO EN VIDEOVIGILANCIA (la escena en ../../gato/escena.ts). El gato
// pillado por la cámara de seguridad de casa, de noche, como los vídeos de gatos que se hacen virales. La cámara
// está en una esquina del techo con su gran angular (la imagen se curva en los bordes) y graba en visión nocturna: blanco y negro
// gris verdoso, el gato casi blanco con el infrarrojo y los OJOS QUE BRILLAN, ruido, bloques de compresión, algo blanda, líneas de
// barrido y a 12 cuadros por segundo, a saltos (con el rastro que dejan las cosas que se mueven, como en estas cámaras). Encima, sus
// rótulos: «● REC», «CAM 02 · COCINA», la fecha con la hora que corre, el medidor de sonido y el recuadro de «MOVIMIENTO DETECTADO»
// que salta sobre la pata y la taza y la sigue al caer. Al romperse: la imagen se sacude, salta un fallo de señal corto (tirones
// horizontales y bloques) y el recuadro se va al gato: «SOSPECHOSO».
// Cómo se pinta (en <canvas>): ./cocina.ts pinta la cocina en grises (lo que ve el infrarrojo) a media resolución, ./gato.ts y
// ./taza.ts lo que se mueve (tres veces: el cuadro y dos fantasmas de los anteriores), se le pone la luz del foco de la cámara y se
// suma lo que brilla solo (los ojos, la farola). ./camara.ts lo pasa por la lente y el sensor, y ./rotulos.ts escribe encima, nítido.

const {fontFamily: VT323, waitUntilDone} = cargarVT323('normal', {subsets: ['latin']});

export const FPS_CAM = 12;
// el reloj de la cámara: va a saltos de 1/12 s, con un cuadro que empieza justo en el golpe
const reloj = (t: number) => T_SUELO + Math.floor((t - T_SUELO) * FPS_CAM + 1e-6) / FPS_CAM;
// los fantasmas de los cuadros de antes (la cámara limpia el ruido mezclando cuadros, y lo que se mueve deja rastro)
const FANTASMAS: [number, number][] = [[2, 0.1], [1, 0.26], [0, 1]];

type Lienzos = {mundo: HTMLCanvasElement; capa: HTMLCanvasElement; halo: HTMLCanvasElement; cam: HTMLCanvasElement; img: ImageData};
let L: Lienzos | null = null;
const lienzos = (): Lienzos => {
  if (L) return L;
  const cam = lienzo(CW, CH);
  L = {
    mundo: lienzo(MW, MH), capa: lienzo(MW, MH), halo: lienzo(Math.round(MW / 4), Math.round(MH / 4)), cam,
    img: cam.getContext('2d')!.createImageData(CW, CH),
  };
  return L;
};

// lo que se mueve, en el segundo tg, sobre un lienzo vacío
const pintarLoQueSeMueve = (capa: HTMLCanvasElement, tg: number): Gato => {
  const c = capa.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, MW, MH);
  enMedidas(c);
  const g = gato(tg);
  pintarVapor(c, tg);
  pintarSombraTaza(c, tg);
  sombraGato(c, g);
  pintarTaza(c, tg);
  pintarGato(c, g);
  pintarCafe(c, tg);
  pintarTrozos(c, tg);
  return g;
};

// la cocina con lo que se mueve, la luz del infrarrojo y lo que brilla, en el reloj de la cámara
const componerMundo = (tc: number) => {
  const {mundo, capa, halo} = lienzos();
  const m = mundo.getContext('2d', {willReadFrequently: true})!;
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.globalCompositeOperation = 'source-over';
  m.globalAlpha = 1;
  m.drawImage(decorado(), 0, 0);
  const gatos: [Gato, number][] = [];
  for (const [k, a] of FANTASMAS) {
    const g = pintarLoQueSeMueve(capa, tc - k / FPS_CAM);
    m.globalAlpha = a;
    m.drawImage(capa, 0, 0);
    gatos.push([g, a]);
  }
  m.globalAlpha = 1;
  m.globalCompositeOperation = 'multiply';
  m.drawImage(luzIR(), 0, 0);
  m.globalCompositeOperation = 'lighter';
  m.drawImage(brillaSolo(), 0, 0);
  enMedidas(m);
  // el rastro de los ojos, más flojo que el del resto (si no, al asomarse deprisa le salen tres ojos)
  for (const [g, a] of gatos) ojosQueBrillan(m, g, a < 1 ? a * 0.3 : 1);
  m.setTransform(1, 0, 0, 1, 0, 0);
  // el halo: lo muy claro (los ojos, la farola, la taza, el gato en el centro del foco) se derrama alrededor, como en el sensor
  const h = halo.getContext('2d')!;
  h.globalCompositeOperation = 'source-over';
  h.filter = 'brightness(0.52) contrast(8)';
  h.drawImage(mundo, 0, 0, halo.width, halo.height);
  h.filter = 'none';
  m.filter = 'blur(6px)';
  m.globalAlpha = 0.42;
  m.drawImage(halo, 0, 0, MW, MH);
  m.filter = 'none';
  m.globalAlpha = 1;
  m.globalCompositeOperation = 'source-over';
  return m.getImageData(0, 0, MW, MH).data;
};

const ensancha = (b: [number, number, number, number], m: number): [number, number, number, number] => [b[0] - m, b[1] - m, b[2] + m, b[3] + m];
const une = (a: [number, number, number, number], b: [number, number, number, number]): [number, number, number, number] =>
  [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];

// los recuadros de la cámara «lista», en el reloj de la cámara
const recuadros = (tc: number): Recuadro[] => {
  if (tc >= 1.15 && tc < T_SUELO) {
    const tz = cajaTaza(tc);
    if (!tz) return [];
    let b = tz;
    if (tc < T_CAE + 0.06) {
      // la pata que empuja y la taza
      const g = gato(tc);
      const pie = g.pataCerca.pie.c;
      const q: P = [300 + (pie[0] - 300) * 1.14, 1010 + (pie[1] - 1010) * 1.14];
      b = une(tz, [q[0] - 40, q[1] - 40, q[0] + 40, q[1] + 30]);
    }
    return [{caja: cajaEnPantalla(ensancha(b, 26)), etiqueta: 'MOVIMIENTO DETECTADO'}];
  }
  if (tc >= T_SUELO + DUR_FALLO - 0.05) return [{caja: cajaEnPantalla(ensancha(cajaGato(gato(tc)), 22)), etiqueta: 'SOSPECHOSO'}];
  return [];
};

const IMPACTO_PANTALLA = (() => {
  let q: P | null = null;
  return () => (q ??= aPantalla(IMPACTO));
})();

const pintarCuadro = (destino: HTMLCanvasElement, tt: number, dpr: number) => {
  const t = clamp(tt, 0, DUR);
  const tc = reloj(t);
  const cuadro = Math.round(tc * FPS_CAM) + 1000;
  const {cam, img} = lienzos();
  const mundo = componerMundo(tc);
  const fa = fallo(t, IMPACTO_PANTALLA());
  const sacude = temblor(tc, T_SUELO, 0.42, 22, 7);
  const banda = ((tc * 150) % (CH + 160)) - 80;
  revelar(mundo, img, cuadro, sacude, banda, fa);
  cam.getContext('2d')!.putImageData(img, 0, 0);

  const c = destino.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(cam, 0, 0, destino.width, destino.height);
  // los rótulos, nítidos encima (en el fallo también se rompen: van por franjas corridas)
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rs = recuadros(tc);
  if (!fa) {
    pintarRotulos(c, VT323, tc, rs);
    return;
  }
  const cortes = [0, ...fa.rasgados.flatMap((r) => [r.y0 / S, r.y1 / S]).sort((a, b) => a - b), 1920];
  for (let k = 0; k < cortes.length - 1; k++) {
    const y0 = cortes[k], y1 = cortes[k + 1];
    if (y1 <= y0) continue;
    const dx = fa.rasgados.filter((r) => r.y0 / S <= y0 && r.y1 / S >= y1).reduce((s, r) => s + r.dx, 0);
    c.save();
    c.beginPath();
    c.rect(0, y0, 1080, y1 - y0);
    c.clip();
    c.translate(dx, 0);
    pintarRotulos(c, VT323, tc, rs);
    c.restore();
  }
};

export const Videovigilancia: React.FC<{t: number}> = ({t}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dpr] = useState(() => Math.min(2, Math.max(0.25, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)));
  const [espera] = useState(() => delayRender('Videovigilancia: la letra de la cámara'));
  const suelta = useRef(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vivo = true;
    waitUntilDone()
      .then(() => document.fonts.load(`40px "${VT323}"`))
      .catch(() => undefined)
      .then(() => {
        if (vivo) setListo(true);
      });
    return () => {
      vivo = false;
      if (!suelta.current) {
        suelta.current = true;
        continueRender(espera);
      }
    };
  }, [espera]);

  useLayoutEffect(() => {
    if (!listo || !ref.current) return;
    pintarCuadro(ref.current, t, dpr);
    if (!suelta.current) {
      suelta.current = true;
      continueRender(espera);
    }
  }, [t, listo, dpr, espera]);

  return (
    <canvas ref={ref} width={Math.round(1080 * dpr)} height={Math.round(1920 * dpr)}
      style={{position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#0B100D'}} />
  );
};
