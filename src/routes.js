const express = require("express");
const {
  createOperation,
  firstRecord,
  forceDeleteOperation,
  forceUpdateOperation,
  readField,
} = require("./cloudkit");
const { normalizePhone, waveMessageAndStatus } = require("./domain");

function createRoutes({ cloudKit, apnsPushUrl, userAppApnsTopic }) {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  router.get("/truck/status", asyncHandler(async (_req, res) => {
    const status = await getTruckStatus(cloudKit);
    res.json({ isWorking: status.isWorking, timestamp: status.timestamp });
  }));

  router.get("/truck/location", asyncHandler(async (_req, res) => {
    const location = await getTruckLocation(cloudKit);
    if (!location) {
      return res.status(404).json({ error: "Truck location is not available." });
    }
    res.json(location);
  }));

  router.post("/profiles", asyncHandler(async (req, res) => {
    const profile = pick(req.body, ["name", "email", "phone", "street", "city", "state", "zip"]);
    if (!profile.name || !profile.email) {
      return res.status(400).json({ error: "Name and email are required." });
    }

    const recordName = req.body.recordName;
    const operation = recordName
      ? forceUpdateOperation("UserProfile", recordName, profile)
      : createOperation("UserProfile", profile);
    const response = await cloudKit.modify([operation], ["name", "email", "phone"]);
    const record = firstRecord(response);

    res.json({ recordName: record?.recordName || recordName });
  }));

  router.delete("/profiles/:recordName", asyncHandler(async (req, res) => {
    await cloudKit.modify([forceDeleteOperation(req.params.recordName)]);
    res.json({ ok: true });
  }));

  router.post("/push-tokens/user", asyncHandler(async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    const token = req.body.token;
    if (!phone || !token) {
      return res.status(400).json({ error: "Phone and token are required." });
    }

    await saveAndroidPushToken(cloudKit, phone, token);
    res.json({ ok: true });
  }));

  router.post("/pins", asyncHandler(async (req, res) => {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: "Valid latitude and longitude are required." });
    }

    const userLocation = { latitude, longitude };
    const [truckStatus, truckLocation] = await Promise.all([
      getTruckStatus(cloudKit),
      getTruckLocation(cloudKit).catch(() => null),
    ]);

    const { status, message } = waveMessageAndStatus({
      isTruckWorking: truckStatus.isWorking,
      truckLocation,
      userLocation,
    });

    const phone = normalizePhone(req.body.phone);
    if (phone && req.body.pushToken) {
      await saveAndroidPushToken(cloudKit, phone, req.body.pushToken);
    }

    const response = await cloudKit.modify([
      createOperation("Pin", {
        latitude,
        longitude,
        timestamp: new Date(),
        name: req.body.name || "No Name",
        phone: req.body.phone || "",
        userID: req.body.userID || "",
        status,
      }),
    ]);

    await notifyTruckOfWave(cloudKit, { apnsPushUrl, userAppApnsTopic }).catch((error) => {
      console.warn("Truck push notification failed:", error.message);
    });

    const pin = firstRecord(response);
    res.json({ recordName: pin?.recordName, status, message });
  }));

  return router;
}

async function getTruckStatus(cloudKit) {
  const response = await cloudKit.lookup(["TruckStatus"], ["isWorking", "timestamp"]);
  const record = firstRecord(response);
  return {
    isWorking: Boolean(readField(record, "isWorking", false)),
    timestamp: readField(record, "timestamp", null),
  };
}

async function getTruckLocation(cloudKit) {
  const response = await cloudKit.lookup(["TruckLocation"], ["latitude", "longitude", "timestamp"]);
  const record = firstRecord(response);
  const latitude = readField(record, "latitude", null);
  const longitude = readField(record, "longitude", null);
  if (latitude === null || longitude === null) return null;
  return {
    latitude,
    longitude,
    timestamp: readField(record, "timestamp", null),
  };
}

async function saveAndroidPushToken(cloudKit, phone, token) {
  const recordName = `AndroidUserPushToken_${phone}`;
  await cloudKit.modify([
    forceUpdateOperation("PushToken", recordName, {
      token,
      updatedAt: new Date(),
    }),
  ]);
}

async function notifyTruckOfWave(cloudKit, { apnsPushUrl }) {
  if (!apnsPushUrl) return;

  const response = await cloudKit.lookup(["TruckPushToken"], ["token"]);
  const token = readField(firstRecord(response), "token", null);
  if (!token) return;

  const pushResponse = await fetch(apnsPushUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      message: "📍 New wave at your map!",
    }),
  });

  if (!pushResponse.ok) {
    throw new Error(`APNs push server returned HTTP ${pushResponse.status}`);
  }
}

function pick(source, keys) {
  return Object.fromEntries(keys.map((key) => [key, source[key] ?? ""]));
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = {
  createRoutes,
};
