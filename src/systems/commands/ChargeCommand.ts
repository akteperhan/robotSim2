import { ICommand, CommandType, CommandResult, Color } from '../../core/ICommand'
import { Robot } from '../../entities/Robot'
import { Grid } from '../Grid'
import { InteractableType } from '../../core/IInteractable'

export class ChargeCommand implements ICommand {
    execute(robot: Robot, grid: Grid): CommandResult {
        const pad = grid.getInteractableInRange(robot.getPosition())

        if (!pad || pad.getType() !== InteractableType.CHARGING_PAD) {
            return {
                success: false,
                errorMessage: 'No charging pad in range',
                batteryConsumed: 0
            }
        }

        pad.interact()
        return {
            success: true,
            batteryConsumed: 0
        }
    }

    canExecute(robot: Robot, grid: Grid): boolean {
        const pad = grid.getInteractableInRange(robot.getPosition())
        return pad !== null && pad.getType() === InteractableType.CHARGING_PAD
    }

    getType(): CommandType {
        return CommandType.CHARGE
    }

    getDisplayColor(): Color {
        return Color.PURPLE
    }
}
