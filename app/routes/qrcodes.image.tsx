import type { LoaderFunctionArgs } from "react-router";
import { Buffer } from "node:buffer";
import { getQRCodeForProduct, getQRCodeImage } from "../models/QRCode.server";

// loader returns a PNG image for a given shop + product handle
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // we expect shop + handle as query params from the theme block
  const shop = url.searchParams.get("shop");
  const handle = url.searchParams.get("handle");

  // basic guards for missing params
  if (!shop || !handle) {
    return new Response("Missing shop or handle", { status: 400 });
  }

  // find the latest QR code row for this product in this shop
  const qrCode = await getQRCodeForProduct(shop, handle);

  // if no QR exists yet, we return 404
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
