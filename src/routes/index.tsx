import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Check, LocateFixed, Loader2, MapPin, Flag, MessageCircle } from "lucide-react";
import logo from "@/assets/deysiane-logo.png";

const RideMap = lazy(() => import("@/components/RideMap"));

const WHATSAPP = "5534998402888";
type Point = { lat: number; lon: number } | null;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Deysiane Uber Particular | Corridas em segundos" },
      {
        name: "description",
        content:
          "Informe onde você está e para onde vai e solicite sua corrida particular com a Deysiane pelo WhatsApp.",
      },
      { property: "og:title", content: "Deysiane Uber Particular" },
      {
        property: "og:description",
        content: "Onde estou, para onde vou, solicitar corrida. Simples assim.",
      },
    ],
  }),
  component: Index,
});

async function geocode(query: string): Promise<Point> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    );
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return null;
    return { lat: Number(first.lat), lon: Number(first.lon) };
  } catch {
    return null;
  }
}

function isAvailableNow() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 23;
}

function Index() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originPoint, setOriginPoint] = useState<Point>(null);
  const [destPoint, setDestPoint] = useState<Point>(null);
  const [locating, setLocating] = useState(false);
  const [gpsOk, setGpsOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const available = isAvailableNow();
  const skipGeocode = useRef(false);

  useEffect(() => {
    if (!destination.trim()) {
      setDestPoint(null);
      return;
    }
    const t = setTimeout(async () => setDestPoint(await geocode(destination)), 900);
    return () => clearTimeout(t);
  }, [destination]);

  useEffect(() => {
    if (skipGeocode.current) {
      skipGeocode.current = false;
      return;
    }
    if (!origin.trim()) {
      setOriginPoint(null);
      return;
    }
    const t = setTimeout(async () => setOriginPoint(await geocode(origin)), 900);
    return () => clearTimeout(t);
  }, [origin]);

  const useMyLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("GPS não disponível neste aparelho.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setOriginPoint({ lat: latitude, lon: longitude });
        let label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          const data = (await res.json()) as { display_name?: string };
          if (data.display_name) label = data.display_name;
        } catch {
          /* mantém coordenadas */
        }
        skipGeocode.current = true;
        setOrigin(label);
        setGpsOk(true);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Não foi possível obter sua localização. Digite o endereço.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const canRequest = origin.trim().length > 2 && destination.trim().length > 2;

  const confirm = () => {
    const text = `Olá, Deysiane! Gostaria de solicitar uma corrida.\n\n📍 Estou em:\n${origin}\n\n🏁 Destino:\n${destination}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank");
    setShowSummary(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-5 pb-10 pt-8">
      <header className="flex items-center gap-3">
        <img src={logo} alt="Logo Deysiane Uber Particular" width={48} height={48} className="h-12 w-12" />
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight">Deysiane Uber Particular</h1>
          <span
            className={`mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium ${
              available ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${available ? "bg-primary" : "bg-destructive"}`}
              style={available ? { boxShadow: "var(--glow-pink)" } : undefined}
            />
            {available ? "Disponível" : "Indisponível"}
          </span>
        </div>
      </header>

      <section>
        <h2 className="text-2xl font-bold">Pra onde vamos?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe sua localização e seu destino.
        </p>
      </section>

      <div className="space-y-3">
        <div className="field-graphite rounded-2xl p-4">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" /> Onde você está?
          </label>
          <input
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              setGpsOk(false);
            }}
            placeholder="Seu endereço atual"
            className="mt-2 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={useMyLocation}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/60 px-3 py-1.5 text-sm font-medium text-primary"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            Usar minha localização
          </button>
          {gpsOk && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-primary">
              <Check className="h-4 w-4" /> Localização encontrada
            </p>
          )}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <div className="field-graphite rounded-2xl p-4">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Flag className="h-4 w-4 text-primary" /> Para onde você vai?
          </label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Endereço, hospital, mercado, rodoviária..."
            className="mt-2 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="h-52 overflow-hidden rounded-2xl border border-border">
        <ClientOnly fallback={<div className="h-full w-full bg-surface" />}>
          <Suspense fallback={<div className="h-full w-full bg-surface" />}>
            <RideMap origin={originPoint} destination={destPoint} />
          </Suspense>
        </ClientOnly>
      </div>

      <button
        type="button"
        disabled={!canRequest}
        onClick={() => setShowSummary(true)}
        className="btn-pink w-full rounded-2xl py-4 text-base font-bold tracking-wide disabled:opacity-40"
      >
        SOLICITAR CORRIDA
      </button>

      {!available && (
        <p className="-mt-2 text-center text-xs text-muted-foreground">
          Deysiane pode responder assim que estiver disponível.
        </p>
      )}

      <a
        href={`https://wa.me/${WHATSAPP}`}
        target="_blank"
        rel="noreferrer"
        className="mx-auto inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
      >
        <MessageCircle className="h-4 w-4 text-primary" /> Falar com a Deysiane
      </a>

      {showSummary && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm"
          onClick={() => setShowSummary(false)}
        >
          <div
            className="w-full rounded-t-3xl border-t border-border bg-card p-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">Sua corrida</h3>
            <p className="mt-4 flex gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{origin}</span>
            </p>
            <p className="mt-3 flex gap-2 text-sm">
              <Flag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{destination}</span>
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                className="flex-1 rounded-2xl border border-border py-3.5 text-sm font-semibold"
              >
                ALTERAR
              </button>
              <button
                type="button"
                onClick={confirm}
                className="btn-pink flex-1 rounded-2xl py-3.5 text-sm font-bold"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
