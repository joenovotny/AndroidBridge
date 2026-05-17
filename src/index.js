const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const { apnsPushUrl, cloudKitConfig, nodeEnv, port, userAppApnsTopic } = require("./config");
const { CloudKitClient } = require("./cloudkit");
const { createRoutes } = require("./routes");

const app = express();
const cloudKit = new CloudKitClient(cloudKitConfig());

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.use(createRoutes({ cloudKit, apnsPushUrl, userAppApnsTopic }));

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
  res.status(status).json({
    error: nodeEnv === "production" ? "Request failed." : error.message,
    ...(nodeEnv === "production" ? {} : { cloudKit: error.cloudKit }),
  });
});

app.listen(port, () => {
  console.log(`Lil's Android bridge listening on port ${port}`);
});
