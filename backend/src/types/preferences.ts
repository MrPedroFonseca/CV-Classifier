export interface WorkLocation {
  city: string;
  maxDays: number;
}

export interface WorkPreferences {
  models: Array<"remote" | "hybrid" | "on-site">;
  locations: WorkLocation[];
}
