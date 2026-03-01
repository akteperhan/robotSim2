import { InteractableType } from '../../core/IInteractable';
import EventBus from '../../systems/EventBus';
export class ChargingPad {
    constructor(batterySystem) {
        this.batterySystem = batterySystem;
    }
    getType() {
        return InteractableType.CHARGING_PAD;
    }
    interact() {
        EventBus.emit('robot:on_charging_pad');
        this.batterySystem.startCharging();
    }
    canInteract() {
        return true;
    }
}
//# sourceMappingURL=ChargingPad.js.map