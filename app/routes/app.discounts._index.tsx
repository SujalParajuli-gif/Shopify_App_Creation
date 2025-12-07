import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  HeadersFunction,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import {
  createProductDiscount,
  listProductDiscounts,
} from "../models/discount.server";

// runs on server before the page loads
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const discounts = await listProductDiscounts(shop);

  // just return a plain object
  return { discounts };
}

// runs when our form does POST rqs
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();

  const title = String(formData.get("title") || "");
  const percentage = Number(formData.get("percentage") || 0);
  const productId = String(formData.get("productId") || "");

  await createProductDiscount({
    shop,
    title,
    percentage,
    productId,
  });

  // simple redirect back to this page
  return new Response(null, {
    status: 302,
    headers: { Location: "/app/discounts" },
  });
}

// React part (client side)
export default function DiscountsIndex() {
  // we know loader returned { discounts }
  const { discounts } = useLoaderData() as { discounts: any[] };

  return (
    <main style={{ padding: "24px", maxWidth: "800px" }}>
      <h1
        style={{
          fontSize: "22px",
          fontWeight: 600,
          marginBottom: "16px",
        }}
      >
        Product discounts (demo)
      </h1>

      {/* Form html */}
      <section
        style={{
          marginBottom: "24px",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          Create discount
        </h2>

        <form method="post">
          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>
              Title
            </label>
            <input
              name="title"
              placeholder="Winter sale 10% off"
              style={{ width: "100%", padding: "6px" }}
            />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>
              Percentage (%)
            </label>
            <input
              name="percentage"
              type="number"
              min={1}
              max={100}
              placeholder="10"
              style={{ width: "100%", padding: "6px" }}
            />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>
              Product GID
            </label>
            <input
              name="productId"
              placeholder="gid://shopify/Product/1234567890"
              style={{
                width: "100%",
                padding: "6px",
                fontFamily: "monospace",
              }}
            />
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
              For now paste the product's GraphQL ID here. Later we can add a
              proper product picker.
            </p>
          </div>

          <button
            type="submit"
            style={{
              marginTop: "8px",
              padding: "8px 14px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#111827",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Save discount
          </button>
        </form>
      </section>

      <section>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          Existing discounts
        </h2>

        {(!discounts || discounts.length === 0) && (
          <p style={{ fontSize: "14px" }}>No discounts yet.</p>
        )}

        {discounts && discounts.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e5e7eb",
              fontSize: "14px",
            }}
          >
            <thead style={{ backgroundColor: "#f9fafb" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>Title</th>
                <th style={{ textAlign: "left", padding: "8px" }}>%</th>
                <th style={{ textAlign: "left", padding: "8px" }}>
                  Product GID
                </th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d: any) => (
                <tr key={d.id}>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {d.title}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {d.percentage}%
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                      fontFamily: "monospace",
                      fontSize: "12px",
                    }}
                  >
                    {d.productId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

// same as your other routes, this keeps Shopify headers working
export const headers: HeadersFunction = (args) => boundary.headers(args);
