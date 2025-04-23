"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import type { CSIData } from "@/types/csi-data"

const COLUMN_WIDTHS = {
  timestamp: 100, 
  topic: 100,     
  macAddr: 100,  
  rawPayload: 400,       
}

interface CSIDataTableProps {
  data: CSIData[]
}

export function CSIDataTable({ data }: CSIDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns: ColumnDef<CSIData>[] = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      size: COLUMN_WIDTHS.timestamp,
      minSize: COLUMN_WIDTHS.timestamp,
      maxSize: COLUMN_WIDTHS.timestamp,
      cell: ({ row }) => {
        const timestamp = row.getValue("timestamp") as string
        return timestamp ? new Date(timestamp).toLocaleTimeString() : "N/A"
      },
    },
    {
      accessorKey: "topic",
      header: "Topic",
      size: COLUMN_WIDTHS.topic,
      minSize: COLUMN_WIDTHS.topic,
      maxSize: COLUMN_WIDTHS.topic,
      cell: ({ row }) => {
        const topic = row.getValue("topic") as string
        return topic || "N/A"
      },
    },
    {
      accessorKey: "raw_payload",
      header: "CSI",
      size: COLUMN_WIDTHS.rawPayload,
      minSize: COLUMN_WIDTHS.rawPayload,
      maxSize: COLUMN_WIDTHS.rawPayload,
      cell: ({ row }) => {
        var rawPayload = row.getValue("raw_payload") as string
        rawPayload = rawPayload.split(", ")
        if (!rawPayload || !Array.isArray(rawPayload)) return "N/A"
        
        const rawPayloadFormatted = rawPayload
          .map(val => {
            const parsed = parseFloat(val)
            return isNaN(parsed) ? "N/A" : parsed.toFixed(2)
          })
          .join(", ")
          
        return (
          <div className="max-w-full truncate" title={rawPayloadFormatted}>
            {rawPayloadFormatted || "N/A"}
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    columnResizeMode: "onChange",
  })

  return (
    <div>
      <div className="rounded-md border h-[400px] overflow-y-auto">
        <Table style={{ tableLayout: "fixed", width: "100%" }}>
          <TableHeader className="sticky top-0 bg-secondary z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id} 
                    style={{ 
                      width: header.column.getSize(),
                      minWidth: header.column.getSize(),
                      maxWidth: header.column.getSize()
                    }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id} 
                      style={{ 
                        width: cell.column.getSize(),
                        minWidth: cell.column.getSize(),
                        maxWidth: cell.column.getSize()
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}