import { type ToolCallContentPartComponent } from '@assistant-ui/react';
import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Text } from '@grafana/ui';

import { ToolLayoutWrapper } from './ToolLayoutWrapper';

/**
 * Tool Fallback Component
 *
 * Displays tool execution status with collapsible details.
 * Supports different status types with appropriate icons and styling.
 */
export const ToolFallback: ToolCallContentPartComponent = ({ toolName, argsText, args, result, status, ...rest }) => {
  const styles = useStyles2(getStyles);

  return (
    <ToolLayoutWrapper toolName={toolName} status={status}>
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
        </>
      )}
    </ToolLayoutWrapper>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
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
