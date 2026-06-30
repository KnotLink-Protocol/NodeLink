import React, { useMemo } from 'react';
import { parseAllFuncLists, makeNodeType, type AppDefinition } from '../../utils/funcListParser';

// 底层协议节点
const knotLinkNodes = [
  { name: '信号发送', type: 'SignalSenderNode', color: 'bg-yellow-500' },
  { name: '信号订阅', type: 'SignalSubscriberNode', color: 'bg-lime-500' },
  { name: 'Socket请求', type: 'OpenSocketQuerierNode', color: 'bg-teal-500' },
  { name: 'Socket响应', type: 'OpenSocketResponserNode', color: 'bg-sky-500' },
];

const programmingNodes = [
  { name: 'Value', type: 'ValueNode', color: 'bg-emerald-500' },
  { name: 'Variable', type: 'VariableNode', color: 'bg-indigo-500' },
  { name: 'Arithmetic', type: 'ArithmeticNode', color: 'bg-amber-500' },
  { name: 'Compare', type: 'CompareNode', color: 'bg-rose-500' },
  { name: 'Print', type: 'PrintNode', color: 'bg-cyan-500' },
  { name: 'If / Else', type: 'IfNode', color: 'bg-red-500' },
  { name: 'For Loop', type: 'LoopNode', color: 'bg-violet-500' },
];

const testNodes = [
  { name: 'BSDF', type: 'BSDFNode', color: 'bg-green-500' },
  { name: 'Vector1', type: 'Vector1Node', color: 'bg-orange-500' },
  { name: 'Vector3', type: 'Vector3Node', color: 'bg-purple-500' },
  { name: 'Output', type: 'OutputNode', color: 'bg-blue-500' },
  { name: 'Number Output', type: 'NumberOutputNode', color: 'bg-blue-500' },
];

export default function NavBar() {
  const apps = useMemo(() => parseAllFuncLists(), []);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="h-full bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">节点列表</h2>

        {/* ── 动态业务 App ── */}
        {apps.map((app: AppDefinition) => (
          <div key={app.folder} className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2 px-2 uppercase tracking-wide">
              📦 {app.appName}
            </h3>
            <div className="space-y-2">
              {app.functions.map((func) => {
                const nodeType = makeNodeType(app.folder, func.funcName);
                const label = func.funcType === 'signal' ? `📡 ${func.funcName}` : func.funcName;
                const color = func.funcType === 'signal'
                  ? 'bg-green-500'
                  : app.color;
                return (
                  <div
                    key={nodeType}
                    draggable
                    onDragStart={(e) => onDragStart(e, nodeType)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all duration-200"
                    title={func.description}
                  >
                    <div className={`${color} text-white text-xs font-semibold px-2 py-1 rounded mb-1 inline-block`}>
                      {label}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 truncate">
                      {func.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── KnotLink 底层协议 ── */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2 px-2 uppercase tracking-wide">
            🔌 KnotLink 协议
          </h3>
          <div className="space-y-2">
            {knotLinkNodes.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className={`${node.color} text-white text-xs font-semibold px-2 py-1 rounded mb-1 inline-block`}>
                  {node.name}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">{node.type}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Programming ── */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2 px-2 uppercase tracking-wide">
            💻 Programming
          </h3>
          <div className="space-y-2">
            {programmingNodes.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className={`${node.color} text-white text-xs font-semibold px-2 py-1 rounded mb-1 inline-block`}>
                  {node.name}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">{node.type}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Test (原始节点) ── */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2 px-2 uppercase tracking-wide">
            🧪 Test
          </h3>
          <div className="space-y-2">
            {testNodes.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className={`${node.color} text-white text-xs font-semibold px-2 py-1 rounded mb-1 inline-block`}>
                  {node.name}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">{node.type}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
