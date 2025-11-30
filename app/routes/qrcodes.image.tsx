import type { LoaderFunctionArgs } from "react-router";
import { Buffer } from "node:buffer";
import { getQRCodeForProduct, getQRCodeImage } from "../models/QRCode.server";

// loader returns a PNG image for a given shop + productId
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // we expect shop + productId as query params from the theme block
  const shop = url.searchParams.get("shop");
  const productId = url.searchParams.get("productId");

  // basic guards for missing params
  if (!shop || !productId) {
    return new Response("Missing shop or productId", { status: 400 });
  }

  // find the latest QR code row for this product in this shop
  const qrCode = await getQRCodeForProduct(shop, productId);

  // if no QR exists yet, we return 404 so when the img fails it shows an errors
  if (!qrCode) {
    return new Response("No QR code found for this product", { status: 404 });
  }

  // this helper creates a data URL for the scan URL (/qrcodes/:id/scan)
  const dataUrl = await getQRCodeImage(qrCode.id);
  // dataUrl looks like: "data:image/png;base64,AAA..."
  const [, base64] = dataUrl.split(",");

  // convert base64 string into raw PNG bytes
  const pngBuffer = Buffer.from(base64, "base64");

  // return an actual PNG image that <img src="..."> can display
  return new Response(pngBuffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
    },
  });
}
