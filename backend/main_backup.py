from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FREAK'S STORE POS API")


# ==========================================
# CORS設定
# ==========================================

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


# ==========================================
# ヘルスチェック
# ==========================================

@app.get("/")
def root():
    return {
        "message": "FREAK'S STORE POS API is running"
    }


# ==========================================
# 商品取得
# ==========================================

@app.get("/api/products/{product_code}")
def get_product(product_code: str):

    # 現在はサンプル商品
    if product_code == "123456789":
        return {
            "product_code": "123456789",
            "name": "FREAK'S STORE Tシャツ",
            "price": 5500,
        }

    return {
        "product_code": product_code,
        "name": "FREAK'S STORE 商品",
        "price": 5500,
    }


# ==========================================
# 会員確認
# ==========================================

@app.get("/api/members/{member_id}")
def get_member(member_id: str):

    # 会員ID 100001
    if member_id == "100001":
        return {
            "member_id": "100001",
            "member_name": "山田太郎",
            "discount_rate": 10,
            "is_member": True,
        }

    # その他の会員ID
    return {
        "member_id": member_id,
        "member_name": None,
        "discount_rate": 0,
        "is_member": False,
    }