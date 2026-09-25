import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { TeamsTable } from './components/teams/TeamsTable';
import { TeamDetailsDrawer } from './components/teams/TeamDetailsDrawer';
import { ExcelImportModal } from './components/teams/ExcelImportModal';
import { QuickEvaluateModal } from './components/dashboard/QuickEvaluateModal';
import { ReviewEvaluationPage } from './components/reviews/ReviewEvaluationPage';
import { MarksLedger } from './components/marks/MarksLedger';
import { LeaderboardPage } from './components/leaderboard/LeaderboardPage';
import { GlobalSearchPage } from './components/search/GlobalSearchPage';
import { SettingsPage } from './components/settings/SettingsPage';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [targetEvaluationTeam, setTargetEvaluationTeam] = useState<string | undefined>(undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 text-xs font-mono">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Initializing Wonders of AI Portal...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleStartReview = (roundNumber: 1 | 2 | 3, teamNumber: string) => {
    setTargetEvaluationTeam(teamNumber);
    if (roundNumber === 1) setCurrentTab('review1');
    else if (roundNumber === 2) setCurrentTab('review2');
    else if (roundNumber === 3) setCurrentTab('review3');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex overflow-x-hidden font-sans">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setTargetEvaluationTeam(undefined);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setTargetEvaluationTeam(undefined);
          }}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardHome
              onNavigateTab={(tab) => {
                setCurrentTab(tab);
                setTargetEvaluationTeam(undefined);
              }}
              onStartReview={handleStartReview}
            />
          )}

          {currentTab === 'teams' && (
            <TeamsTable onStartReview={handleStartReview} />
          )}

          {currentTab === 'review1' && (
            <ReviewEvaluationPage
              roundNumber={1}
              initialTeamNumber={targetEvaluationTeam}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'review2' && (
            <ReviewEvaluationPage
              roundNumber={2}
              initialTeamNumber={targetEvaluationTeam}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'review3' && (
            <ReviewEvaluationPage
              roundNumber={3}
              initialTeamNumber={targetEvaluationTeam}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'marks' && (
            <MarksLedger onStartReview={handleStartReview} />
          )}

          {currentTab === 'leaderboard' && (
            <LeaderboardPage onStartReview={handleStartReview} onNavigateTab={setCurrentTab} />
          )}

          {currentTab === 'search' && (
            <GlobalSearchPage onStartReview={handleStartReview} />
          )}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      <TeamDetailsDrawer onStartReview={handleStartReview} />
      <ExcelImportModal />
      <QuickEvaluateModal onStartReview={handleStartReview} />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainLayout />
      </DataProvider>
    </AuthProvider>
  );
}
