import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  HeadersFunction,
} from "react-router";
import { useLoaderData, Form, useNavigation, redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import db from "../db.server";

// --------------------
// types for loader data
// --------------------

// this is a simple shape we will pass from the loader to the React UI
type VariantOption = {
  id: string; // GraphQL id of the variant
  title: string; // variant title, e.g. "250ml"
};

type ProductOption = {
  id: string; // GraphQL id of the product
  title: string; // product name
  handle: string; // product handle used in URL
  variants: VariantOption[]; // list of variants for this product
};

type LoaderData = {
  products: ProductOption[]; // list of products with variants
};

// --------------------
// loader: runs on server
// --------------------

// this loader fetches products + variants from the Admin API
export async function loader({ request }: LoaderFunctionArgs) {
  // authenticate the admin request so we can call Admin GraphQL
  const { admin } = await authenticate.admin(request);

  // simple GraphQL query to get first 20 products and their variants
  const response = await admin.graphql(
    `
      query ReorderProductsForQR {
        products(first: 20) {
          edges {
            node {
              id
              title
              handle
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                  }
                }
              }
            }
          }
        }
      }
    `,
  );

  const { data } = await response.json();

  // we gently map the raw GraphQL data into our ProductOption[] shape
  const products: ProductOption[] =
    data?.products?.edges?.map((edge: any) => {
      const node = edge.node;
      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        variants:
          node.variants?.edges?.map((vEdge: any) => ({
            id: vEdge.node.id,
            title: vEdge.node.title,
          })) ?? [],
      };
    }) ?? [];

  // pass this clean list to the React component
  const loaderData: LoaderData = { products };
  return loaderData;
}

// --------------------
// action: handle form submit
// --------------------

// this action creates a QRCode row for the selected product + variant
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  // title for the QR code (shown in admin list)
  const title = String(formData.get("title") || "").trim();

  // this field will contain "productId|variantId|productHandle"
  const selection = formData.get("productVariant") as string | null;

  if (!selection) {
    // very basic guard for missing selection
    throw new Response("Please select a product variant.", { status: 400 });
  }

  const [productId, productVariantId, productHandle] = selection.split("|");

  // we also need the shop domain for this QR row
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // create a new QRCode row in the database
  // destination is set to "checkout" because this app is for reorders
  await db.qRCode.create({
    data: {
      title: title || "QR reorder", // fallback title if empty
      shop,
      productId,
      productHandle,
      productVariantId,
      destination: "checkout",
      // scans defaults to 0 and createdAt defaults to now() from Prisma
    },
  });

  // after creating, go back to the main /app list page
  return redirect("/app");
}

// --------------------
// React component: QR create page
// --------------------

// this is the main React UI for /app/qrcodes/new
export default function NewQRCodePage() {
  // read products from the loader
  const { products } = useLoaderData() as LoaderData;

  // this helps us show "Saving..." state on the button
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main
      style={{
        padding: "24px",
        fontFamily:
          "Poppins, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        maxWidth: "640px",
        margin: "0 auto",
      }}
    >
      {/* simple page header */}
      <header
        style={{
          marginBottom: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            marginBottom: "4px",
          }}
        >
          Create reorder QR code
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#4b5563",
          }}
        >
          Pick a product variant. This QR will send customers straight to
          checkout with that item already in their cart (good for reorders from
          the package).
        </p>
      </header>

      {/* form that posts back to this same route's action */}
      <Form method="post">
        {/* title input for the QR row */}
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="title"
            style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}
          >
            QR title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="Shampoo 250ml reorder"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
            }}
          />
          <p
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginTop: "4px",
            }}
          >
            This name only appears in the admin list, to help you recognize the
            QR later.
          </p>
        </div>

        {/* product + variant select */}
        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="productVariant"
            style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}
          >
            Product and variant
          </label>
          <select
            id="productVariant"
            name="productVariant"
            required
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
            }}
          >
            <option value="">Select a product variant</option>

            {/* here we flatten products + variants into one list */}
            {products.map((product) =>
              product.variants.map((variant) => (
                <option
                  key={variant.id}
                  // we pack productId | variantId | handle into one field
                  value={`${product.id}|${variant.id}|${product.handle}`}
                >
                  {product.title} — {variant.title}
                </option>
              )),
            )}
          </select>
          <p
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginTop: "4px",
            }}
          >
            The QR will always send customers to checkout with this exact
            variant in the cart.
          </p>
        </div>

        {/* submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#111827",
            color: "white",
            fontSize: "14px",
            cursor: isSubmitting ? "default" : "pointer",
          }}
        >
          {isSubmitting ? "Creating..." : "Create QR code"}
        </button>
      </Form>
    </main>
  );
}

// this keeps Shopify’s special headers working for redirects and errors
export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
