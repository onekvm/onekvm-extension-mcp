#include "request_wait.hpp"

#include <cassert>
#include <chrono>
#include <sys/wait.h>
#include <unistd.h>

namespace {
volatile sig_atomic_t stopped = 0;
void stop(int) { stopped = 1; }
}

int main() {
  int input[2];
  assert(pipe(input) == 0);
  pollfd descriptor{input[0], POLLIN, 0};
  stopped = 1;
  assert(onekvm_mcp::WaitForRequest(&descriptor, 1, stopped) == 0);
  stopped = 0;

  // An idle waiter has no one-second tick; a request wakes it immediately.
  const pid_t writer = fork();
  assert(writer >= 0);
  if (writer == 0) {
    usleep(1200000);
    const char byte = 'x';
    _exit(write(input[1], &byte, 1) == 1 ? 0 : 1);
  }
  const auto start = std::chrono::steady_clock::now();
  assert(onekvm_mcp::WaitForRequest(&descriptor, 1, stopped) == 1);
  assert(std::chrono::steady_clock::now() - start >= std::chrono::seconds(1));
  assert(descriptor.revents & POLLIN);
  int status;
  assert(waitpid(writer, &status, 0) == writer && status == 0);
  char byte;
  assert(read(input[0], &byte, 1) == 1);

  // Real stop delivery interrupts the blocked wait and preserves the mask.
  struct sigaction action{};
  action.sa_handler = stop;
  sigemptyset(&action.sa_mask);
  assert(sigaction(SIGTERM, &action, nullptr) == 0);
  const pid_t sender = fork();
  assert(sender >= 0);
  if (sender == 0) {
    usleep(30000);
    _exit(kill(getppid(), SIGTERM) == 0 ? 0 : 1);
  }
  assert(onekvm_mcp::WaitForRequest(&descriptor, 1, stopped) == -1);
  assert(errno == EINTR && stopped);
  assert(waitpid(sender, &status, 0) == sender && status == 0);
  sigset_t current;
  assert(sigprocmask(SIG_SETMASK, nullptr, &current) == 0);
  assert(sigismember(&current, SIGTERM) == 0);
  close(input[0]);
  close(input[1]);
}
