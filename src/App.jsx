import React from 'react';
import NavBar from './Node/NodeBoard/NavBar';
import NodeGraph from './Node/NodeBoard/NodeGraph';
import { DragProvider } from './utils/dragContext';

export default function App() {
  return (
    <DragProvider>
      <div className="w-screen h-screen flex">
        {/* 左侧节点列表 - 1/5 宽度 */}
        <div className="w-1/5 h-full">
          <NavBar />
        </div>
        {/* 右侧节点图 - 4/5 宽度 */}
        <div className="w-4/5 h-full">
          <NodeGraph />
        </div>
      </div>
    </DragProvider>
  );
}