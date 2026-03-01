/**
 * SoundManager — Web Audio API synthesized sounds
 * No external files needed — all sounds generated programmatically
 */
export class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }
    getContext() {
        if (!this.ctx) {
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    // ─── MOVEMENT: Short motor whir ───
    playMove() {
        if (!this.enabled)
            return;
        const ctx = this.getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.15);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    }
    // ─── TURN: Quick chirp ───
    playTurn() {
        if (!this.enabled)
            return;
        const ctx = this.getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    }
    // ─── BUTTON PRESS: Click ───
    playButtonPress() {
        if (!this.enabled)
            return;
        const ctx = this.getContext();
        // Click sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
        // Confirmation beep
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
        gain2.gain.setValueAtTime(0, ctx.currentTime + 0.1);
        gain2.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.12);
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
        osc2.start(ctx.currentTime + 0.1);
        osc2.stop(ctx.currentTime + 0.25);
    }
    // ─── DOOR OPENING: Mechanical rumble ───
    playDoorOpen() {
        if (!this.enabled)
            return;
        const ctx = this.getContext();
        // Low rumble
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 2.0);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1.8);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2.2);
        // Mechanical clicks
        for (let i = 0; i < 8; i++) {
            const click = ctx.createOscillator();
            const cGain = ctx.createGain();
            click.connect(cGain);
            cGain.connect(ctx.destination);
            click.type = 'square';
            click.frequency.setValueAtTime(200 + Math.random() * 100, ctx.currentTime + i * 0.25);
            cGain.gain.setValueAtTime(0.05, ctx.currentTime + i * 0.25);
            cGain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.25 + 0.03);
            click.start(ctx.currentTime + i * 0.25);
            click.stop(ctx.currentTime + i * 0.25 + 0.04);
        }
    }
    // ─── CHARGING: Rising tones ───
    playCharging() {
        if (!this.enabled)
            return;
        const ctx = this.getContext();
        const notes = [261, 329, 392, 523, 659, 784, 1046];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.2 + 0.05);
            gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + i * 0.2 + 0.15);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.2 + 0.2);
            osc.start(ctx.currentTime + i * 0.2);
            osc.stop(ctx.currentTime + i * 0.2 + 0.2);
        });
    }
    // ─── SUCCESS: Victory jingle ───
    playSuccess() {
        if (!this.enabled)
            return;
        const ctx = this.getContext();
        const melody = [523, 659, 784, 1046];
        melody.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.15 + 0.03);
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.15 + 0.12);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.3);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
    }
    // ─── FAILURE: Sad descending tones ───
    playFailure() {
        if (!this.enabled)
            return;
        const ctx = this.getContext();
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.25);
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.25);
            gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.25 + 0.03);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.25 + 0.35);
            osc.start(ctx.currentTime + i * 0.25);
            osc.stop(ctx.currentTime + i * 0.25 + 0.4);
        });
    }
    // ─── INTRO BOOT: Robot startup sound ───
    playBootUp() {
        if (!this.enabled)
            return;
        const ctx = this.getContext();
        // Rising sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 1.0);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.0);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.3);
        // Two beeps at end
        for (let i = 0; i < 2; i++) {
            const beep = ctx.createOscillator();
            const bGain = ctx.createGain();
            beep.connect(bGain);
            bGain.connect(ctx.destination);
            beep.type = 'square';
            beep.frequency.setValueAtTime(1000, ctx.currentTime + 1.4 + i * 0.15);
            bGain.gain.setValueAtTime(0.06, ctx.currentTime + 1.4 + i * 0.15);
            bGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.4 + i * 0.15 + 0.08);
            beep.start(ctx.currentTime + 1.4 + i * 0.15);
            beep.stop(ctx.currentTime + 1.4 + i * 0.15 + 0.1);
        }
    }
}
// Singleton
export const soundManager = new SoundManager();
//# sourceMappingURL=SoundManager.js.map