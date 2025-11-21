require('dotenv').config({ path: '../.env' });
const pool = require('./dist/config/database').default;

pool.query('SELECT NOW() as current_time, current_database() as database')
    .then(res => {
        console.log('✓ Database connected successfully!');
        console.log('  Current time:', res.rows[0].current_time);
        console.log('  Database:', res.rows[0].database);
        process.exit(0);
    })
    .catch(err => {
        console.error('✗ Database connection failed:', err.message);
        process.exit(1);
    });
