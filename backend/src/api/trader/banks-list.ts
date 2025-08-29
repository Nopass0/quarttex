import Elysia from "elysia";
import { BANKS } from "@/constants/banks";

// Returns list of bank labels for trader forms
export const traderBanksListApi = new Elysia({ prefix: "/banks-list" })
  .get("/", async ({ set }) => {
    try {
      return {
        success: true,
        banks: BANKS.map(b => b.label).sort((a, b) => a.localeCompare(b, "ru")),
      };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  });
