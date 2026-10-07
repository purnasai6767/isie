export type SavedMapDefault = "3D_GLOBE" | "2D_MAP" | "SPLIT_VIEW";

export const DISPLAY_PREFERENCES_KEY = "isie_display_preferences";

export function readSavedMapDefault(): SavedMapDefault | null {
  try {
    const stored = localStorage.getItem(DISPLAY_PREFERENCES_KEY);
    if (!stored) return null;

    const preferences: unknown = JSON.parse(stored);
    if (typeof preferences !== "object" || preferences === null || !("mapDefault" in preferences)) {
      return null;
    }

    const mapDefault = preferences.mapDefault;
    return mapDefault === "3D_GLOBE" || mapDefault === "2D_MAP" || mapDefault === "SPLIT_VIEW"
      ? mapDefault
      : null;
  } catch (error) {
    console.error("Could not read the saved map preference.", error);
    return null;
  }
}
