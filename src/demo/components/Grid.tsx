import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

export function Grid() {
  const tiles = []
  
  for (let x = 0; x < 5; x++) {
    for (let z = 0; z < 5; z++) {
      tiles.push(
        <RoundedBox
          key={`${x}-${z}`}
          args={[0.95, 0.05, 0.95]}
          radius={0.01}
          smoothness={4}
          position={[x, -0.025, z]}
          receiveShadow
        >
          <meshStandardMaterial 
            color="#BDBDBD" 
            roughness={0.8} 
            metalness={0.2}
          />
        </RoundedBox>
      )
      
      // Grid lines
      tiles.push(
        <lineSegments key={`line-${x}-${z}`} position={[x, -0.025, z]}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.95, 0.05, 0.95)]} />
          <lineBasicMaterial color="#757575" />
        </lineSegments>
      )
    }
  }
  
  return <group>{tiles}</group>
}
