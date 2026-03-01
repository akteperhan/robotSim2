import { useRef } from 'react'
import { Mesh, Group } from 'three'
import { RoundedBox, Sphere, Cylinder, Torus } from '@react-three/drei'

interface RobotProps {
  position: [number, number, number]
  rotation: number
}

export function Robot({ position, rotation }: RobotProps) {
  const groupRef = useRef<Group>(null)
  
  return (
    <group ref={groupRef} position={position} rotation={[0, -rotation * Math.PI / 180, 0]}>
      {/* Main Body - Rounded */}
      <RoundedBox
        args={[0.7, 0.6, 0.8]}
        radius={0.08}
        smoothness={4}
        position={[0, 0.4, 0]}
        castShadow
      >
        <meshStandardMaterial 
          color="#87CEEB" 
          roughness={0.2} 
          metalness={0.1}
        />
      </RoundedBox>
      
      {/* White Front Panel */}
      <RoundedBox
        args={[0.72, 0.5, 0.1]}
        radius={0.05}
        smoothness={4}
        position={[0, 0.4, 0.45]}
        castShadow
      >
        <meshStandardMaterial 
          color="#FFFFFF" 
          roughness={0.15} 
          metalness={0.05}
        />
      </RoundedBox>
      
      {/* LED Screen Background */}
      <RoundedBox
        args={[0.5, 0.25, 0.03]}
        radius={0.02}
        smoothness={4}
        position={[0, 0.45, 0.51]}
      >
        <meshStandardMaterial 
          color="#1a1a1a" 
          roughness={0.1} 
          metalness={0.3}
        />
      </RoundedBox>
      
      {/* Left Eye - Glowing */}
      <Sphere args={[0.08, 32, 32]} position={[-0.12, 0.45, 0.52]}>
        <meshStandardMaterial 
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={1.5}
          roughness={0.2}
        />
      </Sphere>
      
      {/* Right Eye - Glowing */}
      <Sphere args={[0.08, 32, 32]} position={[0.12, 0.45, 0.52]}>
        <meshStandardMaterial 
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={1.5}
          roughness={0.2}
        />
      </Sphere>
      
      {/* Smile/Mouth Indicator */}
      <RoundedBox
        args={[0.15, 0.02, 0.02]}
        radius={0.01}
        position={[0, 0.32, 0.52]}
      >
        <meshStandardMaterial 
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.8}
        />
      </RoundedBox>
      
      {/* Top Compartment */}
      <RoundedBox
        args={[0.5, 0.15, 0.5]}
        radius={0.05}
        smoothness={4}
        position={[0, 0.8, 0]}
        castShadow
      >
        <meshStandardMaterial 
          color="#5B9BD5" 
          roughness={0.3} 
          metalness={0.1}
        />
      </RoundedBox>
      
      {/* Antenna */}
      <Cylinder args={[0.02, 0.02, 0.25, 16]} position={[0, 1.0, 0]}>
        <meshStandardMaterial color="#87CEEB" roughness={0.3} />
      </Cylinder>
      
      {/* Antenna Light - Cyan Glow */}
      <Sphere args={[0.06, 16, 16]} position={[0, 1.15, 0]}>
        <meshStandardMaterial 
          color="#00E5FF"
          emissive="#00E5FF"
          emissiveIntensity={2.0}
        />
      </Sphere>
      
      {/* Point light from antenna */}
      <pointLight position={[0, 1.15, 0]} intensity={0.5} color="#00E5FF" distance={2} />
      
      {/* Wheels */}
      {[
        [-0.35, 0.18, 0.35],
        [0.35, 0.18, 0.35],
        [-0.35, 0.18, -0.35],
        [0.35, 0.18, -0.35]
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          {/* Wheel */}
          <Cylinder 
            args={[0.18, 0.18, 0.15, 32]} 
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <meshStandardMaterial 
              color="#2C3E50" 
              roughness={0.7} 
              metalness={0.3}
            />
          </Cylinder>
          
          {/* Glowing Rim */}
          <Torus
            args={[0.15, 0.03, 16, 32]}
            rotation={[0, Math.PI / 2, 0]}
            position={[pos[0] > 0 ? 0.08 : -0.08, 0, 0]}
          >
            <meshStandardMaterial 
              color="#00BCD4"
              emissive="#00BCD4"
              emissiveIntensity={1.2}
            />
          </Torus>
        </group>
      ))}
      
      {/* Circuit Pattern Decorations */}
      <RoundedBox
        args={[0.02, 0.3, 0.4]}
        radius={0.01}
        position={[-0.36, 0.4, 0]}
      >
        <meshStandardMaterial color="#B0BEC5" roughness={0.4} />
      </RoundedBox>
      
      <RoundedBox
        args={[0.02, 0.3, 0.4]}
        radius={0.01}
        position={[0.36, 0.4, 0]}
      >
        <meshStandardMaterial color="#B0BEC5" roughness={0.4} />
      </RoundedBox>
      
      {/* Battery Indicator on Body */}
      <RoundedBox
        args={[0.15, 0.05, 0.02]}
        radius={0.01}
        position={[0, 0.25, 0.51]}
      >
        <meshStandardMaterial 
          color="#4CAF50"
          emissive="#4CAF50"
          emissiveIntensity={0.3}
        />
      </RoundedBox>
    </group>
  )
}
