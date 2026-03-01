import { CommandType, Color } from '../../core/ICommand';
export class MoveForwardCommand {
    execute(robot, grid) {
        const targetPosition = robot.getForwardPosition();
        if (!grid.isValidPosition(targetPosition)) {
            return {
                success: false,
                errorMessage: 'Cannot move to invalid position',
                batteryConsumed: 0
            };
        }
        robot.moveTo(targetPosition);
        return {
            success: true,
            batteryConsumed: 1
        };
    }
    canExecute(robot, grid) {
        return grid.isValidPosition(robot.getForwardPosition());
    }
    getType() {
        return CommandType.MOVE_FORWARD;
    }
    getDisplayColor() {
        return Color.BLUE;
    }
}
//# sourceMappingURL=MoveForwardCommand.js.map