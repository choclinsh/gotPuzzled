/**
 * Dashboard.js — main hub after login.
 *
 * Shows the player's personal statistics (top pieces, top rounds, fastest time)
 * and the game-mode launcher. The launcher follows this flow for every mode:
 *
 *   1. User types a free-text topic and picks pieces/rounds.
 *   2. "Play" is clicked → AI pipeline refines the raw topic into a keyword.
 *   3a. Solo  → backend fetches Pexels images, PuzzleGame launches.
 *   3b. Co-op → CoopFlow connects to Socket.IO, matchmaking begins.
 *   3c. Race  → RacingFlow connects to Socket.IO, matchmaking begins.
 *
 * Stats reload automatically after every game session ends.
 */
import React, { useState, useEffect, useContext, useCallback } from 'react';
import VolumeContext from '../context/VolumeContext';
import StatCard from '../components/StatCard';
import PuzzleGame from '../components/PuzzleGame';
import CoopFlow from '../components/CoopFlow';
import RacingFlow from '../components/RacingFlow';
import HowToPlayModal from '../components/HowToPlayModal';
import UserContext from '../context/UserContext';
import { scoreService } from '../services/scoreService';
import { imageService } from '../services/imageService';
import { aiService } from '../services/aiService';
import '../App.css';

const PIECE_OPTIONS = [6, 12, 25];
const ROUND_OPTIONS = [1, 2, 3, 4, 5];

export default function Dashboard() {
  const { user } = useContext(UserContext);
  const { setGameActive } = useContext(VolumeContext);

  const [stats, setStats]   = useState(null);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(true);

  const [pieces, setPieces] = useState(6);
  const [rounds, setRounds] = useState(3);
  const [mode, setMode] = useState(null); // null | 'solo' | 'coop' | 'race'

  const [topic, setTopic] = useState('');
  const [refinedTopic, setRefinedTopic] = useState('');
  const [soloImages, setSoloImages] = useState(null);  // only used for solo
  const [activating, setActivating] = useState(null);  // 'solo' | 'coop' | 'race'
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [topicError, setTopicError] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Signal Layout's global audio player to pause/resume as the game mode changes.
  // mode !== null means a game is active; mode === null means we're on the menu.
  useEffect(() => {
    setGameActive(mode !== null);
  }, [mode, setGameActive]);

  /**
   * Fetch the current user's dashboard stats from the API and store them in state.
   * Returns null (not an error) when the user has no scores yet — the UI shows zeros.
   */
  const loadStats = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const data = await scoreService.getPersonalStats(user.userId, user.userRole);
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleGameEnd = async () => {
    setMode(null);
    setSoloImages(null);
    setTopic('');
    setRefinedTopic('');
    setTopicError('');
    setLoading(true);
    await loadStats();
  };

  /**
   * Launch a game in the chosen mode.
   * Step 1: AI refines the raw topic (gracefully degrades to raw text on failure).
   * Step 2a (solo): fetch images immediately, then render PuzzleGame.
   * Step 2b (coop/race): pass the refined topic to the flow component; the server
   *   fetches images after a match is found so both players' topics contribute.
   *
   * @param {'solo'|'coop'|'race'} selectedMode - The game mode to launch.
   */
  const handlePlay = async (selectedMode) => {
    if (!topic.trim() || activating) return;
    setTopicError('');
    setActivating(selectedMode);

    // AI extraction step — refine raw free-text into a clean image search query
    let extracted = topic.trim();
    setAiAnalyzing(true);
    try {
      extracted = await aiService.extractTopic(topic.trim());
    } catch (err) {
      // Extraction failure is non-fatal: the raw topic is used as the fallback
      console.warn('[AI] extraction failed, using raw topic:', err.message);
    } finally {
      setAiAnalyzing(false);
    }

    setRefinedTopic(extracted);

    if (selectedMode === 'solo') {
      try {
        const urls = await imageService.generateImages(extracted, rounds);
        setSoloImages(urls);
        setMode('solo');
      } catch (err) {
        setTopicError(err.message);
      } finally {
        setActivating(null);
      }
    } else {
      // Co-op / race: the server fetches images after the match is found
      setMode(selectedMode);
      setActivating(null);
    }
  };

  if (loading) return <div>Loading dashboard… ⏳</div>;

  if (mode === 'solo' && soloImages) {
    return (
      <div className="dashboard-wrapper">
        <PuzzleGame pieces={pieces} rounds={rounds} onBack={handleGameEnd} images={soloImages} />
      </div>
    );
  }

  if (mode === 'coop') {
    return (
      <div className="dashboard-wrapper">
        <CoopFlow pieces={pieces} rounds={rounds} topic={refinedTopic} onBack={handleGameEnd} />
      </div>
    );
  }

  if (mode === 'race') {
    return (
      <div className="dashboard-wrapper">
        <RacingFlow pieces={pieces} rounds={rounds} topic={refinedTopic} onBack={handleGameEnd} />
      </div>
    );
  }

  const canPlay = topic.trim().length > 0 && !activating;

  return (
    <div className="dashboard-wrapper dashboard-enter">
      <h2>Welcome to your Puzzle Space, {user?.firstName}!</h2>
      {error && <p className="error-message">{error}</p>}

      <div className="stats-row">
        <StatCard
          title="Largest Puzzle Solved"
          value={`${stats?.topPieces ?? 0} Pieces`}
          icon="🧩"
          description="Your ultimate scale record!"
        />
        <StatCard
          title="Most Intense Match"
          value={`${stats?.topRounds ?? 0} Rounds`}
          icon="🔄"
          description="Total continuous turns survived"
        />
        <StatCard
          title="Personal Best Speed"
          value={stats?.fastestScore ?? 'N/A'}
          icon="⏱️"
          description="Your fastest record time"
        />
      </div>

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}

      <section className="game-menu">
        <div className="game-menu__heading">
          <h3 className="game-menu__title">Start a New Puzzle</h3>
          <button className="btn-how-to-play" onClick={() => setShowHowToPlay(true)}>
            ? How to Play
          </button>
        </div>
        <p className="game-menu__subtitle">Pick a topic and challenge to race the clock.</p>

        {/* Topic input — required before any mode can start */}
        <div className="game-menu__group">
          <span className="game-menu__label">Topic</span>
          <input
            type="text"
            className="topic-input"
            placeholder='Describe the kind of puzzle you want to play…'
            value={topic}
            onChange={e => { setTopic(e.target.value); setTopicError(''); }}
            onKeyDown={e => { if (e.key === 'Enter' && canPlay) handlePlay('solo'); }}
          />
        </div>
        {topicError && <p className="topic-error">{topicError}</p>}

        <div className="game-menu__group">
          <span className="game-menu__label">Pieces</span>
          <div className="option-pills">
            {PIECE_OPTIONS.map(p => (
              <button
                key={p}
                type="button"
                className={`pill ${pieces === p ? 'pill--active' : ''}`}
                onClick={() => setPieces(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="game-menu__group">
          <span className="game-menu__label">Rounds</span>
          <div className="option-pills">
            {ROUND_OPTIONS.map(r => (
              <button
                key={r}
                type="button"
                className={`pill ${rounds === r ? 'pill--active' : ''}`}
                onClick={() => setRounds(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="game-menu__actions">
          <button
            type="button"
            className="btn-play"
            disabled={!canPlay}
            onClick={() => handlePlay('solo')}
          >
            {activating === 'solo'
              ? (aiAnalyzing ? 'AI is analyzing your request…' : 'Fetching images…')
              : `▶ Play Solo · ${pieces} pieces · ${rounds} rounds`}
          </button>
          <button
            type="button"
            className="btn-coop"
            disabled={!canPlay}
            onClick={() => handlePlay('coop')}
          >
            {activating === 'coop'
              ? (aiAnalyzing ? 'AI is analyzing your request…' : 'Starting…')
              : `🤝 Play Co-op · ${pieces} pieces`}
          </button>
          <button
            type="button"
            className="btn-race"
            disabled={!canPlay}
            onClick={() => handlePlay('race')}
          >
            {activating === 'race'
              ? (aiAnalyzing ? 'AI is analyzing your request…' : 'Starting…')
              : `🏁 Live Race · ${pieces} pieces`}
          </button>
        </div>

        {!topic.trim() && (
          <p className="game-menu__notice">Enter a topic above to unlock all game modes.</p>
        )}
      </section>
    </div>
  );
}
