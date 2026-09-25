import { supabase } from './supabaseClient';
import type { Team, Review, CompetitionSettings, AuditLog } from '../types';
import { SAMPLE_TEAMS, SAMPLE_INITIAL_REVIEWS } from '../constants/sampleTeams';
import { DEFAULT_SETTINGS } from '../constants/rubrics';
// Note: SAMPLE_TEAMS and SAMPLE_INITIAL_REVIEWS kept for resetToDemo() only — auto-seeding is disabled.

export class SupabaseService {
  // 1. TEAMS
  static async getTeams(): Promise<Team[]> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          team_number,
          team_name,
          problem_statement_id,
          problem_statement,
          college_name,
          contact_number,
          leader_name,
          leader_euphoria_id,
          is_demo,
          created_at,
          updated_at,
          team_members (
            id,
            member_name,
            email,
            role,
            college_name,
            euphoria_id,
            contact_number
          )
        `)
        .order('team_number', { ascending: true });

      if (error) {
        console.error('Supabase getTeams error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((row: any) => ({
        id: row.id,
        team_number: row.team_number,
        team_name: row.team_name,
        problem_statement_id: row.problem_statement_id || 'PS-TBD',
        problem_statement: row.problem_statement || '',
        college_name: row.college_name || '',
        contact_number: row.contact_number || '',
        leader_name: row.leader_name || '',
        leader_euphoria_id: row.leader_euphoria_id || '',
        is_demo: Boolean(row.is_demo),
        created_at: row.created_at,
        updated_at: row.updated_at,
        members: (row.team_members || []).map((m: any) => ({
          id: m.id,
          name: m.member_name,
          email: m.email || '',
          role: m.role || '',
          college_name: m.college_name || '',
          euphoria_id: m.euphoria_id || '',
          contact_number: m.contact_number || '',
        })),
      }));
    } catch (err) {
      console.error('Failed to get teams from Supabase:', err);
      return [];
    }
  }

  static async saveTeamsBulk(teams: Team[]): Promise<boolean> {
    try {
      if (teams.length === 0) return true;

      // 1. Prepare teams rows
      const teamRows = teams.map((t) => ({
        id: t.id,
        team_number: t.team_number,
        team_name: t.team_name,
        problem_statement_id: t.problem_statement_id,
        problem_statement: t.problem_statement,
        college_name: t.college_name || null,
        contact_number: t.contact_number || null,
        leader_name: t.leader_name || null,
        leader_euphoria_id: t.leader_euphoria_id || null,
        is_demo: Boolean(t.is_demo),
        updated_at: new Date().toISOString(),
      }));

      const { error: teamError } = await supabase
        .from('teams')
        .upsert(teamRows, { onConflict: 'team_number' });

      if (teamError) {
        console.error('Error upserting teams to Supabase:', teamError);
        return false;
      }

      // 2. Prepare member rows
      const memberRows: any[] = [];
      teams.forEach((t) => {
        t.members.forEach((m, idx) => {
          memberRows.push({
            id: m.id || `m-${t.id}-${idx}`,
            team_id: t.id,
            member_name: m.name,
            email: m.email || '',
            role: m.role || '',
            college_name: m.college_name || '',
            euphoria_id: m.euphoria_id || '',
            contact_number: m.contact_number || '',
          });
        });
      });

      if (memberRows.length > 0) {
        const { error: memberError } = await supabase
          .from('team_members')
          .upsert(memberRows, { onConflict: 'id' });

        if (memberError) {
          console.error('Error upserting team members to Supabase:', memberError);
        }
      }

      return true;
    } catch (err) {
      console.error('saveTeamsBulk failed:', err);
      return false;
    }
  }

  static async saveSingleTeam(team: Team): Promise<boolean> {
    try {
      const teamRow = {
        id: team.id,
        team_number: team.team_number,
        team_name: team.team_name,
        problem_statement_id: team.problem_statement_id,
        problem_statement: team.problem_statement,
        college_name: team.college_name || null,
        contact_number: team.contact_number || null,
        leader_name: team.leader_name || null,
        leader_euphoria_id: team.leader_euphoria_id || null,
        is_demo: Boolean(team.is_demo),
        updated_at: new Date().toISOString(),
      };

      // 1. Check if team exists by id
      const { data: existingById } = await supabase
        .from('teams')
        .select('id, team_number')
        .eq('id', team.id)
        .maybeSingle();

      if (existingById) {
        // Update existing team by id (allows changing team_number freely)
        const { error: updateError } = await supabase
          .from('teams')
          .update(teamRow)
          .eq('id', team.id);

        if (updateError) {
          console.error('Error updating team by ID:', updateError);
          return false;
        }

        // Keep reviews synchronized if team_number was updated
        if (existingById.team_number !== team.team_number) {
          await supabase
            .from('reviews')
            .update({ team_number: team.team_number, updated_at: new Date().toISOString() })
            .eq('team_id', team.id);
        }
      } else {
        // Check if there is already a team with this team_number
        const { data: existingByNum } = await supabase
          .from('teams')
          .select('id')
          .eq('team_number', team.team_number)
          .maybeSingle();

        if (existingByNum) {
          const { error: updateError } = await supabase
            .from('teams')
            .update({ ...teamRow, id: existingByNum.id })
            .eq('id', existingByNum.id);

          if (updateError) {
            console.error('Error updating team by number:', updateError);
            return false;
          }
        } else {
          const { error: insertError } = await supabase
            .from('teams')
            .insert(teamRow);

          if (insertError) {
            console.error('Error inserting team:', insertError);
            return false;
          }
        }
      }

      // 2. Delete existing members for this team and insert updated members
      await supabase.from('team_members').delete().eq('team_id', team.id);

      if (team.members && team.members.length > 0) {
        const memberRows = team.members.map((m, idx) => ({
          id: m.id || `m-${team.id}-${idx}-${Date.now()}`,
          team_id: team.id,
          member_name: m.name,
          email: m.email || '',
          role: m.role || '',
          college_name: m.college_name || '',
          euphoria_id: m.euphoria_id || '',
          contact_number: m.contact_number || '',
        }));

        await supabase.from('team_members').insert(memberRows);
      }

      return true;
    } catch (err) {
      console.error('saveSingleTeam error:', err);
      return false;
    }
  }

  static async deleteTeam(teamId: string): Promise<boolean> {
    try {
      await supabase.from('team_members').delete().eq('team_id', teamId);
      await supabase.from('reviews').delete().eq('team_id', teamId);
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) {
        console.error('Error deleting team:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('deleteTeam failed:', err);
      return false;
    }
  }

  static async deleteTeamsBulk(teamIds: string[]): Promise<boolean> {
    try {
      if (teamIds.length === 0) return true;
      await supabase.from('team_members').delete().in('team_id', teamIds);
      await supabase.from('reviews').delete().in('team_id', teamIds);
      const { error } = await supabase.from('teams').delete().in('id', teamIds);
      if (error) {
        console.error('Error deleting teams in bulk:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('deleteTeamsBulk failed:', err);
      return false;
    }
  }

  // 2. REVIEWS
  static async getReviews(): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          team_id,
          team_number,
          review_number,
          judge_id,
          judge_username,
          total_score,
          max_possible_score,
          comments,
          status,
          submitted_at,
          is_locked,
          unlocked_at,
          unlocked_by,
          unlock_reason,
          created_at,
          updated_at,
          review_scores (
            id,
            criterion_id,
            criterion_name,
            score,
            max_score,
            comments
          )
        `);

      if (error) {
        console.error('Supabase getReviews error:', error);
        return [];
      }

      if (!data) return [];

      return data.map((row: any) => ({
        id: row.id,
        team_id: row.team_id,
        team_number: row.team_number,
        review_number: row.review_number as 1 | 2 | 3,
        judge_id: row.judge_id,
        judge_username: row.judge_username,
        total_score: Number(row.total_score),
        max_possible_score: Number(row.max_possible_score),
        comments: row.comments || '',
        status: row.status as 'draft' | 'submitted',
        submitted_at: row.submitted_at || undefined,
        is_locked: Boolean(row.is_locked),
        unlocked_at: row.unlocked_at || undefined,
        unlocked_by: row.unlocked_by || undefined,
        unlock_reason: row.unlock_reason || undefined,
        updated_at: row.updated_at,
        scores: (row.review_scores || []).map((s: any) => ({
          criterion_id: s.criterion_id,
          criterion_name: s.criterion_name,
          score: Number(s.score),
          max_score: Number(s.max_score),
          comments: s.comments || '',
        })),
      }));
    } catch (err) {
      console.error('getReviews failed:', err);
      return [];
    }
  }

  static async saveReview(review: Review, judgeUsername: string): Promise<boolean> {
    try {
      // 1. Check if a review row already exists for this team and round to preserve/use stable ID
      let reviewId = review.id;
      const { data: existingRev } = await supabase
        .from('reviews')
        .select('id')
        .eq('team_id', review.team_id)
        .eq('review_number', review.review_number)
        .maybeSingle();

      if (existingRev?.id) {
        reviewId = existingRev.id;
      } else if (!reviewId) {
        reviewId = `rev-${review.team_id}-${review.review_number}`;
      }

      const reviewRow = {
        id: reviewId,
        team_id: review.team_id,
        team_number: review.team_number,
        review_number: review.review_number,
        judge_id: review.judge_id || `judge-${judgeUsername}`,
        judge_username: judgeUsername,
        total_score: review.total_score,
        max_possible_score: review.max_possible_score,
        comments: review.comments || '',
        status: review.status,
        submitted_at: review.status === 'submitted' ? (review.submitted_at || new Date().toISOString()) : null,
        is_locked: Boolean(review.is_locked),
        unlocked_at: review.unlocked_at || null,
        unlocked_by: review.unlocked_by || null,
        unlock_reason: review.unlock_reason || null,
        updated_at: new Date().toISOString(),
      };

      const { error: revError } = await supabase
        .from('reviews')
        .upsert(reviewRow, { onConflict: 'team_id,review_number' });

      if (revError) {
        console.error('Error saving review to Supabase:', revError);
        return false;
      }

      // 2. Delete existing scores for this review and re-insert
      await supabase.from('review_scores').delete().eq('review_id', reviewId);

      if (review.scores && review.scores.length > 0) {
        const scoreRows = review.scores.map((s, idx) => ({
          id: `score-${reviewId}-${idx}-${Date.now()}`,
          review_id: reviewId,
          criterion_id: s.criterion_id,
          criterion_name: s.criterion_name,
          score: s.score,
          max_score: s.max_score,
          comments: s.comments || '',
        }));

        const { error: scoreError } = await supabase.from('review_scores').insert(scoreRows);
        if (scoreError) {
          console.error('Error inserting review scores to Supabase:', scoreError);
        }
      }

      // 3. Log audit action
      await this.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: judgeUsername,
        action: review.status === 'submitted' ? 'review_submit' : 'review_draft',
        details: `${review.status === 'submitted' ? 'Submitted' : 'Saved draft for'} Review ${review.review_number} (${review.total_score}/${review.max_possible_score} pts) on Supabase Database`,
        team_number: review.team_number,
      });

      return true;
    } catch (err) {
      console.error('saveReview failed:', err);
      return false;
    }
  }

  static async unlockReview(
    teamId: string,
    reviewNumber: 1 | 2 | 3,
    adminUsername: string,
    reason: string
  ): Promise<boolean> {
    try {
      const { data: rev, error: findError } = await supabase
        .from('reviews')
        .select('*')
        .eq('team_id', teamId)
        .eq('review_number', reviewNumber)
        .single();

      if (findError || !rev) {
        console.error('Review to unlock not found:', findError);
        return false;
      }

      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          is_locked: false,
          status: 'draft',
          unlocked_at: new Date().toISOString(),
          unlocked_by: adminUsername,
          unlock_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rev.id);

      if (updateError) {
        console.error('Error unlocking review in Supabase:', updateError);
        return false;
      }

      await this.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: adminUsername,
        action: 'review_unlock',
        details: `Unlocked Review ${reviewNumber} on Supabase. Reason: "${reason}"`,
        team_number: rev.team_number,
      });

      return true;
    } catch (err) {
      console.error('unlockReview failed:', err);
      return false;
    }
  }

  // 3. SETTINGS
  static async getSettings(): Promise<CompetitionSettings> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_name', 'competition_config')
        .single();

      if (error || !data) {
        return DEFAULT_SETTINGS;
      }

      return { ...DEFAULT_SETTINGS, ...data.setting_value };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings: CompetitionSettings, adminUsername = 'admin1'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert(
          {
            id: 'main-settings',
            setting_name: 'competition_config',
            setting_value: settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'setting_name' }
        );

      if (error) {
        console.error('Error saving settings to Supabase:', error);
        return false;
      }

      await this.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: adminUsername,
        action: 'settings_update',
        details: `Updated competition settings in Supabase database.`,
      });

      return true;
    } catch (err) {
      console.error('saveSettings failed:', err);
      return false;
    }
  }

  // 4. AUDIT LOGS
  static async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        judge_username: row.judge_username,
        action: row.action,
        details: row.details,
        team_number: row.team_number,
      }));
    } catch {
      return [];
    }
  }

  static async addAuditLog(log: AuditLog): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        id: log.id || `log-${Date.now()}`,
        timestamp: log.timestamp || new Date().toISOString(),
        judge_username: log.judge_username,
        action: log.action,
        details: log.details,
        team_number: log.team_number || null,
      });
    } catch (err) {
      console.error('addAuditLog failed:', err);
    }
  }

  // 5. SEEDING & RESET ACTIONS
  // Auto-seeding is DISABLED — the app starts empty and only shows teams you import.
  static async seedDemoDataIfEmpty(_judgeUsername = 'admin1'): Promise<void> {
    // Intentionally left empty — no demo data is injected automatically.
    // Use Settings > Reset to Demo if you want to restore sample data.
    return;
  }

  static async resetToDemo(judgeUsername = 'admin1'): Promise<boolean> {
    try {
      await supabase.from('reviews').delete().neq('id', 'keep');
      await supabase.from('teams').delete().neq('id', 'keep');
      await this.saveTeamsBulk(SAMPLE_TEAMS);
      for (const rev of SAMPLE_INITIAL_REVIEWS) {
        await this.saveReview(rev, rev.judge_username || judgeUsername);
      }
      await this.saveSettings(DEFAULT_SETTINGS, judgeUsername);
      await this.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: judgeUsername,
        action: 'data_reset',
        details: 'Reset Supabase database back to standard demo dataset.',
      });
      return true;
    } catch (err) {
      console.error('resetToDemo failed:', err);
      return false;
    }
  }

  static async clearAllReviews(judgeUsername = 'admin1'): Promise<boolean> {
    try {
      await supabase.from('review_scores').delete().neq('id', 'keep');
      await supabase.from('reviews').delete().neq('id', 'keep');
      await this.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: judgeUsername,
        action: 'data_reset',
        details: 'Cleared all reviews from Supabase.',
      });
      return true;
    } catch (err) {
      console.error('clearAllReviews failed:', err);
      return false;
    }
  }

  static async clearAllTeams(judgeUsername = 'admin1'): Promise<boolean> {
    try {
      await supabase.from('review_scores').delete().neq('id', 'keep');
      await supabase.from('reviews').delete().neq('id', 'keep');
      await supabase.from('team_members').delete().neq('id', 'keep');
      await supabase.from('teams').delete().neq('id', 'keep');
      await this.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: judgeUsername,
        action: 'data_reset',
        details: 'Wiped all teams and reviews from Supabase database.',
      });
      return true;
    } catch (err) {
      console.error('clearAllTeams failed:', err);
      return false;
    }
  }
}
