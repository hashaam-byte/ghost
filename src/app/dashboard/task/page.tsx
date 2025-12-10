"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/lib/auth-context';

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  xpReward: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function GhostTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    dueDate: '',
  });

  const categories = [
    { id: 'school', icon: '📚', label: 'School', color: 'purple' },
    { id: 'work', icon: '💼', label: 'Work', color: 'blue' },
    { id: 'personal', icon: '⭐', label: 'Personal', color: 'pink' },
    { id: 'fitness', icon: '💪', label: 'Fitness', color: 'green' },
    { id: 'creative', icon: '🎨', label: 'Creative', color: 'yellow' },
  ];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks([data.task, ...tasks]);
        setShowCreateModal(false);
        setNewTask({
          title: '',
          description: '',
          category: 'personal',
          priority: 'medium',
          dueDate: '',
        });
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(tasks.map(t => t.id === taskId ? data.task : t));
        
        // Show XP reward notification
        showXPNotification(data.xpEarned);
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== taskId));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const showXPNotification = (xp: number) => {
    const notification = document.createElement('div');
    notification.className = 'fixed top-24 right-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-bounce z-50';
    notification.innerHTML = `<div class="text-2xl font-bold">+${xp} XP 🎉</div>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 border-red-500/30 text-red-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
      case 'low': return 'bg-green-500/20 border-green-500/30 text-green-400';
      default: return 'bg-slate-500/20 border-slate-500/30 text-slate-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    return categories.find(c => c.id === category)?.icon || '⭐';
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return task.status === 'pending';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    totalXP: tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.xpReward, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">🎯</span>
                Ghost Tasks
              </h1>
              <p className="text-slate-400">Level up your life, one task at a time</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition"
            >
              + New Task
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-purple-500/20 p-6">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm text-slate-400">Total Tasks</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-yellow-500/20 p-6">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-sm text-slate-400">Pending</div>
            <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-green-500/20 p-6">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm text-slate-400">Completed</div>
            <div className="text-3xl font-bold text-green-400">{stats.completed}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-xl rounded-xl border border-purple-500/30 p-6">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-sm text-purple-300">Total XP Earned</div>
            <div className="text-3xl font-bold text-white">{stats.totalXP}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'completed'
                ? 'bg-green-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Completed ({stats.completed})
          </button>
        </div>

        {/* Tasks List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-spin">👻</div>
            <div className="text-white text-xl">Loading tasks...</div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-12 text-center">
            <div className="text-8xl mb-4">🎯</div>
            <div className="text-2xl font-bold text-white mb-2">No Tasks Yet!</div>
            <div className="text-slate-400 mb-6">Create your first task to start earning XP</div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold hover:shadow-lg transition"
            >
              Create Task
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`bg-slate-900/50 backdrop-blur-xl rounded-xl border p-6 transition ${
                  task.status === 'completed'
                    ? 'border-green-500/30 opacity-75'
                    : 'border-purple-500/20 hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => task.status === 'pending' && completeTask(task.id)}
                    disabled={task.status === 'completed'}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                      task.status === 'completed'
                        ? 'bg-green-500 border-green-500'
                        : 'border-purple-500 hover:border-purple-400'
                    }`}
                  >
                    {task.status === 'completed' && <span className="text-white text-sm">✓</span>}
                  </button>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className={`text-lg font-bold ${
                          task.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'
                        }`}>
                          {getCategoryIcon(task.category)} {task.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 border border-purple-500/30 text-purple-400">
                          {task.xpReward} XP
                        </span>
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-slate-400 text-sm mb-3">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span>📂</span>
                        {task.category}
                      </span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <span>📅</span>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.completedAt && (
                        <span className="flex items-center gap-1 text-green-400">
                          <span>✅</span>
                          Completed {new Date(task.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="flex-shrink-0 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border-2 border-purple-500/50 max-w-lg w-full p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Task</h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="E.g., Finish math homework"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Add details..."
                  className="w-full h-24 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setNewTask({ ...newTask, category: cat.id })}
                      className={`p-3 rounded-xl border-2 transition text-center ${
                        newTask.category === cat.id
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-slate-700 hover:border-slate-600 bg-slate-800'
                      }`}
                    >
                      <div className="text-2xl mb-1">{cat.icon}</div>
                      <div className="text-xs text-white font-semibold">{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['low', 'medium', 'high'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setNewTask({ ...newTask, priority })}
                      className={`p-3 rounded-xl border-2 transition ${
                        newTask.priority === priority
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-slate-700 hover:border-slate-600 bg-slate-800'
                      }`}
                    >
                      <div className="text-white font-semibold capitalize">{priority}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 border border-slate-700 rounded-xl font-semibold text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={!newTask.title.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}