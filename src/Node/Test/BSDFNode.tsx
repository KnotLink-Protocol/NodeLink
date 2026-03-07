import {Handle, Position, useNodesData, useReactFlow} from "@xyflow/react";
import {useCallback, useEffect, useState} from "react";
import NodeHeader from "../BaseNode/NodeHeader";
import OutputHandle from "../BaseNode/OutputHandle";
import InputHandle from "../BaseNode/InputHandle";

export default function BSDFNode({id}: { id: string }) {

    const {updateNodeData} = useReactFlow();
    const nodeData = useNodesData(id);
    // 1. 初始化本地 state，保证 input 可控
    const [color, setColor] = useState('#000000');
    // 2. 当节点数据变化时，同步到本地 state（首次渲染也会同步）
    useEffect(() => {
        if (nodeData?.data?.value) {
            setColor(nodeData.data.value as string);
        }
    }, [nodeData?.data?.value]);

    // 3. input 修改时，同时更新本地 state 和节点数据
    const onChange = useCallback((evt) => {
        const newColor = evt.target.value as string;
        setColor(newColor); // 更新 input 框
        updateNodeData(id, {value: newColor}); // 更新 React Flow 节点数据
    }, [updateNodeData, id]);

    return (
        <div className="relative w-45 bg-white border-gray-200 rounded-xl shadow-md font-sans overflow-visible">
            {/* 顶部标题栏 */}
            <NodeHeader title="BSDF" className="bg-green-500"/>
            {/* 输出 Handle 一行 */}
            <OutputHandle id="o-bsdf" tip="BSDF" className="!bg-green-500"/>
            {/* 参数部分 */}
            <div className="divide-y divide-gray-100 text-[10px]">
                {/* 基础色 */}
                <div className="flex items-center justify-between px-3 py-2 relative">
                    {/*输入接口*/}
                    <InputHandle id="i-base-color" className="!bg-orange-500"/>
                    <span className="text-gray-700">基础色</span>
                    <input
                        type="color"
                        onChange={onChange}
                        value={color as string}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="border border-gray-300 rounded cursor-pointer"
                    />
                </div>

                {/* 粗糙度 */}
                <div className="flex items-center justify-between px-3 py-2 relative">
                    {/*输入接口*/}
                    <InputHandle id="i-roughness" className="!bg-green-500"/>
                    <span className="text-gray-700">粗糙度</span>
                    <input
                        min="0"
                        max="1"
                        step="0.1"
                        defaultValue="0.5"
                        className="w-20 border border-gray-300 rounded px-1 py-0.5 text-right"
                    />
                </div>

                {/* 法线 */}
                <div className="flex items-center justify-between px-3 py-2 relative">
                    {/*输入接口*/}
                    <InputHandle id="i-normal" className="!bg-purple-500"/>
                    <span className="text-gray-700">法线</span>
                </div>
            </div>

        </div>
    );
}
