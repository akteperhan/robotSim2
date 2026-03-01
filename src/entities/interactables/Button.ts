import { IInteractable, InteractableType } from '../../core/IInteractable'
import EventBus from '../../systems/EventBus'

export class Button implements IInteractable {
  private isPressed: boolean
  private onPressCallback: () => void

  constructor(onPress: () => void) {
    this.isPressed = false
    this.onPressCallback = onPress
  }

  getType(): InteractableType {
    return InteractableType.BUTTON
  }

  interact(): void {
    if (!this.isPressed) {
      this.isPressed = true
      this.onPressCallback()
      EventBus.emit('button:pressed')
    }
  }

  canInteract(): boolean {
    return !this.isPressed
  }
}
