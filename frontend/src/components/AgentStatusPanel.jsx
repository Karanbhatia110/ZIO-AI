import React, { useState, useRef, useEffect } from 'react';
import { Bot, CheckCircle, XCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp, Wrench, RefreshCw, FileText, Lightbulb } from 'lucide-react';

const AgentStatusPanel = ({ logs, isRunning, iteration, phase, finalResult }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const logsEndRef = useRef(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (logsEndRef.current && isRunning) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isRunning]);

    const getPhaseColor = () => {
        switch (phase) {
            case 'generating': return '#3b82f6';
            case 'validating': return '#f59e0b';
            case 'iterating': return '#8b5cf6';
            case 'complete': return '#10b981';
            case 'incomplete': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getLogIcon = (icon) => {
        switch (icon) {
            case 'success': return <CheckCircle size={14} className="text-green-400" />;
            case 'error': return <XCircle size={14} className="text-red-400" />;
            case 'warning': return <AlertTriangle size={14} className="text-yellow-400" />;
            case 'fix': return <Wrench size={14} className="text-blue-400" />;
            case 'retry': return <RefreshCw size={14} className="text-purple-400" />;
            case 'agent': return <Bot size={14} className="text-cyan-400" />;
            case 'loading': return <Loader2 size={14} className="text-gray-400 animate-spin" />;
            case 'doc': return <FileText size={14} className="text-emerald-400" />;
            default: return <Bot size={14} className="text-gray-400" />;
        }
    };

    const getSeverityStyle = (severity) => {
        switch (severity) {
            case 'critical': return { background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' };
            case 'error': return { background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' };
            case 'warning': return { background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.2)' };
            default: return { background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' };
        }
    };

    if (logs.length === 0 && !isRunning) return null;

    return (
        <div
            className="rounded-xl overflow-hidden mb-4 animate-slide-up"
            style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)'
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none' }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${getPhaseColor()}20` }}
                    >
                        {isRunning ? (
                            <Loader2 size={16} className="animate-spin" style={{ color: getPhaseColor() }} />
                        ) : (
                            <Bot size={16} style={{ color: getPhaseColor() }} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            AI Agent
                            {iteration > 0 && (
                                <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ background: `${getPhaseColor()}20`, color: getPhaseColor() }}
                                >
                                    Iteration {iteration}/5
                                </span>
                            )}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {phase === 'complete' ? 'Pipeline optimized successfully!' :
                                phase === 'incomplete' ? 'Max iterations reached' :
                                    isRunning ? 'Validating and optimizing...' : 'Ready'}
                        </p>
                    </div>
                </div>
                <button className="p-1 rounded hover:bg-white/10">
                    {isExpanded ? (
                        <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />
                    ) : (
                        <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                    )}
                </button>
            </div>

            {/* Logs */}
            {isExpanded && (
                <div
                    className="max-h-80 overflow-y-auto p-3 space-y-2"
                    style={{ background: 'var(--bg-primary)' }}
                >
                    {logs.map((log, index) => (
                        <div
                            key={index}
                            className="rounded-lg p-3 text-sm animate-fade-in"
                            style={{
                                ...getSeverityStyle(log.severity),
                                border: '1px solid',
                                animationDelay: `${index * 50}ms`
                            }}
                        >
                            <div className="flex items-start gap-2">
                                <span className="flex-shrink-0 mt-0.5">
                                    {getLogIcon(log.icon)}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white text-xs mb-0.5">
                                        {log.title}
                                    </div>
                                    <div
                                        className="text-xs break-words"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        {log.message}
                                    </div>
                                    {log.suggestion && (
                                        <div
                                            className="text-xs mt-1 italic flex items-center gap-1"
                                            style={{ color: 'var(--text-muted)' }}
                                        >
                                            <Lightbulb size={10} />
                                            {log.suggestion}
                                        </div>
                                    )}
                                </div>
                                <span
                                    className="text-[10px] flex-shrink-0"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {new Date().toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))}

                    {isRunning && (
                        <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--text-muted)' }}>
                            <Loader2 size={12} className="animate-spin" />
                            Processing...
                        </div>
                    )}

                    <div ref={logsEndRef} />
                </div>
            )}

            {/* Final Result Summary */}
            {finalResult && !isRunning && (
                <div
                    className="px-4 py-3"
                    style={{
                        background: finalResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderTop: '1px solid var(--border-subtle)'
                    }}
                >
                    <div className="flex items-center gap-2">
                        {finalResult.success ? (
                            <CheckCircle size={16} className="text-green-400" />
                        ) : (
                            <AlertTriangle size={16} className="text-yellow-400" />
                        )}
                        <span className="text-sm font-medium text-white">
                            {finalResult.message}
                        </span>
                    </div>
                    {finalResult.remainingErrors && finalResult.remainingErrors.length > 0 && (
                        <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {finalResult.remainingErrors.length} issue(s) may need manual review
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AgentStatusPanel;
