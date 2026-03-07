import { ICommand } from '../core/ICommand'
import { Robot } from '../entities/Robot'
import { Grid } from './Grid'
import { BatterySystem } from './BatterySystem'
import EventBus from './EventBus'
import { DEFAULT_EXECUTION_SPEED } from '../core/Constants'

export interface ExecutionResult {
  success: boolean
  stoppedAt: number
  stopped?: boolean
  commandsExecuted: number
  batteryUsed: number
}

export class ProgramExecutor {
  private commands: ICommand[]
  private currentIndex: number
  private isExecuting: boolean
  private executionSpeed: number
  private stepMode: boolean
  private stepResolve: (() => void) | null
  private totalBatteryUsed: number

  constructor(executionSpeed: number = DEFAULT_EXECUTION_SPEED) {
    this.commands = []
    this.currentIndex = 0
    this.isExecuting = false
    this.executionSpeed = executionSpeed
    this.stepMode = false
    this.stepResolve = null
    this.totalBatteryUsed = 0
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

  setSpeed(ms: number): void {
    this.executionSpeed = Math.max(100, Math.min(3000, ms))
  }

  getSpeed(): number {
    return this.executionSpeed
  }

  setStepMode(enabled: boolean): void {
    this.stepMode = enabled
  }

  isStepMode(): boolean {
    return this.stepMode
  }

  stepNext(): void {
    if (this.stepResolve) {
      this.stepResolve()
      this.stepResolve = null
    }
  }

  async execute(robot: Robot, grid: Grid, battery: BatterySystem): Promise<ExecutionResult> {
    this.isExecuting = true
    this.currentIndex = 0
    this.totalBatteryUsed = 0

    while (this.currentIndex < this.commands.length) {
      if (!this.isExecuting) {
        EventBus.emit('program:stopped', { stoppedAt: this.currentIndex })
        return {
          success: false,
          stoppedAt: this.currentIndex,
          stopped: true,
          commandsExecuted: this.currentIndex,
          batteryUsed: this.totalBatteryUsed
        }
      }

      const command = this.commands[this.currentIndex]

      // Highlight current command in UI
      EventBus.emit('command:highlight', this.currentIndex)

      // Step mode: pause and wait for stepNext()
      if (this.stepMode) {
        EventBus.emit('execution:paused', this.currentIndex)
        await new Promise<void>(resolve => { this.stepResolve = resolve })
        // Re-check if we were stopped during the pause
        if (!this.isExecuting) {
          EventBus.emit('program:stopped', { stoppedAt: this.currentIndex })
          return {
            success: false,
            stoppedAt: this.currentIndex,
            stopped: true,
            commandsExecuted: this.currentIndex,
            batteryUsed: this.totalBatteryUsed
          }
        }
      }

      // Check if command can execute
      if (!command.canExecute(robot, grid)) {
        EventBus.emit('command:error', {
          index: this.currentIndex,
          message: 'Command cannot be executed'
        })
        this.isExecuting = false
        return {
          success: false,
          stoppedAt: this.currentIndex,
          commandsExecuted: this.currentIndex,
          batteryUsed: this.totalBatteryUsed
        }
      }

      // Execute command (supports async commands like ChargeCommand)
      const result = await command.execute(robot, grid)

      if (!result.success) {
        EventBus.emit('command:error', {
          index: this.currentIndex,
          message: result.errorMessage || 'Komut başarısız oldu'
        })
        this.isExecuting = false
        return {
          success: false,
          stoppedAt: this.currentIndex,
          commandsExecuted: this.currentIndex,
          batteryUsed: this.totalBatteryUsed
        }
      }

      // Track battery usage
      this.totalBatteryUsed += result.batteryConsumed

      // Notify that a command was executed (for sounds + visual update)
      EventBus.emit('command:executed', { type: command.getType(), index: this.currentIndex })
      EventBus.emit('robot:moved')

      // Update battery
      battery.consume(result.batteryConsumed)

      // Check battery death
      if (battery.getCurrentLevel() <= 0) {
        EventBus.emit('battery:dead')
        this.isExecuting = false
        return {
          success: false,
          stoppedAt: this.currentIndex,
          commandsExecuted: this.currentIndex + 1,
          batteryUsed: this.totalBatteryUsed
        }
      }

      // Wait for animation and timing
      await this.wait(this.executionSpeed)

      this.currentIndex++
    }

    this.isExecuting = false
    EventBus.emit('program:complete')
    return {
      success: true,
      stoppedAt: this.commands.length,
      commandsExecuted: this.commands.length,
      batteryUsed: this.totalBatteryUsed
    }
  }

  stop(): void {
    this.isExecuting = false
    // If paused in step mode, also release the wait
    if (this.stepResolve) {
      this.stepResolve()
      this.stepResolve = null
    }
  }

  reset(): void {
    this.currentIndex = 0
    this.isExecuting = false
    this.totalBatteryUsed = 0
    this.stepResolve = null
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
