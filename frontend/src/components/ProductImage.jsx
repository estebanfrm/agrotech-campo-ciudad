import { Package } from "lucide-react";
import { useEffect, useState } from "react";

export default function ProductImage({ product, iconSize = 54, className = "" }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [product.image_url]);

  if (product.image_url && !failed) {
    return (
      <img
        className={`h-full w-full object-cover ${className}`}
        src={product.image_url}
        alt={product.nombre}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex h-full items-center justify-center bg-gradient-to-br from-mint to-wheat text-forest ${className}`}
      data-testid="product-image-placeholder"
    >
      <Package size={iconSize} />
    </div>
  );
}
