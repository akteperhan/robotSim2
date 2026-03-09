import { MissionDefinition } from './MissionDefinition'
import { MISSIONS } from './missions'
import { Robot } from '../entities/Robot'
import { Grid } from '../systems/Grid'
import { BatterySystem } from '../systems/BatterySystem'
import { ScoreSystem, MissionScore } from '../systems/ScoreSystem'
import EventBus from '../systems/EventBus'

export class MissionManager {
  private missions = MISSIONS
  private currentIndex = 0
  private scoreSystem: ScoreSystem
  private doorOpened = false

  constructor(scoreSystem: ScoreSystem) {
    this.scoreSystem = scoreSystem
    EventBus.on('door:opening', () => { this.doorOpened = true })
  }

  getCurrentMission(): MissionDefinition {
    return this.missions[this.currentIndex]
  }

  getCurrentIndex(): number {
    return this.currentIndex
  }

  getTotalMissions(): number {
    return this.missions.length
  }

  getCurrentChapterMissions(): MissionDefinition[] {
    const current = this.getCurrentMission()
    return this.missions.filter(m => m.chapter === current.chapter)
  }

  setMission(index: number): MissionDefinition {
    this.currentIndex = Math.max(0, Math.min(index, this.missions.length - 1))
    this.doorOpened = false
    return this.getCurrentMission()
  }

  nextMission(): MissionDefinition | null {
    if (this.currentIndex < this.missions.length - 1) {
      this.currentIndex++
      this.doorOpened = false
      return this.getCurrentMission()
    }
    return null
  }

  checkWinCondition(robot: Robot, grid: Grid, battery: BatterySystem): boolean {
    const mission = this.getCurrentMission()
    const wc = mission.winCondition

    switch (wc.type) {
      case 'reach_position': {
        if (!wc.targetPosition) return false
        const pos = robot.getPosition()
        return pos.x === wc.targetPosition.x && pos.y === wc.targetPosition.y
      }
      case 'press_button':
        return this.doorOpened
      case 'open_door':
        return this.doorOpened
      case 'charge_full':
        return battery.getCurrentLevel() >= 100
      case 'charge_and_survive':
        return battery.getCurrentLevel() > 0
      default:
        return false
    }
  }

  completeCurrentMission(commandsUsed: number, batteryRemaining: number): MissionScore {
    const mission = this.getCurrentMission()
    const score = this.scoreSystem.calculateStars(commandsUsed, mission.optimalCommands, batteryRemaining)
    this.scoreSystem.recordCompletion(mission.id, score)
    return score
  }

  isMissionCompleted(index: number): boolean {
    const mission = this.missions[index]
    return mission ? this.scoreSystem.isCompleted(mission.id) : false
  }

  getBestScore(index: number): MissionScore | null {
    const mission = this.missions[index]
    return mission ? this.scoreSystem.getBestScore(mission.id) : null
  }

  resetForMission(): void {
    this.doorOpened = false
  }

  resetToFirst(): void {
    this.currentIndex = 0
    this.doorOpened = false
  }
}
