import { Position } from '../systems/Grid'

// ═══════════════════════════════════════════
// GRID & LAYOUT
// ═══════════════════════════════════════════
export const GRID_W = 12
export const GRID_H = 16
export const GARAGE_DEPTH = 12
export const DOOR_ROW = 12
export const GRID_CENTER_X = Math.floor((GRID_W - 1) / 2)
export const WALL_H = 3.0
export const DOOR_PANEL_H = 0.16
export const DOOR_Z = DOOR_ROW - 0.1

// ═══════════════════════════════════════════
// POSITIONS
// ═══════════════════════════════════════════
export const ROBOT_START: Position = { x: GRID_CENTER_X, y: 3 }
export const BUTTON_POS: Position = { x: 0, y: 7 }
export const CHARGE_POS: Position = { x: GRID_CENTER_X, y: 14 }

// ═══════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════
export const CAM_POS = { x: 16, y: 11, z: 17 }
export const CAM_TARGET = { x: GRID_CENTER_X, y: 1.0, z: 6.1 }
export const BASE_EXPOSURE = 0.66
export const DOOR_OPEN_EXPOSURE_BOOST = 0.34

// ═══════════════════════════════════════════
// BATTERY
// ═══════════════════════════════════════════
export const INITIAL_BATTERY_LEVEL = 5
export const MAX_BATTERY_LEVEL = 100

export const BATTERY_COST = {
  MOVE_FORWARD: 0.1,
  MOVE_BACKWARD: 0.1,
  TURN_LEFT: 0.1,
  TURN_RIGHT: 0.1,
  PRESS_BUTTON: 0.2,
  CHARGE: 0,
} as const

// ═══════════════════════════════════════════
// EXECUTION & ANIMATION
// ═══════════════════════════════════════════
export const DEFAULT_EXECUTION_SPEED = 800
export const MOVE_ANIMATION_DURATION = 400
export const DOOR_ANIMATION_DURATION = 2500
export const CHARGE_ANIMATION_DURATION = 2200
export const CAMERA_ANIMATION_DURATION = 800
export const CAMERA_INTRO_ANIMATION_DURATION = 2000

// Eye blink
export const BLINK_DURATION = 0.14
export const BLINK_MIN_INTERVAL = 1.8
export const BLINK_MAX_INTERVAL = 4.6

// ═══════════════════════════════════════════
// DIRECTION LABELS (Turkish)
// ═══════════════════════════════════════════
export const DIR_NAMES: Record<number, string> = {
  0: 'K',   // Kuzey (North)
  90: 'D',  // Dogu (East)
  180: 'G', // Guney (South)
  270: 'B', // Bati (West)
}

// ═══════════════════════════════════════════
// GARAGE MODES
// ═══════════════════════════════════════════
export type GarageMode = 'open' | 'closed'
