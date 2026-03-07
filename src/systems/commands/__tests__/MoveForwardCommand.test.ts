import { describe, expect, it } from 'vitest'
import { Robot } from '../../../entities/Robot'
import { Direction, Grid } from '../../Grid'
import { MoveForwardCommand } from '../MoveForwardCommand'
import { CommandType, Color } from '../../../core/ICommand'

describe('MoveForwardCommand', () => {
  it('moves robot forward when target cell is valid', () => {
    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new MoveForwardCommand()

    const result = command.execute(robot, grid)

    expect(result).toEqual({ success: true, batteryConsumed: 0.1 })
    expect(robot.getPosition()).toEqual({ x: 2, y: 3 })
  })

  it('returns error when forward cell is out of bounds', () => {
    const robot = new Robot({ x: 2, y: 4 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new MoveForwardCommand()

    const result = command.execute(robot, grid)

    expect(result.success).toBe(false)
    expect(result.batteryConsumed).toBe(0)
    expect(robot.getPosition()).toEqual({ x: 2, y: 4 })
  })

  it('moves east when facing east', () => {
    const robot = new Robot({ x: 1, y: 1 }, Direction.EAST)
    const grid = new Grid(5, 5)
    const command = new MoveForwardCommand()

    command.execute(robot, grid)

    expect(robot.getPosition()).toEqual({ x: 2, y: 1 })
  })

  it('canExecute returns true for walkable forward position', () => {
    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new MoveForwardCommand()

    expect(command.canExecute(robot, grid)).toBe(true)
  })

  it('canExecute returns false for out-of-bounds forward position', () => {
    const robot = new Robot({ x: 2, y: 4 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new MoveForwardCommand()

    expect(command.canExecute(robot, grid)).toBe(false)
  })

  it('returns correct type and color', () => {
    const command = new MoveForwardCommand()
    expect(command.getType()).toBe(CommandType.MOVE_FORWARD)
    expect(command.getDisplayColor()).toBe(Color.BLUE)
  })
})
