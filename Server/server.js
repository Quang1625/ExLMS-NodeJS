require('dotenv').config();
const connectDB = require('../src/config/db');
const app = require('./app');
const http = require('http');
const { init } = require('./socket');

const PORT = process.env.PORT || 3000;

const start = async () => {
    await connectDB();
    const server = http.createServer(app);
    init(server);
    server.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 API: http://localhost:${PORT}/api`);
    });
};

start();

// Graceful shutdown
process.on('SIGINT', async () => {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});
