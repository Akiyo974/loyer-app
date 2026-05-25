"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Sparkles, Loader2, ExternalLink, Clock3, Users, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function RecipesBoard() {
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<RecipeItem | null>(null);
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState({ reelUrl: "", notes: "" });

  async function loadItems() {
    setLoadingList(true);
    try {
      const response = await fetch("/api/recipes?limit=50", { cache: "no-store" });
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
        throw new Error(data?.error || "Generation impossible");
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
      const message = e instanceof Error ? e.message : "Erreur lors de la generation";
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

      {loadingList ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Chargement des recettes...
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center space-y-3">
            <ChefHat className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">Aucune recette enregistree</p>
            <p className="text-sm text-muted-foreground">
              Utilisez le bouton + pour analyser un Reel Instagram et creer votre premiere fiche.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full mb-4 break-inside-avoid"
              onClick={() => setSelected(item)}
            >
              <Card className="overflow-hidden text-left hover:shadow-lg transition-shadow">
                <div className="relative w-full h-48 bg-muted">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.recipeTitle || "Miniature recette"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                      Sans miniature
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-snug">
                    {item.recipeTitle || "Recette sans titre"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground flex items-center justify-between">
                  <span>{item.hitCount} utilisation(s)</span>
                  <span>{new Date(item.updatedAt).toLocaleDateString("fr-CA")}</span>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected?.recipe ? (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selected.recipe.title}</DialogTitle>
                <DialogDescription>{selected.recipe.description}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <Card>
                  <CardContent className="pt-4 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {selected.recipe.servings}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    Prep: {selected.recipe.prepTime}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    Cuisson: {selected.recipe.cookTime}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Ingredients</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {selected.recipe.ingredients.map((line, idx) => (
                    <li key={`${line}-${idx}`}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Etapes</h3>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  {selected.recipe.steps.map((line, idx) => (
                    <li key={`${line}-${idx}`}>{line}</li>
                  ))}
                </ol>
              </div>

              {selected.recipe.tips?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Astuces</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {selected.recipe.tips.map((line, idx) => (
                      <li key={`${line}-${idx}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button asChild variant="outline" className="w-full">
                <a href={selected.reelUrl} target="_blank" rel="noreferrer">
                  Ouvrir le Reel
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Cette entree ne contient pas de recette exploitable.
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              Generer une recette Reel
            </DialogTitle>
            <DialogDescription>
              Collez un lien Instagram Reel. Ajoutez des notes si la recette n'est pas detectee automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reel-url">Lien Reel Instagram</Label>
              <Input
                id="reel-url"
                placeholder="https://www.instagram.com/reel/..."
                value={form.reelUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, reelUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reel-notes">Notes <span className="text-muted-foreground">(optionnel)</span></Label>
              <Textarea
                id="reel-notes"
                rows={3}
                placeholder="Ex: Pates carbonara — lardons, oeufs, parmesan. Ou corrige ce qui manque dans la recette generee."
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generation en cours...
                </>
              ) : (
                "Generer la recette"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
