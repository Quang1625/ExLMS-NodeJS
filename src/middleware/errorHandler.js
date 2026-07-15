// 404 Handler
const notFound = (req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
};

// Global Error Handler
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: Object.values(err.errors).map(e => e.message).join(', ')
        });
    }
    
    if (err.name === 'CastError') {
        return res.status(400).json({
            error: `Dữ liệu không hợp lệ tại trường ${err.path}`
        });
    }

    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

module.exports = { notFound, errorHandler };
