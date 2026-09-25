import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import type { Team, TeamMember } from '../../types';
import {
  X,
  Users,
  Building2,
  Phone,
  Hash,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Award,
} from 'lucide-react';

interface AddEditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamToEdit?: Team | null;
}

export const AddEditTeamModal: React.FC<AddEditTeamModalProps> = ({
  isOpen,
  onClose,
  teamToEdit,
}) => {
  const { teams, saveTeamAction, showToast } = useData();

  const [teamNumber, setTeamNumber] = useState('');
  const [teamName, setTeamName] = useState('');
  const [problemId, setProblemId] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // Leader fields
  const [leaderName, setLeaderName] = useState('');
  const [leaderCollege, setLeaderCollege] = useState('');
  const [leaderEuphoriaId, setLeaderEuphoriaId] = useState('');
  const [leaderContact, setLeaderContact] = useState('');

  // Other members (2 to 5)
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (teamToEdit) {
        setTeamNumber(teamToEdit.team_number || '');
        setTeamName(teamToEdit.team_name || '');
        setProblemId(teamToEdit.problem_statement_id || '');
        setProblemStatement(teamToEdit.problem_statement || '');
        setCollegeName(teamToEdit.college_name || '');
        setContactNumber(teamToEdit.contact_number || '');

        // Detect leader from members or leader_name field
        const leader = teamToEdit.members.find(
          (m) => m.role?.toLowerCase().includes('leader') || m.role?.toLowerCase().includes('lead')
        ) || teamToEdit.members[0];

        setLeaderName(teamToEdit.leader_name || leader?.name || '');
        setLeaderCollege(leader?.college_name || teamToEdit.college_name || '');
        setLeaderEuphoriaId(teamToEdit.leader_euphoria_id || leader?.euphoria_id || '');
        setLeaderContact(leader?.contact_number || teamToEdit.contact_number || '');

        // Other members
        const otherMembers = teamToEdit.members.filter((m) => m !== leader);
        setMembers(
          otherMembers.map((m) => ({
            id: m.id || `m-${Date.now()}-${Math.random()}`,
            name: m.name || '',
            college_name: m.college_name || teamToEdit.college_name || '',
            euphoria_id: m.euphoria_id || '',
            contact_number: m.contact_number || '',
            role: m.role || 'Member',
          }))
        );
      } else {
        // Reset form for new team
        setTeamNumber('');
        setTeamName('');
        setProblemId('');
        setProblemStatement('');
        setCollegeName('');
        setContactNumber('');
        setLeaderName('');
        setLeaderCollege('');
        setLeaderEuphoriaId('');
        setLeaderContact('');
        setMembers([]);
      }
      setErrors({});
    }
  }, [isOpen, teamToEdit]);

  if (!isOpen) return null;

  const handleAddMember = () => {
    // Max 5 members total (1 leader + 4 members)
    if (members.length >= 4) {
      showToast('Maximum Limit', 'A team can have at most 5 members (1 Leader + 4 Members).', 'warning');
      return;
    }
    setMembers([
      ...members,
      {
        id: `m-${Date.now()}-${members.length + 2}`,
        name: '',
        college_name: collegeName || '',
        euphoria_id: '',
        contact_number: '',
        role: `Member ${members.length + 2}`,
      },
    ]);
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!teamNumber.trim()) newErrors.teamNumber = 'Team Number is required (e.g. WOAI-001)';
    if (!teamName.trim()) newErrors.teamName = 'Team Name is required';
    if (!leaderName.trim()) newErrors.leaderName = 'Team Leader Name is required';

    // Check duplicate team number
    if (!teamToEdit) {
      const isDuplicate = teams.some(
        (t) => t.team_number.trim().toUpperCase() === teamNumber.trim().toUpperCase()
      );
      if (isDuplicate) {
        newErrors.teamNumber = `Team number "${teamNumber.trim()}" already exists!`;
      }
    } else {
      const isDuplicate = teams.some(
        (t) => t.id !== teamToEdit.id && t.team_number.trim().toUpperCase() === teamNumber.trim().toUpperCase()
      );
      if (isDuplicate) {
        newErrors.teamNumber = `Team number "${teamNumber.trim()}" is already assigned to another team!`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Assemble members list: Leader first, then remaining members
      const allMembers: TeamMember[] = [
        {
          id: teamToEdit?.members[0]?.id || `m-lead-${Date.now()}`,
          name: leaderName.trim(),
          college_name: (leaderCollege || collegeName).trim(),
          euphoria_id: leaderEuphoriaId.trim(),
          contact_number: (leaderContact || contactNumber).trim(),
          role: 'Team Leader',
        },
        ...members
          .filter((m) => m.name.trim().length > 0)
          .map((m, idx) => ({
            id: m.id || `m-${Date.now()}-${idx + 2}`,
            name: m.name.trim(),
            college_name: (m.college_name || collegeName).trim(),
            euphoria_id: (m.euphoria_id || '').trim(),
            contact_number: (m.contact_number || '').trim(),
            role: m.role || `Member ${idx + 2}`,
          })),
      ];

      const teamPayload: Team = {
        id: teamToEdit?.id || `team-${teamNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        team_number: teamNumber.trim().toUpperCase(),
        team_name: teamName.trim(),
        problem_statement_id: problemId.trim() || 'PS-TBD',
        problem_statement: problemStatement.trim() || 'Problem Statement details pending',
        college_name: collegeName.trim(),
        contact_number: contactNumber.trim() || leaderContact.trim(),
        leader_name: leaderName.trim(),
        leader_euphoria_id: leaderEuphoriaId.trim(),
        members: allMembers,
        is_demo: false,
        created_at: teamToEdit?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveTeamAction(teamPayload);
      onClose();
    } catch (err: any) {
      showToast('Save Failed', err.message || 'Could not save team details.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-3xl my-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {teamToEdit ? 'Edit Team Details' : 'Register New Team'}
              </h2>
              <p className="text-xs text-slate-400">
                {teamToEdit
                  ? `Modifying profile for ${teamToEdit.team_number}`
                  : 'Add a new team with full participant & problem statement info (Max 5 members)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Team & Problem Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Team &amp; Problem Overview</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Team Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. WOAI-001"
                    value={teamNumber}
                    onChange={(e) => setTeamNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {errors.teamNumber && (
                  <p className="text-[11px] text-rose-400 mt-1">{errors.teamNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Team Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. NeuralVision Labs"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {errors.teamName && (
                  <p className="text-[11px] text-rose-400 mt-1">{errors.teamName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  College / Institution Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. MIT College of Engineering"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contact / Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Problem Statement No.
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. PS-AI-01"
                    value={problemId}
                    onChange={(e) => setProblemId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Problem Statement Title / Track
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. Autonomous Edge AI Vision for Oncology"
                    value={problemStatement}
                    onChange={(e) => setProblemStatement(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Team Leader (Member 1) */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Team Leader (Required)</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Primary Point of Contact
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Leader Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                {errors.leaderName && (
                  <p className="text-[11px] text-rose-400 mt-1">{errors.leaderName}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Euphoria ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. EUPH-2026-101"
                  value={leaderEuphoriaId}
                  onChange={(e) => setLeaderEuphoriaId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  College Name
                </label>
                <input
                  type="text"
                  placeholder={collegeName || 'Leader College'}
                  value={leaderCollege}
                  onChange={(e) => setLeaderCollege(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder={contactNumber || '+91 ...'}
                  value={leaderContact}
                  onChange={(e) => setLeaderContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Additional Members (2 to 5) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Additional Team Members ({members.length + 1}/5)
                </span>
                <p className="text-[11px] text-slate-500">
                  Add up to 4 more team members with their college &amp; Euphoria ID.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddMember}
                disabled={members.length >= 4}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  members.length >= 4
                    ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-indigo-500/50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            </div>

            {members.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                No additional members added yet. Click &ldquo;Add Member&rdquo; to add participants (up to 5 total).
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member, index) => (
                  <div
                    key={member.id || index}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400">
                        Member #{index + 2}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(index)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <input
                          type="text"
                          placeholder="Member Full Name"
                          value={member.name}
                          onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="College Name"
                          value={member.college_name || ''}
                          onChange={(e) => handleMemberChange(index, 'college_name', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Euphoria ID (e.g. EUPH-002)"
                          value={member.euphoria_id || ''}
                          onChange={(e) => handleMemberChange(index, 'euphoria_id', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/25 transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Team...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{teamToEdit ? 'Save Changes' : 'Register Team'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
