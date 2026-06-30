import type { Node, Edge } from "@xyflow/react";
import { parseAllFuncLists, findFunc, type OpenSocketFunc, type SignalFunc, type StaticArg, type OptionalArg, type InputArg } from "./funcListParser";

const allApps = parseAllFuncLists();

const varMap = new Map<string, string>();
let varCounter = 0;

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
    if (edge.sourceHandle) {
      const fieldKey = `${edge.source}-${edge.sourceHandle.replace("o-", "")}`;
      if (varMap.has(fieldKey)) return getVar(fieldKey);
    }
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

// ── 判断被动源节点（无输入边 + 订阅/信号类型）───────────────────
function isPassiveSource(nodeType: string | undefined, nodeId: string, edges: Edge[]): boolean {
  const hasInput = edges.some((e) => e.target === nodeId);
  if (hasInput) return false;
  if (!nodeType) return false;
  if (nodeType === "SignalSubscriberNode") return true;
  if (nodeType === "OpenSocketResponserNode") return true;
  if (nodeType.startsWith("funcList:")) {
    const parsed = nodeType.match(/^funcList:(.+):(.+)$/);
    if (parsed) {
      const func = findFunc(allApps, parsed[1], parsed[2]);
      return func?.funcType === "signal";
    }
  }
  return false;
}

// ── BFS 下游 ──
function getDownstream(sourceId: string, nodes: Node[], edges: Edge[]): Set<string> {
  const down = new Set<string>();
  const queue = [sourceId];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const e of edges) {
      if (e.source === cur && !down.has(e.target)) {
        down.add(e.target);
        queue.push(e.target);
      }
    }
  }
  return down;
}

// ── 生成单个节点的核心逻辑（不含回调框架）──
interface Needs { klkv: boolean; querier: boolean; subscriber: boolean; sender: boolean; }
interface IndentRef { v: number; }

function genNodeCore(
  node: Node,
  progEdges: Edge[],
  emit: (s: string) => void,
  ind: IndentRef,
  needs: Needs,
) {
  const d = node.data || {};

  // funcList 节点
  if (node.type?.startsWith("funcList:")) {
    const folder: string = d.folder ?? "";
    const funcName: string = d.funcName ?? "";
    const func = findFunc(allApps, folder, funcName);
    const argValues: Record<string, string> = d.argValues ?? {};
    if (!func) return;

    if (func.funcType === "openSocket") {
      const of = func as OpenSocketFunc;
      needs.klkv = true; needs.querier = true;
      emit(`# ${func.description}`);
      const kv = `kv_${safeId(node.id).slice(0, 8)}`;
      emit(`${kv} = KLKVMap()`);
      for (const [an, arg] of Object.entries(of.args)) {
        if (arg.type === "static") {
          emit(`${kv}["${an}"] = ${escapePy((arg as StaticArg).value)}`);
        } else if (arg.type === "optional") {
          const v = argValues[an] ?? (arg as OptionalArg).defaultVal ?? "";
          emit(`${kv}["${an}"] = ${escapePy(v)}`);
        } else {
          const up = getHandleValue(progEdges, node.id, `i-${an}`);
          emit(`${kv}["${an}"] = str(${up ?? escapePy((arg as InputArg).defaultVal ?? "")})`);
        }
      }
      const qn = `q_${safeId(node.id).slice(0, 8)}`;
      emit(`${qn} = OpenSocketQuerier("${of.appID}", "${of.openSocketID}")`);
      emit(`time.sleep(0.3)`);
      const rv = getVar(node.id);
      emit(`${rv}_raw = ${qn}.query(${kv}.serialize())`);
      if (of.returns.length > 0) {
        const rm = `ret_${safeId(node.id).slice(0, 8)}`;
        emit(`${rm} = KLKVMap()`);
        emit(`${rm}.deserialize(${rv}_raw)`);
        for (const [, f] of of.returns) {
          emit(`${getVar(`${node.id}-${f}`)} = ${rm}.get("${f}")`);
        }
      }
    }
    // signal funcList 节点: 框架在 genCallbackCluster 里处理
    return;
  }

  // 普通节点
  switch (node.type) {
    case "ValueNode": {
      const val = escapePy((d as any).value ?? "0");
      const label = (d as any).label ?? "value";
      const v = getVar(node.id);
      if (label && label !== "value") {
        emit(`${label.replace(/[^a-zA-Z0-9_]/g, "_")} = ${val}`);
      } else { emit(`${v} = ${val}`); }
      break;
    }
    case "VariableNode": {
      const name = (d as any).name ?? "x";
      const input = getHandleValue(progEdges, node.id, "i-var");
      emit(`${name.replace(/[^a-zA-Z0-9_]/g, "_")} = ${input ?? "None"}`);
      break;
    }
    case "ArithmeticNode": {
      const op = (d as any).op ?? "+";
      const a = getHandleValue(progEdges, node.id, "i-a") ?? "0";
      const b = getHandleValue(progEdges, node.id, "i-b") ?? "0";
      emit(`${getVar(node.id)} = ${a} ${op} ${b}`);
      break;
    }
    case "CompareNode": {
      const op = (d as any).op ?? "==";
      const a = getHandleValue(progEdges, node.id, "i-a") ?? "None";
      const b = getHandleValue(progEdges, node.id, "i-b") ?? "None";
      emit(`${getVar(node.id)} = ${a} ${op} ${b}`);
      break;
    }
    case "PrintNode": {
      const input = getHandleValue(progEdges, node.id, "i-print");
      emit(`print(${input ?? JSON.stringify("Hello")})`);
      break;
    }
    case "LoopNode": {
      const s = getHandleValue(progEdges, node.id, "i-start") ?? "0";
      const e = getHandleValue(progEdges, node.id, "i-end") ?? "10";
      const bv = getHandleValue(progEdges, node.id, "i-body");
      emit(`for ${getVar(node.id)} in range(int(${s}), int(${e})):`);
      ind.v++; emit(bv ? `print(${bv})` : `print(${getVar(node.id)})`); ind.v--;
      break;
    }
    case "IfNode": {
      const c = getHandleValue(progEdges, node.id, "i-condition") ?? "True";
      const tv = getHandleValue(progEdges, node.id, "i-true");
      const fv = getHandleValue(progEdges, node.id, "i-false");
      emit(`if ${c}:`);
      ind.v++; emit(tv ? `print(${tv})` : "pass"); ind.v--;
      if (fv) { emit("else:"); ind.v++; emit(`print(${fv})`); ind.v--; }
      break;
    }
    case "SignalSenderNode": {
      needs.sender = true;
      const appId = (d as any).appId ?? "MyApp";
      const signalId = (d as any).signalId ?? "my_signal";
      const input = getHandleValue(progEdges, node.id, "i-data") ?? "''";
      const sn = `sender_${safeId(node.id).slice(0, 8)}`;
      emit(`${sn} = SignalSender("${appId}", "${signalId}")`);
      emit(`time.sleep(0.3)`);
      emit(`${sn}.emitt(str(${input}))`);
      break;
    }
    case "SignalSubscriberNode":
    case "OpenSocketResponserNode": {
      // 被动源 — 框架在 genCallbackCluster 处理
      if (node.type === "SignalSubscriberNode") needs.subscriber = true;
      else needs.subscriber = true;
      break;
    }
    case "OpenSocketQuerierNode": {
      needs.querier = true; needs.klkv = true;
      const appId = (d as any).appId ?? "MyApp";
      const socketId = (d as any).socketId ?? "my_service";
      const query = getHandleValue(progEdges, node.id, "i-query") ?? "''";
      const v = getVar(node.id);
      emit(`querier_${safeId(node.id).slice(0, 8)} = OpenSocketQuerier("${appId}", "${socketId}")`);
      emit(`time.sleep(0.3)`);
      emit(`${v} = querier_${safeId(node.id).slice(0, 8)}.query(str(${query}))`);
      break;
    }
  }
}

// ── 生成一个被动源的完整回调集群 ──
function genCallbackCluster(
  src: Node,
  downstreamIds: Set<string>,
  allSorted: Node[],
  progEdges: Edge[],
  emit: (s: string) => void,
  ind: IndentRef,
  needs: Needs,
  _lines: string[],
) {
  const d = src.data || {};
  const cbName = `on_${safeId(src.id).slice(0, 10)}`;

  // ── 1. 创建通信对象（回调外） ──
  if (src.type === "SignalSubscriberNode") {
    needs.subscriber = true;
    const appId = d.appId ?? "MyApp";
    const signalId = d.signalId ?? "my_signal";
    const sn = `sub_${safeId(src.id).slice(0, 8)}`;
    emit(`# 订阅信号: ${appId}/${signalId}`);
    emit(`${sn} = SignalSubscriber("${appId}", "${signalId}")`);
    emit("");
    emit(`def ${cbName}(data):`);
    ind.v = 1;
    emit(`${getVar(src.id)}_data = data  # 收到的数据`);
  } else if (src.type === "OpenSocketResponserNode") {
    needs.subscriber = true;
    const appId = d.appId ?? "MyApp";
    const socketId = d.socketId ?? "my_service";
    const reply = getHandleValue(progEdges, src.id, "i-request") ?? "''";
    const rn = `responser_${safeId(src.id).slice(0, 8)}`;
    emit(`# 响应服务: ${appId}/${socketId}`);
    emit(`${rn} = OpenSocketResponser("${appId}", "${socketId}")`);
    emit("");
    emit(`def ${cbName}(data):`);
    ind.v = 1;
    emit(`# data 格式: questionID&*&requestData`);
    emit(`qid, req_data = data.split("&*&", 1)`);
    emit(`reply = str(${reply})`);
    emit(`${rn}.sendBack(reply, qid)`);
  } else if (src.type?.startsWith("funcList:")) {
    const folder = d.folder ?? "";
    const funcName = d.funcName ?? "";
    const func = findFunc(allApps, folder, funcName);
    if (func?.funcType === "signal") {
      const sf = func as SignalFunc;
      needs.klkv = true; needs.subscriber = true;
      const sn = `sub_${safeId(src.id).slice(0, 8)}`;
      emit(`# 订阅信号: ${sf.appID}/${sf.signalID} — ${sf.description}`);
      emit(`${sn} = SignalSubscriber("${sf.appID}", "${sf.signalID}")`);
      emit("");
      emit(`def ${cbName}(data):`);
      ind.v = 1;
      const rm = `r_${safeId(src.id).slice(0, 8)}`;
      emit(`${rm} = KLKVMap()`);
      emit(`${rm}.deserialize(data)`);
      for (const [field, info] of Object.entries(sf.returns)) {
        emit(`${getVar(`${src.id}-${field}`)} = ${rm}.get("${field}")`);
      }

      // ── 校验（if not ... return 不匹配就跳过）──
      const verifications = Object.entries(sf.returns)
        .filter(([, info]) => info.verification)
        .map(([field, info]) => ({ field, expect: info.verification! }));
      if (verifications.length > 0) {
        const checks = verifications.map(
          (v) => `${getVar(`${src.id}-${v.field}`)} != ${escapePy(v.expect)}`,
        );
        emit(`if ${checks.join(" or ")}:`);
        ind.v++;
        emit("return");
        ind.v--;
      }
    }
  }

  // ── 2. 下游节点（嵌套在回调内）──
  const dsNodes = allSorted.filter((n) => downstreamIds.has(n.id));
  for (const dn of dsNodes) {
    genNodeCore(dn, progEdges, emit, ind, needs);
  }

  // ── 3. 注册回调 ──
  ind.v = 0;
  const prefix = safeId(src.id).slice(0, 8);
  if (src.type === "SignalSubscriberNode" || (src.type?.startsWith("funcList:"))) {
    emit(`sub_${prefix}.set_RecvFunc(${cbName})`);
  } else if (src.type === "OpenSocketResponserNode") {
    emit(`responser_${prefix}.set_RecvFunc(${cbName})`);
  }
  emit("");
}

// ════════════════════════════════════════════════════════
// 主入口
// ════════════════════════════════════════════════════════
export function generatePython(nodes: Node[], edges: Edge[]): string {
  varMap.clear();
  varCounter = 0;

  const progTypes = new Set([
    "ValueNode", "PrintNode", "ArithmeticNode", "CompareNode",
    "VariableNode", "IfNode", "LoopNode",
    "OutputNode", "NumberOutputNode",
    "SignalSenderNode", "SignalSubscriberNode",
    "OpenSocketQuerierNode", "OpenSocketResponserNode",
  ]);
  const isFuncListNode = (t: string | undefined) => (t ?? "").startsWith("funcList:");
  const progNodes = nodes.filter((n) => progTypes.has(n.type ?? "") || isFuncListNode(n.type));
  if (progNodes.length === 0) return "# 请先添加节点";

  const progNodeIds = new Set(progNodes.map((n) => n.id));
  const progEdges = edges.filter((e) => progNodeIds.has(e.source) && progNodeIds.has(e.target));

  // ── 阶段 1: 分类 ──
  const passiveSources: Node[] = [];
  const passiveDown = new Map<string, Set<string>>();
  const ctx = new Map<string, string | null>();

  for (const n of progNodes) {
    if (isPassiveSource(n.type, n.id, progEdges)) {
      passiveSources.push(n);
      const ds = getDownstream(n.id, progNodes, progEdges);
      passiveDown.set(n.id, ds);
      ctx.set(n.id, n.id);
      for (const d of ds) ctx.set(d, n.id);
    }
  }
  for (const n of progNodes) {
    if (!ctx.has(n.id)) ctx.set(n.id, null);
  }

  const lines: string[] = [];
  const ind: IndentRef = { v: 0 };
  const needs: Needs = { klkv: false, querier: false, subscriber: false, sender: false };
  function emit(s: string) { lines.push("    ".repeat(ind.v) + s); }

  const sorted = topologicalSort(progNodes, progEdges);

  // ── 阶段 2: 顶层节点 ──
  let topLines = 0;
  for (const node of sorted) {
    if (ctx.get(node.id) !== null) continue;
    genNodeCore(node, progEdges, emit, ind, needs);
    topLines++;
  }
  if (topLines > 0) emit("");

  // ── 阶段 3: 每个被动源 → 回调集群 ──
  for (const src of passiveSources) {
    genCallbackCluster(src, passiveDown.get(src.id) ?? new Set(), sorted, progEdges, emit, ind, needs, lines);
  }

  // ── 阶段 4: 保活 ──
  if (passiveSources.length > 0) {
    emit("# 保持进程存活，等待信号/请求");
    emit("try:");
    ind.v = 1; emit("while True:"); ind.v = 2;
    emit("time.sleep(1)");
    ind.v = 0;
    emit("except KeyboardInterrupt:");
    ind.v = 1; emit("pass");
  }

  const result = lines.join("\n") || "# 无代码生成";

  // Imports
  const imports: string[] = ["import time"];
  const kl: string[] = [];
  if (needs.klkv) kl.push("KLKVMap");
  if (needs.querier) kl.push("OpenSocketQuerier");
  if (needs.subscriber) kl.push("SignalSubscriber");
  if (needs.sender) kl.push("SignalSender");
  if (kl.length > 0) imports.push(`from knotlink import ${kl.join(", ")}`);

  return imports.join("\n") + "\n\ntime.sleep(0.5)  # 等待连接建立\n\n" + result;
}
