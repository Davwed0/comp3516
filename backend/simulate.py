import json
import time
import random
import paho.mqtt.client as mqtt

MQTT_BROKER = "broker.emqx.io"
MQTT_PORT = 1883

TOPICS = [
    "csi/data"]

def generate_csi_data():
    """Generate simulated CSI data"""
    num_CSIs = 10
    CSIs = []

    for i in range(num_CSIs):
        place = [random.uniform(-1, 1) for _ in range(114)]
        CSIs.append(place)

    rssi = random.uniform(-100, 0)  # Simulated RSSI value
    motion_detect = random.choice([0, 1])  # Simulated motion detected (0 or 1)
    
    # Combine CSIs, RSSI, and motion detection into a single list
    data = CSIs + [motion_detect, rssi]
    return data


def main():
    client = mqtt.Client()
    client.connect(MQTT_BROKER, MQTT_PORT, 60)

    print(f"Publishing simulated data to various topics every second...")

    try:
        while True:
            # Select a random topic
            time.sleep(2)
            topic = random.choice(TOPICS)

            data = generate_csi_data()
            client.publish(topic, json.dumps(data))
            print(f"Published to {topic}: {data}")

            time.sleep(1)
    except KeyboardInterrupt:
        print("Simulation stopped")
        client.disconnect()


if __name__ == "__main__":
    main()
