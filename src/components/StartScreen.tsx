import { useState } from 'react';
import fieldManualTileImage from '../assets/menu/field-manual-tile.jpg';
import pveTileImage from '../assets/menu/pve-tile.jpg';
import pvpTileImage from '../assets/menu/pvp-tile.jpg';
import { RulesScreen } from './RulesScreen';
import type { GameMode } from '../types';

type StartScreenProps = {
  onStart: (gameMode: GameMode) => void;
};

// A kezdokepernyo csempes menubol valaszt jatekmodot, majd tovabbitja azt a fo alkalmazasnak.
export function StartScreen({ onStart }: StartScreenProps) {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  if (isRulesOpen) {
    return <RulesScreen onBack={() => setIsRulesOpen(false)} />;
  }

  return (
    <main className="start-screen">
      <section className="start-menu">
        <header className="start-menu__header">
          <span className="eyebrow">Tactical card prototype</span>
          <h1>Armored Generals</h1>
        </header>

        <div className="mode-tiles" aria-label="Game mode">
          <button className="mode-tile" onClick={() => onStart('pvp')}>
            <img src={pvpTileImage} alt="" />
            <span className="mode-tile__shade" />
            <span className="mode-tile__index">01</span>
            <span className="mode-tile__content">
              <strong>PvP</strong>
              <span>Hot-seat battle</span>
            </span>
          </button>

          <button className="mode-tile" onClick={() => onStart('pve')}>
            <img src={pveTileImage} alt="" />
            <span className="mode-tile__shade" />
            <span className="mode-tile__index">02</span>
            <span className="mode-tile__content">
              <strong>PvE</strong>
              <span>NPC skirmish</span>
            </span>
          </button>
        </div>

        <button className="wiki-tile" onClick={() => setIsRulesOpen(true)}>
          <img src={fieldManualTileImage} alt="" />
          <span className="mode-tile__shade" />
          <span className="wiki-tile__index">03</span>
          <span className="wiki-tile__content">
            <strong>Field Manual</strong>
            <span>Rules wiki</span>
          </span>
        </button>

        <footer className="start-menu__footer">
          <span>Select operation</span>
          <span>Armored Command Network</span>
        </footer>
      </section>
    </main>
  );
}
