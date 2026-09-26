import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { runRaipurScenario, StepLog } from '@/lib/copilot';
import { fetchNetworkData } from '@/lib/api';
import { useGovernanceStore } from '@/lib/governanceStore';

export function CopilotApp() {
  const [messages, setMessages] = useState<{ role: string; content: string, logs?: StepLog[], planCard?: any }[]>([
    { role: 'assistant', content: 'I am Orion, your HUL Supply Chain Operating System Orchestrator.\n\nType "analyze raipur" to execute the end-to-end network resolution scenario.' }
  ]);
  const [input, setInput] = useState('');
  const [networkData, setNetworkData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const enqueue = useGovernanceStore(state => state.enqueue);

  useEffect(() => {
    fetchNetworkData().then(setNetworkData);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !networkData) return;
    
    setMessages([...messages, { role: 'user', content: input }]);
    const currentInput = input;
    setInput('');
    
    if (currentInput.toLowerCase().includes('analyze raipur')) {
        setTimeout(() => {
            try {
                const { logs, planCard } = runRaipurScenario(networkData);
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: "I have analyzed the Raipur fulfillment delay. I invoked the following tools from the Orion Registry:",
                    logs,
                    planCard
                }]);
            } catch (err) {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Error running scenario: ' + String(err) }]);
            }
        }, 500);
    } else {
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: "Command not recognized. Type 'analyze raipur'." }]);
        }, 500);
    }
  };

  const handleApprove = (planCard: any) => {
      enqueue(
          'shift a distributor cluster',
          'Orion Orchestrator',
          { target: 'DIST-RAI', newSource: 'WH-NAG' },
          planCard.before_kpis,
          planCard.after_kpis
      );
      alert('Plan pushed to Governance Queue.');
  };

  return (
    <div className="flex flex-col h-full bg-white text-sys-black font-sans relative">
      <div className="bg-[var(--sys-teal)] text-white p-4 shrink-0 shadow-md z-10 border-b border-sys-black flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--sys-amber)] text-sys-black rounded-sm border-2 border-sys-black flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-lg leading-none tracking-wide text-[var(--sys-amber)]">ORION</h2>
            <p className="text-xs opacity-80 mt-1 font-mono">SYSTEM ORCHESTRATOR • ONLINE</p>
          </div>
        </div>
        <div className="text-right font-mono text-[10px]">
            <div>OPERATING MODEL: <span className="text-[var(--sys-amber)] font-bold">DETERMINISTIC REGISTRY</span></div>
            <div>TOOLS LOADED: 6</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className={clsx("flex flex-col max-w-[90%]", m.role === 'user' ? "self-end items-end" : "self-start items-start")}>
            <div className={clsx("text-[10px] font-mono text-gray-500 mb-1 px-1", m.role === 'user' ? "text-right" : "text-left")}>
              {m.role === 'user' ? 'SCM PLANNER' : 'ORION'}
            </div>
            <div className={clsx(
              "px-4 py-3 border border-sys-black shadow-sm text-sm leading-relaxed whitespace-pre-wrap flex flex-col gap-3 w-full",
              m.role === 'user' ? "bg-white text-sys-black rounded-tl-lg rounded-bl-lg rounded-tr-sm" : "bg-white border-l-4 border-l-[var(--sys-teal)] rounded-sm"
            )}>
              <div>{m.content}</div>
              
              {m.logs && (
                  <div className="bg-sys-black text-sys-white p-3 font-mono text-[10px] space-y-2 overflow-x-auto rounded-sm border border-sys-gray">
                      <div className="text-[var(--sys-amber)] border-b border-gray-700 pb-1 mb-2 font-bold">ORION EXECUTION TRACE</div>
                      {m.logs.map((l, li) => (
                          <div key={li} className="border-b border-gray-800 pb-2">
                              <div className="text-[var(--sys-teal)] font-bold">► TOOL: {l.tool}</div>
                              <div className="text-gray-400 pl-4 py-0.5">INPUT: {JSON.stringify(l.input)}</div>
                              <div className="text-green-400 pl-4">OUTPUT: {JSON.stringify(l.output)}</div>
                          </div>
                      ))}
                  </div>
              )}

              {m.planCard && (
                  <div className="bg-blue-50 border border-blue-200 p-4 shadow-[2px_2px_0_var(--sys-black)]">
                      <h3 className="font-bold text-blue-900 border-b border-blue-200 pb-2 mb-2">{m.planCard.title}</h3>
                      <div className="text-xs mb-3 space-y-1">
                          <div><strong>Trigger:</strong> {m.planCard.trigger}</div>
                          <div><strong>Action:</strong> {m.planCard.action}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-4">
                          <div className="bg-white border border-sys-black p-2">
                              <div className="font-bold text-gray-500 mb-1">BEFORE</div>
                              <div>Lead Time P95: {m.planCard.before_kpis.leadTimeP95}</div>
                              <div>On Time Prob: {m.planCard.before_kpis.onTime}</div>
                          </div>
                          <div className="bg-white border border-[var(--sys-teal)] p-2 shadow-[2px_2px_0_var(--sys-teal)]">
                              <div className="font-bold text-[var(--sys-teal)] mb-1">AFTER</div>
                              <div>Lead Time P95: {m.planCard.after_kpis.leadTimeP95}</div>
                              <div>On Time Prob: {m.planCard.after_kpis.onTime}</div>
                          </div>
                      </div>
                      <button 
                          onClick={() => handleApprove(m.planCard)}
                          className="w-full bg-[var(--sys-teal)] text-white py-2 font-bold shadow-sm border border-sys-black hover:brightness-110"
                      >
                          Queue for Approval ({m.planCard.requiredApprover})
                      </button>
                  </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-sys-black shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='Type "analyze raipur"...' 
            className="flex-1 border border-sys-black px-3 py-2 text-sm outline-none focus:ring-2 ring-[var(--sys-amber)] bg-gray-50"
          />
          <button type="submit" className="bg-[var(--sys-black)] text-white px-4 py-2 font-bold border border-sys-black shadow-sm hover:bg-gray-800">
             Send
          </button>
        </div>
      </form>
    </div>
  );
}
