#include "frame_diff.hpp"

#include <cstdio>
#include <vector>

namespace {

void Fill(std::vector<std::uint8_t> &rgb, int width, int height, std::uint8_t value) {
  rgb.assign(static_cast<std::size_t>(width) * height * 3, value);
}

void SetBlock(std::vector<std::uint8_t> &rgb, int width, int x, int y, int size,
              std::uint8_t value) {
  for (int row = y; row < y + size; ++row)
    for (int col = x; col < x + size; ++col)
      for (int channel = 0; channel < 3; ++channel)
        rgb[(static_cast<std::size_t>(row) * width + col) * 3 + channel] = value;
}

int failures = 0;

void Expect(bool ok, const char *name) {
  if (!ok) {
    std::fprintf(stderr, "fail: %s\n", name);
    ++failures;
  }
}

}  // namespace

int main() {
  constexpr int width = 128;
  constexpr int height = 128;
  std::vector<std::uint8_t> base;
  Fill(base, width, height, 20);
  const Change first = CompareFrames(nullptr, base.data(), width, height);
  Expect(first.kind == ChangeKind::Full, "first frame is full");

  const Change same = CompareFrames(base.data(), base.data(), width, height);
  Expect(same.kind == ChangeKind::Unchanged, "identical frame is unchanged");

  std::vector<std::uint8_t> moved = base;
  SetBlock(moved, width, 32, 32, 16, 220);
  const Change crop = CompareFrames(base.data(), moved.data(), width, height);
  Expect(crop.kind == ChangeKind::Crop, "small edit is a crop");
  Expect(crop.x <= 32 && crop.y <= 32, "crop covers the edit origin");
  Expect(crop.x + crop.width >= 48 && crop.y + crop.height >= 48, "crop covers the edit end");
  Expect(crop.width * crop.height < width * height / 2, "crop is smaller than the frame");

  if (failures != 0)
    return 1;
  std::puts("ok");
  return 0;
}
