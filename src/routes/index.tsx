import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Loader2, MapPin, Flag, MessageCircle } from "lucide-react";
import logo from "@/assets/deysiane-logo.png";
import { searchPlaces, type PlaceSuggestion } from "@/lib/places.functions";

const RideMap = lazy(() => import("@/components/RideMap"));

const WHATSAPP = "5534998402888";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Deysiane Uber Particular | Corridas em segundos" },
      {
        name: "description",
        content:
          "Escolha o local de partida e o destino e solicite sua corrida particular com a Deysiane pelo WhatsApp.",
      },
      { property: "og:title", content: "Deysiane Uber Particular" },
      {
        property: "og:description",
        content: "Partida, destino e pronto: corrida solicitada pelo WhatsApp.",
      },
    ],
  }),
  component: Index,
});

type Coords = { lat: number; lon: number } | null;

function PlaceField({
  label,
  icon,
  value,
  onSelect,
  userCoords,
}: {
  label: string;
  icon: React.ReactNode;
  value: PlaceSuggestion | null;
  onSelect: (place: PlaceSuggestion | null) => void;
  userCoords: Coords;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const skip = useRef(false);

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    const q = text.trim();
    if (q.length < 3) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchPlaces({
          data: {
            query: q,
            ...(userCoords ? { lat: userCoords.lat, lon: userCoords.lon } : {}),
          },
        });
        setItems(res);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [text, userCoords]);

  return (
    <div className="relative">
      <div className="field-graphite rounded-2xl p-4">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon} {label}
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (value) onSelect(null);
            }}
            onFocus={() => items.length > 0 && setOpen(true)}
            className="w-full bg-transparent text-base outline-none"
            autoComplete="off"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
        </div>
      </div>

      {open && items.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-auto rounded-2xl border border-border bg-card shadow-xl">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  skip.current = true;
                  setText(item.name);
                  onSelect(item);
                  setOpen(false);
                  setItems([]);
                }}
                className="flex w-full items-start gap-2 border-b border-border/60 px-4 py-3 text-left last:border-0"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.address}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Index() {
  const [userCoords, setUserCoords] = useState<Coords>(null);
  const [origin, setOrigin] = useState<PlaceSuggestion | null>(null);
  const [destination, setDestination] = useState<PlaceSuggestion | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  }, []);

  const ready = Boolean(origin && destination);

  const request = () => {
    if (!origin || !destination) return;
    const fmt = (p: PlaceSuggestion) =>
      p.address && p.address !== p.name ? `${p.name} - ${p.address}` : p.name;
    const text = `Olá, Deysiane! Desejo solicitar uma corrida. 🚗\n\n📍 Local de partida:\n${fmt(
      origin,
    )}\n\n🏁 Destino:\n${fmt(destination)}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-5 pb-10 pt-8">
      <header className="flex items-center gap-3">
        <img
          src={logo}
          alt="Logo Deysiane Uber Particular"
          width={48}
          height={48}
          className="h-12 w-12"
        />
        <h1 className="text-lg font-bold leading-tight">Deysiane Uber Particular</h1>
      </header>

      <h2 className="text-center text-2xl font-bold">Pra onde vamos?</h2>

      <div className="relative z-50 space-y-3">
        <PlaceField
          label="Local de partida"
          icon={<MapPin className="h-4 w-4 text-primary" />}
          value={origin}
          onSelect={setOrigin}
          userCoords={userCoords}
        />
        <PlaceField
          label="Para onde você vai?"
          icon={<Flag className="h-4 w-4 text-primary" />}
          value={destination}
          onSelect={setDestination}
          userCoords={userCoords}
        />
      </div>

      <div className="relative z-0 h-52 overflow-hidden rounded-2xl border border-border">
        <ClientOnly fallback={<div className="h-full w-full bg-surface" />}>
          <Suspense fallback={<div className="h-full w-full bg-surface" />}>
            <RideMap
              origin={origin ? { lat: origin.lat, lon: origin.lon } : null}
              destination={destination ? { lat: destination.lat, lon: destination.lon } : null}
            />
          </Suspense>
        </ClientOnly>
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={request}
        className="btn-pink w-full rounded-2xl py-4 text-base font-bold tracking-wide disabled:opacity-40"
      >
        SOLICITAR CORRIDA
      </button>

      <a
        href={`https://wa.me/${WHATSAPP}`}
        target="_blank"
        rel="noreferrer"
        className="mx-auto inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
      >
        <MessageCircle className="h-4 w-4 text-primary" /> Falar com a Deysiane
      </a>
    </main>
  );
}
