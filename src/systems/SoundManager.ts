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

    // ─── DOOR OPENING: Motor hum + chain rattle + metallic slide ───
    playDoorOpen() {
        if (!this.enabled) return
        const ctx = this.getContext()
        const now = ctx.currentTime

        // Electric motor hum (continuous)
        const motor = ctx.createOscillator()
        const motorGain = ctx.createGain()
        motor.connect(motorGain)
        motorGain.connect(ctx.destination)
        motor.type = 'sawtooth'
        motor.frequency.setValueAtTime(55, now)
        motor.frequency.linearRampToValueAtTime(75, now + 0.3)
        motor.frequency.linearRampToValueAtTime(65, now + 2.0)
        motor.frequency.linearRampToValueAtTime(45, now + 2.3)
        motorGain.gain.setValueAtTime(0, now)
        motorGain.gain.linearRampToValueAtTime(0.07, now + 0.2)
        motorGain.gain.linearRampToValueAtTime(0.05, now + 1.8)
        motorGain.gain.linearRampToValueAtTime(0, now + 2.4)
        motor.start(now)
        motor.stop(now + 2.4)

        // Chain rattle — rapid metallic clicks with varying pitch
        for (let i = 0; i < 16; i++) {
            const t = now + 0.1 + i * 0.14
            const click = ctx.createOscillator()
            const cGain = ctx.createGain()
            const cFilter = ctx.createBiquadFilter()
            click.connect(cFilter)
            cFilter.connect(cGain)
            cGain.connect(ctx.destination)
            cFilter.type = 'bandpass'
            cFilter.frequency.setValueAtTime(2000 + Math.random() * 1500, t)
            cFilter.Q.setValueAtTime(8, t)
            click.type = 'square'
            click.frequency.setValueAtTime(150 + Math.random() * 200, t)
            cGain.gain.setValueAtTime(0.025, t)
            cGain.gain.linearRampToValueAtTime(0, t + 0.02)
            click.start(t)
            click.stop(t + 0.03)
        }

        // Metallic slide — filtered noise sweep
        const bufLen = ctx.sampleRate * 2.5
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1)
        const noise = ctx.createBufferSource()
        noise.buffer = buf
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.setValueAtTime(400, now)
        bp.frequency.linearRampToValueAtTime(800, now + 1.0)
        bp.frequency.linearRampToValueAtTime(300, now + 2.2)
        bp.Q.setValueAtTime(3, now)
        const nGain = ctx.createGain()
        noise.connect(bp)
        bp.connect(nGain)
        nGain.connect(ctx.destination)
        nGain.gain.setValueAtTime(0, now)
        nGain.gain.linearRampToValueAtTime(0.04, now + 0.3)
        nGain.gain.linearRampToValueAtTime(0.025, now + 1.8)
        nGain.gain.linearRampToValueAtTime(0, now + 2.4)
        noise.start(now)
        noise.stop(now + 2.5)

        // Final thud when door reaches top
        const thud = ctx.createOscillator()
        const thudGain = ctx.createGain()
        thud.connect(thudGain)
        thudGain.connect(ctx.destination)
        thud.type = 'sine'
        thud.frequency.setValueAtTime(80, now + 2.2)
        thud.frequency.linearRampToValueAtTime(40, now + 2.4)
        thudGain.gain.setValueAtTime(0.12, now + 2.2)
        thudGain.gain.linearRampToValueAtTime(0, now + 2.5)
        thud.start(now + 2.2)
        thud.stop(now + 2.5)
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
