cmake_minimum_required(VERSION 3.16)
project(onekvm_mcp LANGUAGES CXX)

set(ONEKVM_EXTENSION_VERSION "0.0.0-dev" CACHE STRING
  "OneKVM extension version written to manifest.json")
set(ONEKVM_EXTENSION_ARCH "unknown" CACHE STRING
  "OneKVM target architecture written to manifest.json")

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(PkgConfig REQUIRED)
pkg_check_modules(JSON_C REQUIRED json-c)
find_file(JSON_C_STATIC_LIBRARY
  NAMES libjson-c.a
  HINTS ${JSON_C_LIBRARY_DIRS}
  NO_DEFAULT_PATH)
if(NOT JSON_C_STATIC_LIBRARY)
  message(FATAL_ERROR "Static json-c library not found")
endif()

add_executable(onekvm-mcp src/main.cpp)
target_compile_options(onekvm-mcp PRIVATE -Wall -Wextra -Wpedantic)
target_include_directories(onekvm-mcp PRIVATE ${JSON_C_INCLUDE_DIRS})
target_link_libraries(onekvm-mcp PRIVATE ${JSON_C_STATIC_LIBRARY} m)

set(VERSION "${ONEKVM_EXTENSION_VERSION}")
set(ARCH "${ONEKVM_EXTENSION_ARCH}")
configure_file(manifest.json.in manifest.json @ONLY)

install(TARGETS onekvm-mcp RUNTIME DESTINATION bin)
install(FILES web/page.js DESTINATION web)
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/manifest.json" DESTINATION .)
