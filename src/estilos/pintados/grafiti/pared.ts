import {clamp, mix, rng} from '../../../comun/curvas';
import {BORDE, MESA_G, MESA_Y, SUELO, type P} from '../../gato/escena';
import {
  H, PINTA, W, base, blur, camino, destello, enCapa, goteron, lienzo, manchaPts, motear, niebla, pintaPieza, punto, suave,
  type Caja, type Ctx, type Forma,
} from './espray';

// LA PARED DEL GRAFITI: lo que no se mueve, pintado una vez y guardado. Los ladrillos de verdad (con sus
// juntas, manchas, churretes y desconchones), las capas viejas (pintura gris de tapar, restos de otras piezas, firmas que no se
// leen), la pieza nueva (el fondo de nube cian, el «MIAU» con volumen, la espina de pescado, los brillos), la mesa pintada, el
// relieve del ladrillo que se ve a través de toda la pintura y, delante, la acera con su bote de espray tirado.

export const PIE_PARED = 1668; // donde la pared se junta con la acera
const LAD = {w: 170, h: 54, j: 10}; // un ladrillo de 21,5 × 6,5 cm con su junta de 1 cm, a la escala de la mesa
const FILA = LAD.h + LAD.j;
const Y0 = -22; // la primera fila empieza un poco por encima del cuadro

export const C = {
  negro: '#15121A',
  blanco: '#FFFDF6',
  naranja: '#FF7A1A',
  fucsia: '#FF2D8A',
  cian: '#19D3F0',
  amarillo: '#FFE11A',
  verde: '#A6F21A',
  violeta: '#6A2BD9',
  morado: '#3B1670',
  buff: '#9A958C',
  buffClaro: '#C9C3B6',
  buffOscuro: '#6E6A66',
};

type Ladrillo = {x: number; y: number; w: number; h: number; tono: number; fila: number};
const LADRILLOS: Ladrillo[] = (() => {
  const r = rng(301);
  const out: Ladrillo[] = [];
  for (let f = 0; Y0 + f * FILA < PIE_PARED; f++) {
    const y = Y0 + f * FILA;
    const corre = f % 2 ? -LAD.w / 2 : -LAD.w * 0.18;
    for (let x = corre - LAD.w; x < W + LAD.w; x += LAD.w + LAD.j) {
      const w = LAD.w + (r() - 0.5) * 6;
      out.push({x: x + (r() - 0.5) * 3, y: y + (r() - 0.5) * 2, w, h: LAD.h + (r() - 0.5) * 3, tono: r(), fila: f});
    }
  }
  return out;
})();

// ---------------------------------------------------------------- 1 · los ladrillos
const COLORES_LAD: [number, number, number][] = [
  [150, 66, 44], [128, 52, 36], [168, 84, 56], [112, 46, 34], [140, 72, 52], [176, 96, 66], [98, 40, 30], [158, 74, 48],
];
const rgb = (c: [number, number, number], k = 1, a = 1) =>
  `rgba(${Math.round(clamp(c[0] * k, 0, 255))},${Math.round(clamp(c[1] * k, 0, 255))},${Math.round(clamp(c[2] * k, 0, 255))},${a})`;

const ladrillos = (c: Ctx) => {
  // la junta: mortero gris tirando a beige
  c.fillStyle = '#8E867A';
  c.fillRect(0, 0, W, PIE_PARED);
  const r = rng(302);
  for (const l of LADRILLOS) {
    const col = COLORES_LAD[Math.floor(l.tono * COLORES_LAD.length)];
    const k = 0.86 + r() * 0.26;
    // la cara del ladrillo, con un degradado leve (más claro arriba) y las esquinas algo comidas
    const g = c.createLinearGradient(0, l.y, 0, l.y + l.h);
    g.addColorStop(0, rgb(col, k * 1.08));
    g.addColorStop(1, rgb(col, k * 0.9));
    c.fillStyle = g;
    const m = 2 + r() * 3;
    c.beginPath();
    c.moveTo(l.x + m, l.y + r() * 2);
    c.lineTo(l.x + l.w - m * r(), l.y + r() * 2);
    c.lineTo(l.x + l.w - r() * 2, l.y + m);
    c.lineTo(l.x + l.w - r() * 2, l.y + l.h - m * r());
    c.lineTo(l.x + l.w - m, l.y + l.h - r() * 2);
    c.lineTo(l.x + m * r(), l.y + l.h - r() * 2);
    c.lineTo(l.x + r() * 2, l.y + l.h - m);
    c.lineTo(l.x + r() * 2, l.y + m * r());
    c.closePath();
    c.fill();
    // manchas dentro del ladrillo: el barro cocido no es de un color
    for (let i = 0; i < 5; i++) {
      c.fillStyle = rgb(col, r() < 0.5 ? 0.72 : 1.22, 0.18 + r() * 0.2);
      c.beginPath();
      c.ellipse(l.x + r() * l.w, l.y + r() * l.h, 8 + r() * 30, 3 + r() * 10, (r() - 0.5) * 0.4, 0, Math.PI * 2);
      c.fill();
    }
    // algún ladrillo requemado
    if (r() < 0.12) {
      c.fillStyle = 'rgba(40,18,14,0.35)';
      c.fillRect(l.x + l.w * r() * 0.4, l.y, l.w * (0.3 + r() * 0.5), l.h);
    }
  }
};

// el grano: cada píxel un poco distinto (el ladrillo y el mortero son porosos)
const grano = (cv: HTMLCanvasElement, fuerza: number, y0 = 0, y1 = H) => {
  const x = cv.getContext('2d') as Ctx;
  const d = PINTA.dpr;
  const Y0p = Math.round(y0 * d), Y1p = Math.round(y1 * d);
  const img = x.getImageData(0, Y0p, cv.width, Y1p - Y0p);
  const px = img.data;
  const r = rng(77);
  for (let i = 0; i < px.length; i += 4) {
    const n = (r() - 0.5) * fuerza;
    px[i] = clamp(px[i] + n, 0, 255);
    px[i + 1] = clamp(px[i + 1] + n, 0, 255);
    px[i + 2] = clamp(px[i + 2] + n * 0.9, 0, 255);
  }
  x.putImageData(img, 0, Y0p);
};

// desconchones: donde saltó la cara del ladrillo (más claro, con su borde de sombra)
const desconchones = (c: Ctx, semilla: number, n: number, zona: Caja) => {
  const r = rng(semilla);
  for (let i = 0; i < n; i++) {
    const cx = mix(zona[0], zona[2], r()), cy = mix(zona[1], zona[3], r());
    const pts = manchaPts([cx, cy], 8 + r() * 26, 5 + r() * 14, semilla * 10 + i, 0.45, 14, r() * 3);
    c.save();
    c.fillStyle = 'rgba(30,14,10,0.45)';
    c.translate(1.5, 2.5);
    camino(c, pts);
    c.fill();
    c.restore();
    c.fillStyle = r() < 0.5 ? '#C99A7C' : '#B58468';
    camino(c, pts);
    c.fill();
    c.fillStyle = 'rgba(255,235,210,0.25)';
    camino(c, pts.map(([x, y]) => [mix(cx, x, 0.6), mix(cy, y, 0.6) - 2] as P));
    c.fill();
  }
};

// la suciedad: churretes de lluvia desde arriba y el barro que salpica abajo
const suciedad = (c: Ctx) => {
  const r = rng(303);
  for (let i = 0; i < 26; i++) {
    const x = r() * W, w = 6 + r() * 26, y0 = -10 + r() * 400, l = 200 + r() * 900;
    const g = c.createLinearGradient(0, y0, 0, y0 + l);
    g.addColorStop(0, 'rgba(25,18,14,0)');
    g.addColorStop(0.2, `rgba(25,18,14,${0.08 + r() * 0.1})`);
    g.addColorStop(1, 'rgba(25,18,14,0)');
    c.fillStyle = g;
    c.fillRect(x, y0, w, l);
  }
  const g = c.createLinearGradient(0, PIE_PARED - 260, 0, PIE_PARED);
  g.addColorStop(0, 'rgba(38,28,20,0)');
  g.addColorStop(0.7, 'rgba(38,28,20,0.32)');
  g.addColorStop(1, 'rgba(30,22,16,0.62)');
  c.fillStyle = g;
  c.fillRect(0, PIE_PARED - 260, W, 260);
  // manchas de humedad
  for (let i = 0; i < 9; i++) {
    const cx = r() * W, cy = 200 + r() * 1300;
    const gr = c.createRadialGradient(cx, cy, 0, cx, cy, 80 + r() * 160);
    gr.addColorStop(0, `rgba(20,14,10,${0.1 + r() * 0.12})`);
    gr.addColorStop(1, 'rgba(20,14,10,0)');
    c.fillStyle = gr;
    c.fillRect(cx - 260, cy - 260, 520, 520);
  }
};

// ---------------------------------------------------------------- 2 · lo viejo: firmas, pintura de tapar y restos de otras piezas
// una firma que no se lee: un garabato de bucles hecho de una sola vez, con su rotulador
const firma = (c: Ctx, x: number, y: number, ancho: number, alto: number, color: string, grosor: number, semilla: number) => {
  const r = rng(semilla);
  const pts: P[] = [];
  let th = r() * 6.28;
  const n = 34 + Math.floor(r() * 18);
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    th += 0.55 + r() * 0.9;
    const R = alto * (0.25 + r() * 0.3);
    pts.push([x + s * ancho + Math.cos(th) * R * 0.55, y + Math.sin(th) * R - (r() < 0.12 ? alto * 0.45 : 0)]);
  }
  c.save();
  c.strokeStyle = color;
  c.lineWidth = grosor;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.filter = blur(0.5);
  c.stroke(suave(pts, false));
  // el subrayado de la firma y su chorrito
  c.beginPath();
  c.moveTo(x - 10, y + alto * 0.62);
  c.quadraticCurveTo(x + ancho * 0.5, y + alto * (0.5 + r() * 0.3), x + ancho + 20, y + alto * 0.4);
  c.stroke();
  c.restore();
  if (r() < 0.7) goteron(c, x + ancho * (0.2 + r() * 0.6), y + alto * 0.3, 20 + r() * 50, grosor * 0.9, color, semilla + 5, false);
};

// pintura de tapar, a rodillo: un rectángulo de borde roto, con las pasadas del rodillo y medio transparente donde se cargó poco
const tapar = (c: Ctx, k: Caja, color: string, semilla: number, opaco = 0.94) => {
  const r = rng(semilla);
  const [x0, y0, x1, y1] = k;
  const pts: P[] = [];
  for (let x = x0; x <= x1; x += 22) pts.push([x + (r() - 0.5) * 8, y0 + (r() - 0.5) * 12]);
  for (let y = y0; y <= y1; y += 22) pts.push([x1 + (r() - 0.5) * 12, y + (r() - 0.5) * 6]);
  for (let x = x1; x >= x0; x -= 22) pts.push([x + (r() - 0.5) * 8, y1 + (r() - 0.5) * 14]);
  for (let y = y1; y >= y0; y -= 22) pts.push([x0 + (r() - 0.5) * 12, y + (r() - 0.5) * 6]);
  enCapa(c, [x0 - 30, y0 - 30, x1 + 30, y1 + 30], (b) => {
    b.fillStyle = color;
    camino(b, pts);
    b.fill();
    // las pasadas del rodillo: franjas verticales algo más claras u oscuras
    b.globalCompositeOperation = 'source-atop';
    for (let x = x0; x < x1; x += 14 + r() * 26) {
      b.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.04 + r() * 0.07})` : `rgba(0,0,0,${0.04 + r() * 0.08})`;
      b.fillRect(x, y0 - 20, 10 + r() * 40, y1 - y0 + 40);
    }
    // donde el rodillo iba seco, se ve lo de debajo
    b.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 8; i++) {
      const cx = mix(x0, x1, r()), cy = mix(y0, y1, r());
      const g = b.createRadialGradient(cx, cy, 0, cx, cy, 30 + r() * 70);
      g.addColorStop(0, `rgba(0,0,0,${0.15 + r() * 0.25})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = g;
      b.fillRect(cx - 110, cy - 110, 220, 220);
    }
  }, {alfa: opaco});
};

// una pieza vieja de letras de burbuja plateadas (formas redondas, no letras de verdad) para que quede medio tapada
const burbujasViejas = (c: Ctx, cx: number, cy: number, esc: number, semilla: number, relleno: [string, string], alfa: number) => {
  const r = rng(semilla);
  const ps: Path2D[] = [];
  let x = cx;
  for (let i = 0; i < 5; i++) {
    const w = (70 + r() * 50) * esc, h = (110 + r() * 40) * esc;
    const p = new Path2D();
    p.roundRect(x, cy - h / 2 + (r() - 0.5) * 30 * esc, w, h, Math.min(w, h) * 0.45);
    if (r() < 0.6) p.ellipse(x + w * 0.5, cy - h * 0.5, w * 0.4, h * 0.22, 0, 0, Math.PI * 2);
    ps.push(p);
    x += w * 0.8;
  }
  const f: Forma = {rellena: (b) => ps.forEach((p) => b.fill(p)), traza: (b) => ps.forEach((p) => b.stroke(p))};
  enCapa(c, null, (b) => {
    pintaPieza(b, {
      caja: [cx - 60, cy - 160 * esc, x + 80, cy + 160 * esc], forma: f, linea: 7 * esc,
      relleno: (q) => {
        const g = q.createLinearGradient(0, cy - 90 * esc, 0, cy + 90 * esc);
        g.addColorStop(0, relleno[0]);
        g.addColorStop(0.55, relleno[1]);
        g.addColorStop(0.62, relleno[0]);
        g.addColorStop(1, relleno[1]);
        return g;
      },
      luz: {d: [4, 4], ancho: 5}, semilla,
    });
  }, {alfa});
};

const viejo = (c: Ctx) => {
  // restos de colores de otros días (niebla vieja)
  niebla(c, [0, 1060, 700, 1700], (b) => {
    b.beginPath();
    b.ellipse(330, 1240, 230, 90, -0.1, 0, Math.PI * 2);
    b.fill();
  }, '#38B26B', 30, 0.8, 3);
  niebla(c, [560, 1060, 1080, 1700], (b) => {
    b.beginPath();
    b.ellipse(960, 1130, 150, 80, 0.4, 0, Math.PI * 2);
    b.fill();
  }, '#F2C230', 30, 0.75, 4);
  // una pieza vieja plateada abajo a la izquierda, y otra rosa debajo del fondo nuevo
  burbujasViejas(c, 18, 1468, 1.12, 41, ['#E6E4DF', '#7E7F86'], 0.95);
  burbujasViejas(c, 640, 400, 1.0, 43, ['#F59AC6', '#C2457E'], 0.7);
  // firmas viejas sobre el ladrillo
  firma(c, 196, 1150, 230, 60, '#1C1A22', 6, 51);
  firma(c, 820, 1420, 200, 56, '#1C1A22', 5, 53);
  firma(c, 30, 1100, 120, 44, '#2E5BD8', 5, 52);
  // la pintura de tapar: un gris debajo de la mesa (sobre las firmas), uno oscuro que se come media pieza plateada y uno claro a la
  // derecha, donde cae la taza
  tapar(c, [168, 1208, 560, 1392], C.buff, 61, 0.9);
  tapar(c, [400, 1400, 700, 1600], C.buffOscuro, 63, 0.93);
  tapar(c, [712, 1150, 1100, 1660], C.buffClaro, 62, 0.95);
  // y firmas nuevas encima de lo tapado (siempre vuelven)
  firma(c, 220, 1290, 170, 50, '#1C1A22', 4.5, 55);
  firma(c, 450, 1480, 150, 46, '#E8E4DA', 5, 58);
  firma(c, 940, 1520, 110, 40, '#7A2BD9', 4, 56);
  firma(c, 770, 1210, 120, 38, 'rgba(28,26,34,0.55)', 4, 57);
  pegatinas(c);
};

// pegatinas pegadas y medio arrancadas (sin marcas: un ojo, una estrella, una calavera de gato)
const pegatinas = (c: Ctx) => {
  const una = (x: number, y: number, w: number, h: number, ang: number, fondo: string, dibujo: (c: Ctx) => void, arrancada: boolean) => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.roundRect(-w / 2 + 3, -h / 2 + 4, w, h, 8);
    c.fill();
    c.fillStyle = fondo;
    c.beginPath();
    c.roundRect(-w / 2, -h / 2, w, h, 8);
    c.fill();
    dibujo(c);
    if (arrancada) {
      // la esquina que falta: se ve el papel blanco de debajo
      c.fillStyle = '#EDE6D6';
      c.beginPath();
      c.moveTo(w / 2, h / 2 - h * 0.55);
      c.lineTo(w / 2, h / 2);
      c.lineTo(w / 2 - w * 0.4, h / 2);
      c.closePath();
      c.fill();
    }
    c.restore();
  };
  una(612, 1186, 74, 74, 0.12, '#FFE11A', (q) => {
    q.fillStyle = C.negro;
    q.beginPath();
    q.ellipse(0, 0, 24, 15, 0, 0, Math.PI * 2);
    q.fill();
    q.fillStyle = '#FFFFFF';
    q.beginPath();
    q.arc(0, 0, 9, 0, Math.PI * 2);
    q.fill();
  }, true);
  una(160, 1352, 64, 52, -0.2, C.cian, (q) => destello(q, 0, 0, 18, '#FFFFFF'), false);
  una(1020, 1290, 70, 60, 0.3, '#F5F1E6', (q) => {
    q.fillStyle = C.fucsia;
    q.beginPath();
    q.moveTo(-16, -6);
    q.lineTo(-10, -22);
    q.lineTo(-2, -8);
    q.lineTo(2, -8);
    q.lineTo(10, -22);
    q.lineTo(16, -6);
    q.arc(0, 2, 17, 0, Math.PI);
    q.closePath();
    q.fill();
  }, true);
};

// ---------------------------------------------------------------- 3 · la pieza nueva: la nube de fondo
const NUBE: {c: P; r: number}[] = (() => {
  const r = rng(401);
  const out: {c: P; r: number}[] = [];
  // los bultos del borde: arriba, a los lados y abajo (donde el fondo se acaba y gotea)
  for (let x = 40; x <= 1040; x += 78 + r() * 30) out.push({c: [x, 120 + r() * 50], r: 62 + r() * 48});
  for (let y = 170; y <= 1010; y += 90 + r() * 30) {
    out.push({c: [44 + r() * 20, y], r: 50 + r() * 34});
    out.push({c: [1036 - r() * 20, y], r: 50 + r() * 34});
  }
  for (let x = 60; x <= 1030; x += 90 + r() * 40) out.push({c: [x, 1040 + r() * 30], r: 44 + r() * 30});
  return out;
})();
const nubeForma: Forma = {
  rellena: (b) => {
    b.beginPath();
    b.roundRect(44, 130, 992, 930, 60);
    b.fill();
    for (const n of NUBE) {
      b.beginPath();
      b.arc(n.c[0], n.c[1], n.r, 0, Math.PI * 2);
      b.fill();
    }
  },
  traza: (b) => {
    b.beginPath();
    b.roundRect(44, 130, 992, 930, 60);
    b.stroke();
    for (const n of NUBE) {
      b.beginPath();
      b.arc(n.c[0], n.c[1], n.r, 0, Math.PI * 2);
      b.stroke();
    }
  },
};

const fondoPieza = (c: Ctx) => {
  pintaPieza(c, {
    caja: [-40, 20, 1120, 1160], forma: nubeForma, linea: 9, corte: {color: C.blanco, ancho: 9},
    niebla: {color: '#E9F6FF', radio: 18, alfa: 0.6},
    relleno: (q) => {
      const g = q.createLinearGradient(0, 80, 0, 1100);
      g.addColorStop(0, '#3FE6FF');
      g.addColorStop(0.38, C.cian);
      g.addColorStop(0.72, '#2B7BF0');
      g.addColorStop(1, C.violeta);
      return g;
    },
    sombra: {color: C.morado, d: [-30, -34], alfa: 0.55, difumina: 18},
    luz: {d: [9, 10], ancho: 7, alfa: 0.9},
    dentro: (q) => {
      // la niebla de colores dentro del fondo: fucsia por abajo a la izquierda, verde ácido por arriba a la derecha (hecha puntitos)
      base(q);
      enCapa(q, [0, 0, W, 1200], (b) => {
        b.filter = blur(50);
        b.fillStyle = 'rgba(255,45,138,0.9)';
        b.beginPath();
        b.ellipse(150, 930, 270, 170, 0, 0, Math.PI * 2);
        b.fill();
        b.fillStyle = 'rgba(166,242,26,0.75)';
        b.beginPath();
        b.ellipse(990, 560, 150, 250, 0, 0, Math.PI * 2);
        b.fill();
        b.fillStyle = 'rgba(255,255,255,0.7)';
        b.beginPath();
        b.ellipse(560, 200, 420, 110, 0, 0, Math.PI * 2);
        b.fill();
        b.filter = 'none';
        motear(b, [0, 0, W, 1200], true, 9);
      }, {modo: 'source-atop', alfa: 0.75});
    },
    semilla: 7,
  });
  // los goterones de la nube, que bajan por la pared
  const r = rng(402);
  enCapa(c, [0, 1000, W, 1400], (b) => {
    for (const n of NUBE.filter((q) => q.c[1] > 1000)) {
      if (r() < 0.35) continue;
      const x = n.c[0] + (r() - 0.5) * n.r;
      const y = n.c[1] + n.r * 0.7;
      goteron(b, x, y, 40 + r() * 150, 9 + r() * 6, '#5F35DB', 410 + Math.round(x));
    }
  });
};

// las burbujas, los brillos y los puntos que adornan la nube
const adornos = (c: Ctx) => {
  const r = rng(403);
  const burbujas: [number, number, number][] = [
    [110, 470, 34], [160, 560, 18], [96, 640, 12], [840, 460, 40], [930, 390, 22], [1000, 860, 30], [810, 930, 16], [980, 960, 11],
    [200, 250, 16], [70, 300, 10],
  ];
  for (const [x, y, rr] of burbujas) {
    c.save();
    c.filter = blur(0.7);
    c.lineWidth = 5;
    c.strokeStyle = C.blanco;
    c.beginPath();
    c.arc(x, y, rr, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.fill();
    c.lineWidth = 4;
    c.beginPath();
    c.arc(x, y, rr * 0.62, Math.PI * 1.1, Math.PI * 1.55);
    c.stroke();
    c.restore();
  }
  for (let i = 0; i < 26; i++) {
    const x = 70 + r() * 940, y = 160 + r() * 860;
    if (x > 140 && x < 760 && y > 380) continue; // nada de puntos detrás del gato
    punto(c, x, y, 2 + r() * 4, r() < 0.5 ? C.blanco : C.amarillo);
  }
  for (const [x, y, R] of [[760, 120, 34], [990, 690, 26], [80, 820, 22], [860, 1000, 20]] as [number, number, number][]) {
    c.save();
    c.filter = blur(0.6);
    destello(c, x, y, R + 6, C.negro);
    destello(c, x, y, R, x > 900 ? C.amarillo : C.blanco);
    c.restore();
  }
};

// la espina de pescado a la derecha (lo que un gato pinta en su pared)
const espina = (c: Ctx) => {
  const cx = 890, cy = 640, ang = -0.42;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const T = (u: number, v: number): P => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  const ps: Path2D[] = [];
  // la raspa
  const raspa = new Path2D();
  const a = T(-96, 0), b = T(70, 0);
  raspa.moveTo(a[0], a[1]);
  raspa.lineTo(b[0], b[1]);
  ps.push(raspa);
  // las espinas
  for (let i = 0; i < 4; i++) {
    const u = -62 + i * 34;
    const sp = new Path2D();
    const m = T(u, 0), s1 = T(u + 16, -42 + i * 3), s2 = T(u + 16, 42 - i * 3);
    sp.moveTo(s1[0], s1[1]);
    sp.quadraticCurveTo(m[0], m[1], s2[0], s2[1]);
    ps.push(sp);
  }
  // la cola
  const cola = new Path2D();
  const c0 = T(-96, 0), c1 = T(-142, -40), c2 = T(-130, 0), c3 = T(-142, 40);
  cola.moveTo(c0[0], c0[1]);
  cola.lineTo(c1[0], c1[1]);
  cola.lineTo(c2[0], c2[1]);
  cola.lineTo(c3[0], c3[1]);
  cola.closePath();
  const cab = new Path2D();
  const h0 = T(98, 0);
  cab.ellipse(h0[0], h0[1], 46, 36, ang, 0, Math.PI * 2);
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.filter = blur(0.7);
  c.strokeStyle = C.negro;
  c.lineWidth = 26;
  ps.forEach((p) => c.stroke(p));
  c.lineWidth = 12;
  c.stroke(cola);
  c.stroke(cab);
  c.fillStyle = C.negro;
  c.fill(cola);
  c.fill(cab);
  c.strokeStyle = C.blanco;
  c.lineWidth = 12;
  ps.forEach((p) => c.stroke(p));
  c.fillStyle = C.blanco;
  c.fill(cola);
  c.fill(cab);
  // el ojo de la espina: una cruz
  const o = T(108, -8);
  c.strokeStyle = C.negro;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(o[0] - 8, o[1] - 8);
  c.lineTo(o[0] + 8, o[1] + 8);
  c.moveTo(o[0] + 8, o[1] - 8);
  c.lineTo(o[0] - 8, o[1] + 8);
  c.stroke();
  c.restore();
};

// ---------------------------------------------------------------- 4 · «MIAU», letras de grafiti con volumen
type Letra = {ch: string; x: number; y: number; ang: number; esc: number};
const LETRAS: Letra[] = [
  {ch: 'M', x: 70, y: 392, ang: -0.1, esc: 1.08},
  {ch: 'I', x: 362, y: 358, ang: -0.02, esc: 1.0},
  {ch: 'A', x: 486, y: 372, ang: 0.07, esc: 1.04},
  {ch: 'U', x: 744, y: 352, ang: 0.13, esc: 1.0},
];
const TAM = 300;
export const letrasForma = (fuente: string, lista: Letra[], tam: number): Forma => {
  const pon = (b: Ctx, l: Letra, f: (b: Ctx) => void) => {
    b.save();
    b.translate(l.x, l.y);
    b.rotate(l.ang);
    b.scale(l.esc, l.esc);
    b.font = `400 ${tam}px "${fuente}"`;
    b.textBaseline = 'alphabetic';
    f(b);
    b.restore();
  };
  return {
    rellena: (b) => lista.forEach((l) => pon(b, l, (q) => q.fillText(l.ch, 0, 0))),
    traza: (b) => lista.forEach((l) => pon(b, l, (q) => {
      q.lineWidth /= l.esc;
      q.strokeText(l.ch, 0, 0);
    })),
  };
};

// el volumen de unas letras: la misma forma copiada hacia abajo a la derecha, oscura, con su propio contorno
export const bloque = (c: Ctx, f: Forma, d: P, n: number, color: string, linea: number, caja: Caja) => {
  const copias = (b: Ctx, fn: (b: Ctx) => void) => {
    for (let i = 1; i <= n; i++) {
      b.save();
      b.translate((d[0] * i) / n, (d[1] * i) / n);
      fn(b);
      b.restore();
    }
  };
  c.save();
  c.lineJoin = 'round';
  c.filter = blur(0.7);
  c.strokeStyle = C.negro;
  c.lineWidth = 2 * linea;
  copias(c, (b) => f.traza(b));
  c.restore();
  enCapa(c, caja, (b) => {
    b.fillStyle = color;
    copias(b, (q) => f.rellena(q));
    // las aristas del bloque, un poco más claras arriba
    b.globalCompositeOperation = 'source-atop';
    const g = b.createLinearGradient(0, caja[1], 0, caja[3]);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0.25)');
    b.fillStyle = g;
    b.fillRect(caja[0], caja[1], caja[2] - caja[0], caja[3] - caja[1]);
  });
};

const miau = (c: Ctx, fuente: string) => {
  const f = letrasForma(fuente, LETRAS, TAM);
  const caja: Caja = [20, 60, 1080, 470];
  // el corte blanco y su niebla, por fuera de todo (letras y bloque)
  const conBloque: Forma = {
    rellena: (b) => { for (let i = 0; i <= 6; i++) { b.save(); b.translate(i * 3.5, i * 3.2); f.rellena(b); b.restore(); } },
    traza: (b) => { for (let i = 0; i <= 6; i++) { b.save(); b.translate(i * 3.5, i * 3.2); f.traza(b); b.restore(); } },
  };
  niebla(c, caja, (b) => {
    b.lineWidth = 62;
    b.lineJoin = 'round';
    conBloque.traza(b);
    conBloque.rellena(b);
  }, '#FFFFFF', 16, 0.7, 21);
  c.save();
  c.lineJoin = 'round';
  c.filter = blur(1);
  c.strokeStyle = C.negro;
  c.lineWidth = 56;
  conBloque.traza(c);
  c.strokeStyle = C.blanco;
  c.lineWidth = 44;
  conBloque.traza(c);
  c.fillStyle = C.blanco;
  conBloque.rellena(c);
  c.restore();
  // el volumen
  bloque(c, f, [21, 19], 7, C.morado, 9, caja);
  // la cara de las letras: amarillo → naranja → fucsia, con su sombra, su luz y sus brillos
  pintaPieza(c, {
    caja, forma: f, linea: 9,
    relleno: (q) => {
      // ojo: el relleno se aplica en las medidas de cada letra (la línea de base en y 0)
      const g = q.createLinearGradient(0, -TAM * 0.72, 0, 0);
      g.addColorStop(0, C.amarillo);
      g.addColorStop(0.45, C.naranja);
      g.addColorStop(0.95, C.fucsia);
      return g;
    },
    sombra: {color: '#B0124F', d: [-12, -14], alfa: 0.75, difumina: 6},
    luz: {d: [7, 8], ancho: 7},
    dentro: (q) => {
      // la franja de corte de las letras (dos colores que se cruzan) y unas burbujitas blancas
      base(q);
      q.fillStyle = 'rgba(255,255,255,0.22)';
      q.beginPath();
      q.moveTo(0, 290);
      q.bezierCurveTo(300, 250, 600, 330, 1080, 270);
      q.lineTo(1080, 300);
      q.bezierCurveTo(600, 360, 300, 280, 0, 318);
      q.closePath();
      q.fill();
      const r = rng(404);
      for (let i = 0; i < 30; i++) {
        const x = 80 + r() * 900, y = 200 + r() * 180;
        q.lineWidth = 3;
        q.strokeStyle = 'rgba(255,255,255,0.75)';
        q.beginPath();
        q.arc(x, y, 3 + r() * 7, 0, Math.PI * 2);
        q.stroke();
      }
    },
    semilla: 11,
  });
  // los goterones de las letras y los brillos
  const r = rng(405);
  const gotas: [number, number, number, string, number][] = [
    [128, 386, 96, '#E8207C', 15], [250, 380, 150, '#E8207C', 13], [410, 356, 64, '#E8207C', 12], [560, 372, 118, '#E8207C', 16],
    [690, 380, 76, '#E8207C', 12], [830, 376, 128, '#E8207C', 15], [935, 396, 58, '#E8207C', 12],
  ];
  c.save();
  c.filter = blur(0.6);
  for (const [x, y, l, col, w] of gotas) goteron(c, x, y - 6, l, w, col, Math.round(x * 3), w > 8);
  c.restore();
  for (const [x, y, R] of [[120, 190, 26], [520, 180, 22], [800, 230, 20]] as [number, number, number][]) {
    destello(c, x, y, R, C.blanco);
  }
  for (let i = 0; i < 6; i++) punto(c, 130 + r() * 800, 170 + r() * 50, 4, C.blanco);
};

// ---------------------------------------------------------------- 5 · la mesa pintada (verde ácido)
const MESA_X0 = 30;
const PATAS = [92, 650];
const PATA_W = 36;
export const mesaForma = (): Forma => {
  const ps: Path2D[] = [];
  const top = new Path2D();
  top.roundRect(MESA_X0, MESA_Y, BORDE - MESA_X0, MESA_G, 8);
  ps.push(top);
  const faldon = new Path2D();
  faldon.rect(PATAS[0], MESA_Y + MESA_G - 4, PATAS[1] + PATA_W - PATAS[0], 34);
  ps.push(faldon);
  for (const x of PATAS) {
    const p = new Path2D();
    p.moveTo(x, MESA_Y + MESA_G);
    p.lineTo(x + PATA_W, MESA_Y + MESA_G);
    p.lineTo(x + PATA_W - 6, SUELO);
    p.lineTo(x + 6, SUELO);
    p.closePath();
    ps.push(p);
  }
  return {rellena: (b) => ps.forEach((p) => b.fill(p)), traza: (b) => ps.forEach((p) => b.stroke(p))};
};
// el suelo de la escena: una franja cian pintada (donde apoya la mesa y se rompe la taza), con sus goterones
const SUELO_P = {y0: SUELO - 20, y1: SUELO + 44};
const sueloForma = (): Forma => {
  const p = new Path2D();
  const r = rng(407);
  const pts: P[] = [];
  for (let x = 14; x <= 1066; x += 40) pts.push([x, SUELO_P.y0 + (r() - 0.5) * 3]);
  for (let x = 1066; x >= 14; x -= 40) pts.push([x, SUELO_P.y1 + (r() - 0.5) * 4]);
  p.moveTo(pts[0][0], pts[0][1]);
  pts.forEach((q) => p.lineTo(q[0], q[1]));
  p.closePath();
  return {rellena: (b) => b.fill(p), traza: (b) => b.stroke(p)};
};
const mesa = (c: Ctx) => {
  pintaPieza(c, {
    caja: [-20, SUELO_P.y0 - 60, W + 20, SUELO_P.y1 + 60], forma: sueloForma(), linea: 7, corte: {color: C.blanco, ancho: 5},
    niebla: {radio: 10, alfa: 0.4},
    relleno: (q) => {
      const g = q.createLinearGradient(0, SUELO_P.y0, 0, SUELO_P.y1);
      g.addColorStop(0, '#7FF0FF');
      g.addColorStop(0.35, C.cian);
      g.addColorStop(1, '#0B7FA3');
      return g;
    },
    sombra: {color: '#0A4F78', d: [-10, -12], alfa: 0.7, difumina: 5},
    luz: {d: [4, 4], ancho: 4},
    semilla: 19,
  });
  // la sombra de la mesa en el suelo
  c.save();
  c.filter = blur(5);
  c.fillStyle = 'rgba(10,60,100,0.65)';
  c.beginPath();
  c.ellipse(390, SUELO + 2, 350, 13, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  const rg = rng(408);
  c.save();
  c.filter = blur(0.5);
  for (const x of [70, 300, 520, 870, 1000]) goteron(c, x, SUELO_P.y1 - 4, 10 + rg() * 14, 9, '#0E8FB4', x + 3, true);
  c.restore();
  pintaPieza(c, {
    caja: [0, MESA_Y - 40, BORDE + 40, SUELO + 40], forma: mesaForma(), linea: 8, corte: {color: C.blanco, ancho: 6},
    niebla: {radio: 10, alfa: 0.45},
    relleno: (q) => {
      const g = q.createLinearGradient(0, MESA_Y, 0, SUELO);
      g.addColorStop(0, '#D8FF4A');
      g.addColorStop(0.1, C.verde);
      g.addColorStop(1, '#2F9E3A');
      return g;
    },
    sombra: {color: '#1D6B2E', d: [-10, -9], alfa: 0.9, difumina: 4},
    luz: {d: [4, 4], ancho: 5},
    semilla: 13,
  });
  // los goterones verdes que caen del tablero
  const r = rng(406);
  c.save();
  c.filter = blur(0.4);
  for (const x of [176, 240, 330, 455, 520, 600]) {
    const l = 34 + r() * 100;
    goteron(c, x, MESA_Y + MESA_G + 18, l, 11, '#6CC524', x, true);
  }
  c.restore();
};

// ---------------------------------------------------------------- 6 · el relieve del ladrillo, que se ve a través de la pintura
const relieve = (c: Ctx) => {
  const r = rng(501);
  for (const l of LADRILLOS) {
    // cada ladrillo, un poco distinto aunque esté pintado
    c.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,225'},${0.03 + r() * 0.05})`;
    c.fillRect(l.x, l.y, l.w, l.h);
    // la junta de abajo en sombra (la luz viene de arriba) y la arista de arriba con luz
    c.fillStyle = 'rgba(18,10,8,0.34)';
    c.fillRect(l.x - 2, l.y + l.h, l.w + LAD.j + 2, 5);
    c.fillStyle = 'rgba(18,10,8,0.16)';
    c.fillRect(l.x - 2, l.y + l.h + 5, l.w + LAD.j + 2, LAD.j - 5);
    c.fillStyle = 'rgba(18,10,8,0.24)';
    c.fillRect(l.x + l.w, l.y, 4, l.h);
    c.fillStyle = 'rgba(18,10,8,0.12)';
    c.fillRect(l.x + l.w + 4, l.y, LAD.j - 4, l.h);
    c.fillStyle = 'rgba(255,244,230,0.2)';
    c.fillRect(l.x, l.y, l.w, 2.5);
    c.fillRect(l.x, l.y, 2, l.h);
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fillRect(l.x, l.y + l.h - 3, l.w, 3);
  }
  // los poros y los golpes: puntitos oscuros y claros por toda la pared
  for (let i = 0; i < 5200; i++) {
    const x = r() * W, y = r() * PIE_PARED;
    const s = 0.8 + r() * 2.2;
    c.fillStyle = r() < 0.6 ? `rgba(20,10,8,${0.2 + r() * 0.3})` : `rgba(255,248,236,${0.12 + r() * 0.2})`;
    c.fillRect(x, y, s, s);
  }
};

// ---------------------------------------------------------------- 7 · la acera, delante (de verdad, sin pintar)
const acera = (c: Ctx) => {
  const y0 = PIE_PARED;
  const g = c.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, '#6F6A63');
  g.addColorStop(0.25, '#8C877F');
  g.addColorStop(1, '#A39E95');
  c.fillStyle = g;
  c.fillRect(0, y0, W, H - y0);
  const r = rng(601);
  // el grano del hormigón: piedrecitas claras y oscuras
  for (let i = 0; i < 9000; i++) {
    const y = y0 + Math.pow(r(), 0.8) * (H - y0);
    const x = r() * W;
    const s = 0.8 + r() * 2.4 * ((y - y0) / (H - y0) + 0.4);
    c.fillStyle = r() < 0.5 ? `rgba(40,36,32,${0.15 + r() * 0.3})` : `rgba(235,230,220,${0.12 + r() * 0.25})`;
    c.fillRect(x, y, s, s * 0.8);
  }
  // las losas: juntas que se van al punto de fuga, y una de lado
  const fuga: P = [540, 1180];
  c.strokeStyle = 'rgba(38,34,30,0.55)';
  c.lineWidth = 3;
  for (const xb of [-260, 210, 680, 1150]) {
    const k = (y0 - fuga[1]) / (H - fuga[1]);
    c.beginPath();
    c.moveTo(mix(fuga[0], xb, k), y0);
    c.lineTo(xb, H);
    c.stroke();
  }
  c.lineWidth = 3.5;
  c.beginPath();
  c.moveTo(0, 1786);
  c.lineTo(W, 1786);
  c.stroke();
  c.strokeStyle = 'rgba(240,235,225,0.25)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(0, 1789);
  c.lineTo(W, 1789);
  c.stroke();
  // grietas
  c.strokeStyle = 'rgba(30,26,22,0.6)';
  c.lineWidth = 1.8;
  for (const [x, y, n] of [[760, 1700, 9], [120, 1830, 11], [930, 1850, 7]] as [number, number, number][]) {
    let px = x, py = y;
    c.beginPath();
    c.moveTo(px, py);
    for (let i = 0; i < n; i++) {
      px += 8 + r() * 22;
      py += (r() - 0.4) * 16;
      c.lineTo(px, py);
    }
    c.stroke();
  }
  // manchas: chicles aplastados, aceite y pintura que cayó al suelo
  for (let i = 0; i < 14; i++) {
    const x = r() * W, y = y0 + 30 + r() * (H - y0 - 40);
    c.fillStyle = `rgba(35,32,30,${0.25 + r() * 0.3})`;
    c.beginPath();
    c.ellipse(x, y, 5 + r() * 7, 3 + r() * 4, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.save();
  c.filter = blur(18);
  c.fillStyle = 'rgba(30,24,20,0.35)';
  c.beginPath();
  c.ellipse(640, 1860, 180, 40, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  niebla(c, [0, y0 - 10, W, y0 + 120], (b) => {
    b.fillRect(20, y0, 1040, 60);
  }, 'rgba(255,45,138,0.9)', 8, 0.25, 41);
  niebla(c, [400, y0, W, y0 + 160], (b) => {
    b.beginPath();
    b.ellipse(760, y0 + 50, 180, 30, 0, 0, Math.PI * 2);
    b.fill();
  }, C.cian, 12, 0.35, 42);
  // la sombra donde la pared toca el suelo
  const gs = c.createLinearGradient(0, y0, 0, y0 + 40);
  gs.addColorStop(0, 'rgba(15,12,10,0.55)');
  gs.addColorStop(1, 'rgba(15,12,10,0)');
  c.fillStyle = gs;
  c.fillRect(0, y0, W, 40);
  // matojos que salen de la junta
  for (const [x, n] of [[36, 9], [1010, 12], [470, 5]] as [number, number][]) {
    for (let i = 0; i < n; i++) {
      c.strokeStyle = i % 2 ? '#4E7A2A' : '#6B9A33';
      c.lineWidth = 3;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x + (r() - 0.5) * 20, y0 + 6);
      c.quadraticCurveTo(x + (r() - 0.5) * 30, y0 - 20, x + (r() - 0.5) * 60, y0 - 30 - r() * 40);
      c.stroke();
    }
  }
  // la pintura que cayó al suelo mientras se pintaba la pared: goterones aplastados de colores
  const rp = rng(602);
  for (const [x, y, col] of [[620, 1700, C.fucsia], [690, 1730, C.cian], [150, 1716, C.amarillo], [880, 1760, C.verde], [420, 1752, C.fucsia],
    [980, 1700, C.naranja]] as [number, number, string][]) {
    for (let i = 0; i < 6; i++) {
      const rx = 3 + rp() * 9;
      c.fillStyle = col;
      c.globalAlpha = 0.75;
      c.beginPath();
      c.ellipse(x + (rp() - 0.5) * 60, y + (rp() - 0.5) * 20, rx, rx * 0.45, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  boteDePie(c);
  bote(c);
};

// otro bote, de pie contra la pared (amarillo)
const boteDePie = (c: Ctx) => {
  const x = 566, y = 1770, w = 62, h = 150;
  c.save();
  c.filter = blur(8);
  c.fillStyle = 'rgba(18,14,12,0.5)';
  c.beginPath();
  c.ellipse(x + 26, y + 4, 60, 14, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#8A6A00');
  g.addColorStop(0.25, '#FFF6B0');
  g.addColorStop(0.4, C.amarillo);
  g.addColorStop(1, '#7A5A00');
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x - w / 2, y - h, w, h, [6, 6, 10, 10]);
  c.fill();
  // el hombro, la válvula y el tapón negro
  const gh = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  gh.addColorStop(0, '#3A3A40');
  gh.addColorStop(0.3, '#E9E9EE');
  gh.addColorStop(1, '#2A2A30');
  c.fillStyle = gh;
  c.beginPath();
  c.ellipse(x, y - h, w / 2, 18, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = '#1A1A20';
  c.fillRect(x - 9, y - h - 32, 18, 16);
  c.fillStyle = '#D9D9DE';
  c.fillRect(x - 5, y - h - 22, 10, 6);
  // la etiqueta negra con su franja y la pintura que chorreó
  c.fillStyle = 'rgba(21,18,26,0.92)';
  c.fillRect(x - w / 2, y - h * 0.62, w, h * 0.34);
  c.fillStyle = C.amarillo;
  c.fillRect(x - w / 2, y - h * 0.5, w, 8);
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fillRect(x - w * 0.28, y - h + 6, 6, h - 14);
  goteron(c, x + 12, y - h + 4, 46, 8, C.amarillo, 77, true);
};

// el bote de espray tirado: metal negro, la etiqueta fucsia y cian, el tapón suelto y su sombra
const bote = (c: Ctx) => {
  const cx = 300, cy = 1812, ang = -0.32, L = 260, R = 46;
  c.save();
  c.filter = blur(10);
  c.fillStyle = 'rgba(18,14,12,0.55)';
  c.beginPath();
  c.ellipse(cx + 18, cy + 40, L * 0.56, 20, ang * 0.6, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.save();
  c.translate(cx, cy);
  c.rotate(ang);
  // el cuerpo: un cilindro (el brillo del metal va a lo largo)
  const g = c.createLinearGradient(0, -R, 0, R);
  g.addColorStop(0, '#5A5A62');
  g.addColorStop(0.18, '#D7D8DE');
  g.addColorStop(0.3, '#3A3A42');
  g.addColorStop(0.75, '#16161B');
  g.addColorStop(1, '#2C2C33');
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(-L / 2, -R, L, 2 * R, 10);
  c.fill();
  // la etiqueta
  const ge = c.createLinearGradient(0, -R, 0, R);
  ge.addColorStop(0, '#FF7DB8');
  ge.addColorStop(0.2, '#FFE3F0');
  ge.addColorStop(0.32, C.fucsia);
  ge.addColorStop(0.8, '#9E0F50');
  ge.addColorStop(1, '#C21C66');
  c.fillStyle = ge;
  c.fillRect(-L / 2 + 50, -R, 120, 2 * R);
  c.fillStyle = 'rgba(25,211,240,0.9)';
  c.fillRect(-L / 2 + 50, -R * 0.15, 120, 14);
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.beginPath();
  c.arc(-L / 2 + 110, R * 0.45, 9, 0, Math.PI * 2);
  c.fill();
  // el hombro y la válvula (de este lado, a la derecha)
  const gh = c.createRadialGradient(L / 2, -R * 0.4, 4, L / 2, 0, R * 1.1);
  gh.addColorStop(0, '#E8E8EE');
  gh.addColorStop(0.4, '#6E6E78');
  gh.addColorStop(1, '#202026');
  c.fillStyle = gh;
  c.beginPath();
  c.ellipse(L / 2, 0, 26, R, 0, -Math.PI / 2, Math.PI / 2);
  c.fill();
  c.fillStyle = '#C9CAD0';
  c.fillRect(L / 2 + 20, -10, 18, 20);
  c.fillStyle = '#1A1A20';
  c.fillRect(L / 2 + 36, -6, 8, 12);
  // la base
  c.fillStyle = '#26262C';
  c.beginPath();
  c.ellipse(-L / 2, 0, 12, R, 0, Math.PI / 2, (Math.PI * 3) / 2);
  c.fill();
  // la pintura que goteó por el bote
  c.fillStyle = C.cian;
  c.beginPath();
  c.ellipse(L / 2 - 12, -R + 8, 16, 7, 0.2, 0, Math.PI * 2);
  c.fill();
  c.restore();
  // el tapón suelto
  c.save();
  c.translate(520, 1868);
  c.rotate(0.5);
  c.filter = blur(6);
  c.fillStyle = 'rgba(18,14,12,0.45)';
  c.beginPath();
  c.ellipse(8, 24, 44, 12, 0, 0, Math.PI * 2);
  c.fill();
  c.filter = 'none';
  const gt = c.createLinearGradient(-38, 0, 38, 0);
  gt.addColorStop(0, '#0E9FB8');
  gt.addColorStop(0.3, '#7FF0FF');
  gt.addColorStop(0.55, C.cian);
  gt.addColorStop(1, '#086B7D');
  c.fillStyle = gt;
  c.beginPath();
  c.roundRect(-38, -28, 76, 56, 12);
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath();
  c.ellipse(0, -28, 38, 9, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
};

// ---------------------------------------------------------------- lo guardado
type Guardado = {dpr: number; fuente: string; fondo: HTMLCanvasElement; relieve: HTMLCanvasElement; acera: HTMLCanvasElement};
let G: Guardado | null = null;
export const pared = (fuente: string): Guardado => {
  if (G && G.dpr === PINTA.dpr && G.fuente === fuente) return G;
  const pasoAntes = PINTA.paso;
  PINTA.paso = 0;
  // el fondo: ladrillo, suciedad, lo viejo, la nube, la espina, el MIAU y la mesa
  const fondo = lienzo();
  const f = fondo.getContext('2d') as Ctx;
  base(f);
  ladrillos(f);
  grano(fondo, 26, 0, PIE_PARED);
  desconchones(f, 303, 22, [0, 0, W, PIE_PARED - 20]);
  suciedad(f);
  viejo(f);
  fondoPieza(f);
  adornos(f);
  espina(f);
  miau(f, fuente);
  mesa(f);
  // el relieve
  const rel = lienzo();
  const fr = rel.getContext('2d') as Ctx;
  base(fr);
  relieve(fr);
  // la acera
  const ac = lienzo();
  const fa = ac.getContext('2d') as Ctx;
  base(fa);
  acera(fa);
  grano(ac, 20, PIE_PARED, H);
  PINTA.paso = pasoAntes;
  G = {dpr: PINTA.dpr, fuente, fondo, relieve: rel, acera: ac};
  return G;
};
