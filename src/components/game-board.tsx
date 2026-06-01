import type { Card } from "@/types/game";

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
    return "border-slate-300 bg-slate-200 text-slate-800";
  }

  switch (card.type) {
    case "Red":
      return "border-red-700 bg-red-600 text-white";
    case "Blue":
      return "border-blue-700 bg-blue-600 text-white";
    case "Neutral":
      return "border-stone-400 bg-stone-200 text-stone-900";
    case "Control":
      return "border-slate-950 bg-slate-950 text-white";
    default:
      return "border-slate-300 bg-slate-200 text-slate-800";
  }
}

export function GameBoard({
  board,
  showTruth,
  canReveal,
  revealAll = false,
  onReveal,
}: GameBoardProps) {
  return (
    <div className="grid grid-cols-5 gap-2 md:gap-3">
      {board.map((card) => {
        const shouldShowTruth = revealAll || showTruth || card.isRevealed;

        return (
          <button
            key={card.id}
            type="button"
            disabled={!onReveal || !canReveal || card.isRevealed}
            onClick={() => onReveal?.(card.id)}
            className={cx(
              "aspect-square rounded-2xl border p-2 text-center text-sm font-bold shadow-sm transition md:text-base",
              "flex items-center justify-center break-words",
              resolveCardTone(card, shouldShowTruth),
              !card.isRevealed && canReveal && onReveal && "hover:-translate-y-0.5 hover:shadow-lg",
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
