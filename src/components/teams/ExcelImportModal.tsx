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
  leader_name: string;
  college_name: string;
  contact_number: string;
  euphoria_id: string;
  problem_statement_id: string;
  problem_statement: string;
  // Multi members
  member_2_name: string;
  member_2_college: string;
  member_2_euphoria_id: string;
  member_3_name: string;
  member_3_college: string;
  member_3_euphoria_id: string;
  member_4_name: string;
  member_4_college: string;
  member_4_euphoria_id: string;
  member_5_name: string;
  member_5_college: string;
  member_5_euphoria_id: string;
  members_fallback: string;
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
    leader_name: '',
    college_name: '',
    contact_number: '',
    euphoria_id: '',
    problem_statement_id: '',
    problem_statement: '',
    member_2_name: '',
    member_2_college: '',
    member_2_euphoria_id: '',
    member_3_name: '',
    member_3_college: '',
    member_3_euphoria_id: '',
    member_4_name: '',
    member_4_college: '',
    member_4_euphoria_id: '',
    member_5_name: '',
    member_5_college: '',
    member_5_euphoria_id: '',
    members_fallback: '',
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
      leader_name: '',
      college_name: '',
      contact_number: '',
      euphoria_id: '',
      problem_statement_id: '',
      problem_statement: '',
      member_2_name: '',
      member_2_college: '',
      member_2_euphoria_id: '',
      member_3_name: '',
      member_3_college: '',
      member_3_euphoria_id: '',
      member_4_name: '',
      member_4_college: '',
      member_4_euphoria_id: '',
      member_5_name: '',
      member_5_college: '',
      member_5_euphoria_id: '',
      members_fallback: '',
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
      leader_name: '',
      college_name: '',
      contact_number: '',
      euphoria_id: '',
      problem_statement_id: '',
      problem_statement: '',
      member_2_name: '',
      member_2_college: '',
      member_2_euphoria_id: '',
      member_3_name: '',
      member_3_college: '',
      member_3_euphoria_id: '',
      member_4_name: '',
      member_4_college: '',
      member_4_euphoria_id: '',
      member_5_name: '',
      member_5_college: '',
      member_5_euphoria_id: '',
      members_fallback: '',
    };

    headers.forEach((h) => {
      const clean = h.trim().toLowerCase();

      // Team No
      if (!mapping.team_number && (clean.includes('team no') || clean.includes('team number') || clean.includes('team_id') || clean.includes('team_no') || clean === 'team')) {
        mapping.team_number = h;
      }
      // Team Name
      else if (!mapping.team_name && (clean.includes('team name') || clean === 'team' || clean.includes('project name'))) {
        mapping.team_name = h;
      }
      // Leader Name
      else if (!mapping.leader_name && (clean.includes('leader') || clean.includes('team lead') || clean.includes('lead name') || clean.includes('leader name'))) {
        mapping.leader_name = h;
      }
      // College
      else if (!mapping.college_name && (clean.includes('college') || clean.includes('institution') || clean.includes('university') || clean.includes('campus'))) {
        mapping.college_name = h;
      }
      // Contact
      else if (!mapping.contact_number && (clean.includes('contact') || clean.includes('phone') || clean.includes('mobile') || clean.includes('cell'))) {
        mapping.contact_number = h;
      }
      // Euphoria ID
      else if (!mapping.euphoria_id && (clean.includes('euphoria') || clean.includes('euph_id') || clean.includes('participant id') || clean.includes('euphoria id'))) {
        mapping.euphoria_id = h;
      }
      // Problem Statement ID / Number
      else if (!mapping.problem_statement_id && (clean.includes('problem statement id') || clean.includes('problem id') || clean.includes('ps id') || clean.includes('ps_id') || clean.includes('problem number') || clean.includes('ps no') || clean.includes('ps number') || clean.includes('problem statement number'))) {
        mapping.problem_statement_id = h;
      }
      // Problem Statement Title
      else if (!mapping.problem_statement && (clean.includes('problem statement title') || clean.includes('problem statement') || clean.includes('problem title') || clean.includes('abstract') || clean.includes('title') || clean.includes('description'))) {
        mapping.problem_statement = h;
      }
      // Member 2
      else if (!mapping.member_2_name && (clean.includes('member 2 name') || clean.includes('member 2') || clean.includes('member2 name') || clean.includes('member2'))) {
        mapping.member_2_name = h;
      } else if (!mapping.member_2_college && (clean.includes('member 2 college') || clean.includes('member2 college'))) {
        mapping.member_2_college = h;
      } else if (!mapping.member_2_euphoria_id && (clean.includes('member 2 euphoria') || clean.includes('member2 euphoria') || clean.includes('member 2 id'))) {
        mapping.member_2_euphoria_id = h;
      }
      // Member 3
      else if (!mapping.member_3_name && (clean.includes('member 3 name') || clean.includes('member 3') || clean.includes('member3 name') || clean.includes('member3'))) {
        mapping.member_3_name = h;
      } else if (!mapping.member_3_college && (clean.includes('member 3 college') || clean.includes('member3 college'))) {
        mapping.member_3_college = h;
      } else if (!mapping.member_3_euphoria_id && (clean.includes('member 3 euphoria') || clean.includes('member3 euphoria') || clean.includes('member 3 id'))) {
        mapping.member_3_euphoria_id = h;
      }
      // Member 4
      else if (!mapping.member_4_name && (clean.includes('member 4 name') || clean.includes('member 4') || clean.includes('member4 name') || clean.includes('member4'))) {
        mapping.member_4_name = h;
      } else if (!mapping.member_4_college && (clean.includes('member 4 college') || clean.includes('member4 college'))) {
        mapping.member_4_college = h;
      } else if (!mapping.member_4_euphoria_id && (clean.includes('member 4 euphoria') || clean.includes('member4 euphoria') || clean.includes('member 4 id'))) {
        mapping.member_4_euphoria_id = h;
      }
      // Member 5
      else if (!mapping.member_5_name && (clean.includes('member 5 name') || clean.includes('member 5') || clean.includes('member5 name') || clean.includes('member5'))) {
        mapping.member_5_name = h;
      } else if (!mapping.member_5_college && (clean.includes('member 5 college') || clean.includes('member5 college'))) {
        mapping.member_5_college = h;
      } else if (!mapping.member_5_euphoria_id && (clean.includes('member 5 euphoria') || clean.includes('member5 euphoria') || clean.includes('member 5 id'))) {
        mapping.member_5_euphoria_id = h;
      }
      // Generic members fallback
      else if (!mapping.members_fallback && (clean.includes('members') || clean.includes('participants') || clean.includes('students'))) {
        mapping.members_fallback = h;
      }
    });

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
      const leaderNameRaw = String(row[columnMapping.leader_name] || '').trim();
      const collegeRaw = String(row[columnMapping.college_name] || '').trim();
      const contactRaw = String(row[columnMapping.contact_number] || '').trim();
      const euphoriaRaw = String(row[columnMapping.euphoria_id] || '').trim();
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
        errors.push({ row: rowNum, error: `Duplicate Team Number "${teamNumRaw}" inside uploaded sheet.` });
        return;
      }
      sheetTeamNums.add(teamNumKey);

      if (existingTeamNums.has(teamNumKey) && importMode === 'append') {
        duplicateSet.add(teamNumRaw);
      }

      // Assemble members: up to 5 members maximum
      const memberList: TeamMember[] = [];

      // 1. Leader (Member 1)
      if (leaderNameRaw) {
        memberList.push({
          id: `m-lead-${teamNumKey}-${Date.now()}`,
          name: leaderNameRaw,
          role: 'Team Leader',
          college_name: collegeRaw,
          euphoria_id: euphoriaRaw,
          contact_number: contactRaw,
        });
      }

      // 2. Multi-column members 2 through 5
      const multiMembers = [
        {
          name: String(row[columnMapping.member_2_name] || '').trim(),
          college: String(row[columnMapping.member_2_college] || collegeRaw).trim(),
          euphoria: String(row[columnMapping.member_2_euphoria_id] || '').trim(),
        },
        {
          name: String(row[columnMapping.member_3_name] || '').trim(),
          college: String(row[columnMapping.member_3_college] || collegeRaw).trim(),
          euphoria: String(row[columnMapping.member_3_euphoria_id] || '').trim(),
        },
        {
          name: String(row[columnMapping.member_4_name] || '').trim(),
          college: String(row[columnMapping.member_4_college] || collegeRaw).trim(),
          euphoria: String(row[columnMapping.member_4_euphoria_id] || '').trim(),
        },
        {
          name: String(row[columnMapping.member_5_name] || '').trim(),
          college: String(row[columnMapping.member_5_college] || collegeRaw).trim(),
          euphoria: String(row[columnMapping.member_5_euphoria_id] || '').trim(),
        },
      ];

      multiMembers.forEach((mm, i) => {
        if (mm.name && memberList.length < 5) {
          memberList.push({
            id: `m-${teamNumKey}-${i + 2}-${Date.now()}`,
            name: mm.name,
            role: `Member ${i + 2}`,
            college_name: mm.college || collegeRaw,
            euphoria_id: mm.euphoria,
            contact_number: '',
          });
        }
      });

      // 3. Fallback: If no multi-column members found, parse generic members column
      if (memberList.length === 0 && columnMapping.members_fallback && row[columnMapping.members_fallback]) {
        const rawMembers = String(row[columnMapping.members_fallback] || '');
        const names = rawMembers
          .split(/[,;\n\r]+/)
          .map((n) => n.trim())
          .filter(Boolean)
          .slice(0, 5);

        names.forEach((name, i) => {
          memberList.push({
            id: `m-${teamNumKey}-${i + 1}-${Date.now()}`,
            name,
            role: i === 0 ? 'Team Leader' : `Member ${i + 1}`,
            college_name: collegeRaw,
            euphoria_id: i === 0 ? euphoriaRaw : '',
            contact_number: i === 0 ? contactRaw : '',
          });
        });
      }

      // If leader was not explicitly specified, assume member 1 is leader
      const finalLeaderName = leaderNameRaw || memberList[0]?.name || '';

      const teamObj: Team = {
        id: `team-${teamNumKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}-${index}`,
        team_number: teamNumRaw,
        team_name: teamNameRaw,
        problem_statement_id: psIdRaw || 'PS-TBD',
        problem_statement: psRaw || 'Problem Statement details pending',
        college_name: collegeRaw,
        contact_number: contactRaw,
        leader_name: finalLeaderName,
        leader_euphoria_id: euphoriaRaw,
        members: memberList,
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      teamsList.push(teamObj);
    });

    setValidatedTeams(teamsList);
    setValidationErrors(errors);
    setDuplicateWarnings(Array.from(duplicateSet));
    setStep('preview');
  };

  const handleFinalImport = async () => {
    if (validatedTeams.length === 0) return;
    await importTeams(validatedTeams, importMode);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-4xl my-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Import Teams from Excel / CSV
              </h2>
              <p className="text-xs text-slate-400">
                Upload student rosters with team number, leader, college, Euphoria ID, problem statement, and members (Max 5).
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

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-950/60 border-b border-slate-800/60 text-xs">
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'upload' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>1</span>
              <span>Upload Spreadsheet</span>
            </div>
            <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'mapping' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>2</span>
              <span>Map Columns</span>
            </div>
            <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'preview' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>3</span>
              <span>Validate &amp; Import</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadSampleTemplate('xlsx')}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Excel Template</span>
            </button>
            <button
              onClick={() => downloadSampleTemplate('csv')}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV Template</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-900/30 hover:bg-indigo-950/10 transition-all duration-200 group"
              >
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-4 shadow-lg shadow-indigo-500/5">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Drop your team spreadsheet here or <span className="text-indigo-400 underline underline-offset-4">browse files</span>
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Supports Excel (.xlsx, .xls) and CSV (.csv). Auto-detects team name, leader, college, contact, Euphoria ID, problem statement, and members.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 space-y-2">
                <span className="font-bold text-indigo-300 block flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  Excel Format Best Practices:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Include columns: <strong>Team Number, Team Name, Team Leader Name, College Name, Contact Number, Euphoria ID, Problem Statement Number, Problem Statement Title</strong>.</li>
                  <li>Include columns for member details: <strong>Member 2 Name, Member 2 College, Member 2 Euphoria ID</strong> (up to Member 5).</li>
                  <li>Maximum 5 members per team are supported.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">Map Spreadsheet Columns</h3>
                  <p className="text-xs text-slate-400">
                    File: <span className="text-indigo-300 font-mono">{fileName}</span> ({rawRows.length} rows found)
                  </p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Change file
                </button>
              </div>

              {/* Primary Team Fields */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Primary Team &amp; Leader Info
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Team Number <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={columnMapping.team_number}
                      onChange={(e) => setColumnMapping({ ...columnMapping, team_number: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Team Name <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={columnMapping.team_name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, team_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Team Leader Name
                    </label>
                    <select
                      value={columnMapping.leader_name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, leader_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      College / Institution Name
                    </label>
                    <select
                      value={columnMapping.college_name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, college_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Contact / Mobile Number
                    </label>
                    <select
                      value={columnMapping.contact_number}
                      onChange={(e) => setColumnMapping({ ...columnMapping, contact_number: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Euphoria ID
                    </label>
                    <select
                      value={columnMapping.euphoria_id}
                      onChange={(e) => setColumnMapping({ ...columnMapping, euphoria_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Problem Statement Number / ID
                    </label>
                    <select
                      value={columnMapping.problem_statement_id}
                      onChange={(e) => setColumnMapping({ ...columnMapping, problem_statement_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Problem Statement Title / Track
                    </label>
                    <select
                      value={columnMapping.problem_statement}
                      onChange={(e) => setColumnMapping({ ...columnMapping, problem_statement: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Members 2 to 5 Mapping */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Additional Team Members (Members 2 to 5)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 2 Name</label>
                    <select
                      value={columnMapping.member_2_name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_2_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None / Select --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 2 College</label>
                    <select
                      value={columnMapping.member_2_college}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_2_college: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Same as Team / Select --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 2 Euphoria ID</label>
                    <select
                      value={columnMapping.member_2_euphoria_id}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_2_euphoria_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 3 Name</label>
                    <select
                      value={columnMapping.member_3_name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_3_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None / Select --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 3 College</label>
                    <select
                      value={columnMapping.member_3_college}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_3_college: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Same as Team / Select --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 3 Euphoria ID</label>
                    <select
                      value={columnMapping.member_3_euphoria_id}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_3_euphoria_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 4 Name</label>
                    <select
                      value={columnMapping.member_4_name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_4_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None / Select --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 4 College</label>
                    <select
                      value={columnMapping.member_4_college}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_4_college: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Same as Team / Select --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 4 Euphoria ID</label>
                    <select
                      value={columnMapping.member_4_euphoria_id}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_4_euphoria_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 5 Name</label>
                    <select
                      value={columnMapping.member_5_name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_5_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None / Select --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 5 College</label>
                    <select
                      value={columnMapping.member_5_college}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_5_college: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Same as Team / Select --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member 5 Euphoria ID</label>
                    <select
                      value={columnMapping.member_5_euphoria_id}
                      onChange={(e) => setColumnMapping({ ...columnMapping, member_5_euphoria_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Validation */}
          {step === 'preview' && (
            <div className="space-y-5">
              {validationErrors.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Found {validationErrors.length} validation errors</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto text-[11px]">
                    {validationErrors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {duplicateWarnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Duplicate Team Numbers Found:</span>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      {duplicateWarnings.join(', ')} already exist in database. In &quot;Append&quot; mode, duplicates will be skipped.
                    </p>
                  </div>
                </div>
              )}

              {/* Import Mode Selector */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <span className="font-semibold text-slate-300">Import Mode:</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-300">Append (Skip duplicates)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'overwrite'}
                      onChange={() => setImportMode('overwrite')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-300">Upsert (Update matching team numbers)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-rose-400 focus:ring-rose-500"
                    />
                    <span className="text-rose-300">Replace Database</span>
                  </label>
                </div>
              </div>

              {/* Validated Teams Table Preview */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    Validated Teams Ready to Import ({validatedTeams.length})
                  </span>
                  <span className="text-emerald-400 font-medium">All columns parsed</span>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Team</th>
                        <th className="p-3">Leader &amp; Euphoria ID</th>
                        <th className="p-3">College</th>
                        <th className="p-3">Problem Statement</th>
                        <th className="p-3">Members ({'&le;'}5)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {validatedTeams.slice(0, 10).map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/30">
                          <td className="p-3">
                            <span className="font-mono text-indigo-400 font-bold mr-1.5">{t.team_number}</span>
                            <span className="text-white font-semibold">{t.team_name}</span>
                          </td>
                          <td className="p-3 text-slate-300">
                            <div>{t.leader_name || t.members[0]?.name || '--'}</div>
                            {t.leader_euphoria_id && (
                              <span className="text-[10px] font-mono text-purple-400">{t.leader_euphoria_id}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-300 truncate max-w-[140px]">{t.college_name || '--'}</td>
                          <td className="p-3 text-slate-300">
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] font-mono text-slate-400 border border-slate-800 mr-1">
                              {t.problem_statement_id}
                            </span>
                            <span className="text-slate-300 truncate">{t.problem_statement}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {t.members.map((m, mi) => (
                                <span key={mi} className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-300 border border-slate-700">
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validatedTeams.length > 10 && (
                    <div className="p-2 text-center text-xs text-slate-500 bg-slate-900/20 border-t border-slate-800">
                      + {validatedTeams.length - 10} more teams in file
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-900/50">
          {step === 'upload' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}

          {step === 'mapping' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Back to Upload
              </button>
              <button
                onClick={processAndValidate}
                disabled={!columnMapping.team_number || !columnMapping.team_name}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/25 transition-all"
              >
                <span>Continue to Preview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Back to Column Mapping
              </button>
              <button
                onClick={handleFinalImport}
                disabled={validatedTeams.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-600/25 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Import {validatedTeams.length} Teams</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
