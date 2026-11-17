import * as THREE from 'three';
import {clamp, mix, rng, ruido} from '../../../comun/curvas';

// MUÑECO DE LANA, EL PUNTO: lo que hace que todo parezca tejido. Las texturas salen pintadas en un
// lienzo y con semilla (nada de imágenes de fuera): el punto bajo del ganchillo (filas de «V» que se apilan y se inclinan un poco,
// como la espiral de un amigurumi), el punto de media de la pared (columnas de «V»), el cordón (hebras retorcidas en paralelo: el
// hilo enrollado, el bordado, la madeja) y el fieltro (fibras sueltas). De cada una sale el color (con la sombra metida en los
// huecos, cada punto un pelo distinto y la pelusilla clara por encima) y el relieve (un mapa de normales). Las piezas (ovoides,
// tubos, tornos) llevan sus coordenadas de textura en puntos y vueltas de verdad: el mismo punto mide lo mismo en la oreja que en la
// barriga, cada vuelta lleva un número entero de puntos (sin costura y con los menguados hacia los polos) y empiezan en un anillo.

export type V3 = [number, number, number];

// ---------------------------------------------------------------- las medidas del punto, en px del mundo (el lienzo de 1080)
export const PUNTO = 20; // el ancho de un punto
export const VUELTA = 16; // el alto de una vuelta

// ---------------------------------------------------------------- el campo de alturas de un tejido (de 0, el hueco, a 1, la hebra)
type Pierna = [number, number, number, number]; // de (ax, ay) a (bx, by), en unidades de un punto (y hacia abajo en el lienzo)
type Tejido = {
  S: number; R: number; cel: number; // puntos y vueltas por tesela, px de lienzo por punto
  piernas: Pierna[]; grueso: number; inclina: number; // el radio de la hebra y lo que se tuerce cada vuelta (en puntos)
  semilla: number; retuerce: number; // cuántas vueltas de hebra (los cabos retorcidos) caben en un punto
};
type Campo = {h: Float32Array; fila: Uint8Array; tono: Float32Array; cabo: Float32Array; w: number; alto: number; t: Tejido};

const campos = new Map<string, Campo>();
const hazCampo = (clave: string, t: Tejido): Campo => {
  const ya = campos.get(clave);
  if (ya) return ya;
  const w = t.S * t.cel, alto = t.R * t.cel;
  const h = new Float32Array(w * alto), fila = new Uint8Array(w * alto), tono = new Float32Array(w * alto), cabo = new Float32Array(w * alto);
  const r = rng(t.semilla);
  // cada punto, un pelo distinto: ni todos igual de gordos ni en su sitio exacto (es a mano)
  const vari = Array.from({length: t.S * t.R}, () => ({dx: (r() - 0.5) * 0.07, dy: (r() - 0.5) * 0.06, g: t.grueso * (0.9 + r() * 0.2), tono: r() - 0.5, fase: r() * 6.28}));
  for (let py = 0; py < alto; py++) {
    const fy = py / t.cel;
    const f0 = Math.floor(fy);
    for (let px = 0; px < w; px++) {
      let bh = 0, bt = 0, bc = 0.5, bf = ((f0 % t.R) + t.R) % t.R;
      for (let df = -1; df <= 1; df++) {
        const f = f0 + df;
        const fm = ((f % t.R) + t.R) % t.R;
        const off = f * t.inclina;
        const fx = px / t.cel - off;
        const c0 = Math.floor(fx);
        for (let dc = -1; dc <= 1; dc++) {
          const c = c0 + dc;
          // el mismo punto en la tesela de abajo está corrido R·inclina columnas (por la inclinación): así casa sin costura
          const cm = (((c + Math.floor(f / t.R) * Math.round(t.R * t.inclina)) % t.S) + t.S) % t.S;
          const v = vari[fm * t.S + cm];
          const lx = fx - c - v.dx, ly = fy - f - v.dy;
          for (const [ax, ay, bx, by] of t.piernas) {
            const ux = bx - ax, uy = by - ay;
            const L = Math.hypot(ux, uy);
            const s = clamp(((lx - ax) * ux + (ly - ay) * uy) / (L * L));
            const qx = lx - (ax + ux * s), qy = ly - (ay + uy * s);
            const d = Math.hypot(qx, qy);
            const g = v.g * (1 - 0.16 * Math.abs(s - 0.45)); // más gorda en medio, como una lazada
            if (d >= g) continue;
            const a = (qx * uy - qy * ux) / (L * g); // de −1 a 1, de un lado al otro de la hebra
            let hv = Math.sqrt(1 - (d / g) ** 2);
            // los cabos retorcidos: rayas en diagonal a lo largo de la hebra
            const tw = 0.5 + 0.5 * Math.cos(2 * Math.PI * (s * L * t.retuerce + a * 0.55) + v.fase);
            hv *= 0.8 + 0.2 * tw;
            if (hv > bh) {
              bh = hv;
              bt = v.tono;
              bc = tw;
              bf = fm;
            }
          }
        }
      }
      const i = py * w + px;
      h[i] = bh;
      fila[i] = bf;
      tono[i] = bt;
      cabo[i] = bc;
    }
  }
  const cm: Campo = {h, fila, tono, cabo, w, alto, t};
  campos.set(clave, cm);
  return cm;
};

// el punto bajo del amigurumi: dos piernas que se juntan abajo (la «V»), las columnas un poco inclinadas por la espiral
const GANCHILLO: Tejido = {
  S: 8, R: 12, cel: 48, piernas: [[0.1, 0.02, 0.46, 0.93], [0.9, 0.02, 0.54, 0.93]], grueso: 0.17, inclina: 1 / 12, semilla: 2024, retuerce: 5.5,
};
// el punto de media (la pared): columnas de «V» más estrechas que se montan una en otra
const MEDIA: Tejido = {
  S: 6, R: 8, cel: 48, piernas: [[0.06, -0.22, 0.47, 0.86], [0.94, -0.22, 0.53, 0.86]], grueso: 0.2, inclina: 0, semilla: 77, retuerce: 4.5,
};
// el cordón: hebras retorcidas en paralelo (a lo largo de u)
const CORDON: Tejido = {S: 2, R: 4, cel: 48, piernas: [[-0.6, 0.5, 1.6, 0.5]], grueso: 0.5, inclina: 0, semilla: 9, retuerce: 2.2};

// ---------------------------------------------------------------- de campo a texturas
const lienzo = (w: number, h: number) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
};
const aTextura = (cv: HTMLCanvasElement, color: boolean) => {
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
};

// el relieve: normales sacadas de las alturas (Sobel, envolviendo los bordes). En three, +y del mapa es +v: en el lienzo, hacia arriba.
const normales = new Map<string, THREE.CanvasTexture>();
const mapaNormal = (clave: string, c: Campo, fuerza: number) => {
  const k = clave + fuerza;
  const ya = normales.get(k);
  if (ya) return ya;
  const {w, alto, h} = c;
  const cv = lienzo(w, alto);
  const g = cv.getContext('2d')!;
  const img = g.createImageData(w, alto);
  const at = (x: number, y: number) => h[((y + alto) % alto) * w + ((x + w) % w)];
  for (let y = 0; y < alto; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 8;
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 8;
    let nx = -dx * fuerza, ny = dy * fuerza, nz = 1;
    const l = Math.hypot(nx, ny, nz);
    nx /= l;
    ny /= l;
    nz /= l;
    const i = (y * w + x) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255;
    img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
    img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = aTextura(cv, false);
  normales.set(k, tex);
  return tex;
};

const hexRGB = (hex: string): [number, number, number] => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b].map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255)) as [number, number, number];
};

// el color: el de cada vuelta (las rayas son vueltas de otro color), oscuro en los huecos, cada punto con su tono y la pelusilla
const colores = new Map<string, THREE.CanvasTexture>();
const mapaColor = (clave: string, c: Campo, filas: string[], pelusa: number, hondo: number) => {
  const k = clave + filas.join() + pelusa + hondo;
  const ya = colores.get(k);
  if (ya) return ya;
  const {w, alto, h, fila, tono, cabo} = c;
  const cv = lienzo(w, alto);
  const g = cv.getContext('2d')!;
  const img = g.createImageData(w, alto);
  const rgb = filas.map(hexRGB);
  const rr = rng(c.t.semilla + 5);
  for (let i = 0; i < w * alto; i++) {
    const [r0, g0, b0] = rgb[fila[i] % rgb.length];
    const hv = h[i];
    // los huecos entre puntos, hondos y oscuros; la hebra, con sus cabos un poco más claros y más oscuros
    const luz = (mix(hondo, 1, Math.pow(hv, 0.6)) * (0.92 + 0.12 * cabo[i]) * (1 + 0.07 * tono[i])) * (1 + (rr() - 0.5) * 0.05);
    img.data[i * 4] = clamp(r0 * luz, 0, 255);
    img.data[i * 4 + 1] = clamp(g0 * luz, 0, 255);
    img.data[i * 4 + 2] = clamp(b0 * luz, 0, 255);
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // la pelusilla: pelitos claros sueltos por encima (envuelven: la tesela no tiene costura)
  if (pelusa > 0) {
    const n = Math.round(((w * alto) / 900) * pelusa);
    for (let j = 0; j < n; j++) {
      const x = rr() * w, y = rr() * alto, l = 6 + rr() * 16, a = rr() * Math.PI * 2, cu = (rr() - 0.5) * 10;
      const col = rgb[Math.floor(rr() * rgb.length)];
      const claro = `rgba(${Math.min(255, col[0] + 70)},${Math.min(255, col[1] + 70)},${Math.min(255, col[2] + 70)},${0.25 + rr() * 0.3})`;
      for (const dx of [-w, 0, w]) for (const dy of [-alto, 0, alto]) {
        const cx = x + dx, cy = y + dy;
        if (cx < -l || cx > w + l || cy < -l || cy > alto + l) continue;
        g.beginPath();
        g.moveTo(cx - Math.cos(a) * l * 0.5, cy - Math.sin(a) * l * 0.5);
        g.quadraticCurveTo(cx - Math.sin(a) * cu, cy + Math.cos(a) * cu, cx + Math.cos(a) * l * 0.5, cy + Math.sin(a) * l * 0.5);
        g.strokeStyle = claro;
        g.lineWidth = 0.7 + rr() * 0.8;
        g.stroke();
      }
    }
  }
  const tex = aTextura(cv, true);
  colores.set(k, tex);
  return tex;
};

// ---------------------------------------------------------------- el fieltro: fibras cortas y enredadas, mate
let fieltroHecho: {normal: THREE.CanvasTexture; color: THREE.CanvasTexture} | null = null;
const fieltroTex = () => {
  if (fieltroHecho) return fieltroHecho;
  const N = 256;
  const cv = lienzo(N, N);
  const g = cv.getContext('2d')!;
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, N, N);
  const r = rng(515);
  for (let j = 0; j < 2600; j++) {
    const x = r() * N, y = r() * N, l = 3 + r() * 9, a = r() * Math.PI * 2;
    const claro = r() > 0.5;
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
      g.beginPath();
      g.moveTo(x + dx, y + dy);
      g.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l);
      g.strokeStyle = claro ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.2)';
      g.lineWidth = 0.8 + r() * 0.8;
      g.stroke();
    }
  }
  const d = g.getImageData(0, 0, N, N).data;
  const h = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) h[i] = d[i * 4] / 255;
  const c: Campo = {h, fila: new Uint8Array(N * N), tono: new Float32Array(N * N), cabo: new Float32Array(N * N), w: N, alto: N, t: CORDON};
  const normal = mapaNormal('fieltro', c, 6);
  // el color: gris claro moteado que tiñe el material
  const cc = lienzo(N, N);
  const gc = cc.getContext('2d')!;
  const img = gc.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = 214 + (h[i] - 0.5) * 70 + ruido(i % N * 0.05, Math.floor(i / N) * 0.05 + 3) * 10;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = clamp(v, 0, 255);
    img.data[i * 4 + 3] = 255;
  }
  gc.putImageData(img, 0, 0);
  fieltroHecho = {normal, color: aTextura(cc, true)};
  return fieltroHecho;
};

// ---------------------------------------------------------------- los materiales
// La lana: mate (rugosidad alta) y con «sheen», el brillo de terciopelo de las telas, que aclara los bordes como la pelusa a
// contraluz. Las rayas son vueltas de otro color (filas de la tesela).
type OpLana = {normal?: number; sheen?: number; pelusa?: number; hondo?: number; rough?: number; transparente?: number; doble?: boolean};
const materiales = new Map<string, THREE.MeshPhysicalMaterial>();
const tejidos = {ganchillo: GANCHILLO, media: MEDIA, cordon: CORDON};
export type Tipo = keyof typeof tejidos;
export const lana = (filas: string | string[], tipo: Tipo = 'ganchillo', o: OpLana = {}): THREE.MeshPhysicalMaterial => {
  const fs = Array.isArray(filas) ? filas : [filas];
  const k = tipo + fs.join() + JSON.stringify(o);
  let m = materiales.get(k);
  if (m) return m;
  const t = tejidos[tipo];
  const c = hazCampo(tipo, t);
  const base = new THREE.Color(fs[0]);
  m = new THREE.MeshPhysicalMaterial({
    map: mapaColor(tipo, c, fs, o.pelusa ?? 1, o.hondo ?? 0.5),
    normalMap: mapaNormal(tipo, c, tipo === 'media' ? 26 : 30),
    normalScale: new THREE.Vector2(o.normal ?? 1, o.normal ?? 1),
    roughness: o.rough ?? 0.88,
    metalness: 0,
    sheen: o.sheen ?? 1,
    sheenRoughness: 0.5,
    sheenColor: base.clone().lerp(new THREE.Color('#FFF3E4'), 0.5),
    specularIntensity: 0.3,
    side: o.doble ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (o.transparente !== undefined) {
    m.transparent = true;
    m.opacity = o.transparente;
    m.depthWrite = false;
  }
  materiales.set(k, m);
  return m;
};
// la pelusilla de la silueta: capas casi transparentes un pelo por fuera de la pieza (se empujan por su normal) con pelitos sueltos
// pintados en su transparencia. De frente casi no se ven; en el borde se juntan y hacen el halo de pelusa de la lana, que a contraluz
// brilla con el «sheen». Solo para las piezas de lana (no se escalan raro).
let pelosHecho: THREE.CanvasTexture | null = null;
const pelos = () => {
  if (pelosHecho) return pelosHecho;
  const w = GANCHILLO.S * GANCHILLO.cel, h = GANCHILLO.R * GANCHILLO.cel;
  const cv = lienzo(w, h);
  const g = cv.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  const r = rng(4242);
  for (let j = 0; j < 1400; j++) {
    const x = r() * w, y = r() * h, l = 5 + r() * 14, a = r() * Math.PI * 2, cu = (r() - 0.5) * 8;
    const v = Math.round(150 + r() * 105);
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
      const cx = x + dx, cy = y + dy;
      if (cx < -l || cx > w + l || cy < -l || cy > h + l) continue;
      g.beginPath();
      g.moveTo(cx, cy);
      g.quadraticCurveTo(cx + Math.cos(a) * l * 0.5 - Math.sin(a) * cu, cy + Math.sin(a) * l * 0.5 + Math.cos(a) * cu, cx + Math.cos(a) * l, cy + Math.sin(a) * l);
      g.strokeStyle = `rgb(${v},${v},${v})`;
      g.lineWidth = 0.9 + r() * 0.9;
      g.stroke();
    }
  }
  pelosHecho = aTextura(cv, false);
  return pelosHecho;
};
const capas = new Map<string, THREE.MeshPhysicalMaterial>();
export const ALTOS_PELUSA = [1.3, 2.7];
export const capaPelusa = (base: THREE.MeshPhysicalMaterial, i: number): THREE.MeshPhysicalMaterial => {
  const k = base.uuid + i;
  let m = capas.get(k);
  if (m) return m;
  m = base.clone();
  m.alphaMap = pelos();
  m.transparent = true;
  m.opacity = (base.transparent ? base.opacity : 1) * (i === 0 ? 0.85 : 0.6);
  m.depthWrite = false;
  m.alphaTest = 0.08;
  m.normalScale = new THREE.Vector2(0.3, 0.3);
  const alto = ALTOS_PELUSA[i];
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += normalize(objectNormal) * ${alto.toFixed(2)};`);
  };
  m.customProgramCacheKey = () => 'pelusa' + alto;
  capas.set(k, m);
  return m;
};

export const fieltro = (color: string, o: {rough?: number; emite?: string; fuerza?: number; normal?: number} = {}): THREE.MeshPhysicalMaterial => {
  const k = 'fieltro' + color + JSON.stringify(o);
  let m = materiales.get(k);
  if (m) return m;
  const f = fieltroTex();
  const base = new THREE.Color(color);
  m = new THREE.MeshPhysicalMaterial({
    color: base, map: f.color, normalMap: f.normal, normalScale: new THREE.Vector2(o.normal ?? 1, o.normal ?? 1),
    roughness: o.rough ?? 0.95, sheen: 0.8, sheenRoughness: 0.6, sheenColor: base.clone().lerp(new THREE.Color('#FFFFFF'), 0.45),
    specularIntensity: 0.2,
  });
  if (o.emite) {
    m.emissive = new THREE.Color(o.emite);
    m.emissiveIntensity = o.fuerza ?? 1;
  }
  materiales.set(k, m);
  return m;
};
// el algodón (el vapor, las nubes): fibra blanca sin hilar, mate y un poco luminosa, medio transparente
export const algodon = (op: number): THREE.MeshPhysicalMaterial => {
  const k = 'algodon' + op.toFixed(2);
  let m = materiales.get(k);
  if (m) return m;
  const f = fieltroTex();
  m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#FFFFFF'), map: f.color, normalMap: f.normal, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 1,
    sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color('#FFF6E8'), emissive: new THREE.Color('#FFF1DE'), emissiveIntensity: 0.35,
    transparent: true, opacity: op, depthWrite: false,
  });
  materiales.set(k, m);
  return m;
};
// lo que brilla: los ojos de seguridad, los botones, las agujas
export const brillo = (color: string, o: {rough?: number; clearcoat?: number; emite?: string; fuerza?: number} = {}): THREE.MeshPhysicalMaterial => {
  const k = 'brillo' + color + JSON.stringify(o);
  let m = materiales.get(k);
  if (m) return m;
  m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color), roughness: o.rough ?? 0.18, clearcoat: o.clearcoat ?? 1, clearcoatRoughness: 0.06, specularIntensity: 1,
  });
  if (o.emite) {
    m.emissive = new THREE.Color(o.emite);
    m.emissiveIntensity = o.fuerza ?? 1;
  }
  materiales.set(k, m);
  return m;
};
// la madera (las agujas, el bastidor, el suelo): lisa y cálida
export const madera = (color: string, rough = 0.55): THREE.MeshPhysicalMaterial => {
  const k = 'madera' + color + rough;
  let m = materiales.get(k);
  if (m) return m;
  m = new THREE.MeshPhysicalMaterial({color: new THREE.Color(color), roughness: rough, clearcoat: 0.25, clearcoatRoughness: 0.4});
  materiales.set(k, m);
  return m;
};
export const todosLosMateriales = () => [...materiales.values()];

// ---------------------------------------------------------------- las piezas tejidas
// En todas, u va alrededor (en puntos: un número entero por vuelta) y v a lo largo (en vueltas). La tesela del ganchillo tiene 8
// puntos y 12 vueltas; la de media 6 × 8; la del cordón 2 × 4: cada pieza dice a qué tejido va.
const TESELA: Record<Tipo, [number, number]> = {ganchillo: [GANCHILLO.S, GANCHILLO.R], media: [MEDIA.S, MEDIA.R], cordon: [CORDON.S, CORDON.R]};

const geos = new Map<string, THREE.BufferGeometry>();

// la circunferencia de una elipse (Ramanujan)
const perimetro = (a: number, b: number) => {
  if (a + b < 1e-6) return 0;
  const hh = ((a - b) / (a + b)) ** 2;
  return Math.PI * (a + b) * (1 + (3 * hh) / (10 + Math.sqrt(4 - 3 * hh)));
};

// un ovoide relleno (eje y: de polo a polo) de semiejes rx, ry, rz. Se teje vuelta a vuelta, como un amigurumi: empieza en un
// anillo en el polo y cada vuelta es una banda con su número entero de puntos (más hacia el ecuador, menos al cerrar). Entre una
// vuelta y la siguiente los puntos no tienen por qué casar (son los aumentos y menguados): así las columnas no se retuercen en
// espiral. «costura»: el ángulo (alrededor de y) donde se cierran las vueltas, que va donde no se ve. «bultos»: lo que se abolla, como
// un muñeco relleno a mano. «escala»: lo que se agranda después (para que el punto mida lo mismo en el mundo).
export const geoOvoide = (rx: number, ry: number, rz: number, semilla: number, o: {costura?: number; bultos?: number; escala?: number; tipo?: Tipo; arriba?: number} = {}) => {
  const tipo = o.tipo ?? 'ganchillo';
  const k = `o${rx.toFixed(1)}-${ry.toFixed(1)}-${rz.toFixed(1)}-${semilla}-${JSON.stringify(o)}`;
  const ya = geos.get(k);
  if (ya) return ya;
  const [S, R] = TESELA[tipo];
  const esc = o.escala ?? 1;
  const costura = o.costura ?? -Math.PI / 2; // por defecto, detrás (−z)
  const arriba = o.arriba ?? Math.PI;
  const nF = 44;
  const req = Math.sqrt((rx * rx + rz * rz) / 2);
  // la longitud del meridiano (en px del mundo) en una tabla fina, para saber dónde empieza y acaba cada vuelta
  const NT = 400;
  const tabla: number[] = [0];
  for (let i = 1; i <= NT; i++) {
    const a0 = ((i - 1) / NT) * arriba, a1 = (i / NT) * arriba;
    tabla.push(tabla[i - 1] + Math.hypot(req * (Math.sin(a1) - Math.sin(a0)), ry * (Math.cos(a1) - Math.cos(a0))) * esc);
  }
  const total = tabla[NT];
  const thetaEn = (s: number) => {
    if (s <= 0) return 0;
    if (s >= total) return arriba;
    let a = 0, b = NT;
    while (b - a > 1) {
      const m = (a + b) >> 1;
      if (tabla[m] < s) a = m;
      else b = m;
    }
    return ((a + (s - tabla[a]) / Math.max(1e-9, tabla[b] - tabla[a])) / NT) * arriba;
  };
  const r = rng(semilla * 31 + 7);
  const ondas = Array.from({length: 4}, () => ({a: r() * 6.28, b: r() * 6.28, k1: 1 + Math.floor(r() * 3), k2: 1 + Math.floor(r() * 3), amp: (r() - 0.3) * (o.bultos ?? 0.025)}));
  const punto = (th: number, fi: number): [number, number, number] => {
    let bulto = 1;
    for (const w of ondas) bulto += w.amp * Math.sin(w.k1 * th * 2 + w.a) * Math.sin(w.k2 * fi + w.b);
    return [rx * Math.sin(th) * Math.cos(fi) * bulto, ry * Math.cos(th) * bulto, rz * Math.sin(th) * Math.sin(fi) * bulto];
  };
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const vueltas = Math.max(1, Math.ceil(total / VUELTA - 0.25));
  const SUB = 3; // anillos por vuelta (para que la forma siga redonda)
  let nAntes = 0, desfase = 0;
  for (let f = 0; f < vueltas; f++) {
    const s0 = (f / vueltas) * total, s1 = ((f + 1) / vueltas) * total;
    const thm = thetaEn((s0 + s1) / 2);
    // los puntos de esta vuelta: los que caben en su medio (el anillo del polo, como mínimo 6)
    const n = Math.max(f === 0 ? 6 : 5, Math.round((perimetro(rx * Math.sin(thm), rz * Math.sin(thm)) * esc) / PUNTO));
    // si la vuelta tiene los mismos puntos que la de antes, cada «V» cae encima de la suya; si aumenta o mengua, donde caiga
    if (n !== nAntes) desfase = f === 0 ? 0 : rng(semilla * 97 + f)() * 0.5;
    nAntes = n;
    const base = pos.length / 3;
    for (let q = 0; q <= SUB; q++) {
      const s = mix(s0, s1, q / SUB);
      const th = thetaEn(s);
      for (let j = 0; j <= nF; j++) {
        const fi = costura + (j / nF) * Math.PI * 2;
        pos.push(...punto(th, fi));
        uv.push(((j / nF) * n + desfase) / S, -(s / (total / vueltas)) / R);
      }
    }
    for (let q = 0; q < SUB; q++) for (let j = 0; j < nF; j++) {
      const a = base + q * (nF + 1) + j, b = a + nF + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1); // hacia fuera
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  sueldaPorSitio(geo);
  geos.set(k, geo);
  return geo;
};

// los vértices que están en el mismo sitio (la costura, los polos, el borde entre dos vueltas) comparten normal: así no se ve la junta
const sueldaPorSitio = (geo: THREE.BufferGeometry) => {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const grupos = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const kk = `${pos.getX(i).toFixed(2)},${pos.getY(i).toFixed(2)},${pos.getZ(i).toFixed(2)}`;
    const l = grupos.get(kk);
    if (l) l.push(i);
    else grupos.set(kk, [i]);
  }
  const v = new THREE.Vector3();
  grupos.forEach((l) => {
    if (l.length < 2) return;
    v.set(0, 0, 0);
    for (const i of l) v.set(v.x + nor.getX(i), v.y + nor.getY(i), v.z + nor.getZ(i));
    v.normalize();
    for (const i of l) nor.setXYZ(i, v.x, v.y, v.z);
  });
  nor.needsUpdate = true;
};

// la costura (el primer y el último meridiano son el mismo) y los polos, con la normal promediada: así no se ve la junta
const sueldaCostura = (geo: THREE.BufferGeometry, nT: number, nF: number) => {
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i <= nT; i++) {
    const a = i * (nF + 1), b = a + nF;
    v.set(nor.getX(a) + nor.getX(b), nor.getY(a) + nor.getY(b), nor.getZ(a) + nor.getZ(b)).normalize();
    nor.setXYZ(a, v.x, v.y, v.z);
    nor.setXYZ(b, v.x, v.y, v.z);
  }
  for (const i of [0, nT]) {
    v.set(0, 0, 0);
    for (let j = 0; j <= nF; j++) v.add(new THREE.Vector3(nor.getX(i * (nF + 1) + j), nor.getY(i * (nF + 1) + j), nor.getZ(i * (nF + 1) + j)));
    v.normalize();
    for (let j = 0; j <= nF; j++) nor.setXYZ(i * (nF + 1) + j, v.x, v.y, v.z);
  }
  nor.needsUpdate = true;
};

// un tubo tejido a lo largo de unos puntos, con su radio en cada uno y las puntas redondas (la cola, las patas, el asa, las hebras)
export const geoTubo = (pts: V3[], radios: number[], o: {tipo?: Tipo; puntas?: [boolean, boolean]; lados?: number; muestras?: number; v0?: number} = {}) => {
  const tipo = o.tipo ?? 'ganchillo';
  const [S, R] = TESELA[tipo];
  const lados = o.lados ?? 18;
  const curva = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)), false, 'centripetal');
  const largo = curva.getLength();
  const N = o.muestras ?? Math.max(4, Math.min(80, Math.round(largo / 9)));
  // el radio, a lo largo del tubo (los radios van en los puntos de paso: se reparten por la longitud de cada tramo)
  const tramo: number[] = [0];
  for (let i = 1; i < pts.length; i++) tramo.push(tramo[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  const radioEn = (k: number) => {
    const d = k * tramo[tramo.length - 1];
    for (let i = 1; i < tramo.length; i++) if (d <= tramo[i]) return mix(radios[i - 1], radios[i], (d - tramo[i - 1]) / Math.max(1e-6, tramo[i] - tramo[i - 1]));
    return radios[radios.length - 1];
  };
  // los anillos: centro, tangente y radio; con las puntas redondas (medias bolas) delante y detrás
  type Anillo = {c: THREE.Vector3; t: THREE.Vector3; r: number; s: number};
  const anillos: Anillo[] = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    anillos.push({c: curva.getPointAt(k), t: curva.getTangentAt(k).normalize(), r: radioEn(k), s: k * largo});
  }
  const NP = 6;
  const [pIni, pFin] = o.puntas ?? [true, true];
  if (pIni) {
    const a = anillos[0];
    const cap: Anillo[] = [];
    for (let j = NP; j >= 1; j--) {
      const al = (j / NP) * (Math.PI / 2);
      cap.push({c: a.c.clone().addScaledVector(a.t, -a.r * Math.sin(al)), t: a.t.clone(), r: Math.max(0.01, a.r * Math.cos(al)), s: -a.r * al});
    }
    anillos.unshift(...cap);
  }
  if (pFin) {
    const a = anillos[anillos.length - 1];
    for (let j = 1; j <= NP; j++) {
      const al = (j / NP) * (Math.PI / 2);
      anillos.push({c: a.c.clone().addScaledVector(a.t, a.r * Math.sin(al)), t: a.t.clone(), r: Math.max(0.01, a.r * Math.cos(al)), s: a.s + a.r * al});
    }
  }
  // un marco que no se retuerce (transporte paralelo)
  let nrm = new THREE.Vector3(0, 0, 1);
  if (Math.abs(nrm.dot(anillos[0].t)) > 0.9) nrm = new THREE.Vector3(1, 0, 0);
  nrm.sub(anillos[0].t.clone().multiplyScalar(nrm.dot(anillos[0].t))).normalize();
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const v0 = o.v0 ?? 0;
  anillos.forEach((a, i) => {
    if (i > 0) {
      const q = new THREE.Quaternion().setFromUnitVectors(anillos[i - 1].t, a.t);
      nrm.applyQuaternion(q);
      nrm.sub(a.t.clone().multiplyScalar(nrm.dot(a.t))).normalize();
    }
    const bin = new THREE.Vector3().crossVectors(a.t, nrm);
    const n = Math.max(3, Math.round((2 * Math.PI * a.r) / PUNTO));
    for (let j = 0; j <= lados; j++) {
      const fi = (j / lados) * Math.PI * 2;
      const d = nrm.clone().multiplyScalar(Math.cos(fi)).addScaledVector(bin, Math.sin(fi));
      pos.push(a.c.x + d.x * a.r, a.c.y + d.y * a.r, a.c.z + d.z * a.r);
      uv.push(((j / lados) * n) / S, (a.s / VUELTA + v0) / R);
    }
  });
  for (let i = 0; i < anillos.length - 1; i++) for (let j = 0; j < lados; j++) {
    const a = i * (lados + 1) + j, b = a + lados + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  sueldaCostura(geo, anillos.length - 1, lados);
  return geo;
};
// el tubo, guardado por su clave (para lo que no se mueve)
export const geoTuboFijo = (clave: string, pts: V3[], radios: number[], o: Parameters<typeof geoTubo>[2] = {}) => {
  const ya = geos.get('t' + clave);
  if (ya) return ya;
  const g = geoTubo(pts, radios, o);
  geos.set('t' + clave, g);
  return g;
};

// una pieza de torno tejida: el perfil [radio, altura] gira alrededor de y; v sigue el perfil (las vueltas suben por la pieza)
export const geoTorno = (clave: string, perfil: [number, number][], o: {tipo?: Tipo; lados?: number; costura?: number} = {}) => {
  const ya = geos.get('l' + clave);
  if (ya) return ya;
  const tipo = o.tipo ?? 'ganchillo';
  const [S, R] = TESELA[tipo];
  const lados = o.lados ?? 44;
  const costura = o.costura ?? -Math.PI / 2;
  const arco: number[] = [0];
  for (let j = 1; j < perfil.length; j++) arco.push(arco[j - 1] + Math.hypot(perfil[j][0] - perfil[j - 1][0], perfil[j][1] - perfil[j - 1][1]));
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  perfil.forEach(([rr, y], j) => {
    const n = Math.max(3, Math.round((2 * Math.PI * rr) / PUNTO));
    for (let i = 0; i <= lados; i++) {
      const fi = costura + (i / lados) * Math.PI * 2;
      pos.push(rr * Math.cos(fi), y, rr * Math.sin(fi));
      uv.push(((i / lados) * n) / S, arco[j] / VUELTA / R);
    }
  });
  for (let j = 0; j < perfil.length - 1; j++) for (let i = 0; i < lados; i++) {
    const a = j * (lados + 1) + i, b = a + lados + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // la costura
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let j = 0; j < perfil.length; j++) {
    const a = j * (lados + 1), b = a + lados;
    v.set(nor.getX(a) + nor.getX(b), nor.getY(a) + nor.getY(b), nor.getZ(a) + nor.getZ(b)).normalize();
    nor.setXYZ(a, v.x, v.y, v.z);
    nor.setXYZ(b, v.x, v.y, v.z);
  }
  geos.set('l' + clave, geo);
  return geo;
};

// una figura plana (puntos en px, y hacia abajo) con grosor y el canto redondo: el fieltro recortado
export const geoFigura = (clave: string, pts: [number, number][], hondo: number, canto: number, tesela = 220) => {
  const ya = geos.get('f' + clave);
  if (ya) return ya;
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, -y)));
  const geo = new THREE.ExtrudeGeometry(sh, {depth: Math.max(0.5, hondo - 2 * canto), bevelEnabled: true, bevelThickness: canto, bevelSize: canto * 0.8, bevelSegments: 4, curveSegments: 18});
  geo.translate(0, 0, -(hondo - 2 * canto) / 2);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tesela, uv.getY(i) / tesela);
  geo.computeVertexNormals();
  geos.set('f' + clave, geo);
  return geo;
};
// la figura con las coordenadas de la textura del tejido (para un trozo plano de punto: u en puntos, v en vueltas)
export const geoFiguraTejida = (clave: string, pts: [number, number][], hondo: number, canto: number) => {
  const ya = geos.get('ft' + clave);
  if (ya) return ya;
  const g = geoFigura('x' + clave, pts, hondo, canto, 1).clone();
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / PUNTO / GANCHILLO.S, uv.getY(i) / VUELTA / GANCHILLO.R);
  geos.set('ft' + clave, g);
  return g;
};
// una caja tejida (la mesa, el estante): cada cara con el punto a su medida
export const geoCajaTejida = (w: number, h: number, d: number, tipo: Tipo = 'ganchillo') => {
  const k = `c${w}-${h}-${d}-${tipo}`;
  const ya = geos.get(k);
  if (ya) return ya;
  const [S, R] = TESELA[tipo];
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i));
    const [a, b] = ax > 0.5 ? [z, y] : ay > 0.5 ? [x, z] : [x, y];
    uv.setXY(i, a / PUNTO / S, b / VUELTA / R);
  }
  geos.set(k, geo);
  return geo;
};

// para orientar algo de a a b (el eje y del objeto)
const Y = new THREE.Vector3(0, 1, 0);
export const orienta = (a: V3, b: V3): {L: number; quat: [number, number, number, number]} => {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = dir.length();
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir);
  return {L, quat: [q.x, q.y, q.z, q.w]};
};

// la mancha suave de las sombras de contacto
let manchaHecha: THREE.CanvasTexture | null = null;
export const mancha = (): THREE.CanvasTexture => {
  if (manchaHecha) return manchaHecha;
  const cv = lienzo(128, 128);
  const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  manchaHecha = new THREE.CanvasTexture(cv);
  return manchaHecha;
};

// el temblor del stop motion: cada pieza se mueve un poco distinto en cada postura
export const tiembla = (paso: number, i: number, amp = 1.5): V3 => {
  const r = rng(paso * 7919 + i * 131 + 5);
  return [(r() - 0.5) * 2 * amp, (r() - 0.5) * 2 * amp, (r() - 0.5) * 0.016];
};
