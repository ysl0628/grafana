import React from 'react';
import { type ToolCallContentPartComponent } from '@assistant-ui/react';
import { DirectDataLogsPanelComponent } from '../DirectDataLogsPanelComponent';
import { LogData } from '../../types/aiAssistant';
import { ToolLayoutWrapper } from './ToolLayoutWrapper';
import { QueryToolFallback } from './QueryToolFallback';
import { createStatFromToolResult } from '../StatPanelComponent';

/**
 * Example implementations using DirectDataLogsPanelComponent
 * Perfect for when you already have log data from AI Assistant tools
 */

/**
 * Example 1: ToolFallback that displays logs from tool result data
 */
export const PrometheusToolFallback: ToolCallContentPartComponent = ({ toolName, args, result, status, isError }) => {
  const panelError = result?.startsWith('Error:');

  const data = panelError ? [] : result ? JSON.parse(result) : [];

  return (
    <div>
      <QueryToolFallback toolName={toolName} args={args} result={result} status={status} />
      {toolName === 'query_prometheus' && result && status?.type === 'complete' ? (
        <ToolLayoutWrapper toolName={'Stat Panel'} status={status} completeIcon="chart-line" showStatus={false}>
          <div>
            {createStatFromToolResult({
              data,
              query: args.expr || args.logql,
              datasourceUid: args.datasourceUid,
              error: panelError || isError ? result : undefined,
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

export default {
  PrometheusToolFallback,
  InteractiveLogExplorer,
};
