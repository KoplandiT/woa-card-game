import { motion } from 'motion/react';
import { useState } from 'react';
import { hqDefinitions, hqNationOrder } from '../data/hqs';
import type { BotDifficulty, GameMode, HqNation, PlayerId } from '../types';

type HqSelectionScreenProps = {
  gameMode: GameMode;
  initialBotDifficulty?: BotDifficulty | null;
  onBack: () => void;
  onConfirm: (nations: Record<PlayerId, HqNation>, botDifficulty?: BotDifficulty) => void;
};

type PendingSelections = Record<PlayerId, HqNation | null>;

const difficultyOptions: Array<{ id: BotDifficulty; label: string; description: string }> = [
  { id: 'easy', label: 'Easy', description: 'Basic orders' },
  { id: 'normal', label: 'Normal', description: 'Tactical scoring' },
  { id: 'hard', label: 'Hard', description: 'Sharper trades' },
];

// A ket fel HQ-valasztasat helyi UI state-ben kezeli a csata inditasaig.
export function HqSelectionScreen({ gameMode, initialBotDifficulty = 'normal', onBack, onConfirm }: HqSelectionScreenProps) {
  const [selections, setSelections] = useState<PendingSelections>({ 1: null, 2: null });
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>(initialBotDifficulty ?? 'normal');
  const canBegin = selections[1] !== null && selections[2] !== null;

  // A confirm egy setup esemeny: osszecsomagolja a valasztott HQ-kat es PvE-ben az AI nehezseget.
  const confirmSelections = () => {
    if (!selections[1] || !selections[2]) {
      return;
    }

    onConfirm({ 1: selections[1], 2: selections[2] }, gameMode === 'pve' ? botDifficulty : undefined);
  };

  return (
    <main className="hq-selection-screen">
      <header className="hq-selection-header">
        <div>
          <span className="eyebrow">Armored Generals</span>
          <h1>Headquarters</h1>
        </div>
        <button aria-label="Back" className="icon-button" onClick={onBack} title="Back">
          <span aria-hidden="true">&#8592;</span>
        </button>
      </header>

      <div className="hq-selection-players">
        {([1, 2] as PlayerId[]).map((player) => (
          <section className="hq-selection-player" key={player}>
            <div className="hq-selection-player__heading">
              <span className="eyebrow">{player === 2 && gameMode === 'pve' ? 'Computer opponent' : 'Human commander'}</span>
              <h2>{player === 2 && gameMode === 'pve' ? 'AI Commander' : `Player ${player}`}</h2>
            </div>

            <div className="hq-selection-player__body">
              <div className="hq-selection-options">
                {hqNationOrder.map((nation) => {
                  const hq = hqDefinitions[nation];
                  const isSelected = selections[player] === nation;

                  return (
                    <motion.button
                      aria-pressed={isSelected}
                      className={`hq-option ${isSelected ? 'hq-option--selected' : ''}`}
                      key={nation}
                      onClick={() => setSelections((current) => ({ ...current, [player]: nation }))}
                      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.985 }}
                    >
                      <span className="hq-option__nation">{hq.nationName}</span>
                      <span className="hq-option__image">
                        <img src={hq.image} alt={hq.name} />
                      </span>
                      <span className="hq-option__name">{hq.name}</span>
                      <span className="hq-option__stats">
                        <span><strong>{hq.attack}</strong> ATK</span>
                        <span><strong>{hq.hp}</strong> HP</span>
                        <span><strong>{hq.resource}</strong> RES</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {player === 2 && gameMode === 'pve' && (
                <section className="difficulty-panel difficulty-panel--hq" aria-label="AI difficulty">
                  <div>
                    <span className="eyebrow">AI Commander</span>
                    <h3>Difficulty</h3>
                  </div>
                  <div className="difficulty-options">
                    {difficultyOptions.map((option) => (
                      <button
                        aria-pressed={botDifficulty === option.id}
                        className={`difficulty-option ${botDifficulty === option.id ? 'difficulty-option--selected' : ''}`}
                        key={option.id}
                        onClick={() => setBotDifficulty(option.id)}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.description}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="hq-selection-footer">
        <button className="primary-action" disabled={!canBegin} onClick={confirmSelections}>Begin battle</button>
      </footer>
    </main>
  );
}
