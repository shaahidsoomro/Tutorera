import { primaryMarketplaceTutorFilter } from "../services/matching.service";

describe("primary marketplace matching", () => {
  it("restricts online matching to the request marketplace", () => {
    expect(primaryMarketplaceTutorFilter({ countryCode: "pk" })).toEqual({ countryCode: "PK" });
  });

  it("does not invent a marketplace for legacy requests without one", () => {
    expect(primaryMarketplaceTutorFilter({ countryCode: undefined })).toEqual({});
  });
});
