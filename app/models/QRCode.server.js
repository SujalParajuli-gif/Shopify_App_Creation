import qrcode from "qrcode";              // this library creates QR code image data
import invariant from "tiny-invariant";   // this helps throw clear errors
import db from "../db.server";            // this is the Prisma client already set up

// this function gets one QR code by id and also loads product data later
//Looks up one QR by id in the QRCode table.

//If not found → returns null.

//If found → calls supplementQRCode to attach product info + QR image
export async function getQRCode(id, graphql) {
  // findFirst will look up one row in the QRCode table that matches the id
  const qrCode = await db.qRCode.findFirst({ where: { id } });

  // if no QR code is found, we return null so the UI can show "not found"
  if (!qrCode) {
    return null;
  }

  // this helper will add more info to the QR code (product info, image, etc.)
  return supplementQRCode(qrCode, graphql);
}

// this function gets all QRs for a specific shop (used for the main list page)
export async function getQRCodes(shop, graphql) {
  const qrCodes = await db.qRCode.findMany({
    where: { shop },         // only rows for this shop
    orderBy: { id: "desc" }, // newest first
  });

  // if the shop has no QR codes yet, just return an empty list
  if (qrCodes.length === 0) return [];

  // we map each raw QR row into a "full" QR with product info + image
  return Promise.all(qrCodes.map((qrCode) => supplementQRCode(qrCode, graphql)));
}

// this helper builds a QR image as a data URL that the React UI can show
export function getQRCodeImage(id) {
  // the scan URL is where customers will land when they scan the code
  const url = new URL(`/qrcodes/${id}/scan`, process.env.SHOPIFY_APP_URL);

  // qrcode.toDataURL gives us a base64 image string we can put inside <img src="...">
  return qrcode.toDataURL(url.href);
}

// this helper figures out where this QR should send customers
export function getDestinationUrl(qrCode) {
  // "product" means send to the product page
  // NOTE: in this version of the app we are focusing on "reorder" use case,
  // so we always send the customer straight to checkout/cart with the product
  // already in the cart instead of showing the product page first.

  // we expect a variant id and build a "direct to checkout" URL
  const match = /gid:\/\/shopify\/ProductVariant\/([0-9]+)/.exec(
    qrCode.productVariantId,
  );

  // invariant makes sure the variant id has the shape we expect
  invariant(match, "Unrecognized product variant ID");

  // this URL sends the customer straight to cart with quantity 1 of that variant
  // this is perfect for reorders from a QR printed on the product itself
  return `https://${qrCode.shop}/cart/${match[1]}:1`;
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
    },
  );

  const {
    data: { product, productVariant },
  } = await response.json();

  const qrImage = await qrCodeImagePromise;

  // we return one merged object that the React UI can easily render
  return {
    ...qrCode,                      // all fields from the database row
    qrImage,                        // base64 image data for the QR
    productTitle: product?.title,   // product name for display
    productImage: product?.featuredImage?.url, // product image url
    price: productVariant?.price,   // price is now a simple scalar value
  };
}

// this helper is used by the public scan route (no GraphQL needed here)
export async function getQRCodeRecord(id) {
  // only fetches the DB row, no extra product info
  return db.qRCode.findFirst({ where: { id } });
}

// this helper increments the scan counter for a QR row
export async function recordScan(qrCode) {
  // uses Prisma's increment to add 1 to scans
  return db.qRCode.update({
    where: { id: qrCode.id },
    data: {
      scans: {
        increment: 1,
      },
    },
  });
}
