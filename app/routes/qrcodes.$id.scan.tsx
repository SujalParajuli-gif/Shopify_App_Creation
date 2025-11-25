// app/routes/qrcodes.$id.scan.tsx

import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  getQRCodeRecord,
  getDestinationUrl,
  recordScan,
} from "../models/QRCode.server";

// loader runs when a customer scans the QR and hits /qrcodes/:id/scan
export async function loader({ params }: LoaderFunctionArgs) {
  // read the id from the URL /qrcodes/:id/scan
  const idParam = params.id;

  // basic guard for missing ids
  if (!idParam) {
    throw new Response("Missing QR code id", { status: 400 });
  }

  // convert the id string to a number (because Prisma uses Int id)
  const id = Number(idParam);
  if (Number.isNaN(id)) {
    throw new Response("Invalid QR code id", { status: 400 });
  }

  // get the raw QR row from the database
  const qrCode = await getQRCodeRecord(id);

  // if no row is found, show a 404 style response
  if (!qrCode) {
    throw new Response("QR code not found", { status: 404 });
  }

  // figure out where this QR should send the customer (checkout URL)
  const destination = getDestinationUrl(qrCode);

  // bump the scan counter so the admin list can show "scans"
  await recordScan(qrCode);

  // finally send the customer to the shop's checkout/cart URL
  return redirect(destination);
}

// keep Shopify's special headers working (same pattern as /app route)
export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
