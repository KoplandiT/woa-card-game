import { factionNames } from '../data/cards';
import type { PlayerState } from '../types';

type PlayerPanelProps = {
  player: PlayerState;
  isActive: boolean;
};

// Egy jatekos osszefoglalo panelje: frakcio, HQ elet, parancspont es paklimeret.
export function PlayerPanel({ player, isActive }: PlayerPanelProps) {
  return (
    <section className={`player-panel ${isActive ? 'player-panel--active' : ''}`}>
      <div>
        <span className="eyebrow">{isActive ? 'Active command' : 'Waiting'}</span>
        <h2>{player.name}</h2>
        <p>{factionNames[player.faction]}</p>
      </div>
      <div className="meters">
        <span>HQ {player.baseHp}/{player.maxBaseHp}</span>
        <span>Deck {player.deck.length}</span>
      </div>
    </section>
  );
}
