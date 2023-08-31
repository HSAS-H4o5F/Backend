// @ts-nocheck
import ParseDashboard from "parse-dashboard";
import { app, appId, appName, dashPath, masterKey, serverURL } from "../app.js";

export function startParseDashboard() {
  const dash = new ParseDashboard(
    {
      apps: [
        {
          serverURL,
          appId,
          appName,
          masterKey,
        },
      ],
    },
    {
      dev: true,
    }
  );

  app.use(dashPath, dash);
}
