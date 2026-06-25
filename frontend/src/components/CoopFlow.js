/**
 * CoopFlow.js — matchmaking and lifecycle manager for the Co-op game mode.
 *
 * Manages the socket connection and the phase state machine:
 *   'lobby'     → waiting for the server to find a partner (shows spinner)
 *   'countdown' → match found; 3-2-1 countdown overlay plays
 *   'game'      → active CoopPuzzleGame
 *   'error'     → image fetch failed; shows error with a back button
 *
 * The socket is created on mount, emits `find_coop_match` on connect, and is
 * disconnected on unmount or when the player cancels/quits.
 *
 * @param {object}   props
 * @param {number}   props.pieces  - Number of puzzle pieces chosen on the Dashboard.
 * @param {number}   props.rounds  - Number of rounds chosen on the Dashboard.
 * @param {string}   props.topic   - AI-refined image search topic.
 * @param {Function} props.onBack  - Called when the player leaves the flow (back to Dashboard).
 */
import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import UserContext from '../context/UserContext';
import CoopPuzzleGame from './CoopPuzzleGame';
import CountdownOverlay from './CountdownOverlay';
import './PuzzleGame.css';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;


export default function CoopFlow({ pieces, rounds, topic, onBack }) {
  const { user } = useContext(UserContext);
  const socketRef = useRef(null);
  const [phase, setPhase] = useState('lobby');   // 'lobby' | 'countdown' | 'game' | 'error'
  const [matchData, setMatchData] = useState(null);
  const [matchError, setMatchError] = useState('');

  useEffect(() => {
    const s = io(SOCKET_URL);
    socketRef.current = s;

    // Queue up as soon as the socket connects; the server will either match us
    // immediately or emit `waiting_for_partner` to hold us in the lobby.
    s.on('connect', () => {
      s.emit('find_coop_match', {
        userId:   user.userId,
        username: user.firstName || 'Player',
        pieces,
        rounds,
        topic,
      });
    });

    s.on('waiting_for_partner', () => {
      // Server confirmed we're queued — lobby spinner is already visible, no action needed
    });

    s.on('match_started', (data) => {
      setMatchData(data);
      setPhase('countdown');
    });

    s.on('match_error', ({ message }) => {
      setMatchError(message);
      setPhase('error');
    });

    // Disconnect when this component unmounts (covers page navigation and quit)
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Player clicked "Cancel" while waiting in the lobby. Notify the server so
   * the spot in the queue is freed, then return to the Dashboard.
   */
  const handleCancel = () => {
    if (socketRef.current) {
      socketRef.current.emit('cancel_matchmaking');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    onBack();
  };

  /**
   * Called by CoopPuzzleGame when the game ends (victory or quit).
   * Disconnects the socket and hands control back to the Dashboard.
   */
  const handleGameEnd = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    onBack();
  };

  if (phase === 'error') {
    return (
      <div className="coop-lobby">
        <div className="coop-lobby__icon">⚠️</div>
        <h2>Could Not Load Images</h2>
        <p className="coop-lobby__sub">{matchError}</p>
        <button className="btn-cancel" onClick={handleCancel}>Back to Menu</button>
      </div>
    );
  }

  if (phase === 'countdown') {
    return <CountdownOverlay onDone={() => setPhase('game')} />;
  }

  if (phase === 'game' && matchData && socketRef.current) {
    return (
      <CoopPuzzleGame
        socket={socketRef.current}
        matchData={matchData}
        onBack={handleGameEnd}
      />
    );
  }

  return (
    <div className="coop-lobby">
      <div className="coop-lobby__icon">🔍</div>
      <h2>Finding a Partner…</h2>
      <p className="coop-lobby__sub">
        Searching for another player ready to solve a {pieces}-piece · {rounds}-round puzzle together.
      </p>
      <div className="coop-lobby__spinner" />
      <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
    </div>
  );
}
