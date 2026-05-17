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

function privateKey() {
  const base64Key = optional("CLOUDKIT_PRIVATE_KEY_BASE64");
  if (base64Key) {
    return Buffer.from(base64Key.replace(/\s/g, ""), "base64").toString("utf8").trim();
  }

  return required("CLOUDKIT_PRIVATE_KEY").replace(/\\n/g, "\n").trim();
}

function cloudKitConfig() {
  return {
    containerId: required("CLOUDKIT_CONTAINER_ID"),
    environment: optional("CLOUDKIT_ENVIRONMENT", "production"),
    database: optional("CLOUDKIT_DATABASE", "public"),
    keyId: required("CLOUDKIT_KEY_ID"),
    privateKey: privateKey(),
  };
}

module.exports = {
  port: Number(optional("PORT", "3000")),
  nodeEnv: optional("NODE_ENV", "development"),
  apnsPushUrl: optional("APNS_PUSH_URL", ""),
  userAppApnsTopic: optional("USER_APP_APNS_TOPIC", "NovotnyConcessionsLLC.IceCreamUserApp"),
  cloudKitConfig,
};
