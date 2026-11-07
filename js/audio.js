// Web Audio API Sound Synthesizer for UNO Chess
const SoundFX = (function () {
    let audioCtx = null;
    let soundEnabled = true;

    function getContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    return {
        toggleSound: function () {
            soundEnabled = !soundEnabled;
            return soundEnabled;
        },
        isEnabled: function () {
            return soundEnabled;
        },
        playDrawCard: function () {
            if (!soundEnabled) return;
            const ctx = getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Card swoosh / flip sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        },
        playMove: function () {
            if (!soundEnabled) return;
            const ctx = getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Gentle wooden chess tap
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        },
        playCapture: function () {
            if (!soundEnabled) return;
            const ctx = getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Punchy capture knock
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);
        },
        playReverse: function () {
            if (!soundEnabled) return;
            const ctx = getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Sci-fi / cartoon whoosh reverse chord
            [350, 440, 523, 659, 880].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const startTime = now + idx * 0.06;
                osc.frequency.setValueAtTime(freq, startTime);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.15);

                gain.gain.setValueAtTime(0.12, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.22);
            });
        },
        playResurrect: function () {
            if (!soundEnabled) return;
            const ctx = getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Magical shimmer sound
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                const t = now + i * 0.07;
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.18, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.36);
            });
        },
        playCheck: function () {
            if (!soundEnabled) return;
            const ctx = getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Warning alarm ping
            [880, 587].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                const t = now + i * 0.1;
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.16);
            });
        },
        playVictory: function () {
            if (!soundEnabled) return;
            const ctx = getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Grand victory fanfare
            const notes = [
                { f: 523.25, d: 0.15 },
                { f: 659.25, d: 0.15 },
                { f: 783.99, d: 0.15 },
                { f: 1046.50, d: 0.45 }
            ];
            let offset = 0;
            notes.forEach(note => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                const t = now + offset;
                osc.frequency.setValueAtTime(note.f, t);

                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + note.d);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + note.d);
                offset += note.d * 0.9;
            });
        }
    };
})();
