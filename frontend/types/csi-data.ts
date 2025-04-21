export interface Subcarrier {
  index: number
  amplitude: number
  phase: number
}

export interface CSIData {
  timestamp?: string
  topic?: string
  device_id?: string
  rssi?: number
  snr?: number
  signal_quality?: string
  subcarriers?: Subcarrier[]
  temperature?: number
  humidity?: number
  raw_payload?: string
  [key: string]: any // Allow for dynamic properties
}
