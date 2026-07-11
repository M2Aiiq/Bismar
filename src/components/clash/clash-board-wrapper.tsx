"use client";

import dynamic from "next/dynamic";

const ClashBoardScreen = dynamic(
  () => import("./clash-board-screen").then((mod) => mod.ClashBoardScreen),
  { ssr: false }
);

interface ClashBoardWrapperProps {
  roomId: string;
}

export function ClashBoardWrapper({ roomId }: ClashBoardWrapperProps) {
  return <ClashBoardScreen roomId={roomId} />;
}
