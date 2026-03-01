import { CommandType, Color } from '../../core/ICommand';
export class TurnRightCommand {
    execute(robot, grid) {
        robot.rotateRight();
        return {
            success: true,
            batteryConsumed: 0.5
        };
    }
    canExecute(robot, grid) {
        return true;
    }
    getType() {
        return CommandType.TURN_RIGHT;
    }
    getDisplayColor() {
        return Color.BLUE;
    }
}
//# sourceMappingURL=TurnRightCommand.js.map