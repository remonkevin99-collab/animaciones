import {clamp, mix, rng} from '../../../comun/curvas';
import {BORDE, MESA_G, MESA_Y, SUELO} from '../../gato/escena';

// LA COCINA DE LA CÁMARA DE SEGURIDAD. Lo que ve la cámara antes de la lente y del sensor: la cocina de
// noche pintada en grises, como la ve el infrarrojo (lo blanco y las plantas devuelven mucha luz, el agua y el café nada). Se pinta
// en las medidas de la escena (1080 × 1920), con un margen alrededor porque la lente y la sacudida miran un poco fuera del cuadro,
// y a media resolución (la de la cámara: 540 × 960). La cámara está alta, en una esquina del techo: por eso se ve la cara de arriba
// de la mesa, de la encimera y de los cuencos, y el suelo de baldosas se va al fondo con su punto de fuga muy arriba.
// Tres capas que se hacen UNA vez: el decorado (lo que refleja), la luz del infrarrojo (el foco de la cámara: fuerte en el centro y
// que se apaga hacia los bordes y hacia la pared del fondo) y lo que brilla solo (la farola de la calle, la ventana del vecino y el
// rectángulo de luz que la farola deja en el suelo).

export type P = [number, number];
export const S = 0.5; // la resolución de la cámara: medio cuadro
export const MX = 180; // el margen del mundo, a cada lado (la lente mira hasta un 14 % fuera del cuadro en las esquinas)
export const MY = 160;
export const MW = Math.round((1080 + 2 * MX) * S);
export const MH = Math.round((1920 + 2 * MY) * S);

export const gris = (v: number, a = 1) => {
  const n = Math.round(clamp(v) * 255);
  return a >= 1 ? `rgb(${n},${n},${n})` : `rgba(${n},${n},${n},${clamp(a).toFixed(3)})`;
};
export const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
// pinta en las medidas de la escena sobre un lienzo del mundo
export const enMedidas = (c: CanvasRenderingContext2D) => c.setTransform(S, 0, 0, S, MX * S, MY * S);

// ---------------------------------------------------------------- dónde está cada cosa
export const PARED = 1170; // donde la pared del fondo se junta con el suelo
const VP: P = [560, -1100]; // el punto de fuga del suelo: muy arriba (la cámara mira desde el techo)
const DZ = 0.0381; // lo que avanza cada fila de baldosas
const BALDOSA = 95; // su ancho en la línea de la pared
const NEVERA = {x0: 862, x1: 1280, y0: 64, y1: 1228};
const ENCIMERA = {x0: 590, x1: 862, y0: 772, y1: 828};
const VENTANA = {x0: 560, x1: 830, y0: 108, y1: 440};
const ARMARIOS = {x0: -200, x1: 470, y0: -180, y1: 246};
const MESA_ATRAS = 928; // el borde de atrás del tablero (se ve su cara de arriba)
const MESA_X0 = 22;

const L = (x0: number, y0: number, x1: number, y1: number) => new Path2D(`M ${x0} ${y0} L ${x1} ${y1}`);
const poli = (pts: P[]) => {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
};
const rect = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, v: number) => {
  c.fillStyle = gris(v);
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
};
const traza = (c: CanvasRenderingContext2D, p: Path2D, v: number, w: number, a = 1) => {
  c.strokeStyle = gris(v, a);
  c.lineWidth = w;
  c.stroke(p);
};

// el suelo en perspectiva: la fila i y la columna k de baldosas
const filaY = (i: number) => VP[1] + (PARED - VP[1]) / (1 - DZ * i);
const columnaX = (k: number, y: number) => VP[0] + (VP[0] + BALDOSA * k - 6 - VP[0]) * ((y - VP[1]) / (PARED - VP[1]));

const pintarSuelo = (c: CanvasRenderingContext2D) => {
  const r = rng(12);
  for (let i = 0; filaY(i) < 1920 + MY + 10; i++) {
    const ya = filaY(i), yb = filaY(i + 1);
    for (let k = -16; k <= 16; k++) {
      const q = poli([[columnaX(k, ya), ya], [columnaX(k + 1, ya), ya], [columnaX(k + 1, yb), yb], [columnaX(k, yb), yb]]);
      // ajedrez: las claras con su veta, las oscuras más lisas
      c.fillStyle = gris((k + i) % 2 === 0 ? 0.38 + r() * 0.04 : 0.23 + r() * 0.03);
      c.fill(q);
    }
  }
  // las juntas
  c.lineCap = 'butt';
  for (let i = 0; filaY(i) < 1920 + MY + 10; i++) traza(c, L(-MX, filaY(i), 1080 + MX, filaY(i)), 0.17, 2.5 + i * 0.5);
  for (let k = -16; k <= 17; k++) traza(c, L(columnaX(k, PARED), PARED, columnaX(k, 1990), 1990), 0.17, 3);
};

const pintarArmarios = (c: CanvasRenderingContext2D) => {
  const {x0, x1, y0, y1} = ARMARIOS;
  rect(c, x0, y0, x1, y1, 0.5);
  const puertas = [x0, 70, 270, x1];
  for (let i = 0; i < 3; i++) {
    const a = puertas[i] + 7, b = puertas[i + 1] - 7;
    rect(c, a, y0, b, y1 - 8, 0.58);
    // el cuarterón de la puerta: su bisel claro arriba a la izquierda y la sombra abajo a la derecha
    rect(c, a + 22, y0 + 40, b - 22, y1 - 40, 0.5);
    traza(c, poli([[a + 22, y1 - 40], [a + 22, y0 + 40], [b - 22, y0 + 40]]), 0.7, 4);
    traza(c, poli([[b - 22, y0 + 40], [b - 22, y1 - 40], [a + 22, y1 - 40]]), 0.34, 4);
    // el tirador, de metal (brilla con el infrarrojo)
    const tx = i === 1 ? a + 14 : b - 14;
    c.lineCap = 'round';
    traza(c, L(tx, y1 - 92, tx, y1 - 36), 0.18, 11);
    traza(c, L(tx - 1, y1 - 90, tx - 1, y1 - 40), 0.95, 4);
  }
  for (const x of puertas.slice(1, -1)) traza(c, L(x, y0, x, y1), 0.16, 6);
  rect(c, x0, y1 - 8, x1, y1, 0.3);
  // la sombra que dejan en la pared
  const g = c.createLinearGradient(0, y1, 0, y1 + 70);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(x0, y1, x1 - x0, 70);
};

// la barra de los cacharros, debajo de los armarios: el cucharón, la espumadera, las varillas y la espátula
const pintarCacharros = (c: CanvasRenderingContext2D) => {
  c.lineCap = 'round';
  traza(c, L(60, 292, 410, 292), 0.2, 9);
  traza(c, L(60, 290, 410, 290), 0.9, 3);
  const cuelga = (x: number, largo: number, cabeza: (y: number) => void) => {
    traza(c, L(x, 292, x, 292 + largo), 0.22, 8);
    traza(c, L(x - 2, 296, x - 2, 288 + largo), 0.85, 2.5);
    cabeza(292 + largo);
  };
  cuelga(110, 96, (y) => {
    c.beginPath();
    c.ellipse(110, y + 22, 27, 24, 0, 0, Math.PI * 2);
    c.fillStyle = gris(0.24);
    c.fill();
    c.beginPath();
    c.ellipse(103, y + 16, 12, 9, -0.5, 0, Math.PI * 2);
    c.fillStyle = gris(0.9);
    c.fill();
  });
  cuelga(190, 80, (y) => {
    const p = new Path2D();
    p.roundRect(170, y, 40, 54, 10);
    c.fillStyle = gris(0.26);
    c.fill(p);
    for (let j = 0; j < 3; j++) traza(c, L(180 + j * 10, y + 10, 180 + j * 10, y + 44), 0.1, 3);
    traza(c, L(174, y + 6, 174, y + 46), 0.85, 2.5);
  });
  cuelga(265, 70, (y) => {
    for (let j = 0; j < 3; j++) {
      c.beginPath();
      c.ellipse(265, y + 40, 8 + j * 9, 42, 0, 0, Math.PI * 2);
      c.strokeStyle = gris(j === 2 ? 0.92 : 0.62);
      c.lineWidth = 2.5;
      c.stroke();
    }
  });
  cuelga(345, 92, (y) => {
    const p = new Path2D();
    p.roundRect(327, y, 36, 48, 6);
    c.fillStyle = gris(0.3);
    c.fill(p);
    traza(c, L(331, y + 5, 331, y + 42), 0.9, 2.5);
  });
};

const pintarVentana = (c: CanvasRenderingContext2D) => {
  const {x0, x1, y0, y1} = VENTANA;
  const MED = (x0 + x1) / 2, TRAV = 300;
  // fuera: la calle de noche (la farola y su halo van aparte, en lo que brilla solo)
  const cielo = c.createLinearGradient(0, y0, 0, y1);
  cielo.addColorStop(0, gris(0.1));
  cielo.addColorStop(1, gris(0.05));
  c.fillStyle = cielo;
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
  // la casa de enfrente: el tejado y su ventana encendida
  c.fillStyle = gris(0.02);
  c.fill(poli([[x0, 380], [640, 352], [700, 372], [x1, 360], [x1, y1], [x0, y1]]));
  // la farola: el poste y el brazo (la cabeza brilla aparte)
  c.lineCap = 'round';
  traza(c, L(772, y1, 772, 334), 0.04, 9);
  traza(c, L(772, 336, 742, 326), 0.04, 7);
  // las ramas del árbol, por delante de la farola
  const r = rng(5);
  const rama = (x: number, y: number, a: number, l: number, w: number, n: number) => {
    if (n <= 0 || l < 8) return;
    const xb = x + Math.cos(a) * l, yb = y + Math.sin(a) * l;
    traza(c, L(x, y, xb, yb), 0.02, w);
    rama(xb, yb, a - 0.35 - r() * 0.3, l * 0.72, w * 0.68, n - 1);
    rama(xb, yb, a + 0.3 + r() * 0.3, l * 0.66, w * 0.66, n - 1);
  };
  rama(588, y1, -1.25, 70, 11, 5);
  // la persiana, bajada hasta la mitad: tablillas claras con rendijas por donde se ve la calle
  for (let y = y0; y < TRAV - 4; y += 21) {
    rect(c, x0, y, x1, y + 15, 0.6);
    rect(c, x0, y + 12, x1, y + 15, 0.42);
  }
  rect(c, x0, TRAV - 16, x1, TRAV - 2, 0.66); // la barra de abajo de la persiana
  traza(c, L(MED - 70, TRAV - 2, MED - 70, TRAV + 38), 0.55, 3); // el cordón
  // el marco, el parteluz y el travesaño
  c.lineJoin = 'miter';
  traza(c, poli([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), 0.68, 18);
  traza(c, L(MED, TRAV, MED, y1), 0.66, 10);
  traza(c, L(x0, TRAV, x1, TRAV), 0.66, 10);
  // el alféizar (se ve su cara de arriba) y la maceta con su planta, que con el infrarrojo sale casi blanca
  rect(c, x0 - 16, y1, x1 + 16, y1 + 20, 0.72);
  rect(c, x0 - 16, y1 + 16, x1 + 16, y1 + 20, 0.36);
  c.fillStyle = gris(0.4);
  c.fill(poli([[766, y1 - 46], [814, y1 - 46], [806, y1 + 2], [774, y1 + 2]]));
  rect(c, 762, y1 - 52, 818, y1 - 42, 0.55);
  const rh = rng(9);
  for (let j = 0; j < 9; j++) {
    const a = -Math.PI / 2 + (j - 4) * 0.32 + (rh() - 0.5) * 0.2;
    const l = 46 + rh() * 26;
    const cx = 790 + Math.cos(a) * l * 0.55, cy = y1 - 50 + Math.sin(a) * l * 0.55;
    c.beginPath();
    c.ellipse(cx, cy, l * 0.5, 9 + rh() * 4, a, 0, Math.PI * 2);
    c.fillStyle = gris(0.7 + rh() * 0.1);
    c.fill();
    traza(c, L(790, y1 - 48, cx, cy), 0.6, 2);
  }
};

const pintarEncimera = (c: CanvasRenderingContext2D) => {
  const {x0, x1, y0, y1} = ENCIMERA;
  // el alicatado de la pared: azulejos alargados, a rompejuntas, con poco contraste (por delante pasa la cabeza del gato)
  rect(c, x0, VENTANA.y1 + 20, x1, y0, 0.42);
  for (let f = 0, y = VENTANA.y1 + 20; y < y0; f++, y += 34) {
    traza(c, L(x0, y, x1, y), 0.33, 3);
    for (let x = x0 + (f % 2 ? 34 : 0); x < x1; x += 68) traza(c, L(x, y, x, Math.min(y0, y + 34)), 0.33, 3);
  }
  // la encimera: su cara de arriba y el canto de delante
  rect(c, x0 - 6, y0, x1, y1 - 14, 0.6);
  rect(c, x0 - 6, y1 - 14, x1, y1, 0.74);
  // los muebles de abajo: dos puertas con su tirador
  rect(c, x0, y1, x1, PARED - 22, 0.34);
  const mitad = (x0 + x1) / 2;
  for (const [a, b] of [[x0 + 8, mitad - 4], [mitad + 4, x1 - 8]]) {
    rect(c, a, y1 + 10, b, PARED - 34, 0.4);
    rect(c, a + 18, y1 + 34, b - 18, PARED - 58, 0.36);
    traza(c, poli([[a + 18, PARED - 58], [a + 18, y1 + 34], [b - 18, y1 + 34]]), 0.5, 3);
  }
  c.lineCap = 'round';
  for (const x of [mitad - 22, mitad + 22]) {
    traza(c, L(x, y1 + 30, x, y1 + 86), 0.15, 10);
    traza(c, L(x - 1, y1 + 32, x - 1, y1 + 84), 0.92, 3.5);
  }
  rect(c, x0, PARED - 22, x1, PARED, 0.12); // el zócalo, metido
};

const pintarNevera = (c: CanvasRenderingContext2D) => {
  const {x0, x1, y0, y1} = NEVERA;
  const g = c.createLinearGradient(x0, 0, x0 + 260, 0);
  g.addColorStop(0, gris(0.78));
  g.addColorStop(1, gris(0.64));
  c.fillStyle = g;
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
  rect(c, x0 - 8, y0, x0, y1, 0.14); // la rendija con la encimera
  rect(c, x0, y0, x0 + 7, y1, 0.9); // el canto que da a la luz
  rect(c, x0, y0, x1, y0 + 10, 0.86);
  rect(c, x0, 428, x1, 436, 0.22); // la separación del congelador
  rect(c, x0, y1 - 46, x1, y1, 0.2); // la rejilla de abajo
  for (let x = x0 + 18; x < x1; x += 22) rect(c, x, y1 - 38, x + 10, y1 - 8, 0.1);
  // los tiradores
  c.lineCap = 'round';
  for (const [a, b] of [[300, 410], [460, 760]]) {
    traza(c, L(x0 + 26, a, x0 + 26, b), 0.26, 14);
    traza(c, L(x0 + 23, a + 4, x0 + 23, b - 4), 0.97, 3.5);
  }
  // en la puerta: un dibujo de niño (un gato, claro), una nota y unos imanes
  c.save();
  c.translate(985, 600);
  c.rotate(-0.05);
  rect(c, -62, -76, 62, 76, 0.93);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = gris(0.22);
  c.lineWidth = 6;
  c.beginPath();
  c.arc(0, 4, 32, 0, Math.PI * 2);
  c.moveTo(-26, -14);
  c.lineTo(-24, -46);
  c.lineTo(-8, -28);
  c.moveTo(26, -14);
  c.lineTo(24, -46);
  c.lineTo(8, -28);
  c.moveTo(-36, 50);
  c.lineTo(36, 50);
  c.stroke();
  c.fillStyle = gris(0.22);
  c.beginPath();
  c.arc(-12, 0, 5, 0, Math.PI * 2);
  c.arc(12, 0, 5, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.fillStyle = gris(0.16);
  c.beginPath();
  c.arc(985, 528, 9, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.translate(1010, 240);
  c.rotate(0.06);
  rect(c, -46, -50, 46, 50, 0.9);
  for (let j = 0; j < 5; j++) traza(c, L(-32, -26 + j * 14, 26 - (j % 2) * 18, -26 + j * 14), 0.45, 4);
  c.restore();
  for (const [x, y] of [[1010, 186], [940, 820], [1060, 860], [960, 980]] as P[]) {
    c.fillStyle = gris(0.18);
    c.beginPath();
    c.arc(x, y, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = gris(0.8);
    c.beginPath();
    c.arc(x - 4, y - 4, 3.5, 0, Math.PI * 2);
    c.fill();
  }
};

const pintarMesa = (c: CanvasRenderingContext2D) => {
  const yA = MESA_Y + MESA_G; // donde acaba el faldón
  // la sombra de la mesa en el suelo (el foco está arriba: debajo queda en penumbra)
  c.save();
  c.filter = 'blur(14px)';
  c.fillStyle = 'rgba(0,0,0,0.42)';
  c.fill(poli([[MESA_X0 + 30, PARED + 10], [BORDE - 26, PARED + 10], [BORDE + 6, SUELO + 6], [MESA_X0 + 4, SUELO + 6]]));
  c.restore();
  // las patas de atrás, más lejos y en sombra
  for (const x of [72, 652]) {
    c.fillStyle = gris(0.2);
    c.fill(poli([[x, yA], [x + 24, yA], [x + 22, 1488], [x + 2, 1488]]));
  }
  // las de delante, con su luz en el canto izquierdo, y su sombrita en el suelo
  for (const x of [30, 680]) {
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.ellipse(x + 18, SUELO + 2, 30, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = gris(0.36);
    c.fill(poli([[x, yA], [x + 32, yA], [x + 29, SUELO], [x + 3, SUELO]]));
    c.fillStyle = gris(0.52);
    c.fill(poli([[x, yA], [x + 8, yA], [x + 9, SUELO], [x + 3, SUELO]]));
  }
  // el tablero, visto desde arriba: su cara de arriba con la veta, el canto claro y el faldón
  const top = poli([[MESA_X0, MESA_Y], [BORDE, MESA_Y], [BORDE - 34, MESA_ATRAS], [MESA_X0 + 34, MESA_ATRAS]]);
  const g = c.createLinearGradient(0, MESA_ATRAS, 0, MESA_Y);
  g.addColorStop(0, gris(0.42));
  g.addColorStop(1, gris(0.56));
  c.fillStyle = g;
  c.fill(top);
  c.save();
  c.clip(top);
  const r = rng(3);
  for (let j = 0; j < 9; j++) {
    const k = (j + 0.5) / 9;
    const y = mix(MESA_ATRAS, MESA_Y, k);
    traza(c, L(MESA_X0, y + (r() - 0.5) * 6, BORDE, y + (r() - 0.5) * 6), 0.4, 2 + r() * 2, 0.8);
  }
  c.restore();
  traza(c, L(MESA_X0 + 34, MESA_ATRAS, BORDE - 34, MESA_ATRAS), 0.3, 3);
  rect(c, MESA_X0, MESA_Y, BORDE, yA, 0.34);
  rect(c, MESA_X0, MESA_Y - 2, BORDE, MESA_Y + 5, 0.76);
  rect(c, MESA_X0, yA - 4, BORDE, yA, 0.2);
};

// los cuencos del gato, debajo de la mesa: el de pienso y el del agua, de acero (el borde brilla), vistos desde arriba
const pintarCuencos = (c: CanvasRenderingContext2D) => {
  const cuenco = (cx: number, cy: number, dentro: number, pienso: boolean) => {
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.ellipse(cx + 6, cy + 14, 76, 30, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = gris(0.74);
    c.beginPath();
    c.ellipse(cx, cy, 72, 32, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = gris(dentro);
    c.beginPath();
    c.ellipse(cx, cy + 2, 54, 22, 0, 0, Math.PI * 2);
    c.fill();
    if (pienso) {
      const r = rng(17);
      for (let j = 0; j < 26; j++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r());
        c.fillStyle = gris(0.5 + r() * 0.25);
        c.beginPath();
        c.arc(cx + Math.cos(a) * d * 44, cy + 2 + Math.sin(a) * d * 16, 5, 0, Math.PI * 2);
        c.fill();
      }
    } else {
      c.fillStyle = gris(0.85, 0.8);
      c.beginPath();
      c.ellipse(cx - 18, cy - 4, 16, 5, -0.1, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = gris(0.97);
    c.lineWidth = 4;
    c.beginPath();
    c.ellipse(cx, cy, 70, 30, 0, Math.PI * 1.05, Math.PI * 1.75);
    c.stroke();
  };
  cuenco(215, 1420, 0.36, true);
  cuenco(395, 1450, 0.1, false);
};

const pintarPared = (c: CanvasRenderingContext2D) => {
  const g = c.createLinearGradient(0, -MY, 0, PARED);
  g.addColorStop(0, gris(0.2));
  g.addColorStop(1, gris(0.32));
  c.fillStyle = g;
  c.fillRect(-MX, -MY, 1080 + 2 * MX, PARED + MY);
  // un enchufe y el zócalo
  rect(c, 104, 868, 152, 920, 0.62);
  rect(c, 114, 880, 122, 908, 0.3);
  rect(c, 134, 880, 142, 908, 0.3);
  rect(c, -MX, PARED - 26, ENCIMERA.x0, PARED, 0.5);
  rect(c, -MX, PARED - 26, ENCIMERA.x0, PARED - 22, 0.66);
};

// la caja de cartón del gato, abajo a la derecha, abierta y vista desde arriba (el cartón sale claro con el infrarrojo)
const pintarCaja = (c: CanvasRenderingContext2D) => {
  const a: P = [700, 1690], b: P = [1050, 1676], d: P = [1080, 2040], e: P = [670, 2060];
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.fill(poli([[a[0] - 20, a[1] + 30], [b[0] + 30, b[1] + 20], [d[0] + 40, d[1]], [e[0] - 30, e[1]]]));
  // las solapas, abiertas hacia fuera
  c.fillStyle = gris(0.72);
  c.fill(poli([a, b, [b[0] - 30, b[1] - 92], [a[0] + 40, a[1] - 88]]));
  c.fill(poli([a, e, [e[0] - 96, e[1] - 30], [a[0] - 92, a[1] + 40]]));
  c.fillStyle = gris(0.6);
  c.fill(poli([b, d, [d[0] + 70, d[1] - 40], [b[0] + 84, b[1] + 46]]));
  // el canto de arriba y el hueco de dentro, oscuro
  c.fillStyle = gris(0.85);
  c.fill(poli([a, b, d, e]));
  c.fillStyle = gris(0.16);
  c.fill(poli([[a[0] + 22, a[1] + 22], [b[0] - 20, b[1] + 22], [d[0] - 22, d[1]], [e[0] + 22, e[1]]]));
  traza(c, poli([a, b, d, e]), 0.3, 3);
  traza(c, L(a[0] + 140, a[1] - 64, a[0] + 150, a[1] - 4), 0.4, 3); // la cinta de la solapa
};

let DECORADO: HTMLCanvasElement | null = null;
let LUZ: HTMLCanvasElement | null = null;
let BRILLA: HTMLCanvasElement | null = null;

// el decorado: lo que refleja, sin la luz
export const decorado = () => {
  if (DECORADO) return DECORADO;
  DECORADO = lienzo(MW, MH);
  const c = DECORADO.getContext('2d')!;
  enMedidas(c);
  pintarPared(c);
  pintarSuelo(c);
  pintarArmarios(c);
  pintarCacharros(c);
  pintarVentana(c);
  pintarEncimera(c);
  pintarNevera(c);
  pintarCuencos(c);
  pintarCaja(c);
  pintarMesa(c);
  return DECORADO;
};

// la luz del infrarrojo de la cámara: el foco en el centro, más flojo en los bordes y en lo alto de la pared del fondo
export const luzIR = () => {
  if (LUZ) return LUZ;
  LUZ = lienzo(MW, MH);
  const c = LUZ.getContext('2d')!;
  enMedidas(c);
  const g = c.createRadialGradient(540, 1090, 0, 540, 1090, 1260);
  g.addColorStop(0, gris(1));
  g.addColorStop(0.3, gris(0.96));
  g.addColorStop(0.58, gris(0.74));
  g.addColorStop(0.82, gris(0.52));
  g.addColorStop(1, gris(0.4));
  c.fillStyle = g;
  c.fillRect(-MX, -MY, 1080 + 2 * MX, 1920 + 2 * MY);
  c.globalCompositeOperation = 'multiply';
  const v = c.createLinearGradient(0, -MY, 0, 760);
  v.addColorStop(0, gris(0.82));
  v.addColorStop(1, gris(1));
  c.fillStyle = v;
  c.fillRect(-MX, -MY, 1080 + 2 * MX, 1920 + 2 * MY);
  return LUZ;
};

// lo que brilla solo (se suma encima): la farola y su halo dentro del cristal, la ventana del vecino y el rectángulo de luz de la
// farola en el suelo, con la cruz del marco
export const brillaSolo = () => {
  if (BRILLA) return BRILLA;
  BRILLA = lienzo(MW, MH);
  const c = BRILLA.getContext('2d')!;
  enMedidas(c);
  const {x0, x1, y0, y1} = VENTANA;
  c.save();
  c.beginPath();
  c.rect(x0 + 9, y0 + 9, x1 - x0 - 18, y1 - y0 - 18);
  c.clip();
  const h = c.createRadialGradient(738, 326, 4, 738, 326, 150);
  h.addColorStop(0, 'rgba(255,255,255,1)');
  h.addColorStop(0.12, 'rgba(255,255,255,0.75)');
  h.addColorStop(0.4, 'rgba(255,255,255,0.18)');
  h.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = h;
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.fillRect(612, 392, 22, 18);
  c.restore();
  c.save();
  c.filter = 'blur(10px)';
  const parche = poli([[600, 1236], [850, 1236], [930, 1560], [560, 1560]]);
  c.fillStyle = 'rgba(255,255,255,0.15)';
  c.fill(parche);
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = 'rgba(0,0,0,1)';
  c.fill(poli([[718, 1236], [734, 1236], [752, 1560], [730, 1560]])); // la sombra del parteluz
  c.fill(poli([[600, 1330], [880, 1330], [884, 1350], [596, 1350]])); // y la del travesaño
  c.restore();
  return BRILLA;
};
