import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// ═══════════════════════════════════════════
// SKY GRADIENT TEXTURE
// ═══════════════════════════════════════════
export function createSkyGradient(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 2; canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 512)
    g.addColorStop(0, '#0a3d7a')
    g.addColorStop(0.15, '#1565c0')
    g.addColorStop(0.30, '#1e88e5')
    g.addColorStop(0.50, '#42a5f5')
    g.addColorStop(0.70, '#87ceeb')
    g.addColorStop(0.90, '#e3f2fd')
    g.addColorStop(1.0, '#ffffff')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 512)
    const tex = new THREE.CanvasTexture(canvas)
    tex.mapping = THREE.EquirectangularReflectionMapping
    return tex
}

// ═══════════════════════════════════════════
// SEMI-REALISTIC URBAN CITYSCAPE
// ═══════════════════════════════════════════

export function createOutdoorScene(
    scene: THREE.Scene,
    config: { GRID_W: number, GRID_H: number, DOOR_ROW: number, GRID_CENTER_X: number }
): { skyLight: THREE.HemisphereLight, animatedObjects: { clouds: THREE.Group[], birds: THREE.Group[], planes: THREE.Group[] } } {
    const animatedObjects = { clouds: [] as THREE.Group[], birds: [] as THREE.Group[], planes: [] as THREE.Group[] }

    // ── GeomCollector for geometry merging ──
    const gc = new Map<string, { mat: THREE.Material, geoms: THREE.BufferGeometry[], castShadow: boolean, receiveShadow: boolean }>()

    function collect(key: string, mat: THREE.Material, geom: THREE.BufferGeometry, castShadow = false, receiveShadow = false) {
        if (!gc.has(key)) gc.set(key, { mat, geoms: [], castShadow, receiveShadow })
        const b = gc.get(key)!
        b.geoms.push(geom)
        if (castShadow) b.castShadow = true
        if (receiveShadow) b.receiveShadow = true
    }

    // === Atmospheric Fog (slightly less dense for cleaner view) ===
    scene.fog = new THREE.FogExp2(0xd4e4f0, 0.006)

    // === Sky Shader ===
    const sky = new Sky()
    sky.scale.setScalar(480)
    sky.position.set(config.GRID_CENTER_X, 0, config.DOOR_ROW + 10)
    const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms as Record<string, THREE.IUniform<unknown>>
    ;(skyUniforms['turbidity'] as THREE.IUniform<number>).value = 2.0
    ;(skyUniforms['rayleigh'] as THREE.IUniform<number>).value = 0.4
    ;(skyUniforms['mieCoefficient'] as THREE.IUniform<number>).value = 0.003
    ;(skyUniforms['mieDirectionalG'] as THREE.IUniform<number>).value = 0.95
    const sunDir = new THREE.Vector3()
    const elevation = 50, azimuth = 180
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth))
    ;(skyUniforms['sunPosition'] as THREE.IUniform<THREE.Vector3>).value.copy(sunDir)
    ;(sky.material as THREE.ShaderMaterial).depthWrite = false
    sky.name = 'env_sky'
    scene.add(sky)

    // === Sun Disc ===
    const sunWorldPos = sunDir.clone().multiplyScalar(150).add(new THREE.Vector3(config.GRID_CENTER_X, 0, config.DOOR_ROW + 10))
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(2.8, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xfffde7, depthTest: false }))
    sunDisc.position.copy(sunWorldPos); sunDisc.renderOrder = 999; sunDisc.name = 'env_sun_disc'
    scene.add(sunDisc)
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(5.5, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.3, depthTest: false }))
    sunGlow.position.copy(sunWorldPos); sunGlow.renderOrder = 998
    scene.add(sunGlow)

    // === Directional Sun Light ===
    const outdoorSun = new THREE.DirectionalLight(0xffffff, 1.2)
    outdoorSun.position.copy(sunDir).multiplyScalar(170)
    outdoorSun.target.position.set(config.GRID_CENTER_X, 0, config.DOOR_ROW + 2)
    outdoorSun.castShadow = true
    outdoorSun.shadow.mapSize.set(2048, 2048)
    outdoorSun.shadow.camera.left = -30; outdoorSun.shadow.camera.right = 30
    outdoorSun.shadow.camera.top = 30; outdoorSun.shadow.camera.bottom = -30
    outdoorSun.shadow.camera.near = 10; outdoorSun.shadow.camera.far = 200
    outdoorSun.shadow.bias = -0.0003
    outdoorSun.shadow.radius = 3
    outdoorSun.name = 'env_sun'
    scene.add(outdoorSun); scene.add(outdoorSun.target)

    // === Clouds ===
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true, opacity: 0.92 })
    const cloudPositions: [number, number, number, number][] = [
        [-15, 28, 25, 0.8], [10, 30, 35, 0.6], [5, 32, 45, 1.0], [-12, 26, 50, 0.5],
        [20, 29, 30, 0.7], [-5, 31, 55, 0.8], [15, 27, 20, 0.6]
    ]
    cloudPositions.forEach(([cx, cy, cz, scale]) => {
        const cloud = new THREE.Group()
        for (let i = 0; i < 4; i++) {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 12, 8), cloudMat)
            puff.position.set((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.8)
            puff.scale.setScalar(0.6 + Math.random() * 0.4)
            cloud.add(puff)
        }
        cloud.position.set(cx, cy, cz); cloud.scale.setScalar(scale)
        scene.add(cloud); animatedObjects.clouds.push(cloud)
    })

    // === Birds ===
    const birdMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 })
    for (let f = 0; f < 3; f++) {
        const flock = new THREE.Group()
        for (let b = 0; b < 4; b++) {
            const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 0.08), birdMat)
            wing1.position.set(-0.1, 0, 0); wing1.rotation.z = 0.3
            const wing2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 0.08), birdMat)
            wing2.position.set(0.1, 0, 0); wing2.rotation.z = -0.3
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), birdMat)
            const bird = new THREE.Group()
            bird.add(wing1, wing2, body)
            bird.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 2)
            flock.add(bird)
        }
        flock.position.set(-15 + f * 12, 14 + f * 2, 20 + f * 8)
        scene.add(flock); animatedObjects.birds.push(flock)
    }

    // === Airplanes ===
    const planeMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3, metalness: 0.2 })
    const planeTailMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.4 })
    const planeWinMat = new THREE.MeshStandardMaterial({ color: 0x90CAF9, roughness: 0.2, metalness: 0.1 })
    for (let pi = 0; pi < 2; pi++) {
        const planeGroup = new THREE.Group()
        const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 1.8, 12), planeMat)
        fuse.rotation.z = Math.PI / 2; planeGroup.add(fuse)
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 12), planeMat)
        nose.rotation.z = -Math.PI / 2; nose.position.x = 1.1; planeGroup.add(nose)
        const wingGeo = new THREE.BoxGeometry(0.8, 0.04, 2.4)
        const wing = new THREE.Mesh(wingGeo, planeMat)
        wing.position.set(-0.1, 0, 0); planeGroup.add(wing)
        const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.05), planeTailMat)
        tailV.position.set(-0.85, 0.25, 0); planeGroup.add(tailV)
        const tailH = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.7), planeMat)
        tailH.position.set(-0.85, 0.08, 0); planeGroup.add(tailH)
        for (let wi = 0; wi < 5; wi++) {
            const w = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.01), planeWinMat)
            w.position.set(0.4 - wi * 0.22, 0.08, 0.15); planeGroup.add(w)
        }
        planeGroup.position.set(-50 + pi * 40, 22 + pi * 5, 15 + pi * 20)
        planeGroup.rotation.y = 0.15 + pi * 0.1
        planeGroup.scale.setScalar(1.5 + pi * 0.5)
        scene.add(planeGroup)
        animatedObjects.planes.push(planeGroup)
    }

    // === DIORAMA BASE PLATFORM ===
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9, metalness: 0.05 })
    const platformGeom = new THREE.BoxGeometry(50, 0.3, 60)
    platformGeom.translate(config.GRID_CENTER_X, -0.35, 22)
    collect('platform', platformMat, platformGeom, false, true)

    // === ROAD SURFACE (darker asphalt) ===
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.85, metalness: 0.0 })
    const roadGeom = new THREE.PlaneGeometry(config.GRID_W + 6, 44)
    roadGeom.rotateX(-Math.PI / 2)
    roadGeom.translate(config.GRID_CENTER_X, -0.14, config.DOOR_ROW + 10)
    collect('road', roadMat, roadGeom, false, true)

    // === SIDEWALKS (scored concrete) ===
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c0, roughness: 0.7, metalness: 0.0 })
    const leftSWGeom = new THREE.BoxGeometry(5, 0.12, 44)
    leftSWGeom.translate(-3.5, -0.12, config.DOOR_ROW + 10)
    collect('sidewalk', sidewalkMat, leftSWGeom, false, true)
    const rightSWGeom = new THREE.BoxGeometry(5, 0.12, 44)
    rightSWGeom.translate(config.GRID_W + 2.5, -0.12, config.DOOR_ROW + 10)
    collect('sidewalk', sidewalkMat, rightSWGeom, false, true)

    // Sidewalk joint lines (scored concrete look)
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x9a9a90, roughness: 0.8 })
    for (let z = config.DOOR_ROW - 6; z < config.DOOR_ROW + 32; z += 1.5) {
        // Left sidewalk joints
        const ljG = new THREE.BoxGeometry(5, 0.005, 0.03)
        ljG.translate(-3.5, -0.055, z)
        collect('swJoints', jointMat, ljG)
        // Right sidewalk joints
        const rjG = new THREE.BoxGeometry(5, 0.005, 0.03)
        rjG.translate(config.GRID_W + 2.5, -0.055, z)
        collect('swJoints', jointMat, rjG)
    }

    // === RAISED CURBS ===
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xa0a0a0, roughness: 0.7, metalness: 0.0 })
    // Left curb
    const lcurbG = new THREE.BoxGeometry(0.18, 0.15, 44)
    lcurbG.translate(-0.9, -0.075, config.DOOR_ROW + 10)
    collect('curbs', curbMat, lcurbG)
    // Right curb
    const rcurbG = new THREE.BoxGeometry(0.18, 0.15, 44)
    rcurbG.translate(config.GRID_W - 0.1, -0.075, config.DOOR_ROW + 10)
    collect('curbs', curbMat, rcurbG)

    // === WHITE ROAD MARKINGS ===
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.5 })
    // Solid edge lines
    for (const xPos of [-0.7, config.GRID_W - 0.3]) {
        const lineGeom = new THREE.BoxGeometry(0.10, 0.02, 40)
        lineGeom.translate(xPos, -0.06, config.DOOR_ROW + 10)
        collect('roadMarkings', whiteMat, lineGeom)
    }
    // Center dashed white line
    for (let z = config.DOOR_ROW - 6; z < config.DOOR_ROW + 32; z += 2.5) {
        const dashGeom = new THREE.BoxGeometry(0.08, 0.02, 1.2)
        dashGeom.translate(config.GRID_CENTER_X, -0.06, z)
        collect('roadMarkings', whiteMat, dashGeom)
    }

    // === CROSSWALK STRIPES ===
    for (let i = 0; i < 7; i++) {
        const stripeGeom = new THREE.BoxGeometry(1.0, 0.02, 0.35)
        stripeGeom.translate(-0.5 + i * ((config.GRID_W + 0.6) / 6), -0.06, config.DOOR_ROW + 3)
        collect('roadMarkings', whiteMat, stripeGeom)
    }
    for (let i = 0; i < 7; i++) {
        const stripeGeom = new THREE.BoxGeometry(1.0, 0.02, 0.35)
        stripeGeom.translate(-0.5 + i * ((config.GRID_W + 0.6) / 6), -0.06, config.DOOR_ROW + 28)
        collect('roadMarkings', whiteMat, stripeGeom)
    }

    // === CROSS STREETS ===
    for (const cz of [config.DOOR_ROW + 3, config.DOOR_ROW + 28]) {
        const crossRoadGeom = new THREE.PlaneGeometry(50, 5)
        crossRoadGeom.rotateX(-Math.PI / 2)
        crossRoadGeom.translate(config.GRID_CENTER_X, -0.13, cz)
        collect('road', roadMat, crossRoadGeom, false, true)
        for (const edgeOff of [-2.3, 2.3]) {
            const edgeLineGeom = new THREE.BoxGeometry(50, 0.02, 0.08)
            edgeLineGeom.translate(config.GRID_CENTER_X, -0.05, cz + edgeOff)
            collect('roadMarkings', whiteMat, edgeLineGeom)
        }
    }

    // === COURTYARD ===
    const courtyardMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b0, roughness: 0.7 })
    const courtyardGeom = new THREE.BoxGeometry(config.GRID_W + 2, 0.06, 3)
    courtyardGeom.translate(config.GRID_CENTER_X, -0.1, config.DOOR_ROW + 1)
    collect('courtyard', courtyardMat, courtyardGeom, false, true)

    // === PARKING AREA (near garage entrance) ===
    const parkLinesMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.5 })
    // 4 parking spaces to the right of garage entrance
    for (let pi = 0; pi < 4; pi++) {
        const pz = config.DOOR_ROW + 1.5 + pi * 2.2
        // Left line
        const plG = new THREE.BoxGeometry(0.05, 0.01, 2.0)
        plG.translate(config.GRID_W + 1.0, -0.06, pz)
        collect('parkLines', parkLinesMat, plG)
        // Right line
        const prG = new THREE.BoxGeometry(0.05, 0.01, 2.0)
        prG.translate(config.GRID_W + 3.5, -0.06, pz)
        collect('parkLines', parkLinesMat, prG)
    }
    // Front and back lines
    const parkFrontG = new THREE.BoxGeometry(2.5, 0.01, 0.05)
    parkFrontG.translate(config.GRID_W + 2.25, -0.06, config.DOOR_ROW + 0.5)
    collect('parkLines', parkLinesMat, parkFrontG)
    const parkBackG = new THREE.BoxGeometry(2.5, 0.01, 0.05)
    parkBackG.translate(config.GRID_W + 2.25, -0.06, config.DOOR_ROW + 9.3)
    collect('parkLines', parkLinesMat, parkBackG)

    // Concrete bollards at parking corners
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.7 })
    for (const [bx, bz] of [
        [config.GRID_W + 0.8, config.DOOR_ROW + 0.4],
        [config.GRID_W + 3.7, config.DOOR_ROW + 0.4],
        [config.GRID_W + 0.8, config.DOOR_ROW + 9.5],
    ] as [number, number][]) {
        const bG = new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8)
        bG.translate(bx, 0.25, bz)
        collect('bollards', bollardMat, bG)
    }

    // ═══════════════════════════════════════════
    // BUILDING SYSTEM — Muted Realistic Palette
    // ═══════════════════════════════════════════
    const buildingPalette = [
        { body: 0x8b8b7a, base: 0x707060 },   // Warm gray stone
        { body: 0xa0816c, base: 0x806050 },   // Brownstone
        { body: 0x7a8b8b, base: 0x607070 },   // Cool gray
        { body: 0xb8a88a, base: 0x988868 },   // Sandstone
        { body: 0x6b7b7b, base: 0x506060 },   // Dark slate
        { body: 0x9a8878, base: 0x7a6858 },   // Taupe
        { body: 0x8a7a6a, base: 0x6a5a4a },   // Brown
        { body: 0x7b8a7b, base: 0x5b6a5b },   // Sage
    ]

    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.5 })
    const windowGlassMat = new THREE.MeshStandardMaterial({ color: 0x7aaecc, roughness: 0.2, metalness: 0.15 })

    const bodyMats = new Map<number, THREE.MeshStandardMaterial>()
    const baseMats = new Map<number, THREE.MeshStandardMaterial>()

    const getBodyMat = (paletteIdx: number) => {
        const idx = paletteIdx % buildingPalette.length
        if (!bodyMats.has(idx)) {
            bodyMats.set(idx, new THREE.MeshStandardMaterial({ color: buildingPalette[idx].body, roughness: 0.7, metalness: 0.05 }))
        }
        return bodyMats.get(idx)!
    }
    const getBaseMat = (paletteIdx: number) => {
        const idx = paletteIdx % buildingPalette.length
        if (!baseMats.has(idx)) {
            baseMats.set(idx, new THREE.MeshStandardMaterial({ color: buildingPalette[idx].base, roughness: 0.8, metalness: 0.0 }))
        }
        return baseMats.get(idx)!
    }

    const roofMats = new Map<number, THREE.MeshStandardMaterial>()
    const getRoofMat = (color: number) => {
        if (!roofMats.has(color)) {
            roofMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }))
        }
        return roofMats.get(color)!
    }

    const awningMats = new Map<number, THREE.MeshStandardMaterial>()
    const getAwningMat = (color: number) => {
        if (!awningMats.has(color)) {
            awningMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide }))
        }
        return awningMats.get(color)!
    }

    const shopWinMat = new THREE.MeshStandardMaterial({
        color: 0x8ab8d0, roughness: 0.1, metalness: 0.08, transparent: true, opacity: 0.7
    })
    const shopDoorMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.6 })

    // Water tower materials
    const waterTowerLegMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.7 })
    const waterTowerTankMat = new THREE.MeshStandardMaterial({ color: 0x7a6050, roughness: 0.6 })
    const waterTowerConeMat = new THREE.MeshStandardMaterial({ color: 0x4E342E, roughness: 0.7 })

    // Window ledge / cornice materials
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0xc0b8a8, roughness: 0.6, metalness: 0.05 })
    const corniceMat = new THREE.MeshStandardMaterial({ color: 0xb0a898, roughness: 0.6, metalness: 0.05 })

    const addBuilding = (
        bx: number, bz: number,
        bw: number, bh: number, bd: number,
        paletteIdx: number, floors: number,
        options?: {
            hasWaterTower?: boolean,
            hasAwning?: boolean,
            awningColor?: number,
            hasShopFront?: boolean,
            roofColor?: number,
        }
    ) => {
        const opts = options || {}
        const pIdx = paletteIdx % buildingPalette.length

        // Main body
        const bodyMat = getBodyMat(paletteIdx)
        const bodyGeom = new THREE.BoxGeometry(bw, bh, bd)
        bodyGeom.translate(bx, bh / 2, bz)
        collect('body_' + pIdx, bodyMat, bodyGeom, true, true)

        // Concrete base trim (0.3m)
        const floorH = bh / floors
        const baseMat = getBaseMat(paletteIdx)
        const baseGeom = new THREE.BoxGeometry(bw + 0.06, 0.3, bd + 0.06)
        baseGeom.translate(bx, 0.15, bz)
        collect('base_' + pIdx, baseMat, baseGeom)

        // Window grid
        const winW = 0.35, winH = 0.45
        const winsPerRow = Math.max(2, Math.floor((bw - 0.4) / 0.6))
        const winSpacing = (bw - 0.4) / Math.max(winsPerRow - 1, 1)

        for (let f = 1; f < floors; f++) {
            const wy = f * floorH + floorH * 0.5

            // Window ledge below each row (front face)
            const wlG = new THREE.BoxGeometry(bw - 0.2, 0.04, 0.06)
            wlG.translate(bx, wy - winH / 2 - 0.04, bz + bd / 2 + 0.03)
            collect('windowLedges', ledgeMat, wlG)

            for (let wi = 0; wi < winsPerRow; wi++) {
                const wx = bx - (bw - 0.4) / 2 + wi * winSpacing
                for (const zOff of [bd / 2 + 0.02, -(bd / 2 + 0.02)]) {
                    const frameGeom = new THREE.BoxGeometry(winW + 0.08, winH + 0.08, 0.03)
                    frameGeom.translate(wx, wy, bz + zOff)
                    collect('winFrame', windowFrameMat, frameGeom)
                    const glassGeom = new THREE.BoxGeometry(winW, winH, 0.04)
                    glassGeom.translate(wx, wy, bz + zOff + (zOff > 0 ? 0.01 : -0.01))
                    collect('winGlass', windowGlassMat, glassGeom)
                }
            }
        }

        // Cornices between floors (horizontal trim)
        for (let f = 1; f < floors; f++) {
            const cY = f * floorH
            const ccG = new THREE.BoxGeometry(bw + 0.08, 0.06, bd + 0.08)
            ccG.translate(bx, cY, bz)
            collect('cornices', corniceMat, ccG)
        }

        // Side face windows
        const sideWins = Math.max(1, Math.floor((bd - 0.4) / 0.8))
        const sideSpacing = (bd - 0.4) / Math.max(sideWins - 1, 1)
        for (let f = 1; f < floors; f++) {
            const wy = f * floorH + floorH * 0.5
            for (let si = 0; si < sideWins; si++) {
                const wz = bz - (bd - 0.4) / 2 + si * sideSpacing
                for (const xOff of [bw / 2 + 0.02, -(bw / 2 + 0.02)]) {
                    const frameGeom = new THREE.BoxGeometry(0.03, winH + 0.08, winW + 0.08)
                    frameGeom.translate(bx + xOff, wy, wz)
                    collect('winFrame', windowFrameMat, frameGeom)
                    const glassGeom = new THREE.BoxGeometry(0.04, winH, winW)
                    glassGeom.translate(bx + xOff + (xOff > 0 ? 0.01 : -0.01), wy, wz)
                    collect('winGlass', windowGlassMat, glassGeom)
                }
            }
        }

        // Shop front
        if (opts.hasShopFront) {
            const shopWinGeom = new THREE.BoxGeometry(bw * 0.6, floorH * 0.6, 0.04)
            shopWinGeom.translate(bx - bw * 0.08, floorH * 0.42, bz + bd / 2 + 0.03)
            collect('shopWin', shopWinMat, shopWinGeom)
            const shopDoorGeom = new THREE.BoxGeometry(0.45, floorH * 0.75, 0.04)
            shopDoorGeom.translate(bx + bw * 0.32, floorH * 0.38, bz + bd / 2 + 0.03)
            collect('shopDoor', shopDoorMat, shopDoorGeom)
        }

        // Awning (muted colors)
        if (opts.hasAwning) {
            const awningColor = opts.awningColor || 0x4a6a4a
            const awningW = bw * 0.9
            const awningDepth = 0.7
            const awningY = floorH + 0.08
            const awningMat = getAwningMat(awningColor)
            const awningGeom = new THREE.BoxGeometry(awningW, 0.05, awningDepth)
            awningGeom.rotateX(0.15)
            awningGeom.translate(bx, awningY, bz + bd / 2 + awningDepth / 2)
            collect('awning_' + awningColor.toString(16), awningMat, awningGeom)
        }

        // Roof slab with parapet
        const roofColor = opts.roofColor || 0x808080
        const roofMatB = getRoofMat(roofColor)
        const roofGeom = new THREE.BoxGeometry(bw + 0.12, 0.12, bd + 0.12)
        roofGeom.translate(bx, bh + 0.06, bz)
        collect('roof', roofMatB, roofGeom)

        // Roof parapet (short wall around rooftop)
        const parapetMat = getRoofMat(0x707070)
        for (const [pw, ph, pd, px, py, pz] of [
            [bw + 0.14, 0.25, 0.06, bx, bh + 0.245, bz + bd / 2 + 0.03],
            [bw + 0.14, 0.25, 0.06, bx, bh + 0.245, bz - bd / 2 - 0.03],
            [0.06, 0.25, bd + 0.08, bx + bw / 2 + 0.03, bh + 0.245, bz],
            [0.06, 0.25, bd + 0.08, bx - bw / 2 - 0.03, bh + 0.245, bz],
        ] as [number, number, number, number, number, number][]) {
            const ppG = new THREE.BoxGeometry(pw, ph, pd)
            ppG.translate(px, py, pz)
            collect('bldgParapet', parapetMat, ppG)
        }

        // Water tower
        if (opts.hasWaterTower) {
            for (const [lx, lz] of [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]] as [number, number][]) {
                const legGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8)
                legGeom.translate(bx + lx, bh + 0.42, bz + lz)
                collect('waterTowerLeg', waterTowerLegMat, legGeom)
            }
            const tankGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12)
            tankGeom.translate(bx, bh + 0.97, bz)
            collect('waterTowerTank', waterTowerTankMat, tankGeom)
            const coneGeom = new THREE.ConeGeometry(0.35, 0.25, 12)
            coneGeom.translate(bx, bh + 1.35, bz)
            collect('waterTowerCone', waterTowerConeMat, coneGeom)
        }
    }

    // ═══════════════════════════════════════════
    // PLACE BUILDINGS
    // ═══════════════════════════════════════════

    // Left side buildings
    addBuilding(-8, config.DOOR_ROW + 7, 4, 8, 4, 0, 4,
        { hasAwning: true, awningColor: 0x2a4a2a, hasShopFront: true, hasWaterTower: true })
    addBuilding(-8, config.DOOR_ROW + 14, 3.8, 12, 3.8, 1, 5,
        { hasAwning: true, awningColor: 0x6a2030, hasShopFront: true })
    addBuilding(-8, config.DOOR_ROW + 21, 3.5, 6, 3.5, 4, 3,
        { hasAwning: true, awningColor: 0x1a2a4a, hasShopFront: true })

    // Right side buildings
    addBuilding(config.GRID_W + 8, config.DOOR_ROW + 6, 4, 14, 4, 2, 5,
        { hasAwning: true, awningColor: 0x3a4a3a, hasShopFront: true, hasWaterTower: true })
    addBuilding(config.GRID_W + 8, config.DOOR_ROW + 13, 3.8, 7, 3.8, 3, 3,
        { hasAwning: true, awningColor: 0x5a4a30, hasShopFront: true })
    addBuilding(config.GRID_W + 8, config.DOOR_ROW + 20, 3.5, 10, 3.5, 5, 4,
        { hasAwning: true, awningColor: 0x2a3a3a, hasShopFront: true })

    // Background buildings
    addBuilding(-14, config.DOOR_ROW + 8, 4.5, 16, 4.5, 6, 5, { hasWaterTower: true, roofColor: 0x707070 })
    addBuilding(-14, config.DOOR_ROW + 17, 4, 10, 4, 7, 4, { roofColor: 0x707070 })
    addBuilding(config.GRID_W + 15, config.DOOR_ROW + 7, 4.5, 18, 4.5, 0, 6, { roofColor: 0x707070 })
    addBuilding(config.GRID_W + 15, config.DOOR_ROW + 16, 4, 12, 4, 3, 4, { hasWaterTower: true, roofColor: 0x707070 })

    // ═══════════════════════════════════════════
    // CARS — Realistic Colors
    // ═══════════════════════════════════════════
    const carColors = [0xf0f0f0, 0xb0b0b0, 0x3a3a3a, 0x1a2a4a, 0x6a2020, 0x1a1a1a, 0x8a8a7a]

    const carBodyMats = new Map<number, THREE.MeshStandardMaterial>()
    const carCabinMats = new Map<number, THREE.MeshStandardMaterial>()
    const getCarBodyMat = (colorIdx: number) => {
        const idx = colorIdx % carColors.length
        if (!carBodyMats.has(idx)) {
            carBodyMats.set(idx, new THREE.MeshStandardMaterial({ color: carColors[idx], roughness: 0.5, metalness: 0.15 }))
        }
        return carBodyMats.get(idx)!
    }
    const getCarCabinMat = (colorIdx: number) => {
        const idx = colorIdx % carColors.length
        if (!carCabinMats.has(idx)) {
            const cabinColor = new THREE.Color(carColors[idx]).lerp(new THREE.Color(0xffffff), 0.08)
            carCabinMats.set(idx, new THREE.MeshStandardMaterial({ color: cabinColor, roughness: 0.5, metalness: 0.15 }))
        }
        return carCabinMats.get(idx)!
    }

    const carWinMat = new THREE.MeshStandardMaterial({ color: 0x8ab0cc, roughness: 0.2, metalness: 0.1 })
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xFFF9C4, emissive: 0xFFF9C4, emissiveIntensity: 0.3 })
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xEF5350, emissive: 0xEF5350, emissiveIntensity: 0.3 })
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 })
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.3, metalness: 0.4 })
    const carShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false })

    const addCar = (cx: number, cz: number, rotY: number, colorIdx: number) => {
        const cIdx = colorIdx % carColors.length
        const carMatrix = new THREE.Matrix4()
        const rotM = new THREE.Matrix4().makeRotationY(rotY)
        const posM = new THREE.Matrix4().makeTranslation(cx, 0, cz)
        carMatrix.multiplyMatrices(posM, rotM)

        const lowerGeom = new THREE.BoxGeometry(0.9, 0.32, 1.8)
        lowerGeom.translate(0, 0.26, 0)
        lowerGeom.applyMatrix4(carMatrix)
        collect('carBody_' + cIdx, getCarBodyMat(colorIdx), lowerGeom, true)

        const cabinGeom = new THREE.BoxGeometry(0.78, 0.26, 0.85)
        cabinGeom.translate(0, 0.57, -0.08)
        cabinGeom.applyMatrix4(carMatrix)
        collect('carCabin_' + cIdx, getCarCabinMat(colorIdx), cabinGeom, true)

        const frontWinGeom = new THREE.BoxGeometry(0.62, 0.18, 0.04)
        frontWinGeom.translate(0, 0.57, 0.36)
        frontWinGeom.applyMatrix4(carMatrix)
        collect('carWin', carWinMat, frontWinGeom)

        const rearWinGeom = new THREE.BoxGeometry(0.62, 0.18, 0.04)
        rearWinGeom.translate(0, 0.57, -0.52)
        rearWinGeom.applyMatrix4(carMatrix)
        collect('carWin', carWinMat, rearWinGeom)

        for (const lx of [-0.28, 0.28]) {
            const hlGeom = new THREE.BoxGeometry(0.14, 0.09, 0.04)
            hlGeom.translate(lx, 0.26, 0.92)
            hlGeom.applyMatrix4(carMatrix)
            collect('headlight', hlMat, hlGeom)
        }
        for (const lx of [-0.28, 0.28]) {
            const tlGeom = new THREE.BoxGeometry(0.14, 0.09, 0.04)
            tlGeom.translate(lx, 0.26, -0.92)
            tlGeom.applyMatrix4(carMatrix)
            collect('taillight', tlMat, tlGeom)
        }
        for (const [wx, wz] of [[-0.45, 0.5], [0.45, 0.5], [-0.45, -0.5], [0.45, -0.5]] as [number, number][]) {
            const wheelGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12)
            wheelGeom.rotateZ(Math.PI / 2)
            wheelGeom.translate(wx, 0.14, wz)
            wheelGeom.applyMatrix4(carMatrix)
            collect('carWheel', wheelMat, wheelGeom)
            const hubGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.11, 8)
            hubGeom.rotateZ(Math.PI / 2)
            hubGeom.translate(wx, 0.14, wz)
            hubGeom.applyMatrix4(carMatrix)
            collect('carHub', hubMat, hubGeom)
        }
        const shadowGeom = new THREE.CircleGeometry(0.8, 12)
        shadowGeom.scale(1, 1.8, 1)
        shadowGeom.rotateX(-Math.PI / 2)
        shadowGeom.translate(0, 0.01, 0)
        shadowGeom.applyMatrix4(carMatrix)
        collect('carShadow', carShadowMat, shadowGeom)
    }

    addCar(-1.8, config.DOOR_ROW + 6, 0, 0)
    addCar(-1.8, config.DOOR_ROW + 11, 0, 1)
    addCar(-1.8, config.DOOR_ROW + 18, 0, 4)
    addCar(config.GRID_W + 0.8, config.DOOR_ROW + 8, Math.PI, 2)
    addCar(config.GRID_W + 0.8, config.DOOR_ROW + 15, Math.PI, 3)
    addCar(config.GRID_W + 0.8, config.DOOR_ROW + 22, Math.PI, 5)

    // ═══════════════════════════════════════════
    // TREES — Taller with multi-sphere canopy
    // ═══════════════════════════════════════════
    const treeGreens = [0x4a6a3a, 0x5a7a4a, 0x3a5a2a, 0x4a5a3a, 0x5a6a4a]

    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.8 })
    const treeCrownMats = new Map<number, THREE.MeshStandardMaterial>()
    const getTreeCrownMat = (treeIdx: number) => {
        const idx = treeIdx % treeGreens.length
        if (!treeCrownMats.has(idx)) {
            treeCrownMats.set(idx, new THREE.MeshStandardMaterial({ color: treeGreens[idx], roughness: 0.7 }))
        }
        return treeCrownMats.get(idx)!
    }
    const treeShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false })

    const addTree = (tx: number, tz: number, treeIdx: number) => {
        const crownIdx = treeIdx % treeGreens.length

        // Taller trunk
        const trunkGeom = new THREE.CylinderGeometry(0.06, 0.09, 0.8, 8)
        trunkGeom.translate(tx, 0.4, tz)
        collect('treeTrunk', treeTrunkMat, trunkGeom)

        // Multi-sphere canopy (3-4 overlapping spheres)
        const crownMat = getTreeCrownMat(treeIdx)
        const crownPositions = [
            [0, 0, 0, 0.45],
            [-0.15, 0.12, 0.1, 0.35],
            [0.18, 0.08, -0.08, 0.38],
            [0.05, -0.1, 0.15, 0.32],
        ] as [number, number, number, number][]
        for (const [ox, oy, oz, r] of crownPositions) {
            const cg = new THREE.SphereGeometry(r, 12, 8)
            cg.translate(tx + ox, 1.1 + oy, tz + oz)
            collect('treeCrown_' + crownIdx, crownMat, cg, true)
        }

        // Shadow
        const shadowGeom = new THREE.CircleGeometry(0.6, 10)
        shadowGeom.rotateX(-Math.PI / 2)
        shadowGeom.translate(tx, 0.01, tz)
        collect('treeShadow', treeShadowMat, shadowGeom)
    }

    const leftTreeZ = [config.DOOR_ROW + 5, config.DOOR_ROW + 10, config.DOOR_ROW + 16, config.DOOR_ROW + 22]
    leftTreeZ.forEach((z, i) => addTree(-2.5, z, i))
    const rightTreeZ = [config.DOOR_ROW + 7, config.DOOR_ROW + 12, config.DOOR_ROW + 19, config.DOOR_ROW + 25]
    rightTreeZ.forEach((z, i) => addTree(config.GRID_W + 1.5, z, i + 2))

    // ═══════════════════════════════════════════
    // SHRUBS / HEDGES
    // ═══════════════════════════════════════════
    const shrubMat = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.7 })
    // Hedges along sidewalks between trees
    for (const sz of [config.DOOR_ROW + 7.5, config.DOOR_ROW + 13, config.DOOR_ROW + 19]) {
        const shG = new THREE.BoxGeometry(0.8, 0.35, 0.5)
        shG.translate(-2.5, 0.18, sz)
        collect('shrubs', shrubMat, shG, true)
    }
    for (const sz of [config.DOOR_ROW + 9.5, config.DOOR_ROW + 15.5, config.DOOR_ROW + 22]) {
        const shG = new THREE.BoxGeometry(0.8, 0.35, 0.5)
        shG.translate(config.GRID_W + 1.5, 0.18, sz)
        collect('shrubs', shrubMat, shG, true)
    }

    // Planter boxes near building entrances
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.7 })
    const planterGreenMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, roughness: 0.7 })
    for (const [px, pz] of [[-6, config.DOOR_ROW + 7], [config.GRID_W + 6, config.DOOR_ROW + 6]] as [number, number][]) {
        // Concrete box
        const pbG = new THREE.BoxGeometry(0.6, 0.3, 0.6)
        pbG.translate(px, 0.15, pz)
        collect('planters', planterMat, pbG)
        // Green bush
        const pgG = new THREE.SphereGeometry(0.25, 8, 6)
        pgG.translate(px, 0.42, pz)
        collect('planterGreen', planterGreenMat, pgG, true)
    }

    // ═══════════════════════════════════════════
    // STREET FURNITURE
    // ═══════════════════════════════════════════

    // Traffic lights with visors
    const trafficPoleMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.3, metalness: 0.7 })
    const trafficBoxMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5, metalness: 0.3 })
    const trafficLightColors = [0xff1744, 0xffab00, 0x00c853]
    const trafficBulbMats = trafficLightColors.map((lc, li) =>
        new THREE.MeshStandardMaterial({ color: lc, emissive: lc, emissiveIntensity: li === 2 ? 1.5 : 0.3 })
    )
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.2 })

    for (const [tx, tz] of [[-0.8, config.DOOR_ROW + 3.5], [config.GRID_W - 0.2, config.DOOR_ROW + 28.5]] as [number, number][]) {
        const poleGeom = new THREE.CylinderGeometry(0.04, 0.05, 3.0, 12)
        poleGeom.translate(tx, 1.5, tz)
        collect('trafficPole', trafficPoleMat, poleGeom)

        const boxGeom = new THREE.BoxGeometry(0.22, 0.55, 0.14)
        boxGeom.translate(tx, 3.1, tz)
        collect('trafficBox', trafficBoxMat, boxGeom)

        trafficLightColors.forEach((lc, li) => {
            const bulbGeom = new THREE.SphereGeometry(0.05, 10, 8)
            bulbGeom.translate(tx, 3.32 - li * 0.18, tz + 0.08)
            collect('trafficBulb_' + li, trafficBulbMats[li], bulbGeom)
            // Visor hood above each light
            const vG = new THREE.BoxGeometry(0.14, 0.02, 0.06)
            vG.translate(tx, 3.37 - li * 0.18, tz + 0.10)
            collect('visors', visorMat, vG)
        })
    }

    // Fire hydrants
    const hydrantBodyMat = new THREE.MeshStandardMaterial({ color: 0xcc2020, roughness: 0.6 })
    const hydrantCapMat = new THREE.MeshStandardMaterial({ color: 0xd0a020, roughness: 0.5 })
    for (const [hx, hz] of [[-1.5, config.DOOR_ROW + 9], [config.GRID_W + 0.5, config.DOOR_ROW + 17]] as [number, number][]) {
        const hydrantGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8)
        hydrantGeom.translate(hx, 0.2, hz)
        collect('hydrant', hydrantBodyMat, hydrantGeom)
        const capGeom = new THREE.SphereGeometry(0.1, 8, 6)
        capGeom.translate(hx, 0.42, hz)
        collect('hydrantCap', hydrantCapMat, capGeom)
    }

    // Modern LED street lamps (taller, flat rectangular head)
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.3, metalness: 0.6 })
    const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.4, metalness: 0.5 })
    const lampGlowMat = new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xfff4e0, emissiveIntensity: 1.2, roughness: 0.2 })

    for (const [lx, lz] of [[-2.5, config.DOOR_ROW + 8], [config.GRID_W + 1.5, config.DOOR_ROW + 14],
        [-2.5, config.DOOR_ROW + 20], [config.GRID_W + 1.5, config.DOOR_ROW + 24]] as [number, number][]) {
        // Tall pole
        const poleGeom = new THREE.CylinderGeometry(0.035, 0.05, 5.0, 12)
        poleGeom.translate(lx, 2.5, lz)
        collect('lampPole', lampPoleMat, poleGeom)
        // Horizontal arm
        const armG = new THREE.BoxGeometry(0.8, 0.03, 0.03)
        armG.translate(lx + 0.4, 5.0, lz)
        collect('lampArm', lampHeadMat, armG)
        // Flat rectangular LED head (angled downward)
        const headG = new THREE.BoxGeometry(0.5, 0.04, 0.25)
        headG.rotateX(0.15)
        headG.translate(lx + 0.6, 4.95, lz)
        collect('lampHead', lampHeadMat, headG)
        // Glow surface (underside)
        const glowG = new THREE.BoxGeometry(0.4, 0.01, 0.18)
        glowG.translate(lx + 0.6, 4.92, lz)
        collect('lampGlow', lampGlowMat, glowG)
        // Warm point light
        const lampLight = new THREE.PointLight(0xfff4e0, 2.0, 8)
        lampLight.position.set(lx + 0.6, 4.8, lz)
        scene.add(lampLight)
    }

    // Park benches
    const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.7, metalness: 0.0 })
    const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.6 })
    for (const [bx, bz, rotY] of [[-3.0, config.DOOR_ROW + 14, 0], [config.GRID_W + 2.0, config.DOOR_ROW + 18, Math.PI]] as [number, number, number][]) {
        const benchMatrix = new THREE.Matrix4()
        benchMatrix.multiplyMatrices(
            new THREE.Matrix4().makeTranslation(bx, 0, bz),
            new THREE.Matrix4().makeRotationY(rotY)
        )
        // Seat slats
        for (let s = 0; s < 4; s++) {
            const slG = new THREE.BoxGeometry(0.08, 0.02, 1.0)
            slG.translate(-0.12 + s * 0.08, 0.42, 0)
            slG.applyMatrix4(benchMatrix)
            collect('benchWood', benchWoodMat, slG)
        }
        // Back slats
        for (let s = 0; s < 3; s++) {
            const slG = new THREE.BoxGeometry(0.02, 0.08, 1.0)
            slG.translate(-0.22, 0.52 + s * 0.10, 0)
            slG.applyMatrix4(benchMatrix)
            collect('benchWood', benchWoodMat, slG)
        }
        // Metal legs
        for (const lz2 of [-0.35, 0.35]) {
            const lgG = new THREE.BoxGeometry(0.30, 0.42, 0.03)
            lgG.translate(0, 0.21, lz2)
            lgG.applyMatrix4(benchMatrix)
            collect('benchMetal', benchMetalMat, lgG)
        }
    }

    // Manhole covers
    const manholeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.3 })
    for (const [mx, mz] of [[config.GRID_CENTER_X - 2, config.DOOR_ROW + 15], [config.GRID_CENTER_X + 3, config.DOOR_ROW + 8]] as [number, number][]) {
        const mG = new THREE.CylinderGeometry(0.25, 0.25, 0.02, 16)
        mG.translate(mx, -0.12, mz)
        collect('manholes', manholeMat, mG)
    }

    // ═══════════════════════════════════════════
    // MERGE ALL COLLECTED GEOMETRIES
    // ═══════════════════════════════════════════
    gc.forEach(({ mat, geoms, castShadow, receiveShadow }) => {
        if (geoms.length === 0) return
        const merged = mergeGeometries(geoms, false)
        if (!merged) return
        const mesh = new THREE.Mesh(merged, mat)
        mesh.castShadow = castShadow
        mesh.receiveShadow = receiveShadow
        scene.add(mesh)
    })

    // ═══════════════════════════════════════════
    // HEMISPHERE LIGHT
    // ═══════════════════════════════════════════
    const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x4a4840, 0.5)
    skyLight.position.set(0, 10, 0)
    skyLight.name = 'env_hemisphere'
    scene.add(skyLight)

    return { skyLight, animatedObjects }
}

// ═══════════════════════════════════════════
// THEME APPLICATION
// ═══════════════════════════════════════════
export function applyThemeToEnvironment(scene: THREE.Scene, _theme: 'light' | 'dark') {
    const sunDir = new THREE.Vector3()
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 50), THREE.MathUtils.degToRad(180))

    const sky = scene.getObjectByName('env_sky') as Sky | undefined
    if (sky) {
        const u = (sky.material as THREE.ShaderMaterial).uniforms as Record<string, THREE.IUniform<unknown>>
        ;(u['turbidity'] as THREE.IUniform<number>).value = 2.0
        ;(u['rayleigh'] as THREE.IUniform<number>).value = 0.4
        ;(u['mieCoefficient'] as THREE.IUniform<number>).value = 0.003
        ;(u['mieDirectionalG'] as THREE.IUniform<number>).value = 0.95
        ;(u['sunPosition'] as THREE.IUniform<THREE.Vector3>).value.copy(sunDir)
    }

    const sun = scene.getObjectByName('env_sun') as THREE.DirectionalLight | undefined
    if (sun) {
        sun.position.copy(sunDir).multiplyScalar(170)
        sun.color.setHex(0xffffff); sun.intensity = 2.5
    }

    const hemi = scene.getObjectByName('env_hemisphere') as THREE.HemisphereLight | undefined
    if (hemi) {
        hemi.color.setHex(0x87CEEB)
        hemi.groundColor.setHex(0x4a4840)
        hemi.intensity = 1.0
    }
}
