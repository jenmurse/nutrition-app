import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import {
  type ParsedIngredient,
  type ParsedRecipe,
  matchIngredients,
} from "../../../../../lib/ingredientMatcher";
import { getAuthenticatedHousehold } from "@/lib/auth";

function unicodeFractionToDecimal(token: string): number | null {
  const map: Record<string, number> = {
    "\u00bc": 0.25,
    "\u00bd": 0.5,
    "\u00be": 0.75,
    "\u2150": 1 / 7,
    "\u2151": 1 / 9,
    "\u2152": 1 / 10,
    "\u2153": 1 / 3,
    "\u2154": 2 / 3,
    "\u2155": 1 / 5,
    "\u2156": 2 / 5,
    "\u2157": 3 / 5,
    "\u2158": 4 / 5,
    "\u2159": 1 / 6,
    "\u215a": 5 / 6,
    "\u215b": 1 / 8,
    "\u215c": 3 / 8,
    "\u215d": 5 / 8,
    "\u215e": 7 / 8,
  };
  return map[token] ?? null;
}

function parseLeadingQuantity(text: string): { quantity: number; rest: string } {
  const trimmed = text.trim();
  if (!trimmed) return { quantity: 0, rest: "" };

  const parts = trimmed.split(/\s+/);
  let qty = 0;
  let consumed = 0;

  const first = parts[0];
  const firstFraction = unicodeFractionToDecimal(first);
  if (firstFraction !== null) {
    qty = firstFraction;
    consumed = 1;
  } else if (/^\d+(?:\.\d+)?$/.test(first)) {
    qty = Number(first);
    consumed = 1;

    const second = parts[1];
    if (second && /^\d+\/\d+$/.test(second)) {
      const [num, den] = second.split("/").map(Number);
      if (den) {
        qty += num / den;
        consumed = 2;
      }
    } else if (second) {
      const secondFraction = unicodeFractionToDecimal(second);
      if (secondFraction !== null) {
        qty += secondFraction;
        consumed = 2;
      }
    }
  } else {
    const match = first.match(/^(\d+)([\u00bc\u00bd\u00be\u2150-\u215e])$/);
    if (match) {
      const whole = Number(match[1]);
      const frac = unicodeFractionToDecimal(match[2]);
      if (frac !== null) {
        qty = whole + frac;
        consumed = 1;
      }
    }
  }

  const rest = parts.slice(consumed).join(" ").trim();
  return { quantity: qty, rest };
}

function parseUnitAndName(text: string): { unit: string; nameGuess: string } {
  const unitMap: Record<string, string> = {
    tsp: "tsp",
    teaspoon: "tsp",
    teaspoons: "tsp",
    tbsp: "tbsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    cup: "cup",
    cups: "cup",
    oz: "oz",
    ounce: "oz",
    ounces: "oz",
    lb: "lb",
    lbs: "lb",
    pound: "lb",
    pounds: "lb",
    g: "g",
    gram: "g",
    grams: "g",
    kg: "kg",
    ml: "ml",
    l: "l",
    liter: "l",
    liters: "l",
    pinch: "pinch",
    clove: "clove",
    cloves: "clove",
  };

  const parts = text.trim().split(/\s+/);
  if (parts.length === 0) return { unit: "", nameGuess: "" };

  const first = parts[0].toLowerCase();
  const normalizedUnit = unitMap[first];
  if (normalizedUnit) {
    return { unit: normalizedUnit, nameGuess: parts.slice(1).join(" ").trim() };
  }

  return { unit: "", nameGuess: text.trim() };
}

function parseIngredientLine(line: string, section: string | null): ParsedIngredient {
  const originalText = line.replace(/^[-*]\s+/, "").trim();
  const { quantity, rest } = parseLeadingQuantity(originalText);
  const { unit, nameGuess } = parseUnitAndName(rest);

  return {
    originalText,
    quantity: quantity || 0,
    unit,
    nameGuess,
    section,
  };
}

function parsePestleMarkdown(markdown: string): ParsedRecipe {
  const lines = markdown.split(/\r?\n/);
  const titleLine = lines.find((l) => l.trim().startsWith("# ")) || "# Untitled Recipe";
  const name = titleLine.replace(/^#\s+/, "").trim().replace(/^"|"$/g, "");

  let servingSize = 1;
  let servingUnit = "servings";
  for (const line of lines) {
    const match = line.match(/^\*\*Servings\*\*\s+(.+)$/i);
    if (match) {
      const num = Number(match[1]);
      if (!Number.isNaN(num) && num > 0) servingSize = num;
    }
  }

  let inIngredients = false;
  let inInstructions = false;
  let currentSection: string | null = null;
  const ingredients: ParsedIngredient[] = [];
  const instructionsLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      const heading = trimmed.replace(/^##\s+/, "").toLowerCase();
      inIngredients = heading === "ingredients";
      inInstructions = heading === "instructions";
      currentSection = null;
      continue;
    }

    if (inIngredients) {
      if (trimmed.startsWith("### ")) {
        currentSection = trimmed.replace(/^###\s+/, "").trim();
        continue;
      }
      if (/^[-*]\s+/.test(trimmed)) {
        ingredients.push(parseIngredientLine(trimmed, currentSection));
      }
    } else if (inInstructions) {
      instructionsLines.push(line);
    }
  }

  const instructions = instructionsLines.join("\n").trim();

  return {
    name,
    servingSize,
    servingUnit,
    instructions,
    sourceApp: "Pestle",
    ingredients,
    isComplete: false,
  };
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const markdown = typeof body?.markdown === "string" ? body.markdown : "";
    if (!markdown.trim()) return NextResponse.json({ error: "Markdown required" }, { status: 400 });

    const parsed = parsePestleMarkdown(markdown);
    const ingredients = await prisma.ingredient.findMany({ where: { householdId: auth.householdId }, select: { id: true, name: true } });
    const matched = matchIngredients(parsed, ingredients);

    return NextResponse.json(matched);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to parse Pestle markdown" }, { status: 500 });
  }
}
