
'use client'

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import { createClient } from '@/lib/supabase/client'

type AnnualTarget = {
  id: string
  fiscal_year: number
  target_amount: number
  currency: string
  is_locked: boolean
  created_at: string
}

type QuarterlyTarget = {
  id: string
  annual_target_id: string
  quarter: number
  target_amount: number
}

type Allocation = {
  id: string
  quarterly_target_id: string
  employee_id: string
  target_vertical: string
  allocation_percentage: number
  target_amount: number
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
}

const verticals = ['DSP', 'VBD', 'Project']

const initialYear = new Date().getFullYear()

function money(amount: number, currency: string) {
  return `${currency.trim()} ${Number(amount).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function toCents(value: number) {
  return Math.round(value * 100)
}

export default function TargetsPage() {
  const [supabase] = useState(() => createClient())

  const [annualTargets, setAnnualTargets] =
    useState<AnnualTarget[]>([])
  const [quarters, setQuarters] =
    useState<QuarterlyTarget[]>([])
  const [allocations, setAllocations] =
    useState<Allocation[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  const [selectedYearId, setSelectedYearId] = useState('')
  const [isManager, setIsManager] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Annual target form
  const [showAnnualForm, setShowAnnualForm] = useState(false)
  const [annualForm, setAnnualForm] = useState({
    fiscal_year: String(initialYear),
    target_amount: '',
    currency: 'BDT',
  })

  // Quarterly allocation form
  const [quarterAmounts, setQuarterAmounts] =
    useState(['', '', '', ''])

  // Employee and vertical allocation form
  const [allocationForm, setAllocationForm] = useState({
    quarterly_target_id: '',
    employee_id: '',
    target_vertical: 'DSP',
    allocation_percentage: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const [
        annualResult,
        quartersResult,
        allocationsResult,
        profilesResult,
        managerResult,
      ] = await Promise.all([
        supabase
          .from('annual_targets')
          .select(
            'id, fiscal_year, target_amount, currency, is_locked, created_at'
          )
          .order('fiscal_year', { ascending: false }),

        supabase
          .from('quarterly_targets')
          .select(
            'id, annual_target_id, quarter, target_amount'
          )
          .order('quarter'),

        supabase
          .from('target_allocations')
          .select(
            'id, quarterly_target_id, employee_id, target_vertical, allocation_percentage, target_amount'
          ),

        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('department', 'PSE')
          .eq('is_active', true)
          .order('full_name'),

        supabase.rpc('is_pse_manager'),
      ])

      const errors = [
        annualResult.error &&
          `Annual targets: ${annualResult.error.message}`,
        quartersResult.error &&
          `Quarterly targets: ${quartersResult.error.message}`,
        allocationsResult.error &&
          `Allocations: ${allocationsResult.error.message}`,
        profilesResult.error &&
          `Team members: ${profilesResult.error.message}`,
      ].filter(Boolean)

      setError(errors.join(' | '))

      if (!annualResult.error) {
        setAnnualTargets(
          (annualResult.data ?? []) as AnnualTarget[]
        )
      }

      if (!quartersResult.error) {
        setQuarters(
          (quartersResult.data ?? []) as QuarterlyTarget[]
        )
      }

      if (!allocationsResult.error) {
        setAllocations(
          (allocationsResult.data ?? []) as Allocation[]
        )
      }

      if (!profilesResult.error) {
        setProfiles(
          (profilesResult.data ?? []) as Profile[]
        )
      }

      if (managerResult.error) {
        setIsManager(false)
        setError((previous) =>
          [
            previous,
            `Manager permission check failed: ${managerResult.error.message}`,
          ].filter(Boolean).join(' | ')
        )
      } else {
        setIsManager(managerResult.data === true)
      }
    } catch {
      setError('Unable to load target information.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (
      annualTargets.length > 0 &&
      !annualTargets.some(
        (target) => target.id === selectedYearId
      )
    ) {
      setSelectedYearId(annualTargets[0].id)
    }
  }, [annualTargets, selectedYearId])

  const selectedAnnual = annualTargets.find(
    (target) => target.id === selectedYearId
  )

  const selectedQuarters = quarters
    .filter(
      (quarter) =>
        quarter.annual_target_id === selectedYearId
    )
    .sort((a, b) => a.quarter - b.quarter)

  const selectedQuarterIds = new Set(
    selectedQuarters.map((quarter) => quarter.id)
  )

  const selectedAllocations = allocations.filter(
    (allocation) =>
      selectedQuarterIds.has(
        allocation.quarterly_target_id
      )
  )

  const employeeNames = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.full_name ||
        profile.email ||
        profile.id,
    ])
  )

  const totalQuarterly = round2(
    selectedQuarters.reduce(
      (sum, quarter) =>
        sum + Number(quarter.target_amount),
      0
    )
  )

  const quarterlyFormTotal = round2(
    quarterAmounts.reduce(
      (sum, amount) => sum + (Number(amount) || 0),
      0
    )
  )

  const selectedAllocationQuarter = selectedQuarters.find(
    (quarter) =>
      quarter.id === allocationForm.quarterly_target_id
  )

  function quarterPercentage(quarterId: string) {
    return round2(
      selectedAllocations
        .filter(
          (allocation) =>
            allocation.quarterly_target_id === quarterId
        )
        .reduce(
          (sum, allocation) =>
            sum + Number(allocation.allocation_percentage),
          0
        )
    )
  }

  async function handleCreateAnnual(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (!isManager) {
      setError('Only authorized managers can create targets.')
      return
    }

    const year = Number(annualForm.fiscal_year)
    const amount = Number(annualForm.target_amount)

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setError('Enter a valid fiscal year.')
      return
    }

    if (
      annualForm.target_amount.trim() === '' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError('Annual target must be greater than zero.')
      return
    }

    if (!/^[A-Z]{3}$/.test(annualForm.currency)) {
      setError('Select a valid three-letter currency code.')
      return
    }

    if (
      annualTargets.some(
        (target) => target.fiscal_year === year
      )
    ) {
      setError('An annual target already exists for this year.')
      return
    }

    setSaving(true)

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser()

      if (authError || !auth.user) {
        throw new Error('Please sign in again.')
      }

      const { data, error: insertError } =
        await supabase
          .from('annual_targets')
          .insert({
            fiscal_year: year,
            target_amount: amount,
            currency: annualForm.currency,
            is_locked: false,
            created_by: auth.user.id,
          })
          .select('id')
          .single()

      if (insertError) throw insertError

      setSelectedYearId(data.id)
      setShowAnnualForm(false)

      setAnnualForm({
        fiscal_year: String(year + 1),
        target_amount: '',
        currency: 'BDT',
      })

      setMessage('Annual target created successfully.')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create annual target.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateQuarters(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!selectedAnnual || !isManager) return

    setError('')
    setMessage('')

    if (selectedAnnual.is_locked) {
      setError('This annual target is locked.')
      return
    }

    if (selectedQuarters.length > 0) {
      setError(
        'Quarterly targets already exist. This version does not edit existing quarterly allocations.'
      )
      return
    }

    if (quarterAmounts.some((amount) => amount.trim() === '')) {
      setError('Enter amounts for all four quarters.')
      return
    }

    const values = quarterAmounts.map(Number)

    if (
      values.some(
        (value) => !Number.isFinite(value) || value < 0
      )
    ) {
      setError('Quarterly amounts cannot be negative.')
      return
    }

    const totalCents = values.reduce(
      (sum, amount) => sum + toCents(amount),
      0
    )

    if (
      totalCents !==
      toCents(Number(selectedAnnual.target_amount))
    ) {
      setError(
        'The four quarterly targets must equal the annual target.'
      )
      return
    }

    setSaving(true)

    try {
      const rows = values.map((amount, index) => ({
        annual_target_id: selectedAnnual.id,
        quarter: index + 1,
        target_amount: round2(amount),
      }))

      const { error: insertError } =
        await supabase
          .from('quarterly_targets')
          .insert(rows)

      if (insertError) throw insertError

      setQuarterAmounts(['', '', '', ''])
      setMessage(
        'All four quarterly targets created successfully.'
      )

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create quarterly targets.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateAllocation(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!selectedAnnual || !isManager) return

    setError('')
    setMessage('')

    if (selectedAnnual.is_locked) {
      setError('This annual target is locked.')
      return
    }

    const quarter = selectedQuarters.find(
      (item) =>
        item.id === allocationForm.quarterly_target_id
    )

    if (!quarter) {
      setError('Select a quarter.')
      return
    }

    if (!allocationForm.employee_id) {
      setError('Select a PSE team member.')
      return
    }

    const percentage = Number(
      allocationForm.allocation_percentage
    )

    if (
      allocationForm.allocation_percentage.trim() === '' ||
      !Number.isFinite(percentage) ||
      percentage <= 0 ||
      percentage > 100
    ) {
      setError('Percentage must be greater than 0 and at most 100.')
      return
    }

    const usedPercentage = quarterPercentage(quarter.id)

    if (
      round2(usedPercentage + percentage) > 100
    ) {
      setError(
        `This quarter already has ${usedPercentage}% allocated.`
      )
      return
    }

    const duplicate = selectedAllocations.some(
      (allocation) =>
        allocation.quarterly_target_id === quarter.id &&
        allocation.employee_id ===
          allocationForm.employee_id &&
        allocation.target_vertical ===
          allocationForm.target_vertical
    )

    if (duplicate) {
      setError(
        'An allocation already exists for this employee, quarter, and vertical.'
      )
      return
    }

    const allocatedAmount = round2(
      (Number(quarter.target_amount) * percentage) / 100
    )

    if (allocatedAmount <= 0) {
      setError(
        'The calculated amount must be greater than zero.'
      )
      return
    }

    setSaving(true)

    try {
      const { error: insertError } =
        await supabase
          .from('target_allocations')
          .insert({
            quarterly_target_id: quarter.id,
            employee_id: allocationForm.employee_id,
            target_vertical:
              allocationForm.target_vertical,
            allocation_percentage: percentage,
            target_amount: allocatedAmount,
          })

      if (insertError) throw insertError

      setAllocationForm((previous) => ({
        ...previous,
        employee_id: '',
        allocation_percentage: '',
      }))

      setMessage('Target allocation created successfully.')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create allocation.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Locks the annual target after allocation.
  async function handleLockAnnual() {
    if (!selectedAnnual || !isManager) return

    setError('')
    setMessage('')

    if (selectedAnnual.is_locked) return

    if (selectedQuarters.length !== 4) {
      setError('Create all four quarterly targets first.')
      return
    }

    if (
      toCents(totalQuarterly) !==
      toCents(Number(selectedAnnual.target_amount))
    ) {
      setError('Quarterly totals do not match the annual target.')
      return
    }

    for (const quarter of selectedQuarters) {
      const percent = quarterPercentage(quarter.id)

      if (
        Number(quarter.target_amount) > 0 &&
        Math.abs(percent - 100) > 0.001
      ) {
        setError(
          `Q${quarter.quarter} is ${percent}% allocated. It must reach 100% before locking.`
        )
        return
      }

      const allocatedAmount = selectedAllocations
        .filter(
          (allocation) =>
            allocation.quarterly_target_id === quarter.id
        )
        .reduce(
          (sum, allocation) =>
            sum + Number(allocation.target_amount),
          0
        )

      if (
        toCents(allocatedAmount) !==
        toCents(Number(quarter.target_amount))
      ) {
        setError(
          `Q${quarter.quarter} allocated amounts do not equal its target. Check percentage rounding.`
        )
        return
      }
    }

    const confirmed = window.confirm(
      `Lock the target for fiscal year ${selectedAnnual.fiscal_year}? This interface will not permit further changes after locking.`
    )

    if (!confirmed) return

    setSaving(true)

    try {
      const { data, error: updateError } =
        await supabase
          .from('annual_targets')
          .update({ is_locked: true })
          .eq('id', selectedAnnual.id)
          .eq('is_locked', false)
          .select('id')
          .maybeSingle()

      if (updateError) throw updateError

      if (!data) {
        throw new Error(
          'Could not lock this target. It may already be locked or your account may lack permission.'
        )
      }

      setMessage('Annual target locked successfully.')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to lock annual target.'
      )
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900'

  const buttonClass =
    'rounded-lg bg-green-700 px-4 py-2.5 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50'

  return (
  <div className="jaago-module space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Fundraising Targets
          </h1>
          <p className="mt-2 text-gray-600">
            Manage annual, quarterly, employee, and vertical targets.
          </p>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={() => setShowAnnualForm(!showAnnualForm)}
            className={buttonClass}
          >
            + Create Annual Target
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

      {loading && (
        <p className="text-gray-500">
          Loading target information...
        </p>
      )}

      {/* Annual Target Creation */}
      {showAnnualForm && isManager && (
        <form
          onSubmit={handleCreateAnnual}
          className="rounded-xl border bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-xl font-semibold">
            Create Annual Target
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-medium">
                Fiscal Year
              </span>
              <input
                type="number"
                min="2000"
                max="2100"
                required
                value={annualForm.fiscal_year}
                onChange={(e) =>
                  setAnnualForm((previous) => ({
                    ...previous,
                    fiscal_year: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium">
                Annual Target Amount
              </span>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={annualForm.target_amount}
                onChange={(e) =>
                  setAnnualForm((previous) => ({
                    ...previous,
                    target_amount: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium">
                Currency
              </span>
              <select
                value={annualForm.currency}
                onChange={(e) =>
                  setAnnualForm((previous) => ({
                    ...previous,
                    currency: e.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="BDT">BDT</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className={buttonClass}
            >
              {saving ? 'Saving...' : 'Create Annual Target'}
            </button>

            <button
              type="button"
              onClick={() => setShowAnnualForm(false)}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Year Selection */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">
          Select Fiscal Year
        </h2>

        <select
          value={selectedYearId}
          onChange={(e) => {
            setSelectedYearId(e.target.value)
            setAllocationForm({
              quarterly_target_id: '',
              employee_id: '',
              target_vertical: 'DSP',
              allocation_percentage: '',
            })
            setError('')
            setMessage('')
          }}
          className={inputClass}
        >
          {annualTargets.length === 0 && (
            <option value="">No annual targets found</option>
          )}

          {annualTargets.map((target) => (
            <option key={target.id} value={target.id}>
              FY {target.fiscal_year}
              {target.is_locked ? ' — Locked' : ' — Draft'}
            </option>
          ))}
        </select>
      </section>

      {selectedAnnual && (
        <>
          {/* Annual Summary */}
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Annual Fundraising Target
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {money(
                  selectedAnnual.target_amount,
                  selectedAnnual.currency
                )}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Total Quarterly Targets
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {money(
                  totalQuarterly,
                  selectedAnnual.currency
                )}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Configuration Status
              </p>
              <p className="mt-2 text-xl font-bold">
                {selectedAnnual.is_locked
                  ? 'Locked'
                  : 'Draft'}
              </p>
            </div>
          </section>

          {/* Quarterly Setup */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold">
              Quarterly Target Distribution
            </h2>

            <p className="mb-5 text-sm text-gray-600">
              Allocate the annual target across four quarters.
              Different quarters may receive different amounts.
            </p>

            {selectedQuarters.length === 0 &&
            isManager &&
            !selectedAnnual.is_locked ? (
              <form onSubmit={handleCreateQuarters}>
                <div className="grid gap-4 sm:grid-cols-4">
                  {quarterAmounts.map((amount, index) => (
                    <label key={index}>
                      <span className="mb-1 block text-sm font-medium">
                        Quarter {index + 1}
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) =>
                          setQuarterAmounts((previous) =>
                            previous.map((value, i) =>
                              i === index
                                ? e.target.value
                                : value
                            )
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-5 space-y-2">
                  <p className="text-sm">
                    Annual Target:{' '}
                    <strong>
                      {money(
                        selectedAnnual.target_amount,
                        selectedAnnual.currency
                      )}
                    </strong>
                  </p>

                  <p className="text-sm">
                    Entered Quarterly Total:{' '}
                    <strong>
                      {money(
                        quarterlyFormTotal,
                        selectedAnnual.currency
                      )}
                    </strong>
                  </p>

                  <p className="text-sm">
                    Remaining:{' '}
                    <strong>
                      {money(
                        round2(
                          selectedAnnual.target_amount -
                            quarterlyFormTotal
                        ),
                        selectedAnnual.currency
                      )}
                    </strong>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className={`mt-5 ${buttonClass}`}
                >
                  {saving
                    ? 'Saving...'
                    : 'Save All Four Quarterly Targets'}
                </button>
              </form>
            ) : selectedQuarters.length === 0 ? (
              <p className="text-gray-500">
                Quarterly targets have not been configured.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-4">
                {selectedQuarters.map((quarter) => {
                  const percent = quarterPercentage(quarter.id)

                  return (
                    <div
                      key={quarter.id}
                      className="rounded-lg border p-4"
                    >
                      <p className="font-semibold">
                        Q{quarter.quarter}
                      </p>

                      <p className="mt-2 text-lg font-bold">
                        {money(
                          quarter.target_amount,
                          selectedAnnual.currency
                        )}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        Allocated: {percent}%
                      </p>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-green-700"
                          style={{
                            width: `${Math.min(percent, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Employee Allocation */}
          {selectedQuarters.length === 4 && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-xl font-semibold">
                Employee and Vertical Allocation
              </h2>

              <p className="mb-5 text-sm text-gray-600">
                Allocate quarterly targets to PSE team members
                and fundraising verticals.
              </p>

              {isManager && !selectedAnnual.is_locked && (
                <form
                  onSubmit={handleCreateAllocation}
                  className="mb-6 rounded-lg border bg-gray-50 p-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-sm font-medium">
                        Quarter *
                      </span>

                      <select
                        required
                        className={inputClass}
                        value={
                          allocationForm.quarterly_target_id
                        }
                        onChange={(e) =>
                          setAllocationForm((previous) => ({
                            ...previous,
                            quarterly_target_id:
                              e.target.value,
                          }))
                        }
                      >
                        <option value="">
                          Select Quarter
                        </option>

                        {selectedQuarters.map((quarter) => (
                          <option
                            key={quarter.id}
                            value={quarter.id}
                            disabled={
                              Number(quarter.target_amount) <= 0 ||
                              quarterPercentage(quarter.id) >= 100
                            }
                          >
                            Q{quarter.quarter} —{' '}
                            {money(
                              quarter.target_amount,
                              selectedAnnual.currency
                            )}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="mb-1 block text-sm font-medium">
                        PSE Team Member *
                      </span>

                      <select
                        required
                        className={inputClass}
                        value={allocationForm.employee_id}
                        onChange={(e) =>
                          setAllocationForm((previous) => ({
                            ...previous,
                            employee_id: e.target.value,
                          }))
                        }
                      >
                        <option value="">
                          Select Employee
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

                    <label>
                      <span className="mb-1 block text-sm font-medium">
                        Target Vertical *
                      </span>

                      <select
                        className={inputClass}
                        value={
                          allocationForm.target_vertical
                        }
                        onChange={(e) =>
                          setAllocationForm((previous) => ({
                            ...previous,
                            target_vertical: e.target.value,
                          }))
                        }
                      >
                        {verticals.map((vertical) => (
                          <option
                            key={vertical}
                            value={vertical}
                          >
                            {vertical}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="mb-1 block text-sm font-medium">
                        Allocation Percentage *
                      </span>

                      <input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        required
                        className={inputClass}
                        value={
                          allocationForm.allocation_percentage
                        }
                        onChange={(e) =>
                          setAllocationForm((previous) => ({
                            ...previous,
                            allocation_percentage:
                              e.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  {selectedAllocationQuarter && (
                    <div className="mt-4 text-sm text-gray-700">
                      <p>
                        Already allocated:{' '}
                        {quarterPercentage(
                          selectedAllocationQuarter.id
                        )}%
                      </p>

                      <p>
                        New allocation amount:{' '}
                        <strong>
                          {money(
                            round2(
                              Number(
                                selectedAllocationQuarter.target_amount
                              ) *
                                (Number(
                                  allocationForm.allocation_percentage
                                ) || 0) /
                                100
                            ),
                            selectedAnnual.currency
                          )}
                        </strong>
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className={`mt-5 ${buttonClass}`}
                  >
                    {saving
                      ? 'Saving...'
                      : 'Add Employee Allocation'}
                  </button>
                </form>
              )}

              <h3 className="mb-3 font-semibold">
                Existing Allocations
              </h3>

              {selectedAllocations.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No employee allocations found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[750px] text-left text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        {[
                          'Quarter',
                          'Employee',
                          'Vertical',
                          'Percentage',
                          'Target Amount',
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {selectedAllocations.map(
                        (allocation) => {
                          const quarter =
                            selectedQuarters.find(
                              (item) =>
                                item.id ===
                                allocation.quarterly_target_id
                            )

                          return (
                            <tr key={allocation.id}>
                              <td className="px-4 py-3">
                                Q{quarter?.quarter ?? '?'}
                              </td>

                              <td className="px-4 py-3">
                                {employeeNames.get(
                                  allocation.employee_id
                                ) || allocation.employee_id}
                              </td>

                              <td className="px-4 py-3">
                                {allocation.target_vertical}
                              </td>

                              <td className="px-4 py-3">
                                {allocation.allocation_percentage}%
                              </td>

                              <td className="px-4 py-3">
                                {money(
                                  allocation.target_amount,
                                  selectedAnnual.currency
                                )}
                              </td>
                            </tr>
                          )
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Lock Target */}
          {isManager &&
            !selectedAnnual.is_locked &&
            selectedQuarters.length === 4 && (
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">
                  Finalize Annual Target
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Confirm that all four quarters are fully
                  allocated before locking this target.
                </p>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleLockAnnual()}
                  className={`mt-4 ${buttonClass}`}
                >
                  {saving
                    ? 'Processing...'
                    : 'Lock Annual Target'}
                </button>
              </section>
            )}

          {selectedAnnual.is_locked && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
              This annual target is locked and displayed
              in read-only mode.
            </div>
          )}
        </>
      )}

      {!loading && annualTargets.length === 0 && (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No annual targets found.
          {isManager
            ? ' Create your first annual target to begin.'
            : ' An authorized manager must create one.'}
        </div>
      )}
    </div>
  )
}
