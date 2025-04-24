"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CSIDataTable } from "@/components/csi-data-table"
import { ConnectionStatus } from "@/components/connection-status"
import { CSIAmplitudeChart } from "@/components/csi-amplitude-chart"
import { CSITimeSeriesChart } from "@/components/csi-time-series-chart"
import { MotionDetectionChart } from "@/components/motion-detection-chart"
import { BreathingRateChart } from "@/components/breathing-rate-chart"
import { useToast } from "@/hooks/use-toast"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { CSIData } from "@/types/csi-data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [csiData, setCsiData] = useState<CSIData[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [brokerAddress, setBrokerAddress] = useState("broker.emqx.io")
  const [topicFilter, setTopicFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [selectedSubcarrier, setSelectedSubcarrier] = useState(0)
  const [showTable, setShowTable] = useState(true)
  const { toast } = useToast()

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return csiData
    return csiData.filter((item) => item.topic && item.topic.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [csiData, searchTerm])

  // Get unique topics from data
  const topics = useMemo(() => {
    const topicSet = new Set<string>()
    csiData.forEach((item) => {
      if (item.topic) {
        topicSet.add(item.topic)
      }
    })
    return Array.from(topicSet)
  }, [csiData])

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
          console.log("Received data:", message.payload)
        } else if (message.type === "initial_data" && Array.isArray(message.data)) {
          // Initial data load
          setCsiData(message.data)
          console.log("Received initial data:", message.data)
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

  const handleTopicChange = (value: string) => {
    setSelectedTopic(value === "all" ? null : value)
  }

  const handleSubcarrierChange = (value: string) => {
    setSelectedSubcarrier(Number.parseInt(value, 10))
  }

  const toggleTableVisibility = () => {
    // Save current scroll position
    const scrollPosition = window.scrollY

    // Toggle table visibility
    setShowTable(!showTable)

    // Use setTimeout to restore scroll position after state update and re-render
    setTimeout(() => {
      window.scrollTo({
        top: scrollPosition,
        behavior: "instant",
      })
    }, 0)
  }

  // Debug function to log data structure
  useEffect(() => {
    if (csiData.length > 0) {
      console.log("Current data structure:", csiData[0])
    }
  }, [csiData])

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

      <div className="mb-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Visualization Options</CardTitle>
                <CardDescription>Select topic and subcarrier for detailed visualization</CardDescription>
              </div>
              <Button variant="outline" onClick={toggleTableVisibility}>
                {showTable ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Hide Table
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Show Table
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/2">
                <label className="text-sm font-medium mb-2 block">Select Topic</label>
                <Select onValueChange={handleTopicChange} defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="All Topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-1/2">
                <label className="text-sm font-medium mb-2 block">Select Subcarrier Index</label>
                <Select onValueChange={handleSubcarrierChange} defaultValue="0">
                  <SelectTrigger>
                    <SelectValue placeholder="Subcarrier 0" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        Subcarrier {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showTable && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Received Data</CardTitle>
            <CardDescription>Tabular view of Channel State Information</CardDescription>
          </CardHeader>
          <CardContent>
            <CSIDataTable data={filteredData} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="amplitude" className="mb-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
          <TabsTrigger value="amplitude">CSI Amplitude</TabsTrigger>
          <TabsTrigger value="timeseries">Time Series</TabsTrigger>
          <TabsTrigger value="motion">Motion Detection</TabsTrigger>
          <TabsTrigger value="breathing">Breathing Rate</TabsTrigger>
        </TabsList>
        <TabsContent value="amplitude">
          <CSIAmplitudeChart data={filteredData} topic={selectedTopic || undefined} />
        </TabsContent>
        <TabsContent value="timeseries">
          <CSITimeSeriesChart
            data={filteredData}
            topic={selectedTopic || undefined}
            subcarrierIndex={selectedSubcarrier}
          />
        </TabsContent>
        <TabsContent value="motion">
          <MotionDetectionChart data={filteredData} topic={selectedTopic || undefined} />
        </TabsContent>
        <TabsContent value="breathing">
          <BreathingRateChart data={filteredData} topic={selectedTopic || undefined} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
