import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface DragState {
  dragging: boolean;
  nodeType: string | null;
  ghostX: number;
  ghostY: number;
}

interface DragContextType {
  state: DragState;
  startDrag: (nodeType: string, e: React.MouseEvent) => void;
  moveDrag: (e: React.MouseEvent) => void;
  endDrag: (canvasRect: DOMRect | null, screenToFlow: ((pos: { x: number; y: number }) => { x: number; y: number }) | null) => { nodeType: string; position: { x: number; y: number } } | null;
  cancelDrag: () => void;
}

const DragContext = createContext<DragContextType | null>(null);

export function useDragContext() {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error('useDragContext must be used within DragProvider');
  return ctx;
}

export function DragProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DragState>({
    dragging: false,
    nodeType: null,
    ghostX: 0,
    ghostY: 0,
  });
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const startDrag = useCallback((nodeType: string, e: React.MouseEvent) => {
    // 创建跟随光标的 ghost
    const ghost = document.createElement('div');
    ghost.className = 'fixed z-[9999] bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl pointer-events-none opacity-80';
    ghost.textContent = nodeType.replace(/^funcList:.+?:/, '');
    ghost.style.left = `${e.clientX + 10}px`;
    ghost.style.top = `${e.clientY + 10}px`;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
    setState({ dragging: true, nodeType, ghostX: e.clientX, ghostY: e.clientY });
  }, []);

  const moveDrag = useCallback((e: React.MouseEvent) => {
    if (!ghostRef.current) return;
    ghostRef.current.style.left = `${e.clientX + 10}px`;
    ghostRef.current.style.top = `${e.clientY + 10}px`;
    setState(s => ({ ...s, ghostX: e.clientX, ghostY: e.clientY }));
  }, []);

  const endDrag = useCallback((
    canvasRect: DOMRect | null,
    screenToFlow: ((pos: { x: number; y: number }) => { x: number; y: number }) | null,
  ) => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
    if (!state.dragging || !state.nodeType) {
      setState({ dragging: false, nodeType: null, ghostX: 0, ghostY: 0 });
      return null;
    }
    const nodeType = state.nodeType;
    const position = canvasRect && screenToFlow
      ? screenToFlow({ x: state.ghostX - canvasRect.left, y: state.ghostY - canvasRect.top })
      : { x: state.ghostX, y: state.ghostY };
    setState({ dragging: false, nodeType: null, ghostX: 0, ghostY: 0 });
    return { nodeType, position };
  }, [state]);

  const cancelDrag = useCallback(() => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
    setState({ dragging: false, nodeType: null, ghostX: 0, ghostY: 0 });
  }, []);

  return (
    <DragContext.Provider value={{ state, startDrag, moveDrag, endDrag, cancelDrag }}>
      {children}
    </DragContext.Provider>
  );
}
