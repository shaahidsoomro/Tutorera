/**
 * One-time, verified database-name cutover: test -> tutorera.
 *
 * The source must be write-fenced before this script runs. It creates target
 * collections, copies every document with its original _id, recreates every
 * non-_id index, and compares collection counts and index definitions. It
 * deliberately never drops the source database: that occurs only after the
 * application has been switched and smoke-tested against the target.
 */
import "dotenv/config";
import mongoose from "mongoose";

const SOURCE_DATABASE = "test";
const TARGET_DATABASE = "tutorera";
const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm=COPY_TEST_TO_TUTORERA");
const resume = process.argv.includes("--resume");
const BATCH_SIZE = 500;

type Index = { name: string; key: Record<string, unknown>; [key: string]: unknown };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
}

function indexOptions(index: Index): Record<string, unknown> {
  const ignored = new Set(["v", "key", "ns"]);
  return Object.fromEntries(Object.entries(index).filter(([key]) => !ignored.has(key)));
}

async function copyCollection(source: mongoose.mongo.Db, target: mongoose.mongo.Db, name: string): Promise<{ name: string; documents: number; indexes: number }> {
  const sourceCollection = source.collection(name);
  const targetCollection = target.collection(name);
  const sourceCount = await sourceCollection.countDocuments();
  const sourceIndexes = await sourceCollection.indexes() as unknown as Index[];
  const options = ((await source.listCollections({ name }).toArray())[0] as { options?: mongoose.mongo.CreateCollectionOptions } | undefined)?.options || {};

  await target.createCollection(name, options).catch((error: { code?: number }) => {
    if (error.code !== 48) throw error; // NamespaceExists
  });
  const targetCountBefore = await targetCollection.countDocuments();
  if (targetCountBefore && !resume) throw new Error(`${name}: target collection is not empty. Rerun only with --resume after verifying the maintenance fence.`);
  if (targetCountBefore && targetCountBefore !== sourceCount) {
    // The source is write-fenced. A previous interrupted copy may therefore
    // be safely restarted collection-by-collection without mixing snapshots.
    await targetCollection.deleteMany({});
  }
  if (targetCountBefore !== sourceCount) {
    const cursor = sourceCollection.find({}).batchSize(BATCH_SIZE);
    let batch: mongoose.mongo.Document[] = [];
    for await (const document of cursor) {
      batch.push(document);
      if (batch.length === BATCH_SIZE) {
        await targetCollection.insertMany(batch, { ordered: true });
        batch = [];
      }
    }
    if (batch.length) await targetCollection.insertMany(batch, { ordered: true });
  }

  for (const index of sourceIndexes.filter((index) => index.name !== "_id_")) {
    await targetCollection.createIndex(index.key as mongoose.mongo.IndexSpecification, indexOptions(index) as mongoose.mongo.CreateIndexesOptions);
  }

  const [targetCount, targetIndexes] = await Promise.all([
    targetCollection.countDocuments(),
    targetCollection.indexes() as unknown as Promise<Index[]>,
  ]);
  if (targetCount !== sourceCount) throw new Error(`${name}: copied ${targetCount} of ${sourceCount} documents.`);
  const expected = sourceIndexes.map((index) => stable({ key: index.key, options: indexOptions(index) })).sort();
  const actual = targetIndexes.map((index) => stable({ key: index.key, options: indexOptions(index) })).sort();
  if (expected.join("\n") !== actual.join("\n")) throw new Error(`${name}: index verification failed.`);
  return { name, documents: sourceCount, indexes: sourceIndexes.length };
}

async function main(): Promise<void> {
  if (!apply || !confirmed) throw new Error("Refusing write: use --apply --confirm=COPY_TEST_TO_TUTORERA after enabling maintenance mode.");
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required.");
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false });
  try {
    const client = mongoose.connection.getClient();
    const source = client.db(SOURCE_DATABASE);
    const target = client.db(TARGET_DATABASE);
    const sourceCollections = (await source.listCollections().toArray()).map((collection) => collection.name).sort();
    const targetCollections = await target.listCollections().toArray();
    const nonEmpty = [] as string[];
    for (const collection of targetCollections) {
      if (await target.collection(collection.name).estimatedDocumentCount()) nonEmpty.push(collection.name);
    }
    if (nonEmpty.length && !resume) throw new Error(`Target ${TARGET_DATABASE} is not empty: ${nonEmpty.join(", ")}. No changes made.`);

    const report = [] as Array<{ name: string; documents: number; indexes: number }>;
    for (const name of sourceCollections) report.push(await copyCollection(source, target, name));
    const targetNames = (await target.listCollections().toArray()).map((collection) => collection.name).sort();
    if (sourceCollections.join("\n") !== targetNames.join("\n")) throw new Error("Collection verification failed.");
    console.log(JSON.stringify({ source: SOURCE_DATABASE, target: TARGET_DATABASE, collections: report.length, documents: report.reduce((sum, entry) => sum + entry.documents, 0), report }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Database copy failed");
  mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
