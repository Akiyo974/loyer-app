export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-background text-foreground">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-20 h-20 text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <circle cx="12" cy="20" r="1" />
      </svg>

      <div className="text-center max-w-sm space-y-2">
        <h1 className="text-xl font-semibold">Vous êtes hors-ligne</h1>
        <p className="text-sm text-muted-foreground">
          Les mois que vous avez consultés restent accessibles. Reconnectez-vous
          pour voir les données à jour.
        </p>
      </div>

      <a
        href="/dashboard"
        className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
      >
        Retour au tableau de bord
      </a>
    </div>
  );
}
