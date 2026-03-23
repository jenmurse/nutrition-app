"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function IngredientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  useEffect(() => {
    if (id) {
      router.replace(`/ingredients?selected=${id}`);
    } else {
      router.replace("/ingredients");
    }
  }, [id, router]);

  return null;
}
