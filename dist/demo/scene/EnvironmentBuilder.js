import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
export function createSkyGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0a0e1a'); // dark top
    grad.addColorStop(0.2, '#1a2a4a'); // deep blue
    grad.addColorStop(0.4, '#2d4a7a'); // mid blue
    grad.addColorStop(0.6, '#4a7ab0'); // lighter blue
    grad.addColorStop(0.75, '#6aaad8'); // sky blue
    grad.addColorStop(0.85, '#f0c870'); // golden horizon
    grad.addColorStop(0.95, '#e8a050'); // warm horizon
    grad.addColorStop(1, '#c87040'); // ground glow
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
}
export function createOutdoorScene(scene, config) {
    // === Physically-inspired sky & sun ===
    const sky = new Sky();
    sky.scale.setScalar(480);
    sky.position.set(config.GRID_CENTER_X, 0, config.DOOR_ROW + 10);
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 2.6;
    skyUniforms['rayleigh'].value = 2.4;
    skyUniforms['mieCoefficient'].value = 0.00045;
    skyUniforms['mieDirectionalG'].value = 0.79;
    const sunDir = new THREE.Vector3();
    const elevation = 12;
    const azimuth = 170;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    sunDir.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sunDir);
    sky.material.depthWrite = false;
    scene.add(sky);
    const outdoorSun = new THREE.DirectionalLight(0xfff3d2, 0.36);
    outdoorSun.position.copy(sunDir).multiplyScalar(170);
    outdoorSun.target.position.set(config.GRID_CENTER_X, 0.4, config.DOOR_ROW + 2);
    // Disable costly shadows for the outdoor sun unless necessary, to improve performance
    outdoorSun.castShadow = false;
    scene.add(outdoorSun);
    scene.add(outdoorSun.target);
    // === Clouds ===
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
    const cloudPositions = [
        [-10, 18, 20, 3], [15, 20, 25, 2.5], [5, 22, 30, 4], [-8, 16, 35, 2],
        [25, 19, 22, 3.5], [0, 21, 40, 3], [12, 17, 15, 2.8]
    ];
    cloudPositions.forEach(([cx, cy, cz, cs]) => {
        const cloud = new THREE.Group();
        for (let i = 0; i < 5; i++) {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(cs * (0.5 + Math.random() * 0.5), 8, 6), cloudMat);
            puff.position.set(i * cs * 0.6 - cs, Math.random() * cs * 0.3, Math.random() * cs * 0.3);
            puff.scale.y = 0.4;
            cloud.add(puff);
        }
        cloud.position.set(cx, cy, cz);
        scene.add(cloud);
    });
    // === Ground ===
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x4f7f45, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(config.GRID_CENTER_X, -0.08, 70);
    ground.receiveShadow = true;
    scene.add(ground);
    const nearGroundBlend = new THREE.Mesh(new THREE.PlaneGeometry(30, 24), new THREE.MeshStandardMaterial({ color: 0x5a864d, roughness: 0.88 }));
    nearGroundBlend.rotation.x = -Math.PI / 2;
    nearGroundBlend.position.set(config.GRID_CENTER_X, -0.06, 10);
    nearGroundBlend.receiveShadow = true;
    scene.add(nearGroundBlend);
    // === Outdoor grid tiles (from door to beyond charging station) ===
    const outdoorTileMat = new THREE.MeshStandardMaterial({ color: 0x5a6a5a, roughness: 0.82, metalness: 0.05 });
    const outdoorEdgeMat = new THREE.LineBasicMaterial({ color: 0x7a8a70, transparent: true, opacity: 0.5 });
    for (let x = 0; x < config.GRID_W; x++) {
        for (let z = config.DOOR_ROW; z < config.GRID_H; z++) {
            const tile = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.04, 0.96), outdoorTileMat);
            tile.position.set(x, -0.02, z);
            tile.receiveShadow = true;
            scene.add(tile);
            const edges = new THREE.LineSegments(new THREE.EdgesGeometry(tile.geometry), outdoorEdgeMat);
            edges.position.copy(tile.position);
            scene.add(edges);
        }
    }
    // === Road markings on each side of the grid path ===
    for (let z = config.DOOR_ROW; z < config.GRID_H; z++) {
        // Left edge marker
        const lm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0xFFD600, emissive: 0xFFD600, emissiveIntensity: 0.3, roughness: 0.4 }));
        lm.position.set(-0.5, 0.02, z);
        scene.add(lm);
        // Right edge marker
        const rm = lm.clone();
        rm.position.x = config.GRID_W - 0.5;
        scene.add(rm);
    }
    // === Sidewalks ===
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.8 });
    const lSW = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 70), sidewalkMat);
    lSW.position.set(-1.3, 0.03, 35);
    lSW.receiveShadow = true;
    scene.add(lSW);
    const rSW = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 70), sidewalkMat);
    rSW.position.set(config.GRID_W + 0.3, 0.03, 35);
    rSW.receiveShadow = true;
    scene.add(rSW);
    // === Trees (varied shapes) ===
    const treeData = [
        [-2.5, 8, 1.2], [config.GRID_W + 1.5, 8, 1.0], [-3, 14, 1.4], [config.GRID_W + 2, 13, 0.9],
        [-2, 20, 1.1], [config.GRID_W + 1.5, 19, 1.3], [-3.5, 26, 1.0], [config.GRID_W + 2.5, 25, 1.2]
    ];
    treeData.forEach(([tx, tz, s]) => {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.14 * s, 1.8 * s, 8), new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 }));
        trunk.position.set(tx, 0.9 * s, tz);
        // trunk.castShadow = true // Optimization: remove shadows for distant objects
        scene.add(trunk);
        // Spherical leaves (more realistic)
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.7 * s, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 }));
        leaves.position.set(tx, 2.2 * s, tz);
        // leaves.castShadow = true
        scene.add(leaves);
        // Second leaf cluster
        const l2 = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 8, 6), new THREE.MeshStandardMaterial({ color: 0x388E3C, roughness: 0.85 }));
        l2.position.set(tx + 0.3 * s, 2.5 * s, tz - 0.2 * s);
        // l2.castShadow = true
        scene.add(l2);
    });
    // === Street lamps (modern design) ===
    const lampPos = [[-1.5, 7], [config.GRID_W + 0.5, 7], [-1.5, 13], [config.GRID_W + 0.5, 13], [-1.5, 19], [config.GRID_W + 0.5, 19]];
    lampPos.forEach(([lx, lz]) => {
        // Pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 3.5, 8), new THREE.MeshStandardMaterial({ color: 0x37474F, roughness: 0.3, metalness: 0.7 }));
        pole.position.set(lx, 1.75, lz);
        scene.add(pole);
        // Curved arm
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0x37474F, roughness: 0.3, metalness: 0.7 }));
        arm.position.set(lx + (lx < config.GRID_CENTER_X ? 0.4 : -0.4), 3.45, lz);
        scene.add(arm);
        // Light fixture
        const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3e0, emissiveIntensity: 1.2 }));
        fixture.position.set(lx + (lx < config.GRID_CENTER_X ? 0.8 : -0.8), 3.42, lz);
        scene.add(fixture);
        // Optimization: avoid casting shadows inside multiple point lights
        const lt = new THREE.PointLight(0xfff3e0, 0.3, 10);
        lt.position.set(lx + (lx < config.GRID_CENTER_X ? 0.8 : -0.8), 3.35, lz);
        scene.add(lt);
    });
    // === City skyline (background) ===
    const buildMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.85, metalness: 0.1 });
    const builds = [
        [-10, 5, 3, 35], [-5, 8, 2.5, 38], [config.GRID_W + 6, 6, 3, 35], [config.GRID_W + 10, 9, 2, 40],
        [config.GRID_W + 14, 4, 2.5, 33], [-8, 7, 2, 37], [config.GRID_W + 8, 5, 2.5, 36], [config.GRID_W + 12, 7, 3, 39]
    ];
    builds.forEach(([bx, bh, bw, bz]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), buildMat);
        b.position.set(bx, bh / 2, bz);
        scene.add(b);
        const winMat = new THREE.MeshStandardMaterial({ color: 0xFFF9C4, emissive: 0xFFE082, emissiveIntensity: 0.6 });
        for (let wy = 1; wy < bh - 0.5; wy += 1.2) {
            for (let wx = -bw / 3; wx <= bw / 3; wx += bw / 3) {
                if (Math.random() > 0.35) {
                    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.3), winMat);
                    w.position.set(bx + wx, wy, bz - bw / 2 - 0.01);
                    scene.add(w);
                }
            }
        }
    });
    // === Park benches ===
    const benchPos = [[-1.5, 10], [config.GRID_W + 0.5, 16]];
    benchPos.forEach(([bx, bz]) => {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.35), new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 }));
        seat.position.set(bx, 0.35, bz);
        scene.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.04), new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 }));
        back.position.set(bx, 0.5, bz - 0.15);
        scene.add(back);
        // Legs
        const legMat = new THREE.MeshStandardMaterial({ color: 0x37474F, roughness: 0.4, metalness: 0.5 });
        const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8);
        for (const lx of [-0.3, 0.3]) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(bx + lx, 0.175, bz);
            scene.add(leg);
        }
    });
    // === Hemisphere sky light (brightens when door opens) ===
    const skyLightParam = new THREE.HemisphereLight(0x87CEEB, 0x4a7c3f, 0);
    skyLightParam.position.set(0, 10, 0);
    scene.add(skyLightParam);
    return { skyLight: skyLightParam };
}
//# sourceMappingURL=EnvironmentBuilder.js.map