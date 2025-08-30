#!/usr/bin/env bun
import { program } from "commander";
import { MerchantEmulatorService } from "../services/merchant-emulator.service";
import { db } from "../db";
import { closeMongo } from "../db/mongo";
import { Table } from "console-table-printer";
import chalk from "chalk";

const emulator = new MerchantEmulatorService();

// Helper to format currency
const formatAmount = (amount: number, currency: string = "RUB") => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
  }).format(amount);
};

// Helper to print results
const printResults = (results: any) => {
  if (results.success || results.deal || results.payout) {
    console.log(chalk.green("✅ Transaction created successfully"));
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(chalk.red("❌ Transaction failed"));
    console.log(chalk.red(results.error || "Unknown error"));
  }
};

program
  .name("merchant-emulator")
  .description("CLI tool for emulating merchant API calls")
  .version("1.0.0");

// Generate deal command
program
  .command("deal")
  .description("Generate and send a mock deal")
  .requiredOption("-t, --token <token>", "Merchant API token")
  .option("-a, --amount <amount>", "Transaction amount", parseInt)
  .option("-c, --currency <currency>", "Currency code", "RUB")
  .option("--card <card>", "Card number (16 digits)")
  .option("--bank <bank>", "Bank name")
  .option("--webhook <url>", "Webhook URL")
  .action(async (options) => {
    try {
      await emulator.start();
      
      const transaction = emulator.generateMockDeal({
        amount: options.amount,
        currency: options.currency,
        cardNumber: options.card,
        bank: options.bank,
        webhookUrl: options.webhook,
      });

      console.log(chalk.blue("📤 Sending mock deal..."));
      console.log(`Amount: ${formatAmount(transaction.amount, transaction.currency)}`);
      console.log(`Card: ${transaction.cardNumber}`);
      console.log(`Bank: ${transaction.bank}`);

      const result = await emulator.sendMockTransaction(options.token, transaction);
      printResults(result);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    } finally {
      await cleanup();
    }
  });

// Generate withdrawal command
program
  .command("withdrawal")
  .description("Generate and send a mock withdrawal")
  .requiredOption("-t, --token <token>", "Merchant API token")
  .option("-a, --amount <amount>", "Transaction amount", parseInt)
  .option("-c, --currency <currency>", "Currency code", "RUB")
  .option("--wallet <wallet>", "Wallet/card number")
  .option("--bank <bank>", "Bank name")
  .option("--rate <rate>", "Merchant rate", parseFloat, 100)
  .option("--webhook <url>", "Webhook URL")
  .action(async (options) => {
    try {
      await emulator.start();
      
      const transaction = emulator.generateMockWithdrawal({
        amount: options.amount,
        currency: options.currency,
        wallet: options.wallet,
        bank: options.bank,
        webhookUrl: options.webhook,
      });

      console.log(chalk.blue("📤 Sending mock withdrawal..."));
      console.log(`Amount: ${formatAmount(transaction.amount, transaction.currency)}`);
      console.log(`Wallet: ${transaction.wallet}`);
      console.log(`Bank: ${transaction.bank}`);
      console.log(`Rate: ${options.rate}`);

      const result = await emulator.sendMockTransaction(options.token, transaction, options.rate);
      printResults(result);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    } finally {
      await cleanup();
    }
  });

// Batch generation command
program
  .command("batch")
  .description("Generate and send a batch of transactions")
  .requiredOption("-m, --merchant <id>", "Merchant ID")
  .requiredOption("-t, --type <type>", "Transaction type (deal/withdrawal)")
  .requiredOption("-c, --count <count>", "Number of transactions", parseInt)
  .option("--min-amount <amount>", "Minimum amount", parseInt)
  .option("--max-amount <amount>", "Maximum amount", parseInt)
  .option("--currency <currency>", "Currency code", "RUB")
  .option("--delay <ms>", "Delay between transactions (ms)", parseInt)
  .action(async (options) => {
    try {
      if (options.count > 1000) {
        console.error(chalk.red("Batch size cannot exceed 1000 transactions"));
        return;
      }

      await emulator.start();

      console.log(chalk.blue(`🔄 Starting batch generation...`));
      console.log(`Type: ${options.type}`);
      console.log(`Count: ${options.count}`);
      console.log(`Amount range: ${options.minAmount || "default"} - ${options.maxAmount || "default"}`);

      const startTime = Date.now();
      const result = await emulator.generateBatch({
        merchantId: options.merchant,
        transactionType: options.type,
        count: options.count,
        minAmount: options.minAmount,
        maxAmount: options.maxAmount,
        currency: options.currency,
        delayMs: options.delay,
      });

      const duration = (Date.now() - startTime) / 1000;

      console.log(chalk.green(`\n✅ Batch completed in ${duration.toFixed(2)}s`));
      console.log(`Batch ID: ${result.batchId}`);
      console.log(`Successful: ${chalk.green(result.successful)}`);
      console.log(`Failed: ${chalk.red(result.failed)}`);
      console.log(`Success rate: ${((result.successful / options.count) * 100).toFixed(2)}%`);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    } finally {
      await cleanup();
    }
  });

// Logs command
program
  .command("logs")
  .description("View emulator logs")
  .option("-m, --merchant <id>", "Filter by merchant ID")
  .option("-b, --batch <id>", "Filter by batch ID")
  .option("-l, --limit <count>", "Limit results", parseInt, 20)
  .option("--days <days>", "Show logs from last N days", parseInt, 7)
  .action(async (options) => {
    try {
      await emulator.start();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - options.days);

      const { logs, total } = await emulator.getLogs({
        merchantId: options.merchant,
        batchId: options.batch,
        startDate,
        limit: options.limit,
      });

      if (logs.length === 0) {
        console.log(chalk.yellow("No logs found"));
        return;
      }

      const table = new Table({
        columns: [
          { name: "timestamp", title: "Time", alignment: "left" },
          { name: "merchant", title: "Merchant", alignment: "left" },
          { name: "type", title: "Type", alignment: "left" },
          { name: "status", title: "Status", alignment: "center" },
          { name: "error", title: "Error", alignment: "left" },
        ],
      });

      logs.forEach((log: any) => {
        table.addRow({
          timestamp: new Date(log.timestamp).toLocaleString("ru-RU"),
          merchant: log.merchantName.substring(0, 20),
          type: log.transactionType,
          status: log.status === "success" ? chalk.green("✓") : chalk.red("✗"),
          error: log.error || "-",
        });
      });

      table.printTable();
      console.log(`\nShowing ${logs.length} of ${total} total logs`);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    } finally {
      await cleanup();
    }
  });

// Stats command
program
  .command("stats")
  .description("View emulator statistics")
  .option("-m, --merchant <id>", "Filter by merchant ID")
  .option("--days <days>", "Statistics for last N days", parseInt, 7)
  .action(async (options) => {
    try {
      await emulator.start();

      const stats = await emulator.getStatistics(options.merchant, options.days);

      console.log(chalk.blue(`\n📊 Emulator Statistics (Last ${options.days} days)\n`));

      const table = new Table({
        columns: [
          { name: "type", title: "Transaction Type", alignment: "left" },
          { name: "success", title: "Success", alignment: "right", color: "green" },
          { name: "error", title: "Error", alignment: "right", color: "red" },
          { name: "total", title: "Total", alignment: "right" },
          { name: "rate", title: "Success Rate", alignment: "right" },
        ],
      });

      // Deals row
      const dealTotal = stats.deals.success + stats.deals.error;
      if (dealTotal > 0) {
        table.addRow({
          type: "Deals",
          success: stats.deals.success,
          error: stats.deals.error,
          total: dealTotal,
          rate: `${((stats.deals.success / dealTotal) * 100).toFixed(2)}%`,
        });
      }

      // Withdrawals row
      const withdrawalTotal = stats.withdrawals.success + stats.withdrawals.error;
      if (withdrawalTotal > 0) {
        table.addRow({
          type: "Withdrawals",
          success: stats.withdrawals.success,
          error: stats.withdrawals.error,
          total: withdrawalTotal,
          rate: `${((stats.withdrawals.success / withdrawalTotal) * 100).toFixed(2)}%`,
        });
      }

      // Total row
      if (stats.total > 0) {
        const totalSuccess = stats.deals.success + stats.withdrawals.success;
        table.addRow({
          type: chalk.bold("Total"),
          success: chalk.bold(totalSuccess),
          error: chalk.bold(stats.total - totalSuccess),
          total: chalk.bold(stats.total),
          rate: chalk.bold(`${((totalSuccess / stats.total) * 100).toFixed(2)}%`),
        });
      }

      table.printTable();
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    } finally {
      await cleanup();
    }
  });

// List merchants command
program
  .command("merchants")
  .description("List available merchants")
  .action(async () => {
    try {
      const merchants = await db.merchant.findMany({
        where: { disabled: false, banned: false },
        select: {
          id: true,
          name: true,
          token: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      });

      if (merchants.length === 0) {
        console.log(chalk.yellow("No active merchants found"));
        return;
      }

      const table = new Table({
        columns: [
          { name: "id", title: "ID", alignment: "left" },
          { name: "name", title: "Name", alignment: "left" },
          { name: "token", title: "Token", alignment: "left" },
          { name: "created", title: "Created", alignment: "left" },
        ],
      });

      merchants.forEach((merchant) => {
        table.addRow({
          id: merchant.id,
          name: merchant.name,
          token: merchant.token.substring(0, 20) + "...",
          created: new Date(merchant.createdAt).toLocaleDateString("ru-RU"),
        });
      });

      table.printTable();
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    } finally {
      await cleanup();
    }
  });

// Cleanup function
async function cleanup() {
  await emulator.stop();
  await closeMongo();
  await db.$disconnect();
}

// Parse arguments
program.parse(process.argv);