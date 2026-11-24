/**
 * ZOMBIE APOCALYPSE - WWZ AFTERMATH STYLE PROCEDURAL AUDIO ENGINE
 * Replicates the intense, visceral sound design of World War Z: Aftermath
 * Zero external asset dependencies - 100% synthesized and spatialized via Web Audio API.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.lowHealthFilter = null;
        this.isMuted = false;
        this.masterVolume = 0.8;
        this.sfxVolume = 1.0;
        this.musicVolume = 0.5;

        this.musicPlaying = false;
        this.musicIntensity = 0; // 0: Calm/Tension, 1: Combat, 2: Massive Swarm
        this.musicTimer = null;
        this.heartbeatTimer = null;
        this.isHeartbeatActive = false;

        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Low-pass filter for near-death / concussion effect
            this.lowHealthFilter = this.ctx.createBiquadFilter();
            this.lowHealthFilter.type = 'lowpass';
            this.lowHealthFilter.frequency.value = 22050; // default fully open

            // Master Gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.masterVolume;

            // SFX & Music Sub-busses
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;

            // Routing: SFX & Music -> LowHealthFilter -> MasterGain -> Destination
            this.sfxGain.connect(this.lowHealthFilter);
            this.musicGain.connect(this.lowHealthFilter);
            this.lowHealthFilter.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);

            this.initialized = true;
            this.startMusicLoop();
        } catch (e) {
            console.warn("Web Audio API initialization failed:", e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setLowHealthEffect(healthPercent) {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        if (healthPercent < 0.35) {
            // Muffle high frequencies
            const cutoff = Math.max(300, 300 + (healthPercent / 0.35) * 4000);
            this.lowHealthFilter.frequency.setTargetAtTime(cutoff, now, 0.2);
            if (!this.isHeartbeatActive) {
                this.startHeartbeat();
            }
        } else {
            // Restore full frequency range
            this.lowHealthFilter.frequency.setTargetAtTime(22050, now, 0.3);
            if (this.isHeartbeatActive) {
                this.stopHeartbeat();
            }
        }
    }

    // --- PROCEDURAL NOISE BUFFER GENERATOR ---
    createNoiseBuffer(duration = 1.0) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // --- WEAPON SOUND EFFECTS ---

    // 1. Tactical Assault Rifle (ARK-103)
    playRifleShot() {
        if (!this.initialized) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Transient Click (high-frequency crack)
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(1400 + Math.random() * 200, now);
        clickOsc.frequency.exponentialRampToValueAtTime(80, now + 0.03);
        clickGain.gain.setValueAtTime(0.7, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        clickOsc.connect(clickGain);
        clickGain.connect(this.sfxGain);
        clickOsc.start(now);
        clickOsc.stop(now + 0.05);

        // Gunpowder Blast (Filtered White Noise Burst)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.25);
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1200 + Math.random() * 300, now);
        noiseFilter.Q.value = 1.2;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.9, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.2);

        // Sub-Bass Thud (punchy 95Hz kick)
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(110 + Math.random() * 15, now);
        subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
        subGain.gain.setValueAtTime(0.85, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        subOsc.connect(subGain);
        subGain.connect(this.sfxGain);
        subOsc.start(now);
        subOsc.stop(now + 0.16);

        // Metallic Bolt Ejection Clack
        setTimeout(() => {
            if (!this.initialized) return;
            const boltTime = this.ctx.currentTime;
            const boltOsc = this.ctx.createOscillator();
            const boltGain = this.ctx.createGain();
            boltOsc.type = 'square';
            boltOsc.frequency.setValueAtTime(1800, boltTime);
            boltGain.gain.setValueAtTime(0.12, boltTime);
            boltGain.gain.exponentialRampToValueAtTime(0.001, boltTime + 0.03);
            boltOsc.connect(boltGain);
            boltGain.connect(this.sfxGain);
            boltOsc.start(boltTime);
            boltOsc.stop(boltTime + 0.04);
        }, 50);
    }

    // 2. Combat Shotgun (S890)
    playShotgunShot() {
        if (!this.initialized) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Massive Low-End Sub Punch (45Hz boom)
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(130, now);
        subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.28);
        subGain.gain.setValueAtTime(1.0, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        subOsc.connect(subGain);
        subGain.connect(this.sfxGain);
        subOsc.start(now);
        subOsc.stop(now + 0.35);

        // Wide Explosive Noise Blast
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.45);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.35);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.0, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.45);

        // Shotgun Pump Action Rack Sound ("clack-chick" after 400ms)
        setTimeout(() => {
            this.playPumpAction();
        }, 380);
    }

    playPumpAction() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.setValueAtTime(400, t + 0.06);
        osc.frequency.setValueAtTime(1000, t + 0.12);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    // 3. Compact SMG / Tactical Pistol
    playPistolShot() {
        if (!this.initialized) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900 + Math.random() * 150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.1);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.12);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.12);
    }

    // 4. Heavy Grenade Launcher / RPG
    playHeavyLauncherShot() {
        if (!this.initialized) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Pneumatic launch "THUMP"
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.32);

        // Rocket Whoosh / Gas escape
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.4);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.linearRampToValueAtTime(1600, now + 0.3);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.7, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.4);
    }

    // 5. Dry Fire Click
    playDryFire() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.04);
    }

    // 6. Reload Sounds
    playReload(step = 1) {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (step === 1) {
            // Mag drop / eject
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        } else if (step === 2) {
            // New mag snap in
            osc.type = 'square';
            osc.frequency.setValueAtTime(1100, now);
            osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        } else {
            // Bolt rack / chamber
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(750, now);
            osc.frequency.linearRampToValueAtTime(1300, now + 0.1);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        }

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    // 7. Melee Combat
    playMeleeSwing() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.25);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.linearRampToValueAtTime(2200, now + 0.12);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.22);
    }

    playMeleeHit() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        // Meaty slice + bone crunch
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.18);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.7, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.2);
    }

    // --- HITMARKERS & COMBAT FEEDBACK ---

    // The iconic WWZ Headshot Kill Sound: Crisp Metallic Chime + Meaty Squish
    playHeadshot() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // 1. High-Pitched Satisfying Bell Chime (2400Hz)
        const chime = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(2450, now);
        chime.frequency.exponentialRampToValueAtTime(1900, now + 0.25);
        chimeGain.gain.setValueAtTime(0.5, now);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        chime.connect(chimeGain);
        chimeGain.connect(this.sfxGain);
        chime.start(now);
        chime.stop(now + 0.32);

        // 2. Visceral Skull Crunch / Squish
        const crunch = this.ctx.createOscillator();
        const crunchGain = this.ctx.createGain();
        crunch.type = 'triangle';
        crunch.frequency.setValueAtTime(500, now);
        crunch.frequency.exponentialRampToValueAtTime(90, now + 0.12);
        crunchGain.gain.setValueAtTime(0.7, now);
        crunchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        crunch.connect(crunchGain);
        crunchGain.connect(this.sfxGain);
        crunch.start(now);
        crunch.stop(now + 0.16);
    }

    // Body Hit Marker (crisp 'tik')
    playBodyHit() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1100, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    // --- EXPLOSIONS & DESTRUCTION ---
    playExplosion(intensity = 1.0) {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Sub-Bass Seismic Thump (35Hz)
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(110, now);
        sub.frequency.exponentialRampToValueAtTime(25, now + 0.6);
        subGain.gain.setValueAtTime(1.0 * intensity, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + 0.75);

        // Roaring Blast Noise with Lowpass Decay
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(1.2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 1.0);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(1.0 * intensity, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 1.1);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 1.2);
    }

    // Zombie Pyramid Collapse Sound (tumbling bodies & groans)
    playPyramidCollapse() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        // Low rumble of falling bodies
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(45, now + 0.6);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.75);
    }

    // --- ZOMBIE & SWARM VOCALS ---

    // Terrifying Swarm Roar (WWZ signature warning sound)
    playSwarmRoar() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Multi-oscillator howling chorus
        const freqs = [120, 165, 230, 310];
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 0.8);
            osc.frequency.linearRampToValueAtTime(freq * 0.8, now + 1.8);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(500 + idx * 200, now);
            filter.Q.value = 3.0;

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 2.1);
        });
    }

    // Close-range Zombie Snarl / Growl
    playZombieGrowl() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        const startF = 80 + Math.random() * 60;
        osc.frequency.setValueAtTime(startF, now);
        osc.frequency.linearRampToValueAtTime(startF * 1.3, now + 0.15);
        osc.frequency.linearRampToValueAtTime(startF * 0.7, now + 0.35);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 650;
        filter.Q.value = 2.5;

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    // Special: Screamer Siren / Wail
    playScreamerWail() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1400, now + 0.3);
        osc.frequency.linearRampToValueAtTime(700, now + 0.7);
        osc.frequency.linearRampToValueAtTime(1500, now + 1.1);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.6, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 1.5);
    }

    // Special: Bull Charging Roar
    playBullRoar() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(65, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.4);
        osc.frequency.exponentialRampToValueAtTime(50, now + 1.0);

        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 1.2);
    }

    // Special: Bomber Beeping (accelerates)
    playBomberBeep(pitchMult = 1.0) {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800 * pitchMult, now);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    // --- DEFENSES & DEPLOYABLES ---
    playTurretFire() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    playDeployDefense() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    // --- HORDE WARNING ALARM & HORNS ---
    playHordeKlaxon() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // WWZ style ominous military horn / air raid siren
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';

        // Detuned brass blast
        osc1.frequency.setValueAtTime(155, now);
        osc2.frequency.setValueAtTime(157.5, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.55, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 2.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.3);
        osc2.stop(now + 2.3);
    }

    // --- HEARTBEAT FOR LOW HEALTH ---
    startHeartbeat() {
        this.isHeartbeatActive = true;
        const beat = () => {
            if (!this.isHeartbeatActive || !this.initialized) return;
            const now = this.ctx.currentTime;
            // Lub
            this.playHeartbeatThump(now, 55, 0.7);
            // Dub
            this.playHeartbeatThump(now + 0.18, 48, 0.55);
            this.heartbeatTimer = setTimeout(beat, 650);
        };
        beat();
    }

    stopHeartbeat() {
        this.isHeartbeatActive = false;
        if (this.heartbeatTimer) {
            clearTimeout(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    playHeartbeatThump(time, freq, vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(28, time + 0.12);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.16);
    }

    // --- PROCEDURAL DYNAMIC COMBAT MUSIC SYSTEM ---
    setMusicIntensity(level) {
        // 0: Calm / Prep, 1: Combat, 2: Massive Swarm
        this.musicIntensity = level;
    }

    startMusicLoop() {
        if (this.musicPlaying) return;
        this.musicPlaying = true;

        let step = 0;
        const tempoMs = 125; // 120 BPM 16th notes

        const musicTick = () => {
            if (!this.musicPlaying || !this.initialized) return;
            const now = this.ctx.currentTime;

            // Bass drone pulse (every 8 steps)
            if (step % 8 === 0) {
                const bassFreqs = [55, 55, 49, 41]; // A1, A1, G1, E1
                const bassNote = bassFreqs[Math.floor(step / 8) % bassFreqs.length];
                const bassOsc = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                bassOsc.type = 'sawtooth';
                bassOsc.frequency.setValueAtTime(bassNote, now);

                const bassFilter = this.ctx.createBiquadFilter();
                bassFilter.type = 'lowpass';
                bassFilter.frequency.setValueAtTime(this.musicIntensity > 0 ? 350 : 180, now);

                bassGain.gain.setValueAtTime(0.2, now);
                bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

                bassOsc.connect(bassFilter);
                bassFilter.connect(bassGain);
                bassGain.connect(this.musicGain);

                bassOsc.start(now);
                bassOsc.stop(now + 1.0);
            }

            // Industrial combat percussion (kicks and hats when combat intensity > 0)
            if (this.musicIntensity >= 1) {
                // Kick drum on beats 0, 4, 8, 12
                if (step % 4 === 0) {
                    const kick = this.ctx.createOscillator();
                    const kickGain = this.ctx.createGain();
                    kick.type = 'sine';
                    kick.frequency.setValueAtTime(120, now);
                    kick.frequency.exponentialRampToValueAtTime(38, now + 0.1);
                    kickGain.gain.setValueAtTime(0.35, now);
                    kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                    kick.connect(kickGain);
                    kickGain.connect(this.musicGain);
                    kick.start(now);
                    kick.stop(now + 0.14);
                }

                // Hi-hat / metallic ticking on off-beats
                if (step % 2 === 1 || this.musicIntensity === 2) {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = this.createNoiseBuffer(0.05);
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.value = 7000;
                    const nGain = this.ctx.createGain();
                    nGain.gain.setValueAtTime(this.musicIntensity === 2 ? 0.15 : 0.08, now);
                    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                    noise.connect(filter);
                    filter.connect(nGain);
                    nGain.connect(this.musicGain);
                    noise.start(now);
                    noise.stop(now + 0.05);
                }
            }

            step = (step + 1) % 32;
            this.musicTimer = setTimeout(musicTick, tempoMs);
        };

        musicTick();
    }
}

// Global singleton instance
window.soundEngine = new SoundEngine();
