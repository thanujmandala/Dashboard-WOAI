import type { Team, Review, CompetitionSettings, TeamScoreSummary } from '../types';

export function calculateTeamSummaries(
  teams: Team[],
  reviews: Review[],
  settings: CompetitionSettings
): TeamScoreSummary[] {
  // Map reviews by team_id and review_number
  const reviewMap = new Map<string, { r1?: Review; r2?: Review; r3?: Review }>();

  for (const review of reviews) {
    const existing = reviewMap.get(review.team_id) || {};
    if (review.review_number === 1) existing.r1 = review;
    if (review.review_number === 2) existing.r2 = review;
    if (review.review_number === 3) existing.r3 = review;
    reviewMap.set(review.team_id, existing);
  }

  // Pre-calculate intermediate values for each team
  const rawSummaries = teams.map((team) => {
    const teamRevs = reviewMap.get(team.id) || {};
    const r1 = teamRevs.r1;
    const r2 = teamRevs.r2;
    const r3 = teamRevs.r3;

    const r1Score = r1 && r1.status === 'submitted' ? r1.total_score : null;
    const r2Score = r2 && r2.status === 'submitted' ? r2.total_score : null;
    const r3Score = r3 && r3.status === 'submitted' ? r3.total_score : null;

    const r1Max = settings.review_1_max || 50;
    const r2Max = settings.review_2_max || 50;
    const r3Max = settings.review_3_max || 100;

    const r1Percentage = r1Score !== null ? (r1Score / r1Max) * 100 : null;
    const r2Percentage = r2Score !== null ? (r2Score / r2Max) * 100 : null;
    const r3Percentage = r3Score !== null ? (r3Score / r3Max) * 100 : null;

    // Prelims + Mains combined (R1 + R2)
    let prelimsMainsTotal: number | null = null;
    let prelimsMainsPercentage: number | null = null;
    if (r1Score !== null && r2Score !== null) {
      prelimsMainsTotal = r1Score + r2Score;
      const combinedMax = r1Max + r2Max;
      prelimsMainsPercentage = (prelimsMainsTotal / combinedMax) * 100;
    }

    // Grand total (R1 + R2 + R3)
    let grandTotal: number | null = null;
    let weightedPercentage: number | null = null;

    const availableScores: number[] = [];
    if (r1Score !== null) availableScores.push(r1Score);
    if (r2Score !== null) availableScores.push(r2Score);
    if (r3Score !== null) availableScores.push(r3Score);

    if (availableScores.length > 0) {
      grandTotal = (r1Score || 0) + (r2Score || 0) + (r3Score || 0);

      // Weighted percentage calculation
      if (r1Score !== null && r2Score !== null && r3Score !== null) {
        const w1 = settings.review_1_weight;
        const w2 = settings.review_2_weight;
        const w3 = settings.review_3_weight;
        const totalWeight = w1 + w2 + w3;
        weightedPercentage =
          ((r1Score / r1Max) * w1 + (r2Score / r2Max) * w2 + (r3Score / r3Max) * w3) / (totalWeight / 100);
      } else if (r1Score !== null && r2Score !== null) {
        const w1 = settings.review_1_weight;
        const w2 = settings.review_2_weight;
        weightedPercentage = ((r1Score / r1Max) * w1 + (r2Score / r2Max) * w2) / ((w1 + w2) / 100);
      } else if (r1Score !== null) {
        weightedPercentage = (r1Score / r1Max) * 100;
      }
    }

    return {
      team,
      r1Review: r1,
      r2Review: r2,
      r3Review: r3,
      r1Score,
      r2Score,
      r3Score,
      r1Percentage,
      r2Percentage,
      r3Percentage,
      prelimsMainsTotal,
      prelimsMainsPercentage,
      grandTotal,
      weightedPercentage,
      isEligibleForFinale: false,
      statusText: 'Pending R1',
    };
  });

  // Calculate Finale Eligibility based on: Top N teams with combined R1+R2 >= threshold%
  const candidatesWithR1R2 = rawSummaries
    .filter((s) => s.prelimsMainsPercentage !== null)
    .sort((a, b) => (b.prelimsMainsPercentage || 0) - (a.prelimsMainsPercentage || 0));

  const eligibleTeamIds = new Set<string>();
  candidatesWithR1R2.forEach((cand, index) => {
    const isAboveThreshold = (cand.prelimsMainsPercentage || 0) >= settings.advancement_threshold_percent;
    const isWithinTopLimit = index < settings.advancement_top_teams_limit;
    if (isAboveThreshold && isWithinTopLimit) {
      eligibleTeamIds.add(cand.team.id);
    }
  });

  // Assign eligibility and statusText
  const results: TeamScoreSummary[] = rawSummaries.map((item) => {
    const isEligible = eligibleTeamIds.has(item.team.id);
    let statusText = 'Pending R1';

    if (item.r3Score !== null) {
      statusText = 'Grand Finale Completed';
    } else if (item.r2Score !== null && item.r1Score !== null) {
      statusText = isEligible ? 'Eligible for Finale' : 'Mains Completed (Not Eligible)';
    } else if (item.r1Score !== null) {
      statusText = 'Prelims Completed';
    } else if (item.r1Review?.status === 'draft') {
      statusText = 'R1 Draft Saved';
    }

    return {
      ...item,
      isEligibleForFinale: isEligible,
      statusText,
    };
  });

  // Rank teams based on grandTotal or weightedPercentage descending
  results.sort((a, b) => {
    const valA = a.weightedPercentage ?? -1;
    const valB = b.weightedPercentage ?? -1;
    return valB - valA;
  });

  return results.map((item, idx) => ({
    ...item,
    rank: item.weightedPercentage !== null ? idx + 1 : undefined,
  }));
}

export function formatScore(score: number | null | undefined, max: number): string {
  if (score === null || score === undefined) return `— / ${max}`;
  return `${score} / ${max}`;
}

export function formatPercentage(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return '—';
  return `${pct.toFixed(1)}%`;
}
