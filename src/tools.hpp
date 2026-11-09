#pragma once

#include "listen.hpp"
#include <json-c/json.h>

namespace onekvm_mcp {

inline bool ValidPluginID(std::string_view value) {
  if (value.empty() || value.size() > 63 ||
      !((value.front() >= 'a' && value.front() <= 'z') ||
        (value.front() >= '0' && value.front() <= '9')))
    return false;
  for (char c : value)
    if (!((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-'))
      return false;
  return true;
}

inline bool ValidPluginList(std::string_view list) {
  if (list.size() > 4096)
    return false;
  if (list.empty())
    return true;
  while (true) {
    const auto end = list.find(',');
    if (!ValidPluginID(Trim(list.substr(0, end))))
      return false;
    if (end == std::string_view::npos)
      return true;
    list.remove_prefix(end + 1);
  }
}

inline bool ContainsPlugin(std::string_view list, std::string_view source) {
  while (!list.empty()) {
    const auto end = list.find(',');
    if (Trim(list.substr(0, end)) == source)
      return true;
    if (end == std::string_view::npos)
      break;
    list.remove_prefix(end + 1);
  }
  return false;
}

inline bool ValidToolPolicy(const Config &config) {
  return (config.tool_default_policy == "allow" || config.tool_default_policy == "deny") &&
         ValidPluginList(config.tool_allowed_plugins) && ValidPluginList(config.tool_denied_plugins);
}

inline bool AllowsPlugin(const Config &config, std::string_view source) {
  if (!ValidToolPolicy(config) || !ValidPluginID(source) ||
      ContainsPlugin(config.tool_denied_plugins, source))
    return false;
  return ContainsPlugin(config.tool_allowed_plugins, source) || config.tool_default_policy == "allow";
}

inline std::string StringField(json_object *object, const char *key) {
  json_object *value = nullptr;
  if (!json_object_object_get_ex(object, key, &value) ||
      !json_object_is_type(value, json_type_string))
    return {};
  return std::string(json_object_get_string(value), json_object_get_string_len(value));
}

// Core uses null for indicators that the device does not provide.
inline bool ReadIndicator(json_object *root, const char *key, bool &present, bool &enabled) {
  present = false;
  enabled = false;
  json_object *value = nullptr;
  if (!json_object_object_get_ex(root, key, &value) || json_object_is_type(value, json_type_null))
    return true;
  if (!json_object_is_type(value, json_type_boolean))
    return false;
  present = true;
  enabled = json_object_get_boolean(value) != 0;
  return true;
}

struct ContributedTool {
  std::string id;
  std::string source;
  std::string name;
  std::string description;
  std::string title;
  std::uint64_t generation = 0;
  json_object *schema = nullptr; // Borrowed from the registry response.
  json_object *i18n = nullptr; // Optional display text, borrowed from the registry.
};

inline bool ReadContributedTool(json_object *entry, ContributedTool &tool) {
  if (!json_object_is_type(entry, json_type_object) || StringField(entry, "point") != "extend.mcp")
    return false;
  tool.source = StringField(entry, "source");
  tool.id = StringField(entry, "id");
  const std::string prefix = tool.source + "/";
  if (!ValidPluginID(tool.source) || tool.source == "mcp" || !tool.id.starts_with(prefix))
    return false;
  const std::string local = tool.id.substr(prefix.size());
  if (!ValidPluginID(local))
    return false;
  const std::string method = StringField(entry, "method");
  if (method.empty() || method.size() > 63 || method.front() < 'a' || method.front() > 'z')
    return false;
  for (char c : method)
    if (!((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_'))
      return false;
  json_object *version = nullptr;
  json_object *generation = nullptr;
  json_object *data = nullptr;
  if (!json_object_object_get_ex(entry, "version", &version) ||
      !json_object_is_type(version, json_type_int) || json_object_get_int64(version) != 1 ||
      !json_object_object_get_ex(entry, "generation", &generation) ||
      !json_object_is_type(generation, json_type_int) || json_object_get_int64(generation) < 0 ||
      !json_object_object_get_ex(entry, "data", &data) || !json_object_is_type(data, json_type_object))
    return false;
  tool.description = StringField(data, "description");
  tool.title = StringField(data, "title");
  if (tool.description.empty() || tool.description.size() > 2048 || tool.title.size() > 256 ||
      !json_object_object_get_ex(data, "inputSchema", &tool.schema) ||
      !json_object_is_type(tool.schema, json_type_object) || StringField(tool.schema, "type") != "object")
    return false;
  tool.generation = json_object_get_uint64(generation);
  tool.name = tool.source + "__" + local;
  tool.i18n = nullptr;
  json_object_object_get_ex(data, "i18n", &tool.i18n);
  return true;
}

inline void SetToolTranslations(json_object *tool, json_object *translations) {
  if (!json_object_is_type(translations, json_type_object))
    return;
  json_object *catalog = json_object_new_object();
  for (const char *locale : {"default", "en", "zh", "zh-TW"}) {
    json_object *entry = nullptr;
    if (!json_object_object_get_ex(translations, locale, &entry) ||
        !json_object_is_type(entry, json_type_object))
      continue;
    json_object *text = json_object_new_object();
    for (const char *field : {"title", "description"}) {
      const std::string value = StringField(entry, field);
      const std::size_t limit = std::string_view(field) == "title" ? 256 : 2048;
      if (!value.empty() && value.size() <= limit)
        json_object_object_add(text, field, json_object_new_string_len(value.data(), value.size()));
    }
    if (json_object_object_length(text))
      json_object_object_add(catalog, locale, text);
    else
      json_object_put(text);
  }
  if (json_object_object_length(catalog))
    json_object_object_add(tool, "i18n", catalog);
  else
    json_object_put(catalog);
}

inline void SetToolOrigin(json_object *tool, std::string_view source, bool allowed) {
  json_object_object_add(tool, "source", json_object_new_string_len(source.data(), source.size()));
  json_object_object_add(tool, "allowed", json_object_new_boolean(allowed));
}

// The management inventory includes prohibited tools so they can be inspected
// and enabled. MCP discovery only returns tools the saved policy permits.
inline void AppendContributedTools(json_object *tools, json_object *registry,
                                   const Config &config, bool inventory) {
  for (std::size_t index = 0; index < json_object_array_length(registry); ++index) {
    ContributedTool entry;
    if (!ReadContributedTool(json_object_array_get_idx(registry, index), entry))
      continue;
    const bool allowed = AllowsPlugin(config, entry.source);
    if (!inventory && !allowed)
      continue;
    json_object *tool = json_object_new_object();
    json_object_object_add(tool, "name", json_object_new_string(entry.name.c_str()));
    json_object_object_add(tool, "description", json_object_new_string(entry.description.c_str()));
    json_object_object_add(tool, "inputSchema", json_object_get(entry.schema));
    if (!entry.title.empty())
      json_object_object_add(tool, "title", json_object_new_string(entry.title.c_str()));
    if (inventory) {
      SetToolOrigin(tool, entry.source, allowed);
      SetToolTranslations(tool, entry.i18n);
    }
    json_object_array_add(tools, tool);
  }
}

} // namespace onekvm_mcp
