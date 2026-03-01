import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import { Robot } from '../entities/Robot'
import { Grid, Direction, Position } from '../systems/Grid'
import { BatterySystem } from '../systems/BatterySystem'
import { ProgramExecutor } from '../systems/ProgramExecutor'
import { MoveForwardCommand } from '../systems/commands/MoveForwardCommand'
import { MoveBackwardCommand } from '../systems/commands/MoveBackwardCommand'
import { TurnLeftCommand } from '../systems/commands/TurnLeftCommand'
import { TurnRightCommand } from '../systems/commands/TurnRightCommand'
import { PressButtonCommand } from '../systems/commands/PressButtonCommand'
import { ChargeCommand } from '../systems/commands/ChargeCommand'
import { Button } from '../entities/interactables/Button'
import { GarageDoor } from '../entities/interactables/GarageDoor'
import { ChargingPad } from '../entities/interactables/ChargingPad'
import EventBus from '../systems/EventBus'
import { soundManager } from '../systems/SoundManager'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as Blockly from 'blockly'
import { createSkyGradient, createOutdoorScene } from './scene/EnvironmentBuilder'
import { createGarage as buildGarageLib } from './scene/GarageBuilder'

// ═══════════════════════════════════════════
// CONSTANTS & STATE
// ═══════════════════════════════════════════
const GRID_W = 12, GRID_H = 16, GARAGE_DEPTH = 12, DOOR_ROW = 12
const GRID_CENTER_X = (GRID_W - 1) / 2
const DOOR_PANEL_H = 0.16
const DOOR_Z = DOOR_ROW - 0.1
const ROBOT_START: Position = { x: GRID_CENTER_X, y: 0 }
const BUTTON_POS: Position = { x: GRID_CENTER_X, y: 5 }
const CHARGE_POS: Position = { x: GRID_CENTER_X, y: 11 }
const WALL_H = 3.0
const CAM_POS = { x: 16, y: 11, z: 17 }
const CAM_TARGET = { x: GRID_CENTER_X, y: 1.0, z: 6.1 }
const BASE_EXPOSURE = 0.66
const DOOR_OPEN_EXPOSURE_BOOST = 0.34
const dirNames: Record<number, string> = { 0: 'K', 90: 'D', 180: 'G', 270: 'B' }
type GarageMode = 'open' | 'closed'

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls
let robot: Robot, robotMesh: THREE.Group, grid: Grid, battery: BatterySystem, executor: ProgramExecutor
let button: Button, door: GarageDoor, chargingPad: ChargingPad
let doorPanels: THREE.Mesh[] = [], doorLines: THREE.Mesh[] = [], doorHandle: THREE.Mesh
let workspace: Blockly.WorkspaceSvg
let wheelMeshes: THREE.Mesh[] = [], chargePadMesh: THREE.Group
let mainAmbientLight: THREE.AmbientLight | null = null
let chargingSurfaceMat: THREE.MeshStandardMaterial | null = null
let chargingAmbientGlowMat: THREE.MeshBasicMaterial | null = null
let isExecuting = false, isPanelOpen = true
let commandBlockMap: string[] = [], highlightedBlockId: string | null = null
let skyLight: THREE.HemisphereLight
let doorClipPlane: THREE.Plane
let doorGlowPlane: THREE.Mesh | null = null
let doorSunLight: THREE.DirectionalLight | null = null
let doorAnimationVersion = 0
let robotEyeMeshes: THREE.Mesh[] = []
let robotChargeRingMat: THREE.MeshStandardMaterial | null = null
let robotChargeBaseIntensity = 0.6
let robotChargeBar: THREE.Mesh | null = null
let robotChargePort: THREE.Object3D | null = null
let chargingCableAnchor: THREE.Object3D | null = null
let chargingCableLine: THREE.Line | null = null
let isCableConnected = false
let cableConnectStart = 0
let blinkTimer = 0
let blinkProgress = 0
let nextBlinkAt = 2.4
let isBlinking = false
let chargePulseUntil = 0
let garageMode: GarageMode = 'open'
let garageGroup: THREE.Group | null = null
let garageRoofGroup: THREE.Group | null = null
let garageRoofMaterials: THREE.MeshStandardMaterial[] = []

enum GameState { INTRO, READY, EXECUTING, DOOR_OPENED, COMPLETE, FAILED }
let gameState = GameState.INTRO

function getPrimaryCameraPose(mode: GarageMode = garageMode): { pos: { x: number, y: number, z: number }, target: { x: number, y: number, z: number } } {
  if (mode === 'closed') {
    return {
      pos: { x: GRID_CENTER_X, y: 3.5, z: -2.5 }, // Positioning behind the robot inside the garage
      target: { x: GRID_CENTER_X, y: 0.5, z: 2.0 }
    }
  }
  return { pos: CAM_POS, target: CAM_TARGET }
}

function applyGarageMode(mode: GarageMode, animate = false, notify = false) {
  garageMode = mode
  const roofVisible = mode === 'closed'
  if (garageRoofGroup) garageRoofGroup.visible = roofVisible
  garageRoofMaterials.forEach((mat) => {
    mat.transparent = false
    mat.opacity = 1
  })
  if (mainAmbientLight) {
    mainAmbientLight.intensity = mode === 'closed' ? 0.4 : 0.8
    mainAmbientLight.color.setHex(mode === 'closed' ? 0x90a0c0 : 0xffffff)
  }
  if (controls) {
    controls.maxPolarAngle = roofVisible ? Math.PI / 2.25 : Math.PI / 2.05
    controls.enableRotate = !roofVisible
    controls.enableZoom = !roofVisible
    controls.enablePan = !roofVisible
    controls.enableDamping = !roofVisible
  }

  const pose = getPrimaryCameraPose(mode)
  if (camera && controls) {
    if (animate) animateCameraTo(pose.pos, pose.target, 900)
    else {
      camera.position.set(pose.pos.x, pose.pos.y, pose.pos.z)
      controls.target.set(pose.target.x, pose.target.y, pose.target.z)
      controls.update()
    }
  }

  if (notify) {
    showToast(
      mode === 'closed'
        ? 'Garaj modu: Kapalı tavan sürüş görünümü'
        : 'Garaj modu: Açık tavan sahne görünümü',
      'info'
    )
  }
}

// ═══════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════
function showToast(msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  const c = document.getElementById('toast-container')!
  const t = document.createElement('div')
  const icons: Record<string, string> = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }
  t.className = `toast ${type}`; t.innerHTML = `<span>${icons[type]}</span> ${msg}`
  c.appendChild(t); setTimeout(() => t.remove(), 3000)
}
function updateStatus(text: string, state: 'ready' | 'executing' | 'error' = 'ready') {
  document.getElementById('status-text')!.textContent = text
  const d = document.getElementById('status-dot')!
  d.className = 'status-dot'; if (state !== 'ready') d.classList.add(state)
}
function updatePositionDisplay() {
  const p = robot.getPosition(), d = robot.getDirection()
  document.getElementById('position-text')!.textContent = `Pos: (${p.x}, ${p.y}) | Yön: ${dirNames[d] || '?'}`
}
function updateMission(num: number, title: string, desc: string) {
  document.getElementById('mission-label')!.textContent = `📋 Görev ${num}`
  document.getElementById('mission-title')!.textContent = title
  document.getElementById('mission-desc')!.textContent = desc
}
function updateBatteryUI(level: number) {
  const pct = Math.max(0, Math.min(100, level))
  const fill = document.getElementById('battery-fill')!
  fill.style.width = `${pct}%`
  document.getElementById('battery-text')!.textContent = `${Math.round(pct)}%`
  fill.className = 'battery-fill-mini'
  if (pct <= 5) fill.classList.add('critical')
  else if (pct <= 20) fill.classList.add('low')
}
function showSuccess(msg: string, cmds: number, bat: number) {
  soundManager.playSuccess()
  document.getElementById('success-message')!.textContent = msg
  document.getElementById('stat-commands')!.textContent = String(cmds)
  document.getElementById('stat-battery')!.textContent = `${Math.round(bat)}%`
  document.getElementById('success-overlay')!.classList.add('visible')
}
function hideSuccess() { document.getElementById('success-overlay')!.classList.remove('visible') }
function showFailure(msg: string) {
  soundManager.playFailure()
  document.getElementById('failure-message')!.textContent = msg
  document.getElementById('failure-overlay')!.classList.add('visible')
}
function hideFailure() { document.getElementById('failure-overlay')!.classList.remove('visible') }

// ═══════════════════════════════════════════
// SCENE
// ═══════════════════════════════════════════

function initScene() {
  const c = document.getElementById('canvas-container')!
  scene = new THREE.Scene()
  scene.background = createSkyGradient()
  scene.fog = new THREE.FogExp2(0x3a5a8a, 0.0045)

  camera = new THREE.PerspectiveCamera(45, c.clientWidth / c.clientHeight, 0.1, 500)
  camera.position.set(CAM_POS.x, CAM_POS.y, CAM_POS.z)

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setSize(c.clientWidth, c.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = BASE_EXPOSURE
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.localClippingEnabled = true
  c.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = 0.05
  controls.minDistance = 3; controls.maxDistance = 32; controls.maxPolarAngle = Math.PI / 2.05
  controls.target.set(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z); controls.update()

  // Lights
  mainAmbientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(mainAmbientLight)
  const moonFill = new THREE.DirectionalLight(0xb8c8ff, 0.38)
  moonFill.position.set(-5, 9, -4); moonFill.castShadow = true
  moonFill.shadow.mapSize.set(2048, 2048)
  moonFill.shadow.camera.left = -12; moonFill.shadow.camera.right = 12
  moonFill.shadow.camera.top = 12; moonFill.shadow.camera.bottom = -12
  moonFill.shadow.bias = -0.00015; scene.add(moonFill)
  const practicalBounce = new THREE.PointLight(0x8cb0ff, 0.2, 12)
  practicalBounce.position.set(GRID_CENTER_X, 1.2, 2.5)
  scene.add(practicalBounce)

  // Clipping plane for door — clips everything above wall height
  doorClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), WALL_H)

  window.addEventListener('resize', () => {
    camera.aspect = c.clientWidth / c.clientHeight
    camera.updateProjectionMatrix(); renderer.setSize(c.clientWidth, c.clientHeight)
  })
}

// ═══════════════════════════════════════════
// GARAGE
// ═══════════════════════════════════════════
function createGarage() {
  if (garageGroup) scene.remove(garageGroup)

  const result = buildGarageLib({
    GRID_W,
    GARAGE_DEPTH,
    GRID_CENTER_X,
    WALL_H,
    DOOR_ROW
  })

  garageGroup = result.garageGroup
  garageRoofGroup = result.garageRoofGroup
  garageRoofMaterials = result.garageRoofMaterials

  scene.add(garageGroup)
  applyGarageMode(garageMode, false, false)
}

// ═══════════════════════════════════════════
// ROBOT
// ═══════════════════════════════════════════
function createRobot(pos: Position): THREE.Group {
  const g = new THREE.Group(); wheelMeshes = []; robotEyeMeshes = []
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.62, 0.82, 4, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x87CEEB, roughness: 0.2, metalness: 0.08 }))
  body.position.y = 0.42; body.castShadow = true; g.add(body)

  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.52, 0.1, 4, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12 }))
  panel.position.set(0, 0.42, 0.46); g.add(panel)

  const screen = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.28, 0.03, 4, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.3 }))
  screen.position.set(0, 0.46, 0.52); g.add(screen)
  const chargeBarTrack = new THREE.Mesh(
    new RoundedBoxGeometry(0.36, 0.05, 0.012, 2, 0.006),
    new THREE.MeshStandardMaterial({ color: 0x20252f, roughness: 0.45, metalness: 0.4 })
  )
  chargeBarTrack.position.set(0, 0.36, 0.536)
  g.add(chargeBarTrack)
  robotChargeBar = new THREE.Mesh(
    new RoundedBoxGeometry(0.34, 0.036, 0.008, 2, 0.005),
    new THREE.MeshStandardMaterial({ color: 0xff7043, emissive: 0xff7043, emissiveIntensity: 1.2, roughness: 0.15 })
  )
  robotChargeBar.position.set(0, 0.36, 0.542)
  g.add(robotChargeBar)

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 2, roughness: 0.2 })
  const eyeGeo = new THREE.SphereGeometry(0.085, 32, 32)
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
  leftEye.position.set(-0.13, 0.46, 0.535); g.add(leftEye)
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
  rightEye.position.set(0.13, 0.46, 0.535); g.add(rightEye)
  robotEyeMeshes.push(leftEye, rightEye)
  g.add(new THREE.PointLight(0xFFD700, 0.4, 1.5).translateX(-0.13).translateY(0.46).translateZ(0.6))
  g.add(new THREE.PointLight(0xFFD700, 0.4, 1.5).translateX(0.13).translateY(0.46).translateZ(0.6))

  const smile = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.025, 0.02, 2, 0.01),
    new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 1 }))
  smile.position.set(0, 0.34, 0.535); g.add(smile)

  const top = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.16, 0.52, 4, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x5B9BD5, roughness: 0.3 }))
  top.position.set(0, 0.82, 0); top.castShadow = true; g.add(top)

  const chargeRingMat = new THREE.MeshStandardMaterial({ color: 0xff7043, emissive: 0xff7043, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.35 })
  const chargeRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 16, 40), chargeRingMat)
  chargeRing.rotation.x = Math.PI / 2
  chargeRing.position.set(0, 0.9, 0)
  g.add(chargeRing)
  robotChargeRingMat = chargeRingMat
  robotChargeBaseIntensity = 0.6

  robotChargePort = new THREE.Object3D()
  robotChargePort.position.set(0, 0.84, 0.34)
  g.add(robotChargePort)

  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 16),
    new THREE.MeshStandardMaterial({ color: 0x87CEEB }))
  ant.position.y = 1.05; g.add(ant)
  const aBall = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00E5FF, emissiveIntensity: 2.5 }))
  aBall.position.y = 1.22; g.add(aBall)
  g.add(new THREE.PointLight(0x00E5FF, 0.5, 2.5).translateY(1.22))

  // Wheels
  const wGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.16, 32)
  const wMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.7, metalness: 0.3 })
  const rGeo = new THREE.TorusGeometry(0.16, 0.03, 16, 32)
  const rMat = new THREE.MeshStandardMaterial({ color: 0x00BCD4, emissive: 0x00BCD4, emissiveIntensity: 1.5 })
  const wPos: [number, number, number][] = [[-0.37, 0.19, 0.36], [0.37, 0.19, 0.36], [-0.37, 0.19, -0.36], [0.37, 0.19, -0.36]]
  wPos.forEach(p => {
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.z = Math.PI / 2
    w.position.set(p[0], p[1], p[2]); w.castShadow = true; g.add(w); wheelMeshes.push(w)
    const r = new THREE.Mesh(rGeo, rMat); r.rotation.y = Math.PI / 2
    r.position.set(p[0] > 0 ? p[0] + 0.085 : p[0] - 0.085, p[1], p[2]); g.add(r)
  })

  g.position.set(pos.x, 0, pos.y); scene.add(g); return g
}

// ═══════════════════════════════════════════
// INTERACTABLES
// ═══════════════════════════════════════════
function createButton3D(pos: Position) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0xc87800, roughness: 0.3, metalness: 0.3 }))
  base.position.set(pos.x, 0.06, pos.y); base.castShadow = true; scene.add(base)
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 32),
    new THREE.MeshStandardMaterial({ color: 0xFFEB3B, emissive: 0xFFD700, emissiveIntensity: 0.8, roughness: 0.2 }))
  btn.position.set(pos.x, 0.17, pos.y); btn.castShadow = true; scene.add(btn)
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xFFEB3B, transparent: true, opacity: 0.15 }))
  glow.position.set(pos.x, 0.2, pos.y); scene.add(glow)
  scene.add(new THREE.PointLight(0xFFD700, 0.6, 4).translateX(pos.x).translateY(0.5).translateZ(pos.y))
}

function createChargingStation(pos: Position): THREE.Group {
  const g = new THREE.Group()
  const graphiteMat = new THREE.MeshStandardMaterial({ color: 0x26313f, roughness: 0.38, metalness: 0.72 })
  const alloyMat = new THREE.MeshStandardMaterial({ color: 0xdde4ee, roughness: 0.16, metalness: 0.9 })
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x101721, roughness: 0.22, metalness: 0.42 })

  // Ground platform + docking ring
  const platform = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.1, 2.3, 5, 0.06), graphiteMat)
  platform.position.y = 0.05
  platform.receiveShadow = true
  g.add(platform)
  const dockingRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.065, 20, 56),
    new THREE.MeshStandardMaterial({ color: 0x4dd0e1, emissive: 0x26c6da, emissiveIntensity: 1.05, roughness: 0.2, metalness: 0.5 })
  )
  dockingRing.rotation.x = Math.PI / 2
  dockingRing.position.y = 0.11
  g.add(dockingRing)
  const centerPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.62, 0.06, 48),
    new THREE.MeshStandardMaterial({ color: 0x1f2a33, roughness: 0.4, metalness: 0.45 })
  )
  centerPad.position.y = 0.08
  g.add(centerPad)
  chargingSurfaceMat = new THREE.MeshStandardMaterial({ color: 0x4de5ff, emissive: 0x26c6da, emissiveIntensity: 0.8, roughness: 0.1 })
  const centerGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.48, 0.02, 40),
    chargingSurfaceMat
  )
  centerGlow.position.y = 0.12
  g.add(centerGlow)

  // Rear power cabinet
  const powerBody = new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.95, 0.42, 5, 0.06), alloyMat)
  powerBody.position.set(0, 1.0, -1.15)
  powerBody.castShadow = true
  g.add(powerBody)
  const servicePanel = new THREE.Mesh(new RoundedBoxGeometry(0.58, 1.2, 0.04, 4, 0.02), panelMat)
  servicePanel.position.set(0, 1.08, -0.92)
  g.add(servicePanel)

  // Status display
  const statusBar = new THREE.Mesh(
    new RoundedBoxGeometry(0.4, 0.12, 0.015, 3, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x69f0ae, emissive: 0x69f0ae, emissiveIntensity: 2.1, roughness: 0.08 })
  )
  statusBar.position.set(0, 1.52, -0.9)
  g.add(statusBar)
  const statusStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.03, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x4dd0e1, emissive: 0x4dd0e1, emissiveIntensity: 1.4, roughness: 0.1 })
  )
  statusStripe.position.set(0, 1.84, -1.02)
  g.add(statusStripe)

  // Gantry frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x5f6f82, roughness: 0.34, metalness: 0.66 })
  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), frameMat)
  frameLeft.position.set(-1.0, 1.2, -0.1); frameLeft.castShadow = true; g.add(frameLeft)
  const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), frameMat)
  frameRight.position.set(1.0, 1.2, -0.1); frameRight.castShadow = true; g.add(frameRight)
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.16, 0.2), frameMat)
  frameTop.position.set(0, 2.38, -0.1); frameTop.castShadow = true; g.add(frameTop)

  // Cable reel + connector dock
  const reel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 16, 32),
    new THREE.MeshStandardMaterial({ color: 0x20252d, roughness: 0.72, metalness: 0.45 }))
  reel.position.set(0.52, 0.8, -1.0); reel.rotation.y = Math.PI / 2
  g.add(reel)
  const dockNozzle = new THREE.Mesh(
    new RoundedBoxGeometry(0.12, 0.18, 0.09, 3, 0.015),
    new THREE.MeshStandardMaterial({ color: 0x25303c, roughness: 0.28, metalness: 0.65 })
  )
  dockNozzle.position.set(0.66, 0.42, -0.96)
  g.add(dockNozzle)
  chargingCableAnchor = new THREE.Object3D()
  chargingCableAnchor.position.set(0.66, 0.42, -0.84)
  g.add(chargingCableAnchor)

  // Overhead canopy
  const canopy = new THREE.Mesh(
    new RoundedBoxGeometry(2.7, 0.12, 3.2, 5, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x3b4a5e, roughness: 0.25, metalness: 0.72 })
  )
  canopy.position.y = 2.64
  canopy.castShadow = true
  g.add(canopy)
  const canopyLed = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.03, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x7bdff2, emissive: 0x7bdff2, emissiveIntensity: 1.65, roughness: 0.08 })
  )
  canopyLed.position.set(0, 2.58, 1.54)
  g.add(canopyLed)
  const canopyLedBack = canopyLed.clone()
  canopyLedBack.position.z = -1.54
  g.add(canopyLedBack)

  // Local lighting
  const spotDown = new THREE.SpotLight(0x7de9ff, 2.0, 6.5, Math.PI / 4.8, 0.45)
  spotDown.position.set(0, 2.52, 0.1)
  spotDown.target.position.set(0, 0, 0.05)
  g.add(spotDown)
  g.add(spotDown.target)
  g.add(new THREE.PointLight(0x69f0ae, 1.0, 7).translateY(0.6))
  chargingAmbientGlowMat = new THREE.MeshBasicMaterial({ color: 0x7de9ff, transparent: true, opacity: 0.06 })
  const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 14), chargingAmbientGlowMat)
  glowSphere.position.y = 0.55
  g.add(glowSphere)

  if (chargingCableLine) scene.remove(chargingCableLine)
  const cablePoints = Array.from({ length: 14 }, () => new THREE.Vector3(pos.x, 0.3, pos.y))
  const cableGeometry = new THREE.BufferGeometry().setFromPoints(cablePoints)
  chargingCableLine = new THREE.Line(
    cableGeometry,
    new THREE.LineBasicMaterial({ color: 0x16181f, transparent: true, opacity: 0.9 })
  )
  chargingCableLine.visible = false
  chargingCableLine.frustumCulled = false
  scene.add(chargingCableLine)

  g.rotation.y = Math.PI
  g.position.set(pos.x, 0, pos.y); scene.add(g); return g
}

// ═══════════════════════════════════════════
// DOOR — Rolling shutter with clipping
// ═══════════════════════════════════════════
function createDoor(): THREE.Group {
  const doorGroup = new THREE.Group()
  doorPanels = []; doorLines = []
  const doorW = GRID_W - 0.3
  const numPanels = Math.ceil(WALL_H / DOOR_PANEL_H)

  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x6e6e7e, roughness: 0.35, metalness: 0.65,
    clippingPlanes: [doorClipPlane], clipShadows: true
  })
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0x555565, roughness: 0.5, metalness: 0.7,
    clippingPlanes: [doorClipPlane], clipShadows: true
  })

  for (let i = 0; i < numPanels; i++) {
    const p = new THREE.Mesh(new RoundedBoxGeometry(doorW, DOOR_PANEL_H - 0.01, 0.08, 2, 0.01), panelMat)
    p.position.set(GRID_CENTER_X, DOOR_PANEL_H / 2 + i * DOOR_PANEL_H, DOOR_Z)
    p.castShadow = true; doorGroup.add(p); doorPanels.push(p)

    const l = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.012, 0.09), lineMat)
    l.position.set(GRID_CENTER_X, i * DOOR_PANEL_H + DOOR_PANEL_H, DOOR_Z)
    doorGroup.add(l); doorLines.push(l)
  }

  doorHandle = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.32, 0.12, 2, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x333340, roughness: 0.3, metalness: 0.8,
      clippingPlanes: [doorClipPlane], clipShadows: true
    }))
  doorHandle.position.set(GRID_CENTER_X - doorW * 0.33, 0.9, DOOR_Z + 0.1); doorGroup.add(doorHandle)

  scene.add(doorGroup); return doorGroup
}

// ═══════════════════════════════════════════
// DOOR ANIMATION — rolling shutter with masking
// ═══════════════════════════════════════════
function animateDoorOpening() {
  const animationVersion = ++doorAnimationVersion
  soundManager.playDoorOpen()
  showToast('Kapı açılıyor! 🚪', 'success')

  const duration = 2500, startTime = Date.now(), totalHeight = WALL_H + 0.5
  const originalY = doorPanels.map(p => p.position.y)
  const originalLineY = doorLines.map(l => l.position.y)
  const handleOrigY = doorHandle.position.y

  // Sunlight from outside
  if (doorSunLight) scene.remove(doorSunLight)
  doorSunLight = new THREE.DirectionalLight(0xfff4e0, 0)
  doorSunLight.position.set(GRID_CENTER_X + 2.5, 9, DOOR_ROW + 15); scene.add(doorSunLight)

  // Glow plane (will be removed after animation)
  if (doorGlowPlane) scene.remove(doorGlowPlane)
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff8e1, transparent: true, opacity: 0, side: THREE.DoubleSide })
  doorGlowPlane = new THREE.Mesh(new THREE.PlaneGeometry(GRID_W, WALL_H), glowMat)
  doorGlowPlane.position.set(GRID_CENTER_X, WALL_H / 2, DOOR_ROW + 0.1); scene.add(doorGlowPlane)

  const animate = () => {
    if (animationVersion !== doorAnimationVersion) return

    const t = Math.min((Date.now() - startTime) / duration, 1)
    const ease = 1 - Math.pow(1 - t, 3)

    // Roll up panels — staggered from bottom
    doorPanels.forEach((p, i) => {
      const delay = (i / doorPanels.length) * 0.3
      const lt = Math.max(0, Math.min(1, (ease - delay) / (1 - delay)))
      p.position.y = originalY[i] + totalHeight * lt
      p.rotation.x = lt * Math.PI * 0.12
      p.scale.y = 1 - lt * 0.4
    })
    doorLines.forEach((l, i) => {
      const delay = (i / doorLines.length) * 0.3
      const lt = Math.max(0, Math.min(1, (ease - delay) / (1 - delay)))
      l.position.y = originalLineY[i] + totalHeight * lt
    })
    doorHandle.position.y = handleOrigY + totalHeight * ease

    // Sunlight / glow increases then glow fades
    if (doorSunLight) doorSunLight.intensity = ease * 2.2
    if (t < 0.8) glowMat.opacity = ease * 0.3
    else glowMat.opacity = 0.3 * (1 - (t - 0.8) / 0.2) // fade out in last 20%

    renderer.toneMappingExposure = BASE_EXPOSURE + ease * DOOR_OPEN_EXPOSURE_BOOST
    if (skyLight) skyLight.intensity = ease * 0.95

    if (t < 1) requestAnimationFrame(animate)
    else {
      // Remove glow plane completely
      if (doorGlowPlane) { scene.remove(doorGlowPlane); doorGlowPlane = null }

      // Make door row walkable — robot can now go outside!
      for (let x = 0; x < GRID_W; x++) grid.setWalkable({ x, y: DOOR_ROW }, true)

      gameState = GameState.DOOR_OPENED

      // Cinematic camera: zoom to show outside
      animateCameraTo({ x: GRID_CENTER_X + 2.2, y: 5.8, z: DOOR_ROW + 6.4 }, { x: GRID_CENTER_X, y: 1, z: DOOR_ROW + 1.5 }, 1500, () => {
        updateMission(2, 'Şarj İstasyonu', 'Robotu dışarıdaki yeşil şarj alanına götür ve şarj et.')
        showToast('Yeni görev: Şarj istasyonuna ulaş! ⚡', 'info')
        const pose = getPrimaryCameraPose()
        setTimeout(() => animateCameraTo(pose.pos, pose.target, 1200), 1500)
      })
    }
  }
  animate()
}

function clearCommandHighlight() {
  if (workspace) workspace.highlightBlock(null)
  highlightedBlockId = null
}

function highlightCommandByIndex(index: number) {
  const blockId = commandBlockMap[index]
  if (!workspace || !blockId) {
    clearCommandHighlight()
    return
  }
  if (highlightedBlockId === blockId) return
  workspace.highlightBlock(blockId)
  highlightedBlockId = blockId
}

function resetDoorVisualState() {
  // Cancel in-flight animation loops before restoring geometry.
  doorAnimationVersion++

  if (doorGlowPlane) { scene.remove(doorGlowPlane); doorGlowPlane = null }
  if (doorSunLight) { scene.remove(doorSunLight); doorSunLight = null }

  doorPanels.forEach((p, i) => {
    p.position.set(GRID_CENTER_X, DOOR_PANEL_H / 2 + i * DOOR_PANEL_H, DOOR_Z)
    p.rotation.set(0, 0, 0)
    p.scale.set(1, 1, 1)
  })
  doorLines.forEach((l, i) => {
    l.position.set(GRID_CENTER_X, i * DOOR_PANEL_H + DOOR_PANEL_H, DOOR_Z)
    l.rotation.set(0, 0, 0)
    l.scale.set(1, 1, 1)
  })
  doorHandle.position.set(GRID_CENTER_X - (GRID_W - 0.3) * 0.33, 0.9, DOOR_Z + 0.1)
  doorHandle.rotation.set(0, 0, 0)
  doorHandle.scale.set(1, 1, 1)

  renderer.toneMappingExposure = BASE_EXPOSURE
  if (skyLight) skyLight.intensity = 0
}

function resetSimulationState() {
  executor.stop()
  battery.stopCharging()
  setChargingCableConnected(false)
  chargePulseUntil = 0
  isExecuting = false

  hideSuccess()
  hideFailure()
  clearCommandHighlight()

  robot = new Robot(ROBOT_START, Direction.NORTH)
  battery = new BatterySystem(10)
  executor = new ProgramExecutor(800)
  grid = new Grid(GRID_W, GRID_H)

  door = new GarageDoor()
  button = new Button(() => { door.interact() })
  chargingPad = new ChargingPad(battery)
  grid.placeInteractable(BUTTON_POS, button)
  grid.placeInteractable(CHARGE_POS, chargingPad)
  for (let x = 0; x < GRID_W; x++) grid.setWalkable({ x, y: DOOR_ROW }, false)

  resetDoorVisualState()

  blinkTimer = 0
  blinkProgress = 0
  nextBlinkAt = 1.8 + Math.random() * 2.8
  isBlinking = false
  robotEyeMeshes.forEach((eye) => { eye.scale.y = 1 })

  gameState = GameState.READY
  updateRobotPosition()
  updateBatteryUI(10)
  updateRobotChargeIndicator(10)
  updatePositionDisplay()
  updateStatus('Hazır', 'ready')
  updateMission(1, 'Butona Ulaş', 'Robotu butona kadar sürerek kapıyı aç.')
}

// ═══════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════
function animateCameraTo(tp: { x: number, y: number, z: number }, tl: { x: number, y: number, z: number }, dur: number, cb?: () => void) {
  const sp = camera.position.clone(), st = controls.target.clone(), s = Date.now()
  const a = () => {
    const t = Math.min((Date.now() - s) / dur, 1)
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    camera.position.lerpVectors(sp, new THREE.Vector3(tp.x, tp.y, tp.z), e)
    controls.target.lerpVectors(st, new THREE.Vector3(tl.x, tl.y, tl.z), e)
    controls.update()
    if (t < 1) requestAnimationFrame(a); else cb?.()
  }; a()
}

// ═══════════════════════════════════════════
// ROBOT MOVEMENT
// ═══════════════════════════════════════════
function updateRobotPosition() {
  const pos = robot.getPosition(), dir = robot.getDirection()
  const tx = pos.x, tz = pos.y, tr = -dir * Math.PI / 180
  const sx = robotMesh.position.x, sz = robotMesh.position.z, sr = robotMesh.rotation.y
  const st = Date.now(), dur = 400

  const a = () => {
    const t = Math.min((Date.now() - st) / dur, 1)
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    robotMesh.position.x = sx + (tx - sx) * e; robotMesh.position.z = sz + (tz - sz) * e
    let dr = tr - sr; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2
    robotMesh.rotation.y = sr + dr * e
    wheelMeshes.forEach(w => { w.rotation.x += t * 0.4 })
    if (t < 1) requestAnimationFrame(a)
    else { robotMesh.position.x = tx; robotMesh.position.z = tz; robotMesh.rotation.y = tr }
  }; a()
  updatePositionDisplay()
}

function isRobotOnChargingPad(): boolean {
  const pos = robot.getPosition()
  return pos.x === CHARGE_POS.x && pos.y === CHARGE_POS.y
}

function setChargingCableConnected(connected: boolean) {
  isCableConnected = connected
  if (connected) cableConnectStart = performance.now()
  if (chargingCableLine) chargingCableLine.visible = connected
}

function updateChargingCableGeometry(start: THREE.Vector3, end: THREE.Vector3) {
  if (!chargingCableLine) return
  const mid = start.clone().lerp(end, 0.5)
  const sag = Math.min(0.45, 0.12 + start.distanceTo(end) * 0.08)
  mid.y -= sag
  const points: THREE.Vector3[] = []
  for (let i = 0; i < 14; i++) {
    const t = i / 13
    const omt = 1 - t
    points.push(new THREE.Vector3(
      omt * omt * start.x + 2 * omt * t * mid.x + t * t * end.x,
      omt * omt * start.y + 2 * omt * t * mid.y + t * t * end.y,
      omt * omt * start.z + 2 * omt * t * mid.z + t * t * end.z
    ))
  }
  (chargingCableLine.geometry as THREE.BufferGeometry).setFromPoints(points)
}

function updateChargingCable() {
  if (!chargingCableLine || !chargingCableAnchor || !robotChargePort) return
  if (!isCableConnected) {
    chargingCableLine.visible = false
    return
  }
  if (!isRobotOnChargingPad()) {
    setChargingCableConnected(false)
    return
  }

  const start = chargingCableAnchor.getWorldPosition(new THREE.Vector3())
  const target = robotChargePort.getWorldPosition(new THREE.Vector3())
  const t = Math.min((performance.now() - cableConnectStart) / 350, 1)
  const eased = 1 - Math.pow(1 - t, 2)
  const end = start.clone().lerp(target, eased)
  updateChargingCableGeometry(start, end)
  chargingCableLine.visible = true
}

function updateRobotChargeIndicator(level: number) {
  if (!robotChargeRingMat) return
  const pct = Math.max(0, Math.min(100, level))
  let color = 0xff7043
  let intensity = 1.0
  if (pct >= 80) {
    color = 0x69f0ae
    intensity = 1.45
  } else if (pct >= 30) {
    color = 0xffd54f
    intensity = 1.15
  }
  robotChargeRingMat.color.setHex(color)
  robotChargeRingMat.emissive.setHex(color)
  robotChargeBaseIntensity = intensity
  robotChargeRingMat.emissiveIntensity = intensity

  if (robotChargeBar) {
    const barMat = robotChargeBar.material as THREE.MeshStandardMaterial
    const t = Math.max(0.06, pct / 100)
    robotChargeBar.scale.x = t
    robotChargeBar.position.x = -0.17 * (1 - t)
    barMat.color.setHex(color)
    barMat.emissive.setHex(color)
    barMat.emissiveIntensity = intensity + 0.25
  }
}

function updateEyeBlink(delta: number) {
  if (!robotEyeMeshes.length) return

  blinkTimer += delta
  if (!isBlinking && blinkTimer >= nextBlinkAt) {
    isBlinking = true
    blinkProgress = 0
  }

  if (!isBlinking) return
  blinkProgress += delta / 0.14
  const closeAmount = blinkProgress < 0.5 ? blinkProgress * 2 : (1 - blinkProgress) * 2
  const eyeScaleY = Math.max(0.12, 1 - closeAmount)
  robotEyeMeshes.forEach((eye) => { eye.scale.y = eyeScaleY })

  if (blinkProgress >= 1) {
    isBlinking = false
    blinkTimer = 0
    blinkProgress = 0
    nextBlinkAt = 1.8 + Math.random() * 2.8
    robotEyeMeshes.forEach((eye) => { eye.scale.y = 1 })
  }
}

function updateGarageRoofVisual() {
  if (!garageRoofMaterials.length) return
  const closed = garageMode === 'closed'
  const roofFade = closed && camera.position.y > WALL_H + 1.25 ? 0.38 : 1
  garageRoofMaterials.forEach((mat) => {
    mat.transparent = roofFade < 0.99
    mat.opacity = roofFade
  })
}

function playChargingAnimation() {
  soundManager.playCharging()
  setChargingCableConnected(true)
  chargePulseUntil = performance.now() + 2200
  const mat = chargingSurfaceMat
  if (!mat) return
  const st = Date.now()
  const pulse = () => {
    const t = (Date.now() - st) / 2000
    if (t > 1) { mat.emissiveIntensity = 0.6; return }
    mat.emissiveIntensity = 0.6 + Math.sin(t * Math.PI * 8) * 0.8
    requestAnimationFrame(pulse)
  }; pulse()
}

// ═══════════════════════════════════════════
// GAME INIT
// ═══════════════════════════════════════════
function initGame() {
  grid = new Grid(GRID_W, GRID_H)
  robot = new Robot(ROBOT_START, Direction.NORTH)
  battery = new BatterySystem(10)
  executor = new ProgramExecutor(800)

  robotMesh = createRobot(robot.getPosition())
  createButton3D(BUTTON_POS)
  chargePadMesh = createChargingStation(CHARGE_POS)
  createDoor()
  const env = createOutdoorScene(scene, { GRID_W, GRID_H, DOOR_ROW, GRID_CENTER_X })
  skyLight = env.skyLight

  button = new Button(() => { door.interact() })
  door = new GarageDoor()
  chargingPad = new ChargingPad(battery)

  grid.placeInteractable(BUTTON_POS, button)
  grid.placeInteractable(CHARGE_POS, chargingPad)

  // Door row not walkable until opened
  for (let x = 0; x < GRID_W; x++) grid.setWalkable({ x, y: DOOR_ROW }, false)

  // Events
  EventBus.on('battery:updated', (l: number) => { updateBatteryUI(l); updateRobotChargeIndicator(l) })
  EventBus.on('battery:critical', () => showToast('⚠️ Batarya kritik!', 'warning'))
  EventBus.on('door:opening', () => animateDoorOpening())
  EventBus.on('button:pressed', () => soundManager.playButtonPress())
  EventBus.on('robot:on_charging_pad', () => playChargingAnimation())

  EventBus.on('robot:moved', () => {
    updateRobotPosition()
    updatePositionDisplay()
    if (!isRobotOnChargingPad()) setChargingCableConnected(false)
  })
  EventBus.on('command:highlight', (index: number) => highlightCommandByIndex(index))
  EventBus.on('command:executed', (d: { type: string }) => {
    switch (d.type) {
      case 'MOVE_FORWARD': case 'MOVE_BACKWARD': soundManager.playMove(); break
      case 'TURN_LEFT': case 'TURN_RIGHT': soundManager.playTurn(); break
      case 'CHARGE': soundManager.playCharging(); break
    }
  })

  EventBus.on('battery:dead', () => {
    setChargingCableConnected(false)
    chargePulseUntil = 0
    isExecuting = false; gameState = GameState.FAILED
    clearCommandHighlight()
    showFailure('BIG-BOT\'un bataryası bitti! Daha verimli bir rota dene.')
  })

  EventBus.on('battery:full', () => {
    setChargingCableConnected(false)
    chargePulseUntil = 0
    updateBatteryUI(100); showToast('🔋 Batarya %100 dolu!', 'success')
    gameState = GameState.COMPLETE
    clearCommandHighlight()
    setTimeout(() => {
      showSuccess('BIG-BOT şarj oldu! Şehre çıkmaya hazır! 🏙️', executor.getCommands().length, 100)
    }, 500)
  })

  EventBus.on('program:stopped', () => {
    isExecuting = false
    clearCommandHighlight()
    if (!isRobotOnChargingPad()) setChargingCableConnected(false)
    updateStatus('Durduruldu', 'ready')
  })
  EventBus.on('program:complete', () => { isExecuting = false; clearCommandHighlight(); updateStatus('Tamamlandı', 'ready') })
  EventBus.on('command:error', (d: { index: number, message: string }) => {
    clearCommandHighlight()
    showToast(`Komut ${d.index + 1}: ${d.message}`, 'error'); updateStatus('Hata!', 'error')
  })

  blinkTimer = 0
  blinkProgress = 0
  nextBlinkAt = 1.8 + Math.random() * 2.8
  isBlinking = false
  updateRobotChargeIndicator(10)
  updatePositionDisplay(); updateBatteryUI(10)
  updateMission(1, 'Butona Ulaş', 'Robotu butona kadar sürerek kapıyı aç.')
}

// ═══════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════
let time = 0
function renderLoop() {
  requestAnimationFrame(renderLoop); time += 0.016; controls.update()
  updateEyeBlink(0.016)
  updateGarageRoofVisual()
  updateChargingCable()
  if (robotMesh) {
    // Antenna pulse
    const ab = robotMesh.children.find(c => c instanceof THREE.Mesh && c.position.y > 1.1) as THREE.Mesh | undefined
    if (ab) (ab.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 + Math.sin(time * 3) * 0.8
    // Idle bob
    if (!isExecuting) robotMesh.position.y = Math.sin(time * 1.5) * 0.01
  }
  if (robotChargeRingMat) {
    const pulseBoost = chargePulseUntil > performance.now() ? 0.45 + Math.sin(time * 14) * 0.35 : 0
    robotChargeRingMat.emissiveIntensity = robotChargeBaseIntensity + pulseBoost
  }
  // Charging pad glow pulse
  if (chargingAmbientGlowMat) {
    chargingAmbientGlowMat.opacity = 0.06 + Math.sin(time * 2) * 0.04
  }
  renderer.render(scene, camera)
}

// ═══════════════════════════════════════════
// BLOCKLY
// ═══════════════════════════════════════════
function initBlockly() {
  Blockly.Blocks['green_flag'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('🚩 Yeşil Bayrak Tıklandığında')
      this.setNextStatement(true, null); this.setColour(65); this.setDeletable(false)
    }
  }

  Blockly.Blocks['move_forward'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('⬆️ İleri Git')
        .appendField(new Blockly.FieldNumber(1, 1, 20, 1), 'COUNT').appendField('adım')
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour(230)
      this.setTooltip('Robotu belirtilen adım kadar ileri götürür')
    }
  }

  Blockly.Blocks['move_backward'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('⬇️ Geri Git')
        .appendField(new Blockly.FieldNumber(1, 1, 20, 1), 'COUNT').appendField('adım')
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour(230)
      this.setTooltip('Robotu belirtilen adım kadar geriye götürür')
    }
  }

  Blockly.Blocks['turn_left'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('⬅️ Sola Dön')
        .appendField(new Blockly.FieldNumber(1, 1, 4, 1), 'COUNT').appendField('kez')
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour(230)
    }
  }

  Blockly.Blocks['turn_right'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('➡️ Sağa Dön')
        .appendField(new Blockly.FieldNumber(1, 1, 4, 1), 'COUNT').appendField('kez')
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour(230)
    }
  }

  Blockly.Blocks['press_button'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('🔘 Butona Bas')
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour(290)
    }
  }

  Blockly.Blocks['charge'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('⚡ Şarj Ol')
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour(160)
    }
  }

  workspace = Blockly.inject('blockly-div', {
    toolbox: {
      kind: 'categoryToolbox', contents: [
        { kind: 'category', name: '🎯 Olaylar', colour: '65', contents: [{ kind: 'block', type: 'green_flag' }] },
        {
          kind: 'category', name: '🏃 Hareket', colour: '230', contents: [
            { kind: 'block', type: 'move_forward' }, { kind: 'block', type: 'move_backward' },
            { kind: 'block', type: 'turn_left' }, { kind: 'block', type: 'turn_right' }
          ]
        },
        {
          kind: 'category', name: '🤖 Robot', colour: '290', contents: [
            { kind: 'block', type: 'press_button' }, { kind: 'block', type: 'charge' }
          ]
        }
      ]
    },
    scrollbars: true, trashcan: true,
    zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
    grid: { spacing: 25, length: 3, colour: '#2a2f42', snap: true },
    theme: Blockly.Theme.defineTheme('bigbot_dark', {
      name: 'bigbot_dark', base: Blockly.Themes.Classic,
      componentStyles: {
        workspaceBackgroundColour: '#151822', toolboxBackgroundColour: '#1e2233',
        toolboxForegroundColour: '#e0e0e0', flyoutBackgroundColour: '#1e2233',
        flyoutForegroundColour: '#e0e0e0', flyoutOpacity: 0.95,
        scrollbarColour: '#3a3f55', scrollbarOpacity: 0.6,
        insertionMarkerColour: '#00d4aa', insertionMarkerOpacity: 0.5, cursorColour: '#00d4aa'
      },
      fontStyle: { family: 'Inter, Arial, sans-serif', weight: 'bold', size: 12 }
    })
  })

  const gf = workspace.newBlock('green_flag')
  gf.initSvg(); gf.render(); gf.moveBy(30, 30)
  workspace.addChangeListener(() => updateProgramFromBlockly())
}

function updateProgramFromBlockly() {
  executor = new ProgramExecutor(800)
  commandBlockMap = []
  clearCommandHighlight()
  const blocks = workspace.getTopBlocks(true)
  let start: Blockly.Block | null = null
  for (const b of blocks) { if (b.type === 'green_flag') { start = b.getNextBlock(); break } }
  if (!start) return

  let cur: Blockly.Block | null = start
  while (cur) {
    const blockId = cur.id
    const count = Number(cur.getFieldValue('COUNT')) || 1
    switch (cur.type) {
      case 'move_forward':
        for (let i = 0; i < count; i++) {
          executor.addCommand(new MoveForwardCommand())
          commandBlockMap.push(blockId)
        }
        break
      case 'move_backward':
        for (let i = 0; i < count; i++) {
          executor.addCommand(new MoveBackwardCommand())
          commandBlockMap.push(blockId)
        }
        break
      case 'turn_left':
        for (let i = 0; i < count; i++) {
          executor.addCommand(new TurnLeftCommand())
          commandBlockMap.push(blockId)
        }
        break
      case 'turn_right':
        for (let i = 0; i < count; i++) {
          executor.addCommand(new TurnRightCommand())
          commandBlockMap.push(blockId)
        }
        break
      case 'press_button':
        executor.addCommand(new PressButtonCommand())
        commandBlockMap.push(blockId)
        break
      case 'charge':
        executor.addCommand(new ChargeCommand())
        commandBlockMap.push(blockId)
        break
    }
    cur = cur.getNextBlock()
  }
}

// ═══════════════════════════════════════════
// UI EVENT HANDLERS
// ═══════════════════════════════════════════

// Intro
document.getElementById('intro-start-btn')!.addEventListener('click', () => {
  soundManager.playBootUp()
  const ov = document.getElementById('intro-overlay')!
  ov.classList.add('hidden')
  setTimeout(() => { ov.style.display = 'none' }, 1000)
  gameState = GameState.READY
  const pose = getPrimaryCameraPose()
  camera.position.set(GRID_CENTER_X, 1, -1.2)
  controls.target.set(GRID_CENTER_X, 0.8, 2.8)
  animateCameraTo(pose.pos, pose.target, 2000)
})

// Panel toggle
document.getElementById('toggle-panel-btn')!.addEventListener('click', () => {
  isPanelOpen = !isPanelOpen
  document.getElementById('coding-panel')!.classList.toggle('collapsed', !isPanelOpen)
  document.getElementById('toggle-panel-btn')!.innerHTML = isPanelOpen ? '<span>◧</span> Kodlama Paneli' : '<span>◨</span> Paneli Aç'
  setTimeout(() => {
    if (workspace) Blockly.svgResize(workspace)
    const c = document.getElementById('canvas-container')!
    camera.aspect = c.clientWidth / c.clientHeight
    camera.updateProjectionMatrix(); renderer.setSize(c.clientWidth, c.clientHeight)
  }, 400)
})

// Camera reset
document.getElementById('camera-reset')!.addEventListener('click', () => {
  const pose = getPrimaryCameraPose()
  animateCameraTo(pose.pos, pose.target, 800)
})
const garageModeSelect = document.getElementById('garage-mode-select') as HTMLSelectElement | null
if (garageModeSelect) {
  garageModeSelect.value = garageMode
  garageModeSelect.addEventListener('change', () => {
    const nextMode: GarageMode = garageModeSelect.value === 'closed' ? 'closed' : 'open'
    applyGarageMode(nextMode, true, true)
  })
}

// GREEN FLAG — run program
document.getElementById('btn-green-flag')!.addEventListener('click', async () => {
  if (isExecuting) { showToast('Zaten çalışıyor!', 'warning'); return }
  if (gameState === GameState.INTRO) { showToast('Önce göreve başlayın!', 'warning'); return }

  const cmds = executor.getCommands().length
  if (cmds === 0) { showToast('Blok ekleyin!', 'warning'); return }

  if (battery.getCurrentLevel() <= 0) {
    showFailure('Batarya tamamen bitti! Sıfırla ve tekrar dene.')
    gameState = GameState.FAILED; return
  }

  isExecuting = true
  // Don't force gameState to EXECUTING if door is already opened — allow continued play
  if (gameState === GameState.READY || gameState === GameState.DOOR_OPENED) {
    updateStatus('Çalışıyor...', 'executing')
  }

  const result = await executor.execute(robot, grid, battery)

  if (result.stopped) {
    updateStatus('Durduruldu', 'ready')
  } else if (!result.success && (gameState as unknown) !== GameState.FAILED) {
    updateStatus('Başarısız', 'error')
  }

  isExecuting = false
  updatePositionDisplay()
})

// STOP
document.getElementById('btn-stop')!.addEventListener('click', () => {
  executor.stop(); isExecuting = false
  clearCommandHighlight()
  updateStatus('Durduruldu', 'ready'); showToast('⏹ Durduruldu', 'warning')
})

// RESET
document.getElementById('btn-reset')!.addEventListener('click', () => {
  resetSimulationState()
  workspace.clear()
  const gf = workspace.newBlock('green_flag')
  gf.initSvg(); gf.render(); gf.moveBy(30, 30)
  updateProgramFromBlockly()
  showToast('🔄 Sıfırlandı', 'info')
})

// Success / Failure buttons
document.getElementById('success-next-btn')!.addEventListener('click', () => hideSuccess())
document.getElementById('failure-retry-btn')!.addEventListener('click', () => {
  hideFailure(); document.getElementById('btn-reset')!.click()
})

// ═══════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════
initScene()
createGarage()
initGame()
initBlockly()
renderLoop()
