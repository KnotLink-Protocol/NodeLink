import React, { useState, useEffect } from 'react';
import { parseAllFuncLists, makeNodeType, getDynamicApps, clearDynamicApps, unregisterDynamicApp, type AppDefinition } from '../../utils/funcListParser';

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

// ── 折叠区组件 ──
function CollapseSection({ title, icon, defaultOpen = false, children }: {
  title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors cursor-pointer select-none"
      >
        <span className="text-[10px] text-gray-400">{open ? '▼' : '▶'}</span>
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          {icon} {title}
        </span>
      </button>
      {open && <div className="space-y-1.5 mt-1">{children}</div>}
    </div>
  );
}

export default function NavBar() {
  // 因为 dynamic apps 可能变化，不用 useMemo 缓存
  const [, forceUpdate] = useState(0);
  const apps = parseAllFuncLists();

  useEffect(() => {
    const handler = () => forceUpdate(v => v + 1);
    window.addEventListener('apps-changed', handler);
    return () => window.removeEventListener('apps-changed', handler);
  }, []);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="h-full bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-3">
        <h2 className="text-base font-semibold text-gray-800 mb-3">节点列表</h2>

        {/* ── 动态业务 App ── */}
        {apps.map((app: AppDefinition) => (
          <CollapseSection key={app.folder} title={app.appName} icon="📦">
            {app.functions.map((func) => {
              const nodeType = makeNodeType(app.folder, func.funcName);
              const label = func.funcType === 'signal' ? `📡 ${func.funcName}` : func.funcName;
              const color = func.funcType === 'signal' ? 'bg-green-500' : app.color;
              return (
                <div
                  key={nodeType}
                  draggable
                  onDragStart={(e) => onDragStart(e, nodeType)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all duration-200"
                  title={func.description}
                >
                  <div className={`${color} text-white text-[11px] font-semibold px-2 py-0.5 rounded mb-0.5 inline-block`}>
                    {label}
                  </div>
                  <div className="text-[9px] text-gray-400 truncate">{func.description}</div>
                </div>
              );
            })}
          </CollapseSection>
        ))}

        {/* ── 包管理器 ── */}
        {(() => {
          const dyn = getDynamicApps();
          if (dyn.length === 0) return null;
          return (
            <CollapseSection title="已加载功能包" icon="📦" defaultOpen={true}>
              {dyn.map((app) => (
                <div key={app.folder} className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-purple-200 px-2.5 py-1.5 text-[11px]">
                  <span className="text-gray-700 truncate flex-1">{app.appName}</span>
                  <button
                    onClick={() => unregisterDynamicApp(app.folder)}
                    className="text-red-400 hover:text-red-600 ml-1 text-xs px-1 shrink-0"
                    title="卸载"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => clearDynamicApps()}
                className="w-full text-center text-[10px] text-red-400 hover:text-red-600 mt-1 py-0.5"
              >
                全部卸载
              </button>
            </CollapseSection>
          );
        })()}

        {/* ── KnotLink 底层协议 ── */}
        <CollapseSection title="KnotLink 协议" icon="🔌" defaultOpen={false}>
          {knotLinkNodes.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all duration-200"
            >
              <div className={`${node.color} text-white text-[11px] font-semibold px-2 py-0.5 rounded mb-0.5 inline-block`}>
                {node.name}
              </div>
              <div className="text-[9px] text-gray-400">{node.type}</div>
            </div>
          ))}
        </CollapseSection>

        {/* ── Programming ── */}
        <CollapseSection title="Programming" icon="💻" defaultOpen={false}>
          {programmingNodes.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all duration-200"
            >
              <div className={`${node.color} text-white text-[11px] font-semibold px-2 py-0.5 rounded mb-0.5 inline-block`}>
                {node.name}
              </div>
              <div className="text-[9px] text-gray-400">{node.type}</div>
            </div>
          ))}
        </CollapseSection>

        {/* ── Test ── */}
        <CollapseSection title="Test" icon="🧪" defaultOpen={false}>
          {testNodes.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all duration-200"
            >
              <div className={`${node.color} text-white text-[11px] font-semibold px-2 py-0.5 rounded mb-0.5 inline-block`}>
                {node.name}
              </div>
              <div className="text-[9px] text-gray-400">{node.type}</div>
            </div>
          ))}
        </CollapseSection>
      </div>
    </div>
  );
}
