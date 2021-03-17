import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { join as pathJoin } from "path";
import os from "os";

export default async function (settingsPath: string) {
  return new Promise<void>(async (resolve) => {
    if (!existsSync(settingsPath))
      var settings: {
        dlPath: string | null;
        stayConnect: boolean;
      } = { dlPath: null, stayConnect: true };
    else {
      var settings: {
        dlPath: string | null;
        stayConnect: boolean;
      } = JSON.parse(
        (await fs.readFile(settingsPath)) as any
      );
    }
    if (settings.dlPath === null) {
      switch (os.platform()) {
        case "win32":
          settings.dlPath = pathJoin(os.homedir() + "\\Documents\\CostaBot");
          break;
        default:
          settings.dlPath = pathJoin(os.homedir() + "\\CostaBot");
          break;
      }
    }
    fs.writeFile(
      settingsPath,
      JSON.stringify(settings, null, 4)
    ).then(() => {
      resolve();
    });
  });
}
