import { describe, it, expect } from 'vitest';
import { Robot } from '../Robot';
import { Direction } from '../../systems/Grid';
describe('Robot Entity', () => {
    it('should initialize with correct position and direction', () => {
        const robot = new Robot({ x: 0, y: 0 }, Direction.NORTH);
        expect(robot.getPosition()).toEqual({ x: 0, y: 0 });
        expect(robot.getDirection()).toBe(Direction.NORTH);
    });
    it('should calculate forward position correctly for NORTH', () => {
        const robot = new Robot({ x: 2, y: 2 }, Direction.NORTH);
        expect(robot.getForwardPosition()).toEqual({ x: 2, y: 3 });
    });
    it('should calculate forward position correctly for EAST', () => {
        const robot = new Robot({ x: 2, y: 2 }, Direction.EAST);
        expect(robot.getForwardPosition()).toEqual({ x: 3, y: 2 });
    });
    it('should calculate forward position correctly for SOUTH', () => {
        const robot = new Robot({ x: 2, y: 2 }, Direction.SOUTH);
        expect(robot.getForwardPosition()).toEqual({ x: 2, y: 1 });
    });
    it('should calculate forward position correctly for WEST', () => {
        const robot = new Robot({ x: 2, y: 2 }, Direction.WEST);
        expect(robot.getForwardPosition()).toEqual({ x: 1, y: 2 });
    });
    it('should rotate left correctly', () => {
        const robot = new Robot({ x: 0, y: 0 }, Direction.NORTH);
        robot.rotateLeft();
        expect(robot.getDirection()).toBe(Direction.WEST);
        robot.rotateLeft();
        expect(robot.getDirection()).toBe(Direction.SOUTH);
    });
    it('should rotate right correctly', () => {
        const robot = new Robot({ x: 0, y: 0 }, Direction.NORTH);
        robot.rotateRight();
        expect(robot.getDirection()).toBe(Direction.EAST);
        robot.rotateRight();
        expect(robot.getDirection()).toBe(Direction.SOUTH);
    });
    it('should move to new position', () => {
        const robot = new Robot({ x: 0, y: 0 }, Direction.NORTH);
        robot.moveTo({ x: 1, y: 1 });
        expect(robot.getPosition()).toEqual({ x: 1, y: 1 });
    });
});
//# sourceMappingURL=Robot.test.js.map