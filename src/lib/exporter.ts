import type { CMAClient } from '@contentful/app-sdk';
import { createThrottler } from './throttle';
import { paginateEntries, getEntryCount } from './paginate';
import { flattenEntries, flattenEntry, getColumnHeaders, type ContentType, type Entry } from './flatten';
import { exportToCSV } from './csv';

export interface ExportOptions {
  contentType: ContentType | null;
  contentTypeId: string;
  locales: string[];
  fields?: string[]; // Optional field filter
  filters?: Record<string, unknown>;
  filename?: string;
  userMap?: Record<string, string>; // Map of user IDs to names
  contentTypeMap?: Record<string, ContentType>; // Map of content type IDs to schemas
}

export interface ExportProgress {
  fetched: number;
  total: number;
  status: 'estimating' | 'fetching' | 'processing' | 'complete' | 'error' | 'cancelled';
  message?: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

export class Exporter {
  private cma: CMAClient;
  private throttler = createThrottler({
    requestsPerSecond: 8,
    maxConcurrent: 4,
    maxRetries: 3,
  });
  private cancelled = false;

  constructor(cma: CMAClient) {
    this.cma = cma;
  }

  cancel(): void {
    this.cancelled = true;
  }

  async start(
    options: ExportOptions,
    onProgress: ProgressCallback
  ): Promise<void> {
    this.cancelled = false;

    try {
      onProgress({
        fetched: 0,
        total: 0,
        status: 'estimating',
        message: 'Estimating entry count...',
      });

      const total = await this.throttler.execute(() =>
        getEntryCount(this.cma, options.contentTypeId === 'all-content-types' ? undefined : options.contentTypeId, options.filters || {})
      );

      if (this.cancelled) {
        onProgress({
          fetched: 0,
          total,
          status: 'cancelled',
          message: 'Export cancelled',
        });
        return;
      }

      if (total === 0) {
        onProgress({
          fetched: 0,
          total: 0,
          status: 'complete',
          message: 'No entries found',
        });
        return;
      }

      onProgress({
        fetched: 0,
        total,
        status: 'fetching',
        message: `Fetching ${total} entries...`,
      });

      const allRows: ReturnType<typeof flattenEntries> = [];
      let fetched = 0;

      const paginator = paginateEntries(
        this.cma,
        {
          contentType: options.contentTypeId === 'all-content-types' ? undefined : options.contentTypeId,
          filters: options.filters || {},
        },
        <T>(fn: () => Promise<T>) => this.throttler.execute(fn)
      );

      for await (const batch of paginator) {
        if (this.cancelled) {
          onProgress({
            fetched,
            total,
            status: 'cancelled',
            message: 'Export cancelled',
          });
          return;
        }

        // Flatten entries using schema-aware path for all entries
        let rows: Array<Record<string, string | number | boolean | null>>;
        if (options.contentType) {
          // Single content type export - use the standard path
          rows = flattenEntries(batch as Entry[], {
            contentType: options.contentType,
            locales: options.locales,
            fields: options.fields,
            userMap: options.userMap,
          });
        } else if (options.contentTypeMap) {
          // Mixed content type export - look up each entry's content type
          rows = (batch as Entry[]).map((entry) => {
            const contentTypeId = entry.sys.contentType.sys.id;
            const contentType = options.contentTypeMap![contentTypeId];
            
            if (contentType) {
              // Use the schema-aware flatten for clean columns
              return flattenEntry(entry, {
                contentType,
                locales: options.locales,
                fields: options.fields,
                userMap: options.userMap,
              });
            } else {
              // Fallback for missing content type (rare) - still use clean column names
              const updatedByUserId = entry.sys.updatedBy?.sys.id;
              const updatedByName = updatedByUserId ? (options.userMap?.[updatedByUserId] || updatedByUserId) : 'Unknown';
              
              const row: Record<string, string | number | boolean | null> = {
                'Entry ID': entry.sys.id,
                'Created': new Date(entry.sys.createdAt).toISOString().split('T')[0],
                'Updated': new Date(entry.sys.updatedAt).toISOString().split('T')[0],
                'Last Updated By': updatedByName,
                'Status': entry.sys.publishedVersion ? 'Published' : 'Draft',
                'Content Type': contentTypeId,
              };
              
              // Add all fields as JSON strings since we don't have the schema
              if (entry.fields) {
                for (const [fieldId, fieldValue] of Object.entries(entry.fields)) {
                  row[fieldId] = JSON.stringify(fieldValue);
                }
              }
              
              return row;
            }
          });
        } else {
          // No content type map provided - shouldn't happen, but fallback
          rows = (batch as Entry[]).map((entry) => {
            const updatedByUserId = entry.sys.updatedBy?.sys.id;
            const updatedByName = updatedByUserId ? (options.userMap?.[updatedByUserId] || updatedByUserId) : 'Unknown';
            
            return {
              'Entry ID': entry.sys.id,
              'Created': new Date(entry.sys.createdAt).toISOString().split('T')[0],
              'Updated': new Date(entry.sys.updatedAt).toISOString().split('T')[0],
              'Last Updated By': updatedByName,
              'Status': entry.sys.publishedVersion ? 'Published' : 'Draft',
              'Content Type': entry.sys.contentType.sys.id,
            };
          });
        }

        allRows.push(...rows);
        fetched += batch.length;

        onProgress({
          fetched,
          total,
          status: 'fetching',
          message: `Fetching entries... ${fetched} / ${total}`,
        });
      }

      if (this.cancelled) {
        onProgress({
          fetched,
          total,
          status: 'cancelled',
          message: 'Export cancelled',
        });
        return;
      }

      onProgress({
        fetched,
        total,
        status: 'processing',
        message: 'Generating CSV...',
      });

      const headers = options.contentType 
        ? getColumnHeaders(options.contentType, options.locales)
        : undefined; // Let CSV lib infer headers from data
      const filename = options.filename || `${options.contentTypeId}-export.csv`;

      exportToCSV(allRows, filename, headers);

      onProgress({
        fetched,
        total,
        status: 'complete',
        message: `Successfully exported ${fetched} entries`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      onProgress({
        fetched: 0,
        total: 0,
        status: 'error',
        message: `Export failed: ${message}`,
      });
      throw error;
    }
  }
}
