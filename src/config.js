require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback = "") {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

function cloudKitConfig() {
  return {
    containerId: required("CLOUDKIT_CONTAINER_ID"),
    environment: optional("CLOUDKIT_ENVIRONMENT", "production"),
    database: optional("CLOUDKIT_DATABASE", "public"),
    keyId: required("CLOUDKIT_KEY_ID"),
    privateKey: required("CLOUDKIT_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}

module.exports = {
  port: Number(optional("PORT", "3000")),
  nodeEnv: optional("NODE_ENV", "development"),
  apnsPushUrl: optional("APNS_PUSH_URL", ""),
  userAppApnsTopic: optional("USER_APP_APNS_TOPIC", "NovotnyConcessionsLLC.IceCreamUserApp"),
  cloudKitConfig,
};
