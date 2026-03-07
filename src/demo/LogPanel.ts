const MAX_LOG_ENTRIES = 50

export class LogPanel {
  private container: HTMLDivElement
  private logList: HTMLDivElement
  private isOpen = false

  constructor() {
    // Create toggle button
    const toggle = document.createElement('button')
    toggle.id = 'log-toggle'
    toggle.textContent = '📜 Log'
    toggle.addEventListener('click', () => this.toggle())
    document.body.appendChild(toggle)

    // Create log container
    this.container = document.createElement('div')
    this.container.id = 'log-panel'
    this.container.innerHTML = `
      <div class="log-header">
        <span>Komut Geçmişi</span>
        <button id="log-clear">Temizle</button>
      </div>
      <div class="log-list" id="log-list"></div>
    `
    document.body.appendChild(this.container)

    this.logList = this.container.querySelector('#log-list')!
    this.container.querySelector('#log-clear')!.addEventListener('click', () => this.clear())
  }

  toggle() {
    this.isOpen = !this.isOpen
    this.container.classList.toggle('open', this.isOpen)
  }

  addEntry(type: 'command' | 'event' | 'error' | 'success', message: string) {
    const entry = document.createElement('div')
    entry.className = `log-entry log-${type}`
    const icons: Record<string, string> = { command: '▶', event: '🔔', error: '✖', success: '✔' }
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    entry.innerHTML = `<span class="log-icon">${icons[type]}</span><span class="log-time">${time}</span> ${message}`
    this.logList.appendChild(entry)

    // Limit entries
    while (this.logList.children.length > MAX_LOG_ENTRIES) {
      this.logList.removeChild(this.logList.firstChild!)
    }

    // Auto-scroll to bottom
    this.logList.scrollTop = this.logList.scrollHeight
  }

  clear() {
    this.logList.innerHTML = ''
  }
}
