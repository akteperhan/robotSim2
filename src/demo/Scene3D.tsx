import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei'
import { Robot } from './components/Robot'
import { Garage } from './components/Garage'
import { Button } from './components/Button'
import { Door } from './components/Door'
import { Grid } from './components/Grid'
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing'

interface Scene3DProps {
  robotPosition: { x: number; y: number }
  robotRotation: number
  doorOpen: boolean
}

export function Scene3D({ robotPosition, robotRotation, doorOpen }: Scene3DProps) {
  return (
    <Canvas shadows>
      <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
      <OrbitControls 
        enablePan={false}
        minDistance={5}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2.2}
        target={[2, 0, 2]}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[2, 3, 2]} intensity={0.3} color="#ffffff" />
      
      {/* Environment */}
      <Environment preset="warehouse" />
      <fog attach="fog" args={['#87CEEB', 10, 30]} />
      
      {/* Scene Objects */}
      <Grid />
      <Garage />
      <Robot position={[robotPosition.x, 0, robotPosition.y]} rotation={robotRotation} />
      <Button position={[2, 0.5, 3]} />
      <Door position={[2, 0, 4.5]} isOpen={doorOpen} />
      
      {/* Ground Shadows */}
      <ContactShadows
        position={[2, 0, 2]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
      />
      
      {/* Post Processing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.9} intensity={0.5} />
        <SSAO radius={0.4} intensity={50} luminanceInfluence={0.1} />
      </EffectComposer>
    </Canvas>
  )
}
