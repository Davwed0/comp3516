import { type NextRequest, NextResponse } from "next/server"

// Global variables to track simulation state
let simulationInterval: NodeJS.Timeout | null = null
let isSimulating = false

export async function POST(req: NextRequest) {
  try {
    const { simulate } = await req.json()

    if (simulate) {
      // Start simulation
      if (!isSimulating) {
        isSimulating = true

        // Trigger the socket route to start simulation
        await fetch(new URL("/api/socket", req.url).toString(), {
          method: "GET",
        })
      }
    } else {
      // Stop simulation
      isSimulating = false
      if (simulationInterval) {
        clearInterval(simulationInterval)
        simulationInterval = null
      }
    }

    return NextResponse.json({ simulating: isSimulating })
  } catch (error) {
    console.error("Error in simulate route:", error)
    return NextResponse.json({ error: "Failed to toggle simulation" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
