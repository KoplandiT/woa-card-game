import type { GameLogEntry } from '../types';

type GameLogProps = {
  entries: GameLogEntry[];
};

// A legutobbi jatekesemenyeket mutatja, hogy kovetheto legyen a korok menete.
export function GameLog({ entries }: GameLogProps) {
  return (
    <aside className="game-log" aria-label="Battle log">
      <h2>Battle log</h2>
      {entries.map((entry) => (
        <p key={entry.id}>{entry.text}</p>
      ))}
    </aside>
  );
}
