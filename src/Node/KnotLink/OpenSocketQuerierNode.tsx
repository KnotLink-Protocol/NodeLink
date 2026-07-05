import NodeHeader from "../BaseNode/NodeHeader";
import InputHandle from "../BaseNode/InputHandle";
import OutputHandle from "../BaseNode/OutputHandle";
import { TriggerInput, TriggerOutput } from "../BaseNode/TriggerHandle";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";

export interface QuerierData {
  appId: string;
  socketId: string;
}

export default function OpenSocketQuerierNode({ id, data }: { id: string; data?: QuerierData }) {
  const { updateNodeData } = useReactFlow();
  const [appId, setAppId] = useState(data?.appId ?? "MyApp");
  const [socketId, setSocketId] = useState(data?.socketId ?? "my_service");

  useEffect(() => { setAppId(data?.appId ?? "MyApp"); }, [data?.appId]);
  useEffect(() => { setSocketId(data?.socketId ?? "my_service"); }, [data?.socketId]);

  const onAppIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAppId(e.target.value);
    updateNodeData(id, { appId: e.target.value, socketId });
  }, [updateNodeData, id, socketId]);

  const onSocketIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSocketId(e.target.value);
    updateNodeData(id, { appId, socketId: e.target.value });
  }, [updateNodeData, id, appId]);

  return (
    <div className="relative w-44 bg-white border-gray-200 rounded-xl shadow-md font-sans">
      <NodeHeader title="Socket请求" className="bg-teal-500" />
      <TriggerBar />
      <OutputHandle id="o-result" tip="响应" className="!bg-teal-500" />
      <div className="divide-y divide-gray-100 text-[10px]">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-gray-700">APP ID</span>
          <input value={appId} onChange={onAppIdChange} onMouseDown={e => e.stopPropagation()}
            className="w-20 text-right border border-gray-300 rounded px-1 py-0.5" />
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-gray-700">Socket ID</span>
          <input value={socketId} onChange={onSocketIdChange} onMouseDown={e => e.stopPropagation()}
            className="w-20 text-right border border-gray-300 rounded px-1 py-0.5" />
        </div>
        <div className="flex items-center px-3 py-2 relative">
          <InputHandle id="i-query" className="!bg-teal-500" />
          <span className="text-gray-700 ml-2">请求数据</span>
        </div>
      </div>
    </div>
  );
}
