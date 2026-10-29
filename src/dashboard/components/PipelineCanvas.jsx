import React, { useCallback, useState, useEffect } from 'react';
import { ReactFlow, MiniMap, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges, Panel, SelectionMode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MousePointer2, Hand, Maximize2, Minimize2 } from 'lucide-react';

import TriggerNode from './TriggerNode';
import ConditionNode from './ConditionNode';
import ActionNode from './ActionNode';
import UpdateNode from './UpdateNode';
import NodeSidebar from './NodeSidebar';
import { usePipelineSync } from '../hooks/usePipelineSync';

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  update: UpdateNode
};

const initialNodes = [
  { id: '1', type: 'trigger', position: { x: 50, y: 150 }, data: { label: 'News Trigger', type: 'Breaking News', popupLabel: 'Waiting for the signal' } }
];
const initialEdges = [];

const PipelineCanvas = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { nodes: syncedNodes, edges: syncedEdges, updatePipeline, isLoaded } = usePipelineSync(initialNodes, initialEdges);
  
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [interactionMode, setInteractionMode] = useState('select'); // 'select' or 'pan'
  const hasHydratedRef = React.useRef(false);

  useEffect(() => {
    if (isLoaded && !hasHydratedRef.current) {
      hasHydratedRef.current = true;
      // If syncedNodes is empty, we keep the initialNodes, otherwise we use syncedNodes
      if (syncedNodes && syncedNodes.length > 0) {
        setNodes(syncedNodes);
        setEdges(syncedEdges);
      }
    }
  }, [isLoaded, syncedNodes, syncedEdges]);

  // Ensure view is centered when nodes are loaded
  useEffect(() => {
    if (isLoaded && reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 100);
    }
  }, [isLoaded, reactFlowInstance]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'v') setInteractionMode('select');
      if (e.key.toLowerCase() === 'h') setInteractionMode('pan');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll API to show network requests for feeds & prices to the node website
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        await Promise.all([
          fetch("/api/feeds"),
          fetch("/api/prices")
        ]);
      } catch (err) {
        // Silent catch for background polling
      }
    };
    
    // Fetch once every 60 seconds (instead of 2s) to preserve CPU
    const interval = setInterval(fetchBackendData, 60000);
    return () => clearInterval(interval);
  }, []);

  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [],
  );

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [],
  );

  // Persist user/signal changes after initial hydration
  useEffect(() => {
    if (hasHydratedRef.current) {
      updatePipeline(nodes, edges);
    }
  }, [nodes, edges, updatePipeline]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const rawData = event.dataTransfer.getData('application/reactflow');

      if (!rawData) return;

      const safeNodes = Array.isArray(nodes) ? nodes : [];

      try {
        const { type, data: initialData } = JSON.parse(rawData);

        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const newNode = {
          id: `node_${Date.now()}`,
          type,
          position,
          data: { label: `${type} node`, ...initialData },
        };

        const newNodes = safeNodes.concat(newNode);
        setNodes(newNodes);
        updatePipeline(newNodes, edges);
      } catch (err) {
        // Fallback for simple string types
        const type = rawData;
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const newNode = {
          id: `node_${Date.now()}`,
          type,
          position,
          data: { label: `${type} node` },
        };
        const newNodes = safeNodes.concat(newNode);
        setNodes(newNodes);
        updatePipeline(newNodes, edges);
      }
    },
    [reactFlowInstance, nodes, edges, updatePipeline],
  );

  const onAddNode = useCallback((type, initialData = {}) => {
    const safeNodes = Array.isArray(nodes) ? nodes : [];
    const newNode = {
      id: `node_${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: `${type} node`, ...initialData },
    };
    const newNodes = safeNodes.concat(newNode);
    setNodes(newNodes);
    updatePipeline(newNodes, edges);
  }, [nodes, edges, updatePipeline]);

  // WebSocket Signal Listener
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws/terminal`);
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const content = data.content || '';

        // 1. Handle NEW SIGNALS
        if (data.type === 'log' && content.includes('SIGNAL:')) {
          console.log('[NodeUpdater] Received potential signal log:', content);
          
          const assetMatch = content.match(/SIGNAL:\s*([a-zA-Z0-9\/]+)/i);
          const directionMatch = content.match(/Direction:\s*(\w+)/i);
          const entryMatch = content.match(/Entry:\s*([\d.]+)/i);
          const slMatch = content.match(/SL:\s*([\d.]+)/i);
          const tpMatch = content.match(/TP:\s*([\d.]+)/i);
          const reasonMatch = content.match(/Reason:\s*(.*)/i);

          if (assetMatch) {
            const signalData = {
              asset: assetMatch[1].trim(),
              direction: directionMatch ? directionMatch[1].toUpperCase() : 'BUY',
              entry: entryMatch ? entryMatch[1] : '0',
              sl: slMatch ? slMatch[1] : '0',
              tp: tpMatch ? tpMatch[1] : '0',
              reason: reasonMatch ? reasonMatch[1] : '',
              popupLabel: 'New Signal Ingested'
            };
            
            setNodes((nds) => nds.map((node) => {
              // Update if the node is a trigger node and either has no specific asset or matches the incoming asset
              if (node.type === 'trigger' && (!node.data.asset || node.data.asset.toUpperCase() === signalData.asset.toUpperCase())) {
                return { ...node, data: { ...node.data, ...signalData, label: `Signal: ${signalData.asset}` } };
              }
              return node;
            }));
          }
        }

        // 2. Handle TRADE UPDATES
        if (data.type === 'log' && content.includes('TRADE UPDATE:')) {
          console.log('[NodeUpdater] Received trade update log:', content);
          
          const assetMatch = content.match(/TRADE UPDATE:\s*([a-zA-Z0-9\/]+)/i);
          const directionMatch = content.match(/Direction:\s*(\w+)/i);
          const entryMatch = content.match(/Entry:\s*([\d.]+)/i);
          const currentMatch = content.match(/Current:\s*([\d.]+)/i);
          const pnlMatch = content.match(/P&L:\s*([-+\d.]+)%/i);
          const reasonMatch = content.match(/Reason:\s*(.*)/i);
          const actionMatch = content.match(/Action:\s*(.*)/i);

          if (assetMatch) {
            const updateData = {
              asset: assetMatch[1].trim(),
              direction: directionMatch ? directionMatch[1].toUpperCase() : 'BUY',
              entry: entryMatch ? entryMatch[1] : '0',
              current: currentMatch ? currentMatch[1] : '0',
              pnl: pnlMatch ? pnlMatch[1] : '0.00',
              reason: reasonMatch ? reasonMatch[1] : '',
              action: actionMatch ? actionMatch[1] : '',
              popupLabel: 'Live Trade Update',
              subLabel: 'Running Trade'
            };
            
            setNodes((nds) => nds.map((node) => {
              // Match generic 'update' nodes or nodes explicitly tracking this asset
              if (node.type === 'update' && (!node.data.asset || node.data.asset.toUpperCase() === updateData.asset.toUpperCase() || node.data.label?.toUpperCase().includes('UPDATE'))) {
                return { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    ...updateData,
                    label: `Update: ${updateData.asset}`
                  } 
                };
              }
              // Also update matching 'trigger' nodes so they reflect the latest Current price
              if (node.type === 'trigger' && node.data.asset && node.data.asset.toUpperCase() === updateData.asset.toUpperCase()) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    current: updateData.current
                  }
                };
              }
              return node;
            }));
          }
        }

        // 3. Handle SIGNAL CLOSED
        if (data.type === 'log' && content.includes('SIGNAL CLOSED:')) {
          const assetMatch = content.match(/SIGNAL CLOSED:\s*([a-zA-Z0-9\/]+)/i);
          const pnlMatch = content.match(/Final P&L:\s*([-+\d.]+)%/i);

          if (assetMatch) {
            const closedData = {
              asset: assetMatch[1].trim(),
              pnl: pnlMatch ? pnlMatch[1] : '0.00',
              popupLabel: 'Signal Finalized',
              subLabel: 'Closed'
            };

            setNodes((nds) => nds.map((node) => {
              if (node.type === 'update' && (!node.data.asset || node.data.asset.toUpperCase() === closedData.asset.toUpperCase() || node.data.label?.toUpperCase().includes('UPDATE') || node.data.label?.toUpperCase().includes('CLOSE'))) {
                return { ...node, data: { ...node.data, ...closedData, label: `Closed: ${closedData.asset}` } };
              }
              return node;
            }));
          }
        }

        // 4. Handle System Actions (Emergency Stop / Resume)
        if (data.type === 'log' && (content.includes('EMERGENCY STOP') || content.includes('SYSTEM RESUMED'))) {
          const isStop = content.includes('EMERGENCY STOP');
          const actionData = {
            popupLabel: 'System Control',
            subLabel: isStop ? 'PAUSED' : 'ACTIVE',
            label: isStop ? 'EMERGENCY STOP' : 'SYSTEM RESUMED'
          };

          setNodes((nds) => nds.map((node) => {
            if (node.type === 'action' && 
                (node.data.label?.toUpperCase() === 'EMERGENCY STOP' || 
                 node.data.label?.toUpperCase() === 'SYSTEM RESUMED')) {
              return { ...node, data: { ...node.data, ...actionData } };
            }
            return node;
          }));
        }

        // 5. Handle AI Filter "IGNORED" reasoning
        if (data.type === 'log' && content.includes('IGNORED:')) {
          const reason = content.split('IGNORED:')[1]?.trim();
          if (reason) {
            setNodes((nds) => nds.map((node) => {
              // Update condition nodes (typically used for filters/validation)
              if (node.type === 'condition' || node.data.label?.toUpperCase().includes('FILTER') || node.data.label?.toUpperCase().includes('SENTIMENT')) {
                return { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    subLabel: 'AI Rejected',
                    ruleText: reason,
                    popupLabel: 'Noise Filter Triggered'
                  } 
                };
              }
              return node;
            }));
          }
        }
      } catch (err) {
        console.error('Failed to parse socket message:', err);
      }
    };

    return () => socket.close();
  }, []);

  return (
    <div className="flex w-full h-full">
      <div className={`transition-all duration-300 ${isMobileMenuOpen ? 'w-64' : 'w-0'} overflow-hidden md:w-64 shrink-0 bg-zinc-950/50 border-r border-zinc-800/50`}>
        <NodeSidebar onAddNode={onAddNode} />
      </div>
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          panOnDrag={interactionMode === 'pan'}
          selectionOnDrag={interactionMode === 'select'}
          selectionMode={SelectionMode.Partial}
          panOnScroll={true}
          zoomOnScroll={true}
          minZoom={0.1}
          maxZoom={4}
          fitView
          className="bg-[#050505]"
        >
          <Background color="#333" gap={16} size={1} />
          <Controls className="!bg-zinc-900 !border-zinc-800 !text-white" />
          
          <Panel position="top-right" className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-1 rounded-xl flex gap-1 shadow-2xl">
            <button 
              onClick={() => setInteractionMode('select')}
              title="Select Tool (V)"
              className={`p-2 rounded-lg transition-all ${interactionMode === 'select' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
            >
              <MousePointer2 size={18} />
            </button>
            <button 
              onClick={() => setInteractionMode('pan')}
              title="Hand Tool (H)"
              className={`p-2 rounded-lg transition-all ${interactionMode === 'pan' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
            >
              <Hand size={18} />
            </button>
            <div className="w-[1px] bg-zinc-800 mx-1" />
            <button 
              onClick={() => reactFlowInstance?.fitView()}
              title="Fit View"
              className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <Maximize2 size={18} />
            </button>
          </Panel>

          <Panel position="bottom-center" className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 px-4 py-1.5 rounded-full mb-4">
             <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
               Shortcuts: <span className="text-zinc-300 mx-1">[V] Select</span> <span className="text-zinc-300">[H] Pan</span>
             </span>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

export default PipelineCanvas;
