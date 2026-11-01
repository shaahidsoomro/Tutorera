// jest.config.js
/** @type {import('jest').Config} */

const transform = { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }] };

// Pure unit-test files: no Mongoose, no mongodb-memory-server needed.
// Naming convention: *.unit.test.ts  OR  files explicitly listed here.
const UNIT_TEST_PATTERN = [
  "<rootDir>/src/tests/verification-atomicity.test.ts",
  "<rootDir>/src/tests/scheduleOccurrences.test.ts",
  "<rootDir>/src/tests/postalResults.unit.test.ts",
  "<rootDir>/src/tests/externalValidation.controller.unit.test.ts",
  "<rootDir>/src/tests/postalLookup.controller.unit.test.ts",
  // AI Supervisor Agent — all DB calls are mocked
  "<rootDir>/src/tests/adminAgentSupervisor.test.ts",
  "<rootDir>/src/tests/adminAgentRead.test.ts",
  "<rootDir>/src/tests/adminAgentSupervisorController.test.ts",
  // Human Approval Workflow — all DB calls are mocked
  "<rootDir>/src/tests/adminApproval.test.ts",
  // Infrastructure Probe — all external deps are mocked
  "<rootDir>/src/tests/infrastructureProbe.test.ts",
  // Orchestrator — read service mocked
  "<rootDir>/src/tests/adminAgentOrchestrator.test.ts",
  // Agent request middleware — pure function tests
  "<rootDir>/src/tests/agentRequestMiddleware.test.ts",
];

module.exports = {
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: UNIT_TEST_PATTERN,
      transform,
      testTimeout: 30000,
    },
    {
      displayName: "integration",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["<rootDir>/src/tests/**/*.test.ts"],
      testPathIgnorePatterns: UNIT_TEST_PATTERN,
      setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
      transform,
      // Transactions against the in-memory replica set take longer than plain queries.
      testTimeout: 120000,
    },
  ],
};
