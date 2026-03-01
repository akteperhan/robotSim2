import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { Robot } from './components/Robot';
import { Garage } from './components/Garage';
import { Button } from './components/Button';
import { Door } from './components/Door';
import { Grid } from './components/Grid';
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';
export function Scene3D({ robotPosition, robotRotation, doorOpen }) {
    return (_jsxs(Canvas, { shadows: true, children: [_jsx(PerspectiveCamera, { makeDefault: true, position: [8, 6, 8], fov: 50 }), _jsx(OrbitControls, { enablePan: false, minDistance: 5, maxDistance: 15, maxPolarAngle: Math.PI / 2.2, target: [2, 0, 2] }), _jsx("ambientLight", { intensity: 0.4 }), _jsx("directionalLight", { position: [5, 8, 5], intensity: 0.8, castShadow: true, "shadow-mapSize": [2048, 2048], "shadow-camera-left": -10, "shadow-camera-right": 10, "shadow-camera-top": 10, "shadow-camera-bottom": -10 }), _jsx("pointLight", { position: [2, 3, 2], intensity: 0.3, color: "#ffffff" }), _jsx(Environment, { preset: "warehouse" }), _jsx("fog", { attach: "fog", args: ['#87CEEB', 10, 30] }), _jsx(Grid, {}), _jsx(Garage, {}), _jsx(Robot, { position: [robotPosition.x, 0, robotPosition.y], rotation: robotRotation }), _jsx(Button, { position: [2, 0.5, 3] }), _jsx(Door, { position: [2, 0, 4.5], isOpen: doorOpen }), _jsx(ContactShadows, { position: [2, 0, 2], opacity: 0.4, scale: 10, blur: 2, far: 4 }), _jsxs(EffectComposer, { children: [_jsx(Bloom, { luminanceThreshold: 0.8, luminanceSmoothing: 0.9, intensity: 0.5 }), _jsx(SSAO, { radius: 0.4, intensity: 50, luminanceInfluence: 0.1 })] })] }));
}
//# sourceMappingURL=Scene3D.js.map