import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
} from '@assistant-ui/react';
import { css } from '@emotion/css';
import React, { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Icon, Button, Stack, Text, Tooltip, TextArea } from '@grafana/ui';

import { AiAssistantMessage } from './AiAssistantMessage';

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
 * Displays user messages with edit and action capabilities.
 */
const AiAssistantUserMessage: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <MessagePrimitive.Root className={styles.userMessage}>
      <div className={styles.messageContent}>
        <MessagePrimitive.Content />
        <div className={styles.actionContainer}>
          <BranchPicker />
          <UserActionBar />
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
  const [inputValue, setInputValue] = useState('');

  return (
    <ComposerPrimitive.Root className={styles.composer}>
      {/* Header 區域 */}
      <div className={styles.composerHeader}>
        <Button
          variant="secondary"
          size="sm"
          icon="at"
          aria-label={t('ai-assistant.composer.at-button', 'At symbol')}
          className={styles.atButton}
        />
      </div>

      {/* 輸入區域 */}
      <div className={styles.composerInputArea}>
        <ComposerPrimitive.Input
          value={inputValue}
          style={{ height: 24 }}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t('ai-assistant.composer.placeholder', 'Ask questions, go places, make changes, anything.')}
          className={styles.composerInput}
          autoFocus
        />
      </div>

      {/* 右下角固定的 Send 按鈕 */}
      <div className={styles.fixedSendButton}>
        <ComposerAction />
      </div>
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
            variant="secondary"
            size="sm"
            icon="enter"
            aria-label={t('ai-assistant.composer.send-aria-label', 'Send message')}
            className={styles.sendButton}
          >
            <span className={styles.sendButtonText}>{t('ai-assistant.composer.send', 'Send')}</span>
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
            className={styles.sendButton}
          >
            <span className={styles.sendButtonText}>{t('ai-assistant.composer.stop', 'Stop')}</span>
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
        <Tooltip content={t('ai-assistant.thread.scroll-to-bottom-tooltip', 'Scroll to bottom')}>
          <Button
            variant="secondary"
            size="sm"
            icon="arrow-down"
            aria-label={t('ai-assistant.thread.scroll-to-bottom-aria-label', 'Scroll to bottom')}
          />
        </Tooltip>
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
    fontSize: theme.typography.body.fontSize,
    lineHeight: 1.6,
    [theme.transitions.handleMotion('no-preference')]: {
      transition: 'all 0.2s ease',
    },
    '&:hover': {
      transform: 'translateY(-1px)',
    },
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
    maxHeight: '196px',
    overflow: 'hidden',
  }),
  composer: css({
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    flex: 1,
    minHeight: 0,
  }),
  composerHeader: css({
    display: 'flex',
    alignItems: 'center',
    padding: 0,
    height: theme.spacing(5),
    flexShrink: 0,
  }),
  composerInputArea: css({
    flex: 1,
    padding: 0,
    marginBottom: '32px',
    position: 'relative',
    overflow: 'auto',
    minHeight: 0,
    height: '100%',
    maxHeight: '96px',
  }),
  composerInput: css({
    width: '100%',
    minHeight: theme.spacing(4),
    resize: 'none',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: theme.colors.text.primary,
    fontSize: theme.typography.size.md,
    lineHeight: 1.5,
    padding: 0,
    overflow: 'auto',
    '&::placeholder': {
      color: theme.colors.text.secondary,
      opacity: 0.8,
    },
    '&::-webkit-scrollbar': {
      width: '4px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.colors.border.medium,
      borderRadius: '2px',
    },
  }),
  atButton: css({
    backgroundColor: 'transparent',
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: '5px',
    '&:hover': {
      backgroundColor: `${theme.colors.action.hover}`,
    },
  }),
  fixedSendButton: css({
    position: 'absolute',
    bottom: theme.spacing(0.5),
    right: 0,
  }),
  composerAction: css({
    display: 'flex',
    alignItems: 'center',
  }),
  sendButton: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
    minWidth: 'auto',
    height: theme.spacing(4),
    fontSize: theme.typography.size.sm,
  }),
  sendButtonText: css({
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  scrollToBottom: css({
    position: 'absolute',
    top: theme.spacing(-6),
    right: theme.spacing(3),
    opacity: 0.8,
    '&:hover': {
      opacity: 1,
    },
  }),
  branchPicker: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
  }),
});

export default AiAssistantThread;
