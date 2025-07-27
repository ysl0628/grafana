import { css } from '@emotion/css';
import React, { useState, useRef, useEffect } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Icon, Button, Stack, Text, Spinner, Alert, ConfirmModal, ToolbarButton, Box } from '@grafana/ui';

import { useAiAssistant } from '../hooks/useAiAssistant';
import { AiAssistantContextProvider } from '../providers/AiAssistantContextProvider';
import { AiAssistantRuntimeProvider } from '../providers/AiAssistantRuntimeProvider';
import { AiAssistantComponentProps } from '../types/aiAssistant';

import { AiAssistantThread } from './AiAssistantThread';
import { ThreadDropdown, ThreadNewButton } from './ThreadDropdown';
import { useThread, useThreadListItem } from '@assistant-ui/react';
import { AtSelectionProvider } from '../contexts/AtSelectionContext';

/**
 * AI Assistant Sidebar Component
 *
 * Main component that provides the AI Assistant interface within Grafana's extension sidebar.
 * Integrates with Grafana's theming system and follows existing component patterns.
 */
export const AiAssistantSidebar: React.FC<AiAssistantComponentProps> = ({ className, onClose }) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <AtSelectionProvider>
        <AiAssistantContextProvider>
          <AiAssistantRuntimeProvider>
            <AiAssistantContent onClose={onClose} />
          </AiAssistantRuntimeProvider>
        </AiAssistantContextProvider>
      </AtSelectionProvider>
    </div>
  );
};

/**
 * AI Assistant Content Component
 *
 * Contains the main interface elements including header, thread view, and controls.
 */
const AiAssistantContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const styles = useStyles2(getStyles);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const thread = useThreadListItem();

  const { error, clearError, threads } = useAiAssistant();
  const isThreadListEmpty = threads.length === 0;

  const currentThread = useThread();
  const { isRunning } = currentThread;
  const title = thread.title || t('ai-assistant.title', 'New Chat');

  const handleClearAllThreads = () => {
    setShowClearConfirm(true);
    setIsHistoryOpen(false);
  };

  const handleConfirmClearAll = () => {
    // Implementation for clearing all threads
    setShowClearConfirm(false);
  };

  const toggleHistory = () => {
    setIsHistoryOpen(!isHistoryOpen);
  };

  const closeHistory = () => {
    setIsHistoryOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsHistoryOpen(false);
      }
    };

    if (isHistoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHistoryOpen]);

  return (
    <div className={styles.content}>
      {/* Header */}
      <Box
        backgroundColor="canvas"
        paddingRight={2}
        paddingLeft={2}
        paddingTop={0.5}
        paddingBottom={0.5}
        width="100%"
        display="flex"
        direction="row"
        justifyContent="space-between"
      >
        <Box display="flex" direction="row" alignItems="center" gap={0.5}>
          <Icon name="ai-sparkle" size="sm" />
          <div ref={dropdownRef} className={styles.dropdownContainer}>
            <ToolbarButton
              variant="default"
              narrow={true}
              isOpen={isHistoryOpen}
              tooltip={t('ai-assistant.history.tooltip', 'Thread History')}
              onClick={toggleHistory}
              aria-label={t('ai-assistant.history.aria-label', 'Thread History')}
              disabled={isThreadListEmpty}
            >
              <Text variant="body">{title || t('ai-assistant.title', 'New Chat')}</Text>
            </ToolbarButton>
            <ThreadDropdown isOpen={isHistoryOpen} onClose={closeHistory} onClearAll={handleClearAllThreads} />
          </div>
        </Box>
        <Stack alignItems="center" gap={0.5}>
          <ThreadNewButton />
          {onClose && (
            <Button
              variant="secondary"
              size="sm"
              fill="text"
              icon="times"
              tooltip={t('ai-assistant.close.tooltip', 'Close')}
              onClick={onClose}
              aria-label={t('ai-assistant.close.aria-label', 'Close AI Assistant')}
            />
          )}
        </Stack>
      </Box>

      {/* Clear All Confirmation */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title={t('ai-assistant.clear-all.title', 'Clear All Threads')}
        body={t(
          'ai-assistant.clear-all.body',
          'Are you sure you want to delete all conversation threads? This action cannot be undone.'
        )}
        confirmText={t('ai-assistant.clear-all.confirm', 'Clear All')}
        onConfirm={handleConfirmClearAll}
        onDismiss={() => setShowClearConfirm(false)}
      />

      {/* Error Display */}
      {error && (
        <div className={styles.errorContainer}>
          <Alert title={t('ai-assistant.error.title', 'Error')} severity="error" onRemove={clearError}>
            {error}
          </Alert>
        </div>
      )}

      {/* Main Thread Interface */}
      <div className={styles.threadContainer}>
        {currentThread || isRunning ? (
          <AiAssistantThread />
        ) : (
          <div className={styles.loadingContainer}>
            <Stack alignItems="center" gap={1}>
              <Spinner size="md" />
              <Text variant="body">{t('ai-assistant.initializing', 'Initializing AI Assistant...')}</Text>
            </Stack>
          </div>
        )}
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
  }),
  content: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  }),
  mouseButton: css({
    '&:hover': {
      backgroundColor: theme.colors.action.hover,
    },
  }),
  threadContainer: css({
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  }),
  welcomeContainer: css({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
    textAlign: 'center',
  }),
  errorContainer: css({
    margin: theme.spacing(2),
    flexShrink: 0,
  }),
  loadingContainer: css({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
  }),
  dropdownContainer: css({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  }),
});

export default AiAssistantSidebar;
