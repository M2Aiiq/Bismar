import type { Card } from "../types/game";

interface GameBoardProps {
  board: Card[];
  showTruth: boolean;
  canReveal: boolean;
  revealAll?: boolean;
  onReveal?: (cardId: number) => void;
  compact?: boolean;
  fontScale?: "compact" | "comfortable" | "expanded";
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function singleWordTextClass(sizeClass: string) {
  return `inline-flex max-w-full flex-none items-center justify-center self-center whitespace-nowrap text-center ${sizeClass}`;
}

function cardTextClass(cardText: string, fontScale: GameBoardProps["fontScale"], denseBoard: boolean) {
  const normalizedTextLength = Array.from(cardText.replace(/\s+/g, "")).length;
  const isSingleWord = !/\s/.test(cardText.trim());
  const boostedDenseFont = fontScale === "expanded";

  if (isSingleWord) {
    if (fontScale === "comfortable" || boostedDenseFont) {
      if (denseBoard) {
        if (normalizedTextLength <= 6) {
          return boostedDenseFont
            ? singleWordTextClass("px-0.5 text-[11px] font-black leading-none sm:px-1 sm:text-[12px]")
            : singleWordTextClass("px-0.5 text-[10px] font-black leading-none sm:px-1 sm:text-[11px]");
        }

        if (normalizedTextLength <= 8) {
          return boostedDenseFont
            ? singleWordTextClass("px-0.5 text-[10px] font-black leading-none tracking-[-0.01em] sm:px-1 sm:text-[11px]")
            : singleWordTextClass("px-0.5 text-[9px] font-black leading-none tracking-[-0.02em] sm:px-1 sm:text-[10px]");
        }

        return boostedDenseFont
          ? singleWordTextClass("px-0.5 text-[9px] font-black leading-none tracking-[-0.02em] sm:px-1 sm:text-[10px]")
          : singleWordTextClass("px-0.5 text-[8px] font-black leading-none tracking-[-0.03em] sm:px-1 sm:text-[9px]");
      }

      return singleWordTextClass("px-1.5 text-sm font-black leading-tight sm:text-base");
    }

    if (denseBoard) {
      return normalizedTextLength <= 8
        ? singleWordTextClass("px-0.5 text-[9px] font-black leading-none sm:px-1 sm:text-[10px]")
        : singleWordTextClass("px-0.5 text-[8px] font-black leading-none tracking-[-0.02em] sm:px-1 sm:text-[9px]");
    }

    return singleWordTextClass("px-1 text-[11px] font-black leading-tight sm:text-sm");
  }

  if (fontScale === "comfortable" || boostedDenseFont) {
    return boostedDenseFont && denseBoard
      ? "block w-full max-w-full whitespace-normal break-normal px-1 text-center text-[10px] font-black leading-[1.1] [text-wrap:balance] sm:px-1.5 sm:text-[11px]"
      : "block w-full max-w-full whitespace-normal break-normal px-1 text-center text-[9px] font-black leading-[1.08] [text-wrap:balance] sm:px-1.5 sm:text-[10px]";
  }

  return "block w-full max-w-full whitespace-normal break-normal px-0.5 text-center text-[8px] font-black leading-[1.05] [text-wrap:balance] sm:px-1 sm:text-[9px]";
}

function resolveCardTone(card: Card, shouldShowTruth: boolean) {
  if (!shouldShowTruth) {
    return "border-[#D6D0C5] bg-gradient-to-b from-[#F9F8F6] to-[#E2DDD3] text-[#0F172A] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.8),_0_4px_6px_-1px_rgba(0,0,0,0.15)] hover:border-[#C7BFB1]";
  }

  if (!card.isRevealed) {
    switch (card.type) {
      case "Red":
        return "border-[#DC2626] bg-gradient-to-b from-[#EF4444] to-[#DC2626] text-[#F8FAFC] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.4),_0_4px_6px_-1px_rgba(220,38,38,0.3)] [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]";
      case "Blue":
        return "border-[#2563EB] bg-gradient-to-b from-[#3B82F6] to-[#2563EB] text-[#F8FAFC] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.4),_0_4px_6px_-1px_rgba(37,99,235,0.3)] [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]";
      case "Green":
        return "border-[#059669] bg-gradient-to-b from-[#10B981] to-[#059669] text-[#F8FAFC] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.34),_0_4px_6px_-1px_rgba(5,150,105,0.3)] [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]";
      case "Gold":
        return "border-[#EAB308] bg-gradient-to-b from-[#FACC15] to-[#EAB308] text-[#0F172A] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.55),_0_4px_6px_-1px_rgba(234,179,8,0.28)]";
      case "Neutral":
        return "border-[#D6D0C5] bg-gradient-to-b from-[#F9F8F6] to-[#E2DDD3] text-[#0F172A] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.8),_0_4px_6px_-1px_rgba(0,0,0,0.15)]";
      case "Control":
        return "border-[#111827] bg-gradient-to-b from-[#242F41] to-[#090D16] text-[#EF4444] shadow-[inset_0_2px_0px_rgba(255,255,255,0.1),_0_5px_8px_rgba(0,0,0,0.5)] [text-shadow:0_0_8px_rgba(239,68,68,0.28)]";
      default:
        return "border-[#D6D0C5] bg-gradient-to-b from-[#F9F8F6] to-[#E2DDD3] text-[#0F172A] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.8),_0_4px_6px_-1px_rgba(0,0,0,0.15)]";
    }
  }

  switch (card.type) {
    case "Red":
      return "border-[#DC2626] bg-gradient-to-b from-[#EF4444] to-[#DC2626] text-[#F8FAFC] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.4),_0_4px_6px_-1px_rgba(220,38,38,0.3)] [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]";
    case "Blue":
      return "border-[#2563EB] bg-gradient-to-b from-[#3B82F6] to-[#2563EB] text-[#F8FAFC] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.4),_0_4px_6px_-1px_rgba(37,99,235,0.3)] [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]";
    case "Green":
      return "border-[#059669] bg-gradient-to-b from-[#10B981] to-[#059669] text-[#F8FAFC] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.34),_0_4px_6px_-1px_rgba(5,150,105,0.3)] [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]";
    case "Gold":
      return "border-[#EAB308] bg-gradient-to-b from-[#FACC15] to-[#EAB308] text-[#0F172A] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.55),_0_4px_6px_-1px_rgba(234,179,8,0.28)]";
    case "Neutral":
      return "border-[#D6D0C5] bg-gradient-to-b from-[#F9F8F6] to-[#E2DDD3] text-slate-500 shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.8),_0_4px_6px_-1px_rgba(0,0,0,0.15)]";
    case "Control":
      return "border-[#111827] bg-gradient-to-b from-[#242F41] to-[#090D16] text-[#EF4444] shadow-[inset_0_2px_0px_rgba(255,255,255,0.1),_0_5px_8px_rgba(0,0,0,0.5)] [text-shadow:0_0_8px_rgba(239,68,68,0.28)]";
    default:
      return "border-[#D6D0C5] bg-gradient-to-b from-[#F9F8F6] to-[#E2DDD3] text-[#0F172A] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.8),_0_4px_6px_-1px_rgba(0,0,0,0.15)]";
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
  const denseBoard = board.length >= 36;
  const compactBoardAspectRatio = (columnCount * (denseBoard ? 1.36 : 1.3)) / rowCount;

  return (
    <div
      className={cx("grid", compact ? (denseBoard ? "w-full max-h-full gap-1" : "w-full max-h-full gap-1.5") : "gap-2 md:gap-3")}
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
        const textClass = cardTextClass(card.text, fontScale, denseBoard);

        return (
          <button
            key={card.id}
            type="button"
            disabled={!onReveal || !canReveal || card.isRevealed}
            onClick={() => onReveal?.(card.id)}
            dir="rtl"
            className={cx(
              "h-full min-h-0 select-none overflow-hidden border text-center transition-all duration-150",
              denseBoard ? "flex items-center justify-center rounded-xl p-1.5" : "flex items-center justify-center rounded-[1.15rem] p-2",
              compact
                ? ""
                : "aspect-square p-2 text-sm md:text-base",
              resolveCardTone(card, shouldShowTruth),
              !card.isRevealed && canReveal && onReveal && "cursor-pointer active:scale-95",
              (!canReveal || card.isRevealed) && "cursor-default",
            )}
          >
            <span className={cx(textClass, card.type === "Control" && shouldShowTruth && "tracking-widest")}>{card.text}</span>
          </button>
        );
      })}
    </div>
  );
}
