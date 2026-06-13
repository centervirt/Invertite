import React, { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import api from '../services/api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const DynamicChart = ({ dataKey, chartType = 'line' }) => {
  const [chartData, setChartData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { data } = await api.get(`/market/chart-data/${dataKey}`)
        
        // Estilizar los datasets para combinar con el look de Invertite
        const styledDatasets = data.data.datasets.map((dataset, idx) => {
          const isSecond = idx > 0
          const color = isSecond ? '#3B82F6' : '#00C9A7' // Teal vs Blue
          return {
            ...dataset,
            borderColor: color,
            backgroundColor: isSecond ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 201, 167, 0.2)',
            tension: 0.3,
            borderWidth: 3,
            pointBackgroundColor: color,
            pointBorderColor: '#0B0F1A',
            pointHoverRadius: 7,
            pointRadius: 4,
          }
        })

        setChartData({
          labels: data.data.labels,
          datasets: styledDatasets
        })
      } catch (err) {
        console.error('Error al cargar datos del gráfico:', err)
        setError('No se pudieron cargar los datos del gráfico.')
      } finally {
        setIsLoading(false)
      }
    }

    if (dataKey) {
      fetchChartData()
    }
  }, [dataKey])

  if (isLoading) {
    return (
      <div className="h-64 bg-slate-950/40 rounded-2xl flex items-center justify-center border border-slate-900">
        <span className="text-xs text-slate-500 animate-pulse font-semibold">Cargando gráfico...</span>
      </div>
    )
  }

  if (error || !chartData) {
    return (
      <div className="h-64 bg-slate-950/40 rounded-2xl flex items-center justify-center border border-slate-900 p-4 text-center">
        <span className="text-xs text-rose-500 font-semibold">⚠️ {error || 'Error'}</span>
      </div>
    )
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8', // Slate-400
          font: { size: 11, weight: 'bold', family: 'Inter' }
        }
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: '#1e293b',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(30, 41, 59, 0.3)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(30, 41, 59, 0.3)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      }
    }
  }

  return (
    <div className="h-64 bg-slate-950/20 rounded-2xl border border-slate-900/40 p-4">
      {chartType === 'bar' ? (
        <Bar data={chartData} options={options} />
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  )
}

export default DynamicChart
