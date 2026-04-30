"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prevMonthSlug, nextMonthSlug } from "@/lib/utils";

interface MonthSelectorButtonsProps {
  currentSlug: string;
}

export function MonthSelectorButtons({ currentSlug }: MonthSelectorButtonsProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={() => router.push(`/dashboard?month=${prevMonthSlug(currentSlug)}`)}
        aria-label="Mois précédent"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => router.push(`/dashboard?month=${nextMonthSlug(currentSlug)}`)}
        aria-label="Mois suivant"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
