import { css } from '@emotion/css';
import React, { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, Icon, Text, Tooltip } from '@grafana/ui';

import { AtSelectionItem, useAtSelection } from '../../contexts/AtSelectionContext';

export const SelectedItems: React.FC = () => {
  const styles = useStyles2(getStyles);
  const { selectedItems, removeItem, toggleItem, isActive } = useAtSelection();
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  if (selectedItems.length === 0) {
    return null;
  }

  const handleItemToggle = (itemId: string) => {
    toggleItem(itemId);
  };

  const handleIconClick = (e: React.MouseEvent, itemId: string, isItemActive: boolean) => {
    e.stopPropagation();
    if (isItemActive) {
      // Active item: remove on icon click
      removeItem(itemId);
    } else {
      // Inactive item: toggle to active on icon click
      toggleItem(itemId);
    }
  };

  const getIconName = (item: AtSelectionItem, isItemActive: boolean) => {
    if (hoveredItemId === item.uid) {
      return isItemActive ? 'times' : 'plus-circle';
    }
    return item.type === 'dashboard' ? 'dashboard' : 'database';
  };

  return (
    // <div className={styles.container}>
    <>
      {selectedItems.map((item) => {
        const isItemActive = isActive(item.uid);
        return (
          <div
            key={item.uid}
            className={`${styles.item} ${!isItemActive ? styles.itemDisabled : ''}`}
            onClick={() => handleItemToggle(item.uid)}
            onMouseEnter={() => setHoveredItemId(item.uid)}
            onMouseLeave={() => setHoveredItemId(null)}
          >
            <Icon
              name={getIconName(item, isItemActive) as any}
              size="sm"
              className={`${styles.itemIcon} ${!isItemActive ? styles.iconDisabled : ''}`}
              onClick={(e) => handleIconClick(e, item.uid, isItemActive)}
            />
            <Tooltip content={item.name}>
              <Text variant="bodySmall" color={!isItemActive ? 'secondary' : 'disabled'}>
                {item.name}
              </Text>
            </Tooltip>
          </div>
        );
      })}
    </>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  item: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.25, 0.75, 0.25, 0.25),
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    flexShrink: 0,
    cursor: 'pointer',
    [theme.transitions.handleMotion('no-preference')]: {
      transition: 'all 0.2s ease',
    },
    '&:hover': {
      backgroundColor: theme.colors.background.secondary,
      borderColor: theme.colors.border.weak,
    },
  }),
  itemDisabled: css({
    backgroundColor: theme.colors.background.primary,
    border: `1px solid ${theme.colors.background.primary}`,
    opacity: 0.6,
    '&:hover': {
      backgroundColor: theme.colors.background.primary,
    },
  }),
  itemIcon: css({
    color: theme.colors.text.secondary,
    flexShrink: 0,
    cursor: 'pointer',
    padding: theme.spacing(0.25),
    borderRadius: theme.shape.radius.default,
    [theme.transitions.handleMotion('no-preference')]: {
      transition: 'all 0.2s ease',
    },
  }),
  iconDisabled: css({
    color: theme.colors.text.disabled,
  }),
});

export default SelectedItems;
