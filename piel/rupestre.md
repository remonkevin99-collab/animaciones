# 24 · Pintura rupestre
**En una frase:** la escena pintada en la pared de una cueva y alumbrada por una antorcha: ocres soplados y carbón a dedo que se meten en los poros de la roca y se rompen en motas por los bordes, un relieve de verdad que se mueve con la llama, y lo que se mueve pintado a 12 pasos por segundo y dejando su rastro, como los animales de las cuevas.

## La piel (igual en cualquier escena)
- **La técnica (lo que lo hace todo): se pinta en un lienzo y se pone sobre la piedra.**
  - Todo va en `<canvas>` 2D, no en SVG. Cada cuadro tiene tres tiempos: (1) en el lienzo de pintura (`EST.pig`) va solo el pigmento, sin piedra; (2) `iluminar()` lo pone sobre la roca píxel a píxel y lo alumbra con la antorcha, y encima se pinta la antorcha (`EST.fin`); (3) eso va a la pantalla con el temblor.
  - Lo que cubre el pigmento sale de su alfa, `(alfa − 0,46 × grano + 0,1) / 0,55`, por `cubre` (entero en los poros y las grietas, menos en las crestas): un borde difuminado se rompe en motas con el grano y, donde la mano cargó, la piedra apenas asoma. El color se tiñe con lo clara que es la roca ahí (`0,55 + 0,45 × lum / 128`).
- **Colores** (en `pigmento.ts`, los pigmentos de las cuevas):
  - `OCRE_ROJO` `#ad3c20`, `OCRE_ROJO_OSCURO` `#7a2414`, `OCRE_NARANJA` `#bf5e26`, `OCRE_AMARILLO` `#d39a3a`, `CARBON` `#17110e`, `CAOLIN` `#f4efe2` (el blanco) y `OCRE_MARRON` `#552a10` (el café). Una mano en negativo va en `#bd4526`; la mesa, en carbón gris `#2a2420`.
  - La roca (en `roca.ts`, en RGB): la caliza va de `#D8C6A8` a `#C4A884` por zonas, con zonas grises `#B8B4AC` y oscuras `#8A7864`, manchas de óxido de hierro `#B26C48` y de manganeso `#403630`, vetas de calcita `#F0E9D6`, el hollín de la antorcha `#221C19` y el suelo de tierra `#765C46`.
  - La antorcha tiñe todo de naranja (rojo × 1,02, verde × 0,75, azul × 0,5); lo que no le llega queda en el ambiente (0,24).
  - La antorcha: el palo de `#7a4a26` a `#24150c`, la cabeza `#2a1a10` con sus ataduras `#120a06`, y la llama de fuera adentro: `rgba(255,90,20,0.5)`, `rgba(255,160,45,0.72)` y `rgba(255,236,170,0.92)`.
- **Letras:** ninguna. La pared no lleva texto ni rótulos.
- **El trazo:**
  - Cada cosa es una `capa`: lo que pinta su `forma`, difuminado `radio` px y volcado con su opacidad, solo dentro de su `caja`. Dos maneras: `soplar` (a media resolución, `e` 0,5, radio 9 por defecto: el relleno de ocre, ancho y blando) y `fino` (a resolución completa, radio 1,4: el carbón a dedo y los contornos).
  - La presión de la mano (`presion: {min, semilla}`): un velo de ruido (`velo`, 700 × 1200, hecho una vez) que deja el pigmento más cargado en unos sitios y más flojo en otros; `min` es lo que queda donde menos aprieta (0,25–0,72).
  - Las líneas, con `trazoVivo` (cápsulas seguidas de grosor variable, `w(s)`) sobre curvas pasadas por `remuestrea` y `suave`. Contornos de carbón de 8–12 px que respiran; las rayas, gordas en medio y en punta por los dos lados.
  - El contorno de lo que se mueve va **por fuera**: se traza al doble y se le quita el relleno (`contornoFuera`), así no se come el ocre.
  - `nube` sopla un color alrededor de un punto (manchas redondas que se solapan): sombras, el lomo más rojo, la tripa clara.
- **El fondo y el escenario:** la pared es de verdad (`roca()`, hecha una vez y guardada): grandes ondulaciones, bultos redondeados, dos redes de grietas que serpentean, poros, zonas lisas y ásperas. Arriba, el techo con su labio y tres estalactitas (`ESTALACTITAS`, en x 150, 470 y 1000), más oscuro; abajo, el suelo de la cueva (`bordeSuelo`, hacia y 1828) con 26 guijarros. Sobre la antorcha (`ANTORCHA` = [968, 592]), una pluma de hollín que sube hasta el techo. Por los bordes la pared se curva y se aleja (`vin`, más oscura). La luz es rasante (`z` 200, `KR` 0,58): saca cada bulto y cada bulto arroja su sombra 6 px hacia el lado contrario; cae con la distancia (`R` 590) y por debajo de la llama llega más lejos (`abajo` 0,58).
- **Los rótulos y adornos fijos:** lo pintado de antes en la pared (`decoradoFijo`): un bisonte rojo grande y desvaído, debajo de todo; dos manos en negativo, una roja arriba a la izquierda y otra de carbón abajo; un caballito amarillo con el lomo rojo y la tripa clara sobre un bulto de la roca (`BULTO_CABALLO` = [700, 268]), con su fila de puntos rojos; un ciervo pequeño abajo; filas de puntos rojos, seis rayas de carbón, una columna de puntos a la derecha, un arco de puntos amarillos y un signo en escalera arriba. Y la antorcha, lo único que no está pintado: el palo metido en una grieta, con su sombra, la cabeza de fibras con 14 brasas, el resplandor (300 px), la llama en tres capas de lenguas que se mecen (5 naranjas, 4 amarillas y 1 casi blanca) y nueve chispas que suben.
- **El movimiento:**
  - Lo pintado, a pasos: 12 por segundo (`FPS_PINTA`), con la rejilla puesta en el golpe (`pasoDe`: el paso 0 cae justo en `T_SUELO`). En cada paso cambia la semilla de la presión del personaje (`sm = paso % 9`): tiembla lo hecho a mano, 12 veces por segundo, en un ciclo de 9.
  - El rastro: lo que se mueve se repinta en los 3 pasos de antes, cada vez más flojo (0,62, 0,4 y 0,24), solo si se ha movido (la mano, más de 9 px; la punta de la cola, más de 8).
  - La luz, fluida a 60: la llama parpadea (`parpadeo`: dos ruidos y un seno, hasta un 14 % arriba o abajo) y se mece (la luz se corre ±7 px de lado y ±9 de alto), y con ella se mueve el relieve de toda la pared. Lo pintado de la pared no tiembla: se pinta una vez.
- **El momento:**
  1. El empujón (2,38–2,7 s): la pata va a pasos y deja detrás sus pasos de antes en ocre flojo con su contorno. El vapor son hilos de carbón que ondulan.
  2. La caída (2,7–3,1 s): la vasija gira por el borde y vuela girando, y deja su rastro en el aire: hasta 3 pasos de antes (0,85, 0,6 y 0,38), sin decoración y con el contorno más fino. Las gotas de café salen en arco en ocre marrón soplado y se quedan como manchas donde caen.
  3. El golpe (3,1 s), en su paso: la vasija desaparece (su rastro sigue 0,2 s más, al 70 %). Una mancha ancha de ocre marrón se abre pegada al suelo de un paso al siguiente; 78 gotas (`SALPICA`) salen en abanico hacia arriba y a los lados, hasta 470 px, y se quedan pegadas a la roca alargadas hacia donde iban. Alrededor, 9 rayas de carbón de 13 px que se alejan de 110 a 170 px y se acortan durante 0,42 s (6 pasos), apagándose a la mitad. Saltan 6 trozos de barro con su contorno de carbón, y el charco se abre en 0,5 s.
  4. Lo fluido del golpe: la antorcha da un 10 % más de luz que se apaga en 0,25 s, la pared tiembla (`temblor(t, T_SUELO, 0.3, 10, 6)`) y da un empujón hacia dentro del 3 % que vuelve en 0,3 s (tapa los bordes al temblar). Del charco suben hilos de carbón.

## Dónde está en el código
Todo en `src/estilos/pintados/rupestre/` (la entrada, `PinturaRupestre.tsx`); las ayudas en `src/comun/curvas.ts` (`E`, `clamp`, `mix`, `rng`, `ruido`, `temblor`) y `capsula` en `src/estilos/formas.ts`.
- **Piel (se reutiliza tal cual):**
  - `roca.ts`, entero: `W`, `H`, `perlin`, `fbm`, `ESTALACTITAS`, `bordeTecho`, `bordeSuelo`, `BULTO_CABALLO`, `ANTORCHA`, `Roca`, `roca`, `Luz` e `iluminar`. No mira la escena.
  - `antorcha.ts`, entero: `parpadeo`, `luzDe` (con `golpe` de 0 a 1) y `pintarAntorcha`.
  - `pigmento.ts`, entero: los siete colores, `lienzo`, `ctx`, `cajaDe`, `capa` (con su `POOL` de lienzos de trabajo y `velo`), `soplar`, `fino`, `trazoVivo`, `remuestrea`, `suave`, `camino`, `nube` y `mano`. De la escena solo toma el tipo `P`.
  - `decorado.ts`: `decoradoFijo` (pintado una vez y guardado en `FIJO`), `temblon`, `enDibujo`, `contorno`, `manoNegativa`, `puntos` y `rayas`; y los dibujos de la pared: `BISONTE` y `BISONTE_LINEAS`, `CABALLO` (`CABALLO_PIERNA_LEJOS`, `CABALLO_CRIN`, `CABALLO_COLA`) y `CIERVO` (`CIERVO_PIERNA_LEJOS`, `CIERVO_CUERNA`).
  - `PinturaRupestre.tsx`: `FPS_PINTA`, `pasoDe`, `tDePaso`, `EST`, los tres tiempos de `pintarCuadro` (el golpe de luz, el temblor y el empujón) y el componente con su `<canvas>` y su `dpr`.
- **Lo del gato y la taza (se rehace):**
  - `gato.ts`, entero: `M_GATO`, `enGato`, `CAJA_GATO`, las formas (`formasPata`, `formasCuerpo`, `formasCabeza`, `formasOrejas`, `formaCola`, `silueta`), `rastroGato` y `pintarGato`. Sirven de modelo `contornoFuera` y el orden de `pintarGato`: relleno soplado, manchas, rayas a dedo, contorno, cara.
  - `vasija.ts`, entero: `PERFIL`, `ASA`, `enTaza`, `formaVasija`, `pintarVasija`, `pintarCafe`, `SALPICA`, `pintarSalpicadura`, `pintarGolpe`, `pintarTrozos` y `pintarVapor`. Las tres del golpe sirven de modelo para cualquier cosa que se rompe o se derrama.
  - En `decorado.ts`, la mesa y el suelo de esta escena: `LOSA`, `PIEDRA_IZQ`, `PIEDRA_DER`, `SUELO_PTS`, las grietas de la losa y los trazos rojos que llegan a ella.
  - En `pintarCuadro`, el bloque del rastro de la vasija y las llamadas con `gato`, `taza`, `T_CAE` y `T_SUELO`. Lo que pasa sale de `src/estilos/gato/escena.ts`.

## Pintar tu escena en este estilo
1. Copia la carpeta entera `src/estilos/pintados/rupestre/` a `src/estilos/<tu-escena>/rupestre/` (la misma profundidad: `../../../comun/curvas` y `../../formas` siguen valiendo). Lo de la escena (`DUR`, el segundo de tu golpe, tus personajes y tus medidas, como `MESA_Y`, `BORDE` y `SUELO`) sale de tu `src/estilos/<tu-escena>/escena.ts` (`../escena`); el tipo `P` y lo que es solo geometría pueden seguir viniendo de `../../gato/escena`. `roca.ts` y `antorcha.ts` no se tocan.
2. La cueva: deja `roca()`. Si tu luz va en otro sitio, mueve `ANTORCHA`: la llama, el hollín y la luz la siguen. Lo importante, cerca de la llama: lo que queda lejos se ve oscuro.
3. Lo que no se mueve, en `decoradoFijo()`: tus muebles soplados con `soplar(c, caja, forma, radio, alfa, {min, semilla})` y su contorno con `fino` y `contorno` en `CARBON`, de 8 a 12 px. Deja los animales, las manos y los puntos, o pon tus dibujos como listas de puntos con `enDibujo` → `suave` → `camino`. Se pinta una vez.
4. Lo que se mueve, en el tiempo (1) de `pintarCuadro`, siempre con `ts` (el tiempo a pasos): el relleno con `soplar` en ocres, las manchas con `nube`, las rayas con `fino` y `trazoVivo`, y el contorno por fuera. Suma el paso a la semilla de la presión (como `sm` en `pintarGato`) para que tiemble. El rastro, como `rastroGato`: tus piezas en `tDePaso(n − k)`, k = 1…3, más flojas.
5. Tu momento: pon el segundo de tu golpe en lugar de `T_SUELO` en `pasoDe` y en el temblor. Lo que se derrama, en `OCRE_MARRON` (o el ocre que toque) que se pega a la roca (`pintarSalpicadura`); rayas de carbón alrededor (`pintarGolpe`); los trozos, soplados con su contorno; y en `luzDe(t, golpe)`, el golpe de luz.
6. El orden del tiempo (1): `decoradoFijo()` → salpicadura → rayas del golpe → vapor → rastros → tu objeto → tu personaje → lo derramado → trozos. Después `iluminar`, `pintarAntorcha` y a la pantalla. Registra el componente `({t}) => …` como una composición más en `src/Root.tsx` (1080 × 1920, 60 fps).

**Lo que tarda y lo que pesa:** la roca se calcula la primera vez que se pinta un cuadro, píxel a píxel: algo más de medio segundo en un Mac reciente, con la pantalla parada mientras tanto. Ocupa unos 60 MB (30 bytes por píxel), más los lienzos (unos 8 MB cada uno a tamaño completo). Después, cada cuadro la vuelve a alumbrar entera (`iluminar`: unos 30 ms solo esa parte). Si sacas el vídeo con varias pestañas a la vez, cada una hace su roca.

**El límite de resolución:** todo se pinta a 1080 × 1920 (`W`, `H`). El lienzo de la pantalla sí crece con `dpr` (de 0,25 a 2), pero en 4K el cuadro sale ampliado del de 1080: no gana detalle.

**Errores fáciles:**
- Pintar algo en `EST.fin` (después de `iluminar`) en vez de en el lienzo de pintura: sale encima de la piedra como una pegatina, sin poros y sin la luz de la antorcha. Ahí solo va la antorcha.
- Animar lo pintado con `t`: sale fluido y deja de parecer pintado a pasos. Con `ts`; la luz y el temblor, con `t`.
- Pintar sin `soplar` ni `fino` (con el contexto a pelo): el borde sale de vector, sin motas, porque las motas nacen del difuminado.
- Una caja pequeña: `capa` solo pinta dentro de su `caja` (más el margen del difuminado) y corta lo demás. Por eso `CAJA_GATO` es holgada: el gato se inclina para asomarse.
- Rehacer el decorado o la roca en cada cuadro: van guardados (`FIJO`, `ROCA`) y se hacen una sola vez; lo que cambia en cada cuadro va en el tiempo (1).
- Un color claro esperando que salga claro: todo pasa por la luz de la antorcha, que tiñe de naranja y oscurece con la distancia. El blanco es `CAOLIN`, y cerca de la llama.
