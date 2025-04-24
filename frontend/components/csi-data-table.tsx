"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CSIData } from "@/types/csi-data"

interface CSIDataTableProps {
  data: CSIData[]
}

export function CSIDataTable({ data }: CSIDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Filter data based on search term
  const filteredData = searchTerm
    ? data.filter((item) => {
        const searchLower = searchTerm.toLowerCase()
        return (
          (item.topic && item.topic.toLowerCase().includes(searchLower)) ||
          (item.device_id && item.device_id.toLowerCase().includes(searchLower))
        )
      })
    : data

  // Get the latest 20 items
  const displayData = filteredData.slice(-20).reverse()

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by topic or device ID"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Device ID</TableHead>
              <TableHead>RSSI</TableHead>
              <TableHead>Motion</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length > 0 ? (
              displayData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "N/A"}</TableCell>
                  <TableCell>{item.topic || "N/A"}</TableCell>
                  <TableCell>{item.device_id || "N/A"}</TableCell>
                  <TableCell>{item.rssi || "N/A"}</TableCell>
                  <TableCell>{item.motion_detect}</TableCell>
                  <TableCell>
                    {item.CSIs ? (
                      <span>{item.CSIs.slice(0, 10)}</span>
                    ) : item.subcarriers ? (
                      <span>
                        {Array.isArray(item.subcarriers) ? `${item.subcarriers.length} subcarriers` : "Invalid format"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No CSI data</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
