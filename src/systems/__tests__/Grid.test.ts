import { describe, it, expect } from 'vitest'
import { Grid, Direction } from '../Grid'

describe('Grid System', () => {
  it('should create a grid with correct dimensions', () => {
    const grid = new Grid(5, 5)
    
    expect(grid.isValidPosition({ x: 0, y: 0 })).toBe(true)
    expect(grid.isValidPosition({ x: 4, y: 4 })).toBe(true)
    expect(grid.isValidPosition({ x: 5, y: 5 })).toBe(false)
    expect(grid.isValidPosition({ x: -1, y: 0 })).toBe(false)
  })

  it('should handle walkable cells correctly', () => {
    const grid = new Grid(5, 5)
    
    grid.setWalkable({ x: 2, y: 2 }, false)
    
    expect(grid.isValidPosition({ x: 2, y: 2 })).toBe(false)
    expect(grid.isValidPosition({ x: 2, y: 3 })).toBe(true)
  })

  it('should return null for out of bounds cells', () => {
    const grid = new Grid(5, 5)
    
    expect(grid.getCell({ x: 10, y: 10 })).toBe(null)
    expect(grid.getCell({ x: -1, y: 0 })).toBe(null)
  })
})
