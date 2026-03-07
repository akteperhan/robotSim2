import * as Blockly from 'blockly'

const WORKSPACE_KEY = 'bigbot-workspace'

export class WorkspacePersistence {
  save(workspace: Blockly.WorkspaceSvg, missionId: string): void {
    try {
      const json = Blockly.serialization.workspaces.save(workspace)
      const data = this.getAllData()
      data[missionId] = json
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(data))
    } catch {
      // Silently fail on storage issues
    }
  }

  load(workspace: Blockly.WorkspaceSvg, missionId: string): boolean {
    try {
      const data = this.getAllData()
      if (!data[missionId]) return false
      workspace.clear()
      Blockly.serialization.workspaces.load(data[missionId], workspace)
      return true
    } catch {
      return false
    }
  }

  hasSaved(missionId: string): boolean {
    const data = this.getAllData()
    return !!data[missionId]
  }

  clear(missionId: string): void {
    const data = this.getAllData()
    delete data[missionId]
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(data))
  }

  clearAll(): void {
    localStorage.removeItem(WORKSPACE_KEY)
  }

  private getAllData(): Record<string, any> {
    try {
      return JSON.parse(localStorage.getItem(WORKSPACE_KEY) || '{}')
    } catch {
      return {}
    }
  }
}
