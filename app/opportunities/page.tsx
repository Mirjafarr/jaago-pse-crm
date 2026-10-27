
'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

type Contact = {
  id: string
  contact_name: string
  contact_type: string | null
  organization: string | null
}

type Stage = {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  is_won: boolean
  is_lost: boolean
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
}

type Opportunity = {
  id: string
  deal_name: string
  contact_id: string | null
  owner_id: string | null
  contribution_type: string
  contribution_category: string
  target_vertical: string | null
  stage_id: string | null
  expected_amount: number
  currency: string
  payment_interval: string | null
  expected_closing: string | null
  operational_budget: number | null
  description: string | null
  notes: string | null
  drive_url: string | null
  created_at: string
}

const contributionCategories = [
  'DSP',
  'SAC',
  'Disaster Campaign',
  'Project',
  'Event & Campaign',
  'General',
]

const emptyForm = {
  deal_name: '',
  contact_id: '',
  owner_id: '',
  contribution_type: 'cash',
  contribution_category: 'DSP',
  target_vertical: '',
  stage_id: '',
  expected_amount: '',
  currency: 'BDT',
  payment_interval: '',
  expected_closing: '',
  operational_budget: '',
  description: '',
  notes: '',
  drive_url: '',
}

type FormField = keyof typeof emptyForm

export default function OpportunitiesPage() {
  const [supabase] = useState(() => createClient())

  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')

  const [showNewContact, setShowNewContact] = useState(false)
  const [newContact, setNewContact] = useState({
    contact_type: 'individual',
    contact_name: '',
    email: '',
    phone: '',
  })

  const [creatingContact, setCreatingContact] = useState(false)

  // Load opportunities and their related records
  const loadData = useCallback(async () => {
    setLoading(true)

    const [
      dealsResult,
      contactsResult,
      stagesResult,
      profilesResult,
    ] = await Promise.all([
      supabase
        .from('opportunities')
        .select(
          'id, deal_name, contact_id, owner_id, contribution_type, contribution_category, target_vertical, stage_id, expected_amount, currency, payment_interval, expected_closing, operational_budget, description, notes, drive_url, created_at'
        )
        .order('created_at', { ascending: false }),

      supabase
        .from('contacts')
        .select('id, contact_name, contact_type, organization')
        .order('contact_name'),

      supabase
        .from('pipeline_stages')
        .select('id, name, sort_order, is_active, is_won, is_lost')
        .order('sort_order'),

      supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('department', 'PSE')
        .eq('is_active', true)
        .order('full_name'),
    ])

    const failures = [
      dealsResult.error &&
        `Opportunities: ${dealsResult.error.message}`,
      contactsResult.error &&
        `Contacts: ${contactsResult.error.message}`,
      stagesResult.error &&
        `Stages: ${stagesResult.error.message}`,
      profilesResult.error &&
        `Team members: ${profilesResult.error.message}`,
    ].filter(Boolean)

    setError(failures.join(' | '))

    if (!dealsResult.error) {
      setOpportunities((dealsResult.data ?? []) as Opportunity[])
    }

    if (!contactsResult.error) {
      setContacts((contactsResult.data ?? []) as Contact[])
    }

    if (!stagesResult.error) {
      setStages((stagesResult.data ?? []) as Stage[])
    }

    if (!profilesResult.error) {
      setProfiles((profilesResult.data ?? []) as Profile[])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function updateField(field: FormField, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  // Open form for adding a new opportunity
  function startAdd() {
    setEditingId(null)

    setForm({
      ...emptyForm,
      stage_id:
        stages.find((stage) => stage.is_active)?.id ?? '',
    })

    setShowNewContact(false)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  // Open form with an existing opportunity
  function startEdit(deal: Opportunity) {
    setEditingId(deal.id)

    setForm({
      deal_name: deal.deal_name,
      contact_id: deal.contact_id ?? '',
      owner_id: deal.owner_id ?? '',
      contribution_type: deal.contribution_type,
      contribution_category: deal.contribution_category,
      target_vertical: deal.target_vertical ?? '',
      stage_id: deal.stage_id ?? '',
      expected_amount: String(deal.expected_amount),
      currency: deal.currency.trim(),
      payment_interval: deal.payment_interval ?? '',
      expected_closing: deal.expected_closing ?? '',
      operational_budget:
        deal.operational_budget === null
          ? ''
          : String(deal.operational_budget),
      description: deal.description ?? '',
      notes: deal.notes ?? '',
      drive_url: deal.drive_url ?? '',
    })

    setShowNewContact(false)
    setShowForm(true)
    setError('')
    setMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setShowNewContact(false)
    setError('')
  }

  // Create a contact directly from the deal form
  async function handleCreateContact() {
    setError('')

    if (
      !newContact.contact_name.trim() ||
      (!newContact.email.trim() && !newContact.phone.trim())
    ) {
      setError(
        'A new contact needs a name and at least an email or phone number.'
      )
      return
    }

    setCreatingContact(true)

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser()

      if (authError || !auth.user) {
        throw new Error('Please sign in again.')
      }

      const { data, error: insertError } = await supabase
        .from('contacts')
        .insert({
          contact_type: newContact.contact_type,
          contact_name: newContact.contact_name.trim(),
          email: newContact.email.trim() || null,
          phone: newContact.phone.trim() || null,
          created_by: auth.user.id,
          updated_by: auth.user.id,
        })
        .select('id, contact_name, contact_type, organization')
        .single()

      if (insertError) {
        throw insertError
      }

      const created = data as Contact

      setContacts((previous) =>
        [...previous, created].sort((a, b) =>
          a.contact_name.localeCompare(b.contact_name)
        )
      )

      updateField('contact_id', created.id)
      setShowNewContact(false)

      setNewContact({
        contact_type: 'individual',
        contact_name: '',
        email: '',
        phone: '',
      })

      setMessage(
        'Contact created and selected. Save the opportunity to finish.'
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create contact.'
      )
    } finally {
      setCreatingContact(false)
    }
  }

  // Add or update opportunity
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setMessage('')

    const amount = Number(form.expected_amount)

    const budget =
      form.operational_budget.trim() === ''
        ? null
        : Number(form.operational_budget)

    if (
      !form.deal_name.trim() ||
      !form.contact_id ||
      !form.stage_id ||
      !form.contribution_category
    ) {
      setError(
        'Deal name, contact, stage, and contribution category are required.'
      )
      return
    }

    if (
      form.expected_amount.trim() === '' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        'Enter an expected financial value greater than zero.'
      )
      return
    }

    if (
      budget !== null &&
      (!Number.isFinite(budget) || budget < 0)
    ) {
      setError(
        'Operational budget must be zero or greater.'
      )
      return
    }

    if (form.drive_url.trim()) {
      try {
        const url = new URL(form.drive_url.trim())

        if (
          url.protocol !== 'https:' &&
          url.protocol !== 'http:'
        ) {
          throw new Error()
        }
      } catch {
        setError('Enter a valid http(s) document URL.')
        return
      }
    }

    setSaving(true)

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser()

      if (authError || !auth.user) {
        throw new Error(
          'Your session could not be verified. Please sign in again.'
        )
      }

      const payload = {
        deal_name: form.deal_name.trim(),
        contact_id: form.contact_id,
        owner_id: form.owner_id || auth.user.id,
        contribution_type: form.contribution_type,
        contribution_category: form.contribution_category,
        target_vertical:
          form.target_vertical.trim() || null,
        stage_id: form.stage_id,
        expected_amount: amount,
        currency: form.currency.trim().toUpperCase(),
        payment_interval:
          form.payment_interval.trim() || null,
        expected_closing: form.expected_closing || null,
        operational_budget: budget,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        drive_url: form.drive_url.trim() || null,
        updated_by: auth.user.id,
      }

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from('opportunities')
          .update(payload)
          .eq('id', editingId)
          .select('id')
          .maybeSingle()

        if (updateError) {
          throw updateError
        }

        if (!data) {
          throw new Error(
            'Opportunity was not updated. Check permissions or whether it still exists.'
          )
        }

        setMessage('Opportunity updated successfully.')
      } else {
        const { error: insertError } = await supabase
          .from('opportunities')
          .insert({
            ...payload,
            created_by: auth.user.id,
          })

        if (insertError) {
          throw insertError
        }

        setMessage('Opportunity added successfully.')
      }

      setEditingId(null)
      setShowForm(false)

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unexpected error while saving.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Names for displaying related records
  const contactNames = new Map(
    contacts.map((contact) => [
      contact.id,
      contact.contact_name,
    ])
  )

  const ownerNames = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.full_name || profile.email || profile.id,
    ])
  )

  const stageNames = new Map(
    stages.map((stage) => [
      stage.id,
      stage.name,
    ])
  )

  // Search and stage filtering
  const filtered = opportunities.filter((deal) => {
    const term = search.trim().toLowerCase()

    return (
      (!stageFilter || deal.stage_id === stageFilter) &&
      [
        deal.deal_name,
        contactNames.get(deal.contact_id ?? ''),
        ownerNames.get(deal.owner_id ?? ''),
        deal.contribution_category,
        deal.contribution_type,
        deal.target_vertical,
      ].some((value) =>
        value?.toLowerCase().includes(term)
      )
    )
  })

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900'

  return (
  <div className="jaago-module space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Opportunities
          </h1>

          <p className="mt-2 text-gray-600">
            Manage financial and valued in-kind fundraising opportunities.
          </p>
        </div>

        <button
          type="button"
          onClick={startAdd}
          className="rounded-lg bg-green-700 px-4 py-2.5 font-medium text-white hover:bg-green-800"
        >
          + Add Opportunity
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-lg bg-green-50 p-4 text-green-800"
        >
          {message}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            {editingId ? 'Edit Opportunity' : 'Add Opportunity'}
          </h2>

          <p className="mb-5 text-sm text-gray-500">
            Use this form only for opportunities with a defined
            expected financial value.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Deal Name *
              </span>

              <input
                required
                className={inputClass}
                value={form.deal_name}
                onChange={(e) =>
                  updateField('deal_name', e.target.value)
                }
              />
            </label>

            <div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Contact *
                </span>

                <select
                  required
                  className={inputClass}
                  value={form.contact_id}
                  onChange={(e) =>
                    updateField('contact_id', e.target.value)
                  }
                >
                  <option value="">Select contact</option>

                  {contacts.map((contact) => (
                    <option
                      key={contact.id}
                      value={contact.id}
                    >
                      {contact.contact_name}
                      {contact.organization
                        ? ` (${contact.organization})`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() =>
                  setShowNewContact(!showNewContact)
                }
                className="mt-2 text-sm font-medium text-green-800 hover:underline"
              >
                {showNewContact
                  ? 'Cancel new contact'
                  : '+ Create contact here'}
              </button>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Focal Person / Owner
              </span>

              <select
                className={inputClass}
                value={form.owner_id}
                onChange={(e) =>
                  updateField('owner_id', e.target.value)
                }
              >
                <option value="">
                  Current signed-in user
                </option>

                {profiles.map((profile) => (
                  <option
                    key={profile.id}
                    value={profile.id}
                  >
                    {profile.full_name ||
                      profile.email ||
                      profile.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Stage *
              </span>

              <select
                required
                className={inputClass}
                value={form.stage_id}
                onChange={(e) =>
                  updateField('stage_id', e.target.value)
                }
              >
                <option value="">
                  Select stage
                </option>

                {stages
                  .filter(
                    (stage) =>
                      stage.is_active ||
                      stage.id === form.stage_id
                  )
                  .map((stage) => (
                    <option
                      key={stage.id}
                      value={stage.id}
                    >
                      {stage.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Contribution Type *
              </span>

              <select
                className={inputClass}
                value={form.contribution_type}
                onChange={(e) =>
                  updateField('contribution_type', e.target.value)
                }
              >
                <option value="cash">
                  Cash
                </option>

                <option value="in_kind">
                  Valued In-Kind
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Contribution Category *
              </span>

              <select
                required
                className={inputClass}
                value={form.contribution_category}
                onChange={(e) =>
                  updateField('contribution_category', e.target.value)
                }
              >
                {[
                  ...new Set([
                    ...contributionCategories,
                    form.contribution_category,
                  ]),
                ].map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Target Vertical (optional)
              </span>

              <input
                className={inputClass}
                value={form.target_vertical}
                onChange={(e) =>
                  updateField('target_vertical', e.target.value)
                }
                placeholder="e.g., DSP, VBD, Project"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Expected Amount *
              </span>

              <input
                required
                type="number"
                min="0.01"
                step="any"
                className={inputClass}
                value={form.expected_amount}
                onChange={(e) =>
                  updateField('expected_amount', e.target.value)
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Currency *
              </span>

              <select
                className={inputClass}
                value={form.currency}
                onChange={(e) =>
                  updateField('currency', e.target.value)
                }
              >
                <option value="BDT">BDT</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Payment Interval (optional)
              </span>

              <input
                className={inputClass}
                value={form.payment_interval}
                onChange={(e) =>
                  updateField('payment_interval', e.target.value)
                }
                placeholder="Use a database-approved value"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Expected Closing
              </span>

              <input
                type="date"
                className={inputClass}
                value={form.expected_closing}
                onChange={(e) =>
                  updateField('expected_closing', e.target.value)
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Operational Budget (optional)
              </span>

              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={form.operational_budget}
                onChange={(e) =>
                  updateField('operational_budget', e.target.value)
                }
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium">
                Document / Google Drive URL
              </span>

              <input
                type="url"
                className={inputClass}
                value={form.drive_url}
                onChange={(e) =>
                  updateField('drive_url', e.target.value)
                }
                placeholder="https://drive.google.com/..."
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium">
                Description
              </span>

              <textarea
                rows={3}
                className={inputClass}
                value={form.description}
                onChange={(e) =>
                  updateField('description', e.target.value)
                }
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium">
                Notes
              </span>

              <textarea
                rows={3}
                className={inputClass}
                value={form.notes}
                onChange={(e) =>
                  updateField('notes', e.target.value)
                }
              />
            </label>
          </div>

          {showNewContact && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="mb-3 font-semibold">
                Create a contact without leaving this form
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-sm">
                    Contact Type
                  </span>

                  <select
                    className={inputClass}
                    value={newContact.contact_type}
                    onChange={(e) =>
                      setNewContact((prev) => ({
                        ...prev,
                        contact_type: e.target.value,
                      }))
                    }
                  >
                    <option value="individual">
                      Individual
                    </option>

                    <option value="company">
                      Company
                    </option>
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-sm">
                    Contact Name *
                  </span>

                  <input
                    className={inputClass}
                    value={newContact.contact_name}
                    onChange={(e) =>
                      setNewContact((prev) => ({
                        ...prev,
                        contact_name: e.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  <span className="mb-1 block text-sm">
                    Email
                  </span>

                  <input
                    type="email"
                    className={inputClass}
                    value={newContact.email}
                    onChange={(e) =>
                      setNewContact((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  <span className="mb-1 block text-sm">
                    Phone
                  </span>

                  <input
                    className={inputClass}
                    value={newContact.phone}
                    onChange={(e) =>
                      setNewContact((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <p className="mt-2 text-xs text-gray-600">
                Email or phone is required. Check for existing
                contacts before creating duplicates.
              </p>

              <button
                type="button"
                disabled={creatingContact}
                onClick={() => void handleCreateContact()}
                className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {creatingContact
                  ? 'Creating...'
                  : 'Create and select contact'}
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || creatingContact}
              className="rounded-lg bg-green-700 px-5 py-2.5 font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Save Changes'
                  : 'Save Opportunity'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={cancelForm}
              className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Opportunity Directory
          </h2>

          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              aria-label="Search opportunities"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search opportunities..."
              className="rounded-lg border border-gray-300 px-3 py-2"
            />

            <select
              aria-label="Filter by stage"
              value={stageFilter}
              onChange={(e) =>
                setStageFilter(e.target.value)
              }
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">All stages</option>

              {stages.map((stage) => (
                <option
                  key={stage.id}
                  value={stage.id}
                >
                  {stage.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading opportunities...
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            {opportunities.length === 0
              ? 'No opportunities yet.'
              : 'No opportunities match your filters.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  {[
                    'Deal',
                    'Contact',
                    'Focal Person',
                    'Type',
                    'Category',
                    'Stage',
                    'Expected Value',
                    'Expected Closing',
                    'Actions',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 font-semibold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filtered.map((deal) => (
                  <tr
                    key={deal.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {deal.deal_name}
                    </td>

                    <td className="px-4 py-3">
                      {contactNames.get(
                        deal.contact_id ?? ''
                      ) || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {ownerNames.get(
                        deal.owner_id ?? ''
                      ) || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {deal.contribution_type === 'in_kind'
                        ? 'Valued In-Kind'
                        : 'Cash'}
                    </td>

                    <td className="px-4 py-3">
                      {deal.contribution_category}
                    </td>

                    <td className="px-4 py-3">
                      {stageNames.get(
                        deal.stage_id ?? ''
                      ) || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {deal.currency.trim()}{' '}
                      {Number(
                        deal.expected_amount
                      ).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      {deal.expected_closing || '—'}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => startEdit(deal)}
                        className="rounded-md border border-green-700 px-3 py-1.5 font-medium text-green-800 hover:bg-green-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          Showing {filtered.length} of{' '}
          {opportunities.length} opportunities.
          Deletion is disabled because no DELETE policy
          is configured.
        </p>
      </section>
    </div>
  )
}
