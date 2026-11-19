import "dotenv/config";
import { PrismaService } from "../src/prisma/prisma.service.js";

const execute = process.argv.includes("--execute");
if (process.env.NODE_ENV === "production") throw new Error("Reset bị chặn trong NODE_ENV=production.");

const prisma = new PrismaService();
await prisma.$connect();
try {
  const [products, orders, receipts, issues, movements, receiptItems, issueItems, orderItems, movementRows, productMedia, settings, categories, materials, posts, postImages, promotions] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.inventoryReceipt.count(),
    prisma.inventoryIssue.count(),
    prisma.inventoryMovement.count(),
    prisma.inventoryReceiptItem.findMany({ select: { productSku: true } }),
    prisma.inventoryIssueItem.findMany({ select: { productSku: true } }),
    prisma.orderItem.findMany({ select: { productSku: true } }),
    prisma.inventoryMovement.findMany({ select: { productSku: true } }),
    prisma.mediaAsset.findMany({ where: { filename: { startsWith: "product-" } }, select: { id: true, filename: true, sourceKey: true } }),
    prisma.siteSetting.findMany({ select: { value: true } }),
    prisma.category.findMany({ select: { imageUrl: true, bannerUrl: true } }),
    prisma.materialOption.findMany({ select: { imageUrl: true } }),
    prisma.blogPost.findMany({ select: { coverImageUrl: true, content: true } }),
    prisma.blogPostImage.findMany({ select: { url: true } }),
    prisma.promotion.findMany({ select: { imageUrl: true } }),
  ]);
  const sharedReferences = [
    ...settings.map((row) => JSON.stringify(row.value)),
    ...categories.flatMap((row) => [row.imageUrl || "", row.bannerUrl || ""]),
    ...materials.map((row) => row.imageUrl || ""),
    ...posts.flatMap((row) => [row.coverImageUrl || "", row.content || ""]),
    ...postImages.map((row) => row.url),
    ...promotions.map((row) => row.imageUrl || ""),
  ];
  const orphanProductMedia = productMedia.filter((asset) => {
    const mediaUrl = `/media/${asset.id}`;
    const assetUrl = asset.sourceKey ? `/assets/${asset.sourceKey.replace(/^assets\//, "")}` : "";
    return !sharedReferences.some((reference) => reference.includes(mediaUrl) || Boolean(assetUrl && reference.includes(assetUrl)));
  });
  const summary = {
    products,
    orders,
    inventoryReceipts: receipts,
    inventoryIssues: issues,
    inventoryMovements: movements,
    orphanProductMedia: orphanProductMedia.length,
  };
  console.log(JSON.stringify({ mode: execute ? "EXECUTE" : "DRY_RUN", before: summary }));
  if (execute) {
    const deleted = await prisma.$transaction(async (tx) => {
      const deletedOrders = await tx.order.deleteMany({});
      const deletedReceipts = await tx.inventoryReceipt.deleteMany({});
      const deletedIssues = await tx.inventoryIssue.deleteMany({});
      const deletedMovements = await tx.inventoryMovement.deleteMany({});
      const deletedProducts = await tx.product.deleteMany({});
      const deletedProductMedia = orphanProductMedia.length
        ? await tx.mediaAsset.deleteMany({ where: { id: { in: orphanProductMedia.map((asset) => asset.id) } } })
        : { count: 0 };
      return {
        orders: deletedOrders.count,
        inventoryReceipts: deletedReceipts.count,
        inventoryIssues: deletedIssues.count,
        inventoryMovements: deletedMovements.count,
        products: deletedProducts.count,
        orphanProductMedia: deletedProductMedia.count,
      };
    });
    const [remainingProducts, remainingOrders, remainingReceipts, remainingIssues, remainingMovements] = await Promise.all([
      prisma.product.count(), prisma.order.count(), prisma.inventoryReceipt.count(), prisma.inventoryIssue.count(), prisma.inventoryMovement.count(),
    ]);
    if (remainingProducts || remainingOrders || remainingReceipts || remainingIssues || remainingMovements) {
      throw new Error(`Reset chưa sạch: còn sản phẩm=${remainingProducts}, đơn=${remainingOrders}, phiếu nhập=${remainingReceipts}, phiếu xuất=${remainingIssues}, biến động=${remainingMovements}.`);
    }
    console.log(JSON.stringify({ mode: "COMPLETE", deleted, remaining: { products: remainingProducts, orders: remainingOrders, inventoryReceipts: remainingReceipts, inventoryIssues: remainingIssues, inventoryMovements: remainingMovements } }));
  }
} finally {
  await prisma.$disconnect();
}
