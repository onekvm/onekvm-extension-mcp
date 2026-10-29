#include "listen.hpp"

#include <iostream>
#include <stdexcept>

using onekvm_mcp::Config;
using onekvm_mcp::InterfaceAddress;
using onekvm_mcp::kDefaultPort;

void Require(bool ok, const char *message) {
  if (!ok)
    throw std::runtime_error(message);
}

InterfaceAddress Address(const std::string &name, const char *text) {
  InterfaceAddress item;
  item.name = name;
  Require(onekvm_mcp::ParseIPAddress(text, item.address, item.length),
          "parse fixture address");
  return item;
}

std::string Numeric(const sockaddr_storage &address) {
  char text[INET6_ADDRSTRLEN] = {};
  if (address.ss_family == AF_INET) {
    inet_ntop(AF_INET,
              &reinterpret_cast<const sockaddr_in &>(address).sin_addr, text,
              sizeof(text));
  } else if (address.ss_family == AF_INET6) {
    inet_ntop(AF_INET6,
              &reinterpret_cast<const sockaddr_in6 &>(address).sin6_addr, text,
              sizeof(text));
  }
  return text;
}

int PortOf(const sockaddr_storage &address) {
  if (address.ss_family == AF_INET)
    return ntohs(reinterpret_cast<const sockaddr_in &>(address).sin_port);
  if (address.ss_family == AF_INET6)
    return ntohs(reinterpret_cast<const sockaddr_in6 &>(address).sin6_port);
  return 0;
}

void TestOldConfigUsesAllInterfaces() {
  Config config;
  config.access_token = "0123456789abcdef";
  config.capture_timeout_seconds = 8;
  std::string error;
  sockaddr_storage address{};
  socklen_t length = 0;
  Require(onekvm_mcp::ResolveListen(config, {}, address, length, error),
          error.c_str());
  Require(address.ss_family == AF_INET && Numeric(address) == "0.0.0.0" &&
              PortOf(address) == kDefaultPort && length == sizeof(sockaddr_in),
          "old configuration listens on 0.0.0.0");
}

void TestExplicitChoices() {
  std::string error;
  sockaddr_storage address{};
  socklen_t length = 0;
  Config config;
  config.listen_mode = "address";
  config.listen_address = "203.0.113.10";
  config.port = 9711;
  Require(onekvm_mcp::ResolveListen(config, {}, address, length, error),
          error.c_str());
  Require(Numeric(address) == "203.0.113.10" && PortOf(address) == 9711,
          "specific IPv4");

  config.listen_address = "::1";
  Require(onekvm_mcp::ResolveListen(config, {}, address, length, error),
          error.c_str());
  Require(address.ss_family == AF_INET6 && Numeric(address) == "::1",
          "specific IPv6");

  config.listen_mode = "interface";
  config.listen_interface = "eth0";
  config.port = 9712;
  const std::vector<InterfaceAddress> interfaces = {
      Address("eth0", "fe80::1"),
      Address("eth0", "169.254.1.1"),
      Address("wlan0", "192.0.2.9"),
      Address("eth0", "192.0.2.20"),
  };
  Require(onekvm_mcp::ResolveListen(config, interfaces, address, length, error),
          error.c_str());
  Require(Numeric(address) == "192.0.2.20" && PortOf(address) == 9712,
          "interface prefers a routable IPv4 address");

  config.listen_interface = "usb0";
  const std::vector<InterfaceAddress> link_local = {Address("usb0", "fe80::2")};
  Require(onekvm_mcp::ResolveListen(config, link_local, address, length, error),
          error.c_str());
  Require(Numeric(address) == "fe80::2", "link-local address is still usable");

  Require(!onekvm_mcp::ResolveListen(config, interfaces, address, length, error),
          "missing interface must fail");
}

void TestRejectedValues() {
  std::string error;
  Config config;
  config.port = 80;
  Require(!onekvm_mcp::ConfigReady(config, error), "privileged port rejected");
  config.port = 65536;
  Require(!onekvm_mcp::ConfigReady(config, error), "port above 65535 rejected");
  config.port = 1024;
  config.listen_mode = "somewhere";
  Require(!onekvm_mcp::ConfigReady(config, error), "unknown mode rejected");
  config.listen_mode = "interface";
  config.listen_interface = "0.0.0.0";
  Require(!onekvm_mcp::ConfigReady(config, error),
          "an IP is not an interface name");
  config.listen_interface = "eth0";
  Require(onekvm_mcp::ConfigReady(config, error), "interface mode accepted");
  config.listen_mode = "address";
  config.listen_address = "eth0";
  Require(!onekvm_mcp::ConfigReady(config, error),
          "an interface name is not an IP address");
  config.listen_address = "192.0.2.1";
  Require(onekvm_mcp::ConfigReady(config, error), "address mode accepted");
  Require(onekvm_mcp::Trim("  eth0\n") == "eth0", "trim keeps the name");
}

int main() {
  try {
    TestOldConfigUsesAllInterfaces();
    TestExplicitChoices();
    TestRejectedValues();
  } catch (const std::exception &error) {
    std::cerr << "onekvm-mcp listen test: " << error.what() << '\n';
    return 1;
  }
  return 0;
}
