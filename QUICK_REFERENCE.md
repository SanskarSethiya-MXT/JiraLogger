# JiraLogger Pro - Quick Reference Guide

## Worklog Format

### Basic Structure
```
DD-MM-YYYY
TICKET-123 Work description 2h 30m
TICKET-456 Another task 1h
```

### Time Format Examples
- `2h` - 2 hours
- `30m` - 30 minutes
- `2h 30m` - 2 hours and 30 minutes
- `1h 15m` - 1 hour and 15 minutes

### Multiple Days Example
```
29-10-2025
PROJ-101 Morning standup meeting 15m
PROJ-102 Code review and feedback 1h 30m
PROJ-102 Implement new feature 3h
PROJ-103 Testing and bug fixes 2h

30-10-2025
PROJ-102 Complete feature implementation 2h 30m
PROJ-104 Documentation update 1h
PROJ-105 Team meeting 45m
```

## Key Features

### 1. Parsing Worklogs
1. Paste or type your worklog text
2. Click "Parse Worklog" or upload a text file
3. Entries appear organized by date

### 2. Setting Day Start Time
- Default: 09:00
- Change in the "Day Start Time" field
- All entries recalculate automatically

### 3. Editing Entries
1. Click the Edit icon (✏️) on any entry
2. Modify ticket, description, or time
3. Click "Save Changes"
4. Times automatically recalculate

### 4. Deleting Entries
- Click the Trash icon (🗑️) on any entry
- Entry is removed and times recalculate

### 5. Undo/Redo
- **Undo**: Ctrl+Z or click Undo button
- **Redo**: Ctrl+Y or click Redo button
- Full history of changes maintained

### 6. Logging to Jira
Three options:
1. **Log Single Entry**: Click "Log to Jira" next to entry
2. **Log Day**: Click "Log All for [Date]" at bottom of date tab
3. **Log Everything**: Click "Log All Worklogs" in main actions

### 7. Status Indicators
- ⏳ **Pending**: Ready to log
- 🔄 **Logging**: Currently being sent
- ✅ **Success**: Successfully logged
- ❌ **Error**: Failed to log (check console)

## Tips & Tricks

### Efficient Entry
1. Keep a text file of daily work
2. Use consistent ticket naming
3. Estimate time as you work
4. Parse and review end of day
5. Bulk log at once

### Time Tracking
- Start time calculated from "Day Start Time"
- Each entry starts when previous ends
- Edit any entry to adjust times
- Total time shown per day

### File Import
1. Click "Upload File" button
2. Select .txt file with worklog
3. Automatically parsed and displayed

### Keyboard Shortcuts
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo
- `Tab`: Navigate between dates

## Common Patterns

### Daily Standup
```
29-10-2025
STAND-001 Daily standup meeting 15m
```

### Code Review Session
```
29-10-2025
REVIEW-042 Code review for feature X 1h 30m
```

### Development Block
```
29-10-2025
FEAT-123 Design review 30m
FEAT-123 Implementation 3h
FEAT-123 Unit testing 1h 30m
FEAT-123 Code review fixes 45m
```

### Meeting-Heavy Day
```
29-10-2025
MEET-001 Sprint planning 2h
PROJ-456 Individual work 1h 30m
MEET-002 Client call 1h
PROJ-456 Continued work 2h
MEET-003 Retrospective 1h
```

## Troubleshooting

### Parsing Issues
- **Check date format**: Must be DD-MM-YYYY
- **Check ticket format**: Must be UPPERCASE-NUMBER
- **Check time format**: Must be Xh, Ym, or Xh Ym
- **Remove extra spaces**: One space between elements

### Logging Failures
- **Verify ticket exists** in Jira
- **Check permissions** - need write:jira-work
- **Verify description** is not empty
- **Check time value** is positive

### Time Calculation Issues
- **Verify day start time** format (HH:MM)
- **Check total time** doesn't exceed 24 hours
- **Edit entries** if times overlap days

## Best Practices

1. **Daily Logging**: Log work daily for accuracy
2. **Descriptive Text**: Use clear descriptions
3. **Round Times**: Round to nearest 15 minutes
4. **Review Before Log**: Check all entries before bulk logging
5. **Backup Text**: Keep raw worklog text as backup

## Jira Integration Notes

### Required Permissions
- write:jira-work
- read:jira-work
- read:jira-user

### Worklog Format in Jira
- Comment: Your description
- Time Spent: Calculated in seconds
- Started: Date and time from parsing

### Limitations
- Cannot edit logged worklogs (use Jira UI)
- Cannot delete logged worklogs from app
- Times must be in the past

## Support

### Documentation
- Full README: See README.md
- Deployment Guide: See DEPLOYMENT.md
- Contributing: See CONTRIBUTING.md

### Getting Help
- GitHub Issues: Report bugs or request features
- Check browser console for errors
- Review Jira permissions if logging fails

---

**Pro Tip**: Create weekly worklog templates with common tickets and adjust times daily. This speeds up the process significantly!
