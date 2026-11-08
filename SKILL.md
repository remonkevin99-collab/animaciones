---
name: animaciones
description: Anima una escena en uno de 10 estilos con su código exacto (holograma, neón cyberpunk, papel recortado, isométrico, plano azul, cámara térmica, anime, Matrix, acuarela y plastilina). Úsala cuando la persona escriba /animaciones, pida uno de estos estilos, quiera ver el gato que tira la taza en un estilo o quiera pintar su propia escena (su producto, su mascota, su negocio) en uno de ellos.
argument-hint: "[estilo] [tu escena]"
---

# 10 estilos de animación

Un proyecto de Remotion (React y SVG; la plastilina, en Three.js) con 10 estilos que pintan **la misma escena**: un gato mira
la taza, te mira, la empuja y a los 2,7 s la taza cae y se rompe. Cada estilo es una **piel**: el papel, los colores, el trazo,
las letras, los rótulos y cómo cuenta el golpe. El código de cada estilo es el exacto del vídeo, así que no hay que inventar
nada: se copia la piel y se cambia lo que pasa.

**La carpeta de esta skill** es la que sale arriba como «Base directory». Aquí la llamamos `SKILL_DIR`.

## Antes de nada (una vez por conversación)

1. `node --version` tiene que dar 18 o más. Si no hay Node, instálalo y vuelve a comprobar:
   - Mac: `brew install node` (o el instalador de https://nodejs.org, versión LTS).
   - Windows: `winget install OpenJS.NodeJS.LTS` (después, cierra y abre la terminal).
2. Si en `SKILL_DIR` no está `node_modules`, corre `npm install` ahí (unos 20 s).
3. La primera vez que sacas un vídeo, Remotion baja su navegador (unos 100 MB) solo. Dile a la persona que espere.

## Los 10 estilos

| Nº | Estilo | Para sacarlo | Su piel | Su código |
|---|---|---|---|---|
| 1 | Holograma | `holograma` | `piel/holograma.md` | `src/estilos/gato/Holograma.tsx` |
| 2 | Neón cyberpunk | `neon` | `piel/neon.md` | `src/estilos/gato/Neon.tsx` |
| 3 | Papel recortado | `papel` | `piel/papel.md` | `src/estilos/gato/Papel.tsx` (+ `PapelGato`, `PapelCocina`, `PapelTintas`, `PapelCorte`, `../PapelGeo`) |
| 4 | Isométrico | `isometrico` | `piel/isometrico.md` | `src/estilos/gato/Isometrico.tsx` (+ `../IsometricoMotor`) |
| 5 | Plano azul | `plano-azul` | `piel/plano-azul.md` | `src/estilos/gato/PlanoAzul.tsx` |
| 6 | Cámara térmica | `termica` | `piel/termica.md` | `src/estilos/gato/Termica.tsx` |
| 7 | Anime | `anime` | `piel/anime.md` | `src/estilos/gato/Anime.tsx` (+ `AnimeGato`, `AnimeCocina`, `../AnimeCel`) |
| 8 | Matrix (arte ASCII) | `matrix` | `piel/matrix.md` | `src/estilos/gato/Ascii.tsx` (+ `AsciiMotor`) |
| 9 | Acuarela | `acuarela` | `piel/acuarela.md` | `src/estilos/gato/Acuarela.tsx` |
| 10 | Plastilina (3D) | `plastilina` | `piel/plastilina.md` | `src/estilos/gato/Plastilina.tsx` (+ `PlastilinaGato`, `PlastilinaCocina`, `PlastilinaTaza`, `../PlastilinaArcilla`) |

Lo que pasa en la escena, sin estilo: `src/estilos/gato/escena.ts`. Las ayudas de movimiento: `src/comun/curvas.ts`.
Los nombres valen con tilde o sin ella y en mayúsculas o minúsculas («Neón» = `neon`, «Matrix» = `matrix`).

## A · El gato en un estilo (`/animaciones plano azul`)

Desde `SKILL_DIR`, y el vídeo a la carpeta donde está trabajando la persona (su carpeta actual, no la de la skill):

```
npx remotion render src/index.ts plano-azul "<su carpeta>/gato-plano-azul.mp4"
```

- Son 6 s en vertical, 1080 × 1920 y 60 cuadros por segundo. Sale igual que en el vídeo.
- Para verlo rápido: `--scale=0.5`. En 4K: `--scale=2`.
- Para mirar un cuadro antes: `npx remotion still src/index.ts plano-azul "<su carpeta>/foto.png" --frame=190` (el golpe es
  hacia el cuadro 190).
- Para verlo en vivo y tocarlo: `npx remotion studio src/index.ts`.

## B · Su escena en un estilo (`/animaciones neón: mi perro robando un calcetín`)

1. **Lo que falta, en UN mensaje.** Qué pasa (quién, qué hace y **el momento**: el golpe, la sorpresa, lo que se quiere ver
   pasar), cuánto dura (6 s si no dice) y el estilo. Si no da un momento, propónle uno: cada estilo tiene su forma de contarlo.
2. **Lee la ficha del estilo entera** (`piel/<estilo>.md`) y después su código. La piel se copia tal cual: los colores, los
   filtros, el fondo, el trazo, las letras, los rótulos y el ritmo. No la reinventes: es lo que hace que se vea igual que el vídeo.
3. **Su proyecto, en su carpeta.** Crea `<su carpeta>/<nombre-corto>/` y copia ahí desde `SKILL_DIR`: `package.json`,
   `tsconfig.json`, `remotion.config.ts` y la carpeta `src/` entera. Corre `npm install` dentro. Así su trabajo queda en su
   carpeta y la skill no se toca.
4. **La escena, aparte del estilo**, como el gato, en una carpeta hermana de `gato/`: `src/estilos/<su-escena>/`.
   - `escena.ts`: lo que pasa (las piezas y sus posiciones en 1080 × 1920, todo calculado del tiempo `t`), como
     `src/estilos/gato/escena.ts`.
   - `<Estilo>.tsx`: **una copia del archivo del estilo** (y de sus ayudantes de `gato/`, si los tiene) donde se conserva la piel
     y se cambian el gato, la taza y la cocina por sus cosas, dibujadas con las mismas ayudas (los mismos trazos, filtros y
     materiales de la ficha).
   - Los imports: `../../comun/curvas`, `../formas` y `../camara3d` siguen valiendo (misma profundidad); las ayudas de geometría
     que el estilo tomaba de `./escena` del gato (`poli`, `curva`, `elipse`, `rot`, `suma`…) se importan de `../gato/escena`.
   - En `src/Root.tsx`, una composición nueva con su nombre. El `Estilo` que ya está solo pinta los del gato: la suya va con su
     propio envoltorio, que le pasa el segundo `t`:
     ```tsx
     const MiEscena: React.FC = () => {
       const frame = useCurrentFrame();
       const {fps} = useVideoConfig();
       return <AbsoluteFill style={{background: '#000'}}><PlanoAzulMovil t={frame / fps} /></AbsoluteFill>;
     };
     // y dentro de Root:
     <Composition id="movil-plano-azul" component={MiEscena} width={1080} height={1920} fps={60} durationInFrames={360} />
     ```
   - **Dónde cabe su escena:** cada estilo tiene sitios ocupados (la cabecera, las cajas de abajo, el medidor, el visor…; la
     ficha dice dónde). Dibuja lo suyo en el hueco que dejan, no encima.
   - **Si su objeto de lado no se lee** (un móvil, una carta, una tarjeta), dibújalo de frente o en dos vistas, como un plano:
     de lado para el movimiento y de frente para lo que se tiene que leer.
5. **Primero una foto**, en el segundo del momento: míralo tú antes de enseñárselo. Si en ese momento se escribe un texto,
   sácala 0,3 s después de que termine (si no, sale cortado y parece un error que no es). Después el vídeo en baja (`--scale=0.5`) y,
   cuando le guste, el final.
6. **Los retoques, con sus palabras** («más lento», «el perro más grande», «más brillo»).

Para ahorrar cuota: un estilo cada vez (si quiere los 10, el segundo cuando el primero esté aprobado), no reescribas lo que ya
funciona y no leas los 10 estilos para hacer uno.

## Reglas

- **El mismo segundo da siempre el mismo cuadro:** todo sale de `t`. Nada de `Math.random()`: `rng(semilla)` de `curvas.ts`.
- **En vertical, 1080 × 1920.** Lo importante, entre x 60 y x 1020: al tocar un Reel, Instagram corta los lados.
- **La plastilina** necesita `--gl=angle`, que ya va en `remotion.config.ts`.
- **Las letras** vienen de Google Fonts: la primera vez hace falta internet.
- Los ids de los filtros SVG tienen que ser únicos en la página: si se pintan dos estilos a la vez, cada uno con los suyos.

## Si algo falla

- «Cannot find module»: falta `npm install` en esa carpeta.
- La plastilina sale negra o vacía: que no falte `Config.setChromiumOpenGlRenderer('angle')` en `remotion.config.ts`.
- Algo sale cortado en el neón o el holograma: sus filtros cubren una zona fija (lo dice su ficha); agrándala si lo nuevo se sale.
