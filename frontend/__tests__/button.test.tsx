import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/button';

describe('Button Component Unit Tests', () => {
  it('should render button text correctly', () => {
    render(<Button>Generate ID Cards</Button>);
    expect(screen.getByRole('button', { name: /Generate ID Cards/i })).toBeDefined();
  });

  it('should trigger onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit Order</Button>);
    const btn = screen.getByRole('button', { name: /Submit Order/i });
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should respect disabled attribute and not fire clicks', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Processing...</Button>);
    const btn = screen.getByRole('button', { name: /Processing.../i });
    expect(btn.hasAttribute('disabled')).toBe(true);
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render emerald brand styling variant', () => {
    render(<Button variant="emerald">Approved Template</Button>);
    const btn = screen.getByRole('button', { name: /Approved Template/i });
    expect(btn.className).toContain('bg-[#15803D]');
  });
});
