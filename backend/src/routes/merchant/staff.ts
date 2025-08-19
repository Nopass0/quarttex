import { Elysia, t } from 'elysia';
import { db } from '@/db';
import { merchantSessionGuard } from '@/middleware/merchantSessionGuard';
import crypto from 'crypto';

export default (app: Elysia) =>
  app
    .use(merchantSessionGuard())
    .guard({
      async beforeHandle({ staffRole, error }) {
        if (staffRole !== 'owner') {
          return error(403, { error: 'Доступ запрещен' });
        }
      },
    })
    /* ──────── GET /merchant/staff ──────── */
    .get('', async ({ merchant }) => {
      const staff = await db.merchantStaff.findMany({
        where: { merchantId: merchant.id },
      });
      return {
        staff: staff.map(s => ({
          id: s.id,
          name: s.name,
          token: s.token,
          role: s.role,
          isActive: s.isActive,
          createdAt: s.createdAt.toISOString(),
        })),
      };
    }, {
      response: {
        200: t.Object({
          staff: t.Array(
            t.Object({
              id: t.String(),
              name: t.String(),
              token: t.String(),
              role: t.String(),
              isActive: t.Boolean(),
              createdAt: t.String(),
            })
          ),
        }),
      },
    })
    /* ──────── POST /merchant/staff ──────── */
    .post('', async ({ merchant, body }) => {
      const token = crypto.randomBytes(32).toString('hex');
      const staff = await db.merchantStaff.create({
        data: {
          merchantId: merchant.id,
          name: body.name,
          token,
        },
      });
      return {
        id: staff.id,
        name: staff.name,
        token: staff.token,
        role: staff.role,
        isActive: staff.isActive,
        createdAt: staff.createdAt.toISOString(),
      };
    }, {
      body: t.Object({ name: t.String() }),
      response: {
        200: t.Object({
          id: t.String(),
          name: t.String(),
          token: t.String(),
          role: t.String(),
          isActive: t.Boolean(),
          createdAt: t.String(),
        }),
      },
    })
    /* ──────── PATCH /merchant/staff/:id/regenerate ──────── */
    .patch(':id/regenerate', async ({ merchant, params, error }) => {
      const existing = await db.merchantStaff.findFirst({
        where: { id: params.id, merchantId: merchant.id },
      });
      if (!existing) {
        return error(404, { error: 'Сотрудник не найден' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      const staff = await db.merchantStaff.update({
        where: { id: existing.id },
        data: { token },
      });
      return { id: staff.id, token: staff.token };
    }, {
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({ id: t.String(), token: t.String() }),
        404: t.Object({ error: t.String() }),
      },
    });
