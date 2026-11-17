import {ruido, rng} from '../../../comun/curvas';
import {ANTORCHA, type Luz} from './roca';

// LA ANTORCHA: lo único de la cueva que no está pintado. Un palo metido en una grieta de la pared, con su
// cabeza de fibras quemadas y la llama, y la luz que da: parpadea suave (fluida, sin pasos) y se mece un poco, y con ella se mueve el
// relieve de toda la pared. luzDe(t) es la luz para roca.iluminar(); pintarAntorcha() pinta el palo, la llama y su resplandor encima
// del cuadro ya alumbrado.

// lo que parpadea la llama (1 de media)
export const parpadeo = (t: number) => 1 + 0.075 * ruido(t * 6.1, 11) + 0.045 * ruido(t * 13.3, 12) + 0.02 * Math.sin(t * 31);

export const luzDe = (t: number, golpe = 0): Luz => {
  const fl = parpadeo(t);
  return {
    x: ANTORCHA[0] - 8 + 7 * ruido(t * 2.2, 13),
    y: ANTORCHA[1] - 46 + 9 * ruido(t * 2.7, 14),
    z: 200,
    I: 1.2 * fl * (1 + 0.1 * golpe),
    R: 590,
    tr: 1.02, tg: 0.75, tb: 0.5,
    amb: 0.24,
    abajo: 0.58,
  };
};

const PALO_ARRIBA: [number, number] = [ANTORCHA[0] + 2, ANTORCHA[1] + 30];
const PALO_ABAJO: [number, number] = [ANTORCHA[0] + 50, ANTORCHA[1] + 236];

export const pintarAntorcha = (c: CanvasRenderingContext2D, t: number) => {
  const fl = parpadeo(t);
  const [ax, ay] = ANTORCHA;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  // la sombra del palo en la pared (la llama está encima: cae hacia abajo y un poco a la izquierda)
  c.globalCompositeOperation = 'multiply';
  c.filter = 'blur(7px)';
  c.strokeStyle = 'rgba(40,22,12,0.75)';
  c.lineCap = 'round';
  c.lineWidth = 20;
  c.beginPath();
  c.moveTo(PALO_ARRIBA[0] - 6, PALO_ARRIBA[1] + 40);
  c.lineTo(PALO_ABAJO[0] - 26, PALO_ABAJO[1] + 46);
  c.stroke();
  c.filter = 'none';
  c.globalCompositeOperation = 'source-over';
  // la grieta donde va metido
  c.fillStyle = '#1a0f0a';
  c.beginPath();
  c.ellipse(PALO_ABAJO[0] + 4, PALO_ABAJO[1] + 6, 22, 9, 0.5, 0, Math.PI * 2);
  c.fill();
  // el palo: madera oscura, más clara arriba donde le da la llama
  const ang = Math.atan2(PALO_ABAJO[1] - PALO_ARRIBA[1], PALO_ABAJO[0] - PALO_ARRIBA[0]);
  const largo = Math.hypot(PALO_ABAJO[0] - PALO_ARRIBA[0], PALO_ABAJO[1] - PALO_ARRIBA[1]);
  c.translate(PALO_ARRIBA[0], PALO_ARRIBA[1]);
  c.rotate(ang);
  const gr = c.createLinearGradient(0, 0, largo, 0);
  gr.addColorStop(0, '#7a4a26');
  gr.addColorStop(0.35, '#4a2c17');
  gr.addColorStop(1, '#24150c');
  c.fillStyle = gr;
  c.beginPath();
  c.moveTo(0, -16);
  c.lineTo(largo, -11);
  c.lineTo(largo, 11);
  c.lineTo(0, 16);
  c.closePath();
  c.fill();
  // las vetas de la madera
  c.strokeStyle = 'rgba(20,10,5,0.55)';
  c.lineWidth = 2;
  for (let k = 0; k < 4; k++) {
    c.beginPath();
    c.moveTo(20 + k * 30, -6 + k * 3);
    c.lineTo(120 + k * 50, -5 + k * 3.4);
    c.stroke();
  }
  // el brillo de la llama en el lado de arriba del palo
  const br = c.createLinearGradient(0, 0, largo * 0.6, 0);
  br.addColorStop(0, `rgba(255,170,80,${0.55 * fl})`);
  br.addColorStop(1, 'rgba(255,170,80,0)');
  c.fillStyle = br;
  c.fillRect(0, -16, largo * 0.6, 8);
  c.setTransform(1, 0, 0, 1, 0, 0);
  // la cabeza: fibras atadas y quemadas, con brasas
  c.save();
  c.translate(ax, ay + 14);
  c.rotate(ang - Math.PI / 2);
  c.fillStyle = '#2a1a10';
  c.beginPath();
  c.ellipse(0, 0, 27, 40, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#120a06';
  c.lineWidth = 4;
  for (const yy of [-10, 6, 20]) {
    c.beginPath();
    c.moveTo(-20, yy);
    c.quadraticCurveTo(0, yy + 6, 20, yy);
    c.stroke();
  }
  const r = rng(5);
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 14; k++) {
    const bx = (r() - 0.5) * 32, by = -26 + r() * 30;
    const v = 0.5 + 0.5 * Math.sin(t * (5 + r() * 9) + k * 1.7);
    c.fillStyle = `rgba(255,${(90 + 80 * v) | 0},30,${0.35 + 0.5 * v})`;
    c.beginPath();
    c.arc(bx, by, 2 + r() * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  // el resplandor alrededor de la llama
  c.globalCompositeOperation = 'lighter';
  const fx = ax - 2 + 4 * ruido(t * 3.1, 21), fy = ay - 40;
  const halo = c.createRadialGradient(fx, fy, 0, fx, fy, 300 * (0.94 + 0.08 * fl));
  halo.addColorStop(0, `rgba(255,170,80,${0.42 * fl})`);
  halo.addColorStop(0.25, `rgba(255,120,40,${0.16 * fl})`);
  halo.addColorStop(1, 'rgba(255,90,20,0)');
  c.fillStyle = halo;
  c.fillRect(fx - 320, fy - 320, 640, 640);

  // la llama: lenguas que suben y se mecen, de fuera (naranja) a dentro (casi blanca)
  const lengua = (k: number, alto: number, ancho: number, col: string) => {
    const s = t * 2.3 + k * 1.9;
    const sway = 14 * ruido(s, 30 + k) + 8 * Math.sin(t * 7 + k);
    const h = alto * (0.86 + 0.2 * ruido(t * 4.5 + k, 40 + k)) * fl;
    const bx = ax + (k - 1.5) * 9 * (ancho / 30);
    const by = ay - 4;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(bx - ancho, by);
    c.bezierCurveTo(bx - ancho * 1.05, by - h * 0.45, bx + sway * 0.4 - ancho * 0.35, by - h * 0.7, bx + sway, by - h);
    c.bezierCurveTo(bx + sway * 0.4 + ancho * 0.35, by - h * 0.7, bx + ancho * 1.05, by - h * 0.45, bx + ancho, by);
    c.quadraticCurveTo(bx, by + ancho * 0.7, bx - ancho, by);
    c.fill();
  };
  c.filter = 'blur(4px)';
  for (let k = 0; k < 5; k++) lengua(k - 0.5, 170 - Math.abs(k - 2) * 30, 30, 'rgba(255,90,20,0.5)');
  c.filter = 'blur(2px)';
  for (let k = 0; k < 4; k++) lengua(k, 128 - Math.abs(k - 1.5) * 22, 22, 'rgba(255,160,45,0.72)');
  c.filter = 'blur(1px)';
  lengua(1.5, 80, 15, 'rgba(255,236,170,0.92)');
  c.filter = 'none';
  // las chispas que suben
  const rs = rng(9);
  for (let k = 0; k < 9; k++) {
    const per = 0.8 + rs() * 0.9;
    const fase = rs() * per;
    const u = ((t + fase) % per) / per;
    const sx = ax + (rs() - 0.5) * 40 + 30 * Math.sin(u * 5 + k) * u;
    const sy = ay - 60 - u * (180 + rs() * 120);
    c.fillStyle = `rgba(255,${(150 + 80 * (1 - u)) | 0},60,${(1 - u) * 0.9})`;
    c.beginPath();
    c.arc(sx, sy, 2.6 * (1 - u * 0.6), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
};
