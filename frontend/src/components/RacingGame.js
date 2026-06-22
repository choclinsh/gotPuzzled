/**
 * RacingGame.js — head-to-head racing puzzle component.
 *
 * Each player solves their own independent puzzle board as fast as possible.
 * Progress is reported to the server after each piece placement so the opponent's
 * progress bar can update in real time. The first player to finish all rounds
 * emits `submit_race_win`; the server validates and broadcasts `race_over`.
 *
 * Socket events listened for:
 *   opponent_progress_update  → update the opponent's progress bar
 *   race_over                 → game finished; save score (winners only) and show result
 *   race_opponent_disconnected → opponent left; grant automatic win
 *
 * @param {object}            props
 * @param {import('socket.io-client').Socket} props.socket    - Active socket connection.
 * @param {object}            props.matchData  - Payload received from 'race_started'.
 * @param {Function}          props.onBack     - Called when the race ends or is quit.
 */
import React, { useState, useEffect, useRef, useContext } from 'react';
import UserContext from '../context/UserContext';
import { useVolume } from '../context/VolumeContext';
import { scoreService } from '../services/scoreService';
import SharedBoard from './SharedBoard';
import { PIECE_CONFIGS, shuffle, formatHHMMSS, formatMMSS, useGridSize, getVolume, getMuted } from '../utils/puzzleUtils';
import './RacingGame.css';

export default function RacingGame({ socket, matchData, onBack }) {
  const { user } = useContext(UserContext);
  const { isMuted } = useVolume();
  const { roomId, pieces, rounds, images: matchImages, sourcePieces: initialSource, players } = matchData;

  // Derive the row/col layout from the piece count
  const { rows, cols } = PIECE_CONFIGS[pieces] ?? {
    rows: Math.round(Math.sqrt(pieces)),
    cols: Math.round(Math.sqrt(pieces)),
  };

  // Responsive grid size — updates on window resize via the shared hook
  const gridSize = useGridSize();
  const cellW = gridSize / cols;
  const cellH = gridSize / rows;

  // ── Per-round board state ─────────────────────────────────────────────────

  const [roundIndex, setRoundIndex]     = useState(0);
  const [sourcePieces, setSourcePieces] = useState(initialSource);
  const [boardPieces, setBoardPieces]   = useState(() => Array(pieces).fill(null));
  const [selectedPieceIndex, setSelectedPieceIndex] = useState(null);

  // Running total of pieces correctly placed in rounds already completed
  const [completedPieces, setCompletedPieces] = useState(0);

  // ── Progress bars ─────────────────────────────────────────────────────────

  const totalPieces = pieces * rounds;
  const [myProgress, setMyProgress]             = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);

  // ── Timer ─────────────────────────────────────────────────────────────────

  // Use a ref for the source of truth so emitProgress() always reads the latest
  // value without needing to be re-created on every tick
  const timeElapsedRef = useRef(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // ── Result / score-save state ─────────────────────────────────────────────

  const [result, setResult]       = useState(null); // null | { won, finalTime, opponentLeft }
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Guard against the unlikely case where both clients emit submit_race_win in the same tick
  const winEmittedRef = useRef(false);

  // Victory / new-record sound — plays once after saving (winners only).
  const victoryRef = useRef(null); // { audio, promise }
  useEffect(() => {
    console.log('[Audio:race-victory] effect fired | result=', result, '| saving=', saving, '| isNewRecord=', isNewRecord, '| getMuted()=', getMuted(), '| getVolume()=', getVolume());
    if (!result?.won || saving || getMuted()) {
      console.log('[Audio:race-victory] SKIPPED — won:', result?.won, '| saving:', saving, '| muted:', getMuted());
      return;
    }
    const src = isNewRecord ? '/assets/new_record_sound.mp3' : '/assets/victory_sound.mp3';
    console.log('[Audio:race-victory] playing', src);
    const audio = new Audio(src);
    audio.volume = getVolume();
    const promise = audio.play()
      .then(() => console.log('[Audio:race-victory] play() resolved ✓'))
      .catch(err => console.warn('[Audio:race-victory] play() REJECTED:', err));
    victoryRef.current = { audio, promise };
    return () => {
      console.log('[Audio:race-victory] CLEANUP — scheduling pause after play() settles');
      promise.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
      victoryRef.current = null;
    };
  }, [result, saving, isNewRecord]);

  useEffect(() => {
    console.log('[Audio:race-victory] isMuted watcher | isMuted=', isMuted, '| ref=', !!victoryRef.current);
    if (isMuted && victoryRef.current) {
      const { audio, promise } = victoryRef.current;
      promise.then(() => { audio.pause(); }).catch(() => {});
    }
  }, [isMuted]);

  // Loss sound — plays once when this client did not win.
  const lossRef = useRef(null); // { audio, promise }
  useEffect(() => {
    console.log('[Audio:race-loss] effect fired | result=', result, '| getMuted()=', getMuted(), '| getVolume()=', getVolume());
    if (!result || result.won || getMuted()) {
      console.log('[Audio:race-loss] SKIPPED — result:', result, '| muted:', getMuted());
      return;
    }
    console.log('[Audio:race-loss] playing lost_match_sound.mp3');
    const audio = new Audio('/assets/lost_match_sound.mp3');
    audio.volume = getVolume();
    const promise = audio.play()
      .then(() => console.log('[Audio:race-loss] play() resolved ✓'))
      .catch(err => console.warn('[Audio:race-loss] play() REJECTED:', err));
    lossRef.current = { audio, promise };
    return () => {
      console.log('[Audio:race-loss] CLEANUP — scheduling pause after play() settles');
      promise.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
      lossRef.current = null;
    };
  }, [result]);

  useEffect(() => {
    console.log('[Audio:race-loss] isMuted watcher | isMuted=', isMuted, '| ref=', !!lossRef.current);
    if (isMuted && lossRef.current) {
      const { audio, promise } = lossRef.current;
      promise.then(() => { audio.pause(); }).catch(() => {});
    }
  }, [isMuted]);

  // Game sound — loops while the race is active; pauses immediately when isMuted changes.
  // isMuted IS in deps so the effect re-runs on mute/unmute, allowing cleanup to pause the loop.
  useEffect(() => {
    if (result || isMuted) return;
    const audio = new Audio('/assets/game_sound.mp3');
    audio.volume = getVolume();
    audio.loop = true;
    const promise = audio.play().catch(err => console.warn('[Audio] game sound blocked:', err));
    return () => { promise.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {}); };
  }, [result, isMuted]);

  // Elapsed-time counter — stops when result is set
  useEffect(() => {
    if (result) return;
    const id = setInterval(() => {
      timeElapsedRef.current += 1;
      setTimeElapsed(timeElapsedRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [result]);

  // ── Socket listeners ──────────────────────────────────────────────────────

  useEffect(() => {
    /** Opponent placed a piece — update their progress bar. */
    const onOpponentProgress = ({ piecesCorrect }) => setOpponentProgress(piecesCorrect);

    /**
     * Race decided by the server. Save score if this client won, then show result.
     * @param {{ winnerId: string, finalTime: number }} payload
     */
    const onRaceOver = async ({ winnerId, finalTime }) => {
      const won = winnerId === socket.id;
      setResult({ won, finalTime, opponentLeft: false });
      if (won) {
        setSaving(true);
        try {
          const saveResult = await scoreService.setScore(user.userId, user.userRole, pieces, rounds, formatHHMMSS(finalTime));
          setIsNewRecord(saveResult?.isNewRecord ?? false);
        } catch (err) {
          setSaveError(err.message);
        } finally {
          setSaving(false);
        }
      }
    };

    /** Opponent disconnected — grant automatic win using the local elapsed time. */
    const onOpponentDisconnected = () => {
      setResult({ won: true, finalTime: timeElapsedRef.current, opponentLeft: true });
    };

    socket.on('opponent_progress_update',   onOpponentProgress);
    socket.on('race_over',                  onRaceOver);
    socket.on('race_opponent_disconnected', onOpponentDisconnected);

    return () => {
      socket.off('opponent_progress_update',   onOpponentProgress);
      socket.off('race_over',                  onRaceOver);
      socket.off('race_opponent_disconnected', onOpponentDisconnected);
    };
  }, [socket, user, pieces, rounds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Count correct placements in the current board, update the local progress
   * bar state, and notify the server so the opponent's bar can sync.
   * @param {(number|null)[]} board - Current board after a click.
   * @returns {number} Number of correctly placed pieces in this round only.
   */
  const emitProgress = (board) => {
    const correctThisRound = board.filter((p, i) => p === i).length;
    const total = completedPieces + correctThisRound;
    setMyProgress(total);
    socket.emit('update_race_progress', { roomId, piecesCorrect: total });
    return correctThisRound;
  };

  // ── Interaction handlers ──────────────────────────────────────────────────

  /**
   * Toggle selection of a piece in the source bank.
   * @param {number} idx - Index in the sourcePieces array.
   */
  const handleSourceClick = (idx) => {
    setSelectedPieceIndex(prev => (prev === idx ? null : idx));
  };

  /**
   * Handle a click on any board cell.
   * - Occupied cell → return piece to bank and update progress.
   * - Empty cell with selection → place piece; if round complete, advance or win.
   * @param {number} cellIndex - The cell's position in the board array.
   */
  const handleBoardClick = (cellIndex) => {
    if (boardPieces[cellIndex] !== null) {
      // Return the piece to the bank
      const returned = boardPieces[cellIndex];
      const newBoard = [...boardPieces];
      newBoard[cellIndex] = null;
      setBoardPieces(newBoard);
      setSourcePieces(prev => [...prev, returned]);
      setSelectedPieceIndex(null);
      emitProgress(newBoard);
      return;
    }

    if (selectedPieceIndex === null) return;

    // Place the selected piece
    const correctIndex = sourcePieces[selectedPieceIndex];
    const newSource    = sourcePieces.filter((_, i) => i !== selectedPieceIndex);
    const newBoard     = [...boardPieces];
    newBoard[cellIndex] = correctIndex;

    setSourcePieces(newSource);
    setBoardPieces(newBoard);
    setSelectedPieceIndex(null);

    const correctThisRound = emitProgress(newBoard);

    // Round is complete when every cell holds its correct piece
    if (correctThisRound === pieces) {
      if (roundIndex >= rounds - 1) {
        // Final round finished — claim the win (guard against double emit)
        if (!winEmittedRef.current) {
          winEmittedRef.current = true;
          socket.emit('submit_race_win', { roomId });
        }
      } else {
        // Advance to next round; each client shuffles their own piece bank
        setCompletedPieces(prev => prev + pieces);
        setRoundIndex(r => r + 1);
        setSourcePieces(shuffle(Array.from({ length: pieces }, (_, i) => i)));
        setBoardPieces(Array(pieces).fill(null));
        setSelectedPieceIndex(null);
      }
    }
  };

  // ── Result screen ─────────────────────────────────────────────────────────

  const opponent = players.find(p => p.socketId !== socket.id);

  if (result) {
    const showTime = result.won && !result.opponentLeft;
    return (
      <div className="race-result">
        <div className="race-result__icon">{result.won ? '🏆' : '😤'}</div>
        <h2>{result.won ? 'Victory!' : 'Defeat!'}</h2>
        <p className="race-result__sub">
          {result.opponentLeft
            ? `${opponent?.username ?? 'Opponent'} disconnected — you win by default.`
            : result.won
              ? `You beat ${opponent?.username ?? 'your opponent'}!`
              : `${opponent?.username ?? 'Your opponent'} finished first. Better luck next time!`}
        </p>
        {showTime && (
          <>
            <div className="race-result__time">{formatHHMMSS(result.finalTime)}</div>
            <p className="race-result__label">Your Time</p>
          </>
        )}
        <div className="race-result__actions">
          {result.won && !saving && isNewRecord && <p className="puzzle-new-record">🏆 New Record!</p>}
          {saving    && <p className="puzzle-status">Saving score…</p>}
          {saveError && <p className="puzzle-error">{saveError}</p>}
          {!saving   && <button className="btn-play" onClick={onBack}>Back to Dashboard</button>}
        </div>
      </div>
    );
  }

  // ── Active race ───────────────────────────────────────────────────────────

  const myPct = Math.round((myProgress / totalPieces) * 100);
  const opPct = Math.round((opponentProgress / totalPieces) * 100);
  const currentImage = matchImages[roundIndex % matchImages.length];

  return (
    <div className="puzzle-game">
      {/* ── Header ── */}
      <div className="puzzle-game__header">
        <span className="puzzle-game__round">
          🏁 Race · Round {roundIndex + 1} / {rounds}
        </span>
        <span className="puzzle-game__timer">{formatMMSS(timeElapsed)}</span>
        <button className="btn-cancel puzzle-game__quit" onClick={onBack}>Quit</button>
      </div>

      {/* ── Real-time progress bars ── */}
      <div className="race-progress">
        <div className="race-progress__row">
          <span className="race-progress__label">You</span>
          <div className="race-progress__bar-bg">
            <div className="race-progress__bar-fill" style={{ width: `${myPct}%` }} />
          </div>
          <span className="race-progress__count">{myProgress}/{totalPieces}</span>
        </div>
        <div className="race-progress__row">
          <span className="race-progress__label">{opponent?.username ?? 'Opponent'}</span>
          <div className="race-progress__bar-bg">
            <div className="race-progress__bar-fill race-progress__bar-fill--opponent" style={{ width: `${opPct}%` }} />
          </div>
          <span className="race-progress__count">{opponentProgress}/{totalPieces}</span>
        </div>
      </div>

      {/* ── Puzzle grids ── */}
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
        <p className="puzzle-hint">Click an empty cell on the Board to place the selected piece, or click it again to deselect.</p>
      )}
    </div>
  );
}
