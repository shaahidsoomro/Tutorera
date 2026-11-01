export function normalizePostalResults(results: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(results)) return [];
  return results.map((item) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      ...row,
      postalCode: row.postalCode ?? row.postal_code ?? row.code,
      placeName: row.placeName ?? row.city ?? row.place_name,
      adminName1: row.adminName1 ?? row.state ?? row.state_name,
      countryCode: row.countryCode ?? row.country,
      lat: row.lat ?? row.latitude,
      lng: row.lng ?? row.longitude,
    };
  });
}
