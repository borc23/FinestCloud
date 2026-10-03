"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@/shared/components/ui/Icon";
import {
  getUserOrganization,
  updateOrganization,
} from "../lib/organizationApi";
import {
  uploadOrganizationLogo,
  deleteOrganizationLogo,
} from "../lib/logoUpload";
import type { OrganizationRow } from "../types/organization";
import styles from "./OrganizationSettings.module.css";

interface OrganizationSettingsProps {
  userId: string;
}

const EMPTY_FORM = {
  name: "",
  company_email: "",
  company_phone: "",
  company_website: "",
  company_address: "",
  primary_color: "#3B82F6",
  secondary_color: "#1E40AF",
};

export default function OrganizationSettings({
  userId,
}: OrganizationSettingsProps) {
  const [organization, setOrganization] = useState<OrganizationRow | null>(
    null,
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyOrganization = (org: OrganizationRow) => {
    setOrganization(org);
    setForm({
      name: org.name,
      company_email: org.company_email || "",
      company_phone: org.company_phone || "",
      company_website: org.company_website || "",
      company_address: org.company_address || "",
      primary_color: org.primary_color,
      secondary_color: org.secondary_color,
    });
  };

  // Props for a text input bound to a form field
  const field = (key: keyof typeof EMPTY_FORM) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
    disabled: saving,
  });

  const flashSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    getUserOrganization(userId)
      .then((org) => org && applyOrganization(org))
      .catch(() => setError("Failed to load organization"))
      .finally(() => setLoading(false));
  }, [userId]);

  // Persist a new logo URL (or null) to the organization
  const saveLogo = async (logoUrl: string | null) => {
    if (!organization) return;
    setOrganization(
      await updateOrganization(organization.id, { logo_url: logoUrl }),
    );
    flashSuccess();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    setUploadingLogo(true);
    setError(null);

    try {
      // Uploads replace the previous logo in place
      await saveLogo(await uploadOrganizationLogo(file, organization.id));
    } catch (err: any) {
      setError(err.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!organization?.logo_url) return;

    setUploadingLogo(true);
    setError(null);

    try {
      await deleteOrganizationLogo(organization.logo_url, organization.id);
      await saveLogo(null);
    } catch (err: any) {
      setError(err.message || "Failed to remove logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      applyOrganization(
        await updateOrganization(organization.id, {
          name: form.name.trim(),
          company_email: form.company_email.trim() || null,
          company_phone: form.company_phone.trim() || null,
          company_website: form.company_website.trim() || null,
          company_address: form.company_address.trim() || null,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
        }),
      );
      flashSuccess();
    } catch {
      setError("Failed to save organization settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading organization...</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className={styles.empty}>
        <Icon name="building" />
        <h3>No Organization</h3>
        <p>You are not part of any organization yet.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className={styles.form}>
      {error && (
        <div className={styles.error}>
          <Icon name="warning" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className={styles.success}>
          <Icon name="check-circle" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <div className={styles.section}>
        <h3>Organization Details</h3>

        <div className={styles.field}>
          <label htmlFor="orgName">Organization Name *</label>
          <input id="orgName" type="text" {...field("name")} required />
        </div>

        <div className={styles.field}>
          <label htmlFor="subdomain">Subdomain</label>
          <input
            id="subdomain"
            type="text"
            value={organization.subdomain}
            disabled
            className={styles.disabled}
          />
          <small>Contact support to change subdomain</small>
        </div>

        <div className={styles.field}>
          <label htmlFor="tier">Tier</label>
          <input
            id="tier"
            type="text"
            value={organization.tier}
            disabled
            className={styles.disabled}
          />
          <small>Contact support to upgrade/downgrade</small>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Contact Information</h3>

        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" {...field("company_email")} />
        </div>

        <div className={styles.field}>
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" {...field("company_phone")} />
        </div>

        <div className={styles.field}>
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="url"
            {...field("company_website")}
            placeholder="https://example.com"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="address">Address</label>
          <input id="address" type="text" {...field("company_address")} />
        </div>
      </div>

      <div className={styles.section}>
        <h3>Branding</h3>

        <div className={styles.field}>
          <label>Company Logo</label>
          {organization.logo_url && (
            <div className={styles.logoPreview}>
              <img src={organization.logo_url} alt="Company logo" />
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={uploadingLogo}
                className={styles.removeLogoButton}
              >
                <Icon name="trash" />
                Remove
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoUpload}
            disabled={uploadingLogo}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingLogo}
            className={styles.uploadButton}
          >
            <Icon
              name={uploadingLogo ? "spinner" : "upload"}
              spin={uploadingLogo}
            />
            {uploadingLogo
              ? "Uploading..."
              : organization.logo_url
                ? "Change Logo"
                : "Upload Logo"}
          </button>
          <small>PNG, JPEG, or WebP. Max 5MB.</small>
        </div>

        <div className={styles.colorRow}>
          <div className={styles.field}>
            <label htmlFor="primaryColor">Primary Color</label>
            <div className={styles.colorInput}>
              <input
                id="primaryColor"
                type="color"
                {...field("primary_color")}
              />
              <input
                type="text"
                {...field("primary_color")}
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="secondaryColor">Secondary Color</label>
            <div className={styles.colorInput}>
              <input
                id="secondaryColor"
                type="color"
                {...field("secondary_color")}
              />
              <input
                type="text"
                {...field("secondary_color")}
                placeholder="#1E40AF"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.saveButton} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
