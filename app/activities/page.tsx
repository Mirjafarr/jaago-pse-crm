
'use client'

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import { createClient } from '@/lib/supabase/client'

type Activity = {
  id: string
  title: string
  activity_type: string
  activity_group: string
  contact_id: string | null
  opportunity_id: string | null
  meeting_id: string | null
  owner_id: string | null
  created_by: string | null
  status: string
  scheduled_at: string | null
  completed_at: string | null
  description: string | null
  notes: string | null
  drive_url: string | null
  created_at: string
  updated_at: string
}

type Contact = {
  id: string
  contact_name: string
}

type Opportunity = {
  id: string
  deal_name: string
}

type Meeting = {
  id: string
  title: string
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
}

const activityTypes = [
  { value: 'task', label: 'Task' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'event', label: 'Event' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'proposal', label: 'Proposal Preparation / Submission' },
  { value: 'visit', label: 'School / Office Visit' },
  { value: 'stewardship', label: 'Donor Servicing / Stewardship' },
  {
    value: 'prospect_engagement',
    label: 'Potential Donor Engagement',
  },
  { value: 'general', label: 'General Activity' },
]

const activityGroups = [
  { value: 'stewardship', label: 'Stewardship' },
  {
    value: 'prospect_engagement',
    label: 'Potential Donor Engagement',
  },
  { value: 'independent', label: 'Independent / General Work' },
]

const activityStatuses = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

const emptyForm = {
  title: '',
  activity_type: 'task',
  activity_group: 'independent',
  contact_id: '',
  opportunity_id: '',
  meeting_id: '',
  owner_id: '',
  status: 'planned',
  scheduled_at: '',
  completed_at: '',
  description: '',
  notes: '',
  drive_url: '',
}

type FormField = keyof typeof emptyForm

function toLocalDateTime(value: string | null) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const pad = (number: number) =>
    String(number).padStart(2, '0')

  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T` +
    `${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}`
  )
}

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function getLabel(
  options: { value: string; label: string }[],
  value: string
) {
  return (
    options.find((option) => option.value === value)
      ?.label ?? value
  )
}

export default function ActivitiesPage() {
  const [supabase] = useState(() => createClient())

  const [activities, setActivities] = useState<Activity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] =
    useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] =
    useState<string | null>(null)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Load activities and related records.
  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const [
        activitiesResult,
        contactsResult,
        opportunitiesResult,
        meetingsResult,
        profilesResult,
      ] = await Promise.all([
        supabase
          .from('activities')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('contacts')
          .select('id, contact_name')
          .order('contact_name'),

        supabase
          .from('opportunities')
          .select('id, deal_name')
          .order('deal_name'),

        supabase
          .from('meetings')
          .select('id, title')
          .order('title'),

        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('department', 'PSE')
          .eq('is_active', true)
          .order('full_name'),
      ])

      const errors = [
        activitiesResult.error &&
          `Activities: ${activitiesResult.error.message}`,
        contactsResult.error &&
          `Contacts: ${contactsResult.error.message}`,
        opportunitiesResult.error &&
          `Opportunities: ${opportunitiesResult.error.message}`,
        meetingsResult.error &&
          `Meetings: ${meetingsResult.error.message}`,
        profilesResult.error &&
          `Profiles: ${profilesResult.error.message}`,
      ].filter(Boolean)

      if (errors.length > 0) {
        setError(errors.join(' | '))
      }

      if (!activitiesResult.error) {
        setActivities(
          (activitiesResult.data ?? []) as Activity[]
        )
      }

      if (!contactsResult.error) {
        setContacts(
          (contactsResult.data ?? []) as Contact[]
        )
      }

      if (!opportunitiesResult.error) {
        setOpportunities(
          (opportunitiesResult.data ?? []) as Opportunity[]
        )
      }

      if (!meetingsResult.error) {
        setMeetings(
          (meetingsResult.data ?? []) as Meeting[]
        )
      }

      if (!profilesResult.error) {
        setProfiles(
          (profilesResult.data ?? []) as Profile[]
        )
      }
    } catch {
      setError('Unable to load activity data.')
    } finally {
      setLoading(false)
    }
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

  // Open the add activity form.
  function startAddActivity() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  // Load an existing activity into the form.
  function startEditActivity(activity: Activity) {
    setForm({
      title: activity.title,
      activity_type: activity.activity_type,
      activity_group: activity.activity_group,
      contact_id: activity.contact_id ?? '',
      opportunity_id: activity.opportunity_id ?? '',
      meeting_id: activity.meeting_id ?? '',
      owner_id: activity.owner_id ?? '',
      status: activity.status,
      scheduled_at: toLocalDateTime(
        activity.scheduled_at
      ),
      completed_at: toLocalDateTime(
        activity.completed_at
      ),
      description: activity.description ?? '',
      notes: activity.notes ?? '',
      drive_url: activity.drive_url ?? '',
    })

    setEditingId(activity.id)
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
    setForm(emptyForm)
    setError('')
  }

  // Save new or edited activity.
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (!form.title.trim()) {
      setError('Activity title is required.')
      return
    }

    const scheduledDate = form.scheduled_at
      ? new Date(form.scheduled_at)
      : null

    const completedDate = form.completed_at
      ? new Date(form.completed_at)
      : null

    if (
      (scheduledDate &&
        Number.isNaN(scheduledDate.getTime())) ||
      (completedDate &&
        Number.isNaN(completedDate.getTime()))
    ) {
      setError('Please enter valid dates and times.')
      return
    }

    if (
      form.status !== 'done' &&
      form.completed_at
    ) {
      setError(
        'Completed date is only applicable when status is Done.'
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
          throw new Error('Invalid protocol')
        }
      } catch {
        setError('Enter a valid document URL.')
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

      const userId = auth.user.id

      const payload = {
        title: form.title.trim(),
        activity_type: form.activity_type,
        activity_group: form.activity_group,
        contact_id: form.contact_id || null,
        opportunity_id: form.opportunity_id || null,
        meeting_id: form.meeting_id || null,
        owner_id: form.owner_id || userId,
        status: form.status,
        scheduled_at:
          scheduledDate?.toISOString() ?? null,
        completed_at:
          form.status === 'done'
            ? completedDate?.toISOString() ??
              new Date().toISOString()
            : null,
        description:
          form.description.trim() || null,
        notes: form.notes.trim() || null,
        drive_url: form.drive_url.trim() || null,
      }

      if (editingId) {
        const { data, error: updateError } =
          await supabase
            .from('activities')
            .update(payload)
            .eq('id', editingId)
            .select('id')
            .maybeSingle()

        if (updateError) {
          throw updateError
        }

        if (!data) {
          throw new Error(
            'Activity was not updated. Check your permissions.'
          )
        }

        setMessage('Activity updated successfully.')
      } else {
        const { error: insertError } =
          await supabase
            .from('activities')
            .insert({
              ...payload,
              created_by: userId,
            })

        if (insertError) {
          throw insertError
        }

        setMessage('Activity added successfully.')
      }

      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while saving.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Mark an activity as completed from the directory.
  async function markActivityDone(activity: Activity) {
    setUpdatingId(activity.id)
    setError('')
    setMessage('')

    try {
      const { data, error: updateError } =
        await supabase
          .from('activities')
          .update({
            status: 'done',
            completed_at:
              activity.completed_at ??
              new Date().toISOString(),
          })
          .eq('id', activity.id)
          .select('id')
          .maybeSingle()

      if (updateError) {
        throw updateError
      }

      if (!data) {
        throw new Error(
          'Activity could not be updated. Check permissions.'
        )
      }

      setMessage('Activity marked as completed.')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete activity.'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  // Lookups for related records.
  const contactNames = new Map(
    contacts.map((contact) => [
      contact.id,
      contact.contact_name,
    ])
  )

  const opportunityNames = new Map(
    opportunities.map((opportunity) => [
      opportunity.id,
      opportunity.deal_name,
    ])
  )

  const meetingNames = new Map(
    meetings.map((meeting) => [
      meeting.id,
      meeting.title,
    ])
  )

  const ownerNames = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.full_name ||
        profile.email ||
        profile.id,
    ])
  )

  // Search and filter activities.
  const filteredActivities = activities.filter(
    (activity) => {
      const term = search.trim().toLowerCase()

      const matchesSearch = [
        activity.title,
        activity.description,
        activity.notes,
        contactNames.get(activity.contact_id ?? ''),
        opportunityNames.get(
          activity.opportunity_id ?? ''
        ),
        meetingNames.get(activity.meeting_id ?? ''),
        ownerNames.get(activity.owner_id ?? ''),
      ].some((value) =>
        value?.toLowerCase().includes(term)
      )

      return (
        matchesSearch &&
        (!typeFilter ||
          activity.activity_type === typeFilter) &&
        (!groupFilter ||
          activity.activity_group === groupFilter) &&
        (!statusFilter ||
          activity.status === statusFilter)
      )
    }
  )

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-green-700 focus:outline-none'

  const selectFilterClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm'

  function statusBadgeClass(status: string) {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
  <div className="jaago-module space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Activities
          </h1>

          <p className="mt-2 text-gray-600">
            Track donor engagement, stewardship,
            visits, tasks, campaigns, and other PSE work.
          </p>
        </div>

        <button
          type="button"
          onClick={startAddActivity}
          className="rounded-lg bg-green-700 px-4 py-2.5 font-medium text-white hover:bg-green-800"
        >
          + Add Activity
        </button>
      </header>

      {/* Feedback */}
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

      {/* Add / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            {editingId
              ? 'Edit Activity'
              : 'Add New Activity'}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Title */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Activity Title *
              </span>

              <input
                type="text"
                required
                className={inputClass}
                value={form.title}
                onChange={(event) =>
                  updateField(
                    'title',
                    event.target.value
                  )
                }
                placeholder="e.g., Follow up with sponsor"
              />
            </label>

            {/* Activity Type */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Activity Type *
              </span>

              <select
                className={inputClass}
                value={form.activity_type}
                onChange={(event) =>
                  updateField(
                    'activity_type',
                    event.target.value
                  )
                }
              >
                {activityTypes.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Activity Group */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Activity Group *
              </span>

              <select
                className={inputClass}
                value={form.activity_group}
                onChange={(event) =>
                  updateField(
                    'activity_group',
                    event.target.value
                  )
                }
              >
                {activityGroups.map((group) => (
                  <option
                    key={group.value}
                    value={group.value}
                  >
                    {group.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Status */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Status *
              </span>

              <select
                className={inputClass}
                value={form.status}
                onChange={(event) =>
                  updateField(
                    'status',
                    event.target.value
                  )
                }
              >
                {activityStatuses.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Contact */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Related Contact (optional)
              </span>

              <select
                className={inputClass}
                value={form.contact_id}
                onChange={(event) =>
                  updateField(
                    'contact_id',
                    event.target.value
                  )
                }
              >
                <option value="">
                  No linked contact
                </option>

                {contacts.map((contact) => (
                  <option
                    key={contact.id}
                    value={contact.id}
                  >
                    {contact.contact_name}
                  </option>
                ))}
              </select>
            </label>

            {/* Opportunity */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Related Opportunity (optional)
              </span>

              <select
                className={inputClass}
                value={form.opportunity_id}
                onChange={(event) =>
                  updateField(
                    'opportunity_id',
                    event.target.value
                  )
                }
              >
                <option value="">
                  No linked opportunity
                </option>

                {opportunities.map((opportunity) => (
                  <option
                    key={opportunity.id}
                    value={opportunity.id}
                  >
                    {opportunity.deal_name}
                  </option>
                ))}
              </select>
            </label>

            {/* Meeting */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Related Meeting (optional)
              </span>

              <select
                className={inputClass}
                value={form.meeting_id}
                onChange={(event) =>
                  updateField(
                    'meeting_id',
                    event.target.value
                  )
                }
              >
                <option value="">
                  No linked meeting
                </option>

                {meetings.map((meeting) => (
                  <option
                    key={meeting.id}
                    value={meeting.id}
                  >
                    {meeting.title}
                  </option>
                ))}
              </select>
            </label>

            {/* Owner */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Activity Owner
              </span>

              <select
                className={inputClass}
                value={form.owner_id}
                onChange={(event) =>
                  updateField(
                    'owner_id',
                    event.target.value
                  )
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

            {/* Scheduled Date */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Scheduled Date and Time
              </span>

              <input
                type="datetime-local"
                className={inputClass}
                value={form.scheduled_at}
                onChange={(event) =>
                  updateField(
                    'scheduled_at',
                    event.target.value
                  )
                }
              />
            </label>

            {/* Completed Date */}
            {form.status === 'done' && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Completed Date and Time
                </span>

                <input
                  type="datetime-local"
                  className={inputClass}
                  value={form.completed_at}
                  onChange={(event) =>
                    updateField(
                      'completed_at',
                      event.target.value
                    )
                  }
                />

                <p className="mt-1 text-xs text-gray-500">
                  Leave blank to use the current time.
                </p>
              </label>
            )}

            {/* Google Drive URL */}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Google Drive / Document URL
              </span>

              <input
                type="url"
                className={inputClass}
                value={form.drive_url}
                onChange={(event) =>
                  updateField(
                    'drive_url',
                    event.target.value
                  )
                }
                placeholder="https://drive.google.com/..."
              />
            </label>

            {/* Description */}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </span>

              <textarea
                rows={3}
                className={inputClass}
                value={form.description}
                onChange={(event) =>
                  updateField(
                    'description',
                    event.target.value
                  )
                }
                placeholder="Describe the activity and its purpose..."
              />
            </label>

            {/* Notes */}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Notes / Follow-up Context
              </span>

              <textarea
                rows={3}
                className={inputClass}
                value={form.notes}
                onChange={(event) =>
                  updateField(
                    'notes',
                    event.target.value
                  )
                }
                placeholder="Record outcomes, next steps, and important information..."
              />
            </label>
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-700 px-5 py-2.5 font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Save Changes'
                  : 'Save Activity'}
            </button>

            <button
              type="button"
              onClick={cancelForm}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Activities Directory */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Activity Directory
        </h2>

        {/* Search and Filters */}
        <div className="mb-5 flex flex-wrap gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search activities..."
            aria-label="Search activities"
            className={selectFilterClass}
          />

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
            aria-label="Filter activity type"
            className={selectFilterClass}
          >
            <option value="">
              All Activity Types
            </option>

            {activityTypes.map((type) => (
              <option
                key={type.value}
                value={type.value}
              >
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={groupFilter}
            onChange={(event) =>
              setGroupFilter(event.target.value)
            }
            aria-label="Filter activity group"
            className={selectFilterClass}
          >
            <option value="">
              All Groups
            </option>

            {activityGroups.map((group) => (
              <option
                key={group.value}
                value={group.value}
              >
                {group.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter activity status"
            className={selectFilterClass}
          >
            <option value="">
              All Statuses
            </option>

            {activityStatuses.map((status) => (
              <option
                key={status.value}
                value={status.value}
              >
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading activities...
          </p>
        ) : filteredActivities.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            {activities.length === 0
              ? 'No activities found. Add your first activity.'
              : 'No activities match your filters.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  {[
                    'Activity',
                    'Type',
                    'Group',
                    'Contact',
                    'Opportunity',
                    'Meeting',
                    'Owner',
                    'Scheduled',
                    'Status',
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
                {filteredActivities.map((activity) => (
                  <tr
                    key={activity.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {activity.title}
                    </td>

                    <td className="px-4 py-3">
                      {getLabel(
                        activityTypes,
                        activity.activity_type
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {getLabel(
                        activityGroups,
                        activity.activity_group
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {contactNames.get(
                        activity.contact_id ?? ''
                      ) || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {opportunityNames.get(
                        activity.opportunity_id ?? ''
                      ) || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {meetingNames.get(
                        activity.meeting_id ?? ''
                      ) || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {ownerNames.get(
                        activity.owner_id ?? ''
                      ) || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {formatDate(activity.scheduled_at)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(activity.status)}`}
                      >
                        {getLabel(
                          activityStatuses,
                          activity.status
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            startEditActivity(activity)
                          }
                          disabled={
                            updatingId !== null || saving
                          }
                          className="rounded-md border border-green-700 px-3 py-1.5 font-medium text-green-800 hover:bg-green-50 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        {activity.status !== 'done' &&
                          activity.status !== 'cancelled' && (
                            <button
                              type="button"
                              disabled={
                                updatingId !== null || saving
                              }
                              onClick={() =>
                                void markActivityDone(activity)
                              }
                              className="rounded-md bg-green-700 px-3 py-1.5 font-medium text-white hover:bg-green-800 disabled:opacity-50"
                            >
                              {updatingId === activity.id
                                ? 'Updating...'
                                : 'Mark Done'}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          Showing {filteredActivities.length} of{' '}
          {activities.length} activities.
        </p>
      </section>
    </div>
  )
}
