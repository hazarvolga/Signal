import React, { useState, useEffect } from "react";
import { Activity, MousePointerClick, Plus, Settings, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../services/api";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useCollaboration } from "../services/collaborationContext";
import { HelpTooltip } from "../components/HelpTooltip";
import { Modal } from "../components/ui/Modal";
import { useLanguage } from "../contexts/LanguageContext";

const SectionHeader = ({
  title,
  subtitle,
  action,
  guideKey,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  guideKey?: string;
}) => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-border-hairline pb-4 mb-8 gap-4">
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-ink leading-tight">
          {title}
        </h1>
        {guideKey && <HelpTooltip guideKey={guideKey} />}
      </div>
      {subtitle && (
        <p className="text-base sm:text-lg font-editorial italic text-ink/60">{subtitle}</p>
      )}
    </div>
    {action && <div className="flex shrink-0">{action}</div>}
  </div>
);

export default function Collaboration() {
  const { t } = useLanguage();
  const { hasPermission, user: currentUser } = useAuth();
  const {
    activeUsers,
    cursors,
    activities,
    activityLog,
    joinRoom,
    leaveRoom,
    sendCursorMove,
    sendActivity,
  } = useCollaboration();
  const [team, setTeam] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", permissions: [] as string[] });
  const [inviteData, setInviteData] = useState({ email: "", name: "", role: "VIEWER" });

  useEffect(() => {
    refreshData();
    joinRoom("collaboration-hub");
    return () => leaveRoom("collaboration-hub");
  }, [joinRoom, leaveRoom]);

  const handleMouseMove = (e: React.MouseEvent) => {
    sendCursorMove("collaboration-hub", { x: e.clientX, y: e.clientY });
  };

  const refreshData = () => {
    api.getTeam().then(setTeam);
    api.getBrands().then(setBrands);
    api.getApprovals().then(setApprovals);
    api.getRoles().then(setRoles);
  };

  const handleApproval = async (id: string, status: "APPROVED" | "REJECTED") => {
    if (!hasPermission("campaign:send")) return;
    await api.updateApprovalStatus(id, status);
    sendActivity(
      "collaboration-hub",
      `${status === "APPROVED" ? "approved" : "rejected"} a request`
    );
    api.getApprovals().then(setApprovals);
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission("team:manage")) return;
    await api.addRole(newRole);
    sendActivity("collaboration-hub", `created a new role: ${newRole.name}`);
    api.getRoles().then(setRoles);
    setIsAddingRole(false);
    setNewRole({ name: "", permissions: [] });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission("team:manage")) return;
    await api.inviteTeamMember(inviteData);
    sendActivity("collaboration-hub", `invited ${inviteData.name} to the team`);
    refreshData();
    setIsInviting(false);
    setInviteData({ email: "", name: "", role: "VIEWER" });
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    if (!hasPermission("team:manage")) return;
    await api.updateTeamMember(userId, { role });
    sendActivity("collaboration-hub", `updated a team member's role to ${role}`);
    refreshData();
  };

  const handleDeleteMember = async (userId: string) => {
    if (!hasPermission("team:manage")) return;
    if (window.confirm("Are you sure you want to remove this team member?")) {
      const res = await api.deleteTeamMember(userId);
      if (res.success) {
        sendActivity("collaboration-hub", `removed a member from the team`);
        refreshData();
      } else {
        alert("Failed to delete member. Ensure they are not the last owner.");
      }
    }
  };

  const permissionOptions = [
    { key: "campaign:edit", label: "Edit Campaigns" },
    { key: "campaign:send", label: "Send Campaigns" },
    { key: "template:edit", label: "Edit Templates" },
    { key: "contact:edit", label: "Manage Contacts" },
    { key: "automation:edit", label: "Manage Automations" },
    { key: "report:view", label: "View Reports" },
  ];

  const pendingApprovals = approvals.filter((a) => a.status === "PENDING");

  return (
    <div className="space-y-16 relative" onMouseMove={handleMouseMove}>
      {/* Real-time Cursors */}
      <AnimatePresence>
        {Object.entries(cursors).map(([socketId, data]: [string, any]) => (
          <motion.div
            key={socketId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed pointer-events-none z-[100] flex flex-col items-center"
            style={{ left: data.position.x, top: data.position.y }}
          >
            <MousePointerClick size={16} className="text-burgundy fill-burgundy" />
            <span className="bg-burgundy text-white text-[8px] font-black px-1 rounded whitespace-nowrap">
              {data.user?.name || "Collaborator"}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      <SectionHeader
        title={t("collaboration.title")}
        subtitle={t("collaboration.subtitle")}
        guideKey="collaboration-team"
        action={
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {activeUsers.map((u: any, i: number) => (
                <div
                  key={u.id || i}
                  className="w-8 h-8 rounded-full bg-burgundy border-2 border-surface flex items-center justify-center text-white text-[10px] font-bold uppercase"
                  title={u.name}
                >
                  {u.name?.[0] || "?"}
                </div>
              ))}
            </div>
            <span className="text-[10px] font-mono text-ink/40 uppercase ml-2">
              {activeUsers.length} {t("collaboration.activeNow")}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-7 space-y-12">
          {/* Activity Log */}
          <div className="bg-surface border border-border-hairline p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-ink">
                {t("collaboration.liveFeed")}
              </h3>
              <Activity size={14} className="text-burgundy animate-pulse" />
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {activityLog.length === 0 ? (
                <p className="text-xs font-editorial italic text-ink/40">
                  {t("collaboration.noActivity")}
                </p>
              ) : (
                activityLog.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-[11px]">
                    <span className="text-burgundy font-bold">
                      [{format(new Date(log.timestamp), "HH:mm:ss")}]
                    </span>
                    <span className="font-black uppercase">{log.user?.name}</span>
                    <span className="text-ink/60">{log.activity}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Team Management */}
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-serif font-bold text-ink">
                {t("collaboration.teamManagement")}
              </h3>
              <button
                onClick={() => setIsInviting(true)}
                className="btn-primary py-2 px-4 text-[10px]"
              >
                {t("collaboration.inviteMember")}
              </button>
            </div>
            <div className="border border-border-hairline divide-y divide-border-hairline">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="p-6 flex items-center justify-between hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-burgundy/10 text-burgundy flex items-center justify-center rounded-full font-serif font-bold">
                      {member.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black uppercase tracking-widest text-ink">
                          {member.name}
                        </p>
                        {member.status === "PENDING" && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded">
                            {t("status.pending")}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-ink/40 uppercase">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {member.status === "PENDING" && (
                      <button
                        onClick={async () => {
                          const temporaryPassword = window.prompt(
                            "Enter a temporary password (minimum 14 characters). Share it through a separate secure channel."
                          );
                          if (!temporaryPassword) return;
                          await api.activateUser(member.id, temporaryPassword);
                          refreshData();
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-burgundy border border-burgundy px-2 py-1 hover:bg-burgundy hover:text-white transition-all"
                      >
                        {t("collaboration.activate")}
                      </button>
                    )}
                    <select
                      aria-label="Member role"
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      className="bg-surface border border-border-hairline text-[9px] font-mono text-ink/60 uppercase rounded px-2 py-1 outline-none focus:border-burgundy"
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="EDITOR">EDITOR</option>
                      <option value="ANALYST">ANALYST</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                    <button
                      type="button"
                      aria-label="Delete member"
                      onClick={() => handleDeleteMember(member.id)}
                      className="text-ink/40 hover:text-burgundy transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Roles */}
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-ink pb-2">
              <h3 className="text-2xl font-serif font-bold text-ink">
                {t("collaboration.customRoles")}
              </h3>
              <button
                onClick={() => setIsAddingRole(true)}
                className="text-[10px] font-black uppercase text-burgundy hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> {t("collaboration.createRole")}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="bg-surface border border-border-hairline p-6 space-y-4 group hover:border-burgundy transition-all"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-serif text-lg font-bold">{role.name}</h4>
                    <Settings
                      size={14}
                      className="text-ink/20 group-hover:text-burgundy transition-colors"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {JSON.parse(role.permissions).map((p: string) => (
                      <span
                        key={p}
                        className="px-1.5 py-0.5 bg-bg border border-border-hairline text-[8px] font-black uppercase tracking-widest text-ink/60"
                      >
                        {p.replace(":", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {roles.length === 0 && (
                <div className="col-span-2 p-12 bg-surface border border-dashed border-border-hairline text-center">
                  <p className="text-xs font-editorial italic text-ink/40">
                    {t("collaboration.noCustomRoles")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-12">
          {/* Brand Kits */}
          <div className="space-y-8">
            <h3 className="text-2xl font-serif font-bold text-ink">
              {t("collaboration.brandKits")}
            </h3>
            <div className="space-y-6">
              <div className="bg-surface border border-border-hairline p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-ink flex items-center justify-center text-white font-serif font-black text-xl">
                    S
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-ink">
                      SIGNAL Main
                    </p>
                    <p className="text-[10px] font-mono text-ink/40 uppercase">Primary Workspace</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-burgundy rounded border border-border-hairline"></div>
                  <div className="w-8 h-8 bg-ink rounded border border-border-hairline"></div>
                  <div className="w-8 h-8 bg-bg rounded border border-border-hairline"></div>
                </div>
                <button className="w-full py-3 border border-border-hairline text-[10px] font-black uppercase tracking-widest text-ink/60 hover:bg-bg transition-colors">
                  {t("collaboration.editBrandKit")}
                </button>
              </div>
              <button className="w-full py-4 border-2 border-dashed border-border-hairline text-[10px] font-black uppercase tracking-widest text-ink/40 hover:border-burgundy hover:text-burgundy transition-all flex items-center justify-center gap-2">
                <Plus size={14} /> {t("collaboration.addBrand")}
              </button>
            </div>
          </div>

          {/* Governance */}
          <div className="space-y-8">
            <h3 className="text-2xl font-serif font-bold text-ink">
              {t("collaboration.governance")}
            </h3>
            <div className="bg-surface border border-border-hairline p-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                  {t("collaboration.pendingReview")}
                </p>
                <span className="text-[10px] font-mono text-burgundy font-bold">
                  {pendingApprovals.length} {t("status.pending").toUpperCase()}
                </span>
              </div>
              <div className="space-y-3">
                {pendingApprovals.length === 0 ? (
                  <p className="text-xs font-editorial italic text-ink/40 py-4 text-center">
                    {t("collaboration.noApprovals")}
                  </p>
                ) : (
                  pendingApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="p-4 bg-bg border border-border-hairline space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-burgundy">
                            {approval.templateId ? "Template" : "Campaign"}
                          </p>
                          <p className="text-sm font-bold text-ink uppercase">
                            {approval.template?.name || approval.campaign?.name}
                          </p>
                          <p className="text-[9px] font-mono text-ink/40 uppercase mt-1">
                            Requested by {approval.requesterId} •{" "}
                            {format(new Date(approval.createdAt), "MMM d, HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-border-hairline">
                        <button
                          onClick={() => handleApproval(approval.id, "APPROVED")}
                          className="flex-1 py-1.5 bg-ink text-bg text-[9px] font-black uppercase tracking-widest hover:bg-ink/80 transition-colors"
                        >
                          {t("collaboration.approve")}
                        </button>
                        <button
                          onClick={() => handleApproval(approval.id, "REJECTED")}
                          className="flex-1 py-1.5 border border-border-hairline text-[9px] font-black uppercase tracking-widest hover:bg-bg transition-colors"
                        >
                          {t("collaboration.reject")}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Role Modal */}
      <Modal
        isOpen={isAddingRole}
        onClose={() => setIsAddingRole(false)}
        title="Define Custom Role"
        width="max-w-md"
      >
        <form onSubmit={handleAddRole} className="space-y-6">
          <div className="space-y-1">
            <label className="metric-label">Role Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Content Editor"
              className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
              Permissions
            </p>
            <div className="grid grid-cols-2 gap-3">
              {permissionOptions.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="accent-burgundy"
                    checked={newRole.permissions.includes(opt.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewRole({ ...newRole, permissions: [...newRole.permissions, opt.key] });
                      } else {
                        setNewRole({
                          ...newRole,
                          permissions: newRole.permissions.filter((k) => k !== opt.key),
                        });
                      }
                    }}
                  />
                  <span className="text-xs font-medium group-hover:text-burgundy transition-colors">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="submit" className="btn-primary flex-1 py-3">
              Create Role
            </button>
            <button
              type="button"
              onClick={() => setIsAddingRole(false)}
              className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviting}
        onClose={() => setIsInviting(false)}
        title="Invite Team Member"
        width="max-w-md"
      >
        <form onSubmit={handleInvite} className="space-y-6">
          <div className="space-y-1">
            <label className="metric-label">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Jane Doe"
              className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
              value={inviteData.name}
              onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="metric-label">Email Address</label>
            <input
              type="email"
              required
              placeholder="jane@example.com"
              className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="metric-label">Initial Role</label>
            <select
              className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
              value={inviteData.role}
              onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
            >
              <option value="OWNER">OWNER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="EDITOR">EDITOR</option>
              <option value="ANALYST">ANALYST</option>
              <option value="VIEWER">VIEWER</option>
            </select>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="submit" className="btn-primary flex-1 py-3">
              Send Invitation
            </button>
            <button
              type="button"
              onClick={() => setIsInviting(false)}
              className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
