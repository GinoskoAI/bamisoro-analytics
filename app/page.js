<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bamisoro - Live Call Intelligence</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="bg-gray-50 text-gray-800 font-sans h-screen flex overflow-hidden">

    <!-- Sidebar: Live Call Feed -->
    <aside class="w-80 bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
        <div class="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-900 text-white">
            <div>
                <h1 class="text-xl font-bold tracking-tight">Bamisoro</h1>
                <p class="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Live Feed
                </p>
            </div>
        </div>
        <div class="p-4 flex-1 overflow-y-auto space-y-3" id="call-list">
            <!-- JavaScript Injects Feed Here -->
        </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col h-screen overflow-y-auto relative">
        
        <!-- Header: Call Meta -->
        <header class="bg-white px-8 py-6 border-b border-gray-200 flex justify-between items-start shadow-sm sticky top-0 z-10">
            <div>
                <div class="flex items-center gap-3 mb-1">
                    <h2 class="text-2xl font-bold text-gray-900" id="ui-intent">Loading...</h2>
                    <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800" id="ui-sentiment">Neutral</span>
                </div>
                <p class="text-sm text-gray-500 font-mono" id="ui-meta">ID: -- | Time: --</p>
            </div>
            
            <div class="flex gap-6 text-right">
                <div>
                    <p class="text-xs text-gray-400 uppercase tracking-wide font-semibold">Customer</p>
                    <p class="text-sm font-bold text-gray-900" id="ui-customer-name">--</p>
                    <p class="text-sm text-gray-500 font-mono" id="ui-customer-phone">--</p>
                </div>
                <div class="w-px bg-gray-200"></div>
                <div>
                    <p class="text-xs text-gray-400 uppercase tracking-wide font-semibold">Handled By</p>
                    <p class="text-sm font-bold text-gray-900" id="ui-agent-name">--</p>
                    <p class="text-sm text-gray-500 font-mono">Ext: <span id="ui-agent-ext">--</span></p>
                </div>
            </div>
        </header>

        <!-- Analytics Grid -->
        <div class="p-8 max-w-7xl mx-auto w-full space-y-6">
            
            <!-- Top Metrics -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- CSAT -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500 font-semibold uppercase tracking-wide">CSAT Score</p>
                    <div class="flex items-end gap-2 mt-2">
                        <p class="text-5xl font-extrabold" id="ui-csat">0</p>
                        <p class="text-gray-400 mb-1 font-medium">/ 100</p>
                    </div>
                </div>

                <!-- Next Action (High Priority) -->
                <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-amber-500 border-y-gray-100 border-r-gray-100">
                    <p class="text-sm text-gray-500 font-semibold uppercase tracking-wide">Next Action Required</p>
                    <p class="text-lg font-bold text-gray-900 mt-3" id="ui-action">--</p>
                </div>

                <!-- AI Summary -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500 font-semibold uppercase tracking-wide mb-2 flex justify-between">
                        AI Summary <span class="text-indigo-500">Gemini 2.5</span>
                    </p>
                    <p class="text-sm text-gray-700 leading-relaxed line-clamp-3" id="ui-summary">--</p>
                </div>
            </div>

            <!-- Deep Dive -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- Left Column -->
                <div class="lg:col-span-1 space-y-6">
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 class="font-semibold text-gray-900 mb-2">Sentiment Velocity</h3>
                        <p class="text-sm text-gray-600 leading-relaxed" id="ui-velocity">--</p>
                    </div>
                </div>

                <!-- Right Column: Transcript -->
                <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
                    <div class="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex justify-between items-center">
                        <h3 class="font-semibold text-gray-900">Live Transcript</h3>
                    </div>
                    <div class="p-6 overflow-y-auto flex-1 space-y-4 scrollbar-hide" id="ui-transcript">
                        <!-- Injected by JS -->
                    </div>
                </div>

            </div>
        </div>
    </main>

    <script>
        // --- MOCK DATABASE (Merged PBX Metadata + Gemini AI) ---
        const liveCalls = [
            {
                call_id: "CALL-109348",
                timestamp: "2026-07-30 • 14:15:00 WAT",
                customer_name: "John Doe",
                customer_phone: "+234 803 123 4567",
                agent_name: "Sarah Connor",
                agent_ext: "104",
                intent_detected: "Password Reset Escalation",
                csat_score: 95,
                sentiment: "Positive",
                sentiment_velocity: "Started highly stressed about deployment blockage, ended relieved and thankful.",
                next_action: "None - Issue fully resolved on call.",
                ai_summary: "The caller was locked out of their admin dashboard 20 minutes before a deployment. The agent successfully verified identity and guided them through the MFA reset process.",
                transcript: [
                    { speaker: "Agent", text: "Bamisoro Support, my name is Sarah. How can I assist you today?" },
                    { speaker: "Caller", text: "Hi Sarah, I'm John. I'm completely locked out of my admin dashboard and I have a deployment in 20 minutes." },
                    { speaker: "Agent", text: "I understand that's stressful, John. I can absolutely help you get back in. Let's send a reset link to your backup phone number." },
                    { speaker: "Caller", text: "Okay, I just got the text. Typing in the code now... Alright, I'm back in. You saved me, thank you!" }
                ]
            },
            {
                call_id: "CALL-109349",
                timestamp: "2026-07-30 • 14:10:22 WAT",
                customer_name: "Unknown Caller",
                customer_phone: "+234 805 987 6543",
                agent_name: "Alex Smith",
                agent_ext: "109",
                intent_detected: "Billing Dispute",
                csat_score: 40,
                sentiment: "Negative",
                sentiment_velocity: "Started angry about double charge, ended frustrated due to lack of immediate refund.",
                next_action: "Manager Call-Back Required (Escalated)",
                ai_summary: "Caller was upset regarding an unexpected double charge on their recent API usage invoice. The agent lacked empathy and was unable to process the refund immediately.",
                transcript: [
                    { speaker: "Agent", text: "Bamisoro Billing, this is Alex." },
                    { speaker: "Caller", text: "You guys charged me twice for my API usage this month! I need a refund immediately." },
                    { speaker: "Agent", text: "Let me check... I see the two charges. Our system won't let me reverse it." },
                    { speaker: "Caller", text: "What do you mean? Just refund the $150." },
                    { speaker: "Agent", text: "I have to escalate this to my manager. They will email you." }
                ]
            }
        ];

        let activeCallId = liveCalls[0].call_id;

        function init() {
            renderSidebar();
            loadCall(activeCallId);
        }

        function getCsatColor(score) {
            if (score >= 85) return "text-green-600";
            if (score >= 60) return "text-amber-500";
            return "text-red-600";
        }

        function renderSidebar() {
            const list = document.getElementById('call-list');
            list.innerHTML = liveCalls.map(call => `
                <button onclick="loadCall('${call.call_id}')" 
                    class="w-full text-left p-4 rounded-xl border transition-all duration-200 
                    ${call.call_id === activeCallId ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300'}">
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-sm ${call.call_id === activeCallId ? 'text-indigo-800' : 'text-gray-900'}">${call.intent_detected}</span>
                    </div>
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-xs text-gray-500 font-mono">${call.customer_phone}</span>
                        <span class="text-xs font-bold px-2 py-1 rounded bg-gray-100 ${getCsatColor(call.csat_score)}">CSAT: ${call.csat_score}</span>
                    </div>
                </button>
            `).join('');
        }

        function loadCall(id) {
            activeCallId = id;
            renderSidebar(); 
            const call = liveCalls.find(c => c.call_id === id);

            // Populate Header Data
            document.getElementById('ui-intent').innerText = call.intent_detected;
            document.getElementById('ui-meta').innerText = `ID: ${call.call_id} | ${call.timestamp}`;
            document.getElementById('ui-customer-name').innerText = call.customer_name;
            document.getElementById('ui-customer-phone').innerText = call.customer_phone;
            document.getElementById('ui-agent-name').innerText = call.agent_name;
            document.getElementById('ui-agent-ext').innerText = call.agent_ext;

            // Populate Metrics
            const csatEl = document.getElementById('ui-csat');
            csatEl.innerText = call.csat_score;
            csatEl.className = `text-5xl font-extrabold transition-colors ${getCsatColor(call.csat_score)}`;

            const actionEl = document.getElementById('ui-action');
            actionEl.innerText = call.next_action;
            actionEl.className = `text-lg font-bold mt-3 ${call.next_action.includes('None') ? 'text-green-600' : 'text-red-600'}`;

            const sentEl = document.getElementById('ui-sentiment');
            sentEl.innerText = call.sentiment;
            sentEl.className = `px-2.5 py-1 rounded-md text-xs font-bold ${
                call.sentiment === 'Positive' ? 'bg-green-100 text-green-800' : 
                call.sentiment === 'Negative' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
            }`;

            // Populate Text
            document.getElementById('ui-summary').innerText = call.ai_summary;
            document.getElementById('ui-velocity').innerText = call.sentiment_velocity;

            // Render Transcript Chat Bubbles
            document.getElementById('ui-transcript').innerHTML = call.transcript.map(line => {
                const isAgent = line.speaker === "Agent";
                return `
                    <div class="flex ${isAgent ? "justify-end" : "justify-start"} group">
                        <div class="max-w-[80%]">
                            <span class="text-xs text-gray-400 mb-1 block ${isAgent ? "text-right" : "text-left"} opacity-0 group-hover:opacity-100 transition-opacity">
                                ${isAgent ? call.agent_name : call.customer_name}
                            </span>
                            <div class="px-4 py-3 text-sm shadow-sm ${
                                isAgent 
                                ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm" 
                                : "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm border border-gray-200"
                            }">
                                ${line.text}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Initialize Dashboard
        init();
    </script>
</body>
</html>
