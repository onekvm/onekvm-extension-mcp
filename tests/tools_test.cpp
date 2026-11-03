#include "tools.hpp"

#include <iostream>
#include <stdexcept>

void Require(bool value, const char *message) {
  if (!value)
    throw std::runtime_error(message);
}

int main() {
  using namespace onekvm_mcp;
  try {
    Config config;
    Require(AllowsPlugin(config, "example"), "existing settings default to allowing plugins");
    config.tool_denied_plugins = "firewall, example";
    Require(!AllowsPlugin(config, "example"), "explicit prohibition overrides default allow");
    Require(AllowsPlugin(config, "example-other"), "plugin IDs match exactly");
    config.tool_allowed_plugins = "example";
    Require(!AllowsPlugin(config, "example"), "prohibition wins conflicting external settings");
    config.tool_default_policy = "deny";
    config.tool_denied_plugins = "firewall";
    Require(AllowsPlugin(config, "example"), "explicit allow overrides default deny");
    Require(!AllowsPlugin(config, "new-plugin"), "default deny covers newly installed plugins");
    for (const char *list : {"../other", "example,", "Example", "example,,other", "example/other"}) {
      config.tool_allowed_plugins = list;
      Require(!ValidToolPolicy(config), "malformed rule is rejected");
      Require(!AllowsPlugin(config, "other"), "malformed policy fails closed");
    }
    json_object *entry = json_tokener_parse(R"({"point":"mcp.tool","id":"example/status","source":"example","version":1,"generation":9,"method":"read_status","data":{"description":"Read status","inputSchema":{"type":"object","properties":{}}}})");
    ContributedTool tool;
    Require(ReadContributedTool(entry, tool), "valid declared contribution");
    Require(tool.name == "example__status" && tool.generation == 9, "stable namespaced name");
    json_object_object_add(entry, "source", json_object_new_string("other"));
    Require(!ReadContributedTool(entry, tool), "another plugin cannot claim a tool's identity");
    json_object_object_add(entry, "source", json_object_new_string("example"));
    json_object_object_add(entry, "version", json_object_new_int(2));
    Require(!ReadContributedTool(entry, tool), "incompatible contract is ignored");
    json_object_object_add(entry, "version", json_object_new_int(1));
    json_object_object_add(entry, "method", json_object_new_string("../exec"));
    Require(!ReadContributedTool(entry, tool), "invalid methods never become tools");
    json_object_put(entry);
    std::cout << "MCP tool access and contribution checks passed\n";
    return 0;
  } catch (const std::exception &error) {
    std::cerr << error.what() << '\n';
    return 1;
  }
}
