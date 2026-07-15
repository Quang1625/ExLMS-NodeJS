const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const run = async () => {
    try {
        const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/ExLMS';
        await mongoose.connect(connStr);
        console.log('Connected to DB:', connStr);
        
        const courses = await mongoose.connection.db.collection('courses').find({}).toArray();
        console.log('Total courses in database:', courses.length);
        courses.forEach(c => {
            console.log(`Course: ID=${c._id}, Title="${c.title}", Status="${c.status}"`);
        });
        
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};
run();
