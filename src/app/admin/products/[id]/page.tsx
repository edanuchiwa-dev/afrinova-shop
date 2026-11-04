import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/db';
import { isTursoEnabled, tursoGetProductById } from '@/lib/turso';
import ShopifyProductForm, { ProductData } from '@/components/admin/ShopifyProductForm';

export const metadata = {
  title: 'Modifier le produit — Admin Shopify Style',
};

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);

  if (!Number.isSafeInteger(numId) || numId <= 0) {
    notFound();
  }

  const product = isTursoEnabled() ? await tursoGetProductById(numId) : getProductById(numId);
  if (!product) {
    notFound();
  }

  const productData: ProductData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    price: product.price,
    compare_at_price: product.compare_at_price ?? null,
    cost_per_item: product.cost_per_item ?? null,
    stock: product.stock,
    sku: product.sku || '',
    barcode: product.barcode || '',
    track_quantity: product.track_quantity !== undefined ? Boolean(product.track_quantity) : true,
    continue_selling_out_of_stock: Boolean(product.continue_selling_out_of_stock),
    category: product.category,
    image_url: product.image_url,
    media_urls: product.media_urls || (product.image_url ? [product.image_url] : []),
    weight_kg: product.weight_kg,
    is_physical: product.is_physical !== undefined ? Boolean(product.is_physical) : true,
    vendor: product.vendor || '',
    tags: product.tags || '',
    seo_title: product.seo_title || '',
    seo_description: product.seo_description || '',
    variants: product.variants || '[]',
    sales_channels: product.sales_channels || '["online_store","whatsapp","ads"]',
    status: (product.status as 'active' | 'draft' | 'archived') || 'active',
  };

  return <ShopifyProductForm initialData={productData} isEdit={true} />;
}
