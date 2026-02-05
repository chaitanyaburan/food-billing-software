const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Find 3stories restaurant
  const restaurant = await prisma.restaurant.findFirst({
    where: { name: "3stories" }
  });

  if (!restaurant) {
    console.error("❌ Restaurant '3stories' not found!");
    console.log("Please run the seed script first: npm run seed");
    process.exit(1);
  }

  console.log(`✅ Found restaurant: ${restaurant.name} (ID: ${restaurant.id})`);

  // Create KDS user
  const password = "kds12345"; // Simple password for KDS
  const passwordHash = await bcrypt.hash(password, 12);

  const kdsUser = await prisma.user.upsert({
    where: { email: "kds@3stories.local" },
    update: {
      restaurantId: restaurant.id,
      role: "KITCHEN",
      name: "KDS User",
      phone: "9999999999",
      passwordHash,
      isActive: true
    },
    create: {
      restaurantId: restaurant.id,
      role: "KITCHEN",
      name: "KDS User",
      email: "kds@3stories.local",
      phone: "9999999999",
      passwordHash,
      isActive: true
    }
  });

  console.log("\n✅ KDS User created successfully!");
  console.log("\n📋 Login Credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Email:    ${kdsUser.email}`);
  console.log(`Password: ${password}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💡 You can now login at /auth/login with these credentials");
  console.log("   The KDS user can access the Kitchen Display System (KDS) page.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
