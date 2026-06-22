/**
 * puzzleUtils.js — shared constants and pure utility functions for the puzzle engine.
 *
 * Imported by all three game components (PuzzleGame, CoopPuzzleGame, RacingGame)
 * and by the VolumeContext. Keeping these helpers here avoids duplicating logic
 * across components and makes them independently testable.
 */
import { useState, useEffect } from 'react';

const VOLUME_KEY = 'puzzleVolume';
const MUTED_KEY  = 'puzzleMuted';

/**
 * Read the current master volume from localStorage.
 * @returns {number} Volume in the range [0, 1]; defaults to 0.5 if not set or invalid.
 */
export function getVolume() {
  const v = parseFloat(localStorage.getItem(VOLUME_KEY));
  return isNaN(v) ? 0.5 : Math.max(0, Math.min(1, v));
}

/**
 * Persist the master volume to localStorage so it survives page reloads.
 * @param {number} v - Volume in [0, 1]; automatically clamped.
 */
export function setVolume(v) {
  localStorage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(1, v))));
}

/**
 * Read the global mute state from localStorage.
 * Used by one-shot sound effects to skip playback without needing React context.
 * @returns {boolean} true if the user has muted all sounds.
 */
export function getMuted() {
  return localStorage.getItem(MUTED_KEY) === 'true';
}

/**
 * Persist the global mute state to localStorage.
 * Called by VolumeContext's toggleMute — not intended for direct component use.
 * @param {boolean} v
 */
export function setMuted(v) {
  localStorage.setItem(MUTED_KEY, String(!!v));
}

/**
 * Maps a supported piece count to the grid's row/column layout.
 * Used by all game components to slice the puzzle image into cells.
 */
export const PIECE_CONFIGS = {
  6:   { rows: 2, cols: 3 },
  9:   { rows: 3, cols: 3 },
  12:  { rows: 3, cols: 4 },
  25:  { rows: 5, cols: 5 },
  100: { rows: 10, cols: 10 },
};

/**
 * Fisher-Yates (Knuth) in-place shuffle on a copy of the array.
 * Returns a new array without mutating the original.
 * @param {any[]} arr - The source array.
 * @returns {any[]} Shuffled copy.
 */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Format a total-seconds value as "HH:MM:SS" (used for saved score strings).
 * @param {number} totalSeconds - Non-negative integer.
 * @returns {string} e.g. "00:05:23"
 */
export function formatHHMMSS(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Format a total-seconds value as "MM:SS" (used for the in-game timer display).
 * @param {number} totalSeconds - Non-negative integer.
 * @returns {string} e.g. "05:23"
 */
export function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Compute the square pixel size for each puzzle grid based on the viewport width.
 * On narrow screens the grid fills the available width; on wider screens it caps
 * at 480 px so two grids can sit side-by-side comfortably.
 * @returns {number} Grid side length in pixels.
 */
export function computeGridSize() {
  if (window.innerWidth <= 640) return Math.min(window.innerWidth - 24, 400);
  const perGrid = Math.floor((Math.min(window.innerWidth, 1100) - 80) / 2);
  return Math.min(perGrid, 480);
}

/**
 * React hook that returns the current puzzle grid size in pixels and updates
 * it automatically whenever the window is resized.
 *
 * Extracted here to avoid duplicating the same useState + useEffect pattern
 * in PuzzleGame, CoopPuzzleGame, and RacingGame.
 *
 * @returns {number} Current grid size in pixels.
 */
export function useGridSize() {
  const [gridSize, setGridSize] = useState(() => computeGridSize());
  useEffect(() => {
    const onResize = () => setGridSize(computeGridSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return gridSize;
}
