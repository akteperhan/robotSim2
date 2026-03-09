import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// ═══════════════════════════════════════════
// SKY GRADIENT TEXTURE — vibrant city morning
// ═══════════════════════════════════════════
export function createSkyGradient(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 2; canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 512)
    g.addColorStop(0,    '#0d47a1')   // Deep cobalt at zenith
    g.addColorStop(0.10, '#1565c0')   // Strong blue
    g.addColorStop(0.25, '#1e88e5')   // Medium blue
    g.addColorStop(0.42, '#42a5f5')   // Bright sky blue
    g.addColorStop(0.60, '#81d4fa')   // Light azure
    g.addColorStop(0.78, '#b3e5fc')   // Near horizon, pale blue-white
    g.addColorStop(0.90, '#e1f5fe')   // Horizon haze
    g.addColorStop(1.0,  '#fff8e1')   // Warm horizon glow
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

    // === Atmospheric Fog (light and airy) ===
    scene.fog = new THREE.FogExp2(0xe8f4fd, 0.004)

    // === Sky Shader (vivid blue, midday sun) ===
    const sky = new Sky()
    sky.scale.setScalar(480)
    sky.position.set(config.GRID_CENTER_X, 0, config.DOOR_ROW + 10)
    const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms as Record<string, THREE.IUniform<unknown>>
        ; (skyUniforms['turbidity'] as THREE.IUniform<number>).value = 0.6
        ; (skyUniforms['rayleigh'] as THREE.IUniform<number>).value = 3.5
        ; (skyUniforms['mieCoefficient'] as THREE.IUniform<number>).value = 0.003
        ; (skyUniforms['mieDirectionalG'] as THREE.IUniform<number>).value = 0.96
    const sunDir = new THREE.Vector3()
    const elevation = 38, azimuth = 210
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth))
        ; (skyUniforms['sunPosition'] as THREE.IUniform<THREE.Vector3>).value.copy(sunDir)
        ; (sky.material as THREE.ShaderMaterial).depthWrite = false
    sky.name = 'env_sky'
    scene.add(sky)

    // === Sun Disc (larger, clearly visible) ===
    const skyCenter = new THREE.Vector3(config.GRID_CENTER_X, 0, config.DOOR_ROW + 10)
    const sunWorldPos = sunDir.clone().multiplyScalar(200).add(skyCenter)
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(4.5, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xfffde7, depthTest: false }))
    sunDisc.position.copy(sunWorldPos); sunDisc.renderOrder = 999; sunDisc.name = 'env_sun_disc'
    scene.add(sunDisc)
    const sunGlow1 = new THREE.Mesh(new THREE.SphereGeometry(7.5, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.35, depthTest: false }))
    sunGlow1.position.copy(sunWorldPos); sunGlow1.renderOrder = 998; scene.add(sunGlow1)
    const sunGlow2 = new THREE.Mesh(new THREE.SphereGeometry(12, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0.12, depthTest: false }))
    sunGlow2.position.copy(sunWorldPos); sunGlow2.renderOrder = 997; scene.add(sunGlow2)

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

    // === Birds — multiple flocks, varied colors, lower altitude ===
    const birdColors = [0x222222, 0x5a3a2a, 0x888888, 0xf0ece0, 0x3a3a5a, 0x4a3a3a, 0xc8c8c8]
    const _DR = config.DOOR_ROW
    const birdFlocks: [number, number, number, number, number][] = [
        // [x, y, z, count, colorIdx]
        [-18, 7,  _DR + 10, 5, 0],
        [ -5, 9,  _DR + 22, 4, 2],
        [ 10, 6,  _DR + 15, 6, 3],
        [ 20, 8,  _DR + 30, 4, 1],
        [-12, 10, _DR + 40, 5, 4],
        [ 25, 7,  _DR +  5, 3, 6],
        [  0, 8,  _DR + 35, 5, 5],
        [-20, 6,  _DR -  5, 4, 2],
        [ 18, 9,  _DR + 50, 4, 0],
    ]
    birdFlocks.forEach(([fx, fy, fz, count, cIdx]) => {
        const mat = new THREE.MeshStandardMaterial({ color: birdColors[cIdx], roughness: 0.8 })
        const flock = new THREE.Group()
        for (let b = 0; b < count; b++) {
            const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.09), mat)
            wing1.position.set(-0.12, 0, 0); wing1.rotation.z = 0.35
            const wing2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.09), mat)
            wing2.position.set(0.12, 0, 0); wing2.rotation.z = -0.35
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat)
            const bird = new THREE.Group()
            bird.add(wing1, wing2, body)
            bird.position.set(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 1.2,
                (Math.random() - 0.5) * 3
            )
            flock.add(bird)
        }
        flock.position.set(fx, fy, fz)
        scene.add(flock); animatedObjects.birds.push(flock)
    })

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

    // ═══════════════════════════════════════════
    // GROUND SYSTEM — eliminates floating/empty feel
    // ═══════════════════════════════════════════
    const CX = config.GRID_CENTER_X  // = 5
    const DR = config.DOOR_ROW       // = 20
    const GW = config.GRID_W         // = 12

    // 1. MEGA earth base — 400×400, fills everything below
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x5c7a4a, roughness: 0.95, metalness: 0.0 })
    const earthGeom = new THREE.PlaneGeometry(400, 400)
    earthGeom.rotateX(-Math.PI / 2)
    earthGeom.translate(CX, -0.6, DR + 15)
    collect('earth', earthMat, earthGeom, false, true)

    // 2. City block concrete — large flat concrete surface (120×90)
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xb0aca0, roughness: 0.82, metalness: 0.0 })
    const concreteGeom = new THREE.PlaneGeometry(120, 90)
    concreteGeom.rotateX(-Math.PI / 2)
    concreteGeom.translate(CX, -0.22, DR + 12)
    collect('concrete', concreteMat, concreteGeom, false, true)

    // 3. MAIN ROAD (north-south, wider: 14 units wide, 100 long)
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x323232, roughness: 0.88, metalness: 0.0 })
    const mainRoadG = new THREE.PlaneGeometry(14, 100)
    mainRoadG.rotateX(-Math.PI / 2)
    mainRoadG.translate(CX, -0.18, DR + 15)
    collect('road', roadMat, mainRoadG, false, true)

    // 4. CROSS ROADS (east-west, at DR+3, DR+24, DR+44)
    for (const cz of [DR + 3, DR + 24, DR + 44]) {
        const crG = new THREE.PlaneGeometry(100, 8)
        crG.rotateX(-Math.PI / 2)
        crG.translate(CX, -0.17, cz)
        collect('road', roadMat, crG, false, true)
    }
    // Back road (behind garage)
    const backRoadG = new THREE.PlaneGeometry(100, 8)
    backRoadG.rotateX(-Math.PI / 2)
    backRoadG.translate(CX, -0.17, DR - 28)
    collect('road', roadMat, backRoadG, false, true)

    // 5. SIDEWALKS — wider, on both sides, longer
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xc4c0b4, roughness: 0.72, metalness: 0.0 })
    // Left sidewalk (x = CX - 10 to CX - 7)
    const lsw = new THREE.BoxGeometry(6, 0.1, 100)
    lsw.translate(CX - 10, -0.19, DR + 15)
    collect('sidewalk', sidewalkMat, lsw, false, true)
    // Right sidewalk (x = CX + 7 to CX + 10)
    const rsw = new THREE.BoxGeometry(6, 0.1, 100)
    rsw.translate(CX + 11, -0.19, DR + 15)
    collect('sidewalk', sidewalkMat, rsw, false, true)
    // Cross-road sidewalks (perpendicular)
    for (const cz of [DR + 3, DR + 24]) {
        const csw1 = new THREE.BoxGeometry(100, 0.1, 3)
        csw1.translate(CX, -0.19, cz - 5.5)
        collect('sidewalk', sidewalkMat, csw1, false, true)
        const csw2 = new THREE.BoxGeometry(100, 0.1, 3)
        csw2.translate(CX, -0.19, cz + 5.5)
        collect('sidewalk', sidewalkMat, csw2, false, true)
    }

    // 6. RAISED CURBS
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.72, metalness: 0.0 })
    for (const [cx2, cz2, w, d] of [
        [CX - 7, DR + 15, 0.2, 100],   // left inner curb
        [CX + 8, DR + 15, 0.2, 100],   // right inner curb
    ] as [number, number, number, number][]) {
        const cG = new THREE.BoxGeometry(w, 0.14, d)
        cG.translate(cx2, -0.1, cz2)
        collect('curbs', curbMat, cG)
    }

    // 7. GRASS STRIPS (between sidewalk and buildings, both sides)
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x66a836, roughness: 0.92, metalness: 0.0 })
    // Left grass
    const lgG = new THREE.BoxGeometry(4, 0.06, 100)
    lgG.translate(CX - 15, -0.24, DR + 15)
    collect('grass', grassMat, lgG, false, true)
    // Right grass
    const rgG = new THREE.BoxGeometry(4, 0.06, 100)
    rgG.translate(CX + 15, -0.24, DR + 15)
    collect('grass', grassMat, rgG, false, true)
    // Far side grass zones
    for (const [gx, gz, gw, gd] of [
        [CX - 35, DR + 15, 30, 100],
        [CX + 35, DR + 15, 30, 100],
        [CX, DR + 68, 120, 20],
        [CX, DR - 40, 120, 16],
    ] as [number, number, number, number][]) {
        const fgG = new THREE.BoxGeometry(gw, 0.05, gd)
        fgG.translate(gx, -0.25, gz)
        collect('grass', grassMat, fgG, false, true)
    }

    // 8. WHITE ROAD MARKINGS
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe0e0de, roughness: 0.5 })
    // Main road center dashes
    for (let z = DR - 8; z < DR + 68; z += 3.5) {
        const dashG = new THREE.BoxGeometry(0.1, 0.02, 1.8)
        dashG.translate(CX, -0.14, z)
        collect('roadMarkings', whiteMat, dashG)
    }
    // Main road edge lines
    for (const xOff of [-6.9, 6.9]) {
        const elG = new THREE.BoxGeometry(0.12, 0.02, 100)
        elG.translate(CX + xOff, -0.14, DR + 15)
        collect('roadMarkings', whiteMat, elG)
    }
    // Crosswalk stripes at DR+3 and DR+24
    for (const cz of [DR + 3, DR + 24]) {
        for (let i = 0; i < 9; i++) {
            const sw = new THREE.BoxGeometry(1.1, 0.02, 0.42)
            sw.translate(CX - 4.4 + i * 1.1, -0.14, cz)
            collect('roadMarkings', whiteMat, sw)
        }
    }
    // Cross road edge lines
    for (const cz of [DR + 3, DR + 24]) {
        for (const zOff of [-4.1, 4.1]) {
            const elG2 = new THREE.BoxGeometry(100, 0.02, 0.1)
            elG2.translate(CX, -0.14, cz + zOff)
            collect('roadMarkings', whiteMat, elG2)
        }
    }

    // 9. GARAGE ENTRANCE APRON (wider, cleaner)
    const apronMat = new THREE.MeshStandardMaterial({ color: 0xcac6ba, roughness: 0.78, metalness: 0.0 })
    const apronG = new THREE.BoxGeometry(GW + 4, 0.05, 4)
    apronG.translate(CX, -0.17, DR - 1)
    collect('apron', apronMat, apronG, false, true)

    // 10. PARKING AREA (right side, more spaces)
    const parkLinesMat = new THREE.MeshStandardMaterial({ color: 0xe0e0d8, roughness: 0.52 })
    for (let pi = 0; pi < 6; pi++) {
        const pz = DR + 1 + pi * 2.4
        const plG = new THREE.BoxGeometry(0.06, 0.01, 2.2)
        plG.translate(GW + 1.5, -0.14, pz)
        collect('parkLines', parkLinesMat, plG)
        const prG = new THREE.BoxGeometry(0.06, 0.01, 2.2)
        prG.translate(GW + 4.5, -0.14, pz)
        collect('parkLines', parkLinesMat, prG)
    }
    const parkFrontG = new THREE.BoxGeometry(3, 0.01, 0.06)
    parkFrontG.translate(GW + 3, -0.14, DR)
    collect('parkLines', parkLinesMat, parkFrontG)
    const parkBackG = new THREE.BoxGeometry(3, 0.01, 0.06)
    parkBackG.translate(GW + 3, -0.14, DR + 15)
    collect('parkLines', parkLinesMat, parkBackG)

    // 11. BOLLARDS at parking & key corners
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 0.7 })
    for (const [bx, bz] of [
        [GW + 1.2, DR + 0.3], [GW + 4.8, DR + 0.3], [GW + 1.2, DR + 14.8],
        [CX - 7.2, DR + 0.3], [CX + 7.2, DR + 0.3],
    ] as [number, number][]) {
        const bG = new THREE.CylinderGeometry(0.07, 0.09, 0.52, 8)
        bG.translate(bx, 0.26, bz)
        collect('bollards', bollardMat, bG)
    }

    // ═══════════════════════════════════════════
    // BUILDING SYSTEM — Muted Realistic Palette
    // ═══════════════════════════════════════════
    const buildingPalette = [
        { body: 0x90caf9, base: 0x64b5f6 },   // Açık mavi
        { body: 0x80cbc4, base: 0x4db6ac },   // Turkuaz
        { body: 0xbcaaa4, base: 0xa1887f },   // Sıcak gri
        { body: 0xfff176, base: 0xfdd835 },   // Yumuşak sarı
        { body: 0xffab91, base: 0xff8a65 },   // Canlı turuncu
        { body: 0xa5d6a7, base: 0x81c784 },   // Hafif yeşil
        { body: 0xce93d8, base: 0xba68c8 },   // Lavanta
        { body: 0xb0bec5, base: 0x90a4ae },   // Modern gri
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

    // Window ledge / cornice materials
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0xc0b8a8, roughness: 0.6, metalness: 0.05 })
    const corniceMat = new THREE.MeshStandardMaterial({ color: 0xb0a898, roughness: 0.6, metalness: 0.05 })

    const addBuilding = (
        bx: number, bz: number,
        bw: number, bh: number, bd: number,
        paletteIdx: number, floors: number,
        options?: {
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

    }

    // ═══════════════════════════════════════════
    // PLACE BUILDINGS
    // ═══════════════════════════════════════════

    // Left side buildings
    addBuilding(-8, config.DOOR_ROW + 7, 4, 8, 4, 0, 4,
        { hasAwning: true, awningColor: 0x2a4a2a, hasShopFront: true })
    addBuilding(-8, config.DOOR_ROW + 14, 3.8, 12, 3.8, 1, 5,
        { hasAwning: true, awningColor: 0x6a2030, hasShopFront: true })
    addBuilding(-8, config.DOOR_ROW + 21, 3.5, 6, 3.5, 4, 3,
        { hasAwning: true, awningColor: 0x1a2a4a, hasShopFront: true })

    // Right side buildings
    addBuilding(config.GRID_W + 8, config.DOOR_ROW + 6, 4, 14, 4, 2, 5,
        { hasAwning: true, awningColor: 0x3a4a3a, hasShopFront: true })
    addBuilding(config.GRID_W + 8, config.DOOR_ROW + 13, 3.8, 7, 3.8, 3, 3,
        { hasAwning: true, awningColor: 0x5a4a30, hasShopFront: true })
    addBuilding(config.GRID_W + 8, config.DOOR_ROW + 20, 3.5, 10, 3.5, 5, 4,
        { hasAwning: true, awningColor: 0x2a3a3a, hasShopFront: true })

    // Background buildings
    addBuilding(-14, config.DOOR_ROW + 8, 4.5, 16, 4.5, 6, 5, { roofColor: 0x707070 })
    addBuilding(-14, config.DOOR_ROW + 17, 4, 10, 4, 7, 4, { roofColor: 0x707070 })
    addBuilding(config.GRID_W + 15, config.DOOR_ROW + 7, 4.5, 18, 4.5, 0, 6, { roofColor: 0x707070 })
    addBuilding(config.GRID_W + 15, config.DOOR_ROW + 16, 4, 12, 4, 3, 4, { roofColor: 0x707070 })

    // Extended left/right side buildings (more z coverage)
    addBuilding(-8, DR + 29, 4, 9, 4, 2, 4, { hasAwning: true, awningColor: 0x3a2a5a, hasShopFront: true })
    addBuilding(-8, DR + 37, 3.5, 7, 3.5, 5, 3, { hasShopFront: true })
    addBuilding(GW + 8, DR + 29, 3.8, 11, 3.8, 4, 4, { hasShopFront: true })
    addBuilding(GW + 8, DR + 37, 4, 8, 4, 6, 3, { hasAwning: true, awningColor: 0x4a3a1a })

    // Behind garage: buildings flanking the alley
    addBuilding(-8, DR - 8, 4, 11, 4, 3, 4, { roofColor: 0x707070 })
    addBuilding(-8, DR - 17, 3.8, 8, 3.8, 1, 3, { hasShopFront: true })
    addBuilding(GW + 8, DR - 8, 4, 13, 4, 0, 5, { roofColor: 0x707070 })
    addBuilding(GW + 8, DR - 17, 3.8, 9, 3.8, 2, 3, { hasShopFront: true })

    // Deeper far-left (x = -18): more z coverage
    addBuilding(-18, DR - 6, 5, 16, 5, 2, 5, { roofColor: 0x707070 })
    addBuilding(-18, DR + 27, 5, 20, 5, 0, 7, { roofColor: 0x707070 })
    addBuilding(-18, DR + 38, 4.5, 14, 4.5, 3, 5, { roofColor: 0x707070 })

    // Deeper far-right (x = GW+15 = 27): more z coverage
    addBuilding(GW + 15, DR - 6, 5, 18, 5, 6, 6, { roofColor: 0x707070 })
    addBuilding(GW + 15, DR + 27, 5, 20, 5, 1, 6, { roofColor: 0x707070 })
    addBuilding(GW + 15, DR + 38, 4.5, 15, 4.5, 4, 5, { roofColor: 0x707070 })

    // Very far silhouette buildings (simple boxes — distant city depth)
    ;([
        [-28, DR + 12, 7, 24, 7, 3], [-28, DR + 28, 6, 18, 6, 5],
        [-28, DR + 42, 7, 28, 7, 1], [-28, DR - 10, 6, 20, 6, 4],
        [GW + 28, DR + 12, 7, 26, 7, 0], [GW + 28, DR + 28, 6, 19, 6, 2],
        [GW + 28, DR + 42, 7, 30, 7, 6], [GW + 28, DR - 10, 6, 22, 6, 3],
        [CX - 48, DR + 15, 8, 20, 8, 2], [CX + 46, DR + 15, 8, 18, 8, 5],
        [CX - 15, DR + 68, 9, 22, 9, 0], [CX + 10, DR + 68, 9, 25, 9, 3],
        [CX + 28, DR + 65, 8, 20, 8, 6],
    ] as [number, number, number, number, number, number][]).forEach(([bx2, bz2, bw2, bh2, bd2, pi2]) => {
        const bMat = getBodyMat(pi2)
        const bG = new THREE.BoxGeometry(bw2, bh2, bd2)
        bG.translate(bx2, bh2 / 2, bz2)
        collect('body_' + (pi2 % buildingPalette.length), bMat, bG, true, false)
        const rG = new THREE.BoxGeometry(bw2 + 0.15, 0.18, bd2 + 0.15)
        rG.translate(bx2, bh2 + 0.09, bz2)
        collect('roof', getRoofMat(0x707070), rG)
    })

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
        // shadowGeom removed per user request
    }

    addCar(-1.8, config.DOOR_ROW + 6, 0, 0)
    addCar(-1.8, config.DOOR_ROW + 11, 0, 1)
    addCar(-1.8, config.DOOR_ROW + 18, 0, 4)
    addCar(config.GRID_W + 0.8, config.DOOR_ROW + 8, Math.PI, 2)
    addCar(config.GRID_W + 0.8, config.DOOR_ROW + 15, Math.PI, 3)
    addCar(config.GRID_W + 0.8, config.DOOR_ROW + 22, Math.PI, 5)

    // Cross-road cars (east-west traffic)
    addCar(CX - 22, DR + 3, -Math.PI / 2, 1)
    addCar(CX + 20, DR + 3, Math.PI / 2, 4)
    addCar(CX - 22, DR + 24, -Math.PI / 2, 2)
    addCar(CX + 20, DR + 24, Math.PI / 2, 6)
    // Extended north lane
    addCar(-1.8, DR + 30, 0, 2)
    addCar(GW + 0.8, DR + 30, Math.PI, 0)
    // Behind garage lane
    addCar(-1.8, DR - 12, 0, 3)
    addCar(GW + 0.8, DR - 10, Math.PI, 6)

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

        // Shadow removed per user request
    }

    const leftTreeZ = [config.DOOR_ROW + 5, config.DOOR_ROW + 10, config.DOOR_ROW + 16, config.DOOR_ROW + 22]
    leftTreeZ.forEach((z, i) => addTree(-2.5, z, i))
    const rightTreeZ = [config.DOOR_ROW + 7, config.DOOR_ROW + 12, config.DOOR_ROW + 19, config.DOOR_ROW + 25]
    rightTreeZ.forEach((z, i) => addTree(config.GRID_W + 1.5, z, i + 2))

    // Extended trees — new building zones
    ;([DR + 27, DR + 33] as number[]).forEach((z, i) => addTree(-2.5, z, i + 4))
    ;([DR + 29, DR + 35] as number[]).forEach((z, i) => addTree(GW + 1.5, z, i + 1))
    addTree(-2.5, DR - 5, 2)
    addTree(GW + 1.5, DR - 5, 3)

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
// BUILDING COLLISION BOXES (for camera)
// ═══════════════════════════════════════════
export function getBuildingCollisionBoxes(
    config: { GRID_W: number, DOOR_ROW: number }
): THREE.Box3[] {
    const GW = config.GRID_W
    const DR = config.DOOR_ROW
    const M = 0.7  // collision margin around each building

    // [cx, cz, half-width-x, maxY, half-depth-z]
    const defs: [number, number, number, number, number][] = [
        // Left side
        [-8, DR + 7,   2 + M, 9,  2 + M],
        [-8, DR + 14,  1.9 + M, 13, 1.9 + M],
        [-8, DR + 21,  1.75 + M, 7, 1.75 + M],
        [-8, DR + 29,  2 + M, 10, 2 + M],
        [-8, DR + 37,  1.75 + M, 8, 1.75 + M],
        [-8, DR - 8,   2 + M, 12, 2 + M],
        [-8, DR - 17,  1.9 + M, 9, 1.9 + M],
        // Right side
        [GW + 8, DR + 6,  2 + M, 15, 2 + M],
        [GW + 8, DR + 13, 1.9 + M, 8,  1.9 + M],
        [GW + 8, DR + 20, 1.75 + M, 11, 1.75 + M],
        [GW + 8, DR + 29, 1.9 + M, 12, 1.9 + M],
        [GW + 8, DR + 37, 2 + M, 9,  2 + M],
        [GW + 8, DR - 8,  2 + M, 14, 2 + M],
        [GW + 8, DR - 17, 1.9 + M, 10, 1.9 + M],
        // Far left background
        [-14, DR + 8,  2.25 + M, 17, 2.25 + M],
        [-14, DR + 17, 2 + M,   11, 2 + M],
        [-18, DR - 6,  2.5 + M, 17, 2.5 + M],
        [-18, DR + 27, 2.5 + M, 21, 2.5 + M],
        [-18, DR + 38, 2.25 + M, 15, 2.25 + M],
        // Far right background
        [GW + 15, DR + 7,  2.25 + M, 19, 2.25 + M],
        [GW + 15, DR + 16, 2 + M,   13, 2 + M],
        [GW + 15, DR - 6,  2.5 + M, 19, 2.5 + M],
        [GW + 15, DR + 27, 2.5 + M, 21, 2.5 + M],
        [GW + 15, DR + 38, 2.25 + M, 16, 2.25 + M],
    ]

    return defs.map(([cx, cz, hw, maxY, hd]) =>
        new THREE.Box3(
            new THREE.Vector3(cx - hw, -1, cz - hd),
            new THREE.Vector3(cx + hw, maxY, cz + hd)
        )
    )
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
            ; (u['turbidity'] as THREE.IUniform<number>).value = 2.0
            ; (u['rayleigh'] as THREE.IUniform<number>).value = 0.4
            ; (u['mieCoefficient'] as THREE.IUniform<number>).value = 0.003
            ; (u['mieDirectionalG'] as THREE.IUniform<number>).value = 0.95
            ; (u['sunPosition'] as THREE.IUniform<THREE.Vector3>).value.copy(sunDir)
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
