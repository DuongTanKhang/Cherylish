import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type LoyverseVariant = {
  variant_id: string;
  item_id: string;
  sku: string;
  default_pricing_type?: string;
  default_price?: number | null;
  cost?: number;
  purchase_cost?: number;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  stores?: Array<Record<string, unknown>>;
};

type LoyversePaymentType = { id: string; name: string; type: string; stores?: string[]; deleted_at?: string | null };

@Injectable()
export class LoyverseService {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return this.config.get<string>("LOYVERSE_ENABLED") === "true"
      && Boolean(this.config.get<string>("LOYVERSE_ACCESS_TOKEN")?.trim())
      && Boolean(this.config.get<string>("LOYVERSE_STORE_ID")?.trim());
  }

  status() {
    return {
      provider: "Loyverse",
      configured: this.isConfigured(),
      enabled: this.config.get<string>("LOYVERSE_ENABLED") === "true",
      storeConfigured: Boolean(this.config.get<string>("LOYVERSE_STORE_ID")?.trim()),
      freePlanOnly: true,
      syncBy: "SKU",
      absentSkuPolicy: "LOCAL_ONLY",
    };
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return { ok: false, code: "NOT_CONFIGURED", message: "Chưa có đủ cấu hình Loyverse trên máy chủ: cần bật kết nối, access token và Store ID." };
    }
    const storeId = this.config.get<string>("LOYVERSE_STORE_ID")!.trim();
    try {
      const query = new URLSearchParams({ store_ids: storeId });
      const result = await this.request<{ stores?: Array<{ id: string; name: string }> }>(`/stores?${query}`);
      const store = (result.stores || []).find((item) => item.id === storeId);
      if (!store) {
        return { ok: false, code: "STORE_NOT_FOUND", message: "Access token được chấp nhận nhưng Store ID này không có trong tài khoản Loyverse." };
      }
      return { ok: true, code: "CONNECTED", message: "Kết nối Loyverse thành công.", storeId: store.id, storeName: store.name };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không kiểm tra được kết nối Loyverse.";
      return { ok: false, code: "API_ERROR", message };
    }
  }

  async syncPaidOrders(orders: any[]) {
    if (!this.isConfigured()) throw new Error("Chưa cấu hình kết nối Loyverse trên máy chủ.");
    const storeId = this.config.get<string>("LOYVERSE_STORE_ID")!.trim();
    const { payment_types: paymentTypes = [] } = await this.request<{ payment_types?: LoyversePaymentType[] }>("/payment_types?limit=250");
    const result = { synced: 0, alreadySynced: 0, skipped: 0, failed: 0, details: [] as Array<{ orderCode: string; status: string; message?: string; receiptNumber?: string }> };

    for (const order of orders) {
      const orderCode = String(order.code || "");
      try {
        const existingQuery = new URLSearchParams({ store_id: storeId, order: orderCode, limit: "10" });
        const existing = await this.request<{ receipts?: Array<{ order?: string; receipt_type?: string; receipt_number?: string }> }>(`/receipts?${existingQuery}`);
        const prior = (existing.receipts || []).find((receipt) => receipt.order === orderCode && receipt.receipt_type === "SALE");
        if (prior) {
          result.alreadySynced++;
          result.details.push({ orderCode, status: "already-synced", receiptNumber: prior.receipt_number });
          continue;
        }

        if (order.status === "CANCELLED" || order.payments?.some((payment: any) => ["REFUNDED", "PARTIALLY_REFUNDED"].includes(String(payment.status)))) {
          result.skipped++;
          result.details.push({ orderCode, status: "skipped", message: "Đơn đã hủy hoặc có khoản hoàn tiền." });
          continue;
        }
        const paidPayments = (order.payments || []).filter((payment: any) => payment.status === "PAID");
        const paidAmount = paidPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
        if (!paidPayments.length || paidAmount < Number(order.totalAmount || 0)) {
          result.skipped++;
          result.details.push({ orderCode, status: "skipped", message: "Đơn chưa thanh toán đủ; đơn COD chỉ được gửi sau khi đã thu tiền." });
          continue;
        }
        const methods = [...new Set(paidPayments.map((payment: any) => String(payment.method || "OTHER")))];
        if (methods.length !== 1) {
          result.skipped++;
          result.details.push({ orderCode, status: "skipped", message: "Loyverse API chỉ nhận một phương thức thanh toán cho mỗi đơn." });
          continue;
        }
        const method = methods[0];
        const availableTypes = paymentTypes.filter((type) => !type.deleted_at && (!type.stores?.length || type.stores.includes(storeId)));
        const methodNeedle: Record<string, string[]> = {
          COD: ["cash", "tiền mặt"],
          BANK_TRANSFER: ["transfer", "bank", "chuyển khoản"],
          MOMO: ["momo"],
          CREDIT_CARD: ["card", "thẻ"],
          OTHER: ["other", "khác"],
        };
        let paymentType = availableTypes.find((type) => (methodNeedle[method] || []).some((needle) => type.name.toLocaleLowerCase("vi").includes(needle)));
        if (!paymentType) {
          const expectedType = method === "COD" ? "CASH" : method === "CREDIT_CARD" ? "NONINTEGRATEDCARD" : "OTHER";
          paymentType = availableTypes.find((type) => type.type === expectedType);
        }
        if (!paymentType) {
          result.skipped++;
          result.details.push({ orderCode, status: "skipped", message: `Không tìm thấy loại thanh toán Loyverse phù hợp với ${method}.` });
          continue;
        }

        const lineItems: Array<{ variant_id: string; quantity: number; price: number }> = [];
        let missingSku = "";
        for (const item of order.items || []) {
          const sku = String(item.productSku || "").trim();
          if (!sku) { missingSku = "(thiếu SKU)"; break; }
          const variant = await this.findVariant(sku);
          if (!variant) { missingSku = sku; break; }
          lineItems.push({ variant_id: variant.variant_id, quantity: Number(item.quantity), price: Number(item.unitPrice) });
        }
        if (missingSku) {
          result.skipped++;
          result.details.push({ orderCode, status: "skipped", message: `SKU ${missingSku} chưa có trong Loyverse; hãy đồng bộ sản phẩm trước.` });
          continue;
        }
        if (!lineItems.length) {
          result.skipped++;
          result.details.push({ orderCode, status: "skipped", message: "Đơn không có dòng sản phẩm hợp lệ." });
          continue;
        }

        const receipt = await this.request<{ receipt_number?: string }>("/receipts", {
          method: "POST",
          body: JSON.stringify({
            store_id: storeId,
            order: orderCode,
            source: "Cherylish Admin",
            receipt_date: (order.placedAt || order.createdAt || new Date()).toISOString(),
            note: `Đơn Cherylish ${orderCode}`,
            line_items: lineItems,
            ...(Number(order.discountAmount) > 0 ? { total_discounts: [{ scope: "RECEIPT", money_amount: Number(order.discountAmount) }] } : {}),
            ...(Number(order.shippingFee) > 0 ? { surcharge: Number(order.shippingFee) } : {}),
            payments: [{ payment_type_id: paymentType.id, money_amount: Number(order.totalAmount), paid_at: (paidPayments[paidPayments.length - 1].paidAt || new Date()).toISOString() }],
          }),
        });
        result.synced++;
        result.details.push({ orderCode, status: "synced", receiptNumber: receipt.receipt_number });
      } catch (error) {
        result.failed++;
        result.details.push({ orderCode, status: "failed", message: error instanceof Error ? error.message : "Lỗi không xác định khi gửi đơn lên Loyverse." });
      }
    }
    return result;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.config.get<string>("LOYVERSE_ACCESS_TOKEN")?.trim();
    if (!token) throw new Error("Chưa cấu hình Loyverse Personal Access Token.");
    const response = await fetch(`https://api.loyverse.com/v1.0${path}`, {
      ...init,
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 400);
      throw new Error(`Loyverse API trả về ${response.status}${detail ? `: ${detail}` : "."}`);
    }
    return response.json() as Promise<T>;
  }

  private async findVariant(sku: string) {
    const query = new URLSearchParams({ sku, limit: "10" });
    const result = await this.request<{ variants?: LoyverseVariant[] }>(`/variants?${query}`);
    return (result.variants || []).find((variant) => variant.sku.trim().toLocaleUpperCase("en") === sku.trim().toLocaleUpperCase("en")) || null;
  }

  private variantCaption(variant: any) {
    return [variant?.quality, variant?.beadSize, variant?.carat != null ? `${variant.carat} ct` : null, variant?.gemstoneQuality ? `Chất lượng ${variant.gemstoneQuality}` : null].filter(Boolean).join(" · ");
  }

  private async findOrCreateVariant(product: any, variant: any, sku: string, price: number) {
    const current = await this.findVariant(sku);
    if (current || sku.length > 40) return current;
    const storeId = this.config.get<string>("LOYVERSE_STORE_ID")!.trim();
    const caption = this.variantCaption(variant);
    const displayName = `${String(product.name || "Sản phẩm").slice(0, Math.max(1, 62 - (caption ? caption.length + 3 : 0)))}${caption ? ` · ${caption}` : ""}`;
    const remoteVariant: Record<string, unknown> = {
      sku,
      reference_variant_id: `cherylish:${String(variant?.id || `${product.id}:${sku}`).slice(0, 110)}`,
      default_pricing_type: price > 0 ? "FIXED" : "VARIABLE",
      ...(price > 0 ? { default_price: price, stores: [{ store_id: storeId, pricing_type: "FIXED", price }] } : {}),
    };
    await this.request("/items", {
      method: "POST",
      body: JSON.stringify({
        item_name: displayName.slice(0, 64),
      reference_id: `cherylish:${String(product.id).slice(0, 70)}:${sku.slice(0, 60)}`,
        track_stock: true,
        variants: [remoteVariant],
      }),
    });
    return this.findVariant(sku);
  }

  private async allStockRows(products: any[]) {
    const rows: Array<{ sku: string; variantId: string; stock: number; price: number | null }> = [];
    for (const product of products) {
      if (!["JEWELRY", "GEMSTONE"].includes(String(product.kind))) continue;
      const variants = Array.isArray(product.variants) ? product.variants : [];
      if (variants.length) {
        for (const variant of variants) {
          const sku = String(variant.sku || "").trim();
          if (!sku) continue;
          const price = Number(variant.price) * (["GEMSTONE_CARAT", "GEMSTONE_CARAT_AND_QUALITY"].includes(String(product.category?.pricingMode || "")) ? Number(variant.carat || 0) : 1);
          const match = await this.findOrCreateVariant(product, variant, sku, Math.round(price));
          if (match) rows.push({ sku, variantId: match.variant_id, stock: Number(variant.stock) || 0, price: Number(variant.price) > 0 ? Number(variant.price) : null });
        }
      } else {
        const sku = String(product.sku || "").trim();
        if (!sku) continue;
        const match = await this.findOrCreateVariant(product, null, sku, Number(product.price) || 0);
        if (match) rows.push({ sku, variantId: match.variant_id, stock: Number(product.stock) || 0, price: Number(product.price) > 0 ? Number(product.price) : null });
      }
    }
    return rows;
  }

  async syncStock(products: any[]) {
    if (!this.isConfigured()) return { synced: 0, unmatched: 0 };
    const rows = await this.allStockRows(products);
    const storeId = this.config.get<string>("LOYVERSE_STORE_ID")!.trim();
    for (let offset = 0; offset < rows.length; offset += 100) {
      await this.request("/inventory", {
        method: "POST",
        body: JSON.stringify({ inventory_levels: rows.slice(offset, offset + 100).map((row) => ({ variant_id: row.variantId, store_id: storeId, stock_after: row.stock })) }),
      });
    }
    return { synced: rows.length, unmatched: this.localSkuCount(products) - rows.length };
  }

  async syncPrices(products: any[]) {
    if (!this.isConfigured()) return { synced: 0, unmatched: 0 };
    const storeId = this.config.get<string>("LOYVERSE_STORE_ID")!.trim();
    let synced = 0;
    let unmatched = 0;
    for (const product of products) {
      if (!["JEWELRY", "GEMSTONE"].includes(String(product.kind))) continue;
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const targets = variants.length
        ? variants.map((variant: any) => ({ sku: String(variant.sku || "").trim(), price: Math.round(Number(variant.price) * (["GEMSTONE_CARAT", "GEMSTONE_CARAT_AND_QUALITY"].includes(String(product.category?.pricingMode || "")) ? Number(variant.carat || 0) : 1)) }))
        : [{ sku: String(product.sku || "").trim(), price: Number(product.price) || 0 }];
      for (const target of targets) {
        if (!target.sku || target.price <= 0) { unmatched++; continue; }
        const variant = variants.find((entry: any) => String(entry.sku || "").trim() === target.sku);
        const remote = await this.findOrCreateVariant(product, variant, target.sku, target.price);
        if (!remote) { unmatched++; continue; }
        const stores = Array.isArray(remote.stores) ? remote.stores : [];
        const store = stores.find((value) => String(value.store_id || "") === storeId);
        const nextStores = stores.filter((value) => String(value.store_id || "") !== storeId);
        nextStores.push({ ...(store || {}), store_id: storeId, pricing_type: "FIXED", price: target.price });
        const body = {
          variant_id: remote.variant_id,
          item_id: remote.item_id,
          sku: remote.sku,
          ...(remote.default_pricing_type ? { default_pricing_type: remote.default_pricing_type } : {}),
          ...(remote.default_price != null ? { default_price: remote.default_price } : {}),
          ...(remote.cost != null ? { cost: remote.cost } : {}),
          ...(remote.purchase_cost != null ? { purchase_cost: remote.purchase_cost } : {}),
          ...(remote.option1_name ? { option1_name: remote.option1_name, option1_value: remote.option1_value } : {}),
          ...(remote.option2_name ? { option2_name: remote.option2_name, option2_value: remote.option2_value } : {}),
          ...(remote.option3_name ? { option3_name: remote.option3_name, option3_value: remote.option3_value } : {}),
          stores: nextStores,
        };
        await this.request("/variants", { method: "POST", body: JSON.stringify(body) });
        synced++;
      }
    }
    return { synced, unmatched };
  }

  private localSkuCount(products: any[]) {
    return products.reduce((sum, product) => sum + (!["JEWELRY", "GEMSTONE"].includes(String(product.kind)) ? 0 : Array.isArray(product.variants) && product.variants.length ? product.variants.filter((variant: any) => String(variant.sku || "").trim()).length : String(product.sku || "").trim() ? 1 : 0), 0);
  }
}
