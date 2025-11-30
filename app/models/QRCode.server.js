import qrcode from "qrcode";              // this library creates QR code image data
import invariant from "tiny-invariant";   // this helps throw clear errors
import db from "../db.server";            // this is the Prisma client already set up

// this function gets one QR code by id and also loads product data later
// Looks up one QR by id in the QRCode table.
// If not found → returns null.
// If found → calls supplementQRCode to attach product info + QR image
export async function getQRCode(id, graphql) {
  // findFirst will look up one row in the QRCode table that matches the id
  const qrCode = await db.qRCode.findFirst({
    where: { id: id }, // using id: id so it feels more explicit
  });

  // if no QR code is found, we return null so the UI can show "not found"
  if (!qrCode) {
    return null;
  }

  // this helper will add more info to the QR code (product info, image, etc.)
  const fullQRCode = await supplementQRCode(qrCode, graphql);
  return fullQRCode;
}

// this function gets all QRs for a specific shop (used for the main list page)
export async function getQRCodes(shop, graphql) {
  // get all QR codes that belong to this shop
  const qrCodes = await db.qRCode.findMany({
    where: { shop: shop },  // only rows for this shop
    orderBy: { id: "desc" } // newest first
  });

  // if the shop has no QR codes yet, just return an empty list
  if (qrCodes.length === 0) {
    return [];
  }

  // we create a new list and fill it one by one
  // this is easy to read even if it is not the most optimized
  const fullQRCodes = [];

  for (const qrCode of qrCodes) {
    const fullQRCode = await supplementQRCode(qrCode, graphql);
    fullQRCodes.push(fullQRCode);
  }

  // final list of QR codes with product info + image
  return fullQRCodes;
}

// finds the latest QR code row for a given shop + product
// this is used by the theme app extension to show the QR on product pages
export async function getQRCodeForProduct(shop, productHandle) {
  // pick the newest QR created for this product in this shop
  // (in case there are multiple QR rows for the same product)
  const qrCode = await db.qRCode.findFirst({
    where: {
      shop,
      productHandle, // now matching by handle instead of productId
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // can be null if no QR exists yet for this product
  return qrCode;
}

// this helper builds a QR image as a data URL that the React UI can show
export function getQRCodeImage(id) {
  // the scan URL is where customers will land when they scan the code
  const baseUrl = process.env.SHOPIFY_APP_URL;

  if (!baseUrl) {
    // small safety check so we don't generate broken URLs silently
    throw new Error("SHOPIFY_APP_URL is not set in the environment");
  }

  const url = new URL(`/qrcodes/${id}/scan`, baseUrl);

  // qrcode.toDataURL gives us a base64 image string we can put inside <img src="...">
  return qrcode.toDataURL(url.href);
}

// this helper figures out where this QR should send customers
export function getDestinationUrl(qrCode) {
  // "product" means send to the product page
  // In this app we are focusing on "reorder" use case,
  // so we always send the customer straight to checkout with the product alr inside there cart
  // So it shows products already in the cart instead of showing the product page first.

  // we expect a variant id and build a "direct to checkout" URL
  const regex = /gid:\/\/shopify\/ProductVariant\/([0-9]+)/;
  const match = regex.exec(qrCode.productVariantId);

  // invariant makes sure the variant id has the shape we expect
  invariant(match, "Unrecognized product variant ID");

  const variantIdNumber = match[1];

  // this URL sends the customer straight to cart with quantity 1 of that variant
  // this is perfect for reorders from a QR printed on the product itself
  const url = `https://${qrCode.shop}/cart/${variantIdNumber}:1`;
  return url;
}

// this internal function adds extra data (image + product info) to a QR row
async function supplementQRCode(qrCode, graphql) {
  // build QR image in parallel with the GraphQL product request
  const qrCodeImagePromise = getQRCodeImage(qrCode.id);

  // here we ask the Admin API for product + variant info using GraphQL
  const response = await graphql(
    `
      query ProductData($id: ID!, $variantId: ID!) {
        product(id: $id) {
          title
          featuredImage {
            url
          }
        }
        productVariant(id: $variantId) {
          price
        }
      }
    `,
    {
      variables: {
        id: qrCode.productId,
        variantId: qrCode.productVariantId,
      },
    }
  );

  const json = await response.json();
  const data = json.data;

  const product = data ? data.product : null;
  const productVariant = data ? data.productVariant : null;

  const qrImage = await qrCodeImagePromise;

  // we return one merged object that the React UI can easily render
  return {
    // all fields from the database row
    ...qrCode,

    // base64 image data for the QR
    qrImage,

    // product name for display
    productTitle: product ? product.title : undefined,

    // product image url
    productImage:
      product && product.featuredImage
        ? product.featuredImage.url
        : undefined,

    // price is now a simple scalar value
    price: productVariant ? productVariant.price : undefined,
  };
}

// this helper is used by the public scan route (no GraphQL needed here)
export async function getQRCodeRecord(id) {
  // only fetches the DB row, no extra product info
  const qrCode = await db.qRCode.findFirst({
    where: { id: id },
  });

  return qrCode;
}

// this helper increments the scan counter for a QR row
export async function recordScan(qrCode) {
  // uses Prisma's increment to add 1 to scans
  const updatedQRCode = await db.qRCode.update({
    where: { id: qrCode.id },
    data: {
      scans: {
        increment: 1,
      },
    },
  });

  return updatedQRCode;
}
