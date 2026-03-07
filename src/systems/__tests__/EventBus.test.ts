import { describe, expect, it, vi, beforeEach } from 'vitest'
import EventBus, { EventBus as EventBusClass } from '../EventBus'

describe('EventBus', () => {
  beforeEach(() => {
    EventBus.clearAllListeners()
    EventBus.clearHistory()
  })

  it('calls registered handler on emit', () => {
    const handler = vi.fn()
    EventBus.on('battery:updated', handler)

    EventBus.emit('battery:updated', 50)

    expect(handler).toHaveBeenCalledWith(50)
  })

  it('calls multiple handlers for same event', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    EventBus.on('battery:updated', h1)
    EventBus.on('battery:updated', h2)

    EventBus.emit('battery:updated', 75)

    expect(h1).toHaveBeenCalledWith(75)
    expect(h2).toHaveBeenCalledWith(75)
  })

  it('removes handler with off', () => {
    const handler = vi.fn()
    EventBus.on('battery:updated', handler)
    EventBus.off('battery:updated', handler)

    EventBus.emit('battery:updated', 30)

    expect(handler).not.toHaveBeenCalled()
  })

  it('handles void events', () => {
    const handler = vi.fn()
    EventBus.on('battery:critical', handler)

    EventBus.emit('battery:critical')

    expect(handler).toHaveBeenCalled()
  })

  it('does not throw when emitting with no listeners', () => {
    expect(() => EventBus.emit('battery:dead')).not.toThrow()
  })

  it('tracks event history', () => {
    expect(EventBus.hasEvent('door:opening')).toBe(false)

    EventBus.emit('door:opening')

    expect(EventBus.hasEvent('door:opening')).toBe(true)
  })

  it('clears history', () => {
    EventBus.emit('door:opening')
    EventBus.clearHistory()

    expect(EventBus.hasEvent('door:opening')).toBe(false)
  })

  it('clears all listeners', () => {
    const handler = vi.fn()
    EventBus.on('button:pressed', handler)
    EventBus.clearAllListeners()

    EventBus.emit('button:pressed')

    expect(handler).not.toHaveBeenCalled()
  })

  it('handles errors in handlers gracefully', () => {
    const errorHandler = vi.fn(() => { throw new Error('test') })
    const goodHandler = vi.fn()
    EventBus.on('battery:updated', errorHandler)
    EventBus.on('battery:updated', goodHandler)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    EventBus.emit('battery:updated', 10)
    consoleSpy.mockRestore()

    expect(goodHandler).toHaveBeenCalledWith(10)
  })

  it('is a singleton', () => {
    const instance1 = EventBusClass.getInstance()
    const instance2 = EventBusClass.getInstance()
    expect(instance1).toBe(instance2)
  })
})
