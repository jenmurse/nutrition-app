'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePersonContext } from '@/app/components/PersonContext';
import { clientCache } from '@/lib/clientCache';
import { toast } from '@/lib/toast';

interface MealLog {
  id: number;
  recipe?: { id: number };
}

interface MealPlan {
  id: number;
  weekStartDate: string;
  shoppingChecked?: string;
  mealLogs?: MealLog[];
}

interface ShopItem {
  name: string;
  qty: number;
  unit: string;
  category: string;
}

function parseUTCDate(dateStr: string | Date): Date {
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function fmtQty(n: number): string {
  if (n === Math.floor(n)) return String(Math.floor(n));
  return Number(n.toFixed(2)).toString();
}

const CATEGORY_ORDER = [
  'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Grains, Pasta & Bread',
  'Legumes', 'Baking', 'Nuts & Seeds', 'Spices & Seasonings',
  'Condiments & Sauces', 'Oils & Fats', 'Frozen', 'Canned & Jarred',
  'Beverages', 'Alcohol', 'Snacks',
];

const SHARE_CAT_ORDER = CATEGORY_ORDER;

export default function ShoppingPage() {
  const { selectedPersonId } = usePersonContext();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [weekRange, setWeekRange] = useState('');
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopLoading, setShopLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [hideChecked, setHideChecked] = useState(false);

  // Prevent browser navigation from leaving focus on first list item
  useEffect(() => {
    const id = requestAnimationFrame(() => { (document.activeElement as HTMLElement)?.blur(); });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!selectedPersonId) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/meal-plans?personId=${selectedPersonId}`);
        if (!res.ok || cancelled) return;
        const plans: MealPlan[] = await res.json();
        if (!plans.length) { setShopLoading(false); return; }

        // Find current week plan, fallback to first
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const thisWeekPlans = plans.filter((p) => {
          const start = parseUTCDate(p.weekStartDate);
          const end = new Date(start); end.setDate(end.getDate() + 6);
          return today >= start && today <= end;
        });
        const current = (thisWeekPlans.find(p => parseUTCDate(p.weekStartDate).getDay() === 0) ?? thisWeekPlans[0]) ?? plans[0];
        if (!current || cancelled) return;

        // Compute week range label
        const s = parseUTCDate(current.weekStartDate);
        const e = new Date(s); e.setDate(e.getDate() + 6);
        setWeekRange(
          s.getMonth() === e.getMonth()
            ? `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}`
            : `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        );

        // Fetch detail to get shoppingChecked
        const detailRes = await fetch(`/api/meal-plans/${current.id}`);
        const detail: MealPlan = detailRes.ok ? await detailRes.json() : current;
        if (cancelled) return;
        setPlan(detail);

        // Load checked state
        try {
          if (detail.shoppingChecked) {
            setCheckedItems(new Set(JSON.parse(detail.shoppingChecked) as string[]));
          } else {
            const saved = localStorage.getItem(`shopping-checked-${detail.id}`);
            setCheckedItems(saved ? new Set(JSON.parse(saved) as string[]) : new Set());
          }
        } catch { setCheckedItems(new Set()); }

        // Fetch shopping list
        const listRes = await fetch(`/api/meal-plans/${detail.id}/shopping-list`);
        const data = await listRes.json();
        if (!cancelled) setShopItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) toast.error('Failed to load shopping list');
      } finally {
        if (!cancelled) setShopLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedPersonId]);

  const saveChecked = useCallback((newSet: Set<string>) => {
    if (!plan) return;
    const arr = [...newSet];
    try { localStorage.setItem(`shopping-checked-${plan.id}`, JSON.stringify(arr)); } catch {}
    fetch(`/api/meal-plans/${plan.id}/shopping-checked`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: arr }),
    }).then(() => clientCache.delete(`/api/meal-plans/${plan.id}`)).catch(console.error);
  }, [plan]);

  const handleShare = useCallback(async () => {
    if (!weekRange) return;
    const unchecked = shopItems.filter(item => !checkedItems.has(`${item.name}-${item.unit}`));
    const sorted = [...unchecked].sort((a, b) => {
      const ai = SHARE_CAT_ORDER.indexOf(a.category || '');
      const bi = SHARE_CAT_ORDER.indexOf(b.category || '');
      const aIdx = ai === -1 ? 999 : ai; const bIdx = bi === -1 ? 999 : bi;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.name.localeCompare(b.name);
    });
    const lines = sorted.map(item => `${item.name} (${fmtQty(item.qty)} ${item.unit})`).join('\n');
    const text = `Shopping List — ${weekRange}\n\n${lines}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: 'Shopping List', text }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); }
      catch { toast.error('Could not copy'); }
    }
  }, [shopItems, checkedItems, weekRange]);

  // BottomNav dispatches this event on /shopping to trigger share
  const handleShareRef = useRef(handleShare);
  handleShareRef.current = handleShare;
  useEffect(() => {
    const handler = () => handleShareRef.current();
    window.addEventListener('shopping:share', handler);
    return () => window.removeEventListener('shopping:share', handler);
  }, []);

  const groups = new Map<string, ShopItem[]>();
  for (const item of shopItems) {
    const cat = item.category || '';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }
  const sortedCats = [...groups.keys()].sort((a, b) => {
    if (!a) return 1; if (!b) return -1;
    const ai = CATEGORY_ORDER.indexOf(a); const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1; if (bi === -1) return -1;
    return ai - bi;
  });

  const rangeDisplay = weekRange
    ? `§ ${weekRange.toUpperCase()}`
    : '§';

  return (
    <div className="flex h-full flex-col animate-page-enter">
      <div className="pl-shop-body">
        <div className="pl-shop-eyebrow">{rangeDisplay}</div>
        <div className="pl-shop-header-row">
          <h1 className="pl-shop-title">A week of meals.</h1>
          <div className="pl-shop-actions">
            <button
              className="ed-btn-text"
              onClick={() => setHideChecked(h => !h)}
              aria-pressed={hideChecked}
            >{hideChecked ? 'SHOW ALL' : 'HIDE CHECKED'}</button>
            <button
              className="ed-btn-text hidden sm:inline"
              onClick={handleShare}
              aria-label="Share shopping list"
            >SHARE →</button>
          </div>
        </div>
        {shopLoading ? (
          <div className="shop-empty">Loading…</div>
        ) : !plan ? (
          <div className="shop-empty">No meal plan found</div>
        ) : shopItems.length === 0 ? (
          <div className="shop-empty">No ingredients in this week&apos;s plan</div>
        ) : (
          <div className="pl-shop-grid">
              {sortedCats.map(cat => {
                const allItems = groups.get(cat)!;
                const items = hideChecked
                  ? allItems.filter(i => !checkedItems.has(`${i.name}-${i.unit}`))
                  : allItems;
                if (items.length === 0) return null;
                const catLabel = cat || 'Other';
                const catKeys = allItems.map(i => `${i.name}-${i.unit}`);
                const allChecked = catKeys.every(k => checkedItems.has(k));
                const someChecked = catKeys.some(k => checkedItems.has(k));
                return (
                  <div key={cat} className="pl-shop-cat">
                    <div
                      className="shop-cat-header pl-shop-cat-header"
                      onClick={() => {
                        setCheckedItems(prev => {
                          const n = new Set(prev);
                          if (allChecked) { catKeys.forEach(k => n.delete(k)); }
                          else { catKeys.forEach(k => n.add(k)); }
                          saveChecked(n);
                          return n;
                        });
                      }}
                    >
                      <span className={`shop-checkbox${allChecked ? ' shop-checkbox--active shop-checkbox--checked' : someChecked ? ' shop-checkbox--active' : ''}`}>
                        {allChecked && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        {!allChecked && someChecked && <span className="shop-checkbox-dash" />}
                      </span>
                      <span className="shop-cat-label">{catLabel}</span>
                      <span className="pl-shop-cat-count">{allItems.length}</span>
                    </div>
                    <ul className="shop-items">
                      {items.map((item, i) => {
                        const itemKey = `${item.name}-${item.unit}`;
                        const checked = checkedItems.has(itemKey);
                        return (
                          <li
                            key={i}
                            className="shop-item"
                            onClick={() => {
                              setCheckedItems(prev => {
                                const n = new Set(prev);
                                checked ? n.delete(itemKey) : n.add(itemKey);
                                saveChecked(n);
                                return n;
                              });
                            }}
                          >
                            <span className={`shop-item-checkbox${checked ? ' checked' : ''}`}>
                              {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </span>
                            <span className={`shop-item-text${checked ? ' checked' : ''}`}>
                              <span className="shop-item-qty">{fmtQty(item.qty)} {item.unit} </span>
                              {item.name}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
        )}
      </div>
    </div>
  );
}
