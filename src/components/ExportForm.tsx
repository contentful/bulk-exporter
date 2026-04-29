import { useState, useMemo } from 'react';
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
} from '@contentful/f36-components';
import { PlusIcon, DeleteIcon } from '@contentful/f36-icons';
import type { ContentType } from '../lib/flatten';
import type { EntryStatus, FieldFilter } from '../lib/queryBuilder';

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
}

export interface ExportFormProps {
  contentTypes: ContentType[];
  availableLocales: Array<{ code: string; name: string }>;
  availableTags: Array<{ sys: { id: string }; name: string }>;
  availableConcepts: Array<{ sys: { id: string }; prefLabel: Record<string, string> }>;
  onSubmit: (data: ExportFormData) => void;
  onEstimate: (data: ExportFormData) => void;
  onSearch: (data: ExportFormData) => void;
  isExporting: boolean;
  isSearching: boolean;
  estimatedCount: number | null;
}

export function ExportForm({
  contentTypes,
  availableLocales,
  availableTags,
  availableConcepts,
  onSubmit,
  onEstimate,
  onSearch,
  isExporting,
  isSearching,
  estimatedCount,
}: ExportFormProps) {
  const [contentTypeId, setContentTypeId] = useState('');
  const [selectedLocales, setSelectedLocales] = useState<string[]>(
    availableLocales.map(l => l.code)
  );
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
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

  const selectedContentType = useMemo(
    () => contentTypes.find(ct => ct.sys.id === contentTypeId) || null,
    [contentTypes, contentTypeId]
  );

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
          <Stack flexDirection="column" spacing="spacingM" marginTop="spacingM">
            <FormControl>
              <FormControl.Label>Content Type</FormControl.Label>
              <Select
                value={contentTypeId}
                onChange={(e) => setContentTypeId(e.target.value)}
                isDisabled={isExporting}
              >
                <Select.Option value="">Any (search across all content types)</Select.Option>
                {contentTypes.map((ct) => (
                  <Select.Option key={ct.sys.id} value={ct.sys.id}>
                    {ct.sys.id}
                  </Select.Option>
                ))}
              </Select>
              <FormControl.HelpText>
                Select a specific content type or leave as "Any" to search across all entries
              </FormControl.HelpText>
            </FormControl>

            <FormControl>
              <FormControl.Label>Search</FormControl.Label>
              <TextInput
                placeholder="Full-text search across all fields"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                isDisabled={isExporting}
              />
              <FormControl.HelpText>
                Searches across all text fields in the content type
              </FormControl.HelpText>
            </FormControl>

            <FormControl>
              <FormControl.Label>Status</FormControl.Label>
              <Radio.Group
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EntryStatus)}
              >
                <Stack flexDirection="row" spacing="spacingS">
                  <Radio value="any" isDisabled={isExporting}>Any</Radio>
                  <Radio value="published" isDisabled={isExporting}>Published</Radio>
                  <Radio value="draft" isDisabled={isExporting}>Draft</Radio>
                  <Radio value="changed" isDisabled={isExporting}>Changed</Radio>
                  <Radio value="archived" isDisabled={isExporting}>Archived</Radio>
                </Stack>
              </Radio.Group>
            </FormControl>

            <FormControl>
              <FormControl.Label>Created Date Range</FormControl.Label>
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

            <FormControl>
              <FormControl.Label>Updated Date Range</FormControl.Label>
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

            <FormControl>
              <FormControl.Label>Sort By</FormControl.Label>
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
          </Stack>
        </Tabs.Panel>

        {(availableTags.length > 0 || availableConcepts.length > 0) && (
          <Tabs.Panel id="taxonomy">
            <Stack flexDirection="column" spacing="spacingM" marginTop="spacingM">
              {availableTags.length > 0 && (
                <FormControl>
                  <FormControl.Label>Tags</FormControl.Label>
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
                    <Checkbox
                      isChecked={tagsMatchAll}
                      onChange={(e) => setTagsMatchAll(e.target.checked)}
                      isDisabled={isExporting}
                    >
                      Match all selected tags (AND)
                    </Checkbox>
                  )}
                </FormControl>
              )}

              {availableConcepts.length > 0 && (
                <FormControl>
                  <FormControl.Label>Taxonomy Concepts</FormControl.Label>
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
                    <Checkbox
                      isChecked={conceptsMatchAll}
                      onChange={(e) => setConceptsMatchAll(e.target.checked)}
                      isDisabled={isExporting}
                    >
                      Match all selected concepts (AND)
                    </Checkbox>
                  )}
                </FormControl>
              )}
            </Stack>
          </Tabs.Panel>
        )}

        <Tabs.Panel id="advanced">
          <Stack flexDirection="column" spacing="spacingM" marginTop="spacingM">
            <FormControl>
              <FormControl.Label>Field-Level Filters</FormControl.Label>
              <FormControl.HelpText>
                Add custom filters on specific fields
              </FormControl.HelpText>
            </FormControl>

            {fieldFilters.map((filter, index) => (
              <Stack key={index} flexDirection="row" spacing="spacingS" alignItems="flex-end">
                <FormControl style={{ flex: 1 }}>
                  <Select
                    value={filter.fieldId}
                    onChange={(e) => handleFieldFilterChange(index, 'fieldId', e.target.value)}
                    isDisabled={isExporting || !selectedContentType}
                  >
                    <Select.Option value="">Select field</Select.Option>
                    {selectedContentType?.fields.map((field) => (
                      <Select.Option key={field.id} value={field.id}>
                        {field.name || field.id}
                      </Select.Option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl style={{ flex: 1 }}>
                  <Select
                    value={filter.operator}
                    onChange={(e) => handleFieldFilterChange(index, 'operator', e.target.value)}
                    isDisabled={isExporting}
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
                </FormControl>

                <FormControl style={{ flex: 1 }}>
                  <TextInput
                    value={filter.value}
                    onChange={(e) => handleFieldFilterChange(index, 'value', e.target.value)}
                    isDisabled={isExporting || filter.operator === 'is_true' || filter.operator === 'is_false'}
                    placeholder="Value"
                  />
                </FormControl>

                <IconButton
                  variant="transparent"
                  icon={<DeleteIcon />}
                  aria-label="Remove filter"
                  onClick={() => handleRemoveFieldFilter(index)}
                  isDisabled={isExporting}
                />
              </Stack>
            ))}

            <Button
              startIcon={<PlusIcon />}
              variant="secondary"
              size="small"
              onClick={handleAddFieldFilter}
              isDisabled={isExporting || !selectedContentType}
            >
              Add Field Filter
            </Button>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel id="output">
          <Stack flexDirection="column" spacing="spacingM" marginTop="spacingM">
            <FormControl>
              <FormControl.Label>Locales</FormControl.Label>
              <FormControl.HelpText>
                Select which locales to include in the export
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

            {selectedContentType && (
              <FormControl>
                <FormControl.Label>Fields to Export</FormControl.Label>
                <FormControl.HelpText>
                  Leave empty to export all fields, or select specific fields
                </FormControl.HelpText>
                <Stack flexDirection="row" spacing="spacingS" marginBottom="spacingXs">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      const allFieldIds = selectedContentType.fields.map(f => f.id);
                      setSelectedFields(allFieldIds);
                    }}
                    isDisabled={isExporting}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => setSelectedFields([])}
                    isDisabled={isExporting}
                  >
                    Clear All
                  </Button>
                </Stack>
                <Checkbox.Group
                  value={selectedFields}
                  onChange={(e) => {
                    const target = e.target as HTMLInputElement;
                    const value = target.value;
                    setSelectedFields((prev) =>
                      target.checked
                        ? [...prev, value]
                        : prev.filter((v) => v !== value)
                    );
                  }}
                >
                  {selectedContentType.fields.map((field) => (
                    <Checkbox
                      key={field.id}
                      value={field.id}
                      isChecked={selectedFields.includes(field.id)}
                      isDisabled={isExporting}
                    >
                      {field.name} ({field.id})
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </FormControl>
            )}

            <FormControl>
              <FormControl.Label>Filename Preview</FormControl.Label>
              <TextInput
                value={`${contentTypeId || 'content-type'}-${new Date().toISOString().split('T')[0]}.csv`}
                isReadOnly
                isDisabled
              />
            </FormControl>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Stack flexDirection="column" spacing="spacingM" marginTop="spacingL">
        <Stack flexDirection="row" spacing="spacingS">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSearch(formData)}
            isDisabled={isExporting || isSearching}
            isLoading={isSearching}
          >
            Search & Preview
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleEstimate}
            isDisabled={isExporting || isSearching}
          >
            Estimate Count
          </Button>

          <Button
            type="submit"
            variant="primary"
            isDisabled={selectedLocales.length === 0 || isExporting || isSearching}
          >
            Export to CSV
          </Button>
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
