import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getQRCodes } from "../models/QRCode.server";

// small helper type for the data this page expects
type LoaderData = {
  // this will be whatever getQRCodes returns (array of qr records)
  qrCodes: Awaited<ReturnType<typeof getQRCodes>>;
};

// loader runs on the server before the page renders
export async function loader({ request }: LoaderFunctionArgs) {
  // this checks the admin session and gives us an Admin API client
  const { admin, session } = await authenticate.admin(request);

  // this helper talks to Prisma + Admin GraphQL and returns QR code list
  const qrCodes = await getQRCodes(session.shop, admin.graphql);

  // we send this object to the React component below
  return { qrCodes };
}

// main React component for the /app home route
export default function QRIndexPage() {
  // get the loader data typed as LoaderData
  const { qrCodes } = useLoaderData() as LoaderData;

  const hasQrCodes = qrCodes && qrCodes.length > 0;

  return (
    <main
      style={{
        padding: "24px",
        // using Poppins for this page
        fontFamily:
          "Poppins, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* simple header area */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
          }}
        >
          QR codes
        </h1>

        {/* link to the create/edit page (we’ll build /app/qrcodes/new next) */}
        <Link
          to="/app/qrcodes/new"
          style={{
            padding: "8px 14px",
            borderRadius: "6px",
            backgroundColor: "#111827",
            color: "white",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          + Create QR code
        </Link>
      </header>

      {/* if there are no QR codes yet, show a friendly empty state */}
      {!hasQrCodes ? (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "24px",
            backgroundColor: "#f9fafb",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            No QR codes yet
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#4b5563",
            }}
          >
            Create a QR code that links to a product or checkout. When a
            customer scans it, we'll track the scan and redirect them.
          </p>
        </section>
      ) : (
        // if we DO have QR codes,we show them in a simple table
        <section>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              fontSize: "14px",
            }}
          >
            <thead style={{ backgroundColor: "#f3f4f6" }}>
              <tr>
                {/* new column for QR preview + download */}
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    width: "90px",
                  }}
                >
                  QR
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    width: "30%",
                  }}
                >
                  Title
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    width: "35%",
                  }}
                >
                  Product
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                  }}
                >
                  Date created
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "10px 12px",
                  }}
                >
                  Scans
                </th>
              </tr>
            </thead>
            <tbody>
              {qrCodes.map((qr: any) => (
                // each row links to the edit page for that QR code
                <tr key={qr.id}>
                  {/* QR preview + download link */}
                  <td
                    style={{
                      padding: "9px 12px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {qr.qrImage ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "4px",
                        }}
                      >
                        {/* small QR preview image */}
                        <img
                          src={qr.qrImage}
                          alt="QR code"
                          style={{
                            width: "56px",
                            height: "56px",
                            objectFit: "contain",
                            borderRadius: "4px",
                            border: "1px solid #e5e7eb",
                            backgroundColor: "#ffffff",
                          }}
                        />
                        {/* download link that saves qr-<id>.png */}
                        <a
                          href={qr.qrImage}
                          download={`qr-${qr.id}.png`}
                          style={{
                            fontSize: "12px",
                            color: "#2563eb",
                            textDecoration: "none",
                          }}
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td
                    style={{
                      padding: "9px 12px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <Link
                      to={`/app/qrcodes/${qr.id}`}
                      style={{ textDecoration: "none", color: "#111827" }}
                    >
                      {qr.title || "(no title)"}
                    </Link>
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {qr.productDeleted
                      ? "Product deleted"
                      : qr.productTitle || "-"}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {qr.createdAt
                      ? new Date(qr.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      borderTop: "1px solid #e5e7eb",
                      textAlign: "right",
                    }}
                  >
                    {qr.scans ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

// this keeps Shopify’s special headers working for redirects and errors
export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
