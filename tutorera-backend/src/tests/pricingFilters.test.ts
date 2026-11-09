import { getPricingInsight } from "../controllers/pricing.controller";
import Booking from "../models/Booking.model";
import TutorProfile from "../models/TutorProfile.model";

jest.mock("../models/Booking.model", () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock("../models/TutorProfile.model", () => ({ __esModule: true, default: { find: jest.fn() } }));

function response() {
  const res: any = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("pricing insights filter safeguards", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects invalid filter types without database access", async () => {
    const res = response();
    await getPricingInsight({ query: { subject: ["math", "physics"] } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Booking.find).not.toHaveBeenCalled();
  });

  it("rejects invalid teaching modes", async () => {
    const res = response();
    await getPricingInsight({ query: { teachingMode: "remote-only" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Booking.find).not.toHaveBeenCalled();
  });

  it("does not mix non-PKR bookings and safely searches literal subjects", async () => {
    const bookings: any[] = [
      { finalAgreedRate: 1000, pricingUnit: "hour", request: { city: "Lahore", subject: "C++" } },
      { finalAgreedRate: 3000, pricingUnit: "hour", request: { city: "Karachi", subject: "C++" } },
    ];
    (Booking.find as jest.Mock).mockReturnValue({
      populate: () => ({ select: () => ({ lean: async () => bookings }) }),
    });
    (TutorProfile.find as jest.Mock).mockReturnValue({
      select: () => ({ lean: async () => [{ hourlyRate: 1200, currency: "PKR" }] }),
    });
    const res = response();
    await getPricingInsight({ query: { city: "Lahore", subject: "C++" } } as any, res);
    expect(Booking.find).toHaveBeenCalledWith(expect.objectContaining({ currency: "PKR" }));
    expect(TutorProfile.find).toHaveBeenCalledWith(expect.objectContaining({ currency: "PKR" }));
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      insight: {
        count: 2, currency: "PKR", min: 1000, max: 1200, median: 1100,
        sampleSource: { completedBookings: 1, activeProfiles: 1 },
      },
    });
  });

  it("returns null statistics when there are no qualifying rates", async () => {
    (Booking.find as jest.Mock).mockReturnValue({
      populate: () => ({ select: () => ({ lean: async () => [] }) }),
    });
    const res = response();
    await getPricingInsight({ query: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      insight: {
        count: 0, currency: "PKR", min: null, max: null, median: null,
        sampleSource: { completedBookings: 0, activeProfiles: 0 },
      },
    });
  });
});
