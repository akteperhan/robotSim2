import * as THREE from 'three';
export interface GarageConfig {
    GRID_W: number;
    GARAGE_DEPTH: number;
    GRID_CENTER_X: number;
    WALL_H: number;
    DOOR_ROW: number;
}
export declare function createGarage(config: GarageConfig): {
    garageGroup: THREE.Group<THREE.Object3DEventMap>;
    garageRoofGroup: THREE.Group<THREE.Object3DEventMap>;
    garageRoofMaterials: THREE.MeshStandardMaterial[];
};
//# sourceMappingURL=GarageBuilder.d.ts.map