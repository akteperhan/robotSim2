import * as THREE from 'three'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  color: THREE.Color
  size: number
  type?: 'dust'
}

const MAX_PARTICLES = 500

export class ParticleSystem {
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.colors = new Float32Array(MAX_PARTICLES * 3)
    this.sizes = new Float32Array(MAX_PARTICLES)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
    scene.add(this.points)
  }

  /** Emit charging sparks around a position (cyan/white) */
  emitChargeSparks(center: THREE.Vector3, count = 20) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      this.particles.push({
        position: center.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.8
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 2
        ),
        life: 0,
        maxLife: 0.6 + Math.random() * 0.6,
        color: new THREE.Color().setHSL(0.5 + Math.random() * 0.05, 0.9, 0.7 + Math.random() * 0.3),
        size: 0.04 + Math.random() * 0.06
      })
    }
  }

  /** Emit confetti burst (multi-color) */
  emitConfetti(center: THREE.Vector3, count = 40) {
    const confettiColors = [0xff4757, 0xffa502, 0x2ed573, 0x1e90ff, 0xff6b81, 0xffda79, 0x7bed9f]
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 3
      this.particles.push({
        position: center.clone().add(new THREE.Vector3(0, 0.5, 0)),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * 0.6,
          speed + Math.random() * 2,
          Math.sin(angle) * speed * 0.6
        ),
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
        color: new THREE.Color(confettiColors[Math.floor(Math.random() * confettiColors.length)]),
        size: 0.06 + Math.random() * 0.08
      })
    }
  }

  /** Emit movement dust at robot feet */
  emitMoveDust(position: THREE.Vector3, count = 6) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      this.particles.push({
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          0.02,
          (Math.random() - 0.5) * 0.4
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          0.3 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.5
        ),
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        color: new THREE.Color(0.6, 0.55, 0.5),
        size: 0.05 + Math.random() * 0.04
      })
    }
  }

  /** Emit floating dust particles when garage door opens */
  emitDoorDust(doorCenter: THREE.Vector3, doorWidth: number, doorHeight: number, count = 30) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      // Spread across the door opening area
      const x = doorCenter.x + (Math.random() - 0.5) * doorWidth * 0.8
      const y = Math.random() * doorHeight * 0.9 + 0.1
      const z = doorCenter.z + (Math.random() - 0.5) * 1.5

      this.particles.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.15,   // gentle horizontal drift
          0.05 + Math.random() * 0.12,     // slow upward float
          (Math.random() - 0.5) * 0.3 - 0.15 // slight drift inward
        ),
        life: 0,
        maxLife: 2.5 + Math.random() * 2.5,  // long-lived floating dust
        color: new THREE.Color(0.95, 0.9, 0.75),  // warm golden dust
        size: 0.02 + Math.random() * 0.03
      })
    }
  }

  /** Emit ambient dust motes floating in the garage */
  emitAmbientDust(center: THREE.Vector3, radius: number, height: number, count = 2) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * radius
      this.particles.push({
        position: new THREE.Vector3(
          center.x + Math.cos(angle) * r,
          Math.random() * height + 0.3,
          center.z + Math.sin(angle) * r
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.04,
          0.01 + Math.random() * 0.03,
          (Math.random() - 0.5) * 0.04
        ),
        life: 0,
        maxLife: 4.0 + Math.random() * 4.0,
        color: new THREE.Color(0.85, 0.82, 0.72),
        size: 0.015 + Math.random() * 0.02,
        type: 'dust'
      })
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += dt
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1)
        continue
      }
      if (p.type === 'dust') {
        p.velocity.y += 0.02 * dt // gentle upward drift
      } else {
        p.velocity.y -= 4.0 * dt // gravity
      }
      p.position.addScaledVector(p.velocity, dt)
    }

    // Update buffers
    const count = Math.min(this.particles.length, MAX_PARTICLES)
    for (let i = 0; i < count; i++) {
      const p = this.particles[i]
      const fade = 1 - p.life / p.maxLife
      this.positions[i * 3] = p.position.x
      this.positions[i * 3 + 1] = p.position.y
      this.positions[i * 3 + 2] = p.position.z
      this.colors[i * 3] = p.color.r * fade
      this.colors[i * 3 + 1] = p.color.g * fade
      this.colors[i * 3 + 2] = p.color.b * fade
      this.sizes[i] = p.size * fade
    }
    // Zero out remaining
    for (let i = count; i < MAX_PARTICLES; i++) {
      this.positions[i * 3 + 1] = -100 // hide below ground
      this.sizes[i] = 0
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.setDrawRange(0, count)
  }
}
