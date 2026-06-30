import NodeHeader from "../BaseNode/NodeHeader";
import InputHandle from "../BaseNode/InputHandle";

export default function IfNode() {
  return (
    <div className="relative w-40 bg-white border-gray-200 rounded-xl shadow-md font-sans">
      <NodeHeader title="If / Else" className="bg-red-500" />
      <div className="divide-y divide-gray-100 text-[10px]">
        <div className="flex items-center justify-between px-3 py-2 relative">
          <InputHandle id="i-condition" className="!bg-red-500" />
          <span className="text-gray-700">条件</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 relative">
          <InputHandle id="i-true" className="!bg-green-500" />
          <span className="text-green-600">True 分支</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 relative">
          <InputHandle id="i-false" className="!bg-gray-400" />
          <span className="text-gray-500">False 分支</span>
        </div>
      </div>
    </div>
  );
}
