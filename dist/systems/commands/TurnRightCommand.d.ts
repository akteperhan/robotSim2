import { ICommand, CommandType, CommandResult, Color } from '../../core/ICommand';
import { Robot } from '../../entities/Robot';
import { Grid } from '../Grid';
export declare class TurnRightCommand implements ICommand {
    execute(robot: Robot, grid: Grid): CommandResult;
    canExecute(robot: Robot, grid: Grid): boolean;
    getType(): CommandType;
    getDisplayColor(): Color;
}
//# sourceMappingURL=TurnRightCommand.d.ts.map