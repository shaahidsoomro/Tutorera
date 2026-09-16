"use client";

import { COUNTRIES,Country } from "@/lib/location";
import { ChevronDown,Globe,MapPin } from "lucide-react";
import { useMemo,useState } from "react";
import CountryCityPickerModal from "./CountryCityPickerModal";

interface CountryCitySelectorProps {
  countryCode: string;
  city: string;
  onCountryChange: (country: Country) => void;
  onCityChange: (cityName: string) => void;
  showTimezone?: boolean;
  onTimezoneChange?: (timezone: string) => void;
  showCurrency?: boolean;
  onCurrencyChange?: (currency: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  cityLabel?: string;
  countryLabel?: string;
  countries?: Country[];
}

export default function CountryCitySelector({
  countryCode,
  city,
  onCountryChange,
  onCityChange,
  showTimezone = false,
  onTimezoneChange,
  showCurrency = false,
  onCurrencyChange,
  disabled = false,
  required = true,
  className = "",
  cityLabel = "City",
  countryLabel = "Country",
  countries: countriesProp,
}: CountryCitySelectorProps) {
  const currentCountry = useMemo(() => {
    const list = countriesProp || COUNTRIES;
    const found = list.find((c) => c.code === countryCode);
    return found || list[0];
  }, [countryCode, countriesProp]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"country_and_city" | "country_only" | "city_only">("country_and_city");

  const openPicker = (mode: "country_and_city" | "country_only" | "city_only") => {
    if (disabled) return;
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleModalSelect = (pickedCountry: Country, pickedCity: string) => {
    onCountryChange(pickedCountry);
    if (onTimezoneChange) onTimezoneChange(pickedCountry.defaultTimezone);
    if (onCurrencyChange) onCurrencyChange(pickedCountry.currency);

    onCityChange(pickedCity);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mobile-Friendly Country Card Button */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            {countryLabel} {required && <span className="text-rose-500">*</span>}
          </label>
          <button
            type="button"
            onClick={() => openPicker("country_only")}
            disabled={disabled}
            className="w-full bg-white border border-slate-300 hover:border-blue-500 rounded-xl px-3.5 py-3 text-sm text-slate-800 font-medium flex items-center justify-between outline-none transition disabled:opacity-50 shadow-sm text-left"
            style={{ minHeight: "48px" }}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-lg">{currentCountry.flag}</span>
              <span className="truncate font-semibold text-slate-900">{currentCountry.name}</span>
              <span className="text-xs text-slate-400 font-normal">({currentCountry.currency})</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
          </button>
        </div>

        {/* Mobile-Friendly City Card Button */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            {cityLabel} {required && <span className="text-rose-500">*</span>}
          </label>
          <button
            type="button"
            onClick={() => openPicker("city_only")}
            disabled={disabled}
            className="w-full bg-white border border-slate-300 hover:border-blue-500 rounded-xl px-3.5 py-3 text-sm text-slate-800 font-medium flex items-center justify-between outline-none transition disabled:opacity-50 shadow-sm text-left"
            style={{ minHeight: "48px" }}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="truncate font-semibold text-slate-900">{city || "Choose City..."}</span>
              {currentCountry.code === "PK" && (
                <span className="text-xs text-blue-600 font-normal">verified</span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
          </button>
        </div>
      </div>

      {/* Meta Indicators */}
      {(showCurrency || showTimezone) && (
        <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
          {showCurrency && (
            <span>
              Billing Currency: <strong className="text-slate-700">{currentCountry.currency}</strong>
            </span>
          )}
          {showTimezone && (
            <span>
              Timezone: <strong className="text-slate-700">{currentCountry.defaultTimezone}</strong>
            </span>
          )}
        </div>
      )}

      {/* Bottom Sheet Modal */}
      <CountryCityPickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedCountryCode={currentCountry.code}
        selectedCity={city}
        onSelect={handleModalSelect}
        mode={modalMode}
        countries={countriesProp}
      />
    </div>
  );
}
