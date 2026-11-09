// src/tests/setup.ts
// CI validation marker: current dependency graph and replica-set harness.
import { afterAll, afterEach, beforeAll, jest } from "@jest/globals";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

// Ensure critical test environment variables are always defined across all test suites
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-at-least-32-chars-long";
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";
process.env.NODE_ENV = "test";

// Jest ignores `testTimeout` inside `projects`, so the integration timeout set in
// jest.config.js never applied and every test ran with the 5s default. Hashing
// passwords and transactions against the in-memory replica set routinely exceed
// that on slower machines. Individual suites may still call jest.setTimeout.
jest.setTimeout(120000);

// acceptBid() uses a real MongoDB session/transaction (session.withTransaction),
// and transactions only work against a replica set — a single standalone
// in-memory MongoDB instance will reject them. MongoMemoryReplSet spins up a
// real (single-node) replica set in memory so transactional code under test
// behaves exactly like it does against Atlas in production.
let replSet: MongoMemoryReplSet;
let isolatedTestDb: mongoose.mongo.Db | undefined;

beforeAll(async () => {
  // mongodb-memory-server v10 uses MONGOMS_MD5_CHECK; the older
  // MONGOMS_DISABLE_MD5_CHECK flag is ignored and causes every suite to fail
  // before the first test when mirrors serve a different checksum file.
  process.env.MONGOMS_MD5_CHECK = "0";
  process.env.MONGOMS_STARTUP_TIMEOUT = "60000";
  replSet = await MongoMemoryReplSet.create({
    binary: { version: "8.0.16" },
    replSet: { count: 1 },
    instanceOpts: [{ launchTimeout: 60000 }],
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
  isolatedTestDb = mongoose.connection.db;
}, 120000);

afterEach(async () => {
  // Reset all collections between tests so one test's data never leaks into
  // another — each test should be able to run in isolation, in any order.
  // Refuse destructive cleanup if application code replaced the connection.
  if (!isolatedTestDb || mongoose.connection.db !== isolatedTestDb || !["127.0.0.1", "localhost", "::1"].includes(mongoose.connection.host)) {
    throw new Error("Refusing test cleanup outside the isolated MongoDB instance");
  }
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});
