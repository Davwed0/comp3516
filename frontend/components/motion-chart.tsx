"use client"

import { useEffect, useState } from "react"
import { io } from "socket.io-client"
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const MAX_DATA_POINTS = 50

export default function MotionChart() {
  const [motionData, setMotionData] = useState<number[]>([])
  const [labels, setLabels] = useState<string[]>([])

  useEffect(() => {
    const socket = io("/api/socket", {
      path: "/api/socket",
      addTrailingSlash: false,
    })

    socket.on("motionData", (data: { value: number; timestamp: string }) => {
      setMotionData((prevData) => {
        const newData = [...prevData, data.value]
        return newData.length > MAX_DATA_POINTS ? newData.slice(-MAX_DATA_POINTS) : newData
      })

      setLabels((prevLabels) => {
        const time = new Date(data.timestamp).toLocaleTimeString()
        const newLabels = [...prevLabels, time]
        return newLabels.length > MAX_DATA_POINTS ? newLabels.slice(-MAX_DATA_POINTS) : newLabels
      })
    })

    return () => {
      socket.off("motionData")
    }
  }, [])

  const chartData = {
    labels,
    datasets: [
      {
        label: "Motion Detection",
        data: motionData,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "rgb(255, 99, 132)",
        stepped: true,
      },
    ],
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: -0.1,
        max: 1.1,
        ticks: {
          stepSize: 1,
          callback: (value) => (value === 0 ? "No Motion" : value === 1 ? "Motion" : ""),
        },
      },
    },
    animation: {
      duration: 0, // Disable animation for real-time updates
    },
  }

  return (
    <div className="h-[300px]">
      <Line data={chartData} options={options} />
    </div>
  )
}
