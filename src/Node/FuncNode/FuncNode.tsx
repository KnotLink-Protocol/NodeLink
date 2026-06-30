import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import NodeHeader from "../BaseNode/NodeHeader";
import InputHandle from "../BaseNode/InputHandle";
import OutputHandle from "../BaseNode/OutputHandle";
import {
  findFunc,
  parseAllFuncLists,
  type AppFunc,
  type OpenSocketFunc,
  type SignalFunc,
  type OptionalArg,
  type InputArg,
} from "../../utils/funcListParser";

const allApps = parseAllFuncLists();

// ── 颜色表（与解析器对齐） ──
const COLOR_MAP: Record<string, string> = {
  "Everything_node": "bg-teal-500",
  "MsgNotification": "bg-violet-500",
  "MultiTTS_Client": "bg-rose-500",
  "NamePicker": "bg-amber-500",
  "system_monitor_win": "bg-sky-500",
};

function getColor(folder: string): string {
  return COLOR_MAP[folder] ?? "bg-gray-500";
}

// ── 通用节点 ──
export default function FuncNode({ id, data }: { id: string; data?: any }) {
  const { updateNodeData } = useReactFlow();
  const folder: string = data?.folder ?? "";
  const funcName: string = data?.funcName ?? "";
  const func: AppFunc | undefined = findFunc(allApps, folder, funcName);

  if (!func) {
    return (
      <div className="bg-red-100 border border-red-400 rounded p-2 text-xs text-red-600">
        未知节点: {folder}/{funcName}
      </div>
    );
  }

  const color = getColor(folder);

  const onSelectChange = useCallback(
    (argName: string) => (evt: React.ChangeEvent<HTMLSelectElement>) => {
      const vals = { ...(data?.argValues ?? {}) };
      vals[argName] = evt.target.value;
      updateNodeData(id, { ...data, argValues: vals });
    },
    [updateNodeData, id, data],
  );

  const onInputChange = useCallback(
    (argName: string) => (evt: React.ChangeEvent<HTMLInputElement>) => {
      const vals = { ...(data?.argValues ?? {}) };
      vals[argName] = evt.target.value;
      updateNodeData(id, { ...data, argValues: vals });
    },
    [updateNodeData, id, data],
  );

  const argValues = data?.argValues ?? {};

  if (func.funcType === "signal") {
    const sf = func as SignalFunc;
    return (
      <div className="relative min-w-[120px] bg-white border-gray-200 rounded-xl shadow-md font-sans">
        <NodeHeader title={`📡 ${funcName}`} className={color} />
        {Object.entries(sf.returns).map(([field, info]) => (
          <div key={field} className="px-3 py-1.5 border-t border-gray-100">
            <div className="flex items-center justify-between relative">
              <span className="text-gray-700 text-[10px]">{field}</span>
              <span className="text-gray-400 text-[8px] ml-1 truncate max-w-[80px]">
                {info.description}
              </span>
              <OutputHandle
                id={`o-${field}`}
                tip={field}
                className={`!${color}`}
              />
            </div>
            {info.verification && (
              <div className="text-[8px] text-orange-500 mt-0.5">
                校验: {info.verification}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // openSocket
  const ocf = func as OpenSocketFunc;
  return (
    <div className="relative min-w-[150px] bg-white border-gray-200 rounded-xl shadow-md font-sans">
      <NodeHeader title={funcName} className={color} />
      <div className="divide-y divide-gray-100 text-[10px]">
        {Object.entries(ocf.args).map(([argName, arg]) => {
          if (arg.type === "static") return null; // 不显示

          const oa = arg as OptionalArg;
          if (arg.type === "optional") {
            const val = argValues[argName] ?? oa.defaultVal ?? oa.options[0]?.[1] ?? "";
            return (
              <div key={argName} className="flex items-center justify-between px-3 py-2">
                <span className="text-gray-700">{argName}</span>
                <select
                  value={val}
                  onChange={onSelectChange(argName)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="border border-gray-300 rounded px-1 py-0.5 text-[10px] max-w-[100px]"
                >
                  {oa.options.map(([label, value]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            );
          }

          // input
          const ia = arg as InputArg;
          const val = argValues[argName] ?? ia.defaultVal ?? "";
          return (
            <div key={argName} className="flex items-center justify-between px-3 py-2 relative">
              <InputHandle id={`i-${argName}`} className={`!${color}`} />
              <span className="text-gray-700">{argName}</span>
              <input
                value={val}
                onChange={onInputChange(argName)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-16 text-right border border-gray-300 rounded px-1 py-0.5"
                placeholder={ia.defaultVal}
              />
            </div>
          );
        })}
      </div>
      {/* returns */}
      {ocf.returns.length > 0 && (
        <div className="border-t border-gray-100 pt-1 pb-1">
          {ocf.returns.map(([desc, field]) => (
            <div key={field} className="flex items-center justify-between px-3 py-1 relative text-[10px]">
              <span className="text-gray-400 text-[9px]">{desc}</span>
              <OutputHandle
                id={`o-${field}`}
                tip={field}
                className={`!${color}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
