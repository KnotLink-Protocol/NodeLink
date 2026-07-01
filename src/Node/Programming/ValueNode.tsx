import NodeHeader from "../BaseNode/NodeHeader";
import InputHandle from "../BaseNode/InputHandle";
import OutputHandle from "../BaseNode/OutputHandle";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";

export interface ValueNodeData {
  value: string;
  label: string;
}

export default function ValueNode({ id, data }: { id: string; data?: ValueNodeData }) {
  const { updateNodeData } = useReactFlow();
  const [value, setValue] = useState(data?.value ?? "0");
  const [label, setLabel] = useState(data?.label ?? "value");

  useEffect(() => {
    setValue(data?.value ?? "0");
  }, [data?.value]);
  useEffect(() => {
    setLabel(data?.label ?? "value");
  }, [data?.label]);

  const onChangeVal = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      setValue(evt.target.value);
      updateNodeData(id, { value: evt.target.value, label } as ValueNodeData);
    },
    [updateNodeData, id, label],
  );

  const onChangeLabel = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      setLabel(evt.target.value);
      updateNodeData(id, { value, label: evt.target.value } as ValueNodeData);
    },
    [updateNodeData, id, value],
  );

  return (
    <div className="relative w-36 bg-white border-gray-200 rounded-xl shadow-md font-sans">
      <NodeHeader title="Value" className="bg-emerald-500" />
      <div className="flex items-center px-3 py-1 relative border-b border-gray-100">
        <InputHandle id="i-trigger" className="!bg-gray-400" />
        <span className="text-gray-400 text-[9px] ml-2">触发</span>
      </div>
      <OutputHandle id="o-value" tip="val" className="!bg-emerald-500" />
      <div className="divide-y divide-gray-100 text-[10px]">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-gray-700">名称</span>
          <input
            value={label}
            onChange={onChangeLabel}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5"
          />
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-gray-700">值</span>
          <input
            value={value}
            onChange={onChangeVal}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5"
          />
        </div>
      </div>
    </div>
  );
}
