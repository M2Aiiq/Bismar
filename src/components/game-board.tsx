import type { Card } from "../types/game";

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

function resolveResolvedTone(card: Card) {
  switch (card.type) {
    case "Red":
      return "border-[#DC2626] bg-[#DC2626] text-[#F8FAFC]";
    case "Blue":
      return "border-[#2563EB] bg-[#2563EB] text-[#F8FAFC]";
    case "Green":
      return "border-[#059669] bg-[#059669] text-[#F8FAFC]";
    case "Gold":
      return "border-[#EAB308] bg-[#EAB308] text-[#0F172A]";
    case "Neutral":
      return "border-slate-600 bg-slate-600 text-[#F8FAFC]";
    case "Control":
      return "border-[#020617] bg-[#020617] text-[#F8FAFC]";
    default:
      return "border-slate-800 bg-[#1E293B] text-[#F8FAFC]";
  }
}

function resolveIntelTone(card: Card, shouldShowTruth: boolean) {
  if (!shouldShowTruth) {
    return "border-slate-800 bg-[#1E293B] text-[#F8FAFC] hover:bg-slate-800";
  }

  switch (card.type) {
    case "Red":
      return "border-[#7F1D1D] bg-[#450A0A]/65 text-[#F8FAFC] hover:bg-[#7F1D1D]/80";
    case "Blue":
      return "border-[#1D4ED8] bg-[#1E3A8A]/65 text-[#F8FAFC] hover:bg-[#1D4ED8]/80";
    case "Green":
      return "border-[#047857] bg-[#064E3B]/70 text-[#F8FAFC] hover:bg-[#047857]/80";
    case "Gold":
      return "border-[#CA8A04] bg-[#854D0E]/75 text-[#FDE68A] hover:bg-[#A16207]/80";
    case "Neutral":
      return "border-slate-700 bg-slate-800/80 text-[#F8FAFC] hover:bg-slate-700/80";
    case "Control":
      return "border-slate-950 bg-black/60 text-[#F8FAFC] hover:bg-black/75";
    default:
      return "border-slate-800 bg-[#1E293B] text-[#F8FAFC] hover:bg-slate-800";
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

  return (
    <div
      dir="rtl"
      className="grid grid-cols-5 gap-2.5"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {board.map((card) => {
        const shouldShowTruth = revealAll || showTruth || card.isRevealed;
        const isResolved = revealAll || card.isRevealed;

        return (
          <button
            key={card.id}
            type="button"
            disabled={!onReveal || !canReveal || card.isRevealed}
            onClick={() => onReveal?.(card.id)}
            className={cx(
              "relative flex min-h-[64px] items-center justify-center overflow-hidden rounded-xl border p-3 text-center shadow-sm transition-all",
              "text-sm font-bold text-[#F8FAFC] md:text-base",
              isResolved ? resolveResolvedTone(card) : resolveIntelTone(card, shouldShowTruth),
              !card.isRevealed && canReveal && onReveal && "cursor-pointer active:scale-95",
              !card.isRevealed && canReveal && onReveal && "hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-950/40",
              (!canReveal || card.isRevealed) && "cursor-default",
              isResolved && "opacity-95",
            )}
          >
            {isResolved ? (
              <span
                aria-hidden="true"
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(248,250,252,0.18) 0px, rgba(248,250,252,0.18) 6px, transparent 6px, transparent 12px)",
                }}
              />
            ) : null}
            <span className="relative z-10 break-words leading-5">{card.text}</span>
          </button>
        );
      })}
    </div>
  );
}
