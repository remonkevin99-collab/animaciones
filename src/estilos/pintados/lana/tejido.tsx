import React from 'react';
import * as THREE from 'three';
import {ALTOS_PELUSA, capaPelusa} from './punto';

// MUÑECO DE LANA: una pieza tejida con su pelusilla (la pieza y, encima, las capas de pelitos de punto.ts)
type Props = {
  geometry: THREE.BufferGeometry; material: THREE.Material; position?: [number, number, number]; rotation?: [number, number, number];
  scale?: [number, number, number]; quaternion?: [number, number, number, number]; sombra?: boolean; pelusa?: boolean;
};
export const Tejido: React.FC<Props> = ({geometry, material, position, rotation, scale, quaternion, sombra = true, pelusa = true}) => (
  <group position={position} rotation={rotation} scale={scale} quaternion={quaternion}>
    <mesh geometry={geometry} material={material} castShadow={sombra} receiveShadow />
    {pelusa && material instanceof THREE.MeshPhysicalMaterial &&
      ALTOS_PELUSA.map((_, i) => <mesh key={i} geometry={geometry} material={capaPelusa(material, i)} renderOrder={1 + i} />)}
  </group>
);
