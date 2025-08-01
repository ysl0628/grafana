import { css } from '@emotion/css';
import { useState, ReactNode } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Icon, Button, Text, Badge } from '@grafana/ui';

interface ToolLayoutWrapperProps {
  toolName: string;
  status?: {
    type: 'running' | 'complete' | 'incomplete' | 'requires-action' | 'error' | 'warning';
    reason?: string;
  } | null;
  children: ReactNode;
  initialCollapsed?: boolean;
  completeIcon?: string;
  showStatus?: boolean;
}

/**
 * Shared Tool Layout Wrapper Component
 *
 * Provides consistent header layout with collapsible details for all tool fallback components.
 * Includes status indicators, tool name, and toggle functionality.
 */
export const ToolLayoutWrapper: React.FC<ToolLayoutWrapperProps> = ({
  toolName,
  status,
  children,
  initialCollapsed = true,
  completeIcon = 'check',
  showStatus = true,
}) => {
  const styles = useStyles2(getStyles);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  // Get tool status styling based on multiple parameters
  const getStatusConfig = () => {
    const statusConfigs = {
      running: {
        icon: 'sync',
        statusText: t('ai-assistant.tool.status.running', '執行中...'),
      },
      complete: {
        icon: completeIcon,
        statusText: showStatus ? t('ai-assistant.tool.status.complete', '已完成') : null,
      },
      incomplete: {
        icon: 'exclamation-triangle',
        statusText: t('ai-assistant.tool.status.incomplete', '處理中...'),
      },
      thinkRunning: {
        icon: 'sync',
        statusText: t('ai-assistant.tool.status.think', '思考中...'),
      },
      thinkComplete: {
        icon: 'gf-ml',
        statusText: t('ai-assistant.tool.status.think', '思考完成'),
      },
      error: {
        icon: 'times',
        statusText: null,
      },
      warning: {
        icon: 'exclamation-triangle',
        statusText: null,
      },
      default: {
        icon: 'cog',
        statusText: null,
      },
    };

    const determineStatus = () => {
      if (status?.type === 'running') {
        if (toolName === 'think') return 'thinkRunning';
        return 'running';
      }

      if (status?.type === 'complete') {
        if (toolName === 'think') return 'thinkComplete';
        return 'complete';
      }

      if (status?.type === 'incomplete') {
        if (status?.reason === 'error') return 'error';
        return 'incomplete';
      }

      if (status?.type === 'requires-action') {
        return 'incomplete';
      }

      if (status?.type === 'error') {
        return 'error';
      }

      if (status?.type === 'warning') {
        return 'warning';
      }

      return 'default';
    };

    const currentStatus = determineStatus();
    return statusConfigs[currentStatus] || statusConfigs.default;
  };

  const statusConfig = getStatusConfig();

  return (
    <div className={styles.container}>
      {/* Tool header with collapse toggle */}
      <div className={styles.header} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className={styles.leftSection}>
          <Icon
            name={statusConfig.icon as any}
            className={`${styles.statusIcon} ${status?.type === 'running' ? styles.spinningIcon : ''}`}
          />
          <Text variant="code">{toolName}</Text>
          {statusConfig?.statusText && <Badge color="darkgrey" text={statusConfig.statusText} />}
        </div>

        <Button
          variant="secondary"
          size="sm"
          fill="text"
          icon={isCollapsed ? 'angle-down' : 'angle-up'}
          aria-label={
            isCollapsed
              ? t('ai-assistant.tool.expand', 'Expand details')
              : t('ai-assistant.tool.collapse', 'Collapse details')
          }
          className={styles.toggleButton}
        />
      </div>

      {/* Collapsible details section */}
      {!isCollapsed && <div className={styles.detailsContainer}>{children}</div>}
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    marginBottom: theme.spacing(1),
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  }),
  header: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  }),
  leftSection: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flex: 1,
    '& > span': {
      fontSize: '12px',
    },
  }),
  statusIcon: css({
    flexShrink: 0,
  }),
  spinningIcon: css({
    animation: 'spin 1s linear infinite',
    '@keyframes spin': {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
  }),
  statusBadge: css({
    backgroundColor: theme.colors.background.canvas,
    padding: theme.spacing(0.25, 0.75),
    borderRadius: theme.shape.radius.pill,
    border: `1px solid ${theme.colors.border.weak}`,
    '& > span': {
      fontSize: '10px',
    },
  }),
  toggleButton: css({
    flexShrink: 0,
  }),
  detailsContainer: css({
    backgroundColor: theme.colors.background.primary,
    paddingTop: theme.spacing(1),
  }),
});

export default ToolLayoutWrapper;
