import mysql2 from 'mysql2/promise';
import fs from 'fs/promises';
import 'dotenv/config';

const schemaUrl = new URL('./schema.sql', import.meta.url);

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

async function ensureDatabaseFromSchema() {
  console.log('DEBUG DB CONFIG:', DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);

  const rootConn = await mysql2.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    const [rows] = await rootConn.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [DB_NAME]
    );

    if (rows.length === 0) {
      console.log(`Database "${DB_NAME}" not found. Creating from schema.sql...`);
      const schemaSql = await fs.readFile(schemaUrl, 'utf8');
      await rootConn.query(schemaSql);
      console.log(`Database "${DB_NAME}" created and initialized.`);
    } else {
      console.log(`Database "${DB_NAME}" already exists.`);
    }
  } finally {
    await rootConn.end();
  }

  return mysql2.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
}

export const db = await ensureDatabaseFromSchema();