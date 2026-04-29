import { Table, Card, Stack, Text, Badge, Button, Spinner, Checkbox } from '@contentful/f36-components';
import { ExternalLinkIcon } from '@contentful/f36-icons';

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
}: ResultsListProps) {
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
    <Card>
      <Stack flexDirection="column" spacing="spacingS">
        <Stack justifyContent="space-between" alignItems="center" padding="spacingM">
          <Stack spacing="spacingM" alignItems="center">
            <Text fontWeight="fontWeightDemiBold">
              Search Results {totalCount !== undefined && `(${totalCount.toLocaleString()} total)`}
            </Text>
            {selectedIds.length > 0 && (
              <Badge variant="primary">{selectedIds.length} selected</Badge>
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
              <Table.Cell>Name</Table.Cell>
              <Table.Cell>Content Type</Table.Cell>
              <Table.Cell>Updated</Table.Cell>
              <Table.Cell>Last updated by</Table.Cell>
              <Table.Cell>Status</Table.Cell>
              <Table.Cell></Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {results.map((entry) => {
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
                    <Button
                      size="small"
                      variant="transparent"
                      endIcon={<ExternalLinkIcon />}
                      as="a"
                      href={`https://app.contentful.com/spaces/${entry.sys.id.split('-')[0]}/entries/${entry.sys.id}`}
                      target="_blank"
                    >
                      View
                    </Button>
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
