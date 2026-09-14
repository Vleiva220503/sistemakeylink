'use client'

import { useRouter } from 'next/navigation'
import { DeleteWithConfirm } from '@/components/shared/delete-confirm-dialog'
import { deleteProductSafe } from '@/app/actions/products'

interface DeleteProductButtonProps {
  productId: string
  productName: string
  totalStock: number
}

export function DeleteProductButton({
  productId,
  productName,
  totalStock,
}: DeleteProductButtonProps) {
  const router = useRouter()

  return (
    <DeleteWithConfirm
      itemName={productName}
      itemType="producto"
      stockAmount={totalStock}
      size="default"
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteProductSafe(productId)
        if (result.success) {
          // Redirect out of the now-deleted product detail page
          router.push('/productos')
        }
        return result
      }}
    />
  )
}
