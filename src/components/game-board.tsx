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
    return "border-white/12 bg-white/[0.055] text-[#FFFFFF] shadow-[0_18px_45px_rgba(2,8,23,0.24)] backdrop-blur-md";
  }

  switch (card.type) {
    case "Red":
    case "Blue":
    case "Green":
    case "Gold":
      return `${teamCardClass(card.type as ActiveTeam)} shadow-[0_24px_55px_rgba(2,8,23,0.26)]`;
    case "Neutral":
      return "border-white/12 bg-[#94A3B8] text-[#0B1220] shadow-[0_22px_48px_rgba(2,8,23,0.24)]";
    case "Control":
      return "border-[#F59E0B]/45 bg-[#0F172A] text-[#FFFFFF] shadow-[0_0_0_1px_rgba(245,158,11,0.18),0_22px_48px_rgba(2,8,23,0.34)]";
    default:
      return "border-white/12 bg-white/[0.055] text-[#FFFFFF] shadow-[0_18px_45px_rgba(2,8,23,0.24)] backdrop-blur-md";
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
    <div className="grid gap-2.5 md:gap-3.5" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
      {board.map((card) => {
        const shouldShowTruth = revealAll || showTruth || card.isRevealed;

        return (
          <button
            key={card.id}
            type="button"
            disabled={!onReveal || !canReveal || card.isRevealed}
            onClick={() => onReveal?.(card.id)}
            className={cx(
              "group relative aspect-square overflow-hidden rounded-[1.35rem] border p-2.5 text-center text-sm font-black transition duration-200 md:rounded-[1.6rem] md:p-3 md:text-base",
              "flex items-center justify-center break-words leading-tight",
              resolveCardTone(card, shouldShowTruth),
              !card.isRevealed &&
                canReveal &&
                onReveal &&
                "hover:-translate-y-1 hover:scale-[1.015] hover:border-white/20 hover:bg-white/[0.08] hover:shadow-[0_24px_60px_rgba(59,130,246,0.18)]",
              (!canReveal || card.isRevealed) && "cursor-default",
              card.isRevealed && "opacity-96",
            )}
          >
            <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-white/18" />
            <span className="relative z-10 text-balance">{card.text}</span>
          </button>
        );
      })}
    </div>
  );
}
