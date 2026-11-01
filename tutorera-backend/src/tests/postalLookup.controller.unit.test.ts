import axios from "axios";
import { postalLookup } from "../controllers/geo.controller";

jest.mock("axios", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockedAxios = jest.mocked(axios);

describe("postalLookup", () => {
  const originalKey = process.env.ZIPCODEBASE_API_KEY;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalKey === undefined) delete process.env.ZIPCODEBASE_API_KEY;
    else process.env.ZIPCODEBASE_API_KEY = originalKey;
  });

  it("uses Zipcodebase for postal-code searches", async () => {
    process.env.ZIPCODEBASE_API_KEY = "test-key";
    mockedAxios.get.mockResolvedValueOnce({
      data: { results: [{ code: "10005", city: "New York" }] },
    } as never);
    const json = jest.fn();

    await postalLookup({ query: { q: "10005", country: "us" } } as never, { json } as never);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://app.zipcodebase.com/api/v1/search",
      expect.objectContaining({
        params: { codes: "10005", country: "US", unit: "km" },
        headers: { apikey: "test-key" },
      }),
    );
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      provider: "zipcodebase",
      results: [expect.objectContaining({ postalCode: "10005", placeName: "New York" })],
    }));
  });

  it("falls back to GeoNames when Zipcodebase fails", async () => {
    process.env.ZIPCODEBASE_API_KEY = "test-key";
    mockedAxios.get
      .mockRejectedValueOnce(new Error("provider unavailable"))
      .mockResolvedValueOnce({ data: { postalCodes: [{ postalCode: "44000", placeName: "Islamabad" }] } } as never);
    const json = jest.fn();

    await postalLookup({ query: { q: "44000", country: "pk" } } as never, { json } as never);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      provider: "geonames",
      results: [expect.objectContaining({ postalCode: "44000", placeName: "Islamabad" })],
    }));
  });

  it("uses GeoNames directly when Zipcodebase is not configured", async () => {
    delete process.env.ZIPCODEBASE_API_KEY;
    mockedAxios.get.mockResolvedValueOnce({ data: { postalCodes: [] } } as never);
    const json = jest.fn();

    await postalLookup({ query: { q: "Lahore", country: "pk" } } as never, { json } as never);

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ provider: "geonames", results: [] }));
  });
});
