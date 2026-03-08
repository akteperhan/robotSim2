import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface GarageConfig {
    GRID_W: number
    GARAGE_DEPTH: number
    GRID_CENTER_X: number
    WALL_H: number
    DOOR_ROW: number
    BUTTON_X?: number
    BUTTON_Y?: number
    START_Y?: number
    CHARGE_X?: number
    CHARGE_Y?: number
}

export function createGarage(config: GarageConfig) {
    const garageGroup = new THREE.Group()
    const garageW = config.GRID_W + 0.6
    const backZ = -0.7
    const frontZ = config.DOOR_ROW
    const sideDepth = frontZ - backZ
    const midZ = (backZ + frontZ) / 2
    const garageCenterX = (-0.72 + (config.GRID_W - 0.28)) / 2

    // ── GeomCollector for geometry merging ──
    function normalize(geom: THREE.BufferGeometry): THREE.BufferGeometry {
        const g = geom.index ? geom.toNonIndexed() : geom
        if (!g.getAttribute('normal')) g.computeVertexNormals()
        const keep = new Set(['position', 'normal', 'uv'])
        for (const name of Object.keys(g.attributes)) {
            if (!keep.has(name)) g.deleteAttribute(name)
        }
        return g
    }

    const gc = new Map<string, { mat: THREE.Material, geoms: THREE.BufferGeometry[], castShadow: boolean, receiveShadow: boolean }>()
    function collect(key: string, mat: THREE.Material, geom: THREE.BufferGeometry, castShadow = false, receiveShadow = false) {
        if (!gc.has(key)) gc.set(key, { mat, geoms: [], castShadow, receiveShadow })
        const b = gc.get(key)!
        b.geoms.push(normalize(geom))
        if (castShadow) b.castShadow = true
        if (receiveShadow) b.receiveShadow = true
    }

    const rgc = new Map<string, { mat: THREE.Material, geoms: THREE.BufferGeometry[], castShadow: boolean, receiveShadow: boolean }>()
    function collectRoof(key: string, mat: THREE.Material, geom: THREE.BufferGeometry, castShadow = false, receiveShadow = false) {
        if (!rgc.has(key)) rgc.set(key, { mat, geoms: [], castShadow, receiveShadow })
        const b = rgc.get(key)!
        b.geoms.push(normalize(geom))
        if (castShadow) b.castShadow = true
        if (receiveShadow) b.receiveShadow = true
    }

    // ═══════════════════════════════════════════
    // MATERIAL PALETTE — Semi-Realistic Industrial
    // ═══════════════════════════════════════════
    const extCladdingMat = new THREE.MeshStandardMaterial({ color: 0xb0b4b8, roughness: 0.5, metalness: 0.4 })
    const intWallMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d4, roughness: 0.6, metalness: 0.1 })
    const revealMat = new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.7, metalness: 0.2 })
    const structSteelMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.4, metalness: 0.6 })
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.8, metalness: 0.0 })
    const epoxyFloorMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.1 })
    const safetyYellowMat = new THREE.MeshStandardMaterial({ color: 0xf0c040, roughness: 0.6, emissive: 0xf0c040, emissiveIntensity: 0.1 })
    const safetyBlackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })
    const conduitMat = new THREE.MeshStandardMaterial({ color: 0x707070, roughness: 0.5, metalness: 0.3 })
    const firePipeMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5, metalness: 0.2 })
    const contactShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })
    const roofBeamMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.4, metalness: 0.55 })
    const roofPanelMat = new THREE.MeshStandardMaterial({ color: 0x8a8e94, roughness: 0.5, metalness: 0.45 })

    // ═══════════════════════════════════════════
    // FLOOR — Epoxy with concrete base
    // ═══════════════════════════════════════════
    const slabGeom = new THREE.BoxGeometry(garageW + 0.7, 0.14, sideDepth + 0.2)
    slabGeom.translate(garageCenterX, -0.11, midZ)
    collect('floor', epoxyFloorMat, slabGeom, false, true)

    // Concrete base band around perimeter
    for (const [w, h, d, px, py, pz] of [
        [garageW + 0.2, 0.15, 0.08, garageCenterX, 0.075, -0.53],
        [garageW + 0.2, 0.15, 0.08, garageCenterX, 0.075, frontZ - 0.5],
        [0.08, 0.15, sideDepth - 0.5, -0.55, 0.075, midZ],
        [0.08, 0.15, sideDepth - 0.5, config.GRID_W - 0.41, 0.075, midZ],
    ] as [number, number, number, number, number, number][]) {
        const g = new THREE.BoxGeometry(w, h, d)
        g.translate(px, py, pz)
        collect('concreteBase', concreteMat, g)
    }

    // Safety line at door threshold
    const threshG = new THREE.BoxGeometry(garageW - 1, 0.01, 0.08)
    threshG.translate(garageCenterX, 0.005, frontZ - 0.7)
    collect('safetyYellow', safetyYellowMat, threshG)

    // Anti-slip darker bands near entrance
    for (let i = 0; i < 3; i++) {
        const g = new THREE.BoxGeometry(garageW - 1.5, 0.005, 0.12)
        g.translate(garageCenterX, 0.003, frontZ - 1.0 - i * 0.3)
        collect('antiSlip', concreteMat, g, false, true)
    }

    // ═══════════════════════════════════════════
    // GRID
    // ═══════════════════════════════════════════
    const gridLineBaseMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.9, metalness: 0.1 })
    const gridLineBaseGeom = new THREE.PlaneGeometry(config.GRID_W, config.GARAGE_DEPTH)
    gridLineBaseGeom.rotateX(-Math.PI / 2)
    gridLineBaseGeom.translate((config.GRID_W - 1) / 2, -0.038, (config.GARAGE_DEPTH - 1) / 2)
    collect('gridBase', gridLineBaseMat, gridLineBaseGeom, false, true)

    const gridLineMat = new THREE.MeshStandardMaterial({
        color: 0x4fc3f7, emissive: 0x4fc3f7, emissiveIntensity: 0.3, roughness: 0.5
    })
    for (let z = 0; z <= config.GARAGE_DEPTH - 1; z++) {
        const g = new THREE.BoxGeometry(config.GRID_W - 1, 0.005, 0.02)
        g.translate((config.GRID_W - 1) / 2, -0.015, z - 0.5)
        collect('gridLines', gridLineMat, g)
    }
    for (let x = 0; x <= config.GRID_W - 1; x++) {
        const g = new THREE.BoxGeometry(0.02, 0.005, config.GARAGE_DEPTH - 1)
        g.translate(x - 0.5, -0.015, (config.GARAGE_DEPTH - 1) / 2)
        collect('gridLines', gridLineMat, g)
    }

    // ═══════════════════════════════════════════
    // TILES
    // ═══════════════════════════════════════════
    const tileNormalMat = new THREE.MeshStandardMaterial({ color: 0x8a94a8, roughness: 0.25, metalness: 0.40 })
    const tileEdgeMat = new THREE.MeshStandardMaterial({ color: 0x7a8498, roughness: 0.35, metalness: 0.30 })
    const tileStartMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, emissive: 0x4caf50, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.2 })
    const tileButtonMat = new THREE.MeshStandardMaterial({ color: 0xff9800, emissive: 0xff9800, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.2 })

    const startX = config.GRID_CENTER_X, startZ = config.START_Y ?? 3
    const buttonX = config.BUTTON_X ?? 0, buttonZ = config.BUTTON_Y ?? 7
    const chargeX = config.CHARGE_X ?? config.GRID_CENTER_X
    const chargeZ = (config.CHARGE_Y ?? (config.DOOR_ROW + 2))

    const startFrameMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a, emissive: 0x66bb6a, emissiveIntensity: 0.8, roughness: 0.3 })
    const buttonFrameMat = new THREE.MeshStandardMaterial({ color: 0xffa726, emissive: 0xffa726, emissiveIntensity: 0.8, roughness: 0.3 })

    for (let x = 0; x < config.GRID_W; x++) {
        for (let z = 0; z < config.GARAGE_DEPTH; z++) {
            const isEdge = x === 0 || x === config.GRID_W - 1 || z === 0 || z === config.GARAGE_DEPTH - 1
            const isStart = x === startX && z === startZ
            const isButton = x === buttonX && z === buttonZ

            let tileMat = isEdge ? tileEdgeMat : tileNormalMat
            let tileKey = isEdge ? 'tile_edge' : 'tile_normal'
            if (isStart) { tileMat = tileStartMat; tileKey = 'tile_start' }
            if (isButton) { tileMat = tileButtonMat; tileKey = 'tile_button' }

            const tg = new THREE.BoxGeometry(0.92, 0.04, 0.92)
            tg.translate(x, -0.02, z)
            collect(tileKey, tileMat, tg, false, true)

            if (isStart) {
                for (const [fw, fd, fx, fz] of [
                    [0.96, 0.06, 0, -0.47], [0.96, 0.06, 0, 0.47],
                    [0.06, 0.96, -0.47, 0], [0.06, 0.96, 0.47, 0]
                ] as [number, number, number, number][]) {
                    const fg = new THREE.BoxGeometry(fw, 0.02, fd)
                    fg.translate(x + fx, 0.01, z + fz)
                    collect('startFrame', startFrameMat, fg)
                }
            }
            if (isButton) {
                for (const [fw, fd, fx, fz] of [
                    [0.96, 0.06, 0, -0.47], [0.96, 0.06, 0, 0.47],
                    [0.06, 0.96, -0.47, 0], [0.06, 0.96, 0.47, 0]
                ] as [number, number, number, number][]) {
                    const fg = new THREE.BoxGeometry(fw, 0.02, fd)
                    fg.translate(x + fx, 0.01, z + fz)
                    collect('buttonFrame', buttonFrameMat, fg)
                }
            }
        }
    }

    // ═══════════════════════════════════════════
    // SAFETY STRIPES (door entrance area)
    // ═══════════════════════════════════════════
    const addChevronStripes = (cx: number, cz: number, w: number, d: number, count: number) => {
        const segW = w / count
        for (let i = 0; i < count; i++) {
            const sg = new THREE.BoxGeometry(segW * 0.45, 0.015, d)
            sg.translate(cx - w / 2 + segW * (i + 0.5), 0.005, cz)
            collect(i % 2 === 0 ? 'safetyYellow' : 'safetyBlack', i % 2 === 0 ? safetyYellowMat : safetyBlackMat, sg)
        }
    }
    // addChevronStripes calls removed per user request

    // ═══════════════════════════════════════════
    // COORDINATE PLAQUES
    // ═══════════════════════════════════════════
    const coordMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.5, emissive: 0xb0bec5, emissiveIntensity: 0.2 })
    for (let x = 0; x < config.GRID_W; x++) {
        const cg = new THREE.BoxGeometry(0.18, 0.12, 0.01)
        cg.translate(x, 0.22, -0.54)
        collect('coordPlaques', coordMat, cg)
    }
    for (let z = 0; z < config.GARAGE_DEPTH; z++) {
        const cg = new THREE.BoxGeometry(0.01, 0.12, 0.18)
        cg.translate(-0.56, 0.22, z)
        collect('coordPlaques', coordMat, cg)
    }

    // ═══════════════════════════════════════════
    // WALLS — Ribbed Metal Cladding Panels
    // ═══════════════════════════════════════════
    const wallThickness = 0.28
    const wallH = config.WALL_H + 0.45

    // Back wall core
    const bwg = new THREE.BoxGeometry(garageW + 0.75, wallH, wallThickness)
    bwg.translate(garageCenterX, wallH / 2, -0.7)
    collect('wallCore', intWallMat, bwg, true, true)

    // Side wall cores
    const lwg = new THREE.BoxGeometry(wallThickness, wallH, sideDepth)
    lwg.translate(-0.72, wallH / 2, midZ)
    collect('wallCore', intWallMat, lwg, true, false)
    const rwg = new THREE.BoxGeometry(wallThickness, wallH, sideDepth)
    rwg.translate(config.GRID_W - 0.28, wallH / 2, midZ)
    collect('wallCore', intWallMat, rwg, true, false)

    // Exterior horizontal ribbed cladding panels
    const panelH = 0.55
    const panelGap = 0.02
    const numPanels = Math.floor(wallH / (panelH + panelGap))

    // Back wall cladding (exterior face)
    for (let i = 0; i < numPanels; i++) {
        const py = panelH / 2 + i * (panelH + panelGap)
        if (py + panelH / 2 > wallH) break
        const pg = new THREE.BoxGeometry(garageW + 0.78, panelH, 0.03)
        pg.translate(garageCenterX, py, -0.85)
        collect('cladding', extCladdingMat, pg, true, false)
        // Reveal strip between panels
        if (i > 0) {
            const rg = new THREE.BoxGeometry(garageW + 0.78, panelGap, 0.025)
            rg.translate(garageCenterX, py - panelH / 2 - panelGap / 2, -0.85)
            collect('reveal', revealMat, rg)
        }
    }

    // Left wall cladding (exterior face)
    for (let i = 0; i < numPanels; i++) {
        const py = panelH / 2 + i * (panelH + panelGap)
        if (py + panelH / 2 > wallH) break
        const pg = new THREE.BoxGeometry(0.03, panelH, sideDepth + 0.1)
        pg.translate(-0.87, py, midZ)
        collect('cladding', extCladdingMat, pg, true, false)
        if (i > 0) {
            const rg = new THREE.BoxGeometry(0.03, panelGap, sideDepth + 0.1)
            rg.translate(-0.87, py - panelH / 2 - panelGap / 2, midZ)
            collect('reveal', revealMat, rg)
        }
    }

    // Right wall cladding (exterior face)
    for (let i = 0; i < numPanels; i++) {
        const py = panelH / 2 + i * (panelH + panelGap)
        if (py + panelH / 2 > wallH) break
        const pg = new THREE.BoxGeometry(0.03, panelH, sideDepth + 0.1)
        pg.translate(config.GRID_W - 0.13, py, midZ)
        collect('cladding', extCladdingMat, pg, true, false)
        if (i > 0) {
            const rg = new THREE.BoxGeometry(0.03, panelGap, sideDepth + 0.1)
            rg.translate(config.GRID_W - 0.13, py - panelH / 2 - panelGap / 2, midZ)
            collect('reveal', revealMat, rg)
        }
    }

    // Interior wall panel lines (subtle horizontal grooves)
    const intPanelLineMat = new THREE.MeshStandardMaterial({ color: 0xbababa, roughness: 0.7, metalness: 0.05 })
    for (let i = 1; i < 6; i++) {
        const py = i * 0.55
        // Back wall interior lines
        const blg = new THREE.BoxGeometry(garageW + 0.2, 0.01, 0.005)
        blg.translate(garageCenterX, py, -0.54)
        collect('intPanelLines', intPanelLineMat, blg)
        // Side walls interior lines
        const llg = new THREE.BoxGeometry(0.005, 0.01, sideDepth - 0.5)
        llg.translate(-0.55, py, midZ)
        collect('intPanelLines', intPanelLineMat, llg)
        const rlg = new THREE.BoxGeometry(0.005, 0.01, sideDepth - 0.5)
        rlg.translate(config.GRID_W - 0.42, py, midZ)
        collect('intPanelLines', intPanelLineMat, rlg)
    }

    // Concrete dado (bottom 0.3m of interior walls)
    for (const [w, h, d, px, py, pz] of [
        [garageW + 0.2, 0.30, 0.03, garageCenterX, 0.15, -0.53],
        [0.03, 0.30, sideDepth - 0.5, -0.55, 0.15, midZ],
        [0.03, 0.30, sideDepth - 0.5, config.GRID_W - 0.41, 0.15, midZ],
    ] as [number, number, number, number, number, number][]) {
        const g = new THREE.BoxGeometry(w, h, d)
        g.translate(px, py, pz)
        collect('concreteDado', concreteMat, g)
    }

    // ═══════════════════════════════════════════
    // I-BEAM COLUMNS at corners
    // ═══════════════════════════════════════════
    const flangeW = 0.18, flangeT = 0.02, webW = 0.02, webH = 0.14
    const columnH = wallH + 0.1
    const columnPositions = [
        [-0.72, backZ],
        [config.GRID_W - 0.28, backZ],
        [-0.72, frontZ - 0.2],
        [config.GRID_W - 0.28, frontZ - 0.2],
    ]
    for (const [cx, cz] of columnPositions) {
        // Web
        const wg = new THREE.BoxGeometry(webW, columnH, webH)
        wg.translate(cx, columnH / 2, cz)
        collect('steelColumns', structSteelMat, wg, true, false)
        // Front flange
        const ffg = new THREE.BoxGeometry(flangeW, columnH, flangeT)
        ffg.translate(cx, columnH / 2, cz + webH / 2)
        collect('steelColumns', structSteelMat, ffg, true, false)
        // Back flange
        const bfg = new THREE.BoxGeometry(flangeW, columnH, flangeT)
        bfg.translate(cx, columnH / 2, cz - webH / 2)
        collect('steelColumns', structSteelMat, bfg, true, false)
    }

    // ═══════════════════════════════════════════
    // LED STRIPS (accent lighting along wall tops)
    // ═══════════════════════════════════════════
    const ledStripMat = new THREE.MeshStandardMaterial({ color: 0x00BCD4, emissive: 0x00BCD4, emissiveIntensity: 0.8, roughness: 0.2 })
    for (const [w, h, d, px, py, pz] of [
        [garageW - 0.5, 0.04, 0.02, garageCenterX, config.WALL_H + 0.2, -0.54],
        [0.02, 0.04, sideDepth - 0.5, -0.56, config.WALL_H + 0.2, midZ],
        [0.02, 0.04, sideDepth - 0.5, config.GRID_W - 0.28, config.WALL_H + 0.2, midZ],
    ] as [number, number, number, number, number, number][]) {
        const lg = new THREE.BoxGeometry(w, h, d)
        lg.translate(px, py, pz)
        collect('ledStrips', ledStripMat, lg)
    }

    // ═══════════════════════════════════════════
    // DIGITAL SCREENS
    // ═══════════════════════════════════════════
    const screenBgMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.4 })
    const screenFrameMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.3, metalness: 0.6 })

    for (const sx of [garageCenterX - 2.2, garageCenterX + 2.2]) {
        const fg = new THREE.BoxGeometry(2.0, 1.2, 0.04)
        fg.translate(sx, 2.0, -0.53)
        collect('screenFrames', screenFrameMat, fg)
        const bg = new THREE.BoxGeometry(1.8, 1.0, 0.02)
        bg.translate(sx, 2.0, -0.50)
        collect('screenBgs', screenBgMat, bg)
    }

    const screenGridMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, emissive: 0x4caf50, emissiveIntensity: 1.5, roughness: 0.3 })
    for (let i = -3; i <= 3; i++) {
        const hg = new THREE.BoxGeometry(1.6, 0.008, 0.005)
        hg.translate(garageCenterX - 2.2, 2.0 + i * 0.12, -0.49)
        collect('screenGrid', screenGridMat, hg)
        const vg = new THREE.BoxGeometry(0.008, 0.8, 0.005)
        vg.translate(garageCenterX - 2.2 + i * 0.22, 2.0, -0.49)
        collect('screenGrid', screenGridMat, vg)
    }

    const barColors = [0x29b6f6, 0x66bb6a, 0xffa726, 0x29b6f6]
    barColors.forEach((bc, bi) => {
        const barW = 0.4 + Math.random() * 1.0
        const barMat = new THREE.MeshStandardMaterial({ color: bc, emissive: bc, emissiveIntensity: 1.2, roughness: 0.3 })
        const bg = new THREE.BoxGeometry(barW, 0.08, 0.005)
        bg.translate(garageCenterX + 2.2 - 0.8 + barW / 2, 2.25 - bi * 0.18, -0.49)
        collect('statusBar_' + bi, barMat, bg)
    })

    // ═══════════════════════════════════════════
    // ENTRY PORTAL — Heavy-duty steel frame
    // ═══════════════════════════════════════════
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.35, metalness: 0.6 })
    for (const [w, h, d, px, py, pz] of [
        [garageW + 0.5, 0.22, 0.18, garageCenterX, config.WALL_H + 0.16, config.DOOR_ROW - 0.44],
        [0.2, config.WALL_H + 0.2, 0.16, -0.55, (config.WALL_H + 0.2) / 2, config.DOOR_ROW - 0.44],
        [0.2, config.WALL_H + 0.2, 0.16, config.GRID_W - 0.45, (config.WALL_H + 0.2) / 2, config.DOOR_ROW - 0.44],
    ] as [number, number, number, number, number, number][]) {
        const pg = new THREE.BoxGeometry(w, h, d)
        pg.translate(px, py, pz)
        collect('portal', portalMat, pg)
    }

    // ═══════════════════════════════════════════
    // ROOF GROUP — Structural beams + corrugated panels
    // ═══════════════════════════════════════════
    const garageRoofGroup = new THREE.Group()
    const garageRoofMaterials: THREE.MeshStandardMaterial[] = []

    // Ceiling lights (LED panels)
    const ceilingLedHousing = new THREE.MeshStandardMaterial({ color: 0xd0d6de, roughness: 0.4, metalness: 0.3 })
    const ceilingLedGlow = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 1.2, roughness: 0.1 })
    const cLightX = [1.5, 4, 7, 9.5]
    const cLightZ = [1, 3.5, 6, 8.5, 11]
    for (const lz of cLightZ) {
        for (const lx of cLightX) {
            const hg = new THREE.BoxGeometry(1.2, 0.04, 0.10)
            hg.translate(lx, config.WALL_H - 0.12, lz)
            collectRoof('ceilingHousing', ceilingLedHousing, hg)
            const lg = new THREE.BoxGeometry(1.0, 0.015, 0.06)
            lg.translate(lx, config.WALL_H - 0.15, lz)
            collectRoof('ceilingLedBar', ceilingLedGlow, lg)
        }
    }

    // Fill lights
    const fill1 = new THREE.PointLight(0xfff4e0, 6.0, 30)
    fill1.name = 'fps_heavy_light'
    fill1.visible = false
    fill1.position.set(garageCenterX, config.WALL_H - 0.5, config.GARAGE_DEPTH / 3)
    garageGroup.add(fill1)
    const fill2 = new THREE.PointLight(0xfff4e0, 6.0, 30)
    fill2.name = 'fps_heavy_light'
    fill2.visible = false
    fill2.position.set(garageCenterX, config.WALL_H - 0.5, (config.GARAGE_DEPTH / 3) * 2)
    garageGroup.add(fill2)

    // 3 main structural I-beams spanning width
    const beamSpacing = sideDepth / 4
    for (let i = 1; i <= 3; i++) {
        const bz = backZ + beamSpacing * i
        // Web
        const wg = new THREE.BoxGeometry(garageW + 0.4, 0.20, 0.025)
        wg.translate(garageCenterX, config.WALL_H + 0.15, bz)
        collectRoof('roofBeams', roofBeamMat, wg, true, false)
        // Bottom flange
        const bfg = new THREE.BoxGeometry(garageW + 0.4, 0.025, 0.14)
        bfg.translate(garageCenterX, config.WALL_H + 0.05, bz)
        collectRoof('roofBeams', roofBeamMat, bfg, true, false)
        // Top flange
        const tfg = new THREE.BoxGeometry(garageW + 0.4, 0.025, 0.14)
        tfg.translate(garageCenterX, config.WALL_H + 0.275, bz)
        collectRoof('roofBeams', roofBeamMat, tfg, true, false)
    }

    // Purlins (cross-beams between main beams)
    for (let xi = 0; xi < 4; xi++) {
        const px = -0.5 + (garageW + 0.4) / 5 * (xi + 1)
        for (let i = 0; i < 5; i++) {
            const pz = backZ + beamSpacing * i / 1 * (i === 0 ? 0.5 : i === 4 ? 3.5 : i)
            if (pz < backZ || pz > frontZ) continue
            const pg = new THREE.BoxGeometry(0.02, 0.08, beamSpacing * 0.9)
            pg.translate(px, config.WALL_H + 0.10, backZ + beamSpacing * (i < 4 ? i + 0.5 : 3.5))
            collectRoof('purlins', roofBeamMat, pg)
        }
    }
    // Simpler purlin approach: evenly spaced
    for (let xi = 0; xi < 5; xi++) {
        const px = -0.3 + xi * (garageW + 0.2) / 4
        for (let zi = 0; zi < 4; zi++) {
            const pzStart = backZ + beamSpacing * zi + beamSpacing * 0.1
            const pzLen = beamSpacing * 0.8
            const pg = new THREE.BoxGeometry(0.02, 0.06, pzLen)
            pg.translate(px, config.WALL_H + 0.10, pzStart + pzLen / 2)
            collectRoof('purlins', roofBeamMat, pg)
        }
    }

    // Corrugated roof panels (alternating raised strips)
    garageRoofMaterials.push(roofPanelMat)
    const roofBaseG = new THREE.BoxGeometry(garageW + 0.8, 0.06, sideDepth + 0.26)
    roofBaseG.translate(garageCenterX, config.WALL_H + 0.32, midZ)
    collectRoof('roofBase', roofPanelMat, roofBaseG, false, true)

    // Corrugation ribs on roof
    const ribCount = Math.floor((garageW + 0.6) / 0.25)
    for (let i = 0; i < ribCount; i++) {
        const rx = -0.4 + i * 0.25
        const rg = new THREE.BoxGeometry(0.08, 0.03, sideDepth + 0.2)
        rg.translate(rx, config.WALL_H + 0.375, midZ)
        collectRoof('roofRibs', roofPanelMat, rg)
    }

    // Roof edge / drip edge trim
    const dripMat = new THREE.MeshStandardMaterial({ color: 0x4a4f5a, roughness: 0.3, metalness: 0.6 })
    for (const [w, h, d, px, py, pz] of [
        [garageW + 0.85, 0.08, 0.06, garageCenterX, config.WALL_H + 0.40, frontZ + 0.05],
        [garageW + 0.85, 0.08, 0.06, garageCenterX, config.WALL_H + 0.40, backZ - 0.15],
        [0.06, 0.08, sideDepth + 0.4, -0.90, config.WALL_H + 0.40, midZ],
        [0.06, 0.08, sideDepth + 0.4, config.GRID_W - 0.10, config.WALL_H + 0.40, midZ],
    ] as [number, number, number, number, number, number][]) {
        const g = new THREE.BoxGeometry(w, h, d)
        g.translate(px, py, pz)
        collectRoof('dripEdge', dripMat, g)
    }

    // ═══════════════════════════════════════════
    // UTILITY — Conduit runs + junction boxes
    // ═══════════════════════════════════════════
    // Conduit along upper back wall
    const conduit1 = new THREE.CylinderGeometry(0.015, 0.015, garageW - 1, 8)
    conduit1.rotateZ(Math.PI / 2)
    conduit1.translate(garageCenterX, config.WALL_H - 0.15, -0.52)
    collect('conduit', conduitMat, conduit1)

    // Conduit along upper left wall
    const conduit2 = new THREE.CylinderGeometry(0.015, 0.015, sideDepth - 2, 8)
    conduit2.rotateX(Math.PI / 2)
    conduit2.translate(-0.53, config.WALL_H - 0.15, midZ)
    collect('conduit', conduitMat, conduit2)

    // Junction boxes
    for (const [jx, jy, jz] of [
        [garageCenterX - 3, config.WALL_H - 0.15, -0.51],
        [garageCenterX + 3, config.WALL_H - 0.15, -0.51],
        [-0.52, config.WALL_H - 0.15, 5],
        [-0.52, config.WALL_H - 0.15, 12],
    ] as [number, number, number][]) {
        const jg = new THREE.BoxGeometry(0.08, 0.08, 0.04)
        jg.translate(jx, jy, jz)
        collect('junctionBox', conduitMat, jg)
    }

    // Cable tray along ceiling edge (U-profile)
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.5, metalness: 0.4 })
    // Bottom
    const ctBottom = new THREE.BoxGeometry(0.12, 0.005, sideDepth - 1)
    ctBottom.translate(config.GRID_W - 0.45, config.WALL_H - 0.05, midZ)
    collect('cableTray', trayMat, ctBottom)
    // Sides
    for (const dx of [-0.06, 0.06]) {
        const ctSide = new THREE.BoxGeometry(0.005, 0.04, sideDepth - 1)
        ctSide.translate(config.GRID_W - 0.45 + dx, config.WALL_H - 0.03, midZ)
        collect('cableTray', trayMat, ctSide)
    }

    // ═══════════════════════════════════════════
    // FIRE SUPPRESSION PIPE + SPRINKLERS
    // ═══════════════════════════════════════════
    // Removed per user request

    // ═══════════════════════════════════════════
    // PEGBOARD WITH TOOLS — back wall
    // ═══════════════════════════════════════════
    const pegboardMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8, metalness: 0.0 })
    const pbG = new THREE.BoxGeometry(1.5, 1.0, 0.03)
    pbG.translate(garageCenterX - 3.5, 1.8, -0.53)
    collect('pegboard', pegboardMat, pbG)

    // Tool silhouettes on pegboard
    const toolSilMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.6 })
    // Wrench
    const wr = new THREE.BoxGeometry(0.04, 0.35, 0.01)
    wr.translate(garageCenterX - 4.0, 1.85, -0.51)
    collect('tools', toolSilMat, wr)
    // Hammer
    const hm = new THREE.BoxGeometry(0.04, 0.30, 0.01)
    hm.translate(garageCenterX - 3.7, 1.85, -0.51)
    collect('tools', toolSilMat, hm)
    const hmHead = new THREE.BoxGeometry(0.12, 0.06, 0.01)
    hmHead.translate(garageCenterX - 3.7, 2.05, -0.51)
    collect('tools', toolSilMat, hmHead)
    // Screwdriver
    const sd = new THREE.BoxGeometry(0.025, 0.28, 0.01)
    sd.translate(garageCenterX - 3.4, 1.82, -0.51)
    collect('tools', toolSilMat, sd)
    // Pliers
    const pl = new THREE.BoxGeometry(0.06, 0.22, 0.01)
    pl.translate(garageCenterX - 3.1, 1.80, -0.51)
    collect('tools', toolSilMat, pl)

    // ═══════════════════════════════════════════
    // ELECTRICAL PANEL — side wall
    // ═══════════════════════════════════════════
    const elPanelMat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.5, metalness: 0.3 })
    const epG = new THREE.BoxGeometry(0.04, 0.55, 0.38)
    epG.translate(-0.52, 1.6, 8.5)
    collect('elPanel', elPanelMat, epG)
    // Caution stripe removed per user request

    // ═══════════════════════════════════════════
    // WORKSHOP: SHELVES (muted industrial)
    // ═══════════════════════════════════════════
    const metalShelfMat = new THREE.MeshStandardMaterial({ color: 0x505560, roughness: 0.4, metalness: 0.6 })
    for (let i = 0; i < 4; i++) {
        const sg = new THREE.BoxGeometry(0.16, 0.035, 2.4)
        sg.translate(-0.44, 0.75 + i * 0.52, 2.2)
        collect('metalShelves', metalShelfMat, sg)
        if (i === 0) {
            for (const sz of [1.0, 2.2, 3.4]) {
                const pg = new THREE.BoxGeometry(0.04, 2.3, 0.04)
                pg.translate(-0.44, 1.15, sz)
                collect('metalShelves', metalShelfMat, pg)
            }
        }
    }

    // Boxes — muted industrial colors
    const boxDefs: [number, number, number, number, number, number, number][] = [
        [-0.44, 0.82, 1.5, 0.12, 0.12, 0.18, 0x4a6070],
        [-0.44, 0.82, 2.5, 0.12, 0.08, 0.20, 0x5a6a50],
        [-0.44, 1.34, 1.5, 0.12, 0.16, 0.24, 0x3a3a44],
        [-0.44, 1.34, 2.3, 0.14, 0.14, 0.14, 0x4a5a5a],
        [-0.44, 1.86, 1.4, 0.10, 0.12, 0.20, 0x5a4a5a],
        [-0.44, 1.86, 2.5, 0.12, 0.12, 0.16, 0x8a7040],
        [-0.44, 2.38, 2.2, 0.14, 0.14, 0.22, 0x3a3a44],
    ]
    const boxByColor = new Map<number, typeof boxDefs>()
    for (const bd of boxDefs) {
        const c = bd[6]
        if (!boxByColor.has(c)) boxByColor.set(c, [])
        boxByColor.get(c)!.push(bd)
    }
    boxByColor.forEach((entries, color) => {
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 })
        for (const [bx, by, bz, bw, bh, bd] of entries) {
            const bg = new RoundedBoxGeometry(bw, bh, bd, 2, 0.01)
            bg.translate(bx, by, bz)
            collect('box_' + color.toString(16), mat, bg)
        }
    })

    // Can
    const canMat = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.3, metalness: 0.5 })
    const canG = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 16)
    canG.translate(-0.44, 1.35, 3.0)
    collect('canMetal', canMat, canG)

    // ═══════════════════════════════════════════
    // WORKSHOP: BENCH (muted)
    // ═══════════════════════════════════════════
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x3a4050, roughness: 0.55, metalness: 0.4 })
    const benchTopMat = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.7, metalness: 0.05 })
    const benchGeom = new THREE.BoxGeometry(0.18, 0.82, 2.8)
    benchGeom.translate(config.GRID_W - 0.52, 0.41, 2.4)
    collect('bench', benchMat, benchGeom)
    const btg = new THREE.BoxGeometry(0.30, 0.04, 2.9)
    btg.translate(config.GRID_W - 0.48, 0.84, 2.4)
    collect('benchTop', benchTopMat, btg)
    for (const az of [1.0, 2.4, 3.8]) {
        const lg = new THREE.BoxGeometry(0.04, 0.82, 0.04)
        lg.translate(config.GRID_W - 0.60, 0.41, az)
        collect('bench', benchMat, lg)
    }

    // Vise
    const viseMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.3, metalness: 0.8 })
    const vbg = new RoundedBoxGeometry(0.14, 0.08, 0.12, 2, 0.01)
    vbg.translate(config.GRID_W - 0.48, 0.90, 1.2)
    collect('vise', viseMat, vbg)
    const vjg = new THREE.BoxGeometry(0.04, 0.14, 0.12)
    vjg.translate(config.GRID_W - 0.48, 0.98, 1.2)
    collect('vise', viseMat, vjg)
    const vhg = new THREE.CylinderGeometry(0.01, 0.01, 0.14, 16)
    vhg.rotateZ(Math.PI / 2)
    vhg.translate(config.GRID_W - 0.40, 0.96, 1.2)
    collect('vise', viseMat, vhg)

    // Tool cabinet — dull red
    const toolCabinetMat = new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.4, metalness: 0.4 })
    const tcg = new RoundedBoxGeometry(0.22, 0.18, 0.30, 3, 0.02)
    tcg.translate(config.GRID_W - 0.48, 0.95, 2.0)
    collect('toolCabinet', toolCabinetMat, tcg)

    // Desk lamp
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.3, metalness: 0.8 })
    const lbg = new THREE.CylinderGeometry(0.06, 0.07, 0.04, 16)
    lbg.translate(config.GRID_W - 0.48, 0.88, 3.6)
    collect('lampParts', lampPoleMat, lbg)
    const lpg = new THREE.CylinderGeometry(0.015, 0.015, 0.55, 16)
    lpg.translate(config.GRID_W - 0.48, 1.15, 3.6)
    collect('lampParts', lampPoleMat, lpg)
    const lag = new THREE.CylinderGeometry(0.012, 0.012, 0.30, 16)
    lag.rotateZ(-Math.PI / 4)
    lag.translate(config.GRID_W - 0.55, 1.45, 3.6)
    collect('lampParts', lampPoleMat, lag)
    const lampShadeMat = new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.5, metalness: 0.3 })
    const lsg = new THREE.ConeGeometry(0.10, 0.08, 12)
    lsg.rotateX(Math.PI)
    lsg.translate(config.GRID_W - 0.62, 1.52, 3.6)
    collect('lampShade', lampShadeMat, lsg)
    const deskLight = new THREE.PointLight(0xfff4e0, 6, 4)
    deskLight.name = 'fps_heavy_light'
    deskLight.visible = false
    deskLight.position.set(config.GRID_W - 0.62, 1.46, 3.6)
    garageGroup.add(deskLight)

    // ═══════════════════════════════════════════
    // BIG RED CABINET + DRAWERS (weathered)
    // ═══════════════════════════════════════════
    const bigCabinetMat = new THREE.MeshStandardMaterial({ color: 0x7a1818, roughness: 0.4, metalness: 0.4 })
    const bcg = new RoundedBoxGeometry(0.48, 1.0, 0.55, 4, 0.04)
    bcg.translate(config.GRID_W - 0.65, 0.50, 4.8)
    collect('bigCabinet', bigCabinetMat, bcg)

    const drawerMat = new THREE.MeshStandardMaterial({ color: 0x5a0a0a, roughness: 0.5, metalness: 0.5 })
    const toolHandleMat = new THREE.MeshStandardMaterial({ color: 0x606870, roughness: 0.3, metalness: 0.7 })
    for (let di = 0; di < 4; di++) {
        const dg = new THREE.BoxGeometry(0.42, 0.015, 0.50)
        dg.translate(config.GRID_W - 0.65, 0.20 + di * 0.22, 4.8)
        collect('drawers', drawerMat, dg)
        const hg = new THREE.BoxGeometry(0.14, 0.02, 0.03)
        hg.translate(config.GRID_W - 0.40, 0.26 + di * 0.22, 4.8)
        collect('toolHandles', toolHandleMat, hg)
    }

    // ═══════════════════════════════════════════
    // BARRELS (weathered dark green/rust)
    // ═══════════════════════════════════════════
    const barrelMat1 = new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.6, metalness: 0.3 })
    const b1g = new THREE.CylinderGeometry(0.22, 0.24, 0.70, 16)
    b1g.translate(config.GRID_W - 0.60, 0.35, 0.4)
    collect('barrels', barrelMat1, b1g)

    // ═══════════════════════════════════════════
    // WALL POSTERS
    // ═══════════════════════════════════════════
    const posterMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 })
    const pg1 = new THREE.BoxGeometry(0.02, 0.40, 0.30)
    pg1.translate(-0.56, 2.3, 8.0)
    collect('poster', posterMat, pg1)
    const posterStripeMat = new THREE.MeshStandardMaterial({ color: 0x2196f3, roughness: 0.5 })
    const ps1 = new THREE.BoxGeometry(0.025, 0.06, 0.30)
    ps1.translate(-0.56, 2.42, 8.0)
    collect('posterStripe', posterStripeMat, ps1)

    // ═══════════════════════════════════════════
    // LAB EQUIPMENT: CONTROL PANEL
    // ═══════════════════════════════════════════
    const panelBodyMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.4, metalness: 0.6 })
    const pbodyG = new THREE.BoxGeometry(0.06, 0.8, 0.5)
    pbodyG.translate(-0.52, 1.5, 6.5)
    collect('controlPanel', panelBodyMat, pbodyG)
    const panelFrameMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.35, metalness: 0.7 })
    const pfg = new THREE.BoxGeometry(0.07, 0.84, 0.54)
    pfg.translate(-0.53, 1.5, 6.5)
    collect('panelFrame', panelFrameMat, pfg)
    const miniScreenMat = new THREE.MeshStandardMaterial({ color: 0x0d1117, emissive: 0x1565c0, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.2 })
    const mscrG = new THREE.BoxGeometry(0.065, 0.22, 0.28)
    mscrG.translate(-0.50, 1.65, 6.5)
    collect('miniScreen', miniScreenMat, mscrG)
    const panelBtnMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.3, metalness: 0.8 })
    for (let bi = 0; bi < 3; bi++) {
        const bg = new THREE.CylinderGeometry(0.018, 0.018, 0.02, 16)
        bg.rotateZ(Math.PI / 2)
        bg.translate(-0.49, 1.35 + bi * 0.06, 6.65)
        collect('panelButtons', panelBtnMat, bg)
    }

    // ═══════════════════════════════════════════
    // CHARGE UNIT
    // ═══════════════════════════════════════════
    const chargeUnitMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.4, metalness: 0.5 })
    const cug = new RoundedBoxGeometry(0.35, 0.6, 0.25, 3, 0.02)
    cug.translate(chargeX + 0.7, 0.30, chargeZ)
    collect('chargeUnit', chargeUnitMat, cug)
    const chargeCableMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
    const ccG = new THREE.CylinderGeometry(0.008, 0.008, 0.5, 16)
    ccG.rotateZ(Math.PI / 3)
    ccG.translate(chargeX + 0.4, 0.15, chargeZ)
    collect('chargeCable', chargeCableMat, ccG)
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffeb3b, emissiveIntensity: 1.5 })
    const blG = new THREE.BoxGeometry(0.04, 0.12, 0.01)
    blG.translate(chargeX + 0.70, 0.50, chargeZ + 0.13)
    collect('bolt', boltMat, blG)

    // START POINT CIRCLE removed per user request
    // ── Ceiling local lights ──
    let lightIdx = 0
    for (const lz of cLightZ) {
        for (const lx of cLightX) {
            if (lightIdx % 3 === 0) {
                const localLight = new THREE.PointLight(0xfff4e0, 6, 5)
                localLight.name = 'fps_heavy_light'
                localLight.visible = false
                localLight.position.set(lx, config.WALL_H - 0.3, lz)
                garageGroup.add(localLight)
            }
            lightIdx++
        }
    }

    // ═══════════════════════════════════════════
    // EXTERIOR: PARAPET + FASCIA
    // ═══════════════════════════════════════════
    const parapetMat = new THREE.MeshStandardMaterial({ color: 0x9a9ea4, roughness: 0.5, metalness: 0.35 })
    const copingMat = new THREE.MeshStandardMaterial({ color: 0x606468, roughness: 0.3, metalness: 0.5 })

    // Parapet walls (0.4m above roofline)
    for (const [w, h, d, px, py, pz] of [
        [garageW + 0.85, 0.40, 0.10, garageCenterX, config.WALL_H + 0.65, frontZ + 0.02],
        [garageW + 0.85, 0.40, 0.10, garageCenterX, config.WALL_H + 0.65, backZ - 0.12],
        [0.10, 0.40, sideDepth + 0.3, -0.90, config.WALL_H + 0.65, midZ],
        [0.10, 0.40, sideDepth + 0.3, config.GRID_W - 0.10, config.WALL_H + 0.65, midZ],
    ] as [number, number, number, number, number, number][]) {
        const g = new THREE.BoxGeometry(w, h, d)
        g.translate(px, py, pz)
        collect('parapet', parapetMat, g, true, false)
    }

    // Metal coping caps on top of parapets
    for (const [w, h, d, px, py, pz] of [
        [garageW + 0.90, 0.03, 0.14, garageCenterX, config.WALL_H + 0.865, frontZ + 0.02],
        [garageW + 0.90, 0.03, 0.14, garageCenterX, config.WALL_H + 0.865, backZ - 0.12],
        [0.14, 0.03, sideDepth + 0.35, -0.90, config.WALL_H + 0.865, midZ],
        [0.14, 0.03, sideDepth + 0.35, config.GRID_W - 0.10, config.WALL_H + 0.865, midZ],
    ] as [number, number, number, number, number, number][]) {
        const g = new THREE.BoxGeometry(w, h, d)
        g.translate(px, py, pz)
        collect('coping', copingMat, g)
    }

    // ═══════════════════════════════════════════
    // SIGN — Backlit box sign
    // ═══════════════════════════════════════════
    const signBoxMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.4, metalness: 0.3 })
    const signGlowMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.2
    })
    const signFrameOuterMat = new THREE.MeshStandardMaterial({ color: 0x404050, roughness: 0.3, metalness: 0.5 })

    // Sign outer frame
    const sfOuter = new RoundedBoxGeometry(4.7, 0.75, 0.12, 3, 0.04)
    sfOuter.translate(garageCenterX, config.WALL_H + 0.12, config.DOOR_ROW - 0.32)
    collect('signFrame', signFrameOuterMat, sfOuter)
    // Sign box body
    const sbG = new RoundedBoxGeometry(4.5, 0.65, 0.10, 3, 0.03)
    sbG.translate(garageCenterX, config.WALL_H + 0.12, config.DOOR_ROW - 0.30)
    collect('signBox', signBoxMat, sbG)
    // Illuminated text panel (front face)
    const stG = new RoundedBoxGeometry(3.8, 0.40, 0.02, 3, 0.02)
    stG.translate(garageCenterX, config.WALL_H + 0.12, config.DOOR_ROW - 0.24)
    collect('signGlow', signGlowMat, stG)

    // Wall-mounted floodlights flanking sign
    const floodMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.5 })
    const floodGlowMat = new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xfff4e0, emissiveIntensity: 1.0, roughness: 0.2 })
    for (const fx of [garageCenterX - 3.0, garageCenterX + 3.0]) {
        // Housing
        const fhG = new THREE.BoxGeometry(0.15, 0.10, 0.08)
        fhG.translate(fx, config.WALL_H + 0.12, config.DOOR_ROW - 0.20)
        collect('floodHousing', floodMat, fhG)
        // Lens
        const flG = new THREE.BoxGeometry(0.10, 0.06, 0.02)
        flG.translate(fx, config.WALL_H + 0.10, config.DOOR_ROW - 0.15)
        collect('floodGlow', floodGlowMat, flG)
    }

    // ═══════════════════════════════════════════
    // EXTERIOR: AC UNITS
    // ═══════════════════════════════════════════
    const acBodyMat = new THREE.MeshStandardMaterial({ color: 0xc0c4c8, roughness: 0.5, metalness: 0.4 })
    const acGrateMat = new THREE.MeshStandardMaterial({ color: 0x7a8088, roughness: 0.3, metalness: 0.6 })
    const acPipeMat = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.3, metalness: 0.8 })
    for (const [ax, ay] of [[garageCenterX - 2.5, 2.8], [garageCenterX + 1.8, 2.0]] as [number, number][]) {
        const abg = new THREE.BoxGeometry(0.9, 0.55, 0.30)
        abg.translate(ax, ay, -0.95)
        collect('acBodies', acBodyMat, abg)
        for (let gi = 0; gi < 4; gi++) {
            const agg = new THREE.BoxGeometry(0.82, 0.04, 0.22)
            agg.translate(ax, ay - 0.18 + gi * 0.12, -0.82)
            collect('acGrates', acGrateMat, agg)
        }
        const apg = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 16)
        apg.rotateZ(Math.PI / 2)
        apg.translate(ax + 0.5, ay - 0.15, -0.92)
        collect('acPipes', acPipeMat, apg)
    }

    // Drains
    const drainMat = new THREE.MeshStandardMaterial({ color: 0x4a4f5e, roughness: 0.6, metalness: 0.5 })
    for (let dx = 0; dx < 3; dx++) {
        const dg = new THREE.BoxGeometry(0.12, 0.08, 0.22)
        dg.translate(garageCenterX - 2 + dx * 2, 0.04, -1.0)
        collect('drains', drainMat, dg)
    }

    // Gutters
    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x606468, roughness: 0.25, metalness: 0.7 })
    for (const gx of [-0.90, config.GRID_W - 0.10]) {
        const gg = new THREE.CylinderGeometry(0.04, 0.04, config.WALL_H + 0.3, 16)
        gg.translate(gx, (config.WALL_H + 0.3) / 2, -0.90)
        collect('gutters', gutterMat, gg)
        const eg = new THREE.CylinderGeometry(0.045, 0.04, 0.15, 16)
        eg.rotateX(Math.PI / 4)
        eg.translate(gx, 0.08, -0.98)
        collect('gutters', gutterMat, eg)
    }

    // ═══════════════════════════════════════════
    // EXTERIOR WALL LAMPS (industrial style)
    // ═══════════════════════════════════════════
    const wallLampMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.5 })
    for (const lmpX of [-0.55, config.GRID_W - 0.45]) {
        const brg = new THREE.BoxGeometry(0.08, 0.06, 0.20)
        brg.translate(lmpX, config.WALL_H - 0.35, config.DOOR_ROW - 0.30)
        collect('wallLampBrackets', wallLampMat, brg)
        const shg = new THREE.BoxGeometry(0.14, 0.04, 0.14)
        shg.translate(lmpX, config.WALL_H - 0.28, config.DOOR_ROW - 0.22)
        collect('wallLampShades', wallLampMat, shg)
        const extLight = new THREE.PointLight(0xfff4e0, 1.5, 5)
        extLight.name = 'fps_heavy_light'
        extLight.visible = false
        extLight.position.set(lmpX, config.WALL_H - 0.3, config.DOOR_ROW - 0.15)
        garageGroup.add(extLight)
    }

    // ═══════════════════════════════════════════
    // DOOR MECHANISM
    // ═══════════════════════════════════════════
    const doorZ = config.DOOR_ROW - 0.1

    // Motor housing
    const motorG = new THREE.BoxGeometry(1.2, 0.35, 0.25)
    motorG.translate(garageCenterX, config.WALL_H + 0.05, doorZ - 0.15)
    collect('motorBox', structSteelMat, motorG)
    const drumG = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 16)
    drumG.rotateZ(Math.PI / 2)
    drumG.translate(garageCenterX, config.WALL_H + 0.05, doorZ - 0.15)
    collect('motorBox', structSteelMat, drumG)
    for (const dx of [-0.52, 0.52]) {
        const gearG = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16)
        gearG.rotateZ(Math.PI / 2)
        gearG.translate(garageCenterX + dx, config.WALL_H + 0.05, doorZ - 0.15)
        collect('motorBox', structSteelMat, gearG)
    }

    // Photoelectric sensors
    const sensorBodyMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.6 })
    for (const sx of [-0.40, config.GRID_W - 0.60]) {
        const sbG = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12)
        sbG.translate(sx, 0.3, doorZ)
        collect('sensorBodies', sensorBodyMat, sbG)
    }
    const photoSensorLaserMat = new THREE.MeshStandardMaterial({
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3.0,
        transparent: true, opacity: 0.6, roughness: 0.2
    })
    const laserG = new THREE.BoxGeometry(garageW + 0.14, 0.003, 0.003)
    const photoSensorLaser = new THREE.Mesh(laserG, photoSensorLaserMat)
    photoSensorLaser.position.set(garageCenterX, 0.3, doorZ)
    garageGroup.add(photoSensorLaser)

    // ═══════════════════════════════════════════
    // DOOR FRAME DETAILS
    // ═══════════════════════════════════════════
    // Emergency stop button
    const eStopYellowMat = new THREE.MeshStandardMaterial({ color: 0xFFD600, roughness: 0.5, metalness: 0.1 })
    const eStopBlackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.4 })
    const estpG = new THREE.BoxGeometry(0.02, 0.14, 0.14)
    estpG.translate(-0.55, 1.2, 10.5)
    collect('eStop', eStopYellowMat, estpG)
    const ecolG = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16)
    ecolG.rotateZ(Math.PI / 2)
    ecolG.translate(-0.53, 1.2, 10.5)
    collect('eStopCollar', eStopBlackMat, ecolG)

    // Door frame LED strips (animated)
    const doorFrameLedMat = new THREE.MeshStandardMaterial({
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5,
        roughness: 0.2, metalness: 0.1
    })
    const doorFrameZ = config.DOOR_ROW - 0.40
    const ledTopStrip = new THREE.Mesh(
        new THREE.BoxGeometry(garageW + 0.2, 0.03, 0.03), doorFrameLedMat
    )
    ledTopStrip.position.set(garageCenterX, config.WALL_H + 0.05, doorFrameZ)
    garageGroup.add(ledTopStrip)
    const ledLeftStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, config.WALL_H, 0.03), doorFrameLedMat
    )
    ledLeftStrip.position.set(-0.48, config.WALL_H / 2, doorFrameZ)
    garageGroup.add(ledLeftStrip)
    const ledRightStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, config.WALL_H, 0.03), doorFrameLedMat
    )
    ledRightStrip.position.set(config.GRID_W - 0.52, config.WALL_H / 2, doorFrameZ)
    garageGroup.add(ledRightStrip)
    const doorFrameLedStrips = [ledTopStrip, ledLeftStrip, ledRightStrip]

    // Motion sensor
    const motionSensorMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0.1 })
    const msG = new RoundedBoxGeometry(0.18, 0.08, 0.06, 2, 0.01)
    msG.translate(garageCenterX, config.WALL_H + 0.10, doorZ - 0.35)
    collect('motionSensor', motionSensorMat, msG)

    // FLOOR DETAILS removed per user request
    // ═══════════════════════════════════════════
    // INTERIOR DETAILS
    // ═══════════════════════════════════════════
    // Fire extinguisher
    const fireExtRedMat = new THREE.MeshStandardMaterial({ color: 0xCC0000, roughness: 0.5, metalness: 0.2 })
    const fireExtGrayMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.6 })
    const feBodG = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 12)
    feBodG.translate(config.GRID_W - 0.44, 0.35, 6.0)
    collect('fireExt', fireExtRedMat, feBodG)
    const feCapG = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12)
    feCapG.translate(config.GRID_W - 0.44, 0.60, 6.0)
    collect('fireExtCap', fireExtGrayMat, feCapG)
    const feNozG = new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8)
    feNozG.rotateZ(-Math.PI / 6)
    feNozG.translate(config.GRID_W - 0.38, 0.65, 6.0)
    collect('fireExtCap', fireExtGrayMat, feNozG)
    const feBrkG = new THREE.BoxGeometry(0.08, 0.18, 0.03)
    feBrkG.translate(config.GRID_W - 0.38, 0.35, 6.0)
    collect('fireExtCap', fireExtGrayMat, feBrkG)

    // First aid cabinet
    const firstAidMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5, metalness: 0.1 })
    const greenCrossMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32, emissive: 0x2E7D32, emissiveIntensity: 0.3, roughness: 0.4 })
    const faBoxG = new RoundedBoxGeometry(0.02, 0.3, 0.22, 2, 0.005)
    faBoxG.translate(-0.53, 2.0, 4.5)
    collect('firstAid', firstAidMat, faBoxG)
    const faCrossVG = new THREE.BoxGeometry(0.005, 0.14, 0.04)
    faCrossVG.translate(-0.515, 2.0, 4.5)
    collect('firstAidCross', greenCrossMat, faCrossVG)
    const faCrossHG = new THREE.BoxGeometry(0.005, 0.04, 0.14)
    faCrossHG.translate(-0.515, 2.0, 4.5)
    collect('firstAidCross', greenCrossMat, faCrossHG)

    // Ventilation fan (static housing collected, animated blade separate)
    const fanHousingMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.5 })
    const fanBladeMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.4 })
    for (let bi = 0; bi < 3; bi++) {
        const barG = new THREE.BoxGeometry(0.44, 0.02, 0.02)
        barG.rotateZ(bi * Math.PI / 3)
        barG.translate(1.5, 2.3, -0.52)
        collect('fanHousing', fanHousingMat, barG)
    }
    const bladeGeoms: THREE.BufferGeometry[] = []
    for (let fi = 0; fi < 4; fi++) {
        const bg = new THREE.BoxGeometry(0.16, 0.04, 0.01)
        bg.translate(0.10, 0, 0)
        bg.rotateZ((fi * Math.PI) / 2)
        bladeGeoms.push(normalize(bg))
    }
    const ventFanBlade = new THREE.Mesh(mergeGeometries(bladeGeoms, false)!, fanBladeMat)
    ventFanBlade.position.set(1.5, 2.3, -0.51)
    garageGroup.add(ventFanBlade)

    // ═══════════════════════════════════════════
    // MERGE ALL COLLECTED GEOMETRIES → garageGroup
    // ═══════════════════════════════════════════
    gc.forEach(({ mat, geoms, castShadow, receiveShadow }) => {
        if (geoms.length === 0) return
        const merged = mergeGeometries(geoms, false)
        if (!merged) return
        const mesh = new THREE.Mesh(merged, mat)
        mesh.castShadow = castShadow
        mesh.receiveShadow = receiveShadow
        garageGroup.add(mesh)
    })

    // ═══════════════════════════════════════════
    // MERGE ROOF GROUP GEOMETRIES → garageRoofGroup
    // ═══════════════════════════════════════════
    rgc.forEach(({ mat, geoms, castShadow, receiveShadow }) => {
        if (geoms.length === 0) return
        const merged = mergeGeometries(geoms, false)
        if (!merged) return
        const mesh = new THREE.Mesh(merged, mat)
        mesh.castShadow = castShadow
        mesh.receiveShadow = receiveShadow
        garageRoofGroup.add(mesh)
    })

    garageGroup.add(garageRoofGroup)

    return {
        garageGroup, garageRoofGroup, garageRoofMaterials,
        doorFrameLedStrips, doorFrameLedMat,
        ventFanBlade,
        photoSensorLaser, photoSensorLaserMat
    }
}
