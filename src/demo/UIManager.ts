import { soundManager } from '../systems/SoundManager'
import { DIR_NAMES } from '../core/Constants'
import { Robot } from '../entities/Robot'

export class UIManager {
  showToast(msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const c = document.getElementById('toast-container')!
    const t = document.createElement('div')
    const icons: Record<string, string> = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }
    t.className = `toast ${type}`
    t.innerHTML = `<span>${icons[type]}</span> ${msg}`
    c.appendChild(t)
    setTimeout(() => t.remove(), 3000)
  }

  updateStatus(text: string, state: 'ready' | 'executing' | 'error' = 'ready') {
    document.getElementById('status-text')!.textContent = text
    const d = document.getElementById('status-dot')!
    d.className = 'status-dot'
    if (state !== 'ready') d.classList.add(state)
  }

  updatePositionDisplay(robot: Robot) {
    const p = robot.getPosition()
    const d = robot.getDirection()
    document.getElementById('position-text')!.textContent = `Konum: (${p.x}, ${p.y}) | Yön: ${DIR_NAMES[d] || '?'}`
  }

  updateMission(num: number, title: string, desc: string) {
    document.getElementById('mission-label')!.textContent = `📋 Görev ${num}`
    document.getElementById('mission-title')!.textContent = title
    document.getElementById('mission-desc')!.textContent = desc
  }

  updateBatteryUI(level: number) {
    const pct = Math.max(0, Math.min(100, level))
    const fill = document.getElementById('battery-fill')!
    fill.style.width = `${pct}%`
    document.getElementById('battery-text')!.textContent = `${Math.round(pct)}%`
    fill.className = 'battery-fill-mini'
    if (pct <= 5) fill.classList.add('critical')
    else if (pct <= 20) fill.classList.add('low')
  }

  updateEnergyEstimate(totalCost: number) {
    const el = document.getElementById('energy-estimate')
    if (el) el.innerText = `${Math.ceil(totalCost)}%`
  }

  showSuccess(msg: string, cmds: number, bat: number) {
    soundManager.playSuccess()
    document.getElementById('success-message')!.textContent = msg
    document.getElementById('stat-commands')!.textContent = String(cmds)
    document.getElementById('stat-battery')!.textContent = `${Math.round(bat)}%`
    document.getElementById('success-overlay')!.classList.add('visible')
  }

  hideSuccess() {
    document.getElementById('success-overlay')!.classList.remove('visible')
  }

  showFailure(msg: string) {
    soundManager.playFailure()
    document.getElementById('failure-message')!.textContent = msg
    document.getElementById('failure-overlay')!.classList.add('visible')
  }

  hideFailure() {
    document.getElementById('failure-overlay')!.classList.remove('visible')
  }

  showCrashModal(msg: string) {
    document.getElementById('crash-message')!.textContent = msg
    document.getElementById('crash-overlay')!.classList.add('visible')
  }

  hideCrashModal() {
    document.getElementById('crash-overlay')!.classList.remove('visible')
  }

  showCollisionFlash() {
    let flash = document.getElementById('collision-flash')
    if (!flash) {
      flash = document.createElement('div')
      flash.id = 'collision-flash'
      document.body.appendChild(flash)
    }
    flash.classList.remove('active')
    void flash.offsetWidth
    flash.classList.add('active')
    setTimeout(() => flash!.classList.remove('active'), 700)
  }

  showCollisionToast(msg: string) {
    const c = document.getElementById('toast-container')!
    const t = document.createElement('div')
    t.className = 'toast error collision-toast'
    t.innerHTML = `<span style="font-size:28px">💥</span> <div><strong style="font-size:16px">Duvara Çarpıldı!</strong><br><span style="font-size:13px">${msg}</span></div>`
    c.appendChild(t)
    setTimeout(() => t.remove(), 5000)
  }
}
