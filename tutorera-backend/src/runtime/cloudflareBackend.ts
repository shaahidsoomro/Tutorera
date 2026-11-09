/** Resolve backend dependencies from one installation/connection instance. */
export { default as mongoose } from "mongoose";
export { default as app } from "../app";
export { initSocket } from "../utils/socket";
export { validateEnv } from "../config/env";
export { assertRapidPayRuntimeConfiguration } from "../services/rapidPayProvider.service";
export { runScheduledJob } from "../services/schedulerRuntime.service";
export { ensureSchemaOnce } from "../services/schemaSync.service";
