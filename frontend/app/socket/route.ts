import { Server } from "socket.io"
import type { NextApiResponseServerIO } from "@/types/socket"
import { type NextRequest, NextResponse } from "next/server"

// Global variable to store the Socket.IO server instance
let io: Server

// Global variable to track if simulation is running
let simulationInterval: NodeJS.Timeout | null = null
let isSimulating = false

export async function GET(req: NextRequest) {
  if (!io) {
    // Initialize Socket.IO server if it doesn't exist
    const res = new NextResponse()
    const responseServerIo = res as unknown as NextApiResponseServerIO

    io = new Server(responseServerIo.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
    })

    responseServerIo.socket.server.io = io

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id)

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id)
      })
    })

    // Start simulation if it was running
    if (isSimulating && !simulationInterval) {
      startSimulation()
    }
  }

  return new NextResponse("Socket.IO server initialized", { status: 200 })
}

// Helper function to generate random data
function startSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval)
  }

  isSimulating = true
  let breathingRate = 15 // Starting breathing rate
  let motionState = 0 // Starting motion state

  simulationInterval = setInterval(() => {
    if (!io) return

    const timestamp = new Date().toISOString()

    // Randomly change motion state with 10% probability
    if (Math.random() < 0.5) {
      motionState = motionState === 0 ? 1 : 0
    }

    // Emit motion data
    io.emit("motionData", {
      value: motionState,
      timestamp,
    })

    // Vary breathing rate slightly
    breathingRate += (Math.random() - 0.5) * 2
    breathingRate = Math.max(8, Math.min(25, breathingRate)) // Keep between 8-25

    // Emit breathing data
    io.emit("breathingData", {
      value: Number.parseFloat(breathingRate.toFixed(1)),
      timestamp,
    })
  }, 1000) // Update every second
}

function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }
  isSimulating = false
}

export const dynamic = "force-dynamic"
