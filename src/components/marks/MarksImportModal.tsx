import React, { useState, useRef, useEffect } from 'react';
import { useData, type DetailedReviewImportRecord, type RubricImportScore } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { REVIEW_1_RUBRICS, REVIEW_2_RUBRICS, REVIEW_3_RUBRICS } from '../../constants/rubrics';
import { downloadReviewMarksTemplate } from '../../utils/exporter';
import type { CriterionRubric, Team } from '../../types';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  UploadCloud,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  ArrowRight,
  FileText,
  Layers,
  Sparkles,
  Trophy,
  Check,
  Info,
  AlertTriangle,
} from 'lucide-react';

type SelectedReviewMode = 1 | 2 | 3 | 'all';

interface ParsedReviewRow {
  team_number: string;
  matched_team?: Team;
  team_name?: string;
  rubric_scores: RubricImportScore[];
  total_score: number;
  max_possible: number;
  comments?: string;
  judge_username?: string;
  isValid: boolean;
  warnings: string[];
}

interface MarksImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarksImportModal: React.FC<MarksImportModalProps> = ({ isOpen, onClose }) => {
  const { teams, importDetailedReviewMarks, importMarksFromExcel, showToast, settings } = useData();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedReview, setSelectedReview] = useState<SelectedReviewMode>(1);
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  // Column Mappings
  const [teamNumberCol, setTeamNumberCol] = useState('');
  const [teamNameCol, setTeamNameCol] = useState('');
  const [commentsCol, setCommentsCol] = useState('');
  const [judgeCol, setJudgeCol] = useState('');
  const [totalScoreCol, setTotalScoreCol] = useState('');

  // Per-rubric mappings (criterion_id -> header)
  const [rubricCols, setRubricCols] = useState<Record<string, string>>({});

  // All-in-one mappings (for 'all' mode)
  const [allR1Col, setAllR1Col] = useState('');
  const [allR2Col, setAllR2Col] = useState('');
  const [allR3Col, setAllR3Col] = useState('');

  const [parsedRows, setParsedRows] = useState<ParsedReviewRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Active Rubrics list according to selected round
  const activeRubrics: CriterionRubric[] =
    selectedReview === 1
      ? REVIEW_1_RUBRICS
      : selectedReview === 2
      ? REVIEW_2_RUBRICS
      : selectedReview === 3
      ? REVIEW_3_RUBRICS
      : [];

  const roundMax =
    selectedReview === 1
      ? settings.review_1_max || 50
      : selectedReview === 2
      ? settings.review_2_max || 50
      : selectedReview === 3
      ? settings.review_3_max || 100
      : 200;

  const roundTitle =
    selectedReview === 1
      ? 'Review 1 (Prelims)'
      : selectedReview === 2
      ? 'Review 2 (Mains)'
      : selectedReview === 3
      ? 'Review 3 (Grand Finale)'
      : 'All Reviews Combined';

  const reset = () => {
    setStep('upload');
    setFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setTeamNumberCol('');
    setTeamNameCol('');
    setCommentsCol('');
    setJudgeCol('');
    setTotalScoreCol('');
    setRubricCols({});
    setAllR1Col('');
    setAllR2Col('');
    setAllR3Col('');
    setParsedRows([]);
    setIsImporting(false);
    setImportSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const findMatchingTeam = (rawNum: string): Team | undefined => {
    if (!rawNum) return undefined;
    const clean = rawNum.trim().toUpperCase();
    // 1. Exact match
    const exact = teams.find((t) => t.team_number.trim().toUpperCase() === clean);
    if (exact) return exact;

    // 2. Normalized alphanumerics match
    const alphaClean = clean.replace(/[^A-Z0-9]/g, '');
    const norm = teams.find((t) => {
      const tClean = t.team_number.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      return tClean === alphaClean || tClean.endsWith(alphaClean) || alphaClean.endsWith(tClean);
    });
    if (norm) return norm;

    // 3. Match by Team Name
    const nameMatch = teams.find((t) => t.team_name.trim().toUpperCase() === clean);
    return nameMatch;
  };

  // ── Auto-Detect Columns ───────────────────────────────────────────
  const autoDetectColumns = (headers: string[], reviewMode: SelectedReviewMode) => {
    let tNum = '';
    let tName = '';
    let comm = '';
    let judge = '';
    let tot = '';
    const rMap: Record<string, string> = {};
    let r1C = '';
    let r2C = '';
    let r3C = '';

    headers.forEach((h) => {
      const clean = h.trim().toLowerCase();

      // Team Number
      if (
        !tNum &&
        (clean.includes('team no') ||
          clean.includes('team number') ||
          clean.includes('team_id') ||
          clean.includes('team_no') ||
          clean === 'team' ||
          clean.includes('team #') ||
          clean === 't_no' ||
          clean === 't.no')
      ) {
        tNum = h;
      }
      // Team Name
      else if (
        !tName &&
        (clean.includes('team name') || clean.includes('project name') || clean.includes('project title'))
      ) {
        tName = h;
      }
      // Comments / Remarks
      else if (
        !comm &&
        (clean.includes('comment') || clean.includes('remark') || clean.includes('feedback') || clean.includes('note'))
      ) {
        comm = h;
      }
      // Judge Username
      else if (!judge && (clean.includes('judge') || clean.includes('evaluator') || clean.includes('reviewer'))) {
        judge = h;
      }
      // All-in-one columns
      else if (clean.includes('r1') || clean.includes('review 1') || clean.includes('prelim')) {
        if (!r1C) r1C = h;
        if (reviewMode === 1 && !tot && (clean.includes('total') || clean.includes('score') || clean.includes('mark'))) tot = h;
      } else if (clean.includes('r2') || clean.includes('review 2') || clean.includes('main')) {
        if (!r2C) r2C = h;
        if (reviewMode === 2 && !tot && (clean.includes('total') || clean.includes('score') || clean.includes('mark'))) tot = h;
      } else if (clean.includes('r3') || clean.includes('review 3') || clean.includes('finale')) {
        if (!r3C) r3C = h;
        if (reviewMode === 3 && !tot && (clean.includes('total') || clean.includes('score') || clean.includes('mark'))) tot = h;
      }
      // Total column
      else if (!tot && (clean.includes('total') || clean === 'score' || clean === 'marks' || clean.includes('grand total'))) {
        tot = h;
      }
    });

    // Auto-map Rubrics
    if (reviewMode !== 'all') {
      const currentRubrics =
        reviewMode === 1
          ? REVIEW_1_RUBRICS
          : reviewMode === 2
          ? REVIEW_2_RUBRICS
          : REVIEW_3_RUBRICS;

      currentRubrics.forEach((crit, index) => {
        const cNum = `c${index + 1}`;
        const critNumStr = `criterion ${index + 1}`;
        const rubricNumStr = `rubric ${index + 1}`;

        // 1. Check indexed match (e.g. "C1", "Criterion 1", "Rubric 1")
        let matchedHeader = headers.find((h) => {
          const lh = h.toLowerCase().trim();
          return (
            lh === cNum ||
            lh.startsWith(`${cNum} `) ||
            lh.startsWith(`${cNum}:`) ||
            lh.startsWith(`${cNum}-`) ||
            lh.startsWith(`${cNum}_`) ||
            lh.startsWith(`c${index + 1}(`) ||
            lh.includes(critNumStr) ||
            lh.includes(rubricNumStr)
          );
        });

        // 2. Keyword match against criterion name
        if (!matchedHeader) {
          const critWords = crit.name
            .toLowerCase()
            .split(/[\s,&+/()]+/)
            .filter((w) => w.length > 3);
          matchedHeader = headers.find((h) => {
            const lh = h.toLowerCase();
            return critWords.some((word) => lh.includes(word));
          });
        }

        if (matchedHeader) {
          rMap[crit.id] = matchedHeader;
        }
      });
    }

    setTeamNumberCol(tNum);
    setTeamNameCol(tName);
    setCommentsCol(comm);
    setJudgeCol(judge);
    setTotalScoreCol(tot);
    setRubricCols(rMap);
    setAllR1Col(r1C);
    setAllR2Col(r2C);
    setAllR3Col(r3C);
  };

  // Re-detect when review mode changes after file upload
  useEffect(() => {
    if (rawHeaders.length > 0) {
      autoDetectColumns(rawHeaders, selectedReview);
    }
  }, [selectedReview, rawHeaders]);

  // ── Handle File Upload ─────────────────────────────────────────────
  const parseFile = async (file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            const headers = (res.meta.fields || []).filter((h) => Boolean(h && h.trim()));
            setRawHeaders(headers);
            setRawRows(res.data as Record<string, any>[]);
            autoDetectColumns(headers, selectedReview);
            setStep('map');
          },
          error: (err) => {
            showToast('CSV Parsing Error', err.message, 'error');
          },
        });
      } else {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          showToast('Invalid Excel File', 'No sheets found in workbook.', 'error');
          return;
        }

        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        if (rows.length === 0) {
          showToast('Empty Sheet', 'The uploaded Excel sheet contains no data rows.', 'warning');
          return;
        }

        const headers = Object.keys(rows[0]).filter((h) => Boolean(h && h.trim()));
        setRawHeaders(headers);
        setRawRows(rows);
        autoDetectColumns(headers, selectedReview);
        setStep('map');
      }
    } catch (err: any) {
      showToast('File Read Error', err.message || 'Could not parse spreadsheet.', 'error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  // ── Validate & Build Preview Rows ──────────────────────────────────
  const handleValidateAndPreview = () => {
    if (!teamNumberCol) {
      showToast('Missing Field', 'Please select which column contains the Team Number.', 'warning');
      return;
    }

    const results: ParsedReviewRow[] = [];

    rawRows.forEach((row) => {
      const rawTNum = String(row[teamNumberCol] || '').trim();
      if (!rawTNum) return;

      const teamObj = findMatchingTeam(rawTNum);
      const warnings: string[] = [];

      if (!teamObj) {
        warnings.push(`Team "${rawTNum}" not found in registered teams ledger.`);
      }

      const effectiveTeamNumber = teamObj ? teamObj.team_number : rawTNum;
      const effectiveTeamName = teamObj?.team_name || (teamNameCol ? String(row[teamNameCol] || '').trim() : '');
      const commentVal = commentsCol ? String(row[commentsCol] || '').trim() : '';
      const judgeVal = judgeCol ? String(row[judgeCol] || '').trim() : (user?.username || 'admin1');

      if (selectedReview !== 'all') {
        const rubricScores: RubricImportScore[] = [];
        let rubricSum = 0;
        let hasAnyRubricScore = false;

        activeRubrics.forEach((crit) => {
          const colName = rubricCols[crit.id];
          const rawScore = colName && row[colName] !== undefined && row[colName] !== '' ? Number(row[colName]) : null;

          if (rawScore !== null && !isNaN(rawScore)) {
            const clamped = Math.min(crit.max_score, Math.max(0, rawScore));
            if (rawScore > crit.max_score || rawScore < 0) {
              warnings.push(`${crit.name} score (${rawScore}) capped to ${clamped}/${crit.max_score}.`);
            }
            rubricScores.push({
              criterion_id: crit.id,
              criterion_name: crit.name,
              score: clamped,
              max_score: crit.max_score,
            });
            rubricSum += clamped;
            hasAnyRubricScore = true;
          } else {
            rubricScores.push({
              criterion_id: crit.id,
              criterion_name: crit.name,
              score: 0,
              max_score: crit.max_score,
            });
          }
        });

        // If total score column is mapped and rubric scores weren't provided individually
        let finalTotal = rubricSum;
        if (!hasAnyRubricScore && totalScoreCol && row[totalScoreCol] !== undefined && row[totalScoreCol] !== '') {
          const numTot = Number(row[totalScoreCol]);
          if (!isNaN(numTot)) {
            finalTotal = Math.min(roundMax, Math.max(0, numTot));
          }
        }

        results.push({
          team_number: effectiveTeamNumber,
          matched_team: teamObj,
          team_name: effectiveTeamName,
          rubric_scores: rubricScores,
          total_score: finalTotal,
          max_possible: roundMax,
          comments: commentVal,
          judge_username: judgeVal,
          isValid: true,
          warnings,
        });
      } else {
        // All-in-one mode
        const r1Val = allR1Col && row[allR1Col] !== undefined && row[allR1Col] !== '' ? Number(row[allR1Col]) : null;
        const r2Val = allR2Col && row[allR2Col] !== undefined && row[allR2Col] !== '' ? Number(row[allR2Col]) : null;
        const r3Val = allR3Col && row[allR3Col] !== undefined && row[allR3Col] !== '' ? Number(row[allR3Col]) : null;

        const total = (r1Val || 0) + (r2Val || 0) + (r3Val || 0);

        results.push({
          team_number: effectiveTeamNumber,
          matched_team: teamObj,
          team_name: effectiveTeamName,
          rubric_scores: [
            { criterion_id: 'r1', criterion_name: 'Review 1 (Prelims)', score: r1Val || 0, max_score: 50 },
            { criterion_id: 'r2', criterion_name: 'Review 2 (Mains)', score: r2Val || 0, max_score: 50 },
            { criterion_id: 'r3', criterion_name: 'Review 3 (Grand Finale)', score: r3Val || 0, max_score: 100 },
          ],
          total_score: total,
          max_possible: 200,
          comments: commentVal,
          judge_username: judgeVal,
          isValid: true,
          warnings,
        });
      }
    });

    if (results.length === 0) {
      showToast('No Data', 'Could not find any team rows in the selected column.', 'warning');
      return;
    }

    setParsedRows(results);
    setStep('preview');
  };

  // ── Import Execution ──────────────────────────────────────────────
  const handleFinalImport = async () => {
    setIsImporting(true);
    try {
      if (selectedReview !== 'all') {
        const importRecords: DetailedReviewImportRecord[] = parsedRows.map((r) => ({
          team_number: r.team_number,
          review_number: selectedReview,
          scores: r.rubric_scores,
          total_score: r.total_score,
          max_possible_score: r.max_possible,
          comments: r.comments || `Imported Review ${selectedReview} marks via Rubrics Spreadsheet`,
          judge_username: r.judge_username || user?.username || 'admin1',
        }));

        await importDetailedReviewMarks(importRecords);
        setImportSuccess(true);
        showToast(
          'Rubric Marks Saved',
          `Successfully saved ${roundTitle} evaluation marks for ${importRecords.length} teams.`,
          'success'
        );
      } else {
        // All-in-one mode
        const allRows = parsedRows.map((r) => {
          const r1 = r.rubric_scores.find((s) => s.criterion_id === 'r1')?.score;
          const r2 = r.rubric_scores.find((s) => s.criterion_id === 'r2')?.score;
          const r3 = r.rubric_scores.find((s) => s.criterion_id === 'r3')?.score;
          return {
            team_number: r.team_number,
            r1: r1 !== undefined ? r1 : null,
            r2: r2 !== undefined ? r2 : null,
            r3: r3 !== undefined ? r3 : null,
          };
        });

        await importMarksFromExcel(allRows);
        setImportSuccess(true);
        showToast(
          'All Marks Imported',
          `Successfully saved evaluation marks for ${allRows.length} teams across all reviews.`,
          'success'
        );
      }
    } catch (err: any) {
      showToast('Import Error', err.message || 'Failed to save marks.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const colOptions = ['', ...rawHeaders];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-4xl my-auto rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 sm:py-5 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Import &amp; Map Review Marks with Rubrics
              </h2>
              <p className="text-xs text-slate-400">
                Upload Excel or CSV sheet, select review round, and map rubric criteria.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Review Round Selector Banner */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Select Review:</span>
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedReview(1);
                  if (step === 'map') autoDetectColumns(rawHeaders, 1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedReview === 1
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Review 1 (50 pts)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedReview(2);
                  if (step === 'map') autoDetectColumns(rawHeaders, 2);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedReview === 2
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Review 2 (50 pts)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedReview(3);
                  if (step === 'map') autoDetectColumns(rawHeaders, 3);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedReview === 3
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Review 3 (100 pts)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedReview('all');
                  if (step === 'map') autoDetectColumns(rawHeaders, 'all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedReview === 'all'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>All Reviews</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              downloadReviewMarksTemplate(
                selectedReview,
                teams.map((t) => ({ team_number: t.team_number, team_name: t.team_name })),
                'xlsx'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download {selectedReview === 'all' ? 'All' : `R${selectedReview}`} Rubrics Template</span>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 text-xs shrink-0">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'upload' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>
                1
              </span>
              <span>Upload Marks Sheet</span>
            </div>
            <div className={`flex items-center gap-2 ${step === 'map' ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'map' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>
                2
              </span>
              <span>Map Rubrics Criteria</span>
            </div>
            <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'preview' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>
                3
              </span>
              <span>Validate &amp; Import</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-900/30 hover:bg-indigo-950/10 transition-all duration-200 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-3 shadow-lg shadow-indigo-500/5">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Drop your marks spreadsheet here or <span className="text-indigo-400 underline underline-offset-4">browse files</span>
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Supports Excel (.xlsx, .xls) and CSV (.csv). Auto-detects columns and maps them to {roundTitle} rubrics criteria.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      parseFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {/* Rubric Breakdown Info Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <span>Rubrics Breakdown for {roundTitle} (Total {roundMax} Marks):</span>
                </div>

                {selectedReview !== 'all' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {activeRubrics.map((crit, idx) => (
                      <div key={crit.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            C{idx + 1}
                          </span>
                          <span className="text-slate-300 font-semibold truncate text-[11px]">{crit.name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] font-bold shrink-0">
                          {crit.max_score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 text-xs text-center">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="font-bold text-indigo-400">Review 1 (Prelims)</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">5 Rubrics • Max 50 pts</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="font-bold text-purple-400">Review 2 (Mains)</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">5 Rubrics • Max 50 pts</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="font-bold text-amber-400">Review 3 (Finale)</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">5 Rubrics • Max 100 pts</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: MAP COLUMNS */}
          {step === 'map' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">{fileName}</span>
                  <span className="text-xs text-slate-400">({rawRows.length} rows loaded)</span>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Change file
                </button>
              </div>

              {/* Primary Identity Mapping */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Team Identifier Mapping
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Team Number <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={teamNumberCol}
                      onChange={(e) => setTeamNumberCol(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Team Name (Optional)
                    </label>
                    <select
                      value={teamNameCol}
                      onChange={(e) => setTeamNameCol(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None / Select --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rubrics Criteria Mapping */}
              {selectedReview !== 'all' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      {roundTitle} Rubrics Criteria Mapping (Max {roundMax} Marks)
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Auto-matched with smart criteria detection
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {activeRubrics.map((crit, idx) => {
                      const isMapped = Boolean(rubricCols[crit.id]);
                      return (
                        <div
                          key={crit.id}
                          className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                C{idx + 1}
                              </span>
                              <span className="text-xs font-bold text-white tracking-tight">
                                {crit.name}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                Max {crit.max_score} pts
                              </span>
                            </div>
                            {crit.description && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                                {crit.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 sm:w-64 shrink-0">
                            <select
                              value={rubricCols[crit.id] || ''}
                              onChange={(e) =>
                                setRubricCols({
                                  ...rubricCols,
                                  [crit.id]: e.target.value,
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">-- None / Select Column --</option>
                              {rawHeaders.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                            {isMapped && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Fallback / Direct Total Score Column */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-300">
                        Direct Total Score Column (Fallback)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Used if individual rubric criteria columns are not separate.
                      </div>
                    </div>
                    <div className="sm:w-64">
                      <select
                        value={totalScoreCol}
                        onChange={(e) => setTotalScoreCol(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- None / Select Column --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* All-in-one mapping */
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    All Reviews Total Marks Mapping
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Review 1 Total (/50)
                      </label>
                      <select
                        value={allR1Col}
                        onChange={(e) => setAllR1Col(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select Column --</option>
                        {colOptions.map((c) => (
                          <option key={c} value={c}>
                            {c || '— Not Mapped —'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Review 2 Total (/50)
                      </label>
                      <select
                        value={allR2Col}
                        onChange={(e) => setAllR2Col(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select Column --</option>
                        {colOptions.map((c) => (
                          <option key={c} value={c}>
                            {c || '— Not Mapped —'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Review 3 Total (/100)
                      </label>
                      <select
                        value={allR3Col}
                        onChange={(e) => setAllR3Col(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select Column --</option>
                        {colOptions.map((c) => (
                          <option key={c} value={c}>
                            {c || '— Not Mapped —'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Comments & Judge columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Judge Comments / Feedback Column
                  </label>
                  <select
                    value={commentsCol}
                    onChange={(e) => setCommentsCol(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- None / Select Column --</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Judge Username Column
                  </label>
                  <select
                    value={judgeCol}
                    onChange={(e) => setJudgeCol(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Current Logged In Judge --</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  ← Back to Upload
                </button>
                <button
                  type="button"
                  onClick={handleValidateAndPreview}
                  disabled={!teamNumberCol}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <span>Preview &amp; Validate Data</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === 'preview' && (
            <div className="space-y-4">
              {importSuccess ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Marks Successfully Imported!</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {parsedRows.length} team evaluations have been recorded and synced to Supabase database.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-3 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Close &amp; View Ledger
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Review Marks Preview ({roundTitle})
                      </h3>
                      <p className="text-xs text-slate-400">
                        {parsedRows.length} rows ready to import · Maximum {roundMax} Marks
                      </p>
                    </div>

                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {roundTitle}
                    </span>
                  </div>

                  {/* Preview Table */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs text-left text-slate-300">
                        <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                          <tr>
                            <th className="px-3.5 py-2.5">Team No.</th>
                            <th className="px-3.5 py-2.5">Team Name</th>
                            {selectedReview !== 'all' ? (
                              activeRubrics.map((c, i) => (
                                <th key={c.id} className="px-2 py-2.5 text-center whitespace-nowrap">
                                  C{i + 1} (/{c.max_score})
                                </th>
                              ))
                            ) : (
                              <>
                                <th className="px-3 py-2.5 text-center">R1 (/50)</th>
                                <th className="px-3 py-2.5 text-center">R2 (/50)</th>
                                <th className="px-3 py-2.5 text-center">R3 (/100)</th>
                              </>
                            )}
                            <th className="px-3.5 py-2.5 text-center">Total Score</th>
                            <th className="px-3.5 py-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {parsedRows.map((row, idx) => {
                            const isMatched = Boolean(row.matched_team);
                            const pct = Math.round((row.total_score / row.max_possible) * 100);

                            return (
                              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-400">
                                  {row.team_number}
                                </td>
                                <td className="px-3.5 py-2.5 font-semibold text-white whitespace-nowrap">
                                  {row.team_name || '—'}
                                </td>

                                {selectedReview !== 'all' ? (
                                  row.rubric_scores.map((sc, i) => (
                                    <td key={i} className="px-2 py-2.5 text-center font-mono font-bold text-slate-200">
                                      {sc.score}
                                    </td>
                                  ))
                                ) : (
                                  row.rubric_scores.map((sc, i) => (
                                    <td key={i} className="px-3 py-2.5 text-center font-mono font-bold text-slate-200">
                                      {sc.score}
                                    </td>
                                  ))
                                )}

                                <td className="px-3.5 py-2.5 text-center font-mono whitespace-nowrap">
                                  <span className="font-extrabold text-white text-sm">
                                    {row.total_score}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    /{row.max_possible} ({pct}%)
                                  </span>
                                </td>

                                <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                  {isMatched ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      <Check className="w-3 h-3" /> Matched
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                      <AlertTriangle className="w-3 h-3" /> New / Unmatched
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('map')}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                    >
                      ← Back to Mapping
                    </button>

                    <button
                      type="button"
                      onClick={handleFinalImport}
                      disabled={isImporting || parsedRows.length === 0}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
                    >
                      {isImporting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Importing &amp; Syncing to Database...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm &amp; Save {parsedRows.length} Teams Marks</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
