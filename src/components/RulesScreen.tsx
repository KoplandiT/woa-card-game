import { FuelPumpIcon } from './FuelPumpIcon';
import { SupportTypeIcon } from './SupportTypeIcon';
import type { SupportType, UnitType } from '../types';

type RulesScreenProps = {
  onBack: () => void;
};

const ruleSections = [
  {
    title: 'Battlefield',
    items: [
      'The main board is a 3x5 grid with one HQ for each side.',
      'Units deploy next to their own HQ, including diagonal neighboring slots.',
      'Support cards occupy the side support section and strengthen the HQ.',
    ],
  },
  {
    title: 'Units',
    items: [
      'Each unit has attack, HP, cost, and optional resource production.',
      'A unit can move and/or attack once per turn, depending on its unit type.',
      'Destroyed units leave the board and stop producing resource immediately.',
    ],
  },
  {
    title: 'Combat',
    items: [
      'Units attack neighboring enemies, including diagonals.',
      'Surviving defenders can counterattack unless their type or state prevents it.',
      'Artillery and HQ attacks can target enemy HQ freely, but enemy units must be spotted.',
    ],
  },
  {
    title: 'Victory',
    items: [
      'HQ HP is the main win condition.',
      'Support protection absorbs HQ damage while it survives.',
      'A player wins when the enemy HQ is destroyed.',
    ],
  },
];

const unitLegend: Array<{ unitType: UnitType; label: string; description: string }> = [
  { unitType: 'light_tank', label: 'Light tank', description: 'Fast scout unit. Can move up to twice before attacking.' },
  { unitType: 'medium_tank', label: 'Medium tank', description: 'Flexible unit. Can move one slot, including diagonally.' },
  { unitType: 'heavy_tank', label: 'Heavy tank', description: 'Durable front line unit. Strong HP, slower tempo.' },
  { unitType: 'tank_destroyer', label: 'Tank destroyer', description: 'High firepower. Its counterattack resolves before the attacker.' },
  { unitType: 'artillery', label: 'Artillery', description: 'Long range unit. Needs spotted unit targets and cannot fight while suppressed.' },
];

const supportLegend: Array<{ supportType: SupportType; label: string; description: string }> = [
  { supportType: 'scout', label: 'Scout', description: 'Recon support slot and support card type.' },
  { supportType: 'medic', label: 'Medic', description: 'Repair or protection themed support slot.' },
  { supportType: 'engineer', label: 'Engineer', description: 'Logistics, resource, or HQ upgrade support slot.' },
];

const boardLegend = [
  { className: 'manual-board-state manual-board-state--deployable', label: 'Deployable', description: 'You can place the selected unit or support here.' },
  { className: 'manual-board-state manual-board-state--movable', label: 'Movable', description: 'The selected unit can move to this slot.' },
  { className: 'manual-board-state manual-board-state--targetable', label: 'Targetable', description: 'The selected unit, HQ, or command card can attack this slot.' },
  { className: 'manual-board-state manual-board-state--selected', label: 'Selected', description: 'This is the currently selected unit or HQ.' },
  { className: 'manual-board-state manual-board-state--spent', label: 'Spent', description: 'This unit or HQ has already acted this turn.' },
];

function renderUnitSymbol(unitType: UnitType) {
  if (unitType === 'artillery') {
    return <span className="unit-symbol unit-symbol--square" />;
  }

  if (unitType === 'tank_destroyer') {
    return <span className="unit-symbol unit-symbol--down" />;
  }

  const triangleCount = unitType === 'light_tank' ? 1 : unitType === 'medium_tank' ? 2 : 3;

  return (
    <span className={`unit-symbol-stack unit-symbol-stack--${unitType}`}>
      {Array.from({ length: triangleCount }, (_, index) => (
        <span className="unit-symbol unit-symbol--up" key={index} />
      ))}
    </span>
  );
}

// Jatekszabaly / wiki oldal. Statikus tartalmat es a valodi UI ikonokhoz kozel allo legendat mutat.
export function RulesScreen({ onBack }: RulesScreenProps) {
  return (
    <main className="rules-screen">
      <header className="rules-header">
        <div>
          <span className="eyebrow">Armored Generals</span>
          <h1>Field Manual</h1>
        </div>
        <button aria-label="Back" className="icon-button" onClick={onBack} title="Back">
          <span aria-hidden="true">&#8592;</span>
        </button>
      </header>

      <section className="rules-hero">
        <span className="rules-hero__label">Rules Wiki</span>
        <p>Core rules, card symbols, board highlights, combat flow, and victory conditions for the prototype.</p>
      </section>

      <section className="rules-grid">
        {ruleSections.map((section) => (
          <article className="rules-card" key={section.title}>
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="manual-section">
        <div className="manual-section__heading">
          <span className="eyebrow">Cards</span>
          <h2>Card Symbols</h2>
        </div>

        <div className="manual-legend-grid">
          <article className="manual-legend-card">
            <span className="manual-token manual-token--cost">4</span>
            <h3>Cost</h3>
            <p>Command points paid immediately when the card is played.</p>
          </article>

          <article className="manual-legend-card">
            <span className="manual-oil-token">2</span>
            <h3>Resource</h3>
            <p>Extra command points produced from the next turn while the card remains active.</p>
          </article>

          <article className="manual-legend-card">
            <span className="combat-card__stat combat-card__stat--attack manual-stat-token">3</span>
            <h3>Attack</h3>
            <p>Damage dealt by a unit or HQ attack.</p>
          </article>

          <article className="manual-legend-card">
            <span className="combat-card__stat combat-card__stat--hp manual-stat-token">6</span>
            <h3>HP / Armor</h3>
            <p>Damage capacity before a unit, support, or HQ protection is destroyed.</p>
          </article>
        </div>
      </section>

      <section className="manual-section">
        <div className="manual-section__heading">
          <span className="eyebrow">Unit classes</span>
          <h2>Unit Type Markers</h2>
        </div>

        <div className="manual-list">
          {unitLegend.map((item) => (
            <article className="manual-list-item" key={item.unitType}>
              <span className="manual-icon-box">{renderUnitSymbol(item.unitType)}</span>
              <div>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="manual-section">
        <div className="manual-section__heading">
          <span className="eyebrow">Support</span>
          <h2>Support Slot Icons</h2>
        </div>

        <div className="manual-list manual-list--three">
          {supportLegend.map((item) => (
            <article className="manual-list-item" key={item.supportType}>
              <span className="manual-icon-box">
                <SupportTypeIcon supportType={item.supportType} />
              </span>
              <div>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="manual-section">
        <div className="manual-section__heading">
          <span className="eyebrow">Board</span>
          <h2>Board Icons And Highlights</h2>
        </div>

        <div className="manual-legend-grid">
          <article className="manual-legend-card">
            <span className="manual-fuel-pump">
              <FuelPumpIcon />
              <strong>5</strong>
            </span>
            <h3>Command points</h3>
            <p>The fuel pump beside the HQ shows the active resource pool.</p>
          </article>

          <article className="manual-legend-card">
            <span className="combat-card__type-icon--hq manual-hq-token">HQ</span>
            <h3>Headquarters</h3>
            <p>The HQ token is the base. Destroying it wins the battle.</p>
          </article>
        </div>

        <div className="manual-board-legend">
          {boardLegend.map((item) => (
            <article className="manual-board-legend__row" key={item.label}>
              <span className={item.className} />
              <div>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
