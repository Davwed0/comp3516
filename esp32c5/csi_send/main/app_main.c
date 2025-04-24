/* Get Start Example

   This example code is in the Public Domain (or CC0 licensed, at your option.)

   Unless required by applicable law or agreed to in writing, this
   software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
   CONDITIONS OF ANY KIND, either express or implied.
*/

/**
 * In this file, the following code blocks are marked for customization.
 * Each block starts with the comment: "// YOUR CODE HERE"
 * and ends with: "// END OF YOUR CODE".
 *
 * [1] Fill in the group information.
 *
 * Have fun building!
 */

#include "esp_log.h"
#include "esp_mac.h"
#include "esp_netif.h"
#include "esp_now.h"
#include "esp_wifi.h"
#include "nvs_flash.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define CONFIG_LESS_INTERFERENCE_CHANNEL 161
#define CONFIG_WIFI_BAND_MODE WIFI_BAND_MODE_5G_ONLY
#define CONFIG_WIFI_2G_BANDWIDTHS WIFI_BW20
#define CONFIG_WIFI_5G_BANDWIDTHS WIFI_BW20
#define CONFIG_WIFI_2G_PROTOCOL WIFI_PROTOCOL_11N
#define CONFIG_WIFI_5G_PROTOCOL WIFI_PROTOCOL_11N
#define CONFIG_ESP_NOW_PHYMODE WIFI_PHY_MODE_HT20
#define CONFIG_ESP_NOW_RATE WIFI_PHY_RATE_MCS0_LGI
#define CONFIG_SEND_FREQUENCY 100
static const uint8_t CONFIG_CSI_SEND_MAC[] = {0x1a, 0x00, 0x00,
                                              0x00, 0x00, 0x00};
static const char *TAG = "csi_send";

static void wifi_init() {
  (esp_event_loop_create_default());

  (esp_netif_init());
  wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
  (esp_wifi_init(&cfg));

  (esp_wifi_set_mode(WIFI_MODE_STA));
  (esp_wifi_set_storage(WIFI_STORAGE_RAM));

  (esp_wifi_start());
  esp_wifi_set_band_mode(CONFIG_WIFI_BAND_MODE);
  wifi_protocols_t protocols = {.ghz_2g = CONFIG_WIFI_2G_PROTOCOL,
                                .ghz_5g = CONFIG_WIFI_5G_PROTOCOL};
  (esp_wifi_set_protocols(ESP_IF_WIFI_STA, &protocols));
  wifi_bandwidths_t bandwidth = {.ghz_2g = CONFIG_WIFI_2G_BANDWIDTHS,
                                 .ghz_5g = CONFIG_WIFI_5G_BANDWIDTHS};
  (esp_wifi_set_bandwidths(ESP_IF_WIFI_STA, &bandwidth));
  (esp_wifi_set_ps(WIFI_PS_NONE));

  if ((CONFIG_WIFI_BAND_MODE == WIFI_BAND_MODE_2G_ONLY &&
       CONFIG_WIFI_2G_BANDWIDTHS == WIFI_BW_HT20) ||
      (CONFIG_WIFI_BAND_MODE == WIFI_BAND_MODE_5G_ONLY &&
       CONFIG_WIFI_5G_BANDWIDTHS == WIFI_BW_HT20)) {
    (esp_wifi_set_channel(CONFIG_LESS_INTERFERENCE_CHANNEL,
                          WIFI_SECOND_CHAN_NONE));
  } else {
    (esp_wifi_set_channel(CONFIG_LESS_INTERFERENCE_CHANNEL,
                          WIFI_SECOND_CHAN_NONE));
  }
  (esp_wifi_set_mac(WIFI_IF_STA, CONFIG_CSI_SEND_MAC));
}

static void wifi_esp_now_init(esp_now_peer_info_t peer) {
  ESP_ERROR_CHECK(esp_now_init());
  ESP_ERROR_CHECK(esp_now_set_pmk((uint8_t *)"pmk1234567890123"));
  esp_now_rate_config_t rate_config = {.phymode = CONFIG_ESP_NOW_PHYMODE,
                                       .rate = CONFIG_ESP_NOW_RATE,
                                       .ersu = false,
                                       .dcm = false};
  ESP_ERROR_CHECK(esp_now_add_peer(&peer));
  ESP_ERROR_CHECK(esp_now_set_peer_rate_config(peer.peer_addr, &rate_config));
}

void app_main() {
  /**
   * @breif Initialize NVS
   */
  esp_err_t ret = nvs_flash_init();
  if (ret == ESP_ERR_NVS_NO_FREE_PAGES ||
      ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    ESP_ERROR_CHECK(nvs_flash_erase());
    ret = nvs_flash_init();
  }
  ESP_ERROR_CHECK(ret);

  /**
   * @breif Initialize Wi-Fi
   */
  wifi_init();

  /**
   * @breif Initialize ESP-NOW
   *        ESP-NOW protocol see:
   * https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/network/esp_now.html
   */
  esp_now_peer_info_t peer = {
      .channel = CONFIG_LESS_INTERFERENCE_CHANNEL,
      .ifidx = WIFI_IF_STA,
      .encrypt = false,
      .peer_addr = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff},
  };
  wifi_esp_now_init(peer);

  ESP_LOGI(TAG, "================ CSI SEND ================");
  ESP_LOGI(TAG, "wifi_channel: %d, send_frequency: %d, mac: " MACSTR,
           CONFIG_LESS_INTERFERENCE_CHANNEL, CONFIG_SEND_FREQUENCY,
           MAC2STR(CONFIG_CSI_SEND_MAC));

  // YOUR CODE HERE
  ESP_LOGI(TAG, "================ GROUP INFO ================");
  const char *TEAM_MEMBER[] = {"Bryan Melvison", "Filbert David Tejalaksana",
                               "Georgy Valencio Siswanta", "Karanveer Singh"};
  const char *TEAM_UID[] = {"3035869209", "3035945699", "3035898896",
                            "3035918622"};
  ESP_LOGI(TAG, "TEAM_MEMBER: %s, %s, %s, %s | TEAM_UID: %s, %s, %s, %s",
           TEAM_MEMBER[0], TEAM_MEMBER[1], TEAM_MEMBER[2], TEAM_MEMBER[3],
           TEAM_UID[0], TEAM_UID[1], TEAM_UID[2], TEAM_UID[3]);
  ESP_LOGI(TAG, "================ END OF GROUP INFO ================");
  // END OF YOUR CODE

  for (uint8_t count = 0;; ++count) {
    esp_err_t ret = esp_now_send(peer.peer_addr, &count, sizeof(uint8_t));
    if (ret != ESP_OK) {
      ESP_LOGW(TAG, "free_heap: %ld <%s> ESP-NOW send error",
               esp_get_free_heap_size(), esp_err_to_name(ret));
    }
    usleep(1000 * 1000 / CONFIG_SEND_FREQUENCY);
  }
}
