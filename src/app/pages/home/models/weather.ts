export interface WeatherResponse {
  temperature: number;
  /** Null when the backend could not resolve the coordinates to a place. */
  city: string | null;
  condition: string;
}
