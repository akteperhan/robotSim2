import { CommandType, Color } from '../../core/ICommand';
export class TurnLeftCommand {
    execute(robot, grid) {
        robot.rotateLeft();
        return {
            success: true,
            batteryConsumed: 0.5
        };
    }
    canExecute(robot, grid) {
        return true;
    }
    getType() {
        return CommandType.TURN_LEFT;
    }
    getDisplayColor() {
        return Color.BLUE;
    }
}
//# sourceMappingURL=TurnLeftCommand.js.map