# 27 · Sombras chinescas
**En una frase:** la escena hecha teatrillo de sombras: marionetas de cartón negro pegadas a una pantalla de papel que alumbra un candil por detrás, con sus piezas, sus remaches, sus calados con papel de color y las varillas que las sujetan desde abajo; lo que se despega de la pantalla crece y se desenfoca, y alrededor, el teatrillo de madera a oscuras y las cabezas de dos niños mirando.

## La piel (igual en cualquier escena)
- **La técnica: cada cosa se pinta dos veces, y todo en un `<canvas>` 2D, no en SVG.**
  - Su silueta, en negro y con su alfa, en el lienzo de la sombra (`EST.sombra`, `S`); su papel de color, en el lienzo de la luz (`EST.luz`, `F`). El color solo se ve donde la silueta está calada: `calar` borra con `destination-out` y por ese hueco pasa la luz.
  - Cuatro tiempos por cuadro: (1) la luz y los papeles en `F`, las siluetas en `S`; (2) la sombra sobre la luz al 0,965, recortada a la pantalla (`PANT`), y el papel multiplicado encima; (3) en `EST.sal`, el teatrillo, el público, el resplandor y el polvo alrededor; (4) a la pantalla, con el temblor.
  - Lo lejos de la pantalla, más blando: el decorado, 1,3 px y al 82 %; el farolillo, 1,8 px y al 90 %; los títeres, nítidos.
- **Colores:**
  - La luz (`PARADAS`, en `luz.ts`), del centro al borde: `#FFFCF0`, `#FFF3CC`, `#FFDA88`, `#FFB046`, `#F67C20`, `#C44610` y `#601806`, multiplicados por el brillo `k` de cada cuadro (`rgb` satura en blanco). La llama, casi blanca (`#FFFAE8`, `#FFF6DC`).
  - Los papeles del gato (`gato.ts`): `NARANJA` `#FF8014` (rayas y la «M»), `LIMA` `#BEF528` (ojos), `ROSA` `#FF466E` (orejas y nariz), `ROJO` `#EC1A22` (roseta y collar) y `ORO` `#FFCE28` (el cascabel), del 86 al 90 %.
  - El decorado: la ventana de `#16268A` a `#4678E2`, las ventanitas `#FFD63C`, el tulipán `#E81E28`, las hojas `#28BE50` y el farolillo de `#FF7828` a `#AA1018`. La taza: la flor `#F01E24` y la cenefa `#FFDC32`. El café, `#B04C14`. El letrero: `#FFD81E` y el filete `#F0221E`.
  - El teatrillo (`teatro.ts`): madera `#2E170B`, `ORO` `#C8902E` y `ORO_OSC` `#6E4512`, las cortinas `#4A070A`, el bambalinón de `#2A0306` a `#6A0B10` y lo que enciende la pantalla, de `#FF5C28` a `#FFD682`. El público, `#080302` con el borde `#FF8034`.
- **Letras:** ninguna fuente: no carga letras ni espera a nada. El «¡CRAS!» se dibuja a mano en `letras()`: trazos de 13 px con punta redonda, calados en una estrella de cartón con papel amarillo detrás.
- **El trazo (las marionetas):**
  - Cartón negro opaco y nítido (`rellena`, que acepta los `d` de SVG). Cada pieza en su lienzo (`CAPAS`: `atras`, `pata`, `cabeza`), juntadas en `todo`; al lamerse, la pata pasa delante de la cabeza.
  - Las juntas (`junta`): una rendija en arco de 2,6 px donde una pieza pisa a la otra (el codo, el hombro, la cola en tres piezas, el borde de la cabeza). Los remaches (`remache`): una arandela calada de 2 px y el clavo, de 4,5 a 6,5 px de radio.
  - Lo calado, con su papel detrás: las rayas en forma de hoja (`lente`), la roseta de seis pétalos, la «M» de la frente, los ojos con la pupila negra y el brillo en hueco (cerrados, una rendija de 5 px), las orejas, la nariz, la boca y el collar. Los bigotes, de alambre (2,8 px).
  - Las varillas (`varilla`), en ocho tramos: nítidas y finas donde se agarran (3,6 px, con un punto de 5) y gruesas, blandas y flojas abajo (8,8 px, 8 de desenfoque, al 48 %). Dos al gato (el cuello y la mano) y una al letrero, desde `PANT.y1 + 40`.
- **El fondo y el escenario:**
  - La pantalla (`PANT` = 64, 236 → 1016, 1668) y su luz (`pintarLuz`): un degradado redondo desde el candil (≈ 606, 800, radio 1100) y la llama vista a través del papel (≈ 664, 806), una lágrima blanda que se mece.
  - El papel (`papel()`, hecho una vez y multiplicado encima): nubes (más grueso, menos luz), grano, 2600 fibras, las juntas de los pliegos (x 302, 540 y 778), tres cercos de agua, siete arrugas y el borde de 60 px, más oscuro.
  - El decorado (`decorado()`, hecho una vez): la ventana con la noche azul, la luna en hueco y el pueblo con sus ventanitas encendidas; la mesa con su mantel de encaje calado; la planta; el suelo (desde `SUELO_Y` = 1612) con su cenefa. Y el farolillo rojo que se mece (`farol`).
  - El teatrillo (`marco()`, en dos lienzos: `oscuro` y `luz`): madera con vetas, el copete con el sol tallado, el bambalinón de siete ondas con flecos y borlas, las cortinas recogidas con su cordón y el frente. No hay más luz que la de la pantalla: solo se encienden los cantos que la miran.
  - El público (`publico`): la niña de las coletas y el niño del remolino, desenfocados 10 px y con el borde encendido; tapan la pantalla desde y ≈ 1580. El polvo (`polvo`): 54 motas que suben y brillan cerca de la luz. El resplandor (`EST.brillo`, la luz a un sexto y desenfocada), en `screen` sobre el marco.
- **Los rótulos y adornos fijos:** ningún texto fijo: el teatrillo, el decorado y el papel. El letrero del golpe entra y se va.
- **El movimiento:**
  - 60 cuadros por segundo, pero las marionetas van a saltos, 15 por segundo (`FPS_TITERE`), con la rejilla en el golpe (`pasoDe` y `tDePaso`: el paso 0 cae justo a los 3,1 s). Todo lo de cartón (también el café, el vapor y el farolillo) se pinta con el segundo del paso (`ts`).
  - El pulso del titiritero: en cada paso el gato se corre un pelo desde donde se sienta (`PIVOTE`), ±1,2 px, ±0,8 px y ±0,0025 rad (`rng(900 + n)`), y sus varillas con él (`conPulso`).
  - Fluido, con `t`: la luz (`luzDe`: parpadeo de tres ruidos de hasta ±14 %, el centro ±14 px, la llama ±9 y ±7 px, el radio ±3 %), el polvo, el público, el temblor y el fogonazo.
- **El momento:**
  1. El empujón: el gato empuja la taza con la mano en su varilla, a saltos. El vapor de la taza son tres hilos de sombra blanda (2,6 px).
  2. La caída (2,7 s): la taza gira por el borde y desde 2,8 s se despega de la pantalla hacia la luz (`hondoTaza`, hasta 0,95 hacia 2,99 s): su sombra crece casi 1,5 veces (`crece`) y se desenfoca hasta 10 px (`blando`). El café sale en una cinta de gotas, blanda: sombra al 30 % y marrón multiplicado, como papel de seda.
  3. El golpe (3,1 s, el paso 0): la taza desaparece y saltan los seis trozos con su calado, grandes y blandos (1,27 veces, 6 px), que se afinan en 0,5 s. La corona de café y el charco, casi pegados a la pantalla (1,1 px). La luz da un fogonazo de 0,42 s (`flash`: +80 % de brillo y +24 % de radio), que enciende también el marco.
  4. Sube el letrero del «¡CRAS!» en su varilla, en (826, 1236): en los pasos 0 a 4, al 55 %, 120 %, 92 %, 105 % y 98 % (el primero, 70 px más abajo), girando de un lado a otro (−0,14 a 0,03 rad); después tiembla un pelo en cada paso. Desde 4,5 s baja 700 px en 0,45 s y se va.
  5. Lo fluido: el teatrillo tiembla (`temblor(t, T_SUELO, 0.32, 9, 6)`) con un empujón hacia dentro del 2,5 %. El niño da un respingo (30 px en 0,07 s) y la niña, que se inclinaba mientras caía la taza, otro más pequeño.
  6. Después: del charco sube vapor, el gato se asoma, vuelve a mirarte y acaba lamiéndose la pata.

## Dónde está en el código
Se saca con la composición `sombras`. La entrada es `src/estilos/pintados/sombras/SombrasChinescas.tsx`; las ayudas, en `src/comun/curvas.ts` (`E`, `clamp`, `mix`, `rng`, `ruido`, `temblor`); `capsula` (`src/estilos/formas.ts`) entra por las patas y el cuerpo de la escena.
- **Piel (se reutiliza tal cual):**
  - `lienzos.ts`: `W`, `H`, `Ctx`, `PANT`, `FPS_TITERE`, `pasoDe`, `tDePaso`, `lienzo`, `ctx`, `ctxCpu`, `limpia`, `lerp`, `enE`, `centro`, `poligono`, `linea`, `rellena`, `calar`, `lente` y `rgb`.
  - `luz.ts`, entero: `Luz`, `luzDe`, `PARADAS` y `pintarLuz`. `papel.ts`, entero: `nubes` y `papel`.
  - `teatro.ts`, entero: `marco` (con `vetas`, `cortina`, `bambalinon`, `copete`, `frente`, `ORO`, `ORO_OSC`), `publico` (`NINA`, `NINO`), `polvo` (`MOTAS`) y `varilla`.
  - `decorado.ts`: la manera de `decorado()` (sombra desenfocada y color), `ventana` (`VENTANA`, `LUNA`), `planta`, `suelo` (`SUELO_Y`) y `farol` (`COLGADO`).
  - `gato.ts`: `junta`, `remache` y `ang`. `taza.ts`: lo que se despega (`hondoTaza`, `crece`, `blando`), el recorte de los trozos en `P.tmp`, el café de papel de seda (`pintarCafe`, `CAFE_L`), `pintarVapor` y el letrero (`estrella`, `letras`, `letrero`, `LW`, `LH`, `CRAS_C`, `estadoCras`, `pintarCras`).
  - `SombrasChinescas.tsx`: `EST`, `BW`, `BH`, el pulso (`pulso`, `conPulso`), los cuatro tiempos de `pintarCuadro`, el temblor con su empujón y el componente con su `<canvas>` y su `dpr`.
- **Lo del gato y la taza (se rehace):** en `gato.ts`, todo lo demás (los papeles, `CAPAS`, `roseta`, las rayas, `pataCalada`, `ojoCalado`, `collar`, `pintarGato`, `colorGato` y `varillas`); en `lienzos.ts`, `PIVOTE` y `enGato`; en `decorado.ts`, la mesa (`mesa`, `pata`, `MESA_X0`, `MANTEL_Y`); en `taza.ts`, la pieza (`pieza`, `flor`, `pintarTaza`) y los trozos (`TROZOS_LOCAL`, `pintarTrozos`); y en `pintarCuadro`, las llamadas con `gato`, `taza` y los pies de las varillas. Lo que pasa sale de `src/estilos/gato/escena.ts`.

## Pintar tu escena en este estilo
1. Copia la carpeta entera `src/estilos/pintados/sombras/` a `src/estilos/<tu-escena>/sombras/` (la misma profundidad: `../../../comun/curvas` sigue valiendo). Lo que tomaba de `../../gato/escena` (`DUR`, `T_CAE`, `T_SUELO`, `gato`, `taza`, `cafe`, `trozos`, `vapor`, `piezasTaza`, `IMPACTO`, `MESA_Y`, `BORDE`, `ESCALA_GATO`, `enMundo`) sale de tu `src/estilos/<tu-escena>/escena.ts` (`../escena`); la pura geometría (`rot`, `suma`, `resta`, `poli`, `curva`, `elipse`, `cinta`, `type P`, `type Elipse`) puede seguir saliendo de `../../gato/escena`.
2. El teatro no se toca: `teatro.ts`, `papel.ts` y `luz.ts`. Lo importante, cerca del centro de la luz (casi blanco): hacia el borde la pantalla se pone roja oscura y una silueta negra se pierde. Si tu escena va en otro sitio, mueve `c` y `llama` en `luzDe`. Abajo, desde y ≈ 1580, mandan las cabezas del público.
3. Lo quieto, en `decorado()`: en `s`, la silueta en `#000` con sus calados (`calar`); en `c`, el papel de color que asoma por los huecos. Formas con `poligono` y `lente`; las cenefas, en hueco. Se pinta una vez.
4. Tu marioneta, como `pintarGato`: cada pieza en su lienzo, con `rellena`, sus calados, `junta` donde pisa a la otra y `remache` en cada articulación. Su papel aparte, como `colorGato`, en `F` y un pelo más grande que el hueco. Sus varillas, como `varillas`, con `conPulso`.
5. Lo que se despega de la pantalla, como la taza: su pieza pintada una vez al doble (`K = 2`) en su lienzo y puesta con `translate`, `rotate` y `scale`; su lejanía `d` (0–1), con `crece` (1 + 0,5 d) y `blando` (0,5 + 10 d px). Al romperla, cada trozo recortado en `P.tmp`. Lo líquido, como `pintarCafe`: un lienzo opaco, al 30 % en `S` y teñido y multiplicado en `F`.
6. Tu momento: el segundo de tu golpe en lugar de `T_SUELO` (en `pasoDe`, `tDePaso`, `luzDe`, `publico` y el temblor). Tu palabra en `letras()`; si es más larga, agranda en `letrero()` las dos estrellas (el borde, 182 × 128, y el filete calado, 158 × 108), el óvalo amarillo (130 × 50), `LW` y `LH`, y mueve `CRAS_C`.
7. El orden de `pintarCuadro`: luz y decorado → farolillo → vapor → tu marioneta (con el pulso) → varillas → tu objeto → líquido → trozos → letrero; después, la sombra sobre la luz, el papel, el teatrillo, el público, el resplandor y el polvo. El componente no espera a nada: pinta en `useLayoutEffect` cada vez que cambia `t`. Regístralo, `({t}) => …`, como una composición más en `src/Root.tsx` (1080 × 1920, 60 fps).

**Lo que tarda y lo que pesa:** el primer cuadro hace el papel (ruido píxel a píxel, 2600 fibras y un desenfoque de 22 px), el decorado y el teatrillo; después, nada píxel a píxel. Lo que cuesta en cada cuadro son los desenfoques: ocho por varilla, las piezas de cada cabeza dos veces y dos por trozo. Guarda unos trece lienzos de 1080 × 1920 (8 MB cada uno: más de 100 MB por pestaña).

**El límite de resolución:** todo se pinta a 1080 × 1920 (`lienzo()` = `W` × `H`); solo el lienzo de la pantalla crece con `dpr` (de 0,25 a 2). En 4K el cuadro sale ampliado del de 1080 y no gana detalle (la taza y el letrero, aunque se preparan al doble, también).

**Errores fáciles:**
- Pintar el papel de color en `S`: sale opaco, como una pegatina encima de la sombra. Va en `F`, detrás, y solo se ve por lo calado.
- Hacer un hueco pintándolo de blanco en vez de con `calar`: no deja pasar la luz, sale plano y sin papel de color.
- Animar el cartón con `t`: sale fluido y deja de parecer una marioneta. Con `ts`; la luz, el polvo, el público y el temblor, con `t`.
- Quitar el `+ 1e-6` de `pintarCuadro` (o el de `pasoDe`): si el cuadro del golpe cae en 3,0999…, cuenta como de antes y la taza se rompe un cuadro tarde.
- Recortar un trozo con `clip` en el mismo lienzo donde se desenfoca: el borde blando sale cortado. Por eso `P.tmp`.
- Dejar el contexto con alfa, filtro o modo: `S` va al 0,82, al 0,9 y al 1 según la capa; cada ayuda usa `save` y `restore`, y `limpia` lo pone todo a cero.
- Hacer los lienzos de trabajo a la medida de `dpr`: los desenfoques y las medidas están en px de 1080 y habría que multiplicarlos.
