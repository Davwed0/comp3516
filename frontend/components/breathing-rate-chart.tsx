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
    if (!data || data.length === 0) return

    // Filter data by topic if provided
    const filteredData = topic ? data.filter((item) => item.topic === topic) : data

    // Get timestamps and breathing rates
    const timestamps: string[] = []
    const breathingRates: number[] = []

    filteredData.forEach((item) => {
      // Get timestamp
      const timestamp = item.timestamp
        ? new Date(item.timestamp).toLocaleTimeString()
        : new Date().toLocaleTimeString()

      // Push timestamp
      timestamps.push(timestamp)

      // Use existing breathing rate value or 0 if None
      const breathingRate = item.breathing_rate !== null ? item.breathing_rate : 0
      breathingRates.push(breathingRate);
    })

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
            ? `Estimated breathing rate based on existing data for topic: ${topic}`
            : "Estimated breathing rate based on existing data"}
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
