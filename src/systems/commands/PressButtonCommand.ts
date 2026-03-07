import { ICommand, CommandType, CommandResult, Color } from '../../core/ICommand'
import { Robot } from '../../entities/Robot'
import { Grid } from '../Grid'
import { InteractableType } from '../../core/IInteractable'
import { BATTERY_COST } from '../../core/Constants'

export class PressButtonCommand implements ICommand {
  execute(robot: Robot, grid: Grid): CommandResult {
    const nearbyButton = grid.getInteractableInRange(robot.getPosition())

    if (!nearbyButton || nearbyButton.getType() !== InteractableType.BUTTON) {
      return {
        success: false,
        errorMessage: 'No button in range',
        batteryConsumed: 0
      }
    }

    nearbyButton.interact()
    return {
      success: true,
      batteryConsumed: BATTERY_COST.PRESS_BUTTON
    }
  }

  canExecute(robot: Robot, grid: Grid): boolean {
    const nearbyButton = grid.getInteractableInRange(robot.getPosition())
    return nearbyButton !== null && nearbyButton.getType() === InteractableType.BUTTON
  }

  getType(): CommandType {
    return CommandType.PRESS_BUTTON
  }

  getDisplayColor(): Color {
    return Color.PURPLE
  }
}
