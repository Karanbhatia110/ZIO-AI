import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import MetadataViewer from '../components/MetadataViewer';
import PromptBox from '../components/PromptBox';
import PipelinePreview from '../components/PipelinePreview';
import ManualMetadataEditor from '../components/ManualMetadataEditor';
import AgentStatusPanel from '../components/AgentStatusPanel';
import { getMetadata, deployPipeline, getTables } from '../api/fabric';
import { generatePipeline, validateAndOptimize } from '../api/llm';
import { API_URL } from '../config';
import { Play, RefreshCw, Database, CheckCircle, XCircle, Bot, User, ChevronDown, Trash2, Table, Plus, MessageSquare, Clock, LogOut, FileText, Zap } from 'lucide-react';

const CHATS_STORAGE_KEY = 'zio_all_chats';
const ACTIVE_CHAT_KEY = 'zio_active_chat';

const PipelineBuilder = () => {
    const { instance } = useMsal();
    const navigate = useNavigate();

    const [metadata, setMetadata] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [deployStatus, setDeployStatus] = useState(null);
    const messagesEndRef = useRef(null);

    // Chat history state
    const [allChats, setAllChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [showHistory, setShowHistory] = useState(false);

    // Selection state
    const [selectedWorkspace, setSelectedWorkspace] = useState(null);
    const [selectedLakehouse, setSelectedLakehouse] = useState(null);
    const [selectedTables, setSelectedTables] = useState([]);
    const [availableTables, setAvailableTables] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [availableFiles, setAvailableFiles] = useState([]);
    const [loadingTables, setLoadingTables] = useState(false);

    // Trial user modal state
    const [showTrialModal, setShowTrialModal] = useState(false);
    const [trialModalContent, setTrialModalContent] = useState(null);

    // Agent mode state
    const [agentMode, setAgentMode] = useState(true); // Default ON
    const [agentLogs, setAgentLogs] = useState([]);
    const [agentRunning, setAgentRunning] = useState(false);
    const [agentIteration, setAgentIteration] = useState(0);
    const [agentPhase, setAgentPhase] = useState('');
    const [agentResult, setAgentResult] = useState(null);

    // Token usage state
    const [tokenUsage, setTokenUsage] = useState({ dailyUsed: 0, dailyLimit: 100000, hasSubscription: false });

    // Logout handler
    const handleLogout = () => {
        sessionStorage.removeItem('fabricAccessToken');
        sessionStorage.removeItem('fabricUserName');
        instance.logoutPopup().then(() => {
            navigate('/connect');
        }).catch((e) => {
            console.error('Logout error:', e);
            navigate('/connect');
        });
    };

    // Load all chats from localStorage on mount
    // Fetch token usage
    const fetchTokenUsage = async () => {
        try {
            const token = sessionStorage.getItem('fabricAccessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await fetch(`${API_URL}/usage/stats`, { headers });
            if (res.ok) {
                const data = await res.json();
                setTokenUsage(data);
            }
        } catch (error) {
            console.error('Failed to fetch token usage:', error);
        }
    };

    useEffect(() => {
        const savedChats = localStorage.getItem(CHATS_STORAGE_KEY);
        const savedActiveId = localStorage.getItem(ACTIVE_CHAT_KEY);

        if (savedChats) {
            try {
                const chats = JSON.parse(savedChats);
                setAllChats(chats);

                // Restore active chat or use most recent
                if (savedActiveId && chats.find(c => c.id === savedActiveId)) {
                    setActiveChatId(savedActiveId);
                } else if (chats.length > 0) {
                    setActiveChatId(chats[0].id);
                }
            } catch (e) {
                console.error('Failed to load chats:', e);
            }
        }
        loadMetadata();
        fetchTokenUsage();
    }, []);

    // Save chats to localStorage whenever they change
    useEffect(() => {
        if (allChats.length > 0) {
            localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(allChats));
        }
    }, [allChats]);

    // Save active chat ID
    useEffect(() => {
        if (activeChatId) {
            localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
        }
        // Reset agent state when switching chats
        setAgentLogs([]);
        setAgentIteration(0);
        setAgentPhase('');
        setAgentResult(null);
        setAgentRunning(false);
    }, [activeChatId]);

    // Get current chat's messages
    const currentChat = allChats.find(c => c.id === activeChatId);
    const messages = currentChat?.messages || [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-select first workspace when metadata loads
    useEffect(() => {
        if (metadata?.workspaces?.length > 0 && !selectedWorkspace) {
            setSelectedWorkspace(metadata.workspaces[0]);
        }
    }, [metadata]);

    // Auto-select first lakehouse when workspace changes
    useEffect(() => {
        if (metadata?.lakehouses?.length > 0 && selectedWorkspace) {
            const wsLakehouses = metadata.lakehouses.filter(
                lh => !lh.workspaceId || lh.workspaceId === selectedWorkspace.id
            );
            if (wsLakehouses.length > 0 && !selectedLakehouse) {
                setSelectedLakehouse(wsLakehouses[0]);
            }
        }
    }, [metadata, selectedWorkspace]);

    // Fetch tables and files when lakehouse changes
    useEffect(() => {
        if (selectedWorkspace && selectedLakehouse) {
            fetchTables();
        } else {
            setAvailableTables([]);
            setSelectedTables([]);
            setAvailableFiles([]);
            setSelectedFiles([]);
        }
    }, [selectedLakehouse]);

    const loadMetadata = async () => {
        try {
            const res = await getMetadata();
            setMetadata(res.data);
        } catch (err) {
            console.error("Failed to load metadata", err);
        }
    };

    const fetchTables = async () => {
        if (!selectedWorkspace || !selectedLakehouse) return;

        setLoadingTables(true);
        try {
            const res = await getTables(selectedWorkspace.id, selectedLakehouse.id);
            setAvailableTables(res.data.tables || []);
            setAvailableFiles(res.data.files || []);
            if (res.data.tablesWithSchema) {
                setMetadata(prev => ({
                    ...prev,
                    _tableSchemas: res.data.tablesWithSchema
                }));
            }
        } catch (err) {
            console.error("Failed to fetch tables/files:", err);
            setAvailableTables([]);
            setAvailableFiles([]);
        }
        setLoadingTables(false);
    };

    const toggleTable = (tableName) => {
        setSelectedTables(prev =>
            prev.includes(tableName)
                ? prev.filter(t => t !== tableName)
                : [...prev, tableName]
        );
    };

    const toggleFile = (filePath) => {
        setSelectedFiles(prev =>
            prev.includes(filePath)
                ? prev.filter(f => f !== filePath)
                : [...prev, filePath]
        );
    };

    // Create a new chat
    const createNewChat = () => {
        const newChat = {
            id: `chat_${Date.now()}`,
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        setAllChats(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setShowHistory(false);
    };

    // Delete a chat
    const deleteChat = (chatId) => {
        setAllChats(prev => prev.filter(c => c.id !== chatId));
        if (activeChatId === chatId) {
            const remaining = allChats.filter(c => c.id !== chatId);
            setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
        }
    };

    // Switch to a chat
    const switchChat = (chatId) => {
        setActiveChatId(chatId);
        setShowHistory(false);
    };

    // Update messages in current chat
    const updateCurrentChatMessages = (newMessages) => {
        setAllChats(prev => prev.map(chat => {
            if (chat.id === activeChatId) {
                // Update title based on first user message
                let title = chat.title;
                const firstUserMsg = newMessages.find(m => m.type === 'user');
                if (firstUserMsg && chat.title === 'New Chat') {
                    title = firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '');
                }
                return { ...chat, messages: newMessages, title, updatedAt: Date.now() };
            }
            return chat;
        }));
    };

    const handleGenerate = async (prompt) => {
        // Create new chat if none exists
        if (!activeChatId) {
            const newChat = {
                id: `chat_${Date.now()}`,
                title: prompt.slice(0, 40) + (prompt.length > 40 ? '...' : ''),
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            setAllChats(prev => [newChat, ...prev]);
            setActiveChatId(newChat.id);
        }

        // Include context about selected resources with schema
        let context = '';
        if (selectedLakehouse) {
            context += `\n\n[Context: Workspace "${selectedWorkspace?.name}", Lakehouse "${selectedLakehouse?.name}"`;

            if (selectedTables.length > 0) {
                const schemas = metadata?._tableSchemas || [];
                const tableInfo = selectedTables.map(tableName => {
                    const schema = schemas.find(s => s.name === tableName);
                    if (schema && schema.columns && schema.columns.length > 0) {
                        const cols = schema.columns.map(c => `${c.name} (${c.dataType || c.type || 'unknown'})`).join(', ');
                        return `${tableName}: [${cols}]`;
                    }
                    return tableName;
                });
                context += `\nTables with schema:\n${tableInfo.join('\n')}`;
            }

            if (selectedFiles.length > 0) {
                const fileInfo = selectedFiles.map(filePath => {
                    const file = availableFiles.find(f => f.path === filePath);
                    if (file) {
                        return `${file.path} (${file.type})`;
                    }
                    return filePath;
                });
                context += `\nFiles:\n${fileInfo.join('\n')}`;
            }

            context += ']';
        }

        const fullPrompt = prompt + context;

        const userMessage = { type: 'user', content: prompt, timestamp: Date.now() };
        const newMessages = [...messages, userMessage];
        updateCurrentChatMessages(newMessages);

        setIsGenerating(true);
        setDeployStatus(null);

        // Reset agent state
        setAgentLogs([]);
        setAgentIteration(0);
        setAgentPhase('');
        setAgentResult(null);

        try {
            if (agentMode) {
                // Use agent mode with validation loop and live updates
                setAgentRunning(true);

                await validateAndOptimize(fullPrompt, messages, (event) => {
                    switch (event.type) {
                        case 'status':
                            setAgentPhase(event.phase);
                            setAgentIteration(event.iteration);
                            break;
                        case 'detail':
                            setAgentLogs(prev => [...prev, {
                                icon: event.icon,
                                title: event.title,
                                message: event.message,
                                severity: event.severity,
                                suggestion: event.suggestion
                            }]);
                            break;
                        case 'complete':
                            setAgentResult(event);
                            setAgentRunning(false);
                            if (event.pipeline) {
                                const aiMessage = {
                                    type: 'ai',
                                    content: event.pipeline,
                                    timestamp: Date.now(),
                                    validated: event.success,
                                    iterations: event.iterations
                                };
                                updateCurrentChatMessages([...newMessages, aiMessage]);
                            }
                            break;
                    }
                });
            } else {
                // Simple mode - just generate without validation
                const res = await generatePipeline(fullPrompt, messages);
                const aiMessage = { type: 'ai', content: res.data.result, timestamp: Date.now() };
                updateCurrentChatMessages([...newMessages, aiMessage]);
            }
        } catch (err) {
            console.error("Generation failed", err);
            setAgentRunning(false);
            const errorMessage = { type: 'error', content: 'Failed to generate pipeline. Please try again.', timestamp: Date.now() };
            updateCurrentChatMessages([...newMessages, errorMessage]);
        } finally {
            setIsGenerating(false);
            setAgentRunning(false);
        }
    };

    const handleDeploy = async (content) => {
        if (!content) return;
        if (!selectedWorkspace) {
            setDeployStatus('Select a workspace first');
            return;
        }

        // Prompt for pipeline name
        const pipelineName = window.prompt('Enter pipeline name:', `pipeline_${Date.now()}`);
        if (!pipelineName || !pipelineName.trim()) {
            setDeployStatus('Deployment cancelled');
            return;
        }

        setDeployStatus('Deploying...');
        try {
            const result = await deployPipeline(content, selectedWorkspace.id, selectedLakehouse?.name, pipelineName.trim());
            if (result.data.success) {
                setDeployStatus(`Deployed: ${result.data.pipelineName}`);
                // Open in new tab
                if (result.data.url) {
                    window.open(result.data.url, '_blank');
                }
            } else {
                setDeployStatus('Failed');
            }
        } catch (err) {
            console.error('Deploy error:', err);
            const errorCode = err.response?.data?.errorCode;
            const errorMessage = err.response?.data?.error || err.message;

            // Check if this is a trial user (FeatureNotAvailable error)
            if (errorCode === 'FeatureNotAvailable') {
                setTrialModalContent(content);
                setShowTrialModal(true);
                setDeployStatus('Trial capacity detected');
            } else {
                setDeployStatus('Failed: ' + errorMessage);
            }
        }
    };

    const clearCurrentChat = () => {
        if (activeChatId) {
            updateCurrentChatMessages([]);
        }
    };

    // Get lakehouses for selected workspace
    const filteredLakehouses = metadata?.lakehouses?.filter(
        lh => !lh.workspaceId || lh.workspaceId === selectedWorkspace?.id
    ) || [];

    // Format date for display
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
            {/* Sidebar */}
            <div className="w-80 sidebar flex flex-col">
                {/* Header */}
                <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src="/transparent_logo.png" alt="zio.ai" className="w-8 h-8" />
                            <span className="text-lg font-semibold text-white">zio.ai</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={createNewChat}
                                className="p-2 rounded-lg transition hover:bg-white/5"
                                style={{ color: 'var(--text-muted)' }}
                                title="New Chat"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                onClick={loadMetadata}
                                className="p-2 rounded-lg transition hover:bg-white/5"
                                style={{ color: 'var(--text-muted)' }}
                                title="Refresh"
                            >
                                <RefreshCw size={16} />
                            </button>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg transition hover:bg-white/5 hover:text-red-400"
                                style={{ color: 'var(--text-muted)' }}
                                title="Sign Out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chat History Toggle */}
                <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition hover:bg-white/5"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <div className="flex items-center gap-2">
                            <Clock size={14} />
                            <span>Chat History</span>
                            {allChats.length > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)' }}>
                                    {allChats.length}
                                </span>
                            )}
                        </div>
                        <ChevronDown size={14} className={`transition ${showHistory ? 'rotate-180' : ''}`} />
                    </button>

                    {/* History List */}
                    {showHistory && (
                        <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                            {allChats.length === 0 ? (
                                <div className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                                    No chat history
                                </div>
                            ) : (
                                allChats.map(chat => (
                                    <div
                                        key={chat.id}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition ${chat.id === activeChatId ? 'bg-white/10' : 'hover:bg-white/5'
                                            }`}
                                        onClick={() => switchChat(chat.id)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate" style={{ color: chat.id === activeChatId ? 'white' : 'var(--text-secondary)' }}>
                                                <MessageSquare size={12} className="inline mr-1.5" />
                                                {chat.title}
                                            </div>
                                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                {formatDate(chat.updatedAt)}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                                            className="p-1 rounded hover:bg-red-500/20 hover:text-red-400"
                                            style={{ color: 'var(--text-muted)' }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Agent Mode Toggle */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div
                        className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/5 transition"
                        style={{
                            background: agentMode ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-primary)',
                            border: `1px solid ${agentMode ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-subtle)'}`
                        }}
                        onClick={() => setAgentMode(!agentMode)}
                    >
                        <div className="flex items-center gap-2">
                            <Zap size={16} style={{ color: agentMode ? '#8b5cf6' : 'var(--text-muted)' }} />
                            <div>
                                <div className="text-sm font-medium text-white">Agent Mode</div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {agentMode ? 'Auto-validate & optimize' : 'Simple generation'}
                                </div>
                            </div>
                        </div>
                        <div
                            className="w-10 h-5 rounded-full p-0.5 transition-colors"
                            style={{ background: agentMode ? '#8b5cf6' : 'var(--bg-elevated)' }}
                        >
                            <div
                                className="w-4 h-4 rounded-full bg-white transition-transform"
                                style={{ transform: agentMode ? 'translateX(20px)' : 'translateX(0)' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Selectors */}
                <div className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {/* Workspace Selector */}
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            WORKSPACE
                        </label>
                        <div className="relative">
                            <select
                                value={selectedWorkspace?.id || ''}
                                onChange={(e) => {
                                    const ws = metadata?.workspaces?.find(w => w.id === e.target.value);
                                    setSelectedWorkspace(ws);
                                    setSelectedLakehouse(null);
                                    setSelectedTables([]);
                                    setAvailableTables([]);
                                }}
                                className="input-dark text-sm w-full appearance-none pr-8 cursor-pointer"
                            >
                                {metadata?.workspaces?.map(ws => (
                                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    {/* Lakehouse Selector */}
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            LAKEHOUSE
                        </label>
                        <div className="relative">
                            <select
                                value={selectedLakehouse?.id || ''}
                                onChange={(e) => {
                                    const lh = filteredLakehouses.find(l => l.id === e.target.value);
                                    setSelectedLakehouse(lh);
                                    setSelectedTables([]);
                                }}
                                className="input-dark text-sm w-full appearance-none pr-8 cursor-pointer"
                                disabled={filteredLakehouses.length === 0}
                            >
                                {filteredLakehouses.length === 0 ? (
                                    <option value="">No lakehouses</option>
                                ) : (
                                    filteredLakehouses.map(lh => (
                                        <option key={lh.id} value={lh.id}>{lh.name}</option>
                                    ))
                                )}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    {/* Tables Multi-Select */}
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            TABLES {selectedTables.length > 0 && `(${selectedTables.length} selected)`}
                        </label>
                        <div
                            className="rounded-lg p-2 max-h-40 overflow-y-auto space-y-1"
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                        >
                            {loadingTables ? (
                                <div className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>
                                    Loading tables...
                                </div>
                            ) : availableTables.length === 0 ? (
                                <div className="space-y-2">
                                    <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                                        {selectedLakehouse ? 'Enter table names:' : 'Select a lakehouse'}
                                    </div>
                                    {selectedLakehouse && (
                                        <input
                                            type="text"
                                            placeholder="table1, table2..."
                                            className="input-dark text-xs w-full"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                    const tables = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                                    setSelectedTables(prev => [...new Set([...prev, ...tables])]);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    )}
                                    {selectedTables.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedTables.map(t => (
                                                <span
                                                    key={t}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                                                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                                >
                                                    {t}
                                                    <button
                                                        onClick={() => setSelectedTables(prev => prev.filter(x => x !== t))}
                                                        className="hover:text-red-400"
                                                    >×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                availableTables.map(table => (
                                    <label
                                        key={table}
                                        className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-white/5 text-xs"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTables.includes(table)}
                                            onChange={() => toggleTable(table)}
                                            className="rounded"
                                            style={{ accentColor: 'var(--accent)' }}
                                        />
                                        <Table size={12} style={{ color: 'var(--accent)' }} />
                                        <span>{table}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Files Multi-Select */}
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            FILES {selectedFiles.length > 0 && `(${selectedFiles.length} selected)`}
                        </label>
                        <div className="rounded-lg p-2 max-h-32 overflow-y-auto space-y-1" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                            {loadingTables ? (
                                <div className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>
                                    Loading files...
                                </div>
                            ) : availableFiles.length === 0 ? (
                                <div className="space-y-2">
                                    <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                                        {selectedLakehouse ? 'Enter file paths:' : 'Select a lakehouse'}
                                    </div>
                                    {selectedLakehouse && (
                                        <input
                                            type="text"
                                            placeholder="Files/data.csv, Files/input.parquet..."
                                            className="input-dark text-xs w-full"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                    const files = e.target.value.split(',').map(f => f.trim()).filter(Boolean);
                                                    setSelectedFiles(prev => [...new Set([...prev, ...files])]);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    )}
                                    {selectedFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedFiles.map(f => (
                                                <span
                                                    key={f}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                                                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                                >
                                                    <FileText size={10} />
                                                    {f.split('/').pop()}
                                                    <button
                                                        onClick={() => setSelectedFiles(prev => prev.filter(x => x !== f))}
                                                        className="hover:text-red-400"
                                                    >×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                availableFiles.map(file => (
                                    <label
                                        key={file.path}
                                        className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-white/5 text-xs"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFiles.includes(file.path)}
                                            onChange={() => toggleFile(file.path)}
                                            className="rounded"
                                            style={{ accentColor: 'var(--accent)' }}
                                        />
                                        <FileText size={12} style={{ color: '#f59e0b' }} />
                                        <span className="flex-1 truncate">{file.name}</span>
                                        <span
                                            className="text-[10px] px-1 py-0.5 rounded"
                                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                                        >
                                            {file.type}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Token Usage Section */}
                <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                            DAILY TOKENS
                        </span>
                        {tokenUsage.hasSubscription ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                Premium
                            </span>
                        ) : (
                            <button
                                onClick={() => navigate('/subscription')}
                                className="text-xs px-2 py-0.5 rounded-full hover:opacity-80 transition"
                                style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}
                            >
                                Upgrade
                            </button>
                        )}
                    </div>
                    {!tokenUsage.hasSubscription && (
                        <>
                            <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'var(--bg-primary)' }}>
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, (tokenUsage.dailyUsed / tokenUsage.dailyLimit) * 100)}%`,
                                        background: (tokenUsage.dailyUsed / tokenUsage.dailyLimit) > 0.8 ? '#ef4444' :
                                            (tokenUsage.dailyUsed / tokenUsage.dailyLimit) > 0.5 ? '#f59e0b' : '#10b981'
                                    }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                <span>{(tokenUsage.dailyUsed || 0).toLocaleString()}</span>
                                <span>{(tokenUsage.dailyLimit || 100000).toLocaleString()}</span>
                            </div>
                        </>
                    )}
                    {tokenUsage.hasSubscription && (
                        <div className="text-xs text-center py-1" style={{ color: 'var(--text-muted)' }}>
                            Unlimited usage active
                        </div>
                    )}
                </div>

                {/* Metadata Section */}
                <div className="flex-1 overflow-auto p-4">
                    <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                        <Database size={14} />
                        <span>ALL DATA SOURCES</span>
                    </div>
                    <MetadataViewer metadata={metadata} />
                    <ManualMetadataEditor onSaved={loadMetadata} />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <div className="h-12 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {currentChat?.title || 'New Chat'}
                        </span>
                        {messages.length > 0 && (
                            <button
                                onClick={clearCurrentChat}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/5"
                                style={{ color: 'var(--text-muted)' }}
                                title="Clear current chat"
                            >
                                <Trash2 size={12} /> Clear
                            </button>
                        )}
                    </div>
                    {deployStatus && (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs ${deployStatus === 'Failed' ? 'text-red-400' :
                            deployStatus === 'Success!' ? 'text-green-400' : 'text-blue-400'
                            }`} style={{ background: 'var(--bg-tertiary)' }}>
                            {deployStatus === 'Failed' ? <XCircle size={14} /> :
                                deployStatus === 'Success!' ? <CheckCircle size={14} /> :
                                    <RefreshCw size={14} className="animate-spin" />}
                            <span>{deployStatus}</span>
                        </div>
                    )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-3xl mx-auto p-6 space-y-6">
                        {/* Welcome */}
                        {messages.length === 0 && !isGenerating && (
                            <div className="flex flex-col items-center justify-center min-h-[400px] text-center animate-fade-in">
                                <img src="/transparent_logo.png" alt="zio.ai" className="w-16 h-16 mb-4" />
                                <h2 className="text-xl font-medium text-white mb-2">How can I help you today?</h2>
                                <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                                    Describe the data pipeline you want to create
                                </p>
                                {selectedLakehouse && (
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        Working with: <span style={{ color: 'var(--accent)' }}>{selectedLakehouse.name}</span>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Agent Status Panel */}
                        {/* Agent Status Panel - Show only while running or if iteration is in progress */}
                        {agentMode && agentRunning && (
                            <AgentStatusPanel
                                logs={agentLogs}
                                isRunning={agentRunning}
                                iteration={agentIteration}
                                phase={agentPhase}
                                finalResult={agentResult}
                            />
                        )}

                        {/* Messages */}
                        {messages.map((message) => (
                            <div key={message.timestamp} className="animate-slide-up">
                                {message.type === 'user' ? (
                                    <div className="flex gap-3">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                                            <User size={14} style={{ color: 'var(--text-secondary)' }} />
                                        </div>
                                        <div className="flex-1 pt-0.5">
                                            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>You</div>
                                            <div className="text-white text-sm">{message.content}</div>
                                        </div>
                                    </div>
                                ) : message.type === 'error' ? (
                                    <div className="flex gap-3">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                                            <XCircle size={14} className="text-red-400" />
                                        </div>
                                        <div className="flex-1 pt-0.5">
                                            <div className="text-xs font-medium mb-1 text-red-400">Error</div>
                                            <div className="text-red-300 text-sm">{message.content}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)' }}>
                                            <Bot size={14} className="text-white" />
                                        </div>
                                        <div className="flex-1 pt-0.5">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>zio.ai</div>
                                                <button
                                                    onClick={() => handleDeploy(message.content)}
                                                    className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                                >
                                                    <Play size={12} /> Deploy
                                                </button>
                                            </div>
                                            <PipelinePreview yaml={message.content} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Typing */}
                        {isGenerating && (
                            <div className="flex gap-3 animate-fade-in">
                                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)' }}>
                                    <Bot size={14} className="text-white" />
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>zio.ai</div>
                                    <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '0ms' }}></span>
                                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '150ms' }}></span>
                                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '300ms' }}></span>
                                        </div>
                                        <span className="text-xs">Generating...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Prompt Box */}
                <div className="p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="max-w-3xl mx-auto">
                        <PromptBox onGenerate={handleGenerate} isGenerating={isGenerating} />
                    </div>
                </div>
            </div>

            {/* Trial User Modal */}
            {showTrialModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
                    <div
                        className="w-full max-w-lg rounded-xl p-6 animate-slide-up"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(251, 191, 36, 0.2)' }}>
                                <span className="text-xl">⚠️</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Fabric Trial Detected</h3>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    Direct deployment is not available on trial capacities
                                </p>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                            <p className="text-sm font-medium text-white mb-3">📋 Manual Deployment Steps:</p>
                            <ol className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
                                <li className="flex gap-2">
                                    <span className="font-medium text-white">1.</span>
                                    <span>Copy the pipeline YAML using the button below</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-medium text-white">2.</span>
                                    <span>Open <a
                                        href="https://app.fabric.microsoft.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:text-white"
                                        style={{ color: 'var(--accent)' }}
                                    >Microsoft Fabric Portal</a></span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-medium text-white">3.</span>
                                    <span>Navigate to your workspace → <strong>New</strong> → <strong>Data Pipeline</strong></span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-medium text-white">4.</span>
                                    <span>Configure activities based on the YAML structure</span>
                                </li>
                            </ol>
                        </div>

                        {/* Info Box */}
                        <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            <p className="text-xs" style={{ color: '#60a5fa' }}>
                                💡 <strong>Tip:</strong> To enable automatic deployment, upgrade to a paid Fabric capacity (F64 or higher).
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(trialModalContent);
                                    setDeployStatus('Copied to clipboard!');
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition"
                                style={{ background: 'var(--accent)', color: '#fff' }}
                            >
                                📋 Copy YAML
                            </button>
                            <button
                                onClick={() => {
                                    const blob = new Blob([trialModalContent], { type: 'text/yaml' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'pipeline.yaml';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                            >
                                ⬇️ Download
                            </button>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => {
                                setShowTrialModal(false);
                                setTrialModalContent(null);
                            }}
                            className="w-full mt-3 px-4 py-2 rounded-lg text-sm transition hover:bg-white/5"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PipelineBuilder;
