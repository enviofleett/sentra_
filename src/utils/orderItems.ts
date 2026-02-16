export type NormalizedOrderItem = {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  image_url: string | null;
  vendor_id: string | null;
  vendor_name?: string | null;
};

function toNumber(value: unknown, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function normalizeOrderItem(raw: any): NormalizedOrderItem {
  const product = raw?.product && typeof raw.product === "object" ? raw.product : null;
  const name = raw?.name ?? raw?.product_name ?? product?.name ?? "Product";
  const productId = raw?.product_id ?? product?.id ?? "";
  const vendorId = raw?.vendor_id ?? product?.vendor_id ?? null;
  const vendorName = raw?.vendor_name ?? product?.vendor?.rep_full_name ?? null;
  const imageUrl = raw?.image_url ?? product?.image_url ?? null;
  const price = toNumber(raw?.price ?? product?.price ?? 0, 0);
  const quantity = Math.max(1, Math.floor(toNumber(raw?.quantity ?? 1, 1)));

  return {
    product_id: String(productId || ""),
    name: String(name || "Product"),
    quantity,
    price,
    image_url: imageUrl ? String(imageUrl) : null,
    vendor_id: vendorId ? String(vendorId) : null,
    vendor_name: vendorName ? String(vendorName) : null,
  };
}

export function normalizeOrderItems(rawItems: any[]): NormalizedOrderItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item) => normalizeOrderItem(item));
}
