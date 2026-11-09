import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialProducts1710000000000 implements MigrationInterface {
  name = 'InitialProducts1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo bảng products
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" character varying(64) NOT NULL,
        "name" character varying(255) NOT NULL,
        "price" integer NOT NULL,
        "imageUrl" character varying(500) NOT NULL,
        CONSTRAINT "PK_0806c755f041245e72154d4804b" PRIMARY KEY ("id")
      )
    `);

    // 2. Seed 6 món khớp chuẩn với ảnh trong thư mục public/images
    await queryRunner.query(`
      INSERT INTO "products" ("id", "name", "price", "imageUrl") VALUES
      ('p1', 'Americano', 30000, '/images/americano.jpg'),
      ('p2', 'Bạc xỉu', 32000, '/images/bac-xiu.jpg'),
      ('p3', 'Cappuccino', 40000, '/images/cappuccino.jpg'),
      ('p4', 'Cà phê sữa', 29000, '/images/coffee.jpg'),
      ('p5', 'Trà vải', 38000, '/images/lychee-tea.jpg'),
      ('p6', 'Trà đào', 38000, '/images/peach-tea.jpg')
      ON CONFLICT ("id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
  }
}