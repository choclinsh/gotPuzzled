/**
 * PuzzleGame.js — solo puzzle game component.
 *
 * Renders a single-player puzzle session driven by the state machine below.
 * The player clicks a piece in the Piece Bank (source grid) to select it,
 * then clicks an empty cell on the Board to place it. Clicking an occupied
 * board cell returns the piece to the bank. The board is solved when every
 * cell index matches its piece's correct index.
 *
 * State machine: 'countdown' → 'playing' → game-over screen
 *
 * @param {object}   props
 * @param {number}   props.pieces   - Number of puzzle pieces (must be a key in PIECE_CONFIGS).
 * @param {number}   props.rounds   - Number of rounds to complete before saving a score.
 * @param {Function} props.onBack   - Called when the player finishes or quits.
 * @param {string[]} props.images   - Ordered array of image URLs (one per round).
 */
import React, { useState, useEffect, useContext, useRef } from 'react';
import UserContext from '../context/UserContext';
import { useVolume } from '../context/VolumeContext';
import { scoreService } from '../services/scoreService';
import SharedBoard from './SharedBoard';
import CountdownOverlay from './CountdownOverlay';
import { PIECE_CONFIGS, shuffle, formatHHMMSS, formatMMSS, useGridSize, getVolume, getMuted } from '../utils/puzzleUtils';
import './PuzzleGame.css';

export default function PuzzleGame({ pieces, rounds, onBack, images }) {
  const { user } = useContext(UserContext);
  const { isMuted } = useVolume();

  // Derive the row/col layout from the piece count; fall back to a square if unknown
  const { rows, cols } = PIECE_CONFIGS[pieces] ?? {
    rows: Math.round(Math.sqrt(pieces)),
    cols: Math.round(Math.sqrt(pieces)),
  };

  // Responsive grid size — updates on window resize via the shared hook
  const gridSize = useGridSize();
  const cellW = gridSize / cols;
  const cellH = gridSize / rows;

  // Shuffle image order once so rounds aren't predictable across sessions
  const [roundImages] = useState(() => shuffle([...images]));
  const [currentRound, setCurrentRound] = useState(1);
  const [timeElapsed, setTimeElapsed]   = useState(0);

  // Puzzle board state:
  //   sourcePieces — indices of pieces still in the bank (shuffled)
  //   boardPieces  — array of length `pieces`; null = empty cell, number = piece's correct index
  const [sourcePieces, setSourcePieces] = useState(() =>
    shuffle(Array.from({ length: pieces }, (_, i) => i))
  );
  const [boardPieces, setBoardPieces]         = useState(() => Array(pieces).fill(null));
  const [selectedPieceIndex, setSelectedPieceIndex] = useState(null);

  const [gameOver, setGameOver]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [gamePhase, setGamePhase] = useState('countdown');

  // Victory / new-record sound — plays once after the score is saved.
  // victoryAudioRef lets the separate isMuted watcher pause it mid-playback
  // without putting isMuted in this effect's deps (which would cause StrictMode
  // to kill the sound on its cleanup pass before it can be heard).
  const victoryRef = useRef(null); // { audio, promise }
  useEffect(() => {
    console.log('[Audio:solo-victory] effect fired | gameOver=', gameOver, '| saving=', saving, '| isNewRecord=', isNewRecord, '| getMuted()=', getMuted(), '| getVolume()=', getVolume());
    if (!gameOver || saving || getMuted()) {
      console.log('[Audio:solo-victory] SKIPPED — gameOver:', gameOver, '| saving:', saving, '| muted:', getMuted());
      return;
    }
    const src = isNewRecord ? '/assets/new_record_sound.mp3' : '/assets/victory_sound.mp3';
    console.log('[Audio:solo-victory] playing', src);
    const audio = new Audio(src);
    audio.volume = getVolume();
    const promise = audio.play()
      .then(() => console.log('[Audio:solo-victory] play() resolved ✓'))
      .catch(err => console.warn('[Audio:solo-victory] play() REJECTED:', err));
    victoryRef.current = { audio, promise };
    return () => {
      console.log('[Audio:solo-victory] CLEANUP — scheduling pause after play() settles');
      promise.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
      victoryRef.current = null;
    };
  }, [gameOver, saving, isNewRecord]);

  useEffect(() => {
    console.log('[Audio:solo-victory] isMuted watcher | isMuted=', isMuted, '| ref=', !!victoryRef.current);
    if (isMuted && victoryRef.current) {
      const { audio, promise } = victoryRef.current;
      promise.then(() => { audio.pause(); }).catch(() => {});
    }
  }, [isMuted]);

  // Game sound — loops while playing; pauses immediately when isMuted changes.
  // isMuted IS in deps so the effect re-runs on mute/unmute, allowing cleanup to pause the loop.
  useEffect(() => {
    if (gamePhase !== 'playing' || gameOver || isMuted) return;
    const audio = new Audio('/assets/game_sound.mp3');
    audio.volume = getVolume();
    audio.loop = true;
    const promise = audio.play().catch(err => console.warn('[Audio] game sound blocked:', err));
    return () => { promise.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {}); };
  }, [gamePhase, gameOver, isMuted]);

  // Elapsed-time counter — starts after the countdown, stops on game over
  useEffect(() => {
    if (gameOver || gamePhase !== 'playing') return;
    const id = setInterval(() => setTimeElapsed(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [gameOver, gamePhase]);

  // The image shown in this round (wraps around if rounds > images length)
  const currentImage = roundImages[(currentRound - 1) % roundImages.length];

  /**
   * Check whether the board is fully solved: every cell must hold the piece
   * whose index equals the cell's own index (piece 0 in cell 0, etc.).
   * @param {(number|null)[]} board
   * @returns {boolean}
   */
  const isWin = (board) => board.every((piece, idx) => piece !== null && piece === idx);

  /**
   * Reset the board for the next round without stopping the timer.
   */
  const advanceToNextRound = () => {
    setCurrentRound(r => r + 1);
    setSourcePieces(shuffle(Array.from({ length: pieces }, (_, i) => i)));
    setBoardPieces(Array(pieces).fill(null));
    setSelectedPieceIndex(null);
  };

  /**
   * Called when the last round is solved. Saves the score via the API and
   * transitions to the game-over screen.
   * @param {number} finalSeconds - Total elapsed seconds across all rounds.
   */
  const finishGame = async (finalSeconds) => {
    setGameOver(true);
    setSaving(true);
    try {
      const saveResult = await scoreService.setScore(user.userId, user.userRole, pieces, rounds, formatHHMMSS(finalSeconds));
      setIsNewRecord(saveResult?.isNewRecord ?? false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Toggle selection of a piece in the source bank.
   * Clicking the same piece again deselects it.
   * @param {number} idx - Index in the sourcePieces array.
   */
  const handleSourceClick = (idx) => {
    setSelectedPieceIndex(prev => (prev === idx ? null : idx));
  };

  /**
   * Handle a click on any board cell.
   * - If the cell is occupied, the piece is returned to the bank.
   * - If a piece is selected in the bank, it is placed in the cell.
   * - If the resulting board is solved, advance the round or finish the game.
   * @param {number} cellIndex - The cell's position in the board array.
   */
  const handleBoardClick = (cellIndex) => {
    if (boardPieces[cellIndex] !== null) {
      // Occupied cell — return the piece to the source bank
      const returned = boardPieces[cellIndex];
      const newBoard = [...boardPieces];
      newBoard[cellIndex] = null;
      setBoardPieces(newBoard);
      setSourcePieces(prev => [...prev, returned]);
      setSelectedPieceIndex(null);
      return;
    }

    if (selectedPieceIndex === null) return; // nothing selected to place

    // Place the selected piece into the clicked cell
    const correctIndex = sourcePieces[selectedPieceIndex];
    const newBoard = [...boardPieces];
    newBoard[cellIndex] = correctIndex;

    setSourcePieces(sourcePieces.filter((_, i) => i !== selectedPieceIndex));
    setBoardPieces(newBoard);
    setSelectedPieceIndex(null);

    if (isWin(newBoard)) {
      if (currentRound >= rounds) {
        finishGame(timeElapsed);
      } else {
        advanceToNextRound();
      }
    }
  };

  // ── Game-over screen ──────────────────────────────────────────────────────

  if (gameOver) {
    return (
      <div className="puzzle-game-over">
        <div className="puzzle-game-over__icon">🧩</div>
        <h2>Puzzle Complete!</h2>
        {!saving && isNewRecord && <p className="puzzle-new-record">🏆 New Record!</p>}
        <p className="puzzle-game-over__sub">
          {rounds} round{rounds !== 1 ? 's' : ''} · {pieces} pieces
        </p>
        <div className="puzzle-game-over__time">{formatHHMMSS(timeElapsed)}</div>
        <p className="puzzle-game-over__label">Total Time</p>
        {saving    && <p className="puzzle-status">Saving score…</p>}
        {saveError && <p className="puzzle-error">{saveError}</p>}
        {!saving   && <button className="btn-play" onClick={onBack}>Back to Dashboard</button>}
      </div>
    );
  }

  // ── Active game ───────────────────────────────────────────────────────────

  return (
    <div className="puzzle-game">
      {gamePhase === 'countdown' && (
        <CountdownOverlay onDone={() => setGamePhase('playing')} />
      )}

      <div className="puzzle-game__header">
        <span className="puzzle-game__round">Round {currentRound} / {rounds}</span>
        <span className="puzzle-game__timer">{formatMMSS(timeElapsed)}</span>
        <button className="btn-cancel puzzle-game__quit" onClick={onBack}>Quit</button>
      </div>

      <SharedBoard
        gridSize={gridSize}
        cols={cols}
        rows={rows}
        cellW={cellW}
        cellH={cellH}
        currentImage={currentImage}
        sourcePieces={sourcePieces}
        boardPieces={boardPieces}
        pieces={pieces}
        selectedPieceIndex={selectedPieceIndex}
        onSourceClick={handleSourceClick}
        onBoardClick={handleBoardClick}
      />

      {selectedPieceIndex !== null && (
        <p className="puzzle-hint">
          Click an empty cell on the Board to place the selected piece, or click it again to deselect.
        </p>
      )}
    </div>
  );
}
