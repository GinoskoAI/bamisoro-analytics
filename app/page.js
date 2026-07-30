"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
// Next.js automatically injects variables prefixed with NEXT_PUBLIC_ into the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function BamisoroDashboard() {
  const [liveCalls, setLiveCalls] = useState([]);
  const [activeCallId, setActiveCallId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial historical calls on load
    const fetchCalls = async () => {
      const { data, error } = await supabase
        .from('bamisoro_calls')
        .select('*')
        .order('processed_at', { ascending: false });
      
      if (data && data.length > 0) {
        setLiveCalls(data);
        setActiveCallId(data[0].call_id);
      }
      setIsLoading(false);
    };
    fetchCalls();

    // 2. Subscribe to Real-Time Updates from Supabase
    const subscription = supabase
      .channel('public:bamisoro_calls')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bamisoro_calls' }, 
        (payload) => {
          // Add the new call to the top of the list and set it as active
          setLiveCalls(currentCalls => [payload.new, ...currentCalls]);
          setActiveCallId(payload.new.call_id);
        }
      ).subscribe();

    // Cleanup subscription when component unmounts
    return () => supabase.removeChannel(subscription);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-semibold text-gray-500 animate-pulse">Loading Bamisoro Intelligence...</p>
      </div>
    );
  }

  if (liveCalls.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-semibold text-gray-500">Waiting for the first call to be processed...</p>
      </div>
    );
  }

  const activeCall = liveCalls.find(c => c.call_id === activeCallId) || liveCalls[0];

  // Helper to color-code CSAT scores
  const getCsatColor = (score) => {
    if (score >= 85) return "text-green-600";
    if (score >= 60) return "text-amber-500";
    return "text-red-600";
  };

  // Bulletproof Transcript Parser (Handles both strings and arrays from Gemini)
  let parsedTranscript = [];
  if (Array.isArray(activeCall.transcript)) {
    parsedTranscript = activeCall.transcript;
  } else if (typeof activeCall.transcript === 'string') {
    parsedTranscript = activeCall.transcript.split('\n').filter(line => line.trim() !== '').map(line => {
      const isAgent = line.toLowerCase().startsWith('agent');
      return {
        speaker: isAgent ? "Agent" : "Caller",
        text: line.replace(/^(Agent|Caller):\s*/i, '').trim()
      };
    });
  }

  return (
    <div className="bg-gray-50 text-gray-800 font-sans h-screen flex overflow-hidden">
      
      {/* Sidebar: Live Call Feed */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-900 text-white">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Bamisoro</h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Live Feed
            </p>
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {liveCalls.map(call => (
            <button 
              key={call.call_id}
              onClick={() => setActiveCallId(call.call_id)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                call.call_id === activeCallId 
                  ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 shadow-sm' 
                  : 'bg-white border-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`font-bold text-sm ${call.call_id === activeCallId ? 'text-indigo-800' : 'text-gray-900'}`}>
                  {call.intent_detected || "Unknown Intent"}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500 font-mono">{call.customer_phone}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded bg-gray-100 ${getCsatColor(call.csat_score)}`}>
                  CSAT: {call.csat_score || "0"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        
        {/* Header: Call Meta & Audio Player */}
        <header className="bg-white px-8 py-6 border-b border-gray-200 flex justify-between items-start shadow-sm sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{activeCall.intent_detected || "Analysis Pending"}</h2>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                activeCall.sentiment === 'Positive' ? 'bg-green-100 text-green-800' : 
                activeCall.sentiment === 'Negative' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {activeCall.sentiment || "Neutral"}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-mono mb-3">
              ID: {activeCall.call_id} | {new Date(activeCall.processed_at).toLocaleString()}
            </p>
            {/* Audio Playback from Google Drive */}
            {activeCall.drive_link && (
              <audio controls src={activeCall.drive_link} className="h-8 w-72" />
            )}
          </div>
          
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Customer</p>
              <p className="text-sm font-bold text-gray-900">{activeCall.customer_name || "Unknown"}</p>
              <p className="text-sm text-gray-500 font-mono">{activeCall.customer_phone}</p>
            </div>
            <div className="w-px bg-gray-200"></div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Handled By</p>
              <p className="text-sm font-bold text-gray-900">{activeCall.agent_name || "Agent"}</p>
              <p className="text-sm text-gray-500 font-mono">Ext: <span>{activeCall.agent_ext}</span></p>
            </div>
          </div>
        </header>

        {/* Analytics Grid */}
        <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">CSAT Score</p>
              <div className="flex items-end gap-2 mt-2">
                <p className={`text-5xl font-extrabold ${getCsatColor(activeCall.csat_score)}`}>
                  {activeCall.csat_score || 0}
                </p>
                <p className="text-gray-400 mb-1 font-medium">/ 100</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-amber-500 border-y-gray-100 border-r-gray-100">
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">Next Action Required</p>
              <p className={`text-lg font-bold mt-3 ${(activeCall.next_action || "").includes('None') ? 'text-green-600' : 'text-red-600'}`}>
                {activeCall.next_action || "None"}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide mb-2 flex justify-between">
                AI Summary <span className="text-indigo-500">Gemini 2.5</span>
              </p>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                {activeCall.ai_summary || "Generating summary..."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">Sentiment Velocity</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {activeCall.sentiment_velocity || "Analyzing sentiment shift..."}
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
              <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Transcript</h3>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {parsedTranscript.length > 0 ? (
                  parsedTranscript.map((line, index) => {
                    const isAgent = line.speaker === "Agent";
                    return (
                      <div key={index} className={`flex ${isAgent ? "justify-end" : "justify-start"} group`}>
                        <div className="max-w-[80%]">
                          <span className={`text-xs text-gray-400 mb-1 block ${isAgent ? "text-right" : "text-left"}`}>
                            {isAgent ? (activeCall.agent_name || "Agent") : (activeCall.customer_name || "Caller")}
                          </span>
                          <div className={`px-4 py-3 text-sm shadow-sm ${
                            isAgent 
                              ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm" 
                              : "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm border border-gray-200"
                          }`}>
                            {line.text}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-gray-500 italic text-center mt-10">Transcript is unavailable or processing.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
