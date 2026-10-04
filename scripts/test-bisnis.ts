/**
 * Test bisnis Order → Picking → Pengiriman → Retur (spec §40).
 * Jalankan: npx tsx scripts/test-bisnis.ts
 * Semua data test dibuat sendiri dan dibersihkan di akhir.
 */
import { prisma } from "../src/lib/db/prisma";
import { createOrderCore, updateOrderCore, cancelOrderCore } from "../src/features/order/core";
import {
  generatePickingCore,
  saveActualQtyCore,
  confirmShipmentCore,
} from "../src/features/picking/core";
import { createReturnCore } from "../src/features/retur/core";

let passed = 0;
const failed: string[] = [];
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed.push(name);
    console.error(`  FAIL  ${name}`, extra !== undefined ? JSON.stringify(extra) : "");
  }
}

const today = new Date().toISOString().slice(0, 10);
const CODE = { color: "TEST-WARN", size: "TEST-UK", product: "TEST-SKU" };

async function main() {
  const realUser = (await prisma.user.findFirstOrThrow({ select: { id: true } })).id; // FK pickedByUser/user
  // ---------- fixtures ----------
  const color = await prisma.color.upsert({
    where: { code: CODE.color },
    update: {},
    create: { code: CODE.color, name: "Warna Test", hex: "#123456" },
  });
  const size = await prisma.size.upsert({
    where: { code: CODE.size },
    update: {},
    create: { code: CODE.size, label: "TEST", sortOrder: 99 },
  });
  const product = await prisma.product.upsert({
    where: { code: CODE.product },
    update: { isActive: true },
    create: { code: CODE.product, name: "Produk Test", basePrice: 50_000, hpp: 30_000 },
  });
  let stock = await prisma.stock.findFirst({
    where: { productId: product.id, colorId: { equals: color.id }, sizeId: { equals: size.id } },
  });
  if (!stock)
    stock = await prisma.stock.create({
      data: { productId: product.id, colorId: color.id, sizeId: size.id, qty: 10 },
    });
  else await prisma.stock.update({ where: { id: stock.id }, data: { qty: 10 } });
  const stockId = stock.id;

  const item = { productId: product.id, colorId: color.id, sizeId: size.id, orderedQty: 3, unitPrice: 50_000 };

  // ---------- 1. order create ----------
  const o1 = await createOrderCore({
    channel: "SHOPEE",
    date: today,
    customerName: "Budi",
    customerPhone: "0812",
    note: "",
    items: [item],
  });
  check("order dibuat (PENDING, nomor ORD-)", o1.success && o1.data.orderNumber.startsWith(`ORD-${today.replaceAll("-", "")}-`), o1);
  const o1id = o1.success ? o1.data.id : "";
  let o1row = await prisma.salesOrder.findUnique({ where: { id: o1id } });
  check("totalQty & totalAmount benar", o1row?.totalQty === 3 && o1row?.totalAmount === 150_000, o1row);
  check("status awal PENDING", o1row?.status === "PENDING");

  // ---------- 2. order edit ----------
  const upd = await updateOrderCore(o1id, {
    channel: "TIKTOK",
    date: today,
    customerName: "Budi (edit)",
    customerPhone: "0812",
    note: "diedit",
    items: [{ ...item, orderedQty: 4 }],
  });
  check("order edit → totalQty 4", upd.success, upd);
  o1row = await prisma.salesOrder.findUnique({ where: { id: o1id } });
  check("order edit → totalAmount 200.000", o1row?.totalAmount === 200_000, o1row);

  // ---------- 3. picking ----------
  const gen = await generatePickingCore(o1id, realUser);
  check("picking dibuat", gen.success, gen);
  const pickingId = gen.success ? gen.data.id : "";
  o1row = await prisma.salesOrder.findUnique({ where: { id: o1id } });
  check("status → PICKING", o1row?.status === "PICKING");
  const gen2 = await generatePickingCore(o1id, realUser);
  check("generate picking idempotent", gen2.success && gen2.data.id === pickingId, gen2);

  // ---------- 4. over-pick ditolak ----------
  const pick = await prisma.picking.findUnique({
    where: { id: pickingId },
    include: { items: { include: { orderItem: true } } },
  });
  const itemLine = pick!.items[0];
  const over = await saveActualQtyCore(pickingId, [{ orderItemId: itemLine.orderItemId, actualQty: 99 }], realUser);
  check("actualQty > orderedQty DITOLAK", !over.success && over.code === "OVER_PICK", over);

  // ---------- 5. actual qty valid → PICKED ----------
  const good = await saveActualQtyCore(pickingId, [{ orderItemId: itemLine.orderItemId, actualQty: 3, note: "" }], realUser);
  check("actual qty valid tersimpan", good.success, good);
  o1row = await prisma.salesOrder.findUnique({ where: { id: o1id } });
  check("status → PICKED", o1row?.status === "PICKED");

  // ---------- 6. stok kurang → tolak, stok tidak berubah ----------
  const o2 = await createOrderCore({ channel: "SHOPEE", date: today, items: [{ ...item, orderedQty: 20 }] });
  const o2id = o2.success ? o2.data.id : "";
  const genO2 = await generatePickingCore(o2id, realUser);
  const p2id = genO2.success ? genO2.data.id : "";
  const p2 = await prisma.picking.findUnique({ where: { id: p2id }, include: { items: true } });
  await saveActualQtyCore(p2id, [{ orderItemId: p2!.items[0].orderItemId, actualQty: 20 }], realUser);
  const short = await confirmShipmentCore(p2id, "TEST-RESI-99", realUser);
  check("stok kurang → STOCK_SHORT", !short.success && short.code === "STOCK_SHORT", short);
  const s1 = await prisma.stock.findUnique({ where: { id: stockId } });
  check("stok TIDAK berubah saat gagal (rollback)", s1?.qty === 10, s1);
  const o2row = await prisma.salesOrder.findUnique({ where: { id: o2id } });
  check("order tetap PICKED saat gagal", o2row?.status === "PICKED");

  // ---------- 7. konfirmasi kirim sukses ----------
  const ship = await confirmShipmentCore(pickingId, "TEST-RESI-01", realUser);
  check("konfirmasi pengiriman sukses", ship.success, ship);
  const s2 = await prisma.stock.findUnique({ where: { id: stockId } });
  check("stok berkurang 10 → 7 (actual 3)", s2?.qty === 7, s2);
  const mv = await prisma.stockMovement.findFirst({
    where: { stockId, type: "SALE_SHIPMENT", refType: "SHIPMENT" },
  });
  check("movement SALE_SHIPMENT tertulis", mv?.qty === 3, mv);
  o1row = await prisma.salesOrder.findUnique({ where: { id: o1id } });
  check("status → SHIPPED + resi menempel", o1row?.status === "SHIPPED" && o1row?.shippingNumber === "TEST-RESI-01");

  // ---------- 8. resi duplikat → tolak + rollback ----------
  const p3 = await prisma.picking.findUnique({ where: { id: p2id }, include: { items: true } });
  await saveActualQtyCore(p2id, [{ orderItemId: p3!.items[0].orderItemId, actualQty: 1 }], realUser);
  const dup = await confirmShipmentCore(p2id, "TEST-RESI-01", realUser);
  check("resi duplikat → DUPLICATE_RESI", !dup.success && dup.code === "DUPLICATE_RESI", dup);
  const s3 = await prisma.stock.findUnique({ where: { id: stockId } });
  check("stok aman saat duplikat resi (rollback)", s3?.qty === 7, s3);

  // ---------- 9. retur qty melebihi terkirim → tolak ----------
  const o1items = await prisma.salesOrderItem.findMany({ where: { orderId: o1id } });
  const overRet = await createReturnCore(
    { orderId: o1id, date: today, items: [{ orderItemId: o1items[0].id, qty: 5, restock: true }] },
    realUser,
  );
  check("retur > terkirim DITOLAK", !overRet.success && overRet.code === "OVER_RETURN", overRet);

  // ---------- 10. retur layak jual → RETURN_IN + status RETURNED ----------
  const ret = await createReturnCore(
    { orderId: o1id, date: today, note: "cacat jahit", items: [{ orderItemId: o1items[0].id, qty: 2, restock: true }] },
    realUser,
  );
  check("retur diterima", ret.success, ret);
  const s4 = await prisma.stock.findUnique({ where: { id: stockId } });
  check("stok naik 7 → 9 (restock 2)", s4?.qty === 9, s4);
  const mv2 = await prisma.stockMovement.findFirst({ where: { stockId, type: "RETURN_IN" } });
  check("movement RETURN_IN tertulis", mv2?.qty === 2, mv2);
  o1row = await prisma.salesOrder.findUnique({ where: { id: o1id } });
  check("status → RETURNED", o1row?.status === "RETURNED");

  // ---------- 11. cancel + edit setelah cancel ditolak ----------
  const o4 = await createOrderCore({ channel: "OFFLINE", date: today, items: [item] });
  const o4id = o4.success ? o4.data.id : "";
  const cancel = await cancelOrderCore(o4id);
  const o4row = await prisma.salesOrder.findUnique({ where: { id: o4id } });
  check("cancel order → CANCELLED", cancel.success && o4row?.status === "CANCELLED", cancel);
  const editAfter = await updateOrderCore(o4id, { channel: "OFFLINE", date: today, items: [item] });
  check("edit setelah cancel DITOLAK", !editAfter.success && editAfter.code === "LOCKED", editAfter);

  // ---------- cleanup (rapi, urut FK) ----------
  const orderIds = [o1id, o2id, o4id].filter(Boolean);
  const shipments = await prisma.shipment.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
  const returns = await prisma.return.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
  const moveIds = [...shipments, ...returns].map((x) => x.id);
  await prisma.stockMovement.deleteMany({ where: { OR: [{ refId: { in: moveIds } }, { stockId }] } });
  await prisma.return.deleteMany({ where: { id: { in: returns.map((r) => r.id) } } });
  await prisma.shipment.deleteMany({ where: { id: { in: shipments.map((s) => s.id) } } });
  await prisma.picking.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.salesOrderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.salesOrder.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.stock.delete({ where: { id: stockId } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.color.delete({ where: { id: color.id } });
  await prisma.size.delete({ where: { id: size.id } });

  console.log(`\n${passed} pass, ${failed.length} fail`);
  if (failed.length > 0) {
    console.error("GAGAL:", failed.join(" | "));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("CRASH:", e);
  process.exit(1);
});
