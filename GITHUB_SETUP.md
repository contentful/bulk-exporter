# GitHub Setup Guide

Follow these steps to push this app to GitHub under the `milescontentful` account.

## Prerequisites

- Git installed on your machine
- GitHub account access for `milescontentful`
- Personal Access Token or SSH key configured

## Step 1: Initialize Git Repository

```bash
cd /Users/miles.stauffer/Projects/entry\ export/apps/bulk-entry-exporter

# Initialize git if not already initialized
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Bulk Entry CSV Exporter for Contentful"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/milescontentful
2. Click **"New repository"** or go to https://github.com/new
3. Fill in the details:
   - **Repository name**: `bulk-entry-exporter`
   - **Description**: `Export unlimited Contentful entries to CSV with advanced filtering and selection`
   - **Visibility**: Public
   - **DO NOT** initialize with README (we already have one)
4. Click **"Create repository"**

## Step 3: Push to GitHub

```bash
# Add the remote repository
git remote add origin https://github.com/milescontentful/bulk-entry-exporter.git

# Push to main branch
git branch -M main
git push -u origin main
```

If you're using SSH instead:

```bash
git remote add origin git@github.com:milescontentful/bulk-entry-exporter.git
git branch -M main
git push -u origin main
```

## Step 4: Verify

Visit https://github.com/milescontentful/bulk-entry-exporter to confirm the repository is live.

## Step 5: Add Topics (Optional but Recommended)

On the GitHub repository page:
1. Click the ⚙️ gear icon next to "About"
2. Add topics: `contentful`, `contentful-app`, `csv-export`, `typescript`, `react`, `vite`
3. Click "Save changes"

## Step 6: Enable GitHub Pages (Optional)

If you want to host documentation:
1. Go to **Settings** > **Pages**
2. Select source: **Deploy from a branch**
3. Select branch: **main** and folder: **/ (root)**
4. Click **Save**

## Common Git Commands for Future Updates

```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push

# Pull latest changes
git pull

# Create a new branch for features
git checkout -b feature/new-feature

# Switch back to main
git checkout main
```

## Troubleshooting

**Authentication Failed**
- Use a Personal Access Token instead of password
- Generate one at: https://github.com/settings/tokens
- Use it as your password when pushing

**Remote Already Exists**
```bash
git remote remove origin
git remote add origin https://github.com/milescontentful/bulk-entry-exporter.git
```

**Need to Change Commit Message**
```bash
git commit --amend -m "New commit message"
git push --force  # Only if you haven't pushed yet
```
