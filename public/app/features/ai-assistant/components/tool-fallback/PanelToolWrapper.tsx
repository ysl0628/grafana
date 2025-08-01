import React from 'react';
import { ToolLayoutWrapper } from './ToolLayoutWrapper';
import { PanelStateDisplay } from '../panel/PanelStateDisplay';

interface PanelToolWrapperProps {
  toolName: string;
  initialStatus?: {
    type: 'running' | 'complete' | 'incomplete' | 'requires-action' | 'error' | 'warning';
    reason?: string;
  } | null;

  // PanelStateDisplay props
  isLoading?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  data?: any;
  height?: number;
  emptyMessage?: string;
  loadingMessage?: string;

  // ToolLayoutWrapper props
  initialCollapsed?: boolean;
  completeIcon?: string;
  showStatus?: boolean;

  children: React.ReactNode;
}

/**
 * Panel Tool Wrapper Component
 *
 * Combines ToolLayoutWrapper and PanelStateDisplay to automatically sync status
 * based on panel state (error, loading, empty, etc.)
 */
export const PanelToolWrapper: React.FC<PanelToolWrapperProps> = ({
  toolName,
  initialStatus,
  isLoading = false,
  error = null,
  isEmpty = false,
  data,
  height,
  emptyMessage,
  loadingMessage,
  initialCollapsed = true,
  completeIcon = 'check',
  showStatus = true,
  children,
}) => {
  const isNonArrayData = data !== undefined && data !== null && !Array.isArray(data);

  const determineCurrentStatus = () => {
    if (error) {
      return { type: 'error' as const };
    }
    if (isLoading) {
      return { type: 'running' as const };
    }

    const isDataEmpty = () => {
      if (data === undefined || data === null) {
        return true;
      }
      if (Array.isArray(data)) {
        return data.length === 0;
      }
      return false;
    };

    if (isNonArrayData) {
      return { type: 'warning' as const };
    }

    if (isEmpty || isDataEmpty()) {
      return { type: 'warning' as const };
    }

    return { type: 'complete' as const };
  };

  const currentStatus = determineCurrentStatus();

  return (
    <ToolLayoutWrapper
      toolName={toolName}
      status={currentStatus}
      initialCollapsed={initialCollapsed}
      completeIcon={completeIcon}
      showStatus={showStatus}
    >
      <PanelStateDisplay
        isLoading={isLoading}
        error={error}
        isEmpty={isEmpty}
        data={data}
        height={height}
        emptyMessage={emptyMessage}
        loadingMessage={loadingMessage}
        isNonArrayData={isNonArrayData}
      >
        {children}
      </PanelStateDisplay>
    </ToolLayoutWrapper>
  );
};

export default PanelToolWrapper;
