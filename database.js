
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('facebook_clone.db');
db.run(`SELECT ID
FROM user_authentication
WHERE Email = 'swidan'`)