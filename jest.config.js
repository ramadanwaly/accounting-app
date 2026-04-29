module.exports = {
    // بيئة الاختبار
    testEnvironment: 'node',

    // مسارات الاختبارات
    testMatch: [
        '**/tests/**/*.test.js'
    ],

    // تجاهل المجلدات
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/'
    ],

    // Coverage settings
    collectCoverageFrom: [
        'models/**/*.js',
        'routes/**/*.js',
        'middleware/**/*.js',
        'config/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**'
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60
        }
    },

    // Timeout للاختبارات
    testTimeout: 10000,

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Verbose output
    verbose: true,

    // Clear mocks بين الاختبارات
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
};
