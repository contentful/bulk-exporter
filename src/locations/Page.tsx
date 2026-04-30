import { useEffect, useState, useRef } from 'react';
import { Heading, Paragraph, Stack, Box, Note, Spinner } from '@contentful/f36-components';
import { useSDK, useCMA } from '@contentful/react-apps-toolkit';
import type { PageAppSDK } from '@contentful/app-sdk';
import { ExportForm, type ExportFormData } from '../components/ExportForm';
import { ProgressPanel } from '../components/ProgressPanel';
import { ResultsList } from '../components/ResultsList';
import { Exporter, type ExportProgress } from '../lib/exporter';
import { getEntryCount } from '../lib/paginate';
import { buildQuery } from '../lib/queryBuilder';
import type { ContentType } from '../lib/flatten';

interface Locale {
  code: string;
  name: string;
}

interface Tag {
  sys: { id: string };
  name: string;
}

interface Concept {
  sys: { id: string };
  prefLabel: Record<string, string>;
}

interface SearchResult {
  sys: {
    id: string;
    contentType: {
      sys: {
        id: string;
      };
    };
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
  };
  fields?: Record<string, Record<string, unknown>>;
}

const Page = () => {
  const sdk = useSDK<PageAppSDK>();
  const cma = useCMA();

  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [locales, setLocales] = useState<Locale[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState<Record<string, unknown> | null>(null);
  const [lastFormData, setLastFormData] = useState<ExportFormData | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [contentTypeMap, setContentTypeMap] = useState<Record<string, { name: string; displayField?: string }>>({});
  const [contentTypeSchemaMap, setContentTypeSchemaMap] = useState<Record<string, ContentType>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  
  const exporterRef = useRef<Exporter | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ctResponse, localesResponse] = await Promise.all([
          sdk.cma.contentType.getMany({ query: { limit: 1000 } }),
          sdk.cma.locale.getMany({ query: { limit: 100 } }),
        ]);

        const ctItems = ctResponse.items as unknown as ContentType[];
        setContentTypes(ctItems);
        
        // Build content type map with names and display fields (for UI)
        const ctMap: Record<string, { name: string; displayField?: string }> = {};
        // Build content type schema map (for export)
        const ctSchemaMap: Record<string, ContentType> = {};
        for (const ct of ctItems) {
          ctMap[ct.sys.id] = {
            name: ct.name || ct.sys.id,
            displayField: ct.displayField,
          };
          ctSchemaMap[ct.sys.id] = ct;
        }
        setContentTypeMap(ctMap);
        setContentTypeSchemaMap(ctSchemaMap);

        setLocales(
          localesResponse.items.map((l: { code: string; name: string }) => ({
            code: l.code,
            name: l.name,
          }))
        );

        // Load tags (gracefully handle errors)
        try {
          const tagsResponse = await sdk.cma.tag.getMany({ query: { limit: 1000 } });
          setTags(tagsResponse.items as unknown as Tag[]);
        } catch (error) {
          console.warn('Tags not available or error loading tags:', error);
          setTags([]);
        }

        // Load concepts (gracefully handle errors for spaces without taxonomy)
        try {
          const conceptsResponse = await (cma as any).concept.getMany({
            query: { limit: 1000 },
          });
          setConcepts(conceptsResponse.items as unknown as Concept[]);
        } catch (error) {
          console.warn('Concepts/taxonomy not available:', error);
          setConcepts([]);
        }

        // Load users to map IDs to names
        try {
          const spaceId = sdk.ids.space;
          const usersResponse = await (cma as any).user.getManyForSpace({ spaceId });
          const uMap: Record<string, string> = {};
          for (const user of usersResponse.items as any[]) {
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim() || user.email || user.sys.id;
            uMap[user.sys.id] = fullName;
          }
          setUserMap(uMap);
        } catch (error) {
          console.warn('Unable to load users:', error);
          setUserMap({});
        }
      } catch (error) {
        sdk.notifier.error('Failed to load content types and locales');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sdk, cma]);

  const handleEstimate = async (data: ExportFormData) => {
    try {
      setEstimatedCount(null);
      
      const query = buildQuery({
        contentTypeId: data.contentTypeId,
        search: data.search,
        status: data.status,
        createdFrom: data.createdFrom,
        createdTo: data.createdTo,
        updatedFrom: data.updatedFrom,
        updatedTo: data.updatedTo,
        sort: data.sort,
        tags: data.tags,
        tagsMatchAll: data.tagsMatchAll,
        concepts: data.concepts,
        conceptsMatchAll: data.conceptsMatchAll,
        fieldFilters: data.fieldFilters,
      });
      
      const { content_type, ...filters } = query;
      const count = await getEntryCount(sdk.cma, content_type as string | undefined, filters);
      setEstimatedCount(count);
    } catch (error) {
      sdk.notifier.error('Failed to estimate entry count');
      console.error(error);
    }
  };

  const handleSearch = async (data: ExportFormData) => {
    try {
      setIsSearching(true);
      setSearchResults([]);
      setSelectedEntryIds([]);
      setLastFormData(data); // Save form data for exports
      
      const query = buildQuery({
        contentTypeId: data.contentTypeId,
        search: data.search,
        status: data.status,
        createdFrom: data.createdFrom,
        createdTo: data.createdTo,
        updatedFrom: data.updatedFrom,
        updatedTo: data.updatedTo,
        sort: data.sort,
        tags: data.tags,
        tagsMatchAll: data.tagsMatchAll,
        concepts: data.concepts,
        conceptsMatchAll: data.conceptsMatchAll,
        fieldFilters: data.fieldFilters,
      });

      setLastSearchQuery(query);
      
      // Fetch first 50 results
      const response = await sdk.cma.entry.getMany({
        query: { ...query, limit: 50 },
      });

      setSearchResults(response.items as unknown as SearchResult[]);
      setEstimatedCount(response.total);
      
      // Smooth scroll to results
      setTimeout(() => {
        const resultsElement = document.querySelector('[data-results-list]');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      sdk.notifier.error('Failed to search entries');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportSelected = async (selectedIds: string[]) => {
    try {
      setIsExporting(true);
      setProgress({
        fetched: 0,
        total: selectedIds.length,
        status: 'fetching',
        message: `Exporting ${selectedIds.length} selected entries...`,
      });

      // Fetch the full entries for selected IDs
      const entries: SearchResult[] = [];
      for (const id of selectedIds) {
        const entry = await sdk.cma.entry.get({ entryId: id });
        entries.push(entry as unknown as SearchResult);
      }

      // Get the form data to determine content type and fields
      const firstEntry = entries[0];
      const contentTypeId = firstEntry.sys.contentType.sys.id;
      
      // For selected entries, use the exporter with pre-fetched data
      const exporter = new Exporter(sdk.cma);
      exporterRef.current = exporter;

      // We'll need to modify the exporter to accept pre-fetched entries
      // For now, use the standard export with sys.id[in] filter
      const formData = {
        contentType: contentTypes.find(ct => ct.sys.id === contentTypeId) || null,
        contentTypeId,
        locales: locales.map(l => l.code),
      };

      await exporter.start(
        {
          contentType: formData.contentType,
          contentTypeId: contentTypeId || 'selected',
          locales: formData.locales,
          userMap: userMap,
          contentTypeMap: contentTypeSchemaMap,
          format: lastFormData?.format || 'csv',
          filters: {
            'sys.id[in]': selectedIds.join(','),
          },
          filename: `selected-${selectedIds.length}-entries-${new Date().toISOString().split('T')[0]}`,
        },
        (newProgress) => {
          setProgress(newProgress);
        }
      );

      if (progress?.status === 'complete') {
        sdk.notifier.success(`Successfully exported ${selectedIds.length} selected entries!`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      sdk.notifier.error(`Failed to export selected entries: ${message}`);
      console.error(error);
    } finally {
      setIsExporting(false);
      exporterRef.current = null;
    }
  };

  const handleLoadMore = async () => {
    if (!lastSearchQuery || searchResults.length === 0) return;

    try {
      setIsSearching(true);
      
      const response = await sdk.cma.entry.getMany({
        query: { ...lastSearchQuery, limit: 50, skip: searchResults.length },
      });

      setSearchResults([...searchResults, ...(response.items as unknown as SearchResult[])]);
    } catch (error) {
      sdk.notifier.error('Failed to load more results');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = async (data: ExportFormData) => {
    try {
      setLastFormData(data); // Save form data
      setIsExporting(true);
      setProgress({
        fetched: 0,
        total: 0,
        status: 'estimating',
        message: 'Starting export...',
      });

      const query = buildQuery({
        contentTypeId: data.contentTypeId,
        search: data.search,
        status: data.status,
        createdFrom: data.createdFrom,
        createdTo: data.createdTo,
        updatedFrom: data.updatedFrom,
        updatedTo: data.updatedTo,
        sort: data.sort,
        tags: data.tags,
        tagsMatchAll: data.tagsMatchAll,
        concepts: data.concepts,
        conceptsMatchAll: data.conceptsMatchAll,
        fieldFilters: data.fieldFilters,
      });

      const { content_type, ...filters } = query;

      const exporter = new Exporter(sdk.cma);
      exporterRef.current = exporter;

      await exporter.start(
        {
          contentType: data.contentType,
          contentTypeId: data.contentTypeId || 'all-content-types',
          locales: data.locales,
          fields: data.fields,
          filters,
          userMap: userMap,
          contentTypeMap: contentTypeSchemaMap,
          format: data.format || 'csv',
          filename: data.customFilename || 
            (data.contentTypeId ? 
              `${data.contentTypeId}-${new Date().toISOString().split('T')[0]}` :
              `contentful-export-${new Date().toISOString().split('T')[0]}`),
        },
        (newProgress) => {
          setProgress(newProgress);
        }
      );

      if (progress?.status === 'complete') {
        sdk.notifier.success(`Export completed! Downloaded ${progress.fetched} entries.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      sdk.notifier.error(`Export failed: ${message}`);
      console.error(error);
    } finally {
      setIsExporting(false);
      exporterRef.current = null;
    }
  };

  const handleCancel = () => {
    if (exporterRef.current) {
      exporterRef.current.cancel();
      sdk.notifier.warning('Cancelling export...');
    }
  };

  if (loading) {
    return (
      <Box style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <Stack padding="spacingL">
          <Note variant="primary" title="Loading">
            <Stack alignItems="center" spacing="spacingS">
              <Spinner />
              <Paragraph>Loading content types, locales, and tags...</Paragraph>
            </Stack>
          </Note>
        </Stack>
      </Box>
    );
  }

  return (
    <Box style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <Stack flexDirection="column" spacing="spacingL" padding="spacingL">
        <Heading>Bulk Entry CSV Exporter</Heading>
        
        <Paragraph>
          Export entries from a content type to CSV. This tool bypasses the 40-entry
          web UI limitation by paginating the Content Management API directly.
        </Paragraph>

        <ExportForm
        contentTypes={contentTypes}
        availableLocales={locales}
        availableTags={tags}
        availableConcepts={concepts}
        onSubmit={handleExport}
        onEstimate={handleEstimate}
        onSearch={handleSearch}
        onQuickExport={handleExport}
        isExporting={isExporting}
        isSearching={isSearching}
        estimatedCount={estimatedCount}
        spaceId={sdk.ids.space}
      />

        <ResultsList
          results={searchResults}
          loading={isSearching}
          onLoadMore={handleLoadMore}
          hasMore={estimatedCount ? searchResults.length < estimatedCount : false}
          totalCount={estimatedCount ?? undefined}
          selectedIds={selectedEntryIds}
          onSelectionChange={setSelectedEntryIds}
          onExportSelected={handleExportSelected}
          contentTypeMap={contentTypeMap}
          userMap={userMap}
          spaceId={sdk.ids.space}
          environmentId={sdk.ids.environment}
          isExporting={isExporting}
        />

        <ProgressPanel progress={progress} onCancel={handleCancel} />
      </Stack>
    </Box>
  );
};

export default Page;
