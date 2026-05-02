# Copy Audit — Good Measure

Generated: 2026-05-01
Scope: All static user-facing strings in JSX/TSX. Excludes data-driven content (ingredient/recipe names), CSS class names, import paths, and developer-only strings.

---

## app/home/page.tsx — Dashboard

### Headlines
- "Good morning," / "Good afternoon," / "Good evening," (time-of-day greeting prefix)
- "A blank week." (no plan empty state)
- "No meals logged." (nothing today empty state)
- "Choose 3 stats to track here." (stats strip empty state)

### Eyebrows
- § NO PLAN THIS WEEK
- § NOTHING TODAY
- § Dashboard stats (stats strip empty state)

### Body / Lede
- (stats strip) "Choose 3 stats to track here."

### Buttons
- "Choose stats →"
- "Full planner →"
- "Open planner →"
- "See recipe →"
- "+ Add"

### Navigation / Labels
- "This week"
- "Today's key meals"

### Contextual Tips
- (household switching) — tip about switching active person in household

---

## app/recipes/page.tsx — Recipe List

### Headlines
- "An empty library." (no recipes empty state)
- "Nothing matches that." (no matches empty state)
- "Side by side." (compare mode overlay)

### Eyebrows
- § NO RECIPES YET
- § NO MATCHES
- § NUTRITION COMPARISON

### Buttons
- "+ NEW RECIPE →" (empty state CTA)
- "Compare"
- "Compare (N)" (N = selected count)
- "Exit"
- "Clear"
- "Compare →"
- "+ Add More"
- "Filter & Sort" (filter sheet trigger)
- "Done" (filter sheet)
- "Clear all" (filter sheet)

### Navigation / Filter Labels
- "All"
- "Favorites"
- "Grid" / "List" (view toggle)
- "Sort by" (filter sheet section)
- "Category" (filter sheet section)

### Inline Labels
- "kcal" / "g fat" / "g carbs" / "g prot" (list-view nutrient columns)
- "incomplete" (badge on incomplete recipes)
- "Loading recipes…"

---

## app/recipes/[id]/page.tsx — Recipe Detail

### Headlines / Breadcrumb
- "Recipe / Edit"
- "Edit Recipe"

### Jump Nav Labels
- Ingredients
- Nutrition
- Instructions
- Optimize
- Meal Prep

### Meta Suffixes
- "min prep"
- "min cook"
- "Source:"

### Buttons
- "Edit"
- "Loading…"
- "Duplicate"
- "Delete"
- "Add to Favorites"
- "★ Favorited · Remove"
- "Scale"

### Labels
- "Per serving · vs goals" (nutrition label subhead)

### Contextual Tips
- Optimization section tip
- Meal Prep section tip

### Toasts
- Success / error messages for save, duplicate, delete, favorite toggle

---

## app/recipes/create/page.tsx — Create Recipe

### Headlines / Breadcrumb
- "Recipe / New"
- "New Recipe"

### Eyebrows
- Import Recipe (eyebrow label)

### Buttons
- "Import"
- "Importing…"
- "Upload File"
- "or"

### Placeholders
- "Paste recipe URL…"

---

## app/ingredients/page.tsx — Pantry List

### Headlines
- "An empty pantry." (no ingredients empty state)
- "Nothing matches that." (no matches empty state)

### Eyebrows
- § NO INGREDIENTS YET
- § NO MATCHES

### Buttons
- "+ ADD INGREDIENT →" (empty state CTA)
- "Filter" (filter sheet trigger)

### Filter Labels
- "All"
- "Items"
- "Ingredients"
- "Type" (filter sheet section)

### Inline
- "Loading ingredients..."

### Dialogs
- Confirm delete ingredient

### Toasts
- Delete success / error

---

## app/ingredients/[id]/page.tsx — Ingredient Detail / Edit

### Headlines / Breadcrumb
- "Pantry / Edit"
- "Edit Pantry Item"

### Empty / Loading States
- Loading state copy
- Not-found state copy

### Field Labels
- (standard nutrition field labels)
- "Custom Unit Settings"
- "Values are per" (nutrition basis row)
- "standalone item" / "Use as a standalone meal item" (checkbox label)

### USDA Section
- "About the USDA database" (ContextualTip title)
- "USDA Lookup" (section label)
- "Searching USDA..."
- "Data imported from USDA FDC"

### Placeholders
- "Search USDA database…"

### Buttons
- "Cancel"
- "Reset"
- "Save"

### Toasts / Validation
- Save success / error messages
- Validation error messages

---

## app/ingredients/create/page.tsx — Create Ingredient

### Headlines / Breadcrumb
- "Pantry / New"
- "New Pantry Item"

### Buttons
- "Cancel"
- "Create"
- "Creating…"

---

## app/meal-plans/page.tsx — Planner

### Headlines
- "A blank week." (no plan empty state)
- "Nothing selected." (no plan selected empty state)

### Eyebrows
- § NO PLAN THIS WEEK
- § SELECT A PLAN

### Body / Lede
- "Use the controls above to select or create a plan."

### Toolbar Labels
- "Meal Plans"
- "This Week"
- "‹ Prev"
- "Next ›"
- "+ New Plan"
- "Edit"
- "Done"
- "Delete"
- "Everyone"

### Nutrition Panel
- "Nutrition ›"
- "‹ Nutrition"
- "Calories"
- "Nutrients"

### Warning Chips
- "+N to target"
- "+N over limit"
- "outside target"

### Create Form Labels
- "Week Start"
- "Copy From"

### Buttons
- "Create"
- "Creating…"
- "Cancel"
- "+ CREATE PLAN →" (empty state CTA)
- "Delete plan" (dialog title)

### Mobile
- "No meals" (BothView empty day)

### Dialogs
- Delete plan confirm (title / body)

### Toasts
- Create success / error
- Delete success / error

---

## app/meal-plans/add-meal/page.tsx — Add Meal (Desktop)

### Headlines
- "Add a meal." (mobile headline)
- "Add a breakfast."
- "Add a lunch."
- "Add a dinner."
- "Add a side."
- "Add a snack."
- "Add a dessert."
- "Add a beverage."
- "Add a pantry item."

### Rail / Tab Labels
- Breakfast
- Lunch
- Dinner
- Side
- Snack
- Dessert
- Beverage
- Pantry Items

### Form Labels
- "Search"
- "Servings"
- "Quantity"
- "Unit"
- "Also add to"

### Placeholders
- "FIND RECIPE…"
- "FIND ITEM…"
- "g, ml, etc."

### Empty States
- "No recipes match this meal type"
- "No items available"
- "No items match your search"

### Inline
- "· Incomplete" (recipe suffix)

### Buttons
- "Add to Plan"
- "Adding…"

### Errors
- "Invalid parameters"

---

## app/shopping/page.tsx — Shopping List

### Headlines
- "A week of meals."
- "A blank shopping list." (no plan empty state)
- "A week without a list." (no ingredients empty state)

### Eyebrows
- § NO PLAN THIS WEEK
- § NO INGREDIENTS YET

### Buttons
- "SHOW ALL"
- "HIDE CHECKED"
- "SHARE →"

### Inline
- "Loading…"

### Toasts
- Share / copy success / error

---

## app/settings/page.tsx — Settings

### Headlines
- "Your preferences."

### Eyebrows
- § Settings

### Jump Nav Labels
- People
- Daily Goals
- Dashboard
- MCP Integration
- Data

### People Section
- Status pills: "Owner" / "Tracked Only" / "✓ Joined"
- Invite action labels
- "Add member" (form label)

### Goals Section
- "Min"
- "Max"
- "Reset to defaults"
- "Save Goals"

### Dashboard Section
- "Select three nutrition stats…"
- "N of 3 selected"

### MCP Section
- Step labels and body copy (setup instructions for AI assistant)
- Assistant table labels
- "Config JSON" (label)

### Data Section
- "Export"
- "Import"

### Dialogs / Confirms
- Various confirms (reset goals, remove member, etc.)

### Toasts
- Save goals success / error
- Import success / error

---

## app/login/page.tsx — Auth

### Eyebrows
- § SIGN IN (signin mode)
- § CREATE ACCOUNT (signup mode)
- § FORGOT PASSWORD (forgot mode)

### Headlines
- "Welcome back." (signin)
- "Join Good Measure." (signup)
- "Reset your password." (forgot)

### Body / Lede
- (signin lede)
- (signup lede)
- (forgot lede)

### Tabs
- "Sign in"
- "Create account"

### Form Labels
- "Name"
- "Email"
- "Password"
- "Confirm password"
- "Forgot"

### Buttons
- Submit label varies by mode (e.g. "Sign in" / "Create account" / "Send reset link")
- "← Back to sign in"
- "Or"
- "Continue with Google"

### Error Messages
- Email already in use
- Invalid credentials
- Passwords don't match
- (and other validation errors)

### Notice Messages
- Invite banner copy
- Password reset confirmation

---

## app/onboarding/page.tsx — Onboarding Wizard

### Top Bar
- "Good Measure"
- Step labels (step N of N)

### Welcome Step
- § WELCOME
- "Measure what matters."
- (lede paragraph)
- "GET STARTED →"

### Profile Step
- § YOUR PROFILE
- "Pick your color."
- (lede paragraph)
- "NAME" (field label)
- "THEME" (field label)
- "← BACK"
- "CONTINUE"

### Household Step
- § YOUR HOUSEHOLD
- "Who else is eating?"
- (lede paragraph)
- "HOUSEHOLD NAME" (field label)
- "MEMBERS" (section label)
- "YOU" (current-user indicator)
- "Add another person…" (placeholder)
- "+ ADD"
- (hint copy)
- "← BACK"
- "CONTINUE"

### Goals Step
- § DAILY GOALS
- "A starting point."
- (lede paragraph)
- Four goal preset labels
- "← BACK"
- "FINISH →"

### Complete Step
- § READY
- "You're all set."
- (dynamic lede based on household size)
- "GO TO DASHBOARD →"

---

## app/not-found.tsx — 404

### Eyebrows
- § Not found

### Headlines
- "Nothing here."

### Body / Lede
- "The page you're looking for doesn't exist, or may have moved."

### Buttons
- "Go home"

---

## app/components/TopNav.tsx — Main Navigation

### Navigation Labels
- "Planner"
- "Recipes"
- "Pantry"

### Buttons / Actions
- "Sign out" (aria-label and visible text)
- "Settings" (aria-label)

---

## app/components/AddMealSheet.tsx — Mobile Add Meal Sheet

### Eyebrows (date label format)
- § {WEEKDAY, MONTH DAY} (e.g. § THURSDAY, MAY 1)

### Headlines
- "Add a breakfast."
- "Add a lunch."
- "Add a dinner."
- "Add a side."
- "Add a snack."
- "Add a dessert."
- "Add a beverage."
- "Add a pantry item."

### Form Labels
- "Search"
- "Servings"
- "Quantity"
- "Unit"

### Placeholders
- "FIND RECIPE…"
- "FIND ITEM…"
- "g, ml…"

### Empty States
- "No recipes match this meal type"
- "No items available"
- "No items match your search"

### Inline
- "· Incomplete" (recipe suffix)

### Buttons
- "Add to Plan"
- "Adding…"

### Aria Labels
- "Add meal" (sheet dialog)
- "Add to plan" (submit button)

### Toasts / Validation
- "Please enter a valid number of servings"
- "Please enter a valid quantity"
- "Meal added successfully!"
- "Failed to add meal"

---

## app/components/RecipeBuilder.tsx — Recipe Form

### Section Headers
- Basics
- Photo
- Ingredients
- Method
- Nutrition

### Field Labels
- (standard recipe fields: Name, Servings, etc.)
- "Not in library —" (ingredient warning prefix)
- "Add to library"
- "+ Create new ingredient…"

### Nutrition Guidance
- "Show nutrition guidance" (toggle)
- "Add ingredients, then select a person…" (empty state)
- "For"
- "Focus"
- "Cap"
- "clear"
- "No goals set for this person."
- "Top contributors:"

### Contextual Tips
- "Nutrition Guidance" (tip title)

### Method Step Placeholders
- Step instruction placeholder text

### Buttons
- "Cancel"
- "Save" / "Create"
- "Saving…" / "Creating…"

### Toasts
- Save success / error
- Create success / error

---

## app/components/MealPlanWeek.tsx — Weekly Planner Grid

### Mobile
- "View Nutrition ›"
- "No meals planned for this day."
- "+ Add"

### Desktop
- "+ Add"

### Dialogs
- Title: "Remove this meal?"
- Body: "This can't be undone."
- Confirm button: "Remove"

---

## app/components/GettingStartedCard.tsx — Onboarding Checklist

### Header
- "Getting started"

### Task Labels (5 tasks)
- (task copy for: add ingredient, create recipe, build meal plan, set goals, invite member)

### Optional Task Note
- "Desktop only · MCP required"

### Section Labels
- "Optional"

### Invite Copy
- "Send {name} an invite"
- "Copy link"
- "Copied"
- "Send this link to {name} so they can set up their own login."

### Dismiss Buttons
- "Done — dismiss"
- "Dismiss"
