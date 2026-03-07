export interface MissionScore {
  stars: 1 | 2 | 3
  commandsUsed: number
  batteryRemaining: number
  efficiency: number
}

export interface MissionRecord {
  missionId: string
  bestScore: MissionScore
  completedAt: number
}

const STORAGE_KEY = 'bigbot-progress'

export class ScoreSystem {
  private records: Map<string, MissionRecord> = new Map()

  constructor() {
    this.loadFromStorage()
  }

  calculateStars(commandsUsed: number, optimalCommands: number, batteryRemaining: number): MissionScore {
    const efficiency = optimalCommands > 0 ? Math.min(100, (optimalCommands / commandsUsed) * 100) : 100

    let stars: 1 | 2 | 3 = 1
    if (efficiency >= 90 && batteryRemaining >= 50) {
      stars = 3
    } else if (efficiency >= 60 || batteryRemaining >= 30) {
      stars = 2
    }

    return {
      stars,
      commandsUsed,
      batteryRemaining,
      efficiency: Math.round(efficiency)
    }
  }

  recordCompletion(missionId: string, score: MissionScore) {
    const existing = this.records.get(missionId)
    if (!existing || score.stars > existing.bestScore.stars) {
      this.records.set(missionId, {
        missionId,
        bestScore: score,
        completedAt: Date.now()
      })
      this.saveToStorage()
    }
  }

  getBestScore(missionId: string): MissionScore | null {
    return this.records.get(missionId)?.bestScore || null
  }

  getTotalStars(): number {
    let total = 0
    this.records.forEach(r => total += r.bestScore.stars)
    return total
  }

  getCompletedCount(): number {
    return this.records.size
  }

  isCompleted(missionId: string): boolean {
    return this.records.has(missionId)
  }

  private saveToStorage() {
    const data: Record<string, MissionRecord> = {}
    this.records.forEach((v, k) => data[k] = v)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as Record<string, MissionRecord>
      for (const [k, v] of Object.entries(data)) {
        this.records.set(k, v)
      }
    } catch {
      // Ignore corrupted data
    }
  }

  clearAll() {
    this.records.clear()
    localStorage.removeItem(STORAGE_KEY)
  }
}
