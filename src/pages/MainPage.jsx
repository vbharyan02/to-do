import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

const STATUS_ORDER = ['todo', 'in_progress', 'done']
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const STATUS_COLORS = { todo: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700' }

export default function MainPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [formError, setFormError] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => { fetchTasks() }, [])

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
        status: 'todo'
      }).select().single()
      if (error) throw error
      setTasks(prev => [data, ...prev])
      setTitle(''); setDescription(''); setDueDate('')
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

  if (isLoading) return <div className="text-center py-8">Loading...</div>
  if (error) return <div className="text-red-500 text-center py-8">{error}</div>

  return (
    <div className="max-w-lg mx-auto mt-8 px-4 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">My Tasks</h1>
        <button onClick={() => supabase.auth.signOut().then(() => navigate('/login'))} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">Logout</button>
      </div>

      <div className="flex gap-2 mb-6">
        {STATUS_ORDER.map(s => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? '' : s)}
            className={`flex-1 text-center py-2 rounded text-sm font-medium border-2 ${filter === s ? 'border-blue-500' : 'border-transparent'} ${STATUS_COLORS[s]}`}
          >
            {STATUS_LABELS[s]}: {counts[s]}
          </button>
        ))}
      </div>

      <form onSubmit={handleCreate} className="mb-6 space-y-2">
        <input placeholder="Task title *" value={title} onChange={e => setTitle(e.target.value)} className="border rounded px-3 py-2 w-full" />
        <input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="border rounded px-3 py-2 w-full" />
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="border rounded px-3 py-2 w-full" />
        {formError && <p className="text-red-500 text-sm">{formError}</p>}
        <button type="submit" disabled={formLoading} className="bg-blue-600 text-white px-4 py-2 rounded w-full disabled:opacity-50">
          {formLoading ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No tasks yet. Create your first one above.</div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(task => (
            <li key={task.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{task.title}</p>
                  {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                  {task.due_date && <p className="text-xs text-gray-400 mt-1">Due: {task.due_date}</p>}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button onClick={() => handleUpdateStatus(task)} className={`text-xs px-2 py-1 rounded cursor-pointer ${STATUS_COLORS[task.status]}`}>
                    {STATUS_LABELS[task.status] || task.status}
                  </button>
                  <button onClick={() => handleDelete(task.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
