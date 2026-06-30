import NodeHeader from "../BaseNode/NodeHeader";
import InputHandle from "../BaseNode/InputHandle";
import OutputHandle from "../BaseNode/OutputHandle";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

const OPS = ["+", "-", "*", "/", "**", "%"] as const;

export interface ArithmeticNodeData {
  op: string;
}

export default function ArithmeticNode({ id, data }: { id: string; data?: ArithmeticNodeData }) {
  const { updateNodeData } = useReactFlow();
  const op = data?.op ?? "+";

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { op: evt.target.value });
    },
    [updateNodeData, id],
  );

  return (
    <div className="relative w-32 bg-white border-gray-200 rounded-xl shadow-md font-sans">
      <NodeHeader title="运算" className="bg-amber-500" />
      <OutputHandle id="o-result" tip="res" className="!bg-amber-500" />
      <div className="divide-y divide-gray-100 text-[10px]">
        <div className="flex items-center justify-between px-3 py-2 relative">
          <InputHandle id="i-a" className="!bg-pink-500" />
          <select
            value={op}
            onChange={onChange}
            onMouseDown={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-1 text-xs"
          >
            {OPS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <InputHandle id="i-b" className="!bg-pink-500" />
        </div>
      </div>
    </div>
  );
}
