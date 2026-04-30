import { useState, useMemo } from 'react';
import { Table, Card, Stack, Text, Badge, Button, Spinner, Checkbox, Tooltip, Flex } from '@contentful/f36-components';
import { ExternalLinkIcon, ArrowUpIcon, ArrowDownIcon } from '@contentful/f36-icons';

type SortColumn = 'name' | 'contentType' | 'updated' | 'updatedBy' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps {
  column: SortColumn;
  label: string;
  activeColumn: SortColumn | null;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}

function SortableHeader({ column, label, activeColumn, direction, onSort }: SortableHeaderProps) {
  const isActive = activeColumn === column;
  const Icon = isActive && direction === 'desc' ? ArrowDownIcon : ArrowUpIcon;
  return (
    <Tooltip
      content={
        isActive
          ? `Sorted by ${label} (${direction === 'asc' ? 'ascending' : 'descending'}) — applies to your next export. Click to flip direction.`
          : `Sort by ${label}. Applies to the next export too.`
      }
      placement="top"
    >
      <Flex
        alignItems="center"
        gap="spacing2Xs"
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          padding: '2px 6px',
          borderRadius: '3px',
          backgroundColor: isActive ? 'var(--blue-100, rgba(13, 102, 208, 0.08))' : 'transparent',
          transition: 'background-color 120ms ease',
        }}
        onClick={() => onSort(column)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSort(column);
          }
        }}
      >
        <span
          style={{
            fontWeight: isActive ? 600 : 500,
            color: isActive ? 'var(--blue-600)' : 'inherit',
          }}
        >
          {label}
        </span>
        <Icon
          size="tiny"
          style={{
            opacity: isActive ? 1 : 0.35,
            color: isActive ? 'var(--blue-600)' : 'currentColor',
          }}
        />
      </Flex>
    </Tooltip>
  );
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
    publishedVersion?: number;
    version?: number;
    createdBy?: {
      sys: {
        id: string;
        linkType: string;
      };
    };
    updatedBy?: {
      sys: {
        id: string;
        linkType: string;
      };
    };
  };
  fields?: Record<string, Record<string, unknown>>;
  metadata?: {
    tags?: Array<{ sys: { id: string } }>;
  };
}

interface ContentTypeMap {
  [key: string]: {
    name: string;
    displayField?: string;
  };
}

interface UserMap {
  [key: string]: string;
}

export interface ResultsListProps {
  results: SearchResult[];
  loading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  totalCount?: number;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onExportSelected?: (selectedIds: string[]) => void;
  contentTypeMap?: ContentTypeMap;
  userMap?: UserMap;
  spaceId?: string;
  environmentId?: string;
  isExporting?: boolean;
  /**
   * Notify the parent when the user changes the column sort, so the next
   * Export can match the visible order.
   */
  onSortChange?: (sort: { column: SortColumn; direction: SortDirection } | null) => void;
}

export function ResultsList({ 
  results, 
  loading, 
  onLoadMore, 
  hasMore, 
  totalCount,
  selectedIds = [],
  onSelectionChange,
  onExportSelected,
  contentTypeMap = {},
  userMap = {},
  spaceId = '',
  environmentId = 'master',
  isExporting = false,
  onSortChange,
}: ResultsListProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // NOTE: All hooks must run on every render. The early returns below mean any
  // hook called after them would violate the rules of hooks (React error #310).
  // That's why this useMemo lives here, before any conditional return.
  const sortedResults = useMemo(() => {
    if (!sortColumn) return results;

    const titleOf = (entry: SearchResult): string => {
      if (!entry.fields) return entry.sys.id;
      const contentTypeId = entry.sys.contentType.sys.id;
      const displayField = contentTypeMap[contentTypeId]?.displayField;
      if (displayField && entry.fields[displayField]) {
        const firstValue = Object.values(entry.fields[displayField])[0];
        if (firstValue && typeof firstValue === 'string') return firstValue;
      }
      const titleFields = ['title', 'name', 'displayName', 'label', 'heading', 'internalName'];
      for (const field of titleFields) {
        if (entry.fields[field]) {
          const firstValue = Object.values(entry.fields[field])[0];
          if (firstValue && typeof firstValue === 'string') return firstValue;
        }
      }
      return entry.sys.id;
    };

    const contentTypeOf = (entry: SearchResult): string => {
      const id = entry.sys.contentType.sys.id;
      return contentTypeMap[id]?.name || id;
    };

    const updatedByOf = (entry: SearchResult): string => {
      const id = entry.sys.updatedBy?.sys.id;
      return id ? (userMap[id] || id) : 'Unknown';
    };

    const statusOf = (entry: SearchResult): string => {
      const hasPublished = entry.sys.publishedVersion !== undefined;
      const isChanged =
        hasPublished &&
        entry.sys.version !== undefined &&
        entry.sys.publishedVersion !== undefined &&
        entry.sys.version > entry.sys.publishedVersion + 1;
      if (!hasPublished) return 'draft';
      if (isChanged) return 'changed';
      return 'published';
    };

    const accessor = (entry: SearchResult): string => {
      switch (sortColumn) {
        case 'name':
          return titleOf(entry).toLowerCase();
        case 'contentType':
          return contentTypeOf(entry).toLowerCase();
        case 'updated':
          return entry.sys.updatedAt;
        case 'updatedBy':
          return updatedByOf(entry).toLowerCase();
        case 'status':
          return statusOf(entry);
      }
    };

    const sorted = [...results].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      // Tie-breaker: when primary values match (eg. all rows are the same
      // content type), fall back to most-recently-updated first, then by id
      // so the sort is deterministic and visibly reorders uniform data.
      if (a.sys.updatedAt !== b.sys.updatedAt) {
        return a.sys.updatedAt < b.sys.updatedAt ? 1 : -1;
      }
      return a.sys.id.localeCompare(b.sys.id);
    });

    return sortDirection === 'desc' ? sorted.reverse() : sorted;
  }, [results, sortColumn, sortDirection, contentTypeMap, userMap]);

  const handleSortClick = (column: SortColumn) => {
    if (sortColumn === column) {
      const nextDir: SortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(nextDir);
      onSortChange?.({ column, direction: nextDir });
    } else {
      setSortColumn(column);
      setSortDirection('asc');
      onSortChange?.({ column, direction: 'asc' });
    }
  };

  const sortColumnLabels: Record<SortColumn, string> = {
    name: 'Name',
    contentType: 'Content Type',
    updated: 'Updated',
    updatedBy: 'Last Updated By',
    status: 'Status',
  };

  if (loading && results.length === 0) {
    return (
      <Card padding="large">
        <Stack alignItems="center" spacing="spacingS">
          <Spinner />
          <Text>Loading results...</Text>
        </Stack>
      </Card>
    );
  }

  if (results.length === 0) {
    return null;
  }

  const allCurrentIds = results.map(r => r.sys.id);
  const allSelected = allCurrentIds.length > 0 && allCurrentIds.every(id => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (allSelected) {
      // Deselect all current page
      onSelectionChange(selectedIds.filter(id => !allCurrentIds.includes(id)));
    } else {
      // Select all current page
      const newSelection = [...new Set([...selectedIds, ...allCurrentIds])];
      onSelectionChange(newSelection);
    }
  };

  const handleSelectOne = (id: string) => {
    if (!onSelectionChange) return;
    
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const getTitle = (entry: SearchResult): string => {
    if (!entry.fields) return entry.sys.id;
    
    // Get the display field from content type map
    const contentTypeId = entry.sys.contentType.sys.id;
    const displayField = contentTypeMap[contentTypeId]?.displayField;
    
    // Try display field first if available
    if (displayField && entry.fields[displayField]) {
      const localeValues = entry.fields[displayField];
      const firstValue = Object.values(localeValues)[0];
      if (firstValue && typeof firstValue === 'string') {
        return firstValue;
      }
    }
    
    // Try common title fields
    const titleFields = ['title', 'name', 'displayName', 'label', 'heading', 'internalName'];
    for (const field of titleFields) {
      if (entry.fields[field]) {
        const localeValues = entry.fields[field];
        const firstValue = Object.values(localeValues)[0];
        if (firstValue && typeof firstValue === 'string') {
          return firstValue;
        }
      }
    }
    
    // Fallback to entry ID
    return entry.sys.id;
  };

  const getContentTypeName = (entry: SearchResult): string => {
    const contentTypeId = entry.sys.contentType.sys.id;
    return contentTypeMap[contentTypeId]?.name || contentTypeId;
  };

  const getStatus = (entry: SearchResult): string => {
    const hasPublished = entry.sys.publishedVersion !== undefined;
    const isChanged = hasPublished && entry.sys.version !== undefined && 
                      entry.sys.publishedVersion !== undefined &&
                      entry.sys.version > entry.sys.publishedVersion + 1;
    
    if (!hasPublished) {
      return 'draft';
    }
    if (isChanged) {
      return 'changed';
    }
    return 'published';
  };

  const getLastUpdatedBy = (entry: SearchResult): string => {
    if (entry.sys.updatedBy?.sys.id) {
      return userMap[entry.sys.updatedBy.sys.id] || entry.sys.updatedBy.sys.id;
    }
    return 'Unknown';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  return (
    <Card data-results-list>
      <Stack flexDirection="column" spacing="spacingS">
        <Stack justifyContent="space-between" alignItems="center" padding="spacingM">
          <Stack spacing="spacingM" alignItems="center">
            <Text fontWeight="fontWeightDemiBold">
              Search Results {totalCount !== undefined && `(${totalCount.toLocaleString()} total)`}
            </Text>
            {sortColumn && (
              <Tooltip
                content="This sort applies to your next export — the file rows will match the order shown below"
                placement="top"
              >
                <Badge variant="secondary">
                  Sorted by {sortColumnLabels[sortColumn]} ({sortDirection === 'asc' ? 'A→Z' : 'Z→A'})
                </Badge>
              </Tooltip>
            )}
            {selectedIds.length > 0 && (
              <>
                <Badge variant="primary">{selectedIds.length} selected</Badge>
                {(() => {
                  const contentTypeIds = new Set(
                    results
                      .filter(r => selectedIds.includes(r.sys.id))
                      .map(r => r.sys.contentType.sys.id)
                  );
                  if (contentTypeIds.size > 1) {
                    return (
                      <Text fontSize="fontSizeS" fontColor="gray600">
                        ({contentTypeIds.size} content types)
                      </Text>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </Stack>
          <Stack spacing="spacingS" alignItems="center">
            {results.length > 0 && totalCount && (
              <Text fontSize="fontSizeS" fontColor="gray500">
                Showing {results.length} of {totalCount.toLocaleString()}
              </Text>
            )}
            {selectedIds.length > 0 && onExportSelected && (
              <Button
                size="small"
                variant="primary"
                onClick={() => onExportSelected(selectedIds)}
                isDisabled={isExporting}
              >
                Export Selected ({selectedIds.length})
              </Button>
            )}
          </Stack>
        </Stack>

        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell>
                {onSelectionChange && (
                  <Checkbox
                    isChecked={allSelected}
                    isIndeterminate={someSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all entries on this page"
                  />
                )}
              </Table.Cell>
              <Table.Cell>
                <SortableHeader
                  column="name"
                  label="Name"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSortClick}
                />
              </Table.Cell>
              <Table.Cell>
                <SortableHeader
                  column="contentType"
                  label="Content Type"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSortClick}
                />
              </Table.Cell>
              <Table.Cell>
                <SortableHeader
                  column="updated"
                  label="Updated"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSortClick}
                />
              </Table.Cell>
              <Table.Cell>
                <SortableHeader
                  column="updatedBy"
                  label="Last updated by"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSortClick}
                />
              </Table.Cell>
              <Table.Cell>
                <SortableHeader
                  column="status"
                  label="Status"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSortClick}
                />
              </Table.Cell>
              <Table.Cell></Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {sortedResults.map((entry) => {
              const status = getStatus(entry);
              return (
                <Table.Row key={entry.sys.id}>
                  <Table.Cell>
                    {onSelectionChange && (
                      <Checkbox
                        isChecked={selectedIds.includes(entry.sys.id)}
                        onChange={() => handleSelectOne(entry.sys.id)}
                        aria-label={`Select ${getTitle(entry)}`}
                      />
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontWeight="fontWeightMedium">{getTitle(entry)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text>{getContentTypeName(entry)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="fontSizeS">{formatDate(entry.sys.updatedAt)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="fontSizeS">{getLastUpdatedBy(entry)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="fontSizeS">{status}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Tooltip content="Open entry in Contentful" placement="top">
                      <Button
                        size="small"
                        variant="transparent"
                        endIcon={<ExternalLinkIcon />}
                        as="a"
                        href={`https://app.contentful.com/spaces/${spaceId}/environments/${environmentId}/entries/${entry.sys.id}`}
                        target="_blank"
                      >
                        View
                      </Button>
                    </Tooltip>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>

        {hasMore && (
          <Stack justifyContent="center" padding="spacingM">
            <Button
              variant="secondary"
              onClick={onLoadMore}
              isDisabled={loading}
              isLoading={loading}
            >
              Load More
            </Button>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
