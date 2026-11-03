#pragma once

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>

#include <cctype>
#include <cstdint>
#include <cstring>
#include <string>
#include <string_view>
#include <vector>

namespace onekvm_mcp {

inline constexpr int kDefaultPort = 9710;
inline constexpr int kMinimumPort = 1024;
inline constexpr int kMaximumPort = 65535;

struct Config {
  std::string access_token;
  int capture_timeout_seconds = 5;
  std::string listen_mode = "all";
  std::string listen_interface;
  std::string listen_address;
  int port = kDefaultPort;
  std::string tool_default_policy = "allow";
  std::string tool_allowed_plugins;
  std::string tool_denied_plugins;
};

struct InterfaceAddress {
  std::string name;
  sockaddr_storage address{};
  socklen_t length = 0;
};

inline std::string Trim(std::string_view value) {
  while (!value.empty() &&
         std::isspace(static_cast<unsigned char>(value.front())) != 0)
    value.remove_prefix(1);
  while (!value.empty() &&
         std::isspace(static_cast<unsigned char>(value.back())) != 0)
    value.remove_suffix(1);
  return std::string(value);
}

inline bool ValidInterfaceName(std::string_view name) {
  if (name.empty() || name.size() > 15)
    return false;
  if (std::isalpha(static_cast<unsigned char>(name.front())) == 0)
    return false;
  for (const char character : name) {
    const unsigned char value = static_cast<unsigned char>(character);
    if (std::isalnum(value) == 0 && character != '_' && character != '.' &&
        character != ':' && character != '-')
      return false;
  }
  return true;
}

inline bool ParseIPAddress(std::string_view text, sockaddr_storage &address,
                           socklen_t &length) {
  address = {};
  length = 0;
  if (text.empty() || text.find('%') != std::string_view::npos)
    return false;
  const std::string value(text);
  sockaddr_in ipv4{};
  if (inet_pton(AF_INET, value.c_str(), &ipv4.sin_addr) == 1) {
    ipv4.sin_family = AF_INET;
    std::memcpy(&address, &ipv4, sizeof(ipv4));
    length = sizeof(ipv4);
    return true;
  }
  sockaddr_in6 ipv6{};
  if (inet_pton(AF_INET6, value.c_str(), &ipv6.sin6_addr) == 1) {
    ipv6.sin6_family = AF_INET6;
    std::memcpy(&address, &ipv6, sizeof(ipv6));
    length = sizeof(ipv6);
    return true;
  }
  return false;
}

inline bool ConfigReady(const Config &config, std::string &error) {
  if (config.access_token.size() > 128 || config.capture_timeout_seconds < 1 ||
      config.capture_timeout_seconds > 15) {
    error = "MCP configuration is outside the supported range";
    return false;
  }
  if (config.listen_mode != "all" && config.listen_mode != "interface" &&
      config.listen_mode != "address") {
    error = "listen_mode must be all, interface, or address";
    return false;
  }
  if (config.port < kMinimumPort || config.port > kMaximumPort) {
    error = "port must be between 1024 and 65535";
    return false;
  }
  if (config.listen_mode == "interface" &&
      !ValidInterfaceName(config.listen_interface)) {
    error = "listen_interface must be a network interface name";
    return false;
  }
  if (config.listen_mode == "address") {
    sockaddr_storage address{};
    socklen_t length = 0;
    if (!ParseIPAddress(config.listen_address, address, length)) {
      error = "listen_address must be an IP address";
      return false;
    }
  }
  return true;
}

inline void SetPort(sockaddr_storage &address, std::uint16_t port) {
  if (address.ss_family == AF_INET)
    reinterpret_cast<sockaddr_in &>(address).sin_port = htons(port);
  else if (address.ss_family == AF_INET6)
    reinterpret_cast<sockaddr_in6 &>(address).sin6_port = htons(port);
}

inline int AddressRank(const InterfaceAddress &item) {
  if (item.length == 0)
    return 0;
  if (item.address.ss_family == AF_INET) {
    const auto host = ntohl(reinterpret_cast<const sockaddr_in &>(item.address)
                                .sin_addr.s_addr);
    const bool link_local = (host & 0xffff0000U) == 0xa9fe0000U;
    return link_local ? 2 : 4;
  }
  if (item.address.ss_family == AF_INET6) {
    const auto &ipv6 = reinterpret_cast<const sockaddr_in6 &>(item.address);
    const bool link_local = ipv6.sin6_addr.s6_addr[0] == 0xfe &&
                            (ipv6.sin6_addr.s6_addr[1] & 0xc0) == 0x80;
    return link_local ? 1 : 3;
  }
  return 0;
}

inline bool ResolveListen(const Config &config,
                          const std::vector<InterfaceAddress> &interfaces,
                          sockaddr_storage &address, socklen_t &length,
                          std::string &error) {
  address = {};
  length = 0;
  if (!ConfigReady(config, error))
    return false;
  if (config.listen_mode == "all") {
    sockaddr_in any{};
    any.sin_family = AF_INET;
    any.sin_addr.s_addr = htonl(INADDR_ANY);
    any.sin_port = htons(static_cast<std::uint16_t>(config.port));
    std::memcpy(&address, &any, sizeof(any));
    length = sizeof(any);
    return true;
  }
  if (config.listen_mode == "address") {
    if (!ParseIPAddress(config.listen_address, address, length)) {
      error = "listen_address must be an IP address";
      return false;
    }
    SetPort(address, static_cast<std::uint16_t>(config.port));
    return true;
  }
  const InterfaceAddress *chosen = nullptr;
  int rank = 0;
  for (const InterfaceAddress &item : interfaces) {
    if (item.name != config.listen_interface)
      continue;
    const int item_rank = AddressRank(item);
    if (item_rank > rank) {
      chosen = &item;
      rank = item_rank;
    }
  }
  if (chosen == nullptr) {
    error = "interface " + config.listen_interface + " has no IP address";
    return false;
  }
  address = chosen->address;
  length = chosen->length;
  SetPort(address, static_cast<std::uint16_t>(config.port));
  return true;
}

} // namespace onekvm_mcp
