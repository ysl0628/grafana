import React from 'react';
import { type ToolCallContentPartComponent } from '@assistant-ui/react';
import {
  DirectDataLogsPanelComponent,
  DirectDataLogsPanelPresets,
  createDirectDataLogsPanel,
  createLogsFromToolResult,
} from '../DirectDataLogsPanelComponent';
import { LogData } from '../../types/aiAssistant';

/**
 * Example implementations using DirectDataLogsPanelComponent
 * Perfect for when you already have log data from AI Assistant tools
 */

/**
 * Example 1: ToolFallback that displays logs from tool result data
 */
export const DirectDataLogsToolFallback: ToolCallContentPartComponent = ({
  toolName,
  args,
  result,
  status,
  isError,
}) => {
  const data = JSON.parse(result);
  // console.log(data);
  // Handle logs query tools that return data directly
  if (toolName === 'query_loki_logs' && result && status?.type === 'complete') {
    return (
      <div>
        <h4>📋 Logs Query Results</h4>
        <p>
          <strong>Query:</strong> <code>{args.logql}</code>
        </p>
        <p>
          <strong>Data Source:</strong> {args.datasourceUid}
        </p>

        {createLogsFromToolResult({
          data,
          query: args.logql,
          datasourceUid: args.datasourceUid,
          error: isError ? result : undefined,
        })}

        {data && data.length > 0 && (
          <p>
            <em>Found {data.length} log entries</em>
          </p>
        )}
      </div>
    );
  }

  // Default tool display
  return (
    <div>
      <p>
        <strong>Tool:</strong> {toolName}
      </p>
      <p>
        <strong>Status:</strong> {status?.type}
      </p>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
};

/**
 * Example 2: AI Assistant message with direct data logs
 */
export const AiMessageWithDirectLogs: React.FC<{
  message: string;
  logsData: Array<LogData>;
  context?: string;
  isLoading?: boolean;
  error?: Error | null;
}> = ({ message, logsData, context, isLoading, error }) => {
  return (
    <div>
      <p>{message}</p>
      {context && (
        <p>
          <em>{context}</em>
        </p>
      )}

      <div style={{ marginTop: '16px' }}>
        <DirectDataLogsPanelComponent
          data={logsData}
          options={{
            title: 'Analysis Results',
            height: 400,
            wrapLogMessage: true,
            showTime: true,
            showLabels: true,
            enableLogDetails: true,
          }}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
};

/**
 * Example 3: Using preset configurations with direct data
 */
export const DirectDataPresetExamples = {
  /**
   * Error investigation with actual error data
   */
  ErrorInvestigation: ({
    errorLogs,
    appName,
    errorCount,
  }: {
    errorLogs: Array<LogData>;
    appName: string;
    errorCount: number;
  }) => (
    <div>
      <h4>🚨 Error Investigation Results</h4>
      <p>
        Found {errorCount} error entries for {appName}:
      </p>
      {DirectDataLogsPanelPresets.ErrorLogs(errorLogs, appName)}
      <p>
        <strong>Next Steps:</strong> Review the error patterns above. Most recent errors are at the top.
      </p>
    </div>
  ),

  /**
   * Performance analysis with performance logs
   */
  PerformanceAnalysis: ({
    performanceLogs,
    serviceName,
    avgResponseTime,
  }: {
    performanceLogs: Array<LogData>;
    serviceName: string;
    avgResponseTime: number;
  }) => (
    <div>
      <h4>⚡ Performance Analysis: {serviceName}</h4>
      <p>Average response time: {avgResponseTime}ms</p>
      <p>Analyzing performance-related log entries:</p>
      {DirectDataLogsPanelPresets.RecentActivity(performanceLogs, serviceName)}
    </div>
  ),

  /**
   * Security audit with security logs
   */
  SecurityAudit: ({
    securityLogs,
    alertLevel,
  }: {
    securityLogs: Array<LogData>;
    alertLevel: 'info' | 'warning' | 'critical';
  }) => (
    <div>
      <h4>🔒 Security Audit Results</h4>
      <p>
        Alert Level:{' '}
        <strong style={{ color: alertLevel === 'critical' ? 'red' : alertLevel === 'warning' ? 'orange' : 'blue' }}>
          {alertLevel.toUpperCase()}
        </strong>
      </p>
      {DirectDataLogsPanelPresets.DebugLogs(securityLogs)}
      <p>
        <em>Review the security events above for any suspicious activity.</em>
      </p>
    </div>
  ),
};

/**
 * Example 4: Multi-stage log analysis
 */
export const MultiStageLogAnalysis: React.FC<{
  stages: Array<{
    name: string;
    description: string;
    data: Array<LogData>;
    isLoading?: boolean;
    error?: Error | null;
  }>;
}> = ({ stages }) => {
  return (
    <div>
      <h4>📊 Multi-Stage Log Analysis</h4>
      <p>Analyzing logs across multiple stages:</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {stages.map((stage, index) => (
          <div key={index}>
            <h5>{stage.name}</h5>
            <p>
              <em>{stage.description}</em>
            </p>

            <DirectDataLogsPanelComponent
              data={stage.data}
              options={{
                title: stage.name,
                height: 300,
                wrapLogMessage: true,
                showTime: true,
                showLabels: true,
              }}
              isLoading={stage.isLoading}
              error={stage.error}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example 5: Log comparison between environments
 */
export const EnvironmentLogComparison: React.FC<{
  environments: Array<{
    name: string;
    data: Array<LogData>;
    color?: string;
  }>;
  comparisonNotes?: string;
}> = ({ environments, comparisonNotes }) => {
  return (
    <div>
      <h4>🔄 Environment Log Comparison</h4>
      {comparisonNotes && <p>{comparisonNotes}</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '16px',
        }}
      >
        {environments.map((env, index) => (
          <div
            key={index}
            style={{
              border: `2px solid ${env.color || '#ccc'}`,
              borderRadius: '8px',
              padding: '8px',
            }}
          >
            <h5 style={{ color: env.color }}>{env.name}</h5>
            <DirectDataLogsPanelComponent
              data={env.data}
              options={{
                title: `${env.name} Logs`,
                height: 300,
                wrapLogMessage: true,
                showTime: true,
                showLabels: false, // Hide labels for cleaner comparison
              }}
            />
          </div>
        ))}
      </div>
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

/**
 * Utility functions for creating common log responses
 */
export const DirectDataLogResponseHelpers = {
  /**
   * Create error analysis response
   */
  createErrorAnalysisResponse: (errorData: Array<LogData>, summary: string, recommendations: string[]) => (
    <div>
      <h4>🚨 Error Analysis Complete</h4>
      <p>{summary}</p>

      {DirectDataLogsPanelPresets.ErrorLogs(errorData)}

      <div style={{ marginTop: '16px' }}>
        <h5>Recommendations:</h5>
        <ul>
          {recommendations.map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  ),

  /**
   * Create monitoring report response
   */
  createMonitoringReportResponse: (recentData: Array<LogData>, healthScore: number, insights: string[]) => (
    <div>
      <h4>📊 Monitoring Report</h4>
      <p>
        System Health Score: <strong>{healthScore}/100</strong>
      </p>

      {DirectDataLogsPanelPresets.RecentActivity(recentData)}

      <div style={{ marginTop: '16px' }}>
        <h5>Key Insights:</h5>
        <ul>
          {insights.map((insight, index) => (
            <li key={index}>{insight}</li>
          ))}
        </ul>
      </div>
    </div>
  ),

  /**
   * Create troubleshooting response
   */
  createTroubleshootingResponse: (relevantLogs: Array<LogData>, issue: string, steps: string[]) => (
    <div>
      <h4>🔧 Troubleshooting: {issue}</h4>
      <p>I found relevant log entries that might help diagnose the issue:</p>

      {createDirectDataLogsPanel({
        data: relevantLogs,
        title: 'Relevant Logs',
        height: 400,
        options: {
          wrapLogMessage: true,
          showTime: true,
          showLabels: true,
          enableLogDetails: true,
        },
      })}

      <div style={{ marginTop: '16px' }}>
        <h5>Troubleshooting Steps:</h5>
        <ol>
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  ),
};

export default {
  DirectDataLogsToolFallback,
  AiMessageWithDirectLogs,
  DirectDataPresetExamples,
  MultiStageLogAnalysis,
  EnvironmentLogComparison,
  InteractiveLogExplorer,
  DirectDataLogResponseHelpers,
};
