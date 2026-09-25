import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { EmptyState } from '../common/EmptyState';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Zap,
  Trash2,
  UploadCloud,
} from 'lucide-react';

interface TeamsTableProps {
  onStartReview: (roundNumber: 1 | 2 | 3, teamNumber: string) => void;
}

export const TeamsTable: React.FC<TeamsTableProps> = ({ onStartReview }) => {
  const {
    teams,
    summaries,
    openTeamDrawer,
    openImportModal,
    deleteTeam,
    resetToDemo,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<'all' | 'r1_pending' | 'r1_done' | 'r2_done' | 'r3_done' | 'eligible'>('all');
  const [sortField, setSortField] = useState<'number' | 'name' | 'ps_id'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const summaryMap = useMemo(() => {
    const map = new Map();
    summaries.forEach((s) => map.set(s.team.id, s));
    return map;
  }, [summaries]);

  const filteredTeams = useMemo(() => {
    let list = [...teams];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const matchNum = t.team_number.toLowerCase().includes(q);
        const matchName = t.team_name.toLowerCase().includes(q);
        const matchPsId = t.problem_statement_id.toLowerCase().includes(q);
        const matchPs = t.problem_statement.toLowerCase().includes(q);
        const matchMembers = t.members.some((m) => m.name.toLowerCase().includes(q));
        return matchNum || matchName || matchPsId || matchPs || matchMembers;
      });
    }

    if (filterStage !== 'all') {
      list = list.filter((t) => {
        const s = summaryMap.get(t.id);
        if (!s) return false;
        if (filterStage === 'r1_pending') return s.r1Score === null;
        if (filterStage === 'r1_done') return s.r1Score !== null;
        if (filterStage === 'r2_done') return s.r2Score !== null;
        if (filterStage === 'r3_done') return s.r3Score !== null;
        if (filterStage === 'eligible') return s.isEligibleForFinale;
        return true;
      });
    }

    list.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortField === 'number') {
        valA = a.team_number;
        valB = b.team_number;
      } else if (sortField === 'name') {
        valA = a.team_name.toLowerCase();
        valB = b.team_name.toLowerCase();
      } else if (sortField === 'ps_id') {
        valA = a.problem_statement_id.toLowerCase();
        valB = b.problem_statement_id.toLowerCase();
      }

      const res = valA.localeCompare(valB, undefined, { numeric: true });
      return sortOrder === 'asc' ? res : -res;
    });

    return list;
  }, [teams, searchQuery, filterStage, sortField, sortOrder, summaryMap]);

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / pageSize));
  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeams.slice(start, start + pageSize);
  }, [filteredTeams, currentPage, pageSize]);

  const toggleSort = (field: 'number' | 'name' | 'ps_id') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (teams.length === 0) {
    return (
      <EmptyState
        icon="spreadsheet"
        title="No Teams in the System"
        description="Upload your hackathon teams Excel or CSV spreadsheet to begin evaluation, or load demo sample data."
        actionText="Import Excel / CSV"
        onAction={openImportModal}
        secondaryActionText="Load Demo Teams"
        onSecondaryAction={resetToDemo}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search team no, name, members, or PS ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStage}
              onChange={(e) => {
                setFilterStage(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Teams ({teams.length})</option>
              <option value="r1_pending">R1 Pending</option>
              <option value="r1_done">R1 Completed</option>
              <option value="r2_done">R2 Completed</option>
              <option value="r3_done">R3 Completed</option>
              <option value="eligible">Eligible for Finale</option>
            </select>
          </div>

          <button
            onClick={openImportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Teams Table */}
      {filteredTeams.length === 0 ? (
        <EmptyState
          icon="search"
          title="No Teams Match Your Query"
          description="Try broadening your search term or reset the stage filter."
          actionText="Clear Search"
          onAction={() => {
            setSearchQuery('');
            setFilterStage('all');
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th
                    onClick={() => toggleSort('number')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Team No.</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('name')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Team Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5">Members</th>
                  <th
                    onClick={() => toggleSort('ps_id')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>PS ID</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5 min-w-[220px]">Problem Statement</th>
                  <th className="p-3.5 text-center">Stage Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                {paginatedTeams.map((team) => {
                  const s = summaryMap.get(team.id);

                  return (
                    <tr
                      key={team.id}
                      className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => openTeamDrawer(team)}
                    >
                      <td className="p-3.5 font-mono font-bold text-indigo-400 whitespace-nowrap">
                        {team.team_number}
                      </td>

                      <td className="p-3.5 font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{team.team_name}</span>
                          {team.is_demo && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              Demo
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 max-w-[180px]">
                        <div className="truncate text-slate-300">
                          {team.members.map((m: any) => m.name).join(', ')}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                          {team.problem_statement_id}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-[240px]">
                        <p className="truncate text-slate-400" title={team.problem_statement}>
                          {team.problem_statement}
                        </p>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onStartReview(1, team.team_number)}
                            title="Grade / View Review 1"
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all ${
                              s?.r1Score !== null && s?.r1Score !== undefined
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : s?.r1Review?.status === 'draft'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                            }`}
                          >
                            R1: {s?.r1Score !== null && s?.r1Score !== undefined ? `${s.r1Score}/50` : '—'}
                          </button>

                          <button
                            onClick={() => onStartReview(2, team.team_number)}
                            title="Grade / View Review 2"
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all ${
                              s?.r2Score !== null && s?.r2Score !== undefined
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : s?.r2Review?.status === 'draft'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                            }`}
                          >
                            R2: {s?.r2Score !== null && s?.r2Score !== undefined ? `${s.r2Score}/50` : '—'}
                          </button>

                          <button
                            onClick={() => onStartReview(3, team.team_number)}
                            title="Grade / View Review 3"
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all ${
                              s?.r3Score !== null && s?.r3Score !== undefined
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : s?.r3Review?.status === 'draft'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                            }`}
                          >
                            R3: {s?.r3Score !== null && s?.r3Score !== undefined ? `${s.r3Score}/100` : '—'}
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openTeamDrawer(team)}
                            title="View Team Details & History"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (s?.r1Score === null || s?.r1Score === undefined) onStartReview(1, team.team_number);
                              else if (s?.r2Score === null || s?.r2Score === undefined) onStartReview(2, team.team_number);
                              else onStartReview(3, team.team_number);
                            }}
                            title="Evaluate Team"
                            className="p-1.5 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-600 transition-colors"
                          >
                            <Zap className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Remove team "${team.team_name}" (${team.team_number})?`)) {
                                deleteTeam(team.id);
                              }
                            }}
                            title="Delete Team"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Showing</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-semibold focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>of {filteredTeams.length} teams</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono font-semibold text-slate-200 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
