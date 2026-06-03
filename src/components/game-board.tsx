import type { Card } from "../types/game";
import { teamCardClass, type ActiveTeam } from "../lib/teams";

interface GameBoardProps {
  board: Card[];
  showTruth: boolean;
  canReveal: boolean;
  revealAll?: boolean;
  onReveal?: (cardId: number) => void;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function resolveCardTone(card: Card, shouldShowTruth: boolean) {
  if (!shouldShowTruth) {
    return "border-white/10 bg-[#334155] text-[#F8FAFC]";
  }

  switch (card.type) {
    case "Red":
    case "Blue":
    case "Green":
    case "Gold":
      return teamCardClass(card.type as ActiveTeam);
    case "Neutral":
      return "border-[#475569] bg-[#475569] text-[#F8FAFC]";
    case "Control":
      return "border-[#0F172A] bg-[#0F172A] text-[#F8FAFC]";
    default:
      return "border-white/10 bg-[#334155] text-[#F8FAFC]";
  }
}

export function GameBoard({
  board,
  showTruth,
  canReveal,
  revealAll = false,
  onReveal,
}: GameBoardProps) {
  const columnCount = Math.max(1, Math.round(Math.sqrt(board.length)));
  const cardSizeClass = columnCount >= 6 ? "p-1.5 text-[11px] md:p-2 md:text-sm" : "p-2 text-sm md:text-base";

  return (
    <div className="grid w-full gap-2 md:gap-3" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
      {board.map((card) => {
        const shouldShowTruth = revealAll || showTruth || card.isRevealed;

        return (
          <button
            key={card.id}
            type="button"
            disabled={!onReveal || !canReveal || card.isRevealed}
            onClick={() => onReveal?.(card.id)}
            className={cx(
              "aspect-square rounded-2xl border text-center font-bold shadow-sm transition",
              "flex items-center justify-center break-words",
              cardSizeClass,
              resolveCardTone(card, shouldShowTruth),
              !card.isRevealed && canReveal && onReveal && "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2563EB]/20",
              (!canReveal || card.isRevealed) && "cursor-default opacity-90",
            )}
          >
            {card.text}
          </button>
        );
      })}
    </div>
  );
}
