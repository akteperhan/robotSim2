import { CommandType, Color } from '../../core/ICommand';
export class MoveBackwardCommand {
    execute(robot, grid) {
        const nextPos = robot.getBackwardPosition();
        if (!grid.isValidPosition(nextPos)) {
            return { success: false, errorMessage: 'Cannot move backward', batteryConsumed: 0 };
        }
        robot.moveTo(nextPos);
        return { success: true, batteryConsumed: 1 };
    }
    canExecute(robot, grid) {
        return grid.isValidPosition(robot.getBackwardPosition());
    }
    getType() {
        return CommandType.MOVE_BACKWARD;
    }
    getDisplayColor() {
        return Color.BLUE;
    }
}
//# sourceMappingURL=MoveBackwardCommand.js.map