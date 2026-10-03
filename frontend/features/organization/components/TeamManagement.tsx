"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/shared/components/ui/Icon";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getUserOrganization,
  getOrganizationMembers,
  getInvitations,
  getMyInvitations,
  createInvitation,
  cancelInvitation,
  updateMemberRole,
  removeMember,
  acceptInvitation,
  createOrganization,
} from "../lib/organizationApi";
import type { ProfileRow } from "@/features/auth/types/database";
import type {
  OrganizationRow,
  InvitationRow,
  UserRole,
} from "../types/organization";
import styles from "./TeamManagement.module.css";

interface TeamManagementProps {
  userId: string;
  userRole: UserRole;
}

const reloadPage = () => window.location.reload();

export default function TeamManagement({
  userId,
  userRole,
}: TeamManagementProps) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<OrganizationRow | null>(
    null,
  );
  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [myInvitations, setMyInvitations] = useState<
    Awaited<ReturnType<typeof getMyInvitations>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("designer");
  const [inviting, setInviting] = useState(false);

  // Create organization form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  const canManageTeam = userRole === "owner" || userRole === "admin";

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Incoming invitations are shown with or without an organization
      const [myInvitationsData, org] = await Promise.all([
        user?.email ? getMyInvitations(user.email) : [],
        getUserOrganization(userId),
      ]);
      setMyInvitations(myInvitationsData);

      if (org) {
        setOrganization(org);
        const [membersData, invitationsData] = await Promise.all([
          getOrganizationMembers(org.id),
          getInvitations(org.id),
        ]);
        setMembers(membersData);
        setInvitations(invitationsData);
      }
    } catch (err: any) {
      console.error("Error loading team data:", err);
      setError(`Failed to load team data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run a membership/invitation change, report the outcome, then refresh
  const mutate = async (
    action: () => Promise<unknown>,
    done: string,
    failed: string,
    then: () => unknown = loadData,
  ) => {
    try {
      await action();
      toast.success(done);
      await then();
    } catch {
      setError(failed);
      toast.error(failed);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setInviting(true);
    setError(null);
    await mutate(
      () => createInvitation(organization.id, inviteEmail, inviteRole, userId),
      "Invitation sent! The user will see it when they open their profile.",
      "Failed to send invitation",
      () => {
        setInviteEmail("");
        setInviteRole("designer");
        setShowInviteForm(false);
        return loadData();
      },
    );
    setInviting(false);
  };

  const handleCancelInvitation = (invitationId: string) =>
    confirm("Cancel this invitation?") &&
    mutate(
      () => cancelInvitation(invitationId),
      "Invitation cancelled",
      "Failed to cancel invitation",
    );

  const handleRoleChange = (memberId: string, newRole: UserRole) =>
    mutate(
      () => updateMemberRole(memberId, newRole),
      "Role updated successfully",
      "Failed to update role",
    );

  const handleRemoveMember = (memberId: string) =>
    confirm("Remove this member from the organization?") &&
    mutate(
      () => removeMember(memberId),
      "Member removed from organization",
      "Failed to remove member",
    );

  // Membership changes reload the page to update the organization context
  const handleAcceptInvitation = (token: string) =>
    mutate(
      () => acceptInvitation(token),
      "Invitation accepted! You have joined the organization.",
      "Failed to accept invitation",
      reloadPage,
    );

  const handleDeclineInvitation = (invitationId: string) =>
    confirm("Decline this invitation?") &&
    mutate(
      () => cancelInvitation(invitationId),
      "Invitation declined",
      "Failed to decline invitation",
    );

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      await createOrganization(orgName);
      toast.success("Organization created successfully!");
      setOrgName("");
      setShowCreateForm(false);
      reloadPage();
    } catch (err: any) {
      console.error("Error creating organization:", err);
      setError(`Failed to create organization: ${err.message}`);
      toast.error(`Failed to create organization: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleLeaveOrganization = () =>
    confirm(
      "Are you sure you want to leave this organization? You will need to be re-invited to join again.",
    ) &&
    mutate(
      () => removeMember(userId),
      "You have left the organization",
      "Failed to leave organization",
      reloadPage,
    );

  const errorBanner = error && (
    <div className={styles.error}>
      <Icon name="warning" />
      <span>{error}</span>
    </div>
  );

  // Incoming invitations - shown with or without an organization
  const incomingInvitations = myInvitations.length > 0 && (
    <div className={styles.incomingSection}>
      <h3>Incoming Invitations</h3>
      <p className={styles.incomingSectionSubtitle}>
        You have been invited to join{" "}
        {myInvitations.length === 1 ? "an organization" : "organizations"}
      </p>
      <div className={styles.list}>
        {myInvitations.map((invitation) => (
          <div key={invitation.id} className={styles.incomingInvitationCard}>
            <div className={styles.invitationInfo}>
              <Icon name="building" />
              <div>
                <div className={styles.invitationOrgName}>
                  {invitation.organizations?.name || "Organization"}
                </div>
                <div className={styles.invitationDetails}>
                  As {invitation.role} · Expires{" "}
                  {new Date(invitation.expires_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className={styles.incomingActions}>
              <button
                onClick={() => handleAcceptInvitation(invitation.token)}
                className={styles.acceptButton}
              >
                <Icon name="check-circle" />
                Accept
              </button>
              <button
                onClick={() => handleDeclineInvitation(invitation.id)}
                className={styles.declineButton}
              >
                <Icon name="times" />
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading team...</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className={styles.container}>
        {errorBanner}
        {incomingInvitations}

        {/* No Organization - Create one */}
        <div className={styles.empty}>
          <Icon name="building" />
          <h3>No Organization</h3>
          <p>Create an organization to start collaborating with your team.</p>

          {!showCreateForm ? (
            <button
              className={styles.createOrgButton}
              onClick={() => setShowCreateForm(true)}
            >
              <Icon name="plus" />
              Create Organization
            </button>
          ) : (
            <form
              onSubmit={handleCreateOrganization}
              className={styles.createOrgForm}
            >
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organization name"
                required
                disabled={creating}
                autoFocus
              />
              <div className={styles.formActions}>
                <button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setOrgName("");
                  }}
                  disabled={creating}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {errorBanner}
      {incomingInvitations}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3>Team Members</h3>
          <p>
            {members.length} of {organization.max_users} members
          </p>
        </div>
        <div className={styles.headerActions}>
          {canManageTeam && (
            <button
              className={styles.inviteButton}
              onClick={() => setShowInviteForm(!showInviteForm)}
            >
              <Icon name="user-plus" />
              Invite Member
            </button>
          )}
          {userRole !== "owner" && (
            <button
              className={styles.leaveButton}
              onClick={handleLeaveOrganization}
              title="Leave organization"
            >
              <Icon name="sign-out-alt" />
              Leave Organization
            </button>
          )}
        </div>
      </div>

      {/* Invite Form */}
      {showInviteForm && canManageTeam && (
        <form onSubmit={handleInvite} className={styles.inviteForm}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            required
            disabled={inviting}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            disabled={inviting}
          >
            <option value="viewer">Viewer</option>
            <option value="designer">Designer</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={inviting}>
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </form>
      )}

      {/* Members List */}
      <div className={styles.section}>
        <h4>Active Members</h4>
        <div className={styles.list}>
          {members.map((member) => (
            <div key={member.id} className={styles.memberCard}>
              <div className={styles.memberInfo}>
                <Icon name="user-circle" />
                <div>
                  <div className={styles.memberName}>
                    {member.display_name || member.email}
                  </div>
                  <div className={styles.memberEmail}>{member.email}</div>
                </div>
              </div>
              <div className={styles.memberActions}>
                {canManageTeam && member.id !== userId ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value as UserRole)
                      }
                      className={styles.roleSelect}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="designer">Designer</option>
                      <option value="admin">Admin</option>
                      {member.role === "owner" && (
                        <option value="owner">Owner</option>
                      )}
                    </select>
                    {member.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className={styles.removeButton}
                        title="Remove member"
                      >
                        <Icon name="times" />
                      </button>
                    )}
                  </>
                ) : (
                  <span className={styles.roleBadge}>{member.role}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className={styles.section}>
          <h4>Pending Invitations</h4>
          <div className={styles.list}>
            {invitations.map((invitation) => (
              <div key={invitation.id} className={styles.invitationCard}>
                <div className={styles.invitationInfo}>
                  <Icon name="envelope" />
                  <div>
                    <div className={styles.invitationEmail}>
                      {invitation.email}
                    </div>
                    <div className={styles.invitationStatus}>
                      {invitation.status} · expires{" "}
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className={styles.invitationActions}>
                  <span className={styles.roleBadge}>{invitation.role}</span>
                  {canManageTeam && invitation.status === "pending" && (
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className={styles.cancelButton}
                      title="Cancel invitation"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
