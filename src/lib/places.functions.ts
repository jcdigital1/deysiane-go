import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { searchPlacesImpl, type PlaceSuggestion } from "./places.server";

export type { PlaceSuggestion };

const schema = z.object({
  query: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

export const searchPlaces = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => searchPlacesImpl(data));
