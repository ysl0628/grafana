import { css } from '@emotion/css';
import React, { useState, useRef, useEffect } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Icon, Button, Stack, Text, Spinner, Alert, Modal, ConfirmModal } from '@grafana/ui';

import { useAiAssistant } from '../hooks/useAiAssistant';
import { AiAssistantContextProvider } from '../providers/AiAssistantContextProvider';
import { AiAssistantRuntimeProvider } from '../providers/AiAssistantRuntimeProvider';
import { AiAssistantComponentProps } from '../types/aiAssistant';

import { AiAssistantHistory } from './AiAssistantHistory';
import { AiAssistantThread } from './AiAssistantThread';
import { useThread } from '@assistant-ui/react';

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
      <AiAssistantContextProvider>
        <AiAssistantRuntimeProvider>
          <AiAssistantContent onClose={onClose} />
        </AiAssistantRuntimeProvider>
      </AiAssistantContextProvider>
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
  const historyRef = useRef<HTMLDivElement>(null);

  const { isLoading, error, clearError } = useAiAssistant();
  const currentThread = useThread();

  const handleNewThread = () => {
    setIsHistoryOpen(false);
  };

  const handleClearAllThreads = () => {
    setShowClearConfirm(true);
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

  return (
    <div className={styles.content}>
      {/* Header */}
      <div className={styles.header}>
        <Stack alignItems="center" justifyContent="space-between">
          <Text variant="h5">{t('ai-assistant.title', 'AI Assistant')}</Text>
          <Stack alignItems="center" gap={0.5}>
            <Button
              variant="secondary"
              size="sm"
              fill="text"
              icon="history"
              tooltip={t('ai-assistant.history.tooltip', 'Thread History')}
              onClick={toggleHistory}
              aria-label={t('ai-assistant.history.aria-label', 'Thread History')}
            />
            <Button
              variant="secondary"
              size="sm"
              fill="text"
              icon="plus"
              tooltip={t('ai-assistant.new-thread.tooltip', 'New Thread')}
              onClick={handleNewThread}
              aria-label={t('ai-assistant.new-thread.aria-label', 'New Thread')}
            />
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
        </Stack>
      </div>

      {/* History Modal */}
      <Modal
        title={t('ai-assistant.history.modal-title', 'Thread History')}
        isOpen={isHistoryOpen}
        onDismiss={closeHistory}
        className={styles.historyModal}
      >
        <div ref={historyRef} className={styles.historyContent}>
          <AiAssistantHistory onItemClick={closeHistory} />
        </div>
      </Modal>

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

      {/* Loading State */}
      {isLoading && (
        <div className={styles.loadingContainer}>
          <Stack alignItems="center" gap={1}>
            <Spinner size="md" />
            <Text variant="body">{t('ai-assistant.loading', 'Loading AI Assistant...')}</Text>
          </Stack>
        </div>
      )}

      {/* Main Thread Interface */}
      <div className={styles.threadContainer}>
        {currentThread || isLoading ? (
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
  header: css({
    padding: theme.spacing(2),
    // borderBottom: `1px solid ${theme.colors.border.weak}`,
    // backgroundColor: theme.colors.background.secondary,
    flexShrink: 0,
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
  historyModal: css({
    width: '400px',
    maxWidth: '90vw',
    maxHeight: '80vh',
  }),
  historyContent: css({
    maxHeight: '60vh',
    overflowY: 'auto',
    padding: theme.spacing(1),
  }),
});

export default AiAssistantSidebar;
