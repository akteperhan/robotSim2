import { ICommand, CommandType, CommandResult, Color } from '../../core/ICommand'
import { Robot } from '../../entities/Robot'
import { Grid } from '../Grid'
import { InteractableType } from '../../core/IInteractable'
import { BATTERY_COST, DOOR_ANIMATION_DURATION } from '../../core/Constants'

export class PressButtonCommand implements ICommand {
  async execute(robot: Robot, grid: Grid): Promise<CommandResult> {
    const nearbyButton = grid.getInteractableInRange(robot.getPosition())

    if (!nearbyButton || nearbyButton.getType() !== InteractableType.BUTTON) {
      return {
        success: false,
        errorMessage: 'No button in range',
        batteryConsumed: 0
      }
    }

    nearbyButton.interact()

    // Wait for door animation to complete + small buffer
    await new Promise(resolve => setTimeout(resolve, DOOR_ANIMATION_DURATION + 500))

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
