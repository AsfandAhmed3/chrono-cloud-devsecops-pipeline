import React, { useMemo, useState } from 'react';
import watchesData from './data/watches.json';

const CATEGORIES = ['All', 'Chronograph', 'Diver', 'Tourbillon', 'GMT / Aviation', 'Dress'];

const CURRENCIES = {
  USD: { symbol: '$', rate: 1, label: 'USD' },
  CHF: { symbol: 'CHF ', rate: 0.88, label: 'CHF' },
  EUR: { symbol: '€', rate: 0.92, label: 'EUR' },
};

function WatchDialIllustration({ theme, collection, watchName }) {
  return (
    <svg
      className="watch-svg"
      viewBox="0 0 180 180"
      role="img"
      aria-label={`${watchName} horological dial`}
    >
      <defs>
        <radialGradient id={`dial-${theme.dial.replace('#', '')}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={theme.accent} stopOpacity="0.18" />
          <stop offset="70%" stopColor={theme.dial} stopOpacity="1" />
          <stop offset="100%" stopColor="#050608" stopOpacity="1" />
        </radialGradient>
      </defs>
      {/* Strap lugs */}
      <rect x="64" y="6" width="52" height="24" rx="4" fill="#1e222b" stroke="#343b4a" strokeWidth="1.5" />
      <rect x="64" y="150" width="52" height="24" rx="4" fill="#1e222b" stroke="#343b4a" strokeWidth="1.5" />
      {/* Crown */}
      <rect x="157" y="81" width="9" height="18" rx="2.5" fill={theme.bezel} />
      {collection === 'Chronograph' && (
        <>
          <rect x="148" y="47" width="8" height="11" rx="2" transform="rotate(30 152 52)" fill={theme.bezel} />
          <rect x="148" y="122" width="8" height="11" rx="2" transform="rotate(-30 152 127)" fill={theme.bezel} />
        </>
      )}
      {/* Outer Case & Bezel */}
      <circle cx="90" cy="90" r="68" fill="#14171f" stroke="#2d3340" strokeWidth="2.5" />
      <circle cx="90" cy="90" r="62" fill="none" stroke={theme.bezel} strokeWidth="4.5" strokeDasharray={collection === 'Diver' ? '4 3' : 'none'} />
      {/* Dial */}
      <circle cx="90" cy="90" r="56" fill={`url(#dial-${theme.dial.replace('#', '')})`} stroke="#252a34" strokeWidth="1" />
      {/* Hour Markers */}
      {Array.from({ length: 12 }).map((_, idx) => {
        const angle = (idx * 30 * Math.PI) / 180;
        const x1 = 90 + Math.sin(angle) * 45;
        const y1 = 90 - Math.cos(angle) * 45;
        const x2 = 90 + Math.sin(angle) * 51;
        const y2 = 90 - Math.cos(angle) * 51;
        return (
          <line
            key={idx}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={idx % 3 === 0 ? theme.accent : '#9ca3af'}
            strokeWidth={idx % 3 === 0 ? '2.6' : '1.4'}
            strokeLinecap="round"
          />
        );
      })}
      {/* Sub-dial complication */}
      {collection === 'Tourbillon' ? (
        <g>
          <circle cx="90" cy="116" r="14" fill="none" stroke={theme.accent} strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="90" cy="116" r="5" fill={theme.bezel} />
          <line x1="78" y1="116" x2="102" y2="116" stroke={theme.accent} strokeWidth="1" />
          <line x1="90" y1="104" x2="90" y2="128" stroke={theme.accent} strokeWidth="1" />
        </g>
      ) : (
        <g>
          <circle cx="68" cy="92" r="12" fill="rgba(255,255,255,0.03)" stroke={theme.accent} strokeOpacity="0.6" strokeWidth="1" />
          <circle cx="112" cy="92" r="12" fill="rgba(255,255,255,0.03)" stroke={theme.accent} strokeOpacity="0.6" strokeWidth="1" />
          <line x1="68" y1="92" x2="68" y2="83" stroke={theme.hands} strokeWidth="1.4" />
          <line x1="112" y1="92" x2="119" y2="95" stroke={theme.hands} strokeWidth="1.4" />
        </g>
      )}
      {/* Brand mark */}
      <text x="90" y="68" textAnchor="middle" fill={theme.accent} fontSize="6" fontFamily="monospace" letterSpacing="1.6">
        CHRONO-CLOUD
      </text>
      {/* Hands */}
      <line x1="90" y1="90" x2="90" y2="54" stroke={theme.hands} strokeWidth="2.8" strokeLinecap="round" />
      <line x1="90" y1="90" x2="120" y2="78" stroke={theme.hands} strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="96" x2="62" y2="114" stroke={theme.accent} strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="90" cy="90" r="3.5" fill={theme.bezel} />
    </svg>
  );
}

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [currency, setCurrency] = useState('USD');
  const [vault, setVault] = useState([]);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [inspectedWatch, setInspectedWatch] = useState(null);
  const [reservationConfirmed, setReservationConfirmed] = useState(false);

  const formatPrice = (usdAmount) => {
    const cfg = CURRENCIES[currency];
    const converted = Math.round(usdAmount * cfg.rate);
    return `${cfg.symbol}${converted.toLocaleString('en-US')}`;
  };

  const filteredWatches = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = watchesData.filter((watch) => {
      const matchesCategory = selectedCategory === 'All' || watch.collection === selectedCategory;
      const matchesQuery =
        !normalizedQuery ||
        watch.name.toLowerCase().includes(normalizedQuery) ||
        watch.reference.toLowerCase().includes(normalizedQuery) ||
        watch.movement.toLowerCase().includes(normalizedQuery) ||
        watch.caseMaterial.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });

    if (sortBy === 'price-asc') {
      return [...filtered].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price-desc') {
      return [...filtered].sort((a, b) => b.price - a.price);
    }
    return filtered;
  }, [selectedCategory, searchQuery, sortBy]);

  const addToVault = (watch) => {
    setReservationConfirmed(false);
    setVault((prev) => {
      const existing = prev.find((item) => item.id === watch.id);
      if (existing) {
        return prev.map((item) =>
          item.id === watch.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...watch, quantity: 1 }];
    });
  };

  const updateVaultQty = (id, delta) => {
    setVault((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const vaultItemCount = useMemo(
    () => vault.reduce((total, item) => total + item.quantity, 0),
    [vault]
  );

  const vaultSubtotalUsd = useMemo(
    () => vault.reduce((total, item) => total + item.price * item.quantity, 0),
    [vault]
  );

  const handleCheckout = () => {
    setReservationConfirmed(true);
    setVault([]);
  };

  return (
    <div className="app-shell">
      {/* DevSecOps Live Telemetry Banner */}
      <div className="telemetry-bar" data-testid="telemetry-banner">
        <div className="telemetry-inner">
          <span className="telemetry-pill telemetry-live">
            <span className="pulse-dot" />
            LIVE CLUSTER: docker-desktop / k8s v1.34
          </span>
          <span className="telemetry-pill">BUILD: v2.4.0-k8s</span>
          <span className="telemetry-pill">POSTURE: Trivy Verified • Zero Critical CVEs • Rootless NGINX UID 101</span>
          <span className="telemetry-pill">METRICS: Prometheus Exporter :9113</span>
        </div>
      </div>

      {/* Navigation Header */}
      <header className="site-header">
        <div className="header-inner">
          <div className="brand-block">
            <span className="brand-crest">CC</span>
            <div>
              <h1 className="brand-title">CHRONO-CLOUD</h1>
              <p className="brand-subtitle">GENÈVE HOROLOGY &bull; CLOUD-NATIVE ATELIER</p>
            </div>
          </div>

          <div className="header-actions">
            <label className="currency-picker" aria-label="Display Currency">
              <span className="sr-only">Currency</span>
              <select
                data-testid="currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {Object.keys(CURRENCIES).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="vault-trigger"
              data-testid="vault-button"
              onClick={() => setIsVaultOpen(true)}
            >
              <span>Collector&apos;s Vault</span>
              <span className="vault-count" data-testid="vault-count">
                {vaultItemCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-eyebrow">SINGLE-TIER KUBERNETES SHOWCASE</span>
          <h2 className="hero-heading">Precision Horology Engineered with DevSecOps Rigor</h2>
          <p className="hero-description">
            Curated Swiss mechanical complications served through a hardened, rootless NGINX
            container orchestrated via Terraform, Jenkins, Trivy, Prometheus, and Grafana.
          </p>
          <div className="hero-metrics">
            <div className="metric-card">
              <span className="metric-value">8</span>
              <span className="metric-label">Atelier Calibers</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">0 CVEs</span>
              <span className="metric-label">Critical / High Gate</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">UID 101</span>
              <span className="metric-label">Unprivileged Runtime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Controls */}
      <main className="catalog-main">
        <section className="controls-bar" aria-label="Catalog Filters">
          <div className="category-tabs" role="tablist" aria-label="Watch Collections">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={selectedCategory === category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="search-sort-group">
            <input
              type="search"
              className="search-input"
              data-testid="search-input"
              placeholder="Search timepiece, caliber, material..."
              aria-label="Search timepieces"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="sort-select"
              aria-label="Sort watches"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </section>

        {/* Product Grid */}
        {filteredWatches.length === 0 ? (
          <div className="empty-state" data-testid="empty-state">
            <h3>No timepieces match your selection</h3>
            <p>Adjust your search query or select a different horological collection.</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
            >
              Reset Catalog Filters
            </button>
          </div>
        ) : (
          <section className="watch-grid" aria-label="Timepiece Catalog">
            {filteredWatches.map((watch) => (
              <article key={watch.id} className="watch-card" data-testid="watch-card">
                <div className="watch-card-top">
                  <span className="watch-badge">{watch.badge}</span>
                  <span className="watch-stock">{watch.stock}</span>
                </div>

                <div className="watch-visual">
                  <WatchDialIllustration
                    theme={watch.theme}
                    collection={watch.collection}
                    watchName={watch.name}
                  />
                </div>

                <div className="watch-body">
                  <div className="watch-meta-row">
                    <span className="watch-collection">{watch.collection}</span>
                    <span className="watch-ref">{watch.reference}</span>
                  </div>
                  <h3 className="watch-name">{watch.name}</h3>
                  <p className="watch-desc">{watch.description}</p>

                  <dl className="watch-specs">
                    <div>
                      <dt>Movement</dt>
                      <dd>{watch.movement}</dd>
                    </div>
                    <div>
                      <dt>Case</dt>
                      <dd>{watch.caseMaterial}</dd>
                    </div>
                    <div>
                      <dt>Reserve</dt>
                      <dd>{watch.powerReserve}</dd>
                    </div>
                  </dl>
                </div>

                <div className="watch-footer">
                  <div className="watch-price" data-testid={`price-${watch.id}`}>
                    {formatPrice(watch.price)}
                  </div>
                  <div className="watch-card-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setInspectedWatch(watch)}
                    >
                      Inspect Movement
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => addToVault(watch)}
                    >
                      Acquire Timepiece
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {/* Technical Horology Specification Modal */}
      {inspectedWatch && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Movement Specifications"
          data-testid="movement-modal"
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span className="watch-ref">{inspectedWatch.reference}</span>
                <h3>{inspectedWatch.name}</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                aria-label="Close specifications"
                onClick={() => setInspectedWatch(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">{inspectedWatch.description}</p>
              <div className="spec-grid">
                <div className="spec-item">
                  <span>Caliber</span>
                  <strong>{inspectedWatch.movement}</strong>
                </div>
                <div className="spec-item">
                  <span>Power Reserve</span>
                  <strong>{inspectedWatch.powerReserve}</strong>
                </div>
                <div className="spec-item">
                  <span>Water Resistance</span>
                  <strong>{inspectedWatch.waterResistance}</strong>
                </div>
                <div className="spec-item">
                  <span>Case Architecture</span>
                  <strong>{inspectedWatch.caseMaterial}</strong>
                </div>
                <div className="spec-item">
                  <span>Dial Finish</span>
                  <strong>{inspectedWatch.dialColor}</strong>
                </div>
                <div className="spec-item">
                  <span>Diameter</span>
                  <strong>{inspectedWatch.diameter}</strong>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <span className="watch-price">{formatPrice(inspectedWatch.price)}</span>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  addToVault(inspectedWatch);
                  setInspectedWatch(null);
                  setIsVaultOpen(true);
                }}
              >
                Add to Collector&apos;s Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collector's Vault Slide-Out Drawer */}
      {isVaultOpen && (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Collector Vault">
          <aside className="vault-drawer" data-testid="vault-drawer">
            <div className="drawer-header">
              <h3>Collector&apos;s Vault ({vaultItemCount})</h3>
              <button
                type="button"
                className="close-btn"
                aria-label="Close vault"
                onClick={() => setIsVaultOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="drawer-body">
              {reservationConfirmed ? (
                <div className="reservation-success" data-testid="reservation-confirmed">
                  <h4>Vault Allocation Reserved</h4>
                  <p>
                    Your timepiece dossier has been queued via insured armoured courier dispatch.
                  </p>
                </div>
              ) : vault.length === 0 ? (
                <p className="vault-empty">
                  Your Collector&apos;s Vault is empty. Select a timepiece to initiate an insured
                  allocation.
                </p>
              ) : (
                <ul className="vault-list">
                  {vault.map((item) => (
                    <li key={item.id} className="vault-item">
                      <div>
                        <h4>{item.name}</h4>
                        <span className="watch-ref">{item.reference}</span>
                        <div className="vault-item-price">{formatPrice(item.price)}</div>
                      </div>
                      <div className="qty-controls">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${item.name}`}
                          onClick={() => updateVaultQty(item.id, -1)}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${item.name}`}
                          onClick={() => updateVaultQty(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {vault.length > 0 && (
              <div className="drawer-footer">
                <div className="summary-row">
                  <span>Insured Armoured Courier</span>
                  <span>Complimentary</span>
                </div>
                <div className="summary-row total">
                  <span>Subtotal</span>
                  <strong data-testid="vault-subtotal">{formatPrice(vaultSubtotalUsd)}</strong>
                </div>
                <button type="button" className="btn-primary full-width" onClick={handleCheckout}>
                  Confirm Vault Reservation
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      <footer className="site-footer">
        <p>
          CHRONO-CLOUD DevSecOps Portfolio &bull; Single-Tier React + Rootless NGINX + Kubernetes +
          Terraform + Prometheus/Grafana
        </p>
      </footer>
    </div>
  );
}
