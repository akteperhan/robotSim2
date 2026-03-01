import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RoundedBox, Box, Torus } from '@react-three/drei';
export function Garage() {
    return (_jsxs("group", { children: [_jsx(Box, { args: [5, 3, 0.2], position: [2, 1.5, -0.6], receiveShadow: true, children: _jsx("meshStandardMaterial", { color: "#616161", roughness: 0.9 }) }), _jsx(Box, { args: [0.2, 3, 5], position: [-0.6, 1.5, 2], receiveShadow: true, children: _jsx("meshStandardMaterial", { color: "#616161", roughness: 0.9 }) }), _jsx(Box, { args: [0.2, 3, 5], position: [4.6, 1.5, 2], receiveShadow: true, children: _jsx("meshStandardMaterial", { color: "#616161", roughness: 0.9 }) }), _jsx(ToolShelf, { position: [-0.4, 1.2, 1] }), _jsx(ToolShelf, { position: [4.4, 1.2, 1] }), _jsx(TireStack, { position: [-0.3, 0.2, 3] }), _jsx(Workbench, { position: [4.3, 0.5, 3] }), [
                [1, 2.8, 1],
                [3, 2.8, 1],
                [1, 2.8, 3],
                [3, 2.8, 3]
            ].map((pos, i) => (_jsxs("group", { position: pos, children: [_jsx(RoundedBox, { args: [0.3, 0.05, 0.3], radius: 0.02, children: _jsx("meshStandardMaterial", { color: "#FFFFFF", emissive: "#FFFFFF", emissiveIntensity: 0.8 }) }), _jsx("pointLight", { intensity: 0.4, distance: 5, color: "#FFFFFF" })] }, i))), _jsx(RoundedBox, { args: [0.3, 0.3, 0.3], position: [-0.3, 0.15, 0.5], radius: 0.02, castShadow: true, children: _jsx("meshStandardMaterial", { color: "#FF5722", roughness: 0.5 }) }), _jsx(RoundedBox, { args: [0.25, 0.25, 0.25], position: [4.3, 0.125, 0.5], radius: 0.02, castShadow: true, children: _jsx("meshStandardMaterial", { color: "#2196F3", roughness: 0.5 }) })] }));
}
function ToolShelf({ position }) {
    return (_jsx("group", { position: position, children: [0, 1, 2].map((i) => (_jsxs("group", { position: [0, i * 0.3, 0], children: [_jsx(Box, { args: [0.1, 0.02, 0.8], castShadow: true, children: _jsx("meshStandardMaterial", { color: "#8D6E63", roughness: 0.7 }) }), i < 2 && (_jsx(RoundedBox, { args: [0.08, 0.1, 0.15], radius: 0.01, position: [0, 0.06, 0.2], castShadow: true, children: _jsx("meshStandardMaterial", { color: i === 0 ? "#FF5722" : "#2196F3", roughness: 0.5 }) }))] }, i))) }));
}
function TireStack({ position }) {
    return (_jsx("group", { position: position, children: [0, 1, 2].map((i) => (_jsx(Torus, { args: [0.15, 0.08, 16, 32], rotation: [Math.PI / 2, 0, 0], position: [0, i * 0.15, 0], castShadow: true, children: _jsx("meshStandardMaterial", { color: "#212121", roughness: 0.9 }) }, i))) }));
}
function Workbench({ position }) {
    return (_jsxs("group", { position: position, children: [_jsx(Box, { args: [0.1, 0.5, 0.6], castShadow: true, children: _jsx("meshStandardMaterial", { color: "#795548", roughness: 0.8 }) }), _jsx(RoundedBox, { args: [0.08, 0.15, 0.2], radius: 0.01, position: [0, 0.33, 0], castShadow: true, children: _jsx("meshStandardMaterial", { color: "#F44336", roughness: 0.4, metalness: 0.3 }) })] }));
}
//# sourceMappingURL=Garage.js.map