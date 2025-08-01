import type { LangChainMessage, LangChainMessageChunk, MessageContentText } from './types';

// Simple implementation of parsePartialJsonObject
const parsePartialJsonObject = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // Try to parse partial JSON by adding closing braces/brackets
    const attempts = [jsonString + '}', jsonString + '"}', jsonString + ']}', jsonString + '}]}'];

    for (const attempt of attempts) {
      try {
        return JSON.parse(attempt);
      } catch (e) {
        // Continue to next attempt
      }
    }
    return null;
  }
};

export const appendLangChainChunk = (
  prev: LangChainMessage | undefined,
  curr: LangChainMessage | LangChainMessageChunk
): LangChainMessage => {
  if (curr.type !== 'AIMessageChunk') {
    return curr;
  }

  if (!prev || prev.type !== 'ai') {
    return {
      ...curr,
      type: curr.type.replace('MessageChunk', '').toLowerCase(),
    } as LangChainMessage;
  }

  const newContent =
    typeof prev.content === 'string' ? [{ type: 'text' as const, text: prev.content }] : [...prev.content];

  if (typeof curr?.content === 'string') {
    const lastIndex = newContent.length - 1;
    if (newContent[lastIndex]?.type === 'text') {
      (newContent[lastIndex] as MessageContentText).text =
        (newContent[lastIndex] as MessageContentText).text + curr.content;
    } else {
      newContent.push({ type: 'text', text: curr.content });
    }
  } else if (Array.isArray(curr.content)) {
    const lastIndex = newContent.length - 1;
    for (const item of curr.content) {
      if (!('type' in item)) {
        continue;
      }

      if (item.type === 'text') {
        if (newContent[lastIndex]?.type === 'text') {
          (newContent[lastIndex] as MessageContentText).text =
            (newContent[lastIndex] as MessageContentText).text + item.text;
        } else {
          newContent.push({ type: 'text', text: item.text });
        }
      } else if (item.type === 'image_url') {
        newContent.push(item);
      }
    }
  }

  const newToolCalls = [...(prev.tool_calls ?? [])];
  for (const chunk of curr.tool_call_chunks ?? []) {
    try {
      // Ensure valid chunk index (allow index 0)
      if (chunk.index === null || chunk.index === undefined || chunk.index < 0) {
        continue;
      }

      const arrayIndex = chunk.index;
      const existing = newToolCalls[arrayIndex] ?? { argsText: '', args: {} };
      const newArgsText = (existing.argsText || '') + (chunk.args || '');


      // Parse args with fallback
      let parsedArgs = existing.args || {};
      if (newArgsText.trim()) {
        try {
          const parsed = parsePartialJsonObject(newArgsText);
          if (parsed !== null && typeof parsed === 'object') {
            parsedArgs = parsed;
          }
        } catch (parseError) {
          console.warn('Failed to parse tool call args:', parseError, 'argsText:', newArgsText);
          // Keep existing args if parsing fails
        }
      }

      newToolCalls[arrayIndex] = {
        ...existing,
        id: chunk.id || existing.id,
        name: chunk.name || existing.name,
        argsText: newArgsText,
        args: parsedArgs,
      };
    } catch (error) {
      console.error('Error processing tool call chunk:', error, chunk);
      // Continue processing other chunks
    }
  }

  return {
    ...prev,
    content: newContent,
    tool_calls: newToolCalls,
  };
};
