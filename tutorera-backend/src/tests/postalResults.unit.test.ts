import { normalizePostalResults } from "../utils/normalizePostalResults";

describe("normalizePostalResults", () => {
  it("normalizes Zipcodebase field names for profile autofill", () => {
    expect(normalizePostalResults([{
      code: "10005",
      city: "New York",
      state_name: "New York",
      country: "US",
      latitude: "40.706",
      longitude: "-74.008",
    }])).toEqual([expect.objectContaining({
      postalCode: "10005",
      placeName: "New York",
      adminName1: "New York",
      countryCode: "US",
      lat: "40.706",
      lng: "-74.008",
    })]);
  });

  it("preserves GeoNames field names and rejects non-array results", () => {
    expect(normalizePostalResults([{
      postalCode: "44000",
      placeName: "Islamabad",
      adminName1: "ICT",
      countryCode: "PK",
      lat: "33.6844",
      lng: "73.0479",
    }])).toEqual([expect.objectContaining({
      postalCode: "44000",
      placeName: "Islamabad",
      adminName1: "ICT",
      countryCode: "PK",
      lat: "33.6844",
      lng: "73.0479",
    })]);
    expect(normalizePostalResults(null)).toEqual([]);
  });
});
