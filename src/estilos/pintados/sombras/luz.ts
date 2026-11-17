import {ruido} from '../../../comun/curvas';
import {T_SUELO, type P} from '../../gato/escena';
import {PANT, rgb, type Ctx} from './lienzos';

// LA LUZ DE DETRÁS: un candil detrás de la pantalla de papel. Su centro es casi blanco y se va poniendo
// ámbar, naranja y rojo oscuro hacia los bordes; encima, la llama misma (un resplandor alargado que se mece). Parpadea suave y
// fluida (sin pasos: las marionetas van a saltos, la luz no). Al romperse la taza, un fogonazo: la luz se dispara y se abre.

export type Luz = {c: P; r: number; k: number; flash: number; llama: P; viva: number; mece: number};

export const luzDe = (t: number): Luz => {
  const flash = t >= T_SUELO ? Math.max(0, 1 - (t - T_SUELO) / 0.42) ** 2 : 0;
  const parpadeo = 0.075 * ruido(t * 6.3, 11) + 0.045 * ruido(t * 14.7, 12) + 0.022 * ruido(t * 29, 13);
  const c: P = [606 + 14 * ruido(t * 1.4, 14), 800 + 14 * ruido(t * 1.15, 15)];
  return {
    c,
    r: 1100 * (1 + 0.03 * ruido(t * 3.8, 16)) * (1 + 0.24 * flash),
    k: 0.97 + parpadeo + 0.8 * flash,
    flash,
    llama: [664 + 9 * ruido(t * 3.1, 17), 806 + 7 * ruido(t * 2.6, 18)],
    viva: 1 + 4 * parpadeo + 1.5 * flash,
    mece: 0.7 * ruido(t * 4.2, 19) + 0.3 * Math.sin(t * 9),
  };
};

// del centro al borde: casi blanco, ámbar, naranja, rojo y rojo oscuro
const PARADAS: [number, number[]][] = [
  [0, [255, 252, 240]], [0.1, [255, 243, 204]], [0.25, [255, 218, 136]], [0.42, [255, 176, 70]],
  [0.6, [246, 124, 32]], [0.78, [196, 70, 16]], [1, [96, 24, 6]],
];

export const pintarLuz = (x: Ctx, l: Luz) => {
  x.save();
  x.beginPath();
  x.rect(PANT.x0, PANT.y0, PANT.x1 - PANT.x0, PANT.y1 - PANT.y0);
  x.clip();
  const g = x.createRadialGradient(l.c[0], l.c[1], 0, l.c[0], l.c[1], l.r);
  for (const [s, col] of PARADAS) g.addColorStop(s, rgb(col, l.k));
  x.fillStyle = g;
  x.fillRect(PANT.x0, PANT.y0, PANT.x1 - PANT.x0, PANT.y1 - PANT.y0);
  // la llama: un resplandor alargado alrededor y, en medio, la llama misma vista a través del papel (una lágrima blanda que se mece)
  x.globalCompositeOperation = 'lighter';
  x.translate(l.llama[0], l.llama[1]);
  const v = Math.min(1.6, l.viva);
  x.save();
  x.scale(1, 1.6);
  const g2 = x.createRadialGradient(0, 0, 0, 0, 0, 240);
  g2.addColorStop(0, `rgba(255,250,232,${0.36 * v})`);
  g2.addColorStop(0.4, `rgba(255,222,160,${0.14 * v})`);
  g2.addColorStop(1, 'rgba(255,190,110,0)');
  x.fillStyle = g2;
  x.fillRect(-250, -250, 500, 500);
  x.restore();
  const mece = l.mece;
  x.filter = 'blur(14px)';
  x.fillStyle = `rgba(255,246,220,${(0.5 * v).toFixed(3)})`;
  x.beginPath();
  x.moveTo(mece * 26, -96 - 10 * v);
  x.bezierCurveTo(16 + mece * 10, -40, 34, 0, 30, 24);
  x.bezierCurveTo(26, 52, -26, 52, -30, 24);
  x.bezierCurveTo(-34, 0, -16 + mece * 10, -40, mece * 26, -96 - 10 * v);
  x.fill();
  x.filter = 'blur(8px)';
  x.fillStyle = `rgba(255,255,250,${(0.55 * v).toFixed(3)})`;
  x.beginPath();
  x.ellipse(mece * 6, 14, 14, 26, 0, 0, Math.PI * 2);
  x.fill();
  x.restore();
  // el fogonazo: toda la pantalla se enciende un momento
  if (l.flash > 0) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const g3 = x.createRadialGradient(l.c[0], l.c[1], 0, l.c[0], l.c[1], 1000);
    g3.addColorStop(0, `rgba(255,248,226,${(0.55 * l.flash).toFixed(3)})`);
    g3.addColorStop(1, `rgba(255,190,110,${(0.22 * l.flash).toFixed(3)})`);
    x.fillStyle = g3;
    x.fillRect(PANT.x0, PANT.y0, PANT.x1 - PANT.x0, PANT.y1 - PANT.y0);
    x.restore();
  }
};
