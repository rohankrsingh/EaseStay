# EaseStay

EaseStay is a voice-first PG management platform built with React, Vite, Supabase, and Groq AI. Residents can report issues by text or speech, the app classifies and prioritizes them automatically, owners can manage communities and assign technicians, and workers can update issue status in real time.

## What It Does

EaseStay is designed around three roles:

- Residents raise issues from their dashboard using voice input or plain text.
- PG owners create communities, manage members, review issues, and assign technicians.
- Technicians view assigned work and update issue status as they progress.

The app also includes:

- AI-powered issue categorization and emergency detection.
- Real-time Supabase subscriptions for issue updates and notifications.
- Role-based routing and authentication.
- Community join codes for resident onboarding.
- Optional technician contact details and video-call workflow for issue resolution.

## Tech Stack

- React 19
- Vite 8
- React Router
- Redux Toolkit
- Supabase Auth, Database, and Realtime
- Groq LLaMA 3.1 for issue analysis
- Tailwind CSS 4
- Lucide React icons

## Project Structure

- `src/App.jsx` - session handling and role-based routing
- `src/pages/` - landing page, auth, and role dashboards
- `src/components/` - shared UI such as sidebar and notifications
- `src/lib/supabase.js` - Supabase client setup
- `supabase/schema.sql` - database schema and RLS policies
- `supabase/functions/process-issue/` - backend function scaffolding

## Features

### Resident Experience

- Sign up or sign in with email and password.
- Join a PG community with a join code.
- Submit issue reports by typing or using browser speech recognition.
- Automatically receive AI-generated category, priority, and emergency detection.
- Track issue status and assigned technician details in real time.

### Owner Experience

- Create and manage communities.
- View residents and technicians by community.
- Review incoming issues with priority, category, and status filters.
- Assign or remove technicians from issues.
- Receive emergency alerts and notification badges.
- Open a quick video call for issue coordination.

### Technician Experience

- View issues assigned to the technician account.
- Update each issue between Pending, In Progress, and Resolved.
- Work from a clean dashboard focused on task execution.

## Prerequisites

- Node.js 18 or newer
- A Supabase project
- A Groq API key for AI issue analysis

## Environment Variables

Create a `.env` file in the project root with the following values:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
```

The app also accepts `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` as a fallback for the Supabase client if `VITE_SUPABASE_ANON_KEY` is not set.

## Supabase Setup

1. Create a new Supabase project.
2. Run the SQL in `supabase/schema.sql` to create the required tables, enums, triggers, and row-level security policies.
3. Configure authentication in Supabase so email/password sign-in is enabled.
4. Add the environment variables above to your local `.env` file.

The schema includes these core tables:

- `profiles`
- `communities`
- `members`
- `workers`
- `issues`

The app expects row-level security to be enabled and relies on the policies defined in the schema file.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run lint checks:

```bash
npm run lint
```

## App Flow

1. A user opens the landing page and signs in or signs up.
2. Supabase stores the session and loads the role from `profiles`.
3. Residents join a community with a join code and submit issues.
4. Groq AI classifies the issue and flags emergencies when needed.
5. Owners review the issue, assign a technician, and monitor resolution.
6. Workers update the issue status until it is resolved.

## Notes On Voice Input

Voice reporting uses the browser Speech Recognition API. In practice, Chrome-based browsers provide the best support. If speech recognition is unavailable, residents can still submit issues using text input.

## Deployment Notes

- Make sure the production environment has the same Supabase and Groq environment variables.
- Ensure the Supabase schema and RLS policies are applied before users sign in.
- Realtime subscriptions must be enabled in Supabase for live updates and notifications.

## Troubleshooting

- If authentication fails, verify that the Supabase URL and anon key are correct.
- If AI analysis fails, verify that `VITE_GROQ_API_KEY` is present and valid.
- If residents cannot join a community, confirm the join code exists in the `communities` table.
- If updates do not appear in real time, check Supabase Realtime settings and table subscriptions.

## License

No license has been specified yet. Add one if you plan to publish or share the project publicly.
