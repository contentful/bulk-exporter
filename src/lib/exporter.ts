import type { CMAClient } from '@contentful/app-sdk';
import { createThrottler } from './throttle';
import { paginateEntries, getEntryCount } from './paginate';
import { flattenEntries, getColumnHeaders, type ContentType, type Entry } from './flatten';
import { exportToCSV } from './csv';

export interface ExportOptions {
  contentType: ContentType | null;
  contentTypeId: string;
  locales: string[];
  fields?: string[]; // Optional field filter
  filters?: Record<string, unknown>;
  filename?: string;
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

        // For cross-content-type exports, flatten without schema
        let rows: Array<Record<string, string | number | boolean | null>>;
        if (options.contentType) {
          rows = flattenEntries(batch as Entry[], {
            contentType: options.contentType,
            locales: options.locales,
            fields: options.fields,
          });
        } else {
          // Flatten entries without schema for cross-content-type exports
          rows = (batch as Entry[]).map((entry) => {
            const row: Record<string, string | number | boolean | null> = {
              'sys.id': entry.sys.id,
              'sys.contentType': entry.sys.contentType.sys.id,
              'sys.createdAt': entry.sys.createdAt,
              'sys.updatedAt': entry.sys.updatedAt,
              'sys.publishedVersion': entry.sys.publishedVersion ?? null,
            };
            
            // Add all fields from all locales as JSON strings
            if (entry.fields) {
              for (const [fieldId, fieldValue] of Object.entries(entry.fields)) {
                row[fieldId] = JSON.stringify(fieldValue);
              }
            }
            
            return row;
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
