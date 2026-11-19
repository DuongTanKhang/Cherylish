import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CommerceService } from "./commerce.service.js";

function createService(configured: boolean, rawRows: any[] = []) {
  const updates: Array<{ where: any; data: any }> = [];
  const prisma = {
    $queryRaw: async () => rawRows,
    product: {
      updateMany: async (input: any) => { updates.push(input); return { count: 2 }; },
    },
  };
  const loyverse = {
    isConfigured: () => configured,
    status: () => ({ provider: "Loyverse", configured }),
  };
  const service = new CommerceService(prisma as any, {} as any, loyverse as any);
  return { service, updates };
}

describe("CommerceService Loyverse inventory queue", () => {
  it("queues stock only for jewelry and gemstones when Loyverse is configured", async () => {
    const { service, updates } = createService(true);
    await (service as any).queueProductStockSync({ product: { updateMany: async (input: any) => updates.push(input) } }, ["j-1", "g-1", "j-1", "item-1"]);
    assert.equal(updates.length, 1);
    assert.deepEqual(updates[0].where.id.in, ["j-1", "g-1", "item-1"]);
    assert.deepEqual(updates[0].where.kind.in, ["JEWELRY", "GEMSTONE"]);
    assert.equal(updates[0].data.loyverseStockSyncStatus, "PENDING");
    assert.ok(updates[0].data.loyverseStockSyncNextAttemptAt instanceof Date);
  });

  it("marks inventory locally managed when the free Loyverse connection is disabled", async () => {
    const { service, updates } = createService(false);
    await (service as any).queueProductStockSync({ product: { updateMany: async (input: any) => updates.push(input) } }, ["j-1"]);
    assert.equal(updates[0].data.loyverseStockSyncStatus, "DISABLED");
    assert.equal(updates[0].data.loyverseStockSyncNextAttemptAt, null);
  });

  it("reports status without exposing the access token", async () => {
    const { service } = createService(true);
    assert.deepEqual(await service.loyverseStatus(), { provider: "Loyverse", configured: true });
  });
});

describe("CommerceService gross profit report", () => {
  it("aggregates jewelry and gemstone sales using the selected calendar grain", async () => {
    const { service } = createService(false, [{ bucket: "2026-11-01", revenue: "1200000", cost: "700000", profit: "500000", soldQuantity: 2, missingCostLines: 1, missingCostRevenue: "400000" }]);
    const report = await service.grossProfitReport({ grain: "month", from: "2026-11-01T00:00:00+07:00", to: "2026-11-30T23:59:59+07:00" });
    assert.equal(report.grain, "month");
    assert.equal(report.revenue, 1200000);
    assert.equal(report.cost, 700000);
    assert.equal(report.profit, 500000);
    assert.equal(report.soldQuantity, 2);
    assert.equal(report.missingCostLines, 1);
  });

  it("rejects unsupported calendar grains before querying the database", async () => {
    const { service } = createService(false);
    await assert.rejects(service.grossProfitReport({ grain: "year" }), /day, week, month hoặc quarter/);
  });
});
