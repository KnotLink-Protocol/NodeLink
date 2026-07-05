import NodeHeader from "../BaseNode/NodeHeader";
import InputHandle from "../BaseNode/InputHandle";
import { TriggerInput, TriggerOutput } from "../BaseNode/TriggerHandle";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";

export interface SignalSenderData {
  appId: string;
  signalId: string;
}

export default function SignalSenderNode({ id, data }: { id: string; data?: SignalSenderData }) {
  const { updateNodeData } = useReactFlow();
  const [appId, setAppId] = useState(data?.appId ?? "MyApp");
  const [signalId, setSignalId] = useState(data?.signalId ?? "my_signal");

  useEffect(() => { setAppId(data?.appId ?? "MyApp"); }, [data?.appId]);
  useEffect(() => { setSignalId(data?.signalId ?? "my_signal"); }, [data?.signalId]);

  const onAppIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAppId(e.target.value);
    updateNodeData(id, { appId: e.target.value, signalId });
  }, [updateNodeData, id, signalId]);

  const onSignalIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSignalId(e.target.value);
    updateNodeData(id, { appId, signalId: e.target.value });
  }, [updateNodeData, id, appId]);

  return (
    <div className="relative w-44 bg-white border-gray-200 rounded-xl shadow-md font-sans">
      <NodeHeader title="信号发送" className="bg-yellow-500" />
      <TriggerBar />
      <div className="divide-y divide-gray-100 text-[10px]">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-gray-700">APP ID</span>
          <input value={appId} onChange={onAppIdChange} onMouseDown={e => e.stopPropagation()}
            className="w-20 text-right border border-gray-300 rounded px-1 py-0.5" />
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-gray-700">Signal ID</span>
          <input value={signalId} onChange={onSignalIdChange} onMouseDown={e => e.stopPropagation()}
            className="w-20 text-right border border-gray-300 rounded px-1 py-0.5" />
        </div>
        <div className="flex items-center px-3 py-2 relative">
          <InputHandle id="i-data" className="!bg-yellow-500" />
          <span className="text-gray-700 ml-2">发送数据</span>
        </div>
      </div>
    </div>
  );
}
