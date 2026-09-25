import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import type { Team, TeamMember } from '../../types';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { downloadSampleTemplate } from '../../utils/exporter';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  ArrowRight,
  Download,
} from 'lucide-react';

interface ColumnMapping {
  team_number: string;
  team_name: string;
  members: string;
  problem_statement_id: string;
  problem_statement: string;
}

export const ExcelImportModal: React.FC = () => {
  const { isImportModalOpen, closeImportModal, importTeams, teams } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    team_number: '',
    team_name: '',
    members: '',
    problem_statement_id: '',
    problem_statement: '',
  });

  const [importMode, setImportMode] = useState<'append' | 'overwrite' | 'replace'>('append');
  const [validatedTeams, setValidatedTeams] = useState<Team[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ row: number; error: string }[]>([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);

  if (!isImportModalOpen) return null;

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping({
      team_number: '',
      team_name: '',
      members: '',
      problem_statement_id: '',
      problem_statement: '',
    });
    setValidatedTeams([]);
    setValidationErrors([]);
    setDuplicateWarnings([]);
  };

  const handleClose = () => {
    handleReset();
    closeImportModal();
  };

  const autoDetectColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      team_number: '',
      team_name: '',
      members: '',
      problem_statement_id: '',
      problem_statement: '',
    };

    headers.forEach((h) => {
      const clean = h.trim().toLowerCase();
      if (clean.includes('team no') || clean.includes('team number') || clean.includes('team_id') || clean.includes('team_no') || clean === 'team') {
        mapping.team_number = h;
      } else if (clean.includes('team name') || clean === 'name' || clean.includes('project name')) {
        mapping.team_name = h;
      } else if (clean.includes('member') || clean.includes('students') || clean.includes('participants') || clean.includes('names')) {
        mapping.members = h;
      } else if (clean.includes('problem statement id') || clean.includes('problem id') || clean.includes('ps id') || clean.includes('ps_id') || clean.includes('psid')) {
        mapping.problem_statement_id = h;
      } else if (clean.includes('problem statement') || clean.includes('problem') || clean.includes('title') || clean.includes('description') || clean.includes('abstract')) {
        mapping.problem_statement = h;
      }
    });

    if (!mapping.team_number && headers.length > 0) mapping.team_number = headers[0];
    if (!mapping.team_name && headers.length > 1) mapping.team_name = headers[1];
    if (!mapping.members && headers.length > 2) mapping.members = headers[2];
    if (!mapping.problem_statement_id && headers.length > 3) mapping.problem_statement_id = headers[3];
    if (!mapping.problem_statement && headers.length > 4) mapping.problem_statement = headers[4];

    return mapping;
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields && results.meta.fields.length > 0) {
            const headers = results.meta.fields;
            setRawHeaders(headers);
            setRawRows(results.data as Record<string, any>[]);
            setColumnMapping(autoDetectColumns(headers));
            setStep('mapping');
          }
        },
        error: (err) => {
          alert(`Failed to parse CSV: ${err.message}`);
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

          if (jsonData.length > 0) {
            const headers = (jsonData[0] as string[]).map((h) => String(h || '').trim()).filter(Boolean);
            const rows = jsonData.slice(1).map((row: any) => {
              const obj: Record<string, any> = {};
              headers.forEach((h, i) => {
                obj[h] = row[i];
              });
              return obj;
            }).filter((row) => Object.values(row).some((val) => val !== undefined && val !== ''));

            setRawHeaders(headers);
            setRawRows(rows);
            setColumnMapping(autoDetectColumns(headers));
            setStep('mapping');
          }
        } catch {
          alert('Could not parse Excel file. Ensure valid format.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file format. Please upload .xlsx, .xls, or .csv');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const processAndValidate = () => {
    const teamsList: Team[] = [];
    const errors: { row: number; error: string }[] = [];
    const duplicateSet = new Set<string>();
    const existingTeamNums = new Set(teams.map((t) => t.team_number.trim().toUpperCase()));
    const sheetTeamNums = new Set<string>();

    rawRows.forEach((row, index) => {
      const rowNum = index + 2;
      const teamNumRaw = String(row[columnMapping.team_number] || '').trim();
      const teamNameRaw = String(row[columnMapping.team_name] || '').trim();
      const membersRaw = String(row[columnMapping.members] || '').trim();
      const psIdRaw = String(row[columnMapping.problem_statement_id] || '').trim();
      const psRaw = String(row[columnMapping.problem_statement] || '').trim();

      if (!teamNumRaw) {
        errors.push({ row: rowNum, error: 'Missing Team Number.' });
        return;
      }
      if (!teamNameRaw) {
        errors.push({ row: rowNum, error: 'Missing Team Name.' });
        return;
      }

      const teamNumKey = teamNumRaw.toUpperCase();
      if (sheetTeamNums.has(teamNumKey)) {
        duplicateSet.add(`${teamNumRaw} (duplicate in sheet)`);
      }
      sheetTeamNums.add(teamNumKey);

      if (existingTeamNums.has(teamNumKey)) {
        duplicateSet.add(`${teamNumRaw} (already exists in database)`);
      }

      const memberNames = membersRaw
        .split(/[\n,;•\r]+/)
        .map((m) => m.trim().replace(/^[-*]\s*/, ''))
        .filter(Boolean);

      const members: TeamMember[] =
        memberNames.length > 0
          ? memberNames.map((name, i) => ({
              id: `m-${Date.now()}-${index}-${i}`,
              name,
            }))
          : [{ id: `m-${Date.now()}-${index}-0`, name: `${teamNameRaw} Lead` }];

      const newTeam: Team = {
        id: `team-${teamNumKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        team_number: teamNumRaw,
        team_name: teamNameRaw,
        problem_statement_id: psIdRaw || 'PS-TBD',
        problem_statement: psRaw || 'Problem Statement details to be updated.',
        members,
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      teamsList.push(newTeam);
    });

    setValidatedTeams(teamsList);
    setValidationErrors(errors);
    setDuplicateWarnings(Array.from(duplicateSet));
    setStep('preview');
  };

  const executeImport = () => {
    if (validatedTeams.length === 0) return;
    importTeams(validatedTeams, importMode);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Import Teams Spreadsheet</h3>
              <p className="text-xs text-slate-400">
                Dynamic Excel (.xlsx, .xls) and CSV batch importer with column mapping
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadSampleTemplate('xlsx')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Download clean Excel template"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample Template</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-indigo-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'upload' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
              <span>Upload File</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-indigo-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'mapping' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
              <span>Column Mapping</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-indigo-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'preview' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
              <span>Preview & Validate</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white mb-1">
                  Choose Excel or CSV file to upload
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Drag and drop your hackathon team spreadsheet here, or click to browse files
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">.xlsx</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">.xls</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">.csv</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h5 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Supported Fields & Format Tips
                </h5>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li><span className="text-slate-200 font-semibold">Team Number:</span> Unique identifier (e.g. WOAI-001)</li>
                  <li><span className="text-slate-200 font-semibold">Team Name:</span> Full project/team title</li>
                  <li><span className="text-slate-200 font-semibold">Team Members:</span> Comma-separated or newline-separated student names</li>
                  <li><span className="text-slate-200 font-semibold">Problem Statement ID & Text:</span> Domain/Problem specification</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">{fileName}</span>
                  <span className="text-xs text-slate-400">({rawRows.length} rows found)</span>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs text-indigo-400 hover:underline"
                >
                  Change file
                </button>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">Map Spreadsheet Columns to System Fields</h4>
                <p className="text-xs text-slate-400 mb-4">
                  Confirm or modify the auto-detected columns before importing.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Team Number <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={columnMapping.team_number}
                      onChange={(e) => setColumnMapping({ ...columnMapping, team_number: e.target.value })}
                      className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Team Name <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={columnMapping.team_name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, team_name: e.target.value })}
                      className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Team Member Names
                    </label>
                    <select
                      value={columnMapping.members}
                      onChange={(e) => setColumnMapping({ ...columnMapping, members: e.target.value })}
                      className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Problem Statement ID
                    </label>
                    <select
                      value={columnMapping.problem_statement_id}
                      onChange={(e) => setColumnMapping({ ...columnMapping, problem_statement_id: e.target.value })}
                      className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Problem Statement Description
                    </label>
                    <select
                      value={columnMapping.problem_statement}
                      onChange={(e) => setColumnMapping({ ...columnMapping, problem_statement: e.target.value })}
                      className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="text-base font-bold font-mono text-white">{validatedTeams.length}</div>
                    <div className="text-[11px] text-slate-400">Valid Teams Ready</div>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                  validationErrors.length > 0 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="text-base font-bold font-mono text-white">{validationErrors.length}</div>
                    <div className="text-[11px] text-slate-400">Errors (Skipped)</div>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                  duplicateWarnings.length > 0 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="text-base font-bold font-mono text-white">{duplicateWarnings.length}</div>
                    <div className="text-[11px] text-slate-400">Duplicates Detected</div>
                  </div>
                </div>
              </div>

              {duplicateWarnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <span className="font-bold">Duplicate Notice: </span>
                  {duplicateWarnings.slice(0, 3).join(', ')}
                  {duplicateWarnings.length > 3 && ` and ${duplicateWarnings.length - 3} more`}.
                  Select your desired import mode below.
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Import Mode Action
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importMode === 'append'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold mb-0.5">Append New Only</div>
                    <div className="text-[10px] text-slate-400">Skip existing team numbers</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('overwrite')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importMode === 'overwrite'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold mb-0.5">Update / Overwrite</div>
                    <div className="text-[10px] text-slate-400">Update existing team data</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importMode === 'replace'
                        ? 'bg-rose-600/20 border-rose-500 text-rose-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold mb-0.5">Clear & Replace All</div>
                    <div className="text-[10px] text-slate-400">Wipe current list & import fresh</div>
                  </button>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Data Preview (First 5 Rows)
                </h5>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 font-semibold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Team No</th>
                        <th className="p-2.5">Team Name</th>
                        <th className="p-2.5">Members</th>
                        <th className="p-2.5">PS ID</th>
                        <th className="p-2.5">Problem Statement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                      {validatedTeams.slice(0, 5).map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono font-bold text-indigo-400">{t.team_number}</td>
                          <td className="p-2.5 font-semibold text-white">{t.team_name}</td>
                          <td className="p-2.5 text-slate-400">
                            {t.members.map((m) => m.name).join(', ')}
                          </td>
                          <td className="p-2.5 font-mono text-slate-400">{t.problem_statement_id}</td>
                          <td className="p-2.5 text-slate-400 max-w-xs truncate">{t.problem_statement}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={step === 'upload' ? handleClose : () => setStep(step === 'preview' ? 'mapping' : 'upload')}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            {step === 'upload' ? 'Cancel' : 'Back'}
          </button>

          {step === 'mapping' && (
            <button
              type="button"
              onClick={processAndValidate}
              disabled={!columnMapping.team_number || !columnMapping.team_name}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <span>Validate & Preview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 'preview' && (
            <button
              type="button"
              onClick={executeImport}
              disabled={validatedTeams.length === 0}
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Import ({validatedTeams.length} Teams)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
