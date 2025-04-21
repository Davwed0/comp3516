import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"

interface ConnectionStatusProps {
  isConnected: boolean
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1 px-3 py-1">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Connected to MQTT Broker</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Disconnected</span>
        </>
      )}
    </Badge>
  )
}
