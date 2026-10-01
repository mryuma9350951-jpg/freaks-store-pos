import os
from typing import Optional

import pymysql
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="FREAK'S STORE POS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=3306,
        ssl={"ssl": {}},
        cursorclass=pymysql.cursors.DictCursor,
    )


# =========================
# 基本API
# =========================

@app.get("/")
def root():
    return {
        "message": "FREAK'S STORE POS API is running"
    }


# =========================
# 商品検索
# =========================

@app.get("/api/products/{product_code}")
def get_product(product_code: str):
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    product_code,
                    name,
                    current_unit_price
                FROM products
                WHERE product_code = %s
                """,
                (product_code,),
            )

            product = cursor.fetchone()

        if product is None:
            return {
                "product_code": product_code,
                "name": "商品が見つかりません",
                "price": 0,
            }

        return {
            "product_code": product["product_code"],
            "name": product["name"],
            "price": int(product["current_unit_price"]),
        }

    finally:
        conn.close()


# =========================
# 会員検索
# =========================

@app.get("/api/members/{member_id}")
def get_member(member_id: str):
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    member_id,
                    member_name,
                    discount_rate,
                    is_active
                FROM members
                WHERE member_id = %s
                """,
                (member_id,),
            )

            member = cursor.fetchone()

        # 会員が存在しない
        if member is None:
            return {
                "member_id": member_id,
                "member_name": None,
                "discount_rate": 0,
                "is_member": False,
            }

        # 無効な会員
        if not member["is_active"]:
            return {
                "member_id": member_id,
                "member_name": None,
                "discount_rate": 0,
                "is_member": False,
            }

        # 正常な会員
        return {
            "member_id": member["member_id"],
            "member_name": member["member_name"],
            "discount_rate": float(member["discount_rate"]),
            "is_member": True,
        }

    finally:
        conn.close()


# =========================
# 購入リクエスト
# =========================

class PurchaseItem(BaseModel):
    product_code: str
    quantity: int


class PurchaseRequest(BaseModel):
    member_id: Optional[str] = None
    items: list[PurchaseItem]


# =========================
# 購入確定
# =========================

@app.post("/api/purchases")
def create_purchase(request: PurchaseRequest):
    conn = get_connection()

    try:
        with conn.cursor() as cursor:

            # -------------------------
            # 会員情報をDBから取得
            # -------------------------

            member = None

            if request.member_id:
                cursor.execute(
                    """
                    SELECT
                        member_id,
                        member_name,
                        discount_rate,
                        is_active
                    FROM members
                    WHERE member_id = %s
                    """,
                    (request.member_id,),
                )

                member = cursor.fetchone()

                # 無効な会員は非会員として扱う
                if member and not member["is_active"]:
                    member = None

            discount_rate = (
                float(member["discount_rate"])
                if member
                else 0
            )

            # -------------------------
            # 商品情報をDBから取得
            # -------------------------

            subtotal = 0

            purchase_items = []

            for item in request.items:

                # 数量チェック
                if item.quantity < 1 or item.quantity > 99:
                    raise HTTPException(
                        status_code=400,
                        detail="数量は1〜99で指定してください",
                    )

                cursor.execute(
                    """
                    SELECT
                        product_code,
                        name,
                        current_unit_price
                    FROM products
                    WHERE product_code = %s
                    """,
                    (item.product_code,),
                )

                product = cursor.fetchone()

                # 商品が存在しない
                if product is None:
                    raise HTTPException(
                        status_code=404,
                        detail=f"商品が見つかりません: {item.product_code}",
                    )

                unit_price = int(
                    product["current_unit_price"]
                )

                line_amount = (
                    unit_price * item.quantity
                )

                subtotal += line_amount

                purchase_items.append(
                    {
                        "product_code": product["product_code"],
                        "product_name": product["name"],
                        "unit_price": unit_price,
                        "quantity": item.quantity,
                    }
                )

            # -------------------------
            # 割引計算
            # -------------------------

            discount_amount = int(
                subtotal * discount_rate / 100
            )

            discounted_amount = (
                subtotal - discount_amount
            )

            # -------------------------
            # 消費税計算
            # 現時点では10%
            # -------------------------

            tax_rate = 10

            tax_amount = int(
                discounted_amount * tax_rate / 100
            )

            total_amount = (
                discounted_amount + tax_amount
            )

            # -------------------------
            # transactions登録
            # -------------------------

            cursor.execute(
                """
                INSERT INTO transactions (
                    member_id,
                    subtotal_amount,
                    discount_amount,
                    tax_rate,
                    tax_amount,
                    total_amount
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    member["member_id"]
                    if member
                    else None,
                    subtotal,
                    discount_amount,
                    tax_rate,
                    tax_amount,
                    total_amount,
                ),
            )

            transaction_id = cursor.lastrowid

            # -------------------------
            # transaction_items登録
            # -------------------------

            for item in purchase_items:

                item_discount = int(
                    item["unit_price"]
                    * item["quantity"]
                    * discount_rate
                    / 100
                )

                cursor.execute(
                    """
                    INSERT INTO transaction_items (
                        transaction_id,
                        product_code,
                        product_name,
                        unit_price,
                        quantity,
                        discount_amount
                    )
                    VALUES (
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s
                    )
                    """,
                    (
                        transaction_id,
                        item["product_code"],
                        item["product_name"],
                        item["unit_price"],
                        item["quantity"],
                        item_discount,
                    ),
                )

        # -------------------------
        # DB確定
        # -------------------------

        conn.commit()

        # -------------------------
        # 結果返却
        # -------------------------

        return {
            "success": True,
            "transaction_id": transaction_id,
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "total_amount": total_amount,
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"購入処理に失敗しました: {str(e)}",
        )

    finally:
        conn.close()