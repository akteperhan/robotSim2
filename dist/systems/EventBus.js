export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = new Set();
    }
    static getInstance() {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
    }
    off(event, handler) {
        const handlers = this.listeners.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    emit(event, data) {
        this.eventHistory.add(event);
        const handlers = this.listeners.get(event);
        if (!handlers || handlers.length === 0) {
            console.warn(`No listeners for event: ${event}`);
            return;
        }
        handlers.forEach(handler => {
            try {
                handler(data);
            }
            catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
    hasEvent(event) {
        return this.eventHistory.has(event);
    }
    clearHistory() {
        this.eventHistory.clear();
    }
    clearAllListeners() {
        this.listeners.clear();
    }
}
// Export singleton instance
export default EventBus.getInstance();
//# sourceMappingURL=EventBus.js.map