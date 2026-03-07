import { beforeEach, describe, expect, it } from 'vitest'
import { Robot } from '../../entities/Robot'
import { Direction, Grid } from '../Grid'
import { BatterySystem } from '../BatterySystem'
import { ProgramExecutor } from '../ProgramExecutor'
import { TurnLeftCommand } from '../commands/TurnLeftCommand'
import EventBus from '../EventBus'
import type { EventMap } from '../EventBus'

function registerNoopListeners() {
  const events: (keyof EventMap)[] = [
    'command:highlight',
    'command:executed',
    'robot:moved',
    'battery:updated',
    'battery:critical',
    'battery:dead',
    'program:complete',
    'program:stopped',
    'command:error',
    'execution:paused'
  ]
  events.forEach(event => EventBus.on(event as any, (() => {}) as any))
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
    expect(result.commandsExecuted).toBe(2)
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

  it('supports speed control', () => {
    const executor = new ProgramExecutor(500)
    expect(executor.getSpeed()).toBe(500)

    executor.setSpeed(1000)
    expect(executor.getSpeed()).toBe(1000)

    // Clamp to min
    executor.setSpeed(50)
    expect(executor.getSpeed()).toBe(100)

    // Clamp to max
    executor.setSpeed(5000)
    expect(executor.getSpeed()).toBe(3000)
  })

  it('supports step mode', async () => {
    const executor = new ProgramExecutor(1)
    executor.setStepMode(true)
    executor.addCommand(new TurnLeftCommand())
    executor.addCommand(new TurnLeftCommand())

    const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH)
    const grid = new Grid(5, 5)
    const battery = new BatterySystem(10)

    const runPromise = executor.execute(robot, grid, battery)

    // Step through each command
    await new Promise(resolve => setTimeout(resolve, 10))
    executor.stepNext()
    await new Promise(resolve => setTimeout(resolve, 10))
    executor.stepNext()

    const result = await runPromise
    expect(result.success).toBe(true)
    expect(result.commandsExecuted).toBe(2)
  })
})
