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
import { TriggerEdge } from '../Edge/TriggerEdge';
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
import { parseAllFuncLists, parseNodeType, makeNodeType, registerDynamicApp, getDynamicApps, loadTauriFuncLists } from '../../utils/funcListParser';
import { generatePython } from '../../utils/codeGenerator';
import { packKLN, unpackKLN } from '../../utils/klnPack';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';

const connectionLineStyle = {stroke: 'black'};
const edgeOptions = {
    type: 'edgeButton',
    animated: true,
};
const edgeTypes: EdgeTypes = {
    edgeButton: EdgeWithButton,
    triggerEdge: TriggerEdge,
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

const DEFAULT_NODES: Node[] = [];
const DEFAULT_EDGES: Edge[] = [];

function saveWorkspace(nodes: Node[], edges: Edge[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
    } catch {}
}

export default function NodeGraph() {
    const [nodes, setNodes] = useState<Node[]>(DEFAULT_NODES);
    const [edges, setEdges] = useState<Edge[]>(DEFAULT_EDGES);
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
        (params: any) => {
            // 触发口 → 自动标记为触发边
            const isTrigger = params.targetHandle === 'i-trigger';
            const edge = {
                ...params,
                type: isTrigger ? 'triggerEdge' : 'edgeButton',
                animated: !isTrigger,
            };
            setEdges((es) => addEdge(edge, es));
        },
        [],
    );

    // 连线校验：只允许 output→input 或 output→trigger
    const isValidConnection = useCallback((conn: any) => {
        // 不能自己连自己
        if (conn.source === conn.target) return false;
        // 触发口只能接受任意输出
        if (conn.targetHandle === 'i-trigger') return true;
        // input 型参数口不能接受 trigger 输出（trigger 是执行流，不传数据）
        // 注：ReactFlow 已经阻止 source/target 同向连接
        return true;
    }, []);
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
    const [currentFile, setCurrentFile] = useState<string | null>(null);  // 保存路径（有写权限）
    const [displayName, setDisplayName] = useState<string | null>(null);  // 显示名称
    const [modified, setModified] = useState(false);
    const [showCode, setShowCode] = useState(false);

    const onGenerate = useCallback(() => {
        const code = generatePython(nodes, edges);
        setPyCode(code);
        setShowCode(true);
    }, [nodes, edges]);

    // Tauri: 启动时加载 funclist + 打开拖入的文件
    useEffect(() => {
        (async () => {
            await loadTauriFuncLists();
            setAppVersion(v => v + 1);
            // 检查是否有拖入/双击打开的文件
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const path: string | null = await invoke('get_startup_file');
                if (path) {
                    const data: number[] = await invoke('read_startup_file');
                    if (data) {
                        const uint8 = new Uint8Array(data);
                        const project = await unpackKLN(new File([new Blob([uint8])], path));
                        setNodes(project.workspace.nodes); setEdges(project.workspace.edges);
                        const fp_norm = path.replace(/\\/g, '/');
                        setCurrentFile(fp_norm);
                        setDisplayName(fp_norm.split('/').pop() || null);
                        setModified(false);
                        setPyCode(project.code?.python ?? ''); setShowCode(!!project.code?.python);
                        setAppVersion(v => v + 1);
                        localStorage.removeItem(STORAGE_KEY);
                    }
                }
            } catch (e) { console.error('[startup]', e); alert('打开文件失败: ' + String(e)); }
        })();
    }, []);

    // 自动保存 localStorage + 标记修改
    useEffect(() => {
        saveWorkspace(nodes, edges);
        setModified(true);
    }, [nodes, edges]);


    // 新建
    const onNew = useCallback(() => {
        if (nodes.length > 0 && !confirm('当前工作区未保存，确定新建？')) return;
        setNodes([]);
        setEdges([]);
        setPyCode('');
        setShowCode(false);
        setCurrentFile(null);
        setDisplayName(null);
        setModified(false);
        setAppVersion(v => v + 1);
    }, [nodes]);

    // 重置工作区
    const onReset = useCallback(() => {
        if (confirm('确定重置工作区？所有节点和连线将恢复为默认。')) {
            setNodes(DEFAULT_NODES);
            setEdges(DEFAULT_EDGES);
            setPyCode('');
            setShowCode(false);
            setCurrentFile(null);
setAppVersion(v => v + 1);
        }
    }, []);

    // ── 构建 kln 数据 ──
    const buildKLN = useCallback(async () => {
        const code = generatePython(nodes, edges);
        const aps: Record<string, any> = {};
        for (const app of getDynamicApps()) {
            const os: Record<string, any> = {}, sig: Record<string, any> = {};
            for (const f of app.functions) {
                if (f.funcType === "openSocket") os[f.funcName] = { appID: f.appID, openSocketID: f.openSocketID, description: f.description, args: f.args, returns: f.returns };
                else sig[f.funcName] = { appID: f.appID, signalID: f.signalID, description: f.description, returns: f.returns };
            }
            aps[app.folder] = { appName: app.appName, openSocket: os, signal: sig };
        }
        return await packKLN({ version: 1, name: 'KnotLink 工程', workspace: { nodes, edges }, code: { python: code }, apps: Object.keys(aps).length > 0 ? aps : undefined });
    }, [nodes, edges]);

    const norm = (p: string) => p.replace(/\\/g, '/');

    // ── 写入文件（先试 JS API，失败用 Rust 命令）──
    const writeFileSafe = async (path: string, buf: Uint8Array) => {
        try {
            await writeFile(path, buf);
        } catch {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('write_file', { path, data: Array.from(buf) });
        }
    };

    // ── 保存 ──
    const onSave = useCallback(async () => {
        try {
            let savePath = currentFile;
            if (!savePath) {
                savePath = await save({ filters: [{ name: 'KnotLink', extensions: ['kln'] }] });
                if (!savePath) return;
            }
            savePath = norm(savePath);
            const blob = await buildKLN();
            const buf = new Uint8Array(await blob.arrayBuffer());
            await writeFileSafe(savePath, buf);
            setCurrentFile(savePath);
            setDisplayName(savePath.split('/').pop() || null);
            setModified(false);
        } catch (err: any) {
            alert(`保存失败: ${err?.message || err}`);
        }
    }, [buildKLN, currentFile]);

    // ── 另存为 ──
    const onSaveAs = useCallback(async () => {
        try {
            const savePath = norm(await save({ filters: [{ name: 'KnotLink', extensions: ['kln'] }] }) || '');
            if (!savePath) return;
            const blob = await buildKLN();
            const buf = new Uint8Array(await blob.arrayBuffer());
            await writeFileSafe(savePath, buf);
            setCurrentFile(savePath);
            setDisplayName(savePath.split('/').pop() || null);
            setModified(false);
        } catch (err: any) {
            alert(`保存失败: ${err?.message || err}`);
        }
    }, [buildKLN]);

    // ── 打开 ──
    const fileRef = useRef<HTMLInputElement>(null);
    const onOpen = useCallback(async () => {
        try {
            const selected = await open({ filters: [{ name: 'KnotLink 工程', extensions: ['kln'] }], multiple: false });
            if (!selected) return;
            const fp = (typeof selected === 'string' ? selected : selected.path).replace(/\\/g, '/');
            const data = await readFile(fp);
            const project = await unpackKLN(new File([new Blob([data])], fp));
            setNodes(project.workspace.nodes); setEdges(project.workspace.edges);
            setCurrentFile(fp); setDisplayName(fp.split('/').pop() || null); setModified(false);
            setPyCode(project.code?.python ?? ''); setShowCode(!!project.code?.python);
            setAppVersion(v => v + 1);
        } catch {
            fileRef.current?.click();
        }
    }, []);
    const onOpenFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
            const project = await unpackKLN(file);
            setNodes(project.workspace.nodes); setEdges(project.workspace.edges);
            setCurrentFile(file.name); setDisplayName(file.name); setModified(false);
            setPyCode(project.code?.python ?? ''); setShowCode(!!project.code?.python);
            setAppVersion(v => v + 1);
        } catch (err: any) { alert(`打开失败: ${err.message}`); }
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
            if (file.name.endsWith('.json')) {
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
                        isValidConnection={isValidConnection}
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
                {/* ── 文件名 ── */}
                <div className="absolute top-3 left-3 z-10 bg-white/80 backdrop-blur text-gray-700 text-xs px-3 py-1.5 rounded shadow">
                    {displayName || '未命名工程.kln'}{modified ? ' *' : ''}
                </div>
                {/* ── 工具栏 ── */}
                <div className="absolute top-3 right-3 z-10 flex gap-2">
                    <button onClick={onNew} className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded shadow transition-colors" title="新建 (Ctrl+N)">📄 新建</button>
                    <button onClick={onOpen} className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded shadow transition-colors" title="打开 (Ctrl+O)">📂 打开</button>
                    <button onClick={onSave} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded shadow transition-colors" title="保存 (Ctrl+S)">💾 保存</button>
                    <button onClick={onSaveAs} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded shadow transition-colors" title="另存为...">💾 另存为...</button>
                    <button onClick={onLoadPkgClick} className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded shadow transition-colors" title="加载功能包">📦</button>
                    <div className="w-px bg-gray-400 mx-1" />
                    <button onClick={onGenerate} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded shadow transition-colors" title="生成代码 (Ctrl+G)">⚡ 生成</button>
                    <button onClick={() => setShowCode(v => !v)} className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded shadow transition-colors" title="切换代码面板 (Ctrl+`)">{showCode ? '🙈' : '👁'}</button>
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    accept=".kln"
                    onChange={onOpenFile}
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
