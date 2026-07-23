import { useEffect, useState } from 'react';
import { Board } from './components/Board';
import { GameLog } from './components/GameLog';
import { Hand } from './components/Hand';
import { HqSelectionScreen } from './components/HqSelectionScreen';
import { PlayerPanel } from './components/PlayerPanel';
import { ScoreboardModal } from './components/ScoreboardModal';
import { StartScreen } from './components/StartScreen';
import { CardView } from './components/CardView';
import { applyGameAction } from './game/gameActions';
import { chooseBotActionForDifficulty } from './game/bots/botController';
import {
  beginBattle,
  canDeploySupport,
  canDeployUnit,
  createInitialGame,
  getAttackableSlots,
  getCommandTargetableSlots,
  getDeployableSlots,
  getMovableSlots,
  getSupportDeployableSlots,
  gameConstants,
  selectHq,
  selectUnit,
  startGame,
} from './game/gameLogic';
import type { BoardEffect, BoardSlot, CardInstance, GameAction, GameState } from './types';

// Megnezi, hogy egy korabban letezo board elem az akcio utan megsemmisult-e.
function wasBoardSlotDestroyed(previousSlot: BoardSlot, nextState: GameState, slotIndex?: number) {
  if (typeof slotIndex !== 'number' || !previousSlot) {
    return false;
  }

  if (previousSlot.slotType === 'unit') {
    return nextState.board[slotIndex] === null;
  }

  return nextState.phase === 'gameOver' && nextState.players[previousSlot.owner].baseHp <= 0;
}

// A tamadas elotti es utani allapotbol eldonti, hogy sima talalat vagy megsemmisules effekt kell.
function createCombatEffect(previousBoard: BoardSlot[], nextState: GameState, sourceSlot: number | undefined, targetSlot: number): Omit<BoardEffect, 'id'> {
  const targetBefore = previousBoard[targetSlot];
  const sourceBefore = typeof sourceSlot === 'number' ? previousBoard[sourceSlot] : null;

  if (wasBoardSlotDestroyed(targetBefore, nextState, targetSlot)) {
    return { type: 'destroy', sourceSlot, targetSlot, destroyedSlot: targetBefore ?? undefined };
  }

  if (wasBoardSlotDestroyed(sourceBefore, nextState, sourceSlot)) {
    return { type: 'destroy', sourceSlot: targetSlot, targetSlot: sourceSlot, destroyedSlot: sourceBefore ?? undefined };
  }

  return { type: 'attack', sourceSlot, targetSlot };
}

// A domain akciobol eloallitja a hozza tartozo vizualis board effektet.
function createActionEffect(previousState: GameState, nextState: GameState, action: GameAction): Omit<BoardEffect, 'id'> | null {
  if (action.type === 'move_unit') {
    return { type: 'move', sourceSlot: action.sourceSlotIndex, targetSlot: action.targetSlotIndex };
  }

  if (action.type === 'attack') {
    return createCombatEffect(previousState.board, nextState, action.sourceSlotIndex, action.targetSlotIndex);
  }

  if (action.type === 'play_card') {
    const card = previousState.players[previousState.activePlayer].hand.find(
      (handCard) => handCard.instanceId === action.cardInstanceId,
    );

    if (card?.type === 'unit' && typeof action.targetSlotIndex === 'number') {
      return { type: 'deploy', targetSlot: action.targetSlotIndex };
    }

    if (card?.type === 'command' && typeof action.targetSlotIndex === 'number') {
      return createCombatEffect(previousState.board, nextState, undefined, action.targetSlotIndex);
    }

    if (card?.type === 'command' && (card.damage ?? 0) > 0 && (card.target === 'enemy_hq' || !card.target)) {
      const targetSlot = previousState.activePlayer === 1 ? gameConstants.player2HqSlot : gameConstants.player1HqSlot;
      return createCombatEffect(previousState.board, nextState, undefined, targetSlot);
    }
  }

  return null;
}

// A fo alkalmazaskomponens: itt tartjuk egyben a teljes jatekallapotot.
export default function App() {
  // useState-ben van a teljes frontend oldali jatekallapot; nincs backend vagy kulso tarolas.
  const [game, setGame] = useState(createInitialGame);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [boardEffect, setBoardEffect] = useState<BoardEffect | null>(null);
  const [revealedEventCard, setRevealedEventCard] = useState<CardInstance | null>(null);
  const isAiTurn = game.gameMode === 'pve' && game.phase === 'playing' && game.activePlayer === 2;
  const activePlayer = game.players[game.activePlayer];
  const selectedCard = activePlayer.hand.find((card) => card.instanceId === selectedCardId) ?? null;
  const deployableSlots = selectedCard?.type === 'unit' ? getDeployableSlots(game.board, game.activePlayer) : [];
  const supportDeployableSlots = selectedCard?.type === 'support' ? getSupportDeployableSlots(game, game.activePlayer, selectedCard) : [];
  const commandTargetableSlots = getCommandTargetableSlots(game, selectedCard);
  const movableSlots = selectedCard ? [] : getMovableSlots(game);
  const attackableSlots = selectedCard ? commandTargetableSlots : getAttackableSlots(game);

  useEffect(() => {
    if (!boardEffect) {
      return undefined;
    }

    // A destroy effekt 460 ms-os lovedekutat es 2450 ms-os Pixi animaciot hasznal.
    // Kozvetlenul ezek vegen takaritjuk el, hogy ne maradjon lathato ures szunet.
    const effectDuration = boardEffect.type === 'destroy' ? 2450 : boardEffect.type === 'attack' ? 1150 : 900;
    const timeoutId = window.setTimeout(() => setBoardEffect(null), effectDuration);
    return () => window.clearTimeout(timeoutId);
  }, [boardEffect]);

  useEffect(() => {
    if (!revealedEventCard) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setRevealedEventCard(null), 1700);
    return () => window.clearTimeout(timeoutId);
  }, [revealedEventCard]);

  // PvE-ben az AI egyesevel hajtja vegre a difficulty alapjan valasztott bot akcioit.
  useEffect(() => {
    if (!isAiTurn || boardEffect) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const action = chooseBotActionForDifficulty(game, game.botDifficulty ?? 'normal');

      if (!action) {
        return;
      }

      const nextState = applyGameAction(game, action);
      const effect = createActionEffect(game, nextState, action);
      const playedCard = action.type === 'play_card'
        ? game.players[game.activePlayer].hand.find((card) => card.instanceId === action.cardInstanceId)
        : null;

      setSelectedCardId(null);
      setGame(nextState);

      if (playedCard?.type === 'command') {
        setRevealedEventCard(playedCard);
      }

      if (effect) {
        setBoardEffect({ ...effect, id: Date.now() });
      }
    }, 520);

    return () => window.clearTimeout(timeoutId);
  }, [boardEffect, game, isAiTurn]);

  const triggerBoardEffect = (effect: Omit<BoardEffect, 'id'>) => {
    setBoardEffect({ ...effect, id: Date.now() });
  };

  const revealEventCard = (card: CardInstance | null | undefined) => {
    if (card?.type === 'command') {
      setRevealedEventCard(card);
    }
  };

  // Uj jatek inditasakor a UI-ban kijelolt kartyat is torolni kell.
  const resetGame = () => {
    setSelectedCardId(null);
    setBoardEffect(null);
    setRevealedEventCard(null);
    setGame(createInitialGame());
  };

  // Kartyakattintas: unit, support es celzott command lap kijelolesre kerul, az egyszeru command azonnal hat.
  const handlePlayCard = (cardId: string) => {
    if (isAiTurn) {
      return;
    }

    const card = activePlayer.hand.find((handCard) => handCard.instanceId === cardId);

    if (!card) {
      return;
    }

    const requiresBoardTarget = card.target === 'enemy_unit' || card.target === 'enemy_unit_or_hq';

    if (card.type === 'unit' || card.type === 'support' || requiresBoardTarget) {
      setSelectedCardId((current) => (current === cardId ? null : cardId));
      setGame((current) => ({ ...current, selectedUnit: null }));
      return;
    }

    setSelectedCardId(null);
    revealEventCard(card);
    setGame((current) => {
      const next = applyGameAction(current, { type: 'play_card', cardInstanceId: cardId });
      const shouldAnimateEnemyHq = card.type === 'command'
        && (card.damage ?? 0) > 0
        && (card.target === 'enemy_hq' || !card.target);

      if (shouldAnimateEnemyHq) {
        const targetSlot = current.activePlayer === 1 ? gameConstants.player2HqSlot : gameConstants.player1HqSlot;
        triggerBoardEffect(createCombatEffect(current.board, next, undefined, targetSlot));
      }

      return next;
    });
  };

  // Kiemelt deploy mezore kattintva kerul tenylegesen boardra a kijelolt unit.
  const handleDeploySlot = (slotIndex: number) => {
    if (isAiTurn || !selectedCardId) {
      return;
    }

    triggerBoardEffect({ type: 'deploy', targetSlot: slotIndex });
    setGame((current) => applyGameAction(current, {
      type: 'play_card',
      cardInstanceId: selectedCardId,
      targetSlotIndex: slotIndex,
    }));
    setSelectedCardId(null);
  };

  // Support lapot a sajat support sav explicit mezokattintasara rakunk le.
  const handleDeploySupportSlot = (slotIndex: number) => {
    if (isAiTurn || !selectedCardId) {
      return;
    }

    setGame((current) => applyGameAction(current, {
      type: 'play_card',
      cardInstanceId: selectedCardId,
      targetSlotIndex: slotIndex,
    }));
    setSelectedCardId(null);
  };

  // A start fazis kulon kepernyot kap, mert ilyenkor meg nem kell boardot es kezet mutatni.
  if (game.phase === 'start') {
    return <StartScreen onStart={(gameMode) => setGame((current) => startGame(current, gameMode))} />;
  }

  if (game.phase === 'hqSelection' && game.gameMode) {
    return (
      <HqSelectionScreen
        gameMode={game.gameMode}
        initialBotDifficulty={game.botDifficulty}
        onBack={resetGame}
        onConfirm={(nations, botDifficulty) => setGame((current) => beginBattle(current, nations, botDifficulty))}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <span className="eyebrow">Turn {game.turn}</span>
          <h1>Armored Generals</h1>
          {game.gameMode === 'pve' && game.botDifficulty && (
            <span className="top-bar__meta">AI difficulty: {game.botDifficulty}</span>
          )}
        </div>
        <div className="top-bar__actions">
          <button onClick={resetGame}>New battle</button>
          <button className="primary-action" disabled={isAiTurn} onClick={() => {
            setSelectedCardId(null);
            setGame((current) => applyGameAction(current, { type: 'end_turn' }));
          }}>
            End turn
          </button>
        </div>
      </header>

      {game.phase === 'gameOver' && !boardEffect && <ScoreboardModal game={game} onContinue={resetGame} />}

      {revealedEventCard && (
        <div className="event-card-reveal" aria-live="polite">
          <div className="event-card-reveal__halo" aria-hidden="true" />
          <div className="event-card-reveal__card">
            <span className="event-card-reveal__label">Event card played</span>
            <CardView card={revealedEventCard} />
          </div>
        </div>
      )}

      <section className="command-row">
        <PlayerPanel player={game.players[1]} isActive={game.activePlayer === 1} />
        <PlayerPanel player={game.players[2]} isActive={game.activePlayer === 2} />
      </section>

      <section className="table-layout">
        <Board
          board={game.board}
          activePlayer={game.activePlayer}
          players={game.players}
          supportSlots={game.supportSlots}
          boardEffect={boardEffect}
          selectedUnit={game.selectedUnit}
          deployableSlots={deployableSlots}
          supportDeployableSlots={supportDeployableSlots}
          movableSlots={movableSlots}
          attackableSlots={attackableSlots}
          // A Board csak esemenyt jelez vissza; a tenyleges szabalylogika a gameLogic.ts-ben fut.
          onSelectUnit={(owner, slotIndex) => {
            if (isAiTurn) return;
            setSelectedCardId(null);
            setGame((current) => selectUnit(current, owner, slotIndex));
          }}
          onSelectHq={(owner, slotIndex) => {
            if (isAiTurn) return;
            setSelectedCardId(null);
            setGame((current) => selectHq(current, owner, slotIndex));
          }}
          onAttackSlot={(slotIndex) => {
            if (isAiTurn) return;
            if (selectedCard?.type === 'command') {
              revealEventCard(selectedCard);
              setGame((current) => {
                const next = applyGameAction(current, {
                  type: 'play_card',
                  cardInstanceId: selectedCard.instanceId,
                  targetSlotIndex: slotIndex,
                });
                triggerBoardEffect(createCombatEffect(current.board, next, undefined, slotIndex));
                return next;
              });
              setSelectedCardId(null);
              return;
            }

            setSelectedCardId(null);
            setGame((current) => {
              const sourceSlot = current.selectedUnit?.slotIndex;
              if (typeof sourceSlot !== 'number') {
                return current;
              }

              const next = applyGameAction(current, {
                type: 'attack',
                sourceSlotIndex: sourceSlot,
                targetSlotIndex: slotIndex,
              });
              triggerBoardEffect(createCombatEffect(current.board, next, sourceSlot, slotIndex));
              return next;
            });
          }}
          onMoveSlot={(slotIndex) => {
            if (isAiTurn) return;
            setGame((current) => {
              const sourceSlot = current.selectedUnit?.slotIndex;

              if (typeof sourceSlot !== 'number') {
                return current;
              }

              triggerBoardEffect({ type: 'move', sourceSlot, targetSlot: slotIndex });
              return applyGameAction(current, {
                type: 'move_unit',
                sourceSlotIndex: sourceSlot,
                targetSlotIndex: slotIndex,
              });
            });
          }}
          onDeploySlot={handleDeploySlot}
          onDeploySupportSlot={handleDeploySupportSlot}
        />
        <GameLog entries={game.log} />
      </section>

      <footer className="hand-panel">
        <div className="hand-panel__header">
          <div>
            <span className="eyebrow">Current hand</span>
            <h2>{activePlayer.name}</h2>
          </div>
        </div>
        <Hand
          cards={activePlayer.hand}
          commandPoints={activePlayer.commandPoints}
          canDeployUnit={canDeployUnit(game.board, game.activePlayer)}
          isHidden={isAiTurn}
          isInteractionLocked={isAiTurn}
          selectedCardId={selectedCardId}
          canPlayCard={(card) => (
            ((card.target !== 'enemy_unit' && card.target !== 'enemy_unit_or_hq') || getCommandTargetableSlots(game, card).length > 0)
            && (card.type !== 'support' || canDeploySupport(game, game.activePlayer, card))
          )}
          onPlayCard={handlePlayCard}
        />
      </footer>
    </main>
  );
}
