const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'server',
    database: 'Gesichtserkennung'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
});

module.exports = db;
