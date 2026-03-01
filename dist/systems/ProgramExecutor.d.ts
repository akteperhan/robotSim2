import { ICommand } from '../core/ICommand';
import { Robot } from '../entities/Robot';
import { Grid } from './Grid';
import { BatterySystem } from './BatterySystem';
export interface ExecutionResult {
    success: boolean;
    stoppedAt: number;
    stopped?: boolean;
}
export declare class ProgramExecutor {
    private commands;
    private currentIndex;
    private isExecuting;
    private executionSpeed;
    constructor(executionSpeed?: number);
    addCommand(command: ICommand): void;
    removeCommand(index: number): void;
    getCommands(): ICommand[];
    getCommandCount(): number;
    execute(robot: Robot, grid: Grid, battery: BatterySystem): Promise<ExecutionResult>;
    stop(): void;
    reset(): void;
    private wait;
}
//# sourceMappingURL=ProgramExecutor.d.ts.map