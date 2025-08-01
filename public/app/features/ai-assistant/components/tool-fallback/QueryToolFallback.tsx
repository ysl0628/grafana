import React from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { ToolLayoutWrapper } from './ToolLayoutWrapper';

interface QueryToolFallbackProps {
  toolName: string;
  args: Record<string, any>;
  result: string;
  status?: {
    type: 'running' | 'complete' | 'incomplete' | 'requires-action';
    reason?: string;
  } | null;
}

/**
 * Shared Query Tool Fallback Component
 *
 * Displays query parameters and results in a consistent format for all query tools.
 */
export const QueryToolFallback: React.FC<QueryToolFallbackProps> = ({ toolName, args, result, status }) => {
  const styles = useStyles2(getStyles);

  return (
    <ToolLayoutWrapper toolName={toolName} status={status}>
      <div className={styles.queryInfo}>
        <table className={styles.queryInfoTable}>
          <tbody>
            {Object.entries(args || {}).map(([key, value]) => (
              <tr key={key}>
                <td>{key}:</td>
                <td>
                  {key === 'query' || key === 'logql' || key === 'expr' ? (
                    <code className={styles.queryCode}>{String(value)}</code>
                  ) : (
                    String(value)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className={styles.outputTitle}>
          <strong>Output</strong>
        </p>
        <table className={styles.outputTable}>
          <tbody>
            <tr>
              <td>result:</td>
              <td>{result}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ToolLayoutWrapper>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  queryInfo: css({
    margin: theme.spacing(0, 1),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    fontSize: '12px',
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily,
  }),
  queryInfoTable: css({
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
    '& td:first-child': {
      width: '150px',
      minWidth: '150px',
      maxWidth: '150px',
      fontWeight: theme.typography.fontWeightMedium,
      fontFamily: theme.typography.fontFamilyMonospace,
      color: theme.colors.text.secondary,
      whiteSpace: 'nowrap',
      paddingRight: theme.spacing(2),
      verticalAlign: 'top',
    },
    '& td:nth-child(2)': {
      wordBreak: 'break-word',
      fontFamily: theme.typography.fontFamilyMonospace,
      color: theme.colors.text.primary,
    },
  }),
  outputTitle: css({
    margin: theme.spacing(2, 0, 1, 0),
    fontSize: '14px',
    color: theme.colors.text.primary,
    fontFamily: 'inherit',
  }),
  outputTable: css({
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
    '& td:first-child': {
      width: '150px',
      minWidth: '150px',
      maxWidth: '150px',
      fontWeight: theme.typography.fontWeightMedium,
      fontFamily: theme.typography.fontFamilyMonospace,
      color: theme.colors.text.secondary,
      whiteSpace: 'nowrap',
      paddingRight: theme.spacing(2),
      verticalAlign: 'top',
    },
    '& td:nth-child(2)': {
      wordBreak: 'break-word',
      fontFamily: theme.typography.fontFamilyMonospace,
      color: theme.colors.text.primary,
    },
  }),
  queryCode: css({
    wordBreak: 'break-word',
  }),
});

export default QueryToolFallback;
