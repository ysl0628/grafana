import {
  MessagePrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ErrorPrimitive,
  useMessage,
} from '@assistant-ui/react';
import { css } from '@emotion/css';
import React, { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Icon, Button, Stack, Text, Tooltip, Alert, CodeEditor, Spinner } from '@grafana/ui';

/**
 * AI Assistant Message Component
 *
 * Displays assistant messages with support for text content, tool calls, and errors.
 * Integrates with @assistant-ui/react primitives while using Grafana's UI components.
 */
export const AiAssistantMessage: React.FC = () => {
  const styles = useStyles2(getStyles);
  const message = useMessage();

  return (
    <MessagePrimitive.Root className={styles.assistantMessage}>
      <div className={styles.messageHeader}>
        <Stack alignItems="center" gap={1}>
          <Icon name="robot" size="sm" />
          <Text variant="bodySmall" color="secondary">
            {t('ai-assistant.message.author', 'AI Assistant')}
          </Text>
        </Stack>
        <AssistantActionBar />
      </div>

      <div className={styles.messageContent}>
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            tools: {
              Fallback: ToolFallback,
              by_name: {
                getDashboardInfo: DashboardInfoTool,
                queryData: QueryDataTool,
                navigateToUrl: NavigationTool,
              },
              //  getDashboardInfo: DashboardInfoTool,
              // queryData: QueryDataTool,
              // navigateToUrl: NavigationTool,
            },
          }}
        />
        <MessageError />
      </div>

      <BranchPicker />
    </MessagePrimitive.Root>
  );
};

/**
 * Markdown Text Component
 *
 * Renders text content with markdown support.
 */
const MarkdownText: React.FC<{ content: string }> = ({ content }) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.textContent}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

/**
 * Simple markdown renderer (placeholder)
 * In a real implementation, this would use a proper markdown library
 */
const ReactMarkdown: React.FC<{ children: string }> = ({ children }) => {
  const styles = useStyles2(getStyles);

  // Simple markdown parsing - in production, use a proper library like react-markdown
  const processedContent = children
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');

  return <div className={styles.markdownContent} dangerouslySetInnerHTML={{ __html: processedContent }} />;
};

/**
 * Tool Fallback Component
 *
 * Displays a fallback UI for unknown tool calls.
 */
const ToolFallback: React.FC<{ toolName: string; args: any }> = ({ toolName, args }) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.toolFallback}>
      <Alert title={t('ai-assistant.tool.tool-title', 'Tool: {{toolName}}', { toolName })} severity="info">
        <Text variant="bodySmall">{t('ai-assistant.tool.execution-in-progress', 'Tool execution in progress...')}</Text>
        <details>
          <summary>{t('ai-assistant.tool.arguments', 'Arguments')}</summary>
          <pre>{JSON.stringify(args, null, 2)}</pre>
        </details>
      </Alert>
    </div>
  );
};

/**
 * Dashboard Info Tool Component
 *
 * Displays results from dashboard information queries.
 */
const DashboardInfoTool: React.FC<{ result: any; isLoading: boolean }> = ({ result, isLoading }) => {
  const styles = useStyles2(getStyles);

  if (isLoading) {
    return (
      <div className={styles.toolResult}>
        <Stack alignItems="center" gap={1}>
          <Spinner size="sm" />
          <Text variant="bodySmall">
            {t('ai-assistant.tool.getting-dashboard-info', 'Getting dashboard information...')}
          </Text>
        </Stack>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className={styles.toolResult}>
      <Alert title={t('ai-assistant.tool.dashboard-info.title', 'Dashboard Information')} severity="info">
        <Stack direction="column" gap={1}>
          <Text variant="body">
            <strong>{t('ai-assistant.tool.dashboard-info.title-label', 'Title')}:</strong> {result.title}
          </Text>
          <Text variant="body">
            <strong>{t('ai-assistant.tool.dashboard-info.uid-label', 'UID')}:</strong> {result.uid}
          </Text>
          <Text variant="body">
            <strong>{t('ai-assistant.tool.dashboard-info.panels-label', 'Panels')}:</strong>{' '}
            {result.panels?.length || 0}
          </Text>
          {result.tags && result.tags.length > 0 && (
            <Text variant="body">
              <strong>{t('ai-assistant.tool.dashboard-info.tags-label', 'Tags')}:</strong> {result.tags.join(', ')}
            </Text>
          )}
        </Stack>
      </Alert>
    </div>
  );
};

/**
 * Query Data Tool Component
 *
 * Displays results from data queries.
 */
const QueryDataTool: React.FC<{ result: any; isLoading: boolean }> = ({ result, isLoading }) => {
  const styles = useStyles2(getStyles);
  const [showRawData, setShowRawData] = useState(false);

  if (isLoading) {
    return (
      <div className={styles.toolResult}>
        <Stack alignItems="center" gap={1}>
          <Spinner size="sm" />
          <Text variant="bodySmall">{t('ai-assistant.tool.executing-query', 'Executing query...')}</Text>
        </Stack>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className={styles.toolResult}>
      <Alert title={t('ai-assistant.tool.query-results.title', 'Query Results')} severity="success">
        <Stack direction="column" gap={1}>
          <Text variant="body">
            {t('ai-assistant.tool.query-results.found-data-points', 'Found {{count}} data points', {
              count: result.length,
            })}
          </Text>
          <Button variant="secondary" size="sm" onClick={() => setShowRawData(!showRawData)}>
            {showRawData
              ? t('ai-assistant.tool.query-results.hide-raw-data', 'Hide')
              : t('ai-assistant.tool.query-results.show-raw-data', 'Show')}{' '}
            {t('ai-assistant.tool.query-results.raw-data-label', 'Raw Data')}
          </Button>
          {showRawData && (
            <CodeEditor value={JSON.stringify(result, null, 2)} language="json" height="200px" readOnly />
          )}
        </Stack>
      </Alert>
    </div>
  );
};

/**
 * Navigation Tool Component
 *
 * Displays navigation actions.
 */
const NavigationTool: React.FC<{ args: { url: string }; isLoading: boolean }> = ({ args, isLoading }) => {
  const styles = useStyles2(getStyles);

  if (isLoading) {
    return (
      <div className={styles.toolResult}>
        <Stack alignItems="center" gap={1}>
          <Spinner size="sm" />
          <Text variant="bodySmall">{t('ai-assistant.tool.navigating', 'Navigating...')}</Text>
        </Stack>
      </div>
    );
  }

  return (
    <div className={styles.toolResult}>
      <Alert title={t('ai-assistant.tool.navigation.title', 'Navigation')} severity="info">
        <Text variant="body">
          {t('ai-assistant.tool.navigation.navigated-to', 'Navigated to')}: {args.url}
        </Text>
      </Alert>
    </div>
  );
};

/**
 * Assistant Action Bar Component
 *
 * Provides actions for assistant messages like copy and regenerate.
 */
const AssistantActionBar: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className={styles.actionBar}>
      <ActionBarPrimitive.Copy asChild>
        <Tooltip content={t('ai-assistant.message.copy-tooltip', 'Copy message')}>
          <Button
            variant="secondary"
            size="sm"
            icon="copy"
            aria-label={t('ai-assistant.message.copy-aria-label', 'Copy message')}
          />
        </Tooltip>
      </ActionBarPrimitive.Copy>

      <ActionBarPrimitive.Reload asChild>
        <Tooltip content={t('ai-assistant.message.regenerate-tooltip', 'Regenerate response')}>
          <Button
            variant="secondary"
            size="sm"
            icon="sync"
            aria-label={t('ai-assistant.message.regenerate-aria-label', 'Regenerate response')}
          />
        </Tooltip>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

/**
 * Message Error Component
 *
 * Displays error messages when assistant responses fail.
 */
const MessageError: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className={styles.errorContainer}>
        <Alert title={t('ai-assistant.message.error.title', 'Error')} severity="error">
          <ErrorPrimitive.Message />
        </Alert>
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

/**
 * Branch Picker Component
 *
 * Allows navigation between different response branches.
 */
const BranchPicker: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <BranchPickerPrimitive.Root hideWhenSingleBranch className={styles.branchPicker}>
      <BranchPickerPrimitive.Previous asChild>
        <Tooltip content={t('ai-assistant.message.previous-response-tooltip', 'Previous response')}>
          <Button
            variant="secondary"
            size="sm"
            icon="arrow-left"
            aria-label={t('ai-assistant.message.previous-response-aria-label', 'Previous response')}
          />
        </Tooltip>
      </BranchPickerPrimitive.Previous>

      <Text variant="bodySmall" color="secondary">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </Text>

      <BranchPickerPrimitive.Next asChild>
        <Tooltip content={t('ai-assistant.message.next-response-tooltip', 'Next response')}>
          <Button
            variant="secondary"
            size="sm"
            icon="arrow-right"
            aria-label={t('ai-assistant.message.next-response-aria-label', 'Next response')}
          />
        </Tooltip>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  assistantMessage: css({
    display: 'flex',
    flexDirection: 'column',
    marginBottom: theme.spacing(2),
    maxWidth: '80%',
    alignSelf: 'flex-start',
  }),
  messageHeader: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  }),
  messageContent: css({
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    padding: theme.spacing(2),
    wordBreak: 'break-word',
  }),
  textContent: css({
    color: theme.colors.text.primary,
    lineHeight: 1.6,
  }),
  markdownContent: css({
    '& code': {
      backgroundColor: theme.colors.background.canvas,
      padding: theme.spacing(0.25, 0.5),
      borderRadius: theme.shape.radius.default,
      fontSize: theme.typography.size.sm,
    },
    '& strong': {
      fontWeight: theme.typography.fontWeightBold,
    },
    '& em': {
      fontStyle: 'italic',
    },
  }),
  toolResult: css({
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  }),
  toolFallback: css({
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  }),
  actionBar: css({
    display: 'flex',
    gap: theme.spacing(0.5),
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
    },
  }),
  errorContainer: css({
    marginTop: theme.spacing(1),
  }),
  branchPicker: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
    justifyContent: 'center',
  }),
});

export default AiAssistantMessage;
