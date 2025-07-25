import React from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { type ToolCallContentPartComponent } from '@assistant-ui/react';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { DirectDataLogsPanelComponent, createLogsFromToolResult } from '../DirectDataLogsPanelComponent';
import { LogData } from '../../types/aiAssistant';
import { ToolLayoutWrapper } from './ToolLayoutWrapper';
import { createStatFromToolResult } from '../StatPanelComponent';

/**
 * Example implementations using DirectDataLogsPanelComponent
 * Perfect for when you already have log data from AI Assistant tools
 */

/**
 * Example 1: ToolFallback that displays logs from tool result data
 */
export const LokiToolFallback: ToolCallContentPartComponent = ({ toolName, args, result, status, isError }) => {
  const data = result ? JSON.parse(result) : [];
  const styles = useStyles2(getStyles);
  const isLog = data?.[0]?.labels;

  return (
    <div>
      <ToolLayoutWrapper toolName={toolName} status={status}>
        <div className={styles.queryInfo}>
          <table className={styles.queryInfoTable}>
            <tbody>
              <tr>
                <td>datasource_uid:</td>
                <td>{args.datasourceUid}</td>
              </tr>
              <tr>
                <td>query:</td>
                <td>
                  <code>{args.logql}</code>
                </td>
              </tr>
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
      {toolName === 'query_loki_logs' && result && status?.type === 'complete' ? (
        <ToolLayoutWrapper
          toolName={isLog ? 'Logs Panel' : 'Stat Panel'}
          status={status}
          completeIcon="chart-line"
          showStatus={false}
        >
          <div>
            {isLog
              ? createLogsFromToolResult({
                  data,
                  query: args.logql,
                  datasourceUid: args.datasourceUid,
                  error: isError ? result : undefined,
                })
              : createStatFromToolResult({
                  data,
                  query: args.logql,
                  datasourceUid: args.datasourceUid,
                  error: isError ? result : undefined,
                })}
          </div>
        </ToolLayoutWrapper>
      ) : (
        <></>
      )}
    </div>
  );
};

/**
 * Example 6: Interactive log explorer
 */
export const InteractiveLogExplorer: React.FC<{
  initialData: Array<LogData>;
  onDataUpdate?: (newData: Array<LogData>) => void;
  tools?: Array<{
    name: string;
    action: () => Promise<Array<LogData>>;
  }>;
}> = ({ initialData, onDataUpdate, tools = [] }) => {
  const [currentData, setCurrentData] = React.useState<Array<LogData>>(initialData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const executeAction = async (action: () => Promise<Array<LogData>>) => {
    setIsLoading(true);
    setError(null);

    try {
      const newData = await action();
      setCurrentData(newData);
      onDataUpdate?.(newData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h4>🔍 Interactive Log Explorer</h4>

      {tools.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p>Available actions:</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {tools.map((tool, index) => (
              <button
                key={index}
                onClick={() => executeAction(tool.action)}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0073e6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {tool.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <DirectDataLogsPanelComponent
        data={currentData}
        options={{
          title: 'Log Explorer',
          height: 500,
          wrapLogMessage: true,
          showTime: true,
          showLabels: true,
          enableLogDetails: true,
        }}
        isLoading={isLoading}
        error={error}
      />

      {currentData.length > 0 && (
        <p>
          <em>Showing {currentData.length} log entries</em>
        </p>
      )}
    </div>
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
  // 不要有 border
  queryInfoTable: css({
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 4px',
    '& td:first-child': {
      width: '150px', // 設定第一欄固定寬度
      minWidth: '150px',
      maxWidth: '150px',
      fontWeight: theme.typography.fontWeightMedium,
      fontFamily: theme.typography.fontFamilyMonospace,
      color: theme.colors.text.secondary,
      whiteSpace: 'nowrap', // 不換行
      paddingRight: theme.spacing(2),
      verticalAlign: 'top', // 文字對齊到欄位頂部
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
    borderSpacing: '0 4px',
    '& td:first-child': {
      width: '150px', // 與上面的 table 保持一致
      minWidth: '150px',
      maxWidth: '150px',
      fontWeight: theme.typography.fontWeightMedium,
      fontFamily: theme.typography.fontFamilyMonospace,
      color: theme.colors.text.secondary,
      whiteSpace: 'nowrap',
      paddingRight: theme.spacing(2),
      verticalAlign: 'top', // 文字對齊到欄位頂部
    },
    '& td:nth-child(2)': {
      wordBreak: 'break-word',
      fontFamily: theme.typography.fontFamilyMonospace,
      color: theme.colors.text.primary,
    },
  }),
});

export default {
  LokiToolFallback,
  InteractiveLogExplorer,
};
