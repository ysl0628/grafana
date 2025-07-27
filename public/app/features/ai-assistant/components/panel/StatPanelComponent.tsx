import React from 'react';
import { css } from '@emotion/css';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  GrafanaTheme2,
  LoadingState,
  toDataFrame,
  makeTimeRange,
  FieldType,
  ThresholdsMode,
  dateTime,
} from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { SceneDataNode, VizConfigBuilders } from '@grafana/scenes';
import { SceneContextProvider, VizGridLayout, VizPanel } from '@grafana/scenes-react';
import { LogData } from '../../types/aiAssistant';

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
  const { title = 'Logs' } = options;

  return (
    <SceneContextProvider>
      <StatPanelContent data={data} title={title} isLoading={isLoading} error={error} />
    </SceneContextProvider>
  );
};

/**
 * Internal component that uses scenes-react hooks
 */
const StatPanelContent: React.FC<{
  data: Array<LogData>;
  title: string;
  isLoading: boolean;
  error: Error | null;
}> = ({ data, title, isLoading, error }) => {
  const styles = useStyles2(getStyles);

  const metrics = data[0]?.metric;
  const metricName = metrics?.__name__;
  const metricFields = [
    {
      name: 'Time',
      type: FieldType.time,
      values: data[0].values?.map((valueArray) => valueArray[0] * 1000) || [],
    },
    {
      name: metricName || 'Value',
      type: FieldType.number,
      values: data[0].values?.map((valueArray) => Number(valueArray[1])) || [],
      ...(metricName ? { labels: metrics } : {}),
    },
  ];

  const normalFields = [
    {
      name: 'Time',
      type: FieldType.time,
      values:
        data?.map((log) => {
          try {
            return Number(JSON.parse(log.timestamp)) * 10000;
          } catch {
            return Date.now();
          }
        }) || [],
    },
    {
      name: metricName ? metricName : 'Value',
      type: FieldType.number,
      values:
        data?.map((log) => {
          const value = log?.line;
          const numValue = Number(value);
          return isNaN(numValue) ? 0 : numValue;
        }) || [],
    },
  ];

  const fields = metricName ? metricFields : normalFields;

  const dataProvider = new SceneDataNode({
    data: {
      series: [toDataFrame({ fields })],
      state: isLoading ? LoadingState.Loading : error ? LoadingState.Error : LoadingState.Done,
      timeRange: makeTimeRange(dateTime(fields[0].values[0]), dateTime(fields[0].values[fields[0].values.length - 1])),
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
    <div className={styles.container}>
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
    height: '200px',
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

export default StatPanelComponent;
