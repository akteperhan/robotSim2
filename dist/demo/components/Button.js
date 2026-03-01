import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Cylinder, Sphere } from '@react-three/drei';
export function Button({ position }) {
    return (_jsxs("group", { position: position, children: [_jsx(Cylinder, { args: [0.25, 0.25, 0.1, 32], rotation: [Math.PI / 2, 0, 0], castShadow: true, children: _jsx("meshStandardMaterial", { color: "#F9A825", roughness: 0.3, metalness: 0.2 }) }), _jsx(Cylinder, { args: [0.2, 0.2, 0.08, 32], rotation: [Math.PI / 2, 0, 0], position: [0, 0, 0.05], castShadow: true, children: _jsx("meshStandardMaterial", { color: "#FFEB3B", emissive: "#FFEB3B", emissiveIntensity: 1.0, roughness: 0.2, metalness: 0.1 }) }), _jsx(Sphere, { args: [0.3, 16, 16], children: _jsx("meshBasicMaterial", { color: "#FFEB3B", transparent: true, opacity: 0.2 }) }), _jsx("pointLight", { intensity: 0.8, distance: 3, color: "#FFEB3B" })] }));
}
//# sourceMappingURL=Button.js.map