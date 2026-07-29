# File Timestamp Tracker

An Obsidian plugin that automatically tracks file creation dates and maintains a history of significant updates in YAML frontmatter.

## Features

- **Automatic Creation Date Tracking**: Adds `created: YYYY-MM-DD` to newly created files only
- **Update History**: Tracks dates when significant edits occur in `last_updated: [date1, date2, ...]`
- **Smart Change Detection**: Only logs updates when meaningful changes occur (default: 20+ characters)
- **Daily Deduplication**: Accumulates changes throughout the day, adding date only once per day
- **Respects Existing Files**: Never adds `created` dates to files that existed before plugin installation
- **Configurable**: Customize character thresholds, excluded folders, and enable/disable features
- **Google Drive Safe**: Designed to minimize conflicts in shared vault environments
- **Pure JavaScript**: No build process required - works immediately after installation

## How It Works

### On File Creation
When you create a new markdown file, the plugin automatically adds:
```yaml
---
created: 2025-01-07
last_updated: []
---
