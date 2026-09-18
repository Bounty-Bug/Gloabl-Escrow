import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(value: string | number | null | undefined): string {
  const amount = typeof value === "number" ? value : Number.parseFloat(value ?? "")
  if (!Number.isFinite(amount)) return "0.00"

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
