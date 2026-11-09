import mongoose, { Types } from "mongoose";
import Conversation from "../models/Conversation.model";
import MigrationLedger from "../models/MigrationLedger.model";
import { ensureSchemaOnce, schemaFingerprint, syncSchema } from "../services/schemaSync.service";

const pairIndex = (indexes: Array<{ key: Record<string, unknown>; unique?: boolean }>) =>
  indexes.find((index) => index.unique && index.key.student === 1 && index.key.tutor === 1 && Object.keys(index.key).length === 2);

async function dropConversations() {
  await Conversation.collection.drop().catch(() => undefined);
}

describe("schema sync", () => {
  it("creates a missing collection and its declared indexes", async () => {
    await dropConversations();
    const result = await syncSchema(mongoose, { only: ["Conversation"] });
    expect(result).toEqual({ models: 1, failures: [] });
    expect(pairIndex(await Conversation.collection.indexes())).toBeTruthy();
  });

  it("is additive and idempotent: it keeps indexes it does not know about", async () => {
    await dropConversations();
    await syncSchema(mongoose, { only: ["Conversation"] });
    await Conversation.collection.createIndex({ lastMessage: 1 }, { name: "legacy_extra_index" });
    const result = await syncSchema(mongoose, { only: ["Conversation"] });
    expect(result.failures).toEqual([]);
    const names = (await Conversation.collection.indexes()).map((index) => index.name);
    expect(names).toContain("legacy_extra_index");
  });

  it("records a failing model without stopping the others", async () => {
    await dropConversations();
    const [student, tutor] = [new Types.ObjectId(), new Types.ObjectId()];
    // Duplicate pairs make the unique pair index impossible to build.
    await Conversation.collection.insertMany([{ student, tutor }, { student, tutor }]);
    const result = await syncSchema(mongoose, { only: ["Conversation", "MigrationLedger"] });
    expect(result.models).toBe(2);
    expect(result.failures.map((failure) => failure.model)).toEqual(["Conversation"]);
  });

  it("fingerprint is stable and describes the registered models", () => {
    expect(schemaFingerprint(mongoose)).toBe(schemaFingerprint(mongoose));
    expect(schemaFingerprint(mongoose)).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("ensureSchemaOnce", () => {
  it("never writes on a read-only preview", async () => {
    expect(await ensureSchemaOnce(mongoose, { readOnly: true })).toBe("skipped-read-only");
    expect(await MigrationLedger.countDocuments({ name: /^schema-sync:/ })).toBe(0);
  });

  it("runs once per fingerprint and then reports up-to-date", async () => {
    await dropConversations();
    expect(await ensureSchemaOnce(mongoose)).toBe("applied");
    const ledger = await MigrationLedger.findOne({ name: `schema-sync:${schemaFingerprint(mongoose)}` }).lean();
    expect(ledger?.status).toBe("applied");
    expect(pairIndex(await Conversation.collection.indexes())).toBeTruthy();

    // A second call must not touch the collections again.
    await dropConversations();
    expect(await ensureSchemaOnce(mongoose)).toBe("up-to-date");
    expect(pairIndex(await Conversation.collection.indexes().catch(() => []))).toBeFalsy();
  });

  it("records failures and waits before retrying", async () => {
    await dropConversations();
    const [student, tutor] = [new Types.ObjectId(), new Types.ObjectId()];
    await Conversation.collection.insertMany([{ student, tutor }, { student, tutor }]);

    expect(await ensureSchemaOnce(mongoose)).toBe("failed");
    const ledger = await MigrationLedger.findOne({ name: `schema-sync:${schemaFingerprint(mongoose)}` }).lean();
    expect(ledger?.status).toBe("failed");
    expect(JSON.stringify(ledger?.report)).toContain("Conversation");

    expect(await ensureSchemaOnce(mongoose)).toBe("retry-later");
  });
});
