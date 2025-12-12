import React from 'react';
import { Database, Folder, Table, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

const MetadataViewer = ({ metadata }) => {
    if (!metadata) {
        return (
            <div className="text-center py-8">
                <Database size={24} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-2" />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No metadata loaded</p>
            </div>
        );
    }

    const getSourceBadge = () => {
        switch (metadata._source) {
            case 'api':
                return <span className="badge badge-success"><CheckCircle size={10} /> Live</span>;
            case 'manual':
                return <span className="badge badge-info"><Settings size={10} /> Manual</span>;
            case 'error':
            case 'mock':
                return <span className="badge badge-warning"><AlertTriangle size={10} /> Demo</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-3">
            {metadata._message && (
                <div className="text-xs p-2 rounded-md" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                        <span>{metadata._message}</span>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Workspaces</span>
                {getSourceBadge()}
            </div>

            {metadata.workspaces?.map(ws => (
                <div key={ws.id} className="card p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <Folder size={14} style={{ color: 'var(--accent)' }} />
                        <span className="text-sm font-medium text-white">{ws.name}</span>
                    </div>

                    {metadata.lakehouses?.map(lh => (
                        <div key={lh.id} className="ml-4 p-2 rounded-md" style={{ background: 'var(--bg-primary)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Database size={12} style={{ color: 'var(--success)' }} />
                                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>{lh.name}</span>
                            </div>
                            <div className="ml-4 space-y-1">
                                {lh.tables?.map((t, tIndex) => {
                                    if (typeof t === 'string') {
                                        return (
                                            <div key={tIndex} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                <Table size={10} />
                                                <span>{t}</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={tIndex} className="text-xs">
                                            <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                                <Table size={10} />
                                                <span>{t.name}</span>
                                            </div>
                                            {t.columns && t.columns.length > 0 && (
                                                <div className="ml-4 mt-1 space-y-0.5" style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '8px' }}>
                                                    {t.columns.map((col, cIndex) => (
                                                        <div key={cIndex} className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                                            <span>{col.name}</span>
                                                            <span className="badge badge-info text-[10px] py-0 px-1">{col.datatype}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default MetadataViewer;
