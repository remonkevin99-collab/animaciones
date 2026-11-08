import React from 'react';
import {AbsoluteFill, Composition, useCurrentFrame, useVideoConfig} from 'remotion';
import {DUR} from './estilos/gato/escena';
import {ESTILOS_GATO} from './estilos/gato/estilos';
import {ORDEN, type IdEstilo} from './estilos/orden';

// Una composición por estilo, con el nombre que se escribe al pedirla: `npx remotion render src/index.ts plano-azul out/plano-azul.mp4`.
// Todas son la misma escena (./estilos/gato/escena.ts): 6 segundos en vertical, 1080 × 1920 y 60 cuadros por segundo.
// Cada estilo recibe solo el segundo en el que va (t) y pinta ese cuadro: el mismo segundo da siempre el mismo cuadro.

const Estilo: React.FC<{estilo: IdEstilo}> = ({estilo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const Pinta = ESTILOS_GATO[estilo];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Pinta t={frame / fps} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <>
    {ORDEN.map((e) => (
      <Composition key={e.id} id={e.composicion} component={Estilo} defaultProps={{estilo: e.id}}
        width={1080} height={1920} fps={60} durationInFrames={Math.round(DUR * 60)} />
    ))}
  </>
);
