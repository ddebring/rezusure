export type AnalysisPackId = "pack_10" | "pack_25" | "pack_50";

export type AnalysisPack = {
  id: AnalysisPackId;
  credits: number;
  amountMinor: number;
  currency: "INR";
  title: string;
  description: string;
  badge?: string;
  cta: string;
};

export const FREE_ANALYSIS_CREDITS = 1;

export const DEFAULT_USAGE = {
  freeAnalysesRemaining: 1,
  paidCredits: 0,
  totalAnalysesUsed: 0,
};

export const ANALYSIS_PACKS: AnalysisPack[] = [
  {
    id: "pack_10",
    credits: 10,
    amountMinor: 29900,
    currency: "INR",
    title: "10 analyses",
    description: "For active job seekers who need a few more passes.",
    cta: "Buy 10 analyses",
  },
  {
    id: "pack_25",
    credits: 25,
    amountMinor: 49900,
    currency: "INR",
    title: "25 analyses",
    description: "Best value for ongoing resume iteration.",
    badge: "Best value",
    cta: "Buy 25 analyses",
  },
  {
    id: "pack_50",
    credits: 50,
    amountMinor: 69900,
    currency: "INR",
    title: "50 analyses",
    description: "For heavy users and high-volume job searches.",
    cta: "Buy 50 analyses",
  },
];

export function getAnalysisPackById(packId: string): AnalysisPack {
  const pack = ANALYSIS_PACKS.find((entry) => entry.id === packId);

  if (!pack) {
    throw new Error(`Unknown analysis pack: ${packId}`);
  }

  return pack;
}
