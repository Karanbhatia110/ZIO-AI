import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { connectFabric } from '../api/fabric';
import { loginRequest } from '../auth/msalConfig';
import { LogIn, Key, User, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

const ConnectFabric = () => {
    const [formData, setFormData] = useState({
        workspaceId: '',
        tenantId: '',
        clientId: '',
        clientSecret: ''
    });
    const [error, setError] = useState('');
    const [authMode, setAuthMode] = useState('interactive');
    const navigate = useNavigate();

    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleMicrosoftLogin = async () => {
        try {
            const response = await instance.loginPopup(loginRequest);
            sessionStorage.setItem('fabricAccessToken', response.accessToken);
            sessionStorage.setItem('fabricUserName', response.account.username);
            navigate('/builder');
        } catch (err) {
            console.error("Login failed:", err);
            setError('Microsoft login failed. Please try again.');
        }
    };

    const handleServicePrincipalSubmit = async (e) => {
        e.preventDefault();
        try {
            await connectFabric(formData);
            navigate('/builder');
        } catch (err) {
            setError('Failed to connect with Service Principal. Check credentials.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
            {/* Main Card */}
            <div className="card p-8 w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <img src="/transparent_logo.png" alt="zio.ai" className="w-10 h-10" />
                        <h1 className="text-2xl font-semibold text-white">zio.ai</h1>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        AI-powered Data Engineering for Microsoft Fabric
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-3 rounded-lg mb-6 text-sm animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
                        {error}
                    </div>
                )}

                {/* Auth Mode Tabs */}
                <div className="tab-group mb-6">
                    <button
                        onClick={() => setAuthMode('interactive')}
                        className={`tab-item ${authMode === 'interactive' ? 'active' : ''}`}
                    >
                        <User size={16} /> Personal
                    </button>
                    <button
                        onClick={() => setAuthMode('service_principal')}
                        className={`tab-item ${authMode === 'service_principal' ? 'active' : ''}`}
                    >
                        <Key size={16} /> Service Principal
                    </button>
                </div>

                {/* Interactive Login */}
                {authMode === 'interactive' && (
                    <div className="text-center animate-fade-in">
                        {isAuthenticated ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center gap-2" style={{ color: 'var(--success)' }}>
                                    <CheckCircle size={18} />
                                    <span className="text-sm">Signed in as {accounts[0]?.username}</span>
                                </div>
                                <button
                                    onClick={() => navigate('/builder')}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    Go to Pipeline Builder <ArrowRight size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                    Sign in with your Microsoft account to access your Fabric workspace.
                                </p>
                                <button
                                    onClick={handleMicrosoftLogin}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                                >
                                    <LogIn size={18} />
                                    Sign in with Microsoft
                                </button>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    Uses your personal/work account — no Service Principal needed
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Service Principal Form */}
                {authMode === 'service_principal' && (
                    <form onSubmit={handleServicePrincipalSubmit} className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Workspace ID
                            </label>
                            <input
                                name="workspaceId"
                                value={formData.workspaceId}
                                onChange={handleChange}
                                className="input-dark"
                                placeholder="Enter workspace ID"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Tenant ID
                            </label>
                            <input
                                name="tenantId"
                                value={formData.tenantId}
                                onChange={handleChange}
                                className="input-dark"
                                placeholder="Enter tenant ID"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Client ID
                            </label>
                            <input
                                name="clientId"
                                value={formData.clientId}
                                onChange={handleChange}
                                className="input-dark"
                                placeholder="Enter client ID"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Client Secret
                            </label>
                            <input
                                type="password"
                                name="clientSecret"
                                value={formData.clientSecret}
                                onChange={handleChange}
                                className="input-dark"
                                placeholder="Enter client secret"
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary w-full mt-2">
                            Connect to Fabric
                        </button>
                        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                            Requires Fabric Admin to enable Service Principal API access
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ConnectFabric;
