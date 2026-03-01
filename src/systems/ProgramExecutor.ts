import { ICommand } from '../core/ICommand'
import { Robot } from '../entities/Robot'
import { Grid } from './Grid'
import { BatterySystem } from './BatterySystem'
import EventBus from './EventBus'

export interface ExecutionResult {
  success: boolean
  stoppedAt: number
  stopped?: boolean
}

export class ProgramExecutor {
  private commands: ICommand[]
  private currentIndex: number
  private isExecuting: boolean
  private executionSpeed: number

  constructor(executionSpeed: number = 500) {
    this.commands = []
    this.currentIndex = 0
    this.isExecuting = false
    this.executionSpeed = executionSpeed
  }

  addCommand(command: ICommand): void {
    this.commands.push(command)
  }

  removeCommand(index: number): void {
    if (index >= 0 && index < this.commands.length) {
      this.commands.splice(index, 1)
    }
  }

  getCommands(): ICommand[] {
    return [...this.commands]
  }

  getCommandCount(): number {
    return this.commands.length
  }

  async execute(robot: Robot, grid: Grid, battery: BatterySystem): Promise<ExecutionResult> {
    this.isExecuting = true
    this.currentIndex = 0

    while (this.currentIndex < this.commands.length) {
      if (!this.isExecuting) {
        EventBus.emit('program:stopped', { stoppedAt: this.currentIndex })
        return { success: false, stoppedAt: this.currentIndex, stopped: true }
      }

      const command = this.commands[this.currentIndex]

      // Highlight current command in UI
      EventBus.emit('command:highlight', this.currentIndex)

      // Check if command can execute
      if (!command.canExecute(robot, grid)) {
        EventBus.emit('command:error', {
          index: this.currentIndex,
          message: 'Command cannot be executed'
        })
        this.isExecuting = false
        return { success: false, stoppedAt: this.currentIndex }
      }

      // Execute command
      const result = command.execute(robot, grid)

      if (!result.success) {
        EventBus.emit('command:error', {
          index: this.currentIndex,
          message: result.errorMessage
        })
        this.isExecuting = false
        return { success: false, stoppedAt: this.currentIndex }
      }

      // Notify that a command was executed (for sounds + visual update)
      EventBus.emit('command:executed', { type: command.getType(), index: this.currentIndex })
      EventBus.emit('robot:moved')

      // Update battery
      battery.consume(result.batteryConsumed)

      // Check battery death
      if (battery.getCurrentLevel() <= 0) {
        EventBus.emit('battery:dead')
        this.isExecuting = false
        return { success: false, stoppedAt: this.currentIndex }
      }

      // Wait for animation and timing
      await this.wait(this.executionSpeed)

      this.currentIndex++
    }

    this.isExecuting = false
    EventBus.emit('program:complete')
    return { success: true, stoppedAt: this.commands.length }
  }

  stop(): void {
    this.isExecuting = false
  }

  reset(): void {
    this.currentIndex = 0
    this.isExecuting = false
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
