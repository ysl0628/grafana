import { type FC, useState, useEffect } from 'react';
import { ThreadListPrimitive, ThreadListItemPrimitive, useThreadListItemRuntime } from '@assistant-ui/react';
import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Button, Input } from '@grafana/ui';

interface ThreadDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAll: () => void;
}

export const ThreadNewButton: FC = () => {
  return (
    <ThreadListPrimitive.New asChild>
      <Button
        variant="secondary"
        size="sm"
        fill="text"
        icon="plus"
        tooltip={t('ai-assistant.new-thread.tooltip', 'New Thread')}
        aria-label={t('ai-assistant.thread.new-thread-aria-label', 'New Thread')}
      />
    </ThreadListPrimitive.New>
  );
};

/**
 * Thread Dropdown Component
 *
 * Displays thread history in a dropdown menu with hover actions.
 */
export const ThreadDropdown: FC<ThreadDropdownProps> = ({ isOpen, onClose, onClearAll }) => {
  const styles = useStyles2(getStyles);

  if (!isOpen) return null;

  return (
    <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
      <ThreadListPrimitive.Root className={styles.threadListRoot}>
        <div className={styles.itemsContainer}>
          <ThreadDropdownItems onItemClick={onClose} />
        </div>

        {/* Clear All Button fixed at bottom */}
        <div className={styles.clearAllContainer}>
          <Button
            variant="destructive"
            size="sm"
            fill="outline"
            icon="trash-alt"
            onClick={onClearAll}
            className={styles.clearAllButton}
          >
            {t('ai-assistant.clear-all.button', 'Clear All')}
          </Button>
        </div>
      </ThreadListPrimitive.Root>
    </div>
  );
};

const ThreadDropdownItems: FC<{ onItemClick?: () => void }> = ({ onItemClick }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.itemsList}>
      <ThreadListPrimitive.Items
        components={{
          ThreadListItem: (props) => (
            <ThreadDropdownItem
              {...props}
              onItemClick={onItemClick}
              editingId={editingId}
              setEditingId={setEditingId}
            />
          ),
        }}
      />
    </div>
  );
};

const ThreadDropdownItem: FC<{
  onItemClick?: () => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}> = ({ onItemClick, editingId, setEditingId }) => {
  const styles = useStyles2(getStyles);
  const thread = useThreadListItemRuntime();
  const [threadState, setThreadState] = useState(thread.getState());
  const [isHovered, setIsHovered] = useState(false);
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

  const handleDelete = async () => {
    await thread.delete();
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
          <Button
            variant="primary"
            size="sm"
            icon="check"
            onClick={handleConfirm}
            aria-label={t('ai-assistant.thread.confirm-aria-label', 'Confirm')}
          />
          <Button
            variant="secondary"
            size="sm"
            icon="times"
            onClick={handleCancel}
            aria-label={t('ai-assistant.thread.cancel-aria-label', 'Cancel')}
          />
        </div>
      </div>
    );
  }

  return (
    <ThreadListItemPrimitive.Root
      className={styles.threadItem}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ThreadListItemPrimitive.Trigger className={styles.threadTrigger} onClick={onItemClick}>
        <div className={styles.threadTitle}>
          <ThreadListItemPrimitive.Title fallback={t('ai-assistant.thread.new-chat', 'New Chat')} />
        </div>
      </ThreadListItemPrimitive.Trigger>

      {/* Hover actions - only show on hover */}
      {isHovered && (
        <div className={styles.threadActions}>
          <Button
            variant="secondary"
            size="sm"
            fill="text"
            icon="edit"
            onClick={(e) => {
              e.stopPropagation();
              setEditingId(threadState?.id ?? null);
            }}
            disabled={editingId !== null && editingId !== threadState?.id}
            aria-label={t('ai-assistant.thread.rename-aria-label', 'Rename thread')}
            className={styles.actionButton}
          />
          <ThreadListItemPrimitive.Archive asChild>
            <Button
              variant="secondary"
              size="sm"
              fill="text"
              icon="trash-alt"
              onClick={handleDelete}
              aria-label={t('ai-assistant.thread.archive-aria-label', 'Archive thread')}
              className={styles.actionButton}
            />
          </ThreadListItemPrimitive.Archive>
        </div>
      )}
    </ThreadListItemPrimitive.Root>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  dropdown: css({
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: '300px',
    width: 'max-content',
    height: '300px',
    backgroundColor: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    boxShadow: theme.shadows.z3,
    zIndex: 1001,
    marginTop: theme.spacing(0.5),
    display: 'flex',
    flexDirection: 'column',
  }),
  threadListRoot: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  }),
  itemsContainer: css({
    flex: 1,
    minHeight: 0,
    padding: theme.spacing(1),
  }),
  itemsList: css({
    height: '100%',
    overflowY: 'auto',
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
  threadItem: css({
    display: 'flex',
    alignItems: 'center',
    height: '40px',
    justifyContent: 'space-between',
    padding: theme.spacing(1),
    borderRadius: theme.shape.radius.default,
    backgroundColor: 'transparent',
    border: 'none',
    [theme.transitions.handleMotion('no-preference')]: {
      transition: 'all 0.2s ease',
    },
    '&:hover': {
      backgroundColor: theme.colors.background.secondary,
    },
    '&[data-active="true"]': {
      backgroundColor: theme.colors.background.secondary,
    },
    '&:data-[active=true]': {
      backgroundColor: theme.colors.background.secondary,
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
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    margin: 0,
  }),
  threadActions: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
  }),
  actionButton: css({
    minWidth: 'auto',
    padding: theme.spacing(0.5),
  }),
  threadItemEdit: css({
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
  clearAllContainer: css({
    borderTop: `1px solid ${theme.colors.border.weak}`,
    padding: theme.spacing(1),
    flexShrink: 0,
    backgroundColor: theme.colors.background.primary,
  }),
  clearAllButton: css({
    width: '100%',
    justifyContent: 'center',
  }),
});

export default ThreadDropdown;
