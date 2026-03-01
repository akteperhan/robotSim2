import { IInteractable, InteractableType } from '../../core/IInteractable';
import { BatterySystem } from '../../systems/BatterySystem';
export declare class ChargingPad implements IInteractable {
    private batterySystem;
    constructor(batterySystem: BatterySystem);
    getType(): InteractableType;
    interact(): void;
    canInteract(): boolean;
}
//# sourceMappingURL=ChargingPad.d.ts.map