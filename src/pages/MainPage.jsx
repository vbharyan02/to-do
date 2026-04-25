import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

const STATUS_ORDER = ['todo', 'in_progress', 'done']
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const STATUS_BADGE = {
  todo: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
}
const FILTER_CARD = {
  todo: 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300',
  in_progress: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-gray-800 dark:border-blue-700 dark:text-blue-300',
  done: 'bg-green-50 border-green-200 text-green-700 dark:bg-gray-800 dark:border-green-700 dark:text-green-300'
}

export default function MainPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [totalTime, setTotalTime] = useState('')
  const [formError, setFormError] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => { fetchTasks() }, [])

  function toggleDark() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  async function fetchTasks() {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) { setFormError('Title is required'); return }
    setFormError(null)
    setFormLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        total_time: totalTime !== '' ? parseInt(totalTime, 10) : null,
        status: 'todo'
      }).select().single()
      if (error) throw error
      setTasks(prev => [data, ...prev])
      setTitle(''); setDescription(''); setDueDate(''); setTotalTime('')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleUpdateStatus(task) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length]
    try {
      const { data, error } = await supabase.from('tasks').update({ status: next }).eq('id', task.id).select().single()
      if (error) throw error
      setTasks(prev => prev.map(t => t.id === data.id ? data : t))
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  const counts = { todo: 0, in_progress: 0, done: 0 }
  tasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++ })
  const filtered = filter ? tasks.filter(t => t.status === filter) : tasks

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading tasks…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
      <div className="text-center">
        <p className="text-red-500 mb-3">{error}</p>
        <button onClick={fetchTasks} className="text-sm text-blue-600 dark:text-blue-400 underline">Try again</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200 dark:shadow-none">
              <span className="text-white font-bold">✓</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              title="Toggle dark mode"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
              className="text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {STATUS_ORDER.map(s => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? '' : s)}
              className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${FILTER_CARD[s]} ${
                filter === s ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900' : 'hover:opacity-80'
              }`}
            >
              <span className="block text-2xl font-bold leading-none mb-1">{counts[s]}</span>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">New Task</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              placeholder="Task title *"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400 dark:placeholder-gray-500"
            />
            <input
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400 dark:placeholder-gray-500"
            />
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <input
              type="number"
              min="0"
              placeholder="Total Time (minutes)"
              value={totalTime}
              onChange={e => setTotalTime(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400 dark:placeholder-gray-500"
            />
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={formLoading}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg w-full font-medium transition-colors"
            >
              {formLoading ? 'Adding…' : '+ Add Task'}
            </button>
          </form>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-300">No tasks yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first task above</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map(task => (
              <li key={task.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-gray-900 dark:text-white ${task.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{task.description}</p>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">📅 Due {task.due_date}</p>
                    )}
                    {task.total_time > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">⏱ Time: {task.total_time} min</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleUpdateStatus(task)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer hover:opacity-75 transition-opacity ${STATUS_BADGE[task.status]}`}
                      title="Click to advance status"
                    >
                      {STATUS_LABELS[task.status] || task.status}
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
