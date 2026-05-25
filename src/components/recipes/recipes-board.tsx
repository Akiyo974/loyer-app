"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Sparkles, Loader2, ExternalLink, Clock3, Users, ChefHat, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type RecipeData = {
  title: string;
  description: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  steps: string[];
  tips: string[];
  source: {
    reelUrl: string;
    notes: string;
  };
};

type RecipeItem = {
  id: string;
  reelUrl: string;
  notes?: string | null;
  status: "success" | "error" | string;
  hitCount: number;
  recipeTitle?: string | null;
  thumbnailUrl?: string | null;
  recipe?: RecipeData | null;
  createdAt: string;
  updatedAt: string;
};

type SortOption = "recent" | "popular" | "alpha";

export function RecipesBoard() {
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<RecipeItem | null>(null);
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState({ reelUrl: "", notes: "" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");

  async function loadItems() {
    setLoadingList(true);
    try {
      const response = await fetch("/api/recipes?limit=100", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Impossible de charger la galerie");
      }
      setItems(data.items || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur de chargement";
      setError(message);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  const canSubmit = useMemo(() => {
    return form.reelUrl.includes("instagram.com/reel/") && !submitting;
  }, [form.reelUrl, submitting]);

  const filtered = useMemo(() => {
    let result = [...items];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.recipeTitle?.toLowerCase().includes(q) ||
          (item.recipe?.ingredients ?? []).some((i) => i.toLowerCase().includes(q)) ||
          item.recipe?.description?.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q),
      );
    }

    if (sort === "recent") {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sort === "popular") {
      result.sort((a, b) => b.hitCount - a.hitCount);
    } else if (sort === "alpha") {
      result.sort((a, b) =>
        (a.recipeTitle ?? "").localeCompare(b.recipeTitle ?? "", "fr"),
      );
    }

    return result;
  }, [items, search, sort]);

  async function handleGenerate() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Génération impossible");
      }

      setForm({ reelUrl: "", notes: "" });
      setDialogOpen(false);
      await loadItems();

      const newItem = (data?.id
        ? {
            id: data.id,
            reelUrl: data.reelUrl,
            status: "success",
            hitCount: data.hitCount,
            recipeTitle: data.recipeTitle,
            recipe: data.recipe,
            thumbnailUrl: data.thumbnailUrl,
            createdAt: data.updatedAt,
            updatedAt: data.updatedAt,
          }
        : null) as RecipeItem | null;

      if (newItem) {
        setSelected(newItem);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur lors de la génération";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Barre de recherche + tri */}
      {!loadingList && items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher par titre, ingrédient, description…"
              className="pl-9 pr-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récent</SelectItem>
              <SelectItem value="popular">Plus utilisé</SelectItem>
              <SelectItem value="alpha">A → Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loadingList ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Chargement des recettes…
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center space-y-3">
            <ChefHat className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-semibold text-base">Aucune recette enregistrée</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Appuyez sur le bouton <span className="font-medium">+</span> pour analyser un Reel Instagram et créer votre première fiche recette.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center space-y-3">
            <Search className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-semibold text-base">Aucun résultat</p>
            <p className="text-sm text-muted-foreground">Aucune recette ne correspond à « {search} ».</p>
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              Effacer la recherche
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} recette{filtered.length > 1 ? "s" : ""}
            {search ? ` pour « ${search} »` : ""}
          </p>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full mb-4 break-inside-avoid"
                onClick={() => setSelected(item)}
              >
                <Card className="overflow-hidden text-left hover:shadow-lg transition-shadow group">
                  <div className="relative w-full h-44 bg-muted">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.recipeTitle || "Miniature recette"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ChefHat className="h-8 w-8" />
                        <span className="text-xs">Pas de miniature</span>
                      </div>
                    )}
                    {item.hitCount > 1 && (
                      <Badge className="absolute top-2 right-2 text-xs bg-black/60 text-white border-0">
                        {item.hitCount}×
                      </Badge>
                    )}
                  </div>
                  <CardHeader className="pb-1 pt-3">
                    <CardTitle className="text-sm leading-snug line-clamp-2">
                      {item.recipeTitle || "Recette sans titre"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 space-y-2">
                    {item.recipe && (
                      <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                        {item.recipe.prepTime && (
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {item.recipe.prepTime}
                          </span>
                        )}
                        {item.recipe.servings && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {item.recipe.servings}
                          </span>
                        )}
                        {item.recipe.ingredients?.length > 0 && (
                          <span>{item.recipe.ingredients.length} ingr.</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Dialog détail recette */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected?.recipe ? (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-xl leading-snug">{selected.recipe.title}</DialogTitle>
                <DialogDescription className="text-sm">{selected.recipe.description}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg border bg-muted/40 p-3 flex flex-col items-center gap-1 text-center">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Portions</span>
                  <span className="font-medium text-xs">{selected.recipe.servings}</span>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 flex flex-col items-center gap-1 text-center">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Préparation</span>
                  <span className="font-medium text-xs">{selected.recipe.prepTime}</span>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 flex flex-col items-center gap-1 text-center">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Cuisson</span>
                  <span className="font-medium text-xs">{selected.recipe.cookTime}</span>
                </div>
              </div>

              <hr className="border-t" />

              <div className="space-y-2">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Ingrédients
                </h3>
                <ul className="space-y-1">
                  {selected.recipe.ingredients.map((line, idx) => (
                    <li key={`ing-${idx}`} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <hr className="border-t" />

              <div className="space-y-2">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Étapes
                </h3>
                <ol className="space-y-3">
                  {selected.recipe.steps.map((line, idx) => (
                    <li key={`step-${idx}`} className="flex items-start gap-3 text-sm">
                      <span className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{line}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {selected.recipe.tips?.length > 0 && (
                <>
                  <hr className="border-t" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      💡 Astuces
                    </h3>
                    <ul className="space-y-1">
                      {selected.recipe.tips.map((line, idx) => (
                        <li key={`tip-${idx}`} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <Button asChild variant="outline" className="w-full">
                <a href={selected.reelUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir le Reel Instagram
                </a>
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Cette entrée ne contient pas de recette exploitable.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog ajout */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
            aria-label="Ajouter une recette"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Générer une recette depuis un Reel
            </DialogTitle>
            <DialogDescription>
              Collez un lien Instagram Reel. Ajoutez des notes si la recette n'est pas détectée automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reel-url">Lien Reel Instagram</Label>
              <Input
                id="reel-url"
                placeholder="https://www.instagram.com/reel/…"
                value={form.reelUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, reelUrl: e.target.value }))}
              />
              {form.reelUrl && !form.reelUrl.includes("instagram.com/reel/") && (
                <p className="text-xs text-red-500">Ce lien ne semble pas être un Reel Instagram.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reel-notes">
                Notes <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Textarea
                id="reel-notes"
                rows={3}
                placeholder="Ex : Pâtes carbonara — lardons, œufs, parmesan. Ou précisez ce qui manque dans la recette générée."
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer la recette
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
