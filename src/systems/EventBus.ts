type EventHandler = (data?: any) => void

export class EventBus {
  private static instance: EventBus
  private listeners: Map<string, EventHandler[]>
  private eventHistory: Set<string>

  private constructor() {
    this.listeners = new Map()
    this.eventHistory = new Set()
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(handler)
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit(event: string, data?: any): void {
    this.eventHistory.add(event)
    const handlers = this.listeners.get(event)
    
    if (!handlers || handlers.length === 0) {
      console.warn(`No listeners for event: ${event}`)
      return
    }

    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error)
      }
    })
  }

  hasEvent(event: string): boolean {
    return this.eventHistory.has(event)
  }

  clearHistory(): void {
    this.eventHistory.clear()
  }

  clearAllListeners(): void {
    this.listeners.clear()
  }
}

// Export singleton instance
export default EventBus.getInstance()
