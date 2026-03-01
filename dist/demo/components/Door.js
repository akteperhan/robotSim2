import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, RoundedBox } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
export function Door({ position, isOpen }) {
    const { doorY } = useSpring({
        doorY: isOpen ? 3 : 0,
        config: { tension: 120, friction: 30 }
    });
    const AnimatedGroup = animated.group;
    return (_jsx(AnimatedGroup, { "position-y": doorY, children: _jsxs("group", { position: position, children: [Array.from({ length: 12 }).map((_, i) => (_jsxs("group", { position: [0, 0.1 + i * 0.15, 0], children: [_jsx(Box, { args: [2.5, 0.15, 0.08], castShadow: true, receiveShadow: true, children: _jsx("meshStandardMaterial", { color: "#9E9E9E", roughness: 0.4, metalness: 0.6 }) }), _jsx(Box, { args: [2.5, 0.02, 0.09], position: [0, 0.075, 0], children: _jsx("meshStandardMaterial", { color: "#757575", roughness: 0.5, metalness: 0.7 }) })] }, i))), _jsx(RoundedBox, { args: [0.1, 0.3, 0.1], radius: 0.02, position: [-0.8, 0.9, 0.1], castShadow: true, children: _jsx("meshStandardMaterial", { color: "#424242", roughness: 0.3, metalness: 0.8 }) })] }) }));
}
//# sourceMappingURL=Door.js.map