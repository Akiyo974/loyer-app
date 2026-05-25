import { BookOpen } from "lucide-react";
import { RecipesBoard } from "@/components/recipes/recipes-board";

export default function RecipesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-7 w-7" />
          Recettes Reel
        </h1>
        <p className="text-muted-foreground">
          Transformez un lien Instagram Reel en fiche recette et retrouvez-la dans votre galerie.
        </p>
      </div>
      <RecipesBoard />
    </div>
  );
}
