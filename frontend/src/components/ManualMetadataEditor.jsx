import React, { useState } from 'react';
import { Plus, Trash2, Save, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

const DATATYPES = ['string', 'int', 'long', 'double', 'boolean', 'date', 'timestamp', 'decimal', 'binary'];

const ManualMetadataEditor = ({ onSaved }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [workspaceName, setWorkspaceName] = useState('');
    const [lakehouses, setLakehouses] = useState([
        { id: 'lh-1', name: '', tables: [{ name: '', columns: [{ name: '', datatype: 'string' }] }] }
    ]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [expandedTables, setExpandedTables] = useState({});

    const toggleTable = (key) => {
        setExpandedTables({ ...expandedTables, [key]: !expandedTables[key] });
    };

    const addLakehouse = () => {
        setLakehouses([...lakehouses, {
            id: `lh-${Date.now()}`,
            name: '',
            tables: [{ name: '', columns: [{ name: '', datatype: 'string' }] }]
        }]);
    };

    const removeLakehouse = (index) => {
        setLakehouses(lakehouses.filter((_, i) => i !== index));
    };

    const updateLakehouse = (index, field, value) => {
        const updated = [...lakehouses];
        updated[index][field] = value;
        setLakehouses(updated);
    };

    const addTable = (lhIndex) => {
        const updated = [...lakehouses];
        updated[lhIndex].tables.push({ name: '', columns: [{ name: '', datatype: 'string' }] });
        setLakehouses(updated);
    };

    const removeTable = (lhIndex, tableIndex) => {
        const updated = [...lakehouses];
        updated[lhIndex].tables = updated[lhIndex].tables.filter((_, i) => i !== tableIndex);
        setLakehouses(updated);
    };

    const updateTableName = (lhIndex, tableIndex, value) => {
        const updated = [...lakehouses];
        updated[lhIndex].tables[tableIndex].name = value;
        setLakehouses(updated);
    };

    const addColumn = (lhIndex, tableIndex) => {
        const updated = [...lakehouses];
        updated[lhIndex].tables[tableIndex].columns.push({ name: '', datatype: 'string' });
        setLakehouses(updated);
    };

    const removeColumn = (lhIndex, tableIndex, colIndex) => {
        const updated = [...lakehouses];
        updated[lhIndex].tables[tableIndex].columns = updated[lhIndex].tables[tableIndex].columns.filter((_, i) => i !== colIndex);
        setLakehouses(updated);
    };

    const updateColumn = (lhIndex, tableIndex, colIndex, field, value) => {
        const updated = [...lakehouses];
        updated[lhIndex].tables[tableIndex].columns[colIndex][field] = value;
        setLakehouses(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            await axios.post(`${API_URL}/metadata/manual`, {
                workspaceName,
                lakehouses: lakehouses.filter(lh => lh.name.trim()).map(lh => ({
                    ...lh,
                    tables: lh.tables.filter(t => t.name.trim())
                }))
            });
            setMessage('Saved successfully');
            if (onSaved) onSaved();
        } catch (err) {
            setMessage('Error saving');
        }
        setSaving(false);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg mt-3 transition"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
                <Settings size={14} />
                Configure Manual Metadata
            </button>
        );
    }

    return (
        <div className="card p-4 mt-3 space-y-3 animate-fade-in">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white">Manual Metadata</span>
                <button onClick={() => setIsOpen(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Close
                </button>
            </div>

            <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Workspace Name</label>
                <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="My Workspace"
                    className="input-dark text-xs"
                />
            </div>

            {lakehouses.map((lh, lhIndex) => (
                <div key={lh.id} className="p-3 rounded-lg space-y-2" style={{ background: 'var(--bg-primary)' }}>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={lh.name}
                            onChange={(e) => updateLakehouse(lhIndex, 'name', e.target.value)}
                            placeholder="Lakehouse Name"
                            className="input-dark text-xs flex-1"
                        />
                        <button onClick={() => removeLakehouse(lhIndex)} className="p-1.5 text-red-400 hover:text-red-300">
                            <Trash2 size={12} />
                        </button>
                    </div>

                    <div className="ml-2 space-y-1">
                        {lh.tables.map((table, tIndex) => {
                            const tableKey = `${lhIndex}-${tIndex}`;
                            const isExpanded = expandedTables[tableKey];
                            return (
                                <div key={tIndex} className="p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                                    <div className="flex gap-1 items-center">
                                        <button onClick={() => toggleTable(tableKey)} style={{ color: 'var(--text-muted)' }}>
                                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        </button>
                                        <input
                                            type="text"
                                            value={table.name}
                                            onChange={(e) => updateTableName(lhIndex, tIndex, e.target.value)}
                                            placeholder="table_name"
                                            className="input-dark text-xs flex-1 py-1"
                                        />
                                        <button onClick={() => removeTable(lhIndex, tIndex)} className="text-red-400 text-xs">×</button>
                                    </div>

                                    {isExpanded && (
                                        <div className="ml-4 mt-2 space-y-1">
                                            {table.columns.map((col, cIndex) => (
                                                <div key={cIndex} className="flex gap-1">
                                                    <input
                                                        type="text"
                                                        value={col.name}
                                                        onChange={(e) => updateColumn(lhIndex, tIndex, cIndex, 'name', e.target.value)}
                                                        placeholder="column"
                                                        className="input-dark text-xs flex-1 py-1"
                                                    />
                                                    <select
                                                        value={col.datatype}
                                                        onChange={(e) => updateColumn(lhIndex, tIndex, cIndex, 'datatype', e.target.value)}
                                                        className="input-dark text-xs py-1 w-20"
                                                    >
                                                        {DATATYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                                                    </select>
                                                    <button onClick={() => removeColumn(lhIndex, tIndex, cIndex)} className="text-red-400">×</button>
                                                </div>
                                            ))}
                                            <button onClick={() => addColumn(lhIndex, tIndex)} className="text-xs" style={{ color: 'var(--accent)' }}>
                                                + Column
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <button onClick={() => addTable(lhIndex)} className="text-xs" style={{ color: 'var(--accent)' }}>
                            + Table
                        </button>
                    </div>
                </div>
            ))}

            <button onClick={addLakehouse} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <Plus size={12} /> Add Lakehouse
            </button>

            <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2"
            >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save'}
            </button>

            {message && (
                <p className={`text-xs text-center ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default ManualMetadataEditor;
