import {Handle, Position} from "@xyflow/react";

interface OutputHandleProps {
    id: string;
    tip?: string;
    className?: string;
}
// 节点顶部标题栏组件
export default function OutputHandle({ id, tip= "输出",className}: OutputHandleProps) {
    return (
        <div className="flex mb-1 mt-1 justify-center items-center px-3 py-2 relative">
            <span className="text-gray-700 text-[10px] absolute right-1/10">{tip}</span>
            <Handle
                type="source"
                id={id}
                position={Position.Right}
                className={`!w-3 !h-3 rounded-full absolute right-[-7px] top-1/2 shadow-sm ${className}`}
            />
        </div>
    );
}