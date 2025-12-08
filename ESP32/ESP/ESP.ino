#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include <WiFi.h>
#include <WebServer.h>

// =================== WiFi ===================
const char* WIFI_SSID = "Vodafone-25DC";
const char* WIFI_PASS = "sGtyn6ZJmtzybPsX";

WebServer server(80);

// =================== API ===================
const char* API_BASE_URL = "http://localhost:8080/api";
const char* SUBSCRIBE_URL = API_BASE_URL "/subscribe";
const char* PUSH_URL = API_BASE_URL "/data";

// =================== OLED (SSD1306) ===================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDR 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Grafiek-instellingen
const float DB_MIN = 35.0;
const float DB_MAX = 85.0;
const uint8_t GRAPH_X = 0;
const uint8_t GRAPH_Y = 22;
const uint8_t GRAPH_W = 128;
const uint8_t GRAPH_H = 42;

float ringBuf[SCREEN_WIDTH];
uint8_t head = 0;
float currentDb = 50.0;

// Display-refresh timing
const unsigned long SAMPLE_EVERY_MS = 120;
unsigned long lastDisplayMs = 0;

// Helpers voor grafiek
float clampf(float v, float lo, float hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

int mapDbToY(float dB) {
  float t = (clampf(dB, DB_MIN, DB_MAX) - DB_MIN) / (DB_MAX - DB_MIN);
  int y = GRAPH_Y + GRAPH_H - 1 - (int)(t * (GRAPH_H - 1));
  return y;
}

void pushSample(float dB) {
  ringBuf[head] = dB;
  head = (head + 1) % GRAPH_W;
}

void drawGraph() {
  display.drawRect(GRAPH_X, GRAPH_Y, GRAPH_W, GRAPH_H, SSD1306_WHITE);

  // Hulplijn 55dB
  const float WHO_DAY = 55.0;
  int yWho = mapDbToY(WHO_DAY);
  for (int x = GRAPH_X + 1; x < GRAPH_X + GRAPH_W - 1; x += 4) {
    display.drawPixel(x, yWho, SSD1306_WHITE);
  }

  int prevX = 0, prevY = mapDbToY(ringBuf[(head) % GRAPH_W]);
  for (int i = 1; i < GRAPH_W; i++) {
    int idx = (head + i) % GRAPH_W;
    int x = i;
    int y = mapDbToY(ringBuf[idx]);
    display.drawLine(prevX, prevY, x, y, SSD1306_WHITE);
    prevX = x;
    prevY = y;
  }
}

void drawHeader() {
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print(currentDb, 1);
  display.print(" dB");

  int limit = 55;
  const char* label = "OK";
  if (currentDb > limit + 5) label = "HIGH";
  else if (currentDb > limit - 5) label = "CAUTION";

  int16_t x1, y1;
  uint16_t w, h;
  display.setTextSize(1);
  display.getTextBounds(label, 0, 0, &x1, &y1, &w, &h);
  display.setCursor(SCREEN_WIDTH - w - 2, 4);
  display.print(label);
}

// =================== MIC (SPH0645) via I2S ===================
#define I2S_WS 5
#define I2S_SCK 16
#define I2S_SD 17

static const i2s_port_t I2S_PORT = I2S_NUM_0;
static const uint32_t SAMPLE_RATE = 16000;

static const i2s_config_t i2s_config = {
  .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
  .sample_rate = SAMPLE_RATE,
  .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
  .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
  .communication_format = I2S_COMM_FORMAT_I2S,
  .intr_alloc_flags = 0,
  .dma_buf_count = 4,
  .dma_buf_len = 512,
  .use_apll = false,
  .tx_desc_auto_clear = false,
  .fixed_mclk = 0
};

static const i2s_pin_config_t pin_config = {
  .bck_io_num = I2S_SCK,
  .ws_io_num = I2S_WS,
  .data_out_num = -1,
  .data_in_num = I2S_SD
};

#define BLOCK_SAMPLES 1024
static const float NORM_DIV = 131072.0f;

static float CAL_OFFSET_DBA = 120.0f;

static const float EPS_F = 1e-12f;

// eenvoudige HPF
struct OnePoleHPF {
  float a = 0.995f;
  float y = 0.0f;
  float x_prev = 0.0f;
  float process(float x) {
    y = a * (y + x - x_prev);
    x_prev = x;
    return y;
  }
} hpf;

int32_t rx_buf[BLOCK_SAMPLES];

// 1s aggregatie
double sumsq_1s = 0.0;
uint32_t samples_1s = 0;
uint32_t t1_start_ms = 0;

// 60s ringbuffer
static const int WINDOW_SEC = 60;
float dBA_1s_ring[WINDOW_SEC] = { 0 };
int ring_count = 0;
int ring_index = 0;

double energy_1s_ring[WINDOW_SEC] = { 0 };

// =================== HOURLY DATA STORAGE (60 minutes) ===================
static const int WINDOW_MIN = 60;
float dBA_1min_ring[WINDOW_MIN] = { 0 };
double energy_1min_ring[WINDOW_MIN] = { 0 };
int minute_ring_count = 0;
int minute_ring_index = 0;

// Counter to track when 60 seconds have passed
int seconds_in_current_minute = 0;

// Aggregation for 1 minute
double sumsq_1min = 0.0;
uint32_t samples_1min = 0;

// Percentielen helper
float percentileFromRing(const float* buf, int count, float percent) {
  if (count <= 0) return NAN;
  float tmp[WINDOW_SEC];
  for (int i = 0; i < count; i++) tmp[i] = buf[i];

  for (int i = 1; i < count; i++) {
    float key = tmp[i];
    int j = i - 1;
    while (j >= 0 && tmp[j] > key) {
      tmp[j + 1] = tmp[j];
      j--;
    }
    tmp[j + 1] = key;
  }

  float rank = (percent / 100.0f) * (count - 1);
  int lo = floorf(rank);
  int hi = ceilf(rank);
  if (lo == hi) return tmp[lo];
  float w = rank - lo;
  return tmp[lo] * (1.0f - w) + tmp[hi] * w;
}

// =================== API / HTTP ===================
void handleLive() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  char buf[128];
  snprintf(buf, sizeof(buf), "{\"dba_instant\":%.2f}", currentDb);

  server.send(200, "application/json", buf);
}

void handleHourlyData() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  // Calculate mean, min, max
  float sum = 0.0;
  float minVal = 999.0;
  float maxVal = -999.0;
  
  for (int i = 0; i < minute_ring_count; i++) {
    int idx = (minute_ring_index - minute_ring_count + i + WINDOW_MIN) % WINDOW_MIN;
    float val = dBA_1min_ring[idx];
    sum += val;
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }
  
  float meanVal = (minute_ring_count > 0) ? (sum / minute_ring_count) : 0.0;

  String json = "{\"mean\":";
  json += String(meanVal, 2);
  json += ",\"min\":";
  json += String(minVal, 2);
  json += ",\"max\":";
  json += String(maxVal, 2);  
  json += "}";

  server.send(200, "application/json", json);
}

void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

// =================== SETUP AUXILIARY FUNCTIONS ===================
void initializeSerial() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nESP32 Noise Meter + API + Hourly Storage");
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP());
}

void setupHTTPServer() {
  server.on("/api/live", HTTP_GET, handleLive);
  server.on("/api/live", HTTP_OPTIONS, handleOptions);
  server.on("/api/hourly", HTTP_GET, handleHourlyData);
  server.on("/api/hourly", HTTP_OPTIONS, handleOptions);
  server.begin();
  Serial.println("HTTP server gestart");
  Serial.println("  /api/live   - Current dBA");
  Serial.println("  /api/hourly - Last 60 minutes");
}

void initializeI2SMicrophone() {
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

void initializeOLEDDisplay() {
  Wire.begin(21, 22);
  Wire.setClock(400000);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("SSD1306 allocation failed");
    while (true) {}
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Noise meter init...");
  display.display();
}

void initializeRingBuffer() {
  for (int i = 0; i < GRAPH_W; i++) {
    ringBuf[i] = 50.0;
  }
  t1_start_ms = millis();
}

// =================== LOOP AUXILIARY FUNCTIONS ===================
bool readI2SAudioData(size_t& bytes_read, size_t& num_samples) {
  if (i2s_read(I2S_PORT, (void*)rx_buf, sizeof(rx_buf), &bytes_read, portMAX_DELAY) != ESP_OK) {
    return false;
  }
  num_samples = bytes_read / sizeof(int32_t);
  return (num_samples > 0);
}

float calculateMean(size_t num_samples) {
  long long mean_acc = 0;
  for (size_t i = 0; i < num_samples; i++) {
    mean_acc += (rx_buf[i] >> 14);
  }
  return (float)mean_acc / (float)num_samples;
}

double calculateSumOfSquares(size_t num_samples, float mean) {
  double sumsq_block = 0.0;
  for (size_t i = 0; i < num_samples; i++) {
    float s = (float)((rx_buf[i] >> 14) - mean) / NORM_DIV;
    s = hpf.process(s);
    sumsq_block += (double)s * (double)s;
  }
  return sumsq_block;
}

float convertToDecibels(float rms_value) {
  float dBFS = 20.0f * log10f(fmaxf(rms_value, EPS_F));
  return dBFS + CAL_OFFSET_DBA;
}

void accumulateAudioData(double sumsq_block, size_t num_samples) {
  sumsq_1s += sumsq_block;
  samples_1s += num_samples;
  sumsq_1min += sumsq_block;
  samples_1min += num_samples;
}

void storeOneSecondAverage(float dBA_1s, float rms_1s) {
  dBA_1s_ring[ring_index] = dBA_1s;
  energy_1s_ring[ring_index] = (double)rms_1s * (double)rms_1s;
  ring_index = (ring_index + 1) % WINDOW_SEC;
  if (ring_count < WINDOW_SEC) ring_count++;
}

void resetOneSecondCounters(uint32_t current_time) {
  sumsq_1s = 0.0;
  samples_1s = 0;
  t1_start_ms = current_time;
}

void storeOneMinuteAverage(float dBA_1min, float rms_1min) {
  dBA_1min_ring[minute_ring_index] = dBA_1min;
  energy_1min_ring[minute_ring_index] = (double)rms_1min * (double)rms_1min;
  minute_ring_index = (minute_ring_index + 1) % WINDOW_MIN;
  if (minute_ring_count < WINDOW_MIN) minute_ring_count++;

  Serial.print("Minute ");
  Serial.print(minute_ring_count);
  Serial.print(": ");
  Serial.print(dBA_1min, 2);
  Serial.println(" dBA");
}

void resetOneMinuteCounters() {
  sumsq_1min = 0.0;
  samples_1min = 0;
  seconds_in_current_minute = 0;
}

void processOneSecondData(uint32_t current_time) {
  float rms_1s = sqrt(sumsq_1s / (double)samples_1s);
  float dBA_1s = convertToDecibels(rms_1s);

  storeOneSecondAverage(dBA_1s, rms_1s);
  resetOneSecondCounters(current_time);

  seconds_in_current_minute++;
  
  if (seconds_in_current_minute >= 60) {
    float rms_1min = sqrt(sumsq_1min / (double)samples_1min);
    float dBA_1min = convertToDecibels(rms_1min);

    storeOneMinuteAverage(dBA_1min, rms_1min);
    resetOneMinuteCounters();
  }
}

void updateDisplay() {
  pushSample(currentDb);

  display.clearDisplay();
  drawHeader();
  drawGraph();
  display.display();
}

void processDisplayUpdate(unsigned long current_time) {
  if (current_time - lastDisplayMs >= SAMPLE_EVERY_MS) {
    lastDisplayMs = current_time;
    updateDisplay();
  }
}

// =================== SETUP ===================
void setup() {
  initializeSerial();
  connectToWiFi();
  setupHTTPServer();
  initializeI2SMicrophone();
  initializeOLEDDisplay();
  initializeRingBuffer();
}

// =================== LOOP ===================
void loop() {
  // Read audio data from I2S microphone
  size_t bytes_read = 0;
  size_t num_samples = 0;
  if (!readI2SAudioData(bytes_read, num_samples)) {
    return;
  }

  // Process audio block
  float mean = calculateMean(num_samples);
  double sumsq_block = calculateSumOfSquares(num_samples, mean);
  
  // Calculate instantaneous dBA
  float rms_block = sqrt(sumsq_block / (double)num_samples);
  currentDb = convertToDecibels(rms_block);

  // Accumulate data for 1-second and 1-minute averages
  accumulateAudioData(sumsq_block, num_samples);

  // Check if 1 second has elapsed
  uint32_t current_time = millis();
  if (current_time - t1_start_ms >= 1000) {
    processOneSecondData(current_time);
  }

  // Update display periodically
  processDisplayUpdate(current_time);

  // Handle HTTP requests
  server.handleClient();
}