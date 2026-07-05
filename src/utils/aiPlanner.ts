import { parseAllFuncLists, type AppDefinition, type AppFunc, type OpenSocketFunc, type SignalFunc } from './funcListParser';
import type { Node, Edge } from '@xyflow/react';

interface AIPlan {
  nodes: Array<{
    id: string;
    folder: string;
    funcName: string;
    x: number;
    y: number;
    argValues?: Record<string, string>;
  }>;
  edges: Array<{
    source: string;
    sourceHandle: string;
    target: string;
    targetHandle: string;
  }>;
}

interface APIConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

// ── 构建 funcList 上下文 ──
function buildFuncListContext(): string {
  const apps = parseAllFuncLists();
  if (apps.length === 0) return '';

  const parts: string[] = ['当前可用的功能节点：', ''];

  for (const app of apps) {
    parts.push(`### ${app.appName} (folder: "${app.folder}")`);
    for (const func of app.functions) {
      if (func.funcType === 'openSocket') {
        const f = func as OpenSocketFunc;
        const argInfo = Object.entries(f.args)
          .map(([name, arg]) => {
            if (arg.type === 'static') return `${name}:固定值="${arg.value}"`;
            if (arg.type === 'optional') return `${name}:下拉[${arg.options.map(o => o[1]).join('|')}]`;
            return `${name}:输入`;
          })
          .join(', ');
        const retInfo = f.returns.map(r => r[1]).join(', ');
        parts.push(`- **${f.funcName}** | 输入:{${argInfo}} | 输出:{${retInfo}} | ${f.description}`);
      } else {
        const f = func as SignalFunc;
        const retFields = Object.keys(f.returns).join(', ');
        parts.push(`- 📡 **${f.funcName}** (信号订阅) | 触发后输出:{${retFields}} | ${f.description}`);
      }
    }
    parts.push('');
  }

  parts.push('连线规则：');
  parts.push('- 数据流：输出口(o-{字段}) → 输入口(i-{参数})');
  parts.push('- 触发流：输出口(o-trigger) → 触发口(i-trigger)');
  parts.push('- 信号订阅节点的输出口连到其他节点的触发口来触发执行');
  parts.push('- 节点左侧是输入，右侧是输出');
  parts.push('');

  return parts.join('\n');
}

// ── 系统提示词 ──
const SYSTEM_PROMPT = `你是一个自动化工作流编排助手。用户会用自然语言描述需求，你需要根据当前可用的功能节点，生成一个工作流方案。

你必须只返回 JSON，格式如下：
{
  "nodes": [
    {"id": "n1", "folder": "App文件夹名", "funcName": "函数名", "x": 100, "y": 100, "argValues": {"参数名": "值"}}
  ],
  "edges": [
    {"source": "n1", "sourceHandle": "o-name", "target": "n2", "targetHandle": "i-text"}
  ],
  "explanation": "用中文简短解释你的方案（一句话）"
}

规则：
1. folder 必须用上面节点列表里括号中的精确值，如"NamePicker"、"MultiTTS_Client"
2. 节点横向排列（x递增），每个节点间隔约250px，y保持约100以内避免重叠
3. 数据流连线：sourceHandle用"o-{字段名}"，targetHandle用"i-{参数名}"
4. 触发流连线：sourceHandle用"o-trigger"，targetHandle用"i-trigger"
5. 信号订阅节点作为起点时，不需要i-trigger输入
6. 只使用上述可用节点列表中的功能
7. 参数可选时，argValues可省略（使用默认值）`;

// ── 调用 LLM ──
async function callLLM(
  userPrompt: string,
  apiConfig: APIConfig,
): Promise<AIPlan & { explanation?: string }> {
  const funcListCtx = buildFuncListContext();
  if (!funcListCtx) throw new Error('没有可用的功能节点');

  const response = await fetch(apiConfig.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: apiConfig.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${funcListCtx}\n\n用户需求：${userPrompt}` },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // 提取 JSON（可能在 markdown code block 里）
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error(`AI 返回格式异常: ${content.slice(0, 200)}`);

  const plan = JSON.parse(jsonMatch[1]);
  if (!plan.nodes || !plan.edges) throw new Error('AI 返回缺少 nodes 或 edges');
  return plan;
}

// ── 应用方案到画布 ──
export function buildPlanNodesEdges(
  plan: AIPlan,
  existingNodes: Node[],
): { nodes: Node[]; edges: Edge[] } {
  const apps = parseAllFuncLists();

  const validIds = new Set<string>();
  const nodes: Node[] = [];
  for (const pn of plan.nodes) {
    const app = apps.find(a => a.folder === pn.folder);
    const func = app?.functions.find(f => f.funcName === pn.funcName);
    if (!func) {
      console.warn(`[AI] 跳过不存在的节点: ${pn.folder}/${pn.funcName}`);
      continue;
    }
    validIds.add(pn.id);
    nodes.push({
      id: pn.id,
      type: `funcList:${pn.folder}:${pn.funcName}`,
      position: { x: pn.x, y: pn.y },
      data: {
        folder: pn.folder,
        funcName: pn.funcName,
        argValues: pn.argValues ?? {},
      },
    });
  }

  const edges: Edge[] = plan.edges
    .filter(pe => validIds.has(pe.source) && validIds.has(pe.target))
    .map((pe, i) => ({
      id: `${pe.source}-${pe.target}-${i}`,
      source: pe.source,
      sourceHandle: pe.sourceHandle,
      target: pe.target,
      targetHandle: pe.targetHandle,
      type: pe.targetHandle === 'i-trigger' ? 'triggerEdge' : 'edgeButton',
      animated: pe.targetHandle !== 'i-trigger',
    }));

  return { nodes, edges };
}

// ── 主入口：规划工作流 ──
export async function planWorkflow(
  userPrompt: string,
  apiConfig: APIConfig,
): Promise<{ nodes: Node[]; edges: Edge[]; explanation: string }> {
  const plan = await callLLM(userPrompt, apiConfig);
  const result = buildPlanNodesEdges(plan, []);
  return { ...result, explanation: plan.explanation || '已生成工作流' };
}

// ── 存储/读取 API 配置 ──
const CONFIG_KEY = 'nodelink-ai-config';

export function loadAIConfig(): APIConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveAIConfig(config: any): void {
  if (config === null) {
    localStorage.removeItem(CONFIG_KEY);
  } else {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }
}

// Tauri 启动时从 exe 旁边的 ai-config.json 加载（Rust 命令）
export async function loadAIConfigFromFile(): Promise<APIConfig | null> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const raw: string | null = await invoke('read_ai_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg.endpoint && cfg.apiKey && cfg.model) {
        saveAIConfig(cfg);
        return cfg;
      }
    }
  } catch { /* 非 Tauri 或无文件 */ }
  return null;
}
