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
    json_object *indicators = json_tokener_parse(R"({"pwr_led":true,"hdd_led":null,"off":false,"invalid":"false"})");
    bool present = false, enabled = false;
    Require(ReadIndicator(indicators, "pwr_led", present, enabled) && present && enabled, "available power indicator is readable");
    Require(ReadIndicator(indicators, "hdd_led", present, enabled) && !present, "unsupported null indicator is unavailable");
    Require(ReadIndicator(indicators, "missing", present, enabled) && !present, "missing indicator is unavailable");
    Require(ReadIndicator(indicators, "off", present, enabled) && present && !enabled, "off differs from unavailable");
    Require(!ReadIndicator(indicators, "invalid", present, enabled), "malformed indicator is rejected");
    json_object_put(indicators);
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
    json_object *entry = json_tokener_parse(R"({"point":"extend.mcp","id":"example/status","source":"example","version":1,"generation":9,"method":"read_status","data":{"description":"Read status","inputSchema":{"type":"object","properties":{}}}})");
    ContributedTool tool;
    Require(ReadContributedTool(entry, tool), "valid declared contribution");
    Require(tool.name == "example__status" && tool.generation == 9, "stable namespaced name");
    json_object *registry = json_object_new_array();
    json_object_array_add(registry, json_object_get(entry));
    config.tool_default_policy = "allow";
    config.tool_allowed_plugins.clear();
    config.tool_denied_plugins = "example";
    json_object *visible = json_object_new_array();
    AppendContributedTools(visible, registry, config, false);
    Require(json_object_array_length(visible) == 0, "prohibited tools stay out of MCP discovery");
    json_object_put(visible);
    json_object *inventory = json_object_new_array();
    AppendContributedTools(inventory, registry, config, true);
    Require(json_object_array_length(inventory) == 1, "management can inspect prohibited tools");
    json_object *listed = json_object_array_get_idx(inventory, 0);
    json_object *allowed = nullptr;
    Require(StringField(listed, "source") == "example" &&
                json_object_object_get_ex(listed, "allowed", &allowed) &&
                !json_object_get_boolean(allowed), "inventory reports actual origin and saved policy");
    Require(StringField(listed, "name") == "example__status", "inventory uses the MCP name");
    json_object_put(inventory);
    config.tool_denied_plugins.clear();
    visible = json_object_new_array();
    AppendContributedTools(visible, registry, config, false);
    listed = json_object_array_get_idx(visible, 0);
    Require(json_object_array_length(visible) == 1 &&
                !json_object_object_get_ex(listed, "allowed", &allowed) &&
                StringField(listed, "source").empty(), "public discovery keeps its existing contract");
    json_object_put(visible);
    json_object *data = nullptr;
    json_object_object_get_ex(entry, "data", &data);
    json_object *translations = json_tokener_parse(R"({"default":{"description":"Read status"},"zh":{"title":"狀態","description":"读取状态","command":"ignored"},"zh-TW":{"title":false},"unsupported":{"description":"ignored"}})");
    json_object *traditional = nullptr;
    json_object_object_get_ex(translations, "zh-TW", &traditional);
    json_object_object_add(traditional, "description", json_object_new_string(std::string(2049, 'x').c_str()));
    json_object_object_add(data, "i18n", translations);
    inventory = json_object_new_array();
    AppendContributedTools(inventory, registry, config, true);
    listed = json_object_array_get_idx(inventory, 0);
    json_object *catalog = nullptr;
    Require(json_object_object_get_ex(listed, "i18n", &catalog), "management inventory includes translations");
    json_object *chinese = nullptr;
    Require(json_object_object_get_ex(catalog, "zh", &chinese) && StringField(chinese, "description") == "读取状态", "translated text survives discovery");
    json_object *unused = nullptr;
    Require(!json_object_object_get_ex(chinese, "command", &unused) &&
                !json_object_object_get_ex(catalog, "zh-TW", &unused) &&
                !json_object_object_get_ex(catalog, "unsupported", &unused), "invalid and unsupported translation fields are omitted");
    Require(StringField(listed, "description") == "Read status" && StringField(listed, "name") == "example__status", "translations preserve canonical text and identity");
    json_object_put(inventory);
    visible = json_object_new_array();
    AppendContributedTools(visible, registry, config, false);
    listed = json_object_array_get_idx(visible, 0);
    Require(StringField(listed, "description") == "Read status" &&
                !json_object_object_get_ex(listed, "i18n", &unused), "MCP clients retain canonical descriptions without display metadata");
    json_object_put(visible);
    json_object_object_add(entry, "source", json_object_new_string("other"));
    Require(!ReadContributedTool(entry, tool), "another plugin cannot claim a tool's identity");
    json_object_object_add(entry, "source", json_object_new_string("example"));
    json_object_object_add(entry, "version", json_object_new_int(2));
    Require(!ReadContributedTool(entry, tool), "incompatible contract is ignored");
    json_object_object_add(entry, "version", json_object_new_int(1));
    json_object_object_add(entry, "method", json_object_new_string("../exec"));
    Require(!ReadContributedTool(entry, tool), "invalid methods never become tools");
    inventory = json_object_new_array();
    AppendContributedTools(inventory, registry, config, true);
    Require(json_object_array_length(inventory) == 0, "invalid declarations cannot appear in inventory");
    json_object_put(inventory);
    json_object_put(registry);
    json_object_put(entry);
    std::cout << "MCP tool access and contribution checks passed\n";
    return 0;
  } catch (const std::exception &error) {
    std::cerr << error.what() << '\n';
    return 1;
  }
}
