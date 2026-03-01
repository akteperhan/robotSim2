import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export interface GarageConfig {
    GRID_W: number
    GARAGE_DEPTH: number
    GRID_CENTER_X: number
    WALL_H: number
    DOOR_ROW: number
}

export function createGarage(config: GarageConfig) {
    const garageGroup = new THREE.Group()
    const g = garageGroup
    const garageW = config.GRID_W + 0.6
    const sideDepth = config.GARAGE_DEPTH + 2.2
    const midZ = sideDepth / 2 - 0.7

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2f3444, roughness: 0.86, metalness: 0.08 })
    const wallPanelMat = new THREE.MeshStandardMaterial({ color: 0x3b4154, roughness: 0.72, metalness: 0.18 })
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x4a4f5f, roughness: 0.82, metalness: 0.14 })

    // Base slab + perimeter lane
    const slab = new THREE.Mesh(new THREE.BoxGeometry(garageW + 0.7, 0.14, sideDepth + 0.2), floorMat)
    slab.position.set(config.GRID_CENTER_X, -0.11, midZ)
    slab.receiveShadow = true
    g.add(slab)
    const perimeterLane = new THREE.Mesh(
        new THREE.BoxGeometry(garageW + 0.15, 0.04, sideDepth - 0.2),
        new THREE.MeshStandardMaterial({ color: 0x515767, roughness: 0.7, metalness: 0.2 })
    )
    perimeterLane.position.set(config.GRID_CENTER_X, -0.07, midZ)
    perimeterLane.receiveShadow = true
    g.add(perimeterLane)

    // Interior floor tiles
    for (let x = 0; x < config.GRID_W; x++) {
        for (let z = 0; z < config.GARAGE_DEPTH; z++) {
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(0.96, 0.04, 0.96),
                new THREE.MeshStandardMaterial({ color: 0x595f71, roughness: 0.79, metalness: 0.12 })
            )
            tile.position.set(x, -0.02, z)
            tile.receiveShadow = true
            g.add(tile)
            if (x === config.GRID_CENTER_X || x === config.GRID_CENTER_X - 1 || x === config.GRID_CENTER_X + 1) {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(0.16, 0.018, 0.82),
                    new THREE.MeshStandardMaterial({ color: 0x26c6da, emissive: 0x26c6da, emissiveIntensity: 0.25, roughness: 0.35 })
                )
                stripe.position.set(x, 0.006, z)
                g.add(stripe)
            }
        }
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
        new THREE.MeshStandardMaterial({ color: 0x80d8ff, emissive: 0x80d8ff, emissiveIntensity: 0.8, roughness: 0.25 })
    )
    backLightBar.position.set(config.GRID_CENTER_X, config.WALL_H + 0.15, -0.52)
    g.add(backLightBar)

    // Entry portal frame
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x61687d, roughness: 0.35, metalness: 0.7 })
    const topPortal = new THREE.Mesh(new THREE.BoxGeometry(garageW + 0.5, 0.22, 0.18), portalMat)
    topPortal.position.set(config.GRID_CENTER_X, config.WALL_H + 0.16, config.DOOR_ROW - 0.44)
    g.add(topPortal)
    const leftPortal = new THREE.Mesh(new THREE.BoxGeometry(0.2, config.WALL_H + 0.2, 0.16), portalMat)
    leftPortal.position.set(-0.55, (config.WALL_H + 0.2) / 2, config.DOOR_ROW - 0.44)
    g.add(leftPortal)
    const rightPortal = new THREE.Mesh(new THREE.BoxGeometry(0.2, config.WALL_H + 0.2, 0.16), portalMat)
    rightPortal.position.set(config.GRID_W - 0.45, (config.WALL_H + 0.2) / 2, config.DOOR_ROW - 0.44)
    g.add(rightPortal)

    // Ceiling utility lights
    const lightX = [1, 3, 5, 7, 9]
    const lightZ = [1, 3, 5, 7, 9, 11]
    for (const lz of lightZ) {
        for (const lx of lightX) {
            const housing = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.07, 0.16),
                new THREE.MeshStandardMaterial({ color: 0xaab3c7, roughness: 0.5, metalness: 0.4 }))
            housing.position.set(lx, config.WALL_H - 0.14, lz)
            g.add(housing)
            const tube = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.025, 0.065),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe8f6ff, emissiveIntensity: 2.2, roughness: 0.1 }))
            tube.position.set(lx, config.WALL_H - 0.18, lz)
            g.add(tube)
            const pt = new THREE.PointLight(0xdde8ff, 1.2, 8.0)
            pt.position.set(lx, config.WALL_H - 0.26, lz)
            // Remove point light shadows inside to optimize!
            g.add(pt)
        }
    }

    // Workshop details
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7, metalness: 0.1 })
    for (let i = 0; i < 4; i++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 1.6), shelfMat)
        shelf.position.set(-0.43, 0.95 + i * 0.34, 2.0)
        shelf.castShadow = true
        g.add(shelf)
    }
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1d1f28, roughness: 0.95 })
    for (let i = 0; i < 4; i++) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.11, 16, 34), tireMat)
        tire.rotation.x = Math.PI / 2
        tire.position.set(-0.35, 0.22 + i * 0.2, 4.9)
        tire.castShadow = true
        g.add(tire)
    }
    const bench = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.75, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x4f585f, roughness: 0.7, metalness: 0.3 })
    )
    bench.position.set(config.GRID_W - 0.55, 0.53, 2.2)
    bench.castShadow = true
    g.add(bench)
    const toolCabinet = new THREE.Mesh(
        new RoundedBoxGeometry(0.5, 0.9, 0.42, 4, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xcf3a3a, roughness: 0.35, metalness: 0.5 })
    )
    toolCabinet.position.set(config.GRID_W - 0.8, 0.46, 1.3)
    toolCabinet.castShadow = true
    g.add(toolCabinet)

    // Roof
    const garageRoofGroup = new THREE.Group()
    const garageRoofMaterials: THREE.MeshStandardMaterial[] = []

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x5e667c, roughness: 0.48, metalness: 0.55 })
    garageRoofMaterials.push(roofMat)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(garageW + 0.8, 0.22, sideDepth + 0.26), roofMat)
    roof.position.set(config.GRID_CENTER_X, config.WALL_H + 0.36, midZ)
    roof.castShadow = true
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

    return { garageGroup, garageRoofGroup, garageRoofMaterials }
}
