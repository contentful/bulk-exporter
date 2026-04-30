import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Form,
  FormControl,
  Select,
  Checkbox,
  Button,
  TextInput,
  Tabs,
  Stack,
  Radio,
  IconButton,
  Flex,
  Box,
  Spinner,
  Badge,
  Tooltip,
  Menu,
  Subheading,
  TextLink,
} from '@contentful/f36-components';
import {
  PlusIcon,
  DeleteIcon,
  FilterIcon,
  InfoCircleIcon,
  ChevronDownIcon,
  SearchIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CloseIcon,
} from '@contentful/f36-icons';
import type { ContentType } from '../lib/flatten';
import type { EntryStatus, FieldFilter } from '../lib/queryBuilder';
import type { ExportFormat } from '../lib/exportFormats';
import { getFileExtension, getFormatName } from '../lib/exportFormats';
import {
  getFieldPreferences,
  saveFieldPreferences,
  getSpacePreferences,
  saveSpacePreferences,
  type FieldPreset,
} from '../lib/preferences';
import {
  getSmartDefaults,
  applyPreset,
  groupFields,
  detectPreset,
} from '../lib/fieldSelection';

export interface ExportFormData {
  contentType: ContentType | null;
  contentTypeId: string;
  locales: string[];
  fields?: string[]; // Selected fields to export
  search?: string;
  status?: EntryStatus;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sort?: string;
  tags?: string[];
  tagsMatchAll?: boolean;
  concepts?: string[];
  conceptsMatchAll?: boolean;
  fieldFilters?: FieldFilter[];
  customFilename?: string;
  format?: ExportFormat; // Export format
}

export interface ExportFormProps {
  contentTypes: ContentType[];
  availableLocales: Array<{ code: string; name: string }>;
  availableTags: Array<{ sys: { id: string }; name: string }>;
  availableConcepts: Array<{ sys: { id: string }; prefLabel: Record<string, string> }>;
  onSubmit: (data: ExportFormData) => void;
  onEstimate: (data: ExportFormData) => void;
  onSearch: (data: ExportFormData) => void;
  onQuickExport?: (data: ExportFormData, format: ExportFormat) => void;
  isExporting: boolean;
  isSearching: boolean;
  estimatedCount: number | null;
  spaceId: string;
}

export function ExportForm({
  contentTypes,
  availableLocales,
  availableTags,
  availableConcepts,
  onSubmit,
  onEstimate,
  onSearch,
  onQuickExport,
  isExporting,
  isSearching,
  estimatedCount,
  spaceId,
}: ExportFormProps) {
  const initialSpacePrefs = useMemo(() => getSpacePreferences(spaceId), [spaceId]);

  const [contentTypeId, setContentTypeId] = useState('');
  const [selectedLocales, setSelectedLocales] = useState<string[]>(
    availableLocales.map(l => l.code)
  );
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState<FieldPreset>('essentials');
  const [fieldSearch, setFieldSearch] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EntryStatus>('any');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [updatedFrom, setUpdatedFrom] = useState('');
  const [updatedTo, setUpdatedTo] = useState('');
  const [sort, setSort] = useState('sys.createdAt');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsMatchAll, setTagsMatchAll] = useState(false);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [conceptsMatchAll, setConceptsMatchAll] = useState(false);
  const [fieldFilters, setFieldFilters] = useState<FieldFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [customFilename, setCustomFilename] = useState(initialSpacePrefs.filenamePattern ?? '');
  const [format, setFormat] = useState<ExportFormat>(initialSpacePrefs.format ?? 'csv');

  const selectedContentType = useMemo(
    () => contentTypes.find(ct => ct.sys.id === contentTypeId) || null,
    [contentTypes, contentTypeId]
  );

  // When content type changes: load saved field prefs or apply smart defaults
  useEffect(() => {
    if (!selectedContentType) {
      setSelectedFields([]);
      setActivePreset('essentials');
      setFieldSearch('');
      return;
    }

    const saved = getFieldPreferences(spaceId, selectedContentType.sys.id);
    if (saved && saved.selectedFields.length > 0) {
      setSelectedFields(saved.selectedFields);
      setActivePreset(saved.lastPreset ?? detectPreset(selectedContentType, saved.selectedFields));
    } else {
      const defaults = getSmartDefaults(selectedContentType);
      setSelectedFields(defaults);
      setActivePreset('essentials');
    }
    setFieldSearch('');
  }, [selectedContentType, spaceId]);

  // Debounced save of field selection
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selectedContentType) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveFieldPreferences(spaceId, selectedContentType.sys.id, {
        selectedFields,
        lastPreset: activePreset,
      });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [selectedFields, activePreset, selectedContentType, spaceId]);

  // Persist format and filename pattern at the space level
  useEffect(() => {
    if (!spaceId) return;
    saveSpacePreferences(spaceId, { format });
  }, [format, spaceId]);

  useEffect(() => {
    if (!spaceId) return;
    if (customFilename) {
      saveSpacePreferences(spaceId, { filenamePattern: customFilename });
    }
  }, [customFilename, spaceId]);

  const fieldGroups = useMemo(
    () => (selectedContentType ? groupFields(selectedContentType, fieldSearch) : []),
    [selectedContentType, fieldSearch]
  );

  const handlePreset = (preset: FieldPreset) => {
    if (!selectedContentType) return;
    setSelectedFields(applyPreset(selectedContentType, preset));
    setActivePreset(preset);
  };

  const handleResetDefaults = () => {
    if (!selectedContentType) return;
    setSelectedFields(getSmartDefaults(selectedContentType));
    setActivePreset('essentials');
  };

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    setSelectedFields(prev => {
      const next = checked ? [...prev, fieldId] : prev.filter(id => id !== fieldId);
      if (selectedContentType) {
        setActivePreset(detectPreset(selectedContentType, next));
      }
      return next;
    });
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setSelectedFields(prev => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      setActivePreset('custom');
      return next;
    });
  };

  const removeField = (fieldId: string) => {
    setSelectedFields(prev => {
      const next = prev.filter(id => id !== fieldId);
      if (selectedContentType) {
        setActivePreset(detectPreset(selectedContentType, next));
      }
      return next;
    });
  };

  const fieldsById = useMemo(() => {
    const map: Record<string, ContentType['fields'][number]> = {};
    if (selectedContentType) {
      for (const f of selectedContentType.fields) {
        map[f.id] = f;
      }
    }
    return map;
  }, [selectedContentType]);

  const defaultFilename = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return `${contentTypeId || 'contentful-export'}-${today}`;
  }, [contentTypeId]);

  const filenameWithExtension = useMemo(() => {
    const base = customFilename || defaultFilename;
    const extension = getFileExtension(format);
    return base.endsWith(extension) ? base : `${base}${extension}`;
  }, [customFilename, defaultFilename, format]);

  const activeFilters = useMemo(() => {
    const filters: Array<{ label: string; onRemove: () => void }> = [];
    
    if (status !== 'any') {
      filters.push({
        label: `Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        onRemove: () => setStatus('any'),
      });
    }
    
    if (createdFrom || createdTo) {
      filters.push({
        label: `Created: ${createdFrom || '∞'} → ${createdTo || '∞'}`,
        onRemove: () => {
          setCreatedFrom('');
          setCreatedTo('');
        },
      });
    }
    
    if (updatedFrom || updatedTo) {
      filters.push({
        label: `Updated: ${updatedFrom || '∞'} → ${updatedTo || '∞'}`,
        onRemove: () => {
          setUpdatedFrom('');
          setUpdatedTo('');
        },
      });
    }
    
    return filters;
  }, [status, createdFrom, createdTo, updatedFrom, updatedTo]);

  const formData: ExportFormData = {
    contentType: selectedContentType,
    contentTypeId,
    locales: selectedLocales,
    fields: selectedFields.length > 0 ? selectedFields : undefined,
    search,
    status,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    sort,
    tags: selectedTags,
    tagsMatchAll,
    concepts: selectedConcepts,
    conceptsMatchAll,
    fieldFilters,
    customFilename: customFilename || defaultFilename,
    format,
  };

  const handleEstimate = () => {
    onEstimate(formData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleAddFieldFilter = () => {
    setFieldFilters([...fieldFilters, { fieldId: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveFieldFilter = (index: number) => {
    setFieldFilters(fieldFilters.filter((_, i) => i !== index));
  };

  const handleFieldFilterChange = (index: number, key: keyof FieldFilter, value: string) => {
    const updated = [...fieldFilters];
    updated[index] = { ...updated[index], [key]: value };
    setFieldFilters(updated);
  };

  const handleQuickExport = (selectedFormat: ExportFormat) => {
    if (onQuickExport) {
      // Quick export uses smart defaults
      const quickExportData: ExportFormData = {
        ...formData,
        locales: availableLocales.map(l => l.code), // All locales
        fields: undefined, // All fields
        customFilename: undefined, // Auto-generated filename
        format: selectedFormat,
      };
      onQuickExport(quickExportData, selectedFormat);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Tabs defaultTab="filter">
        <Tabs.List>
          <Tabs.Tab panelId="filter">Filter</Tabs.Tab>
          {(availableTags.length > 0 || availableConcepts.length > 0) && (
            <Tabs.Tab panelId="taxonomy">Tags & Taxonomy</Tabs.Tab>
          )}
          <Tabs.Tab panelId="advanced">Advanced</Tabs.Tab>
          <Tabs.Tab panelId="output">Output</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="filter">
          <Box marginTop="spacingM">
            <Stack flexDirection="column" spacing="spacingM">
              {/* Horizontal search bar - Contentful style */}
              <Flex gap="spacingS" alignItems="center">
                <Tooltip content="Select a specific content type to export, or choose 'Any' to search across all content types" placement="top">
                  <Box style={{ width: '200px' }}>
                    <Select
                      value={contentTypeId}
                      onChange={(e) => setContentTypeId(e.target.value)}
                      isDisabled={isExporting}
                    >
                      <Select.Option value="">Any</Select.Option>
                      {contentTypes.map((ct) => (
                        <Select.Option key={ct.sys.id} value={ct.sys.id}>
                          {ct.sys.id}
                        </Select.Option>
                      ))}
                    </Select>
                  </Box>
                </Tooltip>
                
                <Tooltip content="Full-text search across all entry fields. Leave empty to export all entries matching other filters" placement="top">
                  <Box style={{ flexGrow: 1 }}>
                    <TextInput
                      placeholder="Type to search for entries"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      isDisabled={isExporting}
                    />
                  </Box>
                </Tooltip>
                
                <Tooltip content="Show advanced filters for status, dates, and sorting options" placement="top">
                  <Button
                    variant={showFilters ? 'primary' : 'secondary'}
                    startIcon={<FilterIcon />}
                    onClick={() => setShowFilters(!showFilters)}
                    isDisabled={isExporting}
                  >
                    Filter
                    {activeFilters.length > 0 && ` (${activeFilters.length})`}
                  </Button>
                </Tooltip>
              </Flex>

              {/* Active filter pills */}
              {activeFilters.length > 0 && (
                <Flex gap="spacingXs" flexWrap="wrap">
                  {activeFilters.map((filter, index) => (
                    <Tooltip key={index} content="Click to remove this filter" placement="top">
                      <Badge
                        variant="primary"
                        style={{ cursor: 'pointer' }}
                        onClick={filter.onRemove}
                      >
                        {filter.label} ×
                      </Badge>
                    </Tooltip>
                  ))}
                </Flex>
              )}

              {/* Collapsible filter panel */}
              {showFilters && (
                <Box
                  padding="spacingM"
                  style={{
                    backgroundColor: 'var(--gray-100)',
                    borderRadius: '4px',
                  }}
                >
                  <Stack flexDirection="column" spacing="spacingM">
                    <FormControl>
                      <Flex alignItems="center" gap="spacingXs">
                        <FormControl.Label>Status</FormControl.Label>
                        <Tooltip content="Filter entries by publication status" placement="right">
                          <IconButton
                            variant="transparent"
                            icon={<InfoCircleIcon />}
                            aria-label="Help"
                            size="small"
                            style={{ padding: 0, minHeight: 'auto' }}
                          />
                        </Tooltip>
                      </Flex>
                      <Radio.Group
                        name="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as EntryStatus)}
                      >
                        <Stack flexDirection="row" spacing="spacingS" flexWrap="wrap">
                          <Radio value="any" isDisabled={isExporting}>Any</Radio>
                          <Radio value="published" isDisabled={isExporting}>Published</Radio>
                          <Radio value="draft" isDisabled={isExporting}>Draft</Radio>
                          <Radio value="changed" isDisabled={isExporting}>Changed</Radio>
                          <Radio value="archived" isDisabled={isExporting}>Archived</Radio>
                        </Stack>
                      </Radio.Group>
                    </FormControl>

                    <FormControl>
                      <Flex alignItems="center" gap="spacingXs">
                        <FormControl.Label>Sort By</FormControl.Label>
                        <Tooltip content="Choose the order for your export. Sorting by creation date is most efficient for large exports" placement="right">
                          <IconButton
                            variant="transparent"
                            icon={<InfoCircleIcon />}
                            aria-label="Help"
                            size="small"
                            style={{ padding: 0, minHeight: 'auto' }}
                          />
                        </Tooltip>
                      </Flex>
                      <Select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        isDisabled={isExporting}
                      >
                        <Select.Option value="sys.createdAt">Created (oldest first)</Select.Option>
                        <Select.Option value="-sys.createdAt">Created (newest first)</Select.Option>
                        <Select.Option value="sys.updatedAt">Updated (oldest first)</Select.Option>
                        <Select.Option value="-sys.updatedAt">Updated (newest first)</Select.Option>
                      </Select>
                    </FormControl>

                    <Flex gap="spacingM" flexDirection="row">
                      <Box style={{ flex: 1 }}>
                        <FormControl>
                          <Flex alignItems="center" gap="spacingXs">
                            <FormControl.Label>Created Date Range</FormControl.Label>
                            <Tooltip content="Filter entries created within a specific date range" placement="right">
                              <IconButton
                                variant="transparent"
                                icon={<InfoCircleIcon />}
                                aria-label="Help"
                                size="small"
                                style={{ padding: 0, minHeight: 'auto' }}
                              />
                            </Tooltip>
                          </Flex>
                          <Stack flexDirection="row" spacing="spacingS">
                            <TextInput
                              type="date"
                              placeholder="From"
                              value={createdFrom}
                              onChange={(e) => setCreatedFrom(e.target.value)}
                              isDisabled={isExporting}
                            />
                            <TextInput
                              type="date"
                              placeholder="To"
                              value={createdTo}
                              onChange={(e) => setCreatedTo(e.target.value)}
                              isDisabled={isExporting}
                            />
                          </Stack>
                        </FormControl>
                      </Box>

                      <Box style={{ flex: 1 }}>
                        <FormControl>
                          <Flex alignItems="center" gap="spacingXs">
                            <FormControl.Label>Updated Date Range</FormControl.Label>
                            <Tooltip content="Filter entries last updated within a specific date range" placement="right">
                              <IconButton
                                variant="transparent"
                                icon={<InfoCircleIcon />}
                                aria-label="Help"
                                size="small"
                                style={{ padding: 0, minHeight: 'auto' }}
                              />
                            </Tooltip>
                          </Flex>
                          <Stack flexDirection="row" spacing="spacingS">
                            <TextInput
                              type="date"
                              placeholder="From"
                              value={updatedFrom}
                              onChange={(e) => setUpdatedFrom(e.target.value)}
                              isDisabled={isExporting}
                            />
                            <TextInput
                              type="date"
                              placeholder="To"
                              value={updatedTo}
                              onChange={(e) => setUpdatedTo(e.target.value)}
                              isDisabled={isExporting}
                            />
                          </Stack>
                        </FormControl>
                      </Box>
                    </Flex>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        </Tabs.Panel>

        {(availableTags.length > 0 || availableConcepts.length > 0) && (
          <Tabs.Panel id="taxonomy">
            <Stack flexDirection="column" spacing="spacingM" marginTop="spacingM">
              {availableTags.length > 0 && (
                <FormControl>
                  <Flex alignItems="center" gap="spacingXs">
                    <FormControl.Label>Tags</FormControl.Label>
                    <Tooltip content="Filter entries that have any or all of the selected tags" placement="right">
                      <IconButton
                        variant="transparent"
                        icon={<InfoCircleIcon />}
                        aria-label="Help"
                        size="small"
                        style={{ padding: 0, minHeight: 'auto' }}
                      />
                    </Tooltip>
                  </Flex>
                  {availableTags.map((tag) => (
                    <Checkbox
                      key={tag.sys.id}
                      value={tag.sys.id}
                      isChecked={selectedTags.includes(tag.sys.id)}
                      onChange={(e) => {
                        const tagId = tag.sys.id;
                        setSelectedTags((prev) =>
                          e.target.checked
                            ? [...prev, tagId]
                            : prev.filter((id) => id !== tagId)
                        );
                      }}
                      isDisabled={isExporting}
                    >
                      {tag.name}
                    </Checkbox>
                  ))}
                  {selectedTags.length > 0 && (
                    <Tooltip content="When checked, only entries with ALL selected tags will be included (AND logic)" placement="right">
                      <Checkbox
                        isChecked={tagsMatchAll}
                        onChange={(e) => setTagsMatchAll(e.target.checked)}
                        isDisabled={isExporting}
                      >
                        Match all selected tags (AND)
                      </Checkbox>
                    </Tooltip>
                  )}
                </FormControl>
              )}

              {availableConcepts.length > 0 && (
                <FormControl>
                  <Flex alignItems="center" gap="spacingXs">
                    <FormControl.Label>Taxonomy Concepts</FormControl.Label>
                    <Tooltip content="Filter entries linked to taxonomy concepts from your content model" placement="right">
                      <IconButton
                        variant="transparent"
                        icon={<InfoCircleIcon />}
                        aria-label="Help"
                        size="small"
                        style={{ padding: 0, minHeight: 'auto' }}
                      />
                    </Tooltip>
                  </Flex>
                  {availableConcepts.map((concept) => (
                    <Checkbox
                      key={concept.sys.id}
                      value={concept.sys.id}
                      isChecked={selectedConcepts.includes(concept.sys.id)}
                      onChange={(e) => {
                        const conceptId = concept.sys.id;
                        setSelectedConcepts((prev) =>
                          e.target.checked
                            ? [...prev, conceptId]
                            : prev.filter((id) => id !== conceptId)
                        );
                      }}
                      isDisabled={isExporting}
                    >
                      {Object.values(concept.prefLabel)[0] || concept.sys.id}
                    </Checkbox>
                  ))}
                  {selectedConcepts.length > 0 && (
                    <Tooltip content="When checked, only entries with ALL selected concepts will be included (AND logic)" placement="right">
                      <Checkbox
                        isChecked={conceptsMatchAll}
                        onChange={(e) => setConceptsMatchAll(e.target.checked)}
                        isDisabled={isExporting}
                      >
                        Match all selected concepts (AND)
                      </Checkbox>
                    </Tooltip>
                  )}
                </FormControl>
              )}
            </Stack>
          </Tabs.Panel>
        )}

        <Tabs.Panel id="advanced">
          <Box marginTop="spacingM">
            <Stack flexDirection="column" spacing="spacingS">
              <FormControl marginBottom="spacingXs">
                <Flex alignItems="center" gap="spacingXs">
                  <FormControl.Label>Field-Level Filters</FormControl.Label>
                  <Tooltip content="Create custom filters on specific fields. Useful for precise data exports (e.g., 'price greater than 100')" placement="right">
                    <IconButton
                      variant="transparent"
                      icon={<InfoCircleIcon />}
                      aria-label="Help"
                      size="small"
                      style={{ padding: 0, minHeight: 'auto' }}
                    />
                  </Tooltip>
                </Flex>
                <FormControl.HelpText>
                  Add custom filters on specific fields
                </FormControl.HelpText>
              </FormControl>

              {fieldFilters.map((filter, index) => (
                <Box
                  key={index}
                  padding="spacingS"
                  style={{
                    backgroundColor: 'var(--gray-100)',
                    borderRadius: '4px',
                  }}
                >
                  <Flex gap="spacingXs" alignItems="center">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Select
                        value={filter.fieldId}
                        onChange={(e) => handleFieldFilterChange(index, 'fieldId', e.target.value)}
                        isDisabled={isExporting || !selectedContentType}
                        size="small"
                      >
                        <Select.Option value="">Select field</Select.Option>
                        {selectedContentType?.fields.map((field) => (
                          <Select.Option key={field.id} value={field.id}>
                            {field.name || field.id}
                          </Select.Option>
                        ))}
                      </Select>
                    </Box>

                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Select
                        value={filter.operator}
                        onChange={(e) => handleFieldFilterChange(index, 'operator', e.target.value)}
                        isDisabled={isExporting}
                        size="small"
                      >
                        <Select.Option value="equals">Equals</Select.Option>
                        <Select.Option value="not_equals">Not equals</Select.Option>
                        <Select.Option value="contains">Contains</Select.Option>
                        <Select.Option value="gt">Greater than</Select.Option>
                        <Select.Option value="gte">Greater than or equal</Select.Option>
                        <Select.Option value="lt">Less than</Select.Option>
                        <Select.Option value="lte">Less than or equal</Select.Option>
                        <Select.Option value="exists">Exists</Select.Option>
                        <Select.Option value="is_true">Is true</Select.Option>
                        <Select.Option value="is_false">Is false</Select.Option>
                        <Select.Option value="links_to">Links to entry ID</Select.Option>
                      </Select>
                    </Box>

                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <TextInput
                        value={filter.value}
                        onChange={(e) => handleFieldFilterChange(index, 'value', e.target.value)}
                        isDisabled={isExporting || filter.operator === 'is_true' || filter.operator === 'is_false'}
                        placeholder="Value"
                        size="small"
                      />
                    </Box>

                    <IconButton
                      variant="transparent"
                      icon={<DeleteIcon />}
                      aria-label="Remove filter"
                      onClick={() => handleRemoveFieldFilter(index)}
                      isDisabled={isExporting}
                      size="small"
                    />
                  </Flex>
                </Box>
              ))}

              <Box marginTop="spacingXs">
                <Tooltip content="Add a new field filter. You must select a content type first to see available fields" placement="right">
                  <Button
                    startIcon={<PlusIcon />}
                    variant="secondary"
                    size="small"
                    onClick={handleAddFieldFilter}
                    isDisabled={isExporting || !selectedContentType}
                  >
                    Add Field Filter
                  </Button>
                </Tooltip>
              </Box>
            </Stack>
          </Box>
        </Tabs.Panel>

        <Tabs.Panel id="output">
          <Box marginTop="spacingM">
            <Flex gap="spacingL" flexDirection="row" alignItems="flex-start">
              <Box style={{ flex: 1 }}>
                <FormControl>
                  <Flex alignItems="center" gap="spacingXs">
                    <FormControl.Label>Locales</FormControl.Label>
                    <Tooltip content="Select which language versions to include in your export. Each locale will create separate columns in the CSV" placement="right">
                      <IconButton
                        variant="transparent"
                        icon={<InfoCircleIcon />}
                        aria-label="Help"
                        size="small"
                        style={{ padding: 0, minHeight: 'auto' }}
                      />
                    </Tooltip>
                  </Flex>
                  <FormControl.HelpText>
                    Select which locales to include
                  </FormControl.HelpText>
                  <Checkbox.Group
                    value={selectedLocales}
                    onChange={(e) => {
                      const target = e.target as HTMLInputElement;
                      const value = target.value;
                      setSelectedLocales((prev) =>
                        target.checked
                          ? [...prev, value]
                          : prev.filter((v) => v !== value)
                      );
                    }}
                  >
                    {availableLocales.map((locale) => (
                      <Checkbox
                        key={locale.code}
                        value={locale.code}
                        isChecked={selectedLocales.includes(locale.code)}
                        isDisabled={isExporting}
                      >
                        {locale.name} ({locale.code})
                      </Checkbox>
                    ))}
                  </Checkbox.Group>
                </FormControl>
              </Box>

              <Box style={{ flex: 1 }}>
                <Stack flexDirection="column" spacing="spacingM">
                  <FormControl>
                    <Flex alignItems="center" gap="spacingXs">
                      <FormControl.Label>Export Format</FormControl.Label>
                      <Tooltip content="Choose the file format for your export. CSV for spreadsheets, JSON for APIs, XLSX for Excel, XML for enterprise systems, YAML for configs" placement="right">
                        <IconButton
                          variant="transparent"
                          icon={<InfoCircleIcon />}
                          aria-label="Help"
                          size="small"
                          style={{ padding: 0, minHeight: 'auto' }}
                        />
                      </Tooltip>
                    </Flex>
                    <Select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as ExportFormat)}
                      isDisabled={isExporting}
                    >
                      <Select.Option value="csv">CSV - Comma-Separated Values</Select.Option>
                      <Select.Option value="json">JSON - JavaScript Object Notation</Select.Option>
                      <Select.Option value="xlsx">XLSX - Excel Workbook</Select.Option>
                      <Select.Option value="xml">XML - Extensible Markup Language</Select.Option>
                      <Select.Option value="yaml">YAML - YAML Ain't Markup Language</Select.Option>
                    </Select>
                    <FormControl.HelpText>
                      Selected format: {getFormatName(format)}
                    </FormControl.HelpText>
                  </FormControl>

                  {selectedContentType && (
                    <FormControl>
                      <Flex alignItems="center" gap="spacingXs">
                        <FormControl.Label>Fields to Export</FormControl.Label>
                        <Tooltip content="Pick a preset or hand-pick fields. Your selections are saved per content type in this browser, so each user keeps their own preferences" placement="right">
                          <IconButton
                            variant="transparent"
                            icon={<InfoCircleIcon />}
                            aria-label="Help"
                            size="small"
                            style={{ padding: 0, minHeight: 'auto' }}
                          />
                        </Tooltip>
                      </Flex>
                      <FormControl.HelpText>
                        {selectedFields.length === 0
                          ? 'No fields selected — export will include only system fields'
                          : `${selectedFields.length} of ${selectedContentType.fields.length} fields selected`}
                      </FormControl.HelpText>

                      <Flex gap="spacingXs" flexWrap="wrap" marginBottom="spacingS">
                        <Tooltip content="Title field, slug, and required identifiers" placement="top">
                          <Button
                            size="small"
                            variant={activePreset === 'essentials' ? 'primary' : 'secondary'}
                            onClick={() => handlePreset('essentials')}
                            isDisabled={isExporting}
                          >
                            Essentials
                          </Button>
                        </Tooltip>
                        <Tooltip content="Text-based fields only (Symbol, Text, Rich Text, Date)" placement="top">
                          <Button
                            size="small"
                            variant={activePreset === 'content' ? 'primary' : 'secondary'}
                            onClick={() => handlePreset('content')}
                            isDisabled={isExporting}
                          >
                            Content
                          </Button>
                        </Tooltip>
                        <Tooltip content="Reference fields only (Link to Entry/Asset)" placement="top">
                          <Button
                            size="small"
                            variant={activePreset === 'references' ? 'primary' : 'secondary'}
                            onClick={() => handlePreset('references')}
                            isDisabled={isExporting}
                          >
                            References
                          </Button>
                        </Tooltip>
                        <Tooltip content="Include every field from this content type" placement="top">
                          <Button
                            size="small"
                            variant={activePreset === 'all' ? 'primary' : 'secondary'}
                            onClick={() => handlePreset('all')}
                            isDisabled={isExporting}
                          >
                            All
                          </Button>
                        </Tooltip>
                        <Tooltip content="Deselect every field" placement="top">
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => {
                              setSelectedFields([]);
                              setActivePreset('custom');
                            }}
                            isDisabled={isExporting}
                          >
                            Clear
                          </Button>
                        </Tooltip>
                      </Flex>

                      {selectedFields.length > 0 && (
                        <Box marginBottom="spacingS">
                          <Flex alignItems="center" gap="spacingXs" marginBottom="spacingXs">
                            <Subheading
                              marginBottom="none"
                              style={{
                                fontSize: '12px',
                                textTransform: 'uppercase',
                                color: 'var(--gray-700)',
                              }}
                            >
                              Column Order
                            </Subheading>
                            <Tooltip
                              content="Drag-style reorder using the arrows. Columns appear in this exact order in your export"
                              placement="right"
                            >
                              <IconButton
                                variant="transparent"
                                icon={<InfoCircleIcon />}
                                aria-label="Help"
                                size="small"
                                style={{ padding: 0, minHeight: 'auto' }}
                              />
                            </Tooltip>
                          </Flex>
                          <Box
                            style={{
                              border: '1px solid var(--gray-200)',
                              borderRadius: '4px',
                              padding: 'var(--spacing-xs)',
                              backgroundColor: 'var(--gray-100)',
                              maxHeight: '200px',
                              overflowY: 'auto',
                            }}
                          >
                            <Stack flexDirection="column" spacing="spacingXs" alignItems="stretch">
                              {selectedFields.map((fieldId, index) => {
                                const field = fieldsById[fieldId];
                                if (!field) return null;
                                return (
                                  <Flex
                                    key={fieldId}
                                    alignItems="center"
                                    gap="spacingXs"
                                    style={{
                                      backgroundColor: 'var(--white)',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--gray-200)',
                                    }}
                                  >
                                    <Box style={{ minWidth: '24px', color: 'var(--gray-600)', fontSize: '12px' }}>
                                      {index + 1}.
                                    </Box>
                                    <Box style={{ flexGrow: 1, minWidth: 0 }}>
                                      <span style={{ fontSize: '14px' }}>{field.name}</span>
                                      <span style={{ color: 'var(--gray-600)', fontSize: '12px', marginLeft: '6px' }}>
                                        ({field.id})
                                      </span>
                                    </Box>
                                    <Tooltip content="Move up" placement="top">
                                      <IconButton
                                        variant="transparent"
                                        icon={<ArrowUpIcon />}
                                        aria-label={`Move ${field.name} up`}
                                        size="small"
                                        onClick={() => moveField(index, -1)}
                                        isDisabled={isExporting || index === 0}
                                      />
                                    </Tooltip>
                                    <Tooltip content="Move down" placement="top">
                                      <IconButton
                                        variant="transparent"
                                        icon={<ArrowDownIcon />}
                                        aria-label={`Move ${field.name} down`}
                                        size="small"
                                        onClick={() => moveField(index, 1)}
                                        isDisabled={isExporting || index === selectedFields.length - 1}
                                      />
                                    </Tooltip>
                                    <Tooltip content="Remove from export" placement="top">
                                      <IconButton
                                        variant="transparent"
                                        icon={<CloseIcon />}
                                        aria-label={`Remove ${field.name}`}
                                        size="small"
                                        onClick={() => removeField(fieldId)}
                                        isDisabled={isExporting}
                                      />
                                    </Tooltip>
                                  </Flex>
                                );
                              })}
                            </Stack>
                          </Box>
                        </Box>
                      )}

                      <Box marginBottom="spacingXs">
                        <TextInput.Group>
                          <Box style={{ flexGrow: 1 }}>
                            <TextInput
                              value={fieldSearch}
                              onChange={(e) => setFieldSearch(e.target.value)}
                              placeholder="Search fields by name or ID..."
                              isDisabled={isExporting}
                              icon={<SearchIcon />}
                            />
                          </Box>
                        </TextInput.Group>
                      </Box>

                      <Box
                        style={{
                          maxHeight: '320px',
                          overflowY: 'auto',
                          border: '1px solid var(--gray-200)',
                          borderRadius: '4px',
                          padding: 'var(--spacing-s)',
                        }}
                      >
                        {fieldGroups.length === 0 ? (
                          <Box paddingTop="spacingXs" paddingBottom="spacingXs">
                            <FormControl.HelpText>
                              No fields match "{fieldSearch}"
                            </FormControl.HelpText>
                          </Box>
                        ) : (
                          fieldGroups.map((group) => (
                            <Box key={group.id} marginBottom="spacingS">
                              <Flex alignItems="center" gap="spacingXs" marginBottom="spacingXs">
                                <Subheading marginBottom="none" style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--gray-700)' }}>
                                  {group.label}
                                </Subheading>
                                {group.id === 'title' && (
                                  <Badge variant="primary" size="small">Title</Badge>
                                )}
                                {group.id === 'required' && (
                                  <Badge variant="warning" size="small">Required</Badge>
                                )}
                              </Flex>
                              <Stack flexDirection="column" spacing="spacingXs" alignItems="flex-start">
                                {group.fields.map((field) => (
                                  <Checkbox
                                    key={field.id}
                                    value={field.id}
                                    isChecked={selectedFields.includes(field.id)}
                                    isDisabled={isExporting}
                                    onChange={(e) => handleFieldToggle(field.id, e.target.checked)}
                                  >
                                    {field.name} <span style={{ color: 'var(--gray-600)', fontSize: '12px' }}>({field.id} · {field.type})</span>
                                  </Checkbox>
                                ))}
                              </Stack>
                            </Box>
                          ))
                        )}
                      </Box>

                      <Box marginTop="spacingXs">
                        <TextLink
                          as="button"
                          variant="secondary"
                          onClick={handleResetDefaults}
                          isDisabled={isExporting}
                        >
                          Reset to smart defaults
                        </TextLink>
                      </Box>
                    </FormControl>
                  )}

                  <FormControl>
                    <Flex alignItems="center" gap="spacingXs">
                      <FormControl.Label>Export Filename</FormControl.Label>
                      <Tooltip content="Customize the filename for your CSV download. The .csv extension is added automatically" placement="right">
                        <IconButton
                          variant="transparent"
                          icon={<InfoCircleIcon />}
                          aria-label="Help"
                          size="small"
                          style={{ padding: 0, minHeight: 'auto' }}
                        />
                      </Tooltip>
                    </Flex>
                    <Flex gap="spacingXs" alignItems="flex-end">
                      <TextInput
                        value={customFilename || defaultFilename}
                        onChange={(e) => setCustomFilename(e.target.value)}
                        placeholder={defaultFilename}
                        isDisabled={isExporting}
                        style={{ flexGrow: 1 }}
                      />
                      <Box style={{ flexShrink: 0, paddingBottom: '2px' }}>{getFileExtension(format)}</Box>
                    </Flex>
                    <FormControl.HelpText>
                      Final filename: {filenameWithExtension}
                    </FormControl.HelpText>
                  </FormControl>
                </Stack>
              </Box>
            </Flex>
          </Box>
        </Tabs.Panel>
      </Tabs>

      <Stack flexDirection="column" spacing="spacingM" marginTop="spacingL">
        <Stack flexDirection="row" spacing="spacingS" alignItems="center">
          <Tooltip content="View a preview of matching entries before exporting. Useful for verifying your filters" placement="top">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onSearch(formData)}
              isDisabled={isExporting || isSearching}
              isLoading={isSearching}
            >
              Search & Preview
            </Button>
          </Tooltip>

          <Tooltip content="Get a quick count of how many entries match your filters without loading full previews" placement="top">
            <Button
              type="button"
              variant="secondary"
              onClick={handleEstimate}
              isDisabled={isExporting || isSearching}
            >
              Estimate Count
            </Button>
          </Tooltip>

          <Tooltip content="Quick export with smart defaults (all locales, all fields). Or use Output tab for full control" placement="top">
            <Menu>
              <Menu.Trigger>
                <Button
                  variant="primary"
                  isDisabled={selectedLocales.length === 0 || isExporting || isSearching}
                  isLoading={isExporting}
                  endIcon={<ChevronDownIcon />}
                >
                  Export
                </Button>
              </Menu.Trigger>
              <Menu.List>
                <Menu.Item onClick={() => handleQuickExport('csv')}>
                  CSV
                </Menu.Item>
                <Menu.Item onClick={() => handleQuickExport('json')}>
                  JSON
                </Menu.Item>
                <Menu.Item onClick={() => handleQuickExport('xlsx')}>
                  XLSX
                </Menu.Item>
                <Menu.Item onClick={() => handleQuickExport('xml')}>
                  XML
                </Menu.Item>
                <Menu.Item onClick={() => handleQuickExport('yaml')}>
                  YAML
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item onClick={handleSubmit}>
                  Advanced (use Output tab)
                </Menu.Item>
              </Menu.List>
            </Menu>
          </Tooltip>
          
          {(isSearching || isExporting) && (
            <Stack alignItems="center" spacing="spacingXs" flexDirection="row">
              <Spinner size="small" />
            </Stack>
          )}
        </Stack>

        {estimatedCount !== null && (
          <FormControl.HelpText>
            {estimatedCount === 0 
              ? 'No entries match your filters'
              : `Found ${estimatedCount.toLocaleString()} matching ${estimatedCount === 1 ? 'entry' : 'entries'}`
            }
          </FormControl.HelpText>
        )}
      </Stack>
    </Form>
  );
}
