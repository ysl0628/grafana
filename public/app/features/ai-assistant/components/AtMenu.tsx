import React, { useEffect, useState } from 'react';

import { t } from '@grafana/i18n';
import { Dropdown, Menu } from '@grafana/ui';

import { useAtSelection, AtSelectionItem } from '../contexts/AtSelectionContext';
import { getBackendSrv } from '@grafana/runtime';

interface AtMenuProps {
  children: React.ReactElement;
}

export const AtMenu: React.FC<AtMenuProps> = ({ children }) => {
  const { addItem, isSelected } = useAtSelection();
  const [databases, setDatabases] = useState<AtSelectionItem[]>([]);

  useEffect(() => {
    const getDatabases = async () => {
      const databases = await getBackendSrv().get('/api/datasources');
      setDatabases(databases);
    };
    getDatabases();
  }, []);

  const handleItemSelect = (database: AtSelectionItem) => {
    addItem(database);
  };

  const databaseMenu = (
    <>
      {databases.map((database) => (
        <Menu.Item
          key={database.id}
          label={database.name}
          icon="database"
          onClick={() => handleItemSelect(database)}
          active={isSelected(database.uid.toString())}
        />
      ))}
    </>
  );

  const mainMenu = (
    <Menu>
      <Menu.Item label={t('ai-assistant.at-menu.database', 'Datasource')} icon="database" childItems={[databaseMenu]} />
    </Menu>
  );

  return (
    <Dropdown overlay={mainMenu} placement="top-start">
      {children}
    </Dropdown>
  );
};

export default AtMenu;
