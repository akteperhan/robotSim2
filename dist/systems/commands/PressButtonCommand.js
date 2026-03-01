import { CommandType, Color } from '../../core/ICommand';
import { InteractableType } from '../../core/IInteractable';
export class PressButtonCommand {
    execute(robot, grid) {
        const nearbyButton = grid.getInteractableInRange(robot.getPosition());
        if (!nearbyButton || nearbyButton.getType() !== InteractableType.BUTTON) {
            return {
                success: false,
                errorMessage: 'No button in range',
                batteryConsumed: 0
            };
        }
        nearbyButton.interact();
        return {
            success: true,
            batteryConsumed: 1
        };
    }
    canExecute(robot, grid) {
        const nearbyButton = grid.getInteractableInRange(robot.getPosition());
        return nearbyButton !== null && nearbyButton.getType() === InteractableType.BUTTON;
    }
    getType() {
        return CommandType.PRESS_BUTTON;
    }
    getDisplayColor() {
        return Color.PURPLE;
    }
}
//# sourceMappingURL=PressButtonCommand.js.map