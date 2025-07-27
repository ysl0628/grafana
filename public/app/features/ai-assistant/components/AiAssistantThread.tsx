import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
  useThread,
  useMessage,
} from '@assistant-ui/react';
import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Icon, Button, Stack, Text, Tooltip, TextArea, LoadingBar } from '@grafana/ui';

import { AiAssistantMessage } from './AiAssistantMessage';
import { AtMenu } from './user-context/AtMenu';
import { SelectedItems } from './user-context/SelectedItems';
import { AtSelectionItem } from '../contexts/AtSelectionContext';

/**
 * AI Assistant Thread Component
 *
 * Main conversation interface that displays messages and provides input for new messages.
 * Integrates with @assistant-ui/react for conversation management while using Grafana's UI components.
 */
export const AiAssistantThread: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <ThreadPrimitive.Root className={styles.threadRoot}>
        <ThreadPrimitive.Viewport className={styles.viewport}>
          <ThreadWelcome />
          <ThreadPrimitive.Messages
            components={{
              UserMessage: AiAssistantUserMessage,
              AssistantMessage: AiAssistantMessage,
              EditComposer: AiAssistantEditComposer,
            }}
          />
        </ThreadPrimitive.Viewport>
        <div className={styles.composerContainer}>
          <ThreadScrollToBottom />
          <AiAssistantComposer />
        </div>
      </ThreadPrimitive.Root>
    </div>
  );
};

/**
 * Thread Welcome Component
 *
 * Displays welcome message and suggestions when thread is empty.
 */
const ThreadWelcome: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <ThreadPrimitive.Empty>
      <div className={styles.welcomeContainer}>
        <Stack direction="column" alignItems="center" gap={2}>
          <Icon name="grafana" size="xl" />
          <Text variant="h4">{t('ai-assistant.thread.welcome-title', 'How can I help you today?')}</Text>
          <Text variant="body" color="secondary">
            {t(
              'ai-assistant.thread.welcome-description',
              'Ask me about your dashboards, explore your data, or get help with Grafana features.'
            )}
          </Text>
        </Stack>
        <div className={styles.suggestionsContainer}>
          <ThreadSuggestions />
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
};

/**
 * Thread Suggestions Component
 *
 * Displays clickable suggestions for common questions.
 */
const ThreadSuggestions: React.FC = () => {
  const styles = useStyles2(getStyles);

  const suggestions = [
    {
      icon: 'chart-line',
      text: t('ai-assistant.suggestions.dashboard-metrics', 'Show me my dashboard metrics'),
      prompt: t(
        'ai-assistant.suggestions.dashboard-metrics-prompt',
        'Can you show me the key metrics from my current dashboard?'
      ),
    },
    {
      icon: 'search',
      text: t('ai-assistant.suggestions.find-anomalies', 'Find anomalies in my data'),
      prompt: t(
        'ai-assistant.suggestions.find-anomalies-prompt',
        'Help me identify any anomalies or unusual patterns in my data.'
      ),
    },
    {
      icon: 'question-circle',
      text: t('ai-assistant.suggestions.explain-visualization', 'Explain this visualization'),
      prompt: t(
        'ai-assistant.suggestions.explain-visualization-prompt',
        'Can you explain what this visualization is showing and how to interpret it?'
      ),
    },
    {
      icon: 'cog',
      text: t('ai-assistant.suggestions.help-configuration', 'Help with configuration'),
      prompt: t(
        'ai-assistant.suggestions.help-configuration-prompt',
        'I need help configuring alerts or data sources in Grafana.'
      ),
    },
  ];

  return (
    <div className={styles.suggestions}>
      {suggestions.map((suggestion, index) => (
        <ThreadPrimitive.Suggestion
          key={index}
          className={styles.suggestionCard}
          prompt={suggestion.prompt}
          method="replace"
          autoSend
        >
          <Stack direction="column" alignItems="center" gap={1}>
            <Icon name={suggestion.icon as any} size="lg" />
            <Text variant="bodySmall">{suggestion.text}</Text>
          </Stack>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
};

/**
 * User Message Component
 *
 * Displays user messages with edit and action capabilities and selected context.
 */
const AiAssistantUserMessage: React.FC = () => {
  const styles = useStyles2(getStyles);
  const message = useMessage();
  const metadataUserContext = (message as any)?.metadata?.custom?.userContext as AtSelectionItem[] | undefined;

  return (
    <MessagePrimitive.Root className={styles.userMessage}>
      <div className={styles.messageContent}>
        {metadataUserContext && metadataUserContext.length > 0 && (
          <div className={styles.contextDisplay}>
            {metadataUserContext.map((item: AtSelectionItem) => (
              <div key={item.uid} className={styles.contextItem}>
                <Icon
                  name={item.type === 'dashboard' ? 'dashboard' : 'database'}
                  size="sm"
                  className={styles.contextIcon}
                />
                <Tooltip content={item.name}>
                  <Text variant="bodySmall" color="primary">
                    {item.name}
                  </Text>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
        <MessagePrimitive.Content />

        <div className={styles.actionContainer}>
          <BranchPicker />
          {/* <UserActionBar /> */}
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

/**
 * User Action Bar Component
 *
 * Provides edit action for user messages.
 */
const UserActionBar: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className={styles.actionBar}>
      <ActionBarPrimitive.Edit asChild>
        <Tooltip content={t('ai-assistant.message.edit-tooltip', 'Edit message')}>
          <Button
            variant="secondary"
            size="sm"
            icon="edit"
            aria-label={t('ai-assistant.message.edit-aria-label', 'Edit message')}
          />
        </Tooltip>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

/**
 * Edit Composer Component
 *
 * Allows editing of user messages.
 */
const AiAssistantEditComposer: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.editComposer}>
      <ComposerPrimitive.Root className={styles.editComposerRoot}>
        <ComposerPrimitive.Input asChild className={styles.editInput}>
          <TextArea />
        </ComposerPrimitive.Input>
        <div className={styles.editActions}>
          <ComposerPrimitive.Cancel asChild>
            <Button variant="secondary" size="sm">
              {t('ai-assistant.composer.cancel', 'Cancel')}
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button variant="primary" size="sm">
              {t('ai-assistant.composer.send', 'Send')}
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

/**
 * Main Composer Component
 *
 * Input area for new messages.
 */
const AiAssistantComposer: React.FC = () => {
  const styles = useStyles2(getStyles);
  const { isRunning } = useThread();

  return (
    <ComposerPrimitive.Root className={styles.composer}>
      {isRunning && <LoadingBar width={200} delay={300} />}
      <div className={styles.composerHeader}>
        <AtMenu>
          <Button
            variant="secondary"
            size="xs"
            icon="at"
            aria-label={t('ai-assistant.composer.at-button', 'At symbol')}
            className={styles.atButton}
          />
        </AtMenu>
        <SelectedItems />
      </div>

      {/* 輸入區域 */}
      <ComposerPrimitive.Input
        placeholder={t('ai-assistant.composer.placeholder', 'Ask questions, go places, make changes, anything.')}
        className={styles.composerInput}
        autoFocus
        rows={1}
      />

      <ComposerAction />
    </ComposerPrimitive.Root>
  );
};

/**
 * Composer Action Component
 *
 * Send/Cancel button for the composer.
 */
const ComposerAction: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.composerAction}>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <Button
            variant="primary"
            size="sm"
            icon="enter"
            aria-label={t('ai-assistant.composer.send-aria-label', 'Send message')}
          >
            {t('ai-assistant.composer.send', 'Send')}
          </Button>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <Button
            variant="destructive"
            size="sm"
            icon="square-shape"
            aria-label={t('ai-assistant.composer.stop-aria-label', 'Stop generating')}
          >
            {t('ai-assistant.composer.stop', 'Stop')}
          </Button>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </div>
  );
};

/**
 * Scroll to Bottom Component
 *
 * Button to scroll to the bottom of the thread.
 */
const ThreadScrollToBottom: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <div className={styles.scrollToBottom}>
        <Button
          variant="secondary"
          size="sm"
          icon="arrow-down"
          tooltip={t('ai-assistant.thread.scroll-to-bottom-tooltip', 'Scroll to bottom')}
          aria-label={t('ai-assistant.thread.scroll-to-bottom-aria-label', 'Scroll to bottom')}
        />
      </div>
    </ThreadPrimitive.ScrollToBottom>
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
        <Tooltip content={t('ai-assistant.branch.previous-tooltip', 'Previous')}>
          <Button
            variant="secondary"
            size="sm"
            icon="arrow-left"
            aria-label={t('ai-assistant.branch.previous-aria-label', 'Previous branch')}
          />
        </Tooltip>
      </BranchPickerPrimitive.Previous>
      <Text variant="bodySmall" color="secondary">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </Text>
      <BranchPickerPrimitive.Next asChild>
        <Tooltip content={t('ai-assistant.branch.next-tooltip', 'Next')}>
          <Button
            variant="secondary"
            size="sm"
            icon="arrow-right"
            aria-label={t('ai-assistant.branch.next-aria-label', 'Next branch')}
          />
        </Tooltip>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  }),
  threadRoot: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  }),
  viewport: css({
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: theme.spacing(3, 0),
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.colors.background.primary,
    // Custom scrollbar styling
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: theme.colors.background.secondary,
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.colors.border.medium,
      borderRadius: '3px',
      '&:hover': {
        background: theme.colors.border.strong,
      },
    },
  }),
  welcomeContainer: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: theme.spacing(4),
    textAlign: 'center',
    backgroundColor: theme.colors.background.primary,
  }),
  suggestionsContainer: css({
    marginTop: theme.spacing(4),
    width: '100%',
    maxWidth: '500px',
  }),
  suggestions: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: theme.spacing(2),
  }),
  suggestionCard: css({
    padding: theme.spacing(2.5),
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: '12px',
    backgroundColor: theme.colors.background.secondary,
    cursor: 'pointer',
    [theme.transitions.handleMotion('no-preference')]: {
      transition: 'all 0.3s ease',
    },
    '&:hover': {
      backgroundColor: theme.colors.background.canvas,
      borderColor: theme.colors.primary.main,
      transform: 'translateY(-3px)',
      boxShadow: `0 8px 25px ${theme.colors.primary.main}20`,
    },
  }),
  userMessage: css({
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  }),
  messageContent: css({
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    wordBreak: 'break-word',
    fontSize: theme.typography.bodySmall.fontSize,
    lineHeight: 1.6,
    '& > p': {
      margin: 0,
    },
  }),
  actionContainer: css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }),
  actionBar: css({
    display: 'flex',
    flex: 1,
    justifyContent: 'flex-end',
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
    },
  }),
  editComposer: css({
    width: '100%',
    marginTop: theme.spacing(1),
  }),
  editComposerRoot: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  }),
  editInput: css({
    minHeight: theme.spacing(8),
    resize: 'vertical',
  }),
  editActions: css({
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'flex-end',
  }),
  composerContainer: css({
    padding: theme.spacing(0.5, 1, 0.5, 1),
    borderTop: `1px solid ${theme.colors.border.weak}`,
    backgroundColor: theme.colors.background.primary,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'auto',
    alignItems: 'stretch',
  }),
  composer: css({
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  }),
  composerHeader: css({
    display: 'flex',
    alignItems: 'center',
    padding: 0,
    gap: theme.spacing(0.5),
    minHeight: theme.spacing(4),
    flexShrink: 0,
    width: '100%',
    flexWrap: 'wrap',
    marginBottom: theme.spacing(0.5),
  }),
  composerInput: css({
    width: '100%',
    minHeight: '40px', // Initial height
    maxHeight: '140px', // Max height before scrollbar appears
    resize: 'none',
    border: 'none',
    outline: 'none',
    marginBottom: theme.spacing(1),
    backgroundColor: 'transparent',
    color: theme.colors.text.primary,
    fontSize: theme.typography.size.md,
    lineHeight: 1.5,
    padding: 0,
    overflow: 'hidden', // Initially hidden, will change to auto when maxHeight reached
    '&::placeholder': {
      color: theme.colors.text.secondary,
      opacity: 0.8,
    },
    // Auto-resize behavior
    '&[style*="height"]': {
      overflow: 'auto !important',
    },
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: theme.colors.background.secondary,
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.colors.border.medium,
      borderRadius: '3px',
      '&:hover': {
        background: theme.colors.border.strong,
      },
    },
  }),
  atButton: css({
    height: theme.spacing(3),
    width: theme.spacing(3),
    backgroundColor: 'transparent',
    padding: '0 10px',
    justifyContent: 'center',
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: '5px',
    flexShrink: 0,
    '&:hover': {
      backgroundColor: `${theme.colors.action.hover}`,
    },
  }),
  composerAction: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  }),
  scrollToBottom: css({
    position: 'absolute',
    top: theme.spacing(-6),
    right: theme.spacing(3),
    opacity: 0.8,
    '&:hover': {
      opacity: 1,
    },
    '&[disabled]': {
      opacity: 0,
      pointerEvents: 'none',
      visibility: 'hidden',
    },
  }),
  contextDisplay: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
    flexWrap: 'wrap',
  }),
  contextItem: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.25, 0.75, 0.25, 0.25),
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    flexShrink: 0,
  }),
  contextIcon: css({
    color: theme.colors.text.secondary,
    flexShrink: 0,
    padding: theme.spacing(0.25),
    borderRadius: theme.shape.radius.default,
  }),
  branchPicker: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
  }),
});

export default AiAssistantThread;
