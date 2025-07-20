import { type ToolCallContentPartComponent } from '@assistant-ui/react';
import { css } from '@emotion/css';
import { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Icon, Button, Text } from '@grafana/ui';

/**
 * Tool Fallback Component
 *
 * Displays tool execution status with collapsible details.
 * Supports different status types with appropriate icons and styling.
 */
export const ToolFallback: ToolCallContentPartComponent = ({ toolName, argsText, result, status }) => {
  const styles = useStyles2(getStyles);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Get tool status styling based on multiple parameters
  const getStatusConfig = () => {
    const statusConfigs = {
      running: {
        icon: 'spinner',
        statusText: t('ai-assistant.tool.status.running', '執行中...'),
      },
      complete: {
        icon: 'check',
        statusText: t('ai-assistant.tool.status.complete', '已完成'),
      },
      incomplete: {
        icon: 'exclamation-triangle',
        statusText: t('ai-assistant.tool.status.incomplete', '處理中...'),
      },
      thinkRunning: {
        icon: 'spinner',
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
      default: {
        icon: 'cog',
        statusText: t('ai-assistant.tool.status.pending', '準備中'),
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
          <Text variant="bodySmall">{toolName}</Text>
          {statusConfig?.statusText && (
            <div className={styles.statusBadge}>
              <Text variant="bodySmall">{statusConfig.statusText}</Text>
            </div>
          )}
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
      {!isCollapsed && (
        <div className={styles.detailsContainer}>
          {toolName === 'think' ? (
            <div className={styles.thinkResult}>
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </div>
          ) : (
            <>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIndicator} />
                  <Text variant="bodySmall">{t('ai-assistant.tool.input-params', '輸入參數')}</Text>
                </div>
                <div className={styles.codeBlock}>
                  <pre className={styles.codeContent}>{argsText}</pre>
                </div>
              </div>
              {/* Output results section */}
              {result !== undefined && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div className={`${styles.sectionIndicator} ${styles.resultIndicator}`} />
                    <Text variant="bodySmall">{t('ai-assistant.tool.execution-result', '執行結果')}</Text>
                  </div>
                  <div className={`${styles.codeBlock} ${styles.resultBlock}`}>
                    <pre className={styles.codeContent}>
                      {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {/* Tool metadata footer */}
              <div className={styles.footer}>
                <Text variant="bodySmall">
                  {t('ai-assistant.tool.tool-type', '工具類型')}:{' '}
                  {t('ai-assistant.tool.general-processor', '通用處理器')}
                </Text>
                <Text variant="bodySmall">
                  {t('ai-assistant.tool.status-label', '狀態')}: {statusConfig.statusText}
                </Text>
              </div>
            </>
          )}
        </div>
      )}
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
    '& span': {
      fontFamily: theme.typography.fontFamilyMonospace,
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
  toolName: css({
    fontWeight: theme.typography.fontWeightMedium,
    whiteSpace: 'nowrap',
    fontSize: theme.typography.size.sm,
  }),
  statusBadge: css({
    backgroundColor: theme.colors.background.canvas,
    padding: theme.spacing(0.25, 0.75),
    borderRadius: theme.shape.radius.pill,
    border: `1px solid ${theme.colors.border.weak}`,
  }),
  toggleButton: css({
    flexShrink: 0,
  }),
  detailsContainer: css({
    backgroundColor: theme.colors.background.primary,
    paddingTop: theme.spacing(1),
  }),
  section: css({
    padding: theme.spacing(1, 0),
  }),
  sectionHeader: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(1),
  }),
  sectionIndicator: css({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: theme.colors.primary.main,
    flexShrink: 0,
  }),
  resultIndicator: css({
    backgroundColor: theme.colors.success.main,
  }),
  sectionTitle: css({
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.colors.text.secondary,
  }),
  codeBlock: css({
    borderRadius: theme.shape.radius.default,
    overflow: 'auto',
    maxHeight: '200px',
  }),
  resultBlock: css({
    maxHeight: '300px',
  }),
  codeContent: css({
    fontFamily: theme.typography.fontFamilyMonospace,
    fontSize: theme.typography.bodySmall.fontSize,
    lineHeight: 1.4,
    color: theme.colors.text.primary,
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }),
  footer: css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    backgroundColor: theme.colors.background.canvas,
    borderRadius: theme.shape.radius.default,
    marginTop: theme.spacing(1),
  }),
  metaText: css({
    color: theme.colors.text.secondary,
  }),
  thinkResult: css({
    fontSize: theme.typography.bodySmall.fontSize,
    lineHeight: 1.4,
    padding: theme.spacing(1.5),
    overflow: 'auto',
    maxHeight: '200px',
    fontFamily: theme.typography.fontFamilyMonospace,
    color: theme.colors.text.disabled,
  }),
});

export default ToolFallback;
