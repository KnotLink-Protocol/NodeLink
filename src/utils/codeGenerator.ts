import type { Node, Edge } from "@xyflow/react";
import { parseAllFuncLists, findFunc, type OpenSocketFunc, type SignalFunc, type StaticArg, type OptionalArg, type InputArg } from "./funcListParser";

const allApps = parseAllFuncLists();

// Node → variable name mapping
const varMap = new Map<string, string>();
let varCounter = 0;

// 清洗 nodeId 为合法 Python 变量名
function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function getVar(nodeId: string): string {
  if (!varMap.has(nodeId)) {
    varMap.set(nodeId, `var_${varCounter++}`);
  }
  return varMap.get(nodeId)!;
}

function escapePy(val: string): string {
  const trimmed = val.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  if (trimmed === "True" || trimmed === "False" || trimmed === "None") return trimmed;
  return JSON.stringify(trimmed);
}

function getHandleValue(edges: Edge[], targetNodeId: string, handleId: string): string | null {
  const edge = edges.find((e) => e.target === targetNodeId && e.targetHandle === handleId);
  if (edge) {
    // 先尝试字段级变量 (funcList 多输出节点: nodeId-field)
    if (edge.sourceHandle) {
      const fieldKey = `${edge.source}-${edge.sourceHandle.replace("o-", "")}`;
      if (varMap.has(fieldKey)) return getVar(fieldKey);
    }
    // 回退到节点级变量 (ValueNode 等单输出节点)
    return getVar(edge.source);
  }
  return null;
}

function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) { inDegree.set(n.id, 0); adj.set(n.id, []); }
  for (const e of edges) {
    if (!adj.has(e.source)) { adj.set(e.source, []); inDegree.set(e.source, 0); }
    if (!adj.has(e.target)) { adj.set(e.target, []); inDegree.set(e.target, 0); }
    adj.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) { if (deg === 0) queue.push(id); }
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

export function generatePython(nodes: Node[], edges: Edge[]): string {
  varMap.clear();
  varCounter = 0;

  const progTypes = new Set([
    // old Programming nodes
    "ValueNode", "PrintNode", "ArithmeticNode", "CompareNode",
    "VariableNode", "IfNode", "LoopNode",
    "OutputNode", "NumberOutputNode",
    // low-level KnotLink
    "SignalSenderNode", "SignalSubscriberNode",
    "OpenSocketQuerierNode", "OpenSocketResponserNode",
  ]);

  // Filter nodes
  const isFuncListNode = (t: string | undefined) => (t ?? "").startsWith("funcList:");
  const progNodes = nodes.filter((n) => progTypes.has(n.type ?? "") || isFuncListNode(n.type));
  if (progNodes.length === 0) return "# 请先添加节点";

  const progNodeIds = new Set(progNodes.map((n) => n.id));
  const progEdges = edges.filter(
    (e) => progNodeIds.has(e.source) && progNodeIds.has(e.target),
  );

  const sorted = topologicalSort(progNodes, progEdges);
  const lines: string[] = [];
  let indent = 0;
  let needKLKVMap = false;
  let needQuerier = false;
  let needSubscriber = false;
  let needSignalSender = false;

  function emit(code: string) { lines.push("    ".repeat(indent) + code); }

  for (const node of sorted) {
    const nodeData = node.data || {};

    // ── funcList 动态节点 ──
    if (isFuncListNode(node.type)) {
      const folder: string = nodeData.folder ?? "";
      const funcName: string = nodeData.funcName ?? "";
      const func = findFunc(allApps, folder, funcName);
      const argValues: Record<string, string> = nodeData.argValues ?? {};

      if (!func) continue;

      if (func.funcType === "openSocket") {
        const of = func as OpenSocketFunc;
        needKLKVMap = true;
        needQuerier = true;

        // 构建 KLKVMap
        emit(`# ${func.description}`);
        const kvName = `kv_${safeId(node.id).slice(0, 8)}`;
        emit(`${kvName} = KLKVMap()`);

        for (const [argName, arg] of Object.entries(of.args)) {
          if (arg.type === "static") {
            const sa = arg as StaticArg;
            emit(`${kvName}["${argName}"] = ${escapePy(sa.value)}`);
          } else if (arg.type === "optional") {
            const val = argValues[argName] ?? (arg as any).defaultVal ?? "";
            emit(`${kvName}["${argName}"] = ${escapePy(val)}`);
          } else {
            // input — from upstream edge or defaultVal
            const upstream = getHandleValue(progEdges, node.id, `i-${argName}`);
            const val = upstream ?? escapePy((arg as InputArg).defaultVal ?? "");
            emit(`${kvName}["${argName}"] = str(${val})`);
          }
        }

        // 查询
        const qName = `q_${safeId(node.id).slice(0, 8)}`;
        emit(`${qName} = OpenSocketQuerier("${of.appID}", "${of.openSocketID}")`);
        emit(`time.sleep(0.3)`);
        const resultV = getVar(node.id);
        emit(`${resultV}_raw = ${qName}.query(${kvName}.serialize())`);

        // 解析返回值
        if (of.returns.length > 0) {
          const retMap = `ret_${safeId(node.id).slice(0, 8)}`;
          emit(`${retMap} = KLKVMap()`);
          emit(`${retMap}.deserialize(${resultV}_raw)`);
          for (const [, field] of of.returns) {
            const fieldV = getVar(`${node.id}-${field}`);
            emit(`${fieldV} = ${retMap}.get("${field}")`);
            // Map the return field to a predictable var for downstream edges
            // We need a mapping: handle o-<field> → variable
            // getHandleValue looks for edges with sourceHandle=o-field
            // But we assign vars per node+field combo
            // Store as var so getHandleValue can use it
          }
        }
      }

      if (func.funcType === "signal") {
        const sf = func as SignalFunc;
        needKLKVMap = true;
        needSubscriber = true;

        emit(`# 订阅信号: ${sf.appID}/${sf.signalID}`);
        emit(`# ${sf.description}`);
        const subV = `sub_${safeId(node.id).slice(0, 8)}`;
        emit(`${subV} = SignalSubscriber("${sf.appID}", "${sf.signalID}")`);

        // 为每个 return 字段分配变量
        for (const [field, info] of Object.entries(sf.returns)) {
          const fieldV = getVar(`${node.id}-${field}`);
          emit(`${fieldV} = [None]  # 信号数据: ${info.description}`);
        }

        // 回调函数
        emit(`def on_signal_${safeId(node.id).slice(0, 8)}(data):`);
        indent++;
        const rMap = `r_${safeId(node.id).slice(0, 8)}`;
        emit(`${rMap} = KLKVMap()`);
        emit(`${rMap}.deserialize(data)`);
        for (const [field] of Object.entries(sf.returns)) {
          const fieldV = getVar(`${node.id}-${field}`);
          emit(`${fieldV}[0] = ${rMap}.get("${field}")`);
        }
        indent--;
        emit(`${subV}.set_RecvFunc(on_signal_${safeId(node.id).slice(0, 8)})`);
        emit(`# 注意: 信号异步到达，${node.id.slice(0,6)}_* 变量在回调中更新`);
      }
      continue;
    }

    // ── 原有节点类型 ──
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
        const input = getHandleValue(progEdges, node.id, "i-var");
        const val = input ?? "None";
        emit(`${name.replace(/[^a-zA-Z0-9_]/g, "_")} = ${val}`);
        break;
      }
      case "ArithmeticNode": {
        const op = (nodeData as any).op ?? "+";
        const a = getHandleValue(progEdges, node.id, "i-a") ?? "0";
        const b = getHandleValue(progEdges, node.id, "i-b") ?? "0";
        const v = getVar(node.id);
        emit(`${v} = ${a} ${op} ${b}`);
        break;
      }
      case "CompareNode": {
        const op = (nodeData as any).op ?? "==";
        const a = getHandleValue(progEdges, node.id, "i-a") ?? "None";
        const b = getHandleValue(progEdges, node.id, "i-b") ?? "None";
        const v = getVar(node.id);
        emit(`${v} = ${a} ${op} ${b}`);
        break;
      }
      case "PrintNode": {
        const input = getHandleValue(progEdges, node.id, "i-print");
        emit(`print(${input ?? JSON.stringify("Hello")})`);
        break;
      }
      case "LoopNode": {
        const start = getHandleValue(progEdges, node.id, "i-start") ?? "0";
        const end = getHandleValue(progEdges, node.id, "i-end") ?? "10";
        const bodyVal = getHandleValue(progEdges, node.id, "i-body");
        const v = getVar(node.id);
        emit(`for ${v} in range(int(${start}), int(${end})):`);
        indent++;
        emit(bodyVal ? `print(${bodyVal})` : `print(${v})`);
        indent--;
        break;
      }
      case "IfNode": {
        const cond = getHandleValue(progEdges, node.id, "i-condition") ?? "True";
        const trueVal = getHandleValue(progEdges, node.id, "i-true");
        const falseVal = getHandleValue(progEdges, node.id, "i-false");
        emit(`if ${cond}:`);
        indent++;
        emit(trueVal ? `print(${trueVal})` : "pass");
        indent--;
        if (falseVal) { emit("else:"); indent++; emit(`print(${falseVal})`); indent--; }
        break;
      }
      case "SignalSenderNode": {
        needSignalSender = true;
        const appId = (nodeData as any).appId ?? "MyApp";
        const signalId = (nodeData as any).signalId ?? "my_signal";
        const input = getHandleValue(progEdges, node.id, "i-data") ?? "''";
        const sn = `sender_${safeId(node.id).slice(0, 8)}`;
        emit(`${sn} = SignalSender("${appId}", "${signalId}")`);
        emit(`time.sleep(0.3)`);
        emit(`${sn}.emitt(str(${input}))`);
        break;
      }
      case "SignalSubscriberNode": {
        needSubscriber = true;
        const appId = (nodeData as any).appId ?? "MyApp";
        const signalId = (nodeData as any).signalId ?? "my_signal";
        const v = getVar(node.id);
        emit(`# 订阅: ${appId}/${signalId}`);
        emit(`${v}_data = []`);
        const sn = `sub_${safeId(node.id).slice(0, 8)}`;
        emit(`${sn} = SignalSubscriber("${appId}", "${signalId}")`);
        emit(`${sn}.set_RecvFunc(lambda d: ${v}_data.append(d))`);
        break;
      }
      case "OpenSocketQuerierNode": {
        needQuerier = true;
        needKLKVMap = true;
        const appId = (nodeData as any).appId ?? "MyApp";
        const socketId = (nodeData as any).socketId ?? "my_service";
        const query = getHandleValue(progEdges, node.id, "i-query") ?? "''";
        const v = getVar(node.id);
        const qn = `querier_${safeId(node.id).slice(0, 8)}`;
        emit(`${qn} = OpenSocketQuerier("${appId}", "${socketId}")`);
        emit(`time.sleep(0.3)`);
        emit(`${v} = ${qn}.query(str(${query}))`);
        break;
      }
      case "OpenSocketResponserNode": {
        needSubscriber = true;
        const appId = (nodeData as any).appId ?? "MyApp";
        const socketId = (nodeData as any).socketId ?? "my_service";
        const reply = getHandleValue(progEdges, node.id, "i-request") ?? "''";
        const rn = `responser_${safeId(node.id).slice(0, 8)}`;
        emit(`${rn} = OpenSocketResponser("${appId}", "${socketId}")`);
        emit(`def on_req_${safeId(node.id).slice(0, 8)}(data):`);
        indent++;
        emit(`# data 格式: questionID&*&requestData`);
        emit(`qid, req_data = data.split("&*&", 1)`);
        emit(`reply = str(${reply})`);
        emit(`${rn}.sendBack(reply, qid)`);
        indent--;
        emit(`${rn}.set_RecvFunc(on_req_${safeId(node.id).slice(0, 8)})`);
        break;
      }
    }
  }

  const result = lines.join("\n") || "# 无代码生成";

  // Build imports
  const imports: string[] = ["import time"];
  const klImports: string[] = [];
  if (needKLKVMap) klImports.push("KLKVMap");
  if (needQuerier) klImports.push("OpenSocketQuerier");
  if (needSubscriber) klImports.push("SignalSubscriber");
  if (needSignalSender) klImports.push("SignalSender");

  if (klImports.length > 0) {
    imports.push(`from knotlink import ${klImports.join(", ")}`);
  }

  const header = imports.join("\n") + "\n\ntime.sleep(0.5)  # 等待连接建立\n\n";
  return header + result;
}
