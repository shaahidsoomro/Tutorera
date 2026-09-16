import { getMarketByRoute } from "@/lib/markets";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  params: Promise<{ countryCode: string }>;
}

export default async function CountryMarketLayout({ children, params }: Props) {
  const { countryCode } = await params;
  if (!getMarketByRoute(countryCode)) notFound();
  return children;
}
