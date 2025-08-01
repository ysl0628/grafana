import { AiAssistantTool } from '../types/aiAssistant';

const tools: AiAssistantTool[] = [
  {
    type: 'function',
    function: {
      name: 'navigateToUrl',
      description: 'Navigate to a URL',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'The reason for navigating to the URL',
          },
          url: {
            type: 'string',
            description: 'The URL to navigate to',
          },
        },
      },
    },
  },
];

export default tools;
