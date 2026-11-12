import { MigrationInterface, QueryRunner } from 'typeorm';

// Tồn kho theo nguyên liệu (chuyển từ A1, sửa theo A2):
// - tạo bảng ingredients / recipe_items / topping_recipes + dữ liệu mẫu
// - món đã được seed ở InitialProducts (p1..p6); bảng products không có cột stock,
//   số ly còn bán được tính từ nguyên liệu
export class AddInventory1761650000000 implements MigrationInterface {
  name = 'AddInventory1761650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ingredients" (
        "id" character varying(64) NOT NULL,
        "name" character varying(255) NOT NULL,
        "unit" character varying(16) NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_ingredients" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_ingredients_quantity" CHECK ("quantity" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "recipe_items" (
        "productId" character varying(64) NOT NULL,
        "ingredientId" character varying(64) NOT NULL,
        "amount" integer NOT NULL,
        CONSTRAINT "PK_recipe_items" PRIMARY KEY ("productId", "ingredientId"),
        CONSTRAINT "CHK_recipe_items_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_recipe_items_product" FOREIGN KEY ("productId")
          REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_recipe_items_ingredient" FOREIGN KEY ("ingredientId")
          REFERENCES "ingredients"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "topping_recipes" (
        "toppingId" character varying(32) NOT NULL,
        "ingredientId" character varying(64) NOT NULL,
        "amount" integer NOT NULL,
        CONSTRAINT "PK_topping_recipes" PRIMARY KEY ("toppingId", "ingredientId"),
        CONSTRAINT "CHK_topping_recipes_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_topping_recipes_ingredient" FOREIGN KEY ("ingredientId")
          REFERENCES "ingredients"("id") ON DELETE RESTRICT
      )
    `);

    // Sample stock (edit by hand for demos, e.g. UPDATE ingredients SET quantity = ...)
    await queryRunner.query(`
      INSERT INTO "ingredients" ("id", "name", "unit", "quantity") VALUES
        ('coffee', 'Cà phê', 'g', 2000),
        ('condensed-milk', 'Sữa đặc', 'ml', 3000),
        ('fresh-milk', 'Sữa tươi', 'ml', 5000),
        ('tea', 'Trà', 'g', 1000),
        ('peach', 'Đào ngâm', 'g', 2000),
        ('lychee', 'Vải ngâm', 'g', 2000),
        ('sugar-syrup', 'Đường nước', 'ml', 3000),
        ('cream', 'Kem béo', 'g', 1000),
        ('pearls', 'Trân châu', 'g', 2000)
    `);

    // Công thức 1 ly size S theo món A2: p1 Americano, p2 Bạc xỉu, p3 Cappuccino,
    // p4 Cà phê sữa, p5 Trà vải, p6 Trà đào
    // Recipes for one cup at size S (M ×1.25, L ×1.5 — see recipe-calculator.ts)
    await queryRunner.query(`
      INSERT INTO "recipe_items" ("productId", "ingredientId", "amount") VALUES
        ('p1', 'coffee', 18),
        ('p2', 'coffee', 10), ('p2', 'condensed-milk', 40), ('p2', 'fresh-milk', 60),
        ('p3', 'coffee', 18), ('p3', 'fresh-milk', 120),
        ('p4', 'coffee', 20), ('p4', 'condensed-milk', 30),
        ('p5', 'tea', 5), ('p5', 'lychee', 60), ('p5', 'sugar-syrup', 20),
        ('p6', 'tea', 5), ('p6', 'peach', 60), ('p6', 'sugar-syrup', 20)
    `);

    // Topping ids match frontend/src/lib/productOptions.ts and orders/pricing.ts
    await queryRunner.query(`
      INSERT INTO "topping_recipes" ("toppingId", "ingredientId", "amount") VALUES
        ('cream', 'cream', 20),
        ('pearls', 'pearls', 40)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "topping_recipes"`);
    await queryRunner.query(`DROP TABLE "recipe_items"`);
    await queryRunner.query(`DROP TABLE "ingredients"`);
  }
}