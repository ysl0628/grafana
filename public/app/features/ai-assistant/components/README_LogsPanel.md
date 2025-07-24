# Logs Panel 組件使用指南

這個文檔說明如何在 AI Assistant 中使用 logs panel 組件來顯示 Grafana logs panel。

## 概述

我們提供了兩種實現方式：

### 1. SimpleLogsPanelComponent（推薦）
基於 `@grafana/scenes-react` hooks 的現代實現，參考了 Grafana 官方的 LogViewer 擴展。

### 2. LogsPanelComponent
基於 `@grafana/scenes` 的完整實現，提供更多自定義選項。

兩個實現都提供了完整的 Grafana logs 功能，包括：

- 完整的 LogQL 查詢支持
- 互動式日誌過濾
- 可自定義的顯示選項
- 響應式佈局
- 原生 Grafana 樣式

## 檔案結構

```
ai-assistant/components/
├── SimpleLogsPanelComponent.tsx     # 推薦的簡潔實現
├── LogsPanelComponent.tsx           # 完整功能實現
├── examples/
│   ├── SimpleLogsPanelUsage.tsx    # 簡潔版使用範例
│   └── LogsPanelUsage.tsx          # 完整版使用範例
└── README_LogsPanel.md             # 本文檔
```

## 基本使用（推薦方式）

### 1. 導入組件

```typescript
import { 
  SimpleLogsPanelComponent, 
  SimpleLogsPanelPresets, 
  createSimpleLogsPanel 
} from './SimpleLogsPanelComponent';
```

### 2. 基本配置

```typescript
<SimpleLogsPanelComponent
  datasource={{
    uid: 'loki-datasource-uid',
    type: 'loki'
  }}
  query='{app="my-app"} |= "error"'
  options={{
    title: 'Error Logs',
    height: 400,
    wrapLogMessage: true,
    showTime: true,
    showLabels: true,
    enableLogDetails: true
  }}
  maxLines={1000}
/>
```

### 3. 快速創建（推薦）

```typescript
{createSimpleLogsPanel({
  datasourceUid: 'loki-datasource-uid',
  query: '{app="my-app"} |= "error"',
  title: 'Error Logs'
})}
```

## API 參考

### LogsPanelComponent Props

#### `query` (必填)
| 屬性 | 類型 | 描述 |
|------|------|------|
| `datasourceUid` | `string` | Loki 數據源的 UID |
| `logql` | `string` | LogQL 查詢表達式 |
| `limit` | `number?` | 最大日誌行數 (預設: 1000) |

#### `options` (可選)
| 屬性 | 類型 | 預設值 | 描述 |
|------|------|---------|------|
| `title` | `string?` | `'Query Results'` | Panel 標題 |
| `height` | `number?` | `12` | Panel 高度 (grid units) |
| `showTime` | `boolean?` | `true` | 顯示時間戳 |
| `showLabels` | `boolean?` | `true` | 顯示標籤 |
| `sortOrder` | `LogsSortOrder?` | `Descending` | 排序順序 |
| `dedupStrategy` | `LogsDedupStrategy?` | `none` | 去重策略 |
| `wrapLogMessage` | `boolean?` | `true` | 換行顯示訊息 |
| `syntaxHighlighting` | `boolean?` | `true` | 語法高亮 |
| `showControls` | `boolean?` | `false` | 顯示控制項 |

#### `onLogInteraction` (可選)
```typescript
(type: 'filter' | 'filterOut', key: string, value: string) => void
```
日誌互動回調函數，當用戶點擊過濾或排除標籤時觸發。

## 使用範例

### 1. 在 ToolFallback 中使用

```typescript
export const LogsToolFallback: ToolCallContentPartComponent = ({ 
  toolName, 
  args, 
  status 
}) => {
  if (toolName === 'query_loki_logs' && status?.type === 'complete') {
    const { datasourceUid, logql, limit } = args;

    return (
      <div>
        <h4>Logs Query Results</h4>
        <LogsPanelComponent
          query={{ datasourceUid, logql, limit }}
          options={{
            title: 'Query Results',
            showControls: true,
            wrapLogMessage: true
          }}
        />
      </div>
    );
  }
  
  // 其他工具的預設顯示
  return <DefaultToolDisplay />;
};
```

### 2. 使用預設配置

#### 應用程式錯誤日誌
```typescript
{LogsPanelPresets.ApplicationErrors('loki-uid', 'my-app')}
```

#### 最近活動
```typescript
{LogsPanelPresets.RecentLogs('loki-uid', 'my-app')}
```

#### 自定義查詢
```typescript
{LogsPanelPresets.CustomQuery('loki-uid', '{service="api"} |= "timeout"', 'Timeout Analysis')}
```

### 3. 完整的 AI 回應

```typescript
<CompleteAiResponseWithLogs
  message="我發現您的應用程式出現了一些錯誤。以下是相關的日誌分析："
  logsConfig={{
    datasourceUid: 'loki-datasource-uid',
    query: '{app="my-app"} |= "error" or "exception"',
    title: 'Error Analysis'
  }}
  showAnalysis={true}
/>
```

## 進階使用

### 1. 自定義樣式

組件使用 Grafana 的主題系統，會自動適應當前主題。如果需要自定義樣式，可以通過 CSS 類名進行覆蓋：

```css
.logs-panel-custom {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

### 2. 處理日誌互動

```typescript
const handleLogInteraction = (type: 'filter' | 'filterOut', key: string, value: string) => {
  if (type === 'filter') {
    // 添加過濾條件
    console.log(`Add filter: ${key}="${value}"`);
  } else {
    // 排除條件
    console.log(`Exclude: ${key}="${value}"`);
  }
  
  // 可以與 AI Assistant 整合，自動生成新的查詢
};

<LogsPanelComponent
  query={queryConfig}
  onLogInteraction={handleLogInteraction}
/>
```

### 3. 響應式設計

組件會根據屏幕大小自動調整：
- 大屏幕：完整功能顯示
- 中屏幕：適中的高度和功能
- 小屏幕：緊湊模式

## 集成到現有工具

### 1. 在 useAiAssistantTools 中使用

```typescript
// 在 AI Assistant tools 中
const queryLokiLogs = useCallback(async (params: {
  datasourceUid: string;
  logql: string;
  limit?: number;
}) => {
  // 執行查詢邏輯
  const result = await executeLokiQuery(params);
  
  // 返回結果，包含 panel 配置
  return {
    success: true,
    data: result,
    panel: {
      type: 'logs',
      config: params
    }
  };
}, []);
```

### 2. 在 ToolFallback 中條件渲染

```typescript
// 修改現有的 ToolFallback 組件
export const EnhancedToolFallback: ToolCallContentPartComponent = (props) => {
  const { toolName, args, result, status } = props;
  
  // 檢查是否需要顯示 logs panel
  if (toolName === 'query_loki_logs' && result?.panel?.type === 'logs') {
    return (
      <LogsPanelComponent
        query={result.panel.config}
        options={{ title: `${toolName} Results` }}
      />
    );
  }
  
  // 使用原始的 ToolFallback
  return <OriginalToolFallback {...props} />;
};
```

## 性能考慮

1. **數據限制**：建議設置合理的 `limit` 值，避免加載過多數據
2. **查詢優化**：使用高效的 LogQL 查詢，包含時間範圍限制
3. **懶加載**：對於大型回應，考慮使用 React.lazy 進行懶加載

## 故障排除

### 常見問題

1. **Panel 不顯示**
   - 檢查 `datasourceUid` 是否正確
   - 確認數據源類型為 'loki'
   - 檢查 LogQL 查詢語法

2. **樣式問題**
   - 確保導入了 Grafana 主題
   - 檢查 CSS 衝突

3. **性能問題**
   - 減少 `limit` 值
   - 優化 LogQL 查詢
   - 添加時間範圍限制

### 調試技巧

```typescript
// 啟用調試模式
<LogsPanelComponent
  query={queryConfig}
  onLogInteraction={(type, key, value) => {
    console.log('Log interaction:', { type, key, value });
  }}
/>
```

## 未來改進

- [ ] 支援多個數據源
- [ ] 添加匯出功能
- [ ] 集成告警系統
- [ ] 支援實時更新
- [ ] 添加更多預設配置

## 貢獻

如果你有改進建議或發現問題，請：
1. 查看現有的 issues
2. 創建詳細的 bug 報告或功能請求
3. 提交 Pull Request

---

*最後更新：2024年7月*