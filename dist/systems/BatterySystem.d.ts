export declare class BatterySystem {
    private currentLevel;
    private maxLevel;
    private isCharging;
    constructor(initialLevel?: number, maxLevel?: number);
    getCurrentLevel(): number;
    consume(amount: number): void;
    startCharging(): Promise<void>;
    stopCharging(): void;
}
//# sourceMappingURL=BatterySystem.d.ts.map