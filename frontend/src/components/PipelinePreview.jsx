import React, { useState, useMemo } from 'react';
import { Copy, Download, Check, FileCode, Database, ArrowRight, Clock, Workflow, Table, ChevronDown, ChevronUp } from 'lucide-react';
import yaml from 'js-yaml';

const PipelinePreview = ({ yaml: yamlString }) => {
    const [copied, setCopied] = useState(false);
    const [showRaw, setShowRaw] = useState(false);

    // Clean YAML content by removing delimiters and labels
    const cleanYamlContent = (content) => {
        if (!content) return '';

        let cleaned = content;

        // Remove --- delimiters
        cleaned = cleaned.replace(/^---\s*$/gm, '');
        cleaned = cleaned.replace(/^---\s*\n/gm, '');
        cleaned = cleaned.replace(/\n---\s*$/gm, '');

        // Remove PIPELINE_YAML: label
        cleaned = cleaned.replace(/^PIPELINE_YAML:\s*\n?/gm, '');

        // Remove NOTEBOOKS: section and everything after it
        const notebooksIndex = cleaned.indexOf('NOTEBOOKS:');
        if (notebooksIndex !== -1) {
            cleaned = cleaned.substring(0, notebooksIndex);
        }

        return cleaned.trim();
    };

    const cleanedYaml = useMemo(() => cleanYamlContent(yamlString), [yamlString]);

    const parsedPipeline = useMemo(() => {
        if (!cleanedYaml) return null;
        try {
            const parsed = yaml.load(cleanedYaml);
            return parsed?.pipeline || null;
        } catch (e) {
            console.error('Failed to parse YAML:', e);
            return null;
        }
    }, [cleanedYaml]);

    if (!yamlString) return null;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(cleanedYaml);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([cleanedYaml], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const pipelineName = parsedPipeline?.name || 'fabric-pipeline';
        a.download = `${pipelineName.replace(/\s+/g, '-').toLowerCase()}.yaml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getActivityIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'copy':
                return <Database size={16} />;
            case 'notebook':
                return <FileCode size={16} />;
            case 'dataflow':
                return <Workflow size={16} />;
            default:
                return <Table size={16} />;
        }
    };

    const getActivityColor = (type) => {
        switch (type?.toLowerCase()) {
            case 'copy':
                return { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#60a5fa' };
            case 'notebook':
                return { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', text: '#c084fc' };
            case 'dataflow':
                return { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#4ade80' };
            default:
                return { bg: 'rgba(156, 163, 175, 0.15)', border: '#9ca3af', text: '#d1d5db' };
        }
    };

    const renderActivityDetails = (activity) => {
        const type = activity.type?.toLowerCase();

        if (type === 'copy') {
            // Support both new format (source/sink) and legacy format (settings.source/settings.target)
            const source = activity.source || activity.settings?.source;
            const sink = activity.sink || activity.target || activity.settings?.target;

            // Determine display values
            const sourceDisplay = source?.lakehouse
                ? `${source.lakehouse}: ${source.path}`
                : source?.type
                    ? `${source.type}: ${source.path}`
                    : source?.path || 'N/A';

            const sinkDisplay = sink?.lakehouse
                ? `${sink.lakehouse}: ${sink.path}`
                : sink?.type
                    ? `${sink.type}: ${sink.path}`
                    : sink?.path || 'N/A';

            return (
                <div className="mt-2 text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-2">
                        <span className="opacity-60">Source:</span>
                        <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>
                            {sourceDisplay}
                        </code>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="opacity-60">Sink:</span>
                        <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>
                            {sinkDisplay}
                        </code>
                    </div>
                </div>
            );
        }

        if (type === 'notebook') {
            return (
                <div className="mt-2 text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-2">
                        <span className="opacity-60">Notebook ID:</span>
                        <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>
                            {activity.notebookId}
                        </code>
                    </div>
                    {activity.inputs?.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="opacity-60">Inputs:</span>
                            {activity.inputs.map((input, i) => (
                                <code key={i} className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>
                                    {input.dataset}
                                </code>
                            ))}
                        </div>
                    )}
                    {activity.outputs?.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="opacity-60">Outputs:</span>
                            {activity.outputs.map((output, i) => (
                                <code key={i} className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>
                                    {output.dataset}
                                </code>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (type === 'dataflow') {
            return (
                <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-2">
                        <span className="opacity-60">Dataflow ID:</span>
                        <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>
                            {activity.dataflowId}
                        </code>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="space-y-3">
            {/* Header with pipeline info */}
            {parsedPipeline && (
                <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                {parsedPipeline.name || 'Untitled Pipeline'}
                            </h3>
                            {parsedPipeline.description && (
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    {parsedPipeline.description}
                                </p>
                            )}
                        </div>
                        {parsedPipeline.schedule && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                                style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                                <Clock size={12} />
                                {parsedPipeline.schedule.type}
                                {parsedPipeline.schedule.interval && ` (${parsedPipeline.schedule.interval})`}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Visual Pipeline Activities */}
            {parsedPipeline?.activities && parsedPipeline.activities.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Activities ({parsedPipeline.activities.length})
                    </div>
                    <div className="space-y-2">
                        {parsedPipeline.activities.map((activity, index) => {
                            const colors = getActivityColor(activity.type);
                            return (
                                <div key={index}>
                                    <div
                                        className="rounded-lg p-3 transition-all hover:scale-[1.01]"
                                        style={{
                                            background: colors.bg,
                                            border: `1px solid ${colors.border}`,
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-md" style={{ background: colors.border, color: '#fff' }}>
                                                {getActivityIcon(activity.type)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                        {activity.name}
                                                    </span>
                                                    <span
                                                        className="text-xs px-1.5 py-0.5 rounded-full"
                                                        style={{ background: colors.border, color: '#fff' }}
                                                    >
                                                        {activity.type}
                                                    </span>
                                                </div>
                                                {activity.dependsOn?.length > 0 && (
                                                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                                        Depends on: {activity.dependsOn.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {renderActivityDetails(activity)}
                                    </div>
                                    {index < parsedPipeline.activities.length - 1 && (
                                        <div className="flex justify-center py-1">
                                            <ArrowRight size={16} style={{ color: 'var(--text-muted)', transform: 'rotate(90deg)' }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition hover:opacity-80"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                    {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showRaw ? 'Hide' : 'Show'} Raw YAML
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition hover:opacity-80"
                        style={{ background: 'var(--accent-primary)', color: '#fff' }}
                    >
                        <Download size={12} />
                        Download
                    </button>
                </div>
            </div>

            {/* Raw YAML view (collapsible) */}
            {showRaw && (
                <div className="code-block p-3 max-h-60 overflow-auto rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <pre className="text-xs whitespace-pre-wrap" style={{ color: '#4ade80' }}>
                        {cleanedYaml}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default PipelinePreview;
