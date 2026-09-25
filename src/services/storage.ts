import type { Team, Review, CompetitionSettings, AuditLog } from '../types';
import { SAMPLE_TEAMS, SAMPLE_INITIAL_REVIEWS } from '../constants/sampleTeams';
import { DEFAULT_SETTINGS } from '../constants/rubrics';

const STORAGE_KEYS = {
  TEAMS: 'woai_teams_v1',
  REVIEWS: 'woai_reviews_v1',
  SETTINGS: 'woai_settings_v1',
  AUDIT_LOGS: 'woai_audit_logs_v1',
  THEME: 'woai_theme_mode',
};

export class StorageService {
  static init() {
    if (!localStorage.getItem(STORAGE_KEYS.TEAMS)) {
      this.saveTeams(SAMPLE_TEAMS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) {
      this.saveReviews(SAMPLE_INITIAL_REVIEWS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      this.addAuditLog({
        id: 'log-init',
        timestamp: new Date().toISOString(),
        judge_username: 'system',
        action: 'data_reset',
        details: 'System initialized with demo dataset.',
      });
    }
  }

  static getTeams(): Team[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TEAMS);
      return raw ? JSON.parse(raw) : SAMPLE_TEAMS;
    } catch {
      return SAMPLE_TEAMS;
    }
  }

  static saveTeams(teams: Team[]) {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    window.dispatchEvent(new Event('woai_data_change'));
  }

  static saveSingleTeam(team: Team) {
    const teams = this.getTeams();
    const idx = teams.findIndex((t) => t.id === team.id || t.team_number.trim().toLowerCase() === team.team_number.trim().toLowerCase());
    if (idx >= 0) {
      teams[idx] = { ...team, updated_at: new Date().toISOString() };
    } else {
      teams.push({ ...team, created_at: team.created_at || new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    this.saveTeams(teams);
  }

  static getReviews(): Review[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REVIEWS);
      return raw ? JSON.parse(raw) : SAMPLE_INITIAL_REVIEWS;
    } catch {
      return SAMPLE_INITIAL_REVIEWS;
    }
  }

  static saveReviews(reviews: Review[]) {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
    window.dispatchEvent(new Event('woai_data_change'));
  }

  static saveSingleReview(review: Review, judgeUsername: string): Review {
    const reviews = this.getReviews();
    const existingIdx = reviews.findIndex(
      (r) => r.team_id === review.team_id && r.review_number === review.review_number
    );

    const updatedReview: Review = {
      ...review,
      updated_at: new Date().toISOString(),
      judge_username: judgeUsername,
    };

    if (existingIdx >= 0) {
      reviews[existingIdx] = updatedReview;
    } else {
      reviews.push(updatedReview);
    }

    this.saveReviews(reviews);

    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      judge_username: judgeUsername,
      action: review.status === 'submitted' ? 'review_submit' : 'review_draft',
      details: `${review.status === 'submitted' ? 'Submitted' : 'Saved draft for'} Review ${review.review_number} (${review.total_score}/${review.max_possible_score} pts)`,
      team_number: review.team_number,
    });

    return updatedReview;
  }

  static unlockReview(
    teamId: string,
    reviewNumber: 1 | 2 | 3,
    adminUsername: string,
    reason: string
  ): boolean {
    const reviews = this.getReviews();
    const review = reviews.find(
      (r) => r.team_id === teamId && r.review_number === reviewNumber
    );

    if (!review) return false;

    review.is_locked = false;
    review.status = 'draft';
    review.unlocked_at = new Date().toISOString();
    review.unlocked_by = adminUsername;
    review.unlock_reason = reason;
    review.updated_at = new Date().toISOString();

    this.saveReviews(reviews);

    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      judge_username: adminUsername,
      action: 'review_unlock',
      details: `Unlocked Review ${reviewNumber} for editing. Reason: "${reason}"`,
      team_number: review.team_number,
    });

    return true;
  }

  static getSettings(): CompetitionSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: CompetitionSettings, adminUsername = 'admin1') {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      judge_username: adminUsername,
      action: 'settings_update',
      details: `Updated competition settings & stage weights.`,
    });
    window.dispatchEvent(new Event('woai_data_change'));
  }

  static getAuditLogs(): AuditLog[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static addAuditLog(log: AuditLog) {
    const logs = this.getAuditLogs();
    logs.unshift(log);
    if (logs.length > 200) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  }

  static resetToDemoData(judgeUsername = 'admin1') {
    this.saveTeams(SAMPLE_TEAMS);
    this.saveReviews(SAMPLE_INITIAL_REVIEWS);
    this.saveSettings(DEFAULT_SETTINGS);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      judge_username: judgeUsername,
      action: 'data_reset',
      details: 'Reset system database back to demo dataset.',
    });
  }

  static clearAllReviews(judgeUsername = 'admin1') {
    this.saveReviews([]);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      judge_username: judgeUsername,
      action: 'data_reset',
      details: 'Cleared all submitted and draft reviews.',
    });
  }

  static clearAllTeams(judgeUsername = 'admin1') {
    this.saveTeams([]);
    this.saveReviews([]);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      judge_username: judgeUsername,
      action: 'data_reset',
      details: 'Cleared all teams and reviews.',
    });
  }

  static getTheme(): 'dark' | 'light' {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light') || 'dark';
  }

  static saveTheme(theme: 'dark' | 'light') {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  static exportFullBackup() {
    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      teams: this.getTeams(),
      reviews: this.getReviews(),
      settings: this.getSettings(),
      audit_logs: this.getAuditLogs(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Wonders_of_AI_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static importFullBackup(jsonString: string, judgeUsername = 'admin1'): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.teams)) {
        this.saveTeams(data.teams);
      }
      if (Array.isArray(data.reviews)) {
        this.saveReviews(data.reviews);
      }
      if (data.settings) {
        this.saveSettings(data.settings, judgeUsername);
      }
      this.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: judgeUsername,
        action: 'data_import',
        details: `Restored full database backup (${data.teams?.length || 0} teams, ${data.reviews?.length || 0} reviews).`,
      });
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }
}
