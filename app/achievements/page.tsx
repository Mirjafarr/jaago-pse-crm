
'use client'

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import { createClient } from '@/lib/supabase/client'

type Achievement = {
  id: string
  opportunity_id: string
  owner_id: string | null
  contribution_date: string
  realized_amount: number
  currency: string
  confirmation_reference: string | null
  notes: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  created_at: string
}

type Opportunity = {
  id: string
  deal_name: string
  owner_id: string | null
  expected_amount: number
  currency: string
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
}

const emptyForm = {
  opportunity_id: '',
  owner_id: '',
  contribution_date: '',
  realized_amount: '',
  currency: 'BDT',
  confirmation_reference: '',
  notes: '',
}

type FormField = keyof typeof emptyForm

function formatMoney(amount: number, currency: string) {
  return `${currency.trim()} ${Number(amount).toLocaleString(
    'en-BD',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function AchievementsPage() {
  const [supabase] = useState(() => createClient())

  const [achievements, setAchievements] =
    useState<Achievement[]>([])
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  const [isManager, setIsManager] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')

  // Load achievements, related opportunities, and PSE users.
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [
        achievementsResult,
        opportunitiesResult,
        profilesResult,
        managerResult,
      ] = await Promise.all([
        supabase
          .from('achievements')
          .select(
            'id, opportunity_id, owner_id, contribution_date, realized_amount, currency, confirmation_reference, notes, confirmed_by, confirmed_at, created_at'
          )
          .order('contribution_date', {
            ascending: false,
          }),

        supabase
          .from('opportunities')
          .select(
            'id, deal_name, owner_id, expected_amount, currency'
          )
          .order('deal_name'),

        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('department', 'PSE')
          .eq('is_active', true)
          .order('full_name'),

        supabase.rpc('is_pse_manager'),
      ])

      const errors = [
        achievementsResult.error &&
          `Achievements: ${achievementsResult.error.message}`,

        opportunitiesResult.error &&
          `Opportunities: ${opportunitiesResult.error.message}`,

        profilesResult.error &&
          `Profiles: ${profilesResult.error.message}`,

        managerResult.error &&
          `Permissions: ${managerResult.error.message}`,
      ].filter(Boolean)

      if (errors.length > 0) {
        setError(errors.join(' | '))
      }

      setAchievements(
        achievementsResult.error
          ? []
          : (achievementsResult.data ?? []) as Achievement[]
      )

      setOpportunities(
        opportunitiesResult.error
          ? []
          : (opportunitiesResult.data ?? []) as Opportunity[]
      )

      setProfiles(
        profilesResult.error
          ? []
          : (profilesResult.data ?? []) as Profile[]
      )

      setIsManager(
        !managerResult.error && managerResult.data === true
      )
    } catch {
      setError('Unable to load achievement information.')
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

  function startAdd() {
    setForm({
      ...emptyForm,
      contribution_date: new Date()
        .toLocaleDateString('en-CA'),
    })

    setError('')
    setMessage('')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setForm(emptyForm)
    setError('')
  }

  // Selecting an opportunity fills its currency and owner.
  function handleOpportunityChange(opportunityId: string) {
    const opportunity = opportunities.find(
      (item) => item.id === opportunityId
    )

    setForm((previous) => ({
      ...previous,
      opportunity_id: opportunityId,
      currency:
        opportunity?.currency.trim().toUpperCase() ??
        previous.currency,
      owner_id: opportunity?.owner_id ?? '',
    }))
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (!isManager) {
      setError(
        'Only authorized PSE managers can confirm achievements.'
      )
      return
    }

    const selectedOpportunity = opportunities.find(
      (item) => item.id === form.opportunity_id
    )

    if (!selectedOpportunity) {
      setError('Select a valid opportunity.')
      return
    }

    const amount = Number(form.realized_amount)

    if (
      form.realized_amount.trim() === '' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        'Realized amount must be greater than zero.'
      )
      return
    }

    if (!form.contribution_date) {
      setError('Contribution date is required.')
      return
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        form.contribution_date
      ) ||
      Number.isNaN(
        new Date(
          `${form.contribution_date}T00:00:00Z`
        ).getTime()
      )
    ) {
      setError('Enter a valid contribution date.')
      return
    }

    if (!form.confirmation_reference.trim()) {
      setError(
        'A confirmation reference is required to record an achievement.'
      )
      return
    }

    if (
      form.currency.trim().toUpperCase() !==
      selectedOpportunity.currency.trim().toUpperCase()
    ) {
      setError(
        'Contribution currency must match the selected opportunity. Currency conversion is not yet supported.'
      )
      return
    }

    const confirmed = window.confirm(
      `Confirm a realized contribution of ${formatMoney(
        amount,
        form.currency
      )} for "${selectedOpportunity.deal_name}"?\n\n` +
      'This action creates a confirmed financial achievement and cannot be edited or deleted through the current application.'
    )

    if (!confirmed) return

    setSaving(true)

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser()

      if (authError || !auth.user) {
        throw new Error(
          'Your session could not be verified. Please sign in again.'
        )
      }

      const { data, error: insertError } =
        await supabase
          .from('achievements')
          .insert({
            opportunity_id: form.opportunity_id,
            owner_id: form.owner_id || auth.user.id,
            contribution_date: form.contribution_date,
            realized_amount: amount,
            currency: form.currency.trim().toUpperCase(),
            confirmation_reference:
              form.confirmation_reference.trim(),
            notes: form.notes.trim() || null,
            confirmed_by: auth.user.id,
            confirmed_at: new Date().toISOString(),
          })
          .select('id')
          .single()

      if (insertError) {
        throw insertError
      }

      if (!data) {
        throw new Error(
          'The achievement was not created.'
        )
      }

      setShowForm(false)
      setForm(emptyForm)
      setMessage(
        'Financial achievement confirmed and recorded successfully.'
      )

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while recording the achievement.'
      )
    } finally {
      setSaving(false)
    }
  }

  const opportunityNames = new Map(
    opportunities.map((opportunity) => [
      opportunity.id,
      opportunity.deal_name,
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

  const years = Array.from(
    new Set(
      achievements.map(
        (item) =>
          item.contribution_date.slice(0, 4)
      )
    )
  ).sort((a, b) => b.localeCompare(a))

  const currencies = Array.from(
    new Set(
      achievements.map((item) =>
        item.currency.trim().toUpperCase()
      )
    )
  ).sort()

  const filteredAchievements = achievements.filter(
    (item) => {
      const term = search.trim().toLowerCase()

      const matchesSearch = [
        opportunityNames.get(item.opportunity_id),
        ownerNames.get(item.owner_id ?? ''),
        item.confirmation_reference,
        item.notes,
      ].some((value) =>
        value?.toLowerCase().includes(term)
      )

      const matchesYear =
        !yearFilter ||
        item.contribution_date.startsWith(yearFilter)

      const matchesCurrency =
        !currencyFilter ||
        item.currency.trim().toUpperCase() ===
          currencyFilter

      return (
        matchesSearch &&
        matchesYear &&
        matchesCurrency
      )
    }
  )

  // Keep financial totals separate for each currency.
  const totalsByCurrency = filteredAchievements
    .filter((item) => item.confirmed_at !== null)
    .reduce<Record<string, number>>(
      (result, item) => {
        const currency = item.currency
          .trim()
          .toUpperCase()

        result[currency] =
          (result[currency] ?? 0) +
          Number(item.realized_amount)

        return result
      },
      {}
    )

  const confirmedCount = filteredAchievements.filter(
    (item) => item.confirmed_at !== null
  ).length

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-green-700 focus:outline-none'

  return (
  <div className="jaago-module space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Financial Achievements
          </h1>

          <p className="mt-2 text-gray-600">
            Record and review confirmed fundraising
            contributions.
          </p>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={startAdd}
            className="rounded-lg bg-green-700 px-4 py-2.5 font-medium text-white hover:bg-green-800"
          >
            + Record Achievement
          </button>
        )}
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

      {!loading && !isManager && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          You have read-only access to financial achievements.
          Only authorized PSE managers can record confirmed
          contributions.
        </div>
      )}

      {/* Achievement Creation Form */}
      {showForm && isManager && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-2 text-xl font-semibold">
            Record Confirmed Contribution
          </h2>

          <p className="mb-5 text-sm text-gray-600">
            Enter only financially verified contributions.
            This record will be included in achievement
            reporting immediately after it is saved.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Opportunity */}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">
                Related Opportunity *
              </span>

              <select
                required
                className={inputClass}
                value={form.opportunity_id}
                onChange={(event) =>
                  handleOpportunityChange(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select Opportunity
                </option>

                {opportunities.map((opportunity) => (
                  <option
                    key={opportunity.id}
                    value={opportunity.id}
                  >
                    {opportunity.deal_name} —{' '}
                    {formatMoney(
                      opportunity.expected_amount,
                      opportunity.currency
                    )}
                  </option>
                ))}
              </select>
            </label>

            {/* Owner */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Responsible PSE Employee
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
                  Current signed-in manager
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

            {/* Date */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Contribution Date *
              </span>

              <input
                required
                type="date"
                className={inputClass}
                value={form.contribution_date}
                onChange={(event) =>
                  updateField(
                    'contribution_date',
                    event.target.value
                  )
                }
              />
            </label>

            {/* Realized Amount */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Realized Amount *
              </span>

              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className={inputClass}
                value={form.realized_amount}
                onChange={(event) =>
                  updateField(
                    'realized_amount',
                    event.target.value
                  )
                }
                placeholder="Enter confirmed amount"
              />
            </label>

            {/* Currency */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Currency *
              </span>

              <input
                readOnly
                className={`${inputClass} bg-gray-100`}
                value={form.currency}
              />
            </label>

            {/* Confirmation Reference */}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">
                Confirmation Reference *
              </span>

              <input
                required
                type="text"
                className={inputClass}
                value={form.confirmation_reference}
                onChange={(event) =>
                  updateField(
                    'confirmation_reference',
                    event.target.value
                  )
                }
                placeholder="e.g., Finance receipt or bank transaction reference"
              />
            </label>

            {/* Notes */}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">
                Notes
              </span>

              <textarea
                rows={4}
                className={inputClass}
                value={form.notes}
                onChange={(event) =>
                  updateField(
                    'notes',
                    event.target.value
                  )
                }
                placeholder="Contribution details, verification context, or additional notes..."
              />
            </label>
          </div>

          <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            Saving this form creates a confirmed financial
            achievement. The current database policies do
            not provide a way to edit or delete the record
            afterward.
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-700 px-5 py-2.5 font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {saving
                ? 'Confirming...'
                : 'Confirm and Save Achievement'}
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

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Recorded Contributions
          </p>

          <p className="mt-3 text-3xl font-bold">
            {filteredAchievements.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Confirmed Contributions
          </p>

          <p className="mt-3 text-3xl font-bold text-green-800">
            {confirmedCount}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Confirmed Financial Totals
          </p>

          {Object.keys(totalsByCurrency).length === 0 ? (
            <p className="mt-3 text-xl font-bold">
              No confirmed amounts
            </p>
          ) : (
            Object.entries(totalsByCurrency).map(
              ([currency, amount]) => (
                <p
                  key={currency}
                  className="mt-2 text-xl font-bold"
                >
                  {formatMoney(amount, currency)}
                </p>
              )
            )
          )}
        </div>
      </section>

      {/* Directory */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            Achievement Directory
          </h2>

          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              aria-label="Search achievements"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search achievements..."
              className="rounded-lg border border-gray-300 px-3 py-2"
            />

            <select
              value={yearFilter}
              onChange={(event) =>
                setYearFilter(event.target.value)
              }
              aria-label="Filter by year"
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">All Years</option>

              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={currencyFilter}
              onChange={(event) =>
                setCurrencyFilter(event.target.value)
              }
              aria-label="Filter by currency"
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">All Currencies</option>

              {currencies.map((currency) => (
                <option
                  key={currency}
                  value={currency}
                >
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading achievements...
          </p>
        ) : filteredAchievements.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            {achievements.length === 0
              ? 'No financial achievements recorded yet.'
              : 'No achievements match the current filters.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  {[
                    'Opportunity',
                    'PSE Employee',
                    'Contribution Date',
                    'Realized Amount',
                    'Reference',
                    'Confirmed By',
                    'Status',
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

              <tbody className="divide-y">
                {filteredAchievements.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {opportunityNames.get(
                        item.opportunity_id
                      ) ?? 'Unknown opportunity'}
                    </td>

                    <td className="px-4 py-3">
                      {ownerNames.get(
                        item.owner_id ?? ''
                      ) ?? '—'}
                    </td>

                    <td className="px-4 py-3">
                      {formatDate(
                        item.contribution_date
                      )}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {formatMoney(
                        item.realized_amount,
                        item.currency
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {item.confirmation_reference || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {ownerNames.get(
                        item.confirmed_by ?? ''
                      ) ?? '—'}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          item.confirmed_at
                            ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800'
                            : 'rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800'
                        }
                      >
                        {item.confirmed_at
                          ? 'Confirmed'
                          : 'Unconfirmed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          Showing {filteredAchievements.length} of{' '}
          {achievements.length} achievements.
        </p>
      </section>
    </div>
  )
}
