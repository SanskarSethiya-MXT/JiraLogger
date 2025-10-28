# JiraLogger Pro

A powerful Next.js application for parsing, managing, and logging work entries to Jira with AI-powered ticket suggestions.

## 🚀 Features

- **Worklog Parsing**: Parse worklog entries from text format with automatic time calculation
- **Multi-Date Support**: Organize and manage worklogs across multiple dates with tabbed interface
- **Visual Time Tracking**: See start/end times for each entry with automatic scheduling
- **Edit & Delete**: Modify entries before logging with full undo/redo support
- **Bulk or Individual Logging**: Log all entries at once or one at a time
- **AI Ticket Suggestions**: Get intelligent Jira ticket recommendations based on work descriptions
- **Real-time Status**: Track logging status for each entry (pending, logging, success, error)
- **File Import**: Upload worklog text files for quick parsing
- **Forge Integration**: Built with Atlassian Forge for seamless Jira integration

## 📋 Prerequisites

- Node.js 18+ or 20+
- npm or yarn
- Jira instance with appropriate API access
- Atlassian Forge CLI (for Jira plugin deployment)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/SanskarSethiya-MXT/JiraLogger.git
cd JiraLogger
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (create `.env.local`):
```env
# Add your environment variables here if needed
# NEXT_PUBLIC_API_URL=your_api_url
```

## 🏃 Running Locally

### For Forge Plugin Development (Recommended)

JiraLogger Pro is designed as a Forge Custom UI app. To run it locally:

**Terminal 1 - Start Next.js dev server:**
```bash
npm run dev
```

**Terminal 2 - Start Forge tunnel:**
```bash
forge tunnel
```

The tunnel connects your local dev server to Jira, allowing you to test in a real Jira environment.

📖 **See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for detailed instructions**

### For Standalone Development (Without Forge)

If you want to run without Forge (you'll need to implement your own Jira API calls):

```bash
npm run dev
```

Access at `http://localhost:9002` (but Forge bridge features won't work)

### Development Mode

Start the Next.js development server:
```bash
npm run dev
```

The application will be available at `http://localhost:9002`

### Genkit AI Development

For AI-powered ticket suggestion features:
```bash
npm run genkit:dev
# or with watch mode
npm run genkit:watch
```

### Build for Production

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## 📝 Worklog Format

JiraLogger Pro accepts worklog entries in the following format:

```
DD-MM-YYYY
TICKET-123 Work description here 2h
TICKET-456 Another task 1h 30m
TICKET-789 Meeting notes 45m

DD-MM-YYYY
TICKET-123 Continued work 3h
```

- **Date Format**: DD-MM-YYYY (e.g., 29-10-2025)
- **Ticket Format**: PROJECT-NUMBER (e.g., JIRA-123)
- **Time Format**: Xh Ym or combinations (e.g., 2h, 30m, 1h 30m)

## 🔌 Deploying as a Jira Plugin

This application uses Atlassian Forge for Jira integration.

### Setup Forge

1. Install Forge CLI:
```bash
npm install -g @forge/cli
```

2. Login to Forge:
```bash
forge login
```

3. Update `manifest.yml` with your app details:
   - Update the `app.id` with your Forge app ID
   - Configure permissions as needed
   - Set up module configurations

### Deploy to Jira

```bash
# Register your app (first time only)
forge register

# Deploy the app
forge deploy

# Install to your Jira site
forge install
```

### View Logs

```bash
forge logs
```

## 📦 Project Structure

```
JiraLogger/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── page.tsx        # Main application page
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Global styles
│   ├── components/          # React components
│   │   ├── jira-logger.tsx # Main logger component
│   │   ├── ticket-suggester.tsx # AI ticket suggester
│   │   └── ui/             # shadcn/ui components
│   ├── lib/                # Utility functions
│   │   ├── parser.ts       # Worklog parsing logic
│   │   └── utils.ts        # Helper utilities
│   ├── types/              # TypeScript type definitions
│   └── hooks/              # Custom React hooks
├── docs/
│   └── blueprint.md        # Application blueprint
├── manifest.yml            # Forge app manifest
├── package.json
└── README.md
```

## 🎨 Tech Stack

- **Framework**: Next.js 15.3.3 (React 18.3.1)
- **UI Library**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form + Zod
- **AI Integration**: Google Genkit
- **Jira Integration**: Atlassian Forge
- **Date Handling**: date-fns
- **TypeScript**: Full type safety

## 🔑 Key Features Explained

### Undo/Redo
Full history tracking allows you to undo and redo changes to your worklog entries.

### Smart Time Calculation
Enter a day start time (default 09:00), and the app automatically calculates start and end times for each entry based on duration.

### Status Tracking
Each entry shows its current status:
- ⏳ Pending: Ready to log
- 🔄 Logging: Currently being sent to Jira
- ✅ Success: Successfully logged
- ❌ Error: Failed to log

### Bulk Actions
Log all entries for a specific date or all dates at once with a single click.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Sanskar Sethiya** - [SanskarSethiya-MXT](https://github.com/SanskarSethiya-MXT)

## 🐛 Issues & Support

If you encounter any issues or have questions, please file an issue on the [GitHub repository](https://github.com/SanskarSethiya-MXT/JiraLogger/issues).
