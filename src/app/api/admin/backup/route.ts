import { unlinkSync } from "node:fs";
import { sqlite } from "@/lib/db";

export async function GET(request: Request) {
  const secret = process.env.BACKUP_SECRET;
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return Response.json({ error: { code: "UNAUTHORIZED", message: "Authorization header missing" } }, { status: 401 });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || token !== secret) {
    return Response.json({ error: { code: "FORBIDDEN", message: "Invalid token" } }, { status: 403 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `health-tracker-backup-${date}.db`;
  const tmpPath = `/tmp/${filename}`;

  try {
    sqlite.run(`VACUUM INTO '${tmpPath}'`);

    const file = Bun.file(tmpPath);
    const arrayBuffer = await file.arrayBuffer();

    unlinkSync(tmpPath);

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[backup] error:", err);
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Backup failed" } },
      { status: 500 }
    );
  }
}
