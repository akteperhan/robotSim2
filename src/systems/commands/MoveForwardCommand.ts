import { ICommand, CommandType, CommandResult, Color } from '../../core/ICommand'
import { Robot } from '../../entities/Robot'
import { Grid } from '../Grid'
import { BATTERY_COST } from '../../core/Constants'

export class MoveForwardCommand implements ICommand {
  execute(robot: Robot, grid: Grid): CommandResult {
    const targetPosition = robot.getForwardPosition()

    if (!grid.isValidPosition(targetPosition)) {
      return {
        success: false,
        errorMessage: 'Cannot move to invalid position',
        batteryConsumed: 0
      }
    }

    robot.moveTo(targetPosition)
    return {
      success: true,
      batteryConsumed: BATTERY_COST.MOVE_FORWARD
    }
  }

  canExecute(robot: Robot, grid: Grid): boolean {
    return grid.isValidPosition(robot.getForwardPosition())
  }

  getType(): CommandType {
    return CommandType.MOVE_FORWARD
  }

  getDisplayColor(): Color {
    return Color.BLUE
  }
}
