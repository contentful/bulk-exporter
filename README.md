# Bulk Entry CSV Exporter for Contentful

A powerful Contentful App that allows you to export unlimited entries from any content type to CSV format, bypassing the 40-entry limitation of the Contentful web interface.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/milescontentful/bulk-entry-exporter)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/milescontentful/bulk-entry-exporter)

## Features

- **Contentful-Style Results Table**: Search results display matches Contentful's native interface with:
  - Entry name (using the content type's display field)
  - Content type name (human-readable, not ID)
  - Updated date (YYYY-MM-DD format)
  - Last updated by (user's full name)
  - Status (draft/changed/published)
- **Search & Preview**: View search results before exporting with full-text search and advanced filters
- **Select Entries**: Check individual entries or select all, then export only your selection
- **Choose Columns**: Select specific fields to include in the export, reducing file size and focusing on relevant data
- **Global Search**: Search across all content types or filter by specific content type
- **Rich Filtering**:
  - Full-text search across all fields
  - Status filters (published, draft, changed, archived)
  - Date range filters (created and updated dates)
  - Tag filters (any or all tags)
  - Taxonomy concept filters (any or all concepts)
  - Advanced field-level filters with multiple operators
- **Unlimited Export**: Export any number of entries from any content type
- **Locale Selection**: Export all locales or select specific ones
- **Clean CSV Output**: Human-readable column headers and formatted data
- **Rate-Limit Aware**: Automatic throttling (8 req/s for paid tier) and retry logic
- **Real-Time Progress**: Track export progress with cancel support
- **Excel Compatible**: CSV format with UTF-8 BOM for Excel compatibility

## Quick Start

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/milescontentful/bulk-entry-exporter.git
cd bulk-entry-exporter
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

4. **Configure in Contentful**
   - Go to **Settings** > **Apps** > **Manage apps** > **Create app**
   - Choose **App hosted by you**
   - Set the app URL to `http://localhost:5173`
   - Enable these locations:
     - **App configuration screen**
     - **Page**
   - Save and install the app to your space

### Deploy to Production

#### Option 1: Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/milescontentful/bulk-entry-exporter)

1. Click the button above or manually:
```bash
npm install -g vercel
npm run build
vercel --prod
```

2. Update your Contentful app definition with the Vercel URL

#### Option 2: Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/milescontentful/bulk-entry-exporter)

1. Click the button above or manually:
```bash
npm run build
# Upload the dist/ folder to Netlify
```

#### Option 3: Other Hosting

Build the app and deploy the `dist` folder to any static hosting provider:

```bash
npm run build
# Deploy the dist/ folder
```

## Usage

### Search & Preview

1. Navigate to **Apps** in the Contentful web UI main menu
2. Select **Bulk Entry CSV Exporter**
3. Use the tabbed interface to build your query:

#### Filter Tab
- Select a content type (or "Any" for global search)
- Enter full-text search terms
- Choose status (any, published, draft, changed, archived)
- Set created/updated date ranges
- Select sort order

#### Tags & Taxonomy Tab
- Select tags (match any or all)
- Select taxonomy concepts (match any or all)

#### Advanced Tab
- Add field-level filters with operators (equals, not equals, exists, contains, etc.)
- Add multiple filters for complex queries

#### Output Tab
- Select which locales to include in the export
- **Choose specific fields** to export (leave empty for all fields)
- Preview the filename

4. Click **Search & Preview** to see matching entries in a table
5. **Use checkboxes** to select specific entries you want to export
   - Check individual rows
   - Use "Select All" to select all visible results
   - Click "Export Selected" button to export only checked entries
6. Click **Estimate Count** to see the total number of matching entries
7. Click **Export to CSV** to download all matching entries

### Workflow Options

**Option 1: Select and Export Specific Entries**
1. Search for entries
2. Review the results
3. Check the entries you want
4. Click "Export Selected (X)" button

**Option 2: Export All Matching Entries**
1. Configure your filters
2. Select locales and fields in Output tab
3. Click "Export to CSV" to export all matching results

**Option 3: Quick Export Without Preview**
1. Configure your filters
2. Select locales and fields
3. Skip the search preview
4. Click "Export to CSV" directly

## CSV Format

The exported CSV uses clean, human-readable formatting with **consistent columns** across all export methods (full export, "Any" content type search, or selected entries):

### Column Headers
- **Entry ID**: Unique identifier for the entry
- **Created**: Entry creation date (YYYY-MM-DD)
- **Updated**: Last update date (YYYY-MM-DD)
- **Last Updated By**: Full name of the user who last updated the entry
- **Status**: "Draft" or "Published"
- **Content Type**: Human-readable content type name
- **Field columns**: Use field names from your content model (e.g., "Title (en-US)", "Author")

### Data Formatting
- **References**: Just the entry/asset ID (e.g., `abc123`)
- **Arrays**: Semicolon-separated values (e.g., `tech; blog; tips`)
- **Dates**: YYYY-MM-DD format
- **Rich Text**: Plain text extraction when possible
- **Objects**: JSON strings for complex data
- **User Names**: Resolved to full names (e.g., "Miles Stauffer") instead of IDs

### Export Methods

All three export methods produce **identical column structures**:
1. **Full Export** (Export to CSV button) - exports all matching entries
2. **Any Content Type Export** - searches across all content types with consistent formatting
3. **Selected Export** (Export Selected button) - exports only checked entries

**Example CSV output:**
```csv
Entry ID,Created,Updated,Last Updated By,Status,Content Type,Title (en-US),Author,Tags
abc123,2024-01-01,2024-01-02,Miles Stauffer,Published,Blog Post,Hello World,author456,tech; blog; tips
```

## Rate Limits

Contentful enforces API rate limits:

- **Free tier**: ~7 requests per second
- **Paid tiers**: ~10 requests per second

This app is configured for paid tier usage and automatically throttles requests to ~8 req/s. It handles `429` responses by:

1. Reading the `X-Contentful-RateLimit-Reset` header (seconds to wait)
2. Applying exponential backoff if the header is missing
3. Retrying up to 3 times before failing

Large exports may take several minutes. Progress is shown in real-time.

## How It Works

The Contentful web UI limits CSV exports to 40 entries. This app uses the Content Management API directly to:

1. **Search & Preview**: Build your query using the search form and preview matching entries in a paginated list
2. **Paginate Efficiently**: Fetch entries at 1000 per page using `skip`/`limit`, then switch to cursor-based pagination (`sys.createdAt[gt]`) after 9000 entries
3. **Respect Rate Limits**: Throttle requests to ~8 req/s (paid tier) with 4 concurrent in-flight requests
4. **Retry on Failures**: Automatically retry on `429` responses with exponential backoff (max 3 retries), respecting `X-Contentful-RateLimit-Reset` header
5. **Flatten Complex Data**: Transform all entry fields (including localized fields, references, rich text, and arrays) into flat CSV rows with clean formatting

## Technical Details

### Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **UI**: Forma 36 (Contentful's design system)
- **SDK**: Contentful App SDK + React Apps Toolkit
- **CSV**: PapaParse for serialization
- **Testing**: Vitest + React Testing Library

### Project Structure

```
src/
  index.tsx                 # App entry point, location router
  locations/
    ConfigScreen.tsx        # App configuration screen
    Page.tsx                # Main export UI
  components/
    ExportForm.tsx          # Search form with filters
    ProgressPanel.tsx       # Progress bar and status
    ResultsList.tsx         # Search results table
  lib/
    throttle.ts             # Token bucket + 429 retry logic
    paginate.ts             # CMA pagination (skip + cursor)
    flatten.ts              # Entry → flat row transformation
    csv.ts                  # PapaParse wrapper
    exporter.ts             # Main orchestrator
    queryBuilder.ts         # Filter query builder
  lib/__tests__/            # Unit tests
```

### Key Implementation Details

**Throttling (`lib/throttle.ts`)**

- Token bucket algorithm at ~8 req/s (configured for paid tier)
- Concurrency limited to 4 simultaneous requests
- Automatically retries `429` responses
- Respects `X-Contentful-RateLimit-Reset` header

**Pagination (`lib/paginate.ts`)**

- Uses `skip`/`limit` for the first 9000 entries
- Switches to `sys.createdAt[gt]` cursor pagination beyond 9000
- Async generator for memory-efficient streaming

**Flattening (`lib/flatten.ts`)**

- Creates readable column headers ("Title (en-US)" instead of "title.en-US")
- Formats references as IDs only (cleaner than "Link:Entry:ID")
- Extracts plain text from rich text when possible
- Semicolon-separates arrays for better CSV readability

## Development

### Prerequisites

- Node.js 18+ and npm
- A Contentful space with appropriate permissions

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Type check
npm run type-check

# Build for production
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Troubleshooting

**Export fails with "Failed to load content types"**

- Ensure the app has the correct permissions in your space
- Check that you're logged in to Contentful

**Export is very slow**

- Large exports with 10,000+ entries can take several minutes
- Rate limits are enforced; the app will throttle automatically
- Consider filtering by date range to reduce the export size

**CSV doesn't open correctly in Excel**

- The CSV includes a UTF-8 BOM for Excel compatibility
- Try opening with "Import Data" instead of double-clicking
- Alternatively, use Google Sheets which handles UTF-8 CSVs natively

**"Too many requests" errors**

- The app automatically handles `429` responses
- If you see this error, wait a minute and try again
- You may be running other API-heavy operations simultaneously

**Search results show IDs instead of names**

- Hard refresh your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- This clears the cached version and loads the latest code

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

For issues or questions:
- Open an issue on [GitHub](https://github.com/milescontentful/bulk-entry-exporter/issues)
- Check the [Troubleshooting](#troubleshooting) section above

## Acknowledgments

Built with the [Contentful App Framework](https://www.contentful.com/developers/docs/extensibility/app-framework/) and [Forma 36](https://f36.contentful.com/).
