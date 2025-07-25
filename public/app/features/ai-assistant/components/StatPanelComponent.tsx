import React from 'react';
import { css } from '@emotion/css';
import AutoSizer from 'react-virtualized-auto-sizer';
import { GrafanaTheme2, LoadingState, toDataFrame, makeTimeRange, FieldType, ThresholdsMode } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { SceneDataNode, VizConfigBuilders } from '@grafana/scenes';
import { SceneContextProvider, VizGridLayout, VizPanel } from '@grafana/scenes-react';
import { LogData } from '../types/aiAssistant';

interface StatPanelComponentProps {
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
export const StatPanelComponent: React.FC<StatPanelComponentProps> = ({
  data,
  options = {},
  isLoading = false,
  error = null,
}) => {
  const { title = 'Logs', height = 250 } = options;

  return (
    <SceneContextProvider>
      <StatPanelContent data={data} title={title} height={height} isLoading={isLoading} error={error} />
    </SceneContextProvider>
  );
};

/**
 * Internal component that uses scenes-react hooks
 */
const StatPanelContent: React.FC<{
  data: Array<LogData>;
  title: string;
  height: number;
  isLoading: boolean;
  error: Error | null;
}> = ({ data, title, height, isLoading, error }) => {
  const styles = useStyles2(getStyles);

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer} style={{ height }}>
        <p className={styles.loadingMessage}>Please wait while we fetch the data.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyContainer} style={{ height }}>
        <p className={styles.emptyMessage}>No data available to display.</p>
      </div>
    );
  }

  const fields = [
    {
      name: 'Time',
      type: FieldType.time,
      values: data?.map((log) => Number(JSON.parse(log.timestamp)) / 1_000_000),
    },
    {
      name: 'Value',
      type: FieldType.number,
      values: data?.map((log) => log?.line ?? 0),
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
  const statViz = VizConfigBuilders.stat()
    .setOption('reduceOptions', {
      values: false,
      fields: '',
      calcs: ['lastNotNull'],
    })
    .setThresholds({
      mode: ThresholdsMode.Absolute,
      steps: [
        { value: 0, color: 'green' },
        { value: 100, color: 'red' },
      ],
    })
    .build();

  return (
    <div className={styles.container} style={{ height: 300 }}>
      <AutoSizer>
        {({ height: autoHeight, width }) => (
          <VizGridLayout minHeight={autoHeight} minWidth={width}>
            <VizPanel title={title} viz={statViz} dataProvider={dataProvider} />
          </VizGridLayout>
        )}
      </AutoSizer>
    </div>
  );
};

/**
 * Utility function to create a direct data logs panel
 */
export const createStatPanel = (config: {
  data: Array<LogData>;
  title?: string;
  height?: number;
  isLoading?: boolean;
  error?: Error | null;
  options?: StatPanelComponentProps['options'];
}) => {
  return (
    <StatPanelComponent
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
export const createStatFromToolResult = (toolResult: {
  data: Array<LogData>;
  query?: string;
  datasourceUid?: string;
  isLoading?: boolean;
  error?: string;
}) => {
  const error = toolResult.error ? new Error(toolResult.error) : null;

  return createStatPanel({
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
export const StatPanelPresets = {
  /**
   * Error logs display
   */
  ErrorLogs: (data: Array<LogData>, appName?: string) =>
    createStatPanel({
      data,
      title: appName ? `${appName} - Error Logs` : 'Error Logs',
      height: 350,
      options: {},
    }),

  /**
   * Recent activity logs
   */
  RecentActivity: (data: Array<LogData>, serviceName?: string) =>
    createStatPanel({
      data,
      title: serviceName ? `${serviceName} - Recent Activity` : 'Recent Activity',
      height: 400,
      options: {},
    }),

  /**
   * Debug logs with full details
   */
  DebugLogs: (data: Array<LogData>) =>
    createStatPanel({
      data,
      title: 'Debug Information',
      height: 500,
      options: {},
    }),

  /**
   * Compact logs view
   */
  CompactView: (data: Array<LogData>) =>
    createStatPanel({
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

  errorContainer: css({
    borderLeft: `3px solid ${theme.colors.warning.main}`,
    backgroundColor: `${theme.colors.background.secondary}`,
    padding: theme.spacing(2),
    minWidth: '350px',
    borderRadius: theme.shape.radius.default,
    marginBottom: theme.spacing(4),
  }),

  errorMessage: css({
    textAlign: 'start',
    color: theme.colors.warning.main,
    fontSize: theme.typography.body.fontSize,
    margin: 0,
  }),

  loadingContainer: css({
    width: '100%',
    borderLeft: `3px solid ${theme.colors.info.main}`,
    backgroundColor: `${theme.colors.background.secondary}`,
    padding: theme.spacing(2),
    minWidth: '350px',
    borderRadius: theme.shape.radius.default,
    marginBottom: theme.spacing(4),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing(1, 0),
  }),

  loadingMessage: css({
    textAlign: 'center',
    color: theme.colors.info.main,
    fontSize: theme.typography.body.fontSize,
    margin: 0,
  }),

  emptyContainer: css({
    width: '100%',
    borderLeft: `3px solid ${theme.colors.info.main}`,
    backgroundColor: `${theme.colors.background.secondary}`,
    padding: theme.spacing(2),
    minWidth: '350px',
    borderRadius: theme.shape.radius.default,
    marginBottom: theme.spacing(4),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing(1, 0),
  }),

  emptyMessage: css({
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontSize: theme.typography.body.fontSize,
    margin: 0,
  }),
});

export default StatPanelComponent;
