# Jira Worklog Logger - Chrome Extension

A free, open-source Chrome extension for parsing and logging work entries to Jira.

## Features

✨ **Simple Text Format** - Write worklogs in plain text using DD-MM-YYYY format  
🔍 **Duplicate Detection** - Automatically detects already-logged entries  
✏️ **Edit Before Logging** - Review and modify entries before submission  
📦 **Batch Logging** - Log by day or all entries at once  
↩️ **Undo/Redo** - Full undo/redo support for all actions  
🔒 **Secure & Private** - Credentials stored locally, direct Jira API connection, no third-party servers

## Installation

### Option 1: Download from Releases (Recommended)

1. Download the latest `jira-logger-extension.zip` from [Releases](https://github.com/SanskarSethiya-MXT/JiraLogger/releases)
2. Extract the zip file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable **Developer mode** (toggle in top-right corner)
5. Click **Load unpacked**
6. Select the extracted folder
7. Pin the extension to your toolbar for easy access

### Option 2: Build from Source

```powershell
# Clone the repository
git clone https://github.com/SanskarSethiya-MXT/JiraLogger.git
cd JiraLogger

# Install dependencies
npm install

# Build the extension
npm run build:extension

# Load dist-extension folder in chrome://extensions/
```

## Usage

### 1. Configure Jira Credentials

Click the extension icon and enter:
- **Jira URL** (e.g., `https://yourcompany.atlassian.net`)
- **Email** (your Jira account email)
- **API Token** ([Create one here](https://id.atlassian.com/manage-profile/security/api-tokens))

### 2. Write Your Worklogs

Use this simple format:

```
30-10-2025 Thursday
    PROJ-123: Feature development: 2h 30m
    TEAM-456: Daily standup: 15m
Total: 2h 45m

31-10-2025 Friday
    PROJ-789: Bug fixes: 3h
    TEAM-456: Code review: 1h
Total: 4h
```

### 3. Parse and Review

- Click **Parse** to convert text into worklog entries
- Review, edit, or delete entries as needed
- Entries already logged in Jira are detected automatically

### 4. Log to Jira

- **Log Day** - Log all entries for a specific date
- **Log All** - Log all entries at once
- Track progress with the status indicators

## Format Guide

**Date Line:**
```
DD-MM-YYYY DayName
```

**Entry Line:**
```
    TICKET-123: Description: Xh Ym
```

**Supported Time Formats:**
- `2h 30m`, `2h30m`, `2.5h`
- `30m`, `0.5h`
- `1h`, `1.5h`

## Why Open Source?

- 🆓 **Free forever** - No Chrome Web Store fees
- 🔓 **Transparent** - Inspect the code yourself
- 🛠️ **Customizable** - Modify for your team's needs
- 🚀 **Community-driven** - Contributions welcome

## Development

```powershell
# Install dependencies
npm install

# Run Next.js dev server (original web app)
npm run dev

# Build Chrome extension
npm run build:extension

# Extension output in dist-extension/
```

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Radix UI Components
- Chrome Extension Manifest V3
- Webpack 5

## License

MIT License - Free to use, modify, and distribute

## Contributing

Issues and pull requests welcome! See [PUBLISHING-GUIDE.md](./PUBLISHING-GUIDE.md) for details on building and distributing the extension.

## Support

Found a bug? Have a feature request? [Open an issue](https://github.com/SanskarSethiya-MXT/JiraLogger/issues)
