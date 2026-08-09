#include <arpa/inet.h>
#include <json-c/json.h>
#include <signal.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/un.h>
#include <unistd.h>

#include <algorithm>
#include <array>
#include <cctype>
#include <cerrno>
#include <charconv>
#include <chrono>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <map>
#include <memory>
#include <string>
#include <string_view>
#include <thread>
#include <vector>

namespace {

constexpr std::string_view kExtensionID = "mcp";
constexpr std::string_view kControlSocket = "/run/onekvm/extension-control.sock";
constexpr std::string_view kMediaSocket = "/run/onekvm/extension-media.sock";
constexpr std::size_t kMaxRequestBytes = 1U << 20;
constexpr std::size_t kMaxFrameBytes = 8U << 20;
volatile sig_atomic_t stopped = 0;

void Stop(int) { stopped = 1; }

struct JsonDelete {
  void operator()(json_object *value) const {
    if (value != nullptr)
      json_object_put(value);
  }
};
using Json = std::unique_ptr<json_object, JsonDelete>;

struct Config {
  std::string access_token;
  int capture_timeout_seconds = 5;
};

struct Identity {
  std::string id;
  std::string token;
};

struct JPEGFrame {
  std::uint16_t width = 0;
  std::uint16_t height = 0;
  std::vector<std::uint8_t> payload;
};

struct ScreenGeometry {
  std::uint16_t width = 0;
  std::uint16_t height = 0;

  bool valid() const { return width != 0 && height != 0; }
};

struct ATXStatus {
  bool available = false;
  bool has_power_led = false;
  bool power_led = false;
  bool has_disk_led = false;
  bool disk_led = false;
};

constexpr std::uint16_t PixelToAbsoluteHID(std::uint32_t pixel,
                                           std::uint32_t size) {
  if (size <= 1)
    return 1;
  return static_cast<std::uint16_t>(
      1 + (static_cast<std::uint64_t>(pixel) * 0x7ffeU + (size - 1) / 2) /
              (size - 1));
}

static_assert(PixelToAbsoluteHID(0, 1920) == 1);
static_assert(PixelToAbsoluteHID(1919, 1920) == 32767);

std::string ConfigPath() {
  if (const char *directory = std::getenv("ONEKVM_EXTENSION_CONFIG");
      directory != nullptr && *directory != '\0')
    return std::string(directory) + "/config.json";
  return "/run/onekvm/extensions/mcp/config.json";
}

std::string SocketPath() {
  if (const char *directory = std::getenv("ONEKVM_EXTENSION_SOCKET");
      directory != nullptr && *directory != '\0')
    return std::string(directory) + "/mcp.sock";
  return "/run/onekvm/extensions/mcp/sockets/mcp.sock";
}

Json ParseJSON(std::string_view data, std::string &error) {
  json_tokener *tokener = json_tokener_new_ex(64);
  if (tokener == nullptr) {
    error = "allocate JSON parser";
    return {};
  }
  json_tokener_set_flags(tokener, JSON_TOKENER_STRICT);
  json_object *value =
      json_tokener_parse_ex(tokener, data.data(), static_cast<int>(data.size()));
  const auto status = json_tokener_get_error(tokener);
  std::size_t end = json_tokener_get_parse_end(tokener);
  json_tokener_free(tokener);
  while (end < data.size() &&
         std::isspace(static_cast<unsigned char>(data[end])))
    ++end;
  if (status != json_tokener_success || value == nullptr || end != data.size()) {
    if (value != nullptr)
      json_object_put(value);
    error = "invalid JSON";
    return {};
  }
  return Json(value);
}

bool ReadFile(const std::string &path, bool allow_missing, std::string &data,
              std::string &error) {
  std::ifstream input(path, std::ios::binary);
  if (!input) {
    if (allow_missing && errno == ENOENT)
      return true;
    error = "open " + path + ": " + std::strerror(errno);
    return false;
  }
  data.assign(std::istreambuf_iterator<char>(input),
              std::istreambuf_iterator<char>());
  if (data.size() > kMaxRequestBytes) {
    error = path + " exceeds 1 MiB";
    return false;
  }
  return true;
}

bool LoadConfig(bool allow_missing, Config &config, std::string &error) {
  std::string data;
  if (!ReadFile(ConfigPath(), allow_missing, data, error))
    return false;
  if (data.empty())
    return true;
  Json root = ParseJSON(data, error);
  if (!root || !json_object_is_type(root.get(), json_type_object)) {
    error = "MCP configuration must be an object";
    return false;
  }
  json_object *token = nullptr;
  if (json_object_object_get_ex(root.get(), "access_token", &token)) {
    if (!json_object_is_type(token, json_type_string)) {
      error = "access_token must be a string";
      return false;
    }
    config.access_token = json_object_get_string(token);
  }
  json_object *timeout = nullptr;
  if (json_object_object_get_ex(root.get(), "capture_timeout_seconds", &timeout)) {
    if (!json_object_is_type(timeout, json_type_int)) {
      error = "capture_timeout_seconds must be an integer";
      return false;
    }
    config.capture_timeout_seconds = json_object_get_int(timeout);
  }
  if (config.access_token.size() > 128 ||
      config.capture_timeout_seconds < 1 || config.capture_timeout_seconds > 15) {
    error = "MCP configuration is outside the supported range";
    return false;
  }
  return true;
}

bool LoadIdentity(Identity &identity, std::string &error) {
  const char *id = std::getenv("ONEKVM_EXTENSION_ID");
  const char *directory = std::getenv("CREDENTIALS_DIRECTORY");
  if (id == nullptr || directory == nullptr || std::string_view(id) != kExtensionID) {
    error = "extension identity is unavailable";
    return false;
  }
  std::ifstream input(std::string(directory) + "/onekvm-token");
  if (!input) {
    error = "read extension credential";
    return false;
  }
  identity.id = id;
  identity.token.assign(std::istreambuf_iterator<char>(input),
                        std::istreambuf_iterator<char>());
  while (!identity.token.empty() &&
         std::isspace(static_cast<unsigned char>(identity.token.back())))
    identity.token.pop_back();
  if (identity.token.size() != 64) {
    error = "extension credential has invalid length";
    return false;
  }
  return true;
}

bool ConstantTimeEqual(std::string_view left, std::string_view right) {
  std::size_t difference = left.size() ^ right.size();
  const std::size_t length = std::max(left.size(), right.size());
  for (std::size_t index = 0; index < length; ++index) {
    const unsigned char a = index < left.size() ? left[index] : 0;
    const unsigned char b = index < right.size() ? right[index] : 0;
    difference |= a ^ b;
  }
  return difference == 0;
}

bool WriteAll(int fd, const void *data, std::size_t size, std::string &error) {
  const auto *cursor = static_cast<const std::uint8_t *>(data);
  while (size != 0) {
    const auto written = send(fd, cursor, size, MSG_NOSIGNAL);
    if (written < 0 && errno == EINTR)
      continue;
    if (written <= 0) {
      error = std::string("write socket: ") + std::strerror(errno);
      return false;
    }
    cursor += written;
    size -= static_cast<std::size_t>(written);
  }
  return true;
}

bool WriteAll(int fd, std::string_view data, std::string &error) {
  return WriteAll(fd, data.data(), data.size(), error);
}

bool ReadExact(int fd, void *data, std::size_t size, std::string &error) {
  auto *cursor = static_cast<std::uint8_t *>(data);
  while (size != 0) {
    const auto received = recv(fd, cursor, size, 0);
    if (received < 0 && errno == EINTR)
      continue;
    if (received <= 0) {
      error = received == 0 ? "socket closed" : std::strerror(errno);
      return false;
    }
    cursor += received;
    size -= static_cast<std::size_t>(received);
  }
  return true;
}

int ConnectUnix(std::string_view path, int timeout_seconds, std::string &error) {
  if (path.size() >= sizeof(sockaddr_un::sun_path)) {
    error = "Unix socket path is too long";
    return -1;
  }
  const int fd = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
  if (fd < 0) {
    error = std::strerror(errno);
    return -1;
  }
  timeval timeout{timeout_seconds, 0};
  setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
  setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
  sockaddr_un address{};
  address.sun_family = AF_UNIX;
  std::memcpy(address.sun_path, path.data(), path.size());
  if (connect(fd, reinterpret_cast<sockaddr *>(&address), sizeof(address)) < 0) {
    error = std::strerror(errno);
    close(fd);
    return -1;
  }
  return fd;
}

bool ControlRequest(const Identity &identity, std::string_view method,
                    std::string_view path, std::string_view payload,
                    int timeout_seconds, std::string &response_body,
                    std::string &error) {
  const int fd = ConnectUnix(kControlSocket, timeout_seconds, error);
  if (fd < 0) {
    error = "connect OneKVM extension control API: " + error;
    return false;
  }
  const std::string request = std::string(method) + " " + std::string(path) +
      " HTTP/1.1\r\nHost: unix\r\nContent-Type: application/json\r\n"
      "Authorization: Bearer " +
      identity.token + "\r\nX-OneKVM-Extension: " + identity.id +
      "\r\nContent-Length: " + std::to_string(payload.size()) +
      "\r\nConnection: close\r\n\r\n" + std::string(payload);
  if (!WriteAll(fd, request, error)) {
    close(fd);
    return false;
  }
  std::array<char, 4096> response{};
  std::string received_data;
  while (received_data.size() <= (64U << 10)) {
    const auto received = recv(fd, response.data(), response.size(), 0);
    if (received < 0 && errno == EINTR)
      continue;
    if (received < 0) {
      close(fd);
      error = "read OneKVM extension control API response: " +
              std::string(std::strerror(errno));
      return false;
    }
    if (received == 0)
      break;
    received_data.append(response.data(), static_cast<std::size_t>(received));
  }
  close(fd);
  if (received_data.empty() || received_data.size() > (64U << 10)) {
    error = "invalid OneKVM extension control API response";
    return false;
  }
  std::string_view line(received_data);
  const auto space = line.find(' ');
  int status = 0;
  if (space == std::string_view::npos || space + 4 > line.size() ||
      std::from_chars(line.data() + space + 1, line.data() + space + 4, status)
              .ec != std::errc{} ||
      status < 200 || status >= 300) {
    error = "OneKVM extension control API rejected the request";
    return false;
  }
  const auto body = line.find("\r\n\r\n");
  if (body == std::string_view::npos) {
    error = "invalid OneKVM extension control API response";
    return false;
  }
  response_body.assign(line.substr(body + 4));
  return true;
}

bool PostHID(const Identity &identity, std::string_view path,
             std::string_view payload, std::string &error) {
  std::string response;
  return ControlRequest(identity, "POST", path, payload, 3, response, error);
}

bool ReadATXStatus(const Identity &identity, ATXStatus &status,
                   std::string &error) {
  std::string response;
  if (!ControlRequest(identity, "GET", "/api/atx/status", "", 3, response,
                      error))
    return false;
  Json root = ParseJSON(response, error);
  if (!root || !json_object_is_type(root.get(), json_type_object)) {
    error = "invalid ATX status response";
    return false;
  }
  json_object *available = nullptr;
  if (!json_object_object_get_ex(root.get(), "available", &available) ||
      !json_object_is_type(available, json_type_boolean)) {
    error = "ATX status response is missing available";
    return false;
  }
  status.available = json_object_get_boolean(available) != 0;
  json_object *power_led = nullptr;
  if (json_object_object_get_ex(root.get(), "pwr_led", &power_led)) {
    if (!json_object_is_type(power_led, json_type_boolean)) {
      error = "ATX power LED status is invalid";
      return false;
    }
    status.has_power_led = true;
    status.power_led = json_object_get_boolean(power_led) != 0;
  }
  json_object *disk_led = nullptr;
  if (json_object_object_get_ex(root.get(), "hdd_led", &disk_led)) {
    if (!json_object_is_type(disk_led, json_type_boolean)) {
      error = "ATX disk LED status is invalid";
      return false;
    }
    status.has_disk_led = true;
    status.disk_led = json_object_get_boolean(disk_led) != 0;
  }
  return true;
}

bool PostATXAction(const Identity &identity, std::string_view action,
                   std::string &error) {
  std::string response;
  const int timeout = action == "power-long" ? 15 : 3;
  return ControlRequest(identity, "POST", "/api/atx/action/" +
                                                std::string(action),
                        "", timeout, response, error);
}

std::uint16_t ReadBE16(const std::uint8_t *data) {
  return static_cast<std::uint16_t>((data[0] << 8U) | data[1]);
}

std::uint32_t ReadBE32(const std::uint8_t *data) {
  return (static_cast<std::uint32_t>(data[0]) << 24U) |
         (static_cast<std::uint32_t>(data[1]) << 16U) |
         (static_cast<std::uint32_t>(data[2]) << 8U) | data[3];
}

bool CaptureJPEG(const Identity &identity, int timeout_seconds, JPEGFrame &frame,
                 std::string &error) {
  const int fd = ConnectUnix(kMediaSocket, timeout_seconds, error);
  if (fd < 0) {
    error = "connect OneKVM media service: " + error;
    return false;
  }
  const std::string subscription =
      "{\"version\":1,\"extension_id\":\"" + identity.id +
      "\",\"token\":\"" + identity.token +
      "\",\"video\":\"mjpeg\"}\n";
  if (!WriteAll(fd, subscription, error)) {
    close(fd);
    return false;
  }
  std::array<std::uint8_t, 40> header{};
  if (!ReadExact(fd, header.data(), header.size(), error)) {
    close(fd);
    error = "read video frame: " + error;
    return false;
  }
  const auto length = ReadBE32(header.data() + 32);
  if (!std::equal(header.begin(), header.begin() + 4,
                  std::array<std::uint8_t, 4>{'O', 'K', 'V', 'F'}.begin()) ||
      header[4] != 1 || header[5] != 3 || length == 0 ||
      length > kMaxFrameBytes) {
    close(fd);
    error = "invalid MJPEG frame header";
    return false;
  }
  frame.width = ReadBE16(header.data() + 28);
  frame.height = ReadBE16(header.data() + 30);
  frame.payload.resize(length);
  const bool read = ReadExact(fd, frame.payload.data(), frame.payload.size(), error);
  close(fd);
  if (!read) {
    error = "read JPEG payload: " + error;
    return false;
  }
  return true;
}

std::string Base64(const std::vector<std::uint8_t> &data) {
  static constexpr char alphabet[] =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::string output;
  output.reserve((data.size() + 2) / 3 * 4);
  for (std::size_t index = 0; index < data.size(); index += 3) {
    const std::uint32_t value =
        static_cast<std::uint32_t>(data[index]) << 16U |
        (index + 1 < data.size() ? static_cast<std::uint32_t>(data[index + 1]) << 8U : 0) |
        (index + 2 < data.size() ? data[index + 2] : 0);
    output.push_back(alphabet[(value >> 18U) & 63U]);
    output.push_back(alphabet[(value >> 12U) & 63U]);
    output.push_back(index + 1 < data.size() ? alphabet[(value >> 6U) & 63U] : '=');
    output.push_back(index + 2 < data.size() ? alphabet[value & 63U] : '=');
  }
  return output;
}

json_object *TextContent(std::string_view text) {
  json_object *content = json_object_new_object();
  json_object_object_add(content, "type", json_object_new_string("text"));
  json_object_object_add(content, "text",
                         json_object_new_string_len(text.data(), text.size()));
  return content;
}

json_object *ToolResult(std::string_view text, bool error = false) {
  json_object *result = json_object_new_object();
  json_object *content = json_object_new_array();
  json_object_array_add(content, TextContent(text));
  json_object_object_add(result, "content", content);
  if (error)
    json_object_object_add(result, "isError", json_object_new_boolean(true));
  return result;
}

bool GetString(json_object *object, const char *name, std::string &value) {
  json_object *field = nullptr;
  if (!json_object_object_get_ex(object, name, &field) ||
      !json_object_is_type(field, json_type_string))
    return false;
  value = json_object_get_string(field);
  return true;
}

bool GetInt(json_object *object, const char *name, int &value, int minimum,
            int maximum, bool optional = false) {
  json_object *field = nullptr;
  if (!json_object_object_get_ex(object, name, &field))
    return optional;
  if (!json_object_is_type(field, json_type_int))
    return false;
  const auto parsed = json_object_get_int64(field);
  if (parsed < minimum || parsed > maximum)
    return false;
  value = static_cast<int>(parsed);
  return true;
}

bool ASCIIKey(char character, std::uint8_t &usage, std::uint8_t &modifiers) {
  modifiers = 0;
  if (character >= 'a' && character <= 'z') {
    usage = static_cast<std::uint8_t>(0x04 + character - 'a');
    return true;
  }
  if (character >= 'A' && character <= 'Z') {
    usage = static_cast<std::uint8_t>(0x04 + character - 'A');
    modifiers = 0x02;
    return true;
  }
  if (character >= '1' && character <= '9') {
    usage = static_cast<std::uint8_t>(0x1e + character - '1');
    return true;
  }
  if (character == '0') {
    usage = 0x27;
    return true;
  }
  struct Entry { char plain; char shifted; std::uint8_t usage; };
  static constexpr Entry entries[] = {
      {'\n', '\0', 0x28}, {'\t', '\0', 0x2b}, {' ', '\0', 0x2c},
      {'-', '_', 0x2d}, {'=', '+', 0x2e}, {'[', '{', 0x2f}, {']', '}', 0x30},
      {'\\', '|', 0x31}, {';', ':', 0x33}, {'\'', '"', 0x34}, {'`', '~', 0x35},
      {',', '<', 0x36}, {'.', '>', 0x37}, {'/', '?', 0x38},
      {'1', '!', 0x1e}, {'2', '@', 0x1f}, {'3', '#', 0x20}, {'4', '$', 0x21},
      {'5', '%', 0x22}, {'6', '^', 0x23}, {'7', '&', 0x24}, {'8', '*', 0x25},
      {'9', '(', 0x26}, {'0', ')', 0x27},
  };
  for (const auto &entry : entries) {
    if (character == entry.plain || character == entry.shifted) {
      usage = entry.usage;
      modifiers = character == entry.shifted ? 0x02 : 0;
      return true;
    }
  }
  return false;
}

json_object *CallTool(const std::string &name, json_object *arguments,
                      const Config &config, const Identity &identity,
                      ScreenGeometry &screen) {
  std::string error;
  if (name == "screen_capture") {
    JPEGFrame frame;
    if (!CaptureJPEG(identity, config.capture_timeout_seconds, frame, error))
      return ToolResult(error, true);
    if (frame.width == 0 || frame.height == 0)
      return ToolResult("captured frame has invalid dimensions", true);
    screen.width = frame.width;
    screen.height = frame.height;
    json_object *result = json_object_new_object();
    json_object *content = json_object_new_array();
    json_object_array_add(
        content,
        TextContent("Screen size: " + std::to_string(frame.width) + "x" +
                    std::to_string(frame.height) +
                    " pixels. mouse_move x/y use this image's pixel coordinates."));
    json_object *image = json_object_new_object();
    json_object_object_add(image, "type", json_object_new_string("image"));
    const std::string encoded = Base64(frame.payload);
    json_object_object_add(image, "data", json_object_new_string(encoded.c_str()));
    json_object_object_add(image, "mimeType", json_object_new_string("image/jpeg"));
    json_object_array_add(content, image);
    json_object_object_add(result, "content", content);
    return result;
  }
  if (name == "keyboard_key") {
    int usage = 0;
    int modifiers = 0;
    std::string action = "press";
    json_object *action_value = nullptr;
    const bool has_action =
        json_object_object_get_ex(arguments, "action", &action_value);
    if (!GetInt(arguments, "usage", usage, 0, 255) ||
        !GetInt(arguments, "modifiers", modifiers, 0, 255, true) ||
        (has_action && !GetString(arguments, "action", action)) ||
        (action != "press" && action != "down" && action != "up"))
      return ToolResult("usage/modifiers/action is invalid", true);
    const std::string down = "{\"modifiers\":" + std::to_string(modifiers) +
                             ",\"keys\":[" + std::to_string(usage) + "]}";
    if (action != "up" && !PostHID(identity, "/api/hid/keyboard", down, error))
      return ToolResult(error, true);
    if (action != "down" &&
        !PostHID(identity, "/api/hid/keyboard", "{\"modifiers\":0,\"keys\":[]}", error))
      return ToolResult(error, true);
    return ToolResult("Keyboard report sent");
  }
  if (name == "keyboard_type") {
    std::string text;
    int interval = 10;
    if (!GetString(arguments, "text", text) || text.size() > 1024 ||
        !GetInt(arguments, "interval_ms", interval, 0, 1000, true))
      return ToolResult("text or interval_ms is invalid", true);
    for (char character : text) {
      std::uint8_t usage = 0;
      std::uint8_t modifiers = 0;
      if (!ASCIIKey(character, usage, modifiers))
        return ToolResult("keyboard_type currently accepts US-ASCII text", true);
      const std::string down = "{\"modifiers\":" + std::to_string(modifiers) +
                               ",\"keys\":[" + std::to_string(usage) + "]}";
      if (!PostHID(identity, "/api/hid/keyboard", down, error) ||
          !PostHID(identity, "/api/hid/keyboard", "{\"modifiers\":0,\"keys\":[]}", error))
        return ToolResult(error, true);
      if (interval != 0)
        std::this_thread::sleep_for(std::chrono::milliseconds(interval));
    }
    return ToolResult("Typed " + std::to_string(text.size()) + " bytes");
  }
  if (name == "mouse_move") {
    int x = 0, y = 0;
    if (!GetInt(arguments, "x", x, 0, 65534) ||
        !GetInt(arguments, "y", y, 0, 65534))
      return ToolResult("x and y must be non-negative pixel coordinates", true);
    if (!screen.valid())
      return ToolResult("Call screen_capture before mouse_move so the pixel dimensions are known", true);
    if (x >= screen.width || y >= screen.height) {
      return ToolResult("x and y must be inside the most recent " +
                            std::to_string(screen.width) + "x" +
                            std::to_string(screen.height) +
                            " capture (x 0.." +
                            std::to_string(screen.width - 1) + ", y 0.." +
                            std::to_string(screen.height - 1) + ")",
                        true);
    }
    const auto absolute_x =
        PixelToAbsoluteHID(static_cast<std::uint32_t>(x), screen.width);
    const auto absolute_y =
        PixelToAbsoluteHID(static_cast<std::uint32_t>(y), screen.height);
    const std::string payload =
        "{\"buttons\":0,\"x\":" + std::to_string(absolute_x) +
        ",\"y\":" + std::to_string(absolute_y) + "}";
    return PostHID(identity, "/api/hid/mouse/absolute", payload, error)
               ? ToolResult("Mouse moved to pixel " + std::to_string(x) +
                            "," + std::to_string(y) + " on the " +
                            std::to_string(screen.width) + "x" +
                            std::to_string(screen.height) + " screen")
               : ToolResult(error, true);
  }
  if (name == "mouse_click") {
    std::string button;
    int count = 1;
    if (!GetString(arguments, "button", button) ||
        !GetInt(arguments, "count", count, 1, 2, true))
      return ToolResult("button or count is invalid", true);
    const int mask = button == "left" ? 1 : button == "right" ? 2 : button == "middle" ? 4 : 0;
    if (mask == 0)
      return ToolResult("button must be left, right, or middle", true);
    for (int index = 0; index < count; ++index) {
      if (!PostHID(identity, "/api/hid/mouse",
                   "{\"buttons\":" + std::to_string(mask) +
                       ",\"x\":0,\"y\":0,\"wheel\":0}", error) ||
          !PostHID(identity, "/api/hid/mouse",
                   "{\"buttons\":0,\"x\":0,\"y\":0,\"wheel\":0}", error))
        return ToolResult(error, true);
    }
    return ToolResult("Mouse click sent");
  }
  if (name == "mouse_scroll") {
    int delta = 0;
    if (!GetInt(arguments, "delta", delta, -127, 127))
      return ToolResult("delta must be between -127 and 127", true);
    const std::string payload = "{\"buttons\":0,\"x\":0,\"y\":0,\"wheel\":" +
                                std::to_string(delta) + "}";
    return PostHID(identity, "/api/hid/mouse", payload, error)
               ? ToolResult("Mouse wheel report sent")
               : ToolResult(error, true);
  }
  if (name == "atx_status") {
    ATXStatus status;
    if (!ReadATXStatus(identity, status, error))
      return ToolResult(error, true);
    if (!status.available)
      return ToolResult("ATX capability is unavailable", true);
    std::string result = "ATX available; power LED: ";
    result += status.has_power_led ? (status.power_led ? "on" : "off")
                                   : "unavailable";
    result += "; disk LED: ";
    result += status.has_disk_led ? (status.disk_led ? "on" : "off")
                                  : "unavailable";
    return ToolResult(result);
  }
  if (name == "atx_action") {
    std::string action;
    if (!GetString(arguments, "action", action) ||
        (action != "power_short" && action != "power_long" &&
         action != "reset"))
      return ToolResult("action must be power_short, power_long, or reset", true);
    ATXStatus status;
    if (!ReadATXStatus(identity, status, error))
      return ToolResult(error, true);
    if (!status.available)
      return ToolResult("ATX capability is unavailable", true);
    const std::string wire_action =
        action == "power_short" ? "power-short" :
        action == "power_long" ? "power-long" : "reset";
    return PostATXAction(identity, wire_action, error)
               ? ToolResult("ATX action " + action + " completed")
               : ToolResult(error, true);
  }
  return ToolResult("Unknown tool " + name, true);
}

json_object *Tool(const char *name, const char *description,
                  const char *schema_json) {
  std::string error;
  Json schema = ParseJSON(schema_json, error);
  json_object *tool = json_object_new_object();
  json_object_object_add(tool, "name", json_object_new_string(name));
  json_object_object_add(tool, "description", json_object_new_string(description));
  json_object_object_add(tool, "inputSchema", schema.release());
  return tool;
}

json_object *ToolsList(const Identity &identity) {
  json_object *result = json_object_new_object();
  json_object *tools = json_object_new_array();
  json_object_array_add(tools, Tool("screen_capture", "Capture the current OneKVM screen as a JPEG image. The result reports the pixel dimensions used by mouse_move.", R"({"type":"object","additionalProperties":false,"properties":{}})"));
  json_object_array_add(tools, Tool("keyboard_key", "Send one USB HID keyboard usage. Modifiers use the USB HID modifier bitmap.", R"({"type":"object","additionalProperties":false,"required":["usage"],"properties":{"usage":{"type":"integer","minimum":0,"maximum":255},"modifiers":{"type":"integer","minimum":0,"maximum":255,"default":0},"action":{"type":"string","enum":["press","down","up"],"default":"press"}}})"));
  json_object_array_add(tools, Tool("keyboard_type", "Type US-ASCII text using USB HID keyboard reports.", R"({"type":"object","additionalProperties":false,"required":["text"],"properties":{"text":{"type":"string","maxLength":1024},"interval_ms":{"type":"integer","minimum":0,"maximum":1000,"default":10}}})"));
  json_object_array_add(tools, Tool("mouse_move", "Move the absolute mouse pointer to a pixel in the most recent screen_capture image. Call screen_capture first. x is zero at the left edge and y is zero at the top edge.", R"({"type":"object","additionalProperties":false,"required":["x","y"],"properties":{"x":{"type":"integer","minimum":0,"maximum":65534,"description":"Horizontal pixel coordinate in the most recent screen_capture image."},"y":{"type":"integer","minimum":0,"maximum":65534,"description":"Vertical pixel coordinate in the most recent screen_capture image."}}})"));
  json_object_array_add(tools, Tool("mouse_click", "Click a mouse button once or twice.", R"({"type":"object","additionalProperties":false,"required":["button"],"properties":{"button":{"type":"string","enum":["left","right","middle"]},"count":{"type":"integer","minimum":1,"maximum":2,"default":1}}})"));
  json_object_array_add(tools, Tool("mouse_scroll", "Send a relative mouse-wheel report.", R"({"type":"object","additionalProperties":false,"required":["delta"],"properties":{"delta":{"type":"integer","minimum":-127,"maximum":127}}})"));
  ATXStatus atx;
  std::string ignored;
  if (ReadATXStatus(identity, atx, ignored) && atx.available) {
    json_object_array_add(tools, Tool("atx_status", "Read the attached computer's ATX power and disk LED state.", R"({"type":"object","additionalProperties":false,"properties":{}})"));
    json_object_array_add(tools, Tool("atx_action", "Operate the attached computer's ATX front-panel controls. power_short briefly presses the power button, power_long holds it to force power off, and reset presses the reset button.", R"({"type":"object","additionalProperties":false,"required":["action"],"properties":{"action":{"type":"string","enum":["power_short","power_long","reset"]}}})"));
  }
  json_object_object_add(result, "tools", tools);
  return result;
}

json_object *RPCError(json_object *id, int code, std::string_view message) {
  json_object *response = json_object_new_object();
  json_object_object_add(response, "jsonrpc", json_object_new_string("2.0"));
  json_object_object_add(response, "id", id != nullptr ? json_object_get(id) : nullptr);
  json_object *error = json_object_new_object();
  json_object_object_add(error, "code", json_object_new_int(code));
  json_object_object_add(error, "message",
                         json_object_new_string_len(message.data(), message.size()));
  json_object_object_add(response, "error", error);
  return response;
}

json_object *RPCResult(json_object *id, json_object *result) {
  json_object *response = json_object_new_object();
  json_object_object_add(response, "jsonrpc", json_object_new_string("2.0"));
  json_object_object_add(response, "id", json_object_get(id));
  json_object_object_add(response, "result", result);
  return response;
}

json_object *HandleRPC(json_object *request, const Config &config,
                       const Identity &identity, ScreenGeometry &screen,
                       bool &notification) {
  notification = false;
  if (!json_object_is_type(request, json_type_object))
    return RPCError(nullptr, -32600, "Invalid Request");
  json_object *version = nullptr;
  json_object *method_value = nullptr;
  json_object *id = nullptr;
  if (!json_object_object_get_ex(request, "jsonrpc", &version) ||
      !json_object_is_type(version, json_type_string) ||
      std::string_view(json_object_get_string(version)) != "2.0" ||
      !json_object_object_get_ex(request, "method", &method_value) ||
      !json_object_is_type(method_value, json_type_string))
    return RPCError(nullptr, -32600, "Invalid Request");
  const bool has_id = json_object_object_get_ex(request, "id", &id);
  const std::string method = json_object_get_string(method_value);
  if (!has_id) {
    notification = true;
    return nullptr;
  }
  if (method == "initialize") {
    std::string protocol = "2025-03-26";
    json_object *params = nullptr;
    json_object *client_protocol = nullptr;
    if (json_object_object_get_ex(request, "params", &params) &&
        json_object_is_type(params, json_type_object) &&
        json_object_object_get_ex(params, "protocolVersion", &client_protocol) &&
        json_object_is_type(client_protocol, json_type_string)) {
      const std::string proposed = json_object_get_string(client_protocol);
      if (proposed == "2024-11-05" || proposed == "2025-03-26" ||
          proposed == "2025-06-18")
        protocol = proposed;
    }
    json_object *result = json_object_new_object();
    json_object_object_add(result, "protocolVersion", json_object_new_string(protocol.c_str()));
    json_object *capabilities = json_object_new_object();
    json_object *tools = json_object_new_object();
    json_object_object_add(tools, "listChanged", json_object_new_boolean(false));
    json_object_object_add(capabilities, "tools", tools);
    json_object_object_add(result, "capabilities", capabilities);
    json_object *server = json_object_new_object();
    json_object_object_add(server, "name", json_object_new_string("OneKVM MCP"));
    json_object_object_add(server, "version", json_object_new_string("0.1.0"));
    json_object_object_add(result, "serverInfo", server);
    json_object_object_add(result, "instructions", json_object_new_string("Capture the screen before input, then use keyboard and mouse tools to operate the connected computer."));
    return RPCResult(id, result);
  }
  if (method == "ping")
    return RPCResult(id, json_object_new_object());
  if (method == "tools/list")
    return RPCResult(id, ToolsList(identity));
  if (method == "tools/call") {
    json_object *params = nullptr;
    json_object *arguments = nullptr;
    std::string name;
    if (!json_object_object_get_ex(request, "params", &params) ||
        !json_object_is_type(params, json_type_object) ||
        !GetString(params, "name", name))
      return RPCError(id, -32602, "Invalid tools/call parameters");
    if (!json_object_object_get_ex(params, "arguments", &arguments))
      arguments = json_object_new_object();
    else
      json_object_get(arguments);
    Json owned_arguments(arguments);
    if (!json_object_is_type(arguments, json_type_object))
      return RPCError(id, -32602, "Tool arguments must be an object");
    return RPCResult(id, CallTool(name, arguments, config, identity, screen));
  }
  return RPCError(id, -32601, "Method not found");
}

struct HTTPRequest {
  std::string method;
  std::string path;
  std::map<std::string, std::string> headers;
  std::string body;
};

std::string Lower(std::string value) {
  std::transform(value.begin(), value.end(), value.begin(), [](unsigned char c) {
    return static_cast<char>(std::tolower(c));
  });
  return value;
}

bool ReadHTTPRequest(int fd, HTTPRequest &request, std::string &error) {
  std::string data;
  std::array<char, 4096> buffer{};
  std::size_t header_end = std::string::npos;
  while ((header_end = data.find("\r\n\r\n")) == std::string::npos) {
    if (data.size() >= 64U << 10) {
      error = "HTTP headers are too large";
      return false;
    }
    const auto received = recv(fd, buffer.data(), buffer.size(), 0);
    if (received < 0 && errno == EINTR)
      continue;
    if (received <= 0) {
      error = "read HTTP request";
      return false;
    }
    data.append(buffer.data(), static_cast<std::size_t>(received));
  }
  const auto first_end = data.find("\r\n");
  const auto first_space = data.find(' ');
  const auto second_space = first_space == std::string::npos ? std::string::npos : data.find(' ', first_space + 1);
  if (first_end == std::string::npos || first_space == std::string::npos ||
      second_space == std::string::npos || second_space > first_end) {
    error = "invalid HTTP request line";
    return false;
  }
  request.method = data.substr(0, first_space);
  request.path = data.substr(first_space + 1, second_space - first_space - 1);
  std::size_t line = first_end + 2;
  while (line < header_end) {
    const auto end = data.find("\r\n", line);
    const auto colon = data.find(':', line);
    if (end == std::string::npos || colon == std::string::npos || colon > end) {
      error = "invalid HTTP header";
      return false;
    }
    std::string name = Lower(data.substr(line, colon - line));
    std::size_t value_begin = data.find_first_not_of(" \t", colon + 1);
    std::string value = value_begin == std::string::npos || value_begin >= end
                            ? ""
                            : data.substr(value_begin, end - value_begin);
    request.headers[name] = value;
    line = end + 2;
  }
  std::size_t content_length = 0;
  if (auto iterator = request.headers.find("content-length");
      iterator != request.headers.end()) {
    const auto parsed = std::from_chars(iterator->second.data(),
                                        iterator->second.data() + iterator->second.size(),
                                        content_length);
    if (parsed.ec != std::errc{} || parsed.ptr != iterator->second.data() + iterator->second.size() ||
        content_length > kMaxRequestBytes) {
      error = "invalid Content-Length";
      return false;
    }
  }
  if (request.headers.contains("transfer-encoding")) {
    error = "chunked requests are not supported";
    return false;
  }
  const std::size_t body_start = header_end + 4;
  while (data.size() - body_start < content_length) {
    const auto received = recv(fd, buffer.data(), buffer.size(), 0);
    if (received < 0 && errno == EINTR)
      continue;
    if (received <= 0) {
      error = "read HTTP request body";
      return false;
    }
    data.append(buffer.data(), static_cast<std::size_t>(received));
  }
  request.body = data.substr(body_start, content_length);
  return true;
}

void SendHTTP(int fd, int status, std::string_view content_type,
              std::string_view body) {
  const char *reason = status == 200 ? "OK" : status == 202 ? "Accepted" :
                       status == 204 ? "No Content" : status == 400 ? "Bad Request" :
                       status == 401 ? "Unauthorized" : status == 404 ? "Not Found" :
                       status == 405 ? "Method Not Allowed" : "Service Unavailable";
  const std::string header = "HTTP/1.1 " + std::to_string(status) + " " + reason +
                             "\r\nContent-Type: " + std::string(content_type) +
                             "\r\nContent-Length: " + std::to_string(body.size()) +
                             "\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";
  std::string ignored;
  WriteAll(fd, header, ignored);
  WriteAll(fd, body, ignored);
}

void HandleClient(int fd, const Config &config, const Identity &identity,
                  ScreenGeometry &screen) {
  timeval timeout{15, 0};
  setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
  setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
  HTTPRequest request;
  std::string error;
  if (!ReadHTTPRequest(fd, request, error)) {
    SendHTTP(fd, 400, "application/json", "{\"error\":\"invalid request\"}\n");
    return;
  }
  if (request.method == "OPTIONS") {
    SendHTTP(fd, 204, "text/plain", "");
    return;
  }
  if (request.method != "POST") {
    SendHTTP(fd, 405, "application/json", "{\"error\":\"method not allowed\"}\n");
    return;
  }
  const auto authorization = request.headers.find("authorization");
  const std::string expected = "Bearer " + config.access_token;
  if (config.access_token.empty() || authorization == request.headers.end() ||
      !ConstantTimeEqual(authorization->second, expected)) {
    SendHTTP(fd, 401, "application/json", "{\"error\":\"invalid MCP access token\"}\n");
    return;
  }
  Json rpc = ParseJSON(request.body, error);
  if (!rpc) {
    Json response(RPCError(nullptr, -32700, "Parse error"));
    const char *body = json_object_to_json_string_ext(response.get(), JSON_C_TO_STRING_PLAIN);
    SendHTTP(fd, 200, "application/json", body);
    return;
  }
  bool notification = false;
  Json response(HandleRPC(rpc.get(), config, identity, screen, notification));
  if (notification) {
    SendHTTP(fd, 202, "application/json", "");
    return;
  }
  const char *body = json_object_to_json_string_ext(response.get(), JSON_C_TO_STRING_PLAIN);
  SendHTTP(fd, 200, "application/json", body);
}

bool Controller(std::string &error) {
  std::string input((std::istreambuf_iterator<char>(std::cin)),
                    std::istreambuf_iterator<char>());
  Json root = ParseJSON(input, error);
  if (!root || !json_object_is_type(root.get(), json_type_object))
    return false;
  json_object *event_value = nullptr;
  json_object *id_value = nullptr;
  json_object *enabled_value = nullptr;
  if (!json_object_object_get_ex(root.get(), "event", &event_value) ||
      !json_object_is_type(event_value, json_type_string) ||
      !json_object_object_get_ex(root.get(), "extension_id", &id_value) ||
      !json_object_is_type(id_value, json_type_string) ||
      std::string_view(json_object_get_string(id_value)) != kExtensionID ||
      !json_object_object_get_ex(root.get(), "enabled", &enabled_value) ||
      !json_object_is_type(enabled_value, json_type_boolean)) {
    error = "unsupported controller event";
    return false;
  }
  const std::string event = json_object_get_string(event_value);
  const bool enabled = json_object_get_boolean(enabled_value) != 0;
  if (event != "enable" && event != "disable" && event != "reconcile" &&
      event != "config_changed") {
    error = "unsupported controller lifecycle event " + event;
    return false;
  }
  if (!enabled || event == "disable") {
    std::cout << R"({"actions":[{"type":"remove","name":"server"}]})";
  } else if (event == "config_changed") {
    std::cout << R"({"actions":[{"type":"remove","name":"server"},{"type":"ensure","name":"server","command":["bin/onekvm-mcp"],"restart":"on-failure"}]})";
  } else {
    std::cout << R"({"actions":[{"type":"ensure","name":"server","command":["bin/onekvm-mcp"],"restart":"on-failure"}]})";
  }
  return true;
}

int Serve() {
  std::string error;
  Config config;
  if (!LoadConfig(false, config, error)) {
    std::cerr << "onekvm-mcp: " << error << '\n';
    return 1;
  }
  Identity identity;
  if (!LoadIdentity(identity, error)) {
    std::cerr << "onekvm-mcp: " << error << '\n';
    return 1;
  }
  struct sigaction action {};
  action.sa_handler = Stop;
  sigemptyset(&action.sa_mask);
  sigaction(SIGINT, &action, nullptr);
  sigaction(SIGTERM, &action, nullptr);

  const std::string path = SocketPath();
  unlink(path.c_str());
  const int listener = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
  if (listener < 0) {
    std::cerr << "onekvm-mcp: create listener: " << std::strerror(errno) << '\n';
    return 1;
  }
  sockaddr_un address{};
  address.sun_family = AF_UNIX;
  if (path.size() >= sizeof(address.sun_path)) {
    std::cerr << "onekvm-mcp: socket path is too long\n";
    close(listener);
    return 1;
  }
  std::memcpy(address.sun_path, path.c_str(), path.size() + 1);
  if (bind(listener, reinterpret_cast<sockaddr *>(&address), sizeof(address)) < 0 ||
      chmod(path.c_str(), 0660) < 0 || listen(listener, 8) < 0) {
    std::cerr << "onekvm-mcp: bind listener: " << std::strerror(errno) << '\n';
    close(listener);
    unlink(path.c_str());
    return 1;
  }
  ScreenGeometry screen;
  while (!stopped) {
    const int client = accept4(listener, nullptr, nullptr, SOCK_CLOEXEC);
    if (client < 0) {
      if (errno == EINTR)
        continue;
      std::cerr << "onekvm-mcp: accept: " << std::strerror(errno) << '\n';
      break;
    }
    HandleClient(client, config, identity, screen);
    close(client);
  }
  close(listener);
  unlink(path.c_str());
  return stopped ? 0 : 1;
}

} // namespace

int main(int argc, char **argv) {
  std::string error;
  if (argc == 2 && std::string_view(argv[1]) == "--controller") {
    if (Controller(error))
      return 0;
  } else if (argc == 2 && std::string_view(argv[1]) == "--health") {
    Config config;
    if (LoadConfig(true, config, error))
      return 0;
  } else if (argc == 1) {
    return Serve();
  } else {
    error = "usage: onekvm-mcp [--controller|--health]";
  }
  std::cerr << "onekvm-mcp: " << error << '\n';
  return 1;
}
