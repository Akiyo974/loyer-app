"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Home, Plus, UserPlus, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { switchHousehold } from "@/actions/household-actions";

interface HouseholdOption {
  id: string;
  name: string;
}

interface HouseholdSelectorProps {
  households: HouseholdOption[];
  activeHouseholdId: string;
}

export function HouseholdSelector({ households, activeHouseholdId }: HouseholdSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const active = households.find((h) => h.id === activeHouseholdId) ?? households[0];

  function handleSwitch(householdId: string) {
    if (householdId === activeHouseholdId) return;
    startTransition(() => switchHousehold(householdId));
  }

  if (households.length === 1) {
    // Un seul foyer : affichage simple sans dropdown
    return (
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-primary/10 rounded-md">
          <Home className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-none">{active?.name}</p>
          <p className="text-xs text-muted-foreground leading-none mt-0.5">Foyer partagé</p>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-auto px-2 py-1.5 hover:bg-gray-100"
          disabled={isPending}
        >
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Home className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm leading-none">{active?.name}</p>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">
              {isPending ? "Changement…" : "Foyer partagé"}
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Mes foyers
        </DropdownMenuLabel>
        {households.map((h) => (
          <DropdownMenuItem
            key={h.id}
            onClick={() => handleSwitch(h.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="truncate">{h.name}</span>
            {h.id === activeHouseholdId && (
              <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/household/new")} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2 text-muted-foreground" />
          Créer un foyer
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/household/join")} className="cursor-pointer">
          <UserPlus className="h-4 w-4 mr-2 text-muted-foreground" />
          Rejoindre un foyer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
