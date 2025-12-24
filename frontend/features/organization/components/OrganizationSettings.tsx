'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/shared/components/ui/Icon'
import { getUserOrganization, updateOrganization } from '../lib/organizationApi'
import type { Organization } from '../types/organization'
import styles from './OrganizationSettings.module.css'

interface OrganizationSettingsProps {
  userId: string
}

export default function OrganizationSettings({ userId }: OrganizationSettingsProps) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#3B82F6')
  const [secondaryColor, setSecondaryColor] = useState('#1E40AF')

  useEffect(() => {
    loadOrganization()
  }, [userId])

  const loadOrganization = async () => {
    setLoading(true)
    setError(null)

    try {
      const org = await getUserOrganization(userId)
      if (org) {
        setOrganization(org)
        setName(org.name)
        setCompanyEmail(org.company_email || '')
        setCompanyPhone(org.company_phone || '')
        setCompanyWebsite(org.company_website || '')
        setCompanyAddress(org.company_address || '')
        setPrimaryColor(org.primary_color)
        setSecondaryColor(org.secondary_color)
      }
    } catch (err: any) {
      setError('Failed to load organization')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await updateOrganization(organization.id, {
        name: name.trim(),
        company_email: companyEmail.trim() || null,
        company_phone: companyPhone.trim() || null,
        company_website: companyWebsite.trim() || null,
        company_address: companyAddress.trim() || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      await loadOrganization()
    } catch (err: any) {
      setError('Failed to save organization settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading organization...</p>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className={styles.empty}>
        <Icon name="building" />
        <h3>No Organization</h3>
        <p>You are not part of any organization yet.</p>
      </div>
    )
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
          <input
            id="orgName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={saving}
          />
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
          <input
            id="email"
            type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={companyPhone}
            onChange={(e) => setCompanyPhone(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="url"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
            placeholder="https://example.com"
            disabled={saving}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="address">Address</label>
          <input
            id="address"
            type="text"
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <div className={styles.section}>
        <h3>Branding</h3>

        <div className={styles.colorRow}>
          <div className={styles.field}>
            <label htmlFor="primaryColor">Primary Color</label>
            <div className={styles.colorInput}>
              <input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                disabled={saving}
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                disabled={saving}
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
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                disabled={saving}
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                disabled={saving}
                placeholder="#1E40AF"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.saveButton}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
