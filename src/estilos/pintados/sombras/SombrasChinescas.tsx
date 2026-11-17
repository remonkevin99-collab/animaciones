import React, {useLayoutEffect, useRef, useState} from 'react';
import {clamp, rng, temblor} from '../../../comun/curvas';
import {DUR, T_SUELO, gato, rot, suma, taza, type P} from '../../gato/escena';
import {decorado, farol} from './decorado';
import {colorGato, pintarGato, varillas} from './gato';
import {H, PANT, PIVOTE, W, ctx, lienzo, limpia, pasoDe, tDePaso, type Ctx} from './lienzos';
import {luzDe, pintarLuz} from './luz';
import {papel} from './papel';
import {pintarCafe, pintarCras, pintarTaza, pintarTrozos, pintarVapor} from './taza';
import {marco, polvo, publico, varilla} from './teatro';

// EL GATO EN SOMBRAS CHINESCAS (la escena en ../../gato/escena.ts). Un teatrillo de
// sombras: una pantalla de papel alumbrada por detrás con un candil (./luz.ts: el centro casi blanco, ámbar, naranja y rojo oscuro
// hacia los bordes, con la llama que se mece y parpadea) y, pegado a ella, todo en silueta de cartón negro: el gato títere en piezas
// con sus remaches, sus calados y sus papeles de color (./gato.ts), las varillas que lo sujetan desde abajo (nítidas donde se
// agarran, blandas lejos de la pantalla), la mesa con mantel de encaje, la ventana con la noche azul y la luna, la planta y el
// farolillo rojo que se mece (./decorado.ts). Encima, el papel de la pantalla (./papel.ts). Alrededor, el teatrillo de madera con
// sus cortinas rojas recogidas, alumbrado solo por la pantalla, y delante las cabezas de dos niños mirando (./teatro.ts).
// EL MOMENTO: la taza se despega de la pantalla al caer, se acerca a la luz y su sombra CRECE y se desenfoca; al llegar al suelo
// vuelve a la pantalla, se rompe (los trozos con sus calados, el café de papel de seda marrón), la luz da un fogonazo, el teatrillo
// tiembla, el niño da un respingo y sube en su varilla el letrero del «¡CRAS!» (./taza.ts).
// Las marionetas van a saltos, a 15 por segundo (con la rejilla en el golpe); la luz, el polvo y los niños, fluidos.

let EST: {luz: HTMLCanvasElement; sombra: HTMLCanvasElement; sal: HTMLCanvasElement; brillo: HTMLCanvasElement} | null = null;
const BW = W / 6, BH = H / 6;

const pintarCuadro = (destino: HTMLCanvasElement, tt: number, dpr: number) => {
  // (un pelo más: el cuadro del golpe cae en 3,0999… y tiene que contar ya como golpe)
  const t = clamp(tt + 1e-6, 0, DUR);
  const deco = decorado();
  const pap = papel();
  const mar = marco();
  EST ??= {luz: lienzo(), sombra: lienzo(), sal: lienzo(), brillo: lienzo(BW, BH)};
  const n = pasoDe(t);
  const ts = clamp(tDePaso(n), 0, DUR);
  const l = luzDe(t);

  // el pulso del titiritero: en cada paso, el gato se mueve un pelo (un poco de vaivén y un giro mínimo desde donde se sienta)
  const r = rng(900 + n);
  const jx = (r() - 0.5) * 2.4, jy = (r() - 0.5) * 1.6, ja = (r() - 0.5) * 0.005;
  const pulso = (x: Ctx) => {
    x.translate(jx + PIVOTE[0], jy + PIVOTE[1]);
    x.rotate(ja);
    x.translate(-PIVOTE[0], -PIVOTE[1]);
  };
  const conPulso = (q: P): P => suma(suma(PIVOTE, rot([q[0] - PIVOTE[0], q[1] - PIVOTE[1]], ja)), [jx, jy]);

  // 1 · la luz de detrás y los papeles de color (F); las siluetas, en negro con su alfa (S)
  const F = ctx(EST.luz);
  limpia(F);
  pintarLuz(F, l);
  F.drawImage(deco.color, 0, 0);
  const S = ctx(EST.sombra);
  limpia(S);
  // el decorado está un poco más atrás que los títeres: su sombra es algo menos negra (así el gato no se funde con la ventana)
  S.globalAlpha = 0.82;
  S.drawImage(deco.sombra, 0, 0);
  S.globalAlpha = 0.9;
  farol(S, F, ts);
  S.globalAlpha = 1;
  pintarVapor(S, ts);

  const g = gato(ts);
  F.save();
  pulso(F);
  colorGato(F, g);
  F.restore();
  S.save();
  pulso(S);
  S.drawImage(pintarGato(g), 0, 0);
  S.restore();
  const [vCuello, vMano] = varillas(g).map(conPulso);
  varilla(S, vCuello, [vCuello[0] - 170, PANT.y1 + 40]);
  varilla(S, vMano, [vMano[0] + 46, PANT.y1 + 40]);

  pintarTaza(S, F, taza(ts), ts);
  pintarCafe(S, F, ts);
  pintarTrozos(S, F, ts);
  const vCras = pintarCras(S, F, ts);
  if (vCras) varilla(S, vCras, [vCras[0] + 60, PANT.y1 + 40]);

  // 2 · la sombra sobre la luz y el papel encima
  F.save();
  F.beginPath();
  F.rect(PANT.x0, PANT.y0, PANT.x1 - PANT.x0, PANT.y1 - PANT.y0);
  F.clip();
  F.globalAlpha = 0.965;
  F.drawImage(EST.sombra, 0, 0);
  F.globalAlpha = 1;
  F.globalCompositeOperation = 'multiply';
  F.drawImage(pap, 0, 0);
  F.restore();

  // 3 · el teatrillo alrededor (a oscuras, con lo que enciende la pantalla), el público, el resplandor y el polvo
  const O = ctx(EST.sal);
  limpia(O);
  O.fillStyle = '#000';
  O.fillRect(0, 0, W, H);
  O.drawImage(EST.luz, 0, 0);
  O.drawImage(mar.oscuro, 0, 0);
  O.globalCompositeOperation = 'lighter';
  O.globalAlpha = clamp(0.5 + 0.5 * l.k, 0, 1);
  O.drawImage(mar.luz, 0, 0);
  if (l.flash > 0) {
    O.globalAlpha = 0.7 * l.flash;
    O.drawImage(mar.luz, 0, 0);
  }
  O.globalAlpha = 1;
  O.globalCompositeOperation = 'source-over';
  publico(O, t, l);
  const B = ctx(EST.brillo);
  limpia(B);
  B.filter = 'blur(6px)';
  B.drawImage(EST.luz, 0, 0, BW, BH);
  // el resplandor: fuerte sobre el marco (la luz que se derrama) y muy poco sobre la pantalla (no levanta los negros)
  O.globalCompositeOperation = 'screen';
  O.save();
  const fuera = new Path2D();
  fuera.rect(0, 0, W, H);
  fuera.rect(PANT.x0, PANT.y0, PANT.x1 - PANT.x0, PANT.y1 - PANT.y0);
  O.clip(fuera, 'evenodd');
  O.globalAlpha = clamp(0.45 + 0.4 * l.flash, 0, 1);
  O.drawImage(EST.brillo, 0, 0, W, H);
  O.restore();
  O.globalAlpha = clamp(0.08 + 0.4 * l.flash, 0, 1);
  O.drawImage(EST.brillo, 0, 0, W, H);
  O.globalAlpha = 1;
  O.globalCompositeOperation = 'source-over';
  polvo(O, t, l);

  // 4 · a la pantalla, con el temblor del golpe (una sacudida y un empujón hacia dentro que tapa los bordes)
  const [sx, sy] = temblor(t, T_SUELO, 0.32, 9, 6);
  const k = clamp((t - T_SUELO) / 0.32);
  const z = t >= T_SUELO && k < 1 ? 1 + 0.025 * (1 - k) ** 2 : 1;
  const c = destino.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000';
  c.fillRect(0, 0, destino.width, destino.height);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.setTransform(dpr * z, 0, 0, dpr * z, dpr * (sx + (W * (1 - z)) / 2), dpr * (sy + (H * (1 - z)) / 2));
  c.drawImage(EST.sal, 0, 0, W, H);
};

export const SombrasChinescas: React.FC<{t: number}> = ({t}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dpr] = useState(() => Math.min(2, Math.max(0.25, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)));
  useLayoutEffect(() => {
    if (ref.current) pintarCuadro(ref.current, t, dpr);
  }, [t, dpr]);
  return (
    <canvas ref={ref} width={Math.round(W * dpr)} height={Math.round(H * dpr)}
      style={{position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#120804'}} />
  );
};
