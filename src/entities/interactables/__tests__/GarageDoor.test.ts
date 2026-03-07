import { describe, expect, it } from 'vitest'
import { GarageDoor } from '../GarageDoor'
import { InteractableType } from '../../../core/IInteractable'

describe('GarageDoor', () => {
  it('starts closed', () => {
    const door = new GarageDoor()
    expect(door.getIsOpen()).toBe(false)
  })

  it('opens on interact', () => {
    const door = new GarageDoor()
    door.interact()
    expect(door.getIsOpen()).toBe(true)
  })

  it('does not re-open when already open', () => {
    const door = new GarageDoor()
    door.interact()
    door.interact() // should not throw or change state
    expect(door.getIsOpen()).toBe(true)
  })

  it('canInteract returns true when closed', () => {
    const door = new GarageDoor()
    expect(door.canInteract()).toBe(true)
  })

  it('canInteract returns false when open', () => {
    const door = new GarageDoor()
    door.interact()
    expect(door.canInteract()).toBe(false)
  })

  it('returns correct type', () => {
    const door = new GarageDoor()
    expect(door.getType()).toBe(InteractableType.DOOR)
  })
})
