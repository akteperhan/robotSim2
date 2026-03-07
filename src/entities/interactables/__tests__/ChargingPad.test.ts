import { describe, expect, it } from 'vitest'
import { ChargingPad } from '../ChargingPad'
import { BatterySystem } from '../../../systems/BatterySystem'
import { InteractableType } from '../../../core/IInteractable'

describe('ChargingPad', () => {
  it('returns correct type', () => {
    const battery = new BatterySystem(50)
    const pad = new ChargingPad(battery)
    expect(pad.getType()).toBe(InteractableType.CHARGING_PAD)
  })

  it('canInteract always returns true', () => {
    const battery = new BatterySystem(100)
    const pad = new ChargingPad(battery)
    expect(pad.canInteract()).toBe(true)
  })

  it('interact triggers battery charging', async () => {
    const battery = new BatterySystem(10)
    const pad = new ChargingPad(battery)

    pad.interact()

    // Battery should start charging (level increases over time)
    await new Promise(resolve => setTimeout(resolve, 2200))
    expect(battery.getCurrentLevel()).toBe(100)
  }, 5000)
})
