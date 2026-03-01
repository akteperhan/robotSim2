import { Direction } from '../systems/Grid';
export var EyeExpression;
(function (EyeExpression) {
    EyeExpression["NORMAL"] = "NORMAL";
    EyeExpression["HAPPY"] = "HAPPY";
    EyeExpression["WORRIED"] = "WORRIED";
    EyeExpression["EXCITED"] = "EXCITED";
})(EyeExpression || (EyeExpression = {}));
// Placeholder for animation controller
class AnimationController {
    playMoveAnimation(from, to) {
        // TODO: Implement animation
    }
    playRotateAnimation(direction) {
        // TODO: Implement animation
    }
    setEyeExpression(expression) {
        // TODO: Implement animation
    }
}
export class Robot {
    constructor(startPosition, startDirection) {
        this.position = { ...startPosition };
        this.direction = startDirection;
        this.animationController = new AnimationController();
    }
    getPosition() {
        return { ...this.position };
    }
    getDirection() {
        return this.direction;
    }
    getForwardPosition() {
        switch (this.direction) {
            case Direction.NORTH:
                return { x: this.position.x, y: this.position.y + 1 };
            case Direction.EAST:
                return { x: this.position.x + 1, y: this.position.y };
            case Direction.SOUTH:
                return { x: this.position.x, y: this.position.y - 1 };
            case Direction.WEST:
                return { x: this.position.x - 1, y: this.position.y };
        }
    }
    getBackwardPosition() {
        switch (this.direction) {
            case Direction.NORTH:
                return { x: this.position.x, y: this.position.y - 1 };
            case Direction.EAST:
                return { x: this.position.x - 1, y: this.position.y };
            case Direction.SOUTH:
                return { x: this.position.x, y: this.position.y + 1 };
            case Direction.WEST:
                return { x: this.position.x + 1, y: this.position.y };
        }
    }
    moveTo(position) {
        this.animationController.playMoveAnimation(this.position, position);
        this.position = { ...position };
    }
    rotateLeft() {
        this.direction = (this.direction - 90 + 360) % 360;
        this.animationController.playRotateAnimation(this.direction);
    }
    rotateRight() {
        this.direction = (this.direction + 90) % 360;
        this.animationController.playRotateAnimation(this.direction);
    }
    setEyeExpression(expression) {
        this.animationController.setEyeExpression(expression);
    }
}
//# sourceMappingURL=Robot.js.map