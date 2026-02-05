const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function nextInvoiceNo(restaurantId) {
  const updated = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { invoiceSeq: { increment: 1 } },
    select: { invoicePrefix: true, invoiceSeq: true }
  });

  const yyyymm = dayjs().format("YYYYMM");
  const seq = String(updated.invoiceSeq).padStart(6, "0");
  return `${updated.invoicePrefix}-${yyyymm}-${seq}`;
}

async function main() {
  const passwordHash = await bcrypt.hash("demo12345", 12);

  // Clear demo data (scoped to demo restaurant by gstin/name)
  // We avoid destructive full truncation.

  const demoRestaurantName = "3stories";

  let restaurant = await prisma.restaurant.findFirst({ where: { name: demoRestaurantName } });

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        name: demoRestaurantName,
        isGstRegistered: false,
        gstin: null,
        addressLine1: "Main Road",
        city: "Mumbai",
        state: "MH",
        pincode: "400001",
        phone: "9999999999",
        email: "demo@cafe.local",
        gstMode: "CGST_SGST",
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        invoicePrefix: "INV",
        invoiceSeq: 0
      }
    });
  }

  // Users
  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.local" },
    update: {
      restaurantId: restaurant.id,
      role: "OWNER",
      name: "Demo Owner",
      phone: "9000000001",
      passwordHash,
      isActive: true
    },
    create: {
      restaurantId: restaurant.id,
      role: "OWNER",
      name: "Demo Owner",
      email: "owner@demo.local",
      phone: "9000000001",
      passwordHash
    }
  });

  await prisma.user.upsert({
    where: { email: "cashier@demo.local" },
    update: {
      restaurantId: restaurant.id,
      role: "CASHIER",
      name: "Demo Cashier",
      phone: "9000000002",
      passwordHash,
      isActive: true
    },
    create: {
      restaurantId: restaurant.id,
      role: "CASHIER",
      name: "Demo Cashier",
      email: "cashier@demo.local",
      phone: "9000000002",
      passwordHash
    }
  });

  await prisma.user.upsert({
    where: { email: "kitchen@demo.local" },
    update: {
      restaurantId: restaurant.id,
      role: "KITCHEN",
      name: "Demo Kitchen",
      phone: "9000000003",
      passwordHash,
      isActive: true
    },
    create: {
      restaurantId: restaurant.id,
      role: "KITCHEN",
      name: "Demo Kitchen",
      email: "kitchen@demo.local",
      phone: "9000000003",
      passwordHash
    }
  });

  // Categories
  const beverages = await prisma.category.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: "Beverages" } },
    update: { sortOrder: 1, isEnabled: true },
    create: { restaurantId: restaurant.id, name: "Beverages", sortOrder: 1, isEnabled: true }
  });

  const snacks = await prisma.category.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: "Snacks" } },
    update: { sortOrder: 2, isEnabled: true },
    create: { restaurantId: restaurant.id, name: "Snacks", sortOrder: 2, isEnabled: true }
  });

  // Menu items
  const tea = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: beverages.id,
      name: "Tea",
      description: "Cutting chai",
      price: 10,
      isVeg: true,
      isEnabled: true,
      modifiers: []
    }
  });

  const coffee = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: beverages.id,
      name: "Coffee",
      description: "Hot coffee",
      price: 20,
      isVeg: true,
      isEnabled: true,
      modifiers: []
    }
  });

  const samosa = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: snacks.id,
      name: "Samosa",
      description: "Crispy",
      price: 15,
      isVeg: true,
      isEnabled: true,
      modifiers: []
    }
  });

  // Generate static token function (same as API)
  function generateStaticToken(restaurantId, tableNo) {
    const input = `${restaurantId}:${tableNo}`;
    const hash = crypto.createHash("sha256").update(input).digest("hex");
    return hash.substring(0, 32);
  }

  // Tables with static tokens (permanent QR codes)
  await prisma.restaurantTable.upsert({
    where: { restaurantId_tableNo: { restaurantId: restaurant.id, tableNo: "T1" } },
    update: { 
      capacity: 4, 
      isEnabled: true,
      publicToken: generateStaticToken(restaurant.id, "T1") // Ensure static token
    },
    create: {
      restaurantId: restaurant.id,
      tableNo: "T1",
      publicToken: generateStaticToken(restaurant.id, "T1"),
      capacity: 4,
      isEnabled: true
    }
  });

  await prisma.restaurantTable.upsert({
    where: { restaurantId_tableNo: { restaurantId: restaurant.id, tableNo: "T2" } },
    update: { 
      capacity: 4, 
      isEnabled: true,
      publicToken: generateStaticToken(restaurant.id, "T2") // Ensure static token
    },
    create: {
      restaurantId: restaurant.id,
      tableNo: "T2",
      publicToken: generateStaticToken(restaurant.id, "T2"),
      capacity: 4,
      isEnabled: true
    }
  });

  // Migrate all existing tables to use static tokens
  const allTables = await prisma.restaurantTable.findMany({
    where: { restaurantId: restaurant.id },
    select: { id: true, tableNo: true, publicToken: true }
  });

  for (const table of allTables) {
    const staticToken = generateStaticToken(restaurant.id, table.tableNo);
    if (table.publicToken !== staticToken) {
      await prisma.restaurantTable.update({
        where: { id: table.id },
        data: { publicToken: staticToken }
      });
    }
  }

  // Sample orders (running KOT)
  const o1 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      createdByUserId: owner.id,
      type: "DINE_IN",
      tableNo: "T1",
      status: "PLACED",
      items: {
        create: [
          { menuItemId: tea.id, nameSnapshot: "Tea", priceSnapshot: 10, qty: 2, modifiers: [], notes: "" },
          { menuItemId: samosa.id, nameSnapshot: "Samosa", priceSnapshot: 15, qty: 1, modifiers: [], notes: "" }
        ]
      }
    }
  });

  await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      createdByUserId: owner.id,
      type: "DINE_IN",
      tableNo: "T1",
      status: "PREPARING",
      items: {
        create: [{ menuItemId: coffee.id, nameSnapshot: "Coffee", priceSnapshot: 20, qty: 1, modifiers: [], notes: "" }]
      }
    }
  });

  // Sample invoice
  const invoiceNo = await nextInvoiceNo(restaurant.id);
  const items = [
    { nameSnapshot: "Tea", qty: 2, unitPrice: 10, lineTotal: 20 },
    { nameSnapshot: "Samosa", qty: 1, unitPrice: 15, lineTotal: 15 }
  ];
  const subtotal = 35;

  await prisma.invoice.create({
    data: {
      restaurantId: restaurant.id,
      createdById: owner.id,
      invoiceNo,
      invoiceType: "DINE_IN",
      tableNo: "T2",
      subtotal,
      discountAmount: 0,
      taxable: subtotal,
      gstMode: restaurant.gstMode,
      cgstRate: restaurant.cgstRate,
      sgstRate: restaurant.sgstRate,
      igstRate: restaurant.igstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      total: subtotal,
      items: {
        create: items.map((it) => ({
          restaurantId: restaurant.id,
          nameSnapshot: it.nameSnapshot,
          qty: it.qty,
          unitPrice: it.unitPrice,
          modifiers: [],
          lineTotal: it.lineTotal
        }))
      },
      payments: {
        create: {
          restaurantId: restaurant.id,
          mode: "CASH",
          amount: subtotal,
          reference: ""
        }
      }
    }
  });

  console.log("Seed complete.");
  console.log("Demo login credentials:");
  console.log("- owner@demo.local / demo12345");
  console.log("- cashier@demo.local / demo12345");
  console.log("- kitchen@demo.local / demo12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
