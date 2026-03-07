import NodeHeader from "../BaseNode/NodeHeader";
import OutputHandle from "../BaseNode/OutputHandle";
import {useNodesData, useReactFlow} from "@xyflow/react";
import {useCallback, useEffect, useState} from "react";

export default function Vector1Node({id}: { id: string }) {

    const {updateNodeData} = useReactFlow();
    const nodeData = useNodesData(id);
    // 1. 初始化本地 state，保证 input 可控
    const [value, setValue] = useState('0');
    // 2. 当节点数据变化时，同步到本地 state（首次渲染也会同步）
    useEffect(() => {
        if (nodeData?.data?.value) {
            setValue(nodeData.data.value as string);
        }
    }, [nodeData?.data?.value]);

    // 3. input 修改时，同时更新本地 state 和节点数据
    const onChange = useCallback((evt) => {
        const newValue = evt.target.value as string;
        setValue(newValue); // 更新 input 框
        updateNodeData(id, {value: newValue}); // 更新 React Flow 节点数据
    }, [updateNodeData, id]);

    return (
        <div className="relative w-30 bg-white border-gray-200 rounded-xl shadow-md font-sans">
            {/*顶部标题栏*/}
            <NodeHeader title="Vector1" className="bg-orange-500"/>
            {/* 输出 Handle 一行 */}
            <OutputHandle id="o-vector1" tip="Vector1" className="!bg-orange-500"/>
            {/* 参数部分 */}
            <div className="divide-y divide-gray-100 text-[10px]" >
                <div className="flex items-center justify-between px-3 py-2 relative">
                    <span className="text-gray-700">X</span>
                    <input
                        onChange={onChange}
                        defaultValue="0"
                        className="w-16 text-right border border-gray-300 rounded px-1 py-0.5"
                    />
                </div>
            </div>

        </div>
    );
}
