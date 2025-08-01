import { css } from '@emotion/css';
import { Resizable } from 're-resizable';
import React, { Suspense } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { config } from '@grafana/runtime';
import { getDragStyles, Spinner, useStyles2 } from '@grafana/ui';

import { useAiAssistantSidebar } from '../providers/AiAssistantProvider';

import { AiAssistantSidebar } from './AiAssistantSidebar';

/**
 * AI Assistant Sidebar Container
 * 
 * Container component that handles the resizable sidebar for AI assistant
 */
export const AiAssistantSidebarContainer: React.FC = () => {
  const { state, closeSidebar, setWidth } = useAiAssistantSidebar();
  const styles = useStyles2(getStyles);
  const dragStyles = useStyles2(getDragStyles);

  // Don't render if feature is disabled or sidebar is closed
  if (!config.featureToggles.aiAssistant || !state.isOpen) {
    return null;
  }

  return (
    <Resizable
      className={styles.container}
      defaultSize={{ width: state.width }}
      enable={{ left: true }}
      onResize={(_evt, _direction, ref) => setWidth(ref.getBoundingClientRect().width)}
      handleClasses={{ left: dragStyles.dragHandleBaseVertical }}
      minWidth={300}
      maxWidth={window.innerWidth * 0.67}
    >
      <div className={styles.content}>
        <Suspense fallback={<div className={styles.loading}><Spinner size="lg" /></div>}>
          <AiAssistantSidebar onClose={closeSidebar} />
        </Suspense>
      </div>
    </Resizable>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    height: '100%',
    minHeight: 0,
    borderLeft: `1px solid ${theme.colors.border.weak}`,
    backgroundColor: theme.colors.background.primary,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0, // 防止 AI assistant 被壓縮
  }),
  content: css({
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    flex: 1,
  }),
  loading: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  }),
});

export default AiAssistantSidebarContainer;
