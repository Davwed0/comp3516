import json
import time
import random
import paho.mqtt.client as mqtt

MQTT_BROKER = "broker.emqx.io"
MQTT_PORT = 1883

TOPICS = [
    "csi/esp_recv1"]


def generate_csi_data(topic):
    """Generate simulated data based on topic"""
    timestamp = time.time()

    if "csi" in topic:
        num_CSIs = 100

        CSIs = []
        for i in range(num_CSIs):
            CSIs.append(random.uniform(0.1, 1.0))

        return {"device_id": topic.split("/")[-1], "CSIs": CSIs}

    return {"value": random.random(), "timestamp": timestamp}


def main():
    client = mqtt.Client()
    client.connect(MQTT_BROKER, MQTT_PORT, 60)

    print(f"Publishing simulated data to various topics every second...")

    try:
        while True:
            # Select a random topic
            time.sleep(2)
            topic = random.choice(TOPICS)

            data = generate_csi_data(topic)
            client.publish(topic, json.dumps(data))
            print(f"Published to {topic}: {data}")

            time.sleep(1)
    except KeyboardInterrupt:
        print("Simulation stopped")
        client.disconnect()


if __name__ == "__main__":
    main()
