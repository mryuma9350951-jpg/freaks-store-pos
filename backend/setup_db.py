import os

import pymysql
from dotenv import load_dotenv

load_dotenv()

conn = pymysql.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=3306,
    ssl={"ssl": {}},
)

try:
    with conn.cursor() as cursor:

        # =========================
        # productsテーブル
        # =========================
        products_table_sql = """
        CREATE TABLE IF NOT EXISTS products (
            product_id BIGINT AUTO_INCREMENT PRIMARY KEY,
            product_code VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            current_unit_price DECIMAL(10, 2) NOT NULL,

            CONSTRAINT chk_products_price
                CHECK (current_unit_price >= 0)
        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
          COLLATE=utf8mb4_unicode_ci;
        """

        cursor.execute(products_table_sql)

        # =========================
        # membersテーブル
        # =========================
        members_table_sql = """
        CREATE TABLE IF NOT EXISTS members (
            member_id VARCHAR(50) PRIMARY KEY,
            member_name VARCHAR(255) NOT NULL,
            discount_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,

            CONSTRAINT chk_members_discount_rate
                CHECK (discount_rate >= 0 AND discount_rate <= 100)
        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
          COLLATE=utf8mb4_unicode_ci;
        """

        cursor.execute(members_table_sql)

        # =========================
        # transactionsテーブル
        # =========================
        transactions_table_sql = """
        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,

            member_id VARCHAR(50) NULL,

            subtotal_amount DECIMAL(10, 2) NOT NULL,
            discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
            tax_rate DECIMAL(5, 2) NOT NULL,
            tax_amount DECIMAL(10, 2) NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,

            purchased_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT fk_transactions_member
                FOREIGN KEY (member_id)
                REFERENCES members(member_id),

            CONSTRAINT chk_transactions_subtotal
                CHECK (subtotal_amount >= 0),

            CONSTRAINT chk_transactions_discount
                CHECK (discount_amount >= 0),

            CONSTRAINT chk_transactions_tax
                CHECK (tax_amount >= 0),

            CONSTRAINT chk_transactions_total
                CHECK (total_amount >= 0)
        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
          COLLATE=utf8mb4_unicode_ci;
        """

        cursor.execute(transactions_table_sql)

        # =========================
        # transaction_itemsテーブル
        # =========================
        transaction_items_table_sql = """
        CREATE TABLE IF NOT EXISTS transaction_items (
            transaction_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,

            transaction_id BIGINT NOT NULL,

            product_code VARCHAR(100) NOT NULL,
            product_name VARCHAR(255) NOT NULL,

            unit_price DECIMAL(10, 2) NOT NULL,
            quantity INT NOT NULL,

            discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,

            CONSTRAINT fk_transaction_items_transaction
                FOREIGN KEY (transaction_id)
                REFERENCES transactions(transaction_id),

            CONSTRAINT chk_transaction_items_price
                CHECK (unit_price >= 0),

            CONSTRAINT chk_transaction_items_quantity
                CHECK (quantity >= 1 AND quantity <= 99),

            CONSTRAINT chk_transaction_items_discount
                CHECK (discount_amount >= 0)
        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
          COLLATE=utf8mb4_unicode_ci;
        """

        cursor.execute(transaction_items_table_sql)

        # =========================
        # 商品データ登録
        # =========================
        with open("seed_products.sql", "r", encoding="utf-8") as f:
            seed_products_sql = f.read()

        cursor.execute(seed_products_sql)

        # =========================
        # 会員データ登録
        # =========================
        with open("seed_members.sql", "r", encoding="utf-8") as f:
            seed_members_sql = f.read()

        cursor.execute(seed_members_sql)

    conn.commit()

    print("DBセットアップ成功")
    print("productsテーブル作成成功")
    print("商品123456789登録成功")
    print("membersテーブル作成成功")
    print("会員100001登録成功")
    print("transactionsテーブル作成成功")
    print("transaction_itemsテーブル作成成功")

finally:
    conn.close()