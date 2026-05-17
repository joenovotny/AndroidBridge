const crypto = require("node:crypto");

const CLOUDKIT_HOST = "https://api.apple-cloudkit.com";

class CloudKitClient {
  constructor(config) {
    this.containerId = config.containerId;
    this.environment = config.environment;
    this.database = config.database;
    this.keyId = config.keyId;
    try {
      this.privateKey = crypto.createPrivateKey(config.privateKey);
    } catch (error) {
      const firstLine = String(config.privateKey).split(/\r?\n/)[0] || "missing";
      const keyError = new Error(`CloudKit private key is not a valid PEM private key. First line: ${firstLine}`);
      keyError.status = 500;
      keyError.code = "INVALID_CLOUDKIT_PRIVATE_KEY";
      keyError.cause = error;
      throw keyError;
    }
  }

  async lookup(recordNames, desiredKeys = undefined) {
    const records = recordNames.map((recordName) => ({ recordName }));
    return this.request("records/lookup", {
      records,
      ...(desiredKeys ? { desiredKeys } : {}),
    });
  }

  async modify(operations, desiredKeys = undefined) {
    return this.request("records/modify", {
      operations,
      ...(desiredKeys ? { desiredKeys } : {}),
    });
  }

  async request(operationPath, body) {
    const subpath = `/database/1/${encodeURIComponent(this.containerId)}/${this.environment}/${this.database}/${operationPath}`;
    const url = `${CLOUDKIT_HOST}${subpath}`;
    const bodyText = JSON.stringify(body ?? {});
    const headers = this.signedHeaders(subpath, bodyText);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: bodyText,
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const reason = json.reason || json.serverErrorCode || response.statusText;
      const error = new Error(`CloudKit ${response.status}: ${reason}`);
      error.status = response.status;
      error.cloudKit = json;
      throw error;
    }

    return json;
  }

  signedHeaders(subpath, bodyText) {
    const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const bodyHash = crypto.createHash("sha256").update(bodyText, "utf8").digest("base64");
    const message = `${date}:${bodyHash}:${subpath}`;
    const signature = crypto
      .createSign("sha256")
      .update(message, "utf8")
      .sign(this.privateKey, "base64");

    return {
      "Content-Type": "text/plain",
      "Accept": "application/json",
      "X-Apple-CloudKit-Request-KeyID": this.keyId,
      "X-Apple-CloudKit-Request-ISO8601Date": date,
      "X-Apple-CloudKit-Request-SignatureV1": signature,
    };
  }
}

function field(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return { value: value.getTime() };
  return { value };
}

function fields(values) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, field(value)])
      .filter(([, value]) => value !== undefined),
  );
}

function readField(record, name, fallback = null) {
  return record?.fields?.[name]?.value ?? fallback;
}

function firstRecord(response) {
  return response?.records?.[0] ?? null;
}

function createOperation(recordType, recordFields, recordName = undefined) {
  return {
    operationType: "create",
    record: {
      recordType,
      ...(recordName ? { recordName } : {}),
      fields: fields(recordFields),
    },
  };
}

function forceUpdateOperation(recordType, recordName, recordFields) {
  return {
    operationType: "forceUpdate",
    record: {
      recordType,
      recordName,
      fields: fields(recordFields),
    },
  };
}

function forceDeleteOperation(recordName) {
  return {
    operationType: "forceDelete",
    record: { recordName },
  };
}

module.exports = {
  CloudKitClient,
  createOperation,
  field,
  fields,
  firstRecord,
  forceDeleteOperation,
  forceUpdateOperation,
  readField,
};
