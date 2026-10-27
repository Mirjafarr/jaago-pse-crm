
'use client'

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import { createClient } from '@/lib/supabase/client'

type Meeting = {
  id: string
  title: string
  organization_name: string | null
  contact_id: string | null
  opportunity_id: string | null
  designation: string | null
  email: string | null
  phone: string | null
  meeting_at: string
  status: string
  description: string | null
  owner_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type Contact = {
  id: string
  contact_name: string
  organization: string | null
  designation: string | null
  email: string | null
  phone: string | null
}

type Opportunity = {
  id: string
  deal_name: string
  contact_id: string | null
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
}

const emptyForm = {
  title: '',
  organization_name: '',
  contact_id: '',
  opportunity_id: '',
  designation: '',
  email: '',
  phone: '',
  meeting_at: '',
  status: 'scheduled',
  description: '',
  owner_id: '',
}

type FormField = keyof typeof emptyForm

// Convert a stored UTC timestamp into local date/time for input.
function toLocalDateTime(value: string) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const pad = (number: number) =>
    String(number).padStart(2, '0')

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('')
}

// Display meeting time in the user's local timezone.
function formatMeetingDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }

  return date.toLocaleString('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function MeetingsPage() {
  const [supabase] = useState(() => createClient())

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  const [form, setForm] = useState(emptyForm)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] =
    useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Load records required by the Meetings module.
  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const [
        meetingsResult,
        contactsResult,
        opportunitiesResult,
        profilesResult,
      ] = await Promise.all([
        supabase
          .from('meetings')
          .select('*')
          .order('meeting_at', { ascending: false }),

        supabase
          .from('contacts')
          .select(
            'id, contact_name, organization, designation, email, phone'
          )
          .order('contact_name'),

        supabase
          .from('opportunities')
          .select('id, deal_name, contact_id')
          .order('deal_name'),

        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('department', 'PSE')
          .eq('is_active', true)
          .order('full_name'),
      ])

      const errors = [
        meetingsResult.error &&
          `Meetings: ${meetingsResult.error.message}`,
        contactsResult.error &&
          `Contacts: ${contactsResult.error.message}`,
        opportunitiesResult.error &&
          `Opportunities: ${opportunitiesResult.error.message}`,
        profilesResult.error &&
          `Team members: ${profilesResult.error.message}`,
      ].filter(Boolean)

      if (errors.length > 0) {
        setError(errors.join(' | '))
      }

      if (!meetingsResult.error) {
        setMeetings(
          (meetingsResult.data ?? []) as Meeting[]
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

      if (!profilesResult.error) {
        setProfiles(
          (profilesResult.data ?? []) as Profile[]
        )
      }
    } catch {
      setError('Failed to load meeting information.')
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

  // Automatically copy known contact information.
  function handleContactChange(contactId: string) {
    const contact = contacts.find(
      (item) => item.id === contactId
    )

    setForm((previous) => ({
      ...previous,
      contact_id: contactId,
      opportunity_id:
        previous.opportunity_id &&
        opportunities.some(
          (deal) =>
            deal.id === previous.opportunity_id &&
            (!deal.contact_id ||
              deal.contact_id === contactId)
        )
          ? previous.opportunity_id
          : '',
      organization_name:
        contact?.organization ?? previous.organization_name,
      designation:
        contact?.designation ?? previous.designation,
      email: contact?.email ?? previous.email,
      phone: contact?.phone ?? previous.phone,
    }))
  }

  // Automatically select the related contact if available.
  function handleOpportunityChange(opportunityId: string) {
    const opportunity = opportunities.find(
      (item) => item.id === opportunityId
    )

    if (!opportunity) {
      updateField('opportunity_id', '')
      return
    }

    const contact = contacts.find(
      (item) => item.id === opportunity.contact_id
    )

    setForm((previous) => ({
      ...previous,
      opportunity_id: opportunityId,
      contact_id:
        opportunity.contact_id ?? previous.contact_id,
      organization_name:
        contact?.organization ?? previous.organization_name,
      designation:
        contact?.designation ?? previous.designation,
      email: contact?.email ?? previous.email,
      phone: contact?.phone ?? previous.phone,
    }))
  }

  function startAddMeeting() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  function startEditMeeting(meeting: Meeting) {
    setEditingId(meeting.id)

    setForm({
      title: meeting.title,
      organization_name:
        meeting.organization_name ?? '',
      contact_id: meeting.contact_id ?? '',
      opportunity_id: meeting.opportunity_id ?? '',
      designation: meeting.designation ?? '',
      email: meeting.email ?? '',
      phone: meeting.phone ?? '',
      meeting_at: toLocalDateTime(meeting.meeting_at),
      status: meeting.status,
      description: meeting.description ?? '',
      owner_id: meeting.owner_id ?? '',
    })

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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (!form.title.trim()) {
      setError('Meeting title is required.')
      return
    }

    if (!form.meeting_at) {
      setError('Meeting date and time are required.')
      return
    }

    const meetingDate = new Date(form.meeting_at)

    if (Number.isNaN(meetingDate.getTime())) {
      setError('Please enter a valid meeting date.')
      return
    }

    if (
      form.opportunity_id &&
      form.contact_id
    ) {
      const selectedOpportunity = opportunities.find(
        (item) => item.id === form.opportunity_id
      )

      if (
        selectedOpportunity?.contact_id &&
        selectedOpportunity.contact_id !== form.contact_id
      ) {
        setError(
          'The selected contact does not match the opportunity contact.'
        )
        return
      }
    }

    setSaving(true)

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error(
          'Your session could not be verified. Please sign in again.'
        )
      }

      const userId = authData.user.id

      const payload = {
        title: form.title.trim(),
        organization_name:
          form.organization_name.trim() || null,
        contact_id: form.contact_id || null,
        opportunity_id: form.opportunity_id || null,
        designation: form.designation.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        meeting_at: meetingDate.toISOString(),
        status: form.status,
        description: form.description.trim() || null,
        owner_id: form.owner_id || userId,
      }

      if (editingId) {
        const { data, error: updateError } =
          await supabase
            .from('meetings')
            .update(payload)
            .eq('id', editingId)
            .select('id')
            .maybeSingle()

        if (updateError) {
          throw updateError
        }

        if (!data) {
          throw new Error(
            'Meeting was not updated. Check your permissions.'
          )
        }

        setMessage('Meeting updated successfully.')
      } else {
        const { error: insertError } =
          await supabase
            .from('meetings')
            .insert({
              ...payload,
              created_by: userId,
            })

        if (insertError) {
          throw insertError
        }

        setMessage('Meeting created successfully.')
      }

      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Change status directly from the Meetings directory.
  async function updateMeetingStatus(
    meeting: Meeting,
    nextStatus: string
  ) {
    setError('')
    setMessage('')

    const { data, error: updateError } =
      await supabase
        .from('meetings')
        .update({
          status: nextStatus,
        })
        .eq('id', meeting.id)
        .select('id')
        .maybeSingle()

    if (updateError) {
      setError(updateError.message)
      return
    }

    if (!data) {
      setError(
        'Meeting status was not updated. Check your permissions.'
      )
      return
    }

    setMessage('Meeting status updated successfully.')
    await loadData()
  }

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

  const ownerNames = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.full_name || profile.email || profile.id,
    ])
  )

  const filteredMeetings = meetings.filter((meeting) => {
    const term = search.trim().toLowerCase()

    const matchesSearch = [
      meeting.title,
      meeting.organization_name,
      meeting.email,
      meeting.phone,
      meeting.description,
      contactNames.get(meeting.contact_id ?? ''),
      opportunityNames.get(meeting.opportunity_id ?? ''),
      ownerNames.get(meeting.owner_id ?? ''),
    ].some((value) =>
      value?.toLowerCase().includes(term)
    )

    const matchesStatus =
      !statusFilter || meeting.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const statusClass = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-green-700 focus:outline-none'

  return (
  <div className="jaago-module space-y-6">
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Meetings
          </h1>

          <p className="mt-2 text-gray-600">
            Schedule and track meetings with donors,
            partners, and prospective sponsors.
          </p>
        </div>

        <button
          type="button"
          onClick={startAddMeeting}
          className="rounded-lg bg-green-700 px-4 py-2.5 font-medium text-white hover:bg-green-800"
        >
          + Add Meeting
        </button>
      </header>

      {/* Error and Success Messages */}
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

      {/* Add / Edit Meeting Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            {editingId
              ? 'Edit Meeting'
              : 'Schedule New Meeting'}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Meeting Title */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Meeting Title *
              </span>

              <input
                type="text"
                required
                className={inputClass}
                value={form.title}
                onChange={(e) =>
                  updateField('title', e.target.value)
                }
                placeholder="e.g., Sponsorship Discussion"
              />
            </label>

            {/* Organization */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Organization Name
              </span>

              <input
                type="text"
                className={inputClass}
                value={form.organization_name}
                onChange={(e) =>
                  updateField(
                    'organization_name',
                    e.target.value
                  )
                }
                placeholder="Enter organization name"
              />
            </label>

            {/* Contact */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Related Contact
              </span>

              <select
                className={inputClass}
                value={form.contact_id}
                onChange={(e) =>
                  handleContactChange(e.target.value)
                }
              >
                <option value="">Select contact</option>

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
              <span className="mb-1.5 block text-sm font-medium">
                Related Opportunity
              </span>

              <select
                className={inputClass}
                value={form.opportunity_id}
                onChange={(e) =>
                  handleOpportunityChange(e.target.value)
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

            {/* Designation */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Contact Designation
              </span>

              <input
                type="text"
                className={inputClass}
                value={form.designation}
                onChange={(e) =>
                  updateField(
                    'designation',
                    e.target.value
                  )
                }
                placeholder="e.g., CSR Manager"
              />
            </label>

            {/* Email */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Contact Email
              </span>

              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) =>
                  updateField('email', e.target.value)
                }
              />
            </label>

            {/* Phone */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Contact Phone
              </span>

              <input
                type="tel"
                className={inputClass}
                value={form.phone}
                onChange={(e) =>
                  updateField('phone', e.target.value)
                }
              />
            </label>

            {/* Date and Time */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Meeting Date and Time *
              </span>

              <input
                type="datetime-local"
                required
                className={inputClass}
                value={form.meeting_at}
                onChange={(e) =>
                  updateField(
                    'meeting_at',
                    e.target.value
                  )
                }
              />
            </label>

            {/* Status */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Meeting Status *
              </span>

              <select
                className={inputClass}
                value={form.status}
                onChange={(e) =>
                  updateField('status', e.target.value)
                }
              >
                <option value="scheduled">
                  Scheduled
                </option>

                <option value="done">
                  Done
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>
            </label>

            {/* Owner */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Meeting Owner
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

            {/* Description */}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">
                Meeting Description
              </span>

              <textarea
                rows={4}
                className={inputClass}
                value={form.description}
                onChange={(e) =>
                  updateField(
                    'description',
                    e.target.value
                  )
                }
                placeholder="Purpose, discussion points, and meeting notes..."
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
                  : 'Save Meeting'}
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

      {/* Meetings Directory */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Meeting Directory
          </h2>

          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search meetings..."
              aria-label="Search meetings"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              aria-label="Filter meeting status"
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading meetings...
          </p>
        ) : filteredMeetings.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            {meetings.length === 0
              ? 'No meetings found. Schedule your first meeting.'
              : 'No meetings match your search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  {[
                    'Meeting Title',
                    'Organization',
                    'Contact',
                    'Opportunity',
                    'Date & Time',
                    'Owner',
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
                {filteredMeetings.map((meeting) => (
                  <tr
                    key={meeting.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {meeting.title}
                    </td>

                    <td className="px-4 py-3">
                      {meeting.organization_name || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {contactNames.get(
                        meeting.contact_id ?? ''
                      ) || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {opportunityNames.get(
                        meeting.opportunity_id ?? ''
                      ) || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {formatMeetingDate(
                        meeting.meeting_at
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {ownerNames.get(
                        meeting.owner_id ?? ''
                      ) || '—'}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(meeting.status)}`}
                      >
                        {meeting.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            startEditMeeting(meeting)
                          }
                          className="rounded-md border border-green-700 px-3 py-1.5 font-medium text-green-800 hover:bg-green-50"
                        >
                          Edit
                        </button>

                        {meeting.status === 'scheduled' && (
                          <button
                            type="button"
                            onClick={() =>
                              void updateMeetingStatus(
                                meeting,
                                'done'
                              )
                            }
                            className="rounded-md bg-green-700 px-3 py-1.5 font-medium text-white hover:bg-green-800"
                          >
                            Mark Done
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
          Showing {filteredMeetings.length} of{' '}
          {meetings.length} meetings.
        </p>
      </section>
    </div>
  )
}
