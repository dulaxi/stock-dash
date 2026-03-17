import { useState, useEffect } from 'react'
import './App.css'

interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
}

function formatNumber(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  return n.toLocaleString()
}

function App() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch('/api/quotes')
        const data = await res.json()
        setQuotes(data)
        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch quotes:', err)
      }
    }

    fetchQuotes()
    const interval = setInterval(fetchQuotes, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app">
      <div className="logo">XTOX</div>

      <div className="dashboard">
        {loading ? (
          <div className="loading">Loading market data...</div>
        ) : (
          <table className="stock-table">
            <thead>
              <tr>
                <th className="col-symbol">Symbol</th>
                <th className="col-name">Name</th>
                <th className="col-price">Price</th>
                <th className="col-change">Change</th>
                <th className="col-percent">%</th>
                <th className="col-volume">Volume</th>
                <th className="col-cap">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.symbol}>
                  <td className="col-symbol">{q.symbol}</td>
                  <td className="col-name">{q.name}</td>
                  <td className="col-price">${q.price?.toFixed(2)}</td>
                  <td className={`col-change ${q.change >= 0 ? 'up' : 'down'}`}>
                    {q.change >= 0 ? '+' : ''}{q.change?.toFixed(2)}
                  </td>
                  <td className={`col-percent ${q.changePercent >= 0 ? 'up' : 'down'}`}>
                    {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                  </td>
                  <td className="col-volume">{formatNumber(q.volume)}</td>
                  <td className="col-cap">{formatNumber(q.marketCap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default App
