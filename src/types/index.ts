export type UserRole = 'admin' | 'judge';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
  college_name?: string;
  euphoria_id?: string;
  contact_number?: string;
}

export interface Team {
  id: string;
  team_number: string;
  team_name: string;
  problem_statement_id: string;
  problem_statement: string;
  college_name?: string;
  contact_number?: string;
  leader_name?: string;
  leader_euphoria_id?: string;
  members: TeamMember[];
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriterionRubric {
  id: string;
  name: string;
  description?: string;
  max_score: number;
}

export interface ReviewScore {
  criterion_id: string;
  criterion_name: string;
  score: number;
  max_score: number;
  comments?: string;
}

export type ReviewStatus = 'draft' | 'submitted';

export interface Review {
  id: string;
  team_id: string;
  team_number: string;
  review_number: 1 | 2 | 3; // 1: Prelims, 2: Mains, 3: Grand Finale
  judge_id: string;
  judge_username: string;
  scores: ReviewScore[];
  total_score: number;
  max_possible_score: number;
  comments?: string;
  status: ReviewStatus;
  submitted_at?: string;
  updated_at: string;
  is_locked: boolean;
  unlocked_at?: string;
  unlocked_by?: string;
  unlock_reason?: string;
}

export interface CompetitionSettings {
  competition_name: string;
  subtitle: string;
  review_1_name: string;
  review_1_max: number;
  review_1_weight: number; // e.g. 25
  review_2_name: string;
  review_2_max: number;
  review_2_weight: number; // e.g. 25
  review_3_name: string;
  review_3_max: number;
  review_3_weight: number; // e.g. 50
  advancement_threshold_percent: number; // e.g. 90
  advancement_top_teams_limit: number; // e.g. 50
}

export interface AuditLog {
  id: string;
  timestamp: string;
  judge_username: string;
  action: 'login' | 'review_draft' | 'review_submit' | 'review_unlock' | 'data_import' | 'settings_update' | 'team_delete' | 'data_reset';
  details: string;
  team_number?: string;
}

export interface TeamScoreSummary {
  team: Team;
  r1Review?: Review;
  r2Review?: Review;
  r3Review?: Review;
  r1Score: number | null;
  r2Score: number | null;
  r3Score: number | null;
  r1Percentage: number | null;
  r2Percentage: number | null;
  r3Percentage: number | null;
  prelimsMainsTotal: number | null; // R1 + R2 (out of 100)
  prelimsMainsPercentage: number | null; // (R1+R2)/100 * 100
  grandTotal: number | null; // R1 + R2 + R3 (out of 200)
  weightedPercentage: number | null; // calculated according to weights or total/200*100
  isEligibleForFinale: boolean;
  rank?: number;
  statusText: string;
}
