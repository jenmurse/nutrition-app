import { APP_NAME } from "@/lib/brand";

interface BrandNameProps {
  className?: string;
}

/**
 * Renders the app name. Use className to control size and style per context.
 * Changing APP_NAME in lib/brand.ts updates every instance.
 */
export function BrandName({ className }: BrandNameProps) {
  return <span className={className}>{APP_NAME}</span>;
}
