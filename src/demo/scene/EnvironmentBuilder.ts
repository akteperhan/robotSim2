import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

export function createSkyGradient(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 0, 512)
    // Yaz gününün pem pem mavi gökyüzü (Summer daytime blue sky)
    grad.addColorStop(0, '#0a3d7a')     // derin mavi tepe
    grad.addColorStop(0.2, '#1565c0')   // koyu cornflower blue
    grad.addColorStop(0.45, '#1e88e5')  // canlı mavi
    grad.addColorStop(0.65, '#42a5f5')  // açık gök mavisi
    grad.addColorStop(0.8, '#87ceeb')   // sky blue ufuk üzeri
    grad.addColorStop(0.92, '#e3f2fd')  // beyazlı ufuk
    grad.addColorStop(1, '#ffffff')     // ufuk beyaz
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 2, 512)
    const tex = new THREE.CanvasTexture(canvas)
    tex.mapping = THREE.EquirectangularReflectionMapping
    return tex
}

export function createOutdoorScene(
    scene: THREE.Scene,
    config: { GRID_W: number, GRID_H: number, DOOR_ROW: number, GRID_CENTER_X: number }
): { skyLight: THREE.HemisphereLight, animatedObjects: { clouds: THREE.Group[], birds: THREE.Group[], planes: THREE.Group[] } } {
    const animatedObjects = { clouds: [] as THREE.Group[], birds: [] as THREE.Group[], planes: [] as THREE.Group[] }

    // === Atmospheric Fog — derinlik hissi ===
    scene.fog = new THREE.FogExp2(0xc8d6e5, 0.012)

    // === Physically-inspired sky: Yaz gündüzü berrak mavi gökyüzü ===
    const sky = new Sky()
    sky.scale.setScalar(480)
    sky.position.set(config.GRID_CENTER_X, 0, config.DOOR_ROW + 10)
    const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms as Record<string, THREE.IUniform<unknown>>
        // Yaz günü berrak gökyüzü parametreleri:
        ; (skyUniforms['turbidity'] as THREE.IUniform<number>).value = 1.5 // Düşuk = daha berrak
        ; (skyUniforms['rayleigh'] as THREE.IUniform<number>).value = 0.3  // Daha az mavi saçılımı = derin mavi
        ; (skyUniforms['mieCoefficient'] as THREE.IUniform<number>).value = 0.003
        ; (skyUniforms['mieDirectionalG'] as THREE.IUniform<number>).value = 0.95 // Güneş halesini keskinleştir

    // Güneşi yüksekte tutun (50°): Parlak yaz öğlesi
    const sunDir = new THREE.Vector3()
    const elevation = 50
    const azimuth = 180
    const phi = THREE.MathUtils.degToRad(90 - elevation)
    const theta = THREE.MathUtils.degToRad(azimuth)
    sunDir.setFromSphericalCoords(1, phi, theta)
        ; (skyUniforms['sunPosition'] as THREE.IUniform<THREE.Vector3>).value.copy(sunDir)
        ; (sky.material as THREE.ShaderMaterial).depthWrite = false
    sky.name = 'env_sky'
    scene.add(sky)

    // === Görünür Güneş Diski (Sun Disc in the sky) ===
    const sunWorldPos = sunDir.clone().multiplyScalar(150).add(new THREE.Vector3(config.GRID_CENTER_X, 0, config.DOOR_ROW + 10))
    // Görünür Güneş Diski — depthTest:false sayesinde Sky dome'un önünde çizilir
    const sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xfffde7, depthTest: false })
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 16), sunDiscMat)
    sunDisc.position.copy(sunWorldPos)
    sunDisc.renderOrder = 999 // Her şeyin üzerine çiz
    sunDisc.name = 'env_sun_disc'
    scene.add(sunDisc)
    // Güneş glowu (hafif sarımsı)
    const sunGlowMat = new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.3, depthTest: false })
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 16), sunGlowMat)
    sunGlow.position.copy(sunWorldPos)
    sunGlow.renderOrder = 998
    scene.add(sunGlow)

    // === Güneş baş DirectionalLight ===
    const outdoorSun = new THREE.DirectionalLight(0xffffff, 2.5) // Beyaz berrak günışığı
    outdoorSun.position.copy(sunDir).multiplyScalar(170)
    outdoorSun.target.position.set(config.GRID_CENTER_X, 0, config.DOOR_ROW + 2)
    outdoorSun.castShadow = true
    outdoorSun.shadow.mapSize.set(2048, 2048)
    outdoorSun.shadow.camera.left = -50
    outdoorSun.shadow.camera.right = 50
    outdoorSun.shadow.camera.top = 50
    outdoorSun.shadow.camera.bottom = -50
    outdoorSun.shadow.camera.near = 10
    outdoorSun.shadow.camera.far = 300
    outdoorSun.shadow.bias = -0.0005
    outdoorSun.name = 'env_sun'
    scene.add(outdoorSun)
    scene.add(outdoorSun.target)

    // === Clouds (Animated) ===
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true, opacity: 0.92 })
    const cloudPositions: [number, number, number, number][] = [
        [-10, 18, 20, 2.5], [15, 20, 25, 2.0], [5, 22, 30, 3.2], [-8, 16, 35, 1.8],
        [25, 19, 22, 3.0], [0, 21, 40, 2.5], [12, 17, 15, 2.2], [-20, 23, 50, 3.5], [30, 18, 35, 2.8]
    ]
    cloudPositions.forEach(([cx, cy, cz, cs]) => {
        const cloud = new THREE.Group()
        for (let i = 0; i < 6; i++) {
            const puff = new THREE.Mesh(
                new THREE.SphereGeometry(cs * (0.5 + Math.random() * 0.6), 7, 5), cloudMat)
            puff.position.set(i * cs * 0.55 - cs, Math.random() * cs * 0.25, Math.random() * cs * 0.2)
            puff.scale.y = 0.45
            cloud.add(puff)
        }
        cloud.position.set(cx, cy, cz)
        scene.add(cloud)
        animatedObjects.clouds.push(cloud) // animate in render loop
    })

    // === Birds (Animated) ===
    const birdMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
    const birdPositions: [number, number, number][] = [
        [-5, 14, 18], [10, 16, 30], [-15, 12, 25], [8, 15, 22], [20, 13, 40]
    ]
    birdPositions.forEach(([bx, by, bz]) => {
        const flock = new THREE.Group()
        // 3 kuş = basit V şekli kanat geometrisi
        for (let k = 0; k < 3; k++) {
            const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.14), birdMat)
            wingL.position.set(-0.18, 0, k * 0.5 - 0.5)
            wingL.rotation.z = 0.3
            const wingR = wingL.clone()
            wingR.position.x = 0.18
            wingR.rotation.z = -0.3
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 3), birdMat)
            body.position.set(0, 0, k * 0.5 - 0.5)
            flock.add(wingL, wingR, body)
        }
        flock.position.set(bx, by, bz)
        scene.add(flock)
        animatedObjects.birds.push(flock)
    })

    // === Airplanes (Animated cross-sky) ===
    const planeMat = new THREE.MeshStandardMaterial({ color: 0xdce4ee, roughness: 0.3, metalness: 0.5 })
    const contrailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
    for (let p = 0; p < 2; p++) {
        const plane = new THREE.Group()
        // Gövde
        const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 1.8, 6), planeMat)
        fuselage.rotation.z = Math.PI / 2
        plane.add(fuselage)
        // Kanatlar
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.55), planeMat)
        wing.position.set(0, 0.02, 0)
        plane.add(wing)
        // Kuyruk
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.05), planeMat)
        tail.position.set(-0.8, 0.22, 0)
        plane.add(tail)
        // Kondenser izi (contrail)
        const contrail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 8, 4), contrailMat)
        contrail.rotation.z = Math.PI / 2
        contrail.position.set(-5, 0, 0)
        plane.add(contrail)

        plane.position.set(-40 + p * 30, 22 + p * 4, 15 + p * 20)
        plane.rotation.y = Math.PI / 6 + p * 0.3
        scene.add(plane)
        animatedObjects.planes.push(plane)
    }

    // === Ground (Asphalt road) — koyu, gerçekçi asfalt ===
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220),
        new THREE.MeshStandardMaterial({ color: 0x252629, roughness: 0.88, metalness: 0.02 })) // Koyu asfalt
    ground.rotation.x = -Math.PI / 2
    ground.position.set(config.GRID_CENTER_X, -0.08, 70)
    ground.receiveShadow = true
    scene.add(ground)
    const nearGroundBlend = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 24),
        new THREE.MeshStandardMaterial({ color: 0x2d2f33, roughness: 0.85 })
    )
    nearGroundBlend.rotation.x = -Math.PI / 2
    nearGroundBlend.position.set(config.GRID_CENTER_X, -0.06, 10)
    nearGroundBlend.receiveShadow = true
    scene.add(nearGroundBlend)

    // === Outdoor grid tiles (City road path) — renk varyasyonlu ===
    const outdoorEdgeMat = new THREE.LineBasicMaterial({ color: 0x3a3c40, transparent: true, opacity: 0.6 })
    const tileGeo = new THREE.BoxGeometry(0.96, 0.04, 0.96)
    // Önceden 6 farklı ton oluştur (performans için material paylaşımı)
    const tileShades = [0x282a2e, 0x2a2c30, 0x2c2e32, 0x2e3034, 0x272930, 0x2b2d31]
    const tileMats = tileShades.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.72 + Math.random() * 0.08, metalness: 0.08 + Math.random() * 0.06 }))
    for (let x = 0; x < config.GRID_W; x++) {
        for (let z = config.DOOR_ROW; z < config.GRID_H; z++) {
            const mat = tileMats[Math.floor(Math.random() * tileMats.length)]
            const tile = new THREE.Mesh(tileGeo, mat)
            tile.position.set(x, -0.02, z)
            tile.receiveShadow = true
            scene.add(tile)
            const edges = new THREE.LineSegments(
                new THREE.EdgesGeometry(tileGeo), outdoorEdgeMat)
            edges.position.copy(tile.position)
            scene.add(edges)
        }
    }

    // === Bordür taşları (kaldırım kenarı) ===
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.7, metalness: 0.1 })
    // Sol bordür
    const lCurb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 80), curbMat)
    lCurb.position.set(-0.55, 0.05, 40); scene.add(lCurb)
    // Sağ bordür
    const rCurb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 80), curbMat)
    rCurb.position.set(config.GRID_W - 0.45, 0.05, 40); scene.add(rCurb)

    // === Çim şeritleri (kaldırım ile yol arası) ===
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.95, metalness: 0.0 })
    const lGrass = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 50), grassMat)
    lGrass.position.set(-0.85, 0.02, 30); scene.add(lGrass)
    const rGrass = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 50), grassMat)
    rGrass.position.set(config.GRID_W - 0.15, 0.02, 30); scene.add(rGrass)

    // === Çim tümsekleri (kaldırım kenarı boyunca) ===
    const tuftGeo = new THREE.SphereGeometry(0.06, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2) // hemisphere
    const tuftShades = [0x3d8b37, 0x4caf50, 0x45a049, 0x56c75a, 0x388e3c]
    const tuftMats = tuftShades.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }))

    const addTuftCluster = (cx: number, cz: number) => {
        // 3-5 small hemispheres grouped together
        const count = 3 + Math.floor(Math.random() * 3)
        for (let i = 0; i < count; i++) {
            const tuft = new THREE.Mesh(tuftGeo, tuftMats[Math.floor(Math.random() * tuftMats.length)])
            const scale = 0.6 + Math.random() * 0.8
            tuft.scale.set(scale, scale * (0.5 + Math.random() * 0.5), scale)
            tuft.position.set(
                cx + (Math.random() - 0.5) * 0.15,
                0.04,
                cz + (Math.random() - 0.5) * 0.15
            )
            tuft.rotation.y = Math.random() * Math.PI * 2
            scene.add(tuft)
        }
    }

    // Scatter tufts along both grass strips
    for (let z = -2; z < 48; z += 1.5 + Math.random() * 2) {
        addTuftCluster(-0.85 + (Math.random() - 0.5) * 0.3, z)
        addTuftCluster(config.GRID_W - 0.15 + (Math.random() - 0.5) * 0.3, z)
    }

    // === Asfalt varyasyonu (yol üst katmanı — farklı ton) ===
    const roadOverlay = new THREE.Mesh(
        new THREE.PlaneGeometry(config.GRID_W + 2, 60),
        new THREE.MeshStandardMaterial({ color: 0x2e3035, roughness: 0.82, metalness: 0.03 })
    )
    roadOverlay.rotation.x = -Math.PI / 2
    roadOverlay.position.set(config.GRID_CENTER_X, -0.05, 30)
    roadOverlay.receiveShadow = true
    scene.add(roadOverlay)

    // === Asfalt yamaları (tamir edilmiş asfalt) ===
    const patchShades = [0x303338, 0x34373c, 0x2c2f34, 0x383b40]
    const patchData: [number, number, number, number][] = [
        [3, config.DOOR_ROW + 5, 1.8, 1.2],
        [8, config.DOOR_ROW + 9, 1.4, 0.9],
        [1, 20, 2.0, 1.5],
        [7, 28, 1.2, 1.0]
    ]
    patchData.forEach(([px, pz, pw, pd], i) => {
        const patchMat = new THREE.MeshStandardMaterial({ color: patchShades[i], roughness: 0.80, metalness: 0.05 })
        const patch = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), patchMat)
        patch.rotation.x = -Math.PI / 2
        patch.position.set(px, -0.04, pz)
        patch.receiveShadow = true; scene.add(patch)
    })

    // === Yol çatlak çizgileri ===
    const crackMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.9 })
    const crackData: [number, number, number, number, number][] = [
        [4, 18, 0.8, 0.01, 0], [9, 24, 1.2, 0.01, 0.3],
        [2, 32, 0.6, 0.01, -0.2]
    ]
    crackData.forEach(([cx, cz, cl, cw, rot]) => {
        const crack = new THREE.Mesh(new THREE.PlaneGeometry(cl, cw), crackMat)
        crack.rotation.x = -Math.PI / 2; crack.rotation.z = rot
        crack.position.set(cx, -0.035, cz); scene.add(crack)
    })

    // === Durak çizgisi (yaya geçidi öncesi) ===
    const stopLineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    const stopLine = new THREE.Mesh(new THREE.BoxGeometry(config.GRID_W + 1, 0.015, 0.15), stopLineMat)
    stopLine.position.set(config.GRID_CENTER_X, 0.02, config.DOOR_ROW + 3.2)
    scene.add(stopLine)

    // === Road markings on each side of the grid path ===
    for (let z = config.DOOR_ROW; z < config.GRID_H; z++) {
        // Left edge marker
        const lm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.5),
            new THREE.MeshStandardMaterial({ color: 0xFFD600, emissive: 0xFFD600, emissiveIntensity: 0.3, roughness: 0.4 }))
        lm.position.set(-0.5, 0.02, z)
        scene.add(lm)
        // Right edge marker
        const rm = lm.clone()
        rm.position.x = config.GRID_W - 0.5
        scene.add(rm)
    }

    // === Sidewalks — bireysel kaldırım taşları ===
    // Alt zemin (derz rengi)
    const swBaseMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.9 })
    const lSWBase = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 80), swBaseMat)
    lSWBase.position.set(-3.0, 0.01, 40); lSWBase.receiveShadow = true; scene.add(lSWBase)
    const rSWBase = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 80), swBaseMat)
    rSWBase.position.set(config.GRID_W + 2.0, 0.01, 40); rSWBase.receiveShadow = true; scene.add(rSWBase)

    // Kaldırım taşları (bireysel pavers)
    const paverW = 0.48, paverD = 0.28, paverGap = 0.02
    const paverGeo = new THREE.BoxGeometry(paverW, 0.04, paverD)
    const paverShades = [0xb8b8b8, 0xbcbcbc, 0xc0c0c0, 0xb4b4b4, 0xc4c4c4]
    const paverMats = paverShades.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82 + Math.random() * 0.06 }))

    const layPavers = (baseX: number, swWidth: number) => {
        const startX = baseX - swWidth / 2
        const cols = Math.floor(swWidth / (paverW + paverGap))
        for (let col = 0; col < cols; col++) {
            const px = startX + col * (paverW + paverGap) + paverW / 2
            // Stagger every other row
            for (let z = -5; z < 50; z++) {
                const pz = z * (paverD + paverGap) + (col % 2 === 0 ? 0 : paverD / 2)
                const mat = paverMats[Math.floor(Math.random() * paverMats.length)]
                const paver = new THREE.Mesh(paverGeo, mat)
                paver.position.set(px, 0.05, pz)
                paver.receiveShadow = true
                scene.add(paver)
            }
        }
    }
    layPavers(-3.0, 5.0)
    layPavers(config.GRID_W + 2.0, 5.0)

    // === Crosswalk (Yaya Geçidi) — avlunun bitişinde ===
    const crosswalkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    for (let i = 0; i < 5; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, config.GRID_W + 1), crosswalkMat)
        stripe.rotation.y = 0
        stripe.position.set(config.GRID_CENTER_X, 0.02, config.DOOR_ROW + 3.5 + i * 0.7)
        scene.add(stripe)
    }

    // === Parked Cars — Gerçekçi Low-Poly Sedan Tasarımı ===
    const carColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xe67e22, 0x8e44ad]
    const carData: [number, number, number, number][] = [
        [-1.6, 10, 0, 0],
        [-1.6, 14, 0, 1],
        [-1.6, 21, 0, 2],
        [config.GRID_W + 1.3, 12, Math.PI, 3],
        [config.GRID_W + 1.3, 18, Math.PI, 4],
        [config.GRID_W + 1.3, 26, Math.PI, 0],
    ]

    carData.forEach(([cx, cz, rotY, colorIdx]) => {
        const car = new THREE.Group()
        const color = carColors[colorIdx]
        const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.55 })
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.55 })
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 })
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.15, metalness: 0.95 })
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 0.9 })
        const stopMat = new THREE.MeshStandardMaterial({ color: 0xff1111, emissive: 0xff0000, emissiveIntensity: 1.0 })
        const bumpMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 })

        // Zemin plaka (ince siyah taban)
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 2.0), bumpMat)
        chassis.position.set(0, 0.10, 0); car.add(chassis)

        // Ana gövde (altyapı)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.30, 2.0), bodyMat)
        body.position.set(0, 0.29, 0); car.add(body)

        // Üst kabin (öne doğru daralır)
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.28, 1.0), bodyMat)
        cabin.position.set(0, 0.58, -0.08); car.add(cabin)

        // Ön cam (eğimli)
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.26, 0.06), glassMat)
        windshield.position.set(0, 0.58, 0.43)
        windshield.rotation.x = -0.35
        car.add(windshield)

        // Arka cam
        const rearWind = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.20, 0.06), glassMat)
        rearWind.position.set(0, 0.56, -0.57)
        rearWind.rotation.x = 0.25
        car.add(rearWind)

        // Yan pencereler
        const sideWinL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.72), glassMat)
        sideWinL.position.set(-0.40, 0.60, -0.04); car.add(sideWinL)
        const sideWinR = sideWinL.clone(); sideWinR.position.x = 0.40; car.add(sideWinR)

        // Ön tampon
        const frontBump = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.12, 0.10), bumpMat)
        frontBump.position.set(0, 0.14, 1.05); car.add(frontBump)

        // Arka tampon
        const rearBump = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.12, 0.10), bumpMat)
        rearBump.position.set(0, 0.14, -1.05); car.add(rearBump)

        // Farlar (ön, 2 adet)
        const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.05), lightMat)
        hl1.position.set(0.30, 0.28, 1.02); car.add(hl1)
        const hl2 = hl1.clone(); hl2.position.x = -0.30; car.add(hl2)

        // Stop lambası (arka, kırmızı)
        const sl1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.05), stopMat)
        sl1.position.set(0.30, 0.30, -1.02); car.add(sl1)
        const sl2 = sl1.clone(); sl2.position.x = -0.30; car.add(sl2)

        // Yan aynalar
        const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 })
        for (const mx of [-0.48, 0.48]) {
            const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.08), bumpMat)
            mirrorArm.position.set(mx, 0.50, 0.30); car.add(mirrorArm)
            const mirrorFace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), mirrorMat)
            mirrorFace.position.set(mx * 1.08, 0.50, 0.32); car.add(mirrorFace)
        }

        // Plakalar (ön + arka)
        const plateMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.5 })
        const plateFrame = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 })
        const fPlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.02), plateMat)
        fPlate.position.set(0, 0.16, 1.06); car.add(fPlate)
        const fFrame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.015), plateFrame)
        fFrame.position.set(0, 0.16, 1.055); car.add(fFrame)
        const rPlate = fPlate.clone(); rPlate.position.z = -1.06; car.add(rPlate)
        const rFrame = fFrame.clone(); rFrame.position.z = -1.055; car.add(rFrame)

        // Kapı çizgileri (yan yüzey derzler)
        const doorLine = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })
        for (const dlx of [-0.44, 0.44]) {
            for (const dlz of [-0.15, 0.25]) {
                const dl = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.28, 0.005), doorLine)
                dl.position.set(dlx, 0.30, dlz); car.add(dl)
            }
        }

        // Kaput/bagaj çizgisi (üst yüzey)
        const hoodLine = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.005, 0.005), doorLine)
        hoodLine.position.set(0, 0.445, 0.35); car.add(hoodLine)
        const trunkLine = hoodLine.clone(); trunkLine.position.z = -0.40; car.add(trunkLine)

        // Tekerlekler + jant
        const wPos: [number, number, number][] = [
            [-0.47, 0.16, 0.58], [0.47, 0.16, 0.58],
            [-0.47, 0.16, -0.58], [0.47, 0.16, -0.58]
        ]
        wPos.forEach(([wx, wy, wz]) => {
            const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 14), wheelMat)
            wh.rotation.z = Math.PI / 2; wh.position.set(wx, wy, wz); car.add(wh)
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.13, 8), rimMat)
            rim.rotation.z = Math.PI / 2; rim.position.set(wx, wy, wz); car.add(rim)
            // Jant çizgisi (dikey kol)
            for (let s = 0; s < 5; s++) {
                const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.14, 0.015),
                    new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.1, metalness: 0.9 }))
                spoke.position.set(wx, wy, wz)
                spoke.rotation.z = Math.PI / 2
                spoke.rotation.x = (s / 5) * Math.PI * 2
                car.add(spoke)
            }
        })

        // Contact shadow (oval)
        const carShadow = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }))
        carShadow.rotation.x = -Math.PI / 2; carShadow.scale.set(1, 2.2, 1)
        carShadow.position.y = 0.005; car.add(carShadow)

        car.position.set(cx, 0, cz)
        car.rotation.y = rotY
        scene.add(car)
    })

    // === Traffic Signs (Trafik Levhaları) ===
    const poleMatSign = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 })
    const signData: [number, number, number, number][] = [
        [-1.8, 14.5, 0xe74747, 0],   // Stop (Kırmızı) sol
        [config.GRID_W + 1.2, 22, 0x2196f3, 1], // Mavi Bilgi levhası sağ
        [-1.8, 24, 0xf5c518, 2],     // Sarı uyarı sol
    ]
    signData.forEach(([sx, sz, signColor, _type]) => {
        const signGroup = new THREE.Group()
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.8, 6), poleMatSign)
        pole.position.y = 1.4
        signGroup.add(pole)
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.05),
            new THREE.MeshStandardMaterial({ color: signColor, roughness: 0.5 }))
        board.position.set(0, 2.75, 0)
        signGroup.add(board)
        // White frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.51, 0.04),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }))
        frame.position.set(0, 2.75, -0.02)
        signGroup.add(frame)
        signGroup.position.set(sx, 0, sz)
        scene.add(signGroup)
    })

    // === Modern Şehir Mimarisi — Az ama Çarpıcı ===
    // Cam-metal kule materyalleri
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.05, metalness: 0.85, transparent: true, opacity: 0.88 })
    const glass2Mat = new THREE.MeshStandardMaterial({ color: 0xb2dfdb, roughness: 0.08, metalness: 0.80, transparent: true, opacity: 0.85 })
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.75, metalness: 0.05 })
    const concrete2Mat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.70, metalness: 0.10 })
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.20, metalness: 0.90 })
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.30, metalness: 0.70 }) // altın vurgu
    const darkBaseMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.60, metalness: 0.40 })

    // Yardımcı: modern kule — pencere ızgarası + balkon + mimari detay
    const windowLitMat = new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: 0xfff8e1, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2 })
    const windowDarkMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.3, metalness: 0.5 })
    const windowBlueMat = new THREE.MeshStandardMaterial({ color: 0xbbdefb, emissive: 0x90caf9, emissiveIntensity: 0.3, roughness: 0.05, metalness: 0.4 })
    const balconyMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.6, metalness: 0.3 })
    const balconyRailMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.6 })
    const graniteMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5, metalness: 0.3 })
    const doorGlassMat = new THREE.MeshStandardMaterial({ color: 0x80cbc4, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.6 })
    const tenteMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.6 })

    const addTower = (tx: number, tz: number, tw: number, th: number, td: number, faceMat: THREE.MeshStandardMaterial, hasAntenna = false) => {
        // Ana gövde
        const body = new THREE.Mesh(new THREE.BoxGeometry(tw, th, td), faceMat)
        body.position.set(tx, th / 2, tz)
        body.castShadow = true; body.receiveShadow = true
        scene.add(body)

        // Köşe pilasterler (4 köşe dikey çıkıntı)
        for (const [px, pz] of [[tw / 2, td / 2], [-tw / 2, td / 2], [tw / 2, -td / 2], [-tw / 2, -td / 2]]) {
            const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.15, th + 0.1, 0.15), steelMat)
            pilaster.position.set(tx + px, th / 2, tz + pz)
            scene.add(pilaster)
        }

        // Çelik yatay bantlar (her kat)
        const floorH = 3.0
        for (let y = floorH; y < th; y += floorH) {
            const band = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.08, 0.10, td + 0.08), steelMat)
            band.position.set(tx, y, tz)
            scene.add(band)
        }

        // Pencere ızgarası — ön ve arka yüz
        const winW = 0.55, winH = 0.75
        const winsPerRow = Math.max(2, Math.floor((tw - 0.6) / 1.0))
        const winSpacingX = (tw - 0.6) / Math.max(winsPerRow - 1, 1)
        let winIdx = 0
        for (let y = 1.2; y < th - 1; y += floorH) {
            for (let wi = 0; wi < winsPerRow; wi++) {
                const wx = tx - (tw - 0.6) / 2 + wi * winSpacingX
                // Ön yüz pencereleri
                const wMat = (winIdx % 3 === 0) ? windowLitMat : (winIdx % 3 === 1) ? windowBlueMat : windowDarkMat
                const winF = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.04), wMat)
                winF.position.set(wx, y, tz + td / 2 + 0.02)
                scene.add(winF)
                // Arka yüz pencereleri
                const winB = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.04), wMat)
                winB.position.set(wx, y, tz - td / 2 - 0.02)
                scene.add(winB)
                // Pencere pervazı (alt çıkıntı)
                const sill = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.06, 0.04, 0.08), steelMat)
                sill.position.set(wx, y - winH / 2, tz + td / 2 + 0.04)
                scene.add(sill)
                winIdx++
            }
        }

        // Yan yüz pencereleri (daha az)
        const sideWins = Math.max(1, Math.floor((td - 0.6) / 1.5))
        const sideSpZ = (td - 0.6) / Math.max(sideWins - 1, 1)
        for (let y = 1.2; y < th - 1; y += floorH) {
            for (let si = 0; si < sideWins; si++) {
                const wz = tz - (td - 0.6) / 2 + si * sideSpZ
                const wMat = (si + Math.floor(y)) % 2 === 0 ? windowBlueMat : windowDarkMat
                const winL = new THREE.Mesh(new THREE.BoxGeometry(0.04, winH, winW), wMat)
                winL.position.set(tx - tw / 2 - 0.02, y, wz)
                scene.add(winL)
                const winR = new THREE.Mesh(new THREE.BoxGeometry(0.04, winH, winW), wMat)
                winR.position.set(tx + tw / 2 + 0.02, y, wz)
                scene.add(winR)
            }
        }

        // Balkon çıkıntıları — her 2. katta ön yüz
        for (let y = floorH * 2; y < th - 2; y += floorH * 2) {
            const balcPlate = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.6, 0.06, 0.45), balconyMat)
            balcPlate.position.set(tx, y, tz + td / 2 + 0.22)
            scene.add(balcPlate)
            const balcRail = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.6, 0.35, 0.02), balconyRailMat)
            balcRail.position.set(tx, y + 0.2, tz + td / 2 + 0.44)
            scene.add(balcRail)
        }

        // Zemin kat — koyu granit taban + giriş kapısı
        const base = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.6, 0.8, td + 0.6), graniteMat)
        base.position.set(tx, 0.4, tz); base.castShadow = true
        scene.add(base)
        // Giriş kapısı (ön yüz)
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.06), doorGlassMat)
        door.position.set(tx, 1.0, tz + td / 2 + 0.32)
        scene.add(door)
        // Giriş tentesi
        const tente = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.5), tenteMat)
        tente.position.set(tx, 2.15, tz + td / 2 + 0.45)
        scene.add(tente)

        // Çatı levhası
        const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.2, 0.25, td + 0.2), steelMat)
        roofSlab.position.set(tx, th + 0.12, tz)
        scene.add(roofSlab)

        // Çatı ekipmanları (AC ünitesi + su tankı)
        const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xd0d4d8, roughness: 0.5, metalness: 0.4 }))
        acUnit.position.set(tx - tw * 0.2, th + 0.55, tz - td * 0.2)
        scene.add(acUnit)
        const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 12),
            new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.4, metalness: 0.6 }))
        waterTank.position.set(tx + tw * 0.25, th + 0.65, tz + td * 0.2)
        scene.add(waterTank)

        // Contact shadow
        const towerShadow = new THREE.Mesh(new THREE.PlaneGeometry(tw + 1, td + 1),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false }))
        towerShadow.rotation.x = -Math.PI / 2; towerShadow.position.set(tx, 0.004, tz)
        scene.add(towerShadow)

        // Anten
        if (hasAntenna) {
            const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4, 6), steelMat)
            ant.position.set(tx, th + 2.2, tz); scene.add(ant)
            const antBall = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 2.0 }))
            antBall.position.set(tx, th + 4.3, tz); scene.add(antBall)
        }
    }

    // Yardımcı: doğal kaldırım ağacı (organik taç + dallar)
    let treeIdx = 0
    const treeGreens = [0x2e7d32, 0x388e3c, 0x43a047, 0x4caf50, 0x357a38]
    const addStreetTree = (tx: number, tz: number) => {
        const tg = new THREE.Group()
        const baseGreen = treeGreens[treeIdx % treeGreens.length]
        treeIdx++

        // Gövde — alt kalın üst ince
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.92 })
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 1.6, 8), trunkMat)
        trunk.position.y = 0.8; tg.add(trunk)

        // Alt dal çatalları (2 dal)
        for (const angle of [-0.5, 0.5]) {
            const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.7, 6), trunkMat)
            branch.position.set(Math.sin(angle) * 0.2, 1.3, Math.cos(angle) * 0.15)
            branch.rotation.z = angle * 0.8
            tg.add(branch)
        }

        // Organik taç — ana küre + 4 yardımcı küre
        const crownMat = new THREE.MeshStandardMaterial({ color: baseGreen, roughness: 0.82 })
        const mainCrown = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8), crownMat)
        mainCrown.position.y = 2.3; mainCrown.scale.set(1.0, 0.8, 1.0); tg.add(mainCrown)

        const subCrownData: [number, number, number, number][] = [
            [0.5, 2.5, 0.3, 0.6], [-0.4, 2.6, -0.3, 0.55],
            [0.2, 2.8, -0.4, 0.5], [-0.3, 2.1, 0.5, 0.65]
        ]
        const darkGreen = new THREE.Color(baseGreen).multiplyScalar(0.85)
        const subMat = new THREE.MeshStandardMaterial({ color: darkGreen, roughness: 0.85 })
        subCrownData.forEach(([sx, sy, sz, sr]) => {
            const sub = new THREE.Mesh(new THREE.SphereGeometry(sr, 8, 6), subMat)
            sub.position.set(sx, sy, sz); sub.scale.y = 0.75; tg.add(sub)
        })

        // Contact shadow
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }))
        shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.005; tg.add(shadow)

        tg.position.set(tx, 0, tz)
        scene.add(tg)
    }

    // ── SOL BLOK — uzaklaştırılmış kuleler ──
    addTower(-18, 10, 5, 18, 5, glassMat)
    addTower(-18, 24, 4, 12, 4, concreteMat)
    addTower(-21, 38, 5.5, 26, 5, glass2Mat, true)

    // ── SOL ARA BİNA — tek katlı dükkân (ölçek geçişi) ──
    const shopMat = new THREE.MeshStandardMaterial({ color: 0xefebe9, roughness: 0.7, metalness: 0.05 })
    const shopRoofMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.6, metalness: 0.2 })
    const awningMat = new THREE.MeshStandardMaterial({ color: 0xef5350, roughness: 0.5, metalness: 0.1 })
    const shopWindowMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.55 })

    // Sol dükkân
    const lShop = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 6), shopMat)
    lShop.position.set(-7, 2, 14); lShop.castShadow = true; scene.add(lShop)
    const lShopRoof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.15, 6.4), shopRoofMat)
    lShopRoof.position.set(-7, 4.08, 14); scene.add(lShopRoof)
    // Vitrin camı
    const lShopWin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 0.06), shopWindowMat)
    lShopWin.position.set(-7, 1.8, 17.02); scene.add(lShopWin)
    // Kapı çerçevesi
    const lShopDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 0.08), graniteMat)
    lShopDoorFrame.position.set(-8.2, 1.2, 17.02); scene.add(lShopDoorFrame)
    const lShopDoor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.04), doorGlassMat)
    lShopDoor.position.set(-8.2, 1.05, 17.04); scene.add(lShopDoor)
    // Tabela
    const lShopSign = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xff7043, emissive: 0xff5722, emissiveIntensity: 0.4, roughness: 0.4 }))
    lShopSign.position.set(-7, 3.4, 17.04); scene.add(lShopSign)
    // Tente
    const lAwning = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.0), awningMat)
    lAwning.position.set(-7, 3.1, 17.5); scene.add(lAwning)
    // Contact shadow
    const lShopShadow = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 6.5),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, depthWrite: false }))
    lShopShadow.rotation.x = -Math.PI / 2; lShopShadow.position.set(-7, 0.004, 14); scene.add(lShopShadow)

    // Sağ market
    const rShop = new THREE.Mesh(new THREE.BoxGeometry(5, 3.8, 7), shopMat)
    rShop.position.set(config.GRID_W + 5, 1.9, 16); rShop.castShadow = true; scene.add(rShop)
    const rShopRoof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.15, 7.4), shopRoofMat)
    rShopRoof.position.set(config.GRID_W + 5, 3.88, 16); scene.add(rShopRoof)
    // Cam kapı
    const rShopDoorG = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.4, 0.06), shopWindowMat)
    rShopDoorG.position.set(config.GRID_W + 5, 1.2, 19.52); scene.add(rShopDoorG)
    // Kapı çerçevesi
    const rShopDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 0.08), graniteMat)
    rShopDoorFrame.position.set(config.GRID_W + 5, 1.3, 19.50); scene.add(rShopDoorFrame)
    // Vitrin
    const rShopWin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 0.06), shopWindowMat)
    rShopWin.position.set(config.GRID_W + 6.2, 1.6, 19.52); scene.add(rShopWin)
    // Tabela
    const rShopSign = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.45, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x1565c0, emissive: 0x1565c0, emissiveIntensity: 0.4, roughness: 0.4 }))
    rShopSign.position.set(config.GRID_W + 5, 3.4, 19.54); scene.add(rShopSign)
    // Tente
    const rAwning = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.5, metalness: 0.1 }))
    rAwning.position.set(config.GRID_W + 5, 2.9, 19.8); scene.add(rAwning)
    // Contact shadow
    const rShopShadow = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 7.5),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, depthWrite: false }))
    rShopShadow.rotation.x = -Math.PI / 2; rShopShadow.position.set(config.GRID_W + 5, 0.004, 16); scene.add(rShopShadow)

        // Sol kaldırım ağaçları (dükkân z=11-17 alanından kaçır)
        ;[-4, 7, 20, 25, 32, 39].forEach(z => addStreetTree(-5.5, z))

    // ── SAĞ BLOK — uzaklaştırılmış kuleler ──
    addTower(config.GRID_W + 16, 8, 5, 20, 5, glass2Mat, true)
    addTower(config.GRID_W + 16, 22, 4.5, 14, 4, concreteMat)
    addTower(config.GRID_W + 16, 36, 6, 22, 5.5, glassMat)

        // Sağ kaldırım ağaçları (market z=12.5-19.5 alanından kaçır)
        ;[5, 9, 22, 28, 35, 42].forEach(z => addStreetTree(config.GRID_W + 4.0, z))

    // ── ARKA PLAN — çok uzakta siluet kuleler ──
    const silMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.70, metalness: 0.20 })
    const silMat2 = new THREE.MeshStandardMaterial({ color: 0xa5d6a7, roughness: 0.65, metalness: 0.25, transparent: true, opacity: 0.80 })
    addTower(-30, -8, 8, 28, 7, silMat)
    addTower(config.GRID_W + 30, -6, 7, 34, 6, silMat2, true)
    addTower(config.GRID_W + 38, 18, 8, 24, 7, silMat)

    // ── GENİŞ BULVARIN ÇEVRESİNE ÇİZGİLER ──
    // Belirgin sarı orta şerit (ana yol — çift çizgi)
    const centerLineMat = new THREE.MeshStandardMaterial({ color: 0xFFD600, emissive: 0xFFD600, emissiveIntensity: 0.15, roughness: 0.4 })
    for (let z = config.DOOR_ROW + 1; z < 45; z += 2.5) {
        // Sol yol çift şerit
        const lineL1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 1.6), centerLineMat)
        lineL1.position.set(-3.9, 0.006, z); scene.add(lineL1)
        const lineL2 = lineL1.clone(); lineL2.position.x = -3.7; scene.add(lineL2)
        // Sağ yol çift şerit
        const lineR1 = lineL1.clone(); lineR1.position.x = config.GRID_W + 2.9; scene.add(lineR1)
        const lineR2 = lineL1.clone(); lineR2.position.x = config.GRID_W + 3.1; scene.add(lineR2)
    }

    // ── YEŞİL AYIRICI REFÜJ (geniş cadde ortası) ──
    const medianMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.9 })
    const medianL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 38), medianMat)
    medianL.position.set(-3.5, 0.025, 22)
    scene.add(medianL)
    const medianR = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 38), medianMat)
    medianR.position.set(config.GRID_W + 2.8, 0.025, 22)
    scene.add(medianR)

        // Refüje küçük saksı ağaçlar
        ;[8, 16, 24, 32].forEach(z => {
            const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 5),
                new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 }))
            shrub.position.set(-3.5, 0.55, z); scene.add(shrub)
            const shrubR = shrub.clone(); shrubR.position.x = config.GRID_W + 2.8; scene.add(shrubR)
        })

    // ── GARAJ ÖNÜ AVLU (Geçiş Bölgesi) — dama deseni ──
    const courtLightMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.72, metalness: 0.05 })
    const courtDarkMat = new THREE.MeshStandardMaterial({ color: 0xbfbfbf, roughness: 0.75, metalness: 0.08 })
    const courtGroutMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 })
    // Alt zemin (derz rengi)
    const courtBase = new THREE.Mesh(new THREE.BoxGeometry(config.GRID_W + 4, 0.05, 4), courtGroutMat)
    courtBase.position.set(config.GRID_CENTER_X, 0.015, config.DOOR_ROW + 1.5)
    courtBase.receiveShadow = true; scene.add(courtBase)
    // Dama taşları
    const courtTileSize = 0.48
    const courtGap = 0.02
    const courtStartX = config.GRID_CENTER_X - (config.GRID_W + 4) / 2
    const courtStartZ = config.DOOR_ROW - 0.3
    const courtCols = Math.floor((config.GRID_W + 4) / (courtTileSize + courtGap))
    const courtRows = Math.floor(4 / (courtTileSize + courtGap))
    const courtTileGeo = new THREE.BoxGeometry(courtTileSize, 0.03, courtTileSize)
    for (let cx = 0; cx < courtCols; cx++) {
        for (let cz = 0; cz < courtRows; cz++) {
            const mat = (cx + cz) % 2 === 0 ? courtLightMat : courtDarkMat
            const ct = new THREE.Mesh(courtTileGeo, mat)
            ct.position.set(
                courtStartX + cx * (courtTileSize + courtGap) + courtTileSize / 2,
                0.035,
                courtStartZ + cz * (courtTileSize + courtGap) + courtTileSize / 2
            )
            ct.receiveShadow = true; scene.add(ct)
        }
    }

    // Avlu kenar çizgileri (dekoratif bordür)
    const courtyardEdgeMat = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.6 })
    for (const edgeX of [-2, config.GRID_W + 1.5]) {
        const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.5), courtyardEdgeMat)
        edgeLine.position.set(edgeX, 0.04, config.DOOR_ROW + 1.5)
        scene.add(edgeLine)
    }

    // Avlu korkulukları (düşük metal bariyer)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.2, metalness: 0.85 })
    for (const side of [-2.2, config.GRID_W + 1.7]) {
        // Dikey dikme (3 adet)
        for (let rz = 0; rz < 3; rz++) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), railMat)
            post.position.set(side, 0.35, config.DOOR_ROW + 0.2 + rz * 1.3)
            scene.add(post)
        }
        // Yatay boru
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.0, 8), railMat)
        rail.rotation.x = Math.PI / 2
        rail.position.set(side, 0.65, config.DOOR_ROW + 1.5)
        scene.add(rail)
    }

    // Avlu çiçeklikleri (köşelere)
    const addCourtPot = (px: number, pz: number, color: number) => {
        const pot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x8d8d8d, roughness: 0.75, metalness: 0.1 }))
        pot.position.set(px, 0.175, pz); scene.add(pot)
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.25, 7, 5),
            new THREE.MeshStandardMaterial({ color, roughness: 0.9 }))
        flower.position.set(px, 0.52, pz); flower.scale.y = 0.65; scene.add(flower)
    }
    addCourtPot(-1.5, config.DOOR_ROW + 0.4, 0xff8a65)
    addCourtPot(-1.5, config.DOOR_ROW + 2.8, 0xaed581)
    addCourtPot(config.GRID_W + 1.0, config.DOOR_ROW + 0.4, 0xf06292)
    addCourtPot(config.GRID_W + 1.0, config.DOOR_ROW + 2.8, 0xfff176)

    // Meydan (plaza) — avlunun ötesi
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.70 })
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(config.GRID_W + 6, 0.06, 5), plazaMat)
    plaza.position.set(config.GRID_CENTER_X, 0.02, config.DOOR_ROW + 5.5)
    plaza.receiveShadow = true
    scene.add(plaza)

    // ── ARKA CAM YÜKSELTİ (Garaja komşu görsel duvar) ──
    const glassWallMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.10, metalness: 0.85, transparent: true, opacity: 0.4 })
    const glassWall = new THREE.Mesh(new THREE.BoxGeometry(config.GRID_W + 2, 4, 0.15), glassWallMat)
    glassWall.position.set(config.GRID_CENTER_X, 2, -0.5)
    scene.add(glassWall)

    // ── ACCENT (altın yatay pano — sağ kule tabanı) ──
    const accent = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 0.15), accentMat)
    accent.position.set(config.GRID_W + 8, 1.0, 8 - 2.25)
    scene.add(accent)

    // === Şehir Sokak Donatıları (Street Furniture) ===
    // Metal bank (oturma bankı)
    const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 })
    const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.15, metalness: 0.9 })
    const addBench = (bx: number, bz: number, rotY = 0) => {
        const bg = new THREE.Group()
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.38), benchWoodMat)
        seat.position.y = 0.46; bg.add(seat)
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 0.05), benchWoodMat)
        back.position.set(0, 0.70, -0.16); bg.add(back)
        for (const lx of [-0.45, 0.45]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.46, 0.35), benchMetalMat)
            leg.position.set(lx, 0.23, 0); bg.add(leg)
        }
        // Contact shadow
        const bShadow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }))
        bShadow.rotation.x = -Math.PI / 2; bShadow.scale.set(1.6, 1, 1)
        bShadow.position.y = 0.005; bg.add(bShadow)
        bg.position.set(bx, 0, bz); bg.rotation.y = rotY
        scene.add(bg)
    }
    addBench(-3.5, 9); addBench(-3.5, 22); addBench(config.GRID_W + 2.5, 14, Math.PI); addBench(config.GRID_W + 2.5, 30, Math.PI)

    // Yangın musluğu (kırmızı)
    const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4, metalness: 0.5 })
    const addHydrant = (hx: number, hz: number) => {
        const hg = new THREE.Group()
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.12, 8), hydrantMat); base.position.y = 0.06; hg.add(base)
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.30, 8), hydrantMat); body.position.y = 0.27; hg.add(body)
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.10, 8), hydrantMat); top.position.y = 0.47; hg.add(top)
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.3, metalness: 0.6 })); cap.position.y = 0.55; hg.add(cap)
        const nozzleL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6),
            new THREE.MeshStandardMaterial({ color: 0xb71c1c, metalness: 0.7 }))
        nozzleL.rotation.z = Math.PI / 2; nozzleL.position.set(-0.13, 0.32, 0); hg.add(nozzleL)
        hg.position.set(hx, 0, hz); scene.add(hg)
    }
    addHydrant(-4.2, 17); addHydrant(config.GRID_W + 2.0, 9)

    // Çöp tenekesi (modern, silindir)
    const binMat = new THREE.MeshStandardMaterial({ color: 0x424242, roughness: 0.6, metalness: 0.4 })
    const binLidMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.3, metalness: 0.7 })
    const addBin = (bx: number, bz: number) => {
        const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.60, 10), binMat); bin.position.set(bx, 0.30, bz); scene.add(bin)
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 10), binLidMat); lid.position.set(bx, 0.63, bz); scene.add(lid)
    }
    addBin(-4.0, 13); addBin(-4.0, 28); addBin(config.GRID_W + 2.2, 20); addBin(config.GRID_W + 2.2, 36)

    // Çiçek saksıları (beton kare, renkli çiçekler)
    const potMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.75, metalness: 0.1 })
    const flowerColors = [0xff8a65, 0xf06292, 0xaed581, 0xfff176]
    const addPot = (px: number, pz: number, ci: number) => {
        const pot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), potMat)
        pot.position.set(px, 0.175, pz); scene.add(pot)
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5),
            new THREE.MeshStandardMaterial({ color: flowerColors[ci % 4], roughness: 0.9 }))
        flower.position.set(px, 0.50, pz); flower.scale.y = 0.65; scene.add(flower)
    }
    [[-4.2, 12], [-4.2, 26], [config.GRID_W + 2.3, 17], [config.GRID_W + 2.3, 31]].forEach(([px, pz], i) => addPot(px, pz, i))

    // === Otobüs Durağı (sol kaldırım, z=20) ===
    const busStopMetal = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.15, metalness: 0.9 })
    const busStopGlass = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.35 })
    const busStop = new THREE.Group()
    // Dikey dikmeler (4 köşe)
    for (const [bsx, bsz] of [[-1.1, -0.35], [1.1, -0.35], [-1.1, 0.35], [1.1, 0.35]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.8, 8), busStopMetal)
        pole.position.set(bsx, 1.4, bsz)
        busStop.add(pole)
    }
    // Çatı
    const bsRoof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.9), busStopMetal)
    bsRoof.position.set(0, 2.8, 0); busStop.add(bsRoof)
    // Cam panel (arka)
    const bsGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 0.04), busStopGlass)
    bsGlass.position.set(0, 1.3, -0.33); busStop.add(bsGlass)
    // Cam panel (yan sol)
    const bsGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.0, 0.6), busStopGlass)
    bsGlassL.position.set(-1.08, 1.3, 0); busStop.add(bsGlassL)
    // Mini bank
    const bsSeat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.3), benchWoodMat)
    bsSeat.position.set(0, 0.52, -0.15); busStop.add(bsSeat)
    busStop.position.set(-3.5, 0, 20)
    scene.add(busStop)

    // === Posta kutusu (sağ kaldırım, z=24) ===
    const postBoxMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4, metalness: 0.5 })
    const postBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.85, 12), postBoxMat)
    postBody.position.set(config.GRID_W + 2.5, 0.425, 24); scene.add(postBody)
    const postTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), postBoxMat)
    postTop.position.set(config.GRID_W + 2.5, 0.85, 24); scene.add(postTop)
    const postSlot = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.03, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }))
    postSlot.position.set(config.GRID_W + 2.5, 0.72, 24.18); scene.add(postSlot)

    // === Bisiklet parkı (sol kaldırım, z=15) ===
    const bikeRackMat = new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.2, metalness: 0.85 })
    for (let bi = 0; bi < 3; bi++) {
        const uRack = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 8, 16, Math.PI), bikeRackMat)
        uRack.position.set(-4.0 + bi * 0.7, 0.28, 15)
        scene.add(uRack)
        // Ayak
        for (const lx of [-0.12, 0.12]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6), bikeRackMat)
            leg.position.set(-4.0 + bi * 0.7 + lx, 0.14, 15)
            scene.add(leg)
        }
    }

    // === Trafik Işığı (yaya geçidi yanı) ===
    const trafficPoleMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.2, metalness: 0.9 })
    const trafficPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.5, 8), trafficPoleMat)
    trafficPole.position.set(-0.8, 1.75, config.DOOR_ROW + 4.5); scene.add(trafficPole)
    const trafficBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5, metalness: 0.4 }))
    trafficBox.position.set(-0.8, 3.6, config.DOOR_ROW + 4.5); scene.add(trafficBox)
    // Lambalar (kırmızı/sarı/yeşil)
    const lightColors = [0xff1744, 0xffab00, 0x00c853]
    lightColors.forEach((lc, li) => {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6),
            new THREE.MeshStandardMaterial({ color: lc, emissive: lc, emissiveIntensity: li === 2 ? 2.0 : 0.3 }))
        bulb.position.set(-0.8, 3.82 - li * 0.2, config.DOOR_ROW + 4.58)
        scene.add(bulb)
    })

    // === Yağmur Birikintileri (reflektif daireler) ===
    const puddleMat = new THREE.MeshStandardMaterial({
        color: 0x4a5568, metalness: 0.95, roughness: 0.05, transparent: true, opacity: 0.35
    })
    const puddleData: [number, number, number][] = [
        [2, config.DOOR_ROW + 6, 0.5], [8, config.DOOR_ROW + 8, 0.4],
        [-2, 18, 0.6], [config.GRID_W + 1, 22, 0.45], [5, 30, 0.55]
    ]
    puddleData.forEach(([px, pz, pr]) => {
        const puddle = new THREE.Mesh(new THREE.CircleGeometry(pr, 20), puddleMat)
        puddle.rotation.x = -Math.PI / 2; puddle.position.set(px, 0.006, pz)
        scene.add(puddle)
    })

    // === Manhole Kapakları (yolda metal kapak) ===
    const manholeMat = new THREE.MeshStandardMaterial({ color: 0x3e4451, roughness: 0.4, metalness: 0.8 })
    const addManhole = (mx: number, mz: number) => {
        const cover = new THREE.Mesh(new THREE.CircleGeometry(0.35, 20), manholeMat)
        cover.rotation.x = -Math.PI / 2; cover.position.set(mx, 0.007, mz); scene.add(cover)
        // Çapraz çizgiler
        const crossMat = new THREE.MeshStandardMaterial({ color: 0x555d6d, roughness: 0.5, metalness: 0.7 })
        for (const angle of [0, Math.PI / 2]) {
            const cross = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.005, 0.04), crossMat)
            cross.rotation.y = angle; cross.position.set(mx, 0.01, mz); scene.add(cross)
        }
        // Dış halka
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 8, 24), manholeMat)
        ring.rotation.x = -Math.PI / 2; ring.position.set(mx, 0.01, mz); scene.add(ring)
    }
    addManhole(config.GRID_CENTER_X, config.DOOR_ROW + 7)
    addManhole(3, 25)

    // Güvenlik bariyerleri (garaj kapısı önü, sarı-siyah)
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xfdd835, roughness: 0.4 })
    const barrierDarkMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.4 })
    for (let bi = 0; bi < 3; bi++) {
        const bPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8), bi % 2 === 0 ? barrierMat : barrierDarkMat)
        bPole.position.set(-0.5 + bi * (config.GRID_W / 2), 0.375, config.DOOR_ROW + 6.5)
        scene.add(bPole)
        const bTop = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bi % 2 === 0 ? barrierMat : barrierDarkMat)
        bTop.position.set(-0.5 + bi * (config.GRID_W / 2), 0.80, config.DOOR_ROW + 6.5)
        scene.add(bTop)
    }

    // === Street lamps (modern design) ===
    const lampPos: [number, number][] = [
        [-2.5, 7], [config.GRID_W + 1.5, 7],
        [-2.5, 16], [config.GRID_W + 1.5, 16],
        [-2.5, 26], [config.GRID_W + 1.5, 26]
    ]
    lampPos.forEach(([lx, lz]) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 4.5, 8),
            new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.2, metalness: 0.9 }))
        pole.position.set(lx, 2.25, lz); scene.add(pole)
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.2, metalness: 0.9 }))
        arm.position.set(lx + (lx < config.GRID_CENTER_X ? 0.7 : -0.7), 4.4, lz); scene.add(arm)
        const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.12, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffeebb, emissiveIntensity: 2.0 }))
        fixture.position.set(lx + (lx < config.GRID_CENTER_X ? 1.25 : -1.25), 4.35, lz); scene.add(fixture)
        const lt = new THREE.PointLight(0xfff3cd, 0.8, 14)
        lt.position.set(lx + (lx < config.GRID_CENTER_X ? 1.25 : -1.25), 4.2, lz); scene.add(lt)
    })

    // ============================================================
    // === OTOPARK ALANI (sol taraf, kaldırım ile kule arası) ===
    // ============================================================
    const parkingStartX = -8.5
    const parkingEndX = -14.5
    const parkingZ1 = 4, parkingZ2 = 38

    // Otopark zemin (koyu asfalt)
    const parkingFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.abs(parkingEndX - parkingStartX), parkingZ2 - parkingZ1),
        new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.85, metalness: 0.05 })
    )
    parkingFloor.rotation.x = -Math.PI / 2
    parkingFloor.position.set((parkingStartX + parkingEndX) / 2, -0.04, (parkingZ1 + parkingZ2) / 2)
    parkingFloor.receiveShadow = true
    scene.add(parkingFloor)

    // Park yeri çizgileri (beyaz)
    const parkLineMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 })
    const slotWidth = 2.4, slotDepth = 4.5
    const parkingCenterX = (parkingStartX + parkingEndX) / 2

    for (let z = parkingZ1 + 1; z < parkingZ2 - slotDepth; z += slotDepth + 0.8) {
        // Yatay park çizgisi (alt)
        const hLine = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.01, 0.06), parkLineMat)
        hLine.position.set(parkingCenterX, -0.03, z)
        scene.add(hLine)
        // Dikey ayırıcı çizgiler
        for (let s = 0; s < 3; s++) {
            const sx = parkingStartX - 0.5 + s * slotWidth
            const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, slotDepth), parkLineMat)
            vLine.position.set(sx, -0.03, z + slotDepth / 2)
            scene.add(vLine)
        }
    }

    // Park edilmiş ek arabalar (basit sedan kutusu)
    const parkCarColors = [0x546e7a, 0x8d6e63, 0x5c6bc0]
    const parkCarPositions: [number, number, number][] = [
        [parkingCenterX - 1.2, 0.35, parkingZ1 + 4],
        [parkingCenterX + 1.2, 0.35, parkingZ1 + 10],
        [parkingCenterX - 1.2, 0.35, parkingZ1 + 20],
    ]
    parkCarPositions.forEach(([cx, cy, cz], ci) => {
        const carBody = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.7, 3.6),
            new THREE.MeshStandardMaterial({ color: parkCarColors[ci], roughness: 0.35, metalness: 0.4 })
        )
        carBody.position.set(cx, cy, cz); carBody.castShadow = true; scene.add(carBody)
        // Kabin
        const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 0.5, 1.8),
            new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.1, metalness: 0.7, transparent: true, opacity: 0.6 })
        )
        cabin.position.set(cx, cy + 0.55, cz - 0.2); scene.add(cabin)
        // Tekerlekler
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
        const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12)
        for (const [wx, wz] of [[0.7, 1.2], [0.7, -1.2], [-0.7, 1.2], [-0.7, -1.2]] as [number, number][]) {
            const w = new THREE.Mesh(wheelGeo, wheelMat)
            w.rotation.z = Math.PI / 2
            w.position.set(cx + wx, 0.12, cz + wz); scene.add(w)
        }
        // Contact shadow
        const carShadow = new THREE.Mesh(
            new THREE.CircleGeometry(1.2, 16),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })
        )
        carShadow.rotation.x = -Math.PI / 2
        carShadow.scale.set(1, 2.0, 1)
        carShadow.position.set(cx, 0.005, cz); scene.add(carShadow)
    })

    // Otopark kenarı beton bariyer
    const parkBarrierMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.7 })
    for (let z = parkingZ1; z < parkingZ2; z += 6) {
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.8), parkBarrierMat)
        barrier.position.set(parkingEndX + 0.1, 0.12, z + 2)
        scene.add(barrier)
    }

    // ============================================================
    // === YEŞİL PARK ALANI (sağ taraf, kaldırım ile kule arası) ===
    // ============================================================
    const greenStartX = config.GRID_W + 5.5
    const greenEndX = config.GRID_W + 14
    const greenZ1 = 3, greenZ2 = 35

    // Çim zemin
    const grassParkMat = new THREE.MeshStandardMaterial({ color: 0x4a8f3f, roughness: 0.95, metalness: 0.0 })
    const grassPark = new THREE.Mesh(
        new THREE.PlaneGeometry(greenEndX - greenStartX, greenZ2 - greenZ1),
        grassParkMat
    )
    grassPark.rotation.x = -Math.PI / 2
    grassPark.position.set((greenStartX + greenEndX) / 2, -0.03, (greenZ1 + greenZ2) / 2)
    grassPark.receiveShadow = true
    scene.add(grassPark)

    // Yürüyüş yolu (beton patika — park ortasından)
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xb0a89a, roughness: 0.75 })
    const pathCenter = (greenStartX + greenEndX) / 2
    const path = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, greenZ2 - greenZ1 - 2),
        pathMat
    )
    path.rotation.x = -Math.PI / 2
    path.position.set(pathCenter, -0.02, (greenZ1 + greenZ2) / 2)
    path.receiveShadow = true
    scene.add(path)

    // Patika kenar bordürü
    const pathBorderMat = new THREE.MeshStandardMaterial({ color: 0x8a8075, roughness: 0.7 })
    for (const side of [-0.65, 0.65]) {
        const border = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.06, greenZ2 - greenZ1 - 2),
            pathBorderMat
        )
        border.position.set(pathCenter + side, 0.01, (greenZ1 + greenZ2) / 2)
        scene.add(border)
    }

    // Park bankları (2 adet)
    const parkBenchMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 })
    const parkBenchMetalMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.3, metalness: 0.8 })
    for (const bz of [greenZ1 + 8, greenZ1 + 22]) {
        // Oturma yeri
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.4), parkBenchMat)
        seat.position.set(pathCenter + 1.5, 0.45, bz); scene.add(seat)
        // Arkalık
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.05), parkBenchMat)
        back.position.set(pathCenter + 1.5, 0.65, bz + 0.18); scene.add(back)
        // Metal ayaklar
        for (const lx of [-0.45, 0.45]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.35), parkBenchMetalMat)
            leg.position.set(pathCenter + 1.5 + lx, 0.22, bz); scene.add(leg)
        }
    }

    // Çiçeklik (3 adet daire)
    const flowerBedColors = [0xef5350, 0xffa726, 0xab47bc]
    for (let fi = 0; fi < 3; fi++) {
        const fbZ = greenZ1 + 6 + fi * 10
        const fbX = pathCenter - 1.8
        // Toprak yığını
        const mound = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.95 })
        )
        mound.position.set(fbX, 0.0, fbZ); mound.scale.y = 0.3; scene.add(mound)
        // Çiçekler (küçük küreler)
        for (let ci = 0; ci < 8; ci++) {
            const angle = (ci / 8) * Math.PI * 2
            const fr = 0.3 + Math.random() * 0.2
            const flower = new THREE.Mesh(
                new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 4),
                new THREE.MeshStandardMaterial({ color: flowerBedColors[fi], roughness: 0.7 })
            )
            flower.position.set(
                fbX + Math.cos(angle) * fr,
                0.12 + Math.random() * 0.08,
                fbZ + Math.sin(angle) * fr
            )
            scene.add(flower)
        }
        // Yapraklar
        for (let li = 0; li < 12; li++) {
            const la = (li / 12) * Math.PI * 2
            const lr = 0.2 + Math.random() * 0.3
            const leaf = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 4, 3),
                new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.9 })
            )
            leaf.position.set(fbX + Math.cos(la) * lr, 0.06, fbZ + Math.sin(la) * lr)
            scene.add(leaf)
        }
    }

    // Park ağaçları (küçük dekoratif ağaçlar)
    const parkTreePositions: [number, number][] = [
        [greenStartX + 1.5, greenZ1 + 5], [greenEndX - 1.5, greenZ1 + 12],
        [greenStartX + 1.5, greenZ1 + 20], [greenEndX - 1.5, greenZ1 + 28]
    ]
    parkTreePositions.forEach(([tx, tz]) => {
        // Gövde
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.1, 1.8, 6),
            new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 })
        )
        trunk.position.set(tx, 0.9, tz); scene.add(trunk)
        // Taç (küre)
        const crown = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 })
        )
        crown.position.set(tx, 2.1, tz); scene.add(crown)
        // Alt gölge
        const tShadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.8, 12),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false })
        )
        tShadow.rotation.x = -Math.PI / 2; tShadow.position.set(tx, 0.005, tz); scene.add(tShadow)
    })

    // ============================================================
    // === BİNA ÇATI DETAYLARI (dükkân ve market çatısı) ===
    // ============================================================
    const roofMetalMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.3, metalness: 0.7 })
    const roofDarkMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.5, metalness: 0.5 })

    // Sol dükkân çatısı (x=-7, z=14, çatı y=4.08, boyut 4x6)
    // AC ünitesi
    const acUnit1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), roofMetalMat)
    acUnit1.position.set(-6.5, 4.4, 13); scene.add(acUnit1)
    const acFan1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12), roofDarkMat)
    acFan1.position.set(-6.5, 4.66, 13); scene.add(acFan1)
    // Boru (havalandırma)
    const roofPipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), roofMetalMat)
    roofPipe1.position.set(-8, 4.5, 15); scene.add(roofPipe1)
    // Parapet (çatı kenar korkuluk)
    const parapet1Mat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.6 })
    for (const [px, pz, pw, pd] of [
        [-7, 11, 4.4, 0.08], [-7, 17.08, 4.4, 0.08],
        [-9.2, 14, 0.08, 6.4], [-4.8, 14, 0.08, 6.4]
    ] as [number, number, number, number][]) {
        const parapet = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.3, pd), parapet1Mat)
        parapet.position.set(px, 4.23, pz); scene.add(parapet)
    }

    // Sağ market çatısı (x=GRID_W+5=17, z=16, çatı y=3.88, boyut 5x7)
    // AC ünitesi
    const acUnit2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.7), roofMetalMat)
    acUnit2.position.set(18, 4.2, 14.5); scene.add(acUnit2)
    const acFan2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12), roofDarkMat)
    acFan2.position.set(18, 4.52, 14.5); scene.add(acFan2)
    // Güneş paneli (eğik dikdörtgen)
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.15, metalness: 0.6 })
    const solar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 1.2), solarMat)
    solar.position.set(16, 4.15, 17); solar.rotation.x = -0.3; scene.add(solar)
    // Solar panel çerçeve
    const solarFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.06), roofMetalMat)
    solarFrame.position.set(16, 4.12, 16.4); scene.add(solarFrame)
    const solarFrame2 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.06), roofMetalMat)
    solarFrame2.position.set(16, 4.18, 17.5); scene.add(solarFrame2)
    // Parapet
    for (const [px, pz, pw, pd] of [
        [17, 12.5, 5.4, 0.08], [17, 19.58, 5.4, 0.08],
        [14.3, 16, 0.08, 7.4], [19.7, 16, 0.08, 7.4]
    ] as [number, number, number, number][]) {
        const parapet = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.25, pd), parapet1Mat)
        parapet.position.set(px, 4.0, pz); scene.add(parapet)
    }

    // ============================================================
    // === BİNA DİBİ PEYZAJ (dükkân/market önü çalı + saksı) ===
    // ============================================================
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 })
    const bushGeo = new THREE.SphereGeometry(0.25, 6, 5)

    // Sol dükkân önü (z=17 cephe)
    for (let bx = -9; bx <= -5; bx += 1.2) {
        const bush = new THREE.Mesh(bushGeo, bushMat)
        bush.position.set(bx, 0.18, 17.5)
        bush.scale.set(1, 0.7, 1)
        scene.add(bush)
    }

    // Sağ market önü (z=19.5 cephe)
    for (let bx = config.GRID_W + 3; bx <= config.GRID_W + 7; bx += 1.3) {
        const bush = new THREE.Mesh(bushGeo, bushMat)
        bush.position.set(bx, 0.18, 20)
        bush.scale.set(1, 0.7, 1)
        scene.add(bush)
    }

    // Saksılar (dükkân girişi yanları)
    const shopPotMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 })
    const shopPotGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.25, 8)
    const shopPlantMat = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.85 })
    const addShopPot = (px: number, pz: number) => {
        const sp = new THREE.Mesh(shopPotGeo, shopPotMat)
        sp.position.set(px, 0.12, pz); scene.add(sp)
        const spl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), shopPlantMat)
        spl.position.set(px, 0.35, pz); spl.scale.y = 0.8; scene.add(spl)
    }
    addShopPot(-8.5, 17.3); addShopPot(-5.7, 17.3) // Sol dükkân
    addShopPot(config.GRID_W + 2.5, 19.8); addShopPot(config.GRID_W + 7.2, 19.8) // Sağ market

    // ============================================================
    // === UZAK ZEMİN DOKU ÇEŞİTLİLİĞİ ===
    // ============================================================
    // Kaldırım ötesindeki gri monotonluğu kırmak için çeşitli zemin yamaları

    // Beton karo alanları (sol ve sağ binaların önünde)
    const farConcreteMat = new THREE.MeshStandardMaterial({ color: 0x6d6d6d, roughness: 0.8 })
    // Sol bina önü beton zemin
    const leftConcrete = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 50), farConcreteMat
    )
    leftConcrete.rotation.x = -Math.PI / 2
    leftConcrete.position.set(-14, -0.06, 25)
    leftConcrete.receiveShadow = true; scene.add(leftConcrete)

    // Sağ bina önü beton zemin
    const rightConcrete = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 50), farConcreteMat
    )
    rightConcrete.rotation.x = -Math.PI / 2
    rightConcrete.position.set(config.GRID_W + 20, -0.06, 25)
    rightConcrete.receiveShadow = true; scene.add(rightConcrete)

    // Toprak/kum yamaları (geçiş alanları)
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x7a6b5a, roughness: 0.95 })
    const dirtPatches: [number, number, number, number][] = [
        [-16, 5, 4, 5], [-16, 30, 5, 6],
        [config.GRID_W + 22, 10, 4, 4], [config.GRID_W + 22, 32, 5, 5]
    ]
    dirtPatches.forEach(([dx, dz, dw, dd]) => {
        const dirt = new THREE.Mesh(new THREE.PlaneGeometry(dw, dd), dirtMat)
        dirt.rotation.x = -Math.PI / 2
        dirt.position.set(dx, -0.055, dz); dirt.receiveShadow = true; scene.add(dirt)
    })

    // Uzak çim yamaları (yeşil alanlar)
    const farGrassMat = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.95 })
    const grassPatches: [number, number, number, number][] = [
        [-20, 15, 6, 8], [-22, 35, 5, 6],
        [config.GRID_W + 25, 8, 5, 7], [config.GRID_W + 26, 28, 6, 8]
    ]
    grassPatches.forEach(([gx, gz, gw, gd]) => {
        const gPatch = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd), farGrassMat)
        gPatch.rotation.x = -Math.PI / 2
        gPatch.position.set(gx, -0.055, gz); gPatch.receiveShadow = true; scene.add(gPatch)
    })

    // ================================================================
    // === ADIM 1: ZEMİN BÖLGE SİSTEMİ ===
    // ================================================================
    const urbanConcreteMat = new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.82, metalness: 0.05 })
    const suburbanMat = new THREE.MeshStandardMaterial({ color: 0x5a6b52, roughness: 0.90, metalness: 0.02 })
    const earthFringeMat = new THREE.MeshStandardMaterial({ color: 0x5d7a3e, roughness: 0.95, metalness: 0.0 })

    const addGroundZone = (zx: number, zz: number, zw: number, zd: number, zy: number, mat: THREE.MeshStandardMaterial) => {
        const zone = new THREE.Mesh(new THREE.PlaneGeometry(zw, zd), mat)
        zone.rotation.x = -Math.PI / 2
        zone.position.set(zx, zy, zz)
        zone.receiveShadow = true
        scene.add(zone)
    }

    // Kentsel beton — bina çevresi
    addGroundZone(-18, 25, 20, 70, -0.07, urbanConcreteMat)
    addGroundZone(config.GRID_W + 16, 25, 20, 70, -0.07, urbanConcreteMat)
    // Banliyö geçiş
    addGroundZone(-45, 40, 30, 100, -0.075, suburbanMat)
    addGroundZone(config.GRID_W + 43, 40, 30, 100, -0.075, suburbanMat)
    // Toprak/çim kenar
    addGroundZone(-75, 50, 40, 120, -0.079, earthFringeMat)
    addGroundZone(config.GRID_W + 73, 50, 40, 120, -0.079, earthFringeMat)
    addGroundZone(config.GRID_CENTER_X, 130, 200, 60, -0.079, earthFringeMat)
    addGroundZone(config.GRID_CENTER_X, -20, 200, 40, -0.079, earthFringeMat)

    // ================================================================
    // === ADIM 2: ÇAPRAZ SOKAKLAR ===
    // ================================================================
    const crossStreetMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.85, metalness: 0.03 })
    const crossLineMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 })
    const crossYellowMat = new THREE.MeshStandardMaterial({ color: 0xFFD600, roughness: 0.4 })

    for (const cz of [0, 25, 50]) {
        // Asfalt yol
        const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(150, 6), crossStreetMat)
        crossRoad.rotation.x = -Math.PI / 2
        crossRoad.position.set(config.GRID_CENTER_X, -0.06, cz)
        crossRoad.receiveShadow = true
        scene.add(crossRoad)

        // Sarı kenar çizgileri
        for (const edgeOffset of [-2.8, 2.8]) {
            const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(150, 0.01, 0.08), crossYellowMat)
            edgeLine.position.set(config.GRID_CENTER_X, -0.04, cz + edgeOffset)
            scene.add(edgeLine)
        }

        // Kesikli beyaz orta çizgi (ana yol alanını atla)
        for (let dx = -70; dx < 80; dx += 3) {
            // Ana grid alanı içinde atla
            if (dx >= -1 && dx <= 13) continue
            const dash = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.012, 0.12), crossLineMat)
            dash.position.set(dx, -0.04, cz)
            scene.add(dash)
        }
    }

    // ================================================================
    // === ADIM 3: MAHALLE EVLERİ ===
    // ================================================================
    const houseDoorMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 })
    const houseWinMat = new THREE.MeshStandardMaterial({
        color: 0xbbdefb, emissive: 0x90caf9, emissiveIntensity: 0.2, roughness: 0.1, metalness: 0.3
    })
    const houseWinGeo = new THREE.BoxGeometry(0.4, 0.4, 0.04)
    const houseShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, depthWrite: false })

    const addHouse = (hx: number, hz: number, hw: number, hh: number, hd: number,
                      wallColor: number, roofColor: number, rotY = 0) => {
        const hg = new THREE.Group()
        // Duvar
        const wall = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd),
            new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.75 }))
        wall.position.y = hh / 2; wall.castShadow = true; hg.add(wall)
        // Çatı (piramit)
        const roofH = hh * 0.35
        const roofGeo = new THREE.ConeGeometry(hw * 0.7, roofH, 4)
        roofGeo.rotateY(Math.PI / 4)
        const roof = new THREE.Mesh(roofGeo,
            new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.6 }))
        roof.position.y = hh + roofH / 2
        roof.scale.set(1, 1, hd / hw)
        hg.add(roof)
        // Kapı
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.04), houseDoorMat)
        door.position.set(0, 0.6, hd / 2 + 0.02); hg.add(door)
        // Pencereler
        for (const wx of [-hw * 0.25, hw * 0.25]) {
            const win = new THREE.Mesh(houseWinGeo, houseWinMat)
            win.position.set(wx, hh * 0.6, hd / 2 + 0.02); hg.add(win)
        }
        // Contact shadow
        const shd = new THREE.Mesh(new THREE.PlaneGeometry(hw + 0.5, hd + 0.5), houseShadowMat)
        shd.rotation.x = -Math.PI / 2; shd.position.y = 0.004; hg.add(shd)

        hg.position.set(hx, 0, hz); hg.rotation.y = rotY
        scene.add(hg)
    }

    // Sol taraf evleri
    addHouse(-24, 5, 3.5, 4.0, 4.0, 0xd7ccc8, 0x8d6e63, 0)
    addHouse(-26, 14, 3.0, 3.5, 3.5, 0xefebe9, 0x6d4c41, 0.1)
    addHouse(-24, 24, 4.0, 4.5, 4.5, 0xcfd8dc, 0x795548, -0.05)
    addHouse(-27, 32, 3.2, 3.8, 3.8, 0xfff3e0, 0xa1887f, 0.15)
    addHouse(-25, 42, 3.5, 4.0, 4.0, 0xe8eaf6, 0x5d4037, 0)
    // Sağ taraf evleri
    addHouse(35, 3, 3.5, 4.0, 4.0, 0xfbe9e7, 0x8d6e63, Math.PI)
    addHouse(37, 12, 3.0, 3.5, 3.5, 0xe8eaf6, 0x6d4c41, Math.PI + 0.1)
    addHouse(34, 22, 4.0, 4.5, 4.5, 0xefebe9, 0x795548, Math.PI - 0.05)
    addHouse(36, 30, 3.2, 3.8, 3.8, 0xd7ccc8, 0xa1887f, Math.PI)
    addHouse(35, 40, 3.5, 4.0, 4.0, 0xfff3e0, 0x5d4037, Math.PI + 0.1)

    // ================================================================
    // === ADIM 4: UZAK ŞEHİR SİLUETİ ===
    // ================================================================
    const distSilMats = [
        new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.7, metalness: 0.15 }),
        new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.75, metalness: 0.1 }),
        new THREE.MeshStandardMaterial({ color: 0xa8b5c0, roughness: 0.8, metalness: 0.05 }),
        new THREE.MeshStandardMaterial({ color: 0xb8c4ce, roughness: 0.85, metalness: 0.02 }),
    ]

    const addSilhouette = (sx: number, sz: number, sw: number, sh: number, sd: number, matIdx: number) => {
        const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), distSilMats[matIdx])
        body.position.set(sx, sh / 2, sz)
        scene.add(body)
    }

    // Sol yakın siluetler (x=-40 to -44)
    addSilhouette(-40, 0, 5, 16, 5, 0); addSilhouette(-42, 12, 4, 22, 4, 0)
    addSilhouette(-40, 25, 6, 14, 5, 1); addSilhouette(-44, 35, 5, 20, 5, 0)
    addSilhouette(-41, 48, 4, 18, 4, 1); addSilhouette(-43, 58, 5, 12, 5, 1)
    // Sol uzak siluetler (x=-55 to -62)
    addSilhouette(-55, -5, 6, 24, 6, 2); addSilhouette(-58, 10, 5, 18, 5, 2)
    addSilhouette(-56, 25, 7, 30, 6, 2); addSilhouette(-60, 40, 5, 20, 5, 3)
    addSilhouette(-57, 55, 6, 26, 6, 2); addSilhouette(-62, 65, 5, 16, 5, 3)
    // Sağ yakın siluetler (x=52 to 56)
    addSilhouette(52, 2, 5, 18, 5, 0); addSilhouette(55, 14, 4, 24, 4, 0)
    addSilhouette(53, 28, 6, 16, 5, 1); addSilhouette(56, 40, 5, 22, 5, 0)
    addSilhouette(54, 52, 4, 14, 4, 1); addSilhouette(55, 62, 5, 20, 5, 1)
    // Sağ uzak siluetler (x=65 to 72)
    addSilhouette(65, -2, 6, 26, 6, 2); addSilhouette(68, 12, 5, 20, 5, 2)
    addSilhouette(66, 28, 7, 32, 6, 2); addSilhouette(70, 42, 5, 22, 5, 3)
    addSilhouette(67, 56, 6, 28, 6, 2); addSilhouette(72, 68, 5, 18, 5, 3)
    // Uzak z siluetleri
    addSilhouette(-10, 70, 5, 16, 5, 1); addSilhouette(5, 80, 6, 22, 5, 2)
    addSilhouette(20, 75, 5, 18, 5, 2); addSilhouette(-5, 90, 7, 28, 6, 3)
    addSilhouette(15, 95, 6, 20, 5, 3); addSilhouette(30, 85, 5, 14, 5, 2)

    // ================================================================
    // === ADIM 5: DAĞLAR / TEPELER ===
    // ================================================================
    const mountainMats = [
        new THREE.MeshStandardMaterial({ color: 0x7b8fa0, roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ color: 0x94a3b3, roughness: 0.92 }),
        new THREE.MeshStandardMaterial({ color: 0xa8b4c0, roughness: 0.95 }),
    ]

    const addMountain = (mx: number, mz: number, radius: number, height: number,
                         sX: number, sZ: number, matIdx: number) => {
        const mtn = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 8), mountainMats[matIdx])
        mtn.position.set(mx, height / 2, mz)
        mtn.scale.set(sX, 1, sZ)
        scene.add(mtn)
    }

    // Sol ufuk
    addMountain(-75, 20, 15, 18, 1, 2.0, 0)
    addMountain(-85, 45, 20, 25, 1, 1.5, 1)
    addMountain(-80, -10, 12, 14, 1, 1.8, 1)
    // Sağ ufuk
    addMountain(config.GRID_W + 73, 15, 18, 22, 1, 1.8, 0)
    addMountain(config.GRID_W + 83, 40, 22, 28, 1, 1.5, 1)
    addMountain(config.GRID_W + 68, -5, 14, 16, 1, 2.0, 1)
    // Uzak z ufku
    addMountain(-20, 110, 20, 20, 2.5, 1, 2)
    addMountain(10, 120, 25, 30, 2.0, 1, 2)
    addMountain(35, 115, 18, 22, 2.2, 1, 2)
    // Yakın z ufku
    addMountain(-10, -35, 16, 18, 2.0, 1, 1)
    addMountain(15, -40, 20, 24, 2.5, 1, 2)
    addMountain(40, -35, 14, 16, 1.8, 1, 1)

    // ================================================================
    // === ADIM 6: UZAK AĞAÇLAR ===
    // ================================================================
    // Yakın ağaç geometri + malzeme
    const nearTrunkGeo = new THREE.CylinderGeometry(0.06, 0.10, 1.4, 6)
    const nearCanopyGeo = new THREE.ConeGeometry(0.7, 1.6, 6)
    const distTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 })
    const nearCanopyMats = [
        new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.85 }),
    ]
    // Orta ağaç
    const midTrunkGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.9, 5)
    const midCanopyGeo = new THREE.ConeGeometry(0.5, 1.1, 5)
    const midCanopyMats = [
        new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.88 }),
        new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 0.88 }),
    ]
    // Uzak ağaç
    const farTrunkGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.6, 4)
    const farCanopyGeo = new THREE.ConeGeometry(0.35, 0.7, 4)
    const farCanopyMat = new THREE.MeshStandardMaterial({ color: 0x607a58, roughness: 0.9 })

    const addDistTree = (tx: number, tz: number, trGeo: THREE.BufferGeometry, caGeo: THREE.BufferGeometry,
                         trMat: THREE.Material, caMat: THREE.Material, trH: number, caH: number) => {
        const tr = new THREE.Mesh(trGeo, trMat)
        tr.position.set(tx, trH / 2, tz); scene.add(tr)
        const ca = new THREE.Mesh(caGeo, caMat)
        ca.position.set(tx, trH + caH / 2 - 0.1, tz); scene.add(ca)
    }

    // Yakın ağaçlar (evler arası)
    const nearTreePos: [number, number][] = [
        [-23, 8], [-25, 18], [-22, 28], [-26, 38], [-24, 48],
        [33, 6], [36, 16], [34, 26], [37, 36], [33, 46]
    ]
    nearTreePos.forEach(([tx, tz]) => {
        const cm = nearCanopyMats[Math.floor(Math.random() * 3)]
        addDistTree(tx, tz, nearTrunkGeo, nearCanopyGeo, distTrunkMat, cm, 1.4, 1.6)
    })

    // Orta ağaçlar (siluetler arası)
    const midTreePos: [number, number][] = [
        [-36, 5], [-38, 15], [-40, 28], [-37, 38], [-42, 50], [-39, 60],
        [48, 8], [50, 20], [52, 32], [49, 42], [53, 55], [51, 65]
    ]
    midTreePos.forEach(([tx, tz]) => {
        const cm = midCanopyMats[Math.floor(Math.random() * 2)]
        addDistTree(tx, tz, midTrunkGeo, midCanopyGeo, distTrunkMat, cm, 0.9, 1.1)
    })

    // Uzak ağaçlar
    const farTreePos: [number, number][] = [
        [-56, 0], [-60, 18], [-58, 35], [-62, 50], [-57, 65],
        [63, 5], [66, 22], [64, 38], [68, 52], [65, 68],
        [0, 65], [10, 70], [20, 68], [-10, 72], [30, 75]
    ]
    farTreePos.forEach(([tx, tz]) => {
        addDistTree(tx, tz, farTrunkGeo, farCanopyGeo, distTrunkMat, farCanopyMat, 0.6, 0.7)
    })

    // Hemisphere sky light
    const skyLightParam = new THREE.HemisphereLight(0x87ceeb, 0x3d3b35, 0)
    skyLightParam.position.set(0, 10, 0)
    skyLightParam.name = 'env_hemisphere'
    scene.add(skyLightParam)

    return { skyLight: skyLightParam, animatedObjects }
}

export function applyThemeToEnvironment(scene: THREE.Scene, theme: 'light' | 'dark') {
    // Yaz günü berrak mavi gökyüzü — tema seçimine bakılmaksızın parlak gündüz

    const sunDir = new THREE.Vector3()
    const elevation = 50  // Yüksek güneş = parlak öğle vakti
    const azimuth = 180
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth))

    // 1. Sky shader — tam yaz gündüzü parametreleri
    const sky = scene.getObjectByName('env_sky') as Sky | undefined
    if (sky) {
        const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms as Record<string, THREE.IUniform<unknown>>
            ; (skyUniforms['turbidity'] as THREE.IUniform<number>).value = 1.5   // Çok berrak
            ; (skyUniforms['rayleigh'] as THREE.IUniform<number>).value = 0.3     // Derin mavi
            ; (skyUniforms['mieCoefficient'] as THREE.IUniform<number>).value = 0.003
            ; (skyUniforms['mieDirectionalG'] as THREE.IUniform<number>).value = 0.95 // Güneş halesini vurgula
            ; (skyUniforms['sunPosition'] as THREE.IUniform<THREE.Vector3>).value.copy(sunDir)
    }

    // 2. Sun Light
    const sun = scene.getObjectByName('env_sun') as THREE.DirectionalLight | undefined
    if (sun) {
        sun.position.copy(sunDir).multiplyScalar(170)
        sun.color.setHex(0xffffff) // Beyaz berrak günışığı
        sun.intensity = 2.5
        sun.castShadow = true
        sun.shadow.mapSize.width = 2048
        sun.shadow.mapSize.height = 2048
        sun.shadow.camera.near = 10
        sun.shadow.camera.far = 300
        sun.shadow.camera.left = -50; sun.shadow.camera.right = 50
        sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50
        sun.shadow.bias = -0.0005
    }

    // 3. Güneş diskini de doğru pozisyona taşı (sahne referans noktasına göre)
    const sunDisc = scene.getObjectByName('env_sun_disc')
    if (sunDisc) {
        // Gökyüzü sphere içinde sabit dur — yeniden hesapla
        const skyCenter = new THREE.Vector3(5, 0, 22) // yaklaşık sahne merkezi
        sunDisc.position.copy(sunDir.clone().multiplyScalar(150).add(skyCenter))
        const sunGlow = sunDisc.parent?.children.find(c => c !== sunDisc && c.position.distanceTo(sunDisc.position) < 5)
        if (sunGlow) sunGlow.position.copy(sunDisc.position)
    }

    // 4. Hemisphere Light — mavi gökyüzü yansıması
    const hemi = scene.getObjectByName('env_hemisphere') as THREE.HemisphereLight | undefined
    if (hemi) {
        hemi.color.setHex(0x87CEEB) // Açık mavi gökyüzü rengi
        hemi.groundColor.setHex(0x666666)
        hemi.intensity = 1.0
    }
}
