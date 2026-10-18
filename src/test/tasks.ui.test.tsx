import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Task } from '../types';
import TaskBoard from '../components/tasks/TaskBoard';
import TaskCard from '../components/tasks/TaskCard';
import TaskModal from '../components/tasks/TaskModal';
import FilterBar from '../components/tasks/FilterBar';
import BackupModal from '../components/common/BackupModal';

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Eliminate Ethereal Swarm in Hollow Zero',
    description: 'Clear Section 7 before corruption reaches level 4.',
    category: 'Hollow Zero',
    priority: 'S',
    status: 'todo',
    completed: false,
    dueDate: '2026-10-25',
    tags: ['urgent', 'bounty'],
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:00:00Z',
    completedAt: null,
  },
  {
    id: 'task-2',
    title: 'Inspect Video Store Inventory',
    description: 'Sort retro VHS tapes on Sixth Street.',
    category: 'Story',
    priority: 'A',
    status: 'completed',
    completed: true,
    dueDate: '2026-10-20',
    tags: ['store'],
    createdAt: '2026-10-17T10:00:00Z',
    updatedAt: '2026-10-18T12:00:00Z',
    completedAt: '2026-10-18T12:00:00Z',
  },
  {
    id: 'task-3',
    title: 'Defeat Shiyu Defense Floor 10 Boss',
    description: 'High difficulty challenge.',
    category: 'Shiyu Defense',
    priority: 'B',
    status: 'todo',
    completed: false,
    dueDate: '2026-10-01', // Overdue
    tags: ['boss', 'endgame'],
    createdAt: '2026-09-30T10:00:00Z',
    updatedAt: '2026-09-30T10:00:00Z',
    completedAt: null,
  },
];

describe('TaskCard Component', () => {
  it('renders task card with all required test IDs and priority S', () => {
    const handleToggle = vi.fn();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <TaskCard
        task={mockTasks[0]}
        onToggleComplete={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    const card = screen.getByTestId('task-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('data-completed', 'false');

    const title = screen.getByTestId('task-title');
    expect(title).toHaveTextContent('Eliminate Ethereal Swarm in Hollow Zero');

    const priorityBadge = screen.getByTestId('task-priority-badge');
    expect(priorityBadge).toHaveTextContent('S');

    // Complete button
    const completeBtn = screen.getByTestId('task-complete-btn');
    fireEvent.click(completeBtn);
    expect(handleToggle).toHaveBeenCalledWith('task-1');

    // Edit button
    const editBtn = screen.getByTestId('task-edit-btn');
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockTasks[0]);

    // Delete button
    const deleteBtn = screen.getByTestId('task-delete-btn');
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith('task-1');
  });

  it('renders completed task card with data-completed="true" and CLEARED stamp', () => {
    render(<TaskCard task={mockTasks[1]} />);

    const card = screen.getByTestId('task-card');
    expect(card).toHaveAttribute('data-completed', 'true');
    expect(screen.getByText(/CLEARED \/\/ ARCHIVED/i)).toBeInTheDocument();
  });

  it('highlights overdue tasks with alert warning', () => {
    render(<TaskCard task={mockTasks[2]} />);
    expect(screen.getByText(/OVERDUE: 2026-10-01/i)).toBeInTheDocument();
  });
});

describe('TaskModal Component', () => {
  it('submits valid task data upon form submission', () => {
    const handleSubmit = vi.fn();
    const handleClose = vi.fn();

    render(
      <TaskModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByTestId('task-modal')).toBeInTheDocument();

    const titleInput = screen.getByTestId('task-title-input');
    const descInput = screen.getByTestId('task-desc-input');
    const prioritySelect = screen.getByTestId('task-priority-select');
    const categoryInput = screen.getByTestId('task-category-input');
    const dueDateInput = screen.getByTestId('task-due-date-input');
    const tagsInput = screen.getByTestId('task-tags-input');

    fireEvent.change(titleInput, { target: { value: 'New Test Commission' } });
    fireEvent.change(descInput, { target: { value: 'Test description text' } });
    fireEvent.change(prioritySelect, { target: { value: 'S' } });
    fireEvent.change(categoryInput, { target: { value: 'Combat' } });
    fireEvent.change(dueDateInput, { target: { value: '2026-10-30' } });
    fireEvent.change(tagsInput, { target: { value: 'test, proxy' } });

    fireEvent.click(screen.getByTestId('task-submit-btn'));

    expect(handleSubmit).toHaveBeenCalledWith({
      title: 'New Test Commission',
      description: 'Test description text',
      priority: 'S',
      category: 'Combat',
      dueDate: '2026-10-30',
      tags: ['test', 'proxy'],
    });
    expect(handleClose).toHaveBeenCalled();
  });

  it('displays validation error and does not submit when title is empty', () => {
    const handleSubmit = vi.fn();
    render(<TaskModal isOpen={true} onClose={() => {}} onSubmit={handleSubmit} />);

    const titleInput = screen.getByTestId('task-title-input');
    fireEvent.change(titleInput, { target: { value: '   ' } });

    fireEvent.click(screen.getByTestId('task-submit-btn'));

    const error = screen.getByTestId('task-form-error');
    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent(/COMMISSION TITLE REQUIRED/i);
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('pre-populates fields in edit mode', () => {
    render(
      <TaskModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
        initialTask={mockTasks[0]}
      />
    );

    const titleInput = screen.getByTestId('task-title-input') as HTMLInputElement;
    expect(titleInput.value).toBe(mockTasks[0].title);

    const prioritySelect = screen.getByTestId('task-priority-select') as HTMLSelectElement;
    expect(prioritySelect.value).toBe('S');
  });
});

describe('FilterBar Component', () => {
  it('renders search input and filter buttons with test IDs', () => {
    const handleSearch = vi.fn();
    const handleCategory = vi.fn();
    const handleStatus = vi.fn();

    render(
      <FilterBar
        searchQuery=""
        onSearchChange={handleSearch}
        selectedCategory="all"
        onCategoryChange={handleCategory}
        selectedStatus="all"
        onStatusChange={handleStatus}
      />
    );

    const searchInput = screen.getByTestId('task-search-input');
    expect(searchInput).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: 'swarm' } });
    expect(handleSearch).toHaveBeenCalledWith('swarm');

    const statusAll = screen.getByTestId('filter-status-all');
    const statusActive = screen.getByTestId('filter-status-active');
    const statusCompleted = screen.getByTestId('filter-status-completed');
    expect(statusAll).toBeInTheDocument();
    expect(statusActive).toBeInTheDocument();
    expect(statusCompleted).toBeInTheDocument();

    fireEvent.click(statusActive);
    expect(handleStatus).toHaveBeenCalledWith('active');

    // Skewed category pills
    const hollowZeroPill = screen.getByText('HOLLOW ZERO');
    fireEvent.click(hollowZeroPill);
    expect(handleCategory).toHaveBeenCalledWith('HOLLOW ZERO');
  });
});

describe('TaskBoard Component', () => {
  it('renders task list and header actions', () => {
    render(<TaskBoard tasks={mockTasks} />);

    expect(screen.getByTestId('tasks-view')).toBeInTheDocument();
    expect(screen.getByTestId('create-task-btn')).toBeInTheDocument();
    expect(screen.getAllByTestId('task-card')).toHaveLength(3);
  });

  it('renders exact required empty state text when no tasks exist', () => {
    render(<TaskBoard tasks={[]} />);

    expect(
      screen.getByText(/NO ACTIVE COMMISSIONS FOUND \/\/ READY FOR DISPATCH/i)
    ).toBeInTheDocument();
  });
});

describe('BackupModal Component', () => {
  it('renders export and import controls', () => {
    const handleExport = vi.fn().mockReturnValue(JSON.stringify({ test: 'data' }));
    const handleImport = vi.fn().mockReturnValue({ valid: true });

    render(
      <BackupModal
        isOpen={true}
        onClose={() => {}}
        onExport={handleExport}
        onImport={handleImport}
      />
    );

    expect(screen.getByTestId('backup-modal')).toBeInTheDocument();
    expect(screen.getByTestId('export-backup-btn')).toBeInTheDocument();
    expect(screen.getByTestId('import-json-textarea')).toBeInTheDocument();
    expect(screen.getByTestId('import-file-input')).toBeInTheDocument();
    expect(screen.getByTestId('import-backup-btn')).toBeInTheDocument();

    // Trigger export
    fireEvent.click(screen.getByTestId('export-backup-btn'));
    expect(handleExport).toHaveBeenCalled();
  });

  it('displays backup-error-alert when invalid JSON is submitted', () => {
    const handleImport = vi.fn().mockReturnValue({
      valid: false,
      error: 'SYNTAX ERROR // INVALID JSON FORMAT',
    });

    render(
      <BackupModal
        isOpen={true}
        onClose={() => {}}
        onExport={() => ''}
        onImport={handleImport}
      />
    );

    const textarea = screen.getByTestId('import-json-textarea');
    fireEvent.change(textarea, { target: { value: '{ invalid json :::' } });

    fireEvent.click(screen.getByTestId('import-backup-btn'));

    const alert = screen.getByTestId('backup-error-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/SYNTAX ERROR/i);
  });

  it('handles empty backup submission with validation error', () => {
    const handleImport = vi.fn();
    render(
      <BackupModal
        isOpen={true}
        onClose={() => {}}
        onExport={() => ''}
        onImport={handleImport}
      />
    );

    fireEvent.click(screen.getByTestId('import-backup-btn'));

    const alert = screen.getByTestId('backup-error-alert');
    expect(alert).toBeInTheDocument();
    expect(handleImport).not.toHaveBeenCalled();
  });
});

describe('Stress & Boundary Tests (Tier 2 Alignment)', () => {
  it('handles 300+ char title with special chars and HTML in TaskCard without crashing', () => {
    const extremeTask: Task = {
      id: 'task-stress',
      title: '⚡ [URGENT-ZZZ] Hollow Zero Deep Diver Comm: ' + 'A'.repeat(220) + ' <script>alert("xss")</script> 💥',
      description: 'Hazard Level 99: ' + 'B'.repeat(300),
      category: 'Combat',
      priority: 'S',
      status: 'todo',
      completed: false,
      dueDate: '2026-10-31',
      tags: ['extreme', 'stress'],
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z',
      completedAt: null,
    };

    render(<TaskCard task={extremeTask} />);

    const titleEl = screen.getByTestId('task-title');
    expect(titleEl).toBeInTheDocument();
    expect(titleEl.textContent).toContain('Hollow Zero Deep Diver Comm');
    expect(titleEl.textContent).toContain('<script>alert("xss")</script>');
    expect(document.querySelector('script:not([src])')).toBeNull();
  });
});
