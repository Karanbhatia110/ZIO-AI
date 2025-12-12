import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

const PromptBox = ({ onGenerate, isGenerating }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!prompt.trim() || isGenerating) return;
        onGenerate(prompt);
        setPrompt('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative">
            <div
                className="relative flex items-end gap-3 rounded-xl p-3 transition-colors"
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-default)'
                }}
            >
                <textarea
                    className="flex-1 bg-transparent resize-none focus:outline-none text-sm px-1 py-1 max-h-32 min-h-[24px]"
                    style={{ color: 'var(--text-primary)' }}
                    rows="1"
                    placeholder="Message zio.ai..."
                    value={prompt}
                    onChange={(e) => {
                        setPrompt(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={isGenerating}
                />
                <button
                    type="submit"
                    disabled={isGenerating || !prompt.trim()}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
                    style={{ background: 'var(--accent)' }}
                >
                    {isGenerating ? (
                        <Loader2 className="animate-spin text-white" size={16} />
                    ) : (
                        <Send size={14} className="text-white" />
                    )}
                </button>
            </div>
        </form>
    );
};

export default PromptBox;
