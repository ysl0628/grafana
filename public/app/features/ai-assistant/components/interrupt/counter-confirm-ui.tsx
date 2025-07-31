import { makeAssistantToolUI } from "@assistant-ui/react";
import { useState } from "react";
import { PlusCircle, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCounter } from "@/providers/CounterContext";
import { useLangGraphInterruptState } from "@/providers/runtimes/langgraph";

type CounterArgs = {
  amount: number;
  reason: string;
};

const CounterConfirmComponent = ({
  result,
  addResult,
}: {
  args: CounterArgs;
  result?: string;
  addResult: (result: any) => void;
}) => {
  const globalInterrupt = useLangGraphInterruptState();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { setCounter } = useCounter();

  const shouldShowResult = result !== undefined;
  const shouldShowInterrupt = !shouldShowResult && globalInterrupt;

  if (shouldShowResult) {
    const parsedResult = result ? JSON.parse(result as string) : {};
    if (!parsedResult.success) {
      return (
        <Card className="max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-base text-red-800">操作失敗</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">{parsedResult.message}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="max-w-md border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base text-green-800">
              操作成功 ✅
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium text-green-900">{parsedResult.message}</p>
          </div>
          <div className="border-t pt-2 text-xs text-green-600">
            執行時間：{new Date(parsedResult.timestamp).toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleConfirm = async () => {
    if (isLoading || hasSubmitted) return;

    setIsLoading(true);
    setHasSubmitted(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      let newCount = -1;
      setCounter((prev) => {
        newCount = prev + globalInterrupt?.value?.amount;
        return newCount;
      });
      addResult({
        resume: true,
        isResult: true,
      });
    } catch (error) {
      setHasSubmitted(false);
      console.error("提交失敗:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    if (isLoading || hasSubmitted) return;
    setHasSubmitted(true);
    addResult({
      resume: false,
      isResult: true,
    });
  };

  if (isLoading) {
    return (
      <Card className="max-w-md border-blue-200 bg-blue-50">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span className="text-blue-700">處理中...</span>
        </CardContent>
      </Card>
    );
  }

  if (!shouldShowInterrupt) {
    return (
      <Card className="max-w-md border-gray-200 bg-gray-50">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="text-gray-700">等待中...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-base text-orange-800">操作確認</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <PlusCircle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-900">增加計數器</p>
              <p className="text-sm text-orange-700">
                將計數器增加 {globalInterrupt?.value?.amount}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-orange-200 bg-white/50 p-3">
            <p className="text-sm text-gray-700">
              <strong>用戶請求：</strong>
              {globalInterrupt?.value?.reason}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleConfirm}
            disabled={isLoading || hasSubmitted}
            className="flex-1 bg-green-600 text-white hover:bg-green-700"
            size="sm"
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            確認
          </Button>
          <Button
            onClick={handleReject}
            disabled={isLoading || hasSubmitted}
            variant="destructive"
            className="flex-1"
            size="sm"
          >
            ✗ 取消
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const CounterConfirmUI = makeAssistantToolUI<CounterArgs, string>({
  toolName: "incrementCounterWithConfirm",
  render: CounterConfirmComponent,
});
