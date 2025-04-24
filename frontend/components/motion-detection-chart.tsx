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
const MOTION_THRESHOLD = 0.5 // Threshold for motion detection

interface MotionDetectionChartProps {
  data: CSIData[]
  topic?: string
}

export function MotionDetectionChart({ data, topic }: MotionDetectionChartProps) {
  const [chartData, setChartData] = useState<{
    labels: string[]
    datasets: {
      label: string
      data: number[]
      borderColor: string
      backgroundColor: string
      stepped: boolean
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

    // Get timestamps and detect motion based on CSI variance
    const timestamps: string[] = []
    const motionValues: number[] = []

    filteredData.forEach((item) => {
      // Get timestamp
      const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()

      // Extract CSI values to calculate variance
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
        timestamps.push(timestamp)

        // Calculate variance of CSI values as a simple motion detection
        const mean = csiValues.reduce((sum, val) => sum + val, 0) / csiValues.length
        const variance = csiValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / csiValues.length

        // Detect motion if variance is above threshold
        motionValues.push(variance > MOTION_THRESHOLD ? 1 : 0)
      }
    })

    // Limit to the last MAX_DATA_POINTS
    const limitedTimestamps = timestamps.slice(-MAX_DATA_POINTS)
    const limitedMotion = motionValues.slice(-MAX_DATA_POINTS)

    if (limitedTimestamps.length > 0 && limitedMotion.length > 0) {
      setChartData({
        labels: limitedTimestamps,
        datasets: [
          {
            label: "Motion Detection",
            data: limitedMotion,
            borderColor: "hsl(var(--chart-3))",
            backgroundColor: "hsla(var(--chart-3), 0.2)",
            stepped: true,
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
        min: -0.1,
        max: 1.1,
        ticks: {
          stepSize: 1,
          callback: (value) => (value === 0 ? "No Motion" : value === 1 ? "Motion" : ""),
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
        <CardTitle>Motion Detection</CardTitle>
        <CardDescription>
          {topic
            ? `Motion detection based on CSI variance for topic: ${topic}`
            : "Motion detection based on CSI variance"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.datasets.length > 0 && chartData.labels.length > 0 ? (
            <Line ref={chartRef} options={options} data={chartData} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No motion data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
