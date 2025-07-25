import { type ToolCallContentPartComponent } from '@assistant-ui/react';
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

export default {
  PrometheusToolFallback,
};
