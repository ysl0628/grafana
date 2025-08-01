import React from 'react';
import { css } from '@emotion/css';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  GrafanaTheme2,
  LoadingState,
  toDataFrame,
  makeTimeRange,
  FieldType,
  LogsSortOrder,
  LogsDedupStrategy,
} from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { SceneDataNode, VizConfigBuilders } from '@grafana/scenes';
import { SceneContextProvider, VizGridLayout, VizPanel } from '@grafana/scenes-react';
import { LogData } from '../../types/aiAssistant';

interface LogsPanelComponentProps {
  /**
   * Log data frames - the actual log data you already have
   */
  data: Array<LogData>;

  /**
   * Panel configuration
   */
  options?: {
    title?: string;
    height?: number;
    wrapLogMessage?: boolean;
    showTime?: boolean;
    showLabels?: boolean;
    enableLogDetails?: boolean;
    showCommonLabels?: boolean;
    prettifyLogMessage?: boolean;
    sortOrder?: 'Ascending' | 'Descending';
    dedupStrategy?: 'none' | 'exact' | 'numbers' | 'signature';
  };

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Error state
   */
  error?: Error | null;
}

/**
 * DirectDataLogsPanelComponent
 *
 * A logs panel component that accepts data directly without needing to run queries.
 * Perfect for when you already have the log data from AI Assistant tool responses.
 *
 * Features:
 * - Accepts DataFrame[] directly
 * - No query runner needed
 * - Full logs panel functionality
 * - Auto-sizing support
 * - Loading and error states
 */
export const LogsPanelComponent: React.FC<LogsPanelComponentProps> = ({
  data,
  options = {},
  isLoading = false,
  error = null,
}) => {
  const { title = 'Logs', height = 250 } = options;

  return (
    <SceneContextProvider>
      <LogsPanelContent data={data} title={title} height={height} isLoading={isLoading} error={error} />
    </SceneContextProvider>
  );
};

/**
 * Internal component that uses scenes-react hooks
 */
const LogsPanelContent: React.FC<{
  data: Array<LogData>;
  title: string;
  height: number;
  isLoading: boolean;
  error: Error | null;
}> = ({ data, title, height, isLoading, error }) => {
  const styles = useStyles2(getStyles);

  const fields = [
    {
      name: 'Time',
      type: FieldType.time,
      values: data.map((log) => Number(JSON.parse(log.timestamp)) / 1_000_000),
    },
    {
      name: 'Line',
      type: FieldType.string,
      values: data.map((log) => log.line),
    },
    {
      name: 'labels',
      type: FieldType.other,
      values: data.map((log) => log.labels),
    },
  ];

  const dataProvider = new SceneDataNode({
    data: {
      series: [toDataFrame({ fields })],
      state: isLoading ? LoadingState.Loading : error ? LoadingState.Error : LoadingState.Done,
      timeRange: makeTimeRange('now-1h', 'now'),
    },
  });

  // Configure logs visualization
  const logsViz = VizConfigBuilders.logs()
    .setOption('wrapLogMessage', false)
    .setOption('showTime', false)
    .setOption('showLabels', false)
    .setOption('enableLogDetails', true)
    .setOption('showCommonLabels', false)
    .setOption('prettifyLogMessage', false)
    .setOption('enableInfiniteScrolling', false)
    .setOption('sortOrder', LogsSortOrder.Descending)
    .setOption('dedupStrategy', LogsDedupStrategy.none)
    .build();

  return (
    <div className={styles.container} style={{ height: 300 }}>
      <AutoSizer>
        {({ height: autoHeight, width }) => (
          <VizGridLayout minHeight={autoHeight} minWidth={width}>
            <VizPanel title={title} viz={logsViz} dataProvider={dataProvider} />
          </VizGridLayout>
        )}
      </AutoSizer>
    </div>
  );
};

/**
 * Utility function to create a direct data logs panel
 */
export const createLogsPanel = (config: {
  data: Array<LogData>;
  title?: string;
  height?: number;
  isLoading?: boolean;
  error?: Error | null;
  options?: LogsPanelComponentProps['options'];
}) => {
  return (
    <LogsPanelComponent
      data={config.data}
      options={{
        title: config.title || 'Logs',
        height: config.height || 400,
        ...config.options,
      }}
      isLoading={config.isLoading}
      error={config.error}
    />
  );
};

/**
 * Helper function to create logs panel from tool result
 */
export const createLogsFromToolResult = (toolResult: {
  data: Array<LogData>;
  query?: string;
  datasourceUid?: string;
  isLoading?: boolean;
  error?: string;
}) => {
  const error = toolResult.error ? new Error(toolResult.error) : null;

  return createLogsPanel({
    data: toolResult.data || [],
    title: toolResult.query ? `Query: ${toolResult.query}` : 'Logs',
    isLoading: toolResult.isLoading || false,
    error,
    options: {},
  });
};

/**
 * Pre-configured components for different scenarios
 */
export const DirectDataLogsPanelPresets = {
  /**
   * Error logs display
   */
  ErrorLogs: (data: Array<LogData>, appName?: string) =>
    createLogsPanel({
      data,
      title: appName ? `${appName} - Error Logs` : 'Error Logs',
      height: 350,
      options: {},
    }),

  /**
   * Recent activity logs
   */
  RecentActivity: (data: Array<LogData>, serviceName?: string) =>
    createLogsPanel({
      data,
      title: serviceName ? `${serviceName} - Recent Activity` : 'Recent Activity',
      height: 400,
      options: {},
    }),

  /**
   * Debug logs with full details
   */
  DebugLogs: (data: Array<LogData>) =>
    createLogsPanel({
      data,
      title: 'Debug Information',
      height: 500,
      options: {},
    }),

  /**
   * Compact logs view
   */
  CompactView: (data: Array<LogData>) =>
    createLogsPanel({
      data,
      title: 'Logs',
      height: 250,
      options: {},
    }),
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    width: '100%',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.shape.radius.default,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.primary,

    // Proper spacing for AI Assistant context
    margin: theme.spacing(1, 0),

    // Override log details label width using CSS-in-JS class pattern
    '& td[class*="logs-row-details__label"]': {
      maxWidth: '50em', // Increase from original 30em
      minWidth: '15em', // Set minimum width to avoid being too narrow
    },

    // Responsive behavior
    [theme.breakpoints.down('md')]: {
      minHeight: '300px',
    },

    // Ensure proper panel styling
    '& .viz-panel': {
      height: '100%',
      border: 'none',
    },
  }),
});

export default LogsPanelComponent;
