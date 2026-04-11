import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Tutorial } from '@/components/Tutorial/Tutorial';
import { TUTORIAL_STEPS } from '@/components/Tutorial/TutorialLogic';
import { db } from '@/services/database.service';
import { useSettingsStore } from '@/state/settings.store';

// Mock IndexedDB via Dexie table
vi.mock('@/services/database.service', () => ({
  db: {
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('Tutorial', () => {
  beforeEach(() => {
    // Reset tutorialSeen to false before each test
    useSettingsStore.setState({ tutorialSeen: false });
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<Tutorial isOpen={false} onClose={vi.fn()} />);
    // Should render empty fragment — no dialog content visible
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders the first step initially when open', () => {
    render(<Tutorial isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(TUTORIAL_STEPS[0]!.title)).toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });

  it('advances to the next step when Next is clicked', () => {
    render(<Tutorial isOpen={true} onClose={vi.fn()} />);

    const nextBtn = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(TUTORIAL_STEPS[1]!.title)).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('advances through all steps sequentially', () => {
    render(<Tutorial isOpen={true} onClose={vi.fn()} />);

    for (let i = 0; i < TUTORIAL_STEPS.length - 1; i++) {
      expect(screen.getByText(TUTORIAL_STEPS[i]!.title)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }

    // Last step
    expect(screen.getByText(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1]!.title)).toBeInTheDocument();
  });

  it('shows "Let\'s Play!" on the last step instead of "Next"', () => {
    render(<Tutorial isOpen={true} onClose={vi.fn()} />);

    // Navigate to last step
    for (let i = 0; i < TUTORIAL_STEPS.length - 1; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }

    expect(screen.queryByRole('button', { name: /next/i })).toBeNull();
    expect(screen.getByRole('button', { name: /let's play/i })).toBeInTheDocument();
  });

  it('calls onClose when Skip is clicked', () => {
    const onClose = vi.fn();
    render(<Tutorial isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /skip tutorial/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when "Let\'s Play!" is clicked on the last step', () => {
    const onClose = vi.fn();
    render(<Tutorial isOpen={true} onClose={onClose} />);

    // Navigate to last step
    for (let i = 0; i < TUTORIAL_STEPS.length - 1; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }

    fireEvent.click(screen.getByRole('button', { name: /let's play/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('marks tutorialSeen in the settings store on close via Skip', () => {
    render(<Tutorial isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /skip tutorial/i }));

    expect(useSettingsStore.getState().tutorialSeen).toBe(true);
  });

  it('marks tutorialSeen in the settings store on close via Let\'s Play!', () => {
    render(<Tutorial isOpen={true} onClose={vi.fn()} />);

    // Navigate to last step
    for (let i = 0; i < TUTORIAL_STEPS.length - 1; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }

    fireEvent.click(screen.getByRole('button', { name: /let's play/i }));

    expect(useSettingsStore.getState().tutorialSeen).toBe(true);
  });

  it('persists tutorialSeen to the database on close', async () => {
    render(<Tutorial isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /skip tutorial/i }));

    // Wait for async DB write
    await vi.waitFor(() => {
      expect(db.settings.put).toHaveBeenCalledWith(
        expect.objectContaining({ tutorialSeen: true }),
      );
    });
  });

  it('has the correct number of step dots', () => {
    render(<Tutorial isOpen={true} onClose={vi.fn()} />);

    const tabList = screen.getByRole('tablist', { name: /tutorial progress/i });
    const dots = tabList.querySelectorAll('[role="tab"]');

    expect(dots).toHaveLength(TUTORIAL_STEPS.length);
  });

  it('marks the correct dot as selected', () => {
    render(<Tutorial isOpen={true} onClose={vi.fn()} />);

    const tabList = screen.getByRole('tablist', { name: /tutorial progress/i });
    const dots = tabList.querySelectorAll('[role="tab"]');

    expect(dots[0]).toHaveAttribute('aria-selected', 'true');
    expect(dots[1]).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(dots[0]).toHaveAttribute('aria-selected', 'false');
    expect(dots[1]).toHaveAttribute('aria-selected', 'true');
  });
});
