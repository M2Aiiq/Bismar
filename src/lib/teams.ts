import type { Team, TeamCount } from "../types/game";

export type ActiveTeam = Exclude<Team, "Unassigned">;

const TEAM_ORDER: ActiveTeam[] = ["Red", "Blue", "Green", "Gold"];

export function getActiveTeams(teamCount: TeamCount): ActiveTeam[] {
  return TEAM_ORDER.slice(0, teamCount);
}

export function isActiveTeam(team: Team): team is ActiveTeam {
  return team !== "Unassigned";
}

export function teamLabel(team: Team) {
  switch (team) {
    case "Red":
      return "الأحمر";
    case "Blue":
      return "الأزرق";
    case "Green":
      return "الأخضر";
    case "Gold":
      return "الأصفر";
    default:
      return "غير محدد";
  }
}

export function teamCardClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "border-[#DC2626] bg-[#DC2626] text-[#F8FAFC]";
    case "Blue":
      return "border-[#2563EB] bg-[#2563EB] text-[#F8FAFC]";
    case "Green":
      return "border-[#059669] bg-[#059669] text-[#F8FAFC]";
    case "Gold":
      return "border-[#EAB308] bg-[#EAB308] text-[#0F172A]";
  }
}

export function teamBadgeClass(team: Team, selected = false) {
  if (team === "Unassigned") {
    return selected ? "bg-[#334155] text-[#F8FAFC]" : "border border-white/15 bg-[#0F172A] text-[#F8FAFC]/85";
  }

  if (!selected) {
    return "border border-white/15 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-[#1E293B]";
  }

  switch (team) {
    case "Red":
      return "bg-[#DC2626] text-[#F8FAFC]";
    case "Blue":
      return "bg-[#2563EB] text-[#F8FAFC]";
    case "Green":
      return "bg-[#059669] text-[#F8FAFC]";
    case "Gold":
      return "bg-[#EAB308] text-[#0F172A]";
    default:
      return "bg-[#334155] text-[#F8FAFC]";
  }
}

export function nextTeam(currentTurn: ActiveTeam, activeTeams: ActiveTeam[]) {
  const currentIndex = activeTeams.indexOf(currentTurn);

  if (currentIndex === -1) {
    return activeTeams[0];
  }

  return activeTeams[(currentIndex + 1) % activeTeams.length];
}
