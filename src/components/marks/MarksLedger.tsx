import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  exportMarksToExcel,
  exportMarksToCSV,
  exportMarksToPDF,
} from '../../utils/exporter';
import { EmptyState } from '../common/EmptyState';
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  FileDown,
  Trophy,
  UploadCloud,
  FileEdit,
} from 'lucide-react';

interface MarksLedgerProps {
  onStartReview?: (roundNumber: 1 | 2 | 3, teamNumber: string) => void;
}

export const MarksLedger: React.FC<MarksLedgerProps> = () => {
  const { summaries, settings, teams, reviews, openImportModal, openMarksImport, openEditMarks } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterEligibility, setFilterEligibility] = useState<'all' | 'eligible' | 'not_eligible'>('all');
  const [filterR1, setFilterR1] = useState<'all' | 'done' | 'pending'>('all');
  const [filterR2, setFilterR2] = useState<'all' | 'done' | 'pending'>('all');
  const [filterR3, setFilterR3] = useState<'all' | 'done' | 'pending'>('all');
  const [filterJudge, setFilterJudge] = useState<string>('all');
  const [minPercentage, setMinPercentage] = useState<number>(0);

  const [sortField, setSortField] = useState<'rank' | 'team_number' | 'team_name' | 'r1' | 'r2' | 'r3' | 'total' | 'pct'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const judgesList = useMemo(() => {
    const set = new Set<string>();
    reviews.forEach((r) => {
      if (r.judge_username) set.add(r.judge_username);
    });
    return Array.from(set);
  }, [reviews]);

  const filteredSummaries = useMemo(() => {
    let list = [...summaries];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const matchNum = s.team.team_number.toLowerCase().includes(q);
        const matchName = s.team.team_name.toLowerCase().includes(q);
        const matchMembers = s.team.members.some((m) => m.name.toLowerCase().includes(q));
        const matchPs = s.team.problem_statement_id.toLowerCase().includes(q);
        return matchNum || matchName || matchMembers || matchPs;
      });
    }

    if (filterEligibility === 'eligible') {
      list = list.filter((s) => s.isEligibleForFinale);
    } else if (filterEligibility === 'not_eligible') {
      list = list.filter((s) => !s.isEligibleForFinale && s.prelimsMainsPercentage !== null);
    }

    if (filterR1 === 'done') list = list.filter((s) => s.r1Score !== null);
    if (filterR1 === 'pending') list = list.filter((s) => s.r1Score === null);

    if (filterR2 === 'done') list = list.filter((s) => s.r2Score !== null);
    if (filterR2 === 'pending') list = list.filter((s) => s.r2Score === null);

    if (filterR3 === 'done') list = list.filter((s) => s.r3Score !== null);
    if (filterR3 === 'pending') list = list.filter((s) => s.r3Score === null);

    if (filterJudge !== 'all') {
      list = list.filter((s) => {
        return (
          s.r1Review?.judge_username === filterJudge ||
          s.r2Review?.judge_username === filterJudge ||
          s.r3Review?.judge_username === filterJudge
        );
      });
    }

    if (minPercentage > 0) {
      list = list.filter((s) => (s.weightedPercentage || 0) >= minPercentage);
    }

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'rank') {
        valA = a.rank ?? 9999;
        valB = b.rank ?? 9999;
      } else if (sortField === 'team_number') {
        valA = a.team.team_number;
        valB = b.team.team_number;
        return sortOrder === 'asc'
          ? valA.localeCompare(valB, undefined, { numeric: true })
          : valB.localeCompare(valA, undefined, { numeric: true });
      } else if (sortField === 'team_name') {
        valA = a.team.team_name.toLowerCase();
        valB = b.team.team_name.toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortField === 'r1') {
        valA = a.r1Score ?? -1;
        valB = b.r1Score ?? -1;
      } else if (sortField === 'r2') {
        valA = a.r2Score ?? -1;
        valB = b.r2Score ?? -1;
      } else if (sortField === 'r3') {
        valA = a.r3Score ?? -1;
        valB = b.r3Score ?? -1;
      } else if (sortField === 'total') {
        valA = a.grandTotal ?? -1;
        valB = b.grandTotal ?? -1;
      } else if (sortField === 'pct') {
        valA = a.weightedPercentage ?? -1;
        valB = b.weightedPercentage ?? -1;
      }

      return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valB > valA ? 1 : -1);
    });

    return list;
  }, [
    summaries,
    searchQuery,
    filterEligibility,
    filterR1,
    filterR2,
    filterR3,
    filterJudge,
    minPercentage,
    sortField,
    sortOrder,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / pageSize));
  const paginatedSummaries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSummaries.slice(start, start + pageSize);
  }, [filteredSummaries, currentPage, pageSize]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'rank' ? 'asc' : 'desc');
    }
  };

  if (teams.length === 0) {
    return (
      <EmptyState
        icon="marks"
        title="No Score Data Available"
        description="Please import teams spreadsheet or register teams to see evaluation marks."
        actionText="Import Teams"
        onAction={openImportModal}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team number, name, or members..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openMarksImport}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all shadow-sm"
              title="Import marks directly from an Excel / CSV spreadsheet"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Marks</span>
            </button>

            <button
              onClick={() => exportMarksToExcel(filteredSummaries, settings)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm"
              title="Export complete marks ledger to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => exportMarksToCSV(filteredSummaries)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-all"
              title="Export marks as CSV"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => exportMarksToPDF(filteredSummaries, settings)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
              title="Generate PDF report"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl">
            <span className="text-slate-400 font-medium">Finale:</span>
            <select
              value={filterEligibility}
              onChange={(e) => {
                setFilterEligibility(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="eligible">Eligible for Finale (Top {settings.advancement_top_teams_limit} &amp; &ge; {settings.advancement_threshold_percent}%)</option>
              <option value="not_eligible">Not Eligible</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl">
            <span className="text-slate-400 font-medium">R1:</span>
            <select
              value={filterR1}
              onChange={(e) => {
                setFilterR1(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="done">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl">
            <span className="text-slate-400 font-medium">R2:</span>
            <select
              value={filterR2}
              onChange={(e) => {
                setFilterR2(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="done">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl">
            <span className="text-slate-400 font-medium">R3:</span>
            <select
              value={filterR3}
              onChange={(e) => {
                setFilterR3(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="done">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {judgesList.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl">
              <span className="text-slate-400 font-medium">Judge:</span>
              <select
                value={filterJudge}
                onChange={(e) => {
                  setFilterJudge(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">All Judges</option>
                {judgesList.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
          )}

          {(filterEligibility !== 'all' || filterR1 !== 'all' || filterR2 !== 'all' || filterR3 !== 'all' || filterJudge !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterEligibility('all');
                setFilterR1('all');
                setFilterR2('all');
                setFilterR3('all');
                setFilterJudge('all');
                setMinPercentage(0);
                setCurrentPage(1);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Finale Rule:</strong> Top{' '}
            <strong className="text-indigo-400 font-mono">{settings.advancement_top_teams_limit}</strong> teams with combined Prelims + Mains &ge;{' '}
            <strong className="text-indigo-400 font-mono">{settings.advancement_threshold_percent}%</strong> qualify for Finale.
          </span>
        </div>
        <span className="font-mono text-emerald-400 font-bold hidden sm:inline">
          {filteredSummaries.filter((s) => s.isEligibleForFinale).length} Eligible Teams
        </span>
      </div>

      {filteredSummaries.length === 0 ? (
        <EmptyState
          icon="search"
          title="No Teams Found in Marks Ledger"
          description="Adjust your search query or clear the active round filters."
          actionText="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setFilterEligibility('all');
            setFilterR1('all');
            setFilterR2('all');
            setFilterR3('all');
            setFilterJudge('all');
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th
                    onClick={() => toggleSort('rank')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Rank</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('team_number')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Team No.</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('team_name')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors min-w-[160px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Team Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('r1')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>R1 (50)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('r2')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>R2 (50)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5 text-center">
                    <span>Pre-Finale (100)</span>
                  </th>
                  <th className="p-3.5 text-center">
                    <span>Finale Status</span>
                  </th>
                  <th
                    onClick={() => toggleSort('r3')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>R3 (100)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('total')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-white">
                      <span>Total (200)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('pct')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors text-center text-emerald-400"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Weighted %</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                {paginatedSummaries.map((s) => {
                  return (
                    <tr
                      key={s.team.id}
                      onClick={() => openEditMarks(s)}
                      className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-400">
                        {s.rank ? (
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              s.rank === 1
                                ? 'bg-amber-500 text-slate-950 font-extrabold'
                                : s.rank === 2
                                ? 'bg-slate-300 text-slate-950 font-extrabold'
                                : s.rank === 3
                                ? 'bg-amber-700 text-white font-extrabold'
                                : 'text-slate-400'
                            }`}
                          >
                            #{s.rank}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-indigo-400 whitespace-nowrap">
                        {s.team.team_number}
                      </td>

                      <td className="p-3.5 font-semibold text-white whitespace-nowrap">
                        <div>{s.team.team_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.team.problem_statement_id}</div>
                      </td>

                      <td className="p-3.5 text-center font-mono whitespace-nowrap">
                        {s.r1Score !== null ? (
                          <div>
                            <span className="font-bold text-white">{s.r1Score}</span>
                            <span className="text-[10px] text-slate-500">/50</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-mono whitespace-nowrap">
                        {s.r2Score !== null ? (
                          <div>
                            <span className="font-bold text-white">{s.r2Score}</span>
                            <span className="text-[10px] text-slate-500">/50</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-mono whitespace-nowrap">
                        {s.prelimsMainsTotal !== null ? (
                          <div>
                            <span className="font-bold text-indigo-300">{s.prelimsMainsTotal}</span>
                            <span className="text-[10px] text-slate-500">/100</span>
                            <div className="text-[10px] text-slate-400">
                              {s.prelimsMainsPercentage?.toFixed(0)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            s.isEligibleForFinale
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : s.prelimsMainsTotal !== null
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-slate-900 text-slate-600 border-slate-800'
                          }`}
                        >
                          {s.isEligibleForFinale
                            ? 'Eligible'
                            : s.prelimsMainsTotal !== null
                            ? 'Not Eligible'
                            : 'Pending'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-mono whitespace-nowrap">
                        {s.r3Score !== null ? (
                          <div>
                            <span className="font-bold text-amber-300">{s.r3Score}</span>
                            <span className="text-[10px] text-slate-500">/100</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-mono whitespace-nowrap font-bold text-white">
                        {s.grandTotal !== null ? (
                          <div>
                            <span className="text-sm font-extrabold">{s.grandTotal}</span>
                            <span className="text-[10px] text-slate-500">/200</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-mono whitespace-nowrap">
                        {s.weightedPercentage !== null ? (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-extrabold border border-emerald-500/30">
                            {s.weightedPercentage.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditMarks(s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all ml-auto"
                          title="Edit evaluation marks for Review 1, 2, and 3"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>Edit Marks</span>
                        </button>
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
              <span>of {filteredSummaries.length} teams</span>
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
