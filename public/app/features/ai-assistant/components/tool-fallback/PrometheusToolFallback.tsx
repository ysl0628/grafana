import { type ToolCallContentPartComponent } from '@assistant-ui/react';
import { QueryToolFallback } from './QueryToolFallback';
import { PanelToolWrapper } from './PanelToolWrapper';
import { createStatFromToolResult } from '../panel/StatPanelComponent';
import { createTimeSeriesFromToolResult } from '../panel/TimeSeriesPanelComponent';

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
        <PanelToolWrapper
          toolName={'Stat Panel'}
          initialStatus={status}
          completeIcon="chart-line"
          showStatus={false}
          isEmpty={!data || (Array.isArray(data) && data.length === 0)}
          data={data}
          error={panelError || isError ? new Error(result) : null}
        >
          {/* {createStatFromToolResult({
            data,
            query: args.expr || args.logql,
            datasourceUid: args.datasourceUid,
            error: panelError || isError ? result : undefined,
          })} */}
          {createTimeSeriesFromToolResult({
            data,
            query: args.expr || args.logql,
            datasourceUid: args.datasourceUid,
            error: panelError || isError ? result : undefined,
          })}
        </PanelToolWrapper>
      ) : (
        <></>
      )}
    </div>
  );
};

export default {
  PrometheusToolFallback,
};
