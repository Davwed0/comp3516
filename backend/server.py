import json
import asyncio
import websockets
import paho.mqtt.client as mqtt
from datetime import datetime
import breathing as breathing
import pandas as pd
import numpy as np
from ast import literal_eval

# Add this near the top with other globals
main_event_loop = None


# Create a helper function to run coroutines from sync functions
def schedule_task(coro):
    if main_event_loop and main_event_loop.is_running():
        return asyncio.run_coroutine_threadsafe(coro, main_event_loop)
    else:
        # Fallback in case the main loop isn't running
        return asyncio.run(coro)


DEFAULT_MQTT_BROKER = "broker.emqx.io"#"192.168.31.215"
DEFAULT_MQTT_PORT = 1883
DEFAULT_MQTT_TOPIC = "csi/data"
WS_HOST = "localhost"
WS_PORT = 8765

csi_data = []
connected_clients = set()
mqtt_client = None
mqtt_connected = False
topic_filter = "#"


def on_connect(client, userdata, flags, rc):
    global mqtt_connected
    print(f"Connected to MQTT broker with result code {rc}")
    mqtt_connected = True
    client.subscribe(topic_filter)
    schedule_task(broadcast_connection_status())


def on_disconnect(client, userdata, rc):
    global mqtt_connected
    print(f"Disconnected from MQTT broker with result code {rc}")
    mqtt_connected = False
    schedule_task(broadcast_connection_status())


def on_message(client, userdata, msg):
    # try:
    topic = msg.topic
    csi = literal_eval(msg.payload.decode())
    csi = np.array(csi)
    csi = csi.reshape(-1, 114)

    if not hasattr(on_message, "csi_buffer"):
        on_message.csi_buffer = np.empty((0, 114))

    on_message.csi_buffer = np.concatenate((on_message.csi_buffer, csi))

    if len(on_message.csi_buffer) >= 15 * 100:
        breathing_rate = breathing.get_br(np.vstack(on_message.csi_buffer))
        on_message.csi_buffer = on_message.csi_buffer[1:]
    else:
        breathing_rate = None

    print(f"Breathing Rate: {breathing_rate} BPM")

    payload = {"raw_payload": csi.tolist()}

    data_entry = {
        "topic": topic,
        "timestamp": datetime.now().isoformat(),
        **payload,
    }

    csi_data.append(data_entry)
    if len(csi_data) > 100:
        csi_data.pop(0)

    schedule_task(broadcast_data(data_entry))


# except Exception as e:
#     print(f"Error processing message: {e}")


async def broadcast_data(data):
    if connected_clients:
        message = json.dumps({"type": "data", "payload": data})
        await asyncio.gather(*[client.send(message) for client in connected_clients])


async def broadcast_connection_status():
    if connected_clients:
        status = {
            "type": "connection_status",
            "connected": mqtt_connected,
            "broker": mqtt_client._host if mqtt_client else None,
            "topic_filter": topic_filter,
        }
        message = json.dumps(status)
        await asyncio.gather(*[client.send(message) for client in connected_clients])


async def websocket_handler(websocket):
    global mqtt_client, topic_filter

    connected_clients.add(websocket)
    try:
        if csi_data:
            await websocket.send(json.dumps({"type": "initial_data", "data": csi_data}))

        await broadcast_connection_status()

        async for message in websocket:
            try:
                cmd = json.loads(message)
                if cmd["type"] == "connect":
                    broker = cmd.get("broker", DEFAULT_MQTT_BROKER)
                    port = cmd.get("port", DEFAULT_MQTT_PORT)

                    if mqtt_client and mqtt_client.is_connected():
                        mqtt_client.disconnect()

                    mqtt_client = setup_mqtt(broker, port)
                    mqtt_client.connect(broker, port, 60)
                    mqtt_client.loop_start()
                    print(f"Connecting to broker: {broker}:{port}")
                elif cmd["type"] == "disconnect":
                    if mqtt_client and mqtt_client.is_connected():
                        mqtt_client.disconnect()
                        print("Disconnected from broker")
                elif cmd["type"] == "set_topic_filter":
                    new_filter = cmd.get("filter", "#")
                    topic_filter = new_filter

                    if mqtt_client and mqtt_client.is_connected():
                        mqtt_client.unsubscribe("#")
                        mqtt_client.subscribe(topic_filter)
                        print(f"Updated topic filter to: {topic_filter}")

                    await broadcast_connection_status()
            except Exception as e:
                print(f"Error processing WebSocket command: {e}")
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.remove(websocket)


def setup_mqtt(broker=DEFAULT_MQTT_BROKER, port=DEFAULT_MQTT_PORT):
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    return client


async def main():
    global mqtt_client, main_event_loop
    main_event_loop = asyncio.get_running_loop()

    async with websockets.serve(websocket_handler, WS_HOST, WS_PORT):
        print(f"WebSocket server started on ws://{WS_HOST}:{WS_PORT}")
        mqtt_client = setup_mqtt()
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped")
        if mqtt_client and mqtt_client.is_connected():
            mqtt_client.disconnect()
