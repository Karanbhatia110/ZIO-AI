const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');

const authRoutes = require('./routes/authRoutes');
const metadataRoutes = require('./routes/metadataRoutes');
const generateRoutes = require('./routes/generateRoutes');
const deployRoutes = require('./routes/deployRoutes');
const tablesRoutes = require('./routes/tablesRoutes');
const validateRoutes = require('./routes/validateRoutes');
const usageRoutes = require('./routes/usageRoutes');
const { tokenLimitMiddleware } = require('./services/tokenService');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/generate', tokenLimitMiddleware, generateRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/validate', tokenLimitMiddleware, validateRoutes);
app.use('/api/usage', usageRoutes);

app.get('/', (req, res) => {
    res.send('Fabric Data Engineer Backend is running');
});

app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`);
});

