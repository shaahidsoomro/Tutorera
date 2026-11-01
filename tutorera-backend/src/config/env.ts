// src/config/env.ts
// Validates required environment variables at startup. If anything required
// is missing, the process exits immediately with a clear message instead of
// starting in a broken state and failing confusingly later.

interface RequiredEnvVar {
    key: string;
    validate?: (value: string) => string | null;
}

const REQUIRED_ENV_VARS: RequiredEnvVar[] = [
    { key: "MONGO_URI" },
    {
        key: "JWT_SECRET",
        validate: (v) => (v.length < 16 ? "must be at least 16 characters" : null),
    },
    { key: "PORT" },
    { key: "JWT_EXPIRES_IN" },
    { key: "CLIENT_URL" },
    { key: "RESEND_API_KEY" },
    { key: "CLOUDINARY_CLOUD_NAME" },
    { key: "CLOUDINARY_API_KEY" },
    { key: "CLOUDINARY_API_SECRET" },
    { key: "GROQ_API_KEY" },
    { key: "GOOGLE_CLIENT_ID" },
    { key: "GOOGLE_CLIENT_SECRET" },
    { key: "RAPIDPAY_API_KEY" },
    { key: "RAPIDPAY_MERCHANT_ID" },
];

export function validateEnv(options: { throwOnError?: boolean } = {}): void {
    const errors: string[] = [];
    if (!["process", "external", "disabled"].includes(process.env.SCHEDULER_MODE || "process")) {
        errors.push("  - SCHEDULER_MODE must be process, external, or disabled");
    }
    if (process.env.SCHEDULER_MODE === "external" && (process.env.INTERNAL_JOB_TOKEN || "").length < 32) {
        errors.push("  - INTERNAL_JOB_TOKEN must be at least 32 characters for external scheduling");
    }

    for (const { key, validate } of REQUIRED_ENV_VARS) {
        const value = process.env[key];

        if (!value || value.trim() === "") {
            errors.push(`  - ${key} is missing`);
            continue;
        }

        if (validate) {
            const validationError = validate(value);
            if (validationError) {
                errors.push(`  - ${key} is invalid: ${validationError}`);
            }
        }
    }

    // Payment gateway configuration must fail closed in production.
    if (process.env.NODE_ENV === "production") {
        const productionKeys = ["RAPIDPAY_BASE_URL", "RAPIDPAY_WEBHOOK_SECRET", "RESEND_WEBHOOK_SECRET"];
        for (const key of productionKeys) {
            if (!process.env[key]?.trim()) errors.push(`  - ${key} is required in production`);
        }
        const rapidPayBaseUrl = process.env.RAPIDPAY_BASE_URL?.trim();
        if (rapidPayBaseUrl && (!rapidPayBaseUrl.startsWith("https://") || /sandbox|test/i.test(rapidPayBaseUrl))) {
            errors.push("  - RAPIDPAY_BASE_URL must be a non-sandbox HTTPS endpoint in production");
        }
        const webhookSecret = process.env.RAPIDPAY_WEBHOOK_SECRET?.trim();
        if (webhookSecret && webhookSecret.length < 32) {
            errors.push("  - RAPIDPAY_WEBHOOK_SECRET appears too short for a signing secret");
        }
    }

    if (errors.length > 0) {
        if (options.throwOnError) throw new Error("Backend environment validation failed: " + errors.join("; "));
        console.error("Environment validation failed:\n" + errors.join("\n"));
        console.error("\nFix the environment variables before starting the server.");
        process.exit(1);
    }

    console.log("Environment variables validated");
}