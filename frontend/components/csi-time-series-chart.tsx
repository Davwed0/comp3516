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

interface CSITimeSeriesChartProps {
  data: CSIData[]
  topic?: string
  subcarrierIndex?: number
}

export function CSITimeSeriesChart({ data, topic, subcarrierIndex = 0 }: CSITimeSeriesChartProps) {
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

    // Get timestamps and CSI values for the specified subcarrier index
    const timestamps: string[] = []
    const csiValues: number[] = []

    filteredData.forEach((item) => {
      // Get timestamp
      const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()

      // Extract CSI value for the specified subcarrier
      let csiValue: number | null = null

      // Try different data formats
      if (item.CSIs && Array.isArray(item.CSIs) && item.CSIs.length > subcarrierIndex) {
        // Format 1: CSIs is an array of values
        const val = item.CSIs[subcarrierIndex]
        csiValue = typeof val === "string" ? Number.parseFloat(val) : val
      } else if (item.subcarriers && Array.isArray(item.subcarriers)) {
        // Format 2: subcarriers is an array of objects with amplitude
        const subcarrier = item.subcarriers.find((sc) => sc.index === subcarrierIndex)
        if (subcarrier) {
          csiValue = subcarrier.amplitude
        }
      } else {
        // Try to find any array in the object
        for (const [key, value] of Object.entries(item)) {
          if (Array.isArray(value) && value.length > subcarrierIndex) {
            const val = value[subcarrierIndex]
            csiValue = typeof val === "string" ? Number.parseFloat(val) : typeof val === "number" ? val : null
            if (csiValue !== null && !isNaN(csiValue)) {
              break
            }
          }
        }
      }

      if (csiValue !== null && !isNaN(csiValue)) {
        timestamps.push(timestamp)
        csiValues.push(csiValue)
      }
    })

    // Limit to the last MAX_DATA_POINTS
    const limitedTimestamps = timestamps.slice(-MAX_DATA_POINTS)
    const limitedValues = csiValues.slice(-MAX_DATA_POINTS)

    if (limitedTimestamps.length > 0 && limitedValues.length > 0) {
      setChartData({
        labels: limitedTimestamps,
        datasets: [
          {
            label: `Subcarrier ${subcarrierIndex}`,
            data: limitedValues,
            borderColor: "hsl(var(--chart-2))",
            backgroundColor: "hsla(var(--chart-2), 0.2)",
            tension: 0.3,
          },
        ],
      })
    }
  }, [data, topic, subcarrierIndex])

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animation for real-time updates
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Amplitude",
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
        <CardTitle>CSI Time Series</CardTitle>
        <CardDescription>
          {topic
            ? `Subcarrier ${subcarrierIndex} amplitude over time for topic: ${topic}`
            : `Subcarrier ${subcarrierIndex} amplitude over time`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.datasets.length > 0 && chartData.labels.length > 0 ? (
            <Line ref={chartRef} options={options} data={chartData} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No time series data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
