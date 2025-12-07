// this file contains server side reusable helper functions
// for discount calculation and logics

import invariant from "tiny-invariant";
import db from "../db.server";

// this file is like QRCode.server.ts but for simple product discounts

export interface CreateProductDiscountInput {
  shop: string;
  title: string;
  percentage: number;
  productId: string; // Shopify product GID
}

// creating  a new product discount row
export async function createProductDiscount({
  shop,
  title,
  percentage,
  productId,
}: CreateProductDiscountInput) {
  invariant(shop, "shop is required");
  invariant(title, "title is required");
  invariant(productId, "productId is required");

  const percentNumber = Number(percentage);
  invariant(!Number.isNaN(percentNumber), "percentage must be a number");

  const discount = await db.productDiscount.create({
    data: {
      shop,
      title,
      percentage: percentNumber,
      productId,
    },
  });

  return discount;
}

// get a list of discounts for one shop (for admin list view)
export async function listProductDiscounts(shop: string) {
  return db.productDiscount.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
}

// find discount for a single product (used by theme app extension)
export async function getDiscountForProduct(args: {
  shop: string;
  productId: string;
}) {
  const { shop, productId } = args;

  return db.productDiscount.findFirst({
    where: {
      shop,
      productId,
    },
  });
}
