import { Position } from '../systems/Grid'

export interface WinCondition {
  type: 'reach_position' | 'press_button' | 'open_door' | 'charge_full' | 'charge_and_survive'
  targetPosition?: Position
}

export interface MissionDefinition {
  id: string
  chapter: number
  chapterName: string
  title: string
  description: string
  hint: string
  optimalCommands: number
  winCondition: WinCondition
  /** Blocks available for this mission (null = all) */
  availableBlocks: string[] | null
  /** Whether door row starts walkable */
  doorStartsOpen: boolean
}
