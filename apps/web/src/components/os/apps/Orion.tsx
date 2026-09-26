'use client';
import { useState, useRef, useEffect } from 'react';
import { Terminal, Bot, ChevronRight, Activity } from 'lucide-react';
import { fetchNetworkData } from '@/lib/api';

export function Orion() {
  const [messages, setMessages] = useState<{ role: 'user'|'agent'|'system', content: string, trace?: string[] }[]>([
    { role: 'system', content: 'ORION KERNEL INITIALIZED. Supply Chain Orchestrator online.' }
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const query = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setInput('');

    // Simulated execution trace based on user intent matching (deterministic registry simulation)
    let trace: string[] = [];
    let response = '';

    if (query.toLowerCase().includes('raipur')) {
      trace = [
        'Reading current network context: Raipur',
        'Fetching lane performance metrics',
        'Analysing delay causes: 38% capacity constraint',
        'Finding alternate warehouses: Nagpur, Bilaspur',
        'Running Monte Carlo simulation on lead times',
        'Checking RACI permissions for capacity override',
        'Building recommendation matrix'
      ];
      response = 'Raipur is underperforming due to a 38% capacity constraint on inbound lanes. Simulation suggests routing overflow to Nagpur decreases stockout risk by 14%. Recommended action: Approve temporary route override (requires Plant Manager approval).';
    } else {
      trace = [
        'Parsing intent',
        'Querying registry for tools',
        'Executing general knowledge base search'
      ];
      response = `Command recognized: "${query}". I am currently operating in restricted demo mode. Please try the "Why is Raipur underperforming?" workflow to see full capabilities.`;
    }

    setMessages(prev => [...prev, { role: 'system', content: 'Executing command sequence...' }]);
    
    // Simulate thinking delay
    for (let i = 0; i < trace.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.role === 'system' && last.trace) {
          return [...prev.slice(0, -1), { ...last, trace: [...last.trace, trace[i]] }];
        } else {
          return [...prev, { role: 'system', content: 'Trace:', trace: [trace[i]] }];
        }
      });
    }

    await new Promise(r => setTimeout(r, 600));
    setMessages(prev => [...prev, { role: 'agent', content: response }]);
  };

  return (
    <div className="scm-app-layout bg-[#0a0a0a] text-green-500 font-mono">
      <div className="scm-header bg-[#111] border-b border-[#222]">
        <div className="scm-header-title text-green-500">
          <Terminal className="w-4 h-4" />
          ORION ORCHESTRATOR
        </div>
        <div className="flex items-center gap-2 text-[10px] text-green-700">
          <Activity className="w-3 h-3 animate-pulse" />
          STATUS: OPERATIONAL
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((m, i) => (
          <div key={i} className="flex gap-3">
            <div className="shrink-0 mt-0.5">
              {m.role === 'user' ? <span className="text-blue-400">USR&gt;</span> : 
               m.role === 'agent' ? <span className="text-green-400">SYS&gt;</span> : 
               <span className="text-gray-500">EXE&gt;</span>}
            </div>
            <div className="flex-1">
              {m.role === 'user' || m.role === 'agent' ? (
                <div className={m.role === 'user' ? 'text-blue-300' : 'text-green-400'}>{m.content}</div>
              ) : (
                <div className="text-gray-400 opacity-80">
                  {m.trace ? (
                    <div className="space-y-1">
                      {m.trace.map((t, ti) => (
                        <div key={ti} className="flex items-center gap-2">
                          <span className="text-gray-600">[{String(ti + 1).padStart(2, '0')}]</span>
                          {t}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500">{m.content}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 bg-[#111] border-t border-[#222]">
        <form onSubmit={handleCommand} className="flex items-center gap-2">
          <span className="text-green-600 ml-2">$&gt;</span>
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter command or natural language query..."
            className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder:text-green-900 font-mono text-xs px-2"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}
