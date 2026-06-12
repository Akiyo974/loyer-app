"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Home, Banknote, ShoppingCart, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    icon: Home,
    title: "Bienvenue dans Foyer ! 🏠",
    description:
      "Cette app vous aide à répartir équitablement les dépenses de votre foyer selon les revenus de chacun. Suivez ce guide rapide pour démarrer.",
    action: "Commencer",
  },
  {
    icon: Banknote,
    title: "1. Enregistrez vos paies",
    description:
      "Accédez à l'onglet « Paies » du mois en cours et ajoutez vos fiches de paie. Le mode bi-hebdomadaire génère automatiquement toutes vos dates de paie.",
    action: "Compris →",
  },
  {
    icon: ShoppingCart,
    title: "2. Saisissez les dépenses",
    description:
      "Dans l'onglet « Dépenses », ajoutez vos charges mensuelles. Les dépenses fixes se copient automatiquement chaque mois.",
    action: "Compris →",
  },
  {
    icon: CheckCircle2,
    title: "3. Suivez vos contributions",
    description:
      "Le « Résumé » calcule automatiquement combien chaque membre doit déposer sur le compte commun. Enregistrez vos dépôts dans l'onglet correspondant.",
    action: "C'est parti !",
  },
];

const LS_KEY = "foyer-onboarding-done";

interface OnboardingModalProps {
  householdId: string;
  monthSlug: string;
}

export function OnboardingModal({ householdId, monthSlug }: OnboardingModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem(`${LS_KEY}-${householdId}`);
      if (!done) setOpen(true);
    } catch {}
  }, [householdId]);

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(`${LS_KEY}-${householdId}`, "1");
    } catch {}
    setOpen(false);
  }

  function goToMonth() {
    dismiss();
    router.push(`/month/${monthSlug}`);
  }

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center text-center space-y-3">
          <div className="p-4 rounded-full bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">{current.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {current.description}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper dots */}
        <div className="flex justify-center gap-2 py-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={dismiss}>
            Passer
          </Button>
          {isLast ? (
            <Button className="flex-1" onClick={goToMonth}>
              Aller au mois →
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleNext}>
              {current.action}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
