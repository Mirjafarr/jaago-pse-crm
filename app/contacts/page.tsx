
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Contact = {
  id: string
  contact_type: string | null
  contact_name: string
  email: string | null
  phone: string | null
  designation: string | null
  organization: string | null
  website: string | null
  industry: string | null
  created_at: string
}

const emptyForm = {
  contact_type: '',
  contact_name: '',
  email: '',
  phone: '',
  designation: '',
  organization: '',
  website: '',
  industry: '',
}

type FormField = keyof typeof emptyForm

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  const [supabase] = useState(() => createClient())

  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('contacts')
      .select(
        'id, contact_type, contact_name, email, phone, designation, organization, website, industry, created_at'
      )
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setContacts([])
    } else {
      setContacts((data ?? []) as Contact[])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  function updateField(field: FormField, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function startAddContact() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  function startEditContact(contact: Contact) {
    setForm({
      contact_type: contact.contact_type ?? '',
      contact_name: contact.contact_name,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      designation: contact.designation ?? '',
      organization: contact.organization ?? '',
      website: contact.website ?? '',
      industry: contact.industry ?? '',
    })

    setEditingId(contact.id)
    setShowForm(true)
    setError('')
    setMessage('')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData.user) {
        setError('Your session could not be verified. Please sign in again.')
        return
      }

      const userId = authData.user.id

      const contactData = {
        contact_type: form.contact_type || null,
        contact_name: form.contact_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        designation: form.designation.trim() || null,
        organization: form.organization.trim() || null,
        website: form.website.trim() || null,
        industry: form.industry.trim() || null,
        updated_by: userId,
      }

      if (editingId) {
        const { data, error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingId)
          .select('id')
          .maybeSingle()

        if (error) {
          setError(error.message)
          return
        }

        if (!data) {
          setError(
            'The contact was not updated. It may not exist, or your account may not have permission to update it.'
          )
          return
        }

        setMessage('Contact updated successfully.')
      } else {
        const { error } = await supabase.from('contacts').insert({
          ...contactData,
          created_by: userId,
        })

        if (error) {
          setError(error.message)
          return
        }

        setMessage('Contact added successfully.')
      }

      setForm(emptyForm)
      setShowForm(false)
      setEditingId(null)

      await loadContacts()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteContact(contact: Contact) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${contact.contact_name}"? This action cannot be undone.`
    )

    if (!confirmed) return

    setError('')
    setMessage('')
    setDeletingId(contact.id)

    try {
      const { data, error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id)
        .select('id')
        .maybeSingle()

      if (error) {
        setError(`Unable to delete contact: ${error.message}`)
        return
      }

      if (!data) {
        setError(
          'The contact was not deleted. It may no longer exist, or your account may not have permission to delete it.'
        )
        return
      }

      if (editingId === contact.id) {
        setShowForm(false)
        setEditingId(null)
        setForm(emptyForm)
      }

      setMessage('Contact deleted successfully.')
      await loadContacts()
    } catch {
      setError('An unexpected error occurred while deleting the contact.')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredContacts = contacts.filter((contact) => {
    const term = search.toLowerCase()

    return [
      contact.contact_name,
      contact.organization,
      contact.email,
      contact.industry,
      contact.contact_type,
    ].some((value) => value?.toLowerCase().includes(term))
  })

  return (
  <div className="jaago-module space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-2 text-gray-600">
            Manage private sector partners and contact information.
          </p>
        </div>

        <button
          type="button"
          onClick={startAddContact}
          className="rounded-lg bg-green-700 px-4 py-2.5 font-medium text-white hover:bg-green-800"
        >
          + Add Contact
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div role="status" className="rounded-lg bg-green-50 p-4 text-green-800">
          {message}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            {editingId ? 'Edit Contact' : 'Add New Contact'}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Contact Name *
              </span>
              <input
                type="text"
                required
                value={form.contact_name}
                onChange={(e) =>
                  updateField('contact_name', e.target.value)
                }
                placeholder="Enter contact name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Contact Type
              </span>
              <select
                value={form.contact_type}
                onChange={(e) =>
                  updateField('contact_type', e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900"
              >
                <option value="">Select contact type</option>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </label>

            {(
              [
                ['organization', 'Organization'],
                ['designation', 'Designation'],
                ['email', 'Email'],
                ['phone', 'Phone'],
                ['website', 'Website'],
                ['industry', 'Industry'],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  {label}
                </span>
                <input
                  type={field === 'email' ? 'email' : 'text'}
                  value={form[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900"
                />
              </label>
            ))}
          </div>

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
                  : 'Save Contact'}
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

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Contact Directory
          </h2>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            aria-label="Search contacts"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:max-w-xs"
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading contacts...
          </p>
        ) : filteredContacts.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            {contacts.length === 0
              ? 'No contacts found. Add your first contact to get started.'
              : 'No contacts match your search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  {[
                    'Contact Name',
                    'Organization',
                    'Contact Type',
                    'Designation',
                    'Email',
                    'Phone',
                    'Industry',
                    'Actions',
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {contact.contact_name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {contact.organization || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {contact.contact_type || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {contact.designation || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {contact.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {contact.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {contact.industry || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditContact(contact)}
                          disabled={deletingId === contact.id}
                          className="rounded-md border border-green-700 px-3 py-1.5 font-medium text-green-800 hover:bg-green-50 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDeleteContact(contact)}
                          disabled={deletingId !== null || saving}
                          className="rounded-md bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === contact.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          Showing {filteredContacts.length} of {contacts.length} contacts
        </p>
      </section>
    </div>
  )
}
