# **App Name**: JiraLogger Pro

## Overview

JiraLogger Pro is a Next.js application designed to simplify Jira worklog management. It provides a powerful interface for parsing, editing, and logging work entries to Jira with AI-powered assistance.

## Core Features:

### ✅ Implemented

1. **Worklog Parsing**: Accept worklog input in a specified format (including JIRA ticket keys, descriptions, and time spent). Proper conversion of text format into meaningful worklog entries with automatic time calculation.

2. **Worklog Summarization**: Summarize the parsed worklog in a clear and meaningful format organized by date, showing total time per day and individual entries.

3. **Worklog Editing**: Full editing capabilities for worklog entries before logging them to Jira, including:
   - Edit ticket number, description, and time spent
   - Delete entries
   - Undo/Redo functionality
   - Real-time recalculation of start/end times

4. **Multi-Date Support**: Organize worklogs across multiple dates with tabbed interface showing:
   - Separate view for each date
   - Total time per date
   - Individual entry times with start/end timestamps

5. **Jira Integration**: Log worklog entries to Jira using the Forge Bridge API with:
   - Individual entry logging
   - Bulk logging by date
   - Bulk logging for all dates
   - Real-time status tracking (pending, logging, success, error)

6. **File Import**: Upload worklog text files for quick parsing

7. **Smart Time Calculation**: Automatic calculation of start and end times based on configurable day start time

### 🔄 In Progress / Planned

8. **AI Ticket Suggestion**: Use AI (Google Genkit) to suggest potential Jira tickets based on work description (component exists but needs integration)

9. **Jira Credential Management**: Secure storage of Jira credentials (currently using Forge bridge authentication)

## Technical Architecture

### Technology Stack

- **Frontend Framework**: Next.js 15.3.3 with React 18.3.1
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with animations
- **Form Management**: React Hook Form with Zod validation
- **AI Integration**: Google Genkit for intelligent suggestions
- **Jira Integration**: Atlassian Forge Bridge
- **Date/Time**: date-fns library
- **TypeScript**: Full type safety throughout

### Project Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React components
│   ├── jira-logger.tsx      # Main application component
│   ├── ticket-suggester.tsx # AI suggestion component
│   └── ui/          # Reusable UI components
├── lib/             # Utility functions
│   ├── parser.ts    # Worklog parsing logic
│   └── utils.ts     # Helper utilities
├── types/           # TypeScript definitions
└── hooks/           # Custom React hooks
```

## Worklog Format Specification

```
DD-MM-YYYY
TICKET-123 Description of work 2h 30m
TICKET-456 Another task 1h

DD-MM-YYYY
TICKET-789 More work 45m
```

### Rules:
- Date format: DD-MM-YYYY (e.g., 29-10-2025)
- Ticket format: PROJECT-NUMBER (uppercase, e.g., JIRA-123)
- Time format: Flexible - supports "2h", "30m", "2h 30m"
- Empty lines between dates are ignored
- All entries under a date are assigned sequential times

## Style Guidelines:

### Color Palette
- **Primary Color**: Calming blue (#4A8FE7) - trust and focus
- **Background**: Very light blue (#E5F0FF) - reduces eye strain
- **Accent**: Muted green (#70CA8B) - positive feedback
- **Error**: Red for failed operations
- **Warning**: Yellow/orange for warnings

### Typography
- **Font Family**: 'Inter' (sans-serif) for clarity and modern look
- **Headings**: Bold, clear hierarchy
- **Body**: Regular weight, comfortable line height

### UI Principles
- Clean, minimal interface
- Clear visual feedback for all actions
- Consistent spacing and alignment
- Responsive design
- Accessible color contrasts

## Deployment Options

### 1. Jira Plugin (Forge)
Deploy as an Atlassian Forge app directly in Jira

### 2. Standalone Web App
Deploy on Vercel, Netlify, or similar platforms

### 3. Self-hosted
Deploy on your own infrastructure with environment configuration

## Future Enhancements

- **Authentication**: Add user authentication for standalone deployment
- **Saved Templates**: Save frequently used worklog patterns
- **Analytics**: Track time spent across projects
- **Export**: Export worklogs to various formats (CSV, PDF)
- **Offline Support**: PWA capabilities for offline usage
- **Multi-user**: Support for team worklog management
- **Integration**: Connect with other project management tools
