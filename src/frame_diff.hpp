#pragma once

#include <cstdint>

enum class ChangeKind { Full, Crop, Unchanged };

struct Change {
  ChangeKind kind = ChangeKind::Full;
  int x = 0;
  int y = 0;
  int width = 0;
  int height = 0;
};

// prev and next are packed RGB, width * height * 3 bytes. A null previous
// frame is the first capture and covers the whole screen.
Change CompareFrames(const std::uint8_t *previous, const std::uint8_t *next, int width,
                     int height);
