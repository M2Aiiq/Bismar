import { useEffect, useState } from "react";

import type { ActiveTeam } from "../lib/teams";
import type { Card } from "../types/game";

interface GameBoardProps {
  board: Card[];
  showTruth: boolean;
  canReveal: boolean;
  revealAll?: boolean;
  onReveal?: (cardId: number) => void;
  onBlockedReveal?: () => void;
  voteCountsByCard?: Record<number, number>;
  voteIndicatorTeam?: ActiveTeam;
  pendingRevealCardId?: number | null;
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
            ? singleWordTextClass("px-0.5 text-[12px] font-black leading-none sm:px-1 sm:text-[13px]")
            : singleWordTextClass("px-0.5 text-[10px] font-black leading-none sm:px-1 sm:text-[11px]");
        }

        if (normalizedTextLength <= 8) {
          return boostedDenseFont
            ? singleWordTextClass("px-0.5 text-[11px] font-black leading-none tracking-[-0.01em] sm:px-1 sm:text-[12px]")
            : singleWordTextClass("px-0.5 text-[9px] font-black leading-none tracking-[-0.02em] sm:px-1 sm:text-[10px]");
        }

        return boostedDenseFont
          ? singleWordTextClass("px-0.5 text-[10px] font-black leading-none tracking-[-0.02em] sm:px-1 sm:text-[11px]")
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
      ? "block w-full max-w-full whitespace-normal break-normal px-1 text-center text-[11px] font-black leading-[1.12] [text-wrap:balance] sm:px-1.5 sm:text-[12px]"
      : "block w-full max-w-full whitespace-normal break-normal px-1 text-center text-[9px] font-black leading-[1.08] [text-wrap:balance] sm:px-1.5 sm:text-[10px]";
  }

  return "block w-full max-w-full whitespace-normal break-normal px-0.5 text-center text-[8px] font-black leading-[1.05] [text-wrap:balance] sm:px-1 sm:text-[9px]";
}

function resolveTruthPreviewTone(card: Card) {
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

function resolveIdentityLayerClass(cardType: Card["type"]) {
  switch (cardType) {
    case "Red":
      return "bg-[#DC2626] text-[#F8FAFC] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_10px_20px_rgba(15,23,42,0.2)] [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]";
    case "Blue":
      return "bg-[#2563EB] text-[#F8FAFC] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_10px_20px_rgba(15,23,42,0.2)] [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]";
    case "Green":
      return "bg-[#10B981] text-[#F8FAFC] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_10px_20px_rgba(15,23,42,0.2)] [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]";
    case "Gold":
      return "bg-[#EAB308] text-[#0F172A] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2),inset_0_10px_20px_rgba(15,23,42,0.18)]";
    case "Neutral":
      return "bg-[#FFFFFF] text-[#0F172A] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.95),inset_0_10px_22px_rgba(226,232,240,0.65),0_0_14px_rgba(255,255,255,0.22)]";
    case "Control":
      return "bg-[#090D16] text-[#EF4444] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_10px_20px_rgba(0,0,0,0.42)] [text-shadow:0_0_8px_rgba(239,68,68,0.28)]";
  }
}

function resolveRevealedCardTone(cardType: Card["type"]) {
  switch (cardType) {
    case "Red":
      return "border-[#DC2626] bg-gradient-to-b from-[#EF4444] to-[#DC2626]";
    case "Blue":
      return "border-[#2563EB] bg-gradient-to-b from-[#3B82F6] to-[#2563EB]";
    case "Green":
      return "border-[#10B981] bg-gradient-to-b from-[#34D399] to-[#10B981]";
    case "Gold":
      return "border-[#EAB308] bg-gradient-to-b from-[#FACC15] to-[#EAB308]";
    case "Neutral":
      return "border-[#475569] bg-gradient-to-b from-[#64748B] to-[#475569]";
    case "Control":
      return "border-[#090D16] bg-gradient-to-b from-[#242F41] to-[#090D16]";
  }
}

function revealedPeekTextClass(cardType: Card["type"]) {
  return cx(
    "animate-fade-in text-white/90 font-black text-xs sm:text-sm underline decoration-dashed decoration-white/40 underline-offset-4 tracking-wide",
    cardType === "Gold" && "text-[#0F172A]/90 decoration-[#0F172A]/30",
  );
}

function voteDotClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "bg-[#F87171] shadow-[0_0_10px_rgba(248,113,113,0.95)]";
    case "Blue":
      return "bg-[#60A5FA] shadow-[0_0_10px_rgba(96,165,250,0.95)]";
    case "Green":
      return "bg-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.95)]";
    case "Gold":
      return "bg-[#FACC15] shadow-[0_0_10px_rgba(250,204,21,0.95)]";
  }
}

export function GameBoard({
  board,
  showTruth,
  canReveal,
  revealAll = false,
  onReveal,
  onBlockedReveal,
  voteCountsByCard = {},
  voteIndicatorTeam = "Red",
  pendingRevealCardId = null,
  compact = false,
  fontScale = "compact",
}: GameBoardProps) {
  const columnCount = Math.max(1, Math.round(Math.sqrt(board.length)));
  const rowCount = Math.max(1, Math.ceil(board.length / columnCount));
  const denseBoard = board.length >= 36;
  const compactBoardAspectRatio = (columnCount * (denseBoard ? 1.36 : 1.3)) / rowCount;
  const [peekingCardIds, setPeekingCardIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const revealedCardIds = new Set(board.filter((card) => card.isRevealed).map((card) => card.id));

    setPeekingCardIds((current) =>
      Object.fromEntries(Object.entries(current).filter(([cardId, isPeeking]) => isPeeking && revealedCardIds.has(Number(cardId)))),
    );
  }, [board]);

  const handleCardClick = (card: Card) => {
    if (card.isRevealed) {
      setPeekingCardIds((current) => ({
        ...current,
        [card.id]: !current[card.id],
      }));
      return;
    }

    if (!onReveal) {
      return;
    }

    if (!canReveal) {
      onBlockedReveal?.();
      return;
    }

    onReveal(card.id);
  };

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
        const isPeeking = Boolean(peekingCardIds[card.id]);
        const usesRevealedToken = card.isRevealed;
        const usesTruthPreview = shouldShowTruth && !card.isRevealed;
        const voteCount = voteCountsByCard[card.id] ?? 0;
        const hasVotes = voteCount > 0;
        const isPendingReveal = pendingRevealCardId === card.id;

        return (
          <button
            key={card.id}
            type="button"
            disabled={!onReveal && !card.isRevealed}
            onClick={() => handleCardClick(card)}
            dir="rtl"
            className={cx(
              "relative h-full min-h-0 select-none overflow-hidden border text-center transition-all duration-150",
              denseBoard ? "flex items-center justify-center rounded-xl p-1.5" : "flex items-center justify-center rounded-[1.15rem] p-2",
              compact
                ? ""
                : "aspect-square p-2 text-sm md:text-base",
              usesRevealedToken
                ? resolveRevealedCardTone(card.type)
                : usesTruthPreview
                  ? resolveTruthPreviewTone(card)
                  : "border-[#D6D0C5] bg-gradient-to-b from-[#F9F8F6] to-[#E2DDD3] text-[#0F172A] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.8),_0_4px_6px_-1px_rgba(0,0,0,0.15)] hover:border-[#C7BFB1]",
              hasVotes &&
                !isPendingReveal &&
                "z-10 scale-[1.02] border-white/95 ring-2 ring-white/85 ring-offset-2 ring-offset-transparent shadow-[0_0_18px_rgba(255,255,255,0.65),0_0_34px_rgba(255,255,255,0.2)]",
              isPendingReveal &&
                "z-10 scale-[1.03] border-white ring-2 ring-white/95 ring-offset-2 ring-offset-transparent shadow-[0_0_26px_rgba(255,255,255,0.88),0_0_48px_rgba(255,255,255,0.34)]",
              card.isRevealed
                ? "cursor-pointer"
                : !card.isRevealed && canReveal && onReveal
                  ? "cursor-pointer active:scale-95"
                  : "cursor-default",
            )}
          >
            {isPendingReveal ? (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-white/10 opacity-100 animate-pulse"
                />
              </>
            ) : hasVotes ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-white/5 opacity-100 animate-pulse"
              />
            ) : null}
            {usesRevealedToken ? (
              <div className="relative z-10 flex h-full w-full items-center justify-center">
                {isPeeking ? (
                  <span
                    className={cx(
                      revealedPeekTextClass(card.type),
                      "relative z-10 max-w-full px-1 text-center [text-wrap:balance]",
                      card.type === "Control" && "tracking-widest",
                    )}
                  >
                    {card.text}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="relative z-10 flex h-full w-full items-center justify-center">
                <span className={cx(textClass, card.type === "Control" && shouldShowTruth && "tracking-widest")}>
                  {card.text}
                </span>
              </div>
            )}
            {hasVotes && !usesRevealedToken ? (
              <span className="pointer-events-none absolute inset-x-0 bottom-1 z-20 flex items-center justify-center gap-1">
                {Array.from({ length: voteCount }).map((_, index) => (
                  <span
                    key={`${card.id}-vote-dot-${index}`}
                    aria-hidden="true"
                    className={cx("h-1.5 w-1.5 rounded-full", voteDotClass(voteIndicatorTeam))}
                  />
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
