import type React from 'react';
import {Grafiti} from './grafiti/Grafiti';
import {HoraDorada} from './dorada/HoraDorada';
import {PinturaNocturna} from './nocturna/PinturaNocturna';
import {PinturaRupestre} from './rupestre/PinturaRupestre';
import {PeliculaAnimada} from './pelicula/PeliculaAnimada';
import {VideojuegoRetro} from './videojuego/VideojuegoRetro';
import {SombrasChinescas} from './sombras/SombrasChinescas';
import {CeraDeColores} from './cera/CeraDeColores';
import {MunecoDeLana} from './lana/MunecoDeLana';
import {Videovigilancia} from './vigilancia/Videovigilancia';

// LOS ESTILOS DEL 21 AL 30: el gato que tira la taza (la escena en ../gato/escena.ts) otra vez, en el orden del vídeo. «nombre»
// es como se dice. Cada estilo pinta el cuadro entero de 1080 × 1920 en el segundo t de la escena (de 0 a 6).
export const ESTILOS: {id: string; nombre: string; C: React.FC<{t: number}>}[] = [
  {id: 'grafiti', nombre: 'Grafiti', C: Grafiti},
  {id: 'dorada', nombre: 'Hora dorada', C: HoraDorada},
  {id: 'nocturna', nombre: 'Pintura nocturna', C: PinturaNocturna},
  {id: 'rupestre', nombre: 'Pintura rupestre', C: PinturaRupestre},
  {id: 'pelicula', nombre: 'Película animada', C: PeliculaAnimada},
  {id: 'videojuego', nombre: 'Videojuego retro', C: VideojuegoRetro},
  {id: 'sombras', nombre: 'Sombras chinescas', C: SombrasChinescas},
  {id: 'cera', nombre: 'Cera de colores', C: CeraDeColores},
  {id: 'lana', nombre: 'Muñeco de lana', C: MunecoDeLana},
  {id: 'vigilancia', nombre: 'Videovigilancia', C: Videovigilancia},
];
