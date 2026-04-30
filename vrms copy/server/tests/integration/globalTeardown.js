const { execSync } = require('child_process');

const MYSQL = '/usr/local/mysql-8.0.44-macos15-arm64/bin/mysql';
const CREDS = '-u root -pA300433a';

module.exports = async () => {
  execSync(`${MYSQL} ${CREDS} -e "DROP DATABASE IF EXISTS vrms_test;"`, { stdio: 'pipe' });
};
