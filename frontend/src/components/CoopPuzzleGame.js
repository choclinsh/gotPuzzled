/**
 * CoopPuzzleGame.js — co-operative puzzle game component.
 *
 * Renders the active game phase for two players sharing one board. Players
 * alternate turns controlled by `currentTurn` (a socket ID). The active
 * player can place or remove pieces; the other sees the board locked.
 *
 * All board state transitions arrive from the server via Socket.IO events:
 *   turn_update      → a move was made; refresh board + source bank + turn
 *   next_round       → this round finished; start the next with fresh state
 *   coop_victory     → all rounds done; save score and show victory screen
 *   partner_disconnected → partner left; show the "partner left" screen
 *
 * @param {object}            props
 * @param {import('socket.io-client').Socket} props.socket    - Active socket connection.
 * @param {object}            props.matchData  - Payload received from 'match_started'.
 * @param {Function}          props.onBack     - Called when the game ends or is quit.
 */
import React, { useState, useEffect, useContext, useRef } from 'react';
import UserContext from '../context/UserContext';
import { useVolume } from '../context/VolumeContext';
import { scoreService } from '../services/scoreService';
import SharedBoard from './SharedBoard';
import { PIECE_CONFIGS, formatHHMMSS, formatMMSS, useGridSize, getVolume, getMuted } from '../utils/puzzleUtils';
import './PuzzleGame.css';

export default function CoopPuzzleGame({ socket, matchData, onBack }) {
  const { user } = useContext(UserContext);
  const { isMuted } = useVolume();
  const { roomId, pieces, rounds, players, images: matchImages } = matchData;

  // Derive the row/col layout from the piece count
  const { rows, cols } = PIECE_CONFIGS[pieces] ?? {
    rows: Math.round(Math.sqrt(pieces)),
    cols: Math.round(Math.sqrt(pieces)),
  };

  // Responsive grid size — updates on window resize via the shared hook
  const gridSize = useGridSize();
  const cellW = gridSize / cols;
  const cellH = gridSize / rows;

  // Initialise from the server's match_started payload so both clients start in sync
  const [currentImageIndex, setCurrentImageIndex] = useState(matchData.imageIndex);
  const [sourcePieces, setSourcePieces]     = useState(matchData.sourcePieces);
  const [boardPieces, setBoardPieces]       = useState(matchData.boardState);
  const [currentTurn, setCurrentTurn]       = useState(matchData.currentTurn);
  const [selectedPieceIndex, setSelectedPieceIndex] = useState(null);
  const [currentRound, setCurrentRound]     = useState(matchData.currentRound ?? 1);
  const [timeElapsed, setTimeElapsed]       = useState(0);

  const [gameOver, setGameOver]       = useState(false);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [finalTime, setFinalTime]     = useState(null);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [isNewRecord, setIsNewRecord] = useState(false);

  // True only when this client's socket ID matches the server's currentTurn
  const isMyTurn = currentTurn === socket.id;

  // Victory / new-record sound — plays once after the score is saved.
  // victoryAudioRef lets the separate isMuted watcher pause it mid-playback
  // without putting isMuted in this effect's deps (which would cause StrictMode
  // to kill the sound on its cleanup pass before it can be heard).
  const victoryRef = useRef(null); // { audio, promise }
  useEffect(() => {
    if (!gameOver || saving || getMuted()) return;
    const src = isNewRecord ? '/assets/new_record_sound.mp3' : '/assets/victory_sound.mp3';
    const audio = new Audio(src);
    audio.volume = getVolume();
    const promise = audio.play().catch(err => console.warn('[Audio] victory sound blocked:', err));
    victoryRef.current = { audio, promise };
    return () => {
      promise.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
      victoryRef.current = null;
    };
  }, [gameOver, saving, isNewRecord]);

  useEffect(() => {
    if (isMuted && victoryRef.current) {
      const { audio, promise } = victoryRef.current;
      promise.then(() => { audio.pause(); }).catch(() => {});
    }
  }, [isMuted]);

  // Game sound — loops while playing; pauses immediately when isMuted changes.
  // isMuted IS in deps so the effect re-runs on mute/unmute, allowing cleanup to pause the loop.
  useEffect(() => {
    if (gameOver || partnerLeft || isMuted) return;
    const audio = new Audio('/assets/game_sound.mp3');
    audio.volume = getVolume();
    audio.loop = true;
    const promise = audio.play().catch(err => console.warn('[Audio] game sound blocked:', err));
    return () => { promise.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {}); };
  }, [gameOver, partnerLeft, isMuted]);

  // Elapsed-time counter — stops when the game ends
  useEffect(() => {
    if (gameOver || partnerLeft) return;
    const id = setInterval(() => setTimeElapsed(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [gameOver, partnerLeft]);

  // ── Socket event listeners ─────────────────────────────────────────────────

  useEffect(() => {
    /**
     * Server confirmed a move. Sync board state and turn ownership from the
     * authoritative server state (prevents client-side divergence).
     */
    const onTurnUpdate = ({ boardState, sourcePieces: sp, currentTurn: ct }) => {
      setBoardPieces(boardState);
      setSourcePieces(sp);
      setCurrentTurn(ct);
      setSelectedPieceIndex(null);
    };

    /**
     * Current round solved; server sends next-round state with fresh piece bank.
     */
    const onNextRound = ({ currentRound: cr, imageIndex: img, sourcePieces: sp, boardState: bs, currentTurn: ct }) => {
      setCurrentRound(cr);
      setCurrentImageIndex(img);
      setBoardPieces(bs);
      setSourcePieces(sp);
      setCurrentTurn(ct);
      setSelectedPieceIndex(null);
    };

    /**
     * All rounds complete. Save the team score and display the victory screen.
     * @param {{ finalTime: number }} payload - Server-computed elapsed seconds.
     */
    const onCoopVictory = async ({ finalTime: ft }) => {
      setGameOver(true);
      setFinalTime(ft);
      setSaving(true);
      try {
        const saveResult = await scoreService.setScore(user.userId, user.userRole, pieces, rounds, formatHHMMSS(ft));
        setIsNewRecord(saveResult?.isNewRecord ?? false);
      } catch (err) {
        setSaveError(err.message);
      } finally {
        setSaving(false);
      }
    };

    const onPartnerDisconnected = () => setPartnerLeft(true);

    socket.on('turn_update',          onTurnUpdate);
    socket.on('next_round',           onNextRound);
    socket.on('coop_victory',         onCoopVictory);
    socket.on('partner_disconnected', onPartnerDisconnected);

    return () => {
      socket.off('turn_update',          onTurnUpdate);
      socket.off('next_round',           onNextRound);
      socket.off('coop_victory',         onCoopVictory);
      socket.off('partner_disconnected', onPartnerDisconnected);
    };
  }, [socket, user, pieces, rounds]);

  const partner = players.find(p => p.socketId !== socket.id);
  const placedCount = boardPieces.filter(p => p !== null).length;

  /**
   * Toggle selection of a source-bank piece. Only the active player can select.
   * @param {number} idx - Index in the sourcePieces array.
   */
  const handleSourceClick = (idx) => {
    if (!isMyTurn) return;
    setSelectedPieceIndex(prev => (prev === idx ? null : idx));
  };

  /**
   * Handle a click on any board cell during the active player's turn.
   * - Occupied cell → emit `remove_piece` and return the piece to the bank locally.
   * - Empty cell with selection → emit `make_move` so the server validates and broadcasts.
   * @param {number} cellIndex - The cell's position in the board array.
   */
  const handleBoardClick = (cellIndex) => {
    if (!isMyTurn) return;

    if (boardPieces[cellIndex] !== null) {
      // Optimistically clear the cell locally, then tell the server
      const returned = boardPieces[cellIndex];
      const newBoard = [...boardPieces];
      newBoard[cellIndex] = null;
      setBoardPieces(newBoard);
      setSourcePieces(prev => [...prev, returned]);
      setSelectedPieceIndex(null);
      socket.emit('remove_piece', { roomId, cellIndex });
      return;
    }

    if (selectedPieceIndex === null) return;

    // Send the move to the server; board state will be confirmed via turn_update
    const correctIndex = sourcePieces[selectedPieceIndex];
    setSelectedPieceIndex(null);
    socket.emit('make_move', { roomId, cellIndex, correctIndex });
  };

  // ── Partner left ──────────────────────────────────────────────────────────

  if (partnerLeft) {
    return (
      <div className="puzzle-game-over">
        <div className="puzzle-game-over__icon">😢</div>
        <h2>Partner Disconnected</h2>
        <p className="puzzle-game-over__sub">Your partner left the game. No score was saved.</p>
        <button className="btn-play" onClick={onBack}>Back to Dashboard</button>
      </div>
    );
  }

  // ── Victory screen ────────────────────────────────────────────────────────

  if (gameOver) {
    return (
      <div className="puzzle-game-over">
        <div className="puzzle-game-over__icon">🏆</div>
        <h2>Team Victory!</h2>
        {!saving && isNewRecord && <p className="puzzle-new-record">🏆 New Record!</p>}
        <p className="puzzle-game-over__sub">
          You and {partner?.username ?? 'your partner'} solved {rounds} round{rounds !== 1 ? 's' : ''} together!
        </p>
        <div className="puzzle-game-over__time">{formatHHMMSS(finalTime)}</div>
        <p className="puzzle-game-over__label">Team Time</p>
        {saving    && <p className="puzzle-status">Saving score…</p>}
        {saveError && <p className="puzzle-error">{saveError}</p>}
        {!saving   && <button className="btn-play" onClick={onBack}>Back to Dashboard</button>}
      </div>
    );
  }

  // ── Active game ───────────────────────────────────────────────────────────

  return (
    <div className="puzzle-game">
      <div className="puzzle-game__header">
        <span className="puzzle-game__round">Round {currentRound} / {rounds}</span>
        <span className="puzzle-game__timer">{formatMMSS(timeElapsed)}</span>
        <button className="btn-cancel puzzle-game__quit" onClick={onBack}>Quit</button>
      </div>

      <div className="coop-info-bar">
        <span className={`coop-turn-badge${isMyTurn ? ' coop-turn-badge--mine' : ''}`}>
          {isMyTurn ? 'Your Turn!' : "Partner's Turn..."}
        </span>
        <span className="coop-progress">Progress: {placedCount} / {pieces}</span>
        <span className="coop-partner">Partner: {partner?.username ?? '...'}</span>
      </div>

      <SharedBoard
        gridSize={gridSize}
        cols={cols}
        rows={rows}
        cellW={cellW}
        cellH={cellH}
        currentImage={matchImages[currentImageIndex % matchImages.length]}
        sourcePieces={sourcePieces}
        boardPieces={boardPieces}
        pieces={pieces}
        selectedPieceIndex={selectedPieceIndex}
        onSourceClick={handleSourceClick}
        onBoardClick={handleBoardClick}
        isLocked={!isMyTurn}
      />

      {isMyTurn && selectedPieceIndex !== null && (
        <p className="puzzle-hint">
          Click an empty cell on the Board to place the selected piece, or click it again to deselect.
        </p>
      )}
      {!isMyTurn && (
        <p className="puzzle-hint">Waiting for {partner?.username ?? 'your partner'} to place a piece…</p>
      )}
    </div>
  );
}
