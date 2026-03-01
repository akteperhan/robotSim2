import { Box, RoundedBox } from '@react-three/drei'
import { useSpring, animated } from '@react-spring/three'

interface DoorProps {
  position: [number, number, number]
  isOpen: boolean
}

export function Door({ position, isOpen }: DoorProps) {
  const { doorY } = useSpring({
    doorY: isOpen ? 3 : 0,
    config: { tension: 120, friction: 30 }
  })
  
  const AnimatedGroup = animated.group
  
  return (
    <AnimatedGroup position-y={doorY}>
      <group position={position}>
        {/* Door Panels */}
        {Array.from({ length: 12 }).map((_, i) => (
          <group key={i} position={[0, 0.1 + i * 0.15, 0]}>
            {/* Panel */}
            <Box args={[2.5, 0.15, 0.08]} castShadow receiveShadow>
              <meshStandardMaterial 
                color="#9E9E9E" 
                roughness={0.4} 
                metalness={0.6}
              />
            </Box>
            
            {/* Horizontal Line Detail */}
            <Box args={[2.5, 0.02, 0.09]} position={[0, 0.075, 0]}>
              <meshStandardMaterial 
                color="#757575" 
                roughness={0.5} 
                metalness={0.7}
              />
            </Box>
          </group>
        ))}
        
        {/* Door Handle */}
        <RoundedBox 
          args={[0.1, 0.3, 0.1]} 
          radius={0.02}
          position={[-0.8, 0.9, 0.1]}
          castShadow
        >
          <meshStandardMaterial 
            color="#424242" 
            roughness={0.3} 
            metalness={0.8}
          />
        </RoundedBox>
      </group>
    </AnimatedGroup>
  )
}
