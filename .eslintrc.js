const config = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  env: {
    node: true,
    es6: true,
    es2020: true,
    es2021: true
  },
  plugins: ['@typescript-eslint', 'node', '@getify/proper-arrows'],
  rules: {
    '@getify/proper-arrows/where': [
      'error',
      {
        global: false,
        'global-declaration': true,
        property: false,
        export: false,
        trivial: false
      }
    ],
    'naming-convention': 'off',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'forbid'
      },
      {
        selector: 'parameter',
        format: ['camelCase']
      },
      {
        selector: 'function',
        format: ['camelCase']
      },
      {
        selector: 'typeLike',
        format: ['PascalCase']
      }
    ],
    '@typescript-eslint/unbound-method': 'off',
    'node/prefer-global/buffer': ['error', 'never'],
    'node/prefer-global/process': ['error', 'never'],
    'node/prefer-global/console': ['error', 'never'],
    'node/prefer-global/url': ['error', 'never'],
    'node/prefer-global/url-search-params': ['error', 'never'],
    '@typescript-eslint/array-type': [
      'error',
      {
        default: 'array',
        readonly: 'array'
      }
    ],
    'no-return-await': 'off',
    '@typescript-eslint/return-await': ['error', 'never'],
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/restrict-plus-operands': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: false,
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
    camelcase: 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-require-imports': 2,
    '@typescript-eslint/prefer-for-of': 2,
    'no-loop-func': 'off',
    '@typescript-eslint/no-loop-func': ['error'],
    complexity: 'off',
    'standard/no-callback-literal': 0,
    'class-methods-use-this': ['error'],
    radix: ['error', 'always'],
    'no-cond-assign': ['error', 'always'],
    eqeqeq: ['error', 'always'],
    'no-throw-literal': 'off',
    '@typescript-eslint/no-throw-literal': ['error']
  }
};

module.exports = config;
