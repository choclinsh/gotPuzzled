/**
 * VolumeContext.js — global audio state: master volume, mute flag, and game-active flag.
 *
 * VolumeProvider wraps the entire app (in App.js) and exposes:
 *   volume        {number}   master volume [0, 1], persisted to localStorage
 *   setVolume     {Function} update volume (clamped, persisted)
 *   isMuted       {boolean}  true when ALL sounds are silenced globally
 *   toggleMute    {Function} flip isMuted and persist the new value
 *   gameActive    {boolean}  true while any game mode (solo/coop/race) is running
 *   setGameActive {Function} called by Dashboard when mode changes
 *
 * isMuted is read reactively by useBackgroundMusic (stops the music immediately)
 * and is also available via getMuted() in puzzleUtils for one-shot sound effects
 * that fire inside useEffect bodies without a context dependency.
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
    getVolume as getStoredVolume,
    setVolume as storeVolume,
    getMuted as getStoredMuted,
    setMuted  as storeMuted,
} from '../utils/puzzleUtils';

const VolumeContext = createContext({
    volume: 0.5,
    setVolume: () => {},
    isMuted: false,
    toggleMute: () => {},
    gameActive: false,
    setGameActive: () => {},
});

/**
 * Provides volume, mute, and game-active state to the whole component tree.
 * Must be placed above any component that calls useVolume or useBackgroundMusic.
 */
export function VolumeProvider({ children }) {
    const [volume, setVolumeState]    = useState(() => getStoredVolume());
    const [isMuted, setIsMutedState]  = useState(() => {
        storeMuted(false); // sync localStorage so getMuted() matches on every fresh session
        console.log('[VolumeContext] init — isMuted reset to false | localStorage puzzleMuted=', localStorage.getItem('puzzleMuted'));
        return false;
    });
    const [gameActive, setGameActive] = useState(false);

    const updateVolume = (v) => {
        const clamped = Math.max(0, Math.min(1, v));
        storeVolume(clamped);
        setVolumeState(clamped);
    };

    /** Flip the global mute flag and persist it for next session. */
    const toggleMute = () => {
        const next = !isMuted;
        storeMuted(next);
        console.log('[VolumeContext] toggleMute → isMuted=', next, '| localStorage puzzleMuted=', localStorage.getItem('puzzleMuted'));
        setIsMutedState(next);
    };

    return (
        <VolumeContext.Provider value={{ volume, setVolume: updateVolume, isMuted, toggleMute, gameActive, setGameActive }}>
            {children}
        </VolumeContext.Provider>
    );
}

/** Read volume, mute state, and all setters from context. */
export function useVolume() {
    return useContext(VolumeContext);
}

/**
 * Plays looping background music from the component that calls this hook.
 *
 * Call this from a component that stays mounted for as long as you want
 * uninterrupted playback (e.g. Layout, not individual pages). The Audio node
 * persists across child navigations so the music never restarts mid-song.
 *
 * Pause/resume behaviour:
 *   isMuted → true  : audio.pause() immediately; currentTime preserved.
 *   isMuted → false : audio.play() resumes from the same position.
 *   enabled → false : same pause-without-reset (used when a game is active).
 *   enabled → true  : resumes from the same position.
 *
 * @param {string}  src
 * @param {object}  [opts]
 * @param {boolean} [opts.enabled=true] - External gate (route check + gameActive).
 */
export function useBackgroundMusic(src, { enabled = true } = {}) {
    const { volume, isMuted } = useVolume();
    const audioRef = useRef(null);
    const playPromiseRef = useRef(null); // tracks the pending play() so pause() never races it

    // ── Create the Audio node once on mount; keep it alive across pause/resume ──
    useEffect(() => {
        const audio = new Audio(src);
        audio.loop   = true;
        audio.volume = volume;
        audioRef.current = audio;
        return () => {
            // Wait for any pending play() before pausing to avoid AbortError
            const p = playPromiseRef.current;
            if (p) {
                p.then(() => audio.pause()).catch(() => {});
            } else {
                audio.pause();
            }
            audioRef.current = null;
            playPromiseRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    // ── Play or pause whenever the enabled gate or mute flag changes ────────────
    // Both conditions must be satisfied: caller enabled AND user not muted.
    // Pausing without resetting currentTime means unmuting or returning from a
    // game resumes mid-song rather than restarting from the beginning.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (enabled && !isMuted) {
            const tryPlay = () => {
                if (audio.paused) {
                    playPromiseRef.current = audio.play().catch(err => console.warn('[Audio] music blocked:', err));
                }
            };
            tryPlay();
            // Autoplay may be blocked on first visit; retry on next user gesture.
            document.addEventListener('click', tryPlay, { once: true });
            return () => document.removeEventListener('click', tryPlay);
        } else {
            // Wait for any pending play() before pausing to avoid AbortError
            const p = playPromiseRef.current;
            if (p) {
                p.then(() => audio.pause()).catch(() => {});
                playPromiseRef.current = null;
            } else {
                audio.pause();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, isMuted]);

    // ── Apply volume slider changes live without recreating the node ────────────
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
    }, [volume]);
}

export default VolumeContext;
