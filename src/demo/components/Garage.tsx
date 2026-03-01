import { RoundedBox, Box, Cylinder, Torus } from '@react-three/drei'

export function Garage() {
  return (
    <group>
      {/* Back Wall */}
      <Box args={[5, 3, 0.2]} position={[2, 1.5, -0.6]} receiveShadow>
        <meshStandardMaterial color="#616161" roughness={0.9} />
      </Box>
      
      {/* Left Wall */}
      <Box args={[0.2, 3, 5]} position={[-0.6, 1.5, 2]} receiveShadow>
        <meshStandardMaterial color="#616161" roughness={0.9} />
      </Box>
      
      {/* Right Wall */}
      <Box args={[0.2, 3, 5]} position={[4.6, 1.5, 2]} receiveShadow>
        <meshStandardMaterial color="#616161" roughness={0.9} />
      </Box>
      
      {/* Tool Shelves - Left */}
      <ToolShelf position={[-0.4, 1.2, 1]} />
      
      {/* Tool Shelves - Right */}
      <ToolShelf position={[4.4, 1.2, 1]} />
      
      {/* Tire Stack - Left */}
      <TireStack position={[-0.3, 0.2, 3]} />
      
      {/* Workbench - Right */}
      <Workbench position={[4.3, 0.5, 3]} />
      
      {/* Ceiling Lights */}
      {[
        [1, 2.8, 1],
        [3, 2.8, 1],
        [1, 2.8, 3],
        [3, 2.8, 3]
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <RoundedBox args={[0.3, 0.05, 0.3]} radius={0.02}>
            <meshStandardMaterial 
              color="#FFFFFF"
              emissive="#FFFFFF"
              emissiveIntensity={0.8}
            />
          </RoundedBox>
          <pointLight intensity={0.4} distance={5} color="#FFFFFF" />
        </group>
      ))}
      
      {/* Storage Boxes */}
      <RoundedBox args={[0.3, 0.3, 0.3]} position={[-0.3, 0.15, 0.5]} radius={0.02} castShadow>
        <meshStandardMaterial color="#FF5722" roughness={0.5} />
      </RoundedBox>
      
      <RoundedBox args={[0.25, 0.25, 0.25]} position={[4.3, 0.125, 0.5]} radius={0.02} castShadow>
        <meshStandardMaterial color="#2196F3" roughness={0.5} />
      </RoundedBox>
    </group>
  )
}

function ToolShelf({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, i * 0.3, 0]}>
          {/* Shelf Board */}
          <Box args={[0.1, 0.02, 0.8]} castShadow>
            <meshStandardMaterial color="#8D6E63" roughness={0.7} />
          </Box>
          
          {/* Items on Shelf */}
          {i < 2 && (
            <RoundedBox 
              args={[0.08, 0.1, 0.15]} 
              radius={0.01}
              position={[0, 0.06, 0.2]} 
              castShadow
            >
              <meshStandardMaterial 
                color={i === 0 ? "#FF5722" : "#2196F3"} 
                roughness={0.5} 
              />
            </RoundedBox>
          )}
        </group>
      ))}
    </group>
  )
}

function TireStack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <Torus
          key={i}
          args={[0.15, 0.08, 16, 32]}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, i * 0.15, 0]}
          castShadow
        >
          <meshStandardMaterial color="#212121" roughness={0.9} />
        </Torus>
      ))}
    </group>
  )
}

function Workbench({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Bench */}
      <Box args={[0.1, 0.5, 0.6]} castShadow>
        <meshStandardMaterial color="#795548" roughness={0.8} />
      </Box>
      
      {/* Toolbox */}
      <RoundedBox 
        args={[0.08, 0.15, 0.2]} 
        radius={0.01}
        position={[0, 0.33, 0]} 
        castShadow
      >
        <meshStandardMaterial 
          color="#F44336" 
          roughness={0.4} 
          metalness={0.3}
        />
      </RoundedBox>
    </group>
  )
}
