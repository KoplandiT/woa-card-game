import { useState } from 'react';
import { runBattleSimulations, type BattleSimulationSummary } from '../game/battleSimulation';
import type { BotDifficulty } from '../types';

const battleCount = 100;

// Fejlesztoi AI Lab panel: sok bot-vs-bot csatat futtat le automatikusan balansz-ellenorzeshez.
export function SimulationPanel() {
  const [summary, setSummary] = useState<BattleSimulationSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runSimulations = () => {
    setIsRunning(true);

    window.setTimeout(() => {
      const nextSummary = runBattleSimulations({
        battles: battleCount,
        player1Difficulty: 'normal' as BotDifficulty,
        player2Difficulty: 'hard' as BotDifficulty,
      });
      setSummary(nextSummary);
      setIsRunning(false);
    }, 20);
  };

  return (
    <section className="simulation-panel" aria-label="AI battle simulations">
      <div>
        <span className="eyebrow">AI Lab</span>
        <h2>Auto test battles</h2>
      </div>

      <button className="simulation-panel__button" disabled={isRunning} onClick={runSimulations}>
        {isRunning ? 'Running...' : `Run ${battleCount} battles`}
      </button>

      {summary && (
        <dl className="simulation-panel__results">
          <div>
            <dt>P1 wins</dt>
            <dd>{summary.player1Wins}</dd>
          </div>
          <div>
            <dt>P2 wins</dt>
            <dd>{summary.player2Wins}</dd>
          </div>
          <div>
            <dt>Draws</dt>
            <dd>{summary.draws}</dd>
          </div>
          <div>
            <dt>Avg turns</dt>
            <dd>{summary.averageTurns.toFixed(1)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
