import type { Node, Edge } from "@xyflow/react";

// Maps node IDs to their generated variable name
const varMap = new Map<string, string>();
let varCounter = 0;

function getVar(nodeId: string): string {
  if (!varMap.has(nodeId)) {
    varMap.set(nodeId, `var_${varCounter++}`);
  }
  return varMap.get(nodeId)!;
}

function resolveInput(nodes: Node[], edges: Edge[], nodeId: string, handleId: string): string | null {
  const edge = edges.find((e) => e.target === nodeId && e.targetHandle === handleId);
  if (!edge) {
    // Try to find default data from the node itself
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    // For nodes like ArithmeticNode with two inputs, we can't resolve without edge
    return null;
  }
  return getVar(edge.source);
}

function escapePy(val: string): string {
  // Try to parse as number; if works, return as-is, else quote
  const trimmed = val.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  if (trimmed === "True" || trimmed === "False" || trimmed === "None") return trimmed;
  return JSON.stringify(trimmed);
}

function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    const from = e.source;
    const to = e.target;
    if (!adj.has(from)) {
      adj.set(from, []);
      inDegree.set(from, 0);
    }
    if (!adj.has(to)) {
      adj.set(to, []);
      inDegree.set(to, 0);
    }
    adj.get(from)!.push(to);
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: Node[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const node = nodes.find((n) => n.id === cur);
    if (node) sorted.push(node);
    for (const next of adj.get(cur) ?? []) {
      const newDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }
  return sorted;
}

function getHandleValue(edges: Edge[], targetNodeId: string, handleId: string, nodes: Node[]): string | null {
  const edge = edges.find((e) => e.target === targetNodeId && e.targetHandle === handleId);
  if (edge) {
    return getVar(edge.source);
  }
  return null;
}

export function generatePython(nodes: Node[], edges: Edge[]): string {
  varMap.clear();
  varCounter = 0;

  // Filter to only Programming-related nodes (and Output nodes that connect to them)
  const progTypes = new Set([
    "ValueNode", "PrintNode", "ArithmeticNode", "CompareNode",
    "VariableNode", "IfNode", "LoopNode",
    "OutputNode", "NumberOutputNode",
    "SignalSenderNode", "SignalSubscriberNode",
    "OpenSocketQuerierNode", "OpenSocketResponserNode",
  ]);
  const progNodes = nodes.filter((n) => progTypes.has(n.type ?? ""));
  if (progNodes.length === 0) return "# 请先添加程序设计节点";

  const progNodeIds = new Set(progNodes.map((n) => n.id));
  const progEdges = edges.filter(
    (e) => progNodeIds.has(e.source) && progNodeIds.has(e.target),
  );

  const sorted = topologicalSort(progNodes, progEdges);
  const lines: string[] = [];
  let indent = 0;

  function emit(code: string) {
    lines.push("    ".repeat(indent) + code);
  }

  for (const node of sorted) {
    const nodeData = node.data || {};

    switch (node.type) {
      case "ValueNode": {
        const val = escapePy((nodeData as any).value ?? "0");
        const label = (nodeData as any).label ?? "value";
        const v = getVar(node.id);
        if (label && label !== "value") {
          emit(`${label.replace(/[^a-zA-Z0-9_]/g, "_")} = ${val}`);
        } else {
          emit(`${v} = ${val}`);
        }
        break;
      }

      case "VariableNode": {
        const name = (nodeData as any).name ?? "x";
        const input = getHandleValue(progEdges, node.id, "i-var", progNodes);
        const val = input ?? "None";
        emit(`${name.replace(/[^a-zA-Z0-9_]/g, "_")} = ${val}`);
        break;
      }

      case "ArithmeticNode": {
        const op = (nodeData as any).op ?? "+";
        const a = getHandleValue(progEdges, node.id, "i-a", progNodes);
        const b = getHandleValue(progEdges, node.id, "i-b", progNodes);
        const lhs = a ?? "0";
        const rhs = b ?? "0";
        const v = getVar(node.id);
        emit(`${v} = ${lhs} ${op} ${rhs}`);
        break;
      }

      case "CompareNode": {
        const op = (nodeData as any).op ?? "==";
        const a = getHandleValue(progEdges, node.id, "i-a", progNodes);
        const b = getHandleValue(progEdges, node.id, "i-b", progNodes);
        const lhs = a ?? "None";
        const rhs = b ?? "None";
        const v = getVar(node.id);
        emit(`${v} = ${lhs} ${op} ${rhs}`);
        break;
      }

      case "PrintNode": {
        const input = getHandleValue(progEdges, node.id, "i-print", progNodes);
        // Check for custom message in node data (stored via local state — not persisted)
        // We'll check if there's a connected input; otherwise try to find a custom message
        const val = input ?? JSON.stringify("Hello");
        emit(`print(${val})`);
        break;
      }

      case "LoopNode": {
        const start = getHandleValue(progEdges, node.id, "i-start", progNodes) ?? "0";
        const end = getHandleValue(progEdges, node.id, "i-end", progNodes) ?? "10";
        const bodyVal = getHandleValue(progEdges, node.id, "i-body", progNodes);
        const v = getVar(node.id);
        emit(`for ${v} in range(int(${start}), int(${end})):`);
        indent++;
        if (bodyVal) {
          emit(`print(${bodyVal})`);
        } else {
          emit(`print(${v})`);
        }
        indent--;
        break;
      }

      case "IfNode": {
        const cond = getHandleValue(progEdges, node.id, "i-condition", progNodes) ?? "True";
        const trueVal = getHandleValue(progEdges, node.id, "i-true", progNodes);
        const falseVal = getHandleValue(progEdges, node.id, "i-false", progNodes);
        emit(`if ${cond}:`);
        indent++;
        if (trueVal) {
          emit(`print(${trueVal})`);
        } else {
          emit("pass");
        }
        indent--;
        if (falseVal) {
          emit("else:");
          indent++;
          emit(`print(${falseVal})`);
          indent--;
        }
        break;
      }

      case "SignalSenderNode": {
        const appId = (nodeData as any).appId ?? "MyApp";
        const signalId = (nodeData as any).signalId ?? "my_signal";
        const input = getHandleValue(progEdges, node.id, "i-data", progNodes) ?? "''";
        emit(`sender_${node.id.slice(0, 6)} = SignalSender("${appId}", "${signalId}")`);
        emit(`time.sleep(0.3)`);
        emit(`sender_${node.id.slice(0, 6)}.emitt(str(${input}))`);
        break;
      }

      case "SignalSubscriberNode": {
        const appId = (nodeData as any).appId ?? "MyApp";
        const signalId = (nodeData as any).signalId ?? "my_signal";
        const v = getVar(node.id);
        emit(`# 订阅信号: ${appId}/${signalId}`);
        emit(`${v}_data = []`);
        emit(`sub_${node.id.slice(0, 6)} = SignalSubscriber("${appId}", "${signalId}")`);
        emit(`sub_${node.id.slice(0, 6)}.setRecvFunc(lambda d: ${v}_data.append(d))`);
        emit(`# 收到数据后 ${v}_data 会被填充`);
        break;
      }

      case "OpenSocketQuerierNode": {
        const appId = (nodeData as any).appId ?? "MyApp";
        const socketId = (nodeData as any).socketId ?? "my_service";
        const query = getHandleValue(progEdges, node.id, "i-query", progNodes) ?? "''";
        const v = getVar(node.id);
        emit(`querier_${node.id.slice(0, 6)} = OpenSocketQuerier("${appId}", "${socketId}")`);
        emit(`time.sleep(0.3)`);
        emit(`${v} = querier_${node.id.slice(0, 6)}.querySync(str(${query}))`);
        break;
      }

      case "OpenSocketResponserNode": {
        const appId = (nodeData as any).appId ?? "MyApp";
        const socketId = (nodeData as any).socketId ?? "my_service";
        const reply = getHandleValue(progEdges, node.id, "i-request", progNodes) ?? "''";
        emit(`responser_${node.id.slice(0, 6)} = OpenSocketResponser("${appId}", "${socketId}")`);
        emit(`def on_request_${node.id.slice(0, 6)}(qid, req_data):`);
        indent++;
        emit(`reply = str(${reply})`);
        emit(`responser_${node.id.slice(0, 6)}.sendBack(reply, qid)`);
        indent--;
        emit(`responser_${node.id.slice(0, 6)}.on('request', on_request_${node.id.slice(0, 6)})`);
        break;
      }

      default:
        // Skip non-programming nodes
        break;
    }
  }

  const result = lines.join("\n") || "# 无代码生成";

  // Add imports if KnotLink nodes are used
  const hasKnotLink = progNodes.some((n) =>
    ["SignalSenderNode", "SignalSubscriberNode", "OpenSocketQuerierNode", "OpenSocketResponserNode"].includes(n.type ?? "")
  );
  if (hasKnotLink) {
    const klImports: string[] = [];
    if (progNodes.some((n) => n.type === "SignalSenderNode")) klImports.push("SignalSender");
    if (progNodes.some((n) => n.type === "SignalSubscriberNode")) klImports.push("SignalSubscriber");
    if (progNodes.some((n) => n.type === "OpenSocketQuerierNode")) klImports.push("OpenSocketQuerier");
    if (progNodes.some((n) => n.type === "OpenSocketResponserNode")) klImports.push("OpenSocketResponser");
    const header = `import time\nfrom knotlink import ${klImports.join(", ")}\n\ntime.sleep(0.8)  # 等待连接建立\n\n`;
    return header + result;
  }

  return result;
}
