import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function App() {
  const [health, setHealth] = useState('checking...')
  const [services, setServices] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth('unreachable'))

    fetch(`${API_BASE_URL}/app/services`)
      .then((res) => res.json())
      .then(setServices)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <section id="status">
      <h1>nailshop</h1>
      <p>API health: {health}</p>
      {error && <p className="error">Failed to load services: {error}</p>}
      {services && (
        <ul>
          {services.map((service) => (
            <li key={service.id}>
              {service.name} - {service.base_price}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default App
