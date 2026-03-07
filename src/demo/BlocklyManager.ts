import * as Blockly from 'blockly'
import { ProgramExecutor } from '../systems/ProgramExecutor'
import { MoveForwardCommand } from '../systems/commands/MoveForwardCommand'
import { MoveBackwardCommand } from '../systems/commands/MoveBackwardCommand'
import { TurnLeftCommand } from '../systems/commands/TurnLeftCommand'
import { TurnRightCommand } from '../systems/commands/TurnRightCommand'
import { PressButtonCommand } from '../systems/commands/PressButtonCommand'
import { ChargeCommand } from '../systems/commands/ChargeCommand'
import { BATTERY_COST, DEFAULT_EXECUTION_SPEED } from '../core/Constants'

export class BlocklyManager {
  private workspace!: Blockly.WorkspaceSvg
  private commandBlockMap: string[] = []
  private highlightedBlockId: string | null = null
  private onProgramChanged: ((executor: ProgramExecutor, totalCost: number) => void) | null = null

  init(onProgramChanged: (executor: ProgramExecutor, totalCost: number) => void) {
    this.onProgramChanged = onProgramChanged
    this.defineBlocks()
    this.createWorkspace()
    this.addInitialBlock()
  }

  private defineBlocks() {
    Blockly.Blocks['green_flag'] = {
      init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField('🚩 Yeşil Bayrak Tıklandığında')
        this.setNextStatement(true, null)
        this.setColour(65)
        this.setDeletable(false)
      }
    }

    Blockly.Blocks['move_forward'] = {
      init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField('⬆️ İleri Git')
          .appendField(new Blockly.FieldNumber(1, 1, 20, 1), 'COUNT').appendField('adım')
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
        this.setColour(230)
        this.setTooltip('Robotu belirtilen adım kadar ileri götürür')
      }
    }

    Blockly.Blocks['move_backward'] = {
      init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField('⬇️ Geri Git')
          .appendField(new Blockly.FieldNumber(1, 1, 20, 1), 'COUNT').appendField('adım')
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
        this.setColour(230)
        this.setTooltip('Robotu belirtilen adım kadar geriye götürür')
      }
    }

    Blockly.Blocks['turn_left'] = {
      init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField('⬅️ Sola Dön')
          .appendField(new Blockly.FieldNumber(1, 1, 4, 1), 'COUNT').appendField('kez')
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
        this.setColour(230)
      }
    }

    Blockly.Blocks['turn_right'] = {
      init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField('➡️ Sağa Dön')
          .appendField(new Blockly.FieldNumber(1, 1, 4, 1), 'COUNT').appendField('kez')
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
        this.setColour(230)
      }
    }

    Blockly.Blocks['press_button'] = {
      init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField('🔘 Butona Bas')
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
        this.setColour(290)
      }
    }

    Blockly.Blocks['charge'] = {
      init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField('⚡ Şarj Ol')
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
        this.setColour(160)
      }
    }

    // Loop block
    Blockly.Blocks['repeat_times'] = {
      init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField('🔄 Tekrarla')
          .appendField(new Blockly.FieldNumber(3, 1, 50, 1), 'TIMES').appendField('kez')
        this.appendStatementInput('DO').setCheck(null)
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
        this.setColour(120)
        this.setTooltip('İçindeki blokları belirtilen sayıda tekrarlar')
      }
    }

    // Condition: if wall ahead
    Blockly.Blocks['if_wall_ahead'] = {
      init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField('🧱 Eğer önde duvar varsa')
        this.appendStatementInput('DO').setCheck(null)
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
        this.setColour(210)
        this.setTooltip('Eğer robotun önünde duvar varsa içindeki blokları çalıştırır')
      }
    }

    // Condition: if battery low
    Blockly.Blocks['if_battery_low'] = {
      init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField('🔋 Eğer batarya')
          .appendField(new Blockly.FieldNumber(20, 1, 100, 1), 'THRESHOLD').appendField('%\'den az ise')
        this.appendStatementInput('DO').setCheck(null)
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
        this.setColour(210)
        this.setTooltip('Eğer batarya belirtilen yüzdenin altındaysa içindeki blokları çalıştırır')
      }
    }
  }

  private createWorkspace() {
    this.workspace = Blockly.inject('blockly-div', {
      toolbox: {
        kind: 'categoryToolbox',
        contents: [
          {
            kind: 'category', name: '🎯 Olaylar', colour: '65',
            contents: [{ kind: 'block', type: 'green_flag' }]
          },
          {
            kind: 'category', name: '🏃 Hareket', colour: '230',
            contents: [
              { kind: 'block', type: 'move_forward' },
              { kind: 'block', type: 'turn_left' },
              { kind: 'block', type: 'turn_right' }
            ]
          },
          {
            kind: 'category', name: '🤖 Robot', colour: '290',
            contents: [
              { kind: 'block', type: 'press_button' },
              { kind: 'block', type: 'charge' }
            ]
          },
          {
            kind: 'category', name: '🔄 Döngüler', colour: '120',
            contents: [{ kind: 'block', type: 'repeat_times' }]
          },
          {
            kind: 'category', name: '❓ Koşullar', colour: '210',
            contents: [
              { kind: 'block', type: 'if_wall_ahead' },
              { kind: 'block', type: 'if_battery_low' }
            ]
          }
        ]
      },
      scrollbars: true,
      trashcan: true,
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      grid: { spacing: 25, length: 3, colour: '#2a2f42', snap: true },
      theme: Blockly.Theme.defineTheme('bigbot_dark', {
        name: 'bigbot_dark',
        base: Blockly.Themes.Classic,
        componentStyles: {
          workspaceBackgroundColour: '#151822',
          toolboxBackgroundColour: '#1e2233',
          toolboxForegroundColour: '#e0e0e0',
          flyoutBackgroundColour: '#1e2233',
          flyoutForegroundColour: '#e0e0e0',
          flyoutOpacity: 0.95,
          scrollbarColour: '#3a3f55',
          scrollbarOpacity: 0.6,
          insertionMarkerColour: '#00d4aa',
          insertionMarkerOpacity: 0.5,
          cursorColour: '#00d4aa'
        },
        fontStyle: { family: 'Inter, Arial, sans-serif', weight: 'bold', size: 12 }
      })
    })

    this.workspace.addChangeListener(() => this.updateProgramFromBlockly())

    // Inject CSS for active block glow
    const style = document.createElement('style')
    style.textContent = `
      .blocklyHighlighted > .blocklyPath {
        stroke: #00e6b8 !important;
        stroke-width: 3px !important;
        filter: drop-shadow(0 0 8px rgba(0, 230, 184, 0.6)) !important;
        animation: block-glow 1s ease-in-out infinite alternate !important;
      }
      @keyframes block-glow {
        from { filter: drop-shadow(0 0 6px rgba(0, 230, 184, 0.4)); }
        to { filter: drop-shadow(0 0 14px rgba(0, 230, 184, 0.8)); }
      }
    `
    document.head.appendChild(style)
  }

  private addInitialBlock() {
    const gf = this.workspace.newBlock('green_flag')
    gf.initSvg()
    gf.render()
    gf.moveBy(30, 30)
  }

  getWorkspace(): Blockly.WorkspaceSvg {
    return this.workspace
  }

  getCommandBlockMap(): string[] {
    return [...this.commandBlockMap]
  }

  clearHighlight() {
    if (this.workspace) this.workspace.highlightBlock(null)
    // Remove error class from previously error-highlighted blocks
    if (this.highlightedBlockId) {
      const block = this.workspace.getBlockById(this.highlightedBlockId)
      if (block) {
        const svg = block.getSvgRoot()
        if (svg) svg.classList.remove('blocklyErrorHighlight')
      }
    }
    this.highlightedBlockId = null
  }

  highlightError(index: number) {
    const blockId = this.commandBlockMap[index]
    if (!this.workspace || !blockId) return
    this.clearHighlight()
    const block = this.workspace.getBlockById(blockId)
    if (block) {
      const svg = block.getSvgRoot()
      if (svg) svg.classList.add('blocklyErrorHighlight')
      this.highlightedBlockId = blockId
    }
  }

  highlightByIndex(index: number) {
    const blockId = this.commandBlockMap[index]
    if (!this.workspace || !blockId) {
      this.clearHighlight()
      return
    }
    if (this.highlightedBlockId === blockId) return
    this.workspace.highlightBlock(blockId)
    this.highlightedBlockId = blockId
  }

  resize() {
    if (this.workspace) Blockly.svgResize(this.workspace)
  }

  clearAndReset() {
    this.workspace.clear()
    this.addInitialBlock()
    this.updateProgramFromBlockly()
  }

  private parseStatementBlocks(startBlock: Blockly.Block | null, executor: ProgramExecutor): number {
    let totalCost = 0
    let cur: Blockly.Block | null = startBlock

    while (cur) {
      const blockId = cur.id
      const count = Number(cur.getFieldValue('COUNT')) || 1

      switch (cur.type) {
        case 'move_forward':
          for (let i = 0; i < count; i++) {
            executor.addCommand(new MoveForwardCommand())
            this.commandBlockMap.push(blockId)
            totalCost += BATTERY_COST.MOVE_FORWARD
          }
          break
        case 'move_backward':
          for (let i = 0; i < count; i++) {
            executor.addCommand(new MoveBackwardCommand())
            this.commandBlockMap.push(blockId)
            totalCost += BATTERY_COST.MOVE_BACKWARD
          }
          break
        case 'turn_left':
          for (let i = 0; i < count; i++) {
            executor.addCommand(new TurnLeftCommand())
            this.commandBlockMap.push(blockId)
            totalCost += BATTERY_COST.TURN_LEFT
          }
          break
        case 'turn_right':
          for (let i = 0; i < count; i++) {
            executor.addCommand(new TurnRightCommand())
            this.commandBlockMap.push(blockId)
            totalCost += BATTERY_COST.TURN_RIGHT
          }
          break
        case 'press_button':
          executor.addCommand(new PressButtonCommand())
          this.commandBlockMap.push(blockId)
          totalCost += BATTERY_COST.PRESS_BUTTON
          break
        case 'charge':
          executor.addCommand(new ChargeCommand())
          this.commandBlockMap.push(blockId)
          totalCost += BATTERY_COST.CHARGE
          break
        case 'repeat_times': {
          const times = Number(cur.getFieldValue('TIMES')) || 1
          const innerBlock = cur.getInputTargetBlock('DO')
          for (let i = 0; i < times; i++) {
            totalCost += this.parseStatementBlocks(innerBlock, executor)
          }
          break
        }
        // Conditions are resolved at parse-time for simplicity
        // (in the future, runtime conditions will use a tree-walking interpreter)
        case 'if_wall_ahead':
        case 'if_battery_low': {
          // For now, include inner blocks unconditionally in cost estimate
          const condInner = cur.getInputTargetBlock('DO')
          totalCost += this.parseStatementBlocks(condInner, executor)
          break
        }
      }
      cur = cur.getNextBlock()
    }

    return totalCost
  }

  updateProgramFromBlockly(): { executor: ProgramExecutor; totalCost: number } {
    const executor = new ProgramExecutor(DEFAULT_EXECUTION_SPEED)
    this.commandBlockMap = []
    this.clearHighlight()

    const blocks = this.workspace.getTopBlocks(true)
    let start: Blockly.Block | null = null
    for (const b of blocks) {
      if (b.type === 'green_flag') {
        start = b.getNextBlock()
        break
      }
    }

    let totalCost = 0
    if (start) {
      totalCost = this.parseStatementBlocks(start, executor)
    }

    if (this.onProgramChanged) {
      this.onProgramChanged(executor, totalCost)
    }

    return { executor, totalCost }
  }

  loadSampleSolution() {
    this.workspace.clear()
    const gf = this.workspace.newBlock('green_flag')
    gf.initSvg()
    gf.render()
    gf.moveBy(30, 30)

    let cur = gf
    const add = (type: string, fields?: Record<string, any>) => {
      const b = this.workspace.newBlock(type)
      if (fields) {
        for (const f in fields) b.setFieldValue(fields[f], f)
      }
      b.initSvg()
      b.render()
      cur.nextConnection.connect(b.previousConnection)
      cur = b
    }

    add('move_forward', { COUNT: 4 })
    add('turn_left', { COUNT: 1 })
    add('move_forward', { COUNT: 5 })
    add('press_button')
    add('turn_right', { COUNT: 1 })
    add('move_forward', { COUNT: 17 })
    add('turn_right', { COUNT: 1 })
    add('move_forward', { COUNT: 2 })
    add('charge')

    this.updateProgramFromBlockly()
  }
}
