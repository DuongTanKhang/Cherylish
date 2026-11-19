import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LoyverseService } from "./loyverse.service.js";

const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] });

function setup(storeId = "store-1") {
  const variants = new Map<string, Record<string, any>>();
  const calls: Array<{ url: string; method: string; body?: any }> = [];
  let nextId = 1;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method, body });
    if (url.includes("/stores?") && method === "GET") {
      const storeId = new URL(url).searchParams.get("store_ids");
      return Response.json({ stores: storeId === "store-1" ? [{ id: "store-1", name: "Cửa hàng chính" }] : [] });
    }
    if (url.includes("/variants?") && method === "GET") {
      const sku = new URL(url).searchParams.get("sku") || "";
      const match = variants.get(sku.toUpperCase());
      return Response.json({ variants: match ? [match] : [] });
    }
    if (url.endsWith("/items") && method === "POST") {
      const itemId = `item-${nextId++}`;
      const itemVariants = (body.variants || []).map((variant: Record<string, any>) => ({
        ...variant,
        item_id: itemId,
        variant_id: `variant-${nextId++}`,
        stores: variant.stores || [],
      }));
      itemVariants.forEach((variant: Record<string, any>) => variants.set(String(variant.sku).toUpperCase(), variant));
      return Response.json({ item_id: itemId, variants: itemVariants });
    }
    if (url.endsWith("/inventory") && method === "POST") return Response.json({ inventory_levels: body.inventory_levels });
    if (url.endsWith("/variants") && method === "POST") {
      variants.set(String(body.sku).toUpperCase(), body);
      return Response.json(body);
    }
    return Response.json({ message: "not found" }, { status: 404 });
  }) as typeof fetch;
  const service = new LoyverseService(config({
    LOYVERSE_ENABLED: "true",
    LOYVERSE_ACCESS_TOKEN: "unit-test-token",
    LOYVERSE_STORE_ID: storeId,
  }) as any);
  return { service, calls, variants, restore: () => { globalThis.fetch = originalFetch; } };
}

const product = (overrides: Record<string, any> = {}) => ({
  id: "product-1",
  kind: "JEWELRY",
  name: "Nhẫn Lumi",
  sku: "RING-01",
  price: 100,
  stock: 4,
  category: { pricingMode: "FIXED" },
  variants: [],
  ...overrides,
});

describe("LoyverseService", () => {
  it("checks token and selected store through a read-only stores request", async () => {
    const ctx = setup();
    try {
      assert.deepEqual(await ctx.service.testConnection(), {
        ok: true,
        code: "CONNECTED",
        message: "Kết nối Loyverse thành công.",
        storeId: "store-1",
        storeName: "Cửa hàng chính",
      });
      assert.equal(ctx.calls.length, 1);
      assert.equal(ctx.calls[0].method, "GET");
      assert.equal(new URL(ctx.calls[0].url).searchParams.get("store_ids"), "store-1");
    } finally { ctx.restore(); }
  });

  it("reports a missing store without changing Loyverse data", async () => {
    const ctx = setup("store-not-in-account");
    try {
      const result = await ctx.service.testConnection();
      assert.deepEqual(result, {
        ok: false,
        code: "STORE_NOT_FOUND",
        message: "Access token được chấp nhận nhưng Store ID này không có trong tài khoản Loyverse.",
      });
      assert.equal(ctx.calls.some((call) => call.method !== "GET"), false);
    } finally { ctx.restore(); }
  });

  it("does not call Loyverse or sync unsupported product kinds", async () => {
    const ctx = setup();
    try {
      assert.deepEqual(await ctx.service.syncStock([product({ kind: "ACCESSORY" })]), { synced: 0, unmatched: 0 });
      assert.deepEqual(await ctx.service.syncPrices([product({ kind: "ACCESSORY" })]), { synced: 0, unmatched: 0 });
      assert.equal(ctx.calls.length, 0);
    } finally { ctx.restore(); }
  });

  it("creates a missing SKU in Loyverse then applies stock to the configured store", async () => {
    const ctx = setup();
    try {
      const result = await ctx.service.syncStock([product()]);
      assert.deepEqual(result, { synced: 1, unmatched: 0 });
      const created = ctx.calls.find((call) => call.url.endsWith("/items"))?.body;
      assert.equal(created.item_name, "Nhẫn Lumi");
      assert.equal(created.track_stock, true);
      assert.match(created.reference_id, /product-1:RING-01/);
      assert.deepEqual(ctx.calls.find((call) => call.url.endsWith("/inventory"))?.body.inventory_levels, [
        { variant_id: "variant-2", store_id: "store-1", stock_after: 4 },
      ]);
    } finally { ctx.restore(); }
  });

  it("syncs gemstone carat pricing as per-piece price and leaves unsupported long SKU local", async () => {
    const ctx = setup();
    try {
      const result = await ctx.service.syncPrices([
        product({
          kind: "GEMSTONE",
          sku: "",
          category: { pricingMode: "GEMSTONE_CARAT" },
          variants: [{ id: "v-1", sku: "GEM-01", carat: 2, price: 125, stock: 1 }],
        }),
        product({ sku: "X".repeat(41) }),
      ]);
      assert.deepEqual(result, { synced: 1, unmatched: 1 });
      const created = ctx.calls.find((call) => call.url.endsWith("/items"))?.body;
      assert.equal(created.variants[0].default_price, 250);
      assert.equal(ctx.calls.find((call) => call.url.endsWith("/variants") && call.method === "POST")?.body.stores[0].price, 250);
      assert.equal(ctx.calls.filter((call) => call.url.endsWith("/items")).length, 1);
    } finally { ctx.restore(); }
  });

  it("surfaces HTTP failures instead of marking the record synchronized", async () => {
    const ctx = setup();
    try {
      globalThis.fetch = (async () => new Response("invalid token", { status: 401 })) as typeof fetch;
      await assert.rejects(ctx.service.syncStock([product()]), /Loyverse API trả về 401/);
    } finally { ctx.restore(); }
  });
});
