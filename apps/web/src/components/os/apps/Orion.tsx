'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Terminal as TerminalIcon, CheckCircle2, XCircle, ChevronRight, Send, AlertCircle } from 'lucide-react';
import { useGovernanceStore } from '@/lib/governanceStore';
import { fetchNetworkData } from '@/lib/api';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';

type Message = {
  id: string;
  sender: 'system' | 'user' | 'agent';
  text: string;
  traces?: { text: string; status: 'pending' | 'success' | 'error' }[];
  recommendation?: React.ReactNode;
};

export function Orion() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { enqueue } = useGovernanceStore();

  useEffect(() => {
    setMessages([
      {
        id: 'init-1',
        sender: 'system',
        text: 'ORION ORCHESTRATOR ONLINE. Awaiting query...'
      }
    ]);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const processRaipurWorkflow = async (msgId: string) => {
    const data = await fetchNetworkData();
    const delays = [300, 600, 500, 800, 600, 400, 700];
    
    // Step 1
    await new Promise(r => setTimeout(r, delays[0]));
    const distRai = data.distributors.find(d => d.id === 'DIST-RAI');
    setMessages(prev => updateTrace(prev, msgId, 0, 'success'));
    setMessages(prev => addTrace(prev, msgId, 'Fetching lane performance: found 12 lanes to/from Raipur'));
    
    // Step 2
    await new Promise(r => setTimeout(r, delays[1]));
    setMessages(prev => updateTrace(prev, msgId, 1, 'success'));
    setMessages(prev => addTrace(prev, msgId, 'Analyzing delay causes: transit=42%, hub_dwell=38%'));
    
    // Step 3
    await new Promise(r => setTimeout(r, delays[2]));
    setMessages(prev => updateTrace(prev, msgId, 2, 'success'));
    setMessages(prev => addTrace(prev, msgId, 'Evaluating alternate warehouses: WH-NAG (Nagpur), WH-RAI (Raipur)'));
    
    // Step 4
    await new Promise(r => setTimeout(r, delays[3]));
    setMessages(prev => updateTrace(prev, msgId, 3, 'success'));
    setMessages(prev => addTrace(prev, msgId, 'Running Monte Carlo on lead time variance'));
    
    // Step 5
    await new Promise(r => setTimeout(r, delays[4]));
    setMessages(prev => updateTrace(prev, msgId, 4, 'success'));
    setMessages(prev => addTrace(prev, msgId, 'Checking RACI permission for route override'));
    
    // Step 6
    await new Promise(r => setTimeout(r, delays[5]));
    setMessages(prev => updateTrace(prev, msgId, 5, 'success'));
    setMessages(prev => addTrace(prev, msgId, 'Generating recommendation'));
    
    // Step 7
    await new Promise(r => setTimeout(r, delays[6]));
    setMessages(prev => updateTrace(prev, msgId, 6, 'success'));
    
    // Add final recommendation
    const nagpurWH = data.warehouses.find(w => w.id === 'WH-NAG') || { utilization_pct: 0.85, operating_cost_per_pallet: 1200 };
    
    setMessages(prev => prev.map(m => m.id === msgId ? {
      ...m,
      text: 'Analysis complete. Alternative routing via Nagpur is viable.',
      recommendation: (
        <div className="mt-3 p-4 bg-[#0d1612] border border-green-900/50 rounded text-sm space-y-3">
          <h4 className="font-bold text-green-400">RECOMMENDATION: ROUTE OVERRIDE</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-green-600 block mb-1">Target Route</span>
              <span className="text-green-300">WH-NAG → DIST-RAI</span>
            </div>
            <div>
              <span className="text-green-600 block mb-1">Impact (Cost)</span>
              <span className="text-red-400">+{formatCurrency(45000)}/week</span>
            </div>
            <div>
              <span className="text-green-600 block mb-1">Impact (Time)</span>
              <span className="text-green-400">-14 hours lead time</span>
            </div>
            <div>
              <span className="text-green-600 block mb-1">WH Utilization</span>
              <span className="text-green-300">{formatPercent(nagpurWH.utilization_pct)} → {formatPercent(nagpurWH.utilization_pct + 0.02)}</span>
            </div>
          </div>
          <button
            onClick={() => {
              enqueue({
                id: `RTE-OVR-${Date.now().toString().slice(-4)}`,
                decision: 'Override Route to WH-NAG -> DIST-RAI due to delays',
                sourceApp: 'ORION',
                kpiImpact: {
                  'Lead Time': '-14 hrs',
                  'Cost': '+45,000 INR',
                  'Service Level': '+4.2%'
                },
                requiredRole: 'SC_LEAD',
                status: 'pending'
              });
              setNotification('Request submitted to Governance Queue');
              setTimeout(() => setNotification(null), 3000);
            }}
            className="mt-2 w-full py-2 bg-green-900/20 hover:bg-green-900/40 text-green-400 border border-green-800 rounded transition-colors text-xs font-bold"
          >
            [SEND TO GOVERNANCE]
          </button>
        </div>
      )
    } : m));
    
    setIsProcessing(false);
  };

  const updateTrace = (msgs: Message[], msgId: string, traceIdx: number, status: 'success' | 'error') => {
    return msgs.map(m => {
      if (m.id === msgId && m.traces) {
        const newTraces = [...m.traces];
        if (newTraces[traceIdx]) newTraces[traceIdx].status = status;
        return { ...m, traces: newTraces };
      }
      return m;
    });
  };

  const addTrace = (msgs: Message[], msgId: string, text: string) => {
    return msgs.map(m => {
      if (m.id === msgId) {
        return { ...m, traces: [...(m.traces || []), { text, status: 'pending' }] };
      }
      return m;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    const userText = input.trim();
    setInput('');
    setIsProcessing(true);
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'user',
      text: userText
    }]);

    const agentMsgId = `agent-${Date.now()}`;
    
    if (userText.toLowerCase().includes('raipur')) {
      setMessages(prev => [...prev, {
        id: agentMsgId,
        sender: 'agent',
        text: 'Analyzing request...',
        traces: [{ text: 'Loading network context for Raipur (DIST-RAI)', status: 'pending' }]
      }]);
      processRaipurWorkflow(agentMsgId);
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: agentMsgId,
          sender: 'agent',
          text: 'Command not recognized. Available modules:\n- raipur analysis\n- network health\n- inventory scan\n\nTry asking about "raipur".'
        }]);
        setIsProcessing(false);
      }, 600);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] text-green-500 font-mono text-sm relative">
      {notification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-indigo-900 border border-indigo-500 text-indigo-100 text-xs rounded shadow-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#0d1612] border-b border-green-900/30 shrink-0">
        <div className="flex items-center gap-2 text-green-400">
          <Cpu className="w-5 h-5" />
          <h2 className="font-bold tracking-widest text-xs uppercase">Orion Orchestrator</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-[10px] uppercase text-green-700 tracking-wider">
            {isProcessing ? 'PROCESSING' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.sender === 'user' ? (
              <div className="bg-green-900/10 border border-green-900/30 px-3 py-2 rounded text-green-300 max-w-[80%] break-words">
                <span className="text-green-700 mr-2">{'>'}</span>{msg.text}
              </div>
            ) : (
              <div className="max-w-full w-full">
                {msg.sender !== 'system' && (
                  <div className="flex items-center gap-2 text-green-700 text-xs mb-1 mb-2">
                    <TerminalIcon className="w-3 h-3" />
                    <span>ORION.AGENT</span>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap text-green-400">
                  {msg.text}
                </div>
                
                {msg.traces && msg.traces.length > 0 && (
                  <div className="mt-3 space-y-1.5 font-mono text-[11px]">
                    {msg.traces.map((trace, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="shrink-0 mt-0.5">
                          {trace.status === 'pending' ? (
                            <div className="w-3 h-3 border border-green-500/50 rounded-full animate-spin border-t-green-400" />
                          ) : trace.status === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          )}
                        </div>
                        <span className={trace.status === 'pending' ? 'text-green-600' : trace.status === 'error' ? 'text-red-400' : 'text-green-500/80'}>
                          {trace.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {msg.recommendation}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-[#0d1612] border-t border-green-900/30 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#0a0e14] border border-green-900/50 rounded px-3 py-2 focus-within:border-green-500/50 transition-colors">
            <ChevronRight className="w-4 h-4 text-green-700 mr-2 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isProcessing}
              placeholder={isProcessing ? "Processing..." : "Enter command or query..."}
              className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder:text-green-900/50"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="p-2.5 bg-green-900/20 text-green-500 rounded border border-green-900/50 hover:bg-green-900/40 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
