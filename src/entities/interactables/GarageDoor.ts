import { IInteractable, InteractableType } from '../../core/IInteractable'
import EventBus from '../../systems/EventBus'

export class GarageDoor implements IInteractable {
  private isOpen: boolean

  constructor() {
    this.isOpen = false
  }

  getType(): InteractableType {
    return InteractableType.DOOR
  }

  interact(): void {
    if (!this.isOpen) {
      this.isOpen = true
      EventBus.emit('door:opening')
    }
  }

  canInteract(): boolean {
    return !this.isOpen
  }

  getIsOpen(): boolean {
    return this.isOpen
  }
}
