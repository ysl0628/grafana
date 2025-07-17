import { ThreadListPrimitive, ThreadListItemPrimitive, useThreadListItemRuntime } from '@assistant-ui/react';
import { css } from '@emotion/css';
import React, { useState, useEffect } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Icon, Button, Stack, Text, Input, Tooltip, EmptyState, ConfirmModal } from '@grafana/ui';

import { ThreadState } from '../types/aiAssistant';

interface AiAssistantHistoryProps {
  threads: ThreadState[];
  onThreadSelect?: (threadId: string) => void;
  onClearAll?: () => void;
  className?: string;
}

/**
 * AI Assistant History Component
 *
 * Displays and manages conversation thread history.
 * Provides functionality to switch between threads, rename them, and manage thread lifecycle.
 */
export const AiAssistantHistory: React.FC<AiAssistantHistoryProps> = ({
  threads,
  onThreadSelect,
  onClearAll,
  className,
}) => {
  const styles = useStyles2(getStyles);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredThreads = threads.filter(
    (thread) =>
      thread.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.messages.some((msg) => msg.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClearAll = () => {
    onClearAll?.();
    setShowClearConfirm(false);
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <ThreadListPrimitive.Root className={styles.threadList}>
        {/* Header */}
        <div className={styles.header}>
          <Stack alignItems="center" justifyContent="space-between">
            <Text variant="h6">{t('ai-assistant.history.title', 'Conversation History')}</Text>
            <Stack alignItems="center" gap={1}>
              <AiAssistantThreadNew />
              {threads.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  icon="trash-alt"
                  tooltip={t('ai-assistant.history.clear-all-tooltip', 'Clear all conversations')}
                  onClick={handleClearAll}
                  aria-label={t('ai-assistant.history.clear-all-aria-label', 'Clear all conversations')}
                />
              )}
            </Stack>
          </Stack>
        </div>

        {/* Search */}
        {threads.length > 0 && (
          <div className={styles.searchContainer}>
            <Input
              placeholder={t('ai-assistant.history.search-placeholder', 'Search conversations...')}
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              prefix={<Icon name="search" />}
              className={styles.searchInput}
            />
          </div>
        )}

        {/* Thread List */}
        <div className={styles.threadListContainer}>
          {filteredThreads.length === 0 ? (
            <EmptyState
              variant="not-found"
              message={
                searchTerm
                  ? t('ai-assistant.history.no-search-results', 'No conversations match your search')
                  : t('ai-assistant.history.no-conversations', 'No conversations yet')
              }
              button={
                !searchTerm ? (
                  <Button variant="primary" icon="plus">
                    {t('ai-assistant.history.start-new-conversation', 'Start New Conversation')}
                  </Button>
                ) : null
              }
            />
          ) : (
            <ThreadListPrimitive.Items
              components={{
                ThreadListItem: (props) => <AiAssistantThreadListItem {...props} onThreadSelect={onThreadSelect} />,
              }}
            />
          )}
        </div>
      </ThreadListPrimitive.Root>

      {/* Clear All Confirmation */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title={t('ai-assistant.history.clear-all-modal.title', 'Clear All Conversations')}
        body={t(
          'ai-assistant.history.clear-all-modal.body',
          'Are you sure you want to delete all conversation threads? This action cannot be undone.'
        )}
        confirmText={t('ai-assistant.history.clear-all-modal.confirm', 'Clear All')}
        onConfirm={handleConfirmClearAll}
        onDismiss={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

/**
 * Thread List Item Component
 *
 * Individual thread item with editing and selection capabilities.
 */
const AiAssistantThreadListItem: React.FC<{
  onThreadSelect?: (threadId: string) => void;
}> = ({ onThreadSelect }) => {
  const styles = useStyles2(getStyles);
  const thread = useThreadListItemRuntime();
  const [threadState, setThreadState] = useState(thread.getState());
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(threadState?.title || '');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = thread.subscribe(() => setThreadState(thread.getState()));
    return unsubscribe;
  }, [thread]);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(threadState?.title || t('ai-assistant.thread.new-chat', 'New Chat'));
    }
  }, [isEditing, threadState?.title]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue.trim() !== threadState?.title) {
      thread.rename(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(threadState?.title || t('ai-assistant.thread.new-chat', 'New Chat'));
  };

  const handleSelect = () => {
    if (threadState?.id) {
      onThreadSelect?.(threadState.id);
    }
  };

  const handleDelete = async () => {
    if (!threadState?.id) {
      return;
    }

    setIsDeleting(true);
    try {
      await thread.delete();
    } catch (error) {
      console.error('Error deleting thread:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getThreadPreview = () => {
    const messages = threadState?.messages || [];
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      return lastMessage.content.substring(0, 60) + (lastMessage.content.length > 60 ? '...' : '');
    }
    return t('ai-assistant.thread.no-messages', 'No messages yet');
  };

  const getThreadDate = () => {
    if (threadState?.lastActivity) {
      return new Date(threadState.lastActivity).toLocaleDateString();
    }
    return '';
  };

  if (isEditing) {
    return (
      <div className={styles.threadItem}>
        <div className={styles.editContainer}>
          <Input
            value={editValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveEdit();
              }
              if (e.key === 'Escape') {
                handleCancelEdit();
              }
            }}
            autoFocus
            className={styles.editInput}
          />
          <Stack alignItems="center" gap={0.5}>
            <Button
              variant="primary"
              size="sm"
              icon="check"
              onClick={handleSaveEdit}
              aria-label={t('ai-assistant.thread.save-aria-label', 'Save')}
            />
            <Button
              variant="secondary"
              size="sm"
              icon="times"
              onClick={handleCancelEdit}
              aria-label={t('ai-assistant.thread.cancel-aria-label', 'Cancel')}
            />
          </Stack>
        </div>
      </div>
    );
  }

  return (
    <ThreadListItemPrimitive.Root className={styles.threadItem}>
      <ThreadListItemPrimitive.Trigger className={styles.threadTrigger} onClick={handleSelect}>
        <div className={styles.threadContent}>
          <div className={styles.threadTitle}>
            <ThreadListItemPrimitive.Title fallback={t('ai-assistant.thread.new-chat', 'New Chat')} />
          </div>
          <div className={styles.threadPreview}>{getThreadPreview()}</div>
          <div className={styles.threadDate}>{getThreadDate()}</div>
        </div>
      </ThreadListItemPrimitive.Trigger>

      <div className={styles.threadActions}>
        <Tooltip content={t('ai-assistant.thread.rename-tooltip', 'Rename')}>
          <Button
            variant="secondary"
            size="sm"
            icon="edit"
            onClick={handleEdit}
            aria-label={t('ai-assistant.thread.rename-aria-label', 'Rename thread')}
          />
        </Tooltip>

        <ThreadListItemPrimitive.Archive asChild>
          <Tooltip content={t('ai-assistant.thread.delete-tooltip', 'Delete')}>
            <Button
              variant="destructive"
              size="sm"
              icon="trash-alt"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label={t('ai-assistant.thread.delete-aria-label', 'Delete thread')}
            />
          </Tooltip>
        </ThreadListItemPrimitive.Archive>
      </div>
    </ThreadListItemPrimitive.Root>
  );
};

/**
 * New Thread Button Component
 */
const AiAssistantThreadNew: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <ThreadListPrimitive.New asChild>
      <Tooltip content={t('ai-assistant.thread.new-conversation-tooltip', 'New conversation')}>
        <Button
          variant="primary"
          size="sm"
          icon="plus"
          aria-label={t('ai-assistant.thread.new-conversation-aria-label', 'New conversation')}
        />
      </Tooltip>
    </ThreadListPrimitive.New>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  }),
  threadList: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  }),
  header: css({
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    backgroundColor: theme.colors.background.secondary,
  }),
  searchContainer: css({
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.colors.border.weak}`,
  }),
  searchInput: css({
    width: '100%',
  }),
  threadListContainer: css({
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: theme.spacing(1),
  }),
  threadItem: css({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    backgroundColor: theme.colors.background.primary,
    [theme.transitions.handleMotion('no-preference')]: {
      transition: 'all 0.2s ease',
    },
    '&:hover': {
      backgroundColor: theme.colors.background.secondary,
      borderColor: theme.colors.border.medium,
    },
  }),
  threadTrigger: css({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
    minWidth: 0,
  }),
  threadContent: css({
    flex: 1,
    minWidth: 0,
  }),
  threadTitle: css({
    fontWeight: theme.typography.fontWeightMedium,
    fontSize: theme.typography.size.sm,
    marginBottom: theme.spacing(0.5),
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  threadPreview: css({
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing(0.5),
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  threadDate: css({
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.disabled,
  }),
  threadActions: css({
    display: 'flex',
    gap: theme.spacing(0.5),
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
    },
  }),
  editContainer: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    width: '100%',
  }),
  editInput: css({
    flex: 1,
  }),
});

export default AiAssistantHistory;
