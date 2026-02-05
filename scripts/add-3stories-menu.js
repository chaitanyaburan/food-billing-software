const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting menu import for 3stories...");

  // Find the 3stories restaurant
  let restaurant = await prisma.restaurant.findFirst({ where: { name: "3stories" } });
  if (!restaurant) {
    // Fallback to any restaurant if 3stories doesn't exist
    restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
      console.error("No restaurant found. Please create a restaurant first.");
      process.exit(1);
    }
    console.warn(`Warning: Restaurant "3stories" not found. Using "${restaurant.name}" instead.`);
  }

  console.log(`Using restaurant: ${restaurant.name} (${restaurant.id})`);

  // Helper function to create category
  async function createCategory(name, sortOrder) {
    const existing = await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, name }
    });
    if (existing) {
      console.log(`Category "${name}" already exists, using existing...`);
      return existing;
    }
    return await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name,
        sortOrder,
        isEnabled: true
      }
    });
  }

  // Helper function to create subcategory
  async function createSubcategory(categoryId, name, sortOrder) {
    const existing = await prisma.subcategory.findFirst({
      where: { restaurantId: restaurant.id, categoryId, name }
    });
    if (existing) {
      console.log(`Subcategory "${name}" already exists, using existing...`);
      return existing;
    }
    return await prisma.subcategory.create({
      data: {
        restaurantId: restaurant.id,
        categoryId,
        name,
        sortOrder,
        isEnabled: true
      }
    });
  }

  // Helper function to create menu item
  async function createMenuItem(categoryId, subcategoryId, name, price, isVeg = true, description = null) {
    const existing = await prisma.menuItem.findFirst({
      where: {
        restaurantId: restaurant.id,
        categoryId,
        subcategoryId: subcategoryId || null,
        name
      }
    });
    if (existing) {
      console.log(`Item "${name}" already exists, skipping...`);
      return existing;
    }
    return await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId,
        subcategoryId: subcategoryId || null,
        name,
        description,
        price,
        isVeg,
        isEnabled: true,
        modifiers: []
      }
    });
  }

  // SOUTH INDIAN MENU
  const southIndianCategory = await createCategory("SOUTH INDIAN MENU", 1);
  console.log("Created category: SOUTH INDIAN MENU");

  // Dosa subcategory
  const dosaSub = await createSubcategory(southIndianCategory.id, "Dosa", 1);
  await createMenuItem(southIndianCategory.id, dosaSub.id, "Plain Dosa", 50);
  await createMenuItem(southIndianCategory.id, dosaSub.id, "Masala Dosa", 70);
  await createMenuItem(southIndianCategory.id, dosaSub.id, "Ghee Masala Dosa", 120);
  await createMenuItem(southIndianCategory.id, dosaSub.id, "Butter Masala Dosa", 120);
  await createMenuItem(southIndianCategory.id, dosaSub.id, "Schezwan Dosa", 130);
  await createMenuItem(southIndianCategory.id, dosaSub.id, "Onion Dosa", 130);
  await createMenuItem(southIndianCategory.id, dosaSub.id, "Cheese Masala Dosa", 140);
  await createMenuItem(southIndianCategory.id, dosaSub.id, "Paneer Masala Dosa", 150);
  await createMenuItem(southIndianCategory.id, dosaSub.id, "Cut Dosa", 155);

  // Appe subcategory
  const appeSub = await createSubcategory(southIndianCategory.id, "Appe", 2);
  await createMenuItem(southIndianCategory.id, appeSub.id, "Plain Appe", 50);
  await createMenuItem(southIndianCategory.id, appeSub.id, "Stuffed Appe", 60);
  await createMenuItem(southIndianCategory.id, appeSub.id, "Cheese Appe", 70);

  // Idli / Wada subcategory
  const idliWadaSub = await createSubcategory(southIndianCategory.id, "Idli / Wada", 3);
  await createMenuItem(southIndianCategory.id, idliWadaSub.id, "Idli Sambar", 40);
  await createMenuItem(southIndianCategory.id, idliWadaSub.id, "Ghee Podi Idli", 45);
  await createMenuItem(southIndianCategory.id, idliWadaSub.id, "Butter Idli", 45);
  await createMenuItem(southIndianCategory.id, idliWadaSub.id, "Thatte Idli", 50);
  await createMenuItem(southIndianCategory.id, idliWadaSub.id, "Idli Fry", 50);
  await createMenuItem(southIndianCategory.id, idliWadaSub.id, "Idli Wada", 50);
  await createMenuItem(southIndianCategory.id, idliWadaSub.id, "Mini Idli", 50);
  await createMenuItem(southIndianCategory.id, idliWadaSub.id, "Medu Wada", 50);
  await createMenuItem(southIndianCategory.id, idliWadaSub.id, "Bonda Wada", 50);

  // Uttapam subcategory
  const uttapamSub = await createSubcategory(southIndianCategory.id, "Uttapam", 4);
  await createMenuItem(southIndianCategory.id, uttapamSub.id, "Onion Uttapam", 80);
  await createMenuItem(southIndianCategory.id, uttapamSub.id, "Tomato Uttapam", 90);
  await createMenuItem(southIndianCategory.id, uttapamSub.id, "Masala Uttapam", 100);
  await createMenuItem(southIndianCategory.id, uttapamSub.id, "Mix Uttapam", 120);
  await createMenuItem(southIndianCategory.id, uttapamSub.id, "Cheese Uttapam", 150);

  // South Indian Snacks subcategory
  const snacksSub = await createSubcategory(southIndianCategory.id, "South Indian Snacks", 5);
  await createMenuItem(southIndianCategory.id, snacksSub.id, "Wada Pav", 20);
  await createMenuItem(southIndianCategory.id, snacksSub.id, "Poha", 30);
  await createMenuItem(southIndianCategory.id, snacksSub.id, "Upma", 40);
  await createMenuItem(southIndianCategory.id, snacksSub.id, "Aloo Bonda", 40);
  await createMenuItem(southIndianCategory.id, snacksSub.id, "Onion Bhajiya", 40);

  // Beverages (South Indian) subcategory
  const beveragesSouthSub = await createSubcategory(southIndianCategory.id, "Beverages (South Indian)", 6);
  await createMenuItem(southIndianCategory.id, beveragesSouthSub.id, "Hot Tea", 15);
  await createMenuItem(southIndianCategory.id, beveragesSouthSub.id, "Filter Coffee", 20);
  await createMenuItem(southIndianCategory.id, beveragesSouthSub.id, "Water Bottle", 20);

  // CAFE / FAST FOOD MENU
  const cafeCategory = await createCategory("CAFE / FAST FOOD MENU", 2);
  console.log("Created category: CAFE / FAST FOOD MENU");

  // Maggie subcategory
  const maggieSub = await createSubcategory(cafeCategory.id, "Maggie", 1);
  await createMenuItem(cafeCategory.id, maggieSub.id, "Plain Maggie", 50);
  await createMenuItem(cafeCategory.id, maggieSub.id, "Masala Maggie", 100);
  await createMenuItem(cafeCategory.id, maggieSub.id, "Panjabi Maggie", 125);
  await createMenuItem(cafeCategory.id, maggieSub.id, "Cheese Maggie", 130);
  await createMenuItem(cafeCategory.id, maggieSub.id, "Chilli Garlic Maggie", 135);
  await createMenuItem(cafeCategory.id, maggieSub.id, "Cheese Corn Maggie", 135);
  await createMenuItem(cafeCategory.id, maggieSub.id, "Peri Peri Maggie", 140);
  await createMenuItem(cafeCategory.id, maggieSub.id, "Lemon Garlic Maggie", 145);
  await createMenuItem(cafeCategory.id, maggieSub.id, "3 Stories Special Maggie", 150);

  // Toast subcategory
  const toastSub = await createSubcategory(cafeCategory.id, "Toast", 2);
  await createMenuItem(cafeCategory.id, toastSub.id, "Cheese Chilli Toast", 139);
  await createMenuItem(cafeCategory.id, toastSub.id, "Cheese Garlic Toast", 139);
  await createMenuItem(cafeCategory.id, toastSub.id, "Mushroom Cheese Toast", 150);
  await createMenuItem(cafeCategory.id, toastSub.id, "Mix Veg Toast", 150);
  await createMenuItem(cafeCategory.id, toastSub.id, "Paneer Toast", 150);

  // Nachos subcategory
  const nachosSub = await createSubcategory(cafeCategory.id, "Nachos", 3);
  await createMenuItem(cafeCategory.id, nachosSub.id, "Veggie Loaded Nacho", 130);
  await createMenuItem(cafeCategory.id, nachosSub.id, "Creamy Cheesy Nacho", 135);
  await createMenuItem(cafeCategory.id, nachosSub.id, "Cheese Loaded Nacho", 145);
  await createMenuItem(cafeCategory.id, nachosSub.id, "Cheese Corn Nacho Dip", 210);

  // Starters subcategory
  const startersSub = await createSubcategory(cafeCategory.id, "Starters", 4);
  await createMenuItem(cafeCategory.id, startersSub.id, "Veg Manchurian", 190);
  await createMenuItem(cafeCategory.id, startersSub.id, "Crispy Veg", 210);
  await createMenuItem(cafeCategory.id, startersSub.id, "Crispy Corn", 190);
  await createMenuItem(cafeCategory.id, startersSub.id, "Chilli Mushroom", 240);
  await createMenuItem(cafeCategory.id, startersSub.id, "Chilli Paneer", 240);
  await createMenuItem(cafeCategory.id, startersSub.id, "Garlic Paneer", 240);
  await createMenuItem(cafeCategory.id, startersSub.id, "Honey Chilli Potato", 220);
  await createMenuItem(cafeCategory.id, startersSub.id, "Spring Roll", 250);
  await createMenuItem(cafeCategory.id, startersSub.id, "Panner Sutti Bomb", 230);

  // Sandwich subcategory
  const sandwichSub = await createSubcategory(cafeCategory.id, "Sandwich", 5);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Veg Grilled Sandwich", 120);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Coleslaw Sandwich", 120);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Spicy Veg Sandwich", 130);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Schezwan Grilled Sandwich", 139);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Cheese Corn Sandwich", 149);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Veg Peri Peri Sandwich", 149);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Volcano Sandwich", 159);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Junglee Sandwich", 169);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Bombay Sandwich", 169);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Paneer Cheese Sandwich", 169);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Schezwan Paneer Sandwich", 175);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Paneer Peri Peri Sandwich", 175);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Triple Layered Sandwich", 200);
  await createMenuItem(cafeCategory.id, sandwichSub.id, "Pizza Sandwich", 220);

  // Add-On subcategory
  const addOnSub = await createSubcategory(cafeCategory.id, "Add-On", 6);
  await createMenuItem(cafeCategory.id, addOnSub.id, "Cheese", 55);
  await createMenuItem(cafeCategory.id, addOnSub.id, "Paneer", 45);

  // Burger subcategory
  const burgerSub = await createSubcategory(cafeCategory.id, "Burger", 7);
  await createMenuItem(cafeCategory.id, burgerSub.id, "Classic Burger", 130);
  await createMenuItem(cafeCategory.id, burgerSub.id, "Cheese Burger", 140);
  await createMenuItem(cafeCategory.id, burgerSub.id, "Schezwan Burger", 140);
  await createMenuItem(cafeCategory.id, burgerSub.id, "Paneer Burger", 150);
  await createMenuItem(cafeCategory.id, burgerSub.id, "Double Patty Burger", 169);

  // Fries subcategory
  const friesSub = await createSubcategory(cafeCategory.id, "Fries", 8);
  await createMenuItem(cafeCategory.id, friesSub.id, "Salted Fries", 120);
  await createMenuItem(cafeCategory.id, friesSub.id, "Peri Peri Fries", 130);
  await createMenuItem(cafeCategory.id, friesSub.id, "Cheesy Fries", 130);
  await createMenuItem(cafeCategory.id, friesSub.id, "Lemon Chilli Fries", 145);
  await createMenuItem(cafeCategory.id, friesSub.id, "Hot & Spicy Fries", 150);
  await createMenuItem(cafeCategory.id, friesSub.id, "3 Stories Special Fries", 155);

  // Pasta subcategory
  const pastaSub = await createSubcategory(cafeCategory.id, "Pasta", 9);
  await createMenuItem(cafeCategory.id, pastaSub.id, "White Sauce Pasta", 230);
  await createMenuItem(cafeCategory.id, pastaSub.id, "Pink Sauce Pasta", 240);
  await createMenuItem(cafeCategory.id, pastaSub.id, "Red Sauce Pasta", 250);
  await createMenuItem(cafeCategory.id, pastaSub.id, "Penne Alfredo Pasta (White Sauce)", 250);
  await createMenuItem(cafeCategory.id, pastaSub.id, "Spicy Peri Peri Pasta", 250);
  await createMenuItem(cafeCategory.id, pastaSub.id, "Mac & Cheese", 270);
  await createMenuItem(cafeCategory.id, pastaSub.id, "Pasta Skewere", 250);
  await createMenuItem(cafeCategory.id, pastaSub.id, "Baked Tandoori Pasta", 275);

  // Pizza subcategory
  const pizzaSub = await createSubcategory(cafeCategory.id, "Pizza", 10);
  await createMenuItem(cafeCategory.id, pizzaSub.id, "Margerita Pizza", 199);
  await createMenuItem(cafeCategory.id, pizzaSub.id, "Golden Corn", 220);
  await createMenuItem(cafeCategory.id, pizzaSub.id, "Spicy Delight Onion", 230);
  await createMenuItem(cafeCategory.id, pizzaSub.id, "Peri Peri Veg Pizza", 239);
  await createMenuItem(cafeCategory.id, pizzaSub.id, "Schezwan Pizza", 245);
  await createMenuItem(cafeCategory.id, pizzaSub.id, "Makhori Pizza", 245);
  await createMenuItem(cafeCategory.id, pizzaSub.id, "Panner Pizza", 250);
  await createMenuItem(cafeCategory.id, pizzaSub.id, "Indi Tandoori Paneer Pizza", 250);

  // Roll / Wrap subcategory
  const rollWrapSub = await createSubcategory(cafeCategory.id, "Roll / Wrap", 11);
  await createMenuItem(cafeCategory.id, rollWrapSub.id, "Veg Wrap (Aloo / Paneer)", 155);
  await createMenuItem(cafeCategory.id, rollWrapSub.id, "Veg Cheese Wrap (Aloo / Paneer)", 165);
  await createMenuItem(cafeCategory.id, rollWrapSub.id, "Chipoltr Wrap (Aloo / Paneer)", 175);
  await createMenuItem(cafeCategory.id, rollWrapSub.id, "Peri Peri Wrap (Aloo / Paneer)", 189);

  // Rice subcategory
  const riceSub = await createSubcategory(cafeCategory.id, "Rice", 12);
  await createMenuItem(cafeCategory.id, riceSub.id, "Veg Fried Rice", 189);
  await createMenuItem(cafeCategory.id, riceSub.id, "Schezwan Fried Rice", 220);
  await createMenuItem(cafeCategory.id, riceSub.id, "Chilli Garlic Rice", 189);
  await createMenuItem(cafeCategory.id, riceSub.id, "Burnt Garlic Fried Rice", 210);
  await createMenuItem(cafeCategory.id, riceSub.id, "Tripple Schezwan Rice", 250);
  await createMenuItem(cafeCategory.id, riceSub.id, "Cocktail Rice", 240);

  // Noodles subcategory
  const noodlesSub = await createSubcategory(cafeCategory.id, "Noodles", 13);
  await createMenuItem(cafeCategory.id, noodlesSub.id, "Veg Noodles", 189);
  await createMenuItem(cafeCategory.id, noodlesSub.id, "Hakka Noodles", 189);
  await createMenuItem(cafeCategory.id, noodlesSub.id, "Chilli Garlic Noodles", 189);
  await createMenuItem(cafeCategory.id, noodlesSub.id, "Schezwan Noodles", 210);
  await createMenuItem(cafeCategory.id, noodlesSub.id, "Burnt Garlic Noodles", 210);
  await createMenuItem(cafeCategory.id, noodlesSub.id, "American Choupsy", 250);

  // BEVERAGES & SHAKES
  const beveragesCategory = await createCategory("BEVERAGES & SHAKES", 3);
  console.log("Created category: BEVERAGES & SHAKES");

  // Tea subcategory
  const teaSub = await createSubcategory(beveragesCategory.id, "Tea", 1);
  await createMenuItem(beveragesCategory.id, teaSub.id, "Masala Tea", 20);
  await createMenuItem(beveragesCategory.id, teaSub.id, "Lemon Tea", 30);
  await createMenuItem(beveragesCategory.id, teaSub.id, "Black Tea", 30);
  await createMenuItem(beveragesCategory.id, teaSub.id, "Ginger Honey Tea", 40);
  await createMenuItem(beveragesCategory.id, teaSub.id, "Cold Tea", 99);
  await createMenuItem(beveragesCategory.id, teaSub.id, "Fresh Lime Water", 99);
  await createMenuItem(beveragesCategory.id, teaSub.id, "Lemon Ice Tea", 130);
  await createMenuItem(beveragesCategory.id, teaSub.id, "Peach Ice Tea", 130);

  // Hot Chocolate subcategory
  const hotChocolateSub = await createSubcategory(beveragesCategory.id, "Hot Chocolate", 2);
  await createMenuItem(beveragesCategory.id, hotChocolateSub.id, "White Hot Chocolate", 169);
  await createMenuItem(beveragesCategory.id, hotChocolateSub.id, "Dark Hot Chocolate", 169);
  await createMenuItem(beveragesCategory.id, hotChocolateSub.id, "Nutella Hot Chocolate", 179);
  await createMenuItem(beveragesCategory.id, hotChocolateSub.id, "Hazelnut Hot Chocolate", 179);

  // Hot Espresso subcategory
  const hotEspressoSub = await createSubcategory(beveragesCategory.id, "Hot Espresso", 3);
  await createMenuItem(beveragesCategory.id, hotEspressoSub.id, "Hot Dappio", 109);
  await createMenuItem(beveragesCategory.id, hotEspressoSub.id, "Hot Americano", 119);
  await createMenuItem(beveragesCategory.id, hotEspressoSub.id, "Hot Cappuccino", 160);
  await createMenuItem(beveragesCategory.id, hotEspressoSub.id, "Irish", 170);
  await createMenuItem(beveragesCategory.id, hotEspressoSub.id, "Latte", 170);
  await createMenuItem(beveragesCategory.id, hotEspressoSub.id, "Hot Chocolate Coffee", 190);

  // Cold Espresso subcategory
  const coldEspressoSub = await createSubcategory(beveragesCategory.id, "Cold Espresso", 4);
  await createMenuItem(beveragesCategory.id, coldEspressoSub.id, "Iced Dappio", 120);
  await createMenuItem(beveragesCategory.id, coldEspressoSub.id, "Iced Americano", 150);
  await createMenuItem(beveragesCategory.id, coldEspressoSub.id, "Honey Iced Latte", 160);
  await createMenuItem(beveragesCategory.id, coldEspressoSub.id, "Espresso Tonic", 170);

  // Cappuccino Special subcategory
  const cappuccinoSpecialSub = await createSubcategory(beveragesCategory.id, "Cappuccino Special", 5);
  await createMenuItem(beveragesCategory.id, cappuccinoSpecialSub.id, "Cinnamon Cappuccino", 189);
  await createMenuItem(beveragesCategory.id, cappuccinoSpecialSub.id, "Irish Cappuccino", 189);
  await createMenuItem(beveragesCategory.id, cappuccinoSpecialSub.id, "Rose Cappuccino", 189);
  await createMenuItem(beveragesCategory.id, cappuccinoSpecialSub.id, "Turmeric Cappuccino", 189);
  await createMenuItem(beveragesCategory.id, cappuccinoSpecialSub.id, "Vanilla Cappuccino", 189);
  await createMenuItem(beveragesCategory.id, cappuccinoSpecialSub.id, "Hazelnut Cappuccino", 189);

  // Latte Special subcategory
  const latteSpecialSub = await createSubcategory(beveragesCategory.id, "Latte Special", 6);
  await createMenuItem(beveragesCategory.id, latteSpecialSub.id, "Cinnamon Latte", 199);
  await createMenuItem(beveragesCategory.id, latteSpecialSub.id, "Irish Latte", 199);
  await createMenuItem(beveragesCategory.id, latteSpecialSub.id, "Rose Latte", 199);
  await createMenuItem(beveragesCategory.id, latteSpecialSub.id, "Turmeric Latte", 199);
  await createMenuItem(beveragesCategory.id, latteSpecialSub.id, "Vanilla Latte", 199);
  await createMenuItem(beveragesCategory.id, latteSpecialSub.id, "Hazelnut Latte", 199);

  // Shakes subcategory
  const shakesSub = await createSubcategory(beveragesCategory.id, "Shakes", 7);
  await createMenuItem(beveragesCategory.id, shakesSub.id, "Vanilla Shake", 149);
  await createMenuItem(beveragesCategory.id, shakesSub.id, "Butterscotch Shake", 149);
  await createMenuItem(beveragesCategory.id, shakesSub.id, "Mango Shake", 149);
  await createMenuItem(beveragesCategory.id, shakesSub.id, "Kiwi Shake", 149);
  await createMenuItem(beveragesCategory.id, shakesSub.id, "Litchi Shake", 149);
  await createMenuItem(beveragesCategory.id, shakesSub.id, "Green Apple", 169);
  await createMenuItem(beveragesCategory.id, shakesSub.id, "Blue Curalao", 169);
  await createMenuItem(beveragesCategory.id, shakesSub.id, "Ginger Lime", 169);
  await createMenuItem(beveragesCategory.id, shakesSub.id, "Orange Spice", 169);
  await createMenuItem(beveragesCategory.id, shakesSub.id, "Red Wine (Rose)", 169);

  // Cold Beverages subcategory
  const coldBeveragesSub = await createSubcategory(beveragesCategory.id, "Cold Beverages", 8);
  await createMenuItem(beveragesCategory.id, coldBeveragesSub.id, "Water Bottle", 20);
  await createMenuItem(beveragesCategory.id, coldBeveragesSub.id, "Sprite", 45);
  await createMenuItem(beveragesCategory.id, coldBeveragesSub.id, "Coco Cola", 45);
  await createMenuItem(beveragesCategory.id, coldBeveragesSub.id, "Tonic Water", 100);
  await createMenuItem(beveragesCategory.id, coldBeveragesSub.id, "Red Bull", 145);

  console.log("\n✅ Menu import completed successfully!");
  console.log("Categories: 3");
  console.log("Subcategories: 27");
  console.log("Menu items: ~200+");
}

main()
  .catch((e) => {
    console.error("Error importing menu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
