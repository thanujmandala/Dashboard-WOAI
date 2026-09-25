import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  UploadCloud, X, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Download, ArrowRight, FileText
} from 'lucide-react';

interface MarksRow {
  team_number: string;
  team_name?: string;
  r1?: number | null;
  r2?: number | null;
  r3?: number | null;
}

interface ColumnMapping {
  team_number: string;
  team_name: string;
  r1: string;
  r2: string;
  r3: string;
}

interface MarksImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarksImportModal: React.FC<MarksImportModalProps> = ({ isOpen, onClose }) => {
  const { teams, importMarksFromExcel, showToast } = useData();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    team_number: '', team_name: '', r1: '', r2: '', r3: '',
  });
  const [parsedRows, setParsedRows] = useState<MarksRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setStep('upload');
    setFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setMapping({ team_number: '', team_name: '', r1: '', r2: '', r3: '' });
    setParsedRows([]);
    setErrors([]);
    setIsImporting(false);
    setImportDone(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Auto-detect column mapping ─────────────────────────────────────────
  const autoDetect = (headers: string[]): ColumnMapping => {
    const m: ColumnMapping = { team_number: '', team_name: '', r1: '', r2: '', r3: '' };
    headers.forEach(h => {
      const lh = h.toLowerCase();
      if (!m.team_number && (lh.includes('team') && (lh.includes('no') || lh.includes('num') || lh.includes('id') || lh === 'team number')))
        m.team_number = h;
      if (!m.team_name && lh.includes('name')) m.team_name = h;
      if (!m.r1 && (lh.includes('r1') || lh.includes('review 1') || lh.includes('prelim'))) m.r1 = h;
      if (!m.r2 && (lh.includes('r2') || lh.includes('review 2') || lh.includes('main'))) m.r2 = h;
      if (!m.r3 && (lh.includes('r3') || lh.includes('review 3') || lh.includes('finale'))) m.r3 = h;
    });
    return m;
  };

  // ── Parse uploaded file ────────────────────────────────────────────────
  const parseFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const headers = res.meta.fields || [];
          setRawHeaders(headers);
          setRawRows(res.data as Record<string, any>[]);
          setMapping(autoDetect(headers));
          setStep('map');
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (data.length === 0) return;
        const headers = Object.keys(data[0]);
        setRawHeaders(headers);
        setRawRows(data);
        setMapping(autoDetect(headers));
        setStep('map');
      };
      reader.readAsBinaryString(file);
    }
    setFileName(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  // ── Validate and preview ───────────────────────────────────────────────
  const handlePreview = () => {
    if (!mapping.team_number) {
      setErrors(['Team Number column is required.']); return;
    }
    const teamNumMap = new Map(teams.map(t => [t.team_number.trim().toUpperCase(), t]));
    const errs: string[] = [];
    const rows: MarksRow[] = [];

    rawRows.forEach((raw, i) => {
      const tn = String(raw[mapping.team_number] || '').trim();
      if (!tn) return;

      const parseScore = (col: string, max: number) => {
        if (!col || !raw[col]) return null;
        const v = Number(raw[col]);
        if (isNaN(v)) { errs.push(`Row ${i + 2}: "${col}" is not a number.`); return null; }
        if (v < 0 || v > max) errs.push(`Row ${i + 2}: ${col} = ${v} is out of range (0–${max}).`);
        return v;
      };

      if (!teamNumMap.has(tn.toUpperCase())) {
        errs.push(`Row ${i + 2}: Team "${tn}" not found in system — import teams first.`);
        return;
      }

      rows.push({
        team_number: tn,
        team_name: mapping.team_name ? String(raw[mapping.team_name] || '') : undefined,
        r1: parseScore(mapping.r1, 50),
        r2: parseScore(mapping.r2, 50),
        r3: parseScore(mapping.r3, 100),
      });
    });

    setErrors(errs);
    setParsedRows(rows);
    setStep('preview');
  };

  // ── Import marks ───────────────────────────────────────────────────────
  const handleImport = async () => {
    setIsImporting(true);
    try {
      await importMarksFromExcel(parsedRows);
      setImportDone(true);
      showToast('Marks Imported', `${parsedRows.length} team marks loaded successfully.`, 'success');
    } catch (e) {
      showToast('Import Failed', 'Could not save marks. Please try again.', 'error');
    }
    setIsImporting(false);
  };

  // ── Download template ──────────────────────────────────────────────────
  const downloadTemplate = () => {
    const sample = teams.slice(0, 5).map(t => ({
      'Team Number': t.team_number,
      'Team Name': t.team_name,
      'Review 1 /50': '',
      'Review 2 /50': '',
      'Review 3 /100': '',
    }));
    if (sample.length === 0) {
      sample.push({ 'Team Number': 'WOAI-001', 'Team Name': 'Example Team', 'Review 1 /50': '', 'Review 2 /50': '', 'Review 3 /100': '' });
    }
    const ws = XLSX.utils.json_to_sheet(sample);
    ws['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks Template');
    XLSX.writeFile(wb, 'WOAI_Marks_Import_Template.xlsx');
  };

  const colOpts = ['', ...rawHeaders];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-white">Import Marks from Excel / CSV</h2>
            <p className="text-xs text-slate-400 mt-0.5">Map columns → preview → import scores for R1, R2, R3</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          {(['upload', 'map', 'preview'] as const).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${step === s ? 'text-indigo-400' : 'text-slate-600'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{i + 1}</span>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </div>
              {i < 2 && <ArrowRight className="w-3 h-3 text-slate-700 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ── STEP 1: UPLOAD ─────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Download template */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <div>
                  <div className="text-xs font-bold text-indigo-300">Need a template?</div>
                  <div className="text-[11px] text-slate-400">Download a pre-filled template with your current team numbers.</div>
                </div>
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 transition-colors shrink-0">
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 cursor-pointer transition-colors bg-slate-950/30 hover:bg-slate-950/60"
              >
                <UploadCloud className="w-10 h-10 text-slate-500" />
                <div className="text-center">
                  <div className="text-sm font-bold text-white">Drop your marks file here</div>
                  <div className="text-xs text-slate-400 mt-1">or click to browse · .xlsx, .xls, .csv</div>
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              </div>

              {/* Expected columns hint */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-bold text-slate-300 mb-1">Expected columns in your file:</div>
                <div className="grid grid-cols-2 gap-1">
                  {['Team Number (required)', 'Team Name (optional)', 'Review 1 /50', 'Review 2 /50', 'Review 3 /100'].map(c => (
                    <span key={c} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: MAP COLUMNS ────────────────────────────────── */}
          {step === 'map' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-semibold">{fileName}</span>
                <span className="text-slate-400">— {rawRows.length} rows detected</span>
              </div>

              <div className="space-y-3">
                {([
                  { key: 'team_number', label: 'Team Number', required: true, hint: 'e.g. WOAI-001' },
                  { key: 'team_name', label: 'Team Name', required: false, hint: 'optional' },
                  { key: 'r1', label: 'Review 1 Score (/50)', required: false, hint: 'numeric' },
                  { key: 'r2', label: 'Review 2 Score (/50)', required: false, hint: 'numeric' },
                  { key: 'r3', label: 'Review 3 Score (/100)', required: false, hint: 'numeric' },
                ] as const).map(({ key, label, required, hint }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-44 shrink-0">
                      <div className="text-xs font-bold text-slate-200">{label}</div>
                      <div className="text-[10px] text-slate-500">{hint}{required && <span className="text-rose-400 ml-1">*</span>}</div>
                    </div>
                    <select
                      value={mapping[key]}
                      onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {colOpts.map(c => <option key={c} value={c}>{c || '— Not mapped —'}</option>)}
                    </select>
                    {mapping[key] && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                ))}
              </div>

              {errors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {errors[0]}
                </div>
              )}

              <button
                onClick={handlePreview}
                disabled={!mapping.team_number}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold transition-colors"
              >
                Preview Import →
              </button>
            </div>
          )}

          {/* ── STEP 3: PREVIEW ────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {importDone ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400" />
                  <div className="text-lg font-extrabold text-white">Marks Imported!</div>
                  <div className="text-sm text-slate-400">{parsedRows.length} teams updated with scores.</div>
                  <button onClick={handleClose} className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors">Done</button>
                </div>
              ) : (
                <>
                  {errors.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 max-h-32 overflow-y-auto">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300"><AlertTriangle className="w-3.5 h-3.5" /> {errors.length} warning(s)</div>
                      {errors.map((e, i) => <div key={i} className="text-[11px] text-amber-200">{e}</div>)}
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-950 text-slate-400 font-bold uppercase sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Team No.</th>
                            <th className="px-3 py-2">Team Name</th>
                            <th className="px-3 py-2 text-center">R1 /50</th>
                            <th className="px-3 py-2 text-center">R2 /50</th>
                            <th className="px-3 py-2 text-center">R3 /100</th>
                            <th className="px-3 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {parsedRows.map((row, i) => {
                            const team = teams.find(t => t.team_number.trim().toUpperCase() === row.team_number.toUpperCase());
                            return (
                              <tr key={i} className="hover:bg-slate-800/30">
                                <td className="px-3 py-2 font-mono text-indigo-400 font-bold">{row.team_number}</td>
                                <td className="px-3 py-2 text-white">{team?.team_name || row.team_name || '—'}</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {row.r1 !== null && row.r1 !== undefined ? <span className="text-indigo-300 font-bold">{row.r1}</span> : <span className="text-slate-600">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {row.r2 !== null && row.r2 !== undefined ? <span className="text-purple-300 font-bold">{row.r2}</span> : <span className="text-slate-600">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {row.r3 !== null && row.r3 !== undefined ? <span className="text-amber-300 font-bold">{row.r3}</span> : <span className="text-slate-600">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {team ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">✓ Matched</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">⚠ Not found</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button onClick={() => setStep('map')} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors">
                      ← Back
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={isImporting || parsedRows.length === 0}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {isImporting ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing…</>
                      ) : (
                        <><FileSpreadsheet className="w-4 h-4" /> Import {parsedRows.length} Teams' Marks</>
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
