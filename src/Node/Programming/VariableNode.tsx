import NodeHeader from "../BaseNode/NodeHeader";
import InputHandle from "../BaseNode/InputHandle";
import OutputHandle from "../BaseNode/OutputHandle";
import { TriggerBar } from "../BaseNode/TriggerHandle";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";

export interface VariableNodeData {
  name: string;
}

export default function VariableNode({ id, data }: { id: string; data?: VariableNodeData }) {
  const { updateNodeData } = useReactFlow();
  const [name, setName] = useState(data?.name ?? "x");

  useEffect(() => {
    setName(data?.name ?? "x");
  }, [data?.name]);

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      setName(evt.target.value);
      updateNodeData(id, { name: evt.target.value });
    },
    [updateNodeData, id],
  );

  return (
    <div className="relative w-36 bg-white border-gray-200 rounded-xl shadow-md font-sans">
      <NodeHeader title="变量" className="bg-indigo-500" />
      <TriggerBar />
      <OutputHandle id="o-var" tip="var" className="!bg-indigo-500" />
      <div className="divide-y divide-gray-100 text-[10px]">
        <div className="flex items-center justify-between px-3 py-2 relative">
          <InputHandle id="i-var" className="!bg-pink-500" />
          <input
            value={name}
            onChange={onChange}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="变量名"
            className="w-20 text-right border border-gray-300 rounded px-1 py-0.5"
          />
        </div>
      </div>
    </div>
  );
}
