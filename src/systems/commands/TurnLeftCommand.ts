import { ICommand, CommandType, CommandResult, Color } from '../../core/ICommand'
import { Robot } from '../../entities/Robot'
import { Grid } from '../Grid'

export class TurnLeftCommand implements ICommand {
  execute(robot: Robot, grid: Grid): CommandResult {
    robot.rotateLeft()
    return {
      success: true,
      batteryConsumed: 0.5
    }
  }

  canExecute(robot: Robot, grid: Grid): boolean {
    return true
  }

  getType(): CommandType {
    return CommandType.TURN_LEFT
  }

  getDisplayColor(): Color {
    return Color.BLUE
  }
}
