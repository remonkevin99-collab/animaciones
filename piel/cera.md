# 28 · Cera de colores
**En una frase:** el dibujo de un niño con ceras sobre papel blanco: la cera no cubre del todo y por dentro del color asoman los huecos blancos del relieve del papel, los rellenos son garabatos de ida y vuelta que se salen de la raya, los contornos tiemblan y van repasados dos veces, los colores son los de la caja, y todo va a 12 dibujos por segundo, cada uno un poco distinto.

## La piel (igual en cualquier escena)
- **Colores** (las ceras de la caja, `CERA` en `ceras.ts`; en el código van en `[r, g, b]`, aquí en hex):
  - `rojo` `#E22428` / `rojoOsc` `#96161E`, `azul` `#2256D2` / `azulOsc` `#18328C`, `celeste` `#68B6EE`, `amarillo` `#FCD216`, `verde` `#2EA83C` / `verdeOsc` `#187030` / `verdeClaro` `#8CCE46`, `naranja` `#F68416` / `naranjaOsc` `#CC5410`, `negro` `#241E24`, `marron` `#864E22` / `marronOsc` `#5C3016`, `cafe` `#603416`, `rosa` `#F478A8`, `morado` `#7E42BE`, `gris` `#80808A`, `crema` `#FFE292`, `piel` `#FCBA8C`.
  - El papel `PAPEL_COLOR` `#FFFDF5`, un blanco cálido con su relieve apenas sombreado.
  - Lo grande, apretando poco: la pared en celeste `#60B0EC` (alfa 0,4) y el suelo en `#FAB246` (alfa 0,5).
  - Cada cosa se repasa con el tono oscuro de su cera (lo rojo con `rojoOsc`, lo marrón con `marronOsc`); lo fino, en `negro`.
  - El gato, con sus ceras: `NARANJA` `#F78A18` (lejos `#E27012`), rayas `RAYA` `#C43E10`, contorno `TINTA` `#5C2812`, ojos `VERDE_OJO` `#68BE28`.
- **Letras:** sin fuente: la letra de niño está hecha a trazos de cera (`letras.ts`), así lleva el grano del papel y tiembla como todo. Cada letra de `LETRAS` es una caja de 1 de alto con su ancho `w`, sus trazos `t` (puntos de 0 a 1) y sus `puntos` (el de la «!»). `escribir` pone cada una de su tamaño (0,9–1,12 × `alto`), girada (± `torcido`), fuera de la línea (± `salta`) y de su color (`colores`), con `raya` repasada que tiembla un 2,2 % del alto, y devuelve el ancho que ocupó; `medir` da el ancho para centrar. Hay `A C G I M O R S T Y`, `¡ ! ¿ ?` y el espacio.
  - El título, «MI GATO», en el papel de arriba: en (56, 70), `alto` 106, `ancho` 17, cada letra de un color.
  - El «¡CRAS!», rojo, centrado en la estrella: `alto` 94 (crece con ella), `ancho` 21, `torcido` 0,16, `salta` 0,1, `separa` 0,18; con otra semilla en cada dibujo.
- **El trazo:**
  - **El grano:** el papel tiene relieve (`generarPapel`: ruido a 2,7, 5,2, 20 y 80 px, repartido de 0 a 1 por su histograma). La `alfa` de un trazo es la **presión**: la cera solo se queda donde la cresta del papel pasa el umbral de esa presión (`UMBRAL`, `granular`). Con alfa 1 cubre como mucho un 93 %; con 0,4, la mitad. Donde se amontona, sale un pelo más oscura.
  - **Las capas:** cada cosa se pinta aparte (`capa`), pasa por el papel y se pega. Si tapa lo de detrás (`tapar`), antes se pone papel limpio en su silueta: por sus huecos asoma el blanco, no lo de detrás. Dentro de una capa, `borrar` quita lo de debajo antes de colorear lo de delante.
  - `linea`: punta redonda y, desde 6 px, dos vetas al lado (40 % del ancho, 55 % de su alfa). `raya`: un punto cada 7 px, temblando por la normal (`tiembla`, 3 px) y repasada (80 % del ancho, 70 % de alfa). `contorno`: dos vueltas que no cierran justas, cada una empezando en otro sitio. `punto`: una espiral apretada.
  - Los rellenos: `garabato` va y vuelve en la dirección `ang`, cada `sep` px (± 20 %), se sale hasta `sobra` px y levanta la cera cada `tramo` pasadas. `colorear` = un garabato y, con `cruzado`, otro encima al 60 % y girado ~1 rad. Lo grande, `aManchas`: parches de garabato (`tam`), cada uno hacia su lado (± `giro`), que se pisan y dejan huecos.
- **El fondo y el escenario:** la hoja entera. Arriba, sin colorear, el título y el sol en la esquina (`SOL`, `R_SOL` 132) con su cara y seis rayos. Debajo, la pared celeste a manchas con el borde de arriba desigual (`techo`) y rodeando lo que cuelga; la ventana roja (`VENTANA`) con su cielo, su árbol, la nube que pasa y la repisa con su flor; el arcoíris colgado de un clavo (`CUADRO`, `CLAVO`); el reloj (`RELOJ`); la mesa de patas rectas; el suelo de tablas desde `PARED_FIN` (1558); la alfombra de cinco franjas con flecos; la planta; la pelota de playa; y el niño de palitos (`NINO`) que mira al gato.
- **Los rótulos y adornos fijos:** «MI GATO» y el sol con su cara, en el papel de arriba. Escribe ahí tu título.
- **El movimiento:** a doses: 12 dibujos por segundo (5 cuadros cada uno a 60), alineados para que uno caiga justo en el golpe: `paso` cuenta dibujos desde `T_SUELO` y `t` salta a `T_SUELO + paso / 12`. El trazo hierve de dos maneras:
  - Lo fijo, con tres dibujos que se repiten (`PASOS_HERVOR`): el mismo dibujo calcado otra vez con la mano un poco movida (`cp.hervor`, 2,4 px). Lo que se mueve y no es protagonista (el sol, la nube, el niño, el vapor) hierve igual.
  - El gato, la taza y el golpe se dibujan enteros otra vez en cada dibujo: otra semilla (`sem`, en un ciclo de 97), otros garabatos.
  - En el golpe, el dibujo entero tiembla con `temblor(t, T_SUELO, 0.3, 12, 5)`, también a doses.
- **El momento, paso a paso:**
  1. Antes: la taza roja con su corazón amarillo (`corazon`) y la raya de café arriba; el vapor, rayas grises `#8C8C96` que ondulan.
  2. A los 2,7 s la taza se va por el borde con tres rayitas de movimiento negras detrás. El café se sale como una raya marrón gorda (`pintarCafeAire`) con sus gotas en `punto`. A los 2,8 s el niño se lleva las manos a la cara y pone la boca en «o».
  3. A los 3,1 s, la estrella amarilla de 13 puntas (`estrella`, en `ESTRELLA_C` (782, 1262), 1,42 veces más ancha que alta): nace al 92 %, al dibujo siguiente se pasa al 114 % y al otro se queda (`tamEstrella`); garabato cruzado, contorno naranja de 10 px y el «¡CRAS!» dentro. Se va a los 4,7 s.
  4. El charco, un garabato café cruzado con su raya marrón oscura que crece; cada gota que cae deja su mancha. Los trozos, rojos y repasados en `rojoOsc`. Siete rayitas negras que se alejan durante 0,26 s, las gotas que saltan y el temblor.
  5. El niño salta 22 px durante 0,17 s con las manos arriba, la boca en «O», el pelo más de punta y rayitas de susto; a los 0,34 s, las manos a la cabeza.
  6. De 0,12 s después del golpe a los 4,3 s, la gota de sudor del gato (`sudor`, celeste con contorno azul) que resbala 18 px junto a la cabeza: «yo no fui».

## Dónde está en el código
Todo en `src/estilos/pintados/cera/` (la composición `cera`); las ayudas en `src/comun/curvas.ts` (`E`, `clamp`, `kf`, `mix`, `rng`, `ruido`, `temblor`).
- **Piel (se reutiliza tal cual):**
  - `ceras.ts`, entero, que no depende de la escena: `CERA` y `css`; el papel (`generarPapel`, `UMBRAL`, `granular`, `pintarPapel`); `lienzo` y `capa`; los trazos (`tiembla`, `linea`, `raya`, `contorno`, `punto`); las formas (`formaElipse`, `formaCirculo`, `formaCapsula`, `formaPoli`, `formaCinta`, `unir`, `bordeUnion`, `trazarFormas`, `borrar`, `repasar`); y los rellenos (`garabato`, `aManchas`, `colorear`).
  - `letras.ts`, entero: `LETRAS`, `escribir`, `medir`.
  - `CeraDeColores.tsx`: `PASOS_HERVOR`, `FIJO` y `fijo`, el armazón de `pintar` (`paso`, `t`, `hervor`, `sem`, el temblor y el orden de las capas) y el componente `CeraDeColores`; del golpe, `mancha`, `estrella` y `tamEstrella`.
  - `decorado.ts`: `formaRect`, `banda` (un relleno grande sin borde) y `techo` (el borde desigual de lo coloreado).
- **Lo del gato y la taza (se rehace):** `gato.ts` entero (sus colores, `formasGato`, `siluetaGato` y `pintarGato`); en `CeraDeColores.tsx`, `corazon`, `formasTaza`, `taparTaza`, `pintarTaza`, `pintarCafeAire`, `ESTRELLA_C`, `sudor`, `formasGolpe`, `pintarGolpe` y `O_GATO`; en `decorado.ts`, el cuarto y el niño (las medidas de `VENTANA` a `NINO`, `colina`, `pintarFijo`, `SOL`, `nubeFormas`, `nino`, `ninoFormas`, `taparVivo` y `pintarVivo`). Lo que pasa sale de `src/estilos/gato/escena.ts`.
- **Cómo se pinta en `<canvas>`:** `CeraDeColores` pinta su `<canvas>` en un `useLayoutEffect` con cada `t`, todo seguido y sin nada que cargar: no hace falta `delayRender`. Guarda tres lienzos en el módulo: el relieve del papel (`PAPEL`, uno por tamaño), la capa donde se pinta cada cosa (`CAPA`) y lo fijo (`FIJO`, tres dibujos por tamaño). Los primeros cuadros de cada proceso del render tardan más: hacen el relieve (cuatro escalas de ruido sobre todo el lienzo) y los tres dibujos de lo fijo. Después, cada cuadro pasa sus cuatro capas por el papel píxel a píxel (`getImageData`, solo en su caja).
- **La resolución:** el lienzo va como mucho a 1080 × 1920 (`k` = la densidad de la pantalla, entre 0,25 y 1), también al sacarlo en 4K: ahí se estira y sale algo más blando. El relieve se mide en píxeles del mundo, así el grano se ve igual a cualquier `k`.

## Pintar tu escena en este estilo
1. Copia la carpeta entera `src/estilos/pintados/cera/` a `src/estilos/<tu-escena>/cera/`: con la misma profundidad, `../../../comun/curvas` sigue valiendo. `ceras.ts` y `letras.ts` solo toman geometría de `../../gato/escena` (`rot`, `suma`, `resta`, `P`, `Elipse`) y pueden seguir así; lo que pasa (`gato`, `taza`, `piezasTaza`, `cafe`, `trozos`, `vapor`, `DUR`, `T_CAE`, `T_SUELO`, `IMPACTO`, `SUELO`, `MESA_Y`, `MESA_G`, `BORDE`, `ESCALA_GATO`, `enMundo`), de tu `src/estilos/<tu-escena>/escena.ts` (`../escena`).
2. Deja enteros `ceras.ts`, `letras.ts` y el armazón: el componente con su `<canvas>`, `k` y `useLayoutEffect`; `fijo`; `PASOS_HERVOR`; y `pintar`, con tu segundo del golpe en lugar de `T_SUELO` (en `paso`, en `t` y en el temblor).
3. Tu cuarto, en `pintarFijo`: lo grande con `aManchas` y poca presión (alfa 0,4–0,5), rodeando lo que cuelga con una función como `hueco`; cada cosa con `borrar` → `colorear` → `repasar` (o `contorno`) en el tono oscuro de su cera; lo fino con `raya` y `punto`. Deja papel sin colorear arriba y escribe ahí tu título con `escribir`.
4. Lo que se mueve y no es protagonista (un sol, una nube, alguien que mira), en `pintarVivo`, con `cp.hervor` y semillas fijas; su silueta, en `taparVivo`.
5. Tu personaje, como `pintarGato`: sus formas (`formaElipse`, `formaCapsula`, `formaCinta`, `formaPoli`, juntas con `unir`) y, de atrás adelante, cada parte `borrar` → `colorear` → sus rayas → `repasar`; los ojos, papel con el iris y la pupila recortados y el brillo borrado. Su silueta, para el `tapar` de su capa; si se pinta dentro de una transformación (el gato va 1,14 veces más grande), pásale a la capa `aMundo`.
6. Tu momento, como `pintarGolpe`: la estrella con tu palabra (`estrella`, `tamEstrella`, `escribir` centrado con `medir`), el charco (`mancha` + `colorear` cruzado + `contorno`), los trozos repasados, las rayitas, las gotas en `punto` y el temblor; sus formas en `formasGolpe`, para el `tapar`.
7. Registra tu componente `({t}) => …` como una composición más en `src/Root.tsx` (1080 × 1920, 60 fps).

**Errores fáciles:**
- Un color en hex (`'#E22428'`): `css` lee `[r, g, b]` y sale casi negro.
- Algo que se mueve en `pintarFijo`: se queda congelado (`FIJO` guarda los tres dibujos). Va en `pintarVivo` o en su capa.
- Pintar con el canvas a pelo (`fillRect`, `arc`, `fill`) en una capa: no marca la caja, y lo que caiga fuera de lo ya marcado no sale. Y lo que no pasa por `capa` sale liso, sin grano.
- Una capa de delante sin `tapar`: por los huecos de la cera se ve lo de detrás y el personaje parece de cristal. Dentro de la misma capa, `borrar` antes de colorear lo de delante.
- `t` sin escalonar: sale suave a 60 y deja de parecer a mano. Semillas fijas en lo protagonista: no hierve; semillas que cambian con el cuadro y no con `paso`: hierve 60 veces por segundo.
- Una letra que no está en `LETRAS` sale en blanco, como un espacio: añádela con su `w`, sus trazos y sus puntos.
- Bajar la alfa para aclarar: la alfa es la presión y solo deja más huecos. Para más claro, otra cera.
- Subir el tope del lienzo (`Math.min(1, …)`) para un 4K más nítido: el relieve y cada capa cuestan cuatro veces más.
- Añadir una imagen o una letra que se carga: el `useLayoutEffect` no la espera; hace falta `delayRender` y `continueRender`.
- Los lienzos guardados son del módulo: dos escenas que pintan a la vez con la misma carpeta comparten lo fijo. Cada escena, su copia.
