import { CommandType } from '../core/ICommand'
import { EyeExpression } from '../entities/Robot'

// ═══════════════════════════════════════════
// EVENT MAP — Type-safe event definitions
// ═══════════════════════════════════════════
export interface EventMap {
  // Battery
  'battery:updated': number
  'battery:critical': void
  'battery:full': void
  'battery:dead': void

  // Door
  'door:opening': void

  // Button
  'button:pressed': void

  // Robot
  'robot:on_charging_pad': void
  'robot:moved': void
  'robot:expression': EyeExpression

  // Command execution
  'command:highlight': number
  'command:executed': { type: CommandType; index: number }
  'command:error': { index: number; message: string }

  // Program flow
  'program:complete': void
  'program:stopped': { stoppedAt: number }

  // Execution control
  'execution:paused': number
}

// ═══════════════════════════════════════════
// TYPED EVENT BUS
// ═══════════════════════════════════════════
type EventHandler<T = void> = T extends void ? () => void : (data: T) => void

export class EventBus {
  private static instance: EventBus
  private listeners: Map<string, Function[]>
  private eventHistory: Set<string>
  private debug = false

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

  setDebug(enabled: boolean): void {
    this.debug = enabled
  }

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(handler)
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    this.eventHistory.add(event)
    const handlers = this.listeners.get(event)

    if (!handlers || handlers.length === 0) {
      if (this.debug) {
        console.warn(`[EventBus] No listeners for: ${event}`)
      }
      return
    }

    handlers.forEach(handler => {
      try {
        (handler as Function)(args[0])
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${event}:`, error)
      }
    })
  }

  hasEvent<K extends keyof EventMap>(event: K): boolean {
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
