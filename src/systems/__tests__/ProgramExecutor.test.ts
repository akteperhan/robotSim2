import { beforeEach, describe, expect, it } from 'vitest'
import { Robot } from '../../entities/Robot'
import { Direction, Grid } from '../Grid'
import { BatterySystem } from '../BatterySystem'
import { ProgramExecutor } from '../ProgramExecutor'
import { TurnLeftCommand } from '../commands/TurnLeftCommand'
import EventBus from '../EventBus'

function registerNoopListeners() {
  const noop = () => {}
  const events = [
    'command:highlight',
    'command:executed',
    'robot:moved',
    'battery:updated',
    'battery:critical',
    'battery:dead',
    'program:complete',
    'program:stopped',
    'command:error'
  ]
  events.forEach(event => EventBus.on(event, noop))
}

describe('ProgramExecutor', () => {
  beforeEach(() => {
    EventBus.clearHistory()
    EventBus.clearAllListeners()
    registerNoopListeners()
  })

  it('emits program:complete when all commands finish', async () => {
    const executor = new ProgramExecutor(1)
    executor.addCommand(new TurnLeftCommand())
    executor.addCommand(new TurnLeftCommand())

    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const battery = new BatterySystem(10)

    const result = await executor.execute(robot, grid, battery)

    expect(result.success).toBe(true)
    expect(result.stopped).not.toBe(true)
    expect(EventBus.hasEvent('program:complete')).toBe(true)
    expect(EventBus.hasEvent('program:stopped')).toBe(false)
  })

  it('emits program:stopped and does not emit program:complete when stopped', async () => {
    const executor = new ProgramExecutor(30)
    for (let i = 0; i < 5; i++) executor.addCommand(new TurnLeftCommand())

    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const battery = new BatterySystem(10)

    const runPromise = executor.execute(robot, grid, battery)
    setTimeout(() => executor.stop(), 5)

    const result = await runPromise

    expect(result.success).toBe(false)
    expect(result.stopped).toBe(true)
    expect(EventBus.hasEvent('program:stopped')).toBe(true)
    expect(EventBus.hasEvent('program:complete')).toBe(false)
  })
})
