import React, { useMemo } from 'react';
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
import { LogData } from '../types/aiAssistant';

interface DirectDataLogsPanelComponentProps {
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
export const DirectDataLogsPanelComponent: React.FC<DirectDataLogsPanelComponentProps> = ({
  data,
  options = {},
  isLoading = false,
  error = null,
}) => {
  const styles = useStyles2(getStyles);

  const {
    title = 'Logs',
    height = 250,
    wrapLogMessage = true,
    showTime = true,
    showLabels = true,
    enableLogDetails = true,
    showCommonLabels = false,
    prettifyLogMessage = true,
    sortOrder = 'Descending',
    dedupStrategy = 'none',
  } = options;

  return (
    <SceneContextProvider>
      <DirectLogsPanelContent
        data={data}
        title={title}
        height={height}
        wrapLogMessage={wrapLogMessage}
        showTime={showTime}
        showLabels={showLabels}
        enableLogDetails={enableLogDetails}
        showCommonLabels={showCommonLabels}
        prettifyLogMessage={prettifyLogMessage}
        sortOrder={sortOrder}
        dedupStrategy={dedupStrategy}
        isLoading={isLoading}
        error={error}
      />
    </SceneContextProvider>
  );
};

/**
 * Internal component that uses scenes-react hooks
 */
const DirectLogsPanelContent: React.FC<{
  data: Array<LogData>;
  title: string;
  height: number;
  wrapLogMessage: boolean;
  showTime: boolean;
  showLabels: boolean;
  enableLogDetails: boolean;
  showCommonLabels: boolean;
  prettifyLogMessage: boolean;
  sortOrder: 'Ascending' | 'Descending';
  dedupStrategy: 'none' | 'exact' | 'numbers' | 'signature';
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

  if (error) {
    return (
      <div className={styles.errorContainer} style={{ height }}>
        <div className={styles.errorMessage}>
          <h4>❌ Error Loading Logs</h4>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer} style={{ height }}>
        <div className={styles.loadingMessage}>
          <h4>⏳ Loading Logs...</h4>
          <p>Please wait while we fetch the log data.</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyContainer} style={{ height }}>
        <div className={styles.emptyMessage}>
          <h4>📝 No Logs Found</h4>
          <p>No log data available to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ height }}>
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
export const createDirectDataLogsPanel = (config: {
  data: Array<LogData>;
  title?: string;
  height?: number;
  isLoading?: boolean;
  error?: Error | null;
  options?: DirectDataLogsPanelComponentProps['options'];
}) => {
  return (
    <DirectDataLogsPanelComponent
      data={config.data}
      options={{
        title: config.title || 'Logs',
        height: config.height || 400,
        wrapLogMessage: true,
        showTime: true,
        showLabels: true,
        enableLogDetails: true,
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

  return createDirectDataLogsPanel({
    data: toolResult.data || [],
    title: toolResult.query ? `Query: ${toolResult.query}` : 'Logs',
    isLoading: toolResult.isLoading || false,
    error,
    options: {
      wrapLogMessage: true,
      showTime: true,
      showLabels: true,
      enableLogDetails: true,
      showCommonLabels: false,
      prettifyLogMessage: true,
      sortOrder: 'Descending',
    },
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
    createDirectDataLogsPanel({
      data,
      title: appName ? `${appName} - Error Logs` : 'Error Logs',
      height: 350,
      options: {
        wrapLogMessage: true,
        showTime: true,
        showLabels: true,
        sortOrder: 'Descending',
        enableLogDetails: true,
      },
    }),

  /**
   * Recent activity logs
   */
  RecentActivity: (data: Array<LogData>, serviceName?: string) =>
    createDirectDataLogsPanel({
      data,
      title: serviceName ? `${serviceName} - Recent Activity` : 'Recent Activity',
      height: 400,
      options: {
        wrapLogMessage: true,
        showTime: true,
        showLabels: true,
        sortOrder: 'Descending',
      },
    }),

  /**
   * Debug logs with full details
   */
  DebugLogs: (data: Array<LogData>) =>
    createDirectDataLogsPanel({
      data,
      title: 'Debug Information',
      height: 500,
      options: {
        wrapLogMessage: false,
        showTime: true,
        showLabels: true,
        enableLogDetails: true,
        showCommonLabels: true,
        prettifyLogMessage: true,
      },
    }),

  /**
   * Compact logs view
   */
  CompactView: (data: Array<LogData>) =>
    createDirectDataLogsPanel({
      data,
      title: 'Logs',
      height: 250,
      options: {
        wrapLogMessage: true,
        showTime: false,
        showLabels: false,
        enableLogDetails: false,
        showCommonLabels: false,
      },
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
    width: '100%',
    border: `1px solid ${theme.colors.error.border}`,
    borderRadius: theme.shape.radius.default,
    backgroundColor: theme.colors.error.transparent,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing(1, 0),
  }),

  errorMessage: css({
    textAlign: 'center',
    color: theme.colors.error.text,
    padding: theme.spacing(2),

    '& h4': {
      margin: 0,
      marginBottom: theme.spacing(1),
      fontSize: theme.typography.h4.fontSize,
    },

    '& p': {
      margin: 0,
      fontSize: theme.typography.body.fontSize,
      opacity: 0.8,
    },
  }),

  loadingContainer: css({
    width: '100%',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.shape.radius.default,
    backgroundColor: theme.colors.background.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing(1, 0),
  }),

  loadingMessage: css({
    textAlign: 'center',
    color: theme.colors.text.primary,
    padding: theme.spacing(2),

    '& h4': {
      margin: 0,
      marginBottom: theme.spacing(1),
      fontSize: theme.typography.h4.fontSize,
    },

    '& p': {
      margin: 0,
      fontSize: theme.typography.body.fontSize,
      opacity: 0.7,
    },
  }),

  emptyContainer: css({
    width: '100%',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.shape.radius.default,
    backgroundColor: theme.colors.background.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing(1, 0),
  }),

  emptyMessage: css({
    textAlign: 'center',
    color: theme.colors.text.secondary,
    padding: theme.spacing(2),

    '& h4': {
      margin: 0,
      marginBottom: theme.spacing(1),
      fontSize: theme.typography.h4.fontSize,
    },

    '& p': {
      margin: 0,
      fontSize: theme.typography.body.fontSize,
      opacity: 0.7,
    },
  }),
});

export default DirectDataLogsPanelComponent;
