import NodeHeader from "../BaseNode/NodeHeader";
import InputHandle from "../BaseNode/InputHandle";
import OutputHandle from "../BaseNode/OutputHandle";
import { TriggerBar } from "../BaseNode/TriggerHandle";

export default function LoopNode() {
  return (
    <div className="relative w-36 bg-white border-gray-200 rounded-xl shadow-md font-sans">
      <NodeHeader title="For Loop" className="bg-violet-500" />
      <TriggerBar />
      <OutputHandle id="o-iter" tip="i" className="!bg-violet-500" />
      <div className="divide-y divide-gray-100 text-[10px]">
        <div className="flex items-center justify-between px-3 py-2 relative">
          <InputHandle id="i-start" className="!bg-green-500" />
          <span className="text-gray-700">起始</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 relative">
          <InputHandle id="i-end" className="!bg-red-500" />
          <span className="text-gray-700">结束</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 relative">
          <InputHandle id="i-body" className="!bg-violet-300" />
          <span className="text-gray-700">循环体</span>
        </div>
      </div>
    </div>
  );
}
