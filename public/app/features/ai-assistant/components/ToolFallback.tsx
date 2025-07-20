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

  // Get tool status styling based on status.type
  const getStatusConfig = () => {
    switch (status?.type) {
      case 'running':
        return {
          icon: 'spinner',
          iconColor: 'blue',
          bgColor: styles.runningBg,
          textColor: styles.runningText,
          statusText: t('ai-assistant.tool.status.running', '執行中...'),
        };
      case 'complete':
        return {
          icon: 'check',
          iconColor: 'green',
          bgColor: styles.completeBg,
          textColor: styles.completeText,
          statusText: t('ai-assistant.tool.status.complete', '已完成'),
        };
      case 'incomplete':
        return {
          icon: 'exclamation-triangle',
          iconColor: 'orange',
          bgColor: styles.incompleteBg,
          textColor: styles.incompleteText,
          statusText: t('ai-assistant.tool.status.incomplete', '處理中...'),
        };
      default:
        return {
          icon: 'cog',
          iconColor: 'grey',
          bgColor: styles.defaultBg,
          textColor: styles.defaultText,
          statusText: t('ai-assistant.tool.status.pending', '準備中'),
        };
    }
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
          <div className={styles.statusBadge}>
            <Text variant="bodySmall">{statusConfig.statusText}</Text>
          </div>
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
          {/* Input parameters section */}
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
              {t('ai-assistant.tool.tool-type', '工具類型')}: {t('ai-assistant.tool.general-processor', '通用處理器')}
            </Text>
            <Text variant="bodySmall">
              {t('ai-assistant.tool.status-label', '狀態')}: {statusConfig.statusText}
            </Text>
          </div>
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
    backgroundColor: theme.colors.background.canvas,
    borderRadius: theme.shape.radius.default,
    padding: theme.spacing(1.5),
    overflow: 'auto',
    maxHeight: '200px',
  }),
  resultBlock: css({
    maxHeight: '300px',
  }),
  codeContent: css({
    fontFamily: theme.typography.fontFamilyMonospace,
    fontSize: theme.typography.size.sm,
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
  // Status-specific background colors
  runningBg: css({
    backgroundColor: theme.colors.info.transparent,
    borderColor: theme.colors.info.border,
  }),
  completeBg: css({
    backgroundColor: theme.colors.success.transparent,
    borderColor: theme.colors.success.border,
  }),
  incompleteBg: css({
    backgroundColor: theme.colors.warning.transparent,
    borderColor: theme.colors.warning.border,
  }),
  defaultBg: css({
    backgroundColor: theme.colors.secondary.transparent,
    borderColor: theme.colors.border.medium,
  }),
  // Status-specific text colors
  runningText: css({
    color: theme.colors.info.text,
  }),
  completeText: css({
    color: theme.colors.success.text,
  }),
  incompleteText: css({
    color: theme.colors.warning.text,
  }),
  defaultText: css({
    color: theme.colors.text.primary,
  }),
});

export default ToolFallback;
