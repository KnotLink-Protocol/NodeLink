import React, { createContext, useContext, useRef } from 'react';

export interface MenuActions {
  onExport: () => void;
  onImport: () => void;
  onGenerate: () => void;
  onReset: () => void;
  onLoadPkg: () => void;
}

const MenuContext = createContext<React.MutableRefObject<MenuActions> | null>(null);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<MenuActions>({
    onExport: () => {},
    onImport: () => {},
    onGenerate: () => {},
    onReset: () => {},
    onLoadPkg: () => {},
  });
  return <MenuContext.Provider value={ref}>{children}</MenuContext.Provider>;
}

// NodeGraph 用这个注册回调（只跑一次）
export function useMenuRegister(actions: MenuActions) {
  const ref = useContext(MenuContext);
  if (ref) {
    ref.current = actions;
  }
}

// MenuBar 用这个读取回调
export function useMenuActions(): MenuActions {
  const ref = useContext(MenuContext);
  // 用 ref 读取，避免闭包过期
  return {
    onExport: () => ref?.current.onExport(),
    onImport: () => ref?.current.onImport(),
    onGenerate: () => ref?.current.onGenerate(),
    onReset: () => ref?.current.onReset(),
    onLoadPkg: () => ref?.current.onLoadPkg(),
  };
}
