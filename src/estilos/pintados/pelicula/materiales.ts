import * as THREE from 'three';

// PELÍCULA ANIMADA, los materiales: lisos y limpios como en una película de animación 3D. El pelaje es un material
// físico con terciopelo (sheen) al que se le añade, en el sombreador, lo que hace que parezca pelo de película: el lomo más oscuro
// que la barriga, las rayas de atigrado con el borde suave (siguen su propia pieza: no resbalan cuando se mueve), un grano muy fino
// y el BORDE DE LUZ, el brillo cálido que deja la ventana por detrás en el contorno. La cerámica y el café, con barniz y reflejos.
// La cámara mira de frente sin girar: lo que en el sombreador es «de la vista» es también «del mundo» (x derecha, y arriba, z a ti).

// ---------------------------------------------------------------- el pelaje
const GLSL_RUIDO = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNorm;
#ifdef USA_LARGO
varying float vLargo;
#endif
uniform vec3 uVientre;
uniform vec3 uRayaColor;
uniform vec3 uEje;
uniform float uFreq;
uniform float uRayas;
uniform float uEscala;
uniform vec3 uDorsoDir;
uniform vec3 uRayasDir;
uniform vec3 uRimColor;
uniform vec3 uRimDir;
uniform float uRimPot;
`;
const GLSL_FUNCIONES = /* glsl */ `
float hashP(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float ruidoP(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hashP(i), hashP(i + vec3(1,0,0)), f.x), mix(hashP(i + vec3(0,1,0)), hashP(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hashP(i + vec3(0,0,1)), hashP(i + vec3(1,0,1)), f.x), mix(hashP(i + vec3(0,1,1)), hashP(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

export type OpPelo = {
  color: string; // el lomo
  vientre?: string; // la barriga (más clara)
  raya?: string; // el color de las rayas
  rayas?: number; // cuánto se ven (0 = sin rayas)
  eje?: THREE.Vector3Tuple; // a lo largo de qué eje de la pieza van las bandas
  freq?: number; // cuántas bandas por unidad de la pieza (radianes por unidad)
  escala?: number; // la unidad de la pieza (las esferas son de radio 1; las cápsulas, de px)
  dorso?: THREE.Vector3Tuple; // hacia dónde mira el lomo (más oscuro)
  rayasDir?: THREE.Vector3Tuple; // dónde se ven las rayas (se apagan hacia la barriga)
  rim?: string; // el color del borde de luz
  rimFuerza?: number;
  emite?: string; // un poco de luz propia (lo de dentro de la oreja, que la ventana atraviesa)
  emiteFuerza?: number;
  largo?: boolean; // la cola: las bandas van a lo largo del tubo
  terciopelo?: number; // el brillo de terciopelo de los bordes (en un tubo fino, si es mucho, lo tapa todo)
};

const pelos = new Map<string, THREE.MeshPhysicalMaterial>();
export const pelo = (o: OpPelo): THREE.MeshPhysicalMaterial => {
  const k = JSON.stringify(o);
  let m = pelos.get(k);
  if (m) return m;
  const base = new THREE.Color(o.color);
  m = new THREE.MeshPhysicalMaterial({
    color: base,
    roughness: 0.78,
    metalness: 0,
    sheen: o.terciopelo ?? 0.6,
    sheenRoughness: 0.45,
    sheenColor: base.clone().lerp(new THREE.Color('#FFE6C8'), 0.4),
    specularIntensity: 0.35,
    clearcoat: 0,
  });
  if (o.emite) {
    m.emissive = new THREE.Color(o.emite);
    m.emissiveIntensity = o.emiteFuerza ?? 0.4;
  }
  const rimC = new THREE.Color(o.rim ?? '#FFB45E').multiplyScalar(o.rimFuerza ?? 0.9);
  const uniforms = {
    uVientre: {value: new THREE.Color(o.vientre ?? o.color)},
    uRayaColor: {value: new THREE.Color(o.raya ?? o.color)},
    uEje: {value: new THREE.Vector3(...(o.eje ?? [0, 1, 0])).normalize()},
    uFreq: {value: o.freq ?? 9},
    uRayas: {value: o.rayas ?? 0},
    uEscala: {value: o.escala ?? 1},
    uDorsoDir: {value: new THREE.Vector3(...(o.dorso ?? [-0.45, 0.9, 0])).normalize()},
    uRayasDir: {value: new THREE.Vector3(...(o.rayasDir ?? [-0.5, 0.85, 0.15])).normalize()},
    uRimColor: {value: rimC},
    uRimDir: {value: new THREE.Vector3(0.75, 0.45, -0.25).normalize()},
    uRimPot: {value: 2.6},
  };
  if (o.largo) m.defines = {...m.defines, USA_LARGO: ''}; // sin pisar los suyos (PHYSICAL, STANDARD)
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLocal;\nvarying vec3 vNorm;\n#ifdef USA_LARGO\nattribute float aLargo;\nvarying float vLargo;\n#endif`)
      .replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>\nvNorm = normalize(transformedNormal);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvLocal = position;\n#ifdef USA_LARGO\nvLargo = aLargo;\n#endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_RUIDO}\n${GLSL_FUNCIONES}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec3 nW = normalize(vNorm);
          vec3 q = vLocal / uEscala;
          // el lomo más oscuro que la barriga, con el paso suave
          float dorso = smoothstep(-0.55, 0.55, dot(nW, uDorsoDir));
          vec3 col = mix(uVientre, diffuseColor.rgb, dorso);
          // las rayas: bandas a lo largo de su eje, torcidas por un ruido grande, con el borde suave, que se apagan hacia la barriga
          #ifdef USA_LARGO
          float coord = vLargo; // (la cola: en px a lo largo del tubo)
          #else
          float coord = dot(q, uEje);
          #endif
          float torcida = ruidoP(q * 2.3 + 7.1) * 2.0 - 1.0;
          float s = sin(coord * uFreq + torcida * 2.4);
          float ancho = 0.25 + 0.3 * ruidoP(q * 4.1 + 3.3);
          float banda = smoothstep(ancho, ancho + 0.45, s) * uRayas * smoothstep(-0.35, 0.45, dot(nW, uRayasDir));
          col = mix(col, uRayaColor, clamp(banda, 0.0, 1.0));
          // el grano del pelo, muy fino y estirado a lo largo de la pieza (las hebras): que no parezca plástico
          float g = ruidoP(q * 38.0) * 0.5 + ruidoP(vec3(q.x * 160.0, q.y * 22.0, q.z * 160.0)) * 0.5;
          col *= 0.92 + 0.16 * g;
          diffuseColor.rgb = col;
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          // el borde de luz: más fuerte en el lado de la ventana, y algo en todo el contorno (la luz que rodea el pelo)
          vec3 V = normalize(vViewPosition);
          float fres = pow(1.0 - clamp(dot(normal, V), 0.0, 1.0), uRimPot);
          float lado = clamp(dot(normal, uRimDir) * 0.5 + 0.5, 0.0, 1.0);
          totalEmissiveRadiance += uRimColor * fres * mix(0.18, 1.0, lado * lado);
        }`,
      );
  };
  m.customProgramCacheKey = () => (o.largo ? 'pelo-largo' : 'pelo');
  m.userData.uniforms = uniforms;
  pelos.set(k, m);
  return m;
};

// ---------------------------------------------------------------- el ojo: iris dorado en el centro y verde por fuera, con sus vetas, el aro
// oscuro y la PUPILA pintada dentro (rendija o redonda), todo girando hacia donde mira. Pintada y no de piezas: así nunca asoma por fuera.
let irisHecho: THREE.MeshPhysicalMaterial | null = null;
export const iris = (): THREE.MeshPhysicalMaterial => {
  if (irisHecho) return irisHecho;
  const m = new THREE.MeshPhysicalMaterial({color: '#ffffff', roughness: 0.35, metalness: 0, clearcoat: 0, specularIntensity: 0.3});
  const u = {
    uMira: {value: new THREE.Vector3(1, 0, 0)}, // hacia dónde mira (en el ojo: +x es de frente)
    uAncho: {value: 0.2}, // la mitad del ancho de la pupila (rendija ~0.08, redonda ~0.5)
    uAlto: {value: 0.62},
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLocal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvLocal = position;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLocal;\nuniform vec3 uMira;\nuniform float uAncho;\nuniform float uAlto;\n${GLSL_FUNCIONES}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec3 q = normalize(vLocal);
          vec3 p = normalize(uMira);
          float a = acos(clamp(dot(q, p), -1.0, 1.0)); // 0 donde mira
          vec3 h = normalize(cross(p, vec3(0.0, 1.0, 0.0)));
          vec3 v = cross(h, p);
          vec3 dq = q - p * dot(q, p);
          float giro = atan(dot(dq, v), dot(dq, h));
          vec3 centro = vec3(1.0, 0.84, 0.3);
          vec3 medio = vec3(0.6, 0.83, 0.2);
          vec3 fuera = vec3(0.14, 0.46, 0.18);
          vec3 col = mix(centro, medio, smoothstep(0.12, 0.5, a));
          col = mix(col, fuera, smoothstep(0.5, 0.92, a));
          float vetas = ruidoP(vec3(giro * 7.0, a * 3.0, 1.7)) * 0.6 + ruidoP(vec3(giro * 19.0, a * 6.0, 4.1)) * 0.4;
          col *= 0.8 + 0.4 * vetas;
          col = mix(col, vec3(0.04, 0.09, 0.05), smoothstep(0.95, 1.12, a));
          // la pupila: una elipse alrededor de donde mira, con el borde suave y un halo oscuro
          float e = length(vec2(dot(dq, h) / uAncho, dot(dq, v) / uAlto));
          col *= mix(0.55, 1.0, smoothstep(1.0, 1.35, e));
          col = mix(vec3(0.015, 0.015, 0.02), col, smoothstep(0.92, 1.0, e));
          diffuseColor.rgb = col;
        }`,
      );
  };
  m.customProgramCacheKey = () => 'iris-pelicula';
  m.userData.u = u;
  irisHecho = m;
  return m;
};

// ---------------------------------------------------------------- lo liso y brillante
const lisos = new Map<string, THREE.MeshPhysicalMaterial>();
type OpLiso = {rough?: number; capa?: number; capaRough?: number; metal?: number; emite?: string; fuerza?: number; sheen?: number; refleja?: number};
export const liso = (color: string, o: OpLiso = {}): THREE.MeshPhysicalMaterial => {
  const k = color + JSON.stringify(o);
  let m = lisos.get(k);
  if (m) return m;
  m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: o.rough ?? 0.5,
    metalness: o.metal ?? 0,
    clearcoat: o.capa ?? 0,
    clearcoatRoughness: o.capaRough ?? 0.08,
    sheen: o.sheen ?? 0,
    specularIntensity: 0.6,
  });
  if (o.emite) {
    m.emissive = new THREE.Color(o.emite);
    m.emissiveIntensity = o.fuerza ?? 1;
  }
  m.userData.refleja = o.refleja ?? 0;
  lisos.set(k, m);
  return m;
};
// todos los que llevan reflejos del entorno: [material, cuánto]
export const conReflejos = (): [THREE.MeshPhysicalMaterial, number][] => {
  const out: [THREE.MeshPhysicalMaterial, number][] = [];
  lisos.forEach((m) => {
    const r = m.userData.refleja as number;
    if (r > 0) out.push([m, r]);
  });
  return out;
};

// la córnea: una capa que solo SUMA reflejos y brillos encima del iris (negra, aditiva): el ojo mojado de las películas
let corneaHecha: THREE.MeshPhysicalMaterial | null = null;
export const cornea = (): THREE.MeshPhysicalMaterial => {
  if (corneaHecha) return corneaHecha;
  corneaHecha = new THREE.MeshPhysicalMaterial({
    color: '#000000', roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  corneaHecha.userData.refleja = 1.6;
  return corneaHecha;
};
