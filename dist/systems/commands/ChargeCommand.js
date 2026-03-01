import { CommandType, Color } from '../../core/ICommand';
import { InteractableType } from '../../core/IInteractable';
export class ChargeCommand {
    execute(robot, grid) {
        const pad = grid.getInteractableInRange(robot.getPosition());
        if (!pad || pad.getType() !== InteractableType.CHARGING_PAD) {
            return {
                success: false,
                errorMessage: 'No charging pad in range',
                batteryConsumed: 0
            };
        }
        pad.interact();
        return {
            success: true,
            batteryConsumed: 0
        };
    }
    canExecute(robot, grid) {
        const pad = grid.getInteractableInRange(robot.getPosition());
        return pad !== null && pad.getType() === InteractableType.CHARGING_PAD;
    }
    getType() {
        return CommandType.CHARGE;
    }
    getDisplayColor() {
        return Color.PURPLE;
    }
}
//# sourceMappingURL=ChargeCommand.js.map