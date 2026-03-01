import { IInteractable, InteractableType } from '../../core/IInteractable'
import { BatterySystem } from '../../systems/BatterySystem'
import EventBus from '../../systems/EventBus'

export class ChargingPad implements IInteractable {
  private batterySystem: BatterySystem

  constructor(batterySystem: BatterySystem) {
    this.batterySystem = batterySystem
  }

  getType(): InteractableType {
    return InteractableType.CHARGING_PAD
  }

  interact(): void {
    EventBus.emit('robot:on_charging_pad')
    this.batterySystem.startCharging()
  }

  canInteract(): boolean {
    return true
  }
}
