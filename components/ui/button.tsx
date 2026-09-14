import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent text-sm font-display font-bold uppercase tracking-wider transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 font-extrabold tracking-widest border border-primary/50",
        outline:
          "border-border bg-card/80 text-foreground hover:border-primary hover:text-primary hover:bg-primary/10 font-bold",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60 font-semibold",
        ghost:
          "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 font-bold",
        link: "text-primary underline-offset-4 hover:underline lowercase font-sans text-xs",
      },
      size: {
        default:
          "h-10 gap-2 px-5 text-base",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-13 gap-2.5 px-7 text-lg font-black tracking-widest",
        icon: "size-10",
        "icon-xs":
          "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
