import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Team, Review, CompetitionSettings, AuditLog, TeamScoreSummary } from '../types';
import { StorageService } from '../services/storage';
import { SupabaseService } from '../services/supabaseService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { calculateTeamSummaries } from '../utils/calculations';
import { DEFAULT_SETTINGS } from '../constants/rubrics';
import { useAuth } from './AuthContext';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

export interface RubricImportScore {
  criterion_id: string;
  criterion_name: string;
  score: number;
  max_score: number;
  comments?: string;
}

export interface DetailedReviewImportRecord {
  team_number: string;
  review_number: 1 | 2 | 3;
  scores: RubricImportScore[];
  total_score: number;
  max_possible_score: number;
  comments?: string;
  judge_username?: string;
}

interface DataContextType {
  teams: Team[];
  reviews: Review[];
  settings: CompetitionSettings;
  auditLogs: AuditLog[];
  summaries: TeamScoreSummary[];
  isDatabaseConnected: boolean;
  kpis: {
    totalTeams: number;
    r1Completed: number;
    r2Completed: number;
    r3Completed: number;
    r1ProgressPct: number;
    r2ProgressPct: number;
    r3ProgressPct: number;
    eligibleForFinale: number;
    averageScore: number;
  };
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  toasts: ToastMessage[];
  showToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  
  // Modals & Navigation helpers
  selectedTeamForDrawer: Team | null;
  openTeamDrawer: (team: Team) => void;
  closeTeamDrawer: () => void;
  
  isQuickEvaluateOpen: boolean;
  openQuickEvaluate: () => void;
  closeQuickEvaluate: () => void;
  
  isImportModalOpen: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;

  isMarksImportOpen: boolean;
  openMarksImport: () => void;
  closeMarksImport: () => void;

  isAddEditTeamOpen: boolean;
  teamToEdit: Team | null;
  openAddTeam: () => void;
  openEditTeam: (team: Team) => void;
  closeAddEditTeam: () => void;

  isEditMarksOpen: boolean;
  summaryToEditMarks: TeamScoreSummary | null;
  openEditMarks: (summary: TeamScoreSummary) => void;
  closeEditMarks: () => void;

  // Actions
  saveTeamAction: (team: Team) => Promise<void>;
  saveReview: (review: Review) => Promise<Review>;
  unlockReview: (teamId: string, reviewNumber: 1 | 2 | 3, reason: string) => Promise<boolean>;
  importTeams: (newTeams: Team[], mode: 'append' | 'replace' | 'overwrite') => Promise<{ added: number; updated: number; skipped: number }>;
  importMarksFromExcel: (rows: { team_number: string; r1?: number | null; r2?: number | null; r3?: number | null }[]) => Promise<void>;
  importDetailedReviewMarks: (records: DetailedReviewImportRecord[]) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  deleteTeamsBulk: (teamIds: string[]) => Promise<void>;
  updateSettings: (newSettings: CompetitionSettings) => Promise<void>;
  clearAllReviews: () => Promise<void>;
  clearAllTeams: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<CompetitionSettings>(DEFAULT_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>(StorageService.getTheme());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState<boolean>(isSupabaseConfigured);

  const [selectedTeamForDrawer, setSelectedTeamForDrawer] = useState<Team | null>(null);
  const [isQuickEvaluateOpen, setIsQuickEvaluateOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMarksImportOpen, setIsMarksImportOpen] = useState(false);

  const [isAddEditTeamOpen, setIsAddEditTeamOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);

  const [isEditMarksOpen, setIsEditMarksOpen] = useState(false);
  const [summaryToEditMarks, setSummaryToEditMarks] = useState<TeamScoreSummary | null>(null);

  // Load all data from Supabase, fallback to localStorage
  const loadAll = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const [dbTeams, dbReviews, dbSettings, dbLogs] = await Promise.all([
          SupabaseService.getTeams(),
          SupabaseService.getReviews(),
          SupabaseService.getSettings(),
          SupabaseService.getAuditLogs(),
        ]);

        if (dbTeams.length > 0 || dbReviews.length > 0) {
          setTeams(dbTeams);
          setReviews(dbReviews);
          setSettings(dbSettings);
          setAuditLogs(dbLogs);
          setIsDatabaseConnected(true);

          // Update local cache
          StorageService.saveTeams(dbTeams);
          StorageService.saveReviews(dbReviews);
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local storage cache:', err);
      }
    }

    // Fallback to local storage
    StorageService.init();
    setTeams(StorageService.getTeams());
    setReviews(StorageService.getReviews());
    setSettings(StorageService.getSettings());
    setAuditLogs(StorageService.getAuditLogs());
  }, [user]);

  useEffect(() => {
    loadAll();

    // Subscribe to Supabase real-time updates across multiple judges
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('woai-live-judging')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
          loadAll();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
          loadAll();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
          loadAll();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadAll]);

  // Apply theme class to HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light-mode');
    } else {
      root.classList.remove('dark');
      root.classList.add('light-mode');
    }
    StorageService.saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = useCallback(
    (title: string, message?: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Compute calculated summaries
  const summaries = useMemo(() => {
    return calculateTeamSummaries(teams, reviews, settings);
  }, [teams, reviews, settings]);

  // Compute KPI statistics
  const kpis = useMemo(() => {
    const total = teams.length;
    const r1Done = reviews.filter((r) => r.review_number === 1 && r.status === 'submitted').length;
    const r2Done = reviews.filter((r) => r.review_number === 2 && r.status === 'submitted').length;
    const r3Done = reviews.filter((r) => r.review_number === 3 && r.status === 'submitted').length;

    const eligibleCount = summaries.filter((s) => s.isEligibleForFinale).length;

    const evaluatedSummaries = summaries.filter((s) => s.weightedPercentage !== null);
    const avgScore =
      evaluatedSummaries.length > 0
        ? evaluatedSummaries.reduce((sum, s) => sum + (s.weightedPercentage || 0), 0) /
          evaluatedSummaries.length
        : 0;

    return {
      totalTeams: total,
      r1Completed: r1Done,
      r2Completed: r2Done,
      r3Completed: r3Done,
      r1ProgressPct: total > 0 ? Math.round((r1Done / total) * 100) : 0,
      r2ProgressPct: total > 0 ? Math.round((r2Done / total) * 100) : 0,
      r3ProgressPct: total > 0 ? Math.round((r3Done / total) * 100) : 0,
      eligibleForFinale: eligibleCount,
      averageScore: Number(avgScore.toFixed(1)),
    };
  }, [teams, reviews, summaries]);

  // Actions
  const saveReview = async (review: Review): Promise<Review> => {
    const judgeUser = user?.username || 'admin1';

    // 1. Save to Supabase
    if (isSupabaseConfigured) {
      await SupabaseService.saveReview(review, judgeUser);
    }

    // 2. Save to local storage
    const saved = StorageService.saveSingleReview(review, judgeUser);

    // 3. Reload latest
    await loadAll();

    if (review.status === 'submitted') {
      showToast(
        'Review Submitted',
        `Review ${review.review_number} for ${review.team_number} successfully submitted & saved to database.`,
        'success'
      );
    } else {
      showToast(
        'Draft Saved',
        `Draft for ${review.team_number} saved to database.`,
        'info'
      );
    }

    return saved;
  };

  const unlockReview = async (
    teamId: string,
    reviewNumber: 1 | 2 | 3,
    reason: string
  ): Promise<boolean> => {
    const adminUser = user?.username || 'admin1';

    if (isSupabaseConfigured) {
      await SupabaseService.unlockReview(teamId, reviewNumber, adminUser, reason);
    }

    const ok = StorageService.unlockReview(teamId, reviewNumber, adminUser, reason);
    await loadAll();

    if (ok) {
      showToast('Evaluation Unlocked', `Review ${reviewNumber} unlocked on database for editing.`, 'warning');
    } else {
      showToast('Unlock Failed', 'Could not unlock evaluation.', 'error');
    }
    return ok;
  };

  const importTeams = async (
    newTeams: Team[],
    mode: 'append' | 'replace' | 'overwrite'
  ): Promise<{ added: number; updated: number; skipped: number }> => {
    const currentTeams = mode === 'replace' ? [] : (teams.length > 0 ? teams : StorageService.getTeams());
    let added = 0;
    let updated = 0;
    let skipped = 0;

    const teamMap = new Map<string, Team>();
    if (mode !== 'replace') {
      currentTeams.forEach((t) => teamMap.set(t.team_number.trim().toUpperCase(), t));
    }

    newTeams.forEach((nt) => {
      const key = nt.team_number.trim().toUpperCase();
      if (teamMap.has(key)) {
        if (mode === 'overwrite' || mode === 'replace') {
          teamMap.set(key, { ...teamMap.get(key)!, ...nt, is_demo: false, updated_at: new Date().toISOString() });
          updated++;
        } else {
          skipped++;
        }
      } else {
        teamMap.set(key, { ...nt, is_demo: false });
        added++;
      }
    });

    const finalTeams = Array.from(teamMap.values());

    if (isSupabaseConfigured) {
      if (mode === 'replace') {
        await SupabaseService.clearAllTeams(user?.username || 'admin1');
      }
      await SupabaseService.saveTeamsBulk(finalTeams);
      await SupabaseService.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: user?.username || 'admin1',
        action: 'data_import',
        details: `Imported ${finalTeams.length} spreadsheet teams into Supabase. Added: ${added}, Updated: ${updated}, Skipped: ${skipped}.`,
      });
    }

    StorageService.saveTeams(finalTeams);
    await loadAll();

    showToast(
      'Teams Synced to Database',
      `Imported ${added} new teams${updated > 0 ? `, updated ${updated}` : ''}. Total teams: ${finalTeams.length}`,
      'success'
    );

    return { added, updated, skipped };
  };

  const deleteTeam = async (teamId: string) => {
    if (isSupabaseConfigured) {
      await SupabaseService.deleteTeam(teamId);
    }
    const updated = teams.filter((t) => t.id !== teamId);
    StorageService.saveTeams(updated);
    await loadAll();
    showToast('Team Deleted', 'The team has been removed from database.', 'info');
  };

  const deleteTeamsBulkAction = async (teamIds: string[]) => {
    if (teamIds.length === 0) return;
    if (isSupabaseConfigured) {
      await SupabaseService.deleteTeamsBulk(teamIds);
    }
    StorageService.deleteTeamsBulk(teamIds);
    await loadAll();
    showToast('Teams Deleted', `Successfully deleted ${teamIds.length} team(s) from database.`, 'info');
  };

  const updateSettings = async (newSettings: CompetitionSettings) => {
    if (isSupabaseConfigured) {
      await SupabaseService.saveSettings(newSettings, user?.username || 'admin1');
    }
    StorageService.saveSettings(newSettings, user?.username || 'admin1');
    setSettings(newSettings);
    showToast('Settings Saved', 'Competition rubrics & weights updated on database.', 'success');
  };

  const clearAllReviewsAction = async () => {
    if (isSupabaseConfigured) {
      await SupabaseService.clearAllReviews(user?.username || 'admin1');
    }
    StorageService.clearAllReviews(user?.username || 'admin1');
    await loadAll();
    showToast('Reviews Cleared', 'All evaluation scores and drafts reset.', 'warning');
  };

  const clearAllTeamsAction = async () => {
    if (isSupabaseConfigured) {
      await SupabaseService.clearAllTeams(user?.username || 'admin1');
    }
    StorageService.clearAllTeams(user?.username || 'admin1');
    await loadAll();
    showToast('Database Cleared', 'All teams and reviews deleted from Supabase.', 'warning');
  };

  const openTeamDrawer = (team: Team) => {
    setSelectedTeamForDrawer(team);
  };

  const closeTeamDrawer = () => {
    setSelectedTeamForDrawer(null);
  };

  const openQuickEvaluate = () => setIsQuickEvaluateOpen(true);
  const closeQuickEvaluate = () => setIsQuickEvaluateOpen(false);

  const openImportModal = () => setIsImportModalOpen(true);
  const closeImportModal = () => setIsImportModalOpen(false);

  const openMarksImport = () => setIsMarksImportOpen(true);
  const closeMarksImport = () => setIsMarksImportOpen(false);

  const openAddTeam = () => {
    setTeamToEdit(null);
    setIsAddEditTeamOpen(true);
  };

  const openEditTeam = (team: Team) => {
    setTeamToEdit(team);
    setIsAddEditTeamOpen(true);
  };

  const closeAddEditTeam = () => {
    setIsAddEditTeamOpen(false);
    setTeamToEdit(null);
  };

  const saveTeamAction = async (team: Team) => {
    if (isSupabaseConfigured) {
      await SupabaseService.saveSingleTeam(team);
    }
    StorageService.saveSingleTeam(team);
    await loadAll();
    showToast(
      teamToEdit ? 'Team Updated' : 'Team Registered',
      `Team ${team.team_number} (${team.team_name}) saved successfully.`,
      'success'
    );
  };

  const openEditMarks = (summary: TeamScoreSummary) => {
    setSummaryToEditMarks(summary);
    setIsEditMarksOpen(true);
  };

  const closeEditMarks = () => {
    setIsEditMarksOpen(false);
    setSummaryToEditMarks(null);
  };

  const findTeamForImport = (teamNumOrName: string): Team | undefined => {
    if (!teamNumOrName) return undefined;
    const clean = teamNumOrName.trim().toUpperCase();
    // 1. Exact match
    const exact = teams.find(t => t.team_number.trim().toUpperCase() === clean);
    if (exact) return exact;

    // 2. Normalized alphanumerics match (e.g. WOAI-101 matches 101, WOAI101, etc.)
    const alphaNumClean = clean.replace(/[^A-Z0-9]/g, '');
    const normMatch = teams.find(t => {
      const tClean = t.team_number.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      return tClean === alphaNumClean || tClean.endsWith(alphaNumClean) || alphaNumClean.endsWith(tClean);
    });
    if (normMatch) return normMatch;

    // 3. Match by Team Name
    const nameMatch = teams.find(t => t.team_name.trim().toUpperCase() === clean);
    return nameMatch;
  };

  // Import marks directly from Excel — creates reviews for each team/round
  const importMarksFromExcel = async (
    rows: { team_number: string; r1?: number | null; r2?: number | null; r3?: number | null }[]
  ): Promise<void> => {
    const judgeUser = user?.username || 'admin1';

    for (const row of rows) {
      const team = findTeamForImport(row.team_number);
      if (!team) continue;

      const makeReview = (reviewNumber: 1 | 2 | 3, score: number, maxScore: number): Review => ({
        id: `rev-import-${team.id}-${reviewNumber}-${Date.now()}`,
        team_id: team.id,
        team_number: team.team_number,
        review_number: reviewNumber,
        judge_id: `judge-${judgeUser}`,
        judge_username: judgeUser,
        scores: [],
        total_score: score,
        max_possible_score: maxScore,
        comments: 'Imported from Excel',
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_locked: true,
      });

      if (row.r1 !== null && row.r1 !== undefined) {
        const rev = makeReview(1, row.r1, settings.review_1_max || 50);
        await SupabaseService.saveReview(rev, judgeUser);
        StorageService.saveSingleReview(rev, judgeUser);
      }
      if (row.r2 !== null && row.r2 !== undefined) {
        const rev = makeReview(2, row.r2, settings.review_2_max || 50);
        await SupabaseService.saveReview(rev, judgeUser);
        StorageService.saveSingleReview(rev, judgeUser);
      }
      if (row.r3 !== null && row.r3 !== undefined) {
        const rev = makeReview(3, row.r3, settings.review_3_max || 100);
        await SupabaseService.saveReview(rev, judgeUser);
        StorageService.saveSingleReview(rev, judgeUser);
      }
    }

    await SupabaseService.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      judge_username: judgeUser,
      action: 'data_import',
      details: `Imported marks for ${rows.length} teams from Excel spreadsheet.`,
    });

    await loadAll();
  };

  const importDetailedReviewMarks = async (
    records: DetailedReviewImportRecord[]
  ): Promise<void> => {
    const judgeUser = user?.username || 'admin1';
    let importedCount = 0;

    for (const rec of records) {
      const team = findTeamForImport(rec.team_number);
      if (!team) continue;

      const reviewItem: Review = {
        id: `rev-rubric-${team.id}-${rec.review_number}-${Date.now()}-${importedCount}`,
        team_id: team.id,
        team_number: team.team_number,
        review_number: rec.review_number,
        judge_id: `judge-${rec.judge_username || judgeUser}`,
        judge_username: rec.judge_username || judgeUser,
        scores: rec.scores.map(s => ({
          criterion_id: s.criterion_id,
          criterion_name: s.criterion_name,
          score: s.score,
          max_score: s.max_score,
          comments: s.comments || '',
        })),
        total_score: rec.total_score,
        max_possible_score: rec.max_possible_score,
        comments: rec.comments || `Imported Review ${rec.review_number} marks with rubric mapping`,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_locked: true,
      };

      if (isSupabaseConfigured) {
        await SupabaseService.saveReview(reviewItem, reviewItem.judge_username);
      }
      StorageService.saveSingleReview(reviewItem, reviewItem.judge_username);
      importedCount++;
    }

    if (isSupabaseConfigured) {
      await SupabaseService.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: judgeUser,
        action: 'data_import',
        details: `Imported rubric marks for ${importedCount} review evaluation(s) from spreadsheet.`,
      });
    }

    await loadAll();
  };

  return (
    <DataContext.Provider
      value={{
        teams,
        reviews,
        settings,
        auditLogs,
        summaries,
        isDatabaseConnected,
        kpis,
        theme,
        toggleTheme,
        toasts,
        showToast,
        removeToast,
        selectedTeamForDrawer,
        openTeamDrawer,
        closeTeamDrawer,
        isQuickEvaluateOpen,
        openQuickEvaluate,
        closeQuickEvaluate,
        isImportModalOpen,
        openImportModal,
        closeImportModal,
        isMarksImportOpen,
        openMarksImport,
        closeMarksImport,
        isAddEditTeamOpen,
        teamToEdit,
        openAddTeam,
        openEditTeam,
        closeAddEditTeam,
        saveTeamAction,
        isEditMarksOpen,
        summaryToEditMarks,
        openEditMarks,
        closeEditMarks,
        saveReview,
        unlockReview,
        importTeams,
        importMarksFromExcel,
        importDetailedReviewMarks,
        deleteTeam,
        deleteTeamsBulk: deleteTeamsBulkAction,
        updateSettings,
        clearAllReviews: clearAllReviewsAction,
        clearAllTeams: clearAllTeamsAction,
        refreshData: loadAll,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
