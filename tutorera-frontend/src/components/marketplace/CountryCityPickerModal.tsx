"use client";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import api from "@/lib/axios";
import {
  COUNTRIES,
  Country
} from "@/lib/location";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  MapPin,
  Search,
  X
} from "lucide-react";
import React,{ useEffect,useMemo,useState } from "react";


interface CountryCityPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountryCode: string;
  selectedCity: string;
  onSelect: (country: Country, city: string) => void;
  mode?: "country_and_city" | "country_only" | "city_only";
  title?: string;
  countries?: Country[];
}

const POPULAR_COUNTRY_CODES = ["PK", "AE", "GB", "US", "SA", "CA", "AU"];

export default function CountryCityPickerModal({
  isOpen,
  onClose,
  selectedCountryCode,
  selectedCity,
  onSelect,
  mode = "country_and_city",
  title = "Select Country & City",
  countries: countriesProp,
}: CountryCityPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"country" | "city">(
    mode === "city_only" ? "city" : "country"
  );
  const [tempCountry, setTempCountry] = useState<Country>(() => {
    const list = countriesProp || COUNTRIES;
    return list.find((c) => c.code === selectedCountryCode) || list[0];
  });
  const [tempCity, setTempCity] = useState(selectedCity || "");
  const [countryQuery, setCountryQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [customCityInput, setCustomCityInput] = useState("");
  const [remoteCities, setRemoteCities] = useState<string[]>([]);
  const modalRef = useFocusTrap(isOpen, onClose);

  const filteredCountries = useMemo(() => {
    const list = countriesProp || COUNTRIES;
    if (!countryQuery.trim()) return list;
    const q = countryQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q)
    );
  }, [countryQuery, countriesProp]);

  const fallbackCities = useMemo(() => {
    const list = countriesProp || COUNTRIES;
    const country = list.find((c) => c.code === tempCountry.code);
    if (!country) return [];
    return country.cities.map((ct) => typeof ct === "string" ? ct : ct.name);
  }, [tempCountry.code, countriesProp]);

  useEffect(() => {
    if (!isOpen || activeTab !== "city") return;
    let cancelled = false;
    const query = cityQuery.trim();
    const timer = window.setTimeout(() => {
      api.get(`/geo/cities?country=${encodeURIComponent(tempCountry.code)}&limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`)
        .then((res) => {
          if (!cancelled) setRemoteCities((res.data?.cities || []).map((city: { name: string }) => city.name));
        })
        .catch(() => { if (!cancelled) setRemoteCities([]); });
    }, query ? 180 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [isOpen, activeTab, tempCountry.code, cityQuery]);

  const availableCities = remoteCities.length > 0 ? remoteCities : fallbackCities;

  const filteredCities = useMemo(() => {
    if (!cityQuery.trim()) return availableCities;
    const q = cityQuery.toLowerCase();
    return availableCities.filter((c) => c.toLowerCase().includes(q));
  }, [cityQuery, availableCities]);

  if (!isOpen) return null;

  const handleCountryPick = (country: Country) => {
    setTempCountry(country);
    const list = countriesProp || COUNTRIES;
    const found = list.find((c) => c.code === country.code);
    const cities = found ? found.cities.map((ct) => typeof ct === "string" ? ct : ct.name) : [];
    const defaultCity = cities.length > 0 ? cities[0] : "";
    setTempCity(defaultCity);

    if (mode === "country_only") {
      onSelect(country, "");
      onClose();
    } else {
      setActiveTab("city");
    }
  };

  const handleCityPick = (cityName: string) => {
    setTempCity(cityName);
    onSelect(tempCountry, cityName);
    onClose();
  };

  const handleCustomCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCityInput.trim()) return;
    handleCityPick(customCityInput.trim());
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 21, 80, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          backgroundColor: "white",
          borderRadius: "1.25rem 1.25rem 0 0",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -8px 32px rgba(2, 21, 80, 0.2)",
          animation: "slideUp 0.25s ease-out",
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {activeTab === "city" && mode === "country_and_city" && (
              <button
                type="button"
                onClick={() => setActiveTab("country")}
                aria-label="Back to countries"
                style={{
                  background: "none",
                  border: "none",
                  padding: "0.35rem",
                  borderRadius: "50%",
                  cursor: "pointer",
                  color: "#0329b2",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#021550", margin: 0 }}>
              {activeTab === "country"
                ? "Choose Country"
                : `Choose City in ${tempCountry.name}`}
            </h2>
          </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close location selector"
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
            <X size={18} />
          </button>
        </div>

        {/* Modal Search Bar */}
        <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
          {activeTab === "country" ? (
            <div style={{ position: "relative" }}>
              <Search
                size={18}
                color="#94a3b8"
                style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="search"
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                placeholder="Search country or currency..."
                style={{
                  width: "100%",
                  padding: "0.65rem 1rem 0.65rem 2.4rem",
                  borderRadius: "0.625rem",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <Search
                size={18}
                color="#94a3b8"
                style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="search"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder={`Search city in ${tempCountry.name}...`}
                style={{
                  width: "100%",
                  padding: "0.65rem 1rem 0.65rem 2.4rem",
                  borderRadius: "0.625rem",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>
          )}
        </div>

        {/* Popular Quick Chips (For Country Tab) */}
        {activeTab === "country" && !countryQuery && (
          <div style={{ padding: "0.75rem 1.25rem 0.25rem", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Popular Tutoring Markets:
            </span>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
              {POPULAR_COUNTRY_CODES.map((code) => {
                const list = countriesProp || COUNTRIES;
                const c = list.find(country => country.code === code);
                if (!c) return null;
                const isSelected = tempCountry.code === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountryPick(c)}
                    style={{
                      padding: "0.35rem 0.65rem",
                      borderRadius: "999px",
                      fontSize: "0.8rem",
                      fontWeight: isSelected ? 800 : 500,
                      background: isSelected ? "#eef5ff" : "#f1f5f9",
                      color: isSelected ? "#0329b2" : "#334155",
                      border: isSelected ? "1.5px solid #0329b2" : "1px solid #e2e8f0",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable List Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0.75rem" }}>
          {activeTab === "country" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {filteredCountries.map((c) => {
                const isSelected = tempCountry.code === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountryPick(c)}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.625rem",
                      border: "none",
                      background: isSelected ? "#eff6ff" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1.35rem" }}>{c.flag}</span>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.92rem", color: isSelected ? "#0329b2" : "#021550" }}>
                          {c.name}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          Currency: {c.currency} · {c.defaultTimezone.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    {isSelected ? (
                      <Check size={18} color="#0329b2" />
                    ) : (
                      <ChevronRight size={16} color="#cbd5e1" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {/* Filtered Pre-defined Cities */}
              {filteredCities.map((cityName) => {
                const isSelected = tempCity.toLowerCase() === cityName.toLowerCase();
                return (
                  <button
                    key={cityName}
                    type="button"
                    onClick={() => handleCityPick(cityName)}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.625rem",
                      border: "none",
                      background: isSelected ? "#eff6ff" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <MapPin size={16} color={isSelected ? "#0329b2" : "#64748b"} />
                      <div>
                        <strong style={{ display: "block", fontSize: "0.92rem", color: isSelected ? "#0329b2" : "#021550" }}>
                          {cityName}
                        </strong>
                      </div>
                    </div>
                    {isSelected && <Check size={18} color="#0329b2" />}
                  </button>
                );
              })}

              {/* Custom City Fallback Option */}
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "0.5rem", paddingTop: "0.75rem", paddingLeft: "0.5rem", paddingRight: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block", marginBottom: "0.4rem" }}>
                  Can&apos;t find your city in the list? Enter it manually:
                </span>
                <form onSubmit={handleCustomCitySubmit} style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={customCityInput}
                    onChange={(e) => setCustomCityInput(e.target.value)}
                    placeholder="Enter city or town name..."
                    style={{
                      flex: 1,
                      padding: "0.6rem 0.85rem",
                      borderRadius: "0.5rem",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.85rem",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!customCityInput.trim()}
                    style={{
                      background: "#0329b2",
                      color: "white",
                      border: "none",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 1rem",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: customCityInput.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    Select
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
