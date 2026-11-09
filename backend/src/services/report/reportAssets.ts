import fs from "fs";
import path from "path";

function resolveAssetDirs(): string[] {
  return [
    path.resolve(process.cwd(), "assets"),
    path.resolve(process.cwd(), "backend/assets"),
    path.resolve(process.cwd(), "../assets"),
  ];
}

export function reportLogoPaths(): { gcrai?: string; graice?: string } {
  const base = resolveAssetDirs()
    .map((d) => path.join(d, "report"))
    .find((d) => fs.existsSync(d));
  if (!base) return {};
  const gcrai = path.join(base, "gcrai-logo.png");
  const graice = path.join(base, "graice-logo.png");
  return {
    gcrai: fs.existsSync(gcrai) ? gcrai : undefined,
    graice: fs.existsSync(graice) ? graice : undefined,
  };
}
