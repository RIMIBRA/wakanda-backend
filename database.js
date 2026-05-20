const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'wakanda_db'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Erreur connexion MySQL:', err);
    return;
  }
  console.log('✅ Connecté à MySQL - wakanda_db');
});

module.exports = db;