import "dotenv/config";
import { createApp } from "./app.js";
import { callModel } from "./services/model.js";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const app = createApp(callModel);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
