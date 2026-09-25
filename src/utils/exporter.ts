import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TeamScoreSummary, CompetitionSettings } from '../types';

export function exportMarksToExcel(
  summaries: TeamScoreSummary[],
  _settings?: CompetitionSettings,
  fileName = 'Wonders_of_AI_Marks_Report.xlsx'
) {
  const workbook = XLSX.utils.book_new();

  // ── Sheet 1: Clean Summary ──────────────────────────────────────────────
  const summaryData = summaries.map((s, idx) => ({
    'Rank': s.rank || idx + 1,
    'Team Number': s.team.team_number,
    'Team Name': s.team.team_name,
    'Problem ID': s.team.problem_statement_id,
    'Review 1 /50': s.r1Score !== null ? s.r1Score : '',
    'Review 2 /50': s.r2Score !== null ? s.r2Score : '',
    'Review 3 /100': s.r3Score !== null ? s.r3Score : '',
    'Total /200': s.grandTotal !== null ? s.grandTotal : '',
    'Overall %': s.weightedPercentage !== null ? `${s.weightedPercentage.toFixed(1)}%` : '',
    'Finale Status': s.isEligibleForFinale ? 'ELIGIBLE' : s.prelimsMainsTotal !== null ? 'NOT ELIGIBLE' : 'PENDING',
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 28 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Summary');

  // ── Sheet 2: Full Detail ──────────────────────────────────────────────
  const detailData = summaries.map((s, idx) => ({
    'Rank': s.rank || idx + 1,
    'Team Number': s.team.team_number,
    'Team Name': s.team.team_name,
    'Members': s.team.members.map((m) => m.name).join(', '),
    'Problem ID': s.team.problem_statement_id,
    'R1 Prelims /50': s.r1Score !== null ? s.r1Score : '',
    'R1 %': s.r1Percentage !== null ? `${s.r1Percentage.toFixed(1)}%` : '',
    'R1 Judge': s.r1Review?.judge_username || '',
    'R2 Mains /50': s.r2Score !== null ? s.r2Score : '',
    'R2 %': s.r2Percentage !== null ? `${s.r2Percentage.toFixed(1)}%` : '',
    'R2 Judge': s.r2Review?.judge_username || '',
    'R1+R2 /100': s.prelimsMainsTotal !== null ? s.prelimsMainsTotal : '',
    'Pre-Finale %': s.prelimsMainsPercentage !== null ? `${s.prelimsMainsPercentage.toFixed(1)}%` : '',
    'Finale Eligible': s.isEligibleForFinale ? 'YES' : 'NO',
    'R3 Finale /100': s.r3Score !== null ? s.r3Score : '',
    'R3 %': s.r3Percentage !== null ? `${s.r3Percentage.toFixed(1)}%` : '',
    'R3 Judge': s.r3Review?.judge_username || '',
    'Grand Total /200': s.grandTotal !== null ? s.grandTotal : '',
    'Final %': s.weightedPercentage !== null ? `${s.weightedPercentage.toFixed(1)}%` : '',
    'Status': s.statusText,
  }));

  const wsDetail = XLSX.utils.json_to_sheet(detailData);
  wsDetail['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 28 }, { wch: 40 }, { wch: 14 },
    { wch: 16 }, { wch: 8 }, { wch: 12 },
    { wch: 16 }, { wch: 8 }, { wch: 12 },
    { wch: 12 }, { wch: 14 }, { wch: 16 },
    { wch: 16 }, { wch: 8 }, { wch: 12 },
    { wch: 16 }, { wch: 10 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsDetail, 'Full Detail');

  XLSX.writeFile(workbook, fileName);
}


export function exportMarksToCSV(
  summaries: TeamScoreSummary[],
  fileName = 'Wonders_of_AI_Marks_Report.csv'
) {
  const headers = [
    'Rank',
    'Team Number',
    'Team Name',
    'Members',
    'Problem ID',
    'Review 1 (50)',
    'Review 2 (50)',
    'Pre-Finale Total (100)',
    'Pre-Finale %',
    'Finale Eligibility',
    'Review 3 (100)',
    'Grand Total (200)',
    'Weighted %',
    'Status',
  ];

  const rows = summaries.map((s, idx) => [
    s.rank || idx + 1,
    `"${s.team.team_number}"`,
    `"${s.team.team_name.replace(/"/g, '""')}"`,
    `"${s.team.members.map((m) => m.name).join(', ').replace(/"/g, '""')}"`,
    `"${s.team.problem_statement_id}"`,
    s.r1Score !== null ? s.r1Score : '',
    s.r2Score !== null ? s.r2Score : '',
    s.prelimsMainsTotal !== null ? s.prelimsMainsTotal : '',
    s.prelimsMainsPercentage !== null ? `${s.prelimsMainsPercentage.toFixed(1)}%` : '',
    s.isEligibleForFinale ? 'Eligible' : 'Not Eligible',
    s.r3Score !== null ? s.r3Score : '',
    s.grandTotal !== null ? s.grandTotal : '',
    s.weightedPercentage !== null ? `${s.weightedPercentage.toFixed(1)}%` : '',
    `"${s.statusText}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportMarksToPDF(
  summaries: TeamScoreSummary[],
  settings: CompetitionSettings,
  fileName = 'Wonders_of_AI_Marks_Summary.pdf'
) {
  const doc = new jsPDF('landscape', 'pt', 'a4');

  // Header Title
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(`${settings.competition_name} – Official Evaluation Ledger`, 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated on ${new Date().toLocaleString()} | Rule: Combined R1+R2 >= ${settings.advancement_threshold_percent}% (Top ${settings.advancement_top_teams_limit}) advances to Finale`,
    40,
    58
  );

  const tableData = summaries.map((s, idx) => [
    s.rank || idx + 1,
    s.team.team_number,
    s.team.team_name,
    s.team.problem_statement_id,
    s.r1Score !== null ? `${s.r1Score}/50` : '—',
    s.r2Score !== null ? `${s.r2Score}/50` : '—',
    s.prelimsMainsTotal !== null ? `${s.prelimsMainsTotal}/100 (${s.prelimsMainsPercentage?.toFixed(0)}%)` : '—',
    s.isEligibleForFinale ? 'ELIGIBLE' : 'NO',
    s.r3Score !== null ? `${s.r3Score}/100` : '—',
    s.grandTotal !== null ? `${s.grandTotal}/200` : '—',
    s.weightedPercentage !== null ? `${s.weightedPercentage.toFixed(1)}%` : '—',
    s.statusText,
  ]);

  autoTable(doc, {
    startY: 75,
    head: [
      [
        'Rank',
        'Team #',
        'Team Name',
        'PS ID',
        'R1 (50)',
        'R2 (50)',
        'R1+R2 (100)',
        'Finale',
        'R3 (100)',
        'Total (200)',
        'Final %',
        'Status',
      ],
    ],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(fileName);
}

export function downloadSampleTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const sampleData = [
    {
      'Team Number': 'WOAI-101',
      'Team Name': 'Alpha Vision AI',
      'Team Leader Name': 'Aarav Sharma',
      'College Name': 'MIT College of Engineering',
      'Contact Number': '+91 98765 43210',
      'Euphoria ID': 'EUPH-101',
      'Problem Statement Number': 'PS-001',
      'Problem Statement Title': 'Real-time multi-modal medical diagnostics using edge vision models and offline inference pipelines.',
      'Member 2 Name': 'Priya Iyer',
      'Member 2 College': 'MIT College of Engineering',
      'Member 2 Euphoria ID': 'EUPH-102',
      'Member 3 Name': 'Rohan Joshi',
      'Member 3 College': 'MIT College of Engineering',
      'Member 3 Euphoria ID': 'EUPH-103',
      'Member 4 Name': 'Sneha Roy',
      'Member 4 College': 'MIT College of Engineering',
      'Member 4 Euphoria ID': 'EUPH-104',
      'Member 5 Name': 'Farhan Ali',
      'Member 5 College': 'MIT College of Engineering',
      'Member 5 Euphoria ID': 'EUPH-105',
    },
    {
      'Team Number': 'WOAI-102',
      'Team Name': 'RoboHarvest Systems',
      'Team Leader Name': 'Vikramaditya Nair',
      'College Name': 'PSG Tech Coimbatore',
      'Contact Number': '+91 98412 11223',
      'Euphoria ID': 'EUPH-201',
      'Problem Statement Number': 'PS-002',
      'Problem Statement Title': 'Autonomous drone swarm navigation for precision agriculture and automated pesticide dispenser.',
      'Member 2 Name': 'Tanvi Rao',
      'Member 2 College': 'PSG Tech Coimbatore',
      'Member 2 Euphoria ID': 'EUPH-202',
      'Member 3 Name': 'Arjun Sen',
      'Member 3 College': 'PSG Tech Coimbatore',
      'Member 3 Euphoria ID': 'EUPH-203',
      'Member 4 Name': '',
      'Member 4 College': '',
      'Member 4 Euphoria ID': '',
      'Member 5 Name': '',
      'Member 5 College': '',
      'Member 5 Euphoria ID': '',
    },
  ];

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teams_Template');
    ws['!cols'] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 20 },
      { wch: 28 },
      { wch: 18 },
      { wch: 15 },
      { wch: 24 },
      { wch: 45 },
      { wch: 18 },
      { wch: 25 },
      { wch: 15 },
      { wch: 18 },
      { wch: 25 },
      { wch: 15 },
      { wch: 18 },
      { wch: 25 },
      { wch: 15 },
      { wch: 18 },
      { wch: 25 },
      { wch: 15 },
    ];
    XLSX.writeFile(wb, 'Wonders_of_AI_Teams_Template.xlsx');
  } else {
    const headers = Object.keys(sampleData[0]);
    const rows = sampleData.map((d: any) =>
      headers.map((h) => `"${(d[h] || '').toString().replace(/"/g, '""')}"`)
    );
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Wonders_of_AI_Teams_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
