import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

interface PanelStateDisplayProps {
  isLoading?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  data?: any; // Add data prop to check if it's non-array
  height?: number;
  emptyMessage?: string;
  loadingMessage?: string;
  isNonArrayData?: boolean; // Passed from parent to avoid duplicate calculation
  children: React.ReactNode;
}

/**
 * Shared Panel State Display Component
 *
 * Handles error, loading, and empty states consistently across all panel components.
 * Uses StatPanelComponent styling as the standard.
 */
export const PanelStateDisplay: React.FC<PanelStateDisplayProps> = ({
  isLoading = false,
  error = null,
  isEmpty = false,
  data,
  height,
  emptyMessage = 'No data available to display.',
  loadingMessage = 'Please wait while we fetch the data.',
  isNonArrayData = false,
  children,
}) => {
  const styles = useStyles2(getStyles);

  // Helper function to render non-array data
  const renderNonArrayData = (data: any) => {
    if (typeof data === 'string') {
      return <pre className={styles.dataDisplay}>{data}</pre>;
    }
    if (typeof data === 'number' || typeof data === 'boolean') {
      return <div className={styles.dataDisplay}>{String(data)}</div>;
    }
    if (typeof data === 'object') {
      return <pre className={styles.dataDisplay}>{JSON.stringify(data, null, 2)}</pre>;
    }
    return <div className={styles.dataDisplay}>{String(data)}</div>;
  };

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingMessage}>{loadingMessage}</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={styles.emptyContainer}>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    );
  }

  // If data is non-array, display it directly instead of using children
  if (isNonArrayData) {
    return <div className={styles.nonArrayContainer}>{renderNonArrayData(data)}</div>;
  }

  return <>{children}</>;
};

const getStyles = (theme: GrafanaTheme2) => ({
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

  nonArrayContainer: css({
    width: '100%',
    borderLeft: `3px solid ${theme.colors.success.main}`,
    backgroundColor: `${theme.colors.background.secondary}`,
    padding: theme.spacing(2),
    minWidth: '350px',
    borderRadius: theme.shape.radius.default,
    marginBottom: theme.spacing(4),
    margin: theme.spacing(1, 0),
  }),

  nonArrayHeader: css({
    marginBottom: theme.spacing(1),
    '& h4': {
      margin: 0,
      fontSize: theme.typography.h4.fontSize,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeightMedium,
    },
  }),

  dataDisplay: css({
    backgroundColor: theme.colors.background.canvas,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    padding: theme.spacing(1.5),
    margin: 0,
    fontSize: theme.typography.bodySmall.fontSize,
    fontFamily: theme.typography.fontFamilyMonospace,
    color: theme.colors.text.primary,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflow: 'auto',
    maxHeight: '400px',
  }),
});

export default PanelStateDisplay;
