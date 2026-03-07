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
// CARTOON CITY BLOCK WITH SKY
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

    // === Atmospheric Fog ===
    scene.fog = new THREE.FogExp2(0xd4e4f0, 0.008)

    // === Sky Shader ===
    const sky = new Sky()
    sky.scale.setScalar(480)
    sky.position.set(config.GRID_CENTER_X, 0, config.DOOR_ROW + 10)
    const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms as Record<string, THREE.IUniform<unknown>>
    ;(skyUniforms['turbidity'] as THREE.IUniform<number>).value = 1.5
    ;(skyUniforms['rayleigh'] as THREE.IUniform<number>).value = 0.3
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
        // Fuselage
        const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 1.8, 12), planeMat)
        fuse.rotation.z = Math.PI / 2; planeGroup.add(fuse)
        // Nose cone
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 12), planeMat)
        nose.rotation.z = -Math.PI / 2; nose.position.x = 1.1; planeGroup.add(nose)
        // Wings
        const wingGeo = new THREE.BoxGeometry(0.8, 0.04, 2.4)
        const wing = new THREE.Mesh(wingGeo, planeMat)
        wing.position.set(-0.1, 0, 0); planeGroup.add(wing)
        // Tail vertical
        const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.05), planeTailMat)
        tailV.position.set(-0.85, 0.25, 0); planeGroup.add(tailV)
        // Tail horizontal
        const tailH = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.7), planeMat)
        tailH.position.set(-0.85, 0.08, 0); planeGroup.add(tailH)
        // Windows
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

    // === ROAD SURFACE ===
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95, metalness: 0.0 })
    const roadGeom = new THREE.PlaneGeometry(config.GRID_W + 6, 44)
    roadGeom.rotateX(-Math.PI / 2)
    roadGeom.translate(config.GRID_CENTER_X, -0.14, config.DOOR_ROW + 10)
    collect('road', roadMat, roadGeom, false, true)

    // === SIDEWALKS ===
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.8, metalness: 0.0 })
    // Left sidewalk
    const leftSWGeom = new THREE.BoxGeometry(5, 0.12, 44)
    leftSWGeom.translate(-3.5, -0.12, config.DOOR_ROW + 10)
    collect('sidewalk', sidewalkMat, leftSWGeom, false, true)
    // Right sidewalk
    const rightSWGeom = new THREE.BoxGeometry(5, 0.12, 44)
    rightSWGeom.translate(config.GRID_W + 2.5, -0.12, config.DOOR_ROW + 10)
    collect('sidewalk', sidewalkMat, rightSWGeom, false, true)

    // === YELLOW ROAD EDGE LINES ===
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xFFD600, roughness: 0.5 })
    for (const xPos of [-0.7, config.GRID_W - 0.3]) {
        const lineGeom = new THREE.BoxGeometry(0.12, 0.02, 40)
        lineGeom.translate(xPos, -0.06, config.DOOR_ROW + 10)
        collect('yellow', yellowMat, lineGeom)
    }
    // Center dashed yellow line
    for (let z = config.DOOR_ROW - 6; z < config.DOOR_ROW + 32; z += 2.5) {
        const dashGeom = new THREE.BoxGeometry(0.08, 0.02, 1.2)
        dashGeom.translate(config.GRID_CENTER_X, -0.06, z)
        collect('yellow', yellowMat, dashGeom)
    }

    // === WHITE CROSSWALK STRIPES ===
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    // Front crosswalk (near garage door)
    for (let i = 0; i < 7; i++) {
        const stripeGeom = new THREE.BoxGeometry(1.0, 0.02, 0.35)
        stripeGeom.translate(-0.5 + i * ((config.GRID_W + 0.6) / 6), -0.06, config.DOOR_ROW + 3)
        collect('white', crossMat, stripeGeom)
    }
    // Rear crosswalk
    for (let i = 0; i < 7; i++) {
        const stripeGeom = new THREE.BoxGeometry(1.0, 0.02, 0.35)
        stripeGeom.translate(-0.5 + i * ((config.GRID_W + 0.6) / 6), -0.06, config.DOOR_ROW + 28)
        collect('white', crossMat, stripeGeom)
    }

    // === CROSS STREETS (perpendicular) ===
    for (const cz of [config.DOOR_ROW + 3, config.DOOR_ROW + 28]) {
        const crossRoadGeom = new THREE.PlaneGeometry(50, 5)
        crossRoadGeom.rotateX(-Math.PI / 2)
        crossRoadGeom.translate(config.GRID_CENTER_X, -0.13, cz)
        collect('road', roadMat, crossRoadGeom, false, true)
        // Yellow edge lines for cross streets
        for (const edgeOff of [-2.3, 2.3]) {
            const edgeLineGeom = new THREE.BoxGeometry(50, 0.02, 0.08)
            edgeLineGeom.translate(config.GRID_CENTER_X, -0.05, cz + edgeOff)
            collect('yellow', yellowMat, edgeLineGeom)
        }
    }

    // === COURTYARD (in front of garage) ===
    const courtyardMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.7 })
    const courtyardGeom = new THREE.BoxGeometry(config.GRID_W + 2, 0.06, 3)
    courtyardGeom.translate(config.GRID_CENTER_X, -0.1, config.DOOR_ROW + 1)
    collect('courtyard', courtyardMat, courtyardGeom, false, true)

    // ═══════════════════════════════════════════
    // CARTOON BUILDING SYSTEM
    // ═══════════════════════════════════════════
    const buildingPalette = [
        { body: 0x4CAF50, base: 0x388E3C },   // Green
        { body: 0xFF9800, base: 0xEF6C00 },   // Orange
        { body: 0xE53935, base: 0xC62828 },   // Red
        { body: 0x1976D2, base: 0x0D47A1 },   // Blue
        { body: 0xFFC107, base: 0xFFA000 },   // Yellow
        { body: 0x00897B, base: 0x00695C },   // Teal
        { body: 0x7B1FA2, base: 0x6A1B9A },   // Purple
        { body: 0xF06292, base: 0xE91E63 },   // Pink
    ]

    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.5 })
    const windowGlassMat = new THREE.MeshStandardMaterial({ color: 0x90CAF9, roughness: 0.3, metalness: 0.1 })

    // Pre-create shared materials for buildings to avoid duplicates
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
            baseMats.set(idx, new THREE.MeshStandardMaterial({ color: buildingPalette[idx].base, roughness: 0.65, metalness: 0.05 }))
        }
        return baseMats.get(idx)!
    }

    // Pre-create shared materials for roofs
    const roofMats = new Map<number, THREE.MeshStandardMaterial>()
    const getRoofMat = (color: number) => {
        if (!roofMats.has(color)) {
            roofMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }))
        }
        return roofMats.get(color)!
    }

    // Pre-create shared materials for awnings
    const awningMats = new Map<number, THREE.MeshStandardMaterial>()
    const getAwningMat = (color: number) => {
        if (!awningMats.has(color)) {
            awningMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide }))
        }
        return awningMats.get(color)!
    }

    const shopWinMat = new THREE.MeshStandardMaterial({
        color: 0xB3E5FC, roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.7
    })
    const shopDoorMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.6 })
    const awningStripeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.6 })

    // Water tower materials (shared)
    const waterTowerLegMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.7 })
    const waterTowerTankMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.6 })
    const waterTowerConeMat = new THREE.MeshStandardMaterial({ color: 0x4E342E, roughness: 0.7 })

    const addCartoonBuilding = (
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

        // Darker ground floor
        const floorH = bh / floors
        const baseMat = getBaseMat(paletteIdx)
        const baseGeom = new THREE.BoxGeometry(bw + 0.04, floorH, bd + 0.04)
        baseGeom.translate(bx, floorH / 2, bz)
        collect('base_' + pIdx, baseMat, baseGeom)

        // Window grid (front and back)
        const winW = 0.35, winH = 0.45
        const winsPerRow = Math.max(2, Math.floor((bw - 0.4) / 0.6))
        const winSpacing = (bw - 0.4) / Math.max(winsPerRow - 1, 1)

        for (let f = 1; f < floors; f++) {
            const wy = f * floorH + floorH * 0.5
            for (let wi = 0; wi < winsPerRow; wi++) {
                const wx = bx - (bw - 0.4) / 2 + wi * winSpacing
                // Front and back faces
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

        // Shop front (ground floor)
        if (opts.hasShopFront) {
            const shopWinGeom = new THREE.BoxGeometry(bw * 0.6, floorH * 0.6, 0.04)
            shopWinGeom.translate(bx - bw * 0.08, floorH * 0.42, bz + bd / 2 + 0.03)
            collect('shopWin', shopWinMat, shopWinGeom)

            // Door
            const shopDoorGeom = new THREE.BoxGeometry(0.45, floorH * 0.75, 0.04)
            shopDoorGeom.translate(bx + bw * 0.32, floorH * 0.38, bz + bd / 2 + 0.03)
            collect('shopDoor', shopDoorMat, shopDoorGeom)
        }

        // Striped awning
        if (opts.hasAwning) {
            const awningColor = opts.awningColor || 0xE53935
            const awningW = bw * 0.9
            const awningDepth = 0.7
            const awningY = floorH + 0.08

            const awningMat = getAwningMat(awningColor)
            const awningGeom = new THREE.BoxGeometry(awningW, 0.05, awningDepth)
            awningGeom.rotateX(0.15)
            awningGeom.translate(bx, awningY, bz + bd / 2 + awningDepth / 2)
            collect('awning_' + awningColor.toString(16), awningMat, awningGeom)

            // White stripes
            const stripeCount = Math.floor(awningW / 0.3)
            for (let si = 0; si < stripeCount; si += 2) {
                const stripeGeom = new THREE.BoxGeometry(0.12, 0.06, awningDepth)
                stripeGeom.rotateX(0.15)
                stripeGeom.translate(bx - awningW / 2 + si * 0.3 + 0.15, awningY + 0.01, bz + bd / 2 + awningDepth / 2)
                collect('awningStripe', awningStripeMat, stripeGeom)
            }
        }

        // Roof slab
        const roofColor = opts.roofColor || 0x9E9E9E
        const roofMat = getRoofMat(roofColor)
        const roofKey = roofColor === 0x9E9E9E ? 'roof' : 'roofGray'
        const roofGeom = new THREE.BoxGeometry(bw + 0.12, 0.12, bd + 0.12)
        roofGeom.translate(bx, bh + 0.06, bz)
        collect(roofKey, roofMat, roofGeom)

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

    // ── Left side buildings (facing road) — pushed further left to avoid camera ──
    addCartoonBuilding(-8, config.DOOR_ROW + 7, 4, 8, 4, 0, 4,
        { hasAwning: true, awningColor: 0xE53935, hasShopFront: true, hasWaterTower: true })
    addCartoonBuilding(-8, config.DOOR_ROW + 14, 3.8, 12, 3.8, 1, 5,
        { hasAwning: true, awningColor: 0xFF9800, hasShopFront: true })
    addCartoonBuilding(-8, config.DOOR_ROW + 21, 3.5, 6, 3.5, 4, 3,
        { hasAwning: true, awningColor: 0x1976D2, hasShopFront: true })

    // ── Right side buildings (facing road) — pushed further right to avoid camera ──
    addCartoonBuilding(config.GRID_W + 8, config.DOOR_ROW + 6, 4, 14, 4, 2, 5,
        { hasAwning: true, awningColor: 0x4CAF50, hasShopFront: true, hasWaterTower: true })
    addCartoonBuilding(config.GRID_W + 8, config.DOOR_ROW + 13, 3.8, 7, 3.8, 3, 3,
        { hasAwning: true, awningColor: 0xFFC107, hasShopFront: true })
    addCartoonBuilding(config.GRID_W + 8, config.DOOR_ROW + 20, 3.5, 10, 3.5, 5, 4,
        { hasAwning: true, awningColor: 0x00897B, hasShopFront: true })

    // ── Background buildings (further back, no shops) ──
    addCartoonBuilding(-14, config.DOOR_ROW + 8, 4.5, 16, 4.5, 1, 5, { hasWaterTower: true, roofColor: 0xBDBDBD })
    addCartoonBuilding(-14, config.DOOR_ROW + 17, 4, 10, 4, 3, 4, { roofColor: 0xBDBDBD })
    addCartoonBuilding(config.GRID_W + 15, config.DOOR_ROW + 7, 4.5, 18, 4.5, 0, 6, { roofColor: 0xBDBDBD })
    addCartoonBuilding(config.GRID_W + 15, config.DOOR_ROW + 16, 4, 12, 4, 2, 4, { hasWaterTower: true, roofColor: 0xBDBDBD })

    // ═══════════════════════════════════════════
    // CARTOON CARS
    // ═══════════════════════════════════════════
    const carColors = [0xE53935, 0x1976D2, 0x4CAF50, 0xFF9800, 0xFFC107, 0x8E24AA, 0x00897B]

    // Pre-create shared car materials
    const carBodyMats = new Map<number, THREE.MeshStandardMaterial>()
    const carCabinMats = new Map<number, THREE.MeshStandardMaterial>()
    const getCarBodyMat = (colorIdx: number) => {
        const idx = colorIdx % carColors.length
        if (!carBodyMats.has(idx)) {
            carBodyMats.set(idx, new THREE.MeshStandardMaterial({ color: carColors[idx], roughness: 0.6, metalness: 0.1 }))
        }
        return carBodyMats.get(idx)!
    }
    const getCarCabinMat = (colorIdx: number) => {
        const idx = colorIdx % carColors.length
        if (!carCabinMats.has(idx)) {
            const cabinColor = new THREE.Color(carColors[idx]).lerp(new THREE.Color(0xffffff), 0.12)
            carCabinMats.set(idx, new THREE.MeshStandardMaterial({ color: cabinColor, roughness: 0.6, metalness: 0.1 }))
        }
        return carCabinMats.get(idx)!
    }

    const carWinMat = new THREE.MeshStandardMaterial({ color: 0xbbdefb, roughness: 0.3 })
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xFFF9C4, emissive: 0xFFF9C4, emissiveIntensity: 0.3 })
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xEF5350, emissive: 0xEF5350, emissiveIntensity: 0.3 })
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 })
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.4 })
    const carShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false })

    const addCartoonCar = (cx: number, cz: number, rotY: number, colorIdx: number) => {
        const cIdx = colorIdx % carColors.length

        // Build the car world matrix: position * rotation
        const carMatrix = new THREE.Matrix4()
        const rotM = new THREE.Matrix4().makeRotationY(rotY)
        const posM = new THREE.Matrix4().makeTranslation(cx, 0, cz)
        carMatrix.multiplyMatrices(posM, rotM)

        // Lower body
        const lowerGeom = new THREE.BoxGeometry(0.9, 0.32, 1.8)
        lowerGeom.translate(0, 0.26, 0)
        lowerGeom.applyMatrix4(carMatrix)
        collect('carBody_' + cIdx, getCarBodyMat(colorIdx), lowerGeom, true)

        // Cabin (slightly lighter)
        const cabinGeom = new THREE.BoxGeometry(0.78, 0.26, 0.85)
        cabinGeom.translate(0, 0.57, -0.08)
        cabinGeom.applyMatrix4(carMatrix)
        collect('carCabin_' + cIdx, getCarCabinMat(colorIdx), cabinGeom, true)

        // Windows
        const frontWinGeom = new THREE.BoxGeometry(0.62, 0.18, 0.04)
        frontWinGeom.translate(0, 0.57, 0.36)
        frontWinGeom.applyMatrix4(carMatrix)
        collect('carWin', carWinMat, frontWinGeom)

        const rearWinGeom = new THREE.BoxGeometry(0.62, 0.18, 0.04)
        rearWinGeom.translate(0, 0.57, -0.52)
        rearWinGeom.applyMatrix4(carMatrix)
        collect('carWin', carWinMat, rearWinGeom)

        // Headlights
        for (const lx of [-0.28, 0.28]) {
            const hlGeom = new THREE.BoxGeometry(0.14, 0.09, 0.04)
            hlGeom.translate(lx, 0.26, 0.92)
            hlGeom.applyMatrix4(carMatrix)
            collect('headlight', hlMat, hlGeom)
        }

        // Taillights
        for (const lx of [-0.28, 0.28]) {
            const tlGeom = new THREE.BoxGeometry(0.14, 0.09, 0.04)
            tlGeom.translate(lx, 0.26, -0.92)
            tlGeom.applyMatrix4(carMatrix)
            collect('taillight', tlMat, tlGeom)
        }

        // Wheels
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

        // Contact shadow
        // Original: CircleGeometry in XY plane, mesh.rotation.x = -PI/2 (maps to XZ),
        // mesh.scale.set(1, 1.8, 1) stretches local Y by 1.8 which maps to world -Z after rotation.
        // To replicate: scale Y by 1.8 first, then rotateX(-PI/2), then translate + car transform.
        const shadowGeom = new THREE.CircleGeometry(0.8, 12)
        shadowGeom.scale(1, 1.8, 1)
        shadowGeom.rotateX(-Math.PI / 2)
        shadowGeom.translate(0, 0.01, 0)
        shadowGeom.applyMatrix4(carMatrix)
        collect('carShadow', carShadowMat, shadowGeom)
    }

    // Place cars along streets
    addCartoonCar(-1.8, config.DOOR_ROW + 6, 0, 0)
    addCartoonCar(-1.8, config.DOOR_ROW + 11, 0, 1)
    addCartoonCar(-1.8, config.DOOR_ROW + 18, 0, 4)
    addCartoonCar(config.GRID_W + 0.8, config.DOOR_ROW + 8, Math.PI, 2)
    addCartoonCar(config.GRID_W + 0.8, config.DOOR_ROW + 15, Math.PI, 3)
    addCartoonCar(config.GRID_W + 0.8, config.DOOR_ROW + 22, Math.PI, 5)

    // ═══════════════════════════════════════════
    // CARTOON TREES
    // ═══════════════════════════════════════════
    const treeGreens = [0x4CAF50, 0x43A047, 0x388E3C, 0x2E7D32, 0x66BB6A]

    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x6D4C41, roughness: 0.8 })
    const treeCrownMats = new Map<number, THREE.MeshStandardMaterial>()
    const getTreeCrownMat = (treeIdx: number) => {
        const idx = treeIdx % treeGreens.length
        if (!treeCrownMats.has(idx)) {
            treeCrownMats.set(idx, new THREE.MeshStandardMaterial({ color: treeGreens[idx], roughness: 0.75 }))
        }
        return treeCrownMats.get(idx)!
    }
    const treeShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false })

    const addCartoonTree = (tx: number, tz: number, treeIdx: number) => {
        const crownIdx = treeIdx % treeGreens.length

        // Trunk
        const trunkGeom = new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8)
        trunkGeom.translate(tx, 0.25, tz)
        collect('treeTrunk', treeTrunkMat, trunkGeom)

        // Crown
        const crownGeom = new THREE.SphereGeometry(0.45, 14, 10)
        crownGeom.translate(tx, 0.75, tz)
        collect('treeCrown_' + crownIdx, getTreeCrownMat(treeIdx), crownGeom, true)

        // Shadow
        const shadowGeom = new THREE.CircleGeometry(0.5, 10)
        shadowGeom.rotateX(-Math.PI / 2)
        shadowGeom.translate(tx, 0.01, tz)
        collect('treeShadow', treeShadowMat, shadowGeom)
    }

    // Place trees along sidewalks
    const leftTreeZ = [config.DOOR_ROW + 5, config.DOOR_ROW + 10, config.DOOR_ROW + 16, config.DOOR_ROW + 22]
    leftTreeZ.forEach((z, i) => addCartoonTree(-2.5, z, i))
    const rightTreeZ = [config.DOOR_ROW + 7, config.DOOR_ROW + 12, config.DOOR_ROW + 19, config.DOOR_ROW + 25]
    rightTreeZ.forEach((z, i) => addCartoonTree(config.GRID_W + 1.5, z, i + 2))

    // ═══════════════════════════════════════════
    // SMALL DETAILS (minimal)
    // ═══════════════════════════════════════════

    // Traffic lights (one on each side)
    const trafficPoleMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.3, metalness: 0.8 })
    const trafficBoxMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5, metalness: 0.3 })

    // Pre-create traffic light bulb materials
    const trafficLightColors = [0xff1744, 0xffab00, 0x00c853]
    const trafficBulbMats = trafficLightColors.map((lc, li) =>
        new THREE.MeshStandardMaterial({ color: lc, emissive: lc, emissiveIntensity: li === 2 ? 1.5 : 0.3 })
    )

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
        })
    }

    // Fire hydrants (red)
    const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xE53935, roughness: 0.6 })
    for (const [hx, hz] of [[-1.5, config.DOOR_ROW + 9], [config.GRID_W + 0.5, config.DOOR_ROW + 17]] as [number, number][]) {
        const hydrantGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8)
        hydrantGeom.translate(hx, 0.2, hz)
        collect('hydrant', hydrantMat, hydrantGeom)

        const capGeom = new THREE.SphereGeometry(0.1, 8, 6)
        capGeom.translate(hx, 0.42, hz)
        collect('hydrant', hydrantMat, capGeom)
    }

    // Street lamps (minimal)
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.2, metalness: 0.9 })
    const lampFixtureMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffeebb, emissiveIntensity: 1.5 })
    for (const [lx, lz] of [[-2.5, config.DOOR_ROW + 8], [config.GRID_W + 1.5, config.DOOR_ROW + 14]] as [number, number][]) {
        const poleGeom = new THREE.CylinderGeometry(0.04, 0.05, 3.5, 12)
        poleGeom.translate(lx, 1.75, lz)
        collect('lampPole', lampPoleMat, poleGeom)

        const fixtureGeom = new THREE.CylinderGeometry(0.2, 0.14, 0.1, 16)
        fixtureGeom.translate(lx, 3.5, lz)
        collect('lampFixture', lampFixtureMat, fixtureGeom)
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
    const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x3d3b35, 0.5)
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
        ;(u['turbidity'] as THREE.IUniform<number>).value = 1.5
        ;(u['rayleigh'] as THREE.IUniform<number>).value = 0.3
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
        hemi.groundColor.setHex(0x666666)
        hemi.intensity = 1.0
    }
}
