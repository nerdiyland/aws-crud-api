module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
  ],
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',
    
    // TypeScript specific rules
    'no-case-declarations': 'off',
    '@typescript-eslint/no-unused-vars': ['off'],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    
    // General rules
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: [
    'lib/**/*',
    'node_modules/**/*',
    '*.js',
    '*.d.ts',
    'packages/*/node_modules/**/*',
    'packages/*/lib/**/*',
    'packages/*/*.js',
    'packages/*/*.d.ts',
    '**/cdk.out/**/*',
    'examples/**/cdk.out/**/*',
  ],
  env: {
    node: true,
    es6: true,
    jest: true,
  },
};
