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

interface CSIAmplitudeChartProps {
  data: CSIData[]
  topic?: string
}

export function CSIAmplitudeChart({ data, topic }: CSIAmplitudeChartProps) {
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

    // Get the latest data point
    const latestData = filteredData[filteredData.length - 1]

    if (!latestData) return

    // Extract CSI values - handle different possible formats
    let csiValues: number[] = []
    let labels: string[] = []

    if (latestData.CSIs && Array.isArray(latestData.CSIs)) {
      // Format 1: CSIs is an array of values
      csiValues = latestData.CSIs.map((val) => {
        const parsed = typeof val === "string" ? Number.parseFloat(val) : val
        return isNaN(parsed) ? 0 : parsed
      })
      labels = csiValues.map((_, index) => `${index}`)
    } else if (latestData.subcarriers && Array.isArray(latestData.subcarriers)) {
      // Format 2: subcarriers is an array of objects with amplitude
      csiValues = latestData.subcarriers.map((sc) => sc.amplitude || 0)
      labels = latestData.subcarriers.map((sc) => `${sc.index || 0}`)
    } else if (latestData.csi && typeof latestData.csi === "string") {
      // Format 3: csi is a string that might be parseable as JSON
      try {
        const csiData = JSON.parse(latestData.csi)
        if (Array.isArray(csiData)) {
          csiValues = csiData.map((val) => (typeof val === "number" ? val : 0))
          labels = csiValues.map((_, index) => `${index}`)
        }
      } catch (e) {
        console.error("Failed to parse CSI data:", e)
      }
    }

    // If we still don't have data, try to find any array in the object
    if (csiValues.length === 0) {
      for (const [key, value] of Object.entries(latestData)) {
        if (Array.isArray(value) && value.length > 0) {
          const numericValues = value.map((v) => {
            const parsed = typeof v === "string" ? Number.parseFloat(v) : typeof v === "number" ? v : 0
            return isNaN(parsed) ? 0 : parsed
          })

          if (numericValues.some((v) => v !== 0)) {
            csiValues = numericValues
            labels = numericValues.map((_, index) => `${index}`)
            console.log(`Found data in field: ${key}`)
            break
          }
        }
      }
    }

    // If we still don't have data, log the data structure for debugging
    if (csiValues.length === 0) {
      console.log("Could not find CSI data in:", latestData)
      return
    }

    setChartData({
      labels,
      datasets: [
        {
          label: "CSI Amplitude",
          data: csiValues,
          borderColor: "hsl(var(--chart-1))",
          backgroundColor: "hsla(var(--chart-1), 0.2)",
          tension: 0.3,
        },
      ],
    })
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
        title: {
          display: true,
          text: "Amplitude",
        },
      },
      x: {
        title: {
          display: true,
          text: "Subcarrier Index",
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
        <CardTitle>CSI Amplitude</CardTitle>
        <CardDescription>
          {topic ? `Visualization for topic: ${topic}` : "Real-time CSI amplitude visualization"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.datasets.length > 0 && chartData.labels.length > 0 ? (
            <Line ref={chartRef} options={options} data={chartData} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">No CSI data available</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
