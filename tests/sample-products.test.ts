import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { applyAction, sampleWorkspace } from "../src/lib/workspaces/model";

test("fictional sample catalog has twelve editable, distinct, image-backed products", () => {
  const workspace = sampleWorkspace();
  const products = workspace.products ?? [];
  assert.equal(products.length, 12);
  assert.equal(new Set(products.map((product) => product.id)).size, 12);
  assert.deepEqual(new Set(products.map((product) => product.category)), new Set(["Hair care", "Skin care", "Makeup", "Nails & spa"]));
  for (const product of products) {
    assert(product.published && product.pricePKR > 0 && product.version === 1);
    assert(product.imageDataUrl?.startsWith("/images/"));
    assert(existsSync(join(process.cwd(), "public", product.imageDataUrl!)), `${product.name} image exists`);
  }
  const original = products[0];
  const edited = applyAction(workspace, { type: "shop.product.save", product: { ...original, pricePKR: original.pricePKR + 100, published: false } });
  assert.equal(edited.products?.[0].version, 2);
  assert.equal(edited.products?.[0].published, false);
  assert.equal(sampleWorkspace().products?.[0].pricePKR, original.pricePKR, "editing never changes the seed template");
  const deleted = applyAction(edited, { type: "shop.product.delete", id: original.id, version: 2 });
  assert.equal(deleted.products?.length, 11);
  assert(!deleted.products?.some((product) => product.id === original.id), "deleted examples stay deleted in that workspace");
});
