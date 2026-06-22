import React from 'react';
import './PuzzleGame.css';

/**
 * Renders the two-grid puzzle UI (Piece Bank + Board).
 * All interaction is delegated to the parent via callbacks.
 * Pass isLocked=true to dim the grids and disable the droppable highlight (co-op).
 */
export default function SharedBoard({
  gridSize, cols, rows, cellW, cellH,
  currentImage,
  sourcePieces, boardPieces, pieces,
  selectedPieceIndex,
  onSourceClick, onBoardClick,
  isLocked = false,
}) {
  const colTemplate = `repeat(${cols}, ${cellW}px)`;
  const rowTemplate = `repeat(${rows}, ${cellH}px)`;
  const showDroppable = !isLocked && selectedPieceIndex !== null;

  const pieceStyle = (correctIndex) => {
    const col = correctIndex % cols;
    const row = Math.floor(correctIndex / cols);
    return {
      backgroundImage: `url(${currentImage})`,
      backgroundSize: `${gridSize}px ${gridSize}px`,
      backgroundPosition: `-${col * cellW}px -${row * cellH}px`,
      overflow: 'hidden',
      aspectRatio: '1 / 1',
    };
  };

  return (
    <div className={`puzzle-game__grids${isLocked ? ' coop-locked' : ''}`}>
      {/* ── Piece Bank ── */}
      <div className="puzzle-grid-wrapper">
        <p className="puzzle-grid-label">Piece Bank</p>
        <div
          className="puzzle-grid puzzle-grid--source"
          style={{ width: gridSize, height: gridSize, gridTemplateColumns: colTemplate, gridTemplateRows: rowTemplate }}
        >
          {sourcePieces.map((correctIndex, idx) => (
            <div
              key={correctIndex}
              className={`puzzle-piece${selectedPieceIndex === idx ? ' puzzle-piece--selected' : ''}`}
              style={{ width: cellW, height: cellH, ...pieceStyle(correctIndex) }}
              onClick={() => onSourceClick(idx)}
            />
          ))}
          {Array.from({ length: pieces - sourcePieces.length }, (_, i) => (
            <div key={`ghost-${i}`} className="puzzle-piece puzzle-piece--ghost" style={{ width: cellW, height: cellH }} />
          ))}
        </div>
      </div>

      {/* ── Board ── */}
      <div className="puzzle-grid-wrapper">
        <p className="puzzle-grid-label">Board</p>
        <div
          className="puzzle-grid puzzle-grid--board"
          style={{ width: gridSize, height: gridSize, gridTemplateColumns: colTemplate, gridTemplateRows: rowTemplate }}
        >
          {boardPieces.map((correctIndex, cellIndex) => (
            <div
              key={cellIndex}
              className={[
                'puzzle-cell',
                correctIndex !== null ? 'puzzle-cell--filled' : '',
                showDroppable && correctIndex === null ? 'puzzle-cell--droppable' : '',
              ].join(' ')}
              style={{ width: cellW, height: cellH }}
              onClick={() => onBoardClick(cellIndex)}
            >
              {correctIndex !== null && (
                <div className="puzzle-piece" style={{ width: cellW, height: cellH, ...pieceStyle(correctIndex) }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
