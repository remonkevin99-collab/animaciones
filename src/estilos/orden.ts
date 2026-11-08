// LOS 10 ESTILOS, en el orden del vídeo. `id` es el que usa el código (gato/estilos.ts); `composicion`, el nombre que se escribe
// para sacarlo en vídeo; `nombre`, como se dice.
export const ORDEN = [
  {id: 'holograma', composicion: 'holograma', nombre: 'Holograma'},
  {id: 'neon', composicion: 'neon', nombre: 'Neón cyberpunk'},
  {id: 'papel', composicion: 'papel', nombre: 'Papel recortado'},
  {id: 'isometrico', composicion: 'isometrico', nombre: 'Isométrico'},
  {id: 'plano-azul', composicion: 'plano-azul', nombre: 'Plano azul'},
  {id: 'termica', composicion: 'termica', nombre: 'Cámara térmica'},
  {id: 'anime', composicion: 'anime', nombre: 'Anime'},
  {id: 'ascii', composicion: 'matrix', nombre: 'Matrix'}, // arte ASCII: la escena pasada a letras verdes
  {id: 'acuarela', composicion: 'acuarela', nombre: 'Acuarela'},
  {id: 'plastilina', composicion: 'plastilina', nombre: 'Plastilina'},
] as const;
export type IdEstilo = (typeof ORDEN)[number]['id'];
