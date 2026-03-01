import { Cylinder, Sphere } from '@react-three/drei'

interface ButtonProps {
  position: [number, number, number]
}

export function Button({ position }: ButtonProps) {
  return (
    <group position={position}>
      {/* Button Base */}
      <Cylinder 
        args={[0.25, 0.25, 0.1, 32]} 
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <meshStandardMaterial 
          color="#F9A825" 
          roughness={0.3} 
          metalness={0.2}
        />
      </Cylinder>
      
      {/* Button Top - Glowing */}
      <Cylinder 
        args={[0.2, 0.2, 0.08, 32]} 
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 0.05]}
        castShadow
      >
        <meshStandardMaterial 
          color="#FFEB3B"
          emissive="#FFEB3B"
          emissiveIntensity={1.0}
          roughness={0.2}
          metalness={0.1}
        />
      </Cylinder>
      
      {/* Glow Effect */}
      <Sphere args={[0.3, 16, 16]}>
        <meshBasicMaterial 
          color="#FFEB3B"
          transparent
          opacity={0.2}
        />
      </Sphere>
      
      {/* Point Light */}
      <pointLight intensity={0.8} distance={3} color="#FFEB3B" />
    </group>
  )
}
