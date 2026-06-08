module.exports = {
  '**/*.ts': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
  ],
  '**/*.json': [
    'prettier --write',
  ],
  '*.ts': () => 'npx tsc --noEmit',
};