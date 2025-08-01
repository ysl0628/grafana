import React from 'react';

import { t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { ToolbarButton, Tooltip } from '@grafana/ui';

import { useAiAssistantSidebar } from '../providers/AiAssistantProvider';

/**
 * AI Assistant Toggle Component
 *
 * Toggle button for the top navigation that opens the AI assistant sidebar.
 */
export const AiAssistantToggle: React.FC = () => {
  const { toggleSidebar } = useAiAssistantSidebar();

  const handleToggle = () => {
    toggleSidebar();
  };

  // Don't render if AI assistant feature is not enabled
  if (!config.featureToggles.aiAssistant) {
    return null;
  }

  return (
    <Tooltip content={t('ai-assistant.toggle.tooltip', 'AI Assistant')}>
      <ToolbarButton
        iconOnly
        icon="ai-sparkle"
        onClick={handleToggle}
        aria-label={t('ai-assistant.toggle.aria-label', 'Open AI Assistant')}
        data-testid="ai-assistant-toggle"
      />
    </Tooltip>
  );
};

export default AiAssistantToggle;
