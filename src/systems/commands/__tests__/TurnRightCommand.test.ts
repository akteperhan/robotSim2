import { describe, expect, it } from 'vitest'
import { Robot } from '../../../entities/Robot'
import { Direction, Grid } from '../../Grid'
import { TurnRightCommand } from '../TurnRightCommand'
import { CommandType } from '../../../core/ICommand'

describe('TurnRightCommand', () => {
  it('rotates robot 90 degrees right', () => {
    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new TurnRightCommand()

    const result = command.execute(robot, grid)

    expect(result).toEqual({ success: true, batteryConsumed: 0.1 })
    expect(robot.getDirection()).toBe(Direction.EAST)
  })

  it('wraps around from east to south (full 360)', () => {
    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new TurnRightCommand()

    command.execute(robot, grid)
    expect(robot.getDirection()).toBe(Direction.EAST)
    command.execute(robot, grid)
    expect(robot.getDirection()).toBe(Direction.SOUTH)
    command.execute(robot, grid)
    expect(robot.getDirection()).toBe(Direction.WEST)
    command.execute(robot, grid)
    expect(robot.getDirection()).toBe(Direction.NORTH)
  })

  it('does not change position', () => {
    const robot = new Robot({ x: 1, y: 3 }, Direction.SOUTH)
    const grid = new Grid(5, 5)
    const command = new TurnRightCommand()

    command.execute(robot, grid)

    expect(robot.getPosition()).toEqual({ x: 1, y: 3 })
  })

  it('canExecute always returns true', () => {
    const robot = new Robot({ x: 0, y: 0 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const command = new TurnRightCommand()

    expect(command.canExecute(robot, grid)).toBe(true)
  })

  it('returns correct type', () => {
    const command = new TurnRightCommand()
    expect(command.getType()).toBe(CommandType.TURN_RIGHT)
  })
})
