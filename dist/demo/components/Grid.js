import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
export function Grid() {
    const tiles = [];
    for (let x = 0; x < 5; x++) {
        for (let z = 0; z < 5; z++) {
            tiles.push(_jsx(RoundedBox, { args: [0.95, 0.05, 0.95], radius: 0.01, smoothness: 4, position: [x, -0.025, z], receiveShadow: true, children: _jsx("meshStandardMaterial", { color: "#BDBDBD", roughness: 0.8, metalness: 0.2 }) }, `${x}-${z}`));
            // Grid lines
            tiles.push(_jsxs("lineSegments", { position: [x, -0.025, z], children: [_jsx("edgesGeometry", { args: [new THREE.BoxGeometry(0.95, 0.05, 0.95)] }), _jsx("lineBasicMaterial", { color: "#757575" })] }, `line-${x}-${z}`));
        }
    }
    return _jsx("group", { children: tiles });
}
//# sourceMappingURL=Grid.js.map