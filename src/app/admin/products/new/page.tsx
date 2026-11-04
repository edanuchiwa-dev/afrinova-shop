import ShopifyProductForm from '@/components/admin/ShopifyProductForm';

export const metadata = {
  title: 'Ajouter un produit — Admin Shopify Style',
};

export default function NewProductPage() {
  return <ShopifyProductForm isEdit={false} />;
}
