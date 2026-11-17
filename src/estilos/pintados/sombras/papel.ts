import {rng} from '../../../comun/curvas';
import {H, PANT, W, ctx, ctxCpu, lienzo} from './lienzos';

// EL PAPEL DE LA PANTALLA: se pinta una vez y se multiplica encima de la luz y de las sombras. Es papel de
// fibra, de varios pliegos pegados: nubes suaves (donde el papel es más grueso pasa menos luz), el grano fino, las fibras largas,
// las juntas de los pliegos (doble papel), dos manchas de agua viejas, unas arrugas y el borde, más oscuro, donde se pega al marco.

let PAPEL: HTMLCanvasElement | null = null;

// una rejilla de grises al azar, agrandada y difuminada: nubes del papel
const nubes = (x: CanvasRenderingContext2D, nw: number, nh: number, semilla: number, hondo: number, alfa: number, difu: number) => {
  const n = lienzo(nw, nh);
  const nx = ctxCpu(n);
  const img = nx.createImageData(nw, nh);
  const r = rng(semilla);
  for (let i = 0; i < nw * nh; i++) {
    const v = 255 - r() * hondo;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v * 0.975;
    img.data[i * 4 + 2] = v * 0.93;
    img.data[i * 4 + 3] = 255;
  }
  nx.putImageData(img, 0, 0);
  x.save();
  x.globalCompositeOperation = 'multiply';
  x.globalAlpha = alfa;
  x.imageSmoothingEnabled = true;
  x.filter = `blur(${difu}px)`;
  x.drawImage(n, -40, -40, W + 80, H + 80);
  x.restore();
};

export const papel = () => {
  if (PAPEL) return PAPEL;
  const c = lienzo();
  const x = ctx(c);
  x.fillStyle = '#fff';
  x.fillRect(0, 0, W, H);

  // 1 · nubes: grandes y pequeñas
  nubes(x, 40, 70, 301, 70, 0.55, 22);
  nubes(x, 160, 284, 302, 50, 0.4, 4);

  // 2 · el grano fino, en una baldosa
  const tb = lienzo(256, 256);
  const tx = ctxCpu(tb);
  const img = tx.createImageData(256, 256);
  const r = rng(303);
  for (let i = 0; i < 256 * 256; i++) {
    const v = 255 - r() * r() * 70;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v * 0.98;
    img.data[i * 4 + 2] = v * 0.95;
    img.data[i * 4 + 3] = 255;
  }
  tx.putImageData(img, 0, 0);
  x.save();
  x.globalCompositeOperation = 'multiply';
  x.globalAlpha = 0.7;
  x.fillStyle = x.createPattern(tb, 'repeat')!;
  x.fillRect(0, 0, W, H);
  x.restore();

  // 3 · las fibras: muchas cortas y unas pocas largas, curvas y finas
  x.save();
  x.globalCompositeOperation = 'multiply';
  x.lineCap = 'round';
  const rf = rng(304);
  for (let i = 0; i < 2600; i++) {
    const largas = i < 260;
    const x0 = PANT.x0 + rf() * (PANT.x1 - PANT.x0), y0 = PANT.y0 + rf() * (PANT.y1 - PANT.y0);
    const a = rf() * Math.PI * 2, l = largas ? 90 + rf() * 170 : 12 + rf() * 70;
    const cu = (rf() - 0.5) * l * 0.5;
    const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l;
    const mx = (x0 + x1) / 2 - Math.sin(a) * cu, my = (y0 + y1) / 2 + Math.cos(a) * cu;
    x.strokeStyle = `rgba(${120 + rf() * 40},${70 + rf() * 30},${30 + rf() * 20},${largas ? 0.05 + rf() * 0.07 : 0.06 + rf() * 0.12})`;
    x.lineWidth = 0.6 + rf() * (largas ? 1.6 : 1.2);
    x.beginPath();
    x.moveTo(x0, y0);
    x.quadraticCurveTo(mx, my, x1, y1);
    x.stroke();
  }
  x.restore();

  // 4 · las juntas de los pliegos: una franja de doble papel y sus dos bordes
  x.save();
  x.globalCompositeOperation = 'multiply';
  for (const sx of [302, 540, 778]) {
    const g = x.createLinearGradient(sx - 6, 0, sx + 6, 0);
    g.addColorStop(0, 'rgba(150,95,50,0.2)');
    g.addColorStop(0.5, 'rgba(160,105,60,0.1)');
    g.addColorStop(1, 'rgba(150,95,50,0.2)');
    x.fillStyle = g;
    x.fillRect(sx - 6, PANT.y0, 12, PANT.y1 - PANT.y0);
  }
  x.restore();

  // 5 · dos manchas de agua viejas: un cerco que se seca
  x.save();
  x.globalCompositeOperation = 'multiply';
  x.filter = 'blur(3px)';
  for (const [cx, cy, rx, ry, a] of [[196, 410, 66, 52, 0.4], [290, 1460, 90, 64, -0.3], [452, 336, 70, 44, 0.2]]) {
    x.strokeStyle = 'rgba(170,110,55,0.22)';
    x.lineWidth = 5;
    x.beginPath();
    x.ellipse(cx, cy, rx, ry, a, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = 'rgba(200,150,90,0.07)';
    x.fill();
  }
  x.restore();

  // 6 · arrugas: líneas largas, muy suaves
  x.save();
  x.globalCompositeOperation = 'multiply';
  x.filter = 'blur(1.5px)';
  x.lineCap = 'round';
  const ra = rng(305);
  for (let i = 0; i < 7; i++) {
    const x0 = PANT.x0 + ra() * 900, y0 = PANT.y0 + ra() * 1400;
    const a = -0.6 + ra() * 1.2 + (ra() < 0.5 ? Math.PI / 2 : 0);
    const l = 160 + ra() * 260;
    x.strokeStyle = 'rgba(140,90,45,0.13)';
    x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(x0, y0);
    x.lineTo(x0 + Math.cos(a) * l * 0.5 + (ra() - 0.5) * 20, y0 + Math.sin(a) * l * 0.5 + (ra() - 0.5) * 20);
    x.lineTo(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l);
    x.stroke();
  }
  x.restore();

  // 7 · el borde, donde el papel se pega al marco: pasa menos luz
  x.save();
  x.globalCompositeOperation = 'multiply';
  const bordes: [number, number, number, number, number, number, number, number][] = [
    [PANT.x0, 0, PANT.x0 + 60, 0, PANT.x0, PANT.y0, 60, PANT.y1 - PANT.y0],
    [PANT.x1, 0, PANT.x1 - 60, 0, PANT.x1 - 60, PANT.y0, 60, PANT.y1 - PANT.y0],
    [0, PANT.y0, 0, PANT.y0 + 60, PANT.x0, PANT.y0, PANT.x1 - PANT.x0, 60],
    [0, PANT.y1, 0, PANT.y1 - 60, PANT.x0, PANT.y1 - 60, PANT.x1 - PANT.x0, 60],
  ];
  for (const [ax, ay, bx, by, rx, ry, rw, rh] of bordes) {
    const g = x.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, 'rgba(120,55,20,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(rx, ry, rw, rh);
  }
  x.restore();

  PAPEL = c;
  return c;
};
