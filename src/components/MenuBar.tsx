import { useState, useEffect, useCallback } from 'react';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: string;
  sep?: boolean;
}

const menuItems: Record<string, MenuItem[]> = {
  File: [
    { label: '导入工程...', shortcut: 'Ctrl+O', action: 'import' },
    { label: '导出工程...', shortcut: 'Ctrl+S', action: 'export' },
    { label: '加载功能包...', action: 'loadPkg' },
    { sep: true, label: '' },
    { label: '重置工作区', action: 'reset' },
  ],
  Edit: [
    { label: '生成代码', shortcut: 'Ctrl+G', action: 'generate' },
  ],
  View: [
    { label: '切换代码面板', shortcut: 'Ctrl+`', action: 'toggleCode' },
  ],
};

// 发事件到 window，NodeGraph 自己监听
function emit(action: string) {
  window.dispatchEvent(new CustomEvent('menu-action', { detail: action }));
}

export default function MenuBar() {
  const [open, setOpen] = useState<string | null>(null);

  const execute = useCallback((action: string | undefined) => {
    setOpen(null);
    if (action) emit(action);
  }, []);

  // 全局快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 's') { e.preventDefault(); emit('export'); }
      else if (mod && e.key === 'o') { e.preventDefault(); emit('import'); }
      else if (mod && e.key === 'g') { e.preventDefault(); emit('generate'); }
      else if (mod && e.key === '`') { e.preventDefault(); emit('toggleCode'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-7 bg-gray-800 flex items-center text-xs select-none shrink-0 border-b border-gray-700">
      {Object.entries(menuItems).map(([name, items]) => (
        <div key={name} className="relative">
          <button
            onClick={() => setOpen(open === name ? null : name)}
            onMouseEnter={() => open && setOpen(name)}
            className={`px-3 py-1 text-gray-300 hover:bg-gray-600 transition-colors ${open === name ? 'bg-gray-600' : ''}`}
          >
            {name}
          </button>
          {open === name && (
            <div className="absolute top-full left-0 bg-gray-800 border border-gray-600 rounded-b shadow-xl z-50 min-w-[220px] py-1">
              {items.map((item, i) =>
                item.sep ? (
                  <div key={i} className="h-px bg-gray-600 mx-2 my-1" />
                ) : (
                  <button
                    key={i}
                    onClick={() => execute(item.action)}
                    className="w-full text-left px-4 py-1.5 text-gray-200 hover:bg-blue-600 flex justify-between items-center"
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="text-gray-500 text-[10px] ml-4">{item.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(null)} />}
    </div>
  );
}
