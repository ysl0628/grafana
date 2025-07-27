import React, { useEffect, useState } from 'react';

import { t } from '@grafana/i18n';
import { Dropdown, Menu } from '@grafana/ui';

import { useAtSelection, AtSelectionItem, DashboardItem } from '../../contexts/AtSelectionContext';
import { getBackendSrv } from '@grafana/runtime';

interface AtMenuProps {
  children: React.ReactElement;
}

export const AtMenu: React.FC<AtMenuProps> = ({ children }) => {
  const { addItem, isSelected } = useAtSelection();
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [databases, setDatabases] = useState<AtSelectionItem[]>([]);

  useEffect(() => {
    const getDatabases = async () => {
      const databases = await getBackendSrv().get('/api/datasources');
      setDatabases(databases);
    };

    const getDashboardsList = async () => {
      const dashboards = await getBackendSrv().get('/api/search', {
        type: 'dash-db',
      });
      setDashboards(dashboards);
    };
    getDatabases();
    getDashboardsList();
  }, []);

  const handleItemSelect = (item: AtSelectionItem | DashboardItem) => {
    addItem(item);
  };

  const databaseMenu = (
    <>
      {databases.map((database) => (
        <Menu.Item
          key={database.uid}
          label={database.name}
          icon="database"
          onClick={() => handleItemSelect(database)}
          active={isSelected(database.uid.toString())}
        />
      ))}
    </>
  );

  const dashboardMenu = (
    <>
      {dashboards.map((dashboard) => (
        <Menu.Item
          key={dashboard.uid}
          label={dashboard.title}
          icon="dashboard"
          onClick={() => handleItemSelect(dashboard)}
        />
      ))}
    </>
  );
  const mainMenu = (
    <Menu>
      <Menu.Item label={t('ai-assistant.at-menu.database', 'Datasource')} icon="database" childItems={[databaseMenu]} />
      <Menu.Item
        label={t('ai-assistant.at-menu.dashboard', 'Dashboard')}
        icon="dashboard"
        childItems={[dashboardMenu]}
      />
    </Menu>
  );

  return (
    <Dropdown overlay={mainMenu} placement="top-start">
      {children}
    </Dropdown>
  );
};

export default AtMenu;
