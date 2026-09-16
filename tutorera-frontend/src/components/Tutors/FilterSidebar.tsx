import { useFocusTrap } from "@/hooks/useFocusTrap";
import { COUNTRIES,getCitiesForCountry } from "@/lib/location";
import { FiltersState,LEVELS,TEACHING_MODES } from "@/types/tutor";
import styles from "./Filtersidebar.module.css";
import StarRating from "./StarRating";

interface FilterSidebarProps {
  filters: FiltersState;
  onFilterChange: (key: keyof FiltersState, value: string) => void;
  onReset: () => void;
  activeFilterCount: number;
}

// ─── Reusable section wrapper ─────────────────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={styles.sectionTitle}>{title}</p>
      {children}
    </div>
  );
}

// ─── Inner content (shared between desktop and mobile) ────────────────────────

function SidebarContent({
  filters,
  onFilterChange,
  onReset,
  activeFilterCount,
}: FilterSidebarProps) {
  return (
    <div className={styles.sidebar}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <svg width={16} height={16} viewBox="0 0 20 20" fill="white" opacity={0.9} aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-4 2A1 1 0 016 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
              clipRule="evenodd"
            />
          </svg>
          <span className={styles.headerTitle}>Filters</span>
          {activeFilterCount > 0 && (
            <span className={styles.badge}>{activeFilterCount}</span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button onClick={onReset} className={styles.clearBtn}>
            Clear all
          </button>
        )}
      </div>

      {/* Body */}
      <div className={styles.body}>

        {/* Teaching Mode */}
        <FilterSection title="Teaching Mode">
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="teachingMode"
                value=""
                checked={filters.teachingMode === ""}
                onChange={(e) => onFilterChange("teachingMode", e.target.value)}
              />
              Any Mode
            </label>
            {TEACHING_MODES.map((mode) => (
              <label
                key={mode.value}
                className={`${styles.radioLabel} ${
                  filters.teachingMode === mode.value ? styles.radioLabelActive : ""
                }`}
              >
                <input
                  type="radio"
                  name="teachingMode"
                  value={mode.value}
                  checked={filters.teachingMode === mode.value}
                  onChange={(e) => onFilterChange("teachingMode", e.target.value)}
                />
                {mode.label}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Level */}
        {/* Country */}
        <FilterSection title="Country / Location">
          <select
            aria-label="Filter by country"
            value={filters.country || ""}
            onChange={(e) => {
              onFilterChange("country", e.target.value);
              onFilterChange("city", "");
            }}
            className={styles.select}
          >
            <option value="">Worldwide (All Countries)</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </FilterSection>

        {/* City */}
        <FilterSection title="City">
          <select
            aria-label="Filter by city"
            value={filters.city}
            onChange={(e) => onFilterChange("city", e.target.value)}
            className={styles.select}
          >
            <option value="">All Cities</option>
            {getCitiesForCountry(filters.country || "PK").map((city) => (
              <option key={city.id} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
        </FilterSection>

        {/* Student Level */}
        <FilterSection title="Student Level">
          <select
            aria-label="Filter by student level"
            value={filters.level}
            onChange={(e) => onFilterChange("level", e.target.value)}
            className={styles.select}
          >
            <option value="">All Levels</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </FilterSection>

        {/* Price Range */}
        <FilterSection title="Price Range (per hour)">
          <div className={styles.priceRow}>
            <input
              type="number"
              placeholder="Min"
              aria-label="Minimum price per hour"
              value={filters.minPrice}
              onChange={(e) => onFilterChange("minPrice", e.target.value)}
              className={styles.priceInput}
              min={0}
            />
            <input
              type="number"
              placeholder="Max"
              aria-label="Maximum price per hour"
              value={filters.maxPrice}
              onChange={(e) => onFilterChange("maxPrice", e.target.value)}
              className={styles.priceInput}
              min={0}
            />
          </div>
        </FilterSection>

        {/* Minimum Rating */}
        <FilterSection title="Minimum Rating">
          <div className={styles.radioGroup}>
            <label className={styles.starRadioLabel}>
              <input
                type="radio"
                name="minRating"
                value=""
                checked={filters.minRating === ""}
                onChange={(e) => onFilterChange("minRating", e.target.value)}
              />
              Any rating
            </label>
            {[4, 3, 2, 1].map((r) => (
              <label key={r} className={styles.starRadioLabel}>
                <input
                  type="radio"
                  name="minRating"
                  value={r}
                  checked={filters.minRating === String(r)}
                  onChange={(e) => onFilterChange("minRating", e.target.value)}
                />
                <StarRating rating={r} size={13} />
                <span>{r}+ stars</span>
              </label>
            ))}
          </div>
        </FilterSection>

      </div>
    </div>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

export function FilterSidebar(props: FilterSidebarProps) {
  return <SidebarContent {...props} />;
}

// ─── Mobile overlay sidebar ───────────────────────────────────────────────────

interface MobileFilterSidebarProps extends FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileFilterSidebar({
  isOpen,
  onClose,
  ...rest
}: MobileFilterSidebarProps) {
  const modalRef = useFocusTrap(true, onClose);

  if (!isOpen) return null; 

  return (
    <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="Filters">
      <div className={styles.mobileBackdrop} onClick={onClose} />
      <div ref={modalRef} className={styles.mobilePanel}>
        <div className={styles.mobilePanelHeader}>
          <button
            onClick={onClose}
            className={styles.mobileCloseBtn}
            aria-label="Close filters"
          >
            ×
          </button>
        </div>
        <div className={styles.mobilePanelBody}>
          <SidebarContent {...rest} />
        </div>
      </div>
    </div>
  );
}