import React, { useState, useEffect } from 'react';
import './HowToPlayModal.css';

const MODES = [
  {
    key: 'solo',
    label: 'Solo',
    icon: '▶',
    color: 'var(--accent)',
    rules: [
      'Enter a topic to generate puzzle images, then pick a piece count and number of rounds.',
      'After a 3-2-1 countdown, the puzzle board appears with all pieces scrambled in the bank.',
      'Click a piece in the bank to select it, then click an empty cell on the board to place it.',
      'Click a placed piece to return it to the bank and try a different position.',
      'Complete the board to finish a round. Keep going until all rounds are done.',
      'Your total time is saved — beat it on your next run to set a new personal best!',
    ],
  },
  {
    key: 'coop',
    label: 'Co-op',
    icon: '🤝',
    color: '#2d7d46',
    rules: [
      'You are matched with another online player. Both of you share one puzzle board.',
      'Players alternate turns — only the active player can place or remove a piece.',
      'Choose a piece from the bank, then click an empty board cell to place it.',
      'Clicking an already-placed piece returns it to the bank (useful for corrections).',
      'Complete all rounds together to record a team time.',
      'If your partner disconnects the game ends with no score saved.',
    ],
  },
  {
    key: 'race',
    label: 'Race',
    icon: '🏁',
    color: '#7b3fe4',
    rules: [
      'You are matched with an opponent. Each player gets their own independent board.',
      'Both players compete on their own puzzles simultaneously.',
      'Place pieces as fast as possible: select from the bank, click the board cell.',
      'Real-time progress bars show how far ahead or behind you are compared to your opponent.',
      'The first player to complete all rounds wins. Your time is saved only if you win.',
      'If your opponent disconnects mid-race, you are awarded an automatic victory.',
    ],
  },
];

export default function HowToPlayModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('solo');

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const active = MODES.find(m => m.key === activeTab);

  return (
    <div className="htp-backdrop" onClick={onClose}>
      <div className="htp-modal" onClick={e => e.stopPropagation()}>
        <div className="htp-header">
          <h2 className="htp-title">How to Play</h2>
          <button className="htp-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="htp-tabs">
          {MODES.map(m => (
            <button
              key={m.key}
              className={`htp-tab ${activeTab === m.key ? 'htp-tab--active' : ''}`}
              style={activeTab === m.key ? { borderColor: m.color, color: m.color } : {}}
              onClick={() => setActiveTab(m.key)}
            >
              <span className="htp-tab__icon">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        <div className="htp-body">
          <ul className="htp-rules">
            {active.rules.map((rule, i) => (
              <li key={i} className="htp-rule">
                <span className="htp-rule__num" style={{ color: active.color }}>{i + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
