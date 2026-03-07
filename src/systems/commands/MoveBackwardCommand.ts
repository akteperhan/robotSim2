import { ICommand, CommandType, CommandResult, Color } from '../../core/ICommand'
import { Robot } from '../../entities/Robot'
import { Grid } from '../Grid'
import { BATTERY_COST } from '../../core/Constants'

export class MoveBackwardCommand implements ICommand {
  execute(robot: Robot, grid: Grid): CommandResult {
    const nextPos = robot.getBackwardPosition()
    if (!grid.isValidPosition(nextPos)) {
      return { success: false, errorMessage: 'Cannot move backward', batteryConsumed: 0 }
    }
    robot.moveTo(nextPos)
    return { success: true, batteryConsumed: BATTERY_COST.MOVE_BACKWARD }
  }

  canExecute(robot: Robot, grid: Grid): boolean {
    return grid.isValidPosition(robot.getBackwardPosition())
  }

  getType(): CommandType {
    return CommandType.MOVE_BACKWARD
  }

  getDisplayColor(): Color {
    return Color.BLUE
  }
}
