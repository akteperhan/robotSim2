type EventHandler = (data?: any) => void;
export declare class EventBus {
    private static instance;
    private listeners;
    private eventHistory;
    private constructor();
    static getInstance(): EventBus;
    on(event: string, handler: EventHandler): void;
    off(event: string, handler: EventHandler): void;
    emit(event: string, data?: any): void;
    hasEvent(event: string): boolean;
    clearHistory(): void;
    clearAllListeners(): void;
}
declare const _default: EventBus;
export default _default;
//# sourceMappingURL=EventBus.d.ts.map