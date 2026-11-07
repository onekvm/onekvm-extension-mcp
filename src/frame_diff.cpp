#include "frame_diff.hpp"

#include <algorithm>
#include <cstddef>
#include <cstdlib>

namespace {

int Luma(const std::uint8_t *pixel) {
  return (pixel[0] * 77 + pixel[1] * 150 + pixel[2] * 29) >> 8;
}

}  // namespace

Change CompareFrames(const std::uint8_t *previous, const std::uint8_t *next, int width,
                     int height) {
  Change full;
  full.kind = ChangeKind::Full;
  full.width = width;
  full.height = height;
  if (previous == nullptr || next == nullptr || width < 2 || height < 2)
    return full;

  constexpr int kBlock = 32;
  constexpr int kDelta = 20;
  int min_x = width;
  int min_y = height;
  int max_x = 0;
  int max_y = 0;
  bool any = false;
  for (int block_y = 0; block_y < height; block_y += kBlock) {
    const int block_height = std::min(kBlock, height - block_y);
    for (int block_x = 0; block_x < width; block_x += kBlock) {
      const int block_width = std::min(kBlock, width - block_x);
      int changed = 0;
      int samples = 0;
      for (int y = block_y; y < block_y + block_height; y += 2) {
        const std::uint8_t *row_a = previous + (static_cast<std::size_t>(y) * width) * 3;
        const std::uint8_t *row_b = next + (static_cast<std::size_t>(y) * width) * 3;
        for (int x = block_x; x < block_x + block_width; x += 2) {
          ++samples;
          if (std::abs(Luma(row_a + x * 3) - Luma(row_b + x * 3)) >= kDelta)
            ++changed;
        }
      }
      if (samples > 0 && changed * 20 >= samples) {
        any = true;
        min_x = std::min(min_x, block_x);
        min_y = std::min(min_y, block_y);
        max_x = std::max(max_x, block_x + block_width);
        max_y = std::max(max_y, block_y + block_height);
      }
    }
  }
  if (!any) {
    Change same;
    same.kind = ChangeKind::Unchanged;
    same.width = width;
    same.height = height;
    return same;
  }

  min_x = std::max(0, min_x - 16);
  min_y = std::max(0, min_y - 16);
  max_x = std::min(width, max_x + 16);
  max_y = std::min(height, max_y + 16);
  min_x &= ~1;
  min_y &= ~1;
  if ((max_x & 1) != 0 && max_x < width)
    ++max_x;
  if ((max_y & 1) != 0 && max_y < height)
    ++max_y;
  const int crop_width = max_x - min_x;
  const int crop_height = max_y - min_y;
  if (crop_width < 2 || crop_height < 2 ||
      static_cast<long long>(crop_width) * crop_height * 4 >=
          static_cast<long long>(width) * height * 3)
    return full;

  Change crop;
  crop.kind = ChangeKind::Crop;
  crop.x = min_x;
  crop.y = min_y;
  crop.width = crop_width;
  crop.height = crop_height;
  return crop;
}
