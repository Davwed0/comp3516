"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CSIDataTable } from "@/components/csi-data-table"
import { ConnectionStatus } from "@/components/connection-status"
import { useToast } from "@/hooks/use-toast"
import { Search } from "lucide-react"
import type { CSIData } from "@/types/csi-data"

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [csiData, setCsiData] = useState<CSIData[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [brokerAddress, setBrokerAddress] = useState("192.168.31.215")
  const [topicFilter, setTopicFilter] = useState("#")
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return csiData
    return csiData.filter((item) => item.topic && item.topic.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [csiData, searchTerm])

  const connectWebSocket = useCallback(() => {
    const newWs = new WebSocket("ws://localhost:8765")

    newWs.onopen = () => {
      setWs(newWs)
      toast({
        title: "Connected",
        description: "Successfully connected to the WebSocket server",
        variant: "default",
      })
    }

    newWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        if (message.type === "data") {
          // Single data update
          setCsiData((prevData) => {
            const newData = [...prevData, message.payload]
            // Keep only the last 100 records
            return newData.length > 100 ? newData.slice(-100) : newData
          })
        } else if (message.type === "connection_status") {
          setIsConnected(message.connected)
          // Update topic filter if it's provided
          if (message.topic_filter) {
            setTopicFilter(message.topic_filter)
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
      }
    }

    newWs.onclose = () => {
      setWs(null)
      setIsConnected(false)
      toast({
        title: "Disconnected",
        description: "Connection to the WebSocket server was closed",
        variant: "destructive",
      })

      // Try to reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000)
    }

    newWs.onerror = (error) => {
      console.error("WebSocket error:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to the WebSocket server",
        variant: "destructive",
      })
    }

    // Cleanup function
    return () => {
      if (newWs.readyState === WebSocket.OPEN) {
        newWs.close()
      }
    }
  }, [toast])

  useEffect(() => {
    const cleanup = connectWebSocket()
    return cleanup
  }, [connectWebSocket])

  const handleConnect = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "connect",
          broker: brokerAddress,
          port: 1883,
        }),
      )

      toast({
        title: "Connecting",
        description: `Connecting to MQTT broker: ${brokerAddress}`,
        variant: "default",
      })
    }
  }

  const handleDisconnect = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "disconnect",
        }),
      )

      toast({
        title: "Disconnecting",
        description: "Disconnecting from MQTT broker",
        variant: "default",
      })
    }
  }

  const handleTopicFilterChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && ws && ws.readyState === WebSocket.OPEN) {
      const newFilter = e.currentTarget.value || "#"
      ws.send(
        JSON.stringify({
          type: "set_topic_filter",
          filter: newFilter,
        }),
      )

      toast({
        title: "Topic Filter Updated",
        description: `Set topic filter to: ${newFilter}`,
        variant: "default",
      })
    }
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">CSI Data Visualization</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>MQTT Broker Connection</CardTitle>
            <CardDescription>Connect to an MQTT broker to receive data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Broker address"
                  value={brokerAddress}
                  onChange={(e) => setBrokerAddress(e.target.value)}
                />
                <Button onClick={handleConnect} disabled={!ws || isConnected}>
                  Connect
                </Button>
                <Button onClick={handleDisconnect} disabled={!ws || !isConnected} variant="destructive">
                  Disconnect
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <ConnectionStatus isConnected={isConnected} />
                {isConnected && <span className="text-sm text-muted-foreground">Topic filter: {topicFilter}</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Topic Filter</CardTitle>
            <CardDescription>Filter MQTT topics (press Enter to apply)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <Input
                  placeholder="Enter topic filter"
                  onKeyDown={handleTopicFilterChange}
                  disabled={!isConnected}
                  defaultValue={"#"}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                  Press Enter
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Received Data</CardTitle>
            <CardDescription>Tabular view of Channel State Information</CardDescription>
          </CardHeader>
          <CardContent>
            <CSIDataTable data={filteredData} />
          </CardContent>
        </Card>
    </main>
  )
}
