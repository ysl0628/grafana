import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, Icon, Button, Text, Tooltip } from '@grafana/ui';

import { useAtSelection } from '../contexts/AtSelectionContext';

export const SelectedItems: React.FC = () => {
  const styles = useStyles2(getStyles);
  const { selectedItems, removeItem, toggleItem, isActive } = useAtSelection();

  if (selectedItems.length === 0) {
    return null;
  }

  const handleItemToggle = (itemId: string) => {
    toggleItem(itemId);
  };

  return (
    // <div className={styles.container}>
    <>
      {selectedItems.map((item) => {
        const isItemActive = isActive(item.id);
        return (
          <div
            key={item.id}
            className={`${styles.item} ${!isItemActive ? styles.itemDisabled : ''}`}
            onClick={() => handleItemToggle(item.id)}
          >
            <div className={styles.itemContent}>
              <Icon
                name={item.icon as any}
                size="sm"
                className={`${styles.itemIcon} ${!isItemActive ? styles.iconDisabled : ''}`}
              />
              <Tooltip content={item.subtitle || item.title}>
                <Text variant="bodySmall" color={!isItemActive ? 'secondary' : 'disabled'}>
                  {item.title}
                </Text>
              </Tooltip>
            </div>
            <Button
              variant="secondary"
              size="sm"
              fill="text"
              icon="times"
              tooltip={t('ai-assistant.selected-items.remove', 'Remove item')}
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering toggle
                removeItem(item.id);
              }}
              aria-label={t('ai-assistant.selected-items.remove-aria-label', 'Remove {{title}}', {
                title: item.title,
              })}
            />
          </div>
        );
      })}
    </>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  // container: css({
  //   display: 'flex',
  //   alignItems: 'flex-start',
  //   marginLeft: theme.spacing(0.5),
  //   flex: 1,
  //   minWidth: 0,
  // }),
  // itemsList: css({
  //   display: 'flex',
  //   alignItems: 'flex-start',
  //   gap: theme.spacing(0.5),
  //   flexWrap: 'wrap',
  //   width: '100%',
  // }),
  item: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.25, 0.5),
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    flexShrink: 0,
    cursor: 'pointer',
    [theme.transitions.handleMotion('no-preference')]: {
      transition: 'all 0.2s ease',
    },
    '&:hover': {
      backgroundColor: theme.colors.background.canvas,
      borderColor: theme.colors.border.medium,
    },
  }),
  itemDisabled: css({
    backgroundColor: theme.colors.background.primary,
    border: 'none',
    opacity: 0.6,
    '&:hover': {
      backgroundColor: theme.colors.background.primary,
    },
  }),
  itemContent: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  }),
  itemIcon: css({
    color: theme.colors.text.secondary,
    flexShrink: 0,
  }),
  iconDisabled: css({
    color: theme.colors.text.disabled,
  }),
});

export default SelectedItems;
