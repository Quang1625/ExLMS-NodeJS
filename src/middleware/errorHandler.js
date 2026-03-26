// 404 Handler
const notFound = (req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
};

// Global Error Handler
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

module.exports = { notFound, errorHandler };
