import { IInteractable } from '../core/IInteractable'

export interface Position {
  x: number
  y: number
}

export enum Direction {
  NORTH = 0,
  EAST = 90,
  SOUTH = 180,
  WEST = 270
}

export interface GridCell {
  position: Position
  walkable: boolean
  interactable?: IInteractable
}

export class Grid {
  private cells: Map<string, GridCell>
  private width: number
  private height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.cells = new Map()
    this.initializeCells()
  }

  private initializeCells(): void {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const key = this.positionToKey({ x, y })
        this.cells.set(key, {
          position: { x, y },
          walkable: true
        })
      }
    }
  }

  isValidPosition(pos: Position): boolean {
    if (pos.x < 0 || pos.x >= this.width || pos.y < 0 || pos.y >= this.height) {
      return false
    }

    const cell = this.getCell(pos)
    return cell !== null && cell.walkable
  }

  getCell(pos: Position): GridCell | null {
    const key = this.positionToKey(pos)
    return this.cells.get(key) || null
  }

  setWalkable(pos: Position, walkable: boolean): void {
    const cell = this.getCell(pos)
    if (cell) {
      cell.walkable = walkable
    }
  }

  placeInteractable(pos: Position, interactable: IInteractable): void {
    const cell = this.getCell(pos)
    if (cell) {
      cell.interactable = interactable
    }
  }

  getAdjacentInteractable(pos: Position): IInteractable | null {
    const adjacentPositions = [
      { x: pos.x + 1, y: pos.y },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x, y: pos.y - 1 }
    ]

    for (const adjPos of adjacentPositions) {
      const cell = this.getCell(adjPos)
      if (cell && cell.interactable) {
        return cell.interactable
      }
    }

    return null
  }

  /** Check current cell AND adjacent cells for an interactable */
  getInteractableInRange(pos: Position): IInteractable | null {
    // First check current cell
    const currentCell = this.getCell(pos)
    if (currentCell && currentCell.interactable) {
      return currentCell.interactable
    }

    // Then check adjacent cells
    return this.getAdjacentInteractable(pos)
  }

  private positionToKey(pos: Position): string {
    return `${pos.x},${pos.y}`
  }
}
