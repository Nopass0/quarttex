import { Elysia, t } from 'elysia';
import { BankType, PayoutStatus, Status, TransactionType, MethodType } from '@prisma/client';
import { wellbitGuard } from '@/middleware/wellbitGuard';
import { db } from '@/db';
import { mapToWellbitStatus, mapFromWellbitStatusToTransaction } from '@/utils/wellbit-status-mapper';
import { mapWellbitBankToOurs } from '@/utils/wellbit-bank-mapper';
import { randomBytes, createHmac } from 'node:crypto';
import { calculateFreezingParams } from '@/utils/freezing';
import { canonicalJson } from '@/utils/canonicalJson';
import { rapiraService } from '@/services/rapira.service';

const DEFAULT_WELLBIT_CALLBACK =
  'https://wellbit.pro/cascade/cb/79af32c6-37e2-4dd1-bf7f-fbef29bf2a24';

/**
 * Wellbit Payment Integration Routes
 * 
 * Implements the Wellbit payment API specification:
 * - /payment/create - Create a new payment
 * - /payment/get - Get payment details  
 * - /payment/status - Update payment status
 */
export default (app: Elysia) =>
  app
    .use(wellbitGuard())
    .onAfterHandle(async ({ response, headers, set }) => {
      try {
        // Re-fetch merchant to ensure we have the correct data
        const merchant = await db.merchant.findFirst({ 
          where: { apiKeyPublic: headers['x-api-key'] } 
        });
        
        if (!merchant) {
          console.error('Merchant not found in onAfterHandle');
          return response;
        }
        
        // Extract the actual response body from ElysiaCustomStatusResponse
        let responseBody = response;
        if (response && typeof response === 'object' && 'response' in response) {
          // This is an ElysiaCustomStatusResponse, extract the actual response
          responseBody = (response as any).response;
        }
        
        const canonical = canonicalJson(
          typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
        );
        const signature = createHmac('sha256', merchant.apiKeyPrivate || '')
          .update(canonical)
          .digest('hex');
        
        set.headers['x-api-key'] = merchant.apiKeyPublic;
        set.headers['x-api-token'] = signature;
      } catch (err) {
        console.error('Failed to sign wellbit response:', err);
      }
      return response;
    })

    // Create Payment
    .post(
      '/payment/create',
      async ({ body, wellbitMerchant, error }) => {
        try {
          // Map Wellbit bank code to our bank type
          const bankType = await mapWellbitBankToOurs(body.payment_bank);
          console.log('Mapped bank:', body.payment_bank, '->', bankType);
          
          // Map payment type
          const methodType = body.payment_type === 'card' ? 'c2c' : body.payment_type === 'sbp' ? 'sbp' : 'c2c';
          console.log('Payment type:', body.payment_type, '->', methodType);
          
          // Select method based on payment type and amount
          let methodCode: string;
          if (body.payment_type === 'sbp') {
            // For SBP: 5k-10k use sbp_wellbit, 10k-300k use sbp_wellbit_10k
            methodCode = body.payment_amount >= 10000 ? 'sbp_wellbit_10k' : 'sbp_wellbit';
          } else {
            // For card (c2c): 5k-10k use c2c_wellbit, 10k-300k use c2c_wellbit_10k
            methodCode = body.payment_amount >= 10000 ? 'c2c_wellbit_10k' : 'c2c_wellbit';
          }
          
          console.log('Selected method code:', methodCode, 'for amount:', body.payment_amount);
          
          // Find the specific method by code
          let method = await db.method.findFirst({
            where: {
              code: methodCode,
              isEnabled: true
            }
          });

          if (!method) {
            // Fallback: try to find any method with the right type
            console.warn(`Method ${methodCode} not found, falling back to any ${methodType} method`);
            method = await db.method.findFirst({
              where: {
                isEnabled: true,
                type: methodType
              }
            });
          }

          if (!method) {
            console.error('No active payment methods found');
            return error(400, { error: 'Payment method not available' });
          }

          console.log('Found method:', method);

          // Check if merchant has access to this method
          const merchantMethod = await db.merchantMethod.findUnique({
            where: {
              merchantId_methodId: {
                merchantId: wellbitMerchant.id,
                methodId: method.id,
              },
            },
          });

          if (!merchantMethod || !merchantMethod.isEnabled) {
            return error(404, { error: 'Method not available for merchant' });
          }

          // Check amount limits
          if (body.payment_amount < method.minPayin || body.payment_amount > method.maxPayin) {
            return error(400, { error: 'Amount out of allowed range' });
          }

          // Find suitable requisites
          console.log('Searching for requisites with:', {
            methodType: method.type,
            bankType: bankType,
            amount: body.payment_amount
          });
          
          // Get list of traders connected to Wellbit merchant with enabled inputs
          const connectedTraders = await db.traderMerchant.findMany({
            where: {
              merchantId: wellbitMerchant.id,
              methodId: method.id,
              isMerchantEnabled: true,
              isFeeInEnabled: true, // Check that input is enabled
            },
            select: { traderId: true },
          });

          const traderIds = connectedTraders.map((ct) => ct.traderId);
          console.log(`[Wellbit] Found ${traderIds.length} traders connected to merchant for method ${method.code}`);

          const pool = await db.bankDetail.findMany({
            where: {
              isArchived: false,
              isActive: true, // Requisite must be active
              methodType: method.type,
              userId: { in: traderIds }, // Only traders connected to merchant
              user: {
                banned: false,
                deposit: { gte: 1000 }, // Minimum deposit 1000
                trafficEnabled: true, // Team switch must be enabled
              },
              bankType: bankType,
              // Check that bank card device is working
              OR: [
                { deviceId: null }, // Card without device
                { device: { isWorking: true, isOnline: true } }, // Or device is active
              ],
            },
            orderBy: { updatedAt: 'asc' },
            include: { user: true, device: true },
          });
          
          console.log(`Found ${pool.length} requisites for bank ${bankType} and method ${method.type}`);

          let chosen = null;
          for (const bd of pool) {
            console.log(`Checking requisite ${bd.id}:`, {
              cardNumber: bd.cardNumber.slice(0, 4) + '****',
              minAmount: bd.minAmount,
              maxAmount: bd.maxAmount,
              userMinAmount: bd.user.minAmountPerRequisite,
              userMaxAmount: bd.user.maxAmountPerRequisite,
              hasDevice: !!bd.deviceId,
              deviceStatus: bd.device ? { isWorking: bd.device.isWorking, isOnline: bd.device.isOnline } : null
            });
            
            if (body.payment_amount < bd.minAmount || body.payment_amount > bd.maxAmount) {
              console.log(`  - Amount ${body.payment_amount} not in range ${bd.minAmount}-${bd.maxAmount}`);
              continue;
            }
            if (body.payment_amount < bd.user.minAmountPerRequisite || body.payment_amount > bd.user.maxAmountPerRequisite) {
              console.log(`  - Amount ${body.payment_amount} not in user range ${bd.user.minAmountPerRequisite}-${bd.user.maxAmountPerRequisite}`);
              continue;
            }

            // Check for existing transaction with same amount on this requisite
            const existingTransaction = await db.transaction.findFirst({
              where: {
                bankDetailId: bd.id,
                amount: body.payment_amount,
                status: {
                  in: [Status.CREATED, Status.IN_PROGRESS],
                },
                type: TransactionType.IN,
              },
            });

            if (existingTransaction) {
              console.log(
                `[Wellbit] Requisite ${bd.id} rejected: already has transaction for amount ${body.payment_amount} in status ${existingTransaction.status}`,
              );
              continue;
            }

            // Check operation limit without time limit
            if (bd.operationLimit > 0) {
              const totalOperations = await db.transaction.count({
                where: {
                  bankDetailId: bd.id,
                  status: {
                    in: [Status.IN_PROGRESS, Status.READY],
                  },
                },
              });
              console.log(
                `[Wellbit] - Total operations (IN_PROGRESS + READY): ${totalOperations}/${bd.operationLimit}`,
              );
              if (totalOperations >= bd.operationLimit) {
                console.log(
                  `[Wellbit] Requisite ${bd.id} rejected: operation limit reached. Current: ${totalOperations}, limit: ${bd.operationLimit}`,
                );
                continue;
              }
            }

            // Check total sum limit
            if (bd.sumLimit > 0) {
              const totalSumResult = await db.transaction.aggregate({
                where: {
                  bankDetailId: bd.id,
                  status: {
                    in: [Status.IN_PROGRESS, Status.READY],
                  },
                },
                _sum: { amount: true },
              });
              const totalSum = (totalSumResult._sum.amount ?? 0) + body.payment_amount;
              console.log(
                `[Wellbit] - Total sum (IN_PROGRESS + READY): ${totalSumResult._sum.amount ?? 0} + ${body.payment_amount} = ${totalSum}/${bd.sumLimit}`,
              );
              if (totalSum > bd.sumLimit) {
                console.log(
                  `[Wellbit] Requisite ${bd.id} rejected: sum limit exceeded. Current sum: ${totalSumResult._sum.amount ?? 0}, new sum: ${totalSum}, limit: ${bd.sumLimit}`,
                );
                continue;
              }
            }
            
            console.log(`  ✓ Chosen requisite ${bd.id}`);
            chosen = bd;
            break;
          }

          if (!chosen) {
            // Try to find requisites without strict bank type match
            console.log('No requisites found for specific bank, trying any bank...');
            const anyBankPool = await db.bankDetail.findMany({
              where: {
                isArchived: false,
                isActive: true, // Requisite must be active
                methodType: method.type,
                userId: { in: traderIds },
                user: {
                  banned: false,
                  deposit: { gte: 1000 },
                  trafficEnabled: true,
                },
                OR: [
                  { deviceId: null },
                  { device: { isWorking: true, isOnline: true } },
                ],
              },
              orderBy: { updatedAt: 'asc' },
              include: { user: true, device: true },
            });
            
            console.log(`Found ${anyBankPool.length} requisites for any bank`);
            
            for (const bd of anyBankPool) {
              
              if (body.payment_amount < bd.minAmount || body.payment_amount > bd.maxAmount) continue;
              if (body.payment_amount < bd.user.minAmountPerRequisite || body.payment_amount > bd.user.maxAmountPerRequisite) continue;
              
              // Check for existing transaction with same amount
              const existingTransaction = await db.transaction.findFirst({
                where: {
                  bankDetailId: bd.id,
                  amount: body.payment_amount,
                  status: {
                    in: [Status.CREATED, Status.IN_PROGRESS],
                  },
                  type: TransactionType.IN,
                },
              });

              if (existingTransaction) {
                console.log(`[Wellbit] Requisite ${bd.id} rejected: duplicate amount`);
                continue;
              }

              // Check operation limit
              if (bd.operationLimit > 0) {
                const totalOperations = await db.transaction.count({
                  where: {
                    bankDetailId: bd.id,
                    status: {
                      in: [Status.IN_PROGRESS, Status.READY],
                    },
                  },
                });
                if (totalOperations >= bd.operationLimit) {
                  console.log(`[Wellbit] Requisite ${bd.id} rejected: operation limit`);
                  continue;
                }
              }

              // Check sum limit
              if (bd.sumLimit > 0) {
                const totalSumResult = await db.transaction.aggregate({
                  where: {
                    bankDetailId: bd.id,
                    status: {
                      in: [Status.IN_PROGRESS, Status.READY],
                    },
                  },
                  _sum: { amount: true },
                });
                const totalSum = (totalSumResult._sum.amount ?? 0) + body.payment_amount;
                if (totalSum > bd.sumLimit) {
                  console.log(`[Wellbit] Requisite ${bd.id} rejected: sum limit`);
                  continue;
                }
              }

              // Check interval between transactions
              if (bd.intervalMinutes > 0) {
                const intervalStart = new Date();
                intervalStart.setMinutes(intervalStart.getMinutes() - bd.intervalMinutes);
                
                const recentTransaction = await db.transaction.findFirst({
                  where: {
                    bankDetailId: bd.id,
                    createdAt: {
                      gte: intervalStart,
                    },
                    status: {
                      notIn: [Status.CANCELED, Status.EXPIRED],
                    },
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                });

                if (recentTransaction) {
                  const timeSinceLastTransaction = Math.floor(
                    (Date.now() - recentTransaction.createdAt.getTime()) / (1000 * 60)
                  );
                  console.log(
                    `[Wellbit] Requisite ${bd.id} rejected: interval not met. ` +
                    `Last transaction: ${timeSinceLastTransaction} min ago, required interval: ${bd.intervalMinutes} min`
                  );
                  continue;
                }

                console.log(
                  `[Wellbit] - Interval check passed for requisite ${bd.id}: ${bd.intervalMinutes} min`
                );
              }
              
              console.log(`  ✓ Chosen requisite ${bd.id} with bank ${bd.bankType}`);
              chosen = bd;
              break;
            }
          }

          if (!chosen) {
            console.error('No suitable requisites found for amount:', body.payment_amount, 'bank:', bankType, 'method:', method.type);
            return error(409, { error: 'No suitable payment credentials available' });
          }

          // Get trader merchant settings for fee calculation
          const traderMerchant = await db.traderMerchant.findUnique({
            where: {
              traderId_merchantId_methodId: {
                traderId: chosen.userId,
                merchantId: wellbitMerchant.id,
                methodId: method.id
              }
            }
          });

          // Get rate from selected source with KKK
          const rateSettingRecord = await db.rateSetting.findFirst({ where: { id: 1 } });
          const kkk = rateSettingRecord?.rapiraKkk || 0;
          let rateWithKkk = 0;
          if (traderMerchant?.rateSource === 'rapira') {
            rateWithKkk = await rapiraService.getRateWithKkk(kkk);
          } else {
            const { bybitService } = await import("@/services/bybit.service");
            rateWithKkk = await bybitService.getRateWithKkk(kkk);
          }
          
          console.log('[Wellbit] Selected rate with KKK:', rateWithKkk);
          console.log('[Wellbit] Merchant provided rate:', body.payment_course);
          
          // Calculate freezing parameters
          const kkkPercent = 0; // TODO: Get from system config
          const feeInPercent = traderMerchant?.feeIn || 0;
          
          const freezingParams = calculateFreezingParams(
            body.payment_amount,
            body.payment_course, // Use merchant rate for freezing calculation
            kkkPercent,
            feeInPercent
          );

          // Check trader balance sufficiency
          if (freezingParams && chosen.user) {
            const availableBalance = chosen.user.trustBalance - chosen.user.frozenUsdt;
            if (availableBalance < freezingParams.totalRequired) {
              console.log(
                `[Wellbit] Insufficient balance. Required: ${freezingParams.totalRequired}, available: ${availableBalance}`,
              );
              return error(409, { error: 'No suitable payment credentials available' });
            }
          }

          // Create transaction with freezing parameters and freeze funds in a transaction
          const transaction = await db.$transaction(async (prisma) => {
            const tx = await prisma.transaction.create({
              data: {
                merchantId: wellbitMerchant.id,
                methodId: method.id,
                orderId: body.payment_id.toString(),
                amount: body.payment_amount,
                type: TransactionType.IN,
                status: Status.IN_PROGRESS, // Set to IN_PROGRESS since we have requisites
                rate: rapiraRateWithKkk, // Always use Rapira rate with KKK
                merchantRate: body.payment_course, // Store merchant provided rate
                currency: 'RUB',
                expired_at: new Date(Date.now() + body.payment_lifetime * 1000),
                clientName: `Wellbit Payment ${body.payment_id}`,
                userIp: '127.0.0.1',
                callbackUri:
                  wellbitMerchant.wellbitCallbackUrl || DEFAULT_WELLBIT_CALLBACK,
                successUri: `${process.env.BASE_URL || 'http://localhost:3000'}/api/wellbit/success/${body.payment_id}`,
                failUri: `${process.env.BASE_URL || 'http://localhost:3000'}/api/wellbit/fail/${body.payment_id}`,
                // Required fields
                assetOrBank: method.type === MethodType.sbp
                  ? chosen.cardNumber
                  : `${chosen.bankType}: ${chosen.cardNumber}`,
                userId: chosen.userId,
                commission: method.commissionPayin,
                // Trader assignment
                traderId: chosen.userId,
                bankDetailId: chosen.id,
                // Freezing parameters
                adjustedRate: freezingParams.adjustedRate,
                frozenUsdtAmount: freezingParams.frozenUsdtAmount,
                calculatedCommission: freezingParams.calculatedCommission,
                feeInPercent: feeInPercent,
                kkkPercent: kkkPercent,
              },
            });

            // Freeze trader's balance
            if (freezingParams && chosen.user) {
              console.log(
                `[Wellbit] Freezing funds for trader ${chosen.userId}: ${freezingParams.totalRequired} USDT`,
              );
              console.log(
                `[Wellbit] Trader balance before freezing - trustBalance: ${chosen.user.trustBalance}, frozenUsdt: ${chosen.user.frozenUsdt}`,
              );
              
              const updatedUser = await prisma.user.update({
                where: { id: chosen.userId },
                data: {
                  frozenUsdt: { increment: freezingParams.totalRequired },
                  trustBalance: { decrement: freezingParams.totalRequired }, // Deduct from balance when freezing
                },
              });
              
              console.log(
                `[Wellbit] Trader balance after freezing - trustBalance: ${updatedUser.trustBalance}, frozenUsdt: ${updatedUser.frozenUsdt}`,
              );
            }

            return tx;
          });

          console.log('Created transaction with requisites:', {
            transactionId: transaction.id,
            traderId: chosen.userId,
            cardNumber: chosen.cardNumber,
            frozenAmount: freezingParams.totalRequired
          });

          // Return response with payment credentials
          return {
            ...body,
            payment_bank: body.payment_bank || bankType, // Keep original Wellbit bank code
            payment_credential: chosen.cardNumber, // Return card number
            payment_status: 'new',
          };
        } catch (err) {
          console.error('Failed to create payment:', err);
          console.error('Full error details:', JSON.stringify(err, null, 2));
          if (err instanceof Error) {
            console.error('Error message:', err.message);
            console.error('Error stack:', err.stack);
          }
          return error(500, { error: 'Failed to create payment' });
        }
      },
      {
        body: t.Object({
          payment_id: t.Number(),
          payment_amount: t.Number(),
          payment_amount_usdt: t.Number(),
          payment_amount_profit: t.Number(),
          payment_amount_profit_usdt: t.Number(),
          payment_fee_percent_profit: t.Number(),
          payment_type: t.String(),
          payment_bank: t.Union([t.String(), t.Null()]),
          payment_course: t.Number(),
          payment_lifetime: t.Number(),
          payment_status: t.String(),
        }),
      }
    )
    
    // Get Payment
    .post(
      '/payment/get',
      async ({ body, wellbitMerchant, error }) => {
        try {
          // Find transaction by order ID
          const transaction = await db.transaction.findFirst({
            where: {
              merchantId: wellbitMerchant.id,
              orderId: body.payment_id.toString(),
            },
          });

          if (!transaction) {
            return error(404, { error: 'Payment not found' });
          }

          return {
            payment_id: body.payment_id,
            payment_status: mapToWellbitStatus(transaction.status),
          };
        } catch (err) {
          console.error('Failed to get payment:', err);
          return error(500, { error: 'Failed to get payment' });
        }
      },
      {
        body: t.Object({
          payment_id: t.Number(),
        }),
      }
    )
    
    // Update Payment Status
    .post(
      '/payment/status',
      async ({ body, wellbitMerchant, error }) => {
        try {
          // Find transaction by order ID
          const transaction = await db.transaction.findFirst({
            where: {
              merchantId: wellbitMerchant.id,
              orderId: body.payment_id.toString(),
            },
          });

          if (!transaction) {
            return error(404, { error: 'Payment not found' });
          }

          // Map Wellbit status to internal status
          const internalStatus = mapFromWellbitStatusToTransaction(body.payment_status);

          // Update transaction status
          await db.transaction.update({
            where: { id: transaction.id },
            data: { status: internalStatus },
          });

          // Send webhook to Wellbit about status change
          if (transaction.callbackUri) {
            try {
              const webhookData = {
                payment_id: body.payment_id,
                payment_status: body.payment_status,
                updated_at: new Date().toISOString()
              };
              
              await fetch(transaction.callbackUri, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookData),
              });
            } catch (webhookError) {
              console.error('Failed to send webhook:', webhookError);
              // Don't fail the request if webhook fails
            }
          }

          return {
            payment_id: body.payment_id,
            payment_status: body.payment_status,
          };
        } catch (err) {
          console.error('Failed to update payment status:', err);
          return error(500, { error: 'Failed to update payment status' });
        }
      },
      {
        body: t.Object({
          payment_id: t.Number(),
          payment_status: t.String(),
        }),
      }
    );