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
import { parseAllFuncLists, parseNodeType, makeNodeType } from '../../utils/funcListParser';
import { generatePython } from '../../utils/codeGenerator';

const connectionLineStyle = {stroke: 'black'};
const edgeOptions = {
    type: 'edgeButton',
    animated: true,
};
const edgeTypes: EdgeTypes = {
    edgeButton: EdgeWithButton,
};

// ── 解析 funcList 动态生成 nodeTypes ──
const allApps = parseAllFuncLists();
const dynamicNodeTypes: Record<string, any> = {};
for (const app of allApps) {
    for (const func of app.functions) {
        const nt = makeNodeType(app.folder, func.funcName);
        dynamicNodeTypes[nt] = FuncNode;
    }
}

const nodeTypes = {
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
    ...dynamicNodeTypes,
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
    const edgeReconnectSuccessful = useRef(true);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

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
        event.dataTransfer.dropEffect = 'move';
    }, []);
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            if (!reactFlowWrapper.current || !reactFlowInstance) {
                return;
            }

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            // 解析 funcList 类型
            const parsed = parseNodeType(type);
            const nodeData: any = parsed
                ? { folder: parsed.folder, funcName: parsed.funcName, argValues: {} }
                : (type === 'BSDFNode' ? { value: '#ffff11' } : {});

            const newNode = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: nodeData,
            };

            setNodes((nds) => nds.concat(newNode));
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

    // 导出工程文件
    const onExport = useCallback(() => {
        const data = JSON.stringify({ nodes, edges }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `knotlink-workspace-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [nodes, edges]);

    // 导入工程文件
    const fileRef = useRef<HTMLInputElement>(null);
    const onImportClick = useCallback(() => {
        fileRef.current?.click();
    }, []);
    const onImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result as string);
                if (data.nodes && data.edges) {
                    setNodes(data.nodes);
                    setEdges(data.edges);
                    setPyCode('');
                    setShowCode(false);
                } else {
                    alert('无效的工程文件：缺少 nodes 或 edges');
                }
            } catch {
                alert('文件解析失败，请检查 JSON 格式');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // 允许重复导入同一文件
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
                        title="从 JSON 文件导入工程"
                    >
                        📥 导入
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
                    accept=".json"
                    onChange={onImportFile}
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
