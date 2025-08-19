import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

export default (app: Elysia) =>
  app
    /* ───────────────── Get all app versions ───────────────── */
    .get(
      "/",
      async () => {
        const versions = await db.appVersion.findMany({
          orderBy: { uploadedAt: 'desc' },
        });
        
        return versions.map(v => ({
          ...v,
          uploadedAt: v.uploadedAt.toISOString(),
        }));
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение всех версий приложения" },
        response: {
          200: t.Array(t.Object({
            id: t.String(),
            version: t.String(),
            description: t.Nullable(t.String()),
            fileUrl: t.String(),
            fileName: t.String(),
            fileSize: t.Number(),
            isPrimary: t.Boolean(),
            uploadedAt: t.String(),
            uploadedBy: t.String(),
          })),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get primary version ───────────────── */
    .get(
      "/primary",
      async ({ error }) => {
        const primaryVersion = await db.appVersion.findFirst({
          where: { isPrimary: true },
        });
        
        if (!primaryVersion) {
          return error(404, { error: "Основная версия не найдена" });
        }
        
        return {
          ...primaryVersion,
          uploadedAt: primaryVersion.uploadedAt.toISOString(),
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение основной версии приложения" },
        response: {
          200: t.Object({
            id: t.String(),
            version: t.String(),
            description: t.Nullable(t.String()),
            fileUrl: t.String(),
            fileName: t.String(),
            fileSize: t.Number(),
            isPrimary: t.Boolean(),
            uploadedAt: t.String(),
            uploadedBy: t.String(),
          }),
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Upload new version ───────────────── */
    .post(
      "/upload",
      async ({ body, set, error }) => {
        try {
          const { file, version, description, uploadedBy } = body;
          
          // Check if version already exists
          const existing = await db.appVersion.findUnique({
            where: { version },
          });
          
          if (existing) {
            return error(400, { error: "Версия уже существует" });
          }
          
          // Save file
          const fileName = `app-${version}-${Date.now()}.apk`;
          const filePath = join(process.cwd(), 'uploads', 'apk', fileName);
          const fileUrl = `/api/uploads/apk/${fileName}`;
          
          // Create uploads directory if it doesn't exist
          const { mkdir } = await import('node:fs/promises');
          await mkdir(join(process.cwd(), 'uploads', 'apk'), { recursive: true });
          
          // Save file to disk
          const arrayBuffer = await file.arrayBuffer();
          await Bun.write(filePath, Buffer.from(arrayBuffer));

          // Get file size
          const fileSize = arrayBuffer.byteLength;
          
          // Set all versions to non-primary
          await db.appVersion.updateMany({
            where: { isPrimary: true },
            data: { isPrimary: false },
          });
          
          // Create new version as primary
          const newVersion = await db.appVersion.create({
            data: {
              version,
              description,
              fileUrl,
              fileName,
              fileSize,
              isPrimary: true,
              uploadedBy,
            },
          });
          
          set.status = 201;
          return {
            ...newVersion,
            uploadedAt: newVersion.uploadedAt.toISOString(),
          };
        } catch (err) {
          console.error('Error uploading app version:', err);
          return error(500, { error: "Ошибка при загрузке версии" });
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Загрузка новой версии приложения" },
        body: t.Object({
          file: t.File({ maxSize: '100m' }),
          version: t.String(),
          description: t.Optional(t.String()),
          uploadedBy: t.String(),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            version: t.String(),
            description: t.Nullable(t.String()),
            fileUrl: t.String(),
            fileName: t.String(),
            fileSize: t.Number(),
            isPrimary: t.Boolean(),
            uploadedAt: t.String(),
            uploadedBy: t.String(),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          500: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Set primary version ───────────────── */
    .patch(
      "/:id/set-primary",
      async ({ params, error }) => {
        try {
          // Check if version exists
          const version = await db.appVersion.findUnique({
            where: { id: params.id },
          });
          
          if (!version) {
            return error(404, { error: "Версия не найдена" });
          }
          
          // Set all versions to non-primary
          await db.appVersion.updateMany({
            where: { isPrimary: true },
            data: { isPrimary: false },
          });
          
          // Set this version as primary
          const updatedVersion = await db.appVersion.update({
            where: { id: params.id },
            data: { isPrimary: true },
          });
          
          return {
            ...updatedVersion,
            uploadedAt: updatedVersion.uploadedAt.toISOString(),
          };
        } catch (err) {
          console.error('Error setting primary version:', err);
          return error(500, { error: "Ошибка при установке основной версии" });
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Установка версии как основной" },
        params: t.Object({
          id: t.String(),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            version: t.String(),
            description: t.Nullable(t.String()),
            fileUrl: t.String(),
            fileName: t.String(),
            fileSize: t.Number(),
            isPrimary: t.Boolean(),
            uploadedAt: t.String(),
            uploadedBy: t.String(),
          }),
          401: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Delete version ───────────────── */
    .delete(
      "/:id",
      async ({ params, error }) => {
        try {
          // Check if version exists
          const version = await db.appVersion.findUnique({
            where: { id: params.id },
          });
          
          if (!version) {
            return error(404, { error: "Версия не найдена" });
          }
          
          if (version.isPrimary) {
            return error(400, { error: "Нельзя удалить основную версию" });
          }
          
          // Delete file from disk
          try {
            const filePath = join(process.cwd(), version.fileUrl);
            await unlink(filePath);
          } catch (err) {
            console.error('Error deleting file:', err);
            // Continue even if file deletion fails
          }
          
          // Delete from database
          await db.appVersion.delete({
            where: { id: params.id },
          });
          
          return { success: true };
        } catch (err) {
          console.error('Error deleting app version:', err);
          return error(500, { error: "Ошибка при удалении версии" });
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Удаление версии приложения" },
        params: t.Object({
          id: t.String(),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
      },
    );