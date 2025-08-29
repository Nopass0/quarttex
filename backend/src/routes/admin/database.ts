import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const databaseRoute = new Elysia({ prefix: '/database' })
  
  // Get list of all tables
  .get('/tables', async () => {
    try {
      // Get all table names from Prisma schema
      const tables = [
        'User',
        'Transaction', 
        'BankDetail',
        'Merchant',
        'PaymentMethod',
        'Device',
        'Requisite',
        'Settlement',
        'BalanceTopupRequest',
        'MerchantPaymentMethod',
        'IpWhitelist'
      ]
      
      return {
        success: true,
        data: tables
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tables'
      }
    }
  })
  
  // Get table data with pagination
  .get('/tables/:tableName', async ({ params, query }) => {
    try {
      const { tableName } = params
      const page = parseInt(query.page || '1')
      const limit = parseInt(query.limit || '50')
      const skip = (page - 1) * limit
      
      // Validate table name
      const validTables = ['User', 'Transaction', 'BankDetail', 'Merchant', 'PaymentMethod', 'Device', 'Requisite', 'Settlement', 'BalanceTopupRequest', 'MerchantPaymentMethod', 'IpWhitelist']
      if (!validTables.includes(tableName)) {
        return {
          success: false,
          error: 'Invalid table name'
        }
      }
      
      // Get data and count
      const model = (prisma as any)[tableName.charAt(0).toLowerCase() + tableName.slice(1)]
      const [data, total] = await Promise.all([
        model.findMany({
          skip,
          take: limit,
          orderBy: { id: 'desc' }
        }),
        model.count()
      ])
      
      return {
        success: true,
        data: {
          rows: data,
          total,
          page,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get table data'
      }
    }
  }, {
    params: t.Object({
      tableName: t.String()
    }),
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String())
    })
  })
  
  // Get single row
  .get('/tables/:tableName/:id', async ({ params }) => {
    try {
      const { tableName, id } = params
      
      // Validate table name
      const validTables = ['User', 'Transaction', 'BankDetail', 'Merchant', 'PaymentMethod', 'Device', 'Requisite', 'Settlement', 'BalanceTopupRequest', 'MerchantPaymentMethod', 'IpWhitelist']
      if (!validTables.includes(tableName)) {
        return {
          success: false,
          error: 'Invalid table name'
        }
      }
      
      const model = (prisma as any)[tableName.charAt(0).toLowerCase() + tableName.slice(1)]
      const data = await model.findUnique({
        where: { id }
      })
      
      if (!data) {
        return {
          success: false,
          error: 'Row not found'
        }
      }
      
      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get row'
      }
    }
  }, {
    params: t.Object({
      tableName: t.String(),
      id: t.String()
    })
  })
  
  // Update row
  .patch('/tables/:tableName/:id', async ({ params, body }) => {
    try {
      const { tableName, id } = params
      
      // Validate table name
      const validTables = ['User', 'Transaction', 'BankDetail', 'Merchant', 'PaymentMethod', 'Device', 'Requisite', 'Settlement', 'BalanceTopupRequest', 'MerchantPaymentMethod', 'IpWhitelist']
      if (!validTables.includes(tableName)) {
        return {
          success: false,
          error: 'Invalid table name'
        }
      }
      
      const model = (prisma as any)[tableName.charAt(0).toLowerCase() + tableName.slice(1)]
      
      // Remove id from update data
      const updateData = { ...body }
      delete updateData.id
      
      // Защита от изменения номера телефона в BankDetail
      if (tableName === 'BankDetail' && updateData.phoneNumber !== undefined) {
        const existing = await model.findUnique({ where: { id } })
        if (existing && existing.phoneNumber !== updateData.phoneNumber) {
          return {
            success: false,
            error: 'Номер телефона нельзя изменить после создания реквизита'
          }
        }
      }
      
      const data = await model.update({
        where: { id },
        data: updateData
      })
      
      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update row'
      }
    }
  }, {
    params: t.Object({
      tableName: t.String(),
      id: t.String()
    }),
    body: t.Any()
  })
  
  // Delete row
  .delete('/tables/:tableName/:id', async ({ params }) => {
    try {
      const { tableName, id } = params
      
      // Validate table name
      const validTables = ['User', 'Transaction', 'BankDetail', 'Merchant', 'PaymentMethod', 'Device', 'Requisite', 'Settlement', 'BalanceTopupRequest', 'MerchantPaymentMethod', 'IpWhitelist']
      if (!validTables.includes(tableName)) {
        return {
          success: false,
          error: 'Invalid table name'
        }
      }
      
      const model = (prisma as any)[tableName.charAt(0).toLowerCase() + tableName.slice(1)]
      await model.delete({
        where: { id }
      })
      
      return {
        success: true,
        message: 'Row deleted successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete row'
      }
    }
  }, {
    params: t.Object({
      tableName: t.String(),
      id: t.String()
    })
  })
  
  // Create new row
  .post('/tables/:tableName', async ({ params, body }) => {
    try {
      const { tableName } = params
      
      // Validate table name
      const validTables = ['User', 'Transaction', 'BankDetail', 'Merchant', 'PaymentMethod', 'Device', 'Requisite', 'Settlement', 'BalanceTopupRequest', 'MerchantPaymentMethod', 'IpWhitelist']
      if (!validTables.includes(tableName)) {
        return {
          success: false,
          error: 'Invalid table name'
        }
      }
      
      const model = (prisma as any)[tableName.charAt(0).toLowerCase() + tableName.slice(1)]
      const data = await model.create({
        data: body
      })
      
      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create row'
      }
    }
  }, {
    params: t.Object({
      tableName: t.String()
    }),
    body: t.Any()
  })