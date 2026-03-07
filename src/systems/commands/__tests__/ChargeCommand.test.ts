import { describe, expect, it } from 'vitest'
import { Robot } from '../../../entities/Robot'
import { Direction, Grid } from '../../Grid'
import { BatterySystem } from '../../BatterySystem'
import { ChargingPad } from '../../../entities/interactables/ChargingPad'
import { ChargeCommand } from '../ChargeCommand'
import { CommandType } from '../../../core/ICommand'

describe('ChargeCommand', () => {
  it('fails when no charging pad in range', async () => {
    const grid = new Grid(5, 5)
    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const command = new ChargeCommand()

    const result = await command.execute(robot, grid)

    expect(result.success).toBe(false)
    expect(result.batteryConsumed).toBe(0)
  })

  it('succeeds when charging pad is in range', async () => {
    const battery = new BatterySystem(5)
    const pad = new ChargingPad(battery)
    const grid = new Grid(5, 5)
    grid.placeInteractable({ x: 2, y: 2 }, pad)
    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const command = new ChargeCommand()

    const result = await command.execute(robot, grid)

    expect(result.success).toBe(true)
    expect(result.batteryConsumed).toBe(0)
  }, 5000)

  it('canExecute returns true when pad nearby', () => {
    const battery = new BatterySystem(5)
    const pad = new ChargingPad(battery)
    const grid = new Grid(5, 5)
    grid.placeInteractable({ x: 1, y: 1 }, pad)
    const robot = new Robot({ x: 1, y: 1 }, Direction.NORTH)
    const command = new ChargeCommand()

    expect(command.canExecute(robot, grid)).toBe(true)
  })

  it('canExecute returns false when no pad', () => {
    const grid = new Grid(5, 5)
    const robot = new Robot({ x: 1, y: 1 }, Direction.NORTH)
    const command = new ChargeCommand()

    expect(command.canExecute(robot, grid)).toBe(false)
  })

  it('returns correct type', () => {
    const command = new ChargeCommand()
    expect(command.getType()).toBe(CommandType.CHARGE)
  })
})
