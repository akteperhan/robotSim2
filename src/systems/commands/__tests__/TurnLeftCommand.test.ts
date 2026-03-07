import { describe, expect, it } from 'vitest'
import { Robot } from '../../../entities/Robot'
import { Direction, Grid } from '../../Grid'
import { TurnLeftCommand } from '../TurnLeftCommand'
import { CommandType } from '../../../core/ICommand'

describe('TurnLeftCommand', () => {
  it('rotates robot 90 degrees left', () => {
    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new TurnLeftCommand()

    const result = command.execute(robot, grid)

    expect(result).toEqual({ success: true, batteryConsumed: 0.1 })
    expect(robot.getDirection()).toBe(Direction.WEST)
  })

  it('wraps around from west to south', () => {
    const robot = new Robot({ x: 2, y: 2 }, Direction.WEST)
    const grid = new Grid(5, 5)
    const command = new TurnLeftCommand()

    command.execute(robot, grid)

    expect(robot.getDirection()).toBe(Direction.SOUTH)
  })

  it('does not change position', () => {
    const robot = new Robot({ x: 3, y: 1 }, Direction.EAST)
    const grid = new Grid(5, 5)
    const command = new TurnLeftCommand()

    command.execute(robot, grid)

    expect(robot.getPosition()).toEqual({ x: 3, y: 1 })
  })

  it('canExecute always returns true', () => {
    const robot = new Robot({ x: 0, y: 0 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new TurnLeftCommand()

    expect(command.canExecute(robot, grid)).toBe(true)
  })

  it('returns correct type', () => {
    const command = new TurnLeftCommand()
    expect(command.getType()).toBe(CommandType.TURN_LEFT)
  })
})
