import { InteractableType } from '../../core/IInteractable';
import EventBus from '../../systems/EventBus';
export class Button {
    constructor(onPress) {
        this.isPressed = false;
        this.onPressCallback = onPress;
    }
    getType() {
        return InteractableType.BUTTON;
    }
    interact() {
        if (!this.isPressed) {
            this.isPressed = true;
            this.onPressCallback();
            EventBus.emit('button:pressed');
        }
    }
    canInteract() {
        return !this.isPressed;
    }
}
//# sourceMappingURL=Button.js.map