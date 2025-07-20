import React from 'react';

import { t } from '@grafana/i18n';
import { Dropdown, Menu } from '@grafana/ui';

import { useAtSelection, AtSelectionItem } from '../contexts/AtSelectionContext';

interface AtMenuProps {
  children: React.ReactElement;
}

// Mock data for Database items
const mockDatabases: AtSelectionItem[] = [
  {
    id: 'database-1',
    type: 'database',
    title: 'PostgreSQL Production',
    subtitle: 'Main production database',
    icon: 'database',
  },
  {
    id: 'database-2',
    type: 'database',
    title: 'MySQL Analytics',
    subtitle: 'Analytics and reporting database',
    icon: 'database',
  },
  {
    id: 'database-3',
    type: 'database',
    title: 'MongoDB Logs',
    subtitle: 'Application logs storage',
    icon: 'database',
  },
  {
    id: 'database-4',
    type: 'database',
    title: 'Redis Cache',
    subtitle: 'In-memory caching layer',
    icon: 'database',
  },
  {
    id: 'database-5',
    type: 'database',
    title: 'InfluxDB Metrics',
    subtitle: 'Time-series metrics database',
    icon: 'database',
  },
];

export const AtMenu: React.FC<AtMenuProps> = ({ children }) => {
  const { addItem, isSelected } = useAtSelection();

  const handleItemSelect = (database: AtSelectionItem) => {
    addItem(database);
  };

  const databaseMenu = (
    <>
      {mockDatabases.map((database) => (
        <Menu.Item
          key={database.id}
          label={database.title}
          icon={database.icon as any}
          onClick={() => handleItemSelect(database)}
          active={isSelected(database.id)}
        />
      ))}
    </>
  );

  const mainMenu = (
    <Menu>
      <Menu.Item label={t('ai-assistant.at-menu.database', 'Database')} icon="database" childItems={[databaseMenu]} />
    </Menu>
  );

  return (
    <Dropdown overlay={mainMenu} placement="top-start">
      {children}
    </Dropdown>
  );
};

export default AtMenu;
