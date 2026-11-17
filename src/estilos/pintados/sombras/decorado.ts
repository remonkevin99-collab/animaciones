import {rng} from '../../../comun/curvas';
import {BORDE, MESA_Y, SUELO, type P} from '../../gato/escena';
import {PANT, calar, ctx, lente, lienzo, poligono, type Ctx} from './lienzos';

// EL DECORADO DEL TEATRO: las piezas de cartón negro que no se mueven, pegadas a la pantalla, y sus
// papeles de color (lo que en el teatro chino es cuero teñido: por ahí la luz sale de color). Se pinta una vez en dos lienzos:
// SOMBRA (negro con su alfa, un pelo desenfocado: está casi en la pantalla, un poco más atrás que el gato) y COLOR (los papeles
// de color, que solo se ven por los huecos). Lo que hay: la mesa con su mantel de encaje calado y patas torneadas, el suelo con su
// cenefa de rombos, la ventana con la noche azul, la luna (un agujero) y los tejados del pueblo con sus ventanitas encendidas, una
// maceta con una flor roja en el alféizar y, debajo de la mesa, una planta grande de hojas verdes. El farolillo de papel rojo
// cuelga de arriba y se mece: ese se pinta en cada paso (farol()).

export const SUELO_Y = 1612; // el borde de arriba del suelo
const MESA_X0 = 112;
const MANTEL_Y = 1112; // el bajo del mantel
export const VENTANA = {x0: 648, y0: 300, x1: 902, y1: 712};
const LUNA: P = [846, 398];

let DECO: {sombra: HTMLCanvasElement; color: HTMLCanvasElement} | null = null;

// ---------------------------------------------------------------- la mesa
const pata = (x: Ctx, cx: number) => {
  // de arriba abajo: [y, medio ancho]
  const perfil: [number, number][] = [
    [MANTEL_Y - 6, 22], [1150, 22], [1158, 27], [1170, 27], [1180, 13], [1196, 18], [1214, 12], [1380, 15], [1500, 10],
    [1516, 17], [1530, 17], [1542, 9], [1572, 12], [1590, 16], [SUELO_Y + 4, 16],
  ];
  const izq = perfil.map(([y, w]) => [cx - w, y] as P);
  const der = perfil.map(([y, w]) => [cx + w, y] as P).reverse();
  poligono(x, [...izq, ...der]);
  x.fill();
};

const mesa = (s: Ctx) => {
  s.fillStyle = '#000';
  // el tablero y el mantel que cuelga por delante, con el bajo de ondas
  const pts: P[] = [[MESA_X0, MESA_Y - 2], [BORDE, MESA_Y - 2], [BORDE, MANTEL_Y - 18]];
  const n = 13;
  for (let i = 0; i <= n; i++) {
    const xx = BORDE - ((BORDE - MESA_X0) * i) / n;
    pts.push([xx, MANTEL_Y - 18]);
    if (i < n) {
      const xm = xx - (BORDE - MESA_X0) / n / 2;
      pts.push([xm + 10, MANTEL_Y + 2], [xm, MANTEL_Y + 6], [xm - 10, MANTEL_Y + 2]);
    }
  }
  poligono(s, pts);
  s.fill();
  // el canto del tablero, una moldura que sobresale un poco por la izquierda
  s.fillRect(MESA_X0 - 8, MESA_Y + 30, 20, 12);
  pata(s, 176);
  pata(s, 652);
  // el encaje: una fila de agujeros redondos, una de florecitas y los ojitos de las ondas
  calar(s, () => {
    s.lineWidth = 4;
    for (let xx = MESA_X0 + 26; xx < BORDE - 14; xx += 30) {
      s.beginPath();
      s.arc(xx, 1048, 5.5, 0, Math.PI * 2);
      s.fill();
    }
    for (let xx = MESA_X0 + 40; xx < BORDE - 20; xx += 52) {
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        s.beginPath();
        s.ellipse(xx + Math.cos(a) * 8, 1074 + Math.sin(a) * 8, 7, 3.6, a, 0, Math.PI * 2);
        s.fill();
      }
    }
    const paso = (BORDE - MESA_X0) / n;
    for (let i = 0; i < n; i++) {
      const xm = BORDE - paso * (i + 0.5);
      s.beginPath();
      s.arc(xm, 1100, 4, 0, Math.PI * 2);
      s.fill();
    }
    // una raya fina bajo el tablero: el mantel y la mesa son dos piezas
    s.fillRect(MESA_X0 + 6, MESA_Y + 24, BORDE - MESA_X0 - 12, 2.6);
  });
};

// ---------------------------------------------------------------- el suelo, con su cenefa de rombos
const suelo = (s: Ctx) => {
  s.fillStyle = '#000';
  s.fillRect(PANT.x0 - 10, SUELO_Y, PANT.x1 - PANT.x0 + 20, PANT.y1 - SUELO_Y + 20);
  calar(s, () => {
    for (let xx = PANT.x0 + 20; xx < PANT.x1; xx += 44) {
      poligono(s, [[xx, 1630], [xx + 8, 1640], [xx, 1650], [xx - 8, 1640]]);
      s.fill();
    }
    s.fillRect(PANT.x0, 1620, PANT.x1 - PANT.x0, 2.4);
  });
};

// ---------------------------------------------------------------- la ventana: la noche azul, la luna, el pueblo
const ventana = (s: Ctx, c: Ctx) => {
  const {x0, y0, x1, y1} = VENTANA;
  const marco = 16;
  const mx = (x0 + x1) / 2;
  const ty = 490;
  // los cristales, de papel azul de noche, con la luna y las estrellas en hueco
  const cristales = new Path2D();
  cristales.rect(x0 + marco, y0 + marco, x1 - x0 - 2 * marco, y1 - y0 - 2 * marco);
  const hueco = new Path2D();
  hueco.arc(LUNA[0], LUNA[1], 40, 0, Math.PI * 2);
  const r = rng(51);
  const estrellas: P[] = [];
  for (let i = 0; i < 14; i++) {
    const p: P = [x0 + marco + 10 + r() * (x1 - x0 - 2 * marco - 20), y0 + marco + 10 + r() * 230];
    if (Math.hypot(p[0] - LUNA[0], p[1] - LUNA[1]) < 62) continue;
    estrellas.push(p);
  }
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(22,38,138,0.94)');
  g.addColorStop(0.6, 'rgba(40,78,196,0.9)');
  g.addColorStop(1, 'rgba(70,120,226,0.86)');
  c.save();
  c.fillStyle = g;
  c.fill(cristales);
  c.globalCompositeOperation = 'destination-out';
  c.fill(hueco);
  for (const [ex, ey] of estrellas) {
    const k = 3 + r() * 3;
    poligono(c, [[ex, ey - k * 2], [ex + k * 0.5, ey - k * 0.5], [ex + k * 2, ey], [ex + k * 0.5, ey + k * 0.5], [ex, ey + k * 2],
      [ex - k * 0.5, ey + k * 0.5], [ex - k * 2, ey], [ex - k * 0.5, ey - k * 0.5]]);
    c.fill();
  }
  c.restore();
  // la luna, un pelo amarilla
  c.fillStyle = 'rgba(255,236,150,0.35)';
  c.beginPath();
  c.arc(LUNA[0], LUNA[1], 40, 0, Math.PI * 2);
  c.fill();

  s.fillStyle = '#000';
  // el marco, el parteluz y el travesaño, la cornisa y el alféizar con sus ménsulas
  const m = new Path2D();
  m.rect(x0, y0, x1 - x0, y1 - y0);
  m.rect(x0 + marco, y0 + marco, x1 - x0 - 2 * marco, y1 - y0 - 2 * marco);
  s.fill(m, 'evenodd');
  s.fillRect(mx - 7, y0, 14, y1 - y0);
  s.fillRect(x0, ty - 6, x1 - x0, 12);
  s.fillRect(x0 - 14, y0 - 12, x1 - x0 + 28, 14);
  s.fillRect(x0 - 20, y1, x1 - x0 + 40, 20);
  for (const bx of [x0 + 6, x1 - 34]) {
    poligono(s, [[bx, y1 + 20], [bx + 28, y1 + 20], [bx + 14, y1 + 44]]);
    s.fill();
  }
  // los cráteres de la luna, en sombra suave
  s.save();
  s.globalAlpha = 0.22;
  for (const [cx, cy, rr] of [[834, 386, 9], [858, 410, 6], [842, 418, 4.5], [860, 384, 4]]) {
    s.beginPath();
    s.arc(cx, cy, rr, 0, Math.PI * 2);
    s.fill();
  }
  s.restore();
  // el pueblo: tejados a dos aguas, una chimenea y un campanario, con sus ventanitas encendidas
  const yb = y1 - marco;
  const casas: [number, number, number][] = [ // x, ancho, alto de la pared
    [x0 + marco - 6, 50, 52], [x0 + 52, 42, 74], [x0 + 92, 36, 40], [mx + 4, 46, 60], [mx + 48, 30, 96], [mx + 76, 52, 46],
  ];
  const tejado: P[] = [[x0 + marco, yb]];
  for (const [cx, w, h] of casas) {
    const top = yb - h;
    if (w === 30) {
      // el campanario: alto y con su aguja
      tejado.push([cx, top], [cx + w / 2, top - 46], [cx + w, top]);
    } else {
      tejado.push([cx, top], [cx + w / 2, top - w * 0.5], [cx + w, top]);
    }
  }
  tejado.push([x1 - marco, yb - 40], [x1 - marco, yb]);
  poligono(s, tejado);
  s.fill();
  s.fillRect(x0 + 64, yb - 74 - 30, 9, 24); // la chimenea
  const ventanitas: [number, number][] = [[x0 + 32, yb - 30], [x0 + 70, yb - 50], [mx + 22, yb - 36], [mx + 59, yb - 64], [mx + 98, yb - 26]];
  calar(s, () => {
    for (const [vx, vy] of ventanitas) s.fillRect(vx - 5, vy - 6, 10, 12);
  });
  c.fillStyle = 'rgba(255,214,60,0.9)';
  for (const [vx, vy] of ventanitas) c.fillRect(vx - 7, vy - 8, 14, 16);

  // la maceta del alféizar con su tulipán rojo
  const px = x0 + 28;
  poligono(s, [[px - 18, y1 - 34], [px + 18, y1 - 34], [px + 13, y1], [px - 13, y1]]);
  s.fill();
  s.fillRect(px - 21, y1 - 38, 42, 8);
  s.lineWidth = 4;
  s.strokeStyle = '#000';
  s.beginPath();
  s.moveTo(px, y1 - 36);
  s.quadraticCurveTo(px - 4, y1 - 70, px + 2, y1 - 96);
  s.stroke();
  lente(s, [px - 2, y1 - 52], [px - 22, y1 - 78], 6);
  s.fill();
  // el tulipán: tres pétalos de cartón con el centro calado y papel rojo
  const tul: P[] = [[px - 16, y1 - 128], [px - 7, y1 - 112], [px + 2, y1 - 132], [px + 11, y1 - 112], [px + 20, y1 - 128], [px + 16, y1 - 100], [px + 2, y1 - 92], [px - 12, y1 - 100]];
  poligono(s, tul);
  s.fill();
  calar(s, () => {
    poligono(s, [[px - 9, y1 - 114], [px + 2, y1 - 120], [px + 13, y1 - 114], [px + 10, y1 - 102], [px - 6, y1 - 102]]);
    s.fill();
  });
  c.fillStyle = 'rgba(232,30,40,0.9)';
  poligono(c, [[px - 13, y1 - 118], [px + 2, y1 - 126], [px + 17, y1 - 118], [px + 13, y1 - 98], [px - 9, y1 - 98]]);
  c.fill();
};

// ---------------------------------------------------------------- la planta de debajo de la mesa: maceta calada y hojas verdes
const planta = (s: Ctx, c: Ctx) => {
  const cx = 414, top = 1484;
  s.fillStyle = '#000';
  poligono(s, [[cx - 62, top + 18], [cx + 62, top + 18], [cx + 44, SUELO_Y + 2], [cx - 44, SUELO_Y + 2]]);
  s.fill();
  s.fillRect(cx - 70, top, 140, 22);
  // la cenefa de la maceta: un zigzag calado
  calar(s, () => {
    s.lineWidth = 4.5;
    s.lineJoin = 'round';
    s.beginPath();
    for (let i = 0; i <= 10; i++) {
      const xx = cx - 46 + i * 9.2;
      const yy = 1540 + (i % 2 ? -9 : 9);
      if (i) s.lineTo(xx, yy); else s.moveTo(xx, yy);
    }
    s.stroke();
    s.beginPath();
    s.arc(cx, 1576, 6, 0, Math.PI * 2);
    s.fill();
  });
  // las hojas: la hoja entera en negro, el hueco de dentro calado (con su nervio) y papel verde detrás
  const hojas: [number, number][] = [ // ángulo (grados, 0 = derecha) y largo
    [-168, 150], [-142, 196], [-118, 170], [-96, 206], [-74, 182], [-52, 200], [-28, 156], [-110, 120], [-66, 128],
  ];
  const base: P = [cx, top + 4];
  for (const [ang, l] of hojas) {
    const a = (ang * Math.PI) / 180;
    // el tallo se curva un poco y la hoja sale de su punta
    const t0: P = [base[0] + Math.cos(a) * l * 0.32, base[1] + Math.sin(a) * l * 0.32 + 6];
    const t1: P = [base[0] + Math.cos(a) * l, base[1] + Math.sin(a) * l];
    s.lineWidth = 5;
    s.strokeStyle = '#000';
    s.beginPath();
    s.moveTo(base[0], base[1]);
    s.lineTo(t0[0], t0[1]);
    s.stroke();
    lente(s, t0, t1, l * 0.17, l * 0.03);
    s.fill();
    const i0: P = [t0[0] + (t1[0] - t0[0]) * 0.12, t0[1] + (t1[1] - t0[1]) * 0.12];
    const i1: P = [t0[0] + (t1[0] - t0[0]) * 0.9, t0[1] + (t1[1] - t0[1]) * 0.9];
    calar(s, () => {
      lente(s, i0, i1, l * 0.12, l * 0.025);
      s.fill();
    });
    // el nervio, otra vez en negro
    s.lineWidth = 3;
    s.beginPath();
    s.moveTo(i0[0], i0[1]);
    s.lineTo(i1[0], i1[1]);
    s.stroke();
    for (const k of [0.3, 0.5, 0.7]) {
      const q: P = [t0[0] + (t1[0] - t0[0]) * k, t0[1] + (t1[1] - t0[1]) * k];
      const d: P = [(t1[0] - t0[0]) / l, (t1[1] - t0[1]) / l];
      const n: P = [-d[1], d[0]];
      s.lineWidth = 2.2;
      s.beginPath();
      s.moveTo(q[0] + n[0] * l * 0.11 + d[0] * 10, q[1] + n[1] * l * 0.11 + d[1] * 10);
      s.lineTo(q[0], q[1]);
      s.lineTo(q[0] - n[0] * l * 0.11 + d[0] * 10, q[1] - n[1] * l * 0.11 + d[1] * 10);
      s.stroke();
    }
    c.fillStyle = 'rgba(40,190,80,0.88)';
    lente(c, t0, t1, l * 0.17, l * 0.03);
    c.fill();
  }
};

export const decorado = () => {
  if (DECO) return DECO;
  const sombra = lienzo(), color = lienzo();
  const s = ctx(sombra), c = ctx(color);
  ventana(s, c);
  planta(s, c);
  mesa(s);
  suelo(s);
  // lo de sombra, un pelo desenfocado (está casi en la pantalla, apenas detrás del gato)
  const blanda = lienzo();
  const b = ctx(blanda);
  b.filter = 'blur(1.3px)';
  b.drawImage(sombra, 0, 0);
  DECO = {sombra: blanda, color};
  return DECO;
};

// ---------------------------------------------------------------- el farolillo de papel rojo, que se mece colgado de arriba
const COLGADO: P = [236, 236];
export const farol = (s: Ctx, c: Ctx, t: number) => {
  const a = 0.055 * Math.sin((2 * Math.PI * t) / 2.6) + 0.02 * Math.sin((2 * Math.PI * t) / 1.15 + 1);
  const dibuja = (x: Ctx, color: boolean) => {
    x.save();
    x.translate(COLGADO[0], COLGADO[1]);
    x.rotate(a);
    const cy = 164, rx = 60, ry = 72;
    if (color) {
      const g = x.createRadialGradient(-14, cy - 10, 4, 0, cy, rx * 1.1);
      g.addColorStop(0, 'rgba(255,120,40,0.9)');
      g.addColorStop(0.6, 'rgba(232,34,30,0.9)');
      g.addColorStop(1, 'rgba(170,16,24,0.92)');
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
      return;
    }
    x.fillStyle = '#000';
    x.strokeStyle = '#000';
    // el cordel, la tapa de arriba, las varillas, la tapa de abajo y la borla
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(0, cy - ry - 10);
    x.stroke();
    x.fillRect(-30, cy - ry - 14, 60, 16);
    x.fillRect(-26, cy + ry - 4, 52, 14);
    x.lineWidth = 6;
    x.beginPath();
    x.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
    x.stroke();
    x.lineWidth = 3.4;
    for (const k of [0.33, 0.7]) {
      for (const lado of [-1, 1]) {
        x.beginPath();
        x.ellipse(0, cy, rx * k, ry, 0, lado < 0 ? Math.PI / 2 : -Math.PI / 2, lado < 0 ? Math.PI * 1.5 : Math.PI / 2);
        x.stroke();
      }
    }
    x.beginPath();
    x.moveTo(0, cy - ry);
    x.lineTo(0, cy + ry);
    x.stroke();
    // una franja calada en medio, con rombos
    x.lineWidth = 3;
    for (const yy of [cy - 18, cy + 18]) {
      x.beginPath();
      x.moveTo(-rx * 0.97, yy);
      x.lineTo(rx * 0.97, yy);
      x.stroke();
    }
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, cy + ry + 10);
    x.lineTo(0, cy + ry + 26);
    x.stroke();
    poligono(x, [[-7, cy + ry + 24], [7, cy + ry + 24], [12, cy + ry + 72], [-12, cy + ry + 72]]);
    x.fill();
    x.restore();
  };
  // el farol está un poco más lejos de la pantalla que el resto: algo más blando
  s.save();
  s.filter = 'blur(1.8px)';
  dibuja(s, false);
  s.restore();
  dibuja(c, true);
};
