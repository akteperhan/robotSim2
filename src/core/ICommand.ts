import { Robot } from '../entities/Robot'
import { Grid } from '../systems/Grid'

export enum CommandType {
  MOVE_FORWARD = 'MOVE_FORWARD',
  MOVE_BACKWARD = 'MOVE_BACKWARD',
  TURN_LEFT = 'TURN_LEFT',
  TURN_RIGHT = 'TURN_RIGHT',
  PRESS_BUTTON = 'PRESS_BUTTON',
  CHARGE = 'CHARGE'
}

export enum Color {
  BLUE = '#4A90E2',
  PURPLE = '#9B59B6'
}

export interface CommandResult {
  success: boolean
  errorMessage?: string
  batteryConsumed: number
}

export interface ICommand {
  execute(robot: Robot, grid: Grid): CommandResult | Promise<CommandResult>
  canExecute(robot: Robot, grid: Grid): boolean
  getType(): CommandType
  getDisplayColor(): Color
}
