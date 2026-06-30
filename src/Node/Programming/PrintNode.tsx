import NodeHeader from "../BaseNode/NodeHeader";
import InputHandle from "../BaseNode/InputHandle";
import { useNodeConnections, useNodesData } from "@xyflow/react";
import { useState } from "react";

export default function PrintNode() {
  const connections = useNodeConnections({ handleType: "target" });
  const sourceData = useNodesData(connections?.[0]?.source);
  const [text, setText] = useState("");

  return (
    <div className="relative w-44 bg-white border-gray-200 rounded-xl shadow-md font-sans">
      <NodeHeader title="Print" className="bg-cyan-500" />
      <div className="flex items-center px-3 py-2 relative">
        <InputHandle id="i-print" className="!bg-cyan-500" />
        <span className="text-gray-700 text-[10px] ml-2">输出</span>
      </div>
      <div className="px-3 py-1">
        <input
          placeholder="自定义消息(可选)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full border border-gray-300 rounded px-1 py-0.5 text-[10px]"
        />
      </div>
      <div className="px-3 pb-2">
        <div className="text-[9px] text-gray-400 truncate">
          {sourceData ? `← ${sourceData.data?.value ?? sourceData.data?.label ?? "connected"}` : "未连接"}
        </div>
      </div>
    </div>
  );
}
