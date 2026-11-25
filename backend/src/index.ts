import "dotenv/config";
import { createApp } from "./app.js";
import { callModel } from "./services/model.js";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const host = "127.0.0.1";
const app = createApp(callModel);

// Reports successful startup after the server begins listening.
app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
