import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ConnectFabric from './pages/ConnectFabric';
import PipelineBuilder from './pages/PipelineBuilder';
import Subscription from './pages/Subscription';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/connect" replace />} />
                <Route path="/connect" element={<ConnectFabric />} />
                <Route path="/builder" element={<PipelineBuilder />} />
                <Route path="/subscription" element={<Subscription />} />
            </Routes>
        </Router>
    );
}

export default App;

