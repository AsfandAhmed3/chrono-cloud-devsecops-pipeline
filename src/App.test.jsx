import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('Chrono-Cloud Storefront', () => {
  it('renders the storefront header and DevSecOps telemetry banner', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /CHRONO-CLOUD/i })).toBeInTheDocument();
    const banner = screen.getByTestId('telemetry-banner');
    expect(banner).toHaveTextContent(/v2\.4\.0-k8s/i);
    expect(banner).toHaveTextContent(/Trivy Verified/i);
    expect(banner).toHaveTextContent(/Rootless NGINX UID 101/i);
  });

  it('displays all 8 luxury watches from watches.json by default', () => {
    render(<App />);
    const cards = screen.getAllByTestId('watch-card');
    expect(cards).toHaveLength(8);
  });

  it('filters watches accurately when a category tab is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Diver' }));
    const diverCards = screen.getAllByTestId('watch-card');
    expect(diverCards).toHaveLength(2);
    expect(screen.getByText(/Abyssal Pelagos 600M/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Tourbillon' }));
    expect(screen.getAllByTestId('watch-card')).toHaveLength(1);
    expect(screen.getByText(/Celestial Tourbillon Noir/i)).toBeInTheDocument();
  });

  it('filters watches dynamically via the search input', async () => {
    const user = userEvent.setup();
    render(<App />);

    const searchInput = screen.getByTestId('search-input');
    await user.type(searchInput, 'Platinum');

    const cards = screen.getAllByTestId('watch-card');
    expect(cards).toHaveLength(1);
    expect(screen.getByText(/Geneve Ultra-Thin Perpetuelle/i)).toBeInTheDocument();
  });

  it('adds a timepiece to the Collector Vault and updates badge and subtotal', async () => {
    const user = userEvent.setup();
    render(<App />);

    const firstCard = screen.getAllByTestId('watch-card')[0];
    const acquireBtn = within(firstCard).getByRole('button', { name: /Acquire Timepiece/i });
    await user.click(acquireBtn);

    expect(screen.getByTestId('vault-count')).toHaveTextContent('1');

    await user.click(screen.getByTestId('vault-button'));
    const drawer = screen.getByTestId('vault-drawer');
    expect(within(drawer).getByText(/Aethelgard Sovereign Chronograph/i)).toBeInTheDocument();
    expect(screen.getByTestId('vault-subtotal')).toHaveTextContent('$18,500');
  });

  it('opens the technical movement specification modal when Inspect Movement is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const firstCard = screen.getAllByTestId('watch-card')[0];
    await user.click(within(firstCard).getByRole('button', { name: /Inspect Movement/i }));

    const modal = screen.getByTestId('movement-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/Caliber CC-92 Automatic Column-Wheel/i)).toBeInTheDocument();
  });

  it('switches display currency between USD, CHF, and EUR', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByTestId('price-cc-01')).toHaveTextContent('$18,500');

    const select = screen.getByTestId('currency-select');
    await user.selectOptions(select, 'CHF');
    expect(screen.getByTestId('price-cc-01')).toHaveTextContent('CHF 16,280');

    await user.selectOptions(select, 'EUR');
    expect(screen.getByTestId('price-cc-01')).toHaveTextContent('€17,020');
  });
});
