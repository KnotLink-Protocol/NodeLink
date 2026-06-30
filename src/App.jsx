import React from 'react';
import MenuBar from './components/MenuBar';
import NavBar from './Node/NodeBoard/NavBar';
import NodeGraph from './Node/NodeBoard/NodeGraph';

export default function App() {
  return (
    <div className="w-screen h-screen flex flex-col">
      <MenuBar />
      <div className="flex-1 flex">
        <div className="w-1/5 h-full">
          <NavBar />
        </div>
        <div className="flex-1 h-full">
          <NodeGraph />
        </div>
      </div>
    </div>
  );
}
