import { useEffect } from 'react';
import { Heading, Paragraph, Note, Stack, Box, List, SectionHeading } from '@contentful/f36-components';
import { useSDK } from '@contentful/react-apps-toolkit';
import type { ConfigAppSDK } from '@contentful/app-sdk';

const ConfigScreen = () => {
  const sdk = useSDK<ConfigAppSDK>();

  useEffect(() => {
    const configure = async () => {
      sdk.app.onConfigure(async () => {
        return {
          parameters: {},
          targetState: {
            EditorInterface: {},
          },
        };
      });

      sdk.app.setReady();
    };

    configure().catch((error) => {
      console.error('Configuration error:', error);
      sdk.notifier.error('Failed to initialize app configuration');
    });
  }, [sdk]);

  return (
    <Box padding="spacingL" style={{ maxWidth: '768px', margin: '0 auto' }}>
      <Stack flexDirection="column" spacing="spacingL">
        <Stack flexDirection="column" spacing="spacingM">
          <Heading>Bulk Entry CSV Exporter</Heading>
          
          <Paragraph>
            Export unlimited entries from any content type to CSV format, bypassing the 40-entry limitation of the Contentful web interface.
          </Paragraph>

          <SectionHeading>Features</SectionHeading>
          <List>
            <List.Item>Export any number of entries with automatic pagination</List.Item>
            <List.Item>Filter by status, tags, taxonomy concepts, and custom fields</List.Item>
            <List.Item>Full-text search across all content</List.Item>
            <List.Item>Date range filtering for created and updated times</List.Item>
            <List.Item>Advanced field-level filters with multiple operators</List.Item>
            <List.Item>Select specific locales to export</List.Item>
          </List>

          <SectionHeading>Getting Started</SectionHeading>
          <List as="ol">
            <List.Item>Click the "Install" button above to install this app</List.Item>
            <List.Item>After installation, find the app in the main Apps menu</List.Item>
            <List.Item>Select a content type and configure your export filters</List.Item>
            <List.Item>Click "Export to CSV" to download your data</List.Item>
          </List>
        </Stack>

        <Note variant="primary" title="Performance Note">
          This app is configured for paid-tier rate limits (8 requests/second). Large exports with thousands of entries may take several minutes to complete, but the app will show real-time progress.
        </Note>
      </Stack>
    </Box>
  );
};

export default ConfigScreen;
