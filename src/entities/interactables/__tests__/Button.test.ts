import { describe, expect, it, vi } from 'vitest'
import { Button } from '../Button'
import { InteractableType } from '../../../core/IInteractable'

describe('Button', () => {
  it('calls callback on first interact', () => {
    const callback = vi.fn()
    const button = new Button(callback)

    button.interact()

    expect(callback).toHaveBeenCalledOnce()
  })

  it('does not call callback on second interact', () => {
    const callback = vi.fn()
    const button = new Button(callback)

    button.interact()
    button.interact()

    expect(callback).toHaveBeenCalledOnce()
  })

  it('canInteract returns true before press', () => {
    const button = new Button(() => {})
    expect(button.canInteract()).toBe(true)
  })

  it('canInteract returns false after press', () => {
    const button = new Button(() => {})
    button.interact()
    expect(button.canInteract()).toBe(false)
  })

  it('returns correct type', () => {
    const button = new Button(() => {})
    expect(button.getType()).toBe(InteractableType.BUTTON)
  })
})
