import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

export function createSkyGradient(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 0, 512)
    grad.addColorStop(0, '#0a0e1a')     // dark top
    grad.addColorStop(0.2, '#1a2a4a')   // deep blue
    grad.addColorStop(0.4, '#2d4a7a')   // mid blue
    grad.addColorStop(0.6, '#4a7ab0')   // lighter blue
    grad.addColorStop(0.75, '#6aaad8')  // sky blue
    grad.addColorStop(0.85, '#f0c870')  // golden horizon
    grad.addColorStop(0.95, '#e8a050')  // warm horizon
    grad.addColorStop(1, '#c87040')     // ground glow
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 2, 512)
    const tex = new THREE.CanvasTexture(canvas)
    tex.mapping = THREE.EquirectangularReflectionMapping
    return tex
}

export function createOutdoorScene(
    scene: THREE.Scene,
    config: { GRID_W: number, GRID_H: number, DOOR_ROW: number, GRID_CENTER_X: number }
): { skyLight: THREE.HemisphereLight } {
    // === Physically-inspired sky & sun ===
    const sky = new Sky()
    sky.scale.setScalar(480)
    sky.position.set(config.GRID_CENTER_X, 0, config.DOOR_ROW + 10)
    const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms as Record<string, THREE.IUniform<unknown>>
        ; (skyUniforms['turbidity'] as THREE.IUniform<number>).value = 4.5 // Şehir sisi / kirliliği
        ; (skyUniforms['rayleigh'] as THREE.IUniform<number>).value = 1.8 // Işık saçılımı
        ; (skyUniforms['mieCoefficient'] as THREE.IUniform<number>).value = 0.005 // Daha yoğun şehir atmosferi
        ; (skyUniforms['mieDirectionalG'] as THREE.IUniform<number>).value = 0.8
    const sunDir = new THREE.Vector3()
    const elevation = 4 // Güneşi batmaya yakınlaştır
    const azimuth = 185
    const phi = THREE.MathUtils.degToRad(90 - elevation)
    const theta = THREE.MathUtils.degToRad(azimuth)
    sunDir.setFromSphericalCoords(1, phi, theta)
        ; (skyUniforms['sunPosition'] as THREE.IUniform<THREE.Vector3>).value.copy(sunDir)
        ; (sky.material as THREE.ShaderMaterial).depthWrite = false
    scene.add(sky)

    const outdoorSun = new THREE.DirectionalLight(0xffa85c, 0.45) // Daha turuncu bir ışık
    outdoorSun.position.copy(sunDir).multiplyScalar(170)
    outdoorSun.target.position.set(config.GRID_CENTER_X, 0.4, config.DOOR_ROW + 2)
    outdoorSun.castShadow = false
    scene.add(outdoorSun)
    scene.add(outdoorSun.target)

    // === Clouds ===
    // Bulutlara gün batımı rengi tonları
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffd1b8, transparent: true, opacity: 0.35 })
    const cloudPositions: [number, number, number, number][] = [
        [-10, 18, 20, 3], [15, 20, 25, 2.5], [5, 22, 30, 4], [-8, 16, 35, 2],
        [25, 19, 22, 3.5], [0, 21, 40, 3], [12, 17, 15, 2.8]
    ]
    cloudPositions.forEach(([cx, cy, cz, cs]) => {
        const cloud = new THREE.Group()
        for (let i = 0; i < 5; i++) {
            const puff = new THREE.Mesh(
                new THREE.SphereGeometry(cs * (0.5 + Math.random() * 0.5), 8, 6), cloudMat)
            puff.position.set(i * cs * 0.6 - cs, Math.random() * cs * 0.3, Math.random() * cs * 0.3)
            puff.scale.y = 0.4
            cloud.add(puff)
        }
        cloud.position.set(cx, cy, cz)
        scene.add(cloud)
    })

    // === Ground (Asphalt road) ===
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220),
        new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.85 }))
    ground.rotation.x = -Math.PI / 2
    ground.position.set(config.GRID_CENTER_X, -0.08, 70)
    ground.receiveShadow = true
    scene.add(ground)
    const nearGroundBlend = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 24),
        new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.88 })
    )
    nearGroundBlend.rotation.x = -Math.PI / 2
    nearGroundBlend.position.set(config.GRID_CENTER_X, -0.06, 10)
    nearGroundBlend.receiveShadow = true
    scene.add(nearGroundBlend)

    // === Outdoor grid tiles (City road path) ===
    const outdoorTileMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.75, metalness: 0.1 })
    const outdoorEdgeMat = new THREE.LineBasicMaterial({ color: 0x3a3c40, transparent: true, opacity: 0.6 })
    for (let x = 0; x < config.GRID_W; x++) {
        for (let z = config.DOOR_ROW; z < config.GRID_H; z++) {
            const tile = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.04, 0.96), outdoorTileMat)
            tile.position.set(x, -0.02, z)
            tile.receiveShadow = true
            scene.add(tile)
            const edges = new THREE.LineSegments(
                new THREE.EdgesGeometry(tile.geometry), outdoorEdgeMat)
            edges.position.copy(tile.position)
            scene.add(edges)
        }
    }

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

    // === Sidewalks ===
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.9 })
    const lSW = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 80), sidewalkMat)
    lSW.position.set(-2.25, 0.03, 40)
    lSW.receiveShadow = true
    scene.add(lSW)
    const rSW = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 80), sidewalkMat)
    rSW.position.set(config.GRID_W + 1.25, 0.03, 40)
    rSW.receiveShadow = true
    scene.add(rSW)

    // === City Buildings & Props ===
    const buildMat1 = new THREE.MeshStandardMaterial({ color: 0xd0d4dc, roughness: 0.9, metalness: 0.1 })
    const buildMat2 = new THREE.MeshStandardMaterial({ color: 0x8a9ba8, roughness: 0.8, metalness: 0.2 })
    const buildMat3 = new THREE.MeshStandardMaterial({ color: 0xa69b97, roughness: 0.85, metalness: 0.15 })

    const winMat = new THREE.MeshStandardMaterial({ color: 0xFFF9C4, emissive: 0xFFE082, emissiveIntensity: 0.8 })
    const winDarkMat = new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.2, metalness: 0.8 }) // Işığı kapalı pencereler

    const houseData = [
        // Sol taraf binaları
        { x: -6, z: 8, w: 4, h: 5, d: 4, mat: buildMat1 },
        { x: -7, z: 15, w: 5, h: 8, d: 5, mat: buildMat2 },
        { x: -6.5, z: 23, w: 4.5, h: 6, d: 4, mat: buildMat3 },
        { x: -8, z: 32, w: 6, h: 12, d: 6, mat: buildMat2 },
        // Sağ taraf binaları
        { x: config.GRID_W + 5, z: 9, w: 4, h: 6, d: 4, mat: buildMat2 },
        { x: config.GRID_W + 6, z: 17, w: 5, h: 9, d: 5, mat: buildMat1 },
        { x: config.GRID_W + 5.5, z: 25, w: 4, h: 5, d: 4, mat: buildMat3 },
        { x: config.GRID_W + 7, z: 34, w: 6, h: 14, d: 6, mat: buildMat1 }
    ]

    // Ağaç ve bitki örtüsü eklentisi
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.9 })
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 0.8 })

    houseData.forEach(h => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(h.w, h.h, h.d), h.mat)
        b.position.set(h.x, h.h / 2, h.z)
        b.castShadow = true
        b.receiveShadow = true
        scene.add(b)

        const roof = new THREE.Mesh(new THREE.BoxGeometry(h.w * 1.05, 0.4, h.d * 1.05), new THREE.MeshStandardMaterial({ color: 0x222222 }))
        roof.position.set(h.x, h.h + 0.2, h.z)
        roof.castShadow = true
        scene.add(roof)

        // Bina Pencereleri
        for (let wy = 1.2; wy < h.h - 0.5; wy += 1.5) {
            for (let wx = -h.w / 2 + 0.6; wx <= h.w / 2 - 0.6; wx += 1.2) {
                const isLit = Math.random() > 0.4 // %60 ışığı açık
                const wMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), isLit ? winMat : winDarkMat)
                if (h.x < 0) {
                    wMesh.position.set(h.x + wx, wy, h.z + h.d / 2 + 0.01)
                } else {
                    wMesh.position.set(h.x + wx, wy, h.z - h.d / 2 - 0.01)
                    wMesh.rotation.y = Math.PI
                }
                scene.add(wMesh)
            }
            // Yan cephe pencereleri
            for (let wz = -h.d / 2 + 0.6; wz <= h.d / 2 - 0.6; wz += 1.2) {
                const isLit = Math.random() > 0.4
                const wMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), isLit ? winMat : winDarkMat)
                if (h.x < 0) {
                    wMesh.position.set(h.x + h.w / 2 + 0.01, wy, h.z + wz)
                    wMesh.rotation.y = Math.PI / 2
                } else {
                    wMesh.position.set(h.x - h.w / 2 - 0.01, wy, h.z + wz)
                    wMesh.rotation.y = -Math.PI / 2
                }
                scene.add(wMesh)
            }
        }

        // Binaların önüne rastgele küçük ağaçlar ekle
        if (Math.random() > 0.3) {
            const treeGroup = new THREE.Group()
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 5), trunkMat)
            trunk.position.y = 0.75
            trunk.castShadow = true
            treeGroup.add(trunk)

            const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), leavesMat)
            leaves.position.y = 2.0
            leaves.castShadow = true
            treeGroup.add(leaves)

            // Ağacı binanın kapıya yakın ucuna koy
            treeGroup.position.set(h.x > 0 ? h.x - h.w / 2 - 1.5 : h.x + h.w / 2 + 1.5, 0, h.z + (Math.random() * 2 - 1))
            scene.add(treeGroup)
        }
    })

    // === Background City skyline ===
    const skyMat1 = new THREE.MeshStandardMaterial({ color: 0x1a212a, roughness: 0.85, metalness: 0.1 })
    const skyMat2 = new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.9, metalness: 0.15 })

    const skyline: [number, number, number, number][] = [
        [-15, 20, 8, 45], [-8, 28, 6, 50], [config.GRID_W + 10, 25, 7, 48], [config.GRID_W + 18, 30, 8, 55],
        [config.GRID_W + 25, 18, 6, 42], [-22, 15, 5, 40], [config.GRID_W + 5, 22, 6, 52], [config.GRID_W + 14, 19, 7, 47]
    ]

    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })

    skyline.forEach(([bx, bh, bw, bz], index) => {
        const isDark = index % 2 === 0
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), isDark ? skyMat1 : skyMat2)
        b.position.set(bx, bh / 2, bz)
        scene.add(b)

        // Uçak/Helikopter ikaz lambası (Sadece yüksek binalara)
        if (bh >= 25) {
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), beaconMat)
            beacon.position.set(bx, bh + 0.5, bz)
            scene.add(beacon)
            // Performans için sadece nokta ışığı (PointLight) kullanmak yerine emissive shader da kullanılabilir ama 
            // şimdilik basit bir kırmızı obje yeterli.
        }

        for (let wy = 2; wy < bh - 1; wy += 2) {
            for (let wx = -bw / 3; wx <= bw / 3; wx += bw / 3) {
                // Background buildings have fewer lit windows
                const isLit = Math.random() > 0.65
                const w = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.6), isLit ? winMat : winDarkMat)
                w.position.set(bx + wx, wy, bz - bw / 2 - 0.01)
                scene.add(w)
            }
        }
    })

    // === Street lamps (modern design) ===
    const lampPos: [number, number][] = [[-2.5, 7], [config.GRID_W + 1.5, 7], [-2.5, 15], [config.GRID_W + 1.5, 15], [-2.5, 23], [config.GRID_W + 1.5, 23]]
    lampPos.forEach(([lx, lz]) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 4.0, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.7 }))
        pole.position.set(lx, 2.0, lz)
        scene.add(pole)
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.7 }))
        arm.position.set(lx + (lx < config.GRID_CENTER_X ? 0.6 : -0.6), 3.95, lz)
        scene.add(arm)

        // Lambanın ışık yayan kısmı daha sıcak turuncu/sarı bir ton (Gün batımı teması)
        const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.1, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffaa00, emissiveIntensity: 1.5 }))
        fixture.position.set(lx + (lx < config.GRID_CENTER_X ? 1.1 : -1.1), 3.9, lz)
        scene.add(fixture)

        // Loş sıcak nokta ışığı
        const lt = new THREE.PointLight(0xffaa00, 0.6, 12)
        lt.position.set(lx + (lx < config.GRID_CENTER_X ? 1.1 : -1.1), 3.8, lz)
        scene.add(lt)
    })

    // === Hemisphere sky light (brightens when door opens) ===
    // Gökyüzünden hafif mavi (evening), yerden loş hafif sıcak siyah/gri yansıma
    const skyLightParam = new THREE.HemisphereLight(0x406080, 0x1f1412, 0)
    skyLightParam.position.set(0, 10, 0)
    scene.add(skyLightParam)

    return { skyLight: skyLightParam }
}
