import React from 'react';
import NavBar from './Node/NodeBoard/NavBar';
import NodeGraph from './Node/NodeBoard/NodeGraph';

export default function App() {
  return (
    <div className="w-screen h-screen flex">
      <div className="w-60 h-full shrink-0 overflow-y-auto">
        <NavBar />
      </div>
      <div className="flex-1 h-full">
        <NodeGraph />
      </div>
    </div>
  );
}
