/**
 * CountdownOverlay.js — full-screen 3-2-1-START! overlay shown before each game.
 *
 * Plays the start counter sound once on mount, then steps through the
 * STEPS array at 1-second intervals. When all steps have been displayed,
 * `onDone` is called to signal the parent that the game can begin.
 *
 * Audio: the Audio element is created once at module scope so React StrictMode's
 * mount→cleanup→remount cycle never triggers a second network request for the
 * same file. A second concurrent request caused ERR_CACHE_OPERATION_NOT_SUPPORTED
 * in Chrome, preventing canplay from ever firing on the re-mounted element.
 *
 * @param {object}   props
 * @param {Function} props.onDone - Called once the countdown finishes.
 */
import React, { useState, useEffect, useRef } from 'react';
import './CountdownOverlay.css';
import { getVolume, getMuted } from '../utils/puzzleUtils';
import { useVolume } from '../context/VolumeContext';

const STEPS = ['3', '2', '1', 'START!'];

// Single Audio element for the lifetime of the app — one network request, ever.
// Reusing it across StrictMode remounts avoids ERR_CACHE_OPERATION_NOT_SUPPORTED.
const countdownAudio = new Audio('/assets/start_counter_sound.mp3');
countdownAudio.preload = 'auto';

export default function CountdownOverlay({ onDone }) {
  const [step, setStep] = useState(0);
  const { isMuted } = useVolume();

  // Store onDone in a ref so the timer closure always calls the latest version
  // without needing it as a dependency (avoids restarting the timer).
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Tracks the pending play() promise so cleanup never calls pause() before it settles.
  const playPromiseRef = useRef(null);

  useEffect(() => {
    console.log('[Audio:countdown] effect fired | getMuted()=', getMuted(), '| getVolume()=', getVolume(), '| readyState=', countdownAudio.readyState);
    if (getMuted()) {
      console.log('[Audio:countdown] SKIPPED — muted');
      return;
    }

    countdownAudio.volume = getVolume();
    countdownAudio.currentTime = 0;

    const tryPlay = () => {
      console.log('[Audio:countdown] tryPlay | readyState=', countdownAudio.readyState, '| paused=', countdownAudio.paused);
      playPromiseRef.current = countdownAudio.play()
        .then(() => console.log('[Audio:countdown] play() resolved ✓'))
        .catch(err => console.warn('[Audio:countdown] play() REJECTED:', err));
    };

    if (countdownAudio.readyState >= 3) {
      console.log('[Audio:countdown] already buffered — playing immediately');
      tryPlay();
    } else {
      console.log('[Audio:countdown] waiting for canplay…');
      countdownAudio.addEventListener('canplay', tryPlay, { once: true });
    }

    return () => {
      console.log('[Audio:countdown] CLEANUP');
      countdownAudio.removeEventListener('canplay', tryPlay);
      const p = playPromiseRef.current;
      if (p) {
        p.then(() => { countdownAudio.pause(); countdownAudio.currentTime = 0; }).catch(() => {});
        playPromiseRef.current = null;
      } else {
        countdownAudio.currentTime = 0;
      }
    };
  }, []);

  // Pause immediately if the user mutes while the beep is playing.
  useEffect(() => {
    console.log('[Audio:countdown] isMuted watcher | isMuted=', isMuted);
    if (isMuted) {
      const p = playPromiseRef.current;
      if (p) {
        p.then(() => countdownAudio.pause()).catch(() => {});
      } else if (!countdownAudio.paused) {
        countdownAudio.pause();
      }
    }
  }, [isMuted]);

  // Advance one step per second; call onDone when steps are exhausted.
  useEffect(() => {
    if (step >= STEPS.length) {
      onDoneRef.current();
      return;
    }
    const id = setTimeout(() => setStep(s => s + 1), 1000);
    return () => clearTimeout(id);
  }, [step]);

  if (step >= STEPS.length) return null;

  return (
    <div className="countdown-overlay">
      <div key={step} className={`countdown-number${step === STEPS.length - 1 ? ' countdown-start' : ''}`}>
        {STEPS[step]}
      </div>
    </div>
  );
}
