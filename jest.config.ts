import type { JestConfigWithTsJest } from 'ts-jest/dist/types';

const config: JestConfigWithTsJest = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleDirectories: ["node_modules", "src"],
    testPathIgnorePatterns: ["__tests__/assets/", "globals.d.ts"],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
    },
    setupFilesAfterEnv: ["jest-extended/all"],
};

export default config;
