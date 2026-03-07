import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import Stats from 'stats.js'
import { Robot } from '../entities/Robot'
import { Grid, Direction, Position } from '../systems/Grid'
import { BatterySystem } from '../systems/BatterySystem'
import { ProgramExecutor } from '../systems/ProgramExecutor'
import { Button } from '../entities/interactables/Button'
import { GarageDoor } from '../entities/interactables/GarageDoor'
import { ChargingPad } from '../entities/interactables/ChargingPad'
import EventBus from '../systems/EventBus'
import { EyeExpression } from '../entities/Robot'
import { soundManager } from '../systems/SoundManager'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createSkyGradient, createOutdoorScene, applyThemeToEnvironment } from './scene/EnvironmentBuilder'
import { createGarage as buildGarageLib } from './scene/GarageBuilder'
import { UIManager } from './UIManager'
import { BlocklyManager } from './BlocklyManager'
import { ScoreSystem } from '../systems/ScoreSystem'
import { WorkspacePersistence } from '../systems/WorkspacePersistence'
import { MissionManager } from '../missions/MissionManager'
import { getFullErrorMessage } from '../systems/ErrorMessages'
import { ParticleSystem } from './ParticleSystem'
import { LogPanel } from './LogPanel'
import {
  GRID_W, GRID_H, GARAGE_DEPTH, DOOR_ROW, GRID_CENTER_X, DOOR_PANEL_H, DOOR_Z,
  ROBOT_START, BUTTON_POS, CHARGE_POS, WALL_H,
  CAM_POS, CAM_TARGET, BASE_EXPOSURE, DOOR_OPEN_EXPOSURE_BOOST,
  INITIAL_BATTERY_LEVEL, DEFAULT_EXECUTION_SPEED,
  BLINK_MIN_INTERVAL, BLINK_MAX_INTERVAL, BLINK_DURATION,
  type GarageMode
} from '../core/Constants'

// ═══════════════════════════════════════════
// MODULE INSTANCES
// ═══════════════════════════════════════════
const ui = new UIManager()
const blocklyMgr = new BlocklyManager()
const scoreSystem = new ScoreSystem()
const persistence = new WorkspacePersistence()
const missionMgr = new MissionManager(scoreSystem)
const logPanel = new LogPanel()
let particles: ParticleSystem

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls
let stats: Stats
let robot: Robot, robotMesh: THREE.Group, grid: Grid, battery: BatterySystem, executor: ProgramExecutor
let button: Button, door: GarageDoor, chargingPad: ChargingPad
let doorPanels: THREE.Mesh[] = [], doorLines: THREE.Mesh[] = [], doorHandle: THREE.Mesh
let doorMeshGroup: THREE.Group
let buttonMesh: THREE.Group | null = null
let wheelMeshes: THREE.Mesh[] = [], chargePadMesh: THREE.Group
let mainAmbientLight: THREE.AmbientLight | null = null
let chargingSurfaceMat: THREE.MeshStandardMaterial | null = null
let chargingAmbientGlowMat: THREE.MeshBasicMaterial | null = null
let isExecuting = false, isPanelOpen = true
let lightMultiplier = 1.0
let skyLight: THREE.HemisphereLight
let doorClipPlane: THREE.Plane
let doorGlowPlane: THREE.Mesh | null = null
let doorSunLight: THREE.DirectionalLight | null = null
let doorVolumetricLights: THREE.SpotLight[] = []
let doorFloorStrips: THREE.Mesh[] = []
let doorDustInterval: ReturnType<typeof setInterval> | null = null
let doorAnimationVersion = 0
let robotEyeMeshes: THREE.Mesh[] = []
let robotEyeLights: THREE.PointLight[] = []
let robotChargeRingMat: THREE.MeshStandardMaterial | null = null
let robotChargeBaseIntensity = 0.6
let robotChargeBar: THREE.Mesh | null = null
let robotFloatingBar: THREE.Mesh | null = null
let robotFloatingBarBg: THREE.Mesh | null = null
let robotFloatingPctSprite: THREE.Sprite | null = null
let robotFloatingPctCanvas: HTMLCanvasElement | null = null
let robotFloatingPctTexture: THREE.CanvasTexture | null = null
let antennaBallMat: THREE.MeshStandardMaterial | null = null
let robotPupils: THREE.Mesh[] = []
let robotAntennaMesh: THREE.Mesh | null = null
let robotChargePort: THREE.Object3D | null = null
let doorFrameLedStrips: THREE.Mesh[] = []
let doorFrameLedMat: THREE.MeshStandardMaterial | null = null
let ventFanBlade: THREE.Mesh | null = null
let photoSensorLaser: THREE.Mesh | null = null
let photoSensorLaserMat: THREE.MeshStandardMaterial | null = null
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
let envAnimatedObjects: { clouds: THREE.Group[], birds: THREE.Group[], planes: THREE.Group[] } | null = null
let cameraMode: 'overview' | 'follow' | 'cinematic' = 'overview'
let cinematicAngle = 0

enum GameState { INTRO, READY, EXECUTING, DOOR_OPENED, COMPLETE, FAILED }
let gameState = GameState.INTRO

function getPrimaryCameraPose(mode: GarageMode = garageMode): { pos: { x: number, y: number, z: number }, target: { x: number, y: number, z: number } } {
  if (mode === 'closed') {
    return {
      pos: { x: GRID_CENTER_X, y: 3.5, z: -2.5 },
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
    mainAmbientLight.intensity = (mode === 'closed' ? 1.5 : 0.35) * lightMultiplier
    mainAmbientLight.color.setHex(0xffffff)
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
    ui.showToast(
      mode === 'closed'
        ? 'Garaj modu: Kapalı tavan sürüş görünümü'
        : 'Garaj modu: Açık tavan sahne görünümü',
      'info'
    )
  }
}

// ═══════════════════════════════════════════
// SCENE
// ═══════════════════════════════════════════

function initScene() {
  const c = document.getElementById('canvas-container')!
  scene = new THREE.Scene()

  stats = new Stats()
  stats.showPanel(0)
  document.body.appendChild(stats.dom)
  stats.dom.style.position = 'absolute'
  stats.dom.style.top = '42px'
  stats.dom.style.right = '10px'
  stats.dom.style.left = 'unset'

  const skyTex = createSkyGradient()
  scene.background = skyTex
  scene.environment = skyTex
  scene.fog = new THREE.FogExp2(0xd4e4f0, 0.004)
  camera = new THREE.PerspectiveCamera(45, c.clientWidth / c.clientHeight, 0.1, 500)
  camera.position.set(CAM_POS.x, CAM_POS.y, CAM_POS.z)

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true })
  renderer.setSize(c.clientWidth, c.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.shadowMap.enabled = false
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = BASE_EXPOSURE
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.localClippingEnabled = true
  c.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = 0.05
  controls.minDistance = 3; controls.maxDistance = 55; controls.maxPolarAngle = Math.PI / 2.05
  controls.target.set(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z); controls.update()

  // Lights — kept minimal since EnvironmentBuilder adds outdoorSun + hemisphere
  mainAmbientLight = new THREE.AmbientLight(0xfff5e6, 0.35)
  scene.add(mainAmbientLight)

  // Init particle system
  particles = new ParticleSystem(scene)

  // Clipping plane for door
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
    DOOR_ROW,
    BUTTON_X: BUTTON_POS.x,
    CHARGE_X: CHARGE_POS.x,
    CHARGE_Y: CHARGE_POS.y
  })

  garageGroup = result.garageGroup
  garageRoofGroup = result.garageRoofGroup
  garageRoofMaterials = result.garageRoofMaterials
  doorFrameLedStrips = result.doorFrameLedStrips
  doorFrameLedMat = result.doorFrameLedMat
  ventFanBlade = result.ventFanBlade
  photoSensorLaser = result.photoSensorLaser
  photoSensorLaserMat = result.photoSensorLaserMat

  scene.add(garageGroup)
  applyGarageMode(garageMode, false, false)
}

// ═══════════════════════════════════════════
// ROBOT
// ═══════════════════════════════════════════
function createRobot(pos: Position): THREE.Group {
  const g = new THREE.Group(); wheelMeshes = []; robotEyeMeshes = []; robotPupils = []

  // ── GÖVDE — Daha büyük, daha yuvarlak, PDF'deki mini-van oranları ──
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.88, 0.68, 0.98, 6, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x7EC8E3, roughness: 0.18, metalness: 0.1 }))
  body.position.y = 0.46; body.castShadow = true; g.add(body)

  // Yan şerit (dekoratif — PDF'deki koyu alt bant)
  const sideBand = new THREE.Mesh(new RoundedBoxGeometry(0.90, 0.08, 1.0, 4, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x4a9bb5, roughness: 0.25, metalness: 0.15 }))
  sideBand.position.set(0, 0.22, 0); g.add(sideBand)

  // ── ÖN PANEL — Daha büyük yüz alanı ──
  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.90, 0.58, 0.1, 5, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.10 }))
  panel.position.set(0, 0.46, 0.50); g.add(panel)

  // ── EKRAN ──
  const screen = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.32, 0.03, 4, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.3 }))
  screen.position.set(0, 0.50, 0.56); g.add(screen)

  // ── ŞARJ ÇUBUĞU ──
  const chargeBarTrack = new THREE.Mesh(
    new RoundedBoxGeometry(0.42, 0.05, 0.012, 2, 0.006),
    new THREE.MeshStandardMaterial({ color: 0x20252f, roughness: 0.45, metalness: 0.4 })
  )
  chargeBarTrack.position.set(0, 0.38, 0.57)
  g.add(chargeBarTrack)
  robotChargeBar = new THREE.Mesh(
    new RoundedBoxGeometry(0.40, 0.036, 0.008, 2, 0.005),
    new THREE.MeshStandardMaterial({ color: 0xff7043, emissive: 0xff7043, emissiveIntensity: 1.2, roughness: 0.15 })
  )
  robotChargeBar.position.set(0, 0.38, 0.576)
  g.add(robotChargeBar)

  const isIntro = gameState === GameState.INTRO;
  const initEyeIntensity = isIntro ? 0 : 2.5;
  const initEyeScaleY = isIntro ? 0.1 : 1;

  // ── GÖZLER — Daha büyük (r=0.12), canlı, pupilli ──
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: initEyeIntensity, roughness: 0.15 })
  const eyeGeo = new THREE.SphereGeometry(0.12, 32, 32)
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
  leftEye.position.set(-0.16, 0.52, 0.57); leftEye.scale.y = initEyeScaleY; g.add(leftEye)
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
  rightEye.position.set(0.16, 0.52, 0.57); rightEye.scale.y = initEyeScaleY; g.add(rightEye)
  robotEyeMeshes.push(leftEye, rightEye)

  // Göz bebekleri (siyah) — referans sakla (göz takibi için)
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.2 })
  const pupilGeo = new THREE.SphereGeometry(0.045, 16, 16)
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat)
  leftPupil.position.set(-0.16, 0.52, 0.685); g.add(leftPupil)
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat)
  rightPupil.position.set(0.16, 0.52, 0.685); g.add(rightPupil)
  robotPupils.push(leftPupil, rightPupil)

  // Göz parlaması (beyaz küçük nokta — canlılık)
  const glintMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2, roughness: 0.1 })
  const glintGeo = new THREE.SphereGeometry(0.018, 16, 16)
  const leftGlint = new THREE.Mesh(glintGeo, glintMat)
  leftGlint.position.set(-0.14, 0.54, 0.70); g.add(leftGlint)
  const rightGlint = new THREE.Mesh(glintGeo, glintMat)
  rightGlint.position.set(0.18, 0.54, 0.70); g.add(rightGlint)

  robotEyeLights = []
  const lLight = new THREE.PointLight(0xFFD700, isIntro ? 0 : 0.5, 2.0).translateX(-0.16).translateY(0.52).translateZ(0.65)
  const rLight = new THREE.PointLight(0xFFD700, isIntro ? 0 : 0.5, 2.0).translateX(0.16).translateY(0.52).translateZ(0.65)
  g.add(lLight); g.add(rLight)
  robotEyeLights.push(lLight, rLight)

  // ── YANAK KIZARIKLIKLARI — Sevimlilik ──
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xff8a80, roughness: 0.8, transparent: true, opacity: 0.25 })
  const blushGeo = new THREE.CircleGeometry(0.065, 32)
  const leftBlush = new THREE.Mesh(blushGeo, blushMat)
  leftBlush.position.set(-0.24, 0.42, 0.565); g.add(leftBlush)
  const rightBlush = new THREE.Mesh(blushGeo, blushMat)
  rightBlush.position.set(0.24, 0.42, 0.565); g.add(rightBlush)

  // ── GÜLÜMSEME ──
  const smile = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.025, 0.02, 2, 0.01),
    new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 1 }))
  smile.position.set(0, 0.36, 0.57); g.add(smile)

  // ── ÜST DOME/KAFA — Daha büyük ──
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.60, 0.20, 0.60, 5, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x5BA8C8, roughness: 0.25 }))
  top.position.set(0, 0.90, 0); top.castShadow = true; g.add(top)

  // ── ŞARJ HALKASİ ──
  const initRingIntensity = isIntro ? 0 : 0.6;
  const chargeRingMat = new THREE.MeshStandardMaterial({ color: 0xff7043, emissive: 0xff7043, emissiveIntensity: initRingIntensity, roughness: 0.2, metalness: 0.35 })
  const chargeRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 16, 40), chargeRingMat)
  chargeRing.rotation.x = Math.PI / 2
  chargeRing.position.set(0, 1.0, 0)
  g.add(chargeRing)
  robotChargeRingMat = chargeRingMat
  robotChargeBaseIntensity = 0.6

  robotChargePort = new THREE.Object3D()
  robotChargePort.position.set(0, 0.92, 0.40)
  g.add(robotChargePort)

  // ── ANTEN ──
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.30, 16),
    new THREE.MeshStandardMaterial({ color: 0x7EC8E3 }))
  ant.position.y = 1.16; g.add(ant)
  robotAntennaMesh = ant
  antennaBallMat = new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00E5FF, emissiveIntensity: 2.5 })
  const aBall = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), antennaBallMat)
  aBall.position.y = 1.34; g.add(aBall)
  g.add(new THREE.PointLight(0x00E5FF, 0.5, 2.5).translateY(1.34))

  // ── FLOATING CHARGE BAR (above robot) — bigger & with icon ──
  const floatingBarGroup = new THREE.Group()
  floatingBarGroup.position.set(0, 1.75, 0)

  // Background track (wider & taller)
  robotFloatingBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x0d1520, transparent: true, opacity: 0.9, depthTest: false })
  )
  robotFloatingBarBg.renderOrder = 999
  floatingBarGroup.add(robotFloatingBarBg)

  // Fill bar (wider & taller)
  robotFloatingBar = new THREE.Mesh(
    new THREE.PlaneGeometry(1.14, 0.13),
    new THREE.MeshBasicMaterial({ color: 0xff7043, transparent: true, opacity: 0.95, depthTest: false })
  )
  robotFloatingBar.renderOrder = 1000
  robotFloatingBar.position.z = 0.001
  floatingBarGroup.add(robotFloatingBar)

  // Battery icon sprite (left of bar)
  const batIconCanvas = document.createElement('canvas')
  batIconCanvas.width = 64; batIconCanvas.height = 64
  const bctx = batIconCanvas.getContext('2d')!
  bctx.font = 'bold 48px Arial'
  bctx.textAlign = 'center'
  bctx.textBaseline = 'middle'
  bctx.fillStyle = '#ffe082'
  bctx.fillText('\u26A1', 32, 32)
  const batIconTex = new THREE.CanvasTexture(batIconCanvas)
  batIconTex.minFilter = THREE.LinearFilter
  const batIconSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: batIconTex, transparent: true, depthTest: false })
  )
  batIconSprite.scale.set(0.3, 0.3, 1)
  batIconSprite.position.set(-0.75, 0, 0.001)
  batIconSprite.renderOrder = 1001
  floatingBarGroup.add(batIconSprite)

  // Percentage text sprite (bigger)
  robotFloatingPctCanvas = document.createElement('canvas')
  robotFloatingPctCanvas.width = 256
  robotFloatingPctCanvas.height = 96
  robotFloatingPctTexture = new THREE.CanvasTexture(robotFloatingPctCanvas)
  robotFloatingPctTexture.minFilter = THREE.LinearFilter
  const pctMat = new THREE.SpriteMaterial({ map: robotFloatingPctTexture, transparent: true, depthTest: false })
  robotFloatingPctSprite = new THREE.Sprite(pctMat)
  robotFloatingPctSprite.scale.set(0.8, 0.3, 1)
  robotFloatingPctSprite.position.y = 0.22
  robotFloatingPctSprite.renderOrder = 1001
  floatingBarGroup.add(robotFloatingPctSprite)

  g.add(floatingBarGroup)

  // ── PANEL ÇİZGİLERİ — Mekanik detay hissi ──
  const panelLineMat = new THREE.MeshStandardMaterial({ color: 0x5a9ab5, roughness: 0.4 })
  // Yatay panel derzleri
  for (const py of [0.25, 0.65]) {
    const hLine = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.005, 0.96), panelLineMat)
    hLine.position.set(0, py, 0); g.add(hLine)
  }
  // Dikey panel derzleri (yan)
  for (const px of [-0.2, 0.2]) {
    const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.40, 0.96), panelLineMat)
    vLine.position.set(px, 0.46, 0); g.add(vLine)
  }

  // ── ARKA HAVALANDIRMA IZGARASI ──
  const ventBackMat = new THREE.MeshStandardMaterial({ color: 0x4a7a8a, roughness: 0.4, metalness: 0.5 })
  const ventBack = new THREE.Mesh(new RoundedBoxGeometry(0.50, 0.28, 0.04, 2, 0.01), ventBackMat)
  ventBack.position.set(0, 0.40, -0.50); g.add(ventBack)
  for (let vi = 0; vi < 5; vi++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.015, 0.02), panelLineMat)
    slat.position.set(0, 0.30 + vi * 0.05, -0.51); g.add(slat)
  }

  // ── YAN TUTAMAKLAR (taşıma kulpu) ──
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.3, metalness: 0.7 })
  for (const hx of [-0.46, 0.46]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 16, 32, Math.PI), handleMat)
    handle.rotation.y = Math.PI / 2
    handle.rotation.z = Math.PI / 2
    handle.position.set(hx, 0.55, 0); g.add(handle)
  }

  // ── ALT GÖVDE DETAYI (mekanik aksam) ──
  const mechMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5, metalness: 0.6 })
  const underPlate = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.03, 0.70), mechMat)
  underPlate.position.set(0, 0.10, 0); g.add(underPlate)
  // Alt borular
  for (const pz of [-0.15, 0.15]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.50, 16), mechMat)
    pipe.rotation.z = Math.PI / 2; pipe.position.set(0, 0.08, pz); g.add(pipe)
  }

  // ── Contact shadow ──
  const robotShadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }))
  robotShadow.rotation.x = -Math.PI / 2; robotShadow.scale.set(1.1, 1.3, 1)
  robotShadow.position.y = 0.004; g.add(robotShadow)

  // ── TEKERLEKLER — Daha büyük (r=0.22), parlak jantlar ──
  const wGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 32)
  const wMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.7, metalness: 0.3 })
  const rGeo = new THREE.TorusGeometry(0.19, 0.035, 16, 32)
  const rMat = new THREE.MeshStandardMaterial({ color: 0x00BCD4, emissive: 0x00BCD4, emissiveIntensity: 2.0 })
  const wPos: [number, number, number][] = [[-0.44, 0.22, 0.40], [0.44, 0.22, 0.40], [-0.44, 0.22, -0.40], [0.44, 0.22, -0.40]]
  wPos.forEach(p => {
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.z = Math.PI / 2
    w.position.set(p[0], p[1], p[2]); g.add(w); wheelMeshes.push(w)
    const r = new THREE.Mesh(rGeo, rMat); r.rotation.y = Math.PI / 2
    r.position.set(p[0] > 0 ? p[0] + 0.095 : p[0] - 0.095, p[1], p[2]); g.add(r)
  })

  g.position.set(pos.x, 0, pos.y); scene.add(g); return g
}

// ═══════════════════════════════════════════
// INTERACTABLES
// ═══════════════════════════════════════════
function createButton3D(pos: Position) {
  const group = new THREE.Group()
  const isLeftWall = pos.x < GRID_CENTER_X

  const sideOffset = isLeftWall ? -0.58 : 0.62
  const screenOffset = isLeftWall ? -0.46 : 0.50
  const lightOffset = isLeftWall ? -0.2 : 0.3

  // Terminal base mounting
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.8, 0.6, 4, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.4, metalness: 0.6 }))
  base.position.set(pos.x + sideOffset, 1.2, pos.y)
  base.castShadow = true
  group.add(base)

  // Glowing yellow button
  const screen = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.6, 0.45, 3, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xFFEA00, emissive: 0xFFEA00, emissiveIntensity: 2.5, roughness: 0.1 }))
  screen.position.set(pos.x + screenOffset, 1.2, pos.y)
  group.add(screen)

  // Floor interaction decal zone
  const zoneMat = new THREE.MeshStandardMaterial({ color: 0xFFEA00, emissive: 0xFFEA00, emissiveIntensity: 1.5, transparent: true, opacity: 0.4 })
  const zone = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.02, 32), zoneMat)
  zone.position.set(pos.x, 0.01, pos.y)
  group.add(zone)

  // Local indicator light
  const pl = new THREE.PointLight(0xFFEA00, 3.0, 7.0)
  pl.position.set(pos.x + lightOffset, 1.2, pos.y)
  group.add(pl)

  scene.add(group)
  return group
}

function createChargingStation(pos: Position): THREE.Group {
  const g = new THREE.Group()
  const graphiteMat = new THREE.MeshStandardMaterial({ color: 0x26313f, roughness: 0.38, metalness: 0.72 })
  const alloyMat = new THREE.MeshStandardMaterial({ color: 0xdde4ee, roughness: 0.16, metalness: 0.9 })
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x101721, roughness: 0.22, metalness: 0.42 })

  // Ground platform + docking ring (1.5x bigger)
  const platform = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.12, 3.2, 5, 0.06), graphiteMat)
  platform.position.y = 0.05
  platform.receiveShadow = true
  g.add(platform)
  const dockingRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.08, 20, 56),
    new THREE.MeshStandardMaterial({ color: 0x4dd0e1, emissive: 0x26c6da, emissiveIntensity: 1.05, roughness: 0.2, metalness: 0.5 })
  )
  dockingRing.rotation.x = Math.PI / 2
  dockingRing.position.y = 0.12
  g.add(dockingRing)
  const centerPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.9, 0.06, 48),
    new THREE.MeshStandardMaterial({ color: 0x1f2a33, roughness: 0.4, metalness: 0.45 })
  )
  centerPad.position.y = 0.08
  g.add(centerPad)
  chargingSurfaceMat = new THREE.MeshStandardMaterial({ color: 0x4de5ff, emissive: 0x26c6da, emissiveIntensity: 0.8, roughness: 0.1 })
  const centerGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.7, 0.02, 40),
    chargingSurfaceMat
  )
  centerGlow.position.y = 0.12
  g.add(centerGlow)

  // Rear power cabinet (bigger)
  const powerBody = new THREE.Mesh(new RoundedBoxGeometry(1.0, 2.4, 0.6, 5, 0.06), alloyMat)
  powerBody.position.set(0, 1.2, -1.45)
  powerBody.castShadow = true
  g.add(powerBody)
  const servicePanel = new THREE.Mesh(new RoundedBoxGeometry(0.85, 1.5, 0.04, 4, 0.02), panelMat)
  servicePanel.position.set(0, 1.25, -1.13)
  g.add(servicePanel)

  // Status display
  const statusBar = new THREE.Mesh(
    new RoundedBoxGeometry(0.6, 0.15, 0.015, 3, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x69f0ae, emissive: 0x69f0ae, emissiveIntensity: 2.1, roughness: 0.08 })
  )
  statusBar.position.set(0, 1.85, -1.1)
  g.add(statusBar)
  const statusStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.03, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x4dd0e1, emissive: 0x4dd0e1, emissiveIntensity: 1.4, roughness: 0.1 })
  )
  statusStripe.position.set(0, 2.2, -1.3)
  g.add(statusStripe)

  // Gantry frame (bigger)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x5f6f82, roughness: 0.34, metalness: 0.66 })
  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.8, 0.22), frameMat)
  frameLeft.position.set(-1.5, 1.4, -0.1); g.add(frameLeft)
  const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.8, 0.22), frameMat)
  frameRight.position.set(1.5, 1.4, -0.1); g.add(frameRight)
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.18, 0.24), frameMat)
  frameTop.position.set(0, 2.78, -0.1); g.add(frameTop)

  // Cable reel + connector dock
  const reel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.06, 16, 32),
    new THREE.MeshStandardMaterial({ color: 0x20252d, roughness: 0.72, metalness: 0.45 }))
  reel.position.set(0.65, 0.9, -1.25); reel.rotation.y = Math.PI / 2
  g.add(reel)
  const dockNozzle = new THREE.Mesh(
    new RoundedBoxGeometry(0.15, 0.22, 0.11, 3, 0.015),
    new THREE.MeshStandardMaterial({ color: 0x25303c, roughness: 0.28, metalness: 0.65 })
  )
  dockNozzle.position.set(0.82, 0.5, -1.2)
  g.add(dockNozzle)
  chargingCableAnchor = new THREE.Object3D()
  chargingCableAnchor.position.set(0.82, 0.5, -1.05)
  g.add(chargingCableAnchor)

  // Overhead canopy (bigger)
  const canopy = new THREE.Mesh(
    new RoundedBoxGeometry(3.8, 0.14, 4.2, 5, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x3b4a5e, roughness: 0.25, metalness: 0.72 })
  )
  canopy.position.y = 3.0
  g.add(canopy)
  const canopyLed = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.03, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x7bdff2, emissive: 0x7bdff2, emissiveIntensity: 1.65, roughness: 0.08 })
  )
  canopyLed.position.set(0, 2.93, 2.04)
  g.add(canopyLed)
  const canopyLedBack = canopyLed.clone()
  canopyLedBack.position.z = -2.04
  g.add(canopyLedBack)

  // ── Icon sprite (above text) — large & glowing ──
  const iconCanvas = document.createElement('canvas')
  iconCanvas.width = 256; iconCanvas.height = 256
  const ictx = iconCanvas.getContext('2d')!
  // Outer glow circle
  const grad = ictx.createRadialGradient(128, 128, 30, 128, 128, 120)
  grad.addColorStop(0, 'rgba(255, 213, 79, 0.5)')
  grad.addColorStop(1, 'rgba(255, 213, 79, 0)')
  ictx.fillStyle = grad
  ictx.fillRect(0, 0, 256, 256)
  // Lightning bolt
  ictx.shadowColor = '#ffd54f'
  ictx.shadowBlur = 40
  ictx.font = 'bold 160px Arial'
  ictx.textAlign = 'center'
  ictx.textBaseline = 'middle'
  ictx.fillStyle = '#ffe082'
  ictx.fillText('\u26A1', 128, 128)
  ictx.shadowBlur = 0
  const iconTex = new THREE.CanvasTexture(iconCanvas)
  iconTex.minFilter = THREE.LinearFilter
  const iconSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: iconTex, transparent: true, depthTest: false })
  )
  iconSprite.scale.set(2.5, 2.5, 1)
  iconSprite.position.set(0, 5.8, 0)
  iconSprite.renderOrder = 999
  g.add(iconSprite)

  // ── "ŞARJ İSTASYONU" text sprite — bold & prominent ──
  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 1024; labelCanvas.height = 128
  const ctx = labelCanvas.getContext('2d')!
  // Background — brighter, more visible
  ctx.fillStyle = 'rgba(0, 40, 60, 0.75)'
  ctx.roundRect(12, 8, 1000, 112, 18)
  ctx.fill()
  ctx.strokeStyle = 'rgba(100, 255, 230, 0.8)'
  ctx.lineWidth = 4
  ctx.roundRect(12, 8, 1000, 112, 18)
  ctx.stroke()
  // Text — very large, bright white with strong glow
  ctx.shadowColor = '#00ffcc'
  ctx.shadowBlur = 30
  ctx.font = 'bold 72px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('ŞARJ İSTASYONU', 512, 64)
  // Second pass for extra brightness
  ctx.shadowBlur = 10
  ctx.fillText('ŞARJ İSTASYONU', 512, 64)
  ctx.shadowBlur = 0
  const labelTex = new THREE.CanvasTexture(labelCanvas)
  labelTex.minFilter = THREE.LinearFilter
  const labelSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false })
  )
  labelSprite.scale.set(5.5, 0.7, 1)
  labelSprite.position.set(0, 4.5, 0)
  labelSprite.renderOrder = 999
  g.add(labelSprite)

  // Local lighting (adjusted for bigger size)
  const spotDown = new THREE.SpotLight(0x7de9ff, 2.5, 8.0, Math.PI / 4.5, 0.45)
  spotDown.position.set(0, 2.9, 0.1)
  spotDown.target.position.set(0, 0, 0.05)
  g.add(spotDown)
  g.add(spotDown.target)
  g.add(new THREE.PointLight(0x69f0ae, 1.2, 9).translateY(0.6))
  chargingAmbientGlowMat = new THREE.MeshBasicMaterial({ color: 0x7de9ff, transparent: true, opacity: 0.06 })
  const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 18), chargingAmbientGlowMat)
  glowSphere.position.y = 0.6
  g.add(glowSphere)

  if (chargingCableLine) scene.remove(chargingCableLine)
  const cablePoints = Array.from({ length: 14 }, () => new THREE.Vector3(pos.x, 0.3, pos.y))
  const cableGeometry = new THREE.BufferGeometry().setFromPoints(cablePoints)
  chargingCableLine = new THREE.Line(
    cableGeometry,
    new THREE.LineBasicMaterial({ color: 0x00e6b8, transparent: true, opacity: 0.9, linewidth: 2 })
  )
  chargingCableLine.visible = false
  chargingCableLine.frustumCulled = false
  scene.add(chargingCableLine)
  // Glow cable (slightly wider offset for glow effect)
  const glowCableGeom = new THREE.BufferGeometry().setFromPoints(cablePoints.map(p => p.clone()))
  const glowCable = new THREE.Line(glowCableGeom, new THREE.LineBasicMaterial({ color: 0x00e6b8, transparent: true, opacity: 0.3 }))
  glowCable.visible = false
  glowCable.frustumCulled = false
  chargingCableLine.userData.glowLine = glowCable
  scene.add(glowCable)

  g.rotation.y = Math.PI
  g.position.set(pos.x, 0, pos.y); scene.add(g); return g
}

// ═══════════════════════════════════════════
// DOOR — Rolling shutter with clipping
// ═══════════════════════════════════════════
function createDoor(): THREE.Group {
  const doorGroup = new THREE.Group()
  doorPanels = []; doorLines = []
  const doorCX = (GRID_W - 1) / 2  // true geometric center between walls
  const doorW = GRID_W + 0.6       // flush with wall inner faces
  const numPanels = Math.ceil(WALL_H / DOOR_PANEL_H)

  // Industrial sectional door — alternating panel colors for depth
  const panelColorA = 0x78909c
  const panelColorB = 0x6b7d8a
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0x455a64, roughness: 0.4, metalness: 0.7,
    clippingPlanes: [doorClipPlane], clipShadows: true
  })

  // Top 3 panels get frosted window inserts
  const windowThreshold = numPanels - 3

  for (let i = 0; i < numPanels; i++) {
    const panelColor = i % 2 === 0 ? panelColorA : panelColorB
    const panelMat = new THREE.MeshStandardMaterial({
      color: panelColor, roughness: 0.45, metalness: 0.5,
      clippingPlanes: [doorClipPlane], clipShadows: true
    })
    const p = new THREE.Mesh(new RoundedBoxGeometry(doorW, DOOR_PANEL_H - 0.01, 0.08, 2, 0.01), panelMat)
    p.position.set(doorCX, DOOR_PANEL_H / 2 + i * DOOR_PANEL_H, DOOR_Z)
    p.castShadow = true; doorGroup.add(p); doorPanels.push(p)

    // Panel divider lines
    const l = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.012, 0.09), lineMat)
    l.position.set(doorCX, i * DOOR_PANEL_H + DOOR_PANEL_H, DOOR_Z)
    doorGroup.add(l); doorLines.push(l)

    // Frosted window inserts on top panels
    if (i >= windowThreshold) {
      const windowMat = new THREE.MeshStandardMaterial({
        color: 0xb3e5fc, emissive: 0x80deea, emissiveIntensity: 0.15,
        roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.7,
        clippingPlanes: [doorClipPlane], clipShadows: true
      })
      // 4 window panes per panel
      for (let w = 0; w < 4; w++) {
        const wx = doorCX - doorW * 0.35 + w * (doorW * 0.7 / 3)
        const win = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.15, DOOR_PANEL_H * 0.6, 0.01), windowMat)
        win.position.set(wx, DOOR_PANEL_H / 2 + i * DOOR_PANEL_H, DOOR_Z + 0.045)
        doorGroup.add(win)
      }
    }

    // Embossed rectangle detail on lower panels (industrial look)
    if (i < windowThreshold && i > 0) {
      const embossMat = new THREE.MeshStandardMaterial({
        color: panelColor, roughness: 0.55, metalness: 0.45,
        clippingPlanes: [doorClipPlane], clipShadows: true
      })
      const embossL = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.42, DOOR_PANEL_H * 0.55, 0.005), embossMat)
      embossL.position.set(doorCX - doorW * 0.26, DOOR_PANEL_H / 2 + i * DOOR_PANEL_H, DOOR_Z + 0.042)
      doorGroup.add(embossL)
      const embossR = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.42, DOOR_PANEL_H * 0.55, 0.005), embossMat)
      embossR.position.set(doorCX + doorW * 0.26, DOOR_PANEL_H / 2 + i * DOOR_PANEL_H, DOOR_Z + 0.042)
      doorGroup.add(embossR)
    }
  }

  // Side rails / tracks
  const railMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.3, metalness: 0.8 })
  for (const rx of [doorCX - doorW / 2 - 0.06, doorCX + doorW / 2 + 0.06]) {
    // Vertical track
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, WALL_H + 0.1, 0.10), railMat)
    rail.position.set(rx, WALL_H / 2, DOOR_Z)
    doorGroup.add(rail)
    // Track brackets
    for (let b = 0; b < 4; b++) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.04), railMat)
      bracket.position.set(rx, 0.4 + b * 0.7, DOOR_Z - 0.06)
      doorGroup.add(bracket)
    }
  }

  // Handle — larger, more industrial
  doorHandle = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.38, 0.14, 2, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x263238, roughness: 0.25, metalness: 0.85,
      clippingPlanes: [doorClipPlane], clipShadows: true
    }))
  doorHandle.position.set(doorCX - doorW * 0.33, 0.9, DOOR_Z + 0.1); doorGroup.add(doorHandle)
  // Handle grip bar
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.3, metalness: 0.8,
      clippingPlanes: [doorClipPlane], clipShadows: true }))
  grip.position.set(doorCX - doorW * 0.33, 0.95, DOOR_Z + 0.14); doorGroup.add(grip)

  // Bottom weather seal (rubber strip)
  const sealMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.0 })
  const seal = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.1, 0.03, 0.12), sealMat)
  seal.position.set(doorCX, 0.015, DOOR_Z)
  doorGroup.add(seal)

  scene.add(doorGroup); return doorGroup
}

// ═══════════════════════════════════════════
// DOOR ANIMATION — rolling shutter with masking
// ═══════════════════════════════════════════
function animateDoorOpening() {
  const animationVersion = ++doorAnimationVersion
  soundManager.playDoorOpen()
  ui.showToast('Kapı açılıyor! 🚪', 'success')

  const duration = 2500, startTime = Date.now(), totalHeight = WALL_H + 0.5
  const originalY = doorPanels.map(p => p.position.y)
  const originalLineY = doorLines.map(l => l.position.y)
  const handleOrigY = doorHandle.position.y

  const buttonOrigY = buttonMesh ? buttonMesh.position.y : 0

  // Sunlight from outside
  if (doorSunLight) scene.remove(doorSunLight)
  doorSunLight = new THREE.DirectionalLight(0xfff4e0, 0)
  doorSunLight.position.set(GRID_CENTER_X + 2.5, 9, DOOR_ROW + 15); scene.add(doorSunLight)

  // Glow plane
  if (doorGlowPlane) scene.remove(doorGlowPlane)
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff8e1, transparent: true, opacity: 0, side: THREE.DoubleSide })
  doorGlowPlane = new THREE.Mesh(new THREE.PlaneGeometry(GRID_W + 0.6, WALL_H), glowMat)
  doorGlowPlane.position.set((GRID_W - 1) / 2, WALL_H / 2, DOOR_ROW + 0.1); scene.add(doorGlowPlane)

  // Volumetric SpotLights — fan-shaped light beams flooding into garage
  doorVolumetricLights.forEach(l => scene.remove(l))
  doorVolumetricLights = []
  const spotAngles = [-0.6, 0, 0.6] // fan spread angles
  const spotColors = [0xfff4e0, 0xfffbe6, 0xfff4e0]
  spotAngles.forEach((angle, idx) => {
    const spot = new THREE.SpotLight(spotColors[idx], 0, 12, Math.PI / 6, 0.6, 1.5)
    spot.position.set(GRID_CENTER_X + Math.sin(angle) * 2, WALL_H * 0.7, DOOR_ROW + 1)
    const targetObj = new THREE.Object3D()
    targetObj.position.set(GRID_CENTER_X + Math.sin(angle) * 4, 0, DOOR_ROW - 5)
    scene.add(targetObj)
    spot.target = targetObj
    scene.add(spot)
    doorVolumetricLights.push(spot)
  })

  // Floor light strips — light beams on the floor from the doorway
  doorFloorStrips.forEach(s => scene.remove(s))
  doorFloorStrips = []
  const stripPositions = [-2.0, -0.7, 0.7, 2.0]
  stripPositions.forEach(offsetX => {
    const stripMat = new THREE.MeshBasicMaterial({
      color: 0xfff8d6, transparent: true, opacity: 0, side: THREE.DoubleSide
    })
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), stripMat)
    strip.rotation.x = -Math.PI / 2
    strip.position.set(GRID_CENTER_X + offsetX, 0.02, DOOR_ROW - 2.5)
    scene.add(strip)
    doorFloorStrips.push(strip)
  })

  // Door dust removed — user found them visually distracting

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

    if (buttonMesh) {
      buttonMesh.position.y = buttonOrigY - (ease * 0.25)
    }

    // Sunlight / glow increases then glow fades
    if (doorSunLight) doorSunLight.intensity = ease * 2.2
    if (t < 0.8) glowMat.opacity = ease * 0.3
    else glowMat.opacity = 0.3 * (1 - (t - 0.8) / 0.2)

    // Volumetric SpotLights fade in
    doorVolumetricLights.forEach(spot => { spot.intensity = ease * 3.5 })

    // Floor light strips fade in, then gently fade as door fully opens
    doorFloorStrips.forEach(strip => {
      const mat = strip.material as THREE.MeshBasicMaterial
      if (t < 0.7) mat.opacity = ease * 0.35
      else mat.opacity = 0.35 * (1 - (t - 0.7) / 0.3)
    })

    // LED strip: red → green transition
    if (doorFrameLedMat) {
      const r = THREE.MathUtils.lerp(1.0, 0.0, ease)
      const g = THREE.MathUtils.lerp(0.0, 1.0, ease)
      doorFrameLedMat.color.setRGB(r, g, 0)
      doorFrameLedMat.emissive.setRGB(r, g, 0)
    }
    // Photo sensor laser: visible briefly then off
    if (photoSensorLaser) photoSensorLaser.visible = ease < 0.1

    renderer.toneMappingExposure = BASE_EXPOSURE + ease * DOOR_OPEN_EXPOSURE_BOOST
    if (skyLight) skyLight.intensity = ease * 0.95

    if (t < 1) requestAnimationFrame(animate)
    else {
      if (doorGlowPlane) { scene.remove(doorGlowPlane); doorGlowPlane = null }
      // Hide entire door group so no remnants look like an awning
      if (doorMeshGroup) doorMeshGroup.visible = false
      // Clean up floor strips
      doorFloorStrips.forEach(s => scene.remove(s))
      doorFloorStrips = []
      // Keep volumetric lights but reduce intensity for ambient outdoor feel
      doorVolumetricLights.forEach(spot => { spot.intensity = 1.8 })

      // Make door row AND outdoor path walkable
      for (let x = 0; x < GRID_W; x++) {
        for (let y = DOOR_ROW; y <= CHARGE_POS.y; y++) {
          grid.setWalkable({ x, y }, true)
        }
      }

      gameState = GameState.DOOR_OPENED

      // Cinematic camera: zoom to show outside (raised higher to avoid buildings)
      animateCameraTo({ x: GRID_CENTER_X + 3, y: 9, z: DOOR_ROW + 8 }, { x: GRID_CENTER_X, y: 1, z: DOOR_ROW + 2 }, 1500, () => {
        ui.updateMission(2, 'Şarj İstasyonu', 'Robotu dışarıdaki yeşil şarj alanına götür ve şarj et.')
        ui.showToast('Yeni görev: Şarj istasyonuna ulaş! ⚡', 'info')
        const pose = getPrimaryCameraPose()
        setTimeout(() => animateCameraTo(pose.pos, pose.target, 1200), 1500)
      })
    }
  }
  animate()
}

function resetDoorVisualState() {
  doorAnimationVersion++

  if (doorGlowPlane) { scene.remove(doorGlowPlane); doorGlowPlane = null }
  if (doorSunLight) { scene.remove(doorSunLight); doorSunLight = null }
  doorVolumetricLights.forEach(l => { if (l.target) scene.remove(l.target); scene.remove(l) })
  doorVolumetricLights = []
  doorFloorStrips.forEach(s => scene.remove(s))
  doorFloorStrips = []
  if (doorDustInterval) { clearInterval(doorDustInterval); doorDustInterval = null }

  if (doorMeshGroup) doorMeshGroup.visible = true
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

  if (buttonMesh) {
    buttonMesh.position.y = 0
  }

  // Reset door mechanism visuals
  if (doorFrameLedMat) {
    doorFrameLedMat.color.setRGB(1, 0, 0)
    doorFrameLedMat.emissive.setRGB(1, 0, 0)
  }
  if (photoSensorLaser) photoSensorLaser.visible = true

  renderer.toneMappingExposure = BASE_EXPOSURE
  if (skyLight) skyLight.intensity = 0
}

function resetSimulationState() {
  executor.stop()
  battery.stopCharging()
  setChargingCableConnected(false)
  isChargingActive = false
  chargePulseUntil = 0
  isExecuting = false
  // Remove mission complete overlay if still showing
  const mcOverlay = document.getElementById('mission-complete-overlay')
  if (mcOverlay) mcOverlay.remove()

  ui.hideSuccess()
  ui.hideFailure()
  blocklyMgr.clearHighlight()

  robot = new Robot(ROBOT_START, Direction.NORTH)
  battery = new BatterySystem(INITIAL_BATTERY_LEVEL)
  executor = new ProgramExecutor(DEFAULT_EXECUTION_SPEED)
  grid = new Grid(GRID_W, GRID_H)

  door = new GarageDoor()
  button = new Button(() => { door.interact() })
  if (buttonMesh) scene.remove(buttonMesh)
  buttonMesh = createButton3D(BUTTON_POS)
  chargingPad = new ChargingPad(battery)
  grid.placeInteractable(BUTTON_POS, button)
  grid.placeInteractable(CHARGE_POS, chargingPad)
  // Door row & outdoor rows NOT walkable until door is opened
  for (let x = 0; x < GRID_W; x++) {
    for (let y = DOOR_ROW; y <= CHARGE_POS.y; y++) {
      grid.setWalkable({ x, y }, false)
    }
  }

  resetDoorVisualState()

  blinkTimer = 0
  blinkProgress = 0
  nextBlinkAt = 1.8 + Math.random() * 2.8
  isBlinking = false
  robotEyeMeshes.forEach((eye) => { eye.scale.y = 1 })

  gameState = GameState.READY
  updateRobotPosition()
  ui.updateBatteryUI(INITIAL_BATTERY_LEVEL)
  updateRobotChargeIndicator(INITIAL_BATTERY_LEVEL)
  ui.updatePositionDisplay(robot)
  ui.updateStatus('Hazır', 'ready')
  ui.updateMission(1, 'Tarayıcıya Ulaş', 'Robotu duvardaki mavi tarayıcı paneline kadar sür ve butona basarak kapıyı aç.')
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
  const tx = pos.x, tz = pos.y, tr = dir * Math.PI / 180
  const sx = robotMesh.position.x, sz = robotMesh.position.z, sr = robotMesh.rotation.y
  const isMoving = Math.abs(tx - sx) > 0.01 || Math.abs(tz - sz) > 0.01
  const isTurning = !isMoving
  const st = Date.now(), dur = 400

  // Emit dust when moving
  if (isMoving && particles) {
    particles.emitMoveDust(new THREE.Vector3(sx, 0, sz))
  }

  const a = () => {
    const t = Math.min((Date.now() - st) / dur, 1)
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    robotMesh.position.x = sx + (tx - sx) * e; robotMesh.position.z = sz + (tz - sz) * e
    let dr = tr - sr; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2
    robotMesh.rotation.y = sr + dr * e
    wheelMeshes.forEach(w => { w.rotation.x += t * 3.5 })

    // Gentle tilt during movement, wobble during turn
    if (isMoving) {
      robotMesh.rotation.x = Math.sin(t * Math.PI) * 0.03
    } else if (isTurning) {
      robotMesh.rotation.z = Math.sin(t * Math.PI * 2) * 0.05 * (1 - t)
    }

    if (t < 1) requestAnimationFrame(a)
    else {
      robotMesh.position.x = tx; robotMesh.position.z = tz; robotMesh.rotation.y = tr
      robotMesh.position.y = 0; robotMesh.rotation.x = 0; robotMesh.rotation.z = 0
    }
  }; a()
  ui.updatePositionDisplay(robot)
}

function isRobotOnChargingPad(): boolean {
  const pos = robot.getPosition()
  return pos.x === CHARGE_POS.x && pos.y === CHARGE_POS.y
}

function setChargingCableConnected(connected: boolean) {
  isCableConnected = connected
  if (connected) cableConnectStart = performance.now()
  if (chargingCableLine) {
    chargingCableLine.visible = connected
    const glow = chargingCableLine.userData.glowLine as THREE.Line | undefined
    if (glow) glow.visible = connected
  }
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
  // Update glow line too
  const glow = chargingCableLine.userData.glowLine as THREE.Line | undefined
  if (glow) {
    const glowPoints = points.map(p => p.clone().add(new THREE.Vector3(0, 0.02, 0)))
    ;(glow.geometry as THREE.BufferGeometry).setFromPoints(glowPoints)
  }
}

function updateChargingCable() {
  if (!chargingCableLine || !chargingCableAnchor || !robotChargePort) return
  if (!isCableConnected) {
    chargingCableLine.visible = false
    const gl = chargingCableLine.userData.glowLine as THREE.Line | undefined
    if (gl) gl.visible = false
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
  const glowL = chargingCableLine.userData.glowLine as THREE.Line | undefined
  if (glowL) {
    glowL.visible = true
    // Pulse glow opacity during active charging
    const glowMat = glowL.material as THREE.LineBasicMaterial
    glowMat.opacity = isChargingActive ? 0.3 + Math.sin(performance.now() * 0.008) * 0.2 : 0.15
  }
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

  // Floating bar above robot (wider bar)
  if (robotFloatingBar) {
    const barMat = robotFloatingBar.material as THREE.MeshBasicMaterial
    const t = Math.max(0.02, pct / 100)
    robotFloatingBar.scale.x = t
    robotFloatingBar.position.x = -0.57 * (1 - t)
    barMat.color.setHex(color)
  }

  // Percentage text (bigger canvas)
  if (robotFloatingPctCanvas && robotFloatingPctTexture) {
    const ctx = robotFloatingPctCanvas.getContext('2d')!
    ctx.clearRect(0, 0, 256, 96)
    ctx.shadowColor = '#00ffcc'
    ctx.shadowBlur = 8
    ctx.font = 'bold 56px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`${Math.round(pct)}%`, 128, 48)
    ctx.shadowBlur = 0
    robotFloatingPctTexture.needsUpdate = true
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
  const isTransparent = roofFade < 0.99
  garageRoofMaterials.forEach((mat) => {
    if (mat.transparent !== isTransparent) {
      mat.transparent = isTransparent
      mat.needsUpdate = true
    }
    if (mat.opacity !== roofFade) mat.opacity = roofFade
  })
}

let isChargingActive = false

function showMissionCompleteOverlay() {
  // Create a full-screen DOM overlay for "GÖREV TAMAMLANDI"
  const overlay = document.createElement('div')
  overlay.id = 'mission-complete-overlay'
  overlay.innerHTML = `
    <div class="mc-content">
      <div class="mc-icon">&#9889;</div>
      <div class="mc-title">GÖREV TAMAMLANDI!</div>
      <div class="mc-subtitle">Batarya %100 — BIG-BOT hazır!</div>
    </div>
  `
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
    animation: mc-fade-in 0.5s ease-out forwards;
  `
  const style = document.createElement('style')
  style.textContent = `
    @keyframes mc-fade-in { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
    @keyframes mc-fade-out { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.1); } }
    @keyframes mc-glow-pulse { 0%,100% { text-shadow: 0 0 20px rgba(0,230,184,0.6), 0 0 40px rgba(0,230,184,0.3); } 50% { text-shadow: 0 0 40px rgba(0,230,184,0.9), 0 0 80px rgba(0,230,184,0.5); } }
    @keyframes mc-icon-bounce { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }
    .mc-content {
      text-align: center;
      background: radial-gradient(ellipse at center, rgba(0,30,40,0.85) 0%, rgba(0,10,20,0.7) 70%, transparent 100%);
      padding: 40px 80px; border-radius: 20px;
      border: 2px solid rgba(0,230,184,0.4);
    }
    .mc-icon { font-size: 64px; margin-bottom: 12px; animation: mc-icon-bounce 0.8s ease-in-out infinite; }
    .mc-title {
      font-family: 'Inter', Arial, sans-serif; font-size: 42px; font-weight: 900;
      color: #00e6b8; letter-spacing: 4px;
      animation: mc-glow-pulse 1.5s ease-in-out infinite;
    }
    .mc-subtitle {
      font-family: 'Inter', Arial, sans-serif; font-size: 18px; color: #b0bec5;
      margin-top: 10px; letter-spacing: 2px;
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(overlay)

  // Auto-remove after 3.5 seconds
  setTimeout(() => {
    overlay.style.animation = 'mc-fade-out 0.6s ease-in forwards'
    setTimeout(() => {
      overlay.remove()
      style.remove()
    }, 600)
  }, 3500)
}

function playChargingAnimation() {
  soundManager.playCharging()
  setChargingCableConnected(true)
  isChargingActive = true
  chargePulseUntil = performance.now() + 3700
  // Robot eyes go happy during charging
  EventBus.emit('robot:expression', EyeExpression.HAPPY)

  // Camera: smoothly animate to a close-up view of the robot charging
  const rp = robotMesh.position
  animateCameraTo(
    { x: rp.x + 3, y: rp.y + 3.5, z: rp.z + 4 },
    { x: rp.x, y: rp.y + 0.5, z: rp.z },
    1200
  )

  const mat = chargingSurfaceMat
  if (!mat) return
  const st = Date.now()
  const dur = 3500
  const pulse = () => {
    const t = (Date.now() - st) / dur
    if (t > 1) { mat.emissiveIntensity = 0.6; isChargingActive = false; return }
    // Intensifying pulse: starts slow, gets faster as charge fills
    const freq = 4 + t * 12
    mat.emissiveIntensity = 0.6 + Math.sin(t * Math.PI * freq) * (0.4 + t * 0.6)
    requestAnimationFrame(pulse)
  }; pulse()
}

// ═══════════════════════════════════════════
// GAME INIT
// ═══════════════════════════════════════════
function initGame() {
  grid = new Grid(GRID_W, GRID_H)
  robot = new Robot(ROBOT_START, Direction.NORTH)
  battery = new BatterySystem(INITIAL_BATTERY_LEVEL)
  executor = new ProgramExecutor(DEFAULT_EXECUTION_SPEED)

  robotMesh = createRobot(robot.getPosition())
  buttonMesh = createButton3D(BUTTON_POS)
  chargePadMesh = createChargingStation(CHARGE_POS)
  doorMeshGroup = createDoor()
  const env = createOutdoorScene(scene, { GRID_W, GRID_H, DOOR_ROW, GRID_CENTER_X })
  skyLight = env.skyLight
  envAnimatedObjects = env.animatedObjects

  // Apply initial theme
  const initialTheme = (localStorage.getItem('bigbot-theme') as 'light' | 'dark') || 'dark'
  applyThemeToEnvironment(scene, initialTheme)

  window.addEventListener('theme-changed', ((e: CustomEvent<{ theme: 'light' | 'dark' }>) => {
    applyThemeToEnvironment(scene, e.detail.theme)
  }) as EventListener)

  button = new Button(() => { door.interact() })
  door = new GarageDoor()
  chargingPad = new ChargingPad(battery)

  grid.placeInteractable(BUTTON_POS, button)
  grid.placeInteractable(CHARGE_POS, chargingPad)

  // Door row & outdoor rows NOT walkable until door is opened
  for (let x = 0; x < GRID_W; x++) {
    for (let y = DOOR_ROW; y <= CHARGE_POS.y; y++) {
      grid.setWalkable({ x, y }, false)
    }
  }

  // Events
  EventBus.on('battery:updated', (l: number) => { ui.updateBatteryUI(l); updateRobotChargeIndicator(l) })
  EventBus.on('battery:critical', () => ui.showToast('⚠️ Batarya kritik!', 'warning'))
  EventBus.on('door:opening', () => {
    animateDoorOpening()
    logPanel.addEntry('event', 'Garaj kapısı açılıyor')
  })
  EventBus.on('button:pressed', () => {
    soundManager.playButtonPress()
    logPanel.addEntry('command', 'Butona basıldı')
  })
  EventBus.on('robot:on_charging_pad', () => {
    playChargingAnimation()
    if (particles) particles.emitChargeSparks(new THREE.Vector3(CHARGE_POS.x, 0.3, CHARGE_POS.y), 25)
    logPanel.addEntry('event', 'Şarj istasyonuna bağlandı')
  })

  EventBus.on('robot:moved', () => {
    updateRobotPosition()
    ui.updatePositionDisplay(robot)
    if (!isRobotOnChargingPad()) setChargingCableConnected(false)
    const p = robot.getPosition()
    logPanel.addEntry('command', `Hareket → (${p.x}, ${p.y})`)
  })
  EventBus.on('command:highlight', (index: number) => blocklyMgr.highlightByIndex(index))
  EventBus.on('command:executed', (data: { type: string, index: number }) => {
    switch (data.type) {
      case 'MOVE_FORWARD': case 'MOVE_BACKWARD': soundManager.playMove(); break
      case 'TURN_LEFT': case 'TURN_RIGHT': soundManager.playTurn(); break
      case 'CHARGE': soundManager.playCharging(); break
    }
    ui.showToast(`⚡ Enerji kullanıldı (${data.type})`, 'info')
  })

  EventBus.on('battery:dead', () => {
    setChargingCableConnected(false)
    isChargingActive = false
    chargePulseUntil = 0
    isExecuting = false; gameState = GameState.FAILED
    blocklyMgr.clearHighlight()
    ui.showFailure('BIG-BOT\'un bataryası bitti! Daha verimli bir rota dene.')
    logPanel.addEntry('error', 'Batarya bitti! Görev başarısız.')
  })

  EventBus.on('battery:full', () => {
    setChargingCableConnected(false)
    isChargingActive = false
    chargePulseUntil = 0
    ui.updateBatteryUI(100)
    gameState = GameState.COMPLETE
    blocklyMgr.clearHighlight()

    // Show "GÖREV TAMAMLANDI" floating text above robot
    showMissionCompleteOverlay()

    // Celebration: jump, happy expression, spin, confetti
    EventBus.emit('robot:expression', EyeExpression.HAPPY)
    if (particles) {
      particles.emitConfetti(robotMesh.position.clone(), 60)
      particles.emitChargeSparks(robotMesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 40)
    }
    logPanel.addEntry('success', 'Batarya %100 dolu! Görev tamamlandı!')
    const jumpDur = 1200;
    const startY = robotMesh.position.y;
    const startRot = robotMesh.rotation.y;
    const startTime = Date.now();
    const jumpAnim = () => {
      const t = Math.min((Date.now() - startTime) / jumpDur, 1);
      const jumpH = Math.sin(t * Math.PI) * 1.5;
      robotMesh.position.y = startY + jumpH;
      robotMesh.rotation.y = startRot + t * Math.PI * 4;
      if (t < 1) requestAnimationFrame(jumpAnim);
      else {
        robotMesh.position.y = startY;
        robotMesh.rotation.y = startRot;
      }
    };
    jumpAnim();

    // Burst confetti again mid-jump
    setTimeout(() => {
      if (particles) particles.emitConfetti(robotMesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 40)
    }, 600)

    setTimeout(() => {
      ui.showSuccess('GÖREV TAMAMLANDI! ŞEHİR SENİ BEKLİYOR!', executor.getCommands().length, 100)
    }, 1400)
  })

  EventBus.on('program:stopped', () => {
    isExecuting = false
    blocklyMgr.clearHighlight()
    if (!isRobotOnChargingPad()) setChargingCableConnected(false)
    ui.updateStatus('Durduruldu', 'ready')
  })
  EventBus.on('program:complete', () => {
    isExecuting = false; blocklyMgr.clearHighlight(); ui.updateStatus('Tamamlandı', 'ready')
    // Check mission win condition
    if (gameState !== GameState.COMPLETE && gameState !== GameState.FAILED) {
      if (missionMgr.checkWinCondition(robot, grid, battery)) {
        const score = missionMgr.completeCurrentMission(executor.getCommands().length, battery.getCurrentLevel())
        gameState = GameState.COMPLETE
        const starsStr = '⭐'.repeat(score.stars) + '☆'.repeat(3 - score.stars)
        const starsEl = document.getElementById('success-stars')
        if (starsEl) starsEl.textContent = starsStr
        ui.showSuccess(`Görev tamamlandı! ${starsStr}`, score.commandsUsed, score.batteryRemaining)
        updateMissionStarsDisplay()
        if (particles) {
          particles.emitConfetti(robotMesh.position.clone(), 50)
          // Floating star-like sparks above robot
          particles.emitChargeSparks(robotMesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 30)
        }
        logPanel.addEntry('success', `Görev tamamlandı! ${starsStr}`)
      }
    }
  })
  EventBus.on('command:error', (d: { index: number, message: string }) => {
    blocklyMgr.highlightError(d.index)
    const msg = getFullErrorMessage(d.message) || d.message
    ui.showToast(`Komut ${d.index + 1}: ${msg}`, 'error'); ui.updateStatus('Hata!', 'error')
    logPanel.addEntry('error', `Komut ${d.index + 1}: ${msg}`)
    // Robot bounce-back on wall collision
    if (robotMesh) {
      const origX = robotMesh.position.x, origZ = robotMesh.position.z
      const dir = robot.getDirection()
      const bx = dir === 0 ? 0 : dir === 180 ? 0 : dir === 90 ? 0.15 : -0.15
      const bz = dir === 0 ? -0.15 : dir === 180 ? 0.15 : 0
      const bStart = Date.now()
      const bounce = () => {
        const t = Math.min((Date.now() - bStart) / 300, 1)
        const bump = Math.sin(t * Math.PI) * (1 - t)
        robotMesh.position.x = origX + bx * bump
        robotMesh.position.z = origZ + bz * bump
        if (t < 1) requestAnimationFrame(bounce)
        else { robotMesh.position.x = origX; robotMesh.position.z = origZ }
      }; bounce()
    }
  })

  EventBus.on('robot:expression', (expr: string) => {
    if (gameState === GameState.INTRO) return;

    robotEyeMeshes.forEach(eye => {
      eye.scale.set(1, 1, 1);
      eye.position.y = 0.46;
    });

    if (expr === 'HAPPY') {
      robotEyeMeshes.forEach(eye => { eye.scale.set(1.4, 0.35, 1); });
    } else if (expr === 'WORRIED') {
      robotEyeMeshes.forEach(eye => { eye.scale.set(0.8, 1.2, 1); eye.position.y = 0.49; });
    } else if (expr === 'EXCITED') {
      robotEyeMeshes.forEach(eye => { eye.scale.set(1.5, 1.5, 1); });
    }
  })

  blinkTimer = 0
  blinkProgress = 0
  nextBlinkAt = 1.8 + Math.random() * 2.8
  isBlinking = false
  updateRobotChargeIndicator(INITIAL_BATTERY_LEVEL)
  ui.updatePositionDisplay(robot); ui.updateBatteryUI(INITIAL_BATTERY_LEVEL)
  ui.updateMission(1, 'Tarayıcıya Ulaş', 'Robotu duvardaki mavi tarayıcı paneline kadar sür ve butona basarak kapıyı aç.')
}

// ═══════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════
let time = 0
// Pre-allocated temporaries to avoid GC in render loop
const _tmpVec3A = new THREE.Vector3()
const _tmpVec3B = new THREE.Vector3()
function renderLoop() {
  stats.begin()
  requestAnimationFrame(renderLoop); time += 0.016; controls.update()
  updateEyeBlink(0.016)
  updateGarageRoofVisual()
  updateChargingCable()
  if (particles) particles.update(0.016)
  // Fan rotation
  if (ventFanBlade) ventFanBlade.rotation.z += 0.02
  // Ambient dust removed — user found them visually distracting ("baloncuklar")
  // Laser pulse
  if (photoSensorLaserMat) {
    photoSensorLaserMat.opacity = 0.4 + Math.sin(time * 4) * 0.2
  }
  if (robotMesh) {
    // Antenna pulse + wobble (more prominent rhythmic pulse)
    if (antennaBallMat) {
      const heartbeat = Math.pow(Math.sin(time * 2.5) * 0.5 + 0.5, 2)
      antennaBallMat.emissiveIntensity = 1.5 + heartbeat * 3.5
    }
    if (robotAntennaMesh) {
      robotAntennaMesh.rotation.z = Math.sin(time * 2.5) * 0.04
      robotAntennaMesh.rotation.x = Math.cos(time * 1.8) * 0.03
    }
    // Eye tracking — pupils look toward camera + occasional scanning
    if (robotPupils.length === 2 && camera) {
      robotMesh.getWorldPosition(_tmpVec3A)
      const toCam = _tmpVec3B.copy(camera.position).sub(_tmpVec3A).normalize()
      const maxAngle = 0.04
      let targetX = THREE.MathUtils.clamp(toCam.x * maxAngle, -maxAngle, maxAngle)
      let targetY = THREE.MathUtils.clamp(toCam.y * 0.02, -0.02, 0.02)
      // Occasional eye scanning (every 6-8 seconds, smooth random offset)
      const scanCycle = Math.floor(time / 7)
      const scanPhase = (time % 7)
      if (scanPhase > 5.5 && scanPhase < 6.5) {
        const scanOffset = Math.sin(scanCycle * 13.7) * 0.03
        targetX += scanOffset
        targetY += Math.cos(scanCycle * 7.3) * 0.01
      }
      robotPupils[0].position.x = THREE.MathUtils.lerp(robotPupils[0].position.x, -0.16 + targetX, 0.05)
      robotPupils[0].position.y = THREE.MathUtils.lerp(robotPupils[0].position.y, 0.52 + targetY, 0.05)
      robotPupils[1].position.x = THREE.MathUtils.lerp(robotPupils[1].position.x, 0.16 + targetX, 0.05)
      robotPupils[1].position.y = THREE.MathUtils.lerp(robotPupils[1].position.y, 0.52 + targetY, 0.05)
    }
    // Idle bob
    if (!isExecuting) robotMesh.position.y = Math.sin(time * 1.5) * 0.01
    // Billboard floating bar toward camera
    if (robotFloatingBarBg && camera) {
      const barGroup = robotFloatingBarBg.parent
      if (barGroup) {
        barGroup.quaternion.copy(camera.quaternion)
      }
    }
    // Floating bar glow pulse during charging
    if (robotFloatingBar && isChargingActive) {
      const barMat = robotFloatingBar.material as THREE.MeshBasicMaterial
      const pulse = 0.7 + Math.sin(time * 8) * 0.3
      barMat.opacity = pulse
    } else if (robotFloatingBar) {
      (robotFloatingBar.material as THREE.MeshBasicMaterial).opacity = 0.95
    }
  }
  if (robotChargeRingMat) {
    const isCharging = chargePulseUntil > performance.now()
    const pulseBoost = isCharging ? 0.45 + Math.sin(time * 14) * 0.35 : 0
    robotChargeRingMat.emissiveIntensity = robotChargeBaseIntensity + pulseBoost
    // Continuous charge sparks during charging — more frequent & from robot too
    if (isCharging && particles) {
      if (Math.random() < 0.4) particles.emitChargeSparks(new THREE.Vector3(CHARGE_POS.x, 0.4, CHARGE_POS.y), 3)
      if (Math.random() < 0.15 && robotMesh) particles.emitChargeSparks(robotMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 2)
    }
  }
  // Charging pad glow pulse
  if (chargingAmbientGlowMat) {
    const baseGlow = isChargingActive ? 0.12 : 0.06
    const glowAmp = isChargingActive ? 0.08 : 0.04
    chargingAmbientGlowMat.opacity = baseGlow + Math.sin(time * 2) * glowAmp
  }

  // === Animate Sky Objects ===
  if (envAnimatedObjects) {
    envAnimatedObjects.clouds.forEach((cloud, i) => {
      cloud.position.x += 0.004 + i * 0.0005
      if (cloud.position.x > 60) cloud.position.x = -40
    })
    envAnimatedObjects.birds.forEach((flock, i) => {
      flock.position.x += 0.012 + i * 0.002
      flock.position.y = flock.position.y + Math.sin(time * 2.5 + i) * 0.002
      if (flock.position.x > 50) flock.position.x = -30
      flock.children.forEach((child, ci) => {
        if (ci % 3 === 0) child.rotation.z = 0.3 + Math.sin(time * 6 + i + ci) * 0.25
        else if (ci % 3 === 1) child.rotation.z = -(0.3 + Math.sin(time * 6 + i + ci) * 0.25)
      })
    })
    envAnimatedObjects.planes.forEach((plane, i) => {
      plane.position.x += 0.025 + i * 0.01
      plane.position.z += 0.01
      if (plane.position.x > 80) { plane.position.x = -60; plane.position.z = 10 + i * 15 }
    })
  }

  // Camera modes
  if (cameraMode === 'follow' && robotMesh) {
    const rp = robotMesh.position
    _tmpVec3A.set(rp.x - 2, rp.y + 3.5, rp.z - 3)
    camera.position.lerp(_tmpVec3A, 0.05)
    _tmpVec3B.set(rp.x, rp.y + 0.5, rp.z)
    controls.target.lerp(_tmpVec3B, 0.05)
    controls.update()
  } else if (cameraMode === 'cinematic') {
    cinematicAngle += 0.003
    const cx = GRID_CENTER_X + Math.cos(cinematicAngle) * 12
    const cz = 6 + Math.sin(cinematicAngle) * 10
    camera.position.set(cx, 8, cz)
    controls.target.set(GRID_CENTER_X, 1, 6)
    controls.update()
  }

  renderer.render(scene, camera)
  stats.end()
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
  applyGarageMode(garageMode, false, false)

  robotEyeMeshes.forEach(eye => {
    eye.scale.y = 1;
    if (eye.material instanceof THREE.MeshStandardMaterial) eye.material.emissiveIntensity = 2;
  });
  robotEyeLights.forEach(l => l.intensity = 0.4);
  if (robotChargeRingMat) robotChargeRingMat.emissiveIntensity = 0.6;

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
    blocklyMgr.resize()
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
  if (isExecuting) { ui.showToast('Zaten çalışıyor!', 'warning'); return }
  if (gameState === GameState.INTRO) { ui.showToast('Önce göreve başlayın!', 'warning'); return }

  const cmds = executor.getCommands().length
  if (cmds === 0) { ui.showToast('Blok ekleyin!', 'warning'); return }

  if (battery.getCurrentLevel() <= 0) {
    ui.showFailure('Batarya tamamen bitti! Sıfırla ve tekrar dene.')
    gameState = GameState.FAILED; return
  }

  isExecuting = true
  if (gameState === GameState.READY || gameState === GameState.DOOR_OPENED) {
    ui.updateStatus('Çalışıyor...', 'executing')
  }

  const result = await executor.execute(robot, grid, battery)

  if (result.stopped) {
    ui.updateStatus('Durduruldu', 'ready')
  } else if (!result.success && (gameState as unknown) !== GameState.FAILED) {
    ui.updateStatus('Başarısız', 'error')
  }

  isExecuting = false
  ui.updatePositionDisplay(robot)
})

// STOP
document.getElementById('btn-stop')!.addEventListener('click', () => {
  executor.stop(); isExecuting = false
  blocklyMgr.clearHighlight()
  ui.updateStatus('Durduruldu', 'ready'); ui.showToast('⏹ Durduruldu', 'warning')
})

// RESET
document.getElementById('btn-reset')!.addEventListener('click', () => {
  resetSimulationState()
  blocklyMgr.clearAndReset()
  ui.showToast('🔄 Sıfırlandı', 'info')
})

// Failure retry
document.getElementById('failure-retry-btn')!.addEventListener('click', () => {
  ui.hideFailure(); document.getElementById('btn-reset')!.click()
})

// LOAD SAMPLE CODE
document.getElementById('btn-load-code')!.addEventListener('click', () => {
  if (isExecuting) return
  blocklyMgr.loadSampleSolution()
  ui.showToast('💡 Örnek kod yüklendi!', 'success')
})

// ═══════════════════════════════════════════
// MISSION NAVIGATION
// ═══════════════════════════════════════════
function loadMissionUI() {
  const mission = missionMgr.getCurrentMission()
  const idx = missionMgr.getCurrentIndex()
  ui.updateMission(idx + 1, mission.title, mission.description)

  // Show hint
  const hintEl = document.getElementById('mission-hint')
  if (hintEl) {
    hintEl.textContent = `💡 ${mission.hint}`
    hintEl.style.display = 'block'
  }

  // Nav buttons
  const prevBtn = document.getElementById('mission-prev') as HTMLButtonElement
  const nextBtn = document.getElementById('mission-next') as HTMLButtonElement
  if (prevBtn) prevBtn.disabled = idx === 0
  if (nextBtn) nextBtn.disabled = idx >= missionMgr.getTotalMissions() - 1

  updateMissionStarsDisplay()
}

function updateMissionStarsDisplay() {
  const idx = missionMgr.getCurrentIndex()
  const starsEl = document.getElementById('mission-stars')
  if (!starsEl) return
  const best = missionMgr.getBestScore(idx)
  if (best) {
    starsEl.textContent = '⭐'.repeat(best.stars) + '☆'.repeat(3 - best.stars)
  } else {
    starsEl.textContent = '☆☆☆'
  }
}

function switchToMission(index: number) {
  missionMgr.setMission(index)
  resetSimulationState()
  blocklyMgr.clearAndReset()
  missionMgr.resetForMission()
  loadMissionUI()
}

document.getElementById('mission-prev')?.addEventListener('click', () => {
  if (isExecuting) return
  const idx = missionMgr.getCurrentIndex()
  if (idx > 0) switchToMission(idx - 1)
})

document.getElementById('mission-next')?.addEventListener('click', () => {
  if (isExecuting) return
  const idx = missionMgr.getCurrentIndex()
  if (idx < missionMgr.getTotalMissions() - 1) switchToMission(idx + 1)
})

// Success: advance to next mission
document.getElementById('success-next-btn')!.addEventListener('click', () => {
  ui.hideSuccess()
  const next = missionMgr.nextMission()
  if (next) {
    resetSimulationState()
    blocklyMgr.clearAndReset()
    missionMgr.resetForMission()
    loadMissionUI()
    ui.showToast(`Yeni görev: ${next.title}`, 'info')
  } else {
    ui.showToast('Tüm görevleri tamamladın! 🎉', 'success')
  }
})

// ═══════════════════════════════════════════
// CAMERA MODES
// ═══════════════════════════════════════════
const cameraModeSelect = document.getElementById('camera-mode-select') as HTMLSelectElement | null
if (cameraModeSelect) {
  cameraModeSelect.addEventListener('change', () => {
    cameraMode = cameraModeSelect.value as typeof cameraMode
    if (cameraMode === 'overview') {
      controls.enabled = true
      const pose = getPrimaryCameraPose()
      animateCameraTo(pose.pos, pose.target, 800)
    } else if (cameraMode === 'follow') {
      controls.enabled = false
    } else if (cameraMode === 'cinematic') {
      controls.enabled = false
      cinematicAngle = 0
    }
  })
}

// ═══════════════════════════════════════════
// SPEED CONTROL
// ═══════════════════════════════════════════
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement | null
if (speedSlider) {
  speedSlider.addEventListener('input', () => {
    const val = parseInt(speedSlider.value, 10)
    executor.setSpeed(val)
  })
}

// ═══════════════════════════════════════════
// LIGHT CONTROL
// ═══════════════════════════════════════════
function applyLightMultiplier() {
  const baseAmbient = garageMode === 'closed' ? 1.5 : 0.35
  if (mainAmbientLight) mainAmbientLight.intensity = baseAmbient * lightMultiplier
  if (skyLight) skyLight.intensity = 0.5 * lightMultiplier
  const sun = scene?.getObjectByName('env_sun') as THREE.DirectionalLight | undefined
  if (sun) sun.intensity = 1.2 * lightMultiplier
}

const lightSlider = document.getElementById('light-slider') as HTMLInputElement | null
if (lightSlider) {
  lightSlider.addEventListener('input', () => {
    lightMultiplier = parseInt(lightSlider.value, 10) / 100
    applyLightMultiplier()
  })
}

// ═══════════════════════════════════════════
// RESOLUTION CONTROL
// ═══════════════════════════════════════════
const resolutionSlider = document.getElementById('resolution-slider') as HTMLInputElement | null
if (resolutionSlider) {
  resolutionSlider.addEventListener('input', () => {
    const scale = parseInt(resolutionSlider.value, 10) / 100
    const c = document.getElementById('canvas-container')!
    const baseDPR = currentQuality === 'high' ? Math.min(window.devicePixelRatio, 1.5) : 1
    renderer.setPixelRatio(scale * baseDPR)
    renderer.setSize(c.clientWidth, c.clientHeight)
  })
}

// ═══════════════════════════════════════════
// QUALITY PRESETS
// ═══════════════════════════════════════════
let currentQuality: 'high' | 'performance' = 'high'

function applyQualityPreset(preset: 'high' | 'performance') {
  currentQuality = preset
  const c = document.getElementById('canvas-container')!
  const sun = scene?.getObjectByName('env_sun') as THREE.DirectionalLight | undefined

  if (preset === 'high') {
    // Cap at 1.5 — almost indistinguishable from 2.0 but 44% fewer pixels
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    if (sun) {
      sun.shadow.mapSize.set(2048, 2048)
      sun.shadow.radius = 3
      sun.shadow.map?.dispose()
      sun.shadow.map = null as any
    }
    if (scene?.fog) (scene.fog as THREE.FogExp2).density = 0.004
  } else {
    renderer.setPixelRatio(1)
    if (scene?.fog) (scene.fog as THREE.FogExp2).density = 0.002
  }

  renderer.setSize(c.clientWidth, c.clientHeight)

  // Sync resolution slider
  if (resolutionSlider) resolutionSlider.value = '100'
}

document.querySelectorAll('.quality-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const quality = (btn as HTMLElement).dataset.quality as 'high' | 'performance'
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    applyQualityPreset(quality)
  })
})

// Shadow toggle
let shadowEnabled = false
const shadowToggleBtn = document.getElementById('btn-shadow-toggle')
if (shadowToggleBtn) {
  shadowToggleBtn.textContent = '🌑 Kapalı'
  shadowToggleBtn.classList.remove('active')
}
shadowToggleBtn?.addEventListener('click', () => {
  shadowEnabled = !shadowEnabled
  const sun = scene?.getObjectByName('env_sun') as THREE.DirectionalLight | undefined
  renderer.shadowMap.enabled = shadowEnabled
  if (sun) sun.castShadow = shadowEnabled
  shadowToggleBtn.textContent = shadowEnabled ? '🌑 Açık' : '🌑 Kapalı'
  shadowToggleBtn.classList.toggle('active', shadowEnabled)
})

// ═══════════════════════════════════════════
// STEP MODE
// ═══════════════════════════════════════════
let stepModeEnabled = false
const stepToggleBtn = document.getElementById('btn-step-toggle')
const stepNextBtn = document.getElementById('btn-step-next')

stepToggleBtn?.addEventListener('click', () => {
  stepModeEnabled = !stepModeEnabled
  executor.setStepMode(stepModeEnabled)
  stepToggleBtn.classList.toggle('active', stepModeEnabled)
  if (stepNextBtn) stepNextBtn.style.display = stepModeEnabled ? '' : 'none'
  ui.showToast(stepModeEnabled ? '👣 Adım modu açıldı' : '🏃 Normal mod', 'info')
})

stepNextBtn?.addEventListener('click', () => {
  if (stepModeEnabled && isExecuting) {
    executor.stepNext()
  }
})

// ═══════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════
initScene()
createGarage()
initGame()
blocklyMgr.init((newExecutor, totalCost) => {
  executor = newExecutor
  ui.updateEnergyEstimate(totalCost)
  // Sync speed from slider
  if (speedSlider) executor.setSpeed(parseInt(speedSlider.value, 10))
  if (stepModeEnabled) executor.setStepMode(true)
})
loadMissionUI()
renderLoop()
