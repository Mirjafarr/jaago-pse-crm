
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AnnualTarget = {
  id: string
  fiscal_year: number
  target_amount: number
  currency: string
  is_locked: boolean
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
  target_amount: number
}

type Opportunity = {
  id: string
  deal_name: string
  expected_amount: number
  currency: string
  stage_id: string | null
  owner_id: string | null
  created_at: string
}

type Stage = {
  id: string
  name: string
  sort_order: number
  is_won: boolean
  is_lost: boolean
}

type Achievement = {
  id: string
  opportunity_id: string | null
  owner_id: string | null
  contribution_date: string
  realized_amount: number
  currency: string
  confirmed_at: string | null
}

type Meeting = {
  id: string
  status: string
  meeting_at: string
  owner_id: string | null
}

type Activity = {
  id: string
  activity_type: string
  activity_group: string
  status: string
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
  owner_id: string | null
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
}

const groupNames: Record<string, string> = {
  stewardship: 'Donor Stewardship',
  prospect_engagement: 'Potential Donor Engagement',
  independent: 'Independent / General Work',
}

const typeNames: Record<string, string> = {
  task: 'Tasks',
  email: 'Emails',
  call: 'Calls',
  meeting: 'Meeting Activities',
  event: 'Events',
  campaign: 'Campaigns',
  proposal: 'Proposals',
  visit: 'Visits',
  stewardship: 'Donor Servicing',
  prospect_engagement: 'Prospect Engagement',
  general: 'General Activities',
}

function formatMoney(value: number, currency: string) {
  return `${currency.trim()} ${value.toLocaleString('en-BD', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function yearOf(date: string | null) {
  if (!date) return null
  const year = Number(date.slice(0, 4))
  return Number.isInteger(year) ? year : null
}

function quarterOf(date: string) {
  const month = Number(date.slice(5, 7))
  if (month < 1 || month > 12) return null
  return Math.ceil(month / 3)
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string
  value: string | number
  description: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-3 break-words text-2xl font-bold text-gray-900">
        {value}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        {description}
      </p>
    </div>
  )
}

function ProgressBar({
  value,
  color = 'bg-green-700',
}: {
  value: number
  color?: string
}) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className={`h-full rounded-full ${color}`}
        style={{
          width: `${Math.max(0, Math.min(value, 100))}%`,
        }}
      />
    </div>
  )
}

export default function Home() {
  const [supabase] = useState(() => createClient())

  const [contactsCount, setContactsCount] = useState(0)
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [annualTargets, setAnnualTargets] =
    useState<AnnualTarget[]>([])
  const [quarterlyTargets, setQuarterlyTargets] =
    useState<QuarterlyTarget[]>([])
  const [allocations, setAllocations] =
    useState<Allocation[]>([])
  const [achievements, setAchievements] =
    useState<Achievement[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [
        contactsResult,
        opportunitiesResult,
        stagesResult,
        meetingsResult,
        activitiesResult,
        annualResult,
        quarterlyResult,
        allocationsResult,
        achievementsResult,
        profilesResult,
      ] = await Promise.all([
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('opportunities')
          .select(
            'id, deal_name, expected_amount, currency, stage_id, owner_id, created_at'
          ),

        supabase
          .from('pipeline_stages')
          .select('id, name, sort_order, is_won, is_lost')
          .order('sort_order'),

        supabase
          .from('meetings')
          .select('id, status, meeting_at, owner_id'),

        supabase
          .from('activities')
          .select(
            'id, activity_type, activity_group, status, scheduled_at, completed_at, created_at, owner_id'
          ),

        supabase
          .from('annual_targets')
          .select(
            'id, fiscal_year, target_amount, currency, is_locked'
          ),

        supabase
          .from('quarterly_targets')
          .select(
            'id, annual_target_id, quarter, target_amount'
          ),

        supabase
          .from('target_allocations')
          .select(
            'id, quarterly_target_id, employee_id, target_vertical, target_amount'
          ),

        supabase
          .from('achievements')
          .select(
            'id, opportunity_id, owner_id, contribution_date, realized_amount, currency, confirmed_at'
          ),

        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('department', 'PSE')
          .eq('is_active', true),
      ])

      const failures = [
        ['Contacts', contactsResult.error],
        ['Opportunities', opportunitiesResult.error],
        ['Pipeline stages', stagesResult.error],
        ['Meetings', meetingsResult.error],
        ['Activities', activitiesResult.error],
        ['Annual targets', annualResult.error],
        ['Quarterly targets', quarterlyResult.error],
        ['Allocations', allocationsResult.error],
        ['Achievements', achievementsResult.error],
        ['Profiles', profilesResult.error],
      ]
        .filter((item) => item[1])
        .map(
          (item) =>
            `${item[0]}: ${(item[1] as { message: string }).message}`
        )

      if (failures.length > 0) {
        setError(
          `Some dashboard data could not be loaded: ${failures.join(' | ')}`
        )
        setLoaded(false)
        return
      }

      setContactsCount(contactsResult.count ?? 0)
      setOpportunities(
        (opportunitiesResult.data ?? []) as Opportunity[]
      )
      setStages((stagesResult.data ?? []) as Stage[])
      setMeetings((meetingsResult.data ?? []) as Meeting[])
      setActivities((activitiesResult.data ?? []) as Activity[])
      setAnnualTargets(
        (annualResult.data ?? []) as AnnualTarget[]
      )
      setQuarterlyTargets(
        (quarterlyResult.data ?? []) as QuarterlyTarget[]
      )
      setAllocations(
        (allocationsResult.data ?? []) as Allocation[]
      )
      setAchievements(
        (achievementsResult.data ?? []) as Achievement[]
      )
      setProfiles((profilesResult.data ?? []) as Profile[])

      setLoaded(true)
    } catch (err) {
      setLoaded(false)
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.'
      )
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
  setSelectedYear(new Date().getFullYear())
  void loadDashboard()
}, [loadDashboard])

  const annualTarget = annualTargets.find(
    (target) => target.fiscal_year === selectedYear
  )

  const currency = annualTarget?.currency.trim() ?? 'BDT'

  const currentQuarters = quarterlyTargets
    .filter(
      (quarter) =>
        quarter.annual_target_id === annualTarget?.id
    )
    .sort((a, b) => a.quarter - b.quarter)

  const currentQuarterIds = new Set(
    currentQuarters.map((quarter) => quarter.id)
  )

  const currentAllocations = allocations.filter(
    (allocation) =>
      currentQuarterIds.has(
        allocation.quarterly_target_id
      )
  )

  // Only confirmed monetary contributions in the selected year.
  const confirmedAchievements = achievements.filter(
    (achievement) =>
      achievement.confirmed_at !== null &&
      yearOf(achievement.contribution_date) === selectedYear
  )

  // Currency must match the annual target.
  // We do not sum BDT and USD directly.
  const matchingAchievements = confirmedAchievements.filter(
    (achievement) =>
      achievement.currency.trim().toUpperCase() ===
      currency.toUpperCase()
  )

  const excludedAchievements = confirmedAchievements.filter(
    (achievement) =>
      achievement.currency.trim().toUpperCase() !==
      currency.toUpperCase()
  )

  const annualAmount = Number(annualTarget?.target_amount ?? 0)

  const achievedAmount = sum(
    matchingAchievements.map(
      (achievement) => Number(achievement.realized_amount)
    )
  )

  const achievementPercentage =
    annualAmount > 0
      ? (achievedAmount / annualAmount) * 100
      : 0

  const remainingAmount = Math.max(
    annualAmount - achievedAmount,
    0
  )

  const overachievedAmount = Math.max(
    achievedAmount - annualAmount,
    0
  )

  // Pipeline reporting uses all visible opportunities.
  // Financial pipeline totals only include the selected currency.
  const comparableOpportunities = opportunities.filter(
    (opportunity) =>
      opportunity.currency.trim().toUpperCase() ===
      currency.toUpperCase()
  )

  const totalPipelineValue = sum(
    comparableOpportunities.map(
      (opportunity) => Number(opportunity.expected_amount)
    )
  )

  const stageById = new Map(
    stages.map((stage) => [stage.id, stage])
  )

  const wonOpportunities = opportunities.filter(
    (opportunity) =>
      stageById.get(opportunity.stage_id ?? '')?.is_won === true
  )

  const lostOpportunities = opportunities.filter(
    (opportunity) =>
      stageById.get(opportunity.stage_id ?? '')?.is_lost === true
  )

  const openOpportunities = opportunities.filter(
    (opportunity) => {
      const stage = stageById.get(opportunity.stage_id ?? '')
      return stage && !stage.is_won && !stage.is_lost
    }
  )

  const yearMeetings = meetings.filter(
    (meeting) => yearOf(meeting.meeting_at) === selectedYear
  )

  // Count activity work completed during the selected year.
  // Other activities are grouped by their creation year.
  const yearActivities = activities.filter((activity) => {
    const relevantDate =
      activity.status === 'done' && activity.completed_at
        ? activity.completed_at
        : activity.created_at

    return yearOf(relevantDate) === selectedYear
  })

  const completedActivities = yearActivities.filter(
    (activity) => activity.status === 'done'
  )

  const completedMeetings = yearMeetings.filter(
    (meeting) => meeting.status === 'done'
  )

  const quarterlyPerformance = [1, 2, 3, 4].map(
    (quarterNumber) => {
      const target = currentQuarters.find(
        (item) => item.quarter === quarterNumber
      )

      const actual = sum(
        matchingAchievements
          .filter(
            (achievement) =>
              quarterOf(achievement.contribution_date) ===
              quarterNumber
          )
          .map(
            (achievement) =>
              Number(achievement.realized_amount)
          )
      )

      const targetAmount = Number(target?.target_amount ?? 0)

      return {
        quarter: quarterNumber,
        target: targetAmount,
        actual,
        hasTarget: Boolean(target),
        percentage:
          targetAmount > 0
            ? (actual / targetAmount) * 100
            : 0,
      }
    }
  )

  const groupSummary = Object.entries(groupNames).map(
    ([key, label]) => ({
      key,
      label,
      count: yearActivities.filter(
        (activity) => activity.activity_group === key
      ).length,
    })
  )

  const activityTypeSummary = Object.entries(typeNames)
    .map(([key, label]) => ({
      key,
      label,
      count: yearActivities.filter(
        (activity) => activity.activity_type === key
      ).length,
    }))
    .filter((item) => item.count > 0)

  const employeeNames = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.full_name || profile.email || profile.id,
    ])
  )

  const employeeSummary = profiles.map((profile) => ({
    id: profile.id,
    name:
      profile.full_name ||
      profile.email ||
      profile.id,
    achieved: sum(
      matchingAchievements
        .filter(
          (achievement) =>
            achievement.owner_id === profile.id
        )
        .map(
          (achievement) =>
            Number(achievement.realized_amount)
        )
    ),
    activities: yearActivities.filter(
      (activity) => activity.owner_id === profile.id
    ).length,
    meetings: yearMeetings.filter(
      (meeting) => meeting.owner_id === profile.id
    ).length,
  }))

  const verticalSummary = Array.from(
    new Set([
      'DSP',
      'VBD',
      'Project',
      ...currentAllocations.map(
        (allocation) => allocation.target_vertical
      ),
    ])
  ).map((vertical) => ({
    vertical,
    target: sum(
      currentAllocations
        .filter(
          (allocation) =>
            allocation.target_vertical === vertical
        )
        .map(
          (allocation) => Number(allocation.target_amount)
        )
    ),
  }))

  const availableYears = Array.from(
  new Set([
    ...(selectedYear !== null ? [selectedYear] : []),
    ...annualTargets.map((target) => target.fiscal_year),
    ...achievements
      .map((achievement) => yearOf(achievement.contribution_date))
      .filter((year): year is number => year !== null),
  ])
).sort((a, b) => b - a)

  return (
  <div className="dashboard-premium space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-green-700">
            JAAGO Foundation
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            PSE CRM Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            Fundraising and engagement performance overview
          </p>
        </div>

        <div className="flex gap-2">
          <select
            aria-label="Select reporting year"
            value={selectedYear ?? ''}
            onChange={(e) =>
              setSelectedYear(Number(e.target.value))
            }
            className="rounded-lg border border-gray-300 bg-white px-4 py-2"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                FY {year}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="rounded-lg border border-green-700 px-4 py-2 font-medium text-green-800 hover:bg-green-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {loading && (
        <p className="text-gray-500">
          Loading dashboard data...
        </p>
      )}

      {!loading && loaded && (
        <>
          {/* Main CRM Statistics */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Contacts"
              value={contactsCount}
              description="Registered CRM contacts"
            />

            <StatCard
              title="Opportunities"
              value={opportunities.length}
              description="All visible pipeline opportunities"
            />

            <StatCard
              title="Meetings"
              value={yearMeetings.length}
              description={`${completedMeetings.length} completed in selected year`}
            />

            <StatCard
              title="Activities"
              value={yearActivities.length}
              description={`${completedActivities.length} completed in selected year`}
            />
          </section>

          {/* Monetary Fundraising */}
          <section className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Monetary Fundraising Performance
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Confirmed achievements and fundraising targets
              </p>
            </div>

            {!annualTarget && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                No annual target exists for FY {selectedYear}.
                Confirmed contributions can still be viewed,
                but target attainment cannot be calculated.
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Annual Target"
                value={
                  annualTarget
                    ? formatMoney(annualAmount, currency)
                    : 'Not set'
                }
                description={`FY ${selectedYear} fundraising goal`}
              />

              <StatCard
                title="Confirmed Achievement"
                value={formatMoney(
                  achievedAmount,
                  currency
                )}
                description="Confirmed contributions in the selected year"
              />

              <StatCard
                title="Remaining Target"
                value={
                  annualTarget
                    ? formatMoney(
                        remainingAmount,
                        currency
                      )
                    : 'N/A'
                }
                description="Amount required to reach the target"
              />

              <StatCard
                title="Overachievement"
                value={
                  annualTarget
                    ? formatMoney(
                        overachievedAmount,
                        currency
                      )
                    : 'N/A'
                }
                description="Amount above the assigned annual target"
              />
            </div>

            {annualTarget && (
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Annual Target Achievement
                  </h3>

                  <span className="text-xl font-bold text-green-800">
                    {achievementPercentage.toFixed(1)}%
                  </span>
                </div>

                <ProgressBar value={achievementPercentage} />

                <p className="mt-3 text-sm text-gray-600">
                  {formatMoney(achievedAmount, currency)}
                  {' '}of{' '}
                  {formatMoney(annualAmount, currency)}
                  {' '}achieved.
                </p>
              </div>
            )}

            {excludedAchievements.length > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                {excludedAchievements.length} confirmed
                contribution(s) use currencies other than{' '}
                {currency}. They are excluded from the
                target comparison because exchange-rate
                conversion is not configured.
              </div>
            )}

            {/* Quarterly Performance */}
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-lg font-semibold">
                Quarterly Target vs Achievement
              </h3>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {quarterlyPerformance.map((item) => (
                  <div
                    key={item.quarter}
                    className="rounded-lg border p-4"
                  >
                    <h4 className="font-semibold">
                      Quarter {item.quarter}
                    </h4>

                    <p className="mt-3 text-sm text-gray-500">
                      Assigned Target
                    </p>

                    <p className="font-medium">
                      {item.hasTarget
                        ? formatMoney(item.target, currency)
                        : 'Not assigned'}
                    </p>

                    <p className="mt-3 text-sm text-gray-500">
                      Confirmed Actual
                    </p>

                    <p className="font-semibold text-green-800">
                      {formatMoney(item.actual, currency)}
                    </p>

                    <div className="mt-4">
                      <ProgressBar
                        value={item.percentage}
                      />
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      {item.hasTarget && item.target > 0
                        ? `${item.percentage.toFixed(1)}% achieved`
                        : 'No positive quarterly target assigned'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pipeline Reporting */}
          <section className="space-y-5">
            <h2 className="text-2xl font-semibold">
              Opportunity Pipeline
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Pipeline Value"
                value={formatMoney(
                  totalPipelineValue,
                  currency
                )}
                description={`Expected amounts in ${currency}, across all visible opportunities`}
              />

              <StatCard
                title="Open Opportunities"
                value={openOpportunities.length}
                description="Not marked Won or Lost"
              />

              <StatCard
                title="Won Opportunities"
                value={wonOpportunities.length}
                description="Deals in a Won stage"
              />

              <StatCard
                title="Lost / Abandoned"
                value={lostOpportunities.length}
                description="Deals in a Lost or Abandoned stage"
              />
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold">
                Pipeline Stage Breakdown
              </h3>

              <div className="space-y-4">
                {stages.map((stage) => {
                  const stageDeals = opportunities.filter(
                    (opportunity) =>
                      opportunity.stage_id === stage.id
                  )

                  const value = sum(
                    stageDeals
                      .filter(
                        (deal) =>
                          deal.currency.trim().toUpperCase() ===
                          currency.toUpperCase()
                      )
                      .map(
                        (deal) => Number(deal.expected_amount)
                      )
                  )

                  const percentage =
                    opportunities.length > 0
                      ? (stageDeals.length /
                          opportunities.length) *
                        100
                      : 0

                  return (
                    <div key={stage.id}>
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-medium">
                          {stage.name}
                        </span>

                        <span className="text-gray-600">
                          {stageDeals.length} deals —{' '}
                          {formatMoney(value, currency)}
                        </span>
                      </div>

                      <ProgressBar value={percentage} />
                    </div>
                  )
                })}
              </div>

              <p className="mt-4 text-xs text-gray-500">
                Pipeline values are forecasts, not realized
                fundraising achievement. Stage reporting
                covers all visible opportunities.
              </p>
            </div>
          </section>

          {/* Non-Monetary Performance */}
          <section className="space-y-5">
            <h2 className="text-2xl font-semibold">
              Non-Monetary Work Performance
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Completed Activities"
                value={completedActivities.length}
                description="Completed PSE work"
              />

              <StatCard
                title="In Progress"
                value={
                  yearActivities.filter(
                    (item) => item.status === 'in_progress'
                  ).length
                }
                description="Currently progressing activities"
              />

              <StatCard
                title="Scheduled Meetings"
                value={
                  yearMeetings.filter(
                    (item) => item.status === 'scheduled'
                  ).length
                }
                description="Meetings scheduled within selected year"
              />

              <StatCard
                title="Completed Meetings"
                value={completedMeetings.length}
                description="Meetings marked Done"
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Group Summary */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="mb-5 text-lg font-semibold">
                  Activity Groups
                </h3>

                <div className="space-y-5">
                  {groupSummary.map((group) => (
                    <div key={group.key}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{group.label}</span>
                        <strong>{group.count}</strong>
                      </div>

                      <ProgressBar
                        value={
                          yearActivities.length > 0
                            ? (group.count /
                                yearActivities.length) *
                              100
                            : 0
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Types */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="mb-5 text-lg font-semibold">
                  Activity Type Breakdown
                </h3>

                {activityTypeSummary.length === 0 ? (
                  <p className="text-gray-500">
                    No activities found for this year.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activityTypeSummary.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between border-b pb-2 text-sm"
                      >
                        <span>{item.label}</span>

                        <span className="font-semibold">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Team Performance */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">
              PSE Team Performance
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    {[
                      'Team Member',
                      'Confirmed Achievement',
                      'Activities',
                      'Meetings',
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
                  {employeeSummary.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-4 py-3 font-medium">
                        {employee.name}
                      </td>

                      <td className="px-4 py-3">
                        {formatMoney(
                          employee.achieved,
                          currency
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {employee.activities}
                      </td>

                      <td className="px-4 py-3">
                        {employee.meetings}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Vertical Target Summary */}
          {annualTarget && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-semibold">
                Fundraising Vertical Targets
              </h2>

              <div className="grid gap-4 sm:grid-cols-3">
                {verticalSummary.map((item) => (
                  <div
                    key={item.vertical}
                    className="rounded-lg border p-5"
                  >
                    <p className="font-semibold">
                      {item.vertical}
                    </p>

                    <p className="mt-3 text-xl font-bold">
                      {formatMoney(
                        item.target,
                        currency
                      )}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      Assigned employee allocations
                      across all four quarters
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="border-t pt-4 text-xs text-gray-500">
            Financial achievement uses confirmed contribution
            records. Amounts are not converted between
            currencies. Reporting periods currently assume
            January–December fiscal years.
          </footer>
        </>
      )}
    </div>
  )
}
