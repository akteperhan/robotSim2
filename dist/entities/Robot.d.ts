import { Position, Direction } from '../systems/Grid';
export declare enum EyeExpression {
    NORMAL = "NORMAL",
    HAPPY = "HAPPY",
    WORRIED = "WORRIED",
    EXCITED = "EXCITED"
}
export declare class Robot {
    private position;
    private direction;
    private animationController;
    constructor(startPosition: Position, startDirection: Direction);
    getPosition(): Position;
    getDirection(): Direction;
    getForwardPosition(): Position;
    getBackwardPosition(): Position;
    moveTo(position: Position): void;
    rotateLeft(): void;
    rotateRight(): void;
    setEyeExpression(expression: EyeExpression): void;
}
//# sourceMappingURL=Robot.d.ts.map