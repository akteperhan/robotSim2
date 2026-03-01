import { IInteractable } from '../core/IInteractable';
export interface Position {
    x: number;
    y: number;
}
export declare enum Direction {
    NORTH = 0,
    EAST = 90,
    SOUTH = 180,
    WEST = 270
}
export interface GridCell {
    position: Position;
    walkable: boolean;
    interactable?: IInteractable;
}
export declare class Grid {
    private cells;
    private width;
    private height;
    constructor(width: number, height: number);
    private initializeCells;
    isValidPosition(pos: Position): boolean;
    getCell(pos: Position): GridCell | null;
    setWalkable(pos: Position, walkable: boolean): void;
    placeInteractable(pos: Position, interactable: IInteractable): void;
    getAdjacentInteractable(pos: Position): IInteractable | null;
    /** Check current cell AND adjacent cells for an interactable */
    getInteractableInRange(pos: Position): IInteractable | null;
    private positionToKey;
}
//# sourceMappingURL=Grid.d.ts.map