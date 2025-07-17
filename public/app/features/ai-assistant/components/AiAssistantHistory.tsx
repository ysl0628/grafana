import { type FC, useState, useEffect } from 'react';
import {
  ThreadListPrimitive,
  ThreadListItemPrimitive,
  useThreadListItemRuntime,
  useThreadList,
} from '@assistant-ui/react';
import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Icon, Button, Input } from '@grafana/ui';

/**
 * AI Assistant History Component
 *
 * Thread list management following the reference pattern from react-ai-assistant-demo.
 * Provides functionality to create new threads, rename them, and archive them.
 */
export const AiAssistantHistory: FC<{ onItemClick?: () => void }> = ({ onItemClick }) => {
  const styles = useStyles2(getStyles);

  return (
    <ThreadListPrimitive.Root className={styles.threadListRoot}>
      <AiAssistantThreadNew />
      <AiAssistantThreadListItems onItemClick={onItemClick} />
    </ThreadListPrimitive.Root>
  );
};

const AiAssistantThreadListItems: FC<{ onItemClick?: () => void }> = ({ onItemClick }) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <ThreadListPrimitive.Items
      components={{
        ThreadListItem: (props) => (
          <AiAssistantThreadListItem
            {...props}
            onItemClick={onItemClick}
            editingId={editingId}
            setEditingId={setEditingId}
          />
        ),
      }}
    />
  );
};

const AiAssistantThreadListItem: FC<{
  onItemClick?: () => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}> = ({ onItemClick, editingId, setEditingId }) => {
  const styles = useStyles2(getStyles);
  const thread = useThreadListItemRuntime();
  const [threadState, setThreadState] = useState(thread.getState());
  const isEditing = editingId === threadState?.id;
  const [inputValue, setInputValue] = useState(threadState?.title ?? '');

  useEffect(() => {
    const unsubscribe = thread.subscribe(() => setThreadState(thread.getState()));
    return unsubscribe;
  }, [thread]);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(threadState?.title ?? t('ai-assistant.thread.new-chat', 'New Chat'));
    }
  }, [isEditing, threadState?.title]);

  const handleConfirm = () => {
    if (inputValue.trim() && inputValue.trim() !== threadState?.title) {
      thread.rename(inputValue.trim());
    }
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setInputValue(threadState?.title ?? t('ai-assistant.thread.new-chat', 'New Chat'));
  };

  if (isEditing) {
    return (
      <div className={styles.threadItemEdit}>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue((e.target as HTMLInputElement).value)}
          className={styles.editInput}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <div className={styles.editActions}>
          {/* <Tooltip content={t('ai-assistant.thread.confirm-tooltip', 'Confirm')}> */}
          <Button
            variant="primary"
            size="sm"
            icon="check"
            onClick={handleConfirm}
            aria-label={t('ai-assistant.thread.confirm-aria-label', 'Confirm')}
          />
          {/* </Tooltip> */}
          {/* <Tooltip content={t('ai-assistant.thread.cancel-tooltip', 'Cancel')}> */}
          <Button
            variant="secondary"
            size="sm"
            icon="times"
            onClick={handleCancel}
            aria-label={t('ai-assistant.thread.cancel-aria-label', 'Cancel')}
          />
          {/* </Tooltip> */}
        </div>
      </div>
    );
  }

  return (
    <ThreadListItemPrimitive.Root className={styles.threadItem}>
      <ThreadListItemPrimitive.Trigger className={styles.threadTrigger} onClick={onItemClick}>
        <AiAssistantThreadListItemTitle />
      </ThreadListItemPrimitive.Trigger>
      <div className={styles.threadActions}>
        {/* <Tooltip content={t('ai-assistant.thread.rename-tooltip', 'Rename thread')}> */}
        <Button
          variant="secondary"
          size="sm"
          icon="edit"
          onClick={() => setEditingId(threadState?.id ?? null)}
          disabled={editingId !== null && editingId !== threadState?.id}
          aria-label={t('ai-assistant.thread.rename-aria-label', 'Rename thread')}
        />
        {/* </Tooltip> */}
        <AiAssistantThreadListItemArchive />
      </div>
    </ThreadListItemPrimitive.Root>
  );
};

const AiAssistantThreadListItemTitle: FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <p className={styles.threadTitle}>
      <ThreadListItemPrimitive.Title fallback={t('ai-assistant.thread.new-chat', 'New Chat')} />
    </p>
  );
};

const AiAssistantThreadListItemArchive: FC = () => {
  return (
    <ThreadListItemPrimitive.Archive asChild>
      {/* <Tooltip content={t('ai-assistant.thread.archive-tooltip', 'Archive thread')}> */}
      <Button
        variant="secondary"
        size="sm"
        icon="archive-alt"
        aria-label={t('ai-assistant.thread.archive-aria-label', 'Archive thread')}
      />
      {/* </Tooltip> */}
    </ThreadListItemPrimitive.Archive>
  );
};

const AiAssistantThreadNew: FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <ThreadListPrimitive.New asChild>
      {/* <Tooltip content={t('ai-assistant.thread.new-thread-tooltip', 'New Thread')}> */}
      <Button
        variant="primary"
        fill="outline"
        icon="plus"
        className={styles.newThreadButton}
        aria-label={t('ai-assistant.thread.new-thread-aria-label', 'New Thread')}
      >
        {t('ai-assistant.thread.new-thread', 'New Thread')}
      </Button>
      {/* </Tooltip> */}
    </ThreadListPrimitive.New>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  threadListRoot: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: theme.spacing(1.5),
  }),
  newThreadButton: css({
    padding: theme.spacing(1),
    justifyContent: 'flex-start',
    textAlign: 'left',
    borderRadius: theme.shape.radius.default,
    [theme.transitions.handleMotion('no-preference')]: {
      transition: 'colors 0.2s ease',
    },
    '&:hover': {
      backgroundColor: theme.colors.background.secondary,
    },
  }),
  threadItem: css({
    // Following assistant-ui CSS class naming: aui-thread-list-item
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1),
    borderRadius: theme.shape.radius.default,
    backgroundColor: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    [theme.transitions.handleMotion('no-preference')]: {
      transition: 'all 0.2s ease',
    },
    '&:hover': {
      backgroundColor: theme.colors.background.secondary,
      borderColor: theme.colors.border.medium,
    },
  }),
  threadTrigger: css({
    // Following assistant-ui CSS class naming: aui-thread-list-item-trigger
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
  threadTitle: css({
    // Following assistant-ui CSS class naming: aui-thread-list-item-title
    fontWeight: theme.typography.fontWeightMedium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    margin: 0,
  }),
  threadActions: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  }),
  threadItemEdit: css({
    // Following assistant-ui CSS class naming: aui-thread-list-item (editing state)
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: theme.spacing(1),
    gap: theme.spacing(1),
  }),
  editInput: css({
    flex: 1,
    height: theme.spacing(4),
  }),
  editActions: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  }),
});

export default AiAssistantHistory;
