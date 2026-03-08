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
  INITIAL_BATTERY_LEVEL, DEFAULT_EXECUTION_SPEED, BATTERY_COST,
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
const doorCenterX = (-0.58 + GRID_W - 0.42) / 2  // true center between inner wall faces
let buttonMesh: THREE.Group | null = null
let buttonScreenMesh: THREE.Mesh | null = null
let buttonScreenMat: THREE.MeshStandardMaterial | null = null
let buttonZoneMat: THREE.MeshStandardMaterial | null = null
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
let antennaRingMat: THREE.MeshStandardMaterial | null = null
let robotPupils: THREE.Mesh[] = []
let robotAntennaMesh: THREE.Mesh | null = null
let robotBrowMeshes: THREE.Mesh[] = []
let isAntennaBlinking = false
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
let eyeLineModeTimer = 0
let nextLineModeAt = 5 + Math.random() * 4
let isLineMode = false
let lineModeProgress = 0
let robotGlints: THREE.Mesh[] = []
let chargePulseUntil = 0
let execStepCount = 0
let execTotalSteps = 0
let execEnergyUsed = 0
let garageMode: GarageMode = 'open'
let garageGroup: THREE.Group | null = null
let garageRoofGroup: THREE.Group | null = null
let garageRoofMaterials: THREE.MeshStandardMaterial[] = []
let envAnimatedObjects: { clouds: THREE.Group[], birds: THREE.Group[], planes: THREE.Group[] } | null = null
let cameraMode: 'overview' | 'follow' | 'cinematic' = 'overview'
let previousCameraMode: 'overview' | 'follow' | 'cinematic' = 'overview'
let cinematicAngle = 0

enum GameState { INTRO, READY, EXECUTING, DOOR_OPENED, COMPLETE, FAILED }
let gameState = GameState.INTRO

function getPrimaryCameraPose(mode: GarageMode = garageMode): { pos: { x: number, y: number, z: number }, target: { x: number, y: number, z: number } } {
  if (mode === 'closed') {
    return {
      pos: { x: GRID_CENTER_X, y: 2.8, z: 1.5 },
      target: { x: GRID_CENTER_X, y: 0.5, z: 8.0 }
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

  // Update exposure (brightness) based on roofing
  if (renderer) {
    renderer.toneMappingExposure = roofVisible ? BASE_EXPOSURE : BASE_EXPOSURE + DOOR_OPEN_EXPOSURE_BOOST
  }
  if (skyLight) {
    skyLight.intensity = roofVisible ? 0 : 0.95
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
  // Start with close-up of robot face for intro (robot at grid pos 5,8 → 3D pos 5,0,8)
  camera.position.set(GRID_CENTER_X + 0.3, 0.8, ROBOT_START.y + 2.2)

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
  // Look at robot face during intro
  controls.target.set(GRID_CENTER_X, 0.45, ROBOT_START.y); controls.update()
  // Disable orbit controls during intro
  controls.enableRotate = false; controls.enableZoom = false; controls.enablePan = false

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
    BUTTON_Y: BUTTON_POS.y,
    START_Y: ROBOT_START.y,
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

  // ── Outdoor grid tiles: from door to charging station ──
  const outdoorTileMat = new THREE.MeshStandardMaterial({ color: 0x6b7b8d, roughness: 0.35, metalness: 0.3 })
  const outdoorEdgeMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7c, roughness: 0.4, metalness: 0.25 })
  const chargeTileMat = new THREE.MeshStandardMaterial({ color: 0x43a047, emissive: 0x43a047, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.2 })
  const outdoorGridLineMat = new THREE.MeshStandardMaterial({ color: 0x4a5a6c, roughness: 0.5, metalness: 0.2 })

  for (let x = 0; x < GRID_W; x++) {
    for (let z = DOOR_ROW; z <= CHARGE_POS.y + 2; z++) {
      const isEdge = x === 0 || x === GRID_W - 1 || z === CHARGE_POS.y + 2
      const isCharge = x === CHARGE_POS.x && z === CHARGE_POS.y

      let mat = isEdge ? outdoorEdgeMat : outdoorTileMat
      if (isCharge) mat = chargeTileMat

      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.92), mat)
      tile.name = 'outdoor_tile'
      tile.position.set(x, -0.02, z)
      tile.receiveShadow = true
      scene.add(tile)

      // Charge tile frame
      if (isCharge) {
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a, emissive: 0x66bb6a, emissiveIntensity: 0.8, roughness: 0.3 })
        for (const [fw, fd, fx, fz] of [
          [0.96, 0.06, 0, -0.47], [0.96, 0.06, 0, 0.47],
          [0.06, 0.96, -0.47, 0], [0.06, 0.96, 0.47, 0]
        ] as [number, number, number, number][]) {
          const fg = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.02, fd), frameMat)
          fg.position.set(x + fx, 0.01, z + fz)
          scene.add(fg)
        }
      }
    }
  }

  // Outdoor grid lines
  for (let z = DOOR_ROW; z <= CHARGE_POS.y + 2; z++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(GRID_W, 0.005, 0.02), outdoorGridLineMat)
    line.position.set((GRID_W - 1) / 2, -0.015, z)
    scene.add(line)
  }
  for (let x = -0.5; x <= GRID_W - 0.5; x++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.005, CHARGE_POS.y + 2 - DOOR_ROW + 1),
      outdoorGridLineMat
    )
    line.position.set(x, -0.015, DOOR_ROW + (CHARGE_POS.y + 2 - DOOR_ROW) / 2)
    scene.add(line)
  }
}

// ═══════════════════════════════════════════
// ROBOT
// ═══════════════════════════════════════════
function drawRobotScreenFace(_mood: 'idle' | 'happy' | 'charging' | 'worried') {
  // Screen face text removed per user request
}

function createRobot(pos: Position): THREE.Group {
  const g = new THREE.Group(); wheelMeshes = []; robotEyeMeshes = []; robotPupils = []; robotGlints = []

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
  leftEye.position.set(-0.16, 0.52, 0.54); leftEye.scale.y = initEyeScaleY; g.add(leftEye)
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
  rightEye.position.set(0.16, 0.52, 0.54); rightEye.scale.y = initEyeScaleY; g.add(rightEye)
  robotEyeMeshes.push(leftEye, rightEye)

  // Göz bebekleri (siyah) — referans sakla (göz takibi için)
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.2 })
  const pupilGeo = new THREE.SphereGeometry(0.045, 16, 16)
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat)
  leftPupil.position.set(-0.16, 0.52, 0.645); g.add(leftPupil)
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat)
  rightPupil.position.set(0.16, 0.52, 0.645); g.add(rightPupil)
  robotPupils.push(leftPupil, rightPupil)

  // Göz parlaması (beyaz küçük nokta — canlılık)
  const glintMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2, roughness: 0.1 })
  const glintGeo = new THREE.SphereGeometry(0.018, 16, 16)
  const leftGlint = new THREE.Mesh(glintGeo, glintMat)
  leftGlint.position.set(-0.14, 0.54, 0.66); g.add(leftGlint)
  const rightGlint = new THREE.Mesh(glintGeo, glintMat)
  rightGlint.position.set(0.18, 0.54, 0.66); g.add(rightGlint)
  robotGlints.push(leftGlint, rightGlint)

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

  // ── KAŞLAR — İfadeli, animasyonlu ──
  const browMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.4, metalness: 0.3 })
  const browGeo = new RoundedBoxGeometry(0.14, 0.025, 0.03, 2, 0.008)
  const leftBrow = new THREE.Mesh(browGeo, browMat)
  leftBrow.position.set(-0.16, 0.64, 0.58); leftBrow.rotation.z = 0; g.add(leftBrow)
  const rightBrow = new THREE.Mesh(browGeo, browMat)
  rightBrow.position.set(0.16, 0.64, 0.58); rightBrow.rotation.z = 0; g.add(rightBrow)
  robotBrowMeshes = [leftBrow, rightBrow]

  // ── ÜST DOME/KAFA — Daha büyük ve yuvarlak ──
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.30, 0.65, 6, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x5BA8C8, roughness: 0.25 }))
  top.position.set(0, 0.92, 0); top.castShadow = true; g.add(top)

  // ── KULAKLAR — Yanlardan küçük çıkıntılar ──
  const earMat = new THREE.MeshStandardMaterial({ color: 0x4a9bb5, roughness: 0.3, metalness: 0.2 })
  for (const ex of [-0.48, 0.48]) {
    const ear = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.16, 0.12, 3, 0.03), earMat)
    ear.position.set(ex, 0.52, 0.1); g.add(ear)
    // Kulak iç ışığı
    const earLed = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00E5FF, emissiveIntensity: 1.5 }))
    earLed.position.set(ex > 0 ? ex + 0.04 : ex - 0.04, 0.52, 0.1); g.add(earLed)
  }

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

  // ── ANTEN — Gösterişli, büyük, çok katmanlı ──
  // Geniş taban montaj halkası
  const antBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 0.05, 20),
    new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.95, roughness: 0.15 })
  )
  antBase.position.y = 1.03; g.add(antBase)

  // Alt segment — kalın, sağlam
  const antLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.045, 0.22, 14),
    new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.85, roughness: 0.2 })
  )
  antLower.position.y = 1.17; g.add(antLower)

  // Alt ek halka (dekoratif)
  const antMidRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.008, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00E5FF, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 })
  )
  antMidRing.rotation.x = Math.PI / 2
  antMidRing.position.y = 1.28; g.add(antMidRing)

  // Üst segment — ince, zarif
  const antUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.025, 0.22, 14),
    new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.15 })
  )
  antUpper.position.y = 1.40; g.add(antUpper)
  robotAntennaMesh = antUpper

  // Parlayan uç küre — daha büyük
  antennaBallMat = new THREE.MeshStandardMaterial({
    color: 0x00E5FF, emissive: 0x00E5FF, emissiveIntensity: 3.0,
    metalness: 0.3, roughness: 0.08
  })
  const aBall = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 20), antennaBallMat)
  aBall.position.y = 1.55; g.add(aBall)

  // Uç çevresinde büyük dekoratif halka (RGB synced)
  antennaRingMat = new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00bcd4, emissiveIntensity: 1.5, transparent: true, opacity: 0.75 })
  const antRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.10, 0.012, 10, 28), antennaRingMat
  )
  antRing.rotation.x = Math.PI / 2
  antRing.position.y = 1.55; g.add(antRing)

  // İkinci küçük halka — uç üstünde
  const antTopRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.006, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00E5FF, emissiveIntensity: 2.0, transparent: true, opacity: 0.5 })
  )
  antTopRing.rotation.x = Math.PI / 2
  antTopRing.position.y = 1.64; g.add(antTopRing)

  // Güçlü anten ışığı
  const antLight = new THREE.PointLight(0x00E5FF, 0.8, 3.5)
  antLight.position.y = 1.55; g.add(antLight)


  // ── FLOATING CHARGE BAR (above robot) — Y-axis billboard ──
  const floatingBarGroup = new THREE.Group()
  floatingBarGroup.position.set(0, 2.0, 0)
  floatingBarGroup.name = 'floatingBarGroup'

  // Background track (rounded look via wider geometry)
  robotFloatingBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 0.32),
    new THREE.MeshBasicMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.95, depthTest: false })
  )
  robotFloatingBarBg.renderOrder = 999
  floatingBarGroup.add(robotFloatingBarBg)

  // Border frame
  const barBorder = new THREE.Mesh(
    new THREE.PlaneGeometry(2.08, 0.40),
    new THREE.MeshBasicMaterial({ color: 0x444466, transparent: true, opacity: 0.9, depthTest: false })
  )
  barBorder.renderOrder = 998
  barBorder.position.z = -0.001
  floatingBarGroup.add(barBorder)

  // Fill bar
  robotFloatingBar = new THREE.Mesh(
    new THREE.PlaneGeometry(1.92, 0.24),
    new THREE.MeshBasicMaterial({ color: 0x43a047, transparent: true, opacity: 0.95, depthTest: false })
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
  batIconSprite.scale.set(0.4, 0.4, 1)
  batIconSprite.position.set(-1.25, 0, 0.001)
  batIconSprite.renderOrder = 1001
  floatingBarGroup.add(batIconSprite)

  // Percentage text sprite
  robotFloatingPctCanvas = document.createElement('canvas')
  robotFloatingPctCanvas.width = 256
  robotFloatingPctCanvas.height = 96
  robotFloatingPctTexture = new THREE.CanvasTexture(robotFloatingPctCanvas)
  robotFloatingPctTexture.minFilter = THREE.LinearFilter
  const pctMat = new THREE.SpriteMaterial({ map: robotFloatingPctTexture, transparent: true, depthTest: false })
  robotFloatingPctSprite = new THREE.Sprite(pctMat)
  robotFloatingPctSprite.scale.set(1.0, 0.4, 1)
  robotFloatingPctSprite.position.y = 0.32
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

  // ── ARKA HAVALANDIRMA VE LOGO (titreme düzeltildi) ──
  const ventBackMat = new THREE.MeshStandardMaterial({ color: 0x4a7a8a, roughness: 0.4, metalness: 0.5 })
  const ventBack = new THREE.Mesh(new RoundedBoxGeometry(0.50, 0.28, 0.04, 2, 0.01), ventBackMat)
  ventBack.position.set(0, 0.40, -0.50); g.add(ventBack)

  // Titreyen (z-fighting) slat'ler yerine Logo kullanımı
  const logoTex = new THREE.TextureLoader().load('/logo.png')
  logoTex.minFilter = THREE.LinearFilter
  logoTex.magFilter = THREE.LinearFilter
  logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy() // Çözünürlüğü ve netliği artırır
  logoTex.generateMipmaps = true

  if ('colorSpace' in logoTex) logoTex.colorSpace = 'srgb'
  else if ('encoding' in logoTex) (logoTex as any).encoding = 3001 // THREE.sRGBEncoding

  const logoMat = new THREE.MeshStandardMaterial({
    map: logoTex,
    transparent: true,
    alphaTest: 0.1, // Kenarlardaki şeffaf hataları temizler
    roughness: 0.5,
    metalness: 0.1,
    emissive: 0xffffff,
    emissiveMap: logoTex,
    emissiveIntensity: 0.4 // Rengin gölgede bile canlı/mat görünmesini sağlar
  })
  // PlaneGeometry kullanarak logoyu ventBack'in biraz dışına yerleştir (z-fighting'i önlemek için)
  const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.24), logoMat)
  logoMesh.position.set(0, 0.40, -0.521)
  logoMesh.rotation.y = Math.PI // Arkaya dönük olması için 180 derece çevir
  g.add(logoMesh)

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
  const wLedMat = new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00E5FF, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 })
  const wPos: [number, number, number][] = [[-0.44, 0.22, 0.40], [0.44, 0.22, 0.40], [-0.44, 0.22, -0.40], [0.44, 0.22, -0.40]]
  wPos.forEach(p => {
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.z = Math.PI / 2
    w.position.set(p[0], p[1], p[2]); g.add(w); wheelMeshes.push(w)
    const r = new THREE.Mesh(rGeo, rMat); r.rotation.y = Math.PI / 2
    r.position.set(p[0] > 0 ? p[0] + 0.095 : p[0] - 0.095, p[1], p[2]); g.add(r)
    // İç LED ring
    const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 12, 24), wLedMat)
    ledRing.rotation.y = Math.PI / 2
    ledRing.position.set(p[0] > 0 ? p[0] + 0.095 : p[0] - 0.095, p[1], p[2]); g.add(ledRing)
  })

  g.position.set(pos.x, 0, pos.y); scene.add(g); return g
}

// ═══════════════════════════════════════════
// INTERACTABLES
// ═══════════════════════════════════════════
function createButton3D(pos: Position) {
  const group = new THREE.Group()
  const isLeftWall = pos.x < GRID_CENTER_X

  // Wall-flush positioning: button panel embedded into wall surface
  const wallX = isLeftWall ? -0.56 : GRID_W - 0.16
  const faceDir = isLeftWall ? 1 : -1  // which direction the button faces

  // Wall-mounted back plate (dark, flush with wall)
  const backPlate = new THREE.Mesh(
    new RoundedBoxGeometry(0.06, 1.0, 0.7, 3, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.3, metalness: 0.7 })
  )
  backPlate.position.set(wallX, 1.2, pos.y)
  group.add(backPlate)

  // Button housing frame (slightly protruding from wall)
  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(0.10, 0.85, 0.55, 3, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x263040, roughness: 0.35, metalness: 0.65 })
  )
  frame.position.set(wallX + faceDir * 0.04, 1.2, pos.y)
  group.add(frame)

  // The actual push button (yellow, slightly raised from frame)
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0xFFEA00, emissive: 0xFFEA00, emissiveIntensity: 2.5, roughness: 0.1
  })
  const screen = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.55, 0.35, 3, 0.02), screenMat)
  screen.position.set(wallX + faceDir * 0.08, 1.2, pos.y)
  group.add(screen)
  buttonScreenMesh = screen
  buttonScreenMat = screenMat

  // Small status LED above button
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xFFEA00, emissive: 0xFFEA00, emissiveIntensity: 3, roughness: 0.1
  })
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), ledMat)
  led.position.set(wallX + faceDir * 0.08, 1.6, pos.y)
  group.add(led)

  // Floor interaction decal zone
  const zMat = new THREE.MeshStandardMaterial({
    color: 0xFFEA00, emissive: 0xFFEA00, emissiveIntensity: 1.5, transparent: true, opacity: 0.4
  })
  const zone = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.02, 32), zMat)
  zone.position.set(pos.x, 0.01, pos.y)
  group.add(zone)
  buttonZoneMat = zMat

  // Subtle wall light
  const pl = new THREE.PointLight(0xFFEA00, 2.0, 5.0)
  pl.position.set(wallX + faceDir * 0.3, 1.2, pos.y)
  group.add(pl)

  // ── "KAPI BUTONU" text sprite ──
  const lblCanvas = document.createElement('canvas')
  lblCanvas.width = 512; lblCanvas.height = 64
  const lctx = lblCanvas.getContext('2d')!
  lctx.fillStyle = 'rgba(10, 15, 25, 0.85)'
  lctx.roundRect(6, 4, 500, 56, 12)
  lctx.fill()
  lctx.strokeStyle = 'rgba(255, 234, 0, 0.5)'
  lctx.lineWidth = 2
  lctx.roundRect(6, 4, 500, 56, 12)
  lctx.stroke()
  lctx.font = 'bold 36px Arial'
  lctx.textAlign = 'center'; lctx.textBaseline = 'middle'
  lctx.fillStyle = '#FFEA00'
  lctx.fillText('KAPI BUTONU', 256, 32)
  const lblTex = new THREE.CanvasTexture(lblCanvas)
  lblTex.minFilter = THREE.LinearFilter
  const lblSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: lblTex, transparent: true, depthTest: false })
  )
  lblSprite.scale.set(2.5, 0.35, 1)
  lblSprite.position.set(wallX + faceDir * 0.3, 2.0, pos.y)
  lblSprite.renderOrder = 999
  group.add(lblSprite)

  scene.add(group)
  return group
}

function createChargingStation(pos: Position): THREE.Group {
  const g = new THREE.Group()
  const graphiteMat = new THREE.MeshStandardMaterial({ color: 0x26313f, roughness: 0.38, metalness: 0.72 })
  const alloyMat = new THREE.MeshStandardMaterial({ color: 0xdde4ee, roughness: 0.16, metalness: 0.9 })
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x101721, roughness: 0.22, metalness: 0.42 })

  // Ground platform + docking ring (elongated)
  const platform = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.12, 5.0, 5, 0.06), graphiteMat)
  platform.position.y = 0.05
  platform.receiveShadow = true
  g.add(platform)
  const dockingRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.08, 20, 56),
    new THREE.MeshStandardMaterial({ color: 0x66bb6a, emissive: 0x43a047, emissiveIntensity: 1.05, roughness: 0.2, metalness: 0.5 })
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
  chargingSurfaceMat = new THREE.MeshStandardMaterial({ color: 0x69f0ae, emissive: 0x43a047, emissiveIntensity: 0.8, roughness: 0.1 })
  const centerGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.7, 0.02, 40),
    chargingSurfaceMat
  )
  centerGlow.position.y = 0.12
  g.add(centerGlow)

  // Rear power cabinet (elongated)
  const powerBody = new THREE.Mesh(new RoundedBoxGeometry(1.0, 2.4, 0.6, 5, 0.06), alloyMat)
  powerBody.position.set(0, 1.2, -2.3)
  powerBody.castShadow = true
  g.add(powerBody)
  const servicePanel = new THREE.Mesh(new RoundedBoxGeometry(0.85, 1.5, 0.04, 4, 0.02), panelMat)
  servicePanel.position.set(0, 1.25, -2.0)
  g.add(servicePanel)

  // Status display
  const statusBar = new THREE.Mesh(
    new RoundedBoxGeometry(0.6, 0.15, 0.015, 3, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x69f0ae, emissive: 0x69f0ae, emissiveIntensity: 2.1, roughness: 0.08 })
  )
  statusBar.position.set(0, 1.85, -1.95)
  g.add(statusBar)
  const statusStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.03, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x66bb6a, emissive: 0x66bb6a, emissiveIntensity: 1.4, roughness: 0.1 })
  )
  statusStripe.position.set(0, 2.2, -2.15)
  g.add(statusStripe)

  // Gantry frame (bigger)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x5f6f82, roughness: 0.34, metalness: 0.66 })
  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.0, 0.22), frameMat)
  frameLeft.position.set(-1.5, 3.0, -0.9); g.add(frameLeft)
  const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.0, 0.22), frameMat)
  frameRight.position.set(1.5, 3.0, -0.9); g.add(frameRight)
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.18, 0.24), frameMat)
  frameTop.position.set(0, 5.98, -0.9); g.add(frameTop)

  // Cable reel + connector dock
  const reel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.06, 16, 32),
    new THREE.MeshStandardMaterial({ color: 0x20252d, roughness: 0.72, metalness: 0.45 }))
  reel.position.set(0.65, 0.9, -2.1); reel.rotation.y = Math.PI / 2
  g.add(reel)
  const dockNozzle = new THREE.Mesh(
    new RoundedBoxGeometry(0.15, 0.22, 0.11, 3, 0.015),
    new THREE.MeshStandardMaterial({ color: 0x25303c, roughness: 0.28, metalness: 0.65 })
  )
  dockNozzle.position.set(0.82, 0.5, -2.05)
  g.add(dockNozzle)
  chargingCableAnchor = new THREE.Object3D()
  chargingCableAnchor.position.set(0.82, 0.5, -1.9)
  g.add(chargingCableAnchor)

  // Overhead canopy (elongated)
  const canopy = new THREE.Mesh(
    new RoundedBoxGeometry(3.8, 0.14, 6.0, 5, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x3b4a5e, roughness: 0.25, metalness: 0.72 })
  )
  canopy.position.y = 6.2
  g.add(canopy)
  const canopyLed = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.03, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x7bdff2, emissive: 0x7bdff2, emissiveIntensity: 1.65, roughness: 0.08 })
  )
  canopyLed.position.set(0, 6.13, 2.94)
  g.add(canopyLed)
  const canopyLedBack = canopyLed.clone()
  canopyLedBack.position.set(0, 6.13, -2.94)
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
  // Background — clean, readable
  ctx.fillStyle = 'rgba(10, 30, 20, 0.85)'
  ctx.roundRect(12, 8, 1000, 112, 18)
  ctx.fill()
  ctx.strokeStyle = 'rgba(105, 240, 174, 0.5)'
  ctx.lineWidth = 3
  ctx.roundRect(12, 8, 1000, 112, 18)
  ctx.stroke()
  // Text — clean, no excessive glow
  ctx.font = 'bold 72px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#69f0ae'
  ctx.fillText('ŞARJ İSTASYONU', 512, 64)
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
  const spotDown = new THREE.SpotLight(0x69f0ae, 2.5, 8.0, Math.PI / 4.5, 0.45)
  spotDown.position.set(0, 2.9, 0.1)
  spotDown.target.position.set(0, 0, 0.05)
  g.add(spotDown)
  g.add(spotDown.target)
  g.add(new THREE.PointLight(0x69f0ae, 1.2, 9).translateY(0.6))
  chargingAmbientGlowMat = new THREE.MeshBasicMaterial({ color: 0x69f0ae, transparent: true, opacity: 0.06 })
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
  const wallLeftInner = -0.58
  const wallRightInner = GRID_W - 0.42
  const doorCX = (wallLeftInner + wallRightInner) / 2
  const doorW = wallRightInner - wallLeftInner + 0.1
  const numPanels = Math.ceil(WALL_H / DOOR_PANEL_H)

  // ── I-Beam Header across top of door ──
  const headerY = WALL_H + 0.05
  const ibeamMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.4, metalness: 0.6 })
  // Web
  const hweb = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.4, 0.15, 0.025), ibeamMat)
  hweb.position.set(doorCX, headerY, DOOR_Z)
  doorGroup.add(hweb)
  // Top flange
  const htf = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.4, 0.025, 0.20), ibeamMat)
  htf.position.set(doorCX, headerY + 0.075 + 0.0125, DOOR_Z)
  doorGroup.add(htf)
  // Bottom flange
  const hbf = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.4, 0.025, 0.20), ibeamMat)
  hbf.position.set(doorCX, headerY - 0.075 - 0.0125, DOOR_Z)
  doorGroup.add(hbf)

  // ── I-Beam Side Posts ──
  for (const sx of [wallLeftInner - 0.12, wallRightInner + 0.12]) {
    const sweb = new THREE.Mesh(new THREE.BoxGeometry(0.025, WALL_H + 0.2, 0.15), ibeamMat)
    sweb.position.set(sx, WALL_H / 2, DOOR_Z)
    doorGroup.add(sweb)
    const sff = new THREE.Mesh(new THREE.BoxGeometry(0.20, WALL_H + 0.2, 0.025), ibeamMat)
    sff.position.set(sx, WALL_H / 2, DOOR_Z + 0.075 + 0.0125)
    doorGroup.add(sff)
    const sbf = new THREE.Mesh(new THREE.BoxGeometry(0.20, WALL_H + 0.2, 0.025), ibeamMat)
    sbf.position.set(sx, WALL_H / 2, DOOR_Z - 0.075 - 0.0125)
    doorGroup.add(sbf)
  }

  // ── Visible Vertical Tracks with Rollers ──
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.35, metalness: 0.7 })
  for (const rx of [doorCX - doorW / 2 - 0.04, doorCX + doorW / 2 + 0.04]) {
    // C-channel track
    const trackBack = new THREE.Mesh(new THREE.BoxGeometry(0.04, WALL_H + 0.1, 0.06), trackMat)
    trackBack.position.set(rx, WALL_H / 2, DOOR_Z - 0.03)
    doorGroup.add(trackBack)
    const trackFront = new THREE.Mesh(new THREE.BoxGeometry(0.04, WALL_H + 0.1, 0.01), trackMat)
    trackFront.position.set(rx, WALL_H / 2, DOOR_Z + 0.02)
    doorGroup.add(trackFront)
    // Roller brackets
    for (let b = 0; b < 3; b++) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), trackMat)
      roller.rotateX(Math.PI / 2)
      roller.position.set(rx, 0.5 + b * 1.0, DOOR_Z - 0.01)
      doorGroup.add(roller)
    }
  }

  // ── Door Panels — thicker, industrial gray ──
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xc0c4c8, roughness: 0.4, metalness: 0.3,
    clippingPlanes: [doorClipPlane], clipShadows: true
  })
  const jointMat = new THREE.MeshStandardMaterial({
    color: 0x505050, roughness: 0.5, metalness: 0.4,
    clippingPlanes: [doorClipPlane], clipShadows: true
  })
  // Window panel is the top one
  const windowPanelIdx = numPanels - 1

  for (let i = 0; i < numPanels; i++) {
    const p = new THREE.Mesh(
      new RoundedBoxGeometry(doorW, DOOR_PANEL_H - 0.01, 0.04, 2, 0.005), panelMat
    )
    p.position.set(doorCX, DOOR_PANEL_H / 2 + i * DOOR_PANEL_H, DOOR_Z)
    p.castShadow = true; doorGroup.add(p); doorPanels.push(p)

    // Recessed joint lines at top and bottom of each panel
    const topJoint = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.005, 0.045), jointMat)
    topJoint.position.set(doorCX, (i + 1) * DOOR_PANEL_H - 0.002, DOOR_Z)
    doorGroup.add(topJoint); doorLines.push(topJoint)

    const botJoint = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.005, 0.045), jointMat)
    botJoint.position.set(doorCX, i * DOOR_PANEL_H + 0.002, DOOR_Z)
    doorGroup.add(botJoint)

    // Frosted glass window on top panel
    if (i === windowPanelIdx) {
      const windowMat = new THREE.MeshStandardMaterial({
        color: 0xb0d4e8, emissive: 0x80bcd0, emissiveIntensity: 0.12,
        roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.65,
        clippingPlanes: [doorClipPlane], clipShadows: true
      })
      const winFrameMat = new THREE.MeshStandardMaterial({
        color: 0x606060, roughness: 0.4, metalness: 0.5,
        clippingPlanes: [doorClipPlane], clipShadows: true
      })
      // 4 window panes
      for (let w = 0; w < 4; w++) {
        const wx = doorCX - doorW * 0.35 + w * (doorW * 0.7 / 3)
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(doorW * 0.14, DOOR_PANEL_H * 0.55, 0.008), windowMat
        )
        win.position.set(wx, DOOR_PANEL_H / 2 + i * DOOR_PANEL_H, DOOR_Z + 0.022)
        doorGroup.add(win)
        // Window frame
        const wf = new THREE.Mesh(
          new THREE.BoxGeometry(doorW * 0.16, DOOR_PANEL_H * 0.60, 0.003), winFrameMat
        )
        wf.position.set(wx, DOOR_PANEL_H / 2 + i * DOOR_PANEL_H, DOOR_Z + 0.020)
        doorGroup.add(wf)
      }
    }
  }

  // ── Amber Warning Beacons ──
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff8c00, emissive: 0xff8c00, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.2
  })
  for (const bx of [doorCX - doorW / 2 - 0.15, doorCX + doorW / 2 + 0.15]) {
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), beaconMat)
    beacon.position.set(bx, headerY + 0.06, DOOR_Z + 0.05)
    doorGroup.add(beacon)
    // Beacon base
    const bbase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8), ibeamMat)
    bbase.position.set(bx, headerY - 0.02, DOOR_Z + 0.05)
    doorGroup.add(bbase)
  }

  // ── Yellow/Black Chevron Floor Markings ──
  const chevronYellow = new THREE.MeshStandardMaterial({ color: 0xf0c040, roughness: 0.6 })
  const chevronBlack = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })
  const chevronCount = 8
  const chevronTotalW = doorW + 0.3
  const chevronSegW = chevronTotalW / chevronCount
  for (let ci = 0; ci < chevronCount; ci++) {
    const cx = doorCX - chevronTotalW / 2 + chevronSegW * (ci + 0.5)
    const cMat = ci % 2 === 0 ? chevronYellow : chevronBlack
    const cg = new THREE.Mesh(new THREE.BoxGeometry(chevronSegW * 0.9, 0.01, 0.25), cMat)
    cg.position.set(cx, 0.005, DOOR_Z + 0.35)
    doorGroup.add(cg)
  }

  // ── Wall-Mounted Control Panel ──
  const ctrlPanelMat = new THREE.MeshStandardMaterial({ color: 0x505560, roughness: 0.4, metalness: 0.4 })
  const ctrlBox = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.25, 0.06), ctrlPanelMat)
  ctrlBox.position.set(wallRightInner + 0.35, 1.2, DOOR_Z)
  doorGroup.add(ctrlBox)
  // Green button
  const greenBtnMat = new THREE.MeshStandardMaterial({ color: 0x00c853, emissive: 0x00c853, emissiveIntensity: 0.5, roughness: 0.3 })
  const greenBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.015, 8), greenBtnMat)
  greenBtn.rotateX(Math.PI / 2)
  greenBtn.position.set(wallRightInner + 0.32, 1.26, DOOR_Z + 0.035)
  doorGroup.add(greenBtn)
  // Red button
  const redBtnMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 0.5, roughness: 0.3 })
  const redBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.015, 8), redBtnMat)
  redBtn.rotateX(Math.PI / 2)
  redBtn.position.set(wallRightInner + 0.38, 1.26, DOOR_Z + 0.035)
  doorGroup.add(redBtn)
  // Display
  const ctrlDispMat = new THREE.MeshStandardMaterial({ color: 0x0a0a14, emissive: 0x1565c0, emissiveIntensity: 0.2, roughness: 0.1 })
  const ctrlDisp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.005), ctrlDispMat)
  ctrlDisp.position.set(wallRightInner + 0.35, 1.15, DOOR_Z + 0.035)
  doorGroup.add(ctrlDisp)

  // ── Handle ──
  doorHandle = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.38, 0.12, 2, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x263238, roughness: 0.25, metalness: 0.85,
      clippingPlanes: [doorClipPlane], clipShadows: true
    }))
  doorHandle.position.set(doorCX - doorW * 0.33, 0.9, DOOR_Z + 0.08); doorGroup.add(doorHandle)
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x455a64, roughness: 0.3, metalness: 0.8,
      clippingPlanes: [doorClipPlane], clipShadows: true
    }))
  grip.position.set(doorCX - doorW * 0.33, 0.95, DOOR_Z + 0.12); doorGroup.add(grip)

  // ── Bottom Weather Seal ──
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

  // Temporarily switch to overview so cinematic camera can control the view
  const savedCameraMode = cameraMode
  cameraMode = 'overview'

  // Animate camera to watch the door opening from a cinematic angle
  // Tavanı aşmaması ve görsele benzemesi için daha asimetrik/geniş açı kullanıldı.
  animateCameraTo(
    { x: GRID_CENTER_X, y: 3.8, z: DOOR_ROW - 12 },
    { x: GRID_CENTER_X, y: 1.5, z: DOOR_ROW },
    1200
  )

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
  const glowCX = (-0.58 + GRID_W - 0.42) / 2
  doorGlowPlane = new THREE.Mesh(new THREE.PlaneGeometry(GRID_W - 0.42 + 0.58 + 0.1, WALL_H), glowMat)
  doorGlowPlane.position.set(glowCX, WALL_H / 2, DOOR_ROW + 0.1); scene.add(doorGlowPlane)

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
    // Realistic shutter easing: slow start, accelerate, slow at end
    const ease = t < 0.15 ? (t / 0.15) * (t / 0.15) * 0.15
      : t < 0.85 ? 0.15 + (t - 0.15) / 0.7 * 0.7
        : 0.85 + (1 - Math.pow(1 - (t - 0.85) / 0.15, 2)) * 0.15

    // Realistic roller shutter: panels rise from bottom, stack/coil at the top
    const n = doorPanels.length
    doorPanels.forEach((p, i) => {
      // Bottom panels move first — sequential chain pull
      const panelDelay = ((n - 1 - i) / n) * 0.4
      const lt = Math.max(0, Math.min(1, (ease - panelDelay) / (1 - panelDelay)))

      // Panel rises to top then compresses into coil
      const riseHeight = totalHeight
      const stackOffset = i * DOOR_PANEL_H * 0.15 * lt  // panels compress together at top
      p.position.y = originalY[i] + riseHeight * lt - stackOffset

      // Panels tilt as they go over the drum at top
      const tiltPhase = Math.max(0, lt - 0.6) / 0.4  // tilt starts at 60% of travel
      p.rotation.x = tiltPhase * Math.PI * 0.35

      // Slight scale compression as panels stack
      p.scale.y = 1 - lt * 0.5

      // Vibration effect — mechanical shaking during movement
      if (lt > 0.01 && lt < 0.99) {
        p.position.x += Math.sin(Date.now() * 0.03 + i) * 0.003
      }
    })
    doorLines.forEach((l, i) => {
      const panelDelay = ((n - 1 - i) / n) * 0.4
      const lt = Math.max(0, Math.min(1, (ease - panelDelay) / (1 - panelDelay)))
      const stackOffset = i * DOOR_PANEL_H * 0.15 * lt
      l.position.y = originalLineY[i] + totalHeight * lt - stackOffset
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

    // Only apply closing/opening brightness effects if in 'closed' (dark) mode
    if (garageMode === 'closed') {
      renderer.toneMappingExposure = BASE_EXPOSURE + ease * DOOR_OPEN_EXPOSURE_BOOST
      if (skyLight) skyLight.intensity = ease * 0.95
    }

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

      // Cinematic camera show: dışarı atlayıp geri gelmesini iptal ediyoruz.
      // 1. adımı zaten içeriden izlemiştik (1127. satırdaki animateCameraTo)
      // Artık sadece normal kamera moduna (takip) geri dönüyoruz.
      ui.updateMission(2, 'Şarj İstasyonu', 'Robotu dışarıdaki yeşil şarj alanına götür ve şarj et.')
      ui.showToast('Kapı açıldı! Yeni hedef: Şarj istasyonuna ulaş! ⚡', 'info')
      // Restore camera mode immediately
      cameraMode = savedCameraMode
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
    p.position.set(doorCenterX, DOOR_PANEL_H / 2 + i * DOOR_PANEL_H, DOOR_Z)
    p.rotation.set(0, 0, 0)
    p.scale.set(1, 1, 1)
  })
  doorLines.forEach((l, i) => {
    l.position.set(doorCenterX, i * DOOR_PANEL_H + DOOR_PANEL_H, DOOR_Z)
    l.rotation.set(0, 0, 0)
    l.scale.set(1, 1, 1)
  })
  const doorW = (GRID_W - 0.42) - (-0.58) + 0.1
  doorHandle.position.set(doorCenterX - doorW * 0.33, 0.9, DOOR_Z + 0.1)
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

  if (garageMode === 'closed') {
    renderer.toneMappingExposure = BASE_EXPOSURE
    if (skyLight) skyLight.intensity = 0
  }
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
  ui.clearMissionAlerts()
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
  isLineMode = false; lineModeProgress = 0; eyeLineModeTimer = 0
  robotEyeMeshes.forEach((eye) => { eye.scale.set(1, 1, 1) })
  robotPupils.forEach(p => { p.visible = true })
  robotGlints.forEach(g => { g.visible = true })

  gameState = GameState.READY
  updateRobotPosition()
  ui.updateBatteryUI(INITIAL_BATTERY_LEVEL)
  updateRobotChargeIndicator(INITIAL_BATTERY_LEVEL)
  ui.updatePositionDisplay(robot)
  ui.updateStatus('Hazır', 'ready')
  hideExecInfoPanel()
}

// ═══════════════════════════════════════════
// ENERGY PANEL (always visible)
// ═══════════════════════════════════════════
function updateEnergyPanel(level?: number) {
  const pct = level ?? battery.getCurrentLevel()
  const totalEl = document.getElementById('ep-total')
  const remainEl = document.getElementById('ep-remaining')
  const perStepEl = document.getElementById('ep-per-step')
  const stepsLeftEl = document.getElementById('ep-steps-left')
  if (totalEl) totalEl.textContent = `${Math.round(pct)}%`
  if (remainEl) remainEl.textContent = `${Math.round(pct)}%`
  const costPerStep = BATTERY_COST.MOVE_FORWARD
  if (perStepEl) perStepEl.textContent = `${costPerStep}%`
  const stepsLeft = Math.floor(pct / costPerStep)
  if (stepsLeftEl) stepsLeftEl.textContent = pct > 0 ? `~${stepsLeft}` : '0'
}

// EXECUTION INFO PANEL
// ═══════════════════════════════════════════
function showExecInfoPanel() {
  const el = document.getElementById('exec-info-panel')
  if (el) el.classList.add('visible')
}
function hideExecInfoPanel() {
  const el = document.getElementById('exec-info-panel')
  if (el) el.classList.remove('visible')
}
function updateExecInfoPanel(stepType?: string) {
  const stepEl = document.getElementById('exec-step')
  const usedEl = document.getElementById('exec-energy-used')
  const leftEl = document.getElementById('exec-energy-left')
  const costEl = document.getElementById('exec-cost-per-step')
  if (stepEl) stepEl.textContent = `${execStepCount} / ${execTotalSteps}`
  if (usedEl) usedEl.textContent = `${execEnergyUsed.toFixed(1)}%`
  const remaining = battery.getCurrentLevel()
  if (leftEl) {
    leftEl.textContent = `${remaining.toFixed(1)}%`
    leftEl.className = 'exec-info-value energy-left'
    if (remaining <= 1) leftEl.classList.add('low')
  }
  // Cost per step based on command type
  if (costEl && stepType) {
    const costMap: Record<string, number> = {
      MOVE_FORWARD: BATTERY_COST.MOVE_FORWARD,
      MOVE_BACKWARD: BATTERY_COST.MOVE_BACKWARD,
      TURN_LEFT: BATTERY_COST.TURN_LEFT,
      TURN_RIGHT: BATTERY_COST.TURN_RIGHT,
      PRESS_BUTTON: BATTERY_COST.PRESS_BUTTON,
      CHARGE: BATTERY_COST.CHARGE,
    }
    const cost = costMap[stepType] ?? 0
    costEl.textContent = `${cost.toFixed(1)}%`
  }
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

    // Antenna blink during movement
    isAntennaBlinking = true

    if (t < 1) requestAnimationFrame(a)
    else {
      robotMesh.position.x = tx; robotMesh.position.z = tz; robotMesh.rotation.y = tr
      robotMesh.position.y = 0; robotMesh.rotation.x = 0; robotMesh.rotation.z = 0
      isAntennaBlinking = false
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
      ; (glow.geometry as THREE.BufferGeometry).setFromPoints(glowPoints)
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
    robotFloatingBar.position.x = -0.96 * (1 - t)
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

  // Skip blink during intro and line mode
  if (gameState === GameState.INTRO) return
  if (isLineMode) return

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

function updateEyeLineMode(delta: number) {
  if (!robotEyeMeshes.length) return
  if (gameState === GameState.INTRO) return
  // Don't trigger line mode during blink
  if (isBlinking) return

  eyeLineModeTimer += delta

  if (!isLineMode && eyeLineModeTimer >= nextLineModeAt) {
    isLineMode = true
    lineModeProgress = 0
  }

  if (!isLineMode) return

  // Line mode duration: ~1.2s total (0.2s in, 0.8s hold, 0.2s out)
  lineModeProgress += delta
  const TRANSITION_IN = 0.2
  const HOLD = 0.8
  const TRANSITION_OUT = 0.2
  const TOTAL = TRANSITION_IN + HOLD + TRANSITION_OUT

  let t: number
  if (lineModeProgress < TRANSITION_IN) {
    // Transition to line: round → flat
    t = lineModeProgress / TRANSITION_IN
  } else if (lineModeProgress < TRANSITION_IN + HOLD) {
    // Hold line shape
    t = 1
  } else if (lineModeProgress < TOTAL) {
    // Transition back: flat → round
    t = 1 - (lineModeProgress - TRANSITION_IN - HOLD) / TRANSITION_OUT
  } else {
    // Done
    t = 0
    isLineMode = false
    eyeLineModeTimer = 0
    nextLineModeAt = 5 + Math.random() * 6
    robotEyeMeshes.forEach(eye => { eye.scale.set(1, 1, 1) })
    robotPupils.forEach(p => { p.visible = true })
    robotGlints.forEach(g => { g.visible = true })
    return
  }

  // Smooth ease
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

  // Line shape: flatten Y to thin bar, stretch X wider
  const scaleY = 1 - ease * 0.82  // 1 → 0.18
  const scaleX = 1 + ease * 0.8   // 1 → 1.8
  robotEyeMeshes.forEach(eye => { eye.scale.set(scaleX, scaleY, 1) })

  // Hide pupils and glints during line mode (they look odd on a thin bar)
  const showDetails = ease < 0.3
  robotPupils.forEach(p => { p.visible = showDetails })
  robotGlints.forEach(g => { g.visible = showDetails })
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
  chargePulseUntil = performance.now() + 4500
  EventBus.emit('robot:expression', EyeExpression.HAPPY)
  drawRobotScreenFace('charging')

  // Camera: orbit around robot during charge
  const rp = robotMesh.position.clone()
  animateCameraTo(
    { x: rp.x + 3, y: rp.y + 4, z: rp.z + 3.5 },
    { x: rp.x, y: rp.y + 0.5, z: rp.z },
    1200
  )

  // --- Create energy ring meshes that rise around the robot ---
  const ringCount = 4
  const rings: THREE.Mesh[] = []
  const ringMats: THREE.MeshBasicMaterial[] = []
  for (let i = 0; i < ringCount; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4de5ff, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false
    })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7 + i * 0.15, 0.025, 16, 64), mat)
    ring.rotation.x = Math.PI / 2
    ring.position.set(rp.x, 0.15, rp.z)
    scene.add(ring)
    rings.push(ring)
    ringMats.push(mat)
  }

  // --- Create vertical energy beam ---
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x7de9ff, transparent: true, opacity: 0, depthWrite: false
  })
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 16), beamMat)
  beam.position.set(rp.x, 2, rp.z)
  scene.add(beam)

  const surfMat = chargingSurfaceMat
  const st = Date.now()
  const totalDur = 4000

  const animate = () => {
    const elapsed = Date.now() - st
    const t = Math.min(elapsed / totalDur, 1)

    // --- Phase 1 (0–25%): Docking — cable connects, surface glows, rings appear ---
    if (t < 0.25) {
      const p = t / 0.25
      if (surfMat) {
        surfMat.emissiveIntensity = 0.6 + p * 1.5
        const hue = 0.52 + p * 0.03 // cyan→teal
        surfMat.emissive.setHSL(hue, 0.9, 0.45)
      }
      // Rings fade in at ground level
      ringMats.forEach((m, i) => {
        const delay = i * 0.2
        const rp2 = Math.max(0, (p - delay) / (1 - delay))
        m.opacity = rp2 * 0.7
        m.color.setHSL(0.52, 0.9, 0.55)
      })
      // Beam fades in
      beamMat.opacity = p * 0.15
    }

    // --- Phase 2 (25–75%): Charging — rings rise, color shifts, intensity builds ---
    else if (t < 0.75) {
      const p = (t - 0.25) / 0.5
      if (surfMat) {
        const pulse = Math.sin(p * Math.PI * (6 + p * 10)) * 0.5 + 0.5
        surfMat.emissiveIntensity = 2.0 + pulse * 2.0
        const hue = 0.52 - p * 0.19 // teal → green
        surfMat.emissive.setHSL(hue, 1.0, 0.45 + pulse * 0.1)
      }
      // Rings rise + scale + color shift
      rings.forEach((ring, i) => {
        const offset = i * 0.15
        const rp2 = Math.max(0, Math.min(1, (p - offset) / (1 - offset)))
        ring.position.y = 0.15 + rp2 * 2.8
        ring.scale.setScalar(1 + rp2 * 0.5)
        const hue = 0.52 - rp2 * 0.19
        ringMats[i].color.setHSL(hue, 1.0, 0.55)
        ringMats[i].opacity = 0.7 * (1 - rp2 * 0.4)
      })
      // Beam pulses
      beamMat.opacity = 0.15 + Math.sin(p * Math.PI * 8) * 0.1
      beamMat.color.setHSL(0.52 - p * 0.19, 0.9, 0.6)
    }

    // --- Phase 3 (75–100%): Completion — burst, settle, rings dissolve ---
    else {
      const p = (t - 0.75) / 0.25
      if (surfMat) {
        const burst = Math.pow(1 - p, 2)
        surfMat.emissiveIntensity = 0.8 + burst * 4.0
        surfMat.emissive.setHSL(0.33, 1.0, 0.45 + burst * 0.15) // green
      }
      // Rings burst upward and fade out
      rings.forEach((ring, i) => {
        ring.position.y = 3.0 + p * 2.0
        ring.scale.setScalar(1.5 + p * 1.5)
        ringMats[i].opacity = Math.max(0, 0.5 * (1 - p * 1.2))
      })
      // Beam fades out
      beamMat.opacity = Math.max(0, 0.15 * (1 - p))
    }

    // Robot body glow during charging (subtle)
    if (robotMesh) {
      robotMesh.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (child === robotEyeMeshes[0] || child === robotEyeMeshes[1]) return
          if (child === robotChargeBar) return
          if (t < 1) {
            child.material.emissiveIntensity = Math.max(child.material.emissiveIntensity,
              0.05 + Math.sin(t * Math.PI * 6) * 0.03)
          }
        }
      })
    }

    if (t < 1) {
      requestAnimationFrame(animate)
    } else {
      // Cleanup: remove temporary meshes
      rings.forEach(r => { scene.remove(r); r.geometry.dispose() })
      ringMats.forEach(m => m.dispose())
      scene.remove(beam); beam.geometry.dispose(); beamMat.dispose()
      if (surfMat) { surfMat.emissiveIntensity = 0.8; surfMat.emissive.setHex(0x26c6da) }
      isChargingActive = false
    }
  }
  animate()
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

  applyReflectionState()

  // Events
  EventBus.on('battery:updated', (l: number) => { ui.updateBatteryUI(l); updateRobotChargeIndicator(l); updateEnergyPanel(l) })
  EventBus.on('battery:critical', () => {
    ui.showMissionAlert('🔋', 'Batarya kritik seviyede!', 'danger', 5000)
  })
  EventBus.on('door:opening', () => {
    animateDoorOpening()
    logPanel.addEntry('event', 'Garaj kapısı açılıyor')
    ui.showMissionAlert('🚪', 'Kapı açılıyor!', 'success', 4000)
  })
  EventBus.on('button:pressed', () => {
    soundManager.playButtonPress()
    logPanel.addEntry('command', 'Butona basıldı')
    ui.showMissionAlert('🔘', 'Butona basıldı!', 'info', 3000)

    // Button press animation
    if (buttonScreenMesh && buttonScreenMat) {
      const isLeft = BUTTON_POS.x < GRID_CENTER_X
      const pushDir = isLeft ? 1 : -1
      const origX = buttonScreenMesh.position.x
      const origColor = 0xFFEA00
      const pressedColor = 0x4CAF50  // yellow → green

      // Phase 1: Push in (0-150ms)
      const startTime = Date.now()
      const animatePress = () => {
        const elapsed = Date.now() - startTime
        if (elapsed < 150) {
          // Push button into wall
          const t = elapsed / 150
          buttonScreenMesh!.position.x = origX - pushDir * 0.04 * t
          buttonScreenMat!.emissiveIntensity = 2.5 + t * 4
          requestAnimationFrame(animatePress)
        } else if (elapsed < 400) {
          // Hold pressed + change color to green
          buttonScreenMat!.color.setHex(pressedColor)
          buttonScreenMat!.emissive.setHex(pressedColor)
          buttonScreenMat!.emissiveIntensity = 6
          if (buttonZoneMat) {
            buttonZoneMat.color.setHex(pressedColor)
            buttonZoneMat.emissive.setHex(pressedColor)
            buttonZoneMat.opacity = 0.8
          }
          requestAnimationFrame(animatePress)
        } else if (elapsed < 700) {
          // Release: spring back out
          const t = (elapsed - 400) / 300
          buttonScreenMesh!.position.x = origX - pushDir * 0.04 * (1 - t)
          buttonScreenMat!.emissiveIntensity = 6 - t * 3.5
          requestAnimationFrame(animatePress)
        } else {
          // Final state: stays green (door is opening)
          buttonScreenMesh!.position.x = origX
          buttonScreenMat!.emissiveIntensity = 2.5
        }
      }
      animatePress()
    }
  })
  EventBus.on('robot:on_charging_pad', () => {
    playChargingAnimation()
    if (particles) particles.emitChargeSparks(new THREE.Vector3(CHARGE_POS.x, 0.3, CHARGE_POS.y), 25)
    logPanel.addEntry('event', 'Şarj istasyonuna bağlandı')
    ui.showMissionAlert('🔌', 'Şarj istasyonuna bağlandı!', 'info', 3000)
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
    // Update exec info panel instead of showing toast
    execStepCount = data.index + 1
    const costMap: Record<string, number> = {
      MOVE_FORWARD: BATTERY_COST.MOVE_FORWARD,
      MOVE_BACKWARD: BATTERY_COST.MOVE_BACKWARD,
      TURN_LEFT: BATTERY_COST.TURN_LEFT,
      TURN_RIGHT: BATTERY_COST.TURN_RIGHT,
      PRESS_BUTTON: BATTERY_COST.PRESS_BUTTON,
      CHARGE: BATTERY_COST.CHARGE,
    }
    execEnergyUsed += costMap[data.type] ?? 0
    updateExecInfoPanel(data.type)
  })

  EventBus.on('battery:dead', () => {
    setChargingCableConnected(false)
    isChargingActive = false
    chargePulseUntil = 0
    isExecuting = false; gameState = GameState.FAILED
    blocklyMgr.clearHighlight()
    ui.showFailure('BIG-BOT\'un bataryası bitti! Daha verimli bir rota dene.')
    ui.showMissionAlert('💀', 'Batarya bitti!', 'danger', 5000)
    logPanel.addEntry('error', 'Batarya bitti! Görev başarısız.')
  })

  EventBus.on('battery:full', () => {
    setChargingCableConnected(false)
    isChargingActive = false
    chargePulseUntil = 0
    ui.updateBatteryUI(100)
    gameState = GameState.COMPLETE
    ui.showMissionAlert('⚡', 'Batarya %100 dolu!', 'success', 4000)
    blocklyMgr.clearHighlight()

    // Celebration: happy expression + jump
    EventBus.emit('robot:expression', EyeExpression.HAPPY)
    logPanel.addEntry('success', 'Batarya %100 dolu!')
    const jumpDur = 1200
    const startY = robotMesh.position.y
    const startRot = robotMesh.rotation.y
    const startTime = Date.now()
    const jumpAnim = () => {
      const t = Math.min((Date.now() - startTime) / jumpDur, 1)
      const jumpH = Math.sin(t * Math.PI) * 1.5
      robotMesh.position.y = startY + jumpH
      robotMesh.rotation.y = startRot + t * Math.PI * 4
      if (t < 1) requestAnimationFrame(jumpAnim)
      else {
        robotMesh.position.y = startY
        robotMesh.rotation.y = startRot
      }
    }
    jumpAnim()
  })

  EventBus.on('program:stopped', () => {
    isExecuting = false
    blocklyMgr.clearHighlight()
    if (!isRobotOnChargingPad()) setChargingCableConnected(false)
    ui.updateStatus('Durduruldu', 'ready')
  })
  EventBus.on('program:complete', () => {
    isExecuting = false; blocklyMgr.clearHighlight(); ui.updateStatus('Tamamlandı', 'ready')
    // Check mission win condition (allow COMPLETE state too — battery:full may have set it already)
    if (gameState !== GameState.FAILED) {
      const alreadyComplete = gameState === GameState.COMPLETE
      if (alreadyComplete || missionMgr.checkWinCondition(robot, grid, battery)) {
        if (!alreadyComplete) {
          gameState = GameState.COMPLETE
        }
        const score = missionMgr.completeCurrentMission(executor.getCommands().length, battery.getCurrentLevel())
        const missionIdx = missionMgr.getCurrentIndex()
        const missionNum = missionIdx + 1
        const chapterMissions = missionMgr.getCurrentChapterMissions()
        const currentMission = missionMgr.getCurrentMission()
        const chapterIdx = chapterMissions.findIndex(m => m.id === currentMission.id)
        const isLastMissionInChapter = chapterIdx === chapterMissions.length - 1
        console.log('[MISSION] completed:', currentMission.id, 'chapterIdx:', chapterIdx, '/', chapterMissions.length, 'isLast:', isLastMissionInChapter)

        // Immediately update card to completed (green)
        updateMissionStarsDisplay()
        loadMissionUI()

        // Show confetti
        if (particles) {
          particles.emitConfetti(robotMesh.position.clone(), 50)
          particles.emitChargeSparks(robotMesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 30)
        }

        logPanel.addEntry('success', `${missionNum}. Görev tamamlandı!`)

        if (isLastMissionInChapter) {
          // FINAL MISSION: big modal
          setTimeout(() => {
            ui.showFinalSuccess('HAZIRSIN! ŞEHİR SENİ BEKLİYOR!', score.commandsUsed, score.batteryRemaining)
            setTimeout(() => {
              EventBus.emit('mission:autoAdvance')
            }, 3700)
          }, 1200)
        } else {
          // INTERMEDIATE MISSION: card banner
          ui.showCardSuccess(missionNum)
          setTimeout(() => {
            ui.hideCardSuccess()
            EventBus.emit('mission:autoAdvance')
          }, 2000)
        }
      }
    }
  })
  EventBus.on('command:error', (d: { index: number, message: string }) => {
    blocklyMgr.highlightError(d.index)
    const msg = getFullErrorMessage(d.message) || d.message
    const isWallCollision = d.message === 'wall_ahead' || d.message === 'wall_behind'

    if (isWallCollision) {
      // Soft collision sound
      soundManager.playWallCollision()
      // Educational crash modal
      ui.showCrashModal('Robot duvara çarptı. İlerlemeden önce yönünü ve adım sayını kontrol et.')
      // Soft screen flash
      ui.showCollisionFlash()
      // Robot worried expression
      EventBus.emit('robot:expression', EyeExpression.WORRIED)

      // Gentle camera shake (reduced intensity)
      const origCamPos = camera.position.clone()
      const shakeStart = Date.now()
      const cameraShake = () => {
        const elapsed = Date.now() - shakeStart
        const t = Math.min(elapsed / 350, 1)
        const decay = 1 - t
        camera.position.x = origCamPos.x + (Math.random() - 0.5) * 0.12 * decay
        camera.position.y = origCamPos.y + (Math.random() - 0.5) * 0.12 * decay
        if (t < 1) requestAnimationFrame(cameraShake)
        else camera.position.copy(origCamPos)
      }
      cameraShake()

      // Robot red flash (brief color change)
      if (robotMesh) {
        const flashMats: { mat: THREE.MeshStandardMaterial, origColor: THREE.Color }[] = []
        robotMesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
            if (mat && mat.isMeshStandardMaterial && mat.color) {
              flashMats.push({ mat, origColor: mat.color.clone() })
            }
          }
        })
        // Flash red
        const flashColor = new THREE.Color(0xff4444)
        flashMats.forEach(f => f.mat.color.copy(flashColor))
        setTimeout(() => {
          flashMats.forEach(f => f.mat.color.copy(f.origColor))
        }, 200)
      }

      // Small collision particles at contact point
      if (robotMesh) {
        const dir = robot.getDirection()
        const ox = dir === 90 ? 0.5 : dir === 270 ? -0.5 : 0
        const oz = dir === 0 ? -0.5 : dir === 180 ? 0.5 : 0
        const contactPoint = robotMesh.position.clone().add(new THREE.Vector3(ox, 0.5, oz))
        particles.emitChargeSparks(contactPoint, 12)
      }

      // Gentle recoil animation
      if (robotMesh) {
        const origX = robotMesh.position.x, origZ = robotMesh.position.z
        const origRotY = robotMesh.rotation.y
        const dir = robot.getDirection()
        const bx = dir === 0 ? 0 : dir === 180 ? 0 : dir === 90 ? 0.2 : -0.2
        const bz = dir === 0 ? -0.2 : dir === 180 ? 0.2 : 0
        const bStart = Date.now()
        const bounce = () => {
          const t = Math.min((Date.now() - bStart) / 400, 1)
          const bump = Math.sin(t * Math.PI) * (1 - t * 0.6)
          robotMesh.position.x = origX + bx * bump
          robotMesh.position.z = origZ + bz * bump
          robotMesh.rotation.y = origRotY + Math.sin(t * Math.PI * 2) * 0.03 * (1 - t)
          if (t < 1) requestAnimationFrame(bounce)
          else {
            robotMesh.position.x = origX; robotMesh.position.z = origZ
            robotMesh.rotation.y = origRotY
          }
        }; bounce()
      }
    } else {
      ui.showToast(`Komut ${d.index + 1}: ${msg}`, 'error')
      // Generic bounce
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
    }

    ui.updateStatus('Hata!', 'error')
    logPanel.addEntry('error', `Komut ${d.index + 1}: ${msg}`)
  })

  EventBus.on('robot:expression', (expr: string) => {
    if (gameState === GameState.INTRO) return;

    // Cancel line mode if active
    isLineMode = false; lineModeProgress = 0; eyeLineModeTimer = 0
    robotPupils.forEach(p => { p.visible = true })
    robotGlints.forEach(g => { g.visible = true })

    robotEyeMeshes.forEach(eye => {
      eye.scale.set(1, 1, 1);
      eye.position.y = 0.52;
    });

    // Reset brows
    robotBrowMeshes.forEach(b => { b.rotation.z = 0; b.position.y = 0.64 })

    if (expr === 'HAPPY') {
      robotEyeMeshes.forEach(eye => { eye.scale.set(1.4, 0.35, 1); });
      robotBrowMeshes.forEach(b => { b.rotation.z = 0; b.position.y = 0.66 })
      drawRobotScreenFace('happy')
    } else if (expr === 'WORRIED') {
      robotEyeMeshes.forEach(eye => { eye.scale.set(0.8, 1.2, 1); eye.position.y = 0.54; });
      robotBrowMeshes.forEach(b => { b.rotation.z = 0; b.position.y = 0.62 })
      drawRobotScreenFace('worried')
    } else if (expr === 'EXCITED') {
      robotEyeMeshes.forEach(eye => { eye.scale.set(1.5, 1.5, 1); });
      robotBrowMeshes.forEach(b => { b.rotation.z = 0; b.position.y = 0.68 })
      drawRobotScreenFace('happy')
    } else {
      drawRobotScreenFace('idle')
    }
  })

  blinkTimer = 0
  blinkProgress = 0
  nextBlinkAt = 1.8 + Math.random() * 2.8
  isBlinking = false
  isLineMode = false; lineModeProgress = 0; eyeLineModeTimer = 0
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
  updateEyeLineMode(0.016)
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
    // Billboard: floating bar faces camera (Y-axis only, never tilts)
    const barGroup = robotMesh.getObjectByName('floatingBarGroup')
    if (barGroup && camera) {
      const barWorldPos = new THREE.Vector3()
      barGroup.getWorldPosition(barWorldPos)
      // Get direction to camera on XZ plane only
      const dx = camera.position.x - barWorldPos.x
      const dz = camera.position.z - barWorldPos.z
      const angle = Math.atan2(dx, dz)
      // Convert world Y rotation to local: subtract parent (robot) Y rotation
      const parentRot = robotMesh.rotation.y
      barGroup.rotation.set(0, angle - parentRot, 0)
    }
    // Antenna RGB color cycling + blink
    if (antennaBallMat) {
      const rgbColor = new THREE.Color()
      if (isAntennaBlinking) {
        // Fast RGB + on/off blink during movement
        const hue = (time * 2) % 1
        rgbColor.setHSL(hue, 1, 0.5)
        const blink = Math.sin(time * 12) > 0 ? 5.0 : 0.3
        antennaBallMat.color.copy(rgbColor)
        antennaBallMat.emissive.copy(rgbColor)
        antennaBallMat.emissiveIntensity = blink
      } else {
        // Slow pastel rainbow when idle
        const hue = (time * 0.15) % 1
        rgbColor.setHSL(hue, 0.9, 0.55)
        antennaBallMat.color.copy(rgbColor)
        antennaBallMat.emissive.copy(rgbColor)
        const heartbeat = Math.pow(Math.sin(time * 2.5) * 0.5 + 0.5, 2)
        antennaBallMat.emissiveIntensity = 1.5 + heartbeat * 3.5
      }
      // Sync ring color
      if (antennaRingMat) {
        antennaRingMat.color.copy(rgbColor)
        antennaRingMat.emissive.copy(rgbColor)
      }
    }
    if (robotAntennaMesh) {
      robotAntennaMesh.rotation.z = Math.sin(time * 2.5) * 0.03
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
    // (billboard handled above in floatingBarGroup Y-axis rotation)
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
    // Get robot's forward direction (it faces -Z by default, so its rotation affects this)
    const rot = robotMesh.rotation.y
    const dx = Math.sin(rot)
    const dz = Math.cos(rot)

    if (garageMode === 'closed') {
      // Third-person view: behind the robot, looking forward
      const camDist = 7.0 // Distance behind (increased for taller roof and wider view)

      // Calculate ideal camera position (behind robot)
      let idealX = rp.x - dx * camDist
      let idealZ = rp.z - dz * camDist

      // Clamp bounds so camera doesn't go through walls (allow a bit closer to walls since roof is higher)
      // Sadece robot (veya kamera) garajın içindeyken duvar sınırlarını uygula
      // (Böylece robot dışarı çıkıp şarj olduğunda kamera zorla garaj içine hapsolup tavanı/duvarları delmez)
      if (rp.z < GARAGE_DEPTH) {
        idealX = Math.max(0.5, Math.min(GRID_W - 1.5, idealX))
        idealZ = Math.max(1.0, Math.min(GARAGE_DEPTH - 0.5, idealZ))
      } else {
        // Robot dışarıdaysa harita sınırlarını (GRID_W, GRID_H vb.) aşmamasını sağla
        idealX = Math.max(0.0, Math.min(GRID_W, idealX))
        idealZ = Math.max(GARAGE_DEPTH, Math.min(GRID_H + 2, idealZ))
      }

      // Higher camera angle since the wall is taller (WALL_H is now 4.5)
      // Tavan sınırını aşmamak için 4.3'e sabitlendi (önceki 8.0 çatıyı deliyordu)
      _tmpVec3A.set(idealX, rp.y + 4.3, idealZ)
      camera.position.lerp(_tmpVec3A, 0.08)

      // Target slightly ahead of the robot
      _tmpVec3B.set(rp.x + dx * 2, rp.y + 0.2, rp.z + dz * 2)
      controls.target.lerp(_tmpVec3B, 0.08)
    } else {
      // High overhead-behind angle for open mode
      _tmpVec3A.set(rp.x + 4, rp.y + 14, rp.z - 9)
      camera.position.lerp(_tmpVec3A, 0.04)
      _tmpVec3B.set(rp.x, rp.y + 0.2, rp.z)
      controls.target.lerp(_tmpVec3B, 0.04)
    }
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

  // Re-enable orbit controls
  controls.enableRotate = true; controls.enableZoom = true; controls.enablePan = true
  controls.enableDamping = true

  // Ensure eyes are fully on
  robotEyeMeshes.forEach(eye => {
    eye.scale.y = 1;
    if (eye.material instanceof THREE.MeshStandardMaterial) eye.material.emissiveIntensity = 2;
  });
  robotEyeLights.forEach(l => l.intensity = 0.4);
  if (robotChargeRingMat) robotChargeRingMat.emissiveIntensity = 0.6;

  // Apply garage mode settings (roof, lights) without camera snap
  const roofVisible = garageMode === 'closed'
  if (garageRoofGroup) garageRoofGroup.visible = roofVisible
  if (mainAmbientLight) mainAmbientLight.intensity = (garageMode === 'closed' ? 1.5 : 0.35) * lightMultiplier
  controls.maxPolarAngle = roofVisible ? Math.PI / 2.25 : Math.PI / 2.05

  // Animate camera from close-up to overview
  const pose = getPrimaryCameraPose()
  animateCameraTo(pose.pos, pose.target, 2000)
})

// Panel toggle
document.getElementById('toggle-panel-btn')!.addEventListener('click', () => {
  isPanelOpen = !isPanelOpen
  document.getElementById('coding-panel')!.classList.toggle('collapsed', !isPanelOpen)
  document.getElementById('toggle-panel-btn')!.innerHTML = isPanelOpen ? '<span class="toggle-icon">☰</span> Kodlama' : '<span class="toggle-icon">☰</span> Paneli Aç'
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
// RUN TOGGLE — Çalıştır / Durdur
document.getElementById('btn-run-toggle')!.addEventListener('click', async () => {
  const btn = document.getElementById('btn-run-toggle') as HTMLButtonElement

  // STOP branch
  if (isExecuting) {
    executor.stop(); isExecuting = false; isAntennaBlinking = false
    blocklyMgr.clearHighlight()
    cameraMode = previousCameraMode
    if (cameraMode === 'overview') {
      const pose = getPrimaryCameraPose()
      animateCameraTo(pose.pos, pose.target, 800)
    }
    ui.updateStatus('Durduruldu', 'ready')
    ui.showToast('⏹ Durduruldu', 'warning')
    btn.classList.remove('running')
    btn.innerHTML = '<span>🚀</span> Çalıştır'
    return
  }

  // START branch
  if (gameState === GameState.INTRO) { ui.showToast('Önce göreve başlayın!', 'warning'); return }
  const cmds = executor.getCommands().length
  if (cmds === 0) { ui.showToast('Blok ekleyin!', 'warning'); return }
  if (battery.getCurrentLevel() <= 0) {
    ui.showFailure('Batarya tamamen bitti! Sıfırla ve tekrar dene.')
    gameState = GameState.FAILED; return
  }

  isExecuting = true
  btn.classList.add('running')
  btn.innerHTML = '⏹ Durdur'
  previousCameraMode = cameraMode
  cameraMode = 'follow'
  if (gameState === GameState.READY || gameState === GameState.DOOR_OPENED) {
    ui.updateStatus('Çalışıyor...', 'executing')
  }

  // Initialize and show exec info panel
  execStepCount = 0
  execTotalSteps = cmds
  execEnergyUsed = 0
  updateExecInfoPanel()
  showExecInfoPanel()

  const result = await executor.execute(robot, grid, battery)

  if (result.stopped) {
    ui.updateStatus('Durduruldu', 'ready')
  } else if (!result.success && (gameState as unknown) !== GameState.FAILED) {
    ui.updateStatus('Başarısız', 'error')
  }

  isExecuting = false
  isAntennaBlinking = false
  btn.classList.remove('running')
  btn.innerHTML = '<span>🚀</span> Çalıştır'
  cameraMode = previousCameraMode
  if (cameraMode === 'overview') {
    const pose = getPrimaryCameraPose()
    animateCameraTo(pose.pos, pose.target, 800)
  }
  ui.updatePositionDisplay(robot)
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

// CRASH MODAL — Tekrar Dene
document.getElementById('crash-retry-btn')!.addEventListener('click', () => {
  ui.hideCrashModal()
  resetSimulationState()
  blocklyMgr.clearHighlight()
  const btn = document.getElementById('btn-run-toggle') as HTMLButtonElement
  btn.classList.remove('running')
  btn.innerHTML = '<span>🚀</span> Çalıştır'
  ui.showToast('🔄 Tekrar denemeye hazır!', 'info')
})

// CRASH MODAL — Koda Geri Dön
document.getElementById('crash-continue-btn')!.addEventListener('click', () => {
  ui.hideCrashModal()
  EventBus.emit('robot:expression', EyeExpression.NORMAL)
  const btn = document.getElementById('btn-run-toggle') as HTMLButtonElement
  btn.classList.remove('running')
  btn.innerHTML = '<span>🚀</span> Çalıştır'
  ui.showToast('✏️ Kodunu düzenle ve tekrar dene', 'info')
})

// LOAD SAMPLE CODE
document.getElementById('btn-load-code')!.addEventListener('click', () => {
  if (isExecuting) return
  blocklyMgr.loadSampleSolution()
  ui.showToast('💡 Örnek kod yüklendi!', 'success')
})

// LOAD WALL CRASH DEMO
document.getElementById('btn-load-crash')!.addEventListener('click', () => {
  if (isExecuting) return
  blocklyMgr.loadWallCrashDemo()
  ui.showToast('💥 Duvara çarpma testi yüklendi!', 'warning')
})

// ═══════════════════════════════════════════
// MISSION NAVIGATION
// ═══════════════════════════════════════════
function loadMissionUI() {
  const mission = missionMgr.getCurrentMission()
  const idx = missionMgr.getCurrentIndex()
  ui.updateMission(idx + 1, mission.title, mission.description)

  // Hide hint (direction info not needed)
  const hintEl = document.getElementById('mission-hint')
  if (hintEl) {
    hintEl.style.display = 'none'
  }

  // Nav buttons — only allow next if current mission is completed
  const prevBtn = document.getElementById('mission-prev') as HTMLButtonElement
  const nextBtn = document.getElementById('mission-next') as HTMLButtonElement
  if (prevBtn) prevBtn.disabled = idx === 0
  const isLastMission = idx >= missionMgr.getTotalMissions() - 1
  const currentCompleted = missionMgr.isMissionCompleted(idx)
  if (nextBtn) nextBtn.disabled = isLastMission || !currentCompleted

  updateMissionStarsDisplay()
}

function updateMissionStarsDisplay() {
  const idx = missionMgr.getCurrentIndex()
  const starsEl = document.getElementById('mission-stars')
  if (starsEl) starsEl.style.display = 'none'
  const card = document.getElementById('mission-card')
  if (missionMgr.isMissionCompleted(idx)) {
    card?.classList.add('completed')
  } else {
    card?.classList.remove('completed')
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
  if (idx < missionMgr.getTotalMissions() - 1 && missionMgr.isMissionCompleted(idx)) switchToMission(idx + 1)
})

// Success: auto-advance to next mission after modal dismisses (3s total)
EventBus.on('mission:autoAdvance', () => {
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

// Reflection toggle
let reflectionEnabled = false
const reflectionToggleBtn = document.getElementById('btn-reflection-toggle')

function applyReflectionState() {
  const updateMaterial = (child: THREE.Object3D) => {
    if (child.name === 'fps_heavy_light') {
      child.visible = reflectionEnabled
    }
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      if (child.name.startsWith('tile_') || child.name.startsWith('outdoor_tile')) {
        child.material.roughness = reflectionEnabled ? 0.25 : 0.9
        child.material.metalness = reflectionEnabled ? 0.40 : 0.05
        child.material.needsUpdate = true
      }
    }
  }
  if (garageGroup) garageGroup.traverse(updateMaterial)
  scene.traverse(updateMaterial)
}

if (reflectionToggleBtn) {
  reflectionToggleBtn.textContent = '🌑 Kapalı'
  reflectionToggleBtn.classList.remove('active')
}
reflectionToggleBtn?.addEventListener('click', () => {
  reflectionEnabled = !reflectionEnabled
  applyReflectionState()
  reflectionToggleBtn.textContent = reflectionEnabled ? '✨ Açık' : '🌑 Kapalı'
  reflectionToggleBtn.classList.toggle('active', reflectionEnabled)
})
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
updateEnergyPanel()
renderLoop()

// Intro: animate robot eyes opening after 800ms
setTimeout(() => {
  if (gameState !== GameState.INTRO) return
  const eyeStart = performance.now()
  const eyeDur = 600
  const animateEyeOpen = () => {
    const t = Math.min(1, (performance.now() - eyeStart) / eyeDur)
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    robotEyeMeshes.forEach(eye => {
      eye.scale.y = 0.1 + 0.9 * e
      if (eye.material instanceof THREE.MeshStandardMaterial) eye.material.emissiveIntensity = 2.5 * e
    })
    robotEyeLights.forEach(l => l.intensity = 0.4 * e)
    if (robotChargeRingMat) robotChargeRingMat.emissiveIntensity = 0.6 * e
    if (t < 1) requestAnimationFrame(animateEyeOpen)
  }
  requestAnimationFrame(animateEyeOpen)
}, 800)
