import {
  MessagePrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ErrorPrimitive,
  useMessage,
  TextMessagePart,
} from '@assistant-ui/react';
import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from '@assistant-ui/react-markdown';
import remarkGfm from 'remark-gfm';

import { css } from '@emotion/css';
import React, { useState, FC } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Button, Text, Tooltip, Alert } from '@grafana/ui';
import { ToolFallback, LokiToolFallback, PrometheusToolFallback } from './tool-fallback';

/**
 * AI Assistant Message Component
 *
 * Displays assistant messages with support for text content, tool calls, and errors.
 * Integrates with @assistant-ui/react primitives while using Grafana's UI components.
 */
export const AiAssistantMessage: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <MessagePrimitive.Root className={styles.assistantMessage}>
      <div className={styles.messageContent}>
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            tools: {
              Fallback: ToolFallback,
              by_name: {
                query_loki_logs: LokiToolFallback,
                query_prometheus: PrometheusToolFallback,
              },
            },
          }}
        />
        <MessageError />
        <div className={styles.messageFooter}>
          <AssistantActionBar />
        </div>
      </div>

      <BranchPicker />
    </MessagePrimitive.Root>
  );
};

/**
 * Markdown Text Component
 *
 * Renders text content with markdown support.
 */
const MarkdownText: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.textContent}>
      <MarkdownTextPrimitive remarkPlugins={[remarkGfm]} className="aui-md" components={defaultComponents} />
    </div>
  );
};

/**
 * Assistant Action Bar Component
 *
 * Provides actions for assistant messages like copy and regenerate.
 */
const AssistantActionBar: React.FC = () => {
  const styles = useStyles2(getStyles);
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const message = useMessage();

  return (
    <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className={styles.actionBar}>
      <ActionBarPrimitive.Copy asChild>
        <Tooltip content={t('ai-assistant.message.copy-tooltip', 'Copy message')}>
          <Button
            variant="secondary"
            size="sm"
            icon={isCopied ? 'check' : 'copy'}
            aria-label={t('ai-assistant.message.copy-aria-label', 'Copy message')}
            onClick={() => copyToClipboard(JSON.stringify((message.content as TextMessagePart[])[0]?.text, null, 2))}
          />
        </Tooltip>
      </ActionBarPrimitive.Copy>

      <ActionBarPrimitive.Reload asChild>
        <Tooltip content={t('ai-assistant.message.regenerate-tooltip', 'Regenerate response')}>
          <Button
            variant="secondary"
            size="sm"
            icon="sync"
            aria-label={t('ai-assistant.message.regenerate-aria-label', 'Regenerate response')}
          />
        </Tooltip>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

/**
 * Message Error Component
 *
 * Displays error messages when assistant responses fail.
 */
const MessageError: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className={styles.errorContainer}>
        <Alert title={t('ai-assistant.message.error.title', 'Error')} severity="error">
          <ErrorPrimitive.Message />
        </Alert>
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

/**
 * Branch Picker Component
 *
 * Allows navigation between different response branches.
 */
const BranchPicker: React.FC = () => {
  const styles = useStyles2(getStyles);

  return (
    <BranchPickerPrimitive.Root hideWhenSingleBranch className={styles.branchPicker}>
      <BranchPickerPrimitive.Previous asChild>
        <Tooltip content={t('ai-assistant.message.previous-response-tooltip', 'Previous response')}>
          <Button
            variant="secondary"
            size="sm"
            icon="arrow-left"
            aria-label={t('ai-assistant.message.previous-response-aria-label', 'Previous response')}
          />
        </Tooltip>
      </BranchPickerPrimitive.Previous>

      <Text variant="bodySmall" color="secondary">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </Text>

      <BranchPickerPrimitive.Next asChild>
        <Tooltip content={t('ai-assistant.message.next-response-tooltip', 'Next response')}>
          <Button
            variant="secondary"
            size="sm"
            icon="arrow-right"
            aria-label={t('ai-assistant.message.next-response-aria-label', 'Next response')}
          />
        </Tooltip>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const styles = useStyles2(getStyles);
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className={styles.codeHeader}>
      <span className={styles.codeLanguage}>{language?.toLowerCase()}</span>
      <Button
        variant="secondary"
        size="sm"
        icon={isCopied ? 'check' : 'copy'}
        onClick={onCopy}
        disabled={!code || isCopied}
        tooltip={
          isCopied ? t('ai-assistant.code.copied-tooltip', 'Copied') : t('ai-assistant.code.copy-tooltip', 'Copy code')
        }
        aria-label={t('ai-assistant.code.copy-aria-label', 'Copy code')}
      />
    </div>
  );
};

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

// Create markdown components with Grafana styling
const createMarkdownComponents = () => {
  return memoizeMarkdownComponents({
    h1: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <h1 className={`${styles.h1} ${className || ''}`} {...props} />;
    },
    h2: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <h2 className={`${styles.h2} ${className || ''}`} {...props} />;
    },
    h3: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <h3 className={`${styles.h3} ${className || ''}`} {...props} />;
    },
    h4: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <h4 className={`${styles.h4} ${className || ''}`} {...props} />;
    },
    h5: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <h5 className={`${styles.h5} ${className || ''}`} {...props} />;
    },
    h6: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <h6 className={`${styles.h6} ${className || ''}`} {...props} />;
    },
    p: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <p className={`${styles.paragraph} ${className || ''}`} {...props} />;
    },
    a: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <a className={`${styles.link} ${className || ''}`} {...props} />;
    },
    blockquote: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <blockquote className={`${styles.blockquote} ${className || ''}`} {...props} />;
    },
    ul: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <ul className={`${styles.unorderedList} ${className || ''}`} {...props} />;
    },
    ol: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <ol className={`${styles.orderedList} ${className || ''}`} {...props} />;
    },
    hr: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <hr className={`${styles.horizontalRule} ${className || ''}`} {...props} />;
    },
    table: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <table className={`${styles.table} ${className || ''}`} {...props} />;
    },
    th: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <th className={`${styles.tableHeader} ${className || ''}`} {...props} />;
    },
    td: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <td className={`${styles.tableCell} ${className || ''}`} {...props} />;
    },
    tr: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <tr className={`${styles.tableRow} ${className || ''}`} {...props} />;
    },
    sup: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <sup className={`${styles.superscript} ${className || ''}`} {...props} />;
    },
    pre: ({ className, ...props }: any) => {
      const styles = useStyles2(getMarkdownStyles);
      return <pre className={`${styles.preformatted} ${className || ''}`} {...props} />;
    },
    code: function Code({ className, ...props }: any) {
      const styles = useStyles2(getMarkdownStyles);
      const isCodeBlock = useIsMarkdownCodeBlock();
      return <code className={`${isCodeBlock ? styles.codeBlock : styles.inlineCode} ${className || ''}`} {...props} />;
    },
    CodeHeader,
  });
};

const defaultComponents = createMarkdownComponents();

const getStyles = (theme: GrafanaTheme2) => ({
  assistantMessage: css({
    display: 'flex',
    flexDirection: 'column',
    marginBottom: theme.spacing(2),
    alignSelf: 'flex-start',
    width: '100%',
  }),
  messageFooter: css({
    display: 'flex',
    justifyContent: 'flex-end',
    // marginBottom: theme.spacing(1),
    height: '20px',
    width: '100%',
  }),
  messageContent: css({
    padding: theme.spacing(2),
    wordBreak: 'break-word',
    width: '100%',
  }),
  textContent: css({
    width: '100%',
    color: theme.colors.text.primary,
    lineHeight: 1.6,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
  }),
  markdownContent: css({
    '& code': {
      backgroundColor: theme.colors.background.canvas,
      padding: theme.spacing(0.25, 0.5),
      borderRadius: theme.shape.radius.default,
      fontSize: theme.typography.size.sm,
    },
    '& strong': {
      fontWeight: theme.typography.fontWeightBold,
    },
    '& em': {
      fontStyle: 'italic',
    },
  }),
  toolResult: css({
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  }),
  actionBar: css({
    display: 'flex',
    gap: theme.spacing(0.5),
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
    },
  }),
  errorContainer: css({
    marginTop: theme.spacing(1),
  }),
  branchPicker: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
    justifyContent: 'center',
  }),
  codeHeader: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
    borderTopLeftRadius: '10px',
    borderTopRightRadius: '10px',
    backgroundColor: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderBottom: 'none',
    padding: theme.spacing(1, 2),
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.colors.text.primary,
  }),
  codeLanguage: css({
    textTransform: 'lowercase',
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
  }),
});

const getMarkdownStyles = (theme: GrafanaTheme2) => ({
  h1: css({
    marginBottom: theme.spacing(2),
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.fontWeightBold,
    lineHeight: theme.typography.h1.lineHeight,
    color: theme.colors.text.primary,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
    '&:first-child': {
      marginTop: 0,
    },
    '&:last-child': {
      marginBottom: 0,
    },
  }),
  h2: css({
    marginBottom: theme.spacing(1.5),
    marginTop: theme.spacing(2),
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: theme.typography.h2.lineHeight,
    color: theme.colors.text.primary,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
    '&:first-child': {
      marginTop: 0,
    },
    '&:last-child': {
      marginBottom: 0,
    },
  }),
  h3: css({
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: theme.typography.h3.lineHeight,
    color: theme.colors.text.primary,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
    '&:first-child': {
      marginTop: 0,
    },
    '&:last-child': {
      marginBottom: 0,
    },
  }),
  h4: css({
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: theme.typography.h4.lineHeight,
    color: theme.colors.text.primary,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
    '&:first-child': {
      marginTop: 0,
    },
    '&:last-child': {
      marginBottom: 0,
    },
  }),
  h5: css({
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(1),
    fontSize: theme.typography.h5.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: theme.typography.h5.lineHeight,
    color: theme.colors.text.primary,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
    '&:first-child': {
      marginTop: 0,
    },
    '&:last-child': {
      marginBottom: 0,
    },
  }),
  h6: css({
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(1),
    fontSize: theme.typography.h6.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: theme.typography.h6.lineHeight,
    color: theme.colors.text.primary,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
    '&:first-child': {
      marginTop: 0,
    },
    '&:last-child': {
      marginBottom: 0,
    },
  }),
  paragraph: css({
    marginBottom: theme.spacing(1.5),
    marginTop: theme.spacing(1.5),
    lineHeight: 1.6,
    color: theme.colors.text.primary,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
    '&:first-child': {
      marginTop: 0,
    },
    '&:last-child': {
      marginBottom: 0,
    },
  }),
  link: css({
    color: theme.colors.text.link,
    fontWeight: theme.typography.fontWeightMedium,
    textDecoration: 'underline',
    textUnderlineOffset: '4px',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-all',
    maxWidth: '100%',
    '&:hover': {
      color: theme.colors.text.link,
    },
  }),
  blockquote: css({
    borderLeft: `2px solid ${theme.colors.border.medium}`,
    paddingLeft: theme.spacing(1.5),
    fontStyle: 'italic',
    color: theme.colors.text.secondary,
    margin: theme.spacing(1.5, 0),
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
  }),
  unorderedList: css({
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(3), // 增加左邊距以避免項目符號被切掉
    paddingLeft: theme.spacing(0.5),
    listStyleType: 'disc',
    listStylePosition: 'outside', // 確保項目符號在外部
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    maxWidth: '100%',
    '& li': {
      marginTop: theme.spacing(0.5),
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      wordBreak: 'break-word',
      paddingLeft: theme.spacing(0.5),
    },
  }),
  orderedList: css({
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(3), // 增加左邊距以避免數字被切掉
    paddingLeft: theme.spacing(0.5),
    listStyleType: 'decimal',
    listStylePosition: 'outside', // 確保數字在外部顯示
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    maxWidth: '100%',
    '& li': {
      marginTop: theme.spacing(0.5),
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      wordBreak: 'break-word',
      paddingLeft: theme.spacing(0.5),
    },
  }),
  horizontalRule: css({
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    border: 'none',
  }),
  table: css({
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    display: 'block',
    overflowX: 'auto',
    maxWidth: '100%',
    // 自定義滾動條樣式
    '&::-webkit-scrollbar': {
      height: '6px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.colors.border.medium,
      borderRadius: '3px',
      '&:hover': {
        backgroundColor: theme.colors.border.strong,
      },
    },
    '& thead, & tbody, & tr': {
      display: 'table',
      width: '100%',
      minWidth: 'max-content',
    },
  }),
  tableHeader: css({
    backgroundColor: theme.colors.background.canvas,
    padding: theme.spacing(1, 1.5),
    textAlign: 'left',
    fontWeight: theme.typography.fontWeightBold,
    border: `1px solid ${theme.colors.border.weak}`,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    minWidth: 'max-content',
    whiteSpace: 'nowrap',
    '&:first-child': {
      borderTopLeftRadius: theme.shape.radius.default,
    },
    '&:last-child': {
      borderTopRightRadius: theme.shape.radius.default,
    },
    '&[align="center"]': {
      textAlign: 'center',
    },
    '&[align="right"]': {
      textAlign: 'right',
    },
  }),
  tableCell: css({
    border: `1px solid ${theme.colors.border.weak}`,
    borderTop: 'none',
    padding: theme.spacing(1, 1.5),
    textAlign: 'left',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    minWidth: 'max-content',
    whiteSpace: 'nowrap',
    '&[align="center"]': {
      textAlign: 'center',
    },
    '&[align="right"]': {
      textAlign: 'right',
    },
  }),
  tableRow: css({
    margin: 0,
    padding: 0,
    '&:last-child td:first-child': {
      borderBottomLeftRadius: theme.shape.radius.default,
    },
    '&:last-child td:last-child': {
      borderBottomRightRadius: theme.shape.radius.default,
    },
  }),
  superscript: css({
    '& a': {
      fontSize: theme.typography.size.xs,
      textDecoration: 'none',
    },
  }),
  preformatted: css({
    overflowX: 'auto',
    borderBottomLeftRadius: '10px',
    borderBottomRightRadius: '10px',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    backgroundColor: theme.colors.background.canvas,
    border: `1px solid ${theme.colors.border.weak}`,
    borderTop: 'none',
    padding: theme.spacing(1.5),
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilyMonospace,
    fontSize: theme.typography.size.sm,
    whiteSpace: 'pre',
    overflowWrap: 'normal',
    wordBreak: 'normal',
    maxWidth: '100%',
    // 讓代碼塊可以橫向滾動而不是被隱藏
    '&::-webkit-scrollbar': {
      height: '6px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.colors.border.medium,
      borderRadius: '3px',
      '&:hover': {
        backgroundColor: theme.colors.border.strong,
      },
    },
  }),
  inlineCode: css({
    backgroundColor: theme.colors.background.canvas,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    padding: theme.spacing(0.25, 0.5),
    fontFamily: theme.typography.fontFamilyMonospace,
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.fontWeightMedium,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-all',
    maxWidth: '100%',
    display: 'inline',
    whiteSpace: 'pre-wrap',
  }),
  codeBlock: css({
    fontFamily: theme.typography.fontFamilyMonospace,
    fontSize: theme.typography.size.sm,
    whiteSpace: 'pre',
    overflowWrap: 'normal',
    wordBreak: 'normal',
    maxWidth: '100%',
    display: 'block',
  }),
});

export default AiAssistantMessage;
