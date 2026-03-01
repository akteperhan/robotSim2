import { Position, Direction } from '../systems/Grid'

export enum EyeExpression {
  NORMAL = 'NORMAL',
  HAPPY = 'HAPPY',
  WORRIED = 'WORRIED',
  EXCITED = 'EXCITED'
}

// Placeholder for animation controller
class AnimationController {
  playMoveAnimation(from: Position, to: Position): void {
    // TODO: Implement animation
  }

  playRotateAnimation(direction: Direction): void {
    // TODO: Implement animation
  }

  setEyeExpression(expression: EyeExpression): void {
    // TODO: Implement animation
  }
}

export class Robot {
  private position: Position
  private direction: Direction
  private animationController: AnimationController

  constructor(startPosition: Position, startDirection: Direction) {
    this.position = { ...startPosition }
    this.direction = startDirection
    this.animationController = new AnimationController()
  }

  getPosition(): Position {
    return { ...this.position }
  }

  getDirection(): Direction {
    return this.direction
  }

  getForwardPosition(): Position {
    switch (this.direction) {
      case Direction.NORTH:
        return { x: this.position.x, y: this.position.y + 1 }
      case Direction.EAST:
        return { x: this.position.x + 1, y: this.position.y }
      case Direction.SOUTH:
        return { x: this.position.x, y: this.position.y - 1 }
      case Direction.WEST:
        return { x: this.position.x - 1, y: this.position.y }
    }
  }

  getBackwardPosition(): Position {
    switch (this.direction) {
      case Direction.NORTH:
        return { x: this.position.x, y: this.position.y - 1 }
      case Direction.EAST:
        return { x: this.position.x - 1, y: this.position.y }
      case Direction.SOUTH:
        return { x: this.position.x, y: this.position.y + 1 }
      case Direction.WEST:
        return { x: this.position.x + 1, y: this.position.y }
    }
  }

  moveTo(position: Position): void {
    this.animationController.playMoveAnimation(this.position, position)
    this.position = { ...position }
  }

  rotateLeft(): void {
    this.direction = (this.direction - 90 + 360) % 360
    this.animationController.playRotateAnimation(this.direction)
  }

  rotateRight(): void {
    this.direction = (this.direction + 90) % 360
    this.animationController.playRotateAnimation(this.direction)
  }

  setEyeExpression(expression: EyeExpression): void {
    this.animationController.setEyeExpression(expression)
  }
}
