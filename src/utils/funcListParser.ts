// ── funcList 类型定义 ──

export interface StaticArg {
  type: "static";
  value: string;
  description: string;
}

export interface OptionalArg {
  type: "optional";
  options: [string, string][];
  defaultVal?: string;
  description: string;
}

export interface InputArg {
  type: "input";
  defaultVal?: string;
  description: string;
}

export type FuncArg = StaticArg | OptionalArg | InputArg;

export type ReturnEntry = [string, string];

export interface OpenSocketFunc {
  funcName: string;
  funcType: "openSocket";
  appID: string;
  openSocketID: string;
  description: string;
  args: Record<string, FuncArg>;
  returns: ReturnEntry[];
}

export interface SignalReturnField {
  description: string;
  verification?: string;
}

export interface SignalFunc {
  funcName: string;
  funcType: "signal";
  appID: string;
  signalID: string;
  description: string;
  returns: Record<string, SignalReturnField>;
}

export type AppFunc = OpenSocketFunc | SignalFunc;

export interface AppDefinition {
  appName: string;
  folder: string;
  color: string;
  functions: AppFunc[];
}

// ── 颜色表 ──
const COLORS = [
  "bg-teal-500", "bg-violet-500", "bg-rose-500",
  "bg-amber-500", "bg-sky-500", "bg-lime-500",
  "bg-pink-500", "bg-indigo-500",
];

let colorIdx = 0;
function nextColor(): string {
  return COLORS[colorIdx++ % COLORS.length];
}

// ── 应用注册表（唯一数据源）──
const dynamicApps: AppDefinition[] = [];

export function parseAllFuncLists(): AppDefinition[] {
  return [...dynamicApps];
}

// Tauri: 从 exe 目录 funclist/ 加载
export async function loadTauriFuncLists(): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const list: any[] = await invoke('get_funclists');
    dynamicApps.length = 0;
    for (const raw of list) {
      const folder = raw.__folder || 'unknown';
      const app = parseAppDefinition(folder, raw);
      if (app) dynamicApps.push(app);
    }
    bumpVersion();
  } catch { /* 浏览器环境 */ }
}

function parseAppDefinition(folder: string, raw: any): AppDefinition | null {
  const appName: string = raw.appName ?? folder;
  const color = nextColor();
  const functions: AppFunc[] = [];

  const os = raw.openSocket;
  if (os && typeof os === "object") {
    for (const [funcName, def] of Object.entries(os) as [string, any][]) {
      functions.push({
        funcName, funcType: "openSocket",
        appID: def.appID ?? "", openSocketID: def.openSocketID ?? "",
        description: def.description ?? "", args: def.args ?? {}, returns: def.returns ?? [],
      });
    }
  }
  const sig = raw.signal;
  if (sig && typeof sig === "object") {
    for (const [funcName, def] of Object.entries(sig) as [string, any][]) {
      functions.push({
        funcName, funcType: "signal",
        appID: def.appID ?? "", signalID: def.signalID ?? "",
        description: def.description ?? "", returns: def.returns ?? {},
      });
    }
  }
  return functions.length > 0 ? { appName, folder, color, functions } : null;
}

// 注册（📦加载 / .kln 导入）
export function registerDynamicApp(folder: string, raw: any): AppDefinition | null {
  const idx = dynamicApps.findIndex((a) => a.folder === folder);
  if (idx >= 0) dynamicApps.splice(idx, 1);

  const appName: string = raw.appName ?? folder;
  const functions: AppFunc[] = [];

  const os = raw.openSocket;
  if (os && typeof os === "object") {
    for (const [funcName, def] of Object.entries(os) as [string, any][]) {
      functions.push({
        funcName, funcType: "openSocket",
        appID: def.appID ?? "", openSocketID: def.openSocketID ?? "",
        description: def.description ?? "", args: def.args ?? {}, returns: def.returns ?? [],
      });
    }
  }
  const sig = raw.signal;
  if (sig && typeof sig === "object") {
    for (const [funcName, def] of Object.entries(sig) as [string, any][]) {
      functions.push({
        funcName, funcType: "signal",
        appID: def.appID ?? "", signalID: def.signalID ?? "",
        description: def.description ?? "", returns: def.returns ?? {},
      });
    }
  }

  if (functions.length === 0) return null;

  const app: AppDefinition = { appName, folder, color: "bg-pink-500", functions };
  dynamicApps.push(app);
  bumpVersion();
  return app;
}

// 卸载
export function unregisterDynamicApp(folder: string): boolean {
  const idx = dynamicApps.findIndex((a) => a.folder === folder);
  if (idx >= 0) {
    dynamicApps.splice(idx, 1);
    bumpVersion();
    return true;
  }
  return false;
}

// 版本号
let _appVersion = 0;
export function getAppVersion(): number { return _appVersion; }
function bumpVersion() { _appVersion++; window.dispatchEvent(new Event('apps-changed')); }

export function getDynamicApps(): AppDefinition[] {
  return [...dynamicApps];
}

// ── 节点类型命名 ──
export function makeNodeType(folder: string, funcName: string): string {
  return `funcList:${folder}:${funcName}`;
}

export function parseNodeType(nodeType: string): { folder: string; funcName: string } | null {
  const m = nodeType.match(/^funcList:(.+):(.+)$/);
  if (!m) return null;
  return { folder: m[1], funcName: m[2] };
}

// ── 查找函数定义 ──
export function findFunc(
  apps: AppDefinition[],
  folder: string,
  funcName: string,
): AppFunc | undefined {
  const app = apps.find((a) => a.folder === folder);
  return app?.functions.find((f) => f.funcName === funcName);
}
