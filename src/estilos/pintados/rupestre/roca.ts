import {rng} from '../../../comun/curvas';

// LA ROCA DE LA CUEVA. La pared de caliza sobre la que va pintado todo, hecha una sola vez y guardada:
// su ALTURA (las grandes ondulaciones, los bultos, las grietas que serpentean, los poros), su COLOR (zonas más claras y más oscuras,
// vetas de calcita, el hollín que deja la antorcha encima de ella, el techo y el suelo de la cueva) y lo que el pigmento hace con
// ella (dónde se mete en los poros y dónde la piedra asoma). Cada cuadro, iluminar() pone el pigmento sobre la piedra y la alumbra
// con la antorcha, píxel a píxel: una luz rasante, de lado, que saca los volúmenes; como la llama se mueve, el relieve se mueve.
// Todo en px del cuadro (1080 × 1920).

export const W = 1080;
export const H = 1920;
const N = W * H;

// ---------------------------------------------------------------- ruido de gradiente (Perlin) con semilla
const PERM = new Uint8Array(512);
const GX = new Float32Array(256);
const GY = new Float32Array(256);
(() => {
  const r = rng(1234);
  const p = Array.from({length: 256}, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  for (let i = 0; i < 256; i++) {
    const a = r() * Math.PI * 2;
    GX[i] = Math.cos(a);
    GY[i] = Math.sin(a);
  }
})();
export const perlin = (x: number, y: number): number => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const X = xi & 255, Y = yi & 255;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const a = PERM[X] + Y, b = PERM[X + 1] + Y;
  const aa = PERM[a], ab = PERM[a + 1], ba = PERM[b], bb = PERM[b + 1];
  const n00 = GX[aa] * xf + GY[aa] * yf;
  const n10 = GX[ba] * (xf - 1) + GY[ba] * yf;
  const n01 = GX[ab] * xf + GY[ab] * (yf - 1);
  const n11 = GX[bb] * (xf - 1) + GY[bb] * (yf - 1);
  const x1 = n00 + (n10 - n00) * u;
  const x2 = n01 + (n11 - n01) * u;
  return (x1 + (x2 - x1) * v) * 1.4; // más o menos de -1 a 1
};
export const fbm = (x: number, y: number, oct: number, s = 0): number => {
  let t = 0, a = 1, f = 1, n = 0;
  for (let o = 0; o < oct; o++) {
    t += a * perlin(x * f + s * 17.3 + o * 3.1, y * f + s * 9.7 - o * 5.3);
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return t / n;
};
const sst = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

// ---------------------------------------------------------------- las medidas de la cueva
// el techo: su borde de abajo (con las estalactitas que cuelgan) y el suelo de la cueva, abajo del todo
const ESTALACTITAS: [number, number, number][] = [[150, 52, 74], [470, 70, 86], [1000, 54, 70]];
export const bordeTecho = (x: number) => {
  let y = 118 + 30 * perlin(x / 210, 3.7) + 9 * perlin(x / 70, 8.1);
  for (const [x0, largo, ancho] of ESTALACTITAS) {
    const u = (x - x0) / ancho;
    if (Math.abs(u) < 1) y = Math.max(y, 112 + largo * Math.cos((u * Math.PI) / 2) ** 1.3 + 6 * perlin(x / 20, 2));
  }
  return y;
};
export const bordeSuelo = (x: number) => 1828 + 22 * perlin(x / 210, 1.3) + 8 * perlin(x / 55, 4.4);
// el bulto de la roca donde los pintores pusieron el caballito (aprovechaban el relieve)
export const BULTO_CABALLO: [number, number] = [700, 268];
// dónde está la antorcha (la base de la llama): la luz sale de aquí
export const ANTORCHA: [number, number] = [968, 592];

// ---------------------------------------------------------------- la roca hecha
export type Roca = {
  nx: Float32Array; ny: Float32Array; nz: Float32Array; // la normal de la superficie
  ar: Uint8ClampedArray; ag: Uint8ClampedArray; ab: Uint8ClampedArray; // su color
  lum: Uint8ClampedArray; // lo clara que es la piedra en ese punto respecto a la media (128 = la media): tiñe el pigmento
  cubre: Uint8ClampedArray; // lo que cubre el pigmento (255 en los poros, menos en las crestas)
  grano: Uint8ClampedArray; // el grano que rompe los bordes soplados en motas
  amb: Float32Array; // la luz de ambiente con su oclusión (las grietas y los rincones, más oscuros)
  vin: Float32Array; // la pared que se curva y se aleja por los bordes (más oscura)
  sombra: Float32Array; // la altura, para la sombra que arroja el relieve
};
let ROCA: Roca | null = null;

export const roca = (): Roca => {
  if (ROCA) return ROCA;
  // 1 · la altura gruesa, a media resolución (las ondulaciones, los bultos y las grietas)
  const HW = W / 2, HH = H / 2;
  const hm = new Float32Array(HW * HH);
  const zona = new Float32Array(HW * HH); // para el color: zonas claras y oscuras
  const grieta = new Float32Array(HW * HH);
  const veta = new Float32Array(HW * HH);
  for (let hy = 0; hy < HH; hy++) {
    for (let hx = 0; hx < HW; hx++) {
      const X = hx * 2 + 1, Y = hy * 2 + 1;
      // el dominio retorcido: así las grietas y las vetas serpentean
      const wx = X + 70 * fbm(X / 380, Y / 380, 2, 1);
      const wy = Y + 70 * fbm(X / 380 + 5.2, Y / 380 + 1.3, 2, 2);
      let h = 58 * fbm(wx / 560, wy / 560, 3, 3); // las grandes ondulaciones
      const bul = fbm(wx / 150, wy / 150, 3, 4);
      const aspera = 0.3 + 0.7 * sst(-0.25, 0.35, perlin(X / 420 + 50, Y / 420 + 20)); // hay zonas lisas (colada) y zonas ásperas
      h += (13 * bul + 6 * Math.abs(fbm(wx / 70, wy / 70, 2, 5))) * aspera; // los bultos, redondeados
      // las grietas: donde el ruido cruza el cero, dos redes (grandes y finas) y cortadas a trozos
      // (quebradas: su dominio tiembla a escala corta)
      const jx = wx + 9 * perlin(X / 26 + 4, Y / 26), jy = wy + 9 * perlin(X / 26, Y / 26 + 4);
      const g1 = Math.abs(perlin(jx / 430 + 11, jy / 430 + 7));
      const g2 = Math.abs(perlin(jx / 190 + 31, jy / 190 + 2));
      const m1 = sst(0.05, 0.35, perlin(wx / 640 + 3, wy / 640 + 9)) * (0.55 + 0.45 * sst(-0.3, 0.3, perlin(X / 90, Y / 90 + 7)));
      const m2 = sst(0.22, 0.5, perlin(wx / 300 + 13, wy / 300 + 4));
      const c1 = sst(0.011, 0, g1) * m1;
      const c2 = sst(0.009, 0, g2) * m2 * 0.75;
      const cr = Math.max(c1, c2);
      h -= 7 * cr;
      // el bulto del caballito
      const bx = (X - BULTO_CABALLO[0]) / 150, by = (Y - BULTO_CABALLO[1]) / 95;
      h += 26 * Math.exp(-(bx * bx + by * by));
      // el techo: la roca se adelanta, con su labio redondeado
      const yt = bordeTecho(X);
      const kt = sst(yt + 14, yt - 44, Y);
      h += 30 * kt;
      // el suelo de la cueva: se va hacia dentro
      const ys = bordeSuelo(X);
      const ks = sst(ys - 8, ys + 26, Y);
      h -= 38 * ks;
      const i = hy * HW + hx;
      hm[i] = h;
      zona[i] = fbm(wx / 300, wy / 300, 3, 7);
      grieta[i] = cr;
      veta[i] = sst(0.03, 0, Math.abs(perlin(wx / 240 + 20, wy / 240 - 6))) * sst(0, 0.35, perlin(wx / 500 + 40, wy / 500));
    }
  }
  // 2 · a resolución completa: la altura fina (los granos y los poros), el color y lo que hace el pigmento
  const alt = new Float32Array(N);
  const ar = new Uint8ClampedArray(N), ag = new Uint8ClampedArray(N), ab = new Uint8ClampedArray(N);
  const lum = new Uint8ClampedArray(N), cubre = new Uint8ClampedArray(N), grano = new Uint8ClampedArray(N);
  const crG = new Float32Array(N);
  const muestra = (arr: Float32Array, X: number, Y: number) => {
    const fx = Math.min(HW - 1.001, Math.max(0, (X - 1) / 2)), fy = Math.min(HH - 1.001, Math.max(0, (Y - 1) / 2));
    const x0 = fx | 0, y0 = fy | 0, u = fx - x0, v = fy - y0;
    const i = y0 * HW + x0;
    const a = arr[i] + (arr[i + 1] - arr[i]) * u;
    const b = arr[i + HW] + (arr[i + HW + 1] - arr[i + HW]) * u;
    return a + (b - a) * v;
  };
  const r0 = rng(77);
  // los guijarros del suelo de la cueva
  const piedras: [number, number, number][] = Array.from({length: 26}, () => [r0() * W, 1850 + r0() * 70, 10 + r0() * 26]);
  let suma = 0;
  const L0 = new Float32Array(N);
  for (let Y = 0; Y < H; Y++) {
    const yt0 = 0;
    for (let X = 0; X < W; X++) {
      const i = Y * W + X;
      const pf = perlin(X / 3.1 + 0.37, Y / 3.1 + 0.71) * 0.6 + perlin(X / 7.3, Y / 7.3 + 50) * 0.4; // los poros
      const pm = perlin(X / 17, Y / 17 + 90); // el grano de la piedra
      let h = muestra(hm, X, Y) + 1.5 * pm + 0.45 * pf - 0.7 * sst(-0.2, -0.55, pf);
      // el suelo: guijarros
      if (Y > 1800) {
        for (const [px, py, pr] of piedras) {
          const dx = (X - px) / pr, dy = (Y - py) / (pr * 0.6);
          const d = dx * dx + dy * dy;
          if (d < 1) h += pr * 0.55 * Math.sqrt(1 - d);
        }
      }
      alt[i] = h;
      const cr = muestra(grieta, X, Y);
      crG[i] = cr;
      // el color: la caliza clara, con sus zonas
      const z = muestra(zona, X, Y);
      const kz = sst(-0.35, 0.35, z);
      let r = 216 + (196 - 216) * kz, g = 198 + (168 - 198) * kz, b = 168 + (132 - 168) * kz;
      const gris = sst(0.18, 0.5, fbm(X / 430 + 9, Y / 430 + 2, 2, 8));
      r += (184 - r) * gris * 0.7; g += (180 - g) * gris * 0.7; b += (172 - b) * gris * 0.7;
      const osc = sst(0.2, 0.55, fbm(X / 260 + 19, Y / 260 + 12, 3, 9));
      r += (138 - r) * osc * 0.5; g += (120 - g) * osc * 0.5; b += (100 - b) * osc * 0.5;
      // las manchas de la propia roca: óxido de hierro (rojizas) y manganeso (negruzcas)
      const fe = sst(0.22, 0.55, fbm(X / 230 + 70, Y / 230 + 30, 3, 10));
      r += (178 - r) * fe * 0.5; g += (108 - g) * fe * 0.5; b += (72 - b) * fe * 0.5;
      const mn = sst(0.36, 0.62, fbm(X / 130 + 90, Y / 130 + 10, 3, 11));
      r += (64 - r) * mn * 0.55; g += (54 - g) * mn * 0.55; b += (48 - b) * mn * 0.55;
      const ve = muestra(veta, X, Y);
      r += (240 - r) * ve * 0.65; g += (233 - g) * ve * 0.65; b += (214 - b) * ve * 0.65;
      const fino = 0.95 + 0.06 * pm + 0.03 * pf;
      r *= fino; g *= fino; b *= fino;
      r *= 1 - 0.62 * cr; g *= 1 - 0.65 * cr; b *= 1 - 0.68 * cr;
      // el hollín de la antorcha: una pluma negra que sube por la pared desde la llama hasta el techo
      const dy = ANTORCHA[1] - Y;
      if (dy > -40) {
        const ancho = 40 + 0.24 * Math.max(0, dy);
        const ex = (X - ANTORCHA[0] - 0.12 * Math.max(0, dy)) / ancho;
        const ho = Math.exp(-ex * ex) * sst(-40, 60, dy) * (0.78 + 0.22 * pm);
        const k = Math.min(0.82, ho * 0.85);
        r += (34 - r) * k; g += (28 - g) * k; b += (25 - b) * k;
      }
      // el techo, más oscuro (va en sombra), y el suelo de la cueva, de tierra
      const yt = bordeTecho(X);
      const kt = sst(yt + 4, yt - 30, Y);
      if (kt > 0) { r *= 1 - 0.62 * kt; g *= 1 - 0.64 * kt; b *= 1 - 0.66 * kt; }
      const ys = bordeSuelo(X);
      const ks = sst(ys - 4, ys + 20, Y);
      if (ks > 0) {
        r += (118 - r) * ks * 0.8; g += (92 - g) * ks * 0.8; b += (70 - b) * ks * 0.8;
      }
      ar[i] = r; ag[i] = g; ab[i] = b;
      const l = 0.3 * r + 0.59 * g + 0.11 * b;
      L0[i] = l;
      if (Y > 200 && Y < 1780) suma += l;
      // el pigmento se mete en los poros y en las grietas; en las crestas, la piedra asoma
      cubre[i] = 255 * Math.min(1, 0.5 + 0.5 * sst(0.35, -0.35, pf) + 0.25 * cr - 0.12 * Math.max(0, pm));
      grano[i] = 255 * Math.min(1, Math.max(0, 0.5 + 0.62 * (perlin(X / 2.3 + 7.7, Y / 2.3 + 1.9) * 0.7 + perlin(X / 5.5 + 3, Y / 5.5) * 0.45)));
      void yt0;
    }
  }
  const media = suma / (W * 1580);
  for (let i = 0; i < N; i++) lum[i] = Math.min(255, (128 * L0[i]) / media);
  // 3 · las normales (de la altura) y el ambiente con su oclusión
  const nx = new Float32Array(N), ny = new Float32Array(N), nz = new Float32Array(N), amb = new Float32Array(N), vin = new Float32Array(N);
  const K = 0.55;
  for (let Y = 0; Y < H; Y++) {
    for (let X = 0; X < W; X++) {
      const i = Y * W + X;
      const xa = X > 0 ? i - 1 : i, xb = X < W - 1 ? i + 1 : i;
      const ya = Y > 0 ? i - W : i, yb = Y < H - 1 ? i + W : i;
      const gx = (alt[xb] - alt[xa]) * K, gy = (alt[yb] - alt[ya]) * K;
      const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
      nx[i] = -gx * inv;
      ny[i] = -gy * inv;
      nz[i] = inv;
      // el ambiente: de arriba un poco a la izquierda, suave; las grietas se lo comen
      const d = Math.max(0, (-0.25 * -gx + -0.45 * -gy + 0.86) * inv);
      amb[i] = (0.55 + 0.45 * d) * (1 - 0.55 * crG[i]);
      const vx = (X - 600) / 620, vy = (Y - 980) / 1060;
      vin[i] = 1 - 0.55 * Math.min(1, (vx * vx * 0.9 + vy * vy * 0.7) ** 1.5);
    }
  }
  ROCA = {nx, ny, nz, ar, ag, ab, lum, cubre, grano, amb, vin, sombra: alt};
  return ROCA;
};

// ---------------------------------------------------------------- la luz de cada cuadro
export type Luz = {x: number; y: number; z: number; I: number; R: number; tr: number; tg: number; tb: number; amb: number; abajo: number};

// pone el pigmento (pig, RGBA del lienzo de pintura) sobre la piedra y lo alumbra todo; deja el cuadro en out (RGBA)
export const iluminar = (pig: Uint8ClampedArray, out: Uint8ClampedArray, L: Luz) => {
  const R = roca();
  const {nx, ny, nz, ar, ag, ab, lum, cubre, grano, amb, vin, sombra} = R;
  const invR2 = 1 / (L.R * L.R);
  const KR = 0.58; // lo que marca el relieve la luz rasante
  const ambR = 0.6 * L.amb, ambG = 0.52 * L.amb, ambB = 0.48 * L.amb;
  for (let y = 0; y < H; y++) {
    const dy = L.y - y;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const k = i << 2;
      let r = ar[i], g = ag[i], b = ab[i];
      const pa = pig[k + 3];
      if (pa > 0) {
        // los bordes soplados se rompen en motas; dentro, el pigmento se mete en los poros y la piedra asoma
        let c = (pa / 255 - 0.46 * (grano[i] / 255) + 0.1) / 0.55;
        c = c < 0 ? 0 : c > 1 ? 1 : c;
        c *= cubre[i] / 255;
        const rl = 0.55 + 0.45 * (lum[i] / 128);
        r += (pig[k] * rl - r) * c;
        g += (pig[k + 1] * rl - g) * c;
        b += (pig[k + 2] * rl - b) * c;
      }
      // la antorcha: luz rasante (z pequeña) con su caída
      const dx = L.x - x, dz = L.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const inv = 1 / Math.sqrt(d2);
      const n = nx[i] * dx + ny[i] * dy + nz[i] * dz;
      let s = 1 + KR * (n / (nz[i] * dz) - 1);
      // la sombra que arroja el relieve hacia el lado contrario a la luz
      const sx = Math.round(dx * inv * 6), sy = Math.round(dy * inv * 6);
      const j = i + sy * W + sx;
      if (j >= 0 && j < sombra.length) {
        const so = sombra[j] - sombra[i] - 3.2;
        if (so > 0) s *= 1 - Math.min(0.55, so * 0.09);
      }
      s = s < 0.08 ? 0.08 : s > 2.1 ? 2.1 : s;
      // la caída: por debajo de la llama llega más lejos (alumbra la pared de abajo)
      const dyc = dy < 0 ? dy * L.abajo : dy;
      const v = vin[i];
      const f = (L.I / (1 + (dx * dx + dyc * dyc + dz * dz) * invR2)) * s * v;
      const a = amb[i] * v;
      out[k] = r * (a * ambR + f * L.tr);
      out[k + 1] = g * (a * ambG + f * L.tg);
      out[k + 2] = b * (a * ambB + f * L.tb);
      out[k + 3] = 255;
    }
  }
};
