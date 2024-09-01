require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
process.env.TZ = "UTC";
const express = require("express");
const app = express();
const path = require("path");
const userAgent = require("./src/middleware/userAgent");
const customCors = require("./src/middleware/customCors");
const {
  globalErrHandler,
  uncaughtErrHandler,
} = require("./src/middleware/errHandler");
const {appInfo} = require("./src/others/util");
const port = process.env.PORT || 3000;

//middlewares
app.use(userAgent);
app.use(customCors);
app.use(express.static(path.join(__dirname, "public")));
// // stripe webhook needs raw req.body
// app.use(
//     "/api/webhook",
//     express.raw({ type: "application/json" }),
//     require("./src/controller/subscription")
// );
app.use(express.json());

//routes
app.use("/api/user", require("./src/controller/user"));
app.use("/api/team", require("./src/controller/team"));
app.use("/api/tournament", require("./src/controller/tournament"));
app.use("/api/tournament-format", require("./src/controller/tournament-format"));

app.get("/api/info", (req, res) => {
  res.status(200).json(appInfo);
});

app.listen(port, (err) => {
  if (err) return console.error(err);
  console.log(`Server started at ${port} - ${new Date()}`);
});

uncaughtErrHandler();
app.use(globalErrHandler);
