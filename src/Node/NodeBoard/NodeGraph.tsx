import React, {useState, useCallback, useRef} from 'react';
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
import { generatePython } from '../../utils/codeGenerator';

const connectionLineStyle = {stroke: 'black'};
const edgeOptions = {
    type: 'edgeButton',
    animated: true,
};
const edgeTypes: EdgeTypes = {
    edgeButton: EdgeWithButton,
};

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
};


export default function NodeGraph() {
    const [nodes, setNodes] = useState<Node[]>([
        {
            id: 'val-msg', type: 'ValueNode',
            position: {x: 0, y: 30},
            data: {value: '"你好 KnotLink"', label: 'msg'},
        },
        {
            id: 'sender', type: 'SignalSenderNode',
            position: {x: 200, y: 30},
            data: {appId: 'DemoApp', signalId: 'greeting'},
        },
        {
            id: 'subscriber', type: 'SignalSubscriberNode',
            position: {x: 500, y: 30},
            data: {appId: 'DemoApp', signalId: 'greeting'},
        },
        {
            id: 'print', type: 'PrintNode',
            position: {x: 750, y: 30},
            data: {},
        },
        // 第二行: Querier/Responser 请求-响应
        {
            id: 'val-req', type: 'ValueNode',
            position: {x: 0, y: 220},
            data: {value: '"ping"', label: 'req'},
        },
        {
            id: 'querier', type: 'OpenSocketQuerierNode',
            position: {x: 220, y: 220},
            data: {appId: 'DemoApp', socketId: 'echo'},
        },
        {
            id: 'print-resp', type: 'PrintNode',
            position: {x: 470, y: 220},
            data: {},
        },
        {
            id: 'responser', type: 'OpenSocketResponserNode',
            position: {x: 220, y: 390},
            data: {appId: 'DemoApp', socketId: 'echo'},
        },
        {
            id: 'val-reply', type: 'ValueNode',
            position: {x: 0, y: 390},
            data: {value: '"pong"', label: 'reply'},
        },
    ]);
    const [edges, setEdges] = useState<Edge[]>([
        // ── 上半部分: 信号 Pub/Sub ──
        {id: 'val-sender', source: 'val-msg', target: 'sender', targetHandle: 'i-data'},
        {id: 'sub-print', source: 'subscriber', target: 'print', targetHandle: 'i-print'},

        // ── 下半部分: 请求-响应 ──
        {id: 'val-querier', source: 'val-req', target: 'querier', targetHandle: 'i-query'},
        {id: 'querier-print', source: 'querier', target: 'print-resp', targetHandle: 'i-print'},
        // Responser 接收请求后,用 val-reply 的数据作为回复
        {id: 'val-resp', source: 'val-reply', target: 'responser', targetHandle: 'i-request'},
    ]);
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

    const onReconnect = useCallback((oldEdge, newConnection) => {
        edgeReconnectSuccessful.current = true;
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    }, []);

    const onReconnectEnd = useCallback((_, edge) => {
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

            const newNode = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: type === 'BSDFNode' ? {value: '#ffff11'} : {},
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

    const rfStyle = {backgroundColor: '#FAFAFA'};

    return (
        <div className="h-full w-full flex flex-col" ref={reactFlowWrapper}>
            {/* 画布区域 */}
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
                {/* 生成按钮 - 悬浮在右上角 */}
                <button
                    onClick={onGenerate}
                    className="absolute top-3 right-3 z-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg transition-colors"
                >
                    ⚡ 生成 Python 代码
                </button>
            </div>
            {/* 底部代码面板 */}
            {showCode && (
                <div className="h-1/4 max-h-64 border-t border-gray-300 bg-gray-900 flex flex-col">
                    <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800">
                        <span className="text-gray-300 text-xs font-mono">生成的 Python 代码</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(pyCode);
                                }}
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

