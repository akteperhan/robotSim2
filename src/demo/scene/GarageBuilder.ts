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
    // Side walls run from back wall (z=-0.7) to door row (z=DOOR_ROW)
    const backZ = -0.7
    const frontZ = config.DOOR_ROW
    const sideDepth = frontZ - backZ
    const midZ = (backZ + frontZ) / 2
    // True geometric center between side walls for structural centering
    const garageCenterX = (-0.72 + (config.GRID_W - 0.28)) / 2

    // ── GeomCollector for geometry merging ──
    // Normalize geometry: convert to non-indexed and ensure only position/normal/uv attributes
    // so that different geometry types (Box, Cylinder, Torus, RoundedBox, etc.) can be merged.
    function normalize(geom: THREE.BufferGeometry): THREE.BufferGeometry {
        const g = geom.index ? geom.toNonIndexed() : geom
        // Ensure normals exist
        if (!g.getAttribute('normal')) g.computeVertexNormals()
        // Strip any non-standard attributes to guarantee merge compatibility
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

    // Separate collector for roof group geometries
    const rgc = new Map<string, { mat: THREE.Material, geoms: THREE.BufferGeometry[], castShadow: boolean, receiveShadow: boolean }>()
    function collectRoof(key: string, mat: THREE.Material, geom: THREE.BufferGeometry, castShadow = false, receiveShadow = false) {
        if (!rgc.has(key)) rgc.set(key, { mat, geoms: [], castShadow, receiveShadow })
        const b = rgc.get(key)!
        b.geoms.push(normalize(geom))
        if (castShadow) b.castShadow = true
        if (receiveShadow) b.receiveShadow = true
    }

    // ═══════════════════════════════════════════
    // SHARED MATERIALS (reused across multiple merge groups)
    // ═══════════════════════════════════════════
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd5dce6, roughness: 0.7, metalness: 0.05 })
    const wallPanelMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d4, roughness: 0.65, metalness: 0.08 })
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x5a6274, roughness: 0.55, metalness: 0.25 })
    // baseBandMat and skirting in original both use { color: 0x37474f, roughness: 0.5, metalness: 0.3 }
    const darkBandMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5, metalness: 0.3 })
    const toolMat = new THREE.MeshStandardMaterial({ color: 0x42a5f5, roughness: 0.3, metalness: 0.8 })
    const contactShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })
    // Original edgeMat + conduitMat: color 0x78909c, roughness 0.20/0.25, metalness 0.75
    const metalEdgeMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.20, metalness: 0.75 })

    // ═══════════════════════════════════════════
    // FLOOR & BASE
    // ═══════════════════════════════════════════
    const slabGeom = new THREE.BoxGeometry(garageW + 0.7, 0.14, sideDepth + 0.2)
    slabGeom.translate(garageCenterX, -0.11, midZ)
    collect('floor', floorMat, slabGeom, false, true)

    const perimeterLaneMat = new THREE.MeshStandardMaterial({ color: 0x60667a, roughness: 0.6, metalness: 0.2 })
    const perimeterLaneGeom = new THREE.BoxGeometry(garageW + 0.15, 0.04, sideDepth - 0.2)
    perimeterLaneGeom.translate(garageCenterX, -0.07, midZ)
    collect('perimeterLane', perimeterLaneMat, perimeterLaneGeom, false, true)

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
    // tileChargeMat kept for completeness (not used in current grid loop, but defined in original)
    const _tileChargeMat = new THREE.MeshStandardMaterial({ color: 0x29b6f6, emissive: 0x29b6f6, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.2 })
    void _tileChargeMat // suppress unused warning

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
    // SAFETY STRIPES
    // ═══════════════════════════════════════════
    const safetyYellow = new THREE.MeshStandardMaterial({ color: 0xfdd835, roughness: 0.5, emissive: 0xfdd835, emissiveIntensity: 0.15 })
    const safetyBlack = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5 })
    const addSafetyStripe = (sx: number, sz: number, sw: number, sd: number, count: number) => {
        const segW = sw / count
        for (let i = 0; i < count; i++) {
            const sg = new THREE.BoxGeometry(segW * 0.45, 0.015, sd)
            sg.translate(sx - sw / 2 + segW * (i + 0.5), 0.005, sz)
            collect(i % 2 === 0 ? 'safetyYellow' : 'safetyBlack', i % 2 === 0 ? safetyYellow : safetyBlack, sg)
        }
    }
    addSafetyStripe((config.GRID_W - 1) / 2, -0.3, config.GRID_W - 1, 0.15, 24)
    addSafetyStripe(-0.3, (config.GARAGE_DEPTH - 1) / 2, 0.15, config.GARAGE_DEPTH - 1, 1)
    addSafetyStripe(config.GRID_W - 0.7, (config.GARAGE_DEPTH - 1) / 2, 0.15, config.GARAGE_DEPTH - 1, 1)

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
    // WALLS
    // ═══════════════════════════════════════════
    const bwg = new THREE.BoxGeometry(garageW + 0.75, config.WALL_H + 0.45, 0.28)
    bwg.translate(garageCenterX, (config.WALL_H + 0.45) / 2, -0.7)
    collect('walls', wallMat, bwg, true, true)
    const lwg = new THREE.BoxGeometry(0.28, config.WALL_H + 0.45, sideDepth)
    lwg.translate(-0.72, (config.WALL_H + 0.45) / 2, midZ)
    collect('walls', wallMat, lwg, true, false)
    const rwg = new THREE.BoxGeometry(0.28, config.WALL_H + 0.45, sideDepth)
    rwg.translate(config.GRID_W - 0.28, (config.WALL_H + 0.45) / 2, midZ)
    collect('walls', wallMat, rwg, true, false)

    // Wall ribs
    for (let i = -4; i <= 4; i++) {
        const rg = new THREE.BoxGeometry(0.08, config.WALL_H + 0.1, 0.04)
        rg.translate(garageCenterX + i * 0.88, (config.WALL_H + 0.1) / 2, -0.54)
        collect('wallPanel', wallPanelMat, rg)
    }

    // ═══════════════════════════════════════════
    // LED STRIPS
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
    // BASE BANDS + SKIRTING (same material: darkBandMat)
    // ═══════════════════════════════════════════
    // Base bands
    for (const [w, h, d, px, py, pz] of [
        [garageW + 0.2, 0.4, 0.03, garageCenterX, 0.2, -0.53],
        [0.03, 0.4, sideDepth - 0.5, -0.55, 0.2, midZ],
        [0.03, 0.4, sideDepth - 0.5, config.GRID_W - 0.27, 0.2, midZ],
    ] as [number, number, number, number, number, number][]) {
        const bg = new THREE.BoxGeometry(w, h, d)
        bg.translate(px, py, pz)
        collect('baseBands', darkBandMat, bg)
    }
    // Skirting
    for (const [w, h, d, px, py, pz] of [
        [garageW - 0.3, 0.15, 0.03, garageCenterX, 0.075, -0.54],
        [0.03, 0.15, sideDepth - 1, -0.55, 0.075, midZ],
        [0.03, 0.15, sideDepth - 1, config.GRID_W - 0.41, 0.075, midZ],
    ] as [number, number, number, number, number, number][]) {
        const sg = new THREE.BoxGeometry(w, h, d)
        sg.translate(px, py, pz)
        collect('baseBands', darkBandMat, sg)
    }

    // ═══════════════════════════════════════════
    // DIGITAL SCREENS
    // ═══════════════════════════════════════════
    const screenBgMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.4 })
    const screenFrameMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.3, metalness: 0.6 })

    // Screen frames (both screens)
    for (const sx of [garageCenterX - 2.2, garageCenterX + 2.2]) {
        const fg = new THREE.BoxGeometry(2.0, 1.2, 0.04)
        fg.translate(sx, 2.0, -0.53)
        collect('screenFrames', screenFrameMat, fg)
        const bg = new THREE.BoxGeometry(1.8, 1.0, 0.02)
        bg.translate(sx, 2.0, -0.50)
        collect('screenBgs', screenBgMat, bg)
    }

    // Screen 1 grid
    const screenGridMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, emissive: 0x4caf50, emissiveIntensity: 1.5, roughness: 0.3 })
    for (let i = -3; i <= 3; i++) {
        const hg = new THREE.BoxGeometry(1.6, 0.008, 0.005)
        hg.translate(garageCenterX - 2.2, 2.0 + i * 0.12, -0.49)
        collect('screenGrid', screenGridMat, hg)
        const vg = new THREE.BoxGeometry(0.008, 0.8, 0.005)
        vg.translate(garageCenterX - 2.2 + i * 0.22, 2.0, -0.49)
        collect('screenGrid', screenGridMat, vg)
    }

    // Status bars (unique random widths + colors)
    const barColors = [0x29b6f6, 0x66bb6a, 0xffa726, 0x29b6f6]
    barColors.forEach((bc, bi) => {
        const barW = 0.4 + Math.random() * 1.0
        const barMat = new THREE.MeshStandardMaterial({ color: bc, emissive: bc, emissiveIntensity: 1.2, roughness: 0.3 })
        const bg = new THREE.BoxGeometry(barW, 0.08, 0.005)
        bg.translate(garageCenterX + 2.2 - 0.8 + barW / 2, 2.25 - bi * 0.18, -0.49)
        collect('statusBar_' + bi, barMat, bg)
    })

    // ═══════════════════════════════════════════
    // ENTRY PORTAL
    // ═══════════════════════════════════════════
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x828b9e, roughness: 0.35, metalness: 0.7 })
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
    // ROOF GROUP
    // ═══════════════════════════════════════════
    const garageRoofGroup = new THREE.Group()
    const garageRoofMaterials: THREE.MeshStandardMaterial[] = []

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

    // Fill lights (PointLights stay individual)
    const fill1 = new THREE.PointLight(0xfff4e0, 6.0, 30)
    fill1.position.set(garageCenterX, config.WALL_H - 0.5, config.GARAGE_DEPTH / 3)
    garageGroup.add(fill1)
    const fill2 = new THREE.PointLight(0xfff4e0, 6.0, 30)
    fill2.position.set(garageCenterX, config.WALL_H - 0.5, (config.GARAGE_DEPTH / 3) * 2)
    garageGroup.add(fill2)

    // ═══════════════════════════════════════════
    // INDUSTRIAL DETAILS
    // ═══════════════════════════════════════════

    // Vent grate
    const ventGrateMat = new THREE.MeshStandardMaterial({ color: 0x5a6070, roughness: 0.4, metalness: 0.5 })
    const vfg = new THREE.BoxGeometry(1.0, 0.6, 0.04)
    vfg.translate(garageCenterX + 3.5, config.WALL_H - 0.5, -0.53)
    collect('ventGrate', ventGrateMat, vfg)
    for (let vi = 0; vi < 5; vi++) {
        const vsg = new THREE.BoxGeometry(0.9, 0.02, 0.03)
        vsg.translate(garageCenterX + 3.5, config.WALL_H - 0.72 + vi * 0.1, -0.52)
        collect('ventGrate', ventGrateMat, vsg)
    }

    // ═══════════════════════════════════════════
    // WORKSHOP: SHELVES
    // ═══════════════════════════════════════════
    const metalShelfMat = new THREE.MeshStandardMaterial({ color: 0x6a7080, roughness: 0.4, metalness: 0.6 })
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

    // Small boxes — group by color to merge
    const boxDefs: [number, number, number, number, number, number, number][] = [
        [-0.44, 0.82, 1.5, 0.12, 0.12, 0.18, 0x3498db],
        [-0.44, 0.82, 2.5, 0.12, 0.08, 0.20, 0x2ecc71],
        [-0.44, 1.34, 1.5, 0.12, 0.16, 0.24, 0x2c3e50],
        [-0.44, 1.34, 2.3, 0.14, 0.14, 0.14, 0x1abc9c],
        [-0.44, 1.86, 1.4, 0.10, 0.12, 0.20, 0x8e44ad],
        [-0.44, 1.86, 2.5, 0.12, 0.12, 0.16, 0xf39c12],
        [-0.44, 2.38, 2.2, 0.14, 0.14, 0.22, 0x2c3e50],
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
    const canMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.3, metalness: 0.7 })
    const cg = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 16)
    cg.translate(-0.44, 1.35, 3.0)
    collect('canMetal', canMat, cg)

    // ═══════════════════════════════════════════
    // WORKSHOP: BENCH
    // ═══════════════════════════════════════════
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.55, metalness: 0.4 })
    const benchTopMat = new THREE.MeshStandardMaterial({ color: 0x6d5843, roughness: 0.7, metalness: 0.05 })
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

    // Vise (original: { color: 0x455a64, roughness: 0.3, metalness: 0.8 })
    const viseMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.3, metalness: 0.8 })
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

    // Red tool cabinet on bench
    const toolCabinetMat = new THREE.MeshStandardMaterial({ color: 0xcf3a3a, roughness: 0.35, metalness: 0.5 })
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
    const lampShadeMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5, metalness: 0.3 })
    const lsg = new THREE.ConeGeometry(0.10, 0.08, 12)
    lsg.rotateX(Math.PI)
    lsg.translate(config.GRID_W - 0.62, 1.52, 3.6)
    collect('lampShade', lampShadeMat, lsg)
    const deskLight = new THREE.PointLight(0xfff4e0, 6, 4)
    deskLight.position.set(config.GRID_W - 0.62, 1.46, 3.6)
    garageGroup.add(deskLight)

    // ═══════════════════════════════════════════
    // BIG RED CABINET + DRAWERS
    // ═══════════════════════════════════════════
    const bigCabinetMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.35, metalness: 0.5 })
    const bcg = new RoundedBoxGeometry(0.48, 1.0, 0.55, 4, 0.04)
    bcg.translate(config.GRID_W - 0.65, 0.50, 4.8)
    collect('bigCabinet', bigCabinetMat, bcg)
    const cscg = new THREE.CircleGeometry(0.4, 24)
    cscg.scale(1, 1.3, 1)
    cscg.rotateX(-Math.PI / 2)
    cscg.translate(config.GRID_W - 0.65, 0.005, 4.8)
    collect('contactShadows', contactShadowMat, cscg)

    const drawerMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.4, metalness: 0.6 })
    for (let di = 0; di < 4; di++) {
        const dg = new THREE.BoxGeometry(0.42, 0.015, 0.50)
        dg.translate(config.GRID_W - 0.65, 0.20 + di * 0.22, 4.8)
        collect('drawers', drawerMat, dg)
        const hg = new THREE.BoxGeometry(0.14, 0.02, 0.03)
        hg.translate(config.GRID_W - 0.40, 0.26 + di * 0.22, 4.8)
        collect('toolBlue', toolMat, hg)
    }

    // ═══════════════════════════════════════════
    // BARRELS
    // ═══════════════════════════════════════════
    const barrelMat1 = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.5, metalness: 0.4 })
    const b1g = new THREE.CylinderGeometry(0.22, 0.24, 0.70, 16)
    b1g.translate(config.GRID_W - 0.60, 0.35, 0.4)
    collect('barrels', barrelMat1, b1g)
    const csb1g = new THREE.CircleGeometry(0.28, 24)
    csb1g.rotateX(-Math.PI / 2)
    csb1g.translate(config.GRID_W - 0.60, 0.005, 0.4)
    collect('contactShadows', contactShadowMat, csb1g)
    // ═══════════════════════════════════════════
    // WALL POSTERS
    // ═══════════════════════════════════════════
    const posterMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
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
    const pbg = new THREE.BoxGeometry(0.06, 0.8, 0.5)
    pbg.translate(-0.52, 1.5, 6.5)
    collect('controlPanel', panelBodyMat, pbg)
    // Panel frame (same material as screenFrameMat: 0x455a64, r0.35, m0.7)
    // Original panelFrame had roughness 0.35, metalness 0.7. screenFrameMat has 0.3, 0.6. NOT the same.
    const panelFrameMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.35, metalness: 0.7 })
    const pfg = new THREE.BoxGeometry(0.07, 0.84, 0.54)
    pfg.translate(-0.53, 1.5, 6.5)
    collect('panelFrame', panelFrameMat, pfg)
    // Mini screen
    const miniScreenMat = new THREE.MeshStandardMaterial({ color: 0x0d1117, emissive: 0x1565c0, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.2 })
    const msg = new THREE.BoxGeometry(0.065, 0.22, 0.28)
    msg.translate(-0.50, 1.65, 6.5)
    collect('miniScreen', miniScreenMat, msg)
    // Panel buttons (same mat, can merge all 3)
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
    const ccg = new THREE.CylinderGeometry(0.008, 0.008, 0.5, 16)
    ccg.rotateZ(Math.PI / 3)
    ccg.translate(chargeX + 0.4, 0.15, chargeZ)
    collect('chargeCable', chargeCableMat, ccg)
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffeb3b, emissiveIntensity: 1.5 })
    const blg = new THREE.BoxGeometry(0.04, 0.12, 0.01)
    blg.translate(chargeX + 0.70, 0.50, chargeZ + 0.13)
    collect('bolt', boltMat, blg)

    // ═══════════════════════════════════════════
    // START POINT CIRCLE
    // ═══════════════════════════════════════════
    const robotStartX = config.GRID_CENTER_X, robotStartZ = 3
    const startCircleMat = new THREE.MeshStandardMaterial({
        color: 0x4caf50, emissive: 0x4caf50, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.5, roughness: 0.3, metalness: 0.1
    })
    const scg = new THREE.RingGeometry(0.35, 0.42, 32)
    scg.rotateX(-Math.PI / 2)
    scg.translate(robotStartX + 0.5, 0.015, robotStartZ + 0.5)
    collect('startCircle', startCircleMat, scg)
    const sig = new THREE.CircleGeometry(0.15, 32)
    sig.rotateX(-Math.PI / 2)
    sig.translate(robotStartX + 0.5, 0.016, robotStartZ + 0.5)
    collect('startCircle', startCircleMat, sig)
    const startArrowShape = new THREE.Shape()
    startArrowShape.moveTo(0, 0.12); startArrowShape.lineTo(0.06, 0.02); startArrowShape.lineTo(-0.06, 0.02); startArrowShape.closePath()
    const sag = new THREE.ShapeGeometry(startArrowShape)
    sag.rotateX(-Math.PI / 2)
    sag.translate(robotStartX + 0.5, 0.017, robotStartZ + 0.25)
    collect('startCircle', startCircleMat, sag)

    // ── Ceiling local lights (PointLights, individual) ──
    let lightIdx = 0
    for (const lz of cLightZ) {
        for (const lx of cLightX) {
            if (lightIdx % 3 === 0) {
                const localLight = new THREE.PointLight(0xfff4e0, 6, 5)
                localLight.position.set(lx, config.WALL_H - 0.3, lz)
                garageGroup.add(localLight)
            }
            lightIdx++
        }
    }

    // ═══════════════════════════════════════════
    // ROOF MESHES
    // ═══════════════════════════════════════════
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x7a8294, roughness: 0.45, metalness: 0.50 })
    garageRoofMaterials.push(roofMat)
    const rfg = new THREE.BoxGeometry(garageW + 0.8, 0.22, sideDepth + 0.26)
    rfg.translate(garageCenterX, config.WALL_H + 0.36, midZ)
    collectRoof('roof', roofMat, rfg, false, true)


    // ═══════════════════════════════════════════
    // EXTERIOR: AC UNITS
    // ═══════════════════════════════════════════
    const acBodyMat = new THREE.MeshStandardMaterial({ color: 0xd0d4d8, roughness: 0.5, metalness: 0.4 })
    const acGrateMat = new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: 0.3, metalness: 0.6 })
    const acPipeMat = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.3, metalness: 0.8 })
    for (const [ax, ay] of [[garageCenterX - 2.5, 2.8], [garageCenterX + 1.8, 2.0]] as [number, number][]) {
        const abg = new THREE.BoxGeometry(0.9, 0.55, 0.30)
        abg.translate(ax, ay, -0.85)
        collect('acBodies', acBodyMat, abg)
        for (let gi = 0; gi < 4; gi++) {
            const agg = new THREE.BoxGeometry(0.82, 0.04, 0.22)
            agg.translate(ax, ay - 0.18 + gi * 0.12, -0.72)
            collect('acGrates', acGrateMat, agg)
        }
        const apg = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 16)
        apg.rotateZ(Math.PI / 2)
        apg.translate(ax + 0.5, ay - 0.15, -0.82)
        collect('acPipes', acPipeMat, apg)
    }

    // ═══════════════════════════════════════════
    // EXTERIOR: ELECTRICAL PANEL + MISC
    // ═══════════════════════════════════════════
    const panelMat = new THREE.MeshStandardMaterial({ color: 0xe0e4ec, roughness: 0.4, metalness: 0.3 })
    const epg = new THREE.BoxGeometry(0.48, 0.65, 0.10)
    epg.translate(config.GRID_W - 0.15, 1.4, 1.5)
    collect('elPanel', panelMat, epg)
    const latchMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9 })
    const ltg = new THREE.BoxGeometry(0.06, 0.06, 0.08)
    ltg.translate(config.GRID_W - 0.12, 1.55, 1.5)
    collect('latch', latchMat, ltg)
    const warnMat = new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xffc107, emissiveIntensity: 0.4 })
    const wg = new THREE.BoxGeometry(0.20, 0.10, 0.02)
    wg.translate(config.GRID_W - 0.14, 1.25, 1.5)
    collect('warn', warnMat, wg)

    // Drains
    const drainMat = new THREE.MeshStandardMaterial({ color: 0x4a4f5e, roughness: 0.6, metalness: 0.5 })
    for (let dx = 0; dx < 3; dx++) {
        const dg = new THREE.BoxGeometry(0.12, 0.08, 0.22)
        dg.translate(garageCenterX - 2 + dx * 2, 0.04, -1.0)
        collect('drains', drainMat, dg)
    }

    // Roof edge profiles
    const feg = new THREE.BoxGeometry(garageW + 0.85, 0.10, 0.12)
    feg.translate(garageCenterX, config.WALL_H + 0.45, config.DOOR_ROW - 0.38)
    collect('metalEdge', metalEdgeMat, feg)
    const beg = new THREE.BoxGeometry(garageW + 0.85, 0.10, 0.12)
    beg.translate(garageCenterX, config.WALL_H + 0.45, -0.72)
    collect('metalEdge', metalEdgeMat, beg)

    // ═══════════════════════════════════════════
    // EXTERIOR FACADE: COLOR BANDS
    // ═══════════════════════════════════════════
    const extRedMat = new THREE.MeshStandardMaterial({ color: 0xE53935, roughness: 0.6, metalness: 0.05 })
    const extBlueMat = new THREE.MeshStandardMaterial({ color: 0x1976D2, roughness: 0.6, metalness: 0.05 })
    for (const [w, h, d, px, py, pz] of [
        [garageW + 0.8, 0.18, 0.06, garageCenterX, config.WALL_H + 0.50, config.DOOR_ROW - 0.38],
        [0.06, 0.18, sideDepth + 0.2, config.GRID_W - 0.10, config.WALL_H + 0.50, midZ],
    ] as [number, number, number, number, number, number][]) {
        const rg = new THREE.BoxGeometry(w, h, d)
        rg.translate(px, py, pz)
        collect('extRed', extRedMat, rg)
    }
    for (const [w, h, d, px, py, pz] of [
        [garageW + 0.8, 0.18, 0.06, garageCenterX, config.WALL_H + 0.50, -0.75],
        [0.06, 0.18, sideDepth + 0.2, -0.90, config.WALL_H + 0.50, midZ],
    ] as [number, number, number, number, number, number][]) {
        const bg = new THREE.BoxGeometry(w, h, d)
        bg.translate(px, py, pz)
        collect('extBlue', extBlueMat, bg)
    }

    // ═══════════════════════════════════════════
    // SIGN
    // ═══════════════════════════════════════════
    const signPlateMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.5, metalness: 0.1, emissive: 0x1565c0, emissiveIntensity: 0.15 })
    const spg = new RoundedBoxGeometry(4.5, 0.65, 0.08, 3, 0.04)
    spg.translate(garageCenterX, config.WALL_H + 0.12, config.DOOR_ROW - 0.30)
    collect('signPlate', signPlateMat, spg)
    const signFrameMat = new THREE.MeshStandardMaterial({ color: 0xE53935, roughness: 0.5, metalness: 0.1 })
    const sfg = new RoundedBoxGeometry(4.7, 0.75, 0.06, 3, 0.04)
    sfg.translate(garageCenterX, config.WALL_H + 0.12, config.DOOR_ROW - 0.32)
    collect('signFrame', signFrameMat, sfg)
    const signInnerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.0 })
    const sing = new RoundedBoxGeometry(3.8, 0.40, 0.02, 3, 0.02)
    sing.translate(garageCenterX, config.WALL_H + 0.12, config.DOOR_ROW - 0.26)
    collect('signInner', signInnerMat, sing)

    // ═══════════════════════════════════════════
    // GUTTERS
    // ═══════════════════════════════════════════
    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.25, metalness: 0.8 })
    for (const gx of [-0.80, config.GRID_W - 0.20]) {
        const gg = new THREE.CylinderGeometry(0.04, 0.04, config.WALL_H + 0.3, 16)
        gg.translate(gx, (config.WALL_H + 0.3) / 2, -0.80)
        collect('gutters', gutterMat, gg)
        const eg = new THREE.CylinderGeometry(0.045, 0.04, 0.15, 16)
        eg.rotateX(Math.PI / 4)
        eg.translate(gx, 0.08, -0.88)
        collect('gutters', gutterMat, eg)
    }

    // ═══════════════════════════════════════════
    // EXTERIOR WALL LAMPS
    // ═══════════════════════════════════════════
    const wallLampMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5, metalness: 0.4 })
    const wallLampGlowMat = new THREE.MeshStandardMaterial({ color: 0xFFC107, emissive: 0xFFC107, emissiveIntensity: 1.2, roughness: 0.3 })
    const wallLampShadeMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.6, metalness: 0.1 })
    for (const lmpX of [-0.45, config.GRID_W - 0.55]) {
        const brg = new THREE.BoxGeometry(0.08, 0.06, 0.20)
        brg.translate(lmpX, config.WALL_H - 0.35, config.DOOR_ROW - 0.30)
        collect('wallLampBrackets', wallLampMat, brg)
        const shg = new THREE.ConeGeometry(0.12, 0.10, 12)
        shg.rotateX(Math.PI)
        shg.translate(lmpX, config.WALL_H - 0.28, config.DOOR_ROW - 0.22)
        collect('wallLampShades', wallLampShadeMat, shg)
        const extLight = new THREE.PointLight(0xfff4e0, 1.5, 5)
        extLight.position.set(lmpX, config.WALL_H - 0.3, config.DOOR_ROW - 0.15)
        garageGroup.add(extLight)
    }

    // ═══════════════════════════════════════════
    // FAZ 1: DOOR MECHANISM
    // ═══════════════════════════════════════════
    const doorZ = config.DOOR_ROW - 0.1

    // Motor housing — above door opening
    const motorG = new THREE.BoxGeometry(1.2, 0.35, 0.25)
    motorG.translate(garageCenterX, config.WALL_H + 0.05, doorZ - 0.15)
    collect('motorBox', darkBandMat, motorG)
    const drumG = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 16)
    drumG.rotateZ(Math.PI / 2)
    drumG.translate(garageCenterX, config.WALL_H + 0.05, doorZ - 0.15)
    collect('motorBox', darkBandMat, drumG)
    for (const dx of [-0.52, 0.52]) {
        const gearG = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16)
        gearG.rotateZ(Math.PI / 2)
        gearG.translate(garageCenterX + dx, config.WALL_H + 0.05, doorZ - 0.15)
        collect('motorBox', darkBandMat, gearG)
    }

    // Photoelectric sensors — static bodies (collected) + animated laser (separate)
    const sensorBodyMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.6 })
    const sensorLensMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.0, roughness: 0.2 })
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
    // FAZ 2: DOOR FRAME DETAILS
    // ═══════════════════════════════════════════
    // Emergency stop button — left wall
    const eStopYellowMat = new THREE.MeshStandardMaterial({ color: 0xFFD600, roughness: 0.5, metalness: 0.1 })
    const eStopRedMat = new THREE.MeshStandardMaterial({ color: 0xD32F2F, roughness: 0.4, metalness: 0.2 })
    const eStopBlackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.4 })
    const estpG = new THREE.BoxGeometry(0.02, 0.14, 0.14)
    estpG.translate(-0.55, 1.2, 10.5)
    collect('eStop', eStopYellowMat, estpG)
    const ecolG = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16)
    ecolG.rotateZ(Math.PI / 2)
    ecolG.translate(-0.53, 1.2, 10.5)
    collect('eStopCollar', eStopBlackMat, ecolG)

    // Door frame LED strips — animated (separate meshes, shared material)
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

    // Motion sensor — above door
    const motionSensorMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0.1 })
    const motionLensMat = new THREE.MeshStandardMaterial({ color: 0x880000, roughness: 0.3, metalness: 0.2 })
    const msG = new RoundedBoxGeometry(0.18, 0.08, 0.06, 2, 0.01)
    msG.translate(garageCenterX, config.WALL_H + 0.10, doorZ - 0.35)
    collect('motionSensor', motionSensorMat, msG)
    // ═══════════════════════════════════════════
    // FAZ 3: FLOOR DETAILS
    // ═══════════════════════════════════════════
    // Oil stains
    const oilStainMat = new THREE.MeshStandardMaterial({
        color: 0x111111, transparent: true, opacity: 0.35,
        roughness: 0.2, metalness: 0.3, depthWrite: false
    })
    const oil1G = new THREE.CircleGeometry(0.6, 24)
    oil1G.rotateX(-Math.PI / 2)
    oil1G.translate(3.5, 0.005, 4.0)
    collect('oilStains', oilStainMat, oil1G)
    const oil2G = new THREE.CircleGeometry(0.35, 20)
    oil2G.rotateX(-Math.PI / 2)
    oil2G.translate(7.0, 0.005, 6.5)
    collect('oilStains', oilStainMat, oil2G)

    // Tire marks
    const tireMarkMat = new THREE.MeshStandardMaterial({
        color: 0x222222, transparent: true, opacity: 0.2,
        roughness: 0.3, metalness: 0.1, depthWrite: false
    })
    for (const tx of [garageCenterX - 1.2, garageCenterX + 1.2]) {
        const tmG = new THREE.PlaneGeometry(0.18, 8.0)
        tmG.rotateX(-Math.PI / 2)
        tmG.translate(tx, 0.006, 7.0)
        collect('tireMarks', tireMarkMat, tmG)
    }

    // ═══════════════════════════════════════════
    // FAZ 5: INTERIOR DETAILS
    // ═══════════════════════════════════════════
    // Fire extinguisher — right wall
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

    // First aid cabinet — left wall
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

    // Ventilation fan — back wall (static housing collected, animated blade separate)
    const fanHousingMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.5 })
    const fanBladeMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.4 })
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
