import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export interface GarageConfig {
    GRID_W: number
    GARAGE_DEPTH: number
    GRID_CENTER_X: number
    WALL_H: number
    DOOR_ROW: number
    BUTTON_X?: number        // X coordinate of the button (for path arrows)
    CHARGE_X?: number        // X coordinate of the charging station
    CHARGE_Y?: number        // Y (Z in 3D) coordinate of the charging station
}

export function createGarage(config: GarageConfig) {
    const garageGroup = new THREE.Group()
    const g = garageGroup
    const garageW = config.GRID_W + 0.6
    const sideDepth = config.GARAGE_DEPTH + 2.2
    const midZ = sideDepth / 2 - 0.7

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x55607a, roughness: 0.60, metalness: 0.20 }) // Daha aydınlık mavi/gri duvarlar
    const wallPanelMat = new THREE.MeshStandardMaterial({ color: 0x6a7590, roughness: 0.60, metalness: 0.25 })
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x6e768e, roughness: 0.65, metalness: 0.3 }) // Yansıması yükseltilmiş, daha açık zemin

    // Base slab + perimeter lane
    const slab = new THREE.Mesh(new THREE.BoxGeometry(garageW + 0.7, 0.14, sideDepth + 0.2), floorMat)
    slab.position.set(config.GRID_CENTER_X, -0.11, midZ)
    slab.receiveShadow = true
    g.add(slab)
    const perimeterLane = new THREE.Mesh(
        new THREE.BoxGeometry(garageW + 0.15, 0.04, sideDepth - 0.2),
        new THREE.MeshStandardMaterial({ color: 0x60667a, roughness: 0.6, metalness: 0.2 }) // Açık renkli çerçeve
    )
    perimeterLane.position.set(config.GRID_CENTER_X, -0.07, midZ)
    perimeterLane.receiveShadow = true
    g.add(perimeterLane)

    // Arrow Shape Geometry for path indicators
    const arrowShape = new THREE.Shape()
    arrowShape.moveTo(0, 0.3)
    arrowShape.lineTo(0.2, -0.3)
    arrowShape.lineTo(0, -0.12)
    arrowShape.lineTo(-0.2, -0.3)
    arrowShape.lineTo(0, 0.3)
    const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, { depth: 0.02, bevelEnabled: false })
    arrowGeo.center()

    // Grout base — dark surface visible between tile gaps
    const groutBase = new THREE.Mesh(
        new THREE.PlaneGeometry(config.GRID_W, config.GARAGE_DEPTH),
        new THREE.MeshStandardMaterial({ color: 0x3a3d4a, roughness: 0.9, metalness: 0.1 })
    )
    groutBase.rotation.x = -Math.PI / 2
    groutBase.position.set((config.GRID_W - 1) / 2, -0.038, (config.GARAGE_DEPTH - 1) / 2)
    groutBase.receiveShadow = true
    g.add(groutBase)

    // Pre-create tile materials — center vs edge
    const tileCenterMat = new THREE.MeshStandardMaterial({ color: 0x768098, roughness: 0.30, metalness: 0.45 })
    const tileEdgeMat = new THREE.MeshStandardMaterial({ color: 0x6b7488, roughness: 0.35, metalness: 0.40 })
    const tileGeo = new THREE.BoxGeometry(0.92, 0.04, 0.92) // smaller than 1.0 to reveal grout

    // Interior floor tiles
    for (let x = 0; x < config.GRID_W; x++) {
        for (let z = 0; z < config.GARAGE_DEPTH; z++) {
            const isEdge = x === 0 || x === config.GRID_W - 1 || z === 0 || z === config.GARAGE_DEPTH - 1
            const tile = new THREE.Mesh(tileGeo, isEdge ? tileEdgeMat : tileCenterMat)
            tile.position.set(x, -0.02, z)
            tile.receiveShadow = true
            g.add(tile)
            // Generate floor guide arrows targeting the button on the left wall
            const buttonX = config.BUTTON_X ?? 0
            const isCenterPath = x === config.GRID_CENTER_X && z >= 3 && z <= 7
            const isTurnPath = z === 7 && x <= config.GRID_CENTER_X && x > buttonX
            const isButtonTile = x === buttonX && z === 7 // the actual button tile

            if (isCenterPath || isTurnPath) {
                const arrow = new THREE.Mesh(
                    arrowGeo,
                    new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 1.0, roughness: 0.35 })
                )
                arrow.position.set(x, 0.015, z)
                arrow.rotation.x = -Math.PI / 2

                if (isTurnPath && !isCenterPath) {
                    arrow.rotation.z = Math.PI / 2   // pointing West (left)
                } else if (isCenterPath && z === 7) {
                    arrow.rotation.z = Math.PI / 2   // corner: also West to show the turn
                } else {
                    arrow.rotation.z = Math.PI        // pointing North (straight ahead)
                }
                g.add(arrow)
            }
        }
    }

    // === Outdoor arrows from door toward charging station ===
    const chargeX = config.CHARGE_X ?? config.GRID_CENTER_X
    const chargeY = config.CHARGE_Y ?? (config.DOOR_ROW + 2)
    const arrowMatOut = new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00E5FF, emissiveIntensity: 1.2, roughness: 0.3 })

    // North leg: x=0, from DOOR_ROW to chargeY (along left column)
    for (let oz = config.DOOR_ROW; oz <= chargeY; oz++) {
        const a = new THREE.Mesh(arrowGeo, arrowMatOut)
        a.position.set(0, 0.015, oz)
        a.rotation.x = -Math.PI / 2
        a.rotation.z = Math.PI   // pointing North
        g.add(a)
    }
    // East leg: z=chargeY, from x=0 to chargeX
    for (let ox = 1; ox <= chargeX; ox++) {
        const a = new THREE.Mesh(arrowGeo, arrowMatOut)
        a.position.set(ox, 0.015, chargeY)
        a.rotation.x = -Math.PI / 2
        a.rotation.z = -Math.PI / 2   // pointing East
        g.add(a)
    }

    // Walls
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(garageW + 0.75, config.WALL_H + 0.45, 0.28), wallMat)
    backWall.position.set(config.GRID_CENTER_X, (config.WALL_H + 0.45) / 2, -0.7)
    backWall.castShadow = true
    backWall.receiveShadow = true
    g.add(backWall)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, config.WALL_H + 0.45, sideDepth), wallMat)
    leftWall.position.set(-0.72, (config.WALL_H + 0.45) / 2, midZ)
    leftWall.castShadow = true
    g.add(leftWall)
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, config.WALL_H + 0.45, sideDepth), wallMat)
    rightWall.position.set(config.GRID_W - 0.28, (config.WALL_H + 0.45) / 2, midZ)
    rightWall.castShadow = true
    g.add(rightWall)

    // Ribbed back wall details
    for (let i = -4; i <= 4; i++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, config.WALL_H + 0.1, 0.04), wallPanelMat)
        rib.position.set(config.GRID_CENTER_X + i * 0.88, (config.WALL_H + 0.1) / 2, -0.54)
        g.add(rib)
    }
    const backLightBar = new THREE.Mesh(
        new THREE.BoxGeometry(garageW - 1.1, 0.06, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaef2ff, emissiveIntensity: 1.5, roughness: 0.25 })
    )
    backLightBar.position.set(config.GRID_CENTER_X, config.WALL_H + 0.15, -0.52)
    g.add(backLightBar)

    // Entry portal frame
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x828b9e, roughness: 0.35, metalness: 0.7 })
    const topPortal = new THREE.Mesh(new THREE.BoxGeometry(garageW + 0.5, 0.22, 0.18), portalMat)
    topPortal.position.set(config.GRID_CENTER_X, config.WALL_H + 0.16, config.DOOR_ROW - 0.44)
    g.add(topPortal)
    const leftPortal = new THREE.Mesh(new THREE.BoxGeometry(0.2, config.WALL_H + 0.2, 0.16), portalMat)
    leftPortal.position.set(-0.55, (config.WALL_H + 0.2) / 2, config.DOOR_ROW - 0.44)
    g.add(leftPortal)
    const rightPortal = new THREE.Mesh(new THREE.BoxGeometry(0.2, config.WALL_H + 0.2, 0.16), portalMat)
    rightPortal.position.set(config.GRID_W - 0.45, (config.WALL_H + 0.2) / 2, config.DOOR_ROW - 0.44)
    g.add(rightPortal)

    // Roof group definition
    const garageRoofGroup = new THREE.Group()
    const garageRoofMaterials: THREE.MeshStandardMaterial[] = []

    // Ceiling utility lights
    const lightX = [1, 3, 5, 7, 9]
    const lightZ = [1, 3, 5, 7, 9, 11]
    for (const lz of lightZ) {
        for (const lx of lightX) {
            const housing = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.07, 0.16),
                new THREE.MeshStandardMaterial({ color: 0xaab3c7, roughness: 0.5, metalness: 0.4 }))
            housing.position.set(lx, config.WALL_H - 0.14, lz)
            garageRoofGroup.add(housing)
            const tube = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.025, 0.065),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe8f6ff, emissiveIntensity: 2.2, roughness: 0.1 }))
            tube.position.set(lx, config.WALL_H - 0.18, lz)
            garageRoofGroup.add(tube)
            // Remove mass PointLights entirely and replace them with a large area light or a few directional fill lights instead for massive FPS gains
        }
    }
    // Optimization: Add ambient PointLights that illuminate walls brightly when the roof blocks the sunlight
    // Playground aydınlık düzenlemesi: Garaj kapalıyken bile zifiri karanlık olmaması için ışık gücü çok artırıldı.
    const fill1 = new THREE.PointLight(0xfff8ee, 20.0, 50)
    fill1.position.set(config.GRID_CENTER_X, config.WALL_H - 0.5, config.GARAGE_DEPTH / 3)
    g.add(fill1)

    const fill2 = new THREE.PointLight(0xfff8ee, 20.0, 50)
    fill2.position.set(config.GRID_CENTER_X, config.WALL_H - 0.5, (config.GARAGE_DEPTH / 3) * 2)
    g.add(fill2)

    // ═══════════════════════════════════════════
    // ENDÜSTRİYEL DETAYLAR — Beton derzler, borular, ızgaralar
    // ═══════════════════════════════════════════

    // Beton panel derzleri — iç duvarlar (yatay)
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x3d4460, roughness: 0.9 })
    // Arka duvar iç derzler
    for (let jy = 0.5; jy < config.WALL_H; jy += 1.5) {
        const joint = new THREE.Mesh(new THREE.BoxGeometry(garageW - 0.5, 0.008, 0.005), jointMat)
        joint.position.set(config.GRID_CENTER_X, jy, -0.53)
        g.add(joint)
    }
    // Sol duvar iç derzler
    for (let jy = 0.5; jy < config.WALL_H; jy += 1.5) {
        const joint = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, sideDepth - 1), jointMat)
        joint.position.set(-0.56, jy, midZ)
        g.add(joint)
    }
    // Sağ duvar iç derzler
    for (let jy = 0.5; jy < config.WALL_H; jy += 1.5) {
        const joint = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, sideDepth - 1), jointMat)
        joint.position.set(config.GRID_W - 0.42, jy, midZ)
        g.add(joint)
    }
    // Dikey derzler (arka duvar)
    for (let jx = -3; jx <= 3; jx += 1.5) {
        const vJoint = new THREE.Mesh(new THREE.BoxGeometry(0.005, config.WALL_H - 0.3, 0.005), jointMat)
        vJoint.position.set(config.GRID_CENTER_X + jx, config.WALL_H / 2, -0.53)
        g.add(vJoint)
    }

    // Tavan boruları (havalandırma kanalı)
    const ductMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.3, metalness: 0.7 })
    // Ana kanal 1 (boydan boya)
    const duct1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, sideDepth - 1, 10), ductMat)
    duct1.rotation.x = Math.PI / 2
    duct1.position.set(2, config.WALL_H - 0.08, midZ)
    g.add(duct1)
    // Ana kanal 2
    const duct2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, sideDepth - 1, 10), ductMat)
    duct2.rotation.x = Math.PI / 2
    duct2.position.set(config.GRID_W - 2, config.WALL_H - 0.10, midZ)
    g.add(duct2)
    // Dirsek bağlantı (çapraz)
    const ductElbow = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.0, 8), ductMat)
    ductElbow.rotation.z = Math.PI / 2
    ductElbow.position.set(config.GRID_CENTER_X, config.WALL_H - 0.12, 3)
    g.add(ductElbow)

    // Havalandırma ızgarası (arka duvar üst)
    const ventGrateMat = new THREE.MeshStandardMaterial({ color: 0x5a6070, roughness: 0.4, metalness: 0.5 })
    const ventFrame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.04), ventGrateMat)
    ventFrame.position.set(config.GRID_CENTER_X + 3.5, config.WALL_H - 0.5, -0.53)
    g.add(ventFrame)
    for (let vi = 0; vi < 5; vi++) {
        const vSlat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.03), ventGrateMat)
        vSlat.position.set(config.GRID_CENTER_X + 3.5, config.WALL_H - 0.72 + vi * 0.1, -0.52)
        g.add(vSlat)
    }

    // Duvar alt etek çizgisi (korunma bandı)
    const skirting = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5, metalness: 0.3 })
    // Arka duvar
    const skirtBack = new THREE.Mesh(new THREE.BoxGeometry(garageW - 0.3, 0.15, 0.03), skirting)
    skirtBack.position.set(config.GRID_CENTER_X, 0.075, -0.54)
    g.add(skirtBack)
    // Sol duvar
    const skirtLeft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, sideDepth - 1), skirting)
    skirtLeft.position.set(-0.55, 0.075, midZ)
    g.add(skirtLeft)
    // Sağ duvar
    const skirtRight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, sideDepth - 1), skirting)
    skirtRight.position.set(config.GRID_W - 0.41, 0.075, midZ)
    g.add(skirtRight)

    // Zemin "ıslak" reflektif noktalar (epoksi parlaklık)
    const wetSpotMat = new THREE.MeshStandardMaterial({
        color: 0x555566, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.3
    })
    const wetSpots: [number, number, number][] = [[4, 5, 0.4], [8, 3, 0.3], [6, 8, 0.35]]
    wetSpots.forEach(([wx, wz, wr]) => {
        const wet = new THREE.Mesh(new THREE.CircleGeometry(wr, 16), wetSpotMat)
        wet.rotation.x = -Math.PI / 2; wet.position.set(wx, 0.008, wz)
        g.add(wet)
    })

    // ═══════════════════════════════════════════
    // WORKSHOP DETAILS — Rich interior props
    // ═══════════════════════════════════════════
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x6d5243, roughness: 0.75, metalness: 0.08 })
    const metalShelfMat = new THREE.MeshStandardMaterial({ color: 0x6a7080, roughness: 0.4, metalness: 0.6 })
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1d1f28, roughness: 0.95 })

    // ── SOL DUVAR: Metal raf sistemi + üzerindeki objeler ──
    // Metal raf çerçevesi (4 katlı, sol duvar boyunca)
    for (let i = 0; i < 4; i++) {
        // Raf tahtası
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 2.4), metalShelfMat)
        shelf.position.set(-0.44, 0.75 + i * 0.52, 2.2)
        g.add(shelf)
        // Raf destek dikmesi (ön + arka)
        if (i === 0) {
            for (const sz of [1.0, 2.2, 3.4]) {
                const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.3, 0.04), metalShelfMat)
                post.position.set(-0.44, 1.15, sz)
                g.add(post)
            }
        }
    }

    // Raf üstü objeler — 1. kat
    const boxColors = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c]
    const addSmallBox = (x: number, y: number, z: number, w: number, h: number, d: number, color: number) => {
        const box = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.01),
            new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 }))
        box.position.set(x, y, z)
        g.add(box)
    }
    // 1. raf (alt)
    addSmallBox(-0.44, 0.82, 1.3, 0.12, 0.12, 0.18, 0x3498db)
    addSmallBox(-0.44, 0.82, 1.6, 0.14, 0.10, 0.14, 0xe74c3c)
    addSmallBox(-0.44, 0.82, 2.0, 0.10, 0.14, 0.12, 0xf39c12)
    addSmallBox(-0.44, 0.82, 2.5, 0.12, 0.08, 0.20, 0x2ecc71)
    addSmallBox(-0.44, 0.82, 2.9, 0.14, 0.12, 0.14, 0x9b59b6)
    // Teneke kutu (silindir)
    const canMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.3, metalness: 0.7 })
    const can1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 12), canMat)
    can1.position.set(-0.44, 0.84, 3.2); g.add(can1)

    // 2. raf
    addSmallBox(-0.44, 1.34, 1.2, 0.12, 0.16, 0.24, 0x2c3e50)
    addSmallBox(-0.44, 1.34, 1.7, 0.10, 0.10, 0.30, 0xe67e22)
    addSmallBox(-0.44, 1.34, 2.3, 0.14, 0.14, 0.14, 0x1abc9c)
    const can2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12),
        new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.35, metalness: 0.6 }))
    can2.position.set(-0.44, 1.35, 2.8); g.add(can2)
    addSmallBox(-0.44, 1.34, 3.1, 0.12, 0.10, 0.16, 0xe74c3c)

    // 3. raf
    addSmallBox(-0.44, 1.86, 1.4, 0.10, 0.12, 0.20, 0x8e44ad)
    addSmallBox(-0.44, 1.86, 1.9, 0.14, 0.08, 0.14, 0x3498db)
    addSmallBox(-0.44, 1.86, 2.5, 0.12, 0.12, 0.16, 0xf39c12)
    const spray = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0xff5722, roughness: 0.4, metalness: 0.5 }))
    spray.position.set(-0.44, 1.87, 3.0); g.add(spray)

    // 4. raf (üst)
    addSmallBox(-0.44, 2.38, 1.6, 0.14, 0.14, 0.22, 0x2c3e50)
    addSmallBox(-0.44, 2.38, 2.2, 0.10, 0.10, 0.16, 0xe74c3c)
    addSmallBox(-0.44, 2.38, 2.8, 0.12, 0.12, 0.18, 0x1abc9c)

    // ── SOL DUVAR: Lastik yığınları ──
    for (let i = 0; i < 5; i++) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.12, 16, 34), tireMat)
        tire.rotation.x = Math.PI / 2
        tire.position.set(-0.35, 0.24 + i * 0.22, 5.2)
        g.add(tire)
    }
    // İkinci lastik yığını (daha küçük)
    for (let i = 0; i < 3; i++) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.10, 16, 30), tireMat)
        tire.rotation.x = Math.PI / 2
        tire.position.set(-0.35, 0.20 + i * 0.20, 6.2)
        g.add(tire)
    }

    // ── ARKA DUVAR: Alet askısı (Pegboard) ──
    const pegboardMat = new THREE.MeshStandardMaterial({ color: 0x8d7e6e, roughness: 0.8, metalness: 0.05 })
    const pegboard = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.6, 0.06), pegboardMat)
    pegboard.position.set(config.GRID_CENTER_X - 1.5, 1.8, -0.52)
    g.add(pegboard)
    // Pegboard delik deseni (küçük silindir delikleri)
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x5a4d40, roughness: 0.9 })
    for (let hx = -1.2; hx <= 1.2; hx += 0.3) {
        for (let hy = -0.6; hy <= 0.6; hy += 0.3) {
            const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 6), holeMat)
            hole.rotation.x = Math.PI / 2
            hole.position.set(config.GRID_CENTER_X - 1.5 + hx, 1.8 + hy, -0.50)
            g.add(hole)
        }
    }
    // Alet siluetleri — İngiliz anahtarı
    const toolMat = new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.3, metalness: 0.8 })
    const wrench1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.50, 0.02), toolMat)
    wrench1.position.set(config.GRID_CENTER_X - 2.2, 1.9, -0.48); wrench1.rotation.z = 0.1; g.add(wrench1)
    const wrenchHead = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.02), toolMat)
    wrenchHead.position.set(config.GRID_CENTER_X - 2.18, 2.14, -0.48); g.add(wrenchHead)
    // Çekiç
    const hammerHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.40, 0.02), shelfMat)
    hammerHandle.position.set(config.GRID_CENTER_X - 1.8, 1.85, -0.48); g.add(hammerHandle)
    const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), toolMat)
    hammerHead.position.set(config.GRID_CENTER_X - 1.8, 2.05, -0.48); g.add(hammerHead)
    // Tornavida
    const screwHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8),
        new THREE.MeshStandardMaterial({ color: 0xff9800, roughness: 0.5 }))
    screwHandle.position.set(config.GRID_CENTER_X - 1.4, 1.6, -0.48); g.add(screwHandle)
    const screwShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 6), toolMat)
    screwShaft.position.set(config.GRID_CENTER_X - 1.4, 1.86, -0.48); g.add(screwShaft)
    // Pense
    const plierL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 0.02), toolMat)
    plierL.position.set(config.GRID_CENTER_X - 1.0, 1.85, -0.48); plierL.rotation.z = 0.05; g.add(plierL)
    const plierR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 0.02), toolMat)
    plierR.position.set(config.GRID_CENTER_X - 0.94, 1.85, -0.48); plierR.rotation.z = -0.05; g.add(plierR)
    // Bant / Ölçüm aleti
    const tapeMeasure = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12),
        new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.4, metalness: 0.3 }))
    tapeMeasure.rotation.x = Math.PI / 2
    tapeMeasure.position.set(config.GRID_CENTER_X - 0.6, 1.65, -0.48); g.add(tapeMeasure)

    // ── SAĞ DUVAR: Tezgah (genişletilmiş) + üstü ──
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.55, metalness: 0.4 })
    const benchTopMat = new THREE.MeshStandardMaterial({ color: 0x6d5843, roughness: 0.7, metalness: 0.05 })
    // Tezgah gövdesi
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.82, 2.8), benchMat)
    bench.position.set(config.GRID_W - 0.52, 0.41, 2.4)
    g.add(bench)
    // Tezgah üstü (ahşap)
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.04, 2.9), benchTopMat)
    benchTop.position.set(config.GRID_W - 0.48, 0.84, 2.4)
    g.add(benchTop)
    // Tezgah ayakları
    for (const az of [1.0, 2.4, 3.8]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.82, 0.04), benchMat)
        leg.position.set(config.GRID_W - 0.60, 0.41, az)
        g.add(leg)
    }
    // Mengene (tezgah üstü)
    const viseMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.3, metalness: 0.8 })
    const viseBase = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.08, 0.12, 2, 0.01), viseMat)
    viseBase.position.set(config.GRID_W - 0.48, 0.90, 1.2); g.add(viseBase)
    const viseJaw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.12), viseMat)
    viseJaw.position.set(config.GRID_W - 0.48, 0.98, 1.2); g.add(viseJaw)
    const viseHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 6), viseMat)
    viseHandle.rotation.z = Math.PI / 2
    viseHandle.position.set(config.GRID_W - 0.40, 0.96, 1.2); g.add(viseHandle)

    // Tezgah üstü alet kutusu (kırmızı)
    const toolCabinet = new THREE.Mesh(
        new RoundedBoxGeometry(0.22, 0.18, 0.30, 3, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xcf3a3a, roughness: 0.35, metalness: 0.5 })
    )
    toolCabinet.position.set(config.GRID_W - 0.48, 0.95, 2.0)
    g.add(toolCabinet)

    // Tezgah üstü küçük objeler
    addSmallBox(config.GRID_W - 0.48, 0.90, 2.6, 0.08, 0.08, 0.12, 0x3498db)
    addSmallBox(config.GRID_W - 0.48, 0.90, 3.0, 0.10, 0.06, 0.10, 0xf39c12)
    const oilCan = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 10),
        new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.4, metalness: 0.5 }))
    oilCan.position.set(config.GRID_W - 0.48, 0.92, 3.4); g.add(oilCan)

    // Tezgah lambası (gooseneck)
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.3, metalness: 0.8 })
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 12), lampPoleMat)
    lampBase.position.set(config.GRID_W - 0.48, 0.88, 3.6); g.add(lampBase)
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8), lampPoleMat)
    lampPole.position.set(config.GRID_W - 0.48, 1.15, 3.6); g.add(lampPole)
    const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.30, 8), lampPoleMat)
    lampArm.rotation.z = -Math.PI / 4
    lampArm.position.set(config.GRID_W - 0.55, 1.45, 3.6); g.add(lampArm)
    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.08, 12),
        new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5, metalness: 0.3 }))
    lampShade.rotation.x = Math.PI
    lampShade.position.set(config.GRID_W - 0.62, 1.52, 3.6); g.add(lampShade)
    const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xfff176, emissiveIntensity: 3.0 }))
    lampBulb.position.set(config.GRID_W - 0.62, 1.48, 3.6); g.add(lampBulb)
    const deskLight = new THREE.PointLight(0xfff4e0, 6, 4)
    deskLight.position.set(config.GRID_W - 0.62, 1.46, 3.6); g.add(deskLight)

    // ── SAĞ DUVAR: Büyük kırmızı alet dolabı (zemin) ──
    const bigCabinet = new THREE.Mesh(
        new RoundedBoxGeometry(0.48, 1.0, 0.55, 4, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.35, metalness: 0.5 })
    )
    bigCabinet.position.set(config.GRID_W - 0.65, 0.50, 4.8)
    g.add(bigCabinet)
    const csCabinet = new THREE.Mesh(new THREE.CircleGeometry(0.4, 12),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }))
    csCabinet.rotation.x = -Math.PI / 2; csCabinet.scale.set(1, 1.3, 1)
    csCabinet.position.set(config.GRID_W - 0.65, 0.005, 4.8); g.add(csCabinet)
    // Çekmece çizgileri
    for (let di = 0; di < 4; di++) {
        const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.015, 0.50),
            new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.4, metalness: 0.6 }))
        drawer.position.set(config.GRID_W - 0.65, 0.20 + di * 0.22, 4.8)
        g.add(drawer)
        // Çekmece kolu
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.03), toolMat)
        handle.position.set(config.GRID_W - 0.40, 0.26 + di * 0.22, 4.8)
        g.add(handle)
    }

    // ── SAĞ DUVAR: Lastik yığını ──
    for (let i = 0; i < 3; i++) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.11, 16, 32), tireMat)
        tire.rotation.x = Math.PI / 2
        tire.position.set(config.GRID_W - 0.45, 0.22 + i * 0.22, 6.0)
        g.add(tire)
    }

    // ── VARILLER (arka sağ köşe) ──
    const barrelMat1 = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.5, metalness: 0.4 })
    const barrelMat2 = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5, metalness: 0.4 })
    const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.70, 16), barrelMat1)
    barrel1.position.set(config.GRID_W - 0.60, 0.35, 0.4); g.add(barrel1)
    // Varil contact shadows
    const csBarrel1 = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }))
    csBarrel1.rotation.x = -Math.PI / 2; csBarrel1.position.set(config.GRID_W - 0.60, 0.005, 0.4); g.add(csBarrel1)
    const barrelRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.015, 8, 24), toolMat)
    barrelRing1.rotation.x = Math.PI / 2
    barrelRing1.position.set(config.GRID_W - 0.60, 0.55, 0.4); g.add(barrelRing1)
    const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.65, 16), barrelMat2)
    barrel2.position.set(config.GRID_W - 1.10, 0.33, 0.3); g.add(barrel2)
    const csBarrel2 = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }))
    csBarrel2.rotation.x = -Math.PI / 2; csBarrel2.position.set(config.GRID_W - 1.10, 0.005, 0.3); g.add(csBarrel2)
    const barrelRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.015, 8, 24), toolMat)
    barrelRing2.rotation.x = Math.PI / 2
    barrelRing2.position.set(config.GRID_W - 1.10, 0.50, 0.3); g.add(barrelRing2)

    // ── ZEMİN DETAYLARI ──
    // Yağ lekesi (transparan daire)
    const oilStain = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.4 }))
    oilStain.rotation.x = -Math.PI / 2
    oilStain.position.set(3, 0.01, 4); g.add(oilStain)
    const oilStain2 = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.3 }))
    oilStain2.rotation.x = -Math.PI / 2
    oilStain2.position.set(7, 0.01, 2); g.add(oilStain2)

    // Zemin kablo kanalı (uzun ince kanal)
    const cableChannelMat = new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.4, metalness: 0.3 })
    const cableChannel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 5.0), cableChannelMat)
    cableChannel.position.set(2, 0.015, 4); g.add(cableChannel)

    // ── DUVAR LEVHALARI ──
    // Uyarı levhası — Yüksek Voltaj (arka duvar)
    const signBackMat = new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.5 })
    const signBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.02), signBackMat)
    signBack.position.set(config.GRID_CENTER_X + 2.5, 2.2, -0.52); g.add(signBack)
    const signBorder = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.31, 0.025),
        new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5 }))
    signBorder.position.set(config.GRID_CENTER_X + 2.5, 2.2, -0.51); g.add(signBorder)
    const signInner = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.23, 0.03), signBackMat)
    signInner.position.set(config.GRID_CENTER_X + 2.5, 2.2, -0.50); g.add(signInner)
    // Üçgen uyarı sembolü
    const triangleShape = new THREE.Shape()
    triangleShape.moveTo(0, 0.08); triangleShape.lineTo(0.07, -0.04); triangleShape.lineTo(-0.07, -0.04); triangleShape.lineTo(0, 0.08)
    const triangleGeo = new THREE.ExtrudeGeometry(triangleShape, { depth: 0.005, bevelEnabled: false })
    const triangle = new THREE.Mesh(triangleGeo, new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5 }))
    triangle.position.set(config.GRID_CENTER_X + 2.5, 2.2, -0.49); g.add(triangle)

    // Safety poster (sol duvar üst)
    const posterMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
    const poster = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.40, 0.30), posterMat)
    poster.position.set(-0.56, 2.3, 8.0); g.add(poster)
    const posterStripe = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.30),
        new THREE.MeshStandardMaterial({ color: 0x2196f3, roughness: 0.5 }))
    posterStripe.position.set(-0.56, 2.42, 8.0); g.add(posterStripe)

    // ── EK ATMOSFER: Kova ──
    const bucketMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.5, metalness: 0.4 })
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.25, 12), bucketMat)
    bucket.position.set(1, 0.13, 0.5); g.add(bucket)
    const bucketHandle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 16, Math.PI), toolMat)
    bucketHandle.position.set(1, 0.28, 0.5); g.add(bucketHandle)

    // ── TAVAN LAMBALARINA LOKAL IŞIK ──
    // Her 3. lambaya sıcak PointLight ekle
    let lightIdx = 0
    for (const lz of lightZ) {
        for (const lx of lightX) {
            if (lightIdx % 3 === 0) {
                const localLight = new THREE.PointLight(0xfff4e0, 6, 5)
                localLight.position.set(lx, config.WALL_H - 0.3, lz)
                g.add(localLight)
            }
            lightIdx++
        }
    }

    // ── FILL LIGHT İYİLEŞTİRME — Sıcak ton, düşük intensity ──
    // (Mevcut fill1/fill2 intensity'yi 20'ye düşür, rengi sıcak yap)

    // Roof meshes

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x5e667c, roughness: 0.48, metalness: 0.55 })
    garageRoofMaterials.push(roofMat)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(garageW + 0.8, 0.22, sideDepth + 0.26), roofMat)
    roof.position.set(config.GRID_CENTER_X, config.WALL_H + 0.36, midZ)
    // Çatının güneşi tamamen engelleyip garajı kapkaranlık bırakmaması için castShadow false yapıldı.
    roof.castShadow = false
    roof.receiveShadow = true
    garageRoofGroup.add(roof)

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x8088a0, roughness: 0.35, metalness: 0.68 })
    garageRoofMaterials.push(trussMat)
    for (let i = 0; i < 5; i++) {
        const z = 0.8 + i * 1.6
        const truss = new THREE.Mesh(new THREE.BoxGeometry(garageW + 0.2, 0.08, 0.08), trussMat)
        truss.position.set(config.GRID_CENTER_X, config.WALL_H + 0.22, z)
        garageRoofGroup.add(truss)
    }

    const skylightMat = new THREE.MeshStandardMaterial({ color: 0xb3e5fc, emissive: 0x80deea, emissiveIntensity: 0.5, transparent: true, opacity: 0.88, roughness: 0.08, metalness: 0.15 })
    garageRoofMaterials.push(skylightMat)
    for (const x of [config.GRID_CENTER_X - 1.8, config.GRID_CENTER_X, config.GRID_CENTER_X + 1.8]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, sideDepth - 1.2), skylightMat)
        panel.position.set(x, config.WALL_H + 0.29, midZ)
        garageRoofGroup.add(panel)
    }

    g.add(garageRoofGroup)

    // ═══ DIŞ CEPHE DETAYLARI ═══

    // Arka dış duvar — Klima üniteleri
    const acBodyMat = new THREE.MeshStandardMaterial({ color: 0xd0d4d8, roughness: 0.5, metalness: 0.4 })
    const acGrateMat = new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: 0.3, metalness: 0.6 })
    const acPositions: [number, number][] = [
        [config.GRID_CENTER_X - 2.5, 2.8],
        [config.GRID_CENTER_X + 1.8, 2.0],
    ]
    acPositions.forEach(([ax, ay]) => {
        const acBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.30), acBodyMat)
        acBody.position.set(ax, ay, -0.85)
        g.add(acBody)
        // Izgara şeritleri
        for (let gi = 0; gi < 4; gi++) {
            const grate = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.22), acGrateMat)
            grate.position.set(ax, ay - 0.18 + gi * 0.12, -0.72)
            g.add(grate)
        }
        // Bağlantı borusu (bakır)
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6),
            new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.3, metalness: 0.8 }))
        pipe.rotation.z = Math.PI / 2
        pipe.position.set(ax + 0.5, ay - 0.15, -0.82)
        g.add(pipe)
    })

    // Elektrik panosu (sağ dış yan duvar)
    const panelMat = new THREE.MeshStandardMaterial({ color: 0xe0e4ec, roughness: 0.4, metalness: 0.3 })
    const elPanel = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.10), panelMat)
    elPanel.position.set(config.GRID_W - 0.15, 1.4, 1.5)
    g.add(elPanel)
    // Panel kapağı mandal
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9 }))
    latch.position.set(config.GRID_W - 0.12, 1.55, 1.5)
    g.add(latch)
    // Uyarı çıkartması (sarı-siyah)
    const warn = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xffc107, emissiveIntensity: 0.4 }))
    warn.position.set(config.GRID_W - 0.14, 1.25, 1.5)
    g.add(warn)

    // Drenaj olukları (back wall alt kısmı)
    const drainMat = new THREE.MeshStandardMaterial({ color: 0x4a4f5e, roughness: 0.6, metalness: 0.5 })
    for (let dx = 0; dx < 3; dx++) {
        const drain = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), drainMat)
        drain.position.set(config.GRID_CENTER_X - 2 + dx * 2, 0.04, -1.0)
        g.add(drain)
    }

    // Güvenlik lambası (arka sol köşe)
    const secLampMat = new THREE.MeshStandardMaterial({ color: 0xfff176, emissive: 0xffeb3b, emissiveIntensity: 1.8 })
    const secLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), secLampMat)
    secLamp.position.set(-0.55, config.WALL_H - 0.6, -0.55)
    g.add(secLamp)
    const lampHousing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 }))
    lampHousing.position.set(-0.55, config.WALL_H - 0.6, -0.48)
    g.add(lampHousing)

    // Kablo kanalı (arka duvar üst hattı)
    const conduit = new THREE.Mesh(new THREE.BoxGeometry(garageW - 0.5, 0.06, 0.07),
        new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.25, metalness: 0.75 }))
    conduit.position.set(config.GRID_CENTER_X, config.WALL_H - 0.35, -0.53)
    g.add(conduit)

    // Çatı kenar profili (sac görünümü)
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.20, metalness: 0.80 })
    const frontEdge = new THREE.Mesh(new THREE.BoxGeometry(garageW + 0.85, 0.10, 0.12), edgeMat)
    frontEdge.position.set(config.GRID_CENTER_X, config.WALL_H + 0.45, config.DOOR_ROW - 0.38)
    g.add(frontEdge)
    const backEdge = frontEdge.clone()
    backEdge.position.z = -0.72
    g.add(backEdge)

    // ═══ DIŞ CEPHE — Tuğla doku + Tabela + Yağmur oluğu + Aydınlatma ═══

    // Tuğla doku efekti — sol dış duvar yatay çizgiler
    const brickLineMat = new THREE.MeshStandardMaterial({ color: 0x3d4460, roughness: 0.8 })
    for (let by = 0.2; by < config.WALL_H; by += 0.2) {
        const brickLine = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, sideDepth - 0.5), brickLineMat)
        brickLine.position.set(-0.87, by, midZ)
        g.add(brickLine)
    }
    // Tuğla doku — arka dış duvar
    for (let by = 0.2; by < config.WALL_H; by += 0.2) {
        const brickLine = new THREE.Mesh(new THREE.BoxGeometry(garageW + 0.4, 0.005, 0.005), brickLineMat)
        brickLine.position.set(config.GRID_CENTER_X, by, -0.86)
        g.add(brickLine)
    }
    // Tuğla dikey derzler (her 0.4'te)
    for (let bx = -garageW / 2 + 0.4; bx < garageW / 2; bx += 0.4) {
        const vertJoint = new THREE.Mesh(new THREE.BoxGeometry(0.005, config.WALL_H, 0.005), brickLineMat)
        vertJoint.position.set(config.GRID_CENTER_X + bx, config.WALL_H / 2, -0.86)
        g.add(vertJoint)
    }

    // Garaj tabelası — kapının üstüne
    const signPlateMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.3, metalness: 0.6, emissive: 0x1565c0, emissiveIntensity: 0.3 })
    const signPlate = new THREE.Mesh(new RoundedBoxGeometry(2.5, 0.45, 0.06, 3, 0.04), signPlateMat)
    signPlate.position.set(config.GRID_CENTER_X, config.WALL_H + 0.1, config.DOOR_ROW - 0.30)
    g.add(signPlate)
    // Tabela arka plan çerçevesi
    const signFrame = new THREE.Mesh(new RoundedBoxGeometry(2.7, 0.55, 0.04, 3, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: 0.4, metalness: 0.7 }))
    signFrame.position.set(config.GRID_CENTER_X, config.WALL_H + 0.1, config.DOOR_ROW - 0.32)
    g.add(signFrame)

    // Yağmur olukları — sol ve sağ köşelerden çatıdan zemine
    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.25, metalness: 0.8 })
    for (const gx of [-0.80, config.GRID_W - 0.20]) {
        // Dikey boru
        const gutter = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, config.WALL_H + 0.3, 8), gutterMat)
        gutter.position.set(gx, (config.WALL_H + 0.3) / 2, -0.80)
        g.add(gutter)
        // Alt dirsek
        const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.15, 8), gutterMat)
        elbow.rotation.x = Math.PI / 4
        elbow.position.set(gx, 0.08, -0.88)
        g.add(elbow)
    }

    // Dış aydınlatma — kapının iki yanına duvar lambası
    const wallLampMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.3, metalness: 0.8 })
    const wallLampGlowMat = new THREE.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xffe082, emissiveIntensity: 2.5 })
    for (const lmpX of [-0.45, config.GRID_W - 0.55]) {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.12), wallLampMat)
        bracket.position.set(lmpX, config.WALL_H - 0.4, config.DOOR_ROW - 0.36)
        g.add(bracket)
        const lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), wallLampGlowMat)
        lampGlass.position.set(lmpX, config.WALL_H - 0.25, config.DOOR_ROW - 0.36)
        g.add(lampGlass)
        const extLight = new THREE.PointLight(0xfff4e0, 3, 6)
        extLight.position.set(lmpX, config.WALL_H - 0.2, config.DOOR_ROW - 0.20)
        g.add(extLight)
    }

    return { garageGroup, garageRoofGroup, garageRoofMaterials }
}
