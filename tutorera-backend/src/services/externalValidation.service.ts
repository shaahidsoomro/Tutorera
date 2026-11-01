import axios from "axios";

const BIGDATACLOUD_BASE_URL = "https://api-bdc.net/data";

interface BigDataCloudEmailResponse {
  isValid?: boolean;
  isSyntaxValid?: boolean;
  isDisposable?: boolean;
  isDeliverable?: boolean;
}

interface BigDataCloudPhoneResponse {
  isValid?: boolean;
  phoneNumber?: string;
  countryCode?: string;
  lineType?: string;
}

export interface ContactValidationResult {
  available: boolean;
  email?: {
    valid: boolean;
    disposable: boolean;
    deliverable?: boolean;
  };
  phone?: {
    valid: boolean;
    formatted?: string;
    countryCode?: string;
    lineType?: string;
  };
}

function getApiKey(): string | undefined {
  return process.env.BIGDATACLOUD_API_KEY?.trim() || undefined;
}

function phoneEndpoint(): string {
  return process.env.BIGDATACLOUD_PHONE_VALIDATION_URL?.trim() ||
    `${BIGDATACLOUD_BASE_URL}/phone-number-validate`;
}

export async function validateContactDetails(email?: string, phone?: string): Promise<ContactValidationResult> {
  const key = getApiKey();
  if (!key) return { available: false };

  const result: ContactValidationResult = { available: true };
  if (email) {
    const response = await axios.get<BigDataCloudEmailResponse>(`${BIGDATACLOUD_BASE_URL}/email-verify`, {
      params: { emailAddress: email, key },
      timeout: 5000,
    });
    const data = response.data || {};
    result.email = {
      valid: data.isValid === true && data.isSyntaxValid !== false,
      disposable: data.isDisposable === true,
      deliverable: data.isDeliverable,
    };
  }

  if (phone) {
    const response = await axios.get<BigDataCloudPhoneResponse>(phoneEndpoint(), {
      params: { phoneNumber: phone, key },
      timeout: 5000,
    });
    const data = response.data || {};
    result.phone = {
      valid: data.isValid === true,
      formatted: data.phoneNumber,
      countryCode: data.countryCode,
      lineType: data.lineType,
    };
  }

  return result;
}

export async function detectIpCountry(ip?: string): Promise<{ countryCode?: string; countryName?: string; city?: string }> {
  const key = getApiKey();
  if (!key) return {};
  const response = await axios.get<{
    country?: { isoAlpha2?: string; name?: string };
    locality?: string;
  }>(`${BIGDATACLOUD_BASE_URL}/ip-geolocation`, {
    params: { ...(ip ? { ip } : {}), localityLanguage: "en", key },
    timeout: 5000,
  });
  return {
    countryCode: response.data?.country?.isoAlpha2,
    countryName: response.data?.country?.name,
    city: response.data?.locality,
  };
}
