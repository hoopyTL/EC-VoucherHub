-- Standardize the catalogue taxonomy while preserving voucher foreign keys.
DO $$
DECLARE
  old_id INTEGER;
  new_id INTEGER;
BEGIN
  -- Ăn uống -> Ẩm Thực
  SELECT id INTO old_id FROM "categories" WHERE "name" = 'Ăn uống' ORDER BY id LIMIT 1;
  SELECT id INTO new_id FROM "categories" WHERE "name" = 'Ẩm Thực' ORDER BY id LIMIT 1;
  IF old_id IS NOT NULL AND new_id IS NOT NULL AND old_id <> new_id THEN
    UPDATE "voucher_products" SET "category_id" = new_id WHERE "category_id" = old_id;
    UPDATE "categories" SET "parent_id" = new_id WHERE "parent_id" = old_id;
    DELETE FROM "categories" WHERE id = old_id;
  ELSIF old_id IS NOT NULL THEN
    UPDATE "categories" SET "name" = 'Ẩm Thực' WHERE id = old_id;
  END IF;

  -- Buffet & Lẩu -> Buffet
  old_id := NULL;
  new_id := NULL;
  SELECT id INTO old_id FROM "categories" WHERE "name" = 'Buffet & Lẩu' ORDER BY id LIMIT 1;
  SELECT id INTO new_id FROM "categories" WHERE "name" = 'Buffet' ORDER BY id LIMIT 1;
  IF old_id IS NOT NULL AND new_id IS NOT NULL AND old_id <> new_id THEN
    UPDATE "voucher_products" SET "category_id" = new_id WHERE "category_id" = old_id;
    UPDATE "categories" SET "parent_id" = new_id WHERE "parent_id" = old_id;
    DELETE FROM "categories" WHERE id = old_id;
  ELSIF old_id IS NOT NULL THEN
    UPDATE "categories" SET "name" = 'Buffet' WHERE id = old_id;
  END IF;

  -- Làm đẹp & Spa -> Spa & Làm đẹp
  old_id := NULL;
  new_id := NULL;
  SELECT id INTO old_id FROM "categories" WHERE "name" = 'Làm đẹp & Spa' ORDER BY id LIMIT 1;
  SELECT id INTO new_id FROM "categories" WHERE "name" = 'Spa & Làm đẹp' ORDER BY id LIMIT 1;
  IF old_id IS NOT NULL AND new_id IS NOT NULL AND old_id <> new_id THEN
    UPDATE "voucher_products" SET "category_id" = new_id WHERE "category_id" = old_id;
    UPDATE "categories" SET "parent_id" = new_id WHERE "parent_id" = old_id;
    DELETE FROM "categories" WHERE id = old_id;
  ELSIF old_id IS NOT NULL THEN
    UPDATE "categories" SET "name" = 'Spa & Làm đẹp' WHERE id = old_id;
  END IF;

  -- Giải trí -> Giải Trí & Thể Thao
  old_id := NULL;
  new_id := NULL;
  SELECT id INTO old_id FROM "categories" WHERE "name" = 'Giải trí' ORDER BY id LIMIT 1;
  SELECT id INTO new_id FROM "categories" WHERE "name" = 'Giải Trí & Thể Thao' ORDER BY id LIMIT 1;
  IF old_id IS NOT NULL AND new_id IS NOT NULL AND old_id <> new_id THEN
    UPDATE "voucher_products" SET "category_id" = new_id WHERE "category_id" = old_id;
    UPDATE "categories" SET "parent_id" = new_id WHERE "parent_id" = old_id;
    DELETE FROM "categories" WHERE id = old_id;
  ELSIF old_id IS NOT NULL THEN
    UPDATE "categories" SET "name" = 'Giải Trí & Thể Thao' WHERE id = old_id;
  END IF;

  -- Du lịch & Khách sạn -> Tour du lịch
  old_id := NULL;
  new_id := NULL;
  SELECT id INTO old_id FROM "categories" WHERE "name" = 'Du lịch & Khách sạn' ORDER BY id LIMIT 1;
  SELECT id INTO new_id FROM "categories" WHERE "name" = 'Tour du lịch' ORDER BY id LIMIT 1;
  IF old_id IS NOT NULL AND new_id IS NOT NULL AND old_id <> new_id THEN
    UPDATE "voucher_products" SET "category_id" = new_id WHERE "category_id" = old_id;
    UPDATE "categories" SET "parent_id" = new_id WHERE "parent_id" = old_id;
    DELETE FROM "categories" WHERE id = old_id;
  ELSIF old_id IS NOT NULL THEN
    UPDATE "categories" SET "name" = 'Tour du lịch' WHERE id = old_id;
  END IF;
END $$;

INSERT INTO "categories" ("name", "parent_id")
SELECT 'Massage Nam Nữ', NULL
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Massage Nam Nữ');

INSERT INTO "categories" ("name", "parent_id")
SELECT 'Nha Khoa', NULL
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Nha Khoa');

INSERT INTO "categories" ("name", "parent_id")
SELECT 'Hotel & Resort', NULL
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Hotel & Resort');

-- Keep all standardized categories at the top level.
UPDATE "categories"
SET "parent_id" = NULL
WHERE "name" IN (
  'Ẩm Thực',
  'Buffet',
  'Spa & Làm đẹp',
  'Massage Nam Nữ',
  'Giải Trí & Thể Thao',
  'Tour du lịch',
  'Hotel & Resort',
  'Nha Khoa'
);

-- Move matching spa vouchers into the newly separated massage category.
UPDATE "voucher_products"
SET "category_id" = (SELECT id FROM "categories" WHERE "name" = 'Massage Nam Nữ' ORDER BY id LIMIT 1)
WHERE "category_id" = (SELECT id FROM "categories" WHERE "name" = 'Spa & Làm đẹp' ORDER BY id LIMIT 1)
  AND ("name" || ' ' || "description") ~* '(massage|mát[ -]?xa|body|foot)';

-- Move matching spa vouchers into the newly separated dental category.
UPDATE "voucher_products"
SET "category_id" = (SELECT id FROM "categories" WHERE "name" = 'Nha Khoa' ORDER BY id LIMIT 1)
WHERE "category_id" = (SELECT id FROM "categories" WHERE "name" = 'Spa & Làm đẹp' ORDER BY id LIMIT 1)
  AND ("name" || ' ' || "description") ~* '(nha khoa|dental|răng|niềng)';

-- Split hotel/resort products out of the former combined travel category.
UPDATE "voucher_products"
SET "category_id" = (SELECT id FROM "categories" WHERE "name" = 'Hotel & Resort' ORDER BY id LIMIT 1)
WHERE "category_id" = (SELECT id FROM "categories" WHERE "name" = 'Tour du lịch' ORDER BY id LIMIT 1)
  AND ("name" || ' ' || "description") ~* '(hotel|resort|khách sạn|nghỉ dưỡng|staycation|phòng nghỉ|[0-9]+n[0-9]+đ)';
