"use client";

import { useState } from "react";

type CartItem = {
  id: number;
  productCode: string;
  name: string;
  price: number;
  quantity: number;
};

export default function Home() {
  // ==========================================
  // 商品コード
  // ==========================================

  const [productCode, setProductCode] = useState("");

  // ==========================================
  // 会員情報
  // ==========================================

  const [memberId, setMemberId] = useState("");
  const [memberChecked, setMemberChecked] = useState(false);
  const [discountRate, setDiscountRate] = useState(0);

  // ==========================================
  // 購入リスト
  // ==========================================

  const [cart, setCart] = useState<CartItem[]>([
    {
      id: 1,
      productCode: "123456789",
      name: "FREAK'S STORE Tシャツ",
      price: 5500,
      quantity: 1,
    },
  ]);

  // ==========================================
  // 会計確認
  // ==========================================

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  // ==========================================
  // 購入完了
  // ==========================================

  const [purchaseCompleted, setPurchaseCompleted] =
    useState(false);

  const [transactionId, setTransactionId] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  // ==========================================
  // 商品登録
  // ==========================================

  const addProduct = async () => {
    if (!productCode) {
      alert("商品コードを入力してください");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/products/${productCode}`
      );

      if (!response.ok) {
        alert("商品が見つかりません");
        return;
      }

      const product = await response.json();

      const existingItem = cart.find(
        (item) =>
          item.productCode === product.product_code
      );

      if (existingItem) {
        if (existingItem.quantity >= 99) {
          alert("数量は99個までです");
          return;
        }

        setCart(
          cart.map((item) =>
            item.productCode ===
            product.product_code
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1,
                }
              : item
          )
        );
      } else {
        setCart([
          ...cart,
          {
            id: Date.now(),
            productCode:
              product.product_code,
            name: product.name,
            price: product.price,
            quantity: 1,
          },
        ]);
      }

      setProductCode("");
    } catch (error) {
      console.error(error);

      alert(
        "商品情報の取得に失敗しました"
      );
    }
  };

  // ==========================================
  // 数量変更
  // ==========================================

  const changeQuantity = (
    id: number,
    quantity: number
  ) => {
    if (quantity < 1 || quantity > 99) {
      alert(
        "数量は1〜99で入力してください"
      );
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
            }
          : item
      )
    );
  };

  // ==========================================
  // 商品削除
  // ==========================================

  const deleteItem = (id: number) => {
    setCart(
      cart.filter(
        (item) => item.id !== id
      )
    );
  };

  // ==========================================
  // 会員確認
  // ==========================================

  const checkMember = async () => {
    if (!memberId) {
      setMemberChecked(false);
      setDiscountRate(0);

      alert(
        "会員IDが未入力のため、非会員として処理します"
      );

      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/members/${memberId}`
      );

      if (!response.ok) {
        alert(
          "会員情報の取得に失敗しました"
        );

        return;
      }

      const member = await response.json();

      if (!member.is_member) {
        setMemberChecked(false);
        setDiscountRate(0);

        alert("該当会員なし");

        return;
      }

      setMemberChecked(true);

      setDiscountRate(
        member.discount_rate
      );

      alert(
        `会員ID ${member.member_id} を確認しました。${member.discount_rate}%OFFが適用されます`
      );
    } catch (error) {
      console.error(error);

      alert(
        "会員情報の取得に失敗しました"
      );
    }
  };

  // ==========================================
  // 金額計算
  // ==========================================

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      item.price * item.quantity,
    0
  );

  const discount = Math.floor(
    subtotal *
      (discountRate / 100)
  );

  const afterDiscount = Math.max(
    subtotal - discount,
    0
  );

  const taxRate = 0.1;

  const tax = Math.floor(
    afterDiscount * taxRate
  );

  const taxIncludedTotal =
    afterDiscount + tax;

  // ==========================================
  // 会計確認を開く
  // ==========================================

  const openConfirmation = () => {
    if (cart.length === 0) {
      alert(
        "商品が登録されていません"
      );

      return;
    }

    setShowConfirmation(true);
  };

  // ==========================================
  // 会計確認から戻る
  // ==========================================

  const backToCart = () => {
    setShowConfirmation(false);
  };

  // ==========================================
  // 最終購入確定
  // ==========================================

  const completePurchase = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/purchases",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            member_id:
              memberChecked && memberId
                ? memberId
                : null,
            items: cart.map((item) => ({
              product_code: item.productCode,
              quantity: item.quantity,
            })),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(
          result.detail ||
            "購入処理に失敗しました"
        );
        return;
      }

      setTransactionId(
        `TR${result.transaction_id}`
      );

      setShowConfirmation(false);
      setPurchaseCompleted(true);
    } catch (error) {
      console.error(error);

      alert(
        "購入処理に失敗しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // 新しい会計
  // ==========================================

  const startNewPurchase = () => {
    setCart([]);

    setMemberId("");

    setMemberChecked(false);

    setDiscountRate(0);

    setTransactionId("");

    setShowConfirmation(false);

    setPurchaseCompleted(false);
  };

  // ==========================================
  // 購入完了画面
  // ==========================================

  if (purchaseCompleted) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">

        <header className="bg-black px-6 py-5 text-white">

          <div className="flex items-center justify-between">

            <div>

              <h1 className="text-2xl font-bold">
                FREAK&apos;S STORE POS
              </h1>

              <p className="text-sm text-gray-300">
                店舗レジシステム
              </p>

            </div>

            <div className="font-bold">
              staff001 / 山田
            </div>

          </div>

        </header>

        <main className="mx-auto max-w-2xl px-6 py-12">

          <section className="rounded-2xl bg-white p-10 text-center shadow">

            <div className="mb-6 text-5xl">
              ✓
            </div>

            <h2 className="mb-8 text-3xl font-bold">
              購入完了
            </h2>

            <div className="mb-8 rounded-xl bg-gray-50 p-6">

              <div className="mb-4">

                <p className="text-sm text-gray-500">
                  取引番号
                </p>

                <p className="mt-1 text-xl font-bold">
                  {transactionId}
                </p>

              </div>

              <div>

                <p className="text-sm text-gray-500">
                  購入金額
                </p>

                <p className="mt-1 text-3xl font-bold">
                  ¥
                  {taxIncludedTotal.toLocaleString()}
                </p>

              </div>

            </div>

            <button
              onClick={startNewPurchase}
              className="w-full rounded-xl bg-black px-4 py-4 text-lg font-bold text-white hover:bg-gray-800"
            >
              新しい会計を開始
            </button>

          </section>

        </main>

      </div>
    );
  }

  // ==========================================
  // 会計確認画面
  // ==========================================

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">

        <header className="bg-black px-6 py-5 text-white">

          <div className="flex items-center justify-between">

            <div>

              <h1 className="text-2xl font-bold">
                FREAK&apos;S STORE POS
              </h1>

              <p className="text-sm text-gray-300">
                会計確認
              </p>

            </div>

            <div className="font-bold">
              staff001 / 山田
            </div>

          </div>

        </header>

        <main className="mx-auto max-w-2xl px-6 py-8">

          <section className="rounded-2xl bg-white p-8 shadow">

            <h2 className="mb-6 text-2xl font-bold">
              会計確認
            </h2>

            {/* 商品点数 */}

            <div className="mb-4 flex justify-between">

              <span className="text-gray-600">
                商品点数
              </span>

              <span className="font-bold">
                {cart.reduce(
                  (sum, item) =>
                    sum + item.quantity,
                  0
                )}
                点
              </span>

            </div>

            {/* 商品一覧 */}

            <div className="mb-6 space-y-3 rounded-xl bg-gray-50 p-4">

              {cart.map((item) => (

                <div
                  key={item.id}
                  className="flex justify-between"
                >

                  <div>

                    <p className="font-bold">
                      {item.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      ¥
                      {item.price.toLocaleString()}
                      {" × "}
                      {item.quantity}
                    </p>

                  </div>

                  <p className="font-bold">
                    ¥
                    {(
                      item.price *
                      item.quantity
                    ).toLocaleString()}
                  </p>

                </div>

              ))}

            </div>

            {/* 金額 */}

            <div className="space-y-3">

              <div className="flex justify-between">

                <span>
                  税抜合計
                </span>

                <span>
                  ¥
                  {subtotal.toLocaleString()}
                </span>

              </div>

              <div className="flex justify-between">

                <span>
                  会員値引き
                </span>

                <span className="text-red-600">
                  -¥
                  {discount.toLocaleString()}
                </span>

              </div>

              <div className="flex justify-between">

                <span>
                  消費税（10%）
                </span>

                <span>
                  ¥
                  {tax.toLocaleString()}
                </span>

              </div>

            </div>

            <div className="my-5 border-t" />

            {/* 最終金額 */}

            <div className="flex justify-between text-3xl font-bold">

              <span>
                お支払い金額
              </span>

              <span>
                ¥
                {taxIncludedTotal.toLocaleString()}
              </span>

            </div>

            {/* ボタン */}

            <div className="mt-8 grid grid-cols-2 gap-4">

              <button
                onClick={backToCart}
                className="rounded-xl border border-gray-400 px-4 py-4 font-bold"
              >
                戻る
              </button>

              <button
                onClick={completePurchase}
                disabled={isSubmitting}
                className="rounded-xl bg-black px-4 py-4 font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isSubmitting
                  ? "購入処理中..."
                  : "購入を確定"}
              </button>

            </div>

          </section>

        </main>

      </div>
    );
  }

  // ==========================================
  // POSメイン画面
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">

      {/* ヘッダー */}

      <header className="bg-black px-6 py-5 text-white">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold">
              FREAK&apos;S STORE POS
            </h1>

            <p className="text-sm text-gray-300">
              店舗レジシステム
            </p>

          </div>

          <div className="font-bold">
            staff001 / 山田
          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">

        {/* ================================== */}
        {/* 会員情報 */}
        {/* ================================== */}

        <section className="mb-6 rounded-xl bg-white p-5 shadow">

          <h2 className="mb-4 text-xl font-bold">
            会員情報
          </h2>

          <div className="flex gap-3">

            <input
              type="text"
              value={memberId}
              onChange={(e) => {

                setMemberId(
                  e.target.value
                );

                setMemberChecked(false);

                setDiscountRate(0);
              }}
              placeholder="会員IDを入力してください"
              className="flex-1 rounded-lg border border-gray-400 px-4 py-3"
            />

            <button
              onClick={checkMember}
              className="rounded-lg bg-slate-800 px-6 py-3 font-bold text-white"
            >
              会員確認
            </button>

          </div>

          <p className="mt-2 text-sm text-gray-500">

            {memberChecked && memberId ? (

              <>

                会員ID {memberId} を確認済み

                {discountRate > 0 && (

                  <span className="ml-3 font-bold text-red-600">

                    {discountRate}%OFF適用中

                  </span>

                )}

              </>

            ) : (

              "未入力の場合は非会員として処理します"

            )}

          </p>

        </section>

        {/* ================================== */}
        {/* 商品・購入リスト */}
        {/* ================================== */}

        <div className="grid gap-6 md:grid-cols-3">

          {/* 商品登録 */}

          <section className="rounded-xl bg-white p-5 shadow">

            <h2 className="mb-5 text-xl font-bold">
              商品登録
            </h2>

            <label className="mb-2 block text-sm font-medium">
              商品コード
            </label>

            <input
              type="text"
              value={productCode}
              onChange={(e) =>
                setProductCode(
                  e.target.value
                )
              }
              onKeyDown={(e) => {

                if (e.key === "Enter") {
                  addProduct();
                }

              }}
              placeholder="バーコード / 商品コード"
              className="mb-3 w-full rounded-lg border border-gray-400 px-4 py-3"
            />

            <button
              onClick={addProduct}
              className="w-full rounded-lg bg-black px-4 py-3 font-bold text-white hover:bg-gray-800"
            >
              商品を追加
            </button>

            <div className="mt-3 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
              📷 カメラでバーコードを読み取る
            </div>

          </section>

          {/* 購入リスト */}

          <section className="rounded-xl bg-white p-5 shadow md:col-span-2">

            <h2 className="mb-5 text-xl font-bold">
              購入リスト
            </h2>

            {cart.length === 0 ? (

              <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">

                商品が登録されていません

              </div>

            ) : (

              <div className="space-y-3">

                {cart.map((item) => (

                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-gray-400 p-4"
                  >

                    <div>

                      <p className="font-bold">
                        {item.name}
                      </p>

                      <p className="text-sm text-gray-500">
                        商品コード：
                        {item.productCode}
                      </p>

                      <p className="mt-1">
                        ¥
                        {item.price.toLocaleString()}
                      </p>

                    </div>

                    <div className="flex items-center gap-5">

                      <div>

                        <label className="block text-xs text-gray-500">
                          数量
                        </label>

                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={item.quantity}
                          onChange={(e) =>
                            changeQuantity(
                              item.id,
                              Number(
                                e.target.value
                              )
                            )
                          }
                          className="w-20 rounded border border-gray-400 px-3 py-2"
                        />

                      </div>

                      <div className="min-w-24 text-right font-bold">

                        ¥
                        {(
                          item.price *
                          item.quantity
                        ).toLocaleString()}

                      </div>

                      <button
                        onClick={() =>
                          deleteItem(
                            item.id
                          )
                        }
                        className="rounded-lg bg-red-100 px-4 py-3 text-red-600"
                      >
                        削除
                      </button>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </section>

        </div>

        {/* ================================== */}
        {/* 金額 */}
        {/* ================================== */}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">

          <div className="ml-auto max-w-md">

            <div className="flex justify-between py-2">

              <span>
                税抜合計
              </span>

              <span>
                ¥
                {subtotal.toLocaleString()}
              </span>

            </div>

            <div className="flex justify-between py-2 text-gray-500">

              <span>
                値引き
                {discountRate > 0 &&
                  `（会員${discountRate}%OFF）`}
              </span>

              <span className="text-red-600">
                -¥
                {discount.toLocaleString()}
              </span>

            </div>

            <div className="flex justify-between py-2 text-gray-500">

              <span>
                消費税（10%）
              </span>

              <span>
                ¥
                {tax.toLocaleString()}
              </span>

            </div>

            <div className="my-3 border-t" />

            <div className="flex justify-between text-2xl font-bold">

              <span>
                税込合計
              </span>

              <span>
                ¥
                {taxIncludedTotal.toLocaleString()}
              </span>

            </div>

            <button
              onClick={openConfirmation}
              className="mt-5 w-full rounded-xl bg-black px-4 py-4 text-lg font-bold text-white hover:bg-gray-800"
            >
              会計を確認する
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}