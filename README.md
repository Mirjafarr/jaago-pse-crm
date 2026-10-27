
# JAAGO Foundation — Private Sector Engagement CRM

### Technical Assessment | CRM & Fundraising Management System

A web-based Customer Relationship Management (CRM) system developed as a technical assessment for the Private Sector Engagement (PSE) team at JAAGO Foundation.

The application centralizes partner contacts, fundraising opportunities, meetings, engagement activities, confirmed financial achievements, and fundraising target management.

**Repository:** https://github.com/Mirjafarr/jaago-pse-crm

## 1. Project Overview

The JAAGO PSE CRM is designed to support private sector partnership management through a centralized, role-aware platform.

It enables the PSE team to:

- Maintain partner and stakeholder contact records.
- Track fundraising opportunities through pipeline stages.
- Record meetings and engagement activities.
- Monitor confirmed financial contributions.
- Configure annual and quarterly fundraising targets.
- Allocate targets by employee and fundraising vertical.
- Review performance through an interactive dashboard.

The project emphasizes clarity, financial reporting accuracy, and practical workflows for an organizational fundraising team.

## 2. Technology Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | Application framework and routing |
| React 19 | User interface |
| TypeScript | Type-safe development |
| Tailwind CSS 4 | Responsive styling |
| Supabase PostgreSQL | Relational database |
| Supabase Auth | Email/password authentication |
| Supabase SSR | Session integration |
| PostgreSQL RLS | Database-level access control |
| Lucide React | Interface icons |

## 3. Core Features

### 3.1 Contact Management

- Create and manage organizational and individual contacts.
- Store organization, designation, industry, email, and phone information.
- Search and edit existing records.
- Delete contacts where permitted by database policies.
- Associate contacts with fundraising opportunities.

### 3.2 Opportunity Management

- Create and edit fundraising opportunities.
- Assign PSE focal persons.
- Link opportunities to existing contacts.
- Create a contact directly within the opportunity form.
- Track opportunities using configurable pipeline stages.
- Record financial and valued in-kind contribution types.
- Store expected amounts, currency, closing dates, and supporting links.
- Search and filter by pipeline stage.

### 3.3 Meeting Management

- Schedule and track meetings with partners or prospective donors.
- Associate meetings with contacts and opportunities.
- Assign responsible team members.
- Record meeting status and related details.
- Search, review, and update meeting records.

### 3.4 Activity Management

- Track PSE engagement activities and operational work.
- Record tasks, calls, emails, visits, campaigns, proposals, events, and stewardship activities.
- Associate activities with contacts, opportunities, and meetings.
- Organize activities by group, type, and status.
- Search and filter activity records.

### 3.5 Financial Achievements

- Record confirmed monetary contributions.
- Link realized contributions to opportunities.
- Store contribution dates, confirmation references, and notes.
- Associate contributions with responsible employees.
- Restrict achievement creation to authorized managerial roles.
- Preserve achievement records for reporting and accountability.

### 3.6 Fundraising Target Management

- Define annual fundraising targets.
- Distribute annual targets across four quarters.
- Support uneven quarterly allocations.
- Allocate targets by employee and fundraising vertical.
- Track allocation percentages and target amounts.
- Lock target configurations to prevent unauthorized changes.

### 3.7 Management Dashboard

The dashboard provides reporting on:

- Contacts, opportunities, meetings, and activities.
- Annual fundraising targets.
- Quarterly target distribution.
- Confirmed financial achievements.
- Remaining amounts against targets.
- Employee-level fundraising performance.
- Vertical-level fundraising performance.
- Opportunity pipeline stages.
- Engagement activity summaries.

## 4. Financial Reporting Logic

The CRM distinguishes between potential fundraising opportunities and confirmed contributions.

### Expected Opportunity Value

An opportunity's expected amount represents potential fundraising value.

This amount is used for pipeline visibility and forecasting.

### Realized Achievement

A realized achievement represents a confirmed monetary contribution.

Only confirmed realized contributions are included in actual fundraising achievement calculations.

### Target Achievement

The fundamental calculation is:

```text
Achievement Percentage =
(Confirmed Realized Contributions / Fundraising Target) × 100
```

```text
Remaining Target =
Fundraising Target - Confirmed Realized Contributions
```

This separation prevents anticipated donations from being incorrectly counted as received fundraising.

Financial reporting is based on contribution dates and relevant target allocation periods.

## 5. Access Control

The application uses Supabase Authentication and PostgreSQL Row-Level Security (RLS).

### PSE Manager

Managerial access includes:

- Accessing operational CRM records.
- Recording confirmed financial contributions.
- Creating and configuring fundraising targets.
- Assigning quarterly, employee, and vertical targets.
- Reviewing performance reporting.

### PSE Member

Team member access includes:

- Working with permitted CRM records.
- Managing assigned and shared operational activities where authorized.
- Viewing fundraising achievements and reporting.
- Accessing permitted fundraising target information.

The database enforces permissions through RLS policies.

Frontend restrictions are not treated as substitutes for database authorization.

## 6. System Architecture

```text
          PSE Manager / PSE Member
                    |
                    v
          Next.js Web Application
                    |
          +---------+---------+
          |                   |
          v                   v
    Supabase Auth       Supabase Client
          |                   |
          +---------+---------+
                    |
                    v
          PostgreSQL Database
                    |
                    v
           Row-Level Security
                    |
                    v
          CRM Data and Reporting
```

### Main Modules

```text
Contacts
   |
   v
Opportunities
   |
   +----> Meetings
   |
   +----> Activities
   |
   +----> Confirmed Achievements
                    |
                    v
           Fundraising Dashboard

Annual Targets
   |
   v
Quarterly Targets
   |
   v
Employee / Vertical Allocations
   |
   v
Fundraising Dashboard
```

## 7. Project Structure

```text
jaago-pse-crm/
|
|-- app/
|   |-- achievements/
|   |-- activities/
|   |-- contacts/
|   |-- login/
|   |-- meetings/
|   |-- opportunities/
|   |-- targets/
|   |-- globals.css
|   |-- layout.tsx
|   `-- page.tsx
|
|-- components/
|   |-- AppShell.tsx
|   |-- LogoutButton.tsx
|   `-- Sidebar.tsx
|
|-- lib/
|   |-- supabase/
|   |   |-- client.ts
|   |   |-- proxy.ts
|   |   `-- server.ts
|   `-- supabase.ts
|
|-- public/
|-- proxy.ts
|-- package.json
|-- package-lock.json
`-- README.md
```

## 8. Local Installation

### Prerequisites

- Node.js and npm
- Git
- A configured Supabase project
- Authorized Supabase user accounts

### Clone the Repository

```bash
git clone https://github.com/Mirjafarr/jaago-pse-crm.git
cd jaago-pse-crm
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use credentials belonging to your own configured Supabase project.

Never commit `.env.local`, service-role keys, or database passwords.

**Database setup note:** Application tables, policies, target-lock triggers, and authorized test accounts must already be configured in Supabase. The database schema is not automatically provisioned by cloning this repository.

### Start the Development Server

```bash
npm run dev
```

Open:

http://localhost:3000

Sign in with an authorized PSE account.

### Production Build

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

## 9. Database Overview

The main data entities include:

| Entity | Purpose |
|--------|---------|
| profiles | PSE employee profiles and roles |
| contacts | Partner and stakeholder records |
| opportunities | Fundraising pipeline |
| pipeline_stages | Opportunity stages |
| meetings | Partner meeting records |
| activities | Operational and engagement activities |
| achievements | Confirmed financial contributions |
| annual_targets | Annual fundraising goals |
| quarterly_targets | Quarterly target distribution |
| target_allocations | Employee and vertical allocations |

Relationships are maintained through database identifiers.

Employee names are displayed in the UI while UUIDs remain available internally for relationships and authorization.

## 10. UI and User Experience

The application includes:

- JAAGO-inspired yellow and charcoal branding.
- Responsive sidebar navigation.
- Dedicated login experience.
- Searchable CRM directories.
- Add and edit forms.
- Financial KPI cards.
- Status indicators.
- Target progress visualization.
- Responsive layouts.

## 11. Testing

The core CRM workflows were manually tested during development.

Functional testing covered:

- Email/password sign-in.
- Contact create, edit, search, and delete operations.
- Opportunity creation, assignment, stage changes, and editing.
- Meeting creation and updates.
- Activity creation and updates.
- Confirmed achievement recording.
- Annual and quarterly target reporting.
- Target locking behavior.
- Manager/member permission restrictions.
- Dashboard financial calculations.
- Employee-name display.

Testing was carried out using development/test records.

This section documents manual functional verification, not a claim of automated test-suite coverage or a third-party security audit.

## 12. Scope and Limitations

### Odoo Data Migration

Historical Odoo data migration remains pending.

The existing Odoo export, source database access, or approved migration dataset was not available during development.

The application was therefore implemented and tested using development records.

Completing migration requires:

1. Access to authorized Odoo exports.
2. Field mapping between Odoo and the CRM schema.
3. Data cleaning and validation.
4. Controlled import into Supabase.
5. Post-migration reconciliation.

### Other Scope Decisions

- Google Drive/document URLs are used instead of implementing file uploads.
- Automated email synchronization is not included.
- Events are handled within engagement activities rather than as a separate module.
- Opportunities' expected amounts are not counted as confirmed financial achievements.
- Certain deletion and modification operations are intentionally restricted by database policies.

## 13. Deployment

The application is structured for deployment to a Next.js-compatible hosting platform.

Deployment requires:

- Production environment variables.
- A configured Supabase project.
- Database schema and RLS policies.
- Authorized PSE accounts.
- Validation of production permissions and financial reporting.

A public source repository does not grant anonymous access to protected CRM data.

**Live application:** Not yet published.

## 14. Assessment Summary

This implementation demonstrates:

- Full-stack application development.
- Relational CRM data modeling.
- Supabase authentication integration.
- Database-enforced role-based access.
- Fundraising pipeline management.
- Financial achievement separation.
- Annual and quarterly target allocation.
- Multi-module operational reporting.
- Responsive UI design.
- Practical testing of business workflows.

The project is submitted as a technical assessment implementation, with historical Odoo migration dependent on access to the source data.

---

**Project:** JAAGO Foundation Private Sector Engagement CRM

**Purpose:** Technical Assessment

**Repository:** https://github.com/Mirjafarr/jaago-pse-crm
