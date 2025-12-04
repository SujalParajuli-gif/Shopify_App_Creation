//this file contents server side reusable helper functions for discount calculation and logics

import invariant from "tiny-invariant";
import db from "../db.server";

//  this file is like QRCode.server.ts but for simple product discounts

export interface CreateProductDiscountInput {
  shop: string;
  title: string;
  percentage: number;
  productId: string;
}

// create a new product discount row
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
}
