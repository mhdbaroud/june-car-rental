const { execSync } = require('child_process');
const path = require('path');

const MYSQL = '/usr/local/mysql-8.0.44-macos15-arm64/bin/mysql';
const CREDS = '-u root -pA300433a';
const SQL_FILE = path.join(__dirname, '../../..', 'vrms_database.sql');

module.exports = async () => {
  execSync(
    `${MYSQL} ${CREDS} -e "DROP DATABASE IF EXISTS vrms_test; CREATE DATABASE vrms_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"`,
    { stdio: 'pipe' }
  );
  // Skip the first line (mysqldump warning) before piping to MySQL
  execSync(`tail -n +2 "${SQL_FILE}" | ${MYSQL} ${CREDS} vrms_test`, { stdio: 'pipe' });
};
