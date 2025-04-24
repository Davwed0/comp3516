"use client"

import { useEffect, useState, useRef } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js"
import { Line } from "react-chartjs-2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CSIData } from "@/types/csi-data"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const MAX_DATA_POINTS = 50
const WINDOW_SIZE = 10 // Window size for breathing rate calculation

interface BreathingRateChartProps {
  data: CSIData[]
  topic?: string
}

export function BreathingRateChart({ data, topic }: BreathingRateChartProps) {
  const [chartData, setChartData] = useState<{
    labels: string[]
    datasets: {
      label: string
      data: number[]
      borderColor: string
      backgroundColor: string
      tension: number
    }[]
  }>({
    labels: [],
    datasets: [],
  })

  const chartRef = useRef<ChartJS<"line"> | null>(null)

  useEffect(() => {
    if (!data || data.length < WINDOW_SIZE) return

    // Filter data by topic if provided
    const filteredData = topic ? data.filter((item) => item.topic === topic) : data
    if (filteredData.length < WINDOW_SIZE) return

    // Get timestamps and calculate breathing rate
    const timestamps: string[] = []
    const breathingRates: number[] = []

    // Use a sliding window to calculate breathing rate
    for (let i = WINDOW_SIZE; i < filteredData.length; i++) {
      const currentItem = filteredData[i]

      // Get timestamp
      const timestamp = currentItem.timestamp
        ? new Date(currentItem.timestamp).toLocaleTimeString()
        : new Date().toLocaleTimeString()

      // Get a window of data
      const window = filteredData.slice(i - WINDOW_SIZE, i)

      // Calculate average CSI value for each data point in the window
      const avgCSIValues: number[] = []

      window.forEach((item) => {
        let csiValues: number[] = []

        // Try different data formats
        if (item.CSIs && Array.isArray(item.CSIs)) {
          // Format 1: CSIs is an array of values
          csiValues = item.CSIs.map((val) => {
            const parsed = typeof val === "string" ? Number.parseFloat(val) : val
            return isNaN(parsed) ? 0 : parsed
          })
        } else if (item.subcarriers && Array.isArray(item.subcarriers)) {
          // Format 2: subcarriers is an array of objects with amplitude
          csiValues = item.subcarriers.map((sc) => sc.amplitude || 0)
        } else {
          // Try to find any array in the object
          for (const [key, value] of Object.entries(item)) {
            if (Array.isArray(value) && value.length > 0) {
              const numericValues = value.map((v) => {
                const parsed = typeof v === "string" ? Number.parseFloat(v) : typeof v === "number" ? v : 0
                return isNaN(parsed) ? 0 : parsed
              })

              if (numericValues.some((v) => v !== 0)) {
                csiValues = numericValues
                break
              }
            }
          }
        }

        if (csiValues.length > 0) {
          const avg = csiValues.reduce((sum, val) => sum + val, 0) / csiValues.length
          avgCSIValues.push(avg)
        }
      })

      if (avgCSIValues.length === WINDOW_SIZE) {
        timestamps.push(timestamp)

        // Normalize values around zero
        const mean = avgCSIValues.reduce((sum, val) => sum + val, 0) / avgCSIValues.length
        const normalizedValues = avgCSIValues.map((val) => val - mean)

        // Count zero crossings as a simple breathing rate estimation
        let crossings = 0
        for (let j = 1; j < normalizedValues.length; j++) {
          if (
            (normalizedValues[j] > 0 && normalizedValues[j - 1] <= 0) ||
            (normalizedValues[j] < 0 && normalizedValues[j - 1] >= 0)
          ) {
            crossings++
          }
        }

        // Calculate breathing rate in breaths per minute
        // Assuming each data point is roughly 1 second apart
        const breathsPerMinute = (crossings / 2) * (60 / WINDOW_SIZE)
        breathingRates.push(Math.min(30, Math.max(0, breathsPerMinute))) // Clamp between 0-30
      }
    }

    // Limit to the last MAX_DATA_POINTS
    const limitedTimestamps = timestamps.slice(-MAX_DATA_POINTS)
    const limitedRates = breathingRates.slice(-MAX_DATA_POINTS)

    if (limitedTimestamps.length > 0 && limitedRates.length > 0) {
      setChartData({
        labels: limitedTimestamps,
        datasets: [
          {
            label: "Breathing Rate (BPM)",
            data: limitedRates,
            borderColor: "hsl(var(--chart-4))",
            backgroundColor: "hsla(var(--chart-4), 0.2)",
            tension: 0.3,
          },
        ],
      })
    }
  }, [data, topic])

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animation for real-time updates
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 30,
        title: {
          display: true,
          text: "Breaths per minute",
        },
      },
      x: {
        title: {
          display: true,
          text: "Time",
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Breathing Rate</CardTitle>
        <CardDescription>
          {topic
            ? `Estimated breathing rate based on CSI data for topic: ${topic}`
            : "Estimated breathing rate based on CSI data"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.datasets.length > 0 && chartData.labels.length > 0 ? (
            <Line ref={chartRef} options={options} data={chartData} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No breathing rate data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
