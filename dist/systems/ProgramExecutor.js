import EventBus from './EventBus';
export class ProgramExecutor {
    constructor(executionSpeed = 500) {
        this.commands = [];
        this.currentIndex = 0;
        this.isExecuting = false;
        this.executionSpeed = executionSpeed;
    }
    addCommand(command) {
        this.commands.push(command);
    }
    removeCommand(index) {
        if (index >= 0 && index < this.commands.length) {
            this.commands.splice(index, 1);
        }
    }
    getCommands() {
        return [...this.commands];
    }
    getCommandCount() {
        return this.commands.length;
    }
    async execute(robot, grid, battery) {
        this.isExecuting = true;
        this.currentIndex = 0;
        while (this.currentIndex < this.commands.length) {
            if (!this.isExecuting) {
                EventBus.emit('program:stopped', { stoppedAt: this.currentIndex });
                return { success: false, stoppedAt: this.currentIndex, stopped: true };
            }
            const command = this.commands[this.currentIndex];
            // Highlight current command in UI
            EventBus.emit('command:highlight', this.currentIndex);
            // Check if command can execute
            if (!command.canExecute(robot, grid)) {
                EventBus.emit('command:error', {
                    index: this.currentIndex,
                    message: 'Command cannot be executed'
                });
                this.isExecuting = false;
                return { success: false, stoppedAt: this.currentIndex };
            }
            // Execute command
            const result = command.execute(robot, grid);
            if (!result.success) {
                EventBus.emit('command:error', {
                    index: this.currentIndex,
                    message: result.errorMessage
                });
                this.isExecuting = false;
                return { success: false, stoppedAt: this.currentIndex };
            }
            // Notify that a command was executed (for sounds + visual update)
            EventBus.emit('command:executed', { type: command.getType(), index: this.currentIndex });
            EventBus.emit('robot:moved');
            // Update battery
            battery.consume(result.batteryConsumed);
            // Check battery death
            if (battery.getCurrentLevel() <= 0) {
                EventBus.emit('battery:dead');
                this.isExecuting = false;
                return { success: false, stoppedAt: this.currentIndex };
            }
            // Wait for animation and timing
            await this.wait(this.executionSpeed);
            this.currentIndex++;
        }
        this.isExecuting = false;
        EventBus.emit('program:complete');
        return { success: true, stoppedAt: this.commands.length };
    }
    stop() {
        this.isExecuting = false;
    }
    reset() {
        this.currentIndex = 0;
        this.isExecuting = false;
    }
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=ProgramExecutor.js.map