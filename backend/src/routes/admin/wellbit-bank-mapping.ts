import { Elysia, t } from 'elysia';
import { db } from '@/db';
import { BankType } from '@prisma/client';
import { getAllWellbitBankMappings, updateWellbitBankMapping } from '@/utils/wellbit-bank-mapper';

export const wellbitBankMappingRoutes = new Elysia({ prefix: '/wellbit/bank-mappings' })
  .get(
    '/',
    async () => {
      const mappings = await getAllWellbitBankMappings();
      
      // Add available bank types for UI
      const availableBankTypes = Object.values(BankType);
      
      return {
        mappings,
        availableBankTypes
      };
    },
    {
      tags: ['admin'],
      detail: { summary: 'Get all Wellbit bank mappings' },
      headers: t.Object({ 'x-admin-key': t.String() }),
      response: {
        200: t.Object({
          mappings: t.Array(t.Object({
            id: t.Number(),
            wellbitBankCode: t.String(),
            wellbitBankName: t.String(),
            ourBankName: t.String(),
            createdAt: t.Date(),
            updatedAt: t.Date(),
          })),
          availableBankTypes: t.Array(t.String())
        })
      }
    }
  )
  .patch(
    '/:wellbitBankCode',
    async ({ params, body, error }) => {
      try {
        // Validate that the bank type exists in our enum
        if (!Object.values(BankType).includes(body.ourBankName as BankType)) {
          return error(400, { error: 'Invalid bank type' });
        }
        
        await updateWellbitBankMapping(params.wellbitBankCode, body.ourBankName);
        
        return { success: true };
      } catch (err) {
        console.error('Failed to update bank mapping:', err);
        return error(500, { error: 'Failed to update bank mapping' });
      }
    },
    {
      tags: ['admin'],
      detail: { summary: 'Update Wellbit bank mapping' },
      headers: t.Object({ 'x-admin-key': t.String() }),
      params: t.Object({
        wellbitBankCode: t.String()
      }),
      body: t.Object({
        ourBankName: t.String()
      }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        400: t.Object({ error: t.String() }),
        500: t.Object({ error: t.String() })
      }
    }
  )
  .post(
    '/bulk-update',
    async ({ body, error }) => {
      try {
        // Update multiple mappings at once
        for (const mapping of body.mappings) {
          if (!Object.values(BankType).includes(mapping.ourBankName as BankType)) {
            return error(400, { error: `Invalid bank type: ${mapping.ourBankName}` });
          }
          
          await updateWellbitBankMapping(mapping.wellbitBankCode, mapping.ourBankName);
        }
        
        return { success: true, updated: body.mappings.length };
      } catch (err) {
        console.error('Failed to bulk update bank mappings:', err);
        return error(500, { error: 'Failed to update bank mappings' });
      }
    },
    {
      tags: ['admin'],
      detail: { summary: 'Bulk update Wellbit bank mappings' },
      headers: t.Object({ 'x-admin-key': t.String() }),
      body: t.Object({
        mappings: t.Array(t.Object({
          wellbitBankCode: t.String(),
          ourBankName: t.String()
        }))
      }),
      response: {
        200: t.Object({ 
          success: t.Boolean(),
          updated: t.Number()
        }),
        400: t.Object({ error: t.String() }),
        500: t.Object({ error: t.String() })
      }
    }
  );

export default wellbitBankMappingRoutes;