export var Direction;
(function (Direction) {
    Direction[Direction["NORTH"] = 0] = "NORTH";
    Direction[Direction["EAST"] = 90] = "EAST";
    Direction[Direction["SOUTH"] = 180] = "SOUTH";
    Direction[Direction["WEST"] = 270] = "WEST";
})(Direction || (Direction = {}));
export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cells = new Map();
        this.initializeCells();
    }
    initializeCells() {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const key = this.positionToKey({ x, y });
                this.cells.set(key, {
                    position: { x, y },
                    walkable: true
                });
            }
        }
    }
    isValidPosition(pos) {
        if (pos.x < 0 || pos.x >= this.width || pos.y < 0 || pos.y >= this.height) {
            return false;
        }
        const cell = this.getCell(pos);
        return cell !== null && cell.walkable;
    }
    getCell(pos) {
        const key = this.positionToKey(pos);
        return this.cells.get(key) || null;
    }
    setWalkable(pos, walkable) {
        const cell = this.getCell(pos);
        if (cell) {
            cell.walkable = walkable;
        }
    }
    placeInteractable(pos, interactable) {
        const cell = this.getCell(pos);
        if (cell) {
            cell.interactable = interactable;
        }
    }
    getAdjacentInteractable(pos) {
        const adjacentPositions = [
            { x: pos.x + 1, y: pos.y },
            { x: pos.x - 1, y: pos.y },
            { x: pos.x, y: pos.y + 1 },
            { x: pos.x, y: pos.y - 1 }
        ];
        for (const adjPos of adjacentPositions) {
            const cell = this.getCell(adjPos);
            if (cell && cell.interactable) {
                return cell.interactable;
            }
        }
        return null;
    }
    /** Check current cell AND adjacent cells for an interactable */
    getInteractableInRange(pos) {
        // First check current cell
        const currentCell = this.getCell(pos);
        if (currentCell && currentCell.interactable) {
            return currentCell.interactable;
        }
        // Then check adjacent cells
        return this.getAdjacentInteractable(pos);
    }
    positionToKey(pos) {
        return `${pos.x},${pos.y}`;
    }
}
//# sourceMappingURL=Grid.js.map