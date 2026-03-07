import { describe, expect, it, vi } from 'vitest'
import { Robot } from '../../../entities/Robot'
import { Direction, Grid } from '../../Grid'
import { PressButtonCommand } from '../PressButtonCommand'
import { Button } from '../../../entities/interactables/Button'
import { CommandType, Color } from '../../../core/ICommand'

describe('PressButtonCommand', () => {
  it('presses button when robot is at button position', () => {
    const callback = vi.fn()
    const button = new Button(callback)
    const grid = new Grid(5, 5)
    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    grid.placeInteractable({ x: 2, y: 2 }, button)
    const command = new PressButtonCommand()

    const result = command.execute(robot, grid)

    expect(result).toEqual({ success: true, batteryConsumed: 0.2 })
    expect(callback).toHaveBeenCalled()
  })

  it('fails when no button in range', () => {
    const grid = new Grid(5, 5)
    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const command = new PressButtonCommand()

    const result = command.execute(robot, grid)

    expect(result.success).toBe(false)
    expect(result.batteryConsumed).toBe(0)
  })

  it('canExecute returns true when button is at robot position', () => {
    const button = new Button(() => {})
    const grid = new Grid(5, 5)
    const robot = new Robot({ x: 1, y: 1 }, Direction.NORTH)
    grid.placeInteractable({ x: 1, y: 1 }, button)
    const command = new PressButtonCommand()

    expect(command.canExecute(robot, grid)).toBe(true)
  })

  it('canExecute returns false when no button nearby', () => {
    const grid = new Grid(5, 5)
    const robot = new Robot({ x: 1, y: 1 }, Direction.NORTH)
    const command = new PressButtonCommand()

    expect(command.canExecute(robot, grid)).toBe(false)
  })

  it('returns correct type and color', () => {
    const command = new PressButtonCommand()
    expect(command.getType()).toBe(CommandType.PRESS_BUTTON)
    expect(command.getDisplayColor()).toBe(Color.PURPLE)
  })
})
