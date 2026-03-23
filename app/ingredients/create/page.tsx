"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateIngredientPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ingredients?mode=create");
  }, [router]);

  return null;
}
