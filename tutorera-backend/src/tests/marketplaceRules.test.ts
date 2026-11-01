import { sortMarketplaceOffers } from "../utils/marketplaceRules";

type TestOffer = {
  id: string;
  amount: number;
  matchScore: number;
  responseSeconds: number;
  completedSessions: number;
  profile: { averageRating: number; experience: number };
};

const offers: TestOffer[] = [
  { id: "match", amount: 3000, matchScore: 90, responseSeconds: 600, completedSessions: 10, profile: { averageRating: 4.5, experience: 4 } },
  { id: "rate", amount: 1500, matchScore: 70, responseSeconds: 300, completedSessions: 30, profile: { averageRating: 4.2, experience: 8 } },
  { id: "rating", amount: 2500, matchScore: 80, responseSeconds: 120, completedSessions: 20, profile: { averageRating: 4.9, experience: 6 } },
];

describe("sortMarketplaceOffers", () => {
  it.each([
    ["best_match", "match"],
    ["lowest_rate", "rate"],
    ["highest_rated", "rating"],
    ["most_experienced", "rate"],
    ["fastest_response", "rating"],
    ["most_sessions", "rate"],
    ["unsupported", "match"],
  ])("prioritizes %s", (sort, firstId) => {
    expect(sortMarketplaceOffers(offers, sort)[0].id).toBe(firstId);
  });

  it("does not mutate the source offer list", () => {
    const originalOrder = offers.map((offer) => offer.id);
    sortMarketplaceOffers(offers, "lowest_rate");
    expect(offers.map((offer) => offer.id)).toEqual(originalOrder);
  });
});
