// this file is for simple helper functions for our discount feature

import invariant from "tiny-invariant";
import db from "../db.server";

// creates 1 discount row in the database
export async function createProductDiscount(input: {
  shop: string;
  title: string;
  percentage: number;
  productId: string;
}) {
  const { shop, title, percentage, productId } = input;

  // basic safety checks
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

// get all discounts for a shop (for listing in admin page)
export async function listProductDiscounts(shop: string) {
  return db.productDiscount.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
}

// get one discount for one product (used by storefront)
export async function getDiscountForProduct(input: {
  shop: string;
  productId: string;
}) {
  const { shop, productId } = input;

  return db.productDiscount.findFirst({
    where: {
      shop,
      productId,
    },
  });
}
