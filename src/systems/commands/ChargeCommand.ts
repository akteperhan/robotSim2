import { ICommand, CommandType, CommandResult, Color } from '../../core/ICommand'
import { Robot } from '../../entities/Robot'
import { Grid } from '../Grid'
import { InteractableType } from '../../core/IInteractable'
import { BATTERY_COST } from '../../core/Constants'

export class ChargeCommand implements ICommand {
  async execute(robot: Robot, grid: Grid): Promise<CommandResult> {
    const pad = grid.getInteractableInRange(robot.getPosition())

    if (!pad || pad.getType() !== InteractableType.CHARGING_PAD) {
      return {
        success: false,
        errorMessage: 'No charging pad in range',
        batteryConsumed: 0
      }
    }

    pad.interact()

    // Wait for charging to complete (BatterySystem.startCharging is async)
    // The interact() call triggers the async charging, we wait a bit for it
    await new Promise(resolve => setTimeout(resolve, 3800))

    return {
      success: true,
      batteryConsumed: BATTERY_COST.CHARGE
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
