import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BatterySystem } from '../BatterySystem'
import EventBus from '../EventBus'

describe('Battery System', () => {
  beforeEach(() => {
    EventBus.clearHistory()
    EventBus.clearAllListeners()
  })

  it('should initialize at 5% battery', () => {
    const battery = new BatterySystem()
    
    expect(battery.getCurrentLevel()).toBe(5)
  })

  it('should consume battery correctly', () => {
    const battery = new BatterySystem(10)
    
    battery.consume(3)
    expect(battery.getCurrentLevel()).toBe(7)
    
    battery.consume(2)
    expect(battery.getCurrentLevel()).toBe(5)
  })

  it('should not go below 0%', () => {
    const battery = new BatterySystem(5)
    
    battery.consume(10)
    expect(battery.getCurrentLevel()).toBe(0)
  })

  it('should emit battery:critical event at 2%', () => {
    const battery = new BatterySystem(3)
    let criticalEmitted = false
    
    EventBus.on('battery:critical', () => {
      criticalEmitted = true
    })
    
    battery.consume(1)
    expect(criticalEmitted).toBe(true)
  })

  it('should emit battery:updated event on consume', () => {
    const battery = new BatterySystem(10)
    let updatedLevel = 0
    
    EventBus.on('battery:updated', (level) => {
      updatedLevel = level
    })
    
    battery.consume(3)
    expect(updatedLevel).toBe(7)
  })

  it('should charge to 100%', async () => {
    const battery = new BatterySystem(50)
    
    await battery.startCharging()
    
    expect(battery.getCurrentLevel()).toBe(100)
  })

  it('should emit battery:full event when charging completes', async () => {
    const battery = new BatterySystem(50)
    let fullEmitted = false
    
    EventBus.on('battery:full', () => {
      fullEmitted = true
    })
    
    await battery.startCharging()
    
    expect(fullEmitted).toBe(true)
  })
})
