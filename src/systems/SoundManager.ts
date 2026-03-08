/**
 * SoundManager — Web Audio API synthesized sounds
 * No external files needed — all sounds generated programmatically
 */
export class SoundManager {
    private ctx: AudioContext | null = null
    private enabled = true

    private getContext(): AudioContext {
        if (!this.ctx) {
            this.ctx = new AudioContext()
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume()
        }
        return this.ctx
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled
    }

    // ─── MOVEMENT: Smooth servo whir + soft whoosh ───
    playMove() {
        if (!this.enabled) return
        const ctx = this.getContext()
        const now = ctx.currentTime

        // Smooth sine servo hum
        const servo = ctx.createOscillator()
        const servoGain = ctx.createGain()
        servo.connect(servoGain)
        servoGain.connect(ctx.destination)
        servo.type = 'sine'
        servo.frequency.setValueAtTime(220, now)
        servo.frequency.linearRampToValueAtTime(340, now + 0.12)
        servo.frequency.linearRampToValueAtTime(260, now + 0.25)
        servoGain.gain.setValueAtTime(0, now)
        servoGain.gain.linearRampToValueAtTime(0.06, now + 0.04)
        servoGain.gain.linearRampToValueAtTime(0.04, now + 0.15)
        servoGain.gain.linearRampToValueAtTime(0, now + 0.3)
        servo.start(now)
        servo.stop(now + 0.3)

        // Soft filtered noise whoosh (white noise → lowpass)
        const bufLen = ctx.sampleRate * 0.25
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.3
        const noise = ctx.createBufferSource()
        noise.buffer = buf
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.setValueAtTime(600, now)
        const nGain = ctx.createGain()
        noise.connect(lp)
        lp.connect(nGain)
        nGain.connect(ctx.destination)
        nGain.gain.setValueAtTime(0, now)
        nGain.gain.linearRampToValueAtTime(0.03, now + 0.05)
        nGain.gain.linearRampToValueAtTime(0, now + 0.25)
        noise.start(now)
        noise.stop(now + 0.25)
    }

    // ─── TURN: Gentle two-tone servo sweep ───
    playTurn() {
        if (!this.enabled) return
        const ctx = this.getContext()
        const now = ctx.currentTime

        // Two-tone sweep
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(350, now)
        osc.frequency.linearRampToValueAtTime(520, now + 0.08)
        osc.frequency.linearRampToValueAtTime(440, now + 0.18)
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.07, now + 0.03)
        gain.gain.linearRampToValueAtTime(0.04, now + 0.12)
        gain.gain.linearRampToValueAtTime(0, now + 0.2)
        osc.start(now)
        osc.stop(now + 0.2)

        // Soft click at start
        const click = ctx.createOscillator()
        const cGain = ctx.createGain()
        click.connect(cGain)
        cGain.connect(ctx.destination)
        click.type = 'sine'
        click.frequency.setValueAtTime(1200, now)
        cGain.gain.setValueAtTime(0.04, now)
        cGain.gain.linearRampToValueAtTime(0, now + 0.03)
        click.start(now)
        click.stop(now + 0.04)
    }

    // ─── BUTTON PRESS: Click ───
    playButtonPress() {
        if (!this.enabled) return
        const ctx = this.getContext()

        // Click sound
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = 'square'
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.05)

        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.1)

        // Confirmation beep
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)

        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.1)

        gain2.gain.setValueAtTime(0, ctx.currentTime + 0.1)
        gain2.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.12)
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25)

        osc2.start(ctx.currentTime + 0.1)
        osc2.stop(ctx.currentTime + 0.25)
    }

    // ─── DOOR OPENING: Fun ambulance/police siren + mechanical whir ───
    playDoorOpen() {
        if (!this.enabled) return
        const ctx = this.getContext()
        const now = ctx.currentTime

        // Eğlenceli Siren (Ambulans/Polis tarzı yavaş inip çıkan frekans)
        const siren = ctx.createOscillator()
        const sirenGain = ctx.createGain()
        siren.connect(sirenGain)
        sirenGain.connect(ctx.destination)
        siren.type = 'sine'

        // Siren frekansı LFO ile dalgalanır
        const lfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        lfo.type = 'square' // Keskin geçiş veya 'sine' kullanılabilir (ambulans için square daha iyidir ama sine daha yumuşak)
        lfo.frequency.setValueAtTime(3.0, now) // 3 Hz hızında inip çıkma
        lfoGain.gain.setValueAtTime(300, now) // 300 Hz dalgalanma genliği

        siren.frequency.setValueAtTime(600, now) // Merkez frekans
        lfo.connect(lfoGain)
        lfoGain.connect(siren.frequency) // Siren frekansını LFO modüle eder

        sirenGain.gain.setValueAtTime(0, now)
        sirenGain.gain.linearRampToValueAtTime(0.12, now + 0.2) // Yüksel
        sirenGain.gain.linearRampToValueAtTime(0.12, now + 2.0)
        sirenGain.gain.linearRampToValueAtTime(0, now + 2.5) // Kapanırken sustur

        siren.start(now)
        lfo.start(now)
        siren.stop(now + 2.5)
        lfo.stop(now + 2.5)

        // Eğlenceli ve hafif bir mekanik vızıldama (arka planda kapının kalktığını hissettirsin)
        const motor = ctx.createOscillator()
        const motorGain = ctx.createGain()
        motor.connect(motorGain)
        motorGain.connect(ctx.destination)
        motor.type = 'triangle'
        motor.frequency.setValueAtTime(100, now)
        motor.frequency.linearRampToValueAtTime(180, now + 1.0)
        motor.frequency.linearRampToValueAtTime(250, now + 2.0)
        motorGain.gain.setValueAtTime(0, now)
        motorGain.gain.linearRampToValueAtTime(0.04, now + 0.3)
        motorGain.gain.linearRampToValueAtTime(0.02, now + 2.2)
        motorGain.gain.linearRampToValueAtTime(0, now + 2.5)
        motor.start(now)
        motor.stop(now + 2.5)

        // Final "Ta-da" veya eğlenceli bitiş sesi
        const tada = ctx.createOscillator()
        const tadaGain = ctx.createGain()
        tada.connect(tadaGain)
        tadaGain.connect(ctx.destination)
        tada.type = 'sine'
        tada.frequency.setValueAtTime(440, now + 2.2) // A4
        tada.frequency.setValueAtTime(659.25, now + 2.35) // E5 (Ta-da!)
        tadaGain.gain.setValueAtTime(0, now + 2.19)
        tadaGain.gain.setValueAtTime(0.08, now + 2.2)
        tadaGain.gain.linearRampToValueAtTime(0.05, now + 2.34)
        tadaGain.gain.setValueAtTime(0.15, now + 2.35)
        tadaGain.gain.linearRampToValueAtTime(0, now + 2.7)
        tada.start(now + 2.2)
        tada.stop(now + 2.7)
    }

    // ─── CHARGING: Rising tones ───
    playCharging() {
        if (!this.enabled) return
        const ctx = this.getContext()

        const notes = [261, 329, 392, 523, 659, 784, 1046]
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2)

            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2)
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.2 + 0.05)
            gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + i * 0.2 + 0.15)
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.2 + 0.2)

            osc.start(ctx.currentTime + i * 0.2)
            osc.stop(ctx.currentTime + i * 0.2 + 0.2)
        })
    }

    // ─── SUCCESS: Victory jingle ───
    playSuccess() {
        if (!this.enabled) return
        const ctx = this.getContext()

        const melody = [523, 659, 784, 1046]
        melody.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15)

            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15)
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.15 + 0.03)
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.15 + 0.12)
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.3)

            osc.start(ctx.currentTime + i * 0.15)
            osc.stop(ctx.currentTime + i * 0.15 + 0.3)
        })
    }

    // ─── FAILURE: Sad descending tones ───
    playFailure() {
        if (!this.enabled) return
        const ctx = this.getContext()

        const notes = [400, 350, 300, 200]
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.25)

            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.25)
            gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.25 + 0.03)
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.25 + 0.35)

            osc.start(ctx.currentTime + i * 0.25)
            osc.stop(ctx.currentTime + i * 0.25 + 0.4)
        })
    }

    // ─── WALL COLLISION: Soft educational bump ───
    playWallCollision() {
        if (!this.enabled) return
        const ctx = this.getContext()
        const now = ctx.currentTime

        // Gentle thump — low sine, quick fade
        const thud = ctx.createOscillator()
        const thudGain = ctx.createGain()
        thud.connect(thudGain)
        thudGain.connect(ctx.destination)
        thud.type = 'sine'
        thud.frequency.setValueAtTime(120, now)
        thud.frequency.linearRampToValueAtTime(60, now + 0.15)
        thudGain.gain.setValueAtTime(0.10, now)
        thudGain.gain.linearRampToValueAtTime(0, now + 0.25)
        thud.start(now)
        thud.stop(now + 0.25)

        // Soft filtered noise tap (very brief)
        const bufLen = ctx.sampleRate * 0.08
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.4
        const noise = ctx.createBufferSource()
        noise.buffer = buf
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.setValueAtTime(800, now)
        const nGain = ctx.createGain()
        noise.connect(lp)
        lp.connect(nGain)
        nGain.connect(ctx.destination)
        nGain.gain.setValueAtTime(0.06, now)
        nGain.gain.linearRampToValueAtTime(0, now + 0.08)
        noise.start(now)
        noise.stop(now + 0.1)

        // Gentle descending "boop" — friendly tone
        const boop = ctx.createOscillator()
        const boopGain = ctx.createGain()
        boop.connect(boopGain)
        boopGain.connect(ctx.destination)
        boop.type = 'sine'
        boop.frequency.setValueAtTime(440, now + 0.05)
        boop.frequency.linearRampToValueAtTime(280, now + 0.2)
        boopGain.gain.setValueAtTime(0.06, now + 0.05)
        boopGain.gain.linearRampToValueAtTime(0, now + 0.25)
        boop.start(now + 0.05)
        boop.stop(now + 0.25)
    }

    // ─── INTRO BOOT: Robot startup sound ───
    playBootUp() {
        if (!this.enabled) return
        const ctx = this.getContext()

        // Rising sweep
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = 'sine'
        osc.frequency.setValueAtTime(100, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 1.0)
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.2)

        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3)
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.0)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 1.3)

        // Two beeps at end
        for (let i = 0; i < 2; i++) {
            const beep = ctx.createOscillator()
            const bGain = ctx.createGain()
            beep.connect(bGain)
            bGain.connect(ctx.destination)

            beep.type = 'square'
            beep.frequency.setValueAtTime(1000, ctx.currentTime + 1.4 + i * 0.15)

            bGain.gain.setValueAtTime(0.06, ctx.currentTime + 1.4 + i * 0.15)
            bGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.4 + i * 0.15 + 0.08)

            beep.start(ctx.currentTime + 1.4 + i * 0.15)
            beep.stop(ctx.currentTime + 1.4 + i * 0.15 + 0.1)
        }
    }
}

// Singleton
export const soundManager = new SoundManager()
