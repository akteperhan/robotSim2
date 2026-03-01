import { describe, expect, it } from 'vitest'
import { Robot } from '../../../entities/Robot'
import { Direction, Grid } from '../../Grid'
import { MoveBackwardCommand } from '../MoveBackwardCommand'

describe('MoveBackwardCommand', () => {
  it('moves robot backward when target cell is valid', () => {
    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new MoveBackwardCommand()

    const result = command.execute(robot, grid)

    expect(result).toEqual({ success: true, batteryConsumed: 1 })
    expect(robot.getPosition()).toEqual({ x: 2, y: 1 })
  })

  it('returns error when backward cell is invalid', () => {
    const robot = new Robot({ x: 0, y: 0 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new MoveBackwardCommand()

    const result = command.execute(robot, grid)

    expect(result).toEqual({
      success: false,
      errorMessage: 'Cannot move backward',
      batteryConsumed: 0
    })
    expect(robot.getPosition()).toEqual({ x: 0, y: 0 })
  })

  it('canExecute reflects backward walkability', () => {
    const command = new MoveBackwardCommand()
    const grid = new Grid(5, 5)
    const movableRobot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const blockedRobot = new Robot({ x: 2, y: 0 }, Direction.NORTH)

    expect(command.canExecute(movableRobot, grid)).toBe(true)
    expect(command.canExecute(blockedRobot, grid)).toBe(false)
  })
})
