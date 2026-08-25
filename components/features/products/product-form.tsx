'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Layers,
  Award,
  AlertTriangle,
  Lock,
  Plus,
} from 'lucide-react'
import Link from 'next/link'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SafeImage } from '@/components/shared/safe-image'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { checkSkuExists, createProduct, updateProduct } from '@/app/actions/products'
import type { ProductWithDetails, UserRole } from '@/types/database'

// ─── Zod schema ──────────────────────────────────────────────────────────────
// Improvement B: base_price must be > 0
const productSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  sku: z
    .string()
    .min(3, 'El SKU es requerido (mínimo 3 caracteres)')
    .regex(
      /^[A-Za-z0-9\-_]+$/,
      'Solo letras, números, guiones y guiones bajos'
    ),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category_id: z.string().min(1, 'La talla es requerida'),
  brand_id: z.string().optional().nullable(),
  supplier_id: z.string().min(1, 'El proveedor es requerido'),
  base_price: z.coerce
    .number()
    .min(0.01, 'El precio de venta debe ser mayor que 0'),
  stock_quantity: z.coerce
    .number()
    .min(0, 'El stock no puede ser negativo')
    .default(0),
  cost: z.coerce
    .number()
    .min(0, 'El costo no puede ser negativo')
    .default(0),
})

type ProductFormValues = z.infer<typeof productSchema>

// ─── Types ────────────────────────────────────────────────────────────────────
interface CategoryOption {
  id: string
  name: string
  slug: string
  description?: string | null
}

interface BrandOption {
  id: string
  name: string
  slug: string
  description?: string | null
  logo_url?: string | null
}

interface SupplierOption {
  id: string
  name: string
}

interface ProductFormProps {
  initialProduct?: ProductWithDetails
  categories?: CategoryOption[]
  brands?: BrandOption[]
  suppliers?: SupplierOption[]
  /** Improvement G: role determines whether the cost field is shown */
  userRole?: UserRole
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ProductForm({
  initialProduct,
  categories = [],
  brands = [],
  suppliers = [],
  userRole,
}: ProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!initialProduct?.id

  // Improvement G: only admins can see/set cost
  const isAdmin = userRole === 'admin'

  // Derive initial stock & cost from the first existing variant when editing
  const initialVariant = initialProduct?.product_variants?.[0]

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: initialProduct?.name || '',
      sku: initialProduct?.sku || '',
      barcode: initialProduct?.barcode || '',
      description: initialProduct?.description || '',
      category_id: initialProduct?.category_id || '',
      brand_id: initialProduct?.brand_id || '',
      supplier_id: (initialProduct as any)?.supplier_id || '',
      base_price: initialProduct?.base_price ?? 0,
      stock_quantity: initialVariant?.stock_quantity ?? 0,
      cost: initialVariant?.cost ?? 0,
    },
  })

  const watchBrandId = form.watch('brand_id')
  const watchCategoryId = form.watch('category_id')
  const watchCost = form.watch('cost')
  const watchBasePrice = form.watch('base_price')

  const selectedBrand = brands.find((b) => b.id === watchBrandId)
  const selectedCategory = categories.find((c) => c.id === watchCategoryId)

  // Improvement E: warn when cost ≥ price (negative or zero margin)
  const hasCostWarning =
    isAdmin &&
    Number(watchCost) > 0 &&
    Number(watchBasePrice) > 0 &&
    Number(watchCost) >= Number(watchBasePrice)

  // ─── Submit handler ─────────────────────────────────────────────────────────
  async function onSubmit(data: ProductFormValues) {
    setIsLoading(true)
    try {
      // Improvement A: pre-check SKU uniqueness before hitting Supabase insert
      const { exists } = await checkSkuExists(
        data.sku,
        isEdit ? initialProduct?.id : undefined
      )
      if (exists) {
        form.setError('sku', {
          message:
            'Ya existe un producto con este SKU. Por favor usa uno diferente.',
        })
        setIsLoading(false)
        return
      }

      const payload = {
        product: {
          name: data.name,
          sku: data.sku,
          barcode: data.barcode || null,
          description: data.description || null,
          base_price: data.base_price,
          // Always a simple product — variants UI removed
          has_variants: false,
          status: 'active' as const,
          category_id: data.category_id || null,
          brand_id: data.brand_id || null,
          supplier_id: data.supplier_id || null,
        },
        // One default variant always
        variants: [
          {
            sku: `${data.sku}-DEF`,
            size: null,
            color: null,
            quality: null,
            price_override: null,
            cost: isAdmin ? Number(data.cost) : 0,
            stock_quantity: Number(data.stock_quantity),
            stock_reserved: 0,
            stock_min: 0,
            stock_max: null,
            stock_reorder_point: 0,
            is_active: true,
            additional_attrs: {},
          },
        ],
        images: [],
      }

      const result = isEdit
        ? await updateProduct(initialProduct.id, payload)
        : await createProduct(payload)

      if (result.error) {
        // Improvement D: show Supabase/server error directly to the user
        toast.error(result.error)
        // If SKU-related, also set the field error for inline feedback
        if (result.error.toLowerCase().includes('sku')) {
          form.setError('sku', { message: result.error })
        }
      } else {
        toast.success(
          isEdit
            ? 'Producto actualizado exitosamente'
            : 'Producto creado exitosamente'
        )
        // Improvement F: redirect to /productos after creation
        router.push('/productos')
        router.refresh()
      }
    } catch {
      toast.error(
        'Ocurrió un error inesperado al guardar el producto. Intenta de nuevo.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  // If there are no suppliers, show instruction card.
  if (suppliers.length === 0) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-12">
        <Card className="border-destructive bg-destructive/5 text-destructive-foreground">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2 font-display uppercase tracking-wide">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Proveedor Obligatorio Requerido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-sans">
              Debes crear al menos un proveedor en el sistema antes de agregar o editar productos.
            </p>
            <div className="pt-2">
              <Link href="/proveedores" className={buttonVariants({ variant: 'default' })}>
                Ir a Crear Proveedor
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={isEdit ? `/productos/${initialProduct.id}` : '/productos'}
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          aria-label="Volver"
          style={{
            pointerEvents: isLoading ? 'none' : 'auto',
            opacity: isLoading ? 0.4 : 1,
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            {isEdit ? 'Editar Calzado' : 'Nuevo Producto / Calzado'}
          </h1>
          <p className="text-muted-foreground">
            {isEdit
              ? 'Modifica los detalles, talla y marca del calzado'
              : 'Registra un nuevo producto con talla, marca y stock inicial'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* ── Main Column ── */}
            <div className="md:col-span-2 space-y-6">

              {/* CARD MARCA */}
              <Card className="border-primary/20 bg-card overflow-hidden shadow-md">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="h-5 w-5 text-primary" />
                    Imagen y Datos de la Marca del Producto
                  </CardTitle>
                  <CardDescription>
                    La imagen general del producto se extrae automáticamente de
                    la marca seleccionada
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {selectedBrand ? (
                    <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-background border border-border rounded-xl shadow-inner">
                      <div className="w-full md:w-56 h-40 border-2 border-border bg-white rounded-lg p-3 flex items-center justify-center shrink-0 shadow-sm">
                        <SafeImage
                          src={selectedBrand.logo_url}
                          alt={selectedBrand.name}
                          className="object-contain w-full h-full"
                        />
                      </div>
                      <div className="space-y-2 text-center md:text-left flex-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                          MARCA ASOCIADA EN TIEMPO REAL
                        </span>
                        <h3 className="text-2xl font-bold font-display text-foreground">
                          {selectedBrand.name}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {selectedBrand.description ||
                            'Sin descripción de marca registrada.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed rounded-xl text-center space-y-2 bg-muted/20">
                      <Award className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                      <p className="text-sm font-semibold text-muted-foreground">
                        Ninguna marca seleccionada aún
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Selecciona una marca en el panel lateral para asociar su
                        logo y datos a este calzado.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* INFORMACIÓN GENERAL */}
              <Card>
                <CardHeader>
                  <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Producto / Modelo *</FormLabel>
                        <FormControl>
                          <Input
                            id="product-name"
                            placeholder="Ej. Air Jordan 1 Retro High"
                            {...field}
                            value={field.value ?? ''}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU Base *</FormLabel>
                          <FormControl>
                            <Input
                              id="product-sku"
                              placeholder="Ej. AJ1-RET-01"
                              {...field}
                              value={field.value ?? ''}
                              disabled={isLoading}
                            />
                          </FormControl>
                          {/* Improvement A: inform user about uniqueness */}
                          <FormDescription className="text-[11px]">
                            Identificador único del producto
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código de Barras</FormLabel>
                          <FormControl>
                            <Input
                              id="product-barcode"
                              placeholder="Opcional"
                              {...field}
                              value={field.value ?? ''}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Input
                            id="product-description"
                            placeholder="Detalles del calzado, suela, material..."
                            {...field}
                            value={field.value ?? ''}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* PRECIO, STOCK Y COSTO */}
              <Card>
                <CardHeader>
                  <CardTitle>Precio, Stock y Costo</CardTitle>
                  <CardDescription>
                    Configura el precio de venta, las unidades iniciales y el
                    costo de adquisición del producto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Improvement B: price > 0 required */}
                  <FormField
                    control={form.control}
                    name="base_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Base de Venta (C$) *</FormLabel>
                        <FormControl>
                          <Input
                            id="product-base-price"
                            type="number"
                            step="0.01"
                            min="0.01"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          Precio al público en tienda en córdobas. Debe ser
                          mayor que 0.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <FormField
                      control={form.control}
                      name="stock_quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Inicial</FormLabel>
                          <FormControl>
                            <Input
                              id="product-stock"
                              type="number"
                              min="0"
                              step="1"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormDescription className="text-[11px]">
                            Unidades disponibles al registrar
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Improvement G: cost field only visible to admins */}
                    {isAdmin ? (
                      <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Precio de Compra (C$)</FormLabel>
                            <FormControl>
                              <Input
                                id="product-cost"
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Costo de adquisición del producto
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" />
                          Costo Unitario
                        </label>
                        <div className="h-10 px-3 rounded-md border border-input bg-muted/50 flex items-center text-sm text-muted-foreground select-none">
                          Restringido (solo administradores)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Improvement E: negative margin warning */}
                  {hasCostWarning && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">
                          Advertencia: margen negativo
                        </p>
                        <p className="text-xs mt-0.5 text-destructive/80">
                          El costo unitario (C${' '}
                          {Number(watchCost).toFixed(2)}) es igual o mayor al
                          precio de venta (C${' '}
                          {Number(watchBasePrice).toFixed(2)}). Verifica los
                          valores antes de guardar.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Sidebar ── */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="h-4 w-4 text-primary" />
                    Talla y Marca
                  </CardTitle>
                  <CardDescription>
                    Clasificación del producto en Supabase
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Categoría */}
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold flex items-center justify-between">
                          <span>Talla *</span>
                          <Link
                            href="/categorias"
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="h-3 w-3" /> Crear
                          </Link>
                        </FormLabel>
                        <select
                          id="category-select"
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          disabled={isLoading}
                        >
                          <option value="">-- Selecciona una talla --</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.description ? `(${c.description})` : ''}
                            </option>
                          ))}
                        </select>
                        {selectedCategory?.description && (
                          <p className="text-[11px] text-primary font-medium animate-in fade-in slide-in-from-top-1">
                            Descripción: {selectedCategory.description}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Marca */}
                  <FormField
                    control={form.control}
                    name="brand_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold flex items-center justify-between">
                          <span>Marca</span>
                          <Link
                            href="/marcas"
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="h-3 w-3" /> Crear
                          </Link>
                        </FormLabel>
                        <select
                          id="brand-select"
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          disabled={isLoading}
                        >
                          <option value="">-- Sin marca --</option>
                          {brands.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Proveedor */}
                  <FormField
                    control={form.control}
                    name="supplier_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold flex items-center justify-between">
                          <span>Proveedor *</span>
                          <Link
                            href="/proveedores"
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="h-3 w-3" /> Crear
                          </Link>
                        </FormLabel>
                        <select
                          id="supplier-select"
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          disabled={isLoading}
                        >
                          <option value="">-- Selecciona un proveedor --</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Improvement C: button disabled during loading, back link also locked */}
              <Button
                id="save-product-btn"
                type="submit"
                className="w-full h-12 text-base font-bold uppercase tracking-wider shadow-lg"
                size="lg"
                disabled={isLoading}
                style={{ color: 'hsl(var(--primary-foreground))' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : isEdit ? (
                  'Actualizar Producto'
                ) : (
                  'Guardar Producto'
                )}
              </Button>

              {/* Subtle saving indicator */}
              {isLoading && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  Guardando en Supabase, por favor espera...
                </p>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
