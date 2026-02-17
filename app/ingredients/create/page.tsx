"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import IngredientForm from "../../components/IngredientForm";

export default function CreateIngredientPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <a href="/ingredients" className="text-blue-600 hover:underline text-sm">
          ← Back to ingredients
        </a>
      </div>
      <h1 className="text-2xl font-semibold mb-6">Create New Ingredient</h1>
      
      <Suspense fallback={<div>Loading...</div>}>
        <IngredientForm
          onCreated={() => {
            router.push("/ingredients");
          }}
        />
      </Suspense>
    </div>
  );
}
