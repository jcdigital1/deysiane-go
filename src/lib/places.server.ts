export type PlaceSuggestion = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

async function googleSearch(
  query: string,
  lat?: number,
  lon?: number,
): Promise<PlaceSuggestion[] | null> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) return null;

  const body: Record<string, unknown> = {
    textQuery: query,
    languageCode: "pt-BR",
    regionCode: "BR",
    maxResultCount: 6,
  };
  if (typeof lat === "number" && typeof lon === "number") {
    body["locationBias"] = {
      circle: { center: { latitude: lat, longitude: lon }, radius: 30000 },
    };
  }

  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Google Places failed [${res.status}]: ${await res.text()}`);
    return null;
  }

  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
    }>;
  };

  return (data.places ?? [])
    .filter((p) => p.location)
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? p.formattedAddress ?? "",
      address: p.formattedAddress ?? "",
      lat: p.location!.latitude,
      lon: p.location!.longitude,
    }));
}

async function photonSearch(
  query: string,
  lat?: number,
  lon?: number,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: "6", lang: "default" });
  if (typeof lat === "number" && typeof lon === "number") {
    params.set("lat", String(lat));
    params.set("lon", String(lon));
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: Array<{
      properties: Record<string, string | number | undefined>;
      geometry: { coordinates: [number, number] };
    }>;
  };
  return (data.features ?? []).map((f, i) => {
    const p = f.properties;
    const name = String(p["name"] ?? p["street"] ?? p["city"] ?? "Local");
    const address = [
      [p["street"], p["housenumber"]].filter(Boolean).join(", "),
      p["district"],
      p["city"],
      p["state"],
    ]
      .filter(Boolean)
      .join(" - ");
    return {
      id: `${f.geometry.coordinates[0]},${f.geometry.coordinates[1]},${i}`,
      name,
      address: address || String(p["country"] ?? ""),
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    };
  });
}

export async function searchPlacesImpl(input: {
  query: string;
  lat?: number | undefined;
  lon?: number | undefined;
}): Promise<PlaceSuggestion[]> {
  const query = input.query.trim();
  if (query.length < 3) return [];
  const google = await googleSearch(query, input.lat, input.lon);
  if (google && google.length > 0) return google;
  return photonSearch(query, input.lat, input.lon);
}
