# JiraLogger Pro

A powerful worklog parser and logger for Jira with automatic time calculation and bulk logging capabilities.

## 🚀 Features

- **Worklog Parsing**: Parse worklog entries from text format
- **Multi-Date Support**: Organize worklogs across multiple dates
- **Visual Time Tracking**: Automatic start/end time calculation
- **Edit & Delete**: Modify entries before logging
- **Bulk Logging**: Log all entries at once or individually
- **Undo/Redo**: Full history tracking
- **File Import**: Upload worklog text files

## 📝 Worklog Format

```
DD-MM-YYYY
TICKET-123 Work description 2h
TICKET-456 Another task 1h 30m

DD-MM-YYYY
TICKET-789 More work 45m
```

**Format Rules:**
- Date: DD-MM-YYYY (e.g., 29-10-2025)
- Ticket: PROJECT-NUMBER (e.g., JIRA-123)
- Time: Xh Ym (e.g., 2h, 30m, 1h 30m)

## 🛠️ Installation

```bash
npm install
```

## 🏃 Running Locally

### Development Mode (UI Only)

```bash
npm run dev
```

Open http://localhost:9002 to test the UI (uses mock Jira API)

### With Forge (Full Jira Integration)

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
forge tunnel
```

Then access via your Jira site after installing the app.

## 🔌 Deploy as Jira Plugin

1. **Install Forge CLI:**
   ```bash
   npm install -g @forge/cli
   forge login
   ```

2. **Deploy:**
   ```bash
   $env:NODE_OPTIONS="--max-old-space-size=8192"
   forge deploy
   ```

3. **Install to Jira:**
   ```bash
   forge install
   ```

## 📦 Tech Stack

- Next.js 15.3.3
- React 18.3.1
- Radix UI + shadcn/ui
- Tailwind CSS
- Atlassian Forge
- TypeScript

## � License

MIT License - see LICENSE file

## 👤 Author

Sanskar Sethiya - [SanskarSethiya-MXT](https://github.com/SanskarSethiya-MXT)

