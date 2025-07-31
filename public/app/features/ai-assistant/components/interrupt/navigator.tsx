import { css } from '@emotion/css';
import { makeAssistantToolUI } from '@assistant-ui/react';
import { useState } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, Button, Icon, Alert, Spinner } from '@grafana/ui';
import { useLangGraphInterruptState } from '../../providers/runtimes/langgraph';

type NavigatorArgs = {
  url: string;
};

const NavigatorComponent = ({
  result,
  addResult,
}: {
  args: NavigatorArgs;
  result?: string;
  addResult: (result: any) => void;
}) => {
  const styles = useStyles2(getStyles);
  const globalInterrupt = useLangGraphInterruptState();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const shouldShowResult = result !== undefined;
  const shouldShowInterrupt = !shouldShowResult && globalInterrupt;

  if (shouldShowResult) {
    const parsedResult = result ? JSON.parse(result as string) : {};
    if (!parsedResult.success) {
      return (
        <div className={styles.container}>
          <Alert severity="error" title="操作失敗">
            <div className={styles.alertContent}>
              <Icon name="times-circle" className={styles.alertIcon} />
              <span>{parsedResult.message}</span>
            </div>
          </Alert>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <Alert severity="success" title="操作成功 ✅">
          <div className={styles.alertContent}>
            <Icon name="check-circle" className={styles.alertIcon} />
            <div>
              <p className={styles.successMessage}>{parsedResult.message}</p>
              <div className={styles.timestamp}>執行時間：{new Date(parsedResult.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  const handleConfirm = async () => {
    if (isLoading || hasSubmitted) return;

    setIsLoading(true);
    setHasSubmitted(true);
  };

  const handleReject = () => {
    if (isLoading || hasSubmitted) return;
    setHasSubmitted(true);
    // addResult(result?.url);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard}>
          <Spinner className={styles.spinner} />
          <span className={styles.loadingText}>處理中...</span>
        </div>
      </div>
    );
  }

  if (!shouldShowInterrupt) {
    return (
      <div className={styles.container}>
        <div className={styles.waitingCard}>
          <span className={styles.waitingText}>等待中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Alert severity="warning" title="操作確認">
        <div className={styles.confirmationContent}>
          <div className={styles.actionInfo}>
            <div className={styles.requestInfo}>
              <p className={styles.requestText}>
                <strong>用戶請求：</strong>
                {globalInterrupt?.value?.reason}
              </p>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || hasSubmitted}
              variant="primary"
              size="sm"
              icon="check"
            >
              確認
            </Button>
            <Button
              onClick={handleReject}
              disabled={isLoading || hasSubmitted}
              variant="destructive"
              size="sm"
              icon="times"
            >
              取消
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    maxWidth: '400px',
    margin: theme.spacing(1, 0),
  }),
  alertContent: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  }),
  alertIcon: css({
    flexShrink: 0,
  }),
  successMessage: css({
    fontWeight: theme.typography.fontWeightMedium,
    marginBottom: theme.spacing(0.5),
  }),
  timestamp: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
    borderTop: `1px solid ${theme.colors.border.weak}`,
    paddingTop: theme.spacing(0.5),
  }),
  loadingCard: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    padding: theme.spacing(2),
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.shape.radius.default,
    border: `1px solid ${theme.colors.border.weak}`,
  }),
  spinner: css({
    flexShrink: 0,
  }),
  loadingText: css({
    color: theme.colors.text.primary,
  }),
  waitingCard: css({
    padding: theme.spacing(2),
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.shape.radius.default,
    border: `1px solid ${theme.colors.border.weak}`,
    textAlign: 'center',
  }),
  waitingText: css({
    color: theme.colors.text.secondary,
  }),
  confirmationContent: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  }),
  actionInfo: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  }),
  actionItem: css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
  }),
  actionIcon: css({
    flexShrink: 0,
    marginTop: theme.spacing(0.25),
  }),
  actionTitle: css({
    fontWeight: theme.typography.fontWeightMedium,
    marginBottom: theme.spacing(0.25),
  }),
  actionDescription: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
  }),
  requestInfo: css({
    padding: theme.spacing(1.5),
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.shape.radius.default,
    border: `1px solid ${theme.colors.border.weak}`,
  }),
  requestText: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.primary,
  }),
  buttonGroup: css({
    display: 'flex',
    gap: theme.spacing(1.5),
    '& > button': {
      flex: 1,
    },
  }),
});

export const NavigatorUI = makeAssistantToolUI<NavigatorArgs, string>({
  toolName: 'navigateToUrl',
  render: NavigatorComponent,
});
