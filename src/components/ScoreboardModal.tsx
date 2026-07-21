import scoreboardImage from '../assets/scoreboard/scoreboard.jpg';
import type { GameState, PlayerBattleStats, PlayerId } from '../types';

type ScoreboardModalProps = {
  game: GameState;
  onContinue: () => void;
};

type ScoreRow = {
  label: string;
  playerValue: number | string;
  opponentValue: number | string;
};

function enemyOf(player: PlayerId): PlayerId {
  return player === 1 ? 2 : 1;
}

function countUnitsOnBoard(game: GameState, player: PlayerId): number {
  return game.board.filter((slot) => slot?.slotType === 'unit' && slot.owner === player).length;
}

function countActiveSupports(game: GameState, player: PlayerId): number {
  return game.supportSlots[player].filter(Boolean).length;
}

function getScore(stats: PlayerBattleStats, game: GameState, player: PlayerId): number {
  const remainingHqBonus = Math.max(0, game.players[player].baseHp) * 8;
  const boardPresenceBonus = countUnitsOnBoard(game, player) * 30 + countActiveSupports(game, player) * 20;

  return stats.damageDealt * 12
    + stats.enemyUnitsDestroyed * 90
    + stats.unitsDeployed * 35
    + stats.supportsDeployed * 30
    + stats.commandCardsPlayed * 22
    + remainingHqBonus
    + boardPresenceBonus;
}

function getRows(game: GameState, player: PlayerId, opponent: PlayerId): ScoreRow[] {
  const playerStats = game.battleStats[player];
  const opponentStats = game.battleStats[opponent];

  return [
    { label: 'HQ HP when battle ended', playerValue: game.players[player].baseHp, opponentValue: game.players[opponent].baseHp },
    { label: 'Damage dealt', playerValue: playerStats.damageDealt, opponentValue: opponentStats.damageDealt },
    { label: 'Enemy units destroyed', playerValue: playerStats.enemyUnitsDestroyed, opponentValue: opponentStats.enemyUnitsDestroyed },
    { label: 'Units deployed', playerValue: playerStats.unitsDeployed, opponentValue: opponentStats.unitsDeployed },
    { label: 'Supports deployed', playerValue: playerStats.supportsDeployed, opponentValue: opponentStats.supportsDeployed },
    { label: 'Commands issued', playerValue: playerStats.commandCardsPlayed, opponentValue: opponentStats.commandCardsPlayed },
    { label: 'Command points spent', playerValue: playerStats.resourcesSpent, opponentValue: opponentStats.resourcesSpent },
    { label: 'Units still on board', playerValue: countUnitsOnBoard(game, player), opponentValue: countUnitsOnBoard(game, opponent) },
  ];
}

// Game over modal: a lezart GameState-bol keszit PvP/PvE fuggo eredmenyszoveget es score osszesitot.
export function ScoreboardModal({ game, onContinue }: ScoreboardModalProps) {
  const winner = game.winner ?? 1;
  const isPve = game.gameMode === 'pve';
  const humanPlayer: PlayerId = 1;
  const playerPerspective = isPve ? humanPlayer : winner;
  const opponent = enemyOf(playerPerspective);
  const didHumanWin = winner === humanPlayer;
  const title = isPve
    ? didHumanWin ? 'VICTORY!' : 'DEFEAT!'
    : `PLAYER ${winner} VICTORY!`;
  const subtitle = isPve
    ? didHumanWin ? 'Enemy HQ was destroyed.' : 'Your HQ was destroyed.'
    : `${game.players[winner].name} destroyed the enemy HQ.`;
  const playerScore = getScore(game.battleStats[playerPerspective], game, playerPerspective);
  const opponentScore = getScore(game.battleStats[opponent], game, opponent);
  const scoreDelta = playerScore - opponentScore;

  return (
    <div className="scoreboard-backdrop" role="dialog" aria-modal="true" aria-labelledby="scoreboard-title">
      <section className={`scoreboard-modal ${isPve && !didHumanWin ? 'scoreboard-modal--defeat' : ''}`}>
        <header className="scoreboard-hero">
          <img src={scoreboardImage} alt="" />
          <div className="scoreboard-hero__copy">
            <h2 id="scoreboard-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
        </header>

        <div className="scoreboard-body">
          <section className="scoreboard-summary">
            <div>
              <span className="eyebrow">Commander</span>
              <strong>{game.players[playerPerspective].name}</strong>
            </div>
            <div>
              <span className="eyebrow">Opponent</span>
              <strong>{game.players[opponent].name}</strong>
            </div>
            <div className="scoreboard-rating">
              <span>Score</span>
              <strong>{scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}</strong>
            </div>
          </section>

          <section className="scoreboard-table" aria-label="Battle statistics">
            <div className="scoreboard-table__head">
              <span>Statistics</span>
              <span>{game.players[playerPerspective].name}</span>
              <span>{game.players[opponent].name}</span>
            </div>
            {getRows(game, playerPerspective, opponent).map((row) => (
              <div className="scoreboard-table__row" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.playerValue}</strong>
                <strong>{row.opponentValue}</strong>
              </div>
            ))}
          </section>

          <footer className="scoreboard-actions">
            <button className="primary-action" onClick={onContinue}>Continue</button>
          </footer>
        </div>
      </section>
    </div>
  );
}
