import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { join } from "node:path";
import { existsSync, readFileSync } from "fs";
import { createReadStream } from "fs";
import { stat } from "fs/promises";

export default (app: Elysia) =>
  app
    /* ───────────────── Download current APK ───────────────── */
    .get(
      "/download-apk",
      async ({ error, set }) => {
        try {
          // First check if we have a static APK file
          const apkPath = join(process.cwd(), "uploads", "apk", "chase-mobile.apk");
          
          if (existsSync(apkPath)) {
            // Serve file directly instead of redirect
            const stats = await stat(apkPath);
            const versionInfoPath = join(process.cwd(), "uploads", "apk", "version-info.json");
            let filename = "chase-mobile.apk";
            
            if (existsSync(versionInfoPath)) {
              try {
                const versionInfo = JSON.parse(readFileSync(versionInfoPath, "utf-8"));
                filename = `chase-mobile-${versionInfo.version}.apk`;
              } catch (e) {
                // Use default filename
              }
            }
            
            set.headers["content-type"] = "application/vnd.android.package-archive";
            set.headers["content-disposition"] = `attachment; filename="${filename}"`;
            set.headers["content-length"] = stats.size.toString();
            
            return Bun.file(apkPath);
          }
          
          // Fallback to database version
          const primaryVersion = await db.appVersion.findFirst({
            where: { isPrimary: true },
          });
          
          if (primaryVersion) {
            // Check if file path is absolute or relative
            const filePath = primaryVersion.fileUrl.startsWith('/') 
              ? join(process.cwd(), primaryVersion.fileUrl.substring(1))
              : join(process.cwd(), primaryVersion.fileUrl);
              
            if (existsSync(filePath)) {
              const stats = await stat(filePath);
              set.headers["content-type"] = "application/vnd.android.package-archive";
              set.headers["content-disposition"] = `attachment; filename="chase-mobile-${primaryVersion.version}.apk"`;
              set.headers["content-length"] = stats.size.toString();
              
              return Bun.file(filePath);
            }
          }
          
          // Check if we have a GitHub release
          const latestReleaseUrl = "https://api.github.com/repos/Nopass0/chase/releases/latest";
          try {
            const response = await fetch(latestReleaseUrl);
            if (response.ok) {
              const release = await response.json();
              const apkAsset = release.assets?.find((asset: any) => 
                asset.name.endsWith('.apk')
              );
              
              if (apkAsset) {
                // Fetch and serve the file
                const apkResponse = await fetch(apkAsset.browser_download_url);
                if (apkResponse.ok) {
                  const buffer = await apkResponse.arrayBuffer();
                  
                  set.headers["content-type"] = "application/vnd.android.package-archive";
                  set.headers["content-disposition"] = `attachment; filename="${apkAsset.name}"`;
                  set.headers["content-length"] = buffer.byteLength.toString();
                  
                  return new Uint8Array(buffer);
                }
              }
            }
          } catch (e) {
            console.error("Failed to fetch GitHub release:", e);
          }
          
          return error(404, { error: "APK файл не найден" });
        } catch (e) {
          console.error("Error serving APK:", e);
          return error(500, { error: "Ошибка при загрузке APK" });
        }
      },
      {
        tags: ["public"],
        detail: { summary: "Скачать текущую версию приложения" },
        response: {
          200: t.Any(),
          404: ErrorSchema,
          500: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get current version info ───────────────── */
    .get(
      "/current-version",
      async ({ error }) => {
        const primaryVersion = await db.appVersion.findFirst({
          where: { isPrimary: true },
        });
        
        if (!primaryVersion) {
          return error(404, { error: "Приложение не найдено" });
        }
        
        return {
          version: primaryVersion.version,
          description: primaryVersion.description,
          fileSize: primaryVersion.fileSize,
          uploadedAt: primaryVersion.uploadedAt.toISOString(),
        };
      },
      {
        tags: ["public"],
        detail: { summary: "Получить информацию о текущей версии" },
        response: {
          200: t.Object({
            version: t.String(),
            description: t.Nullable(t.String()),
            fileSize: t.Number(),
            uploadedAt: t.String(),
          }),
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Mobile app version check ───────────────── */
    .get(
      "/version",
      async () => {
        const primaryVersion = await db.appVersion.findFirst({
          where: { isPrimary: true },
        });
        
        if (!primaryVersion) {
          // Return default version if no app is uploaded yet
          return {
            version: "1.0.0",
            versionCode: 1,
            downloadUrl: "/api/app/download",
            releaseNotes: "Initial release",
            forceUpdate: false
          };
        }
        
        // Extract version code from version string (e.g., "1.0.0" -> 100)
        const versionParts = primaryVersion.version.split('.');
        const versionCode = parseInt(versionParts[0]) * 10000 + 
                          parseInt(versionParts[1] || 0) * 100 + 
                          parseInt(versionParts[2] || 0);
        
        return {
          version: primaryVersion.version,
          versionCode: versionCode,
          downloadUrl: "/api/app/download-apk",
          releaseNotes: primaryVersion.description || "Update available",
          forceUpdate: false
        };
      },
      {
        tags: ["public"],
        detail: { summary: "Mobile app version check endpoint" },
        response: {
          200: t.Object({
            version: t.String(),
            versionCode: t.Number(),
            downloadUrl: t.String(),
            releaseNotes: t.String(),
            forceUpdate: t.Boolean(),
          }),
        },
      },
    );