#pragma once

#include <cerrno>
#include <poll.h>
#include <signal.h>

namespace onekvm_mcp {

// Keep stop delivery atomic with entering the indefinite wait. Signals remain
// unblocked while a client is handled, so shutdown can still interrupt I/O.
inline int WaitForRequest(pollfd *listeners, nfds_t count,
                          const volatile sig_atomic_t &stopped) {
  sigset_t stop, previous;
  sigemptyset(&stop);
  sigaddset(&stop, SIGTERM);
  sigaddset(&stop, SIGINT);
  if (sigprocmask(SIG_BLOCK, &stop, &previous) < 0)
    return -1;
  int ready = 0;
  if (!stopped)
    ready = ppoll(listeners, count, nullptr, &previous);
  const int saved = errno;
  if (sigprocmask(SIG_SETMASK, &previous, nullptr) < 0)
    return -1;
  errno = saved;
  return ready;
}

} // namespace onekvm_mcp
