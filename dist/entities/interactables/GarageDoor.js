import { InteractableType } from '../../core/IInteractable';
import EventBus from '../../systems/EventBus';
export class GarageDoor {
    constructor() {
        this.isOpen = false;
    }
    getType() {
        return InteractableType.DOOR;
    }
    interact() {
        if (!this.isOpen) {
            this.isOpen = true;
            EventBus.emit('door:opening');
        }
    }
    canInteract() {
        return !this.isOpen;
    }
    getIsOpen() {
        return this.isOpen;
    }
}
//# sourceMappingURL=GarageDoor.js.map