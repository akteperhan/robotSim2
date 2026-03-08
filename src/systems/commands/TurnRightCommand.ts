import { ICommand, CommandType, CommandResult, Color } from '../../core/ICommand'
import { Robot } from '../../entities/Robot'
import { Grid } from '../Grid'
import { BATTERY_COST } from '../../core/Constants'

export class TurnRightCommand implements ICommand {
  execute(robot: Robot, grid: Grid): CommandResult {
    robot.rotateLeft()
    return {
      success: true,
      batteryConsumed: BATTERY_COST.TURN_RIGHT
    }
  }

  canExecute(robot: Robot, grid: Grid): boolean {
    return true
  }

  getType(): CommandType {
    return CommandType.TURN_RIGHT
  }

  getDisplayColor(): Color {
    return Color.BLUE
  }
}
