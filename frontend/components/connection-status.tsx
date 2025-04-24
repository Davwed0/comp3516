import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"

interface ConnectionStatusProps {
  isConnected: boolean
  label?: string
}

export function ConnectionStatus({ isConnected, label }: ConnectionStatusProps) {
  return (
    <div className="flex items-center space-x-2">
      <Badge variant={isConnected ? "default" : "destructive"} className="px-2 py-1">
        {isConnected ? (
          <>
            <Wifi className="h-3.5 w-3.5 mr-1" />
            <span>{label || "Connected"}</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 mr-1" />
            <span>{label || "Disconnected"}</span>
          </>
        )}
      </Badge>
    </div>
  )
}
