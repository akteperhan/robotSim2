import * as THREE from 'three';
export declare function createSkyGradient(): THREE.Texture;
export declare function createOutdoorScene(scene: THREE.Scene, config: {
    GRID_W: number;
    GRID_H: number;
    DOOR_ROW: number;
    GRID_CENTER_X: number;
}): {
    skyLight: THREE.HemisphereLight;
};
//# sourceMappingURL=EnvironmentBuilder.d.ts.map