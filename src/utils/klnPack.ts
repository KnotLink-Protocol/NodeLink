import JSZip from "jszip";
import type { Node, Edge } from "@xyflow/react";

export interface KLNProject {
  version: number;
  name: string;
  workspace: { nodes: Node[]; edges: Edge[] };
  code?: { python?: string; javascript?: string };
  apps?: Record<string, any>; // folder → FuncList.json content
}

// ── 打包为 .kln (zip) ──
export async function packKLN(project: KLNProject): Promise<Blob> {
  const zip = new JSZip();

  // project.json
  const meta = {
    version: project.version,
    name: project.name,
    workspace: project.workspace,
    generated: {} as Record<string, string>,
  };

  if (project.code?.python) {
    meta.generated.python = "main.py";
    zip.file("main.py", project.code.python);
  }
  if (project.code?.javascript) {
    meta.generated.javascript = "main.js";
    zip.file("main.js", project.code.javascript);
  }

  // apps/
  if (project.apps) {
    for (const [folder, funcList] of Object.entries(project.apps)) {
      zip.file(`apps/${folder}/FuncList.json`, JSON.stringify(funcList, null, 2));
    }
  }

  zip.file("project.json", JSON.stringify(meta, null, 2));
  return zip.generateAsync({ type: "blob" });
}

// ── 解包 .kln (zip) ──
export async function unpackKLN(
  file: File,
): Promise<KLNProject & { errors: string[] }> {
  const errors: string[] = [];
  const zip = await JSZip.loadAsync(file);

  // 读取 project.json
  const metaFile = zip.file("project.json");
  if (!metaFile) throw new Error("无效的 .kln 文件：缺少 project.json");

  const metaRaw = await metaFile.async("string");
  let meta: any;
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    throw new Error("project.json 解析失败");
  }

  const project: KLNProject & { errors: string[] } = {
    version: meta.version ?? 1,
    name: meta.name ?? "未命名工程",
    workspace: meta.workspace ?? { nodes: [], edges: [] },
    code: {},
    apps: {},
    errors,
  };

  // 读取生成代码
  if (meta.generated?.python) {
    const pyFile = zip.file(meta.generated.python);
    if (pyFile) {
      project.code!.python = await pyFile.async("string");
    } else {
      errors.push(`代码文件 ${meta.generated.python} 不存在`);
    }
  }
  if (meta.generated?.javascript) {
    const jsFile = zip.file(meta.generated.javascript);
    if (jsFile) {
      project.code!.javascript = await jsFile.async("string");
    }
  }

  // 读取 apps/
  const appFolders = new Set<string>();
  for (const [path] of Object.entries(zip.files)) {
    const m = path.match(/^apps\/([^/]+)\/FuncList\.json$/);
    if (m) appFolders.add(m[1]);
  }
  for (const folder of appFolders) {
    const f = zip.file(`apps/${folder}/FuncList.json`);
    if (f) {
      try {
        project.apps![folder] = JSON.parse(await f.async("string"));
      } catch {
        errors.push(`apps/${folder}/FuncList.json 解析失败`);
      }
    }
  }

  return project;
}
