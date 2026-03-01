import EventBus from './EventBus';
export class BatterySystem {
    constructor(initialLevel = 5, maxLevel = 100) {
        this.currentLevel = initialLevel;
        this.maxLevel = maxLevel;
        this.isCharging = false;
    }
    getCurrentLevel() {
        return this.currentLevel;
    }
    consume(amount) {
        this.currentLevel = Math.max(0, this.currentLevel - amount);
        EventBus.emit('battery:updated', this.currentLevel);
        if (this.currentLevel <= 2) {
            EventBus.emit('battery:critical');
        }
    }
    async startCharging() {
        this.isCharging = true;
        const startLevel = this.currentLevel;
        const chargeDuration = 2000; // 2 seconds
        const startTime = Date.now();
        while (this.isCharging && this.currentLevel < this.maxLevel) {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / chargeDuration, 1);
            this.currentLevel = startLevel + (this.maxLevel - startLevel) * progress;
            EventBus.emit('battery:updated', this.currentLevel);
            await new Promise(resolve => setTimeout(resolve, 16)); // ~60 FPS
        }
        this.currentLevel = this.maxLevel;
        EventBus.emit('battery:full');
        this.isCharging = false;
    }
    stopCharging() {
        this.isCharging = false;
    }
}
//# sourceMappingURL=BatterySystem.js.map