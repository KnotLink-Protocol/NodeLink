import React, {useState, useCallback, useRef, useMemo, useEffect} from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    MiniMap,
    Controls,
    Background, reconnectEdge,
    Node,
    Edge,
    BackgroundVariant, EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import BSDFNode from '../Test/BSDFNode';
import Vector3Node from '../Input/Vector3Node';
import Vector1Node from '../Input/Vector1Node';
import OutputNode from '../Output/OutputNode';
import {NumberOutputNode} from '../Output/NumberOutputNode';
import { EdgeWithButton } from '../Edge/EdgeWithButton';
import ValueNode from '../Programming/ValueNode';
import PrintNode from '../Programming/PrintNode';
import ArithmeticNode from '../Programming/ArithmeticNode';
import CompareNode from '../Programming/CompareNode';
import VariableNode from '../Programming/VariableNode';
import IfNode from '../Programming/IfNode';
import LoopNode from '../Programming/LoopNode';
import SignalSenderNode from '../KnotLink/SignalSenderNode';
import SignalSubscriberNode from '../KnotLink/SignalSubscriberNode';
import OpenSocketQuerierNode from '../KnotLink/OpenSocketQuerierNode';
import OpenSocketResponserNode from '../KnotLink/OpenSocketResponserNode';
import FuncNode from '../FuncNode/FuncNode';
import { parseAllFuncLists, parseNodeType, makeNodeType, registerDynamicApp, clearDynamicApps, getDynamicApps } from '../../utils/funcListParser';
import { generatePython } from '../../utils/codeGenerator';
import { packKLN, unpackKLN } from '../../utils/klnPack';

const connectionLineStyle = {stroke: 'black'};
const edgeOptions = {
    type: 'edgeButton',
    animated: true,
};
const edgeTypes: EdgeTypes = {
    edgeButton: EdgeWithButton,
};

// ── 解析 funcList 动态生成 nodeTypes ──
const baseNodeTypes = {
    BSDFNode,
    Vector3Node,
    Vector1Node,
    OutputNode,
    NumberOutputNode,
    ValueNode,
    PrintNode,
    ArithmeticNode,
    CompareNode,
    VariableNode,
    IfNode,
    LoopNode,
    SignalSenderNode,
    SignalSubscriberNode,
    OpenSocketQuerierNode,
    OpenSocketResponserNode,
};

const STORAGE_KEY = 'nodegraph-workspace';

const DEFAULT_NODES: Node[] = [
    {
        id: 'ev-search',
        type: makeNodeType('Everything_node', 'search'),
        position: {x: 10, y: 30},
        data: { folder: 'Everything_node', funcName: 'search', argValues: { function: 'search', query: '*.txt', max_results: '10' } },
    },
    {
        id: 'msg-show',
        type: makeNodeType('MsgNotification', 'ShowMsg'),
        position: {x: 330, y: 30},
        data: { folder: 'MsgNotification', funcName: 'ShowMsg', argValues: { msgContext: '搜索结果来了!' } },
    },
    {
        id: 'np-pick',
        type: makeNodeType('NamePicker', 'pick'),
        position: {x: 10, y: 280},
        data: { folder: 'NamePicker', funcName: 'pick', argValues: { action: 'pick', type: 'single' } },
    },
    {
        id: 'tts-edge',
        type: makeNodeType('MultiTTS_Client', 'EdgeTTS'),
        position: {x: 330, y: 280},
        data: { folder: 'MultiTTS_Client', funcName: 'EdgeTTS', argValues: { TTS: 'EdgeTTS', text: '张三同学', rate: '+0%', volume: '+0%', voice: 'zh-CN-XiaoxiaoNeural' } },
    },
];

const DEFAULT_EDGES: Edge[] = [
    {id: 'ev-msg', source: 'ev-search', sourceHandle: 'o-files', target: 'msg-show', targetHandle: 'i-msgContext'},
    {id: 'np-tts', source: 'np-pick', sourceHandle: 'o-name', target: 'tts-edge', targetHandle: 'i-text'},
];

function loadWorkspace(): { nodes: Node[]; edges: Edge[] } {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    return { nodes: DEFAULT_NODES, edges: DEFAULT_EDGES };
}

function saveWorkspace(nodes: Node[], edges: Edge[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
    } catch {}
}

const saved = loadWorkspace();

export default function NodeGraph() {
    const [nodes, setNodes] = useState<Node[]>(saved.nodes);
    const [edges, setEdges] = useState<Edge[]>(saved.edges);
    const [appVersion, setAppVersion] = useState(0);
    const edgeReconnectSuccessful = useRef(true);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    // 动态计算 nodeTypes（appVersion 变化时重新计算）
    const nodeTypes = useMemo(() => {
        const all = parseAllFuncLists();
        const dyn: Record<string, any> = {};
        for (const app of all) {
            for (const func of app.functions) {
                dyn[makeNodeType(app.folder, func.funcName)] = FuncNode;
            }
        }
        return { ...baseNodeTypes, ...dyn };
    }, [appVersion]);

    const onNodesChange = useCallback(
        (changes: any) => setNodes((ns) => applyNodeChanges(changes, ns)),
        [],
    );

    const onEdgesChange = useCallback(
        (changes: any) => setEdges((es) => applyEdgeChanges(changes, es)),
        [],
    );

    const onConnect = useCallback(
        (params: any) => setEdges((es) => addEdge(params, es)),
        [],
    );
    const onReconnectStart = useCallback(() => {
        edgeReconnectSuccessful.current = false;
    }, []);

    const onReconnect = useCallback((oldEdge: any, newConnection: any) => {
        edgeReconnectSuccessful.current = true;
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    }, []);

    const onReconnectEnd = useCallback((_: any, edge: any) => {
        if (!edgeReconnectSuccessful.current) {
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        }
        edgeReconnectSuccessful.current = true;
    }, []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
    }, []);
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });
            const parsed = parseNodeType(type);
            const nodeData: any = parsed
                ? { folder: parsed.folder, funcName: parsed.funcName, argValues: {} }
                : (type === 'BSDFNode' ? { value: '#ffff11' } : {});
            setNodes((nds) => nds.concat([{
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: nodeData,
            }]));
        },
        [reactFlowInstance],
    );

    const [pyCode, setPyCode] = useState<string>('');
    const [showCode, setShowCode] = useState(false);

    const onGenerate = useCallback(() => {
        const code = generatePython(nodes, edges);
        setPyCode(code);
        setShowCode(true);
    }, [nodes, edges]);

    // 自动保存
    useEffect(() => {
        saveWorkspace(nodes, edges);
    }, [nodes, edges]);

    // 重置工作区
    const onReset = useCallback(() => {
        if (confirm('确定重置工作区？所有节点和连线将恢复为默认。')) {
            setNodes(DEFAULT_NODES);
            setEdges(DEFAULT_EDGES);
            setPyCode('');
            setShowCode(false);
        }
    }, []);

    // 导出工程文件 (.kln)
    const onExport = useCallback(async () => {
        const code = generatePython(nodes, edges);
        const dynamicApps: Record<string, any> = {};
        for (const app of getDynamicApps()) {
            const os: Record<string, any> = {};
            const sig: Record<string, any> = {};
            for (const f of app.functions) {
                if (f.funcType === "openSocket") {
                    os[f.funcName] = { appID: f.appID, openSocketID: f.openSocketID, description: f.description, args: f.args, returns: f.returns };
                } else {
                    sig[f.funcName] = { appID: f.appID, signalID: f.signalID, description: f.description, returns: f.returns };
                }
            }
            dynamicApps[app.folder] = { appName: app.appName, openSocket: os, signal: sig };
        }
        const blob = await packKLN({
            version: 1,
            name: 'KnotLink 工程',
            workspace: { nodes, edges },
            code: { python: code },
            apps: Object.keys(dynamicApps).length > 0 ? dynamicApps : undefined,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project-${new Date().toISOString().slice(0, 10)}.kln`;
        a.click();
        URL.revokeObjectURL(url);
    }, [nodes, edges]);

    // 导入工程文件 (.kln)
    const fileRef = useRef<HTMLInputElement>(null);
    const onImportClick = useCallback(() => {
        fileRef.current?.click();
    }, []);
    const onImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const project = await unpackKLN(file);
            setNodes(project.workspace.nodes);
            setEdges(project.workspace.edges);
            setPyCode(project.code?.python ?? '');
            setShowCode(!!project.code?.python);
            // 注册动态 apps
            clearDynamicApps();
            if (project.apps) {
                for (const [folder, funcList] of Object.entries(project.apps)) {
                    registerDynamicApp(folder, funcList);
                }
            }
            setAppVersion(v => v + 1);
            if (project.errors.length > 0) {
                console.warn('KLN 导入警告:', project.errors);
            }
        } catch (err: any) {
            alert(`导入失败: ${err.message}`);
        }
        e.target.value = '';
    }, []);

    // 加载功能包（仅添加 app 定义，不替换工作区）
    const pkgRef = useRef<HTMLInputElement>(null);
    const onLoadPkgClick = useCallback(() => {
        pkgRef.current?.click();
    }, []);
    const onLoadPkgFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            if (file.name.endsWith('.kln')) {
                // .kln 中只提取 apps
                const project = await unpackKLN(file);
                let count = 0;
                if (project.apps) {
                    for (const [folder, funcList] of Object.entries(project.apps)) {
                        if (registerDynamicApp(folder, funcList)) count++;
                    }
                }
                setAppVersion(v => v + 1);
                alert(`已加载 ${count} 个功能包`);
            } else if (file.name.endsWith('.json')) {
                // FuncList.json 直接注册
                const raw = JSON.parse(await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsText(file);
                }));
                // 用 appName 做 folder，去除特殊字符
                const folder = (raw.appName || file.name)
                    .replace(/\.json$/i, '')
                    .replace(/[^a-zA-Z0-9一-鿿_-]/g, '_');
                if (registerDynamicApp(folder, raw)) {
                    setAppVersion(v => v + 1);
                    alert(`已加载: ${raw.appName ?? folder}`);
                } else {
                    alert('功能包为空');
                }
            } else {
                alert('请选择 .kln 或 .json 文件');
            }
        } catch (err: any) {
            alert(`加载失败: ${err.message}`);
        }
        e.target.value = '';
    }, []);

    const rfStyle = {backgroundColor: '#FAFAFA'};

    return (
        <div className="h-full w-full flex flex-col" ref={reactFlowWrapper}>
            <div className="flex-1 relative">
                <ReactFlowProvider>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onReconnect={onReconnect}
                        onReconnectStart={onReconnectStart}
                        onReconnectEnd={onReconnectEnd}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        fitView
                        snapToGrid
                        deleteKeyCode={['Delete', 'Backspace']}
                        style={rfStyle}
                        autoPanOnNodeFocus={true}
                        defaultEdgeOptions={edgeOptions}
                        edgeTypes={edgeTypes}
                        connectionLineStyle={connectionLineStyle}
                    >
                        <MiniMap nodeStrokeWidth={3} zoomable pannable/>
                        <Background id="1" gap={10} color="#f1f1f1" variant={BackgroundVariant.Lines}/>
                        <Background id="2" gap={100} color="#ccc" variant={BackgroundVariant.Lines}/>
                        <Controls/>
                    </ReactFlow>
                </ReactFlowProvider>
                <button
                    onClick={onGenerate}
                    className="absolute top-3 right-3 z-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg transition-colors"
                >
                    ⚡ 生成 Python 代码
                </button>
                <div className="absolute top-3 right-52 z-10 flex gap-2">
                    <button
                        onClick={onExport}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg transition-colors"
                        title="导出工程为 JSON 文件"
                    >
                        📤 导出
                    </button>
                    <button
                        onClick={onImportClick}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg transition-colors"
                        title="从 .kln 文件导入完整工程"
                    >
                        📥 导入
                    </button>
                    <button
                        onClick={onLoadPkgClick}
                        className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg transition-colors"
                        title="加载功能包 FuncList.json（不覆盖工作区）"
                    >
                        📦 加载
                    </button>
                    <button
                        onClick={onReset}
                        className="bg-gray-500 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg transition-colors"
                        title="恢复默认工作区"
                    >
                        🔄 重置
                    </button>
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    accept=".kln"
                    onChange={onImportFile}
                    className="hidden"
                />
                <input
                    ref={pkgRef}
                    type="file"
                    accept=".kln,.json"
                    onChange={onLoadPkgFile}
                    className="hidden"
                />
            </div>
            {showCode && (
                <div className="h-1/4 max-h-64 border-t border-gray-300 bg-gray-900 flex flex-col">
                    <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800">
                        <span className="text-gray-300 text-xs font-mono">生成的 Python 代码</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { navigator.clipboard.writeText(pyCode); }}
                                className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded border border-gray-600 hover:border-gray-400 transition-colors"
                            >
                                📋 复制
                            </button>
                            <button
                                onClick={() => setShowCode(false)}
                                className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded border border-gray-600 hover:border-gray-400 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    <pre className="flex-1 overflow-auto p-4 text-green-400 text-xs font-mono whitespace-pre-wrap">
                        {pyCode}
                    </pre>
                </div>
            )}
        </div>
    );
}
