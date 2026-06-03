import type { Card } from "../types/game";

interface GameBoardProps {
  board: Card[];
  showTruth: boolean;
  canReveal: boolean;
  revealAll?: boolean;
  onReveal?: (cardId: number) => void;
  compact?: boolean;
  fontScale?: "compact" | "comfortable";
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function resolveCardTone(card: Card, shouldShowTruth: boolean) {
  if (!shouldShowTruth) {
    return "bg-[#1E293B] border-slate-800 text-[#F8FAFC] hover:border-slate-600";
  }

  if (!card.isRevealed) {
    switch (card.type) {
      case "Red":
        return "border-[#DC2626]/60 bg-[#DC2626]/85 text-[#F8FAFC]";
      case "Blue":
        return "border-[#2563EB]/60 bg-[#2563EB]/85 text-[#F8FAFC]";
      case "Green":
        return "border-[#059669]/60 bg-[#059669]/85 text-[#F8FAFC]";
      case "Gold":
        return "border-[#EAB308]/60 bg-[#EAB308]/85 text-[#0F172A]";
      case "Neutral":
        return "bg-slate-700/70 border-slate-600 text-[#F8FAFC]";
      case "Control":
        return "bg-[#020617] border-red-950 text-red-500/90";
      default:
        return "bg-[#1E293B] border-slate-800 text-[#F8FAFC]";
    }
  }

  switch (card.type) {
    case "Red":
      return "bg-[#DC2626] border-transparent text-white/50 line-through opacity-80";
    case "Blue":
      return "bg-[#2563EB] border-transparent text-white/50 line-through opacity-80";
    case "Green":
      return "bg-[#059669] border-transparent text-white/50 line-through opacity-80";
    case "Gold":
      return "bg-[#EAB308] border-transparent text-[#0F172A]/55 line-through opacity-80";
    case "Neutral":
      return "bg-slate-800/40 border-transparent text-slate-400 line-through";
    case "Control":
      return "bg-[#020617] border-red-950 text-red-600/80";
    default:
      return "bg-[#1E293B] border-slate-800 text-[#F8FAFC]";
  }
}

export function GameBoard({
  board,
  showTruth,
  canReveal,
  revealAll = false,
  onReveal,
  compact = false,
  fontScale = "compact",
}: GameBoardProps) {
  const columnCount = Math.max(1, Math.round(Math.sqrt(board.length)));
  const rowCount = Math.max(1, Math.ceil(board.length / columnCount));
  const compactBoardAspectRatio = (columnCount * 1.28) / rowCount;
  const compactTextClass =
    fontScale === "comfortable" ? "px-1 text-[11px] sm:text-xs md:text-sm" : "px-1 text-[11px] sm:text-xs";

  return (
    <div
      className={cx("grid", compact ? "w-full max-h-full gap-1.5" : "gap-2 md:gap-3")}
      style={{
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        ...(compact
          ? {
              gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
              aspectRatio: String(compactBoardAspectRatio),
            }
          : {}),
      }}
    >
      {board.map((card) => {
        const shouldShowTruth = revealAll || showTruth || card.isRevealed;

        return (
          <button
            key={card.id}
            type="button"
            disabled={!onReveal || !canReveal || card.isRevealed}
            onClick={() => onReveal?.(card.id)}
            className={cx(
              "h-full min-h-0 cursor-pointer select-none border text-center font-bold transition-all duration-200",
              "flex flex-col items-center justify-center rounded-xl",
              compact
                ? "py-1.5"
                : "aspect-square p-2 text-sm md:text-base",
              resolveCardTone(card, shouldShowTruth),
              !card.isRevealed && canReveal && onReveal && "active:scale-95",
              (!canReveal || card.isRevealed) && "cursor-default",
            )}
          >
            <span className={cx("block w-full truncate tracking-wide", compactTextClass)}>{card.text}</span>
          </button>
        );
      })}
    </div>
  );
}
