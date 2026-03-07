import { useNodeConnections, useNodesData} from "@xyflow/react";
import {useEffect, useState} from "react";
import NodeHeader from "../BaseNode/NodeHeader";
import InputHandle from "../BaseNode/InputHandle";


export function NumberOutputNode() {
    // 找出这个节点左侧输入口的连接
    const [Value, setValue] = useState(0);
    const connections = useNodeConnections({
        handleType: "target",
    });
    // 拿到连接的源节点数据（即前一个节点）
    const sourceNodeData = useNodesData(connections?.[0]?.source);
    useEffect(() => {
        setValue(sourceNodeData?.data?.value as number);
    }, [sourceNodeData?.data?.value]);

    return (
        <div className="relative min-w-6 bg-white border-gray-200 rounded-xl shadow-md font-sans overflow-visible">
            {/* 顶部标题栏 */}
            <NodeHeader title="Number Output" className="!bg-blue-500"/>
            {/* 输入 Handle 一行 */}
            <InputHandle id="i-number" className="!bg-orange-500"/>
            <div className="mx-auto h-20 p-2">
                <input
                    type="number"
                    readOnly={true}
                    defaultValue="0"
                    value={Value}
                    className="min-w-5 text-right border border-gray-300 rounded px-1 py-0.5"
                />
            </div>

        </div>
    );
}