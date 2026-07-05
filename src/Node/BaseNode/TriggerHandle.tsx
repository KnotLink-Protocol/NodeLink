import InputHandle from "./InputHandle";
import { Handle, Position } from "@xyflow/react";

// 触发栏：一行，左输入（灰色），右输出（橙色）
export function TriggerBar({ input = true }: { input?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-1 relative border-b border-gray-100">
      {input ? (
        <div className="flex items-center">
          <InputHandle id="i-trigger" className="!bg-gray-400" />
          <span className="text-gray-400 text-[9px] ml-1.5">触发</span>
        </div>
      ) : <div />}
      <div className="flex items-center">
        <span className="text-gray-400 text-[9px] mr-1.5">触发→</span>
        <Handle
          type="source"
          id="o-trigger"
          position={Position.Right}
          className="!bg-orange-400 !w-3 !h-3 rounded-full absolute right-[-7px] top-1/2 shadow-sm"
        />
      </div>
    </div>
  );
}
