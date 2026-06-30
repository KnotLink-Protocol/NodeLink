// ── funcList 类型定义 ──

export interface StaticArg {
  type: "static";
  value: string;
  description: string;
}

export interface OptionalArg {
  type: "optional";
  options: [string, string][]; // [显示文本, 值]
  defaultVal?: string;
  description: string;
}

export interface InputArg {
  type: "input";
  defaultVal?: string;
  description: string;
}

export type FuncArg = StaticArg | OptionalArg | InputArg;

export type ReturnEntry = [string, string]; // [描述, 字段名]

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

// ── 解析器 ──
// Vite 在构建时将 Funclist.json 打包为模块
const funcListModules = import.meta.glob<{ default: any }>(
  "../funclist/*/FuncList.json",
  { eager: true },
);

export function parseAllFuncLists(): AppDefinition[] {
  const apps: AppDefinition[] = [];

  for (const [path, mod] of Object.entries(funcListModules)) {
    const raw = mod.default;
    // 提取文件夹名
    const folder = path.split("/")[2]; // ../funclist/<folder>/FuncList.json
    if (!raw || typeof raw !== "object") continue;

    const appName: string = raw.appName ?? folder;
    const color = nextColor();
    const functions: AppFunc[] = [];

    // openSocket
    const os = raw.openSocket;
    if (os && typeof os === "object") {
      for (const [funcName, def] of Object.entries(os) as [string, any][]) {
        functions.push({
          funcName,
          funcType: "openSocket",
          appID: def.appID ?? "",
          openSocketID: def.openSocketID ?? "",
          description: def.description ?? "",
          args: def.args ?? {},
          returns: def.returns ?? [],
        });
      }
    }

    // signal
    const sig = raw.signal;
    if (sig && typeof sig === "object") {
      for (const [funcName, def] of Object.entries(sig) as [string, any][]) {
        functions.push({
          funcName,
          funcType: "signal",
          appID: def.appID ?? "",
          signalID: def.signalID ?? "",
          description: def.description ?? "",
          returns: def.returns ?? {},
        });
      }
    }

    if (functions.length > 0) {
      apps.push({ appName, folder, color, functions });
    }
  }

  return apps;
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
